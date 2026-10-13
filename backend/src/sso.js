"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ALLOWED_ROLES = Object.freeze(["limited", "records", "admin"]);

/**
 * Future Entra ID helpers (SPRINT-006). No network calls. No live login.
 * Outline: docs/architecture/sso-entra-id.md
 */

function loadExampleConfig() {
  const configPath = path.join(__dirname, "..", "sso.config.example.json");
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

function mapRoleClaim(claimValue, roleMap) {
  const map = roleMap || loadExampleConfig().roleMap;
  const role = map[claimValue];
  if (!ALLOWED_ROLES.includes(role)) {
    return null;
  }
  return role;
}

function assertServerSideEnforcement() {
  throw new Error(
    "SPRINT-006: Entra login is not implemented. Prototype PINs must never be treated as production controls. Enforce Limited/Records/Admin on the server when SSO is wired.",
  );
}

module.exports = {
  ALLOWED_ROLES,
  loadExampleConfig,
  mapRoleClaim,
  assertServerSideEnforcement,
};
