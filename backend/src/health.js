"use strict";

/**
 * Health payload stub (SPRINT-006).
 * Future HTTP surface: GET /health → handleHealth(db).
 * This module does not start a listener.
 */

function handleHealth(db) {
  return {
    status: "scaffold",
    service: "cjis-tracker-backend",
    sprint: "SPRINT-006",
    database: {
      connected: false,
      configured: Boolean(db && db.configured),
      name: db && db.database ? db.database : "CjisApplicantTracker",
      schema: "CJISTracker/database-schema.sql",
      reason: "Connection is not implemented. The browser app still uses localStorage.",
    },
    auth: {
      mode: "not-wired",
      productionDirection: "City SSO / Entra ID (DEC-015)",
      roles: ["limited", "records", "admin"],
      prototypePins: "never production",
    },
  };
}

module.exports = { handleHealth };
