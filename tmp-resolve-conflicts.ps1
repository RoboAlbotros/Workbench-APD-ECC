$ErrorActionPreference = "Stop"

# --- app.js: keep createId + silent refresh from main; same-origin SQL base ---
$app = Get-Content -LiteralPath 'CJISTracker\app.js' -Raw
$appResolved = @'
const STORAGE_KEYS = {
  records: "cjisApplicantTracker.records",
  changeLog: "cjisApplicantTracker.changeLog",
  accessCodes: "cjisApplicantTracker.accessCodes",
  iiiCompletionIsoMigrated: "cjisApplicantTracker.iiiCompletionIsoMigrated",
  optionLists: "cjisApplicantTracker.optionLists",
  managedUsers: "cjisApplicantTracker.managedUsers",
  seedBatch: "cjisApplicantTracker.seedBatch",
  securitySettings: "cjisApplicantTracker.securitySettings",
};

/** UUID helper that works on HTTP intranet hosts (crypto.randomUUID needs a secure context). */
function createId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_error) {
    /* fall through */
  }
  try {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch (_error) {
    /* fall through */
  }
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function resolveSqlApiBase() {
  try {
    const host = String(window.location.hostname || "").toLowerCase();
    // IIS ARR proxies /api and /health on the same origin (SPRINT-009).
    // Direct 127.0.0.1 in the browser hits the user PC, not the app server.
    if (host && host !== "127.0.0.1" && host !== "localhost") {
      return "";
    }
  } catch (_error) {
    /* ignore */
  }
  return "http://127.0.0.1:8741";
}
const SQL_API_BASE = resolveSqlApiBase();
const SQL_SILENT_REFRESH_MS = 20000;
'@
if ($app -notmatch '<<<<<<<') { throw 'app.js missing expected conflict' }
$app = $app -replace '(?s)const STORAGE_KEYS = \{.*?<<<<<<< HEAD.*?>>>>>>> Security-&-Authentication-pre-rebuild\r?\n', ($appResolved + "`n")
if ($app -match '<<<<<<<') { throw 'app.js still has conflicts' }
Set-Content -LiteralPath 'CJISTracker\app.js' -Value $app -Encoding UTF8 -NoNewline
Write-Output 'RESOLVED app.js'

# --- index.html cache busts ---
$html = Get-Content -LiteralPath 'CJISTracker\index.html' -Raw
$html = $html -replace '(?s)<<<<<<< HEAD\r?\n\s*<link rel="stylesheet" href="styles\.css\?v=audit-activity-stream-2" />\r?\n=======\r?\n\s*<link rel="stylesheet" href="styles\.css\?v=saml-sso-fields" />\r?\n>>>>>>> Security-&-Authentication-pre-rebuild',
  '    <link rel="stylesheet" href="styles.css?v=security-rebuild-main" />'
$html = $html -replace '(?s)<<<<<<< HEAD\r?\n\s*<script src="app\.js\?v=fix-new-applicant-sql-save"></script>\r?\n=======\r?\n\s*<script src="mfa-authenticator\.js\?v=saml-no-claims"></script>\r?\n\s*<script src="app\.js\?v=saml-no-claims"></script>\r?\n>>>>>>> Security-&-Authentication-pre-rebuild',
  "    <script src=`"mfa-authenticator.js?v=security-rebuild-main`"></script>`r`n    <script src=`"app.js?v=security-rebuild-main`"></script>"
if ($html -match '<<<<<<<') { throw 'index.html still has conflicts' }
Set-Content -LiteralPath 'CJISTracker\index.html' -Value $html -Encoding UTF8 -NoNewline
Write-Output 'RESOLVED index.html'

# --- .env.example ---
$envEx = Get-Content -LiteralPath 'backend\.env.example' -Raw
$envEx = $envEx -replace '(?s)<<<<<<< HEAD\r?\n# --- SAML \(owner direction 2026-10-23; live login is not connected\) ---\r?\n# Entity ID and Reply URL are for this application\. Leave them unset until it is registered\.\r?\n# Do not use another application''s SAML addresses\.\r?\n=======\r?\n# INTDEV example \(replace TBD; do not commit real passwords\):\r?\n# SQL_AUTHENTICATION=windows\r?\n# SQL_SERVER=COADTI-APD\\APD\r?\n# SQL_DATABASE=TRACKERAPP_TEST\r?\n# SQL_USER=COA\\svc-clearancetracker\r?\n# SQL_PASSWORD=<server-only>\r?\n\r?\n# --- City SSO / Entra ID \(DEC-015 / SPRINT-008\) ---\r?\n# Production direction only\. Do not implement live login against TBD values\.\r?\nENTRA_TENANT_ID=Needs to be Generated\r?\nENTRA_CLIENT_ID=Needs to be Generated\r?\nENTRA_CLIENT_SECRET=TBD\r?\nENTRA_REDIRECT_URI=TBD\r?\nENTRA_AUTHORIZE_URL=\r?\nENTRA_TOKEN_URL=\r?\nENTRA_ROLE_CLAIM=TBD\r?\n\r?\n# --- SAML / SSO \(recorded only; live login is not connected\) ---\r?\n# Enable SSO and choose saml from Admin-Global .+ Security & Authentication\.\r?\n# Entity ID and Reply URL are for this application\. Leave them unset until it is registered\.\r?\nSSO_ENABLED=false\r?\nSSO_MODE=prototype\r?\n>>>>>>> Security-&-Authentication-pre-rebuild',
@'
# INTDEV example (replace TBD; do not commit real passwords):
# SQL_AUTHENTICATION=windows
# SQL_SERVER=COADTI-APD\APD
# SQL_DATABASE=TRACKERAPP_TEST
# SQL_USER=COA\svc-clearancetracker
# SQL_PASSWORD=<server-only>

# --- City SSO / Entra ID (DEC-015 / SPRINT-008) ---
# Production direction only. Do not invent live identifiers.
ENTRA_TENANT_ID=TBD
ENTRA_CLIENT_ID=TBD
ENTRA_CLIENT_SECRET=TBD
ENTRA_REDIRECT_URI=TBD
ENTRA_AUTHORIZE_URL=
ENTRA_TOKEN_URL=
ENTRA_ROLE_CLAIM=TBD

# --- SAML / SSO (recorded only; live login is not connected) ---
# Owner direction 2026-10-23: SAML for this application, not an Entra OIDC app registration.
# Enable SSO and choose saml from Admin-Global Security & Authentication.
# Entity ID and Reply URL are for this application. Leave unset until registered.
# Do not use another application's SAML addresses.
SSO_ENABLED=false
SSO_MODE=prototype
'@
$envEx = $envEx -replace '(?s)<<<<<<< HEAD\r?\n# Identity-provider signing certificate and SSO URL stay on the server only\. Do not commit them\.\r?\n=======\r?\nSAML_IDP_METADATA_URL=\r?\n>>>>>>> Security-&-Authentication-pre-rebuild',
@"
SAML_IDP_METADATA_URL=
# Identity-provider signing certificate and SSO URL stay on the server only. Do not commit them.
"@
if ($envEx -match '<<<<<<<') { throw '.env.example still has conflicts' }
Set-Content -LiteralPath 'backend\.env.example' -Value $envEx -Encoding UTF8 -NoNewline
Write-Output 'RESOLVED .env.example'

# --- future-considerations: Security branch FC-003 (prototype active on this branch) ---
$fc = Get-Content -LiteralPath 'docs\planning\future-considerations.md' -Raw
$fc = $fc -replace '(?s)<<<<<<< HEAD\r?\n\| FC-003 \|.*?\r?\n=======\r?\n\| FC-003 \|.*?\r?\n>>>>>>> Security-&-Authentication-pre-rebuild',
  '| FC-003 | Admin Console Security & Authentication (MFA, SSO, session management, API keys & webhooks, database credentials) | ACTIVE prototype for Admin-Global on Security-&-Authentication; production SSO remains FUTURE | Security/privacy and technical authorities — TBD | Owner activated the Settings section for named Admin-Global users. MFA connects named users to the Microsoft Authenticator app with a browser-local time-based code. Database credentials save Windows integrated SQL settings on the API host and do not store a SQL password in the browser. Idle timeout and recorded SSO/token settings remain browser-local. The SSO card records Entra and SAML fields on the API host. Live City SSO and live SAML login are not connected. Production auth remains DEC-015. |'
if ($fc -match '<<<<<<<') { throw 'future-considerations still has conflicts' }
Set-Content -LiteralPath 'docs\planning\future-considerations.md' -Value $fc -Encoding UTF8 -NoNewline
Write-Output 'RESOLVED future-considerations.md'

Write-Output 'DONE_PARTIAL project.json next'
