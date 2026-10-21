/*
  CJIS Applicant Tracker database schema
  Target database: Microsoft SQL Server / Azure SQL
  Controlling work: SPRINT-007 (refresh). Class C3 localhost prototype.

  HOW TO CREATE OR REFRESH THE DATABASE
  -------------------------------------
  This script is idempotent: it may be re-run. It creates the database when
  missing, creates tables/indexes when missing, adds new columns when missing,
  refreshes check constraints and lookup labels to the current app.js model,
  and seeds lookup rows only when those codes/names are not already present.
  Re-run does not drop the database or applicant rows.

  sqlcmd (Windows Authentication):
    sqlcmd -S <server> -E -i "CJISTracker\database-schema.sql"

  sqlcmd (SQL Authentication — do not put the password in this repo):
    sqlcmd -S <server> -d master -U <user> -i "CJISTracker\database-schema.sql"

  SQL Server Management Studio (SSMS):
    Open this file and Execute (F5) against the intended SQL Server instance.

  Azure SQL: if CREATE DATABASE is not permitted in the session, create an empty
  database named CjisApplicantTracker through the approved operations path (TBD),
  then run this script from the USE batch onward. Deployment target remains TBD.

  GOVERNANCE NOTES
  ----------------
  - DEC-012 / DEC-017: no Date of Birth or Social Security Number columns.
    Do not add them.
  - DEC-020 (2026-10-14): DriverLicenseNumber is in-scope (UI: Driver Lic Num).
    Format: two-letter state prefix, a slash, and 1 to 15 letters or numbers
    (example: NM/A23456H8X0H23H5). Persist blank as NULL. Owner directed this
    field in; Privacy Framework / PIA revisit remains TBD for the authority
    (DEC-014/016).
  - DEC-018 / DEC-020: ControlNumber remains the unique secondary key. It is
    hidden from the UI and unused for display/edit; existing values are retained.
    Persist a blank Control ID as NULL (not '') so multiple unset values are
    allowed. Non-null values are unique. Default CI collation makes uniqueness
    case-insensitive, matching app.js.
  - DEC-018: SourceName is the spreadsheet "Source" value. Read-only in the UI.
  - DEC-015: production auth is City SSO / Entra ID with server-side RBAC
    mirroring Read Only / Records / Admin. RoleCode stays limited | records |
    admin. RoleName for limited is Read Only. AppUsers Entra columns are
    placeholders only; tenant/client IDs remain TBD. Prototype PINs are never
    production.
  - DEC-019: QueryDateEveryFiveYears is denormalized (DateOfIiiCompletion + 5
    years). The current UI calculates it; the column supports future queries.
  - Access Type supports multiple selections through ApplicantAccessTypes.
  - Documents are modeled for future use even though the current UI hides the
    Applicant Documents field.
  - SPRINT-007: the browser uses the localhost API (127.0.0.1:8741) when
    GET /health reports database.connected; otherwise it keeps localStorage.
    Documents and the change log stay in the browser this sprint.
  - Records are archived, not permanently deleted, until an admin deletes them
    from Archived Records. Applicants.IsArchived is the Archive action
    (Admin-Full / Admin-Global / Admin-Staff review; restore is Admin-Full and
    Admin-Global only). Applicants.IsDeleted is set when those admin roles
    delete from the archive screen. GET /api/applicants excludes IsDeleted = 1.
    IsDeleted is not used for the Archive action. SecurityRoles.CanDeleteApplicants
    is unused this sprint; the browser enforces the three admin roles. Default
    lists, metrics, and search exclude IsArchived = 1 and IsDeleted = 1.
  - Read Only listing (app.js role limited): non-archived rows whose
    ClearanceTypeName is exactly N'One Time Visit'. Full Clearance never appears
    there. Search / Activity / Fingerprint Outcome filters can hide more.
  - activityStatus (UI: Status, Active / InActive) is not a column. It is
    derived. Clearance Type One Time Visit is Active without Security and
    Awareness or NCIC certification. Otherwise, when NcicCertification is N,
    Active requires only SecurityAwarenessExpiration on or after today. When
    NcicCertification is Y or blank, Active requires both
    SecurityAwarenessExpiration and NcicCertificationExpiration on or after
    today. A required date that is missing, invalid, or already past is
    InActive.

  APP.JS FIELD MAP (current model → column)
  ----------------------------------------
  lastName                     → Applicants.LastName
  firstName                    → Applicants.FirstName
  middleInitial                → Applicants.MiddleInitial
  suffix                       → Applicants.Suffix
  name                         → Applicants.ApplicantName (composed LASTNAME, FIRSTNAME M SUFFIX)
  controlNumber                → Applicants.ControlNumber (hidden secondary key)
  driversLicense               → Applicants.DriverLicenseNumber
  source                       → Applicants.SourceName
  vendor                       → Vendors.VendorName / Applicants.VendorId (nullable)
  department                   → Applicants.Department (city-code list including APD)
  positionRole                 → Applicants.PositionRole
  requestor                    → Applicants.Requestor
  dateInformationProvided      → Applicants.DateInformationProvided
  dateOfIiiCompletion          → Applicants.DateOfIiiCompletion
  iiiStatus                    → IiiStatuses.IiiStatusName / Applicants.IiiStatusId
  clearanceType                → ClearanceTypes.ClearanceTypeName / Applicants.ClearanceTypeId
  tourOrientation              → Applicants.TourOrientation ('Y'/'N'; nullable yes/no flag)
  accessType                   → AccessTypes / ApplicantAccessTypes
  passport                     → Applicants.Passport ('Y'/'N'; nullable yes/no flag only)
  cjisSecurityAwarenessRole    → CjisSecurityAwarenessRoles / Applicants.CjisSecurityAwarenessRoleId
  fingerprintsNotifiedCompleted→ Applicants.FingerprintsCompleted
  outcome                      → FingerprintOutcomes / Applicants.FingerprintOutcomeId
  securityAwarenessExpiration  → Applicants.SecurityAwarenessExpiration
                                 (UI: Security and Awareness Cert Expiration)
  securityAddendum             → Applicants.SecurityAddendumDate
  ncicCertificationExpiration  → Applicants.NcicCertificationExpiration
                                 (UI: NCIC Date of Cert Expiration)
  ncicCertification            → Applicants.NcicCertification ('Y'/'N')
  completedFullProcess         → Applicants.CompletedFullProcess
  dateOfSiteVisitOnly          → Applicants.DateOfSiteVisitOnly
  queriedEveryFiveYears        → Applicants.QueryDateEveryFiveYears
  emailAddress                 → Applicants.ApplicantEmailAddress
  phoneNumber                  → Applicants.PhoneNumber
  lastChangedBy                → Applicants.LastChangedByDisplayName
                                 (+ LastChangedByUserId when SSO users exist)
  documents                    → ApplicantDocuments
  notes                        → Applicants.Notes
  archived                     → Applicants.IsArchived
  archivedAt                   → Applicants.ArchivedAtUtc
  archivedBy                   → Applicants.ArchivedByDisplayName
  activityStatus               → not persisted (derived: One Time Visit is Active;
                                 otherwise NCIC Y/N + cert dates)
  roles                        → SecurityRoles RoleCode limited | records | admin
                                 RoleName Read Only | Records View | Full Admin
*/

IF DB_ID(N'CjisApplicantTracker') IS NULL
BEGIN
  CREATE DATABASE CjisApplicantTracker;
END;
GO

USE CjisApplicantTracker;
GO

IF OBJECT_ID(N'dbo.SecurityRoles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SecurityRoles (
    SecurityRoleId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SecurityRoles PRIMARY KEY,
    RoleCode NVARCHAR(40) NOT NULL CONSTRAINT UQ_SecurityRoles_RoleCode UNIQUE,
    RoleName NVARCHAR(80) NOT NULL,
    CanViewLimited BIT NOT NULL CONSTRAINT DF_SecurityRoles_CanViewLimited DEFAULT (0),
    CanViewRecords BIT NOT NULL CONSTRAINT DF_SecurityRoles_CanViewRecords DEFAULT (0),
    CanViewAdmin BIT NOT NULL CONSTRAINT DF_SecurityRoles_CanViewAdmin DEFAULT (0),
    CanEditApplicants BIT NOT NULL CONSTRAINT DF_SecurityRoles_CanEditApplicants DEFAULT (0),
    CanDeleteApplicants BIT NOT NULL CONSTRAINT DF_SecurityRoles_CanDeleteApplicants DEFAULT (0),
    CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_SecurityRoles_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID(N'dbo.AppUsers', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AppUsers (
    AppUserId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AppUsers PRIMARY KEY,
    SecurityRoleId INT NOT NULL,
    DisplayName NVARCHAR(160) NOT NULL,
    EmailAddress NVARCHAR(254) NULL,
    /* DEC-015 placeholders — do not populate with real tenant or client secrets. */
    EntraObjectId NVARCHAR(36) NULL,
    EntraUserPrincipalName NVARCHAR(254) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_AppUsers_IsActive DEFAULT (1),
    CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_AppUsers_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_AppUsers_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_AppUsers_SecurityRoles
      FOREIGN KEY (SecurityRoleId) REFERENCES dbo.SecurityRoles(SecurityRoleId)
  );
END;
GO

IF COL_LENGTH(N'dbo.AppUsers', N'EntraObjectId') IS NULL
BEGIN
  ALTER TABLE dbo.AppUsers ADD EntraObjectId NVARCHAR(36) NULL;
END;
GO

IF COL_LENGTH(N'dbo.AppUsers', N'EntraUserPrincipalName') IS NULL
BEGIN
  ALTER TABLE dbo.AppUsers ADD EntraUserPrincipalName NVARCHAR(254) NULL;
END;
GO

IF OBJECT_ID(N'dbo.Vendors', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Vendors (
    VendorId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Vendors PRIMARY KEY,
    VendorName NVARCHAR(200) NOT NULL CONSTRAINT UQ_Vendors_VendorName UNIQUE,
    CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Vendors_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID(N'dbo.ClearanceTypes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ClearanceTypes (
    ClearanceTypeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClearanceTypes PRIMARY KEY,
    ClearanceTypeName NVARCHAR(80) NOT NULL CONSTRAINT UQ_ClearanceTypes_Name UNIQUE
  );
END;
GO

IF OBJECT_ID(N'dbo.IiiStatuses', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.IiiStatuses (
    IiiStatusId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_IiiStatuses PRIMARY KEY,
    IiiStatusName NVARCHAR(80) NOT NULL CONSTRAINT UQ_IiiStatuses_Name UNIQUE
  );
END;
GO

IF OBJECT_ID(N'dbo.FingerprintOutcomes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.FingerprintOutcomes (
    FingerprintOutcomeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FingerprintOutcomes PRIMARY KEY,
    FingerprintOutcomeName NVARCHAR(80) NOT NULL CONSTRAINT UQ_FingerprintOutcomes_Name UNIQUE
  );
END;
GO

IF OBJECT_ID(N'dbo.AccessTypes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AccessTypes (
    AccessTypeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AccessTypes PRIMARY KEY,
    AccessTypeName NVARCHAR(100) NOT NULL CONSTRAINT UQ_AccessTypes_Name UNIQUE
  );
END;
GO

IF OBJECT_ID(N'dbo.CjisSecurityAwarenessRoles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CjisSecurityAwarenessRoles (
    CjisSecurityAwarenessRoleId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CjisSecurityAwarenessRoles PRIMARY KEY,
    CjisSecurityAwarenessRoleName NVARCHAR(80) NOT NULL CONSTRAINT UQ_CjisSecurityAwarenessRoles_Name UNIQUE
  );
END;
GO

IF OBJECT_ID(N'dbo.Applicants', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Applicants (
    ApplicantId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Applicants PRIMARY KEY DEFAULT (NEWID()),
    /* DEC-018 secondary key. Unique when present; persist blanks as NULL.
       DEC-020: hidden from the UI; unused for display/edit. */
    ControlNumber NVARCHAR(40) NULL,
    /* DEC-020: format ST + / + 1 to 15 letters or numbers (example: NM/A23456H8X0H23H5). Blank is NULL. */
    DriverLicenseNumber NVARCHAR(18) NULL,
    /* DEC-018 Source; read-only in the UI. */
    SourceName NVARCHAR(160) NULL,
    VendorId INT NULL,
    Department NVARCHAR(80) NULL,
    PositionRole NVARCHAR(160) NULL,
    ClearanceTypeId INT NULL,
    IiiStatusId INT NULL,
    FingerprintOutcomeId INT NULL,
    CjisSecurityAwarenessRoleId INT NULL,
    LastName NVARCHAR(80) NOT NULL,
    FirstName NVARCHAR(80) NULL,
    MiddleInitial NCHAR(1) NULL,
    Suffix NVARCHAR(20) NULL,
    ApplicantName NVARCHAR(200) NOT NULL,
    Requestor NVARCHAR(160) NULL,
    DateInformationProvided DATE NULL,
    DateOfIiiCompletion DATE NULL,
    FingerprintsCompleted DATE NULL,
    /* UI: Security and Awareness Cert Expiration. Used for Status except One Time Visit. */
    SecurityAwarenessExpiration DATE NULL,
    SecurityAddendumDate DATE NULL,
    /* UI: NCIC Date of Cert Expiration. Used for Status except One Time Visit / NCIC N. */
    NcicCertificationExpiration DATE NULL,
    NcicCertification CHAR(1) NULL,
    /* Yes/no flag only. Not treated as PII beyond Y/N. */
    Passport CHAR(1) NULL,
    TourOrientation CHAR(1) NULL,
    CompletedFullProcess DATE NULL,
    DateOfSiteVisitOnly DATE NULL,
    QueryDateEveryFiveYears DATE NULL,
    ApplicantEmailAddress NVARCHAR(254) NULL,
    PhoneNumber NVARCHAR(40) NULL,
    Notes NVARCHAR(MAX) NULL,
    LastChangedByUserId INT NULL,
    LastChangedByDisplayName NVARCHAR(160) NULL,
    CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Applicants_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Applicants_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
    /* Set from Archived Records delete (Admin-Full, Admin-Global, Admin-Staff). Not the Archive action. */
    IsDeleted BIT NOT NULL CONSTRAINT DF_Applicants_IsDeleted DEFAULT (0),
    IsArchived BIT NOT NULL CONSTRAINT DF_Applicants_IsArchived DEFAULT (0),
    ArchivedAtUtc DATETIME2(0) NULL,
    ArchivedByDisplayName NVARCHAR(160) NULL,
    CONSTRAINT CK_Applicants_NcicCertification CHECK (NcicCertification IS NULL OR NcicCertification IN ('Y', 'N')),
    CONSTRAINT CK_Applicants_Passport CHECK (Passport IS NULL OR Passport IN ('Y', 'N')),
    CONSTRAINT CK_Applicants_TourOrientation CHECK (TourOrientation IS NULL OR TourOrientation IN ('Y', 'N')),
    CONSTRAINT CK_Applicants_DriverLicenseNumber CHECK (
      DriverLicenseNumber IS NULL
      OR (
        LEN(DriverLicenseNumber) BETWEEN 4 AND 18
        AND LEFT(DriverLicenseNumber, 2) LIKE N'[A-Z][A-Z]'
        AND SUBSTRING(DriverLicenseNumber, 3, 1) = N'/'
        AND SUBSTRING(DriverLicenseNumber, 4, 15) NOT LIKE N'%[^A-Z0-9]%'
      )
    ),
    CONSTRAINT CK_Applicants_Department CHECK (
      Department IS NULL OR Department IN (
        N'AV-Aviation',
        N'AW-Animal Welfare',
        N'CA-Chief Administrative Office',
        N'CC-Office of the City Clerk',
        N'CL-Council Services',
        N'CM-Community Safety Department',
        N'CP-Civilian Police OS Dept',
        N'CS-Cultural Services',
        N'ED-Economic Development',
        N'EH-Environmental Health',
        N'FA-Finance Admin Svc',
        N'FC-Youth and Family Svcs Dept',
        N'FD-Fire',
        N'GS-General Services Department',
        N'HH-Health,Housing,Hmlsns Dept',
        N'HR-Human Resources',
        N'IA-Internal Audit',
        N'IG-Office of Inspector GenDept',
        N'LG-Legal',
        N'MA-Mayor''s Office Department',
        N'MD-Municipal Development',
        N'APD',
        N'PD-Police',
        N'PL-Planning Department',
        N'PR-Parks and Recreation',
        N'SA-Senior Affairs',
        N'SW-Solid Waste',
        N'TI-Technology and Innovation',
        N'TR-Transit'
      )
    ),
    CONSTRAINT FK_Applicants_Vendors
      FOREIGN KEY (VendorId) REFERENCES dbo.Vendors(VendorId),
    CONSTRAINT FK_Applicants_ClearanceTypes
      FOREIGN KEY (ClearanceTypeId) REFERENCES dbo.ClearanceTypes(ClearanceTypeId),
    CONSTRAINT FK_Applicants_IiiStatuses
      FOREIGN KEY (IiiStatusId) REFERENCES dbo.IiiStatuses(IiiStatusId),
    CONSTRAINT FK_Applicants_FingerprintOutcomes
      FOREIGN KEY (FingerprintOutcomeId) REFERENCES dbo.FingerprintOutcomes(FingerprintOutcomeId),
    CONSTRAINT FK_Applicants_CjisSecurityAwarenessRoles
      FOREIGN KEY (CjisSecurityAwarenessRoleId) REFERENCES dbo.CjisSecurityAwarenessRoles(CjisSecurityAwarenessRoleId),
    CONSTRAINT FK_Applicants_LastChangedByUser
      FOREIGN KEY (LastChangedByUserId) REFERENCES dbo.AppUsers(AppUserId)
  );
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'SourceName') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD SourceName NVARCHAR(160) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'LastChangedByDisplayName') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD LastChangedByDisplayName NVARCHAR(160) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'ControlNumber') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD ControlNumber NVARCHAR(40) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'IsArchived') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD IsArchived BIT NOT NULL CONSTRAINT DF_Applicants_IsArchived DEFAULT (0);
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'ArchivedAtUtc') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD ArchivedAtUtc DATETIME2(0) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'ArchivedByDisplayName') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD ArchivedByDisplayName NVARCHAR(160) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'Passport') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD Passport CHAR(1) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'TourOrientation') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD TourOrientation CHAR(1) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'DriverLicenseNumber') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD DriverLicenseNumber NVARCHAR(18) NULL;
END;
ELSE IF COL_LENGTH(N'dbo.Applicants', N'DriverLicenseNumber') < 36
BEGIN
  /* Widen existing ST+9 / ST+15 column to ST + / + up to 15 letters or numbers (NVARCHAR(18)). */
  IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Applicants_DriverLicenseNumber'
      AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
  )
  BEGIN
    ALTER TABLE dbo.Applicants DROP CONSTRAINT CK_Applicants_DriverLicenseNumber;
  END;
  ALTER TABLE dbo.Applicants ALTER COLUMN DriverLicenseNumber NVARCHAR(18) NULL;
END;
GO

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_Applicants_DriverLicenseNumber'
    AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
    AND CHARINDEX(N'=N''/''', definition) = 0
)
BEGIN
  ALTER TABLE dbo.Applicants DROP CONSTRAINT CK_Applicants_DriverLicenseNumber;
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_Applicants_DriverLicenseNumber'
    AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  ALTER TABLE dbo.Applicants ADD CONSTRAINT CK_Applicants_DriverLicenseNumber
    CHECK (
      DriverLicenseNumber IS NULL
      OR (
        LEN(DriverLicenseNumber) BETWEEN 4 AND 18
        AND LEFT(DriverLicenseNumber, 2) LIKE N'[A-Z][A-Z]'
        AND SUBSTRING(DriverLicenseNumber, 3, 1) = N'/'
        AND SUBSTRING(DriverLicenseNumber, 4, 15) NOT LIKE N'%[^A-Z0-9]%'
      )
    );
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'Department') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD Department NVARCHAR(80) NULL;
END;
ELSE IF COL_LENGTH(N'dbo.Applicants', N'Department') < 160
BEGIN
  IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Applicants_Department'
      AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
  )
  BEGIN
    ALTER TABLE dbo.Applicants DROP CONSTRAINT CK_Applicants_Department;
  END;
  ALTER TABLE dbo.Applicants ALTER COLUMN Department NVARCHAR(80) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'PositionRole') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD PositionRole NVARCHAR(160) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'LastName') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD LastName NVARCHAR(80) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'FirstName') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD FirstName NVARCHAR(80) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'MiddleInitial') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD MiddleInitial NCHAR(1) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Applicants', N'Suffix') IS NULL
BEGIN
  ALTER TABLE dbo.Applicants ADD Suffix NVARCHAR(20) NULL;
END;
GO

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.Applicants')
    AND name = N'VendorId'
    AND is_nullable = 0
)
BEGIN
  ALTER TABLE dbo.Applicants ALTER COLUMN VendorId INT NULL;
END;
GO

/* Refresh department allowed values to the current app.js list (includes APD). */
IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_Applicants_Department'
    AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  ALTER TABLE dbo.Applicants DROP CONSTRAINT CK_Applicants_Department;
END;
GO

IF OBJECT_ID(N'dbo.Applicants', N'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Applicants_Department'
      AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
  )
BEGIN
  ALTER TABLE dbo.Applicants ADD CONSTRAINT CK_Applicants_Department
    CHECK (
      Department IS NULL OR Department IN (
        N'AV-Aviation',
        N'AW-Animal Welfare',
        N'CA-Chief Administrative Office',
        N'CC-Office of the City Clerk',
        N'CL-Council Services',
        N'CM-Community Safety Department',
        N'CP-Civilian Police OS Dept',
        N'CS-Cultural Services',
        N'ED-Economic Development',
        N'EH-Environmental Health',
        N'FA-Finance Admin Svc',
        N'FC-Youth and Family Svcs Dept',
        N'FD-Fire',
        N'GS-General Services Department',
        N'HH-Health,Housing,Hmlsns Dept',
        N'HR-Human Resources',
        N'IA-Internal Audit',
        N'IG-Office of Inspector GenDept',
        N'LG-Legal',
        N'MA-Mayor''s Office Department',
        N'MD-Municipal Development',
        N'APD',
        N'PD-Police',
        N'PL-Planning Department',
        N'PR-Parks and Recreation',
        N'SA-Senior Affairs',
        N'SW-Solid Waste',
        N'TI-Technology and Innovation',
        N'TR-Transit'
      )
    );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_Applicants_Passport'
    AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  ALTER TABLE dbo.Applicants ADD CONSTRAINT CK_Applicants_Passport
    CHECK (Passport IS NULL OR Passport IN ('Y', 'N'));
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_Applicants_TourOrientation'
    AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  ALTER TABLE dbo.Applicants ADD CONSTRAINT CK_Applicants_TourOrientation
    CHECK (TourOrientation IS NULL OR TourOrientation IN ('Y', 'N'));
END;
GO

/* Older builds used a column UNIQUE that allowed only one NULL ControlNumber. */
IF EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE name = N'UQ_Applicants_ControlNumber'
    AND parent_object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  ALTER TABLE dbo.Applicants DROP CONSTRAINT UQ_Applicants_ControlNumber;
END;
GO

IF OBJECT_ID(N'dbo.ApplicantAccessTypes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ApplicantAccessTypes (
    ApplicantId UNIQUEIDENTIFIER NOT NULL,
    AccessTypeId INT NOT NULL,
    CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_ApplicantAccessTypes_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ApplicantAccessTypes PRIMARY KEY (ApplicantId, AccessTypeId),
    CONSTRAINT FK_ApplicantAccessTypes_Applicants
      FOREIGN KEY (ApplicantId) REFERENCES dbo.Applicants(ApplicantId),
    CONSTRAINT FK_ApplicantAccessTypes_AccessTypes
      FOREIGN KEY (AccessTypeId) REFERENCES dbo.AccessTypes(AccessTypeId)
  );
END;
GO

IF OBJECT_ID(N'dbo.ApplicantDocuments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ApplicantDocuments (
    ApplicantDocumentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ApplicantDocuments PRIMARY KEY DEFAULT (NEWID()),
    ApplicantId UNIQUEIDENTIFIER NOT NULL,
    FileName NVARCHAR(260) NOT NULL,
    ContentType NVARCHAR(120) NULL,
    FileSizeBytes BIGINT NULL,
    StorageUri NVARCHAR(1000) NULL,
    UploadedByUserId INT NULL,
    UploadedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_ApplicantDocuments_UploadedAtUtc DEFAULT (SYSUTCDATETIME()),
    IsDeleted BIT NOT NULL CONSTRAINT DF_ApplicantDocuments_IsDeleted DEFAULT (0),
    CONSTRAINT FK_ApplicantDocuments_Applicants
      FOREIGN KEY (ApplicantId) REFERENCES dbo.Applicants(ApplicantId),
    CONSTRAINT FK_ApplicantDocuments_UploadedByUser
      FOREIGN KEY (UploadedByUserId) REFERENCES dbo.AppUsers(AppUserId)
  );
END;
GO

IF OBJECT_ID(N'dbo.ApplicantChangeLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ApplicantChangeLog (
    ApplicantChangeLogId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ApplicantChangeLog PRIMARY KEY,
    ApplicantId UNIQUEIDENTIFIER NULL,
    ControlNumber NVARCHAR(40) NULL,
    ApplicantName NVARCHAR(200) NULL,
    VendorName NVARCHAR(200) NULL,
    ActionName NVARCHAR(40) NOT NULL,
    ChangedFields NVARCHAR(MAX) NULL,
    ChangedByUserId INT NULL,
    ChangedByDisplayName NVARCHAR(160) NOT NULL,
    ChangedByRoleName NVARCHAR(80) NULL,
    ChangedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_ApplicantChangeLog_ChangedAtUtc DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_ApplicantChangeLog_Applicants
      FOREIGN KEY (ApplicantId) REFERENCES dbo.Applicants(ApplicantId),
    CONSTRAINT FK_ApplicantChangeLog_ChangedByUser
      FOREIGN KEY (ChangedByUserId) REFERENCES dbo.AppUsers(AppUserId)
  );
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_Applicants_ControlNumber'
    AND object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  CREATE UNIQUE INDEX UX_Applicants_ControlNumber
    ON dbo.Applicants (ControlNumber)
    WHERE ControlNumber IS NOT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_AppUsers_EntraObjectId'
    AND object_id = OBJECT_ID(N'dbo.AppUsers')
)
BEGIN
  CREATE UNIQUE INDEX UX_AppUsers_EntraObjectId
    ON dbo.AppUsers (EntraObjectId)
    WHERE EntraObjectId IS NOT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Applicants_Grouping'
    AND object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  CREATE INDEX IX_Applicants_Grouping
    ON dbo.Applicants (ClearanceTypeId, IiiStatusId, ApplicantName)
    INCLUDE (VendorId, DateInformationProvided, ApplicantEmailAddress, PhoneNumber)
    WHERE IsDeleted = 0;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Applicants_Search'
    AND object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  CREATE INDEX IX_Applicants_Search
    ON dbo.Applicants (ApplicantName, ApplicantEmailAddress)
    INCLUDE (VendorId, ClearanceTypeId, IiiStatusId)
    WHERE IsDeleted = 0;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Applicants_SourceName'
    AND object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  CREATE INDEX IX_Applicants_SourceName
    ON dbo.Applicants (SourceName)
    WHERE IsDeleted = 0;
END;
GO

/* Default lists exclude archived applicants. Deleted rows stay IsDeleted = 1. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Applicants_IsArchived'
    AND object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  CREATE INDEX IX_Applicants_IsArchived
    ON dbo.Applicants (IsArchived, ApplicantName)
    WHERE IsArchived = 0;
END;
GO

/* Duplicate Driver Lic Num is a warning in the UI, not a unique constraint. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Applicants_DriverLicenseNumber'
    AND object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  CREATE INDEX IX_Applicants_DriverLicenseNumber
    ON dbo.Applicants (DriverLicenseNumber)
    WHERE DriverLicenseNumber IS NOT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Applicants_LastName_FirstName'
    AND object_id = OBJECT_ID(N'dbo.Applicants')
)
BEGIN
  CREATE INDEX IX_Applicants_LastName_FirstName
    ON dbo.Applicants (LastName, FirstName)
    INCLUDE (DriverLicenseNumber, Department, IsArchived);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_ApplicantChangeLog_Applicant_ChangedAt'
    AND object_id = OBJECT_ID(N'dbo.ApplicantChangeLog')
)
BEGIN
  CREATE INDEX IX_ApplicantChangeLog_Applicant_ChangedAt
    ON dbo.ApplicantChangeLog (ApplicantId, ChangedAtUtc DESC);
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SecurityRoles WHERE RoleCode = N'limited')
BEGIN
  INSERT INTO dbo.SecurityRoles
    (RoleCode, RoleName, CanViewLimited, CanViewRecords, CanViewAdmin, CanEditApplicants, CanDeleteApplicants)
  VALUES (N'limited', N'Read Only', 1, 0, 0, 0, 0);
END;
GO

/* Existing databases seeded as Limited View keep RoleCode limited. */
UPDATE dbo.SecurityRoles
SET RoleName = N'Read Only'
WHERE RoleCode = N'limited'
  AND RoleName <> N'Read Only';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SecurityRoles WHERE RoleCode = N'records')
BEGIN
  INSERT INTO dbo.SecurityRoles
    (RoleCode, RoleName, CanViewLimited, CanViewRecords, CanViewAdmin, CanEditApplicants, CanDeleteApplicants)
  VALUES (N'records', N'Records View', 1, 1, 0, 1, 0);
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SecurityRoles WHERE RoleCode = N'admin')
BEGIN
  INSERT INTO dbo.SecurityRoles
    (RoleCode, RoleName, CanViewLimited, CanViewRecords, CanViewAdmin, CanEditApplicants, CanDeleteApplicants)
  VALUES (N'admin', N'Full Admin', 1, 1, 1, 1, 1);
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ClearanceTypes WHERE ClearanceTypeName = N'Full Clearance')
  INSERT INTO dbo.ClearanceTypes (ClearanceTypeName) VALUES (N'Full Clearance');
IF NOT EXISTS (SELECT 1 FROM dbo.ClearanceTypes WHERE ClearanceTypeName = N'One Time Visit')
  INSERT INTO dbo.ClearanceTypes (ClearanceTypeName) VALUES (N'One Time Visit');
IF EXISTS (SELECT 1 FROM dbo.ClearanceTypes WHERE ClearanceTypeName = N'In-Progress')
  UPDATE dbo.ClearanceTypes SET ClearanceTypeName = N'InProgress' WHERE ClearanceTypeName = N'In-Progress';
IF NOT EXISTS (SELECT 1 FROM dbo.ClearanceTypes WHERE ClearanceTypeName = N'InProgress')
  INSERT INTO dbo.ClearanceTypes (ClearanceTypeName) VALUES (N'InProgress');
IF NOT EXISTS (SELECT 1 FROM dbo.ClearanceTypes WHERE ClearanceTypeName = N'No Access Given')
  INSERT INTO dbo.ClearanceTypes (ClearanceTypeName) VALUES (N'No Access Given');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.IiiStatuses WHERE IiiStatusName = N'Clear')
  INSERT INTO dbo.IiiStatuses (IiiStatusName) VALUES (N'Clear');
IF NOT EXISTS (SELECT 1 FROM dbo.IiiStatuses WHERE IiiStatusName = N'Misd/Clear')
  INSERT INTO dbo.IiiStatuses (IiiStatusName) VALUES (N'Misd/Clear');
IF NOT EXISTS (SELECT 1 FROM dbo.IiiStatuses WHERE IiiStatusName = N'Felony')
  INSERT INTO dbo.IiiStatuses (IiiStatusName) VALUES (N'Felony');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.FingerprintOutcomes WHERE FingerprintOutcomeName = N'Clear')
  INSERT INTO dbo.FingerprintOutcomes (FingerprintOutcomeName) VALUES (N'Clear');
IF NOT EXISTS (SELECT 1 FROM dbo.FingerprintOutcomes WHERE FingerprintOutcomeName = N'Misd/Clear')
  INSERT INTO dbo.FingerprintOutcomes (FingerprintOutcomeName) VALUES (N'Misd/Clear');
IF NOT EXISTS (SELECT 1 FROM dbo.FingerprintOutcomes WHERE FingerprintOutcomeName = N'Felony')
  INSERT INTO dbo.FingerprintOutcomes (FingerprintOutcomeName) VALUES (N'Felony');
IF NOT EXISTS (SELECT 1 FROM dbo.FingerprintOutcomes WHERE FingerprintOutcomeName = N'Needs Follow Up')
  INSERT INTO dbo.FingerprintOutcomes (FingerprintOutcomeName) VALUES (N'Needs Follow Up');
GO

IF EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'VPN')
  AND NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Physical')
  UPDATE dbo.AccessTypes SET AccessTypeName = N'Physical' WHERE AccessTypeName = N'VPN';
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Physical')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'Physical');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Non VPN')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'Non VPN');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Security Groups')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'Security Groups');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Facility Access')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'Facility Access');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Unescorted Access')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'Unescorted Access');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Building Access')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'Building Access');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'Escorted Access')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'Escorted Access');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'System Access')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'System Access');
IF NOT EXISTS (SELECT 1 FROM dbo.AccessTypes WHERE AccessTypeName = N'System/Building')
  INSERT INTO dbo.AccessTypes (AccessTypeName) VALUES (N'System/Building');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.CjisSecurityAwarenessRoles WHERE CjisSecurityAwarenessRoleName = N'Basic')
  INSERT INTO dbo.CjisSecurityAwarenessRoles (CjisSecurityAwarenessRoleName) VALUES (N'Basic');
IF NOT EXISTS (SELECT 1 FROM dbo.CjisSecurityAwarenessRoles WHERE CjisSecurityAwarenessRoleName = N'General')
  INSERT INTO dbo.CjisSecurityAwarenessRoles (CjisSecurityAwarenessRoleName) VALUES (N'General');
IF NOT EXISTS (SELECT 1 FROM dbo.CjisSecurityAwarenessRoles WHERE CjisSecurityAwarenessRoleName = N'Privileged')
  INSERT INTO dbo.CjisSecurityAwarenessRoles (CjisSecurityAwarenessRoleName) VALUES (N'Privileged');
IF NOT EXISTS (SELECT 1 FROM dbo.CjisSecurityAwarenessRoles WHERE CjisSecurityAwarenessRoleName = N'Security')
  INSERT INTO dbo.CjisSecurityAwarenessRoles (CjisSecurityAwarenessRoleName) VALUES (N'Security');
GO
