"use strict";

/**
 * SQL connection (SPRINT-007). Reads environment names only.
 * Does not connect until connect() is called. Password stays in process env.
 */

function readSqlConfig() {
  return {
    server: process.env.SQL_SERVER || "TBD",
    database: process.env.SQL_DATABASE || "CjisApplicantTracker",
    user: process.env.SQL_USER || "TBD",
    password: process.env.SQL_PASSWORD || "",
    port: Number(process.env.SQL_PORT || 1433),
    encrypt: process.env.SQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === "true",
  };
}

function isConfigured(config) {
  return Boolean(
    config.server &&
      config.server !== "TBD" &&
      config.user &&
      config.user !== "TBD" &&
      config.password &&
      config.password !== "TBD",
  );
}

function loadMssql() {
  try {
    return require("mssql");
  } catch {
    return null;
  }
}

function createDb() {
  const config = readSqlConfig();
  let pool = null;
  let lastError = "";

  return {
    configured: isConfigured(config),
    server: config.server,
    database: config.database,
    driverLoaded: Boolean(loadMssql()),
    lastError() {
      return lastError;
    },
    async connect() {
      lastError = "";
      if (!isConfigured(config)) {
        lastError =
          "SQL_SERVER / SQL_USER / SQL_PASSWORD are not set (copy backend/.env.example to backend/.env).";
        return null;
      }
      const sql = loadMssql();
      if (!sql) {
        lastError = "npm package mssql is not installed. From backend/ run: npm install";
        return null;
      }
      if (pool && pool.connected) return pool;
      try {
        pool = new sql.ConnectionPool({
          server: config.server,
          database: config.database,
          user: config.user,
          password: config.password,
          port: config.port,
          options: {
            encrypt: config.encrypt,
            trustServerCertificate: config.trustServerCertificate,
            enableArithAbort: true,
          },
        });
        await pool.connect();
        return pool;
      } catch (error) {
        lastError = error.message || String(error);
        pool = null;
        return null;
      }
    },
  };
}

module.exports = { createDb, createDbPlaceholder: createDb, readSqlConfig };
