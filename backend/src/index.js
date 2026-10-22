"use strict";

const http = require("http");
const { loadDotEnv } = require("./env");
const { createDb } = require("./db");
const { handleHealth } = require("./health");
const { describeSqlSettings, testIntegratedSettings, saveIntegratedSettings } = require("./sql-settings");
const { describeSsoSettings, saveSsoSettings } = require("./sso-settings");
const { listApplicants, replaceApplicants } = require("./repositories/applicants");

loadDotEnv();

const db = createDb();

function allowedCorsOrigins() {
  const fromEnv = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([
    "http://127.0.0.1:8740",
    "http://localhost:8740",
    "https://clearancetracker.cabq.gov",
    "http://clearancetracker.cabq.gov",
    ...fromEnv,
  ]);
}

function isLoopbackOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  } catch {
    return false;
  }
}

function corsHeaders(request) {
  const origin = request.headers.origin || "";
  const allowedSet = allowedCorsOrigins();
  const allowed = allowedSet.has(origin) || isLoopbackOrigin(origin) ? origin : "http://127.0.0.1:8740";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(request, response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...corsHeaders(request),
  });
  response.end(payload);
}

async function readJsonBody(request, response) {
  let raw;
  try {
    raw = await readBody(request);
  } catch (error) {
    sendJson(request, response, 413, { error: error.message || "request-too-large" });
    return null;
  }
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      sendJson(request, response, 400, { reason: "Settings must be a JSON object." });
      return null;
    }
    return parsed;
  } catch {
    sendJson(request, response, 400, { reason: "Settings must be JSON." });
    return null;
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) {
        reject(new Error("request-too-large"));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function handleRequest(request, response) {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }

  if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
    const pool = await db.connect();
    sendJson(request, response, 200, handleHealth(db, {
      connected: Boolean(pool),
      listen: `${process.env.API_LISTEN_HOST || "127.0.0.1"}:${process.env.API_LISTEN_PORT || "8741"}`,
    }));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sso-settings") {
    sendJson(request, response, 200, describeSsoSettings());
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/sso-settings") {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return;
    const result = saveSsoSettings(parsed);
    sendJson(request, response, result.status, result.body);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sql-settings") {
    sendJson(request, response, 200, await describeSqlSettings(db));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/sql-settings/test") {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return;
    const result = await testIntegratedSettings(db, parsed);
    sendJson(request, response, result.status, result.body);
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/sql-settings") {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return;
    const result = await saveIntegratedSettings(db, parsed);
    sendJson(request, response, result.status, result.body);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/applicants") {
    const pool = await db.connect();
    if (!pool) {
      sendJson(request, response, 503, { error: "sql-not-connected", reason: db.lastError() });
      return;
    }
    const records = await listApplicants(pool);
    sendJson(request, response, 200, { records });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/applicants") {
    const pool = await db.connect();
    if (!pool) {
      sendJson(request, response, 503, { error: "sql-not-connected", reason: db.lastError() });
      return;
    }
    let raw;
    try {
      raw = await readBody(request);
    } catch (error) {
      sendJson(request, response, 413, { error: error.message || "request-too-large" });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw || "{}");
    } catch {
      sendJson(request, response, 400, { error: "invalid-json" });
      return;
    }
    const records = Array.isArray(parsed) ? parsed : parsed.records;
    if (!Array.isArray(records)) {
      sendJson(request, response, 400, { error: "records-array-required" });
      return;
    }
    try {
      const ids = await replaceApplicants(pool, records);
      sendJson(request, response, 200, { saved: ids.length, ids });
    } catch (error) {
      sendJson(request, response, 400, {
        error: "sql-write-failed",
        reason: error.message || String(error),
      });
    }
    return;
  }

  sendJson(request, response, 404, { error: "not-found" });
}

async function main() {
  if (process.argv.includes("--health")) {
    const pool = await db.connect();
    process.stdout.write(`${JSON.stringify(handleHealth(db, { connected: Boolean(pool) }), null, 2)}\n`);
    return;
  }

  const host = process.env.API_LISTEN_HOST || "127.0.0.1";
  const port = Number(process.env.API_LISTEN_PORT || 8741);
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("API binds 127.0.0.1 only (IIS is the public edge). Do not set API_LISTEN_HOST to a public address.");
  }

  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      sendJson(request, response, 500, { error: "server-error", reason: error.message || String(error) });
    });
  });

  await new Promise((resolve, reject) => {
    server.listen(port, host, (error) => (error ? reject(error) : resolve()));
  });

  const pool = await db.connect();
  process.stdout.write(
    `${JSON.stringify(
      handleHealth(db, { connected: Boolean(pool), listen: `${host}:${port}` }),
      null,
      2,
    )}\n`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, handleHealth, handleRequest };
