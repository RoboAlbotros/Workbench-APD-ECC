from pathlib import Path
import re
import json

ROOT = Path(r"C:\Users\E41646\Documents\DTI - In House Tools\Development")
MARKER_OURS = "<<<<<<< HEAD"
MARKER_MID = "======="
MARKER_THEIRS = ">>>>>>> Security-&-Authentication-pre-rebuild"


def replace_one(text: str, replacement: str) -> str:
    pattern = re.compile(
        re.escape(MARKER_OURS) + r".*?" + re.escape(MARKER_THEIRS) + r"\r?\n?",
        re.DOTALL,
    )

    def _repl(_m):
        return replacement

    new, n = pattern.subn(_repl, text, count=1)
    if n != 1:
        raise SystemExit(f"Expected 1 conflict, got {n}")
    return new


def assert_clean(path: Path, text: str) -> None:
    if MARKER_OURS in text or MARKER_THEIRS in text:
        raise SystemExit(f"Conflicts remain in {path}")


# .env.example
env_path = ROOT / "backend" / ".env.example"
env = env_path.read_text(encoding="utf-8")
env = replace_one(
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
env = replace_one(
    env,
    """SAML_IDP_METADATA_URL=
# Identity-provider signing certificate and SSO URL stay on the server only. Do not commit them.
""",
)
assert_clean(env_path, env)
env_path.write_text(env, encoding="utf-8", newline="\n")
print("RESOLVED .env.example")

# future-considerations
fc_path = ROOT / "docs" / "planning" / "future-considerations.md"
fc = fc_path.read_text(encoding="utf-8")
fc = replace_one(
    fc,
    "| FC-003 | Admin Console Security & Authentication (MFA, SSO, session management, API keys & webhooks, database credentials) | ACTIVE prototype for Admin-Global on Security-&-Authentication; production SSO remains FUTURE | Security/privacy and technical authorities — TBD | Owner activated the Settings section for named Admin-Global users. MFA connects named users to the Microsoft Authenticator app with a browser-local time-based code. Database credentials save Windows integrated SQL settings on the API host and do not store a SQL password in the browser. Idle timeout and recorded SSO/token settings remain browser-local. The SSO card records Entra and SAML fields on the API host. Live City SSO and live SAML login are not connected. Production auth remains DEC-015. |\n",
)
assert_clean(fc_path, fc)
fc_path.write_text(fc, encoding="utf-8", newline="\n")
print("RESOLVED future-considerations.md")

# project.json
pj_path = ROOT / "project.json"
pj = pj_path.read_text(encoding="utf-8")
pj = replace_one(
    pj,
    """    "frameworkPhase": "SPRINT-007",
    "workStatus": "complete",
""",
)
pj = replace_one(
    pj,
    """      "nextMilestone": "SPRINT-007 complete. Security-&-Authentication branch rebuilt onto main with SPRINT-009 IIS/ops scaffolding and Admin-Global SSO/MFA prototype. SPRINT-008 (City SSO / Entra and server-side RBAC) remains designated, not authorized. Live SAML/Entra login not connected.",
      "nextRequiredDecision": "Decide whether to authorize SPRINT-008 (C4) and/or continue SPRINT-009 ops (svc account password, SQL .env, DNS/cert). G-ARCH and G-SEC remain pending. Ratification of relayed sprint approvals remains open. Do not invent Entra/SAML identifiers.",
      "decisionsRequired": [],
      "lastUpdated": "2026-10-29T09:24:00-06:00"
""",
)
pj = replace_one(
    pj,
    """  "currentAuthorizedWork": null,
""",
)

hist = re.search(
    re.escape(MARKER_OURS)
    + r"\r?\n(\s*\{ \"timestamp\": \"2026-10-28T15:09:00-06:00\".*?\})\r?\n"
    + re.escape(MARKER_MID)
    + r"\r?\n(.*?)\r?\n"
    + re.escape(MARKER_THEIRS),
    pj,
    re.DOTALL,
)
if not hist:
    raise SystemExit("history conflict not found")
ours_evt = hist.group(1).rstrip().rstrip(",")
theirs_block = hist.group(2).strip().rstrip().rstrip(",")
rebuild_evt = (
    '{ "timestamp": "2026-10-29T09:24:00-06:00", "actor": "Project owner Brett (via agent session, recorded by Cursor primary agent)", '
    '"event": "Security-&-Authentication branch rebuilt from current main (c1c0642). Prior Security tip preserved as Security-&-Authentication-pre-rebuild. '
    "Merged SPRINT-009 IIS/GitHub Actions scaffolding and Admin-Global Security & Authentication / SAML prototype onto main line. "
    'currentAuthorizedWork remains null; SPRINT-007 remains complete. Live SAML/Entra login not connected. G-ARCH and G-SEC remain pending.", '
    '"basis": "Owner statement: Rebuild Security from current main" }'
)
combined = ours_evt + ",\n    " + theirs_block + ",\n    " + rebuild_evt
pj = pj[: hist.start()] + combined + pj[hist.end() :]

pj = replace_one(
    pj,
    """    "timestamp": "2026-10-29T09:24:00-06:00",
""",
)
assert_clean(pj_path, pj)
data = json.loads(pj)
docs = data.setdefault("documentation", {})
docs.setdefault("iisHosting", "docs/operations/iis-hosting.md")
pj_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")
print("RESOLVED project.json")
print("currentAuthorizedWork=", data.get("currentAuthorizedWork"))
print("history_len=", len(data["history"]))
