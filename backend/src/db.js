"use strict";

/**
 * SQL connection (SPRINT-007 / SPRINT-009). Reads environment names only.
 * Does not connect until connect() is called. Password stays in process env
 * and is never returned to the browser.
 *
 * SQL_AUTHENTICATION=sql (default): SQL login via SQL_USER / SQL_PASSWORD.
 * SQL_AUTHENTICATION=windows: NTLM with DOMAIN\user in SQL_USER + SQL_PASSWORD.
 * SQL_AUTHENTICATION=integrated: Windows integrated (trusted connection) as the
 * API process identity. No SQL password is used.
 */

const { execFileSync } = require("child_process");

const ODBC_DRIVER_PREFERENCE = [
  "ODBC Driver 18 for SQL Server",
  "ODBC Driver 17 for SQL Server",
  "ODBC Driver 13 for SQL Server",
  "SQL Server Native Client 11.0",
  "SQL Server",
];

function authenticationMode(raw) {
  const authMode = String(raw || "sql").toLowerCase();
  if (authMode === "integrated" || authMode === "trusted") return "integrated";
  if (authMode === "windows" || authMode === "ntlm") return "windows";
  return "sql";
}

function readSqlConfig() {
  const authentication = authenticationMode(process.env.SQL_AUTHENTICATION);
  const portRaw = process.env.SQL_PORT;
  let port = null;
  if (portRaw) {
    const parsed = Number(portRaw);
    port = Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : null;
  } else if (authentication !== "integrated") {
    port = 1433;
  }
  return {
    server: process.env.SQL_SERVER || "TBD",
    database: process.env.SQL_DATABASE || "CjisApplicantTracker",
    user: process.env.SQL_USER || "TBD",
    password: process.env.SQL_PASSWORD || "",
    port,
    encrypt: process.env.SQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === "true",
    authentication,
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
  if (!config.database || config.database === "TBD") return false;
  if (config.authentication === "integrated") return true;
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

function loadIntegratedDriver() {
  try {
    return require("mssql/msnodesqlv8");
  } catch {
    return null;
  }
}

function installedOdbcDriver() {
  try {
    const output = execFileSync(
      "reg",
      ["query", "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers"],
      { encoding: "utf8", windowsHide: true, timeout: 3000 },
    );
    return ODBC_DRIVER_PREFERENCE.find((name) => output.includes(name)) || "";
  } catch {
    return "";
  }
}

function integratedConnectionString(config) {
  const driver = installedOdbcDriver();
  if (!driver) return "";
  const server = config.port && !String(config.server).includes("\\")
    ? `${config.server},${config.port}`
    : config.server;
  const encrypt = config.encrypt ? "yes" : "no";
  const trust = config.trustServerCertificate ? "yes" : "no";
  return [
    `Driver={${driver}}`,
    `Server=${server}`,
    `Database=${config.database}`,
    "Trusted_Connection=Yes",
    `Encrypt=${encrypt}`,
    `TrustServerCertificate=${trust}`,
  ].join(";");
}

function buildPoolConfig(config) {
  const base = {
    server: config.server,
    database: config.database,
    connectionTimeout: 10000,
    requestTimeout: 10000,
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      enableArithAbort: true,
    },
  };
  if (config.port) base.port = config.port;

  if (config.authentication === "integrated") {
    const connectionString = integratedConnectionString(config);
    if (!connectionString) {
      throw new Error(
        "Windows integrated authentication needs an installed SQL Server ODBC driver (ODBC Driver 17 or 18).",
      );
    }
    return { connectionString, connectionTimeout: 10000, requestTimeout: 10000 };
  }

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

function driverFor(config) {
  if (config.authentication === "integrated") return loadIntegratedDriver();
  return loadMssql();
}

function driverMissingMessage(config) {
  if (config.authentication === "integrated") {
    return "Windows integrated authentication needs the msnodesqlv8 package on the API host. From backend/, run npm install. No password was sent.";
  }
  return "npm package mssql is not installed. From backend/ run: npm install";
}

async function openPool(config) {
  const sql = driverFor(config);
  if (!sql) {
    return { pool: null, reason: driverMissingMessage(config) };
  }
  let pool = null;
  try {
    pool = new sql.ConnectionPool(buildPoolConfig(config));
    await pool.connect();
    await pool.request().query("SELECT 1 AS ok");
    return { pool, reason: "" };
  } catch (error) {
    if (pool) {
      try {
        await pool.close();
      } catch {
        /* The failed pool has nothing left to keep. */
      }
    }
    return { pool: null, reason: error.message || String(error) };
  }
}

function createDb() {
  let config = readSqlConfig();
  let pool = null;
  let lastError = "";

  async function closePool() {
    if (!pool) return;
    const current = pool;
    pool = null;
    try {
      await current.close();
    } catch {
      /* Closing a dead pool should not hide the next connection error. */
    }
  }

  return {
    get configured() {
      return isConfigured(config);
    },
    get server() {
      return config.server;
    },
    get database() {
      return config.database;
    },
    get user() {
      return config.user;
    },
    get port() {
      return config.port;
    },
    get encrypt() {
      return config.encrypt;
    },
    get trustServerCertificate() {
      return config.trustServerCertificate;
    },
    get authentication() {
      return config.authentication;
    },
    get driverLoaded() {
      return Boolean(driverFor(config));
    },
    lastError() {
      return lastError;
    },
    reload() {
      config = readSqlConfig();
    },
    async close() {
      await closePool();
    },
    async connect() {
      lastError = "";
      if (pool && pool.connected) return pool;
      await closePool();
      if (!isConfigured(config)) {
        lastError = "SQL_SERVER and credentials are not set (copy backend/.env.example to backend/.env).";
        return null;
      }
      const opened = await openPool(config);
      if (!opened.pool) {
        lastError = opened.reason;
        return null;
      }
      pool = opened.pool;
      return pool;
    },
    async testIntegrated(nextConfig) {
      const opened = await openPool(nextConfig);
      if (opened.pool) {
        try {
          await opened.pool.close();
        } catch {
          /* The test pool is disposable. */
        }
        return { connected: true, reason: "SQL Server connected with Windows integrated authentication." };
      }
      return { connected: false, reason: opened.reason };
    },
  };
}

module.exports = {
  createDb,
  createDbPlaceholder: createDb,
  readSqlConfig,
  isConfigured,
  authenticationMode,
};
