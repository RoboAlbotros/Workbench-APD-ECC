/*
  CJIS Applicant Tracker — SQL data migration (staging + load)
  Target: Microsoft SQL Server / Azure SQL
  Controlling work: SPRINT-007 (schema refresh). Class C3 localhost prototype.

  PURPOSE
  -------
  Land a seed/import spreadsheet into SQL Server using the current tracker
  field model (docs/planning/seed-import-field-spec.csv). The browser uses the
  localhost API when SQL is connected; otherwise it keeps localStorage.

  PREREQUISITE
  ------------
  Run CJISTracker/database-schema.sql first (creates CjisApplicantTracker
  and lookup tables). Then:

    sqlcmd -S <server> -E -d CjisApplicantTracker -i "CJISTracker\database-data-migration.sql"

  LOAD STEPS (no applicant PII in this repo)
  ------------------------------------------
  1. Prepare a CSV outside the repository. Do not include Date of Birth,
     Social Security Number, or the raw MasterSheet Driver's License header
     (DEC-012 / DEC-017 / DEC-020). Keep real applicant files off git.
  2. Header row must match stg.ApplicantSeed column names below (skip
     StagingRowId, LoadStatus, LoadMessage, ApplicantId).
  3. BULK INSERT into stg.ApplicantSeed, then EXEC dbo.usp_MigrateApplicantSeed.
  4. Review rows where LoadStatus = N'Rejected'. Successful rows are N'Loaded'.

  Example BULK INSERT (path is local to the SQL host, not this repo):

    BULK INSERT stg.ApplicantSeed
    FROM N'C:\path\outside-repo\applicant-seed.csv'
    WITH (
      FIRSTROW = 2,
      FIELDTERMINATOR = N',',
      ROWTERMINATOR = N'0x0a',
      CODEPAGE = N'65001',
      KEEPNULLS,
      TABLOCK
    );
    EXEC dbo.usp_MigrateApplicantSeed;

  Quoted CSV with embedded commas needs a format file or SSMS Import Wizard
  into stg.ApplicantSeed; BULK INSERT does not parse quoted commas.

  GOVERNANCE
  ----------
  - No DOB / SSN columns in staging or dbo.
  - Driver Lic Num: ST + '/' + 1 to 15 letters or numbers, stored uppercase.
  - Blank Control ID persists as NULL (unique only when present).
  - Duplicate Driver Lic Num is allowed (UI warns; no unique constraint).
  - QueryDateEveryFiveYears is computed as DateOfIiiCompletion + 5 years.
  - ApplicantName is composed; do not load a separate Name column.
*/

USE CjisApplicantTracker;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'stg')
BEGIN
  EXEC(N'CREATE SCHEMA stg AUTHORIZATION dbo');
END;
GO

IF OBJECT_ID(N'stg.ApplicantSeed', N'U') IS NULL
BEGIN
  CREATE TABLE stg.ApplicantSeed (
    StagingRowId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_stg_ApplicantSeed PRIMARY KEY,
    LastName NVARCHAR(80) NULL,
    FirstName NVARCHAR(80) NULL,
    MiddleInitial NVARCHAR(4) NULL,
    Suffix NVARCHAR(20) NULL,
    ControlNumber NVARCHAR(40) NULL,
    DriverLicenseNumber NVARCHAR(40) NULL,
    SourceName NVARCHAR(160) NULL,
    VendorName NVARCHAR(200) NULL,
    Department NVARCHAR(80) NULL,
    PositionRole NVARCHAR(160) NULL,
    Requestor NVARCHAR(160) NULL,
    DateInformationProvided NVARCHAR(20) NULL,
    DateOfIiiCompletion NVARCHAR(20) NULL,
    IiiStatusName NVARCHAR(80) NULL,
    ClearanceTypeName NVARCHAR(80) NULL,
    TourOrientation NVARCHAR(8) NULL,
    AccessTypeList NVARCHAR(400) NULL,
    Passport NVARCHAR(8) NULL,
    CjisSecurityAwarenessRoleName NVARCHAR(80) NULL,
    FingerprintsCompleted NVARCHAR(20) NULL,
    FingerprintOutcomeName NVARCHAR(80) NULL,
    SecurityAwarenessExpiration NVARCHAR(20) NULL,
    SecurityAddendum NVARCHAR(20) NULL,
    NcicCertificationExpiration NVARCHAR(20) NULL,
    NcicCertification NVARCHAR(8) NULL,
    CompletedFullProcess NVARCHAR(20) NULL,
    DateOfSiteVisitOnly NVARCHAR(20) NULL,
    ApplicantEmailAddress NVARCHAR(254) NULL,
    PhoneNumber NVARCHAR(40) NULL,
    Notes NVARCHAR(MAX) NULL,
    LoadStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_stg_ApplicantSeed_LoadStatus DEFAULT (N'Pending'),
    LoadMessage NVARCHAR(400) NULL,
    ApplicantId UNIQUEIDENTIFIER NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.fn_NullIfBlank', N'FN') IS NOT NULL
  DROP FUNCTION dbo.fn_NullIfBlank;
GO
CREATE FUNCTION dbo.fn_NullIfBlank (@value NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
  DECLARE @trimmed NVARCHAR(MAX) = NULLIF(LTRIM(RTRIM(@value)), N'');
  RETURN @trimmed;
END;
GO

IF OBJECT_ID(N'dbo.fn_ParseFlexibleDate', N'FN') IS NOT NULL
  DROP FUNCTION dbo.fn_ParseFlexibleDate;
GO
CREATE FUNCTION dbo.fn_ParseFlexibleDate (@value NVARCHAR(20))
RETURNS DATE
AS
BEGIN
  DECLARE @text NVARCHAR(20) = NULLIF(LTRIM(RTRIM(@value)), N'');
  IF @text IS NULL RETURN NULL;
  IF @text LIKE N'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    RETURN TRY_CONVERT(DATE, @text, 23);
  RETURN TRY_CONVERT(DATE, @text, 101);
END;
GO

IF OBJECT_ID(N'dbo.fn_NormalizeYn', N'FN') IS NOT NULL
  DROP FUNCTION dbo.fn_NormalizeYn;
GO
CREATE FUNCTION dbo.fn_NormalizeYn (@value NVARCHAR(8))
RETURNS CHAR(1)
AS
BEGIN
  DECLARE @text NVARCHAR(8) = UPPER(LTRIM(RTRIM(ISNULL(@value, N''))));
  IF @text IN (N'Y', N'YES', N'TRUE', N'1') RETURN 'Y';
  IF @text IN (N'N', N'NO', N'FALSE', N'0') RETURN 'N';
  RETURN NULL;
END;
GO

IF OBJECT_ID(N'dbo.fn_NormalizeDriversLicense', N'FN') IS NOT NULL
  DROP FUNCTION dbo.fn_NormalizeDriversLicense;
GO
CREATE FUNCTION dbo.fn_NormalizeDriversLicense (@value NVARCHAR(40))
RETURNS NVARCHAR(18)
AS
BEGIN
  DECLARE @raw NVARCHAR(40) = UPPER(LTRIM(RTRIM(ISNULL(@value, N''))));
  DECLARE @prefix NVARCHAR(2) = N'';
  DECLARE @body NVARCHAR(15) = N'';
  DECLARE @i INT = 1;
  DECLARE @ch NCHAR(1);
  WHILE @i <= LEN(@raw)
  BEGIN
    SET @ch = SUBSTRING(@raw, @i, 1);
    IF LEN(@prefix) < 2
    BEGIN
      IF @ch LIKE N'[A-Z]' SET @prefix = @prefix + @ch;
    END
    ELSE IF @ch <> N'/' AND @ch LIKE N'[A-Z0-9]' AND LEN(@body) < 15
    BEGIN
      SET @body = @body + @ch;
    END;
    SET @i = @i + 1;
  END;
  IF LEN(@prefix) < 2 OR LEN(@body) < 1 RETURN NULL;
  RETURN @prefix + N'/' + @body;
END;
GO

IF OBJECT_ID(N'dbo.fn_ComposeApplicantName', N'FN') IS NOT NULL
  DROP FUNCTION dbo.fn_ComposeApplicantName;
GO
CREATE FUNCTION dbo.fn_ComposeApplicantName (
  @lastName NVARCHAR(80),
  @firstName NVARCHAR(80),
  @middleInitial NCHAR(1),
  @suffix NVARCHAR(20)
)
RETURNS NVARCHAR(200)
AS
BEGIN
  DECLARE @given NVARCHAR(200) =
    LTRIM(RTRIM(
      ISNULL(@firstName, N'')
      + CASE WHEN @middleInitial IS NULL OR @middleInitial = N'' THEN N'' ELSE N' ' + @middleInitial END
      + CASE WHEN @suffix IS NULL OR @suffix = N'' THEN N'' ELSE N' ' + @suffix END
    ));
  IF @lastName IS NOT NULL AND @given <> N'' RETURN @lastName + N', ' + @given;
  RETURN COALESCE(@lastName, @given, N'');
END;
GO

IF OBJECT_ID(N'dbo.fn_InquiryDueDate', N'FN') IS NOT NULL
  DROP FUNCTION dbo.fn_InquiryDueDate;
GO
CREATE FUNCTION dbo.fn_InquiryDueDate (@iiiCompletion DATE)
RETURNS DATE
AS
BEGIN
  IF @iiiCompletion IS NULL RETURN NULL;
  RETURN DATEADD(YEAR, 5, @iiiCompletion);
END;
GO

IF OBJECT_ID(N'dbo.usp_MigrateApplicantSeed', N'P') IS NOT NULL
  DROP PROCEDURE dbo.usp_MigrateApplicantSeed;
GO
CREATE PROCEDURE dbo.usp_MigrateApplicantSeed
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @rowId INT;
  DECLARE @lastName NVARCHAR(80);
  DECLARE @firstName NVARCHAR(80);
  DECLARE @middleInitial NCHAR(1);
  DECLARE @suffix NVARCHAR(20);
  DECLARE @controlNumber NVARCHAR(40);
  DECLARE @driversLicense NVARCHAR(18);
  DECLARE @sourceName NVARCHAR(160);
  DECLARE @vendorName NVARCHAR(200);
  DECLARE @department NVARCHAR(80);
  DECLARE @positionRole NVARCHAR(160);
  DECLARE @requestor NVARCHAR(160);
  DECLARE @dateInformationProvided DATE;
  DECLARE @dateOfIiiCompletion DATE;
  DECLARE @iiiStatusName NVARCHAR(80);
  DECLARE @clearanceTypeName NVARCHAR(80);
  DECLARE @tourOrientation CHAR(1);
  DECLARE @accessTypeList NVARCHAR(400);
  DECLARE @passport CHAR(1);
  DECLARE @cjisRoleName NVARCHAR(80);
  DECLARE @fingerprintsCompleted DATE;
  DECLARE @outcomeName NVARCHAR(80);
  DECLARE @securityAwarenessExpiration DATE;
  DECLARE @securityAddendum DATE;
  DECLARE @ncicExpiration DATE;
  DECLARE @ncicCertification CHAR(1);
  DECLARE @completedFullProcess DATE;
  DECLARE @dateOfSiteVisitOnly DATE;
  DECLARE @email NVARCHAR(254);
  DECLARE @phone NVARCHAR(40);
  DECLARE @notes NVARCHAR(MAX);
  DECLARE @message NVARCHAR(400);
  DECLARE @applicantId UNIQUEIDENTIFIER;
  DECLARE @vendorId INT;
  DECLARE @clearanceTypeId INT;
  DECLARE @iiiStatusId INT;
  DECLARE @outcomeId INT;
  DECLARE @cjisRoleId INT;
  DECLARE @applicantName NVARCHAR(200);

  DECLARE seed_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT StagingRowId
    FROM stg.ApplicantSeed
    WHERE LoadStatus IN (N'Pending', N'Rejected');

  OPEN seed_cursor;
  FETCH NEXT FROM seed_cursor INTO @rowId;

  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @message = NULL;
    SET @applicantId = NULL;
    SET @vendorId = NULL;
    SET @clearanceTypeId = NULL;
    SET @iiiStatusId = NULL;
    SET @outcomeId = NULL;
    SET @cjisRoleId = NULL;

    SELECT
      @lastName = UPPER(CONVERT(NVARCHAR(80), dbo.fn_NullIfBlank(LastName))),
      @firstName = UPPER(CONVERT(NVARCHAR(80), dbo.fn_NullIfBlank(FirstName))),
      @middleInitial = CASE
        WHEN dbo.fn_NullIfBlank(MiddleInitial) IS NULL THEN NULL
        ELSE UPPER(LEFT(CONVERT(NVARCHAR(4), dbo.fn_NullIfBlank(MiddleInitial)), 1))
      END,
      @suffix = UPPER(CONVERT(NVARCHAR(20), dbo.fn_NullIfBlank(Suffix))),
      @controlNumber = CONVERT(NVARCHAR(40), dbo.fn_NullIfBlank(ControlNumber)),
      @driversLicense = dbo.fn_NormalizeDriversLicense(DriverLicenseNumber),
      @sourceName = UPPER(CONVERT(NVARCHAR(160), dbo.fn_NullIfBlank(SourceName))),
      @vendorName = UPPER(CONVERT(NVARCHAR(200), dbo.fn_NullIfBlank(VendorName))),
      @department = CONVERT(NVARCHAR(80), dbo.fn_NullIfBlank(Department)),
      @positionRole = UPPER(CONVERT(NVARCHAR(160), dbo.fn_NullIfBlank(PositionRole))),
      @requestor = UPPER(CONVERT(NVARCHAR(160), dbo.fn_NullIfBlank(Requestor))),
      @dateInformationProvided = dbo.fn_ParseFlexibleDate(DateInformationProvided),
      @dateOfIiiCompletion = dbo.fn_ParseFlexibleDate(DateOfIiiCompletion),
      @iiiStatusName = dbo.fn_NullIfBlank(IiiStatusName),
      @clearanceTypeName = dbo.fn_NullIfBlank(ClearanceTypeName),
      @tourOrientation = dbo.fn_NormalizeYn(TourOrientation),
      @accessTypeList = dbo.fn_NullIfBlank(AccessTypeList),
      @passport = dbo.fn_NormalizeYn(Passport),
      @cjisRoleName = dbo.fn_NullIfBlank(CjisSecurityAwarenessRoleName),
      @fingerprintsCompleted = dbo.fn_ParseFlexibleDate(FingerprintsCompleted),
      @outcomeName = dbo.fn_NullIfBlank(FingerprintOutcomeName),
      @securityAwarenessExpiration = dbo.fn_ParseFlexibleDate(SecurityAwarenessExpiration),
      @securityAddendum = dbo.fn_ParseFlexibleDate(SecurityAddendum),
      @ncicExpiration = dbo.fn_ParseFlexibleDate(NcicCertificationExpiration),
      @ncicCertification = dbo.fn_NormalizeYn(NcicCertification),
      @completedFullProcess = dbo.fn_ParseFlexibleDate(CompletedFullProcess),
      @dateOfSiteVisitOnly = dbo.fn_ParseFlexibleDate(DateOfSiteVisitOnly),
      @email = UPPER(CONVERT(NVARCHAR(254), dbo.fn_NullIfBlank(ApplicantEmailAddress))),
      @phone = CONVERT(NVARCHAR(40), dbo.fn_NullIfBlank(PhoneNumber)),
      @notes = dbo.fn_NullIfBlank(Notes)
    FROM stg.ApplicantSeed
    WHERE StagingRowId = @rowId;

    IF @lastName IS NULL
      SET @message = N'Last Name is required.';
    ELSE IF dbo.fn_NullIfBlank(DriverLicenseNumber) IS NOT NULL AND @driversLicense IS NULL
      SET @message = N'Driver Lic Num must be ST/ plus 1 to 15 letters or numbers.';
    ELSE IF @department IS NOT NULL
      AND @department NOT IN (
        N'AV-Aviation', N'AW-Animal Welfare', N'CA-Chief Administrative Office',
        N'CC-Office of the City Clerk', N'CL-Council Services', N'CM-Community Safety Department',
        N'CP-Civilian Police OS Dept', N'CS-Cultural Services', N'ED-Economic Development',
        N'EH-Environmental Health', N'FA-Finance Admin Svc', N'FC-Youth and Family Svcs Dept',
        N'FD-Fire', N'GS-General Services Department', N'HH-Health,Housing,Hmlsns Dept',
        N'HR-Human Resources', N'IA-Internal Audit', N'IG-Office of Inspector GenDept',
        N'LG-Legal', N'MA-Mayor''s Office Department', N'MD-Municipal Development',
        N'APD', N'PD-Police', N'PL-Planning Department', N'PR-Parks and Recreation',
        N'SA-Senior Affairs', N'SW-Solid Waste', N'TI-Technology and Innovation', N'TR-Transit'
      )
      SET @message = N'Department is not in the closed city-code list.';

    IF @message IS NULL AND @clearanceTypeName IS NOT NULL
    BEGIN
      SELECT @clearanceTypeId = ClearanceTypeId
      FROM dbo.ClearanceTypes
      WHERE ClearanceTypeName = @clearanceTypeName;
      IF @clearanceTypeId IS NULL
        SET @message = N'Clearance Type is not a known value.';
    END;

    IF @message IS NULL AND @iiiStatusName IS NOT NULL
    BEGIN
      SELECT @iiiStatusId = IiiStatusId
      FROM dbo.IiiStatuses
      WHERE IiiStatusName = @iiiStatusName;
      IF @iiiStatusId IS NULL
        SET @message = N'III - Status is not a known value.';
    END;

    IF @message IS NULL AND @outcomeName IS NOT NULL
    BEGIN
      SELECT @outcomeId = FingerprintOutcomeId
      FROM dbo.FingerprintOutcomes
      WHERE FingerprintOutcomeName = @outcomeName;
      IF @outcomeId IS NULL
        SET @message = N'Fingerprint Outcome is not a known value.';
    END;

    IF @message IS NULL AND @cjisRoleName IS NOT NULL
    BEGIN
      SELECT @cjisRoleId = CjisSecurityAwarenessRoleId
      FROM dbo.CjisSecurityAwarenessRoles
      WHERE CjisSecurityAwarenessRoleName = @cjisRoleName;
      IF @cjisRoleId IS NULL
        SET @message = N'CJIS Security and Awareness Role is not a known value.';
    END;

    IF @message IS NULL AND @controlNumber IS NOT NULL
      AND EXISTS (SELECT 1 FROM dbo.Applicants WHERE ControlNumber = @controlNumber)
      SET @message = N'Control ID already exists.';

    IF @message IS NOT NULL
    BEGIN
      UPDATE stg.ApplicantSeed
      SET LoadStatus = N'Rejected', LoadMessage = @message, ApplicantId = NULL
      WHERE StagingRowId = @rowId;
      FETCH NEXT FROM seed_cursor INTO @rowId;
      CONTINUE;
    END;

    IF @vendorName IS NOT NULL
    BEGIN
      SELECT @vendorId = VendorId FROM dbo.Vendors WHERE VendorName = @vendorName;
      IF @vendorId IS NULL
      BEGIN
        INSERT INTO dbo.Vendors (VendorName) VALUES (@vendorName);
        SET @vendorId = SCOPE_IDENTITY();
      END;
    END;

    SET @applicantName = dbo.fn_ComposeApplicantName(@lastName, @firstName, @middleInitial, @suffix);
    IF @applicantName IS NULL OR @applicantName = N''
      SET @applicantName = @lastName;

    SET @applicantId = NEWID();

    BEGIN TRY
      INSERT INTO dbo.Applicants (
        ApplicantId, ControlNumber, DriverLicenseNumber, SourceName, VendorId, Department,
        PositionRole, ClearanceTypeId, IiiStatusId, FingerprintOutcomeId, CjisSecurityAwarenessRoleId,
        LastName, FirstName, MiddleInitial, Suffix, ApplicantName, Requestor,
        DateInformationProvided, DateOfIiiCompletion, FingerprintsCompleted,
        SecurityAwarenessExpiration, SecurityAddendumDate, NcicCertificationExpiration,
        NcicCertification, Passport, TourOrientation, CompletedFullProcess, DateOfSiteVisitOnly,
        QueryDateEveryFiveYears, ApplicantEmailAddress, PhoneNumber, Notes,
        LastChangedByDisplayName, IsArchived
      )
      VALUES (
        @applicantId, @controlNumber, @driversLicense, @sourceName, @vendorId, @department,
        @positionRole, @clearanceTypeId, @iiiStatusId, @outcomeId, @cjisRoleId,
        @lastName, @firstName, @middleInitial, @suffix, @applicantName, @requestor,
        @dateInformationProvided, @dateOfIiiCompletion, @fingerprintsCompleted,
        @securityAwarenessExpiration, @securityAddendum, @ncicExpiration,
        @ncicCertification, @passport, @tourOrientation, @completedFullProcess, @dateOfSiteVisitOnly,
        dbo.fn_InquiryDueDate(@dateOfIiiCompletion), @email, @phone, @notes,
        N'SQL seed migration', 0
      );

      IF @accessTypeList IS NOT NULL
      BEGIN
        INSERT INTO dbo.ApplicantAccessTypes (ApplicantId, AccessTypeId)
        SELECT DISTINCT @applicantId, a.AccessTypeId
        FROM STRING_SPLIT(@accessTypeList, N',') AS s
        INNER JOIN dbo.AccessTypes AS a
          ON a.AccessTypeName = LTRIM(RTRIM(s.value));
      END;

      UPDATE stg.ApplicantSeed
      SET LoadStatus = N'Loaded', LoadMessage = NULL, ApplicantId = @applicantId
      WHERE StagingRowId = @rowId;
    END TRY
    BEGIN CATCH
      UPDATE stg.ApplicantSeed
      SET LoadStatus = N'Rejected',
          LoadMessage = CONVERT(NVARCHAR(400), ERROR_MESSAGE()),
          ApplicantId = NULL
      WHERE StagingRowId = @rowId;
    END CATCH;

    FETCH NEXT FROM seed_cursor INTO @rowId;
  END;

  CLOSE seed_cursor;
  DEALLOCATE seed_cursor;

  SELECT LoadStatus, COUNT(*) AS RowCount
  FROM stg.ApplicantSeed
  GROUP BY LoadStatus;
END;
GO
