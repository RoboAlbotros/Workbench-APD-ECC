"use strict";

/**
 * SQL connection (SPRINT-007 / SPRINT-009). Reads environment names only.
 * Does not connect until connect() is called. Password stays in process env.
 *
 * SQL_AUTHENTICATION=sql (default): SQL login via SQL_USER / SQL_PASSWORD.
 * SQL_AUTHENTICATION=windows: NTLM with DOMAIN\user in SQL_USER + SQL_PASSWORD
 * (for COA\svc-clearancetracker when the process cannot use a native trusted
 * connection driver).
 */

function readSqlConfig() {
  const authMode = String(process.env.SQL_AUTHENTICATION || "sql").toLowerCase();
  return {
    server: process.env.SQL_SERVER || "TBD",
    database: process.env.SQL_DATABASE || "CjisApplicantTracker",
    user: process.env.SQL_USER || "TBD",
    password: process.env.SQL_PASSWORD || "",
    port: Number(process.env.SQL_PORT || 1433),
    encrypt: process.env.SQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === "true",
    authentication: authMode === "windows" || authMode === "ntlm" ? "windows" : "sql",
  };
}

function parseWindowsUser(user) {
  const raw = String(user || "");
  const slash = raw.indexOf("\\");
  if (slash > 0) {
    return {
      domain: raw.slice(0, slash),
      userName: raw.slice(slash + 1),
    };
  }
  const at = raw.indexOf("@");
  if (at > 0) {
    return {
      domain: raw.slice(at + 1),
      userName: raw.slice(0, at),
    };
  }
  return {
    domain: process.env.SQL_DOMAIN || "",
    userName: raw,
  };
}

function isConfigured(config) {
  if (!config.server || config.server === "TBD") return false;
  if (config.authentication === "windows") {
    const parsed = parseWindowsUser(config.user);
    return Boolean(parsed.userName && parsed.userName !== "TBD" && config.password);
  }
  return Boolean(
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

function buildPoolConfig(sql, config) {
  const base = {
    server: config.server,
    database: config.database,
    port: config.port,
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      enableArithAbort: true,
    },
  };

  if (config.authentication === "windows") {
    const parsed = parseWindowsUser(config.user);
    if (!parsed.domain) {
      throw new Error(
        "SQL_AUTHENTICATION=windows requires SQL_USER as DOMAIN\\user or SQL_DOMAIN.",
      );
    }
    return {
      ...base,
      authentication: {
        type: "ntlm",
        options: {
          domain: parsed.domain,
          userName: parsed.userName,
          password: config.password,
        },
      },
    };
  }

  return {
    ...base,
    user: config.user,
    password: config.password,
  };
}

function createDb() {
  const config = readSqlConfig();
  let pool = null;
  let lastError = "";

  return {
    configured: isConfigured(config),
    server: config.server,
    database: config.database,
    encrypt: config.encrypt,
    trustServerCertificate: config.trustServerCertificate,
    authentication: config.authentication,
    driverLoaded: Boolean(loadMssql()),
    lastError() {
      return lastError;
    },
    async connect() {
      lastError = "";
      if (!isConfigured(config)) {
        lastError =
          "SQL_SERVER and credentials are not set (copy backend/.env.example to backend/.env).";
        return null;
      }
      const sql = loadMssql();
      if (!sql) {
        lastError = "npm package mssql is not installed. From backend/ run: npm install";
        return null;
      }
      if (pool && pool.connected) return pool;
      try {
        pool = new sql.ConnectionPool(buildPoolConfig(sql, config));
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
