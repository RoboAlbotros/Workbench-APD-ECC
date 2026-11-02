"use strict";

const crypto = require("crypto");
const { updateAuthEnv } = require("./env");

const SESSION_COOKIE = "ct_session";
const SESSION_HOURS = 8;

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function timingSafeEqualHex(left, right) {
  const a = Buffer.from(String(left || ""), "hex");
  const b = Buffer.from(String(right || ""), "hex");
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

function sessionSecret() {
  let secret = String(process.env.API_SESSION_SECRET || "").trim();
  if (secret && secret !== "TBD") return secret;
  secret = crypto.randomBytes(32).toString("hex");
  try {
    updateAuthEnv({ API_SESSION_SECRET: secret });
  } catch {
    process.env.API_SESSION_SECRET = secret;
  }
  return secret;
}

function signPayload(payload) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
  return `${encoded}.${mac}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [encoded, mac] = parts;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (!left.length || left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  if (!payload.exp || Date.now() > Number(payload.exp)) return null;
  return payload;
}

function readCookie(request, name) {
  const header = String(request.headers.cookie || "");
  const prefix = `${name}=`;
  const part = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : "";
}

function cookieHeader(value, request, { clear = false } = {}) {
  const proto = String(request.headers["x-forwarded-proto"] || "").toLowerCase();
  const secure = proto === "https";
  const parts = [
    `${SESSION_COOKIE}=${clear ? "" : encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (clear) parts.push("Max-Age=0");
  else parts.push(`Max-Age=${SESSION_HOURS * 3600}`);
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

// Prototype operators already named in CJISTracker/app.js. Hashes only — live Entra is not used.
function operatorDirectory() {
  return [
    { names: ["e08727", "ashley m. herrera", "ashley"], userType: "adminStaff", role: "admin", codeHash: sha256Hex("ah-staff-4927") },
    { names: ["e17433", "annamarie zambrano"], userType: "adminStaff", role: "admin", codeHash: sha256Hex("az-staff-5831") },
    { names: ["e28041", "brianna a. berged", "brienna", "brianna"], userType: "adminStaff", role: "admin", codeHash: sha256Hex("bb-staff-6742") },
    { names: ["e14137", "jessica solis", "jessica solice", "jessica"], userType: "admin", role: "admin", codeHash: sha256Hex("js-admin-8394") },
    { names: ["e48822", "ray murphy", "raymond murphy"], userType: "adminStaff", role: "admin", codeHash: sha256Hex("rm-staff-7618") },
    { names: ["e47610", "maura flores vasquez"], userType: "adminStaff", role: "admin", codeHash: sha256Hex("mf-staff-9053") },
    { names: ["e41718", "james gray"], userType: "adminGlobal", role: "admin", codeHash: sha256Hex("jg-admin-9383") },
    { names: ["admin", "full admin"], userType: "", role: "admin", codeHash: sha256Hex("12345") },
  ];
}

function authenticateOperator(name, accessCode) {
  const needle = String(name || "").trim().toLowerCase();
  const codeHash = sha256Hex(accessCode);
  if (!needle || !accessCode) return null;
  const named = operatorDirectory().find((entry) => (
    entry.names.includes(needle) && timingSafeEqualHex(entry.codeHash, codeHash)
  ));
  if (named) return named;
  // Shared Full Admin prototype code from CJISTracker/app.js (OWNER_ADMIN_CODE).
  if (timingSafeEqualHex(sha256Hex("12345"), codeHash)) {
    return { names: [needle], userType: "", role: "admin", codeHash };
  }
  return null;
}

function parseBearer(request) {
  const header = String(request.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function readSession(request) {
  return verifyToken(readCookie(request, SESSION_COOKIE) || parseBearer(request));
}

function createSession(operator) {
  return signPayload({
    name: operator.names[0],
    role: operator.role,
    userType: operator.userType,
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  });
}

function isAdminGlobalSession(session) {
  return Boolean(session && session.userType === "adminGlobal");
}

function isSignedIn(session) {
  return Boolean(session && session.role);
}

function sendUnauthorized(sendJson, request, response, reason) {
  sendJson(request, response, 401, { error: "unauthorized", reason });
}

module.exports = {
  SESSION_COOKIE,
  authenticateOperator,
  cookieHeader,
  createSession,
  isAdminGlobalSession,
  isSignedIn,
  readSession,
  sendUnauthorized,
  sha256Hex,
  verifyToken,
};
