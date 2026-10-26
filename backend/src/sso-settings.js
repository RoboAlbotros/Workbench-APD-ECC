"use strict";

const { updateEntraEnv, updateSamlEnv } = require("./env");

const PLACEHOLDERS = new Set(["", "TBD", "Needs to be Generated"]);

function clean(value) {
  return String(value || "").replace(/[\r\n\0]/g, "").trim();
}

function isPlaceholder(value) {
  return PLACEHOLDERS.has(clean(value));
}

function shownGenerated(value) {
  const text = clean(value);
  if (!text || text === "TBD") return "Needs to be Generated";
  return text;
}

function shownTbd(value) {
  const text = clean(value);
  return text || "TBD";
}

function shownUrl(value) {
  const text = clean(value);
  if (!text || text === "TBD" || text.includes("/TBD/")) return "";
  return text;
}

function readEntraEnv() {
  return {
    tenantId: process.env.ENTRA_TENANT_ID || "",
    clientId: process.env.ENTRA_CLIENT_ID || "",
    clientSecret: process.env.ENTRA_CLIENT_SECRET || "",
    redirectUri: process.env.ENTRA_REDIRECT_URI || "",
    authorizeUrl: process.env.ENTRA_AUTHORIZE_URL || "",
    tokenUrl: process.env.ENTRA_TOKEN_URL || "",
    roleClaim: process.env.ENTRA_ROLE_CLAIM || "",
  };
}

function publicEntraSettings(source) {
  const secret = clean(source.clientSecret);
  const secretIsSet = Boolean(secret) && !isPlaceholder(secret);
  return {
    tenantId: shownGenerated(source.tenantId),
    clientId: shownGenerated(source.clientId),
    clientSecret: secretIsSet ? "" : "TBD",
    clientSecretSet: secretIsSet,
    redirectUri: shownTbd(source.redirectUri),
    authorizeUrl: shownUrl(source.authorizeUrl),
    tokenUrl: shownUrl(source.tokenUrl),
    roleClaim: shownTbd(source.roleClaim),
    liveLogin: false,
  };
}

function normalizeSsoMode(value) {
  const mode = clean(value).toLowerCase();
  if (mode === "entra" || mode === "saml" || mode === "prototype") return mode;
  return "prototype";
}

function readSsoFlags() {
  return {
    ssoEnabled: String(process.env.SSO_ENABLED || "").toLowerCase() === "true",
    ssoMode: normalizeSsoMode(process.env.SSO_MODE || "prototype"),
  };
}

function readSamlEnv() {
  return {
    entityId: process.env.SAML_ENTITY_ID || "",
    replyUrl: process.env.SAML_REPLY_URL || "",
    signOnUrl: process.env.SAML_SIGN_ON_URL || "",
    relayState: process.env.SAML_RELAY_STATE || "",
    logoutUrl: process.env.SAML_LOGOUT_URL || "",
    idpMetadataUrl: process.env.SAML_IDP_METADATA_URL || "",
  };
}

function publicSamlSettings(source) {
  return {
    entityId: shownTbd(source.entityId),
    replyUrl: shownTbd(source.replyUrl),
    signOnUrl: shownUrl(source.signOnUrl),
    relayState: shownUrl(source.relayState),
    logoutUrl: shownUrl(source.logoutUrl),
    idpMetadataUrl: shownUrl(source.idpMetadataUrl),
  };
}

function describeSsoSettings() {
  const flags = readSsoFlags();
  return {
    ...flags,
    ...publicEntraSettings(readEntraEnv()),
    ...publicSamlSettings(readSamlEnv()),
    liveLogin: false,
  };
}

function isHttpOrHttpsUrl(value) {
  return /^https?:\/\/\S+$/i.test(value);
}

function validateSsoSettings(body) {
  const source = body && typeof body === "object" ? body : {};
  const settings = {
    ssoEnabled: Boolean(source.ssoEnabled),
    ssoMode: normalizeSsoMode(source.ssoMode),
    tenantId: clean(source.tenantId),
    clientId: clean(source.clientId),
    clientSecret: clean(source.clientSecret),
    redirectUri: clean(source.redirectUri),
    authorizeUrl: clean(source.authorizeUrl),
    tokenUrl: clean(source.tokenUrl),
    roleClaim: clean(source.roleClaim),
    entityId: clean(source.entityId),
    replyUrl: clean(source.replyUrl),
    signOnUrl: clean(source.signOnUrl),
    relayState: clean(source.relayState),
    logoutUrl: clean(source.logoutUrl),
    idpMetadataUrl: clean(source.idpMetadataUrl),
  };
  const errors = [];
  if (settings.ssoEnabled && settings.ssoMode === "prototype") {
    errors.push("Choose SAML or Entra before enabling SSO.");
  }
  const limits = [
    ["Tenant ID", settings.tenantId, 128],
    ["Client ID", settings.clientId, 128],
    ["Client secret", settings.clientSecret, 256],
    ["Redirect URI", settings.redirectUri, 300],
    ["Authorize URL", settings.authorizeUrl, 300],
    ["Token URL", settings.tokenUrl, 300],
    ["Role claim", settings.roleClaim, 128],
    ["Identifier (Entity ID)", settings.entityId, 300],
    ["Reply URL", settings.replyUrl, 300],
    ["Sign on URL", settings.signOnUrl, 300],
    ["Relay State", settings.relayState, 300],
    ["Logout URL", settings.logoutUrl, 300],
    ["IdP Metadata URL", settings.idpMetadataUrl, 300],
  ];
  limits.forEach(([label, value, max]) => {
    if (value.length > max) errors.push(`${label} is too long.`);
  });
  const urlFields = [
    ["authorizeUrl", "Authorize URL"],
    ["tokenUrl", "Token URL"],
    ["replyUrl", "Reply URL"],
    ["signOnUrl", "Sign on URL"],
    ["logoutUrl", "Logout URL"],
    ["idpMetadataUrl", "IdP Metadata URL"],
  ];
  urlFields.forEach(([key, label]) => {
    const value = settings[key];
    if (value && value !== "TBD" && !isHttpOrHttpsUrl(value)) {
      errors.push(`${label} must be an http(s) address or blank.`);
    }
  });
  return { ok: errors.length === 0, errors, settings };
}

function saveSsoSettings(body) {
  const validated = validateSsoSettings(body);
  if (!validated.ok) {
    return { status: 400, body: { reason: validated.errors.join(" ") } };
  }
  const current = readEntraEnv();
  const next = validated.settings;
  const updates = {
    ENTRA_TENANT_ID: next.tenantId || "Needs to be Generated",
    ENTRA_CLIENT_ID: next.clientId || "Needs to be Generated",
    ENTRA_REDIRECT_URI: next.redirectUri || "TBD",
    ENTRA_AUTHORIZE_URL: next.authorizeUrl,
    ENTRA_TOKEN_URL: next.tokenUrl,
    ENTRA_ROLE_CLAIM: next.roleClaim || "TBD",
  };
  const keepStoredSecret = !next.clientSecret && !isPlaceholder(current.clientSecret);
  if (!keepStoredSecret) {
    updates.ENTRA_CLIENT_SECRET = next.clientSecret || "TBD";
  }
  const samlUpdates = {
    SSO_ENABLED: next.ssoEnabled ? "true" : "false",
    SSO_MODE: next.ssoMode,
    SAML_ENTITY_ID: next.entityId || "TBD",
    SAML_REPLY_URL: next.replyUrl || "TBD",
    SAML_SIGN_ON_URL: next.signOnUrl === "TBD" ? "" : next.signOnUrl,
    SAML_RELAY_STATE: next.relayState === "TBD" ? "" : next.relayState,
    SAML_LOGOUT_URL: next.logoutUrl === "TBD" ? "" : next.logoutUrl,
    SAML_IDP_METADATA_URL: next.idpMetadataUrl === "TBD" ? "" : next.idpMetadataUrl,
  };
  try {
    updateEntraEnv(updates);
    updateSamlEnv(samlUpdates);
  } catch {
    return { status: 500, body: { reason: "Could not write backend/.env on the API host." } };
  }
  return { status: 200, body: describeSsoSettings() };
}

module.exports = { describeSsoSettings, saveSsoSettings };
