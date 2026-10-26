"use strict";

const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index < 1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

const SQL_ENV_KEYS = [
  "SQL_AUTHENTICATION",
  "SQL_SERVER",
  "SQL_DATABASE",
  "SQL_USER",
  "SQL_PORT",
  "SQL_ENCRYPT",
  "SQL_TRUST_SERVER_CERTIFICATE",
];

function envFilePath() {
  return path.join(__dirname, "..", ".env");
}

const ENTRA_ENV_KEYS = [
  "ENTRA_TENANT_ID",
  "ENTRA_CLIENT_ID",
  "ENTRA_CLIENT_SECRET",
  "ENTRA_REDIRECT_URI",
  "ENTRA_AUTHORIZE_URL",
  "ENTRA_TOKEN_URL",
  "ENTRA_ROLE_CLAIM",
];

const SAML_ENV_KEYS = [
  "SSO_ENABLED",
  "SSO_MODE",
  "SAML_ENTITY_ID",
  "SAML_REPLY_URL",
  "SAML_SIGN_ON_URL",
  "SAML_RELAY_STATE",
  "SAML_LOGOUT_URL",
  "SAML_IDP_METADATA_URL",
];

function updateEnvKeys(updates, allowedKeys) {
  const allowed = {};
  allowedKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) allowed[key] = String(updates[key]);
  });
  const envPath = envFilePath();
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const seen = new Set();
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const index = trimmed.indexOf("=");
    if (index < 1) return line;
    const key = trimmed.slice(0, index).trim();
    if (!Object.prototype.hasOwnProperty.call(allowed, key)) return line;
    seen.add(key);
    return `${key}=${allowed[key]}`;
  });
  allowedKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(allowed, key) || seen.has(key)) return;
    next.push(`${key}=${allowed[key]}`);
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  fs.writeFileSync(envPath, `${next.join("\n")}\n`, "utf8");
  Object.keys(allowed).forEach((key) => {
    process.env[key] = allowed[key];
  });
}

function updateSqlEnv(updates) {
  updateEnvKeys(updates, SQL_ENV_KEYS);
}

function updateEntraEnv(updates) {
  updateEnvKeys(updates, ENTRA_ENV_KEYS);
}

function updateSamlEnv(updates) {
  updateEnvKeys(updates, SAML_ENV_KEYS);
}

module.exports = { loadDotEnv, updateSqlEnv, updateEntraEnv, updateSamlEnv };
