"use strict";

const { execFile } = require("child_process");
const os = require("os");
const { updateSqlEnv } = require("./env");
const { isConfigured } = require("./db");

function windowsIdentity() {
  return new Promise((resolve) => {
    execFile("whoami", { windowsHide: true, timeout: 3000 }, (error, stdout) => {
      if (!error && String(stdout || "").trim()) {
        resolve(String(stdout).trim());
        return;
      }
      const domain = process.env.USERDOMAIN || "";
      const user = process.env.USERNAME || os.userInfo().username || "";
      resolve(domain && user ? `${domain}\\${user}` : user || "unknown");
    });
  });
}

function identityNote(identity) {
  const normalized = String(identity || "").toLowerCase();
  if (normalized === "nt authority\\system" || normalized.endsWith("\\system")) {
    return "This API is running as LocalSystem. A remote SQL Server sees the computer account. The DBA grants that computer account, or the service runs as the domain account that should connect.";
  }
  return "The DBA grants this Windows account access to the database. No SQL password is stored.";
}

function validateIntegratedSettings(body) {
  const source = body && typeof body === "object" ? body : {};
  const server = String(source.server || "").trim();
  const database = String(source.database || "").trim();
  const user = String(source.user || "").trim();
  const portRaw = source.port === undefined || source.port === null ? "" : String(source.port).trim();
  const errors = [];
  if (!/^[A-Za-z0-9][A-Za-z0-9._\\-]{0,127}$/.test(server) || server.includes("\\\\")) {
    errors.push("SQL Server must be a host name or host\\instance.");
  } else if (server.split("\\").length > 2) {
    errors.push("SQL Server can include only one instance name.");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(database)) {
    errors.push("Database must use letters, numbers, underscore, dot, or hyphen.");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._$@\\-]{0,127}$/.test(user) || user.includes("\\\\") || user.split("\\").length > 2) {
    errors.push("User must be a Windows account, such as DOMAIN\\user.");
  }
  let port = null;
  if (portRaw) {
    const parsed = Number(portRaw);
    if (!/^\d{1,5}$/.test(portRaw) || !Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      errors.push("Port must be from 1 to 65535, or blank for a named instance.");
    } else {
      port = parsed;
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    settings: {
      authentication: "integrated",
      server,
      database,
      user,
      port,
      encrypt: source.encrypt !== false && source.encrypt !== "false",
      trustServerCertificate: source.trustServerCertificate === true || source.trustServerCertificate === "true",
    },
  };
}

function publicSettings(config, extra) {
  const server = !config.server || config.server === "TBD" ? "" : config.server;
  const database = !config.database || config.database === "TBD" ? "" : config.database;
  const user = !config.user || config.user === "TBD" ? "" : config.user;
  return {
    authentication: config.authentication,
    server,
    database,
    user,
    port: config.port || "",
    encrypt: Boolean(config.encrypt),
    trustServerCertificate: Boolean(config.trustServerCertificate),
    configured: extra.configured !== undefined
      ? Boolean(extra.configured)
      : isConfigured({ ...config, server: server || config.server, database: database || config.database }),
    connected: Boolean(extra.connected),
    driverLoaded: Boolean(extra.driverLoaded),
    windowsIdentity: extra.windowsIdentity || "",
    windowsIdentityNote: identityNote(extra.windowsIdentity),
    reason: extra.reason || "",
  };
}

function configFromDb(db) {
  return {
    server: db.server,
    database: db.database,
    user: db.user,
    port: db.port,
    encrypt: db.encrypt,
    trustServerCertificate: db.trustServerCertificate,
    authentication: db.authentication,
  };
}

async function describeSqlSettings(db, extra = {}) {
  const identity = extra.windowsIdentity || await windowsIdentity();
  let connected = extra.connected;
  if (connected === undefined) {
    const pool = await db.connect();
    connected = Boolean(pool);
  }
  return publicSettings(configFromDb(db), {
    connected,
    configured: db.configured,
    driverLoaded: db.driverLoaded,
    windowsIdentity: identity,
    reason: connected ? "SQL Server connected." : db.lastError(),
  });
}

function applyIntegratedEnv(settings) {
  updateSqlEnv({
    SQL_AUTHENTICATION: "integrated",
    SQL_SERVER: settings.server,
    SQL_DATABASE: settings.database,
    SQL_USER: settings.user,
    SQL_PORT: settings.port ? String(settings.port) : "",
    SQL_ENCRYPT: settings.encrypt ? "true" : "false",
    SQL_TRUST_SERVER_CERTIFICATE: settings.trustServerCertificate ? "true" : "false",
  });
}

async function testIntegratedSettings(db, body) {
  const validated = validateIntegratedSettings(body);
  if (!validated.ok) {
    return { status: 400, body: { reason: validated.errors.join(" ") } };
  }
  const identity = await windowsIdentity();
  const result = await db.testIntegrated(validated.settings);
  return {
    status: 200,
    body: publicSettings(validated.settings, {
      connected: result.connected,
      driverLoaded: db.driverLoaded,
      windowsIdentity: identity,
      reason: result.reason,
    }),
  };
}

async function saveIntegratedSettings(db, body) {
  const validated = validateIntegratedSettings(body);
  if (!validated.ok) {
    return { status: 400, body: { reason: validated.errors.join(" ") } };
  }
  try {
    applyIntegratedEnv(validated.settings);
  } catch {
    return { status: 500, body: { reason: "Could not write backend/.env on the API host." } };
  }
  db.reload();
  await db.close();
  const described = await describeSqlSettings(db);
  return { status: 200, body: described };
}

module.exports = {
  describeSqlSettings,
  testIntegratedSettings,
  saveIntegratedSettings,
  validateIntegratedSettings,
};
