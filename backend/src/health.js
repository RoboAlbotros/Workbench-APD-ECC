"use strict";

function handleHealth(db, extra = {}) {
  const connected = Boolean(extra.connected);
  return {
    status: connected ? "ok" : "degraded",
    service: "cjis-tracker-backend",
    sprint: "SPRINT-009",
    listen: extra.listen || null,
    database: {
      connected,
      configured: Boolean(db && db.configured),
      driverLoaded: Boolean(db && db.driverLoaded),
      name: db && db.database ? db.database : "CjisApplicantTracker",
      authentication: db && db.authentication ? db.authentication : "sql",
      schema: "CJISTracker/database-schema.sql",
      reason: connected
        ? "SQL Server connected."
        : db && db.lastError
          ? db.lastError()
          : "SQL is not connected. The browser app uses localStorage until the API reports connected.",
    },
    auth: {
      mode: "localhost-unauthenticated-prototype",
      productionDirection: "City SSO / Entra ID (DEC-015)",
      roles: ["limited", "records", "admin"],
      prototypePins: "never production",
    },
    protection: {
      sqlTransportEncrypt: Boolean(db && db.encrypt),
      sqlTrustServerCertificate: Boolean(db && db.trustServerCertificate),
      applicationFieldEncryption: false,
      browserStoreEncrypted: false,
      apiUsesTls: false,
      cjisSecurityPolicy: {
        applicability: "DEC-013 not directly applicable (no CJI stored)",
        claim: "not-claimed",
        note: "This check does not certify CJIS compliance and does not satisfy G-SEC.",
      },
    },
  };
}

module.exports = { handleHealth };
