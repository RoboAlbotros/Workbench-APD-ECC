"use strict";

const http = require("http");
const { loadDotEnv } = require("./env");
const { createDb } = require("./db");
const { handleHealth } = require("./health");
const { listApplicants, replaceApplicants } = require("./repositories/applicants");

loadDotEnv();

const db = createDb();

function corsHeaders(request) {
  const origin = request.headers.origin || "";
  const allowed =
    origin === "http://127.0.0.1:8740" || origin === "http://localhost:8740"
      ? origin
      : "http://127.0.0.1:8740";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
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
    throw new Error("SPRINT-007 binds 127.0.0.1 only. Do not set API_LISTEN_HOST to a public address.");
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
