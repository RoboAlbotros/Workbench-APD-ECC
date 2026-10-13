"use strict";

/**
 * SQL connection placeholder (SPRINT-006).
 * Reads well-known environment names only. Does not open a socket or load a driver.
 * Connection target, credentials, and Azure vs on-prem remain TBD.
 */

function readSqlConfig() {
  return {
    server: process.env.SQL_SERVER || "TBD",
    database: process.env.SQL_DATABASE || "CjisApplicantTracker",
    user: process.env.SQL_USER || "TBD",
    port: process.env.SQL_PORT || "1433",
    encrypt: process.env.SQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === "true",
  };
}

function isConfigured(config) {
  return Boolean(config.server && config.server !== "TBD");
}

function createDbPlaceholder() {
  const config = readSqlConfig();
  return {
    configured: isConfigured(config),
    server: config.server,
    database: config.database,
    connect() {
      throw new Error(
        "SPRINT-006: database connection is not implemented. Create the database from CJISTracker/database-schema.sql; wire a driver in a later sprint.",
      );
    },
  };
}

module.exports = { createDbPlaceholder, readSqlConfig };
