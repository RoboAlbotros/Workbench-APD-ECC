"use strict";

function handleHealth(db, extra = {}) {
  const connected = Boolean(extra.connected);
  return {
    status: connected ? "ok" : "degraded",
    service: "cjis-tracker-backend",
    sprint: "SPRINT-007",
    listen: extra.listen || null,
    database: {
      connected,
      configured: Boolean(db && db.configured),
      driverLoaded: Boolean(db && db.driverLoaded),
      name: db && db.database ? db.database : "CjisApplicantTracker",
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
  };
}

module.exports = { handleHealth };
