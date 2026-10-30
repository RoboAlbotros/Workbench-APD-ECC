from pathlib import Path
import re
import json

ROOT = Path(r"C:\Users\E41646\Documents\DTI - In House Tools\Development")
MARKER_OURS = "<<<<<<< HEAD"
MARKER_MID = "======="
MARKER_THEIRS = ">>>>>>> Security-&-Authentication-pre-rebuild"


def strip_conflict(text: str, replacement: str) -> str:
    pattern = re.compile(
        re.escape(MARKER_OURS) + r".*?" + re.escape(MARKER_THEIRS) + r"\r?\n?",
        re.DOTALL,
    )
    new, n = pattern.subn(replacement, text, count=1)
    if n != 1:
        raise SystemExit(f"Expected 1 conflict replacement, got {n}")
    if MARKER_OURS in new:
        raise SystemExit("Conflicts remain after replacement")
    return new


# --- app.js ---
app_path = ROOT / "CJISTracker" / "app.js"
app = app_path.read_text(encoding="utf-8")
app_repl = """/** UUID helper that works on HTTP intranet hosts (crypto.randomUUID needs a secure context). */
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
"""
app_path.write_text(strip_conflict(app, app_repl), encoding="utf-8", newline="\n")
print("RESOLVED app.js")

# --- index.html ---
html_path = ROOT / "CJISTracker" / "index.html"
html = html_path.read_text(encoding="utf-8")
html = strip_conflict(
    html,
    '    <link rel="stylesheet" href="styles.css?v=security-rebuild-main" />\n',
)
html = strip_conflict(
    html,
    '    <script src="mfa-authenticator.js?v=security-rebuild-main"></script>\n'
    '    <script src="app.js?v=security-rebuild-main"></script>\n',
)
html_path.write_text(html, encoding="utf-8", newline="\n")
print("RESOLVED index.html")

# --- .env.example ---
env_path = ROOT / "backend" / ".env.example"
env = env_path.read_text(encoding="utf-8")
env = strip_conflict(
    env,
    """# INTDEV example (replace TBD; do not commit real passwords):
# SQL_AUTHENTICATION=windows
# SQL_SERVER=COADTI-APD\\APD
# SQL_DATABASE=TRACKERAPP_TEST
# SQL_USER=COA\\svc-clearancetracker
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
""",
)
env = strip_conflict(
    env,
    """SAML_IDP_METADATA_URL=
# Identity-provider signing certificate and SSO URL stay on the server only. Do not commit them.
""",
)
env_path.write_text(env, encoding="utf-8", newline="\n")
print("RESOLVED .env.example")

# --- future-considerations.md ---
fc_path = ROOT / "docs" / "planning" / "future-considerations.md"
fc = fc_path.read_text(encoding="utf-8")
fc = strip_conflict(
    fc,
    "| FC-003 | Admin Console Security & Authentication (MFA, SSO, session management, API keys & webhooks, database credentials) | ACTIVE prototype for Admin-Global on Security-&-Authentication; production SSO remains FUTURE | Security/privacy and technical authorities — TBD | Owner activated the Settings section for named Admin-Global users. MFA connects named users to the Microsoft Authenticator app with a browser-local time-based code. Database credentials save Windows integrated SQL settings on the API host and do not store a SQL password in the browser. Idle timeout and recorded SSO/token settings remain browser-local. The SSO card records Entra and SAML fields on the API host. Live City SSO and live SAML login are not connected. Production auth remains DEC-015. |\n",
)
fc_path.write_text(fc, encoding="utf-8", newline="\n")
print("RESOLVED future-considerations.md")

# --- project.json: keep main sprint-007 close; append SPRINT-009 history ---
pj_path = ROOT / "project.json"
raw = pj_path.read_text(encoding="utf-8")
# Resolve by reconstructing from ours (main) with Security history appended.
# Use textual conflict resolution then json load.

def take_side(block: str, side: str) -> str:
    # side: ours | theirs
    m = re.match(
        re.escape(MARKER_OURS) + r"\r?\n(.*?)\r?\n" + re.escape(MARKER_MID) + r"\r?\n(.*?)\r?\n" + re.escape(MARKER_THEIRS),
        block,
        re.DOTALL,
    )
    if not m:
        raise SystemExit(f"Bad conflict block: {block[:120]}")
    return m.group(1) if side == "ours" else m.group(2)

# Manually replace each project.json conflict
pj = raw

# 1 frameworkPhase/workStatus - keep main complete/007; document rebuild in history later
pj = strip_conflict(
    pj,
    """    \"frameworkPhase\": \"SPRINT-007\",
    \"workStatus\": \"complete\",
""",
)

# 2 nextMilestone - combine
pj = strip_conflict(
    pj,
    """      \"nextMilestone\": \"SPRINT-007 complete. Security-&-Authentication branch rebuilt onto main with SPRINT-009 IIS/ops scaffolding and Admin-Global SSO/MFA prototype. SPRINT-008 (City SSO / Entra and server-side RBAC) remains designated, not authorized. Live SAML/Entra login not connected.\",
      \"nextRequiredDecision\": \"Decide whether to authorize SPRINT-008 (C4) and/or continue SPRINT-009 ops (svc account password, SQL .env, DNS/cert). G-ARCH and G-SEC remain pending. Ratification of relayed sprint approvals remains open. Do not invent Entra/SAML identifiers.\",
      \"decisionsRequired\": [],
      \"lastUpdated\": \"2026-10-29T09:24:00-06:00\"
""",
)

# 3 currentAuthorizedWork - keep null from main (do not re-open 009 without owner)
pj = strip_conflict(
    pj,
    """  \"currentAuthorizedWork\": null,
""",
)

# 4 history - keep 007 close AND append 009 events from theirs
# Extract theirs history events from original conflict by parsing raw once more
hist_match = re.search(
    re.escape(MARKER_OURS)
    + r"\r?\n(.*?)\r?\n"
    + re.escape(MARKER_MID)
    + r"\r?\n(.*?)\r?\n"
    + re.escape(MARKER_THEIRS),
    raw[raw.index('"timestamp": "2026-10-28T15:09:00-06:00"') - 200 :],
    re.DOTALL,
)
# Find the history conflict specifically
hist_conflict = re.search(
    re.escape(MARKER_OURS)
    + r"\r?\n(\s*\{ \"timestamp\": \"2026-10-28T15:09:00-06:00\".*?\})\r?\n"
    + re.escape(MARKER_MID)
    + r"\r?\n(.*?)\r?\n"
    + re.escape(MARKER_THEIRS),
    pj,
    re.DOTALL,
)
if not hist_conflict:
    raise SystemExit("history conflict not found")
ours_evt = hist_conflict.group(1).rstrip().rstrip(",")
theirs_block = hist_conflict.group(2).strip()
# theirs is three events without wrapping commas necessarily
rebuild_evt = (
    '{ "timestamp": "2026-10-29T09:24:00-06:00", "actor": "Project owner Brett (via agent session, recorded by Cursor primary agent)", '
    '"event": "Security-&-Authentication branch rebuilt from current main (c1c0642). Prior Security tip preserved as Security-&-Authentication-pre-rebuild. '
    "Merged SPRINT-009 IIS/GitHub Actions scaffolding and Admin-Global Security & Authentication / SAML prototype onto main line. "
    'currentAuthorizedWork remains null; SPRINT-007 remains complete. Live SAML/Entra login not connected. G-ARCH and G-SEC remain pending.", '
    '"basis": "Owner statement: Rebuild Security from current main" }'
)
combined = ours_evt + ",\n    " + theirs_block.rstrip().rstrip(",") + ",\n    " + rebuild_evt
pj = pj[: hist_conflict.start()] + combined + pj[hist_conflict.end() :]

# 5 validation timestamp
pj = strip_conflict(
    pj,
    """    \"timestamp\": \"2026-10-29T09:24:00-06:00\",
""",
)

if MARKER_OURS in pj:
    raise SystemExit("project.json still has conflict markers")

data = json.loads(pj)
# Ensure documentation keys from Security if missing
docs = data.setdefault("documentation", {})
docs.setdefault("iisHosting", "docs/operations/iis-hosting.md")
pj_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")
print("RESOLVED project.json")
print("currentAuthorizedWork=", data.get("currentAuthorizedWork"))
print("workStatus=", data["state"]["workStatus"])
print("history_len=", len(data["history"]))
