"use strict";

const crypto = require("crypto");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function loadMssql() {
  try {
    return require("mssql");
  } catch {
    return null;
  }
}

function emptyToNull(value) {
  const text = String(value == null ? "" : value).trim();
  return text ? text : null;
}

function dateOrNull(value) {
  const text = String(value == null ? "" : value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return null;
}

function ynOrNull(value) {
  const normalized = String(value == null ? "" : value).trim().toUpperCase();
  if (normalized === "Y" || normalized === "YES" || normalized === "TRUE" || normalized === "1") {
    return "Y";
  }
  if (normalized === "N" || normalized === "NO" || normalized === "FALSE" || normalized === "0") {
    return "N";
  }
  return null;
}

function sliceDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function asUniqueIdentifier(id) {
  const text = String(id || "").trim();
  if (UUID_RE.test(text)) return text.toLowerCase();
  if (!text) return crypto.randomUUID();
  const bytes = crypto.createHash("sha1").update(text).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function composeName(record) {
  const last = String(record.lastName || "").trim().toUpperCase();
  const first = String(record.firstName || "").trim().toUpperCase();
  const mi = String(record.middleInitial || "").trim().toUpperCase();
  const suffix = String(record.suffix || "").trim().toUpperCase();
  const given = [first, mi].filter(Boolean).join(" ");
  return emptyToNull(record.name) || [last, given, suffix].filter(Boolean).join(", ") || last || "UNKNOWN";
}

function makeRequest(sql, connection) {
  if (connection && typeof connection.request === "function") {
    return connection.request();
  }
  return new sql.Request(connection);
}

async function lookupId(sql, connection, table, idColumn, nameColumn, name) {
  const value = emptyToNull(name);
  if (!value) return null;
  const result = await makeRequest(sql, connection)
    .input("name", sql.NVarChar(120), value)
    .query(`SELECT ${idColumn} AS id FROM ${table} WHERE ${nameColumn} = @name`);
  return result.recordset[0] ? result.recordset[0].id : null;
}

async function resolveVendorId(sql, connection, vendorName) {
  const name = emptyToNull(vendorName);
  if (!name) return null;
  const existing = await makeRequest(sql, connection)
    .input("name", sql.NVarChar(200), name)
    .query("SELECT VendorId AS id FROM dbo.Vendors WHERE VendorName = @name");
  if (existing.recordset[0]) return existing.recordset[0].id;
  try {
    const inserted = await makeRequest(sql, connection)
      .input("name", sql.NVarChar(200), name)
      .query("INSERT INTO dbo.Vendors (VendorName) OUTPUT INSERTED.VendorId AS id VALUES (@name)");
    return inserted.recordset[0].id;
  } catch {
    const retry = await makeRequest(sql, connection)
      .input("name", sql.NVarChar(200), name)
      .query("SELECT VendorId AS id FROM dbo.Vendors WHERE VendorName = @name");
    return retry.recordset[0] ? retry.recordset[0].id : null;
  }
}

function mapRow(row) {
  return {
    id: row.ApplicantId,
    controlNumber: row.ControlNumber || "",
    lastName: String(row.LastName || "").trim(),
    firstName: String(row.FirstName || "").trim(),
    middleInitial: String(row.MiddleInitial || "").trim(),
    suffix: String(row.Suffix || "").trim(),
    name: row.ApplicantName || "",
    source: row.SourceName || "",
    vendor: row.VendorName || "",
    department: row.Department || "",
    positionRole: row.PositionRole || "",
    requestor: row.Requestor || "",
    dateInformationProvided: sliceDate(row.DateInformationProvided),
    dateOfIiiCompletion: sliceDate(row.DateOfIiiCompletion),
    queriedEveryFiveYears: sliceDate(row.QueryDateEveryFiveYears),
    driversLicense: row.DriverLicenseNumber || "",
    iiiStatus: row.IiiStatusName || "",
    clearanceType: row.ClearanceTypeName || "",
    tourOrientation: row.TourOrientation || "",
    fingerprintsNotifiedCompleted: sliceDate(row.FingerprintsCompleted),
    outcome: row.FingerprintOutcomeName || "",
    securityAwarenessExpiration: sliceDate(row.SecurityAwarenessExpiration),
    securityAddendum: sliceDate(row.SecurityAddendumDate),
    ncicCertificationExpiration: sliceDate(row.NcicCertificationExpiration),
    ncicCertification: row.NcicCertification || "",
    accessType: row.AccessTypes || "",
    passport: row.Passport || "",
    cjisSecurityAwarenessRole: row.CjisSecurityAwarenessRoleName || "",
    phoneNumber: row.PhoneNumber || "",
    completedFullProcess: sliceDate(row.CompletedFullProcess),
    dateOfSiteVisitOnly: sliceDate(row.DateOfSiteVisitOnly),
    emailAddress: row.ApplicantEmailAddress || "",
    notes: row.Notes || "",
    lastChangedBy: row.LastChangedByDisplayName || "",
    createdAt: row.CreatedAtUtc ? new Date(row.CreatedAtUtc).toISOString() : "",
    updatedAt: row.UpdatedAtUtc ? new Date(row.UpdatedAtUtc).toISOString() : "",
    archived: Boolean(row.IsArchived),
    archivedAt: row.ArchivedAtUtc ? new Date(row.ArchivedAtUtc).toISOString() : "",
    archivedBy: row.ArchivedByDisplayName || "",
    documents: [],
  };
}

async function listApplicants(pool) {
  const sql = loadMssql();
  if (!sql) throw new Error("mssql driver is not installed.");
  const result = await makeRequest(sql, pool).query(`
    SELECT
      a.ApplicantId,
      a.ControlNumber,
      a.LastName,
      a.FirstName,
      a.MiddleInitial,
      a.Suffix,
      a.ApplicantName,
      a.SourceName,
      v.VendorName,
      a.Department,
      a.PositionRole,
      a.Requestor,
      CONVERT(char(10), a.DateInformationProvided, 23) AS DateInformationProvided,
      CONVERT(char(10), a.DateOfIiiCompletion, 23) AS DateOfIiiCompletion,
      CONVERT(char(10), a.QueryDateEveryFiveYears, 23) AS QueryDateEveryFiveYears,
      a.DriverLicenseNumber,
      s.IiiStatusName,
      c.ClearanceTypeName,
      a.TourOrientation,
      CONVERT(char(10), a.FingerprintsCompleted, 23) AS FingerprintsCompleted,
      f.FingerprintOutcomeName,
      CONVERT(char(10), a.SecurityAwarenessExpiration, 23) AS SecurityAwarenessExpiration,
      CONVERT(char(10), a.SecurityAddendumDate, 23) AS SecurityAddendumDate,
      CONVERT(char(10), a.NcicCertificationExpiration, 23) AS NcicCertificationExpiration,
      a.NcicCertification,
      a.Passport,
      r.CjisSecurityAwarenessRoleName,
      a.PhoneNumber,
      CONVERT(char(10), a.CompletedFullProcess, 23) AS CompletedFullProcess,
      CONVERT(char(10), a.DateOfSiteVisitOnly, 23) AS DateOfSiteVisitOnly,
      a.ApplicantEmailAddress,
      a.Notes,
      a.LastChangedByDisplayName,
      a.CreatedAtUtc,
      a.UpdatedAtUtc,
      a.IsArchived,
      CONVERT(char(23), a.ArchivedAtUtc, 126) AS ArchivedAtUtc,
      a.ArchivedByDisplayName,
      STUFF((
        SELECT ', ' + t.AccessTypeName
        FROM dbo.ApplicantAccessTypes x
        INNER JOIN dbo.AccessTypes t ON t.AccessTypeId = x.AccessTypeId
        WHERE x.ApplicantId = a.ApplicantId
        ORDER BY t.AccessTypeName
        FOR XML PATH(''), TYPE
      ).value('.', 'nvarchar(max)'), 1, 2, '') AS AccessTypes
    FROM dbo.Applicants a
    LEFT JOIN dbo.Vendors v ON v.VendorId = a.VendorId
    LEFT JOIN dbo.IiiStatuses s ON s.IiiStatusId = a.IiiStatusId
    LEFT JOIN dbo.ClearanceTypes c ON c.ClearanceTypeId = a.ClearanceTypeId
    LEFT JOIN dbo.FingerprintOutcomes f ON f.FingerprintOutcomeId = a.FingerprintOutcomeId
    LEFT JOIN dbo.CjisSecurityAwarenessRoles r ON r.CjisSecurityAwarenessRoleId = a.CjisSecurityAwarenessRoleId
    WHERE a.IsDeleted = 0
    ORDER BY a.LastName, a.FirstName, a.ControlNumber
  `);
  return result.recordset.map(mapRow);
}

async function upsertApplicant(sql, connection, record) {
  const applicantId = asUniqueIdentifier(record.id);
  const vendorId = await resolveVendorId(sql, connection, record.vendor);
  const iiiStatusId = await lookupId(sql, connection, "dbo.IiiStatuses", "IiiStatusId", "IiiStatusName", record.iiiStatus);
  const clearanceTypeId = await lookupId(
    sql,
    connection,
    "dbo.ClearanceTypes",
    "ClearanceTypeId",
    "ClearanceTypeName",
    record.clearanceType,
  );
  const fingerprintOutcomeId = await lookupId(
    sql,
    connection,
    "dbo.FingerprintOutcomes",
    "FingerprintOutcomeId",
    "FingerprintOutcomeName",
    record.outcome,
  );
  const awarenessRoleId = await lookupId(
    sql,
    connection,
    "dbo.CjisSecurityAwarenessRoles",
    "CjisSecurityAwarenessRoleId",
    "CjisSecurityAwarenessRoleName",
    record.cjisSecurityAwarenessRole,
  );

  const driversLicense = emptyToNull(record.driversLicense)
    ? String(record.driversLicense).trim().toUpperCase()
    : null;
  const middleInitial = emptyToNull(record.middleInitial)
    ? String(record.middleInitial).trim().slice(0, 1).toUpperCase()
    : null;
  const archived = Boolean(record.archived);
  const archivedAt = archived
    ? record.archivedAt
      ? new Date(record.archivedAt)
      : new Date()
    : null;

  const request = makeRequest(sql, connection);
  request.input("ApplicantId", sql.UniqueIdentifier, applicantId);
  request.input("ControlNumber", sql.NVarChar(40), emptyToNull(record.controlNumber));
  request.input("DriverLicenseNumber", sql.NVarChar(18), driversLicense);
  request.input("SourceName", sql.NVarChar(160), emptyToNull(record.source));
  request.input("VendorId", sql.Int, vendorId);
  request.input("Department", sql.NVarChar(80), emptyToNull(record.department));
  request.input("PositionRole", sql.NVarChar(160), emptyToNull(record.positionRole));
  request.input("ClearanceTypeId", sql.Int, clearanceTypeId);
  request.input("IiiStatusId", sql.Int, iiiStatusId);
  request.input("FingerprintOutcomeId", sql.Int, fingerprintOutcomeId);
  request.input("CjisSecurityAwarenessRoleId", sql.Int, awarenessRoleId);
  request.input("LastName", sql.NVarChar(80), emptyToNull(record.lastName) || "UNKNOWN");
  request.input("FirstName", sql.NVarChar(80), emptyToNull(record.firstName));
  request.input("MiddleInitial", sql.NChar(1), middleInitial);
  request.input("Suffix", sql.NVarChar(20), emptyToNull(record.suffix));
  request.input("ApplicantName", sql.NVarChar(200), composeName(record));
  request.input("Requestor", sql.NVarChar(160), emptyToNull(record.requestor));
  request.input("DateInformationProvided", sql.Date, dateOrNull(record.dateInformationProvided));
  request.input("DateOfIiiCompletion", sql.Date, dateOrNull(record.dateOfIiiCompletion));
  request.input("FingerprintsCompleted", sql.Date, dateOrNull(record.fingerprintsNotifiedCompleted));
  request.input("SecurityAwarenessExpiration", sql.Date, dateOrNull(record.securityAwarenessExpiration));
  request.input("SecurityAddendumDate", sql.Date, dateOrNull(record.securityAddendum));
  request.input("NcicCertificationExpiration", sql.Date, dateOrNull(record.ncicCertificationExpiration));
  request.input("NcicCertification", sql.Char(1), ynOrNull(record.ncicCertification));
  request.input("Passport", sql.Char(1), ynOrNull(record.passport));
  request.input("TourOrientation", sql.Char(1), ynOrNull(record.tourOrientation));
  request.input("CompletedFullProcess", sql.Date, dateOrNull(record.completedFullProcess));
  request.input("DateOfSiteVisitOnly", sql.Date, dateOrNull(record.dateOfSiteVisitOnly));
  request.input("QueryDateEveryFiveYears", sql.Date, dateOrNull(record.queriedEveryFiveYears));
  request.input("ApplicantEmailAddress", sql.NVarChar(254), emptyToNull(record.emailAddress));
  request.input("PhoneNumber", sql.NVarChar(40), emptyToNull(record.phoneNumber));
  request.input("Notes", sql.NVarChar(sql.MAX), emptyToNull(record.notes));
  request.input("LastChangedByDisplayName", sql.NVarChar(160), emptyToNull(record.lastChangedBy));
  request.input("IsArchived", sql.Bit, archived);
  request.input("ArchivedAtUtc", sql.DateTime2, archivedAt);
  request.input("ArchivedByDisplayName", sql.NVarChar(160), archived ? emptyToNull(record.archivedBy) : null);

  await request.query(`
    MERGE dbo.Applicants AS target
    USING (SELECT @ApplicantId AS ApplicantId) AS source
    ON target.ApplicantId = source.ApplicantId
    WHEN MATCHED THEN UPDATE SET
      ControlNumber = @ControlNumber,
      DriverLicenseNumber = @DriverLicenseNumber,
      SourceName = @SourceName,
      VendorId = @VendorId,
      Department = @Department,
      PositionRole = @PositionRole,
      ClearanceTypeId = @ClearanceTypeId,
      IiiStatusId = @IiiStatusId,
      FingerprintOutcomeId = @FingerprintOutcomeId,
      CjisSecurityAwarenessRoleId = @CjisSecurityAwarenessRoleId,
      LastName = @LastName,
      FirstName = @FirstName,
      MiddleInitial = @MiddleInitial,
      Suffix = @Suffix,
      ApplicantName = @ApplicantName,
      Requestor = @Requestor,
      DateInformationProvided = @DateInformationProvided,
      DateOfIiiCompletion = @DateOfIiiCompletion,
      FingerprintsCompleted = @FingerprintsCompleted,
      SecurityAwarenessExpiration = @SecurityAwarenessExpiration,
      SecurityAddendumDate = @SecurityAddendumDate,
      NcicCertificationExpiration = @NcicCertificationExpiration,
      NcicCertification = @NcicCertification,
      Passport = @Passport,
      TourOrientation = @TourOrientation,
      CompletedFullProcess = @CompletedFullProcess,
      DateOfSiteVisitOnly = @DateOfSiteVisitOnly,
      QueryDateEveryFiveYears = @QueryDateEveryFiveYears,
      ApplicantEmailAddress = @ApplicantEmailAddress,
      PhoneNumber = @PhoneNumber,
      Notes = @Notes,
      LastChangedByDisplayName = @LastChangedByDisplayName,
      IsArchived = @IsArchived,
      ArchivedAtUtc = @ArchivedAtUtc,
      ArchivedByDisplayName = @ArchivedByDisplayName,
      UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (
      ApplicantId, ControlNumber, DriverLicenseNumber, SourceName, VendorId, Department, PositionRole,
      ClearanceTypeId, IiiStatusId, FingerprintOutcomeId, CjisSecurityAwarenessRoleId,
      LastName, FirstName, MiddleInitial, Suffix, ApplicantName, Requestor,
      DateInformationProvided, DateOfIiiCompletion, FingerprintsCompleted, SecurityAwarenessExpiration,
      SecurityAddendumDate, NcicCertificationExpiration, NcicCertification, Passport, TourOrientation,
      CompletedFullProcess, DateOfSiteVisitOnly, QueryDateEveryFiveYears, ApplicantEmailAddress,
      PhoneNumber, Notes, LastChangedByDisplayName, IsArchived, ArchivedAtUtc, ArchivedByDisplayName
    ) VALUES (
      @ApplicantId, @ControlNumber, @DriverLicenseNumber, @SourceName, @VendorId, @Department, @PositionRole,
      @ClearanceTypeId, @IiiStatusId, @FingerprintOutcomeId, @CjisSecurityAwarenessRoleId,
      @LastName, @FirstName, @MiddleInitial, @Suffix, @ApplicantName, @Requestor,
      @DateInformationProvided, @DateOfIiiCompletion, @FingerprintsCompleted, @SecurityAwarenessExpiration,
      @SecurityAddendumDate, @NcicCertificationExpiration, @NcicCertification, @Passport, @TourOrientation,
      @CompletedFullProcess, @DateOfSiteVisitOnly, @QueryDateEveryFiveYears, @ApplicantEmailAddress,
      @PhoneNumber, @Notes, @LastChangedByDisplayName, @IsArchived, @ArchivedAtUtc, @ArchivedByDisplayName
    );
  `);

  await makeRequest(sql, connection)
    .input("ApplicantId", sql.UniqueIdentifier, applicantId)
    .query("DELETE FROM dbo.ApplicantAccessTypes WHERE ApplicantId = @ApplicantId");

  const accessValues = Array.isArray(record.accessType)
    ? record.accessType
    : String(record.accessType || "").split(",");
  for (const token of accessValues) {
    const accessTypeId = await lookupId(
      sql,
      connection,
      "dbo.AccessTypes",
      "AccessTypeId",
      "AccessTypeName",
      token.trim(),
    );
    if (!accessTypeId) continue;
    await makeRequest(sql, connection)
      .input("ApplicantId", sql.UniqueIdentifier, applicantId)
      .input("AccessTypeId", sql.Int, accessTypeId)
      .query(
        "INSERT INTO dbo.ApplicantAccessTypes (ApplicantId, AccessTypeId) VALUES (@ApplicantId, @AccessTypeId)",
      );
  }

  return applicantId;
}

async function replaceApplicants(pool, records) {
  const sql = loadMssql();
  if (!sql) throw new Error("mssql driver is not installed.");
  const ids = [];
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    for (const record of records) {
      ids.push(await upsertApplicant(sql, transaction, record));
    }
    await transaction.commit();
    return ids;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch {
      /* ignore rollback failure after a failed transaction */
    }
    throw error;
  }
}

function notImplemented(methodName) {
  throw new Error(`applicantsRepository.${methodName} is not implemented.`);
}

function createApplicantsRepository(db) {
  return {
    async list() {
      const pool = await db.connect();
      if (!pool) throw new Error(db.lastError() || "SQL is not connected.");
      return listApplicants(pool);
    },
    getById() {
      return notImplemented("getById");
    },
    getByControlNumber() {
      return notImplemented("getByControlNumber");
    },
    create() {
      return notImplemented("create");
    },
    update() {
      return notImplemented("update");
    },
    remove() {
      return notImplemented("remove");
    },
  };
}

module.exports = {
  createApplicantsRepository,
  listApplicants,
  replaceApplicants,
  upsertApplicant,
};
