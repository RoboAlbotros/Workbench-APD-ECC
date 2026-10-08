/*
  CJIS Applicant Tracker database schema
  Target database: Microsoft SQL Server / Azure SQL

  Notes:
  - Date of Birth, Social Security Number, and Driver's License fields are intentionally excluded.
  - Access Type supports multiple selections through ApplicantAccessTypes.
  - Documents are modeled for future use even though the current UI hides the Applicant Documents field.
  - ControlNumber is included as the shared external reference value used with Excel.
*/

IF DB_ID(N'CjisApplicantTracker') IS NULL
BEGIN
  CREATE DATABASE CjisApplicantTracker;
END;
GO

USE CjisApplicantTracker;
GO

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
GO

CREATE TABLE dbo.AppUsers (
  AppUserId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AppUsers PRIMARY KEY,
  SecurityRoleId INT NOT NULL,
  DisplayName NVARCHAR(160) NOT NULL,
  EmailAddress NVARCHAR(254) NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_AppUsers_IsActive DEFAULT (1),
  CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_AppUsers_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
  UpdatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_AppUsers_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_AppUsers_SecurityRoles
    FOREIGN KEY (SecurityRoleId) REFERENCES dbo.SecurityRoles(SecurityRoleId)
);
GO

CREATE TABLE dbo.Vendors (
  VendorId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Vendors PRIMARY KEY,
  VendorName NVARCHAR(200) NOT NULL CONSTRAINT UQ_Vendors_VendorName UNIQUE,
  CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Vendors_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.ClearanceTypes (
  ClearanceTypeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClearanceTypes PRIMARY KEY,
  ClearanceTypeName NVARCHAR(80) NOT NULL CONSTRAINT UQ_ClearanceTypes_Name UNIQUE
);
GO

CREATE TABLE dbo.IiiStatuses (
  IiiStatusId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_IiiStatuses PRIMARY KEY,
  IiiStatusName NVARCHAR(80) NOT NULL CONSTRAINT UQ_IiiStatuses_Name UNIQUE
);
GO

CREATE TABLE dbo.FingerprintOutcomes (
  FingerprintOutcomeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FingerprintOutcomes PRIMARY KEY,
  FingerprintOutcomeName NVARCHAR(80) NOT NULL CONSTRAINT UQ_FingerprintOutcomes_Name UNIQUE
);
GO

CREATE TABLE dbo.AccessTypes (
  AccessTypeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AccessTypes PRIMARY KEY,
  AccessTypeName NVARCHAR(100) NOT NULL CONSTRAINT UQ_AccessTypes_Name UNIQUE
);
GO

CREATE TABLE dbo.CjisSecurityAwarenessRoles (
  CjisSecurityAwarenessRoleId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CjisSecurityAwarenessRoles PRIMARY KEY,
  CjisSecurityAwarenessRoleName NVARCHAR(80) NOT NULL CONSTRAINT UQ_CjisSecurityAwarenessRoles_Name UNIQUE
);
GO

CREATE TABLE dbo.Applicants (
  ApplicantId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Applicants PRIMARY KEY DEFAULT (NEWID()),
  ControlNumber NVARCHAR(40) NULL CONSTRAINT UQ_Applicants_ControlNumber UNIQUE,
  VendorId INT NOT NULL,
  ClearanceTypeId INT NULL,
  IiiStatusId INT NULL,
  FingerprintOutcomeId INT NULL,
  CjisSecurityAwarenessRoleId INT NULL,
  ApplicantName NVARCHAR(200) NOT NULL,
  Requestor NVARCHAR(160) NULL,
  DateInformationProvided DATE NULL,
  DateOfIiiCompletion DATE NULL,
  FingerprintsCompleted DATE NULL,
  SecurityAwarenessExpiration DATE NULL,
  SecurityAddendumDate DATE NULL,
  NcicCertificationExpiration DATE NULL,
  NcicCertification CHAR(1) NULL,
  CompletedFullProcess DATE NULL,
  DateOfSiteVisitOnly DATE NULL,
  QueryDateEveryFiveYears DATE NULL,
  ApplicantEmailAddress NVARCHAR(254) NULL,
  PhoneNumber NVARCHAR(40) NULL,
  Notes NVARCHAR(MAX) NULL,
  LastChangedByUserId INT NULL,
  CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Applicants_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
  UpdatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Applicants_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
  IsDeleted BIT NOT NULL CONSTRAINT DF_Applicants_IsDeleted DEFAULT (0),
  CONSTRAINT CK_Applicants_NcicCertification CHECK (NcicCertification IS NULL OR NcicCertification IN ('Y', 'N')),
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
GO

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
GO

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
GO

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
GO

CREATE INDEX IX_Applicants_Grouping
  ON dbo.Applicants (ClearanceTypeId, IiiStatusId, ApplicantName)
  INCLUDE (VendorId, DateInformationProvided, ApplicantEmailAddress, PhoneNumber)
  WHERE IsDeleted = 0;
GO

CREATE INDEX IX_Applicants_Search
  ON dbo.Applicants (ApplicantName, ApplicantEmailAddress)
  INCLUDE (VendorId, ClearanceTypeId, IiiStatusId)
  WHERE IsDeleted = 0;
GO

CREATE INDEX IX_ApplicantChangeLog_Applicant_ChangedAt
  ON dbo.ApplicantChangeLog (ApplicantId, ChangedAtUtc DESC);
GO

INSERT INTO dbo.SecurityRoles
  (RoleCode, RoleName, CanViewLimited, CanViewRecords, CanViewAdmin, CanEditApplicants, CanDeleteApplicants)
VALUES
  (N'limited', N'Limited View', 1, 0, 0, 0, 0),
  (N'records', N'Records View', 1, 1, 0, 1, 0),
  (N'admin', N'Full Admin', 1, 1, 1, 1, 1);
GO

INSERT INTO dbo.ClearanceTypes (ClearanceTypeName)
VALUES (N'Full Clearance'), (N'One Time Visit'), (N'No Access Given');
GO

INSERT INTO dbo.IiiStatuses (IiiStatusName)
VALUES (N'Clear'), (N'Misd/Clear'), (N'Felony');
GO

INSERT INTO dbo.FingerprintOutcomes (FingerprintOutcomeName)
VALUES (N'Clear'), (N'Misd/Clear'), (N'Felony'), (N'Needs Follow Up');
GO

INSERT INTO dbo.AccessTypes (AccessTypeName)
VALUES
  (N'VPN'),
  (N'Non VPN'),
  (N'Security Groups'),
  (N'Facility Access'),
  (N'Unescorted Access'),
  (N'Building Access'),
  (N'Escorted Access'),
  (N'System Access'),
  (N'System/Building');
GO

INSERT INTO dbo.CjisSecurityAwarenessRoles (CjisSecurityAwarenessRoleName)
VALUES (N'Basic'), (N'General'), (N'Privileged'), (N'Security');
GO
