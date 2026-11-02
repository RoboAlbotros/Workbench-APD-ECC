# Security review remediations (2026-11-02)

Owner-directed work on `dev`. This does **not** satisfy G-SEC. Live City SSO / Entra is not connected. `currentAuthorizedWork` remains null.

| ID | Finding | Disposition |
| --- | --- | --- |
| FIND-SEC-001 | Unauthenticated `/api/*` and `/health` | Remediated: `/api/*` requires a signed HttpOnly session. Public `/health` stays for smoke and is redacted. |
| FIND-SEC-002 | Unauthenticated `.env` rewrite via SQL/SSO settings | Remediated: settings GET/PUT require Admin-Global session. |
| FIND-SEC-003 | Unauthenticated applicant read/write | Remediated: `GET`/`PUT /api/applicants` require a signed session. |
| FIND-SEC-004 | TEST stack `.env` pointed at PROD database via tmp script | Remediated: `tmp-set-prod-db.ps1` and `tmp-scp-set-prod-db.ps1` removed and gitignored. |
| FIND-SEC-005 | Unauthenticated SQL test probe | Remediated: `POST /api/sql-settings/test` requires Admin-Global. |
| FIND-SEC-006 | Health/settings disclosure | Remediated: public `/health` returns status + connected/configured only. Detailed health is `/api/health` with a session. Settings require Admin-Global. |
| FIND-SEC-007 | HTTP-only IIS site | Mitigated: security headers added; HTTPS redirect rule is present and disabled until a certificate is bound. Live HTTPS is still TBD. |
| FIND-SEC-008 | Automatic `dev` push deploy to INTDEV PROD | Remediated: `deploy-intdev-prod.yml` is `workflow_dispatch` only. |
| FIND-SEC-009 | Tmp mass-update / host-apply scripts | Remediated: `tmp-*` operator scripts removed and gitignored. |
| FIND-SEC-010 | `C:\Users\Public` staging scripts | Remediated: SCP/Public staging helpers removed. |
| FIND-SEC-011 | Empty `openFindings` / no branch protection | Recorded: findings listed in `project.json`. Branch protection remains a GitHub admin action if the API cannot enable it. |
| FIND-SEC-012 | SSH inventory in git | Remediated: connectivity note redacted (no IP, ports, fingerprint, or authorized-key path). |

Evidence in code: `backend/src/api-auth.js`, `backend/src/index.js`, `backend/src/health.js`, `CJISTracker/app.js`, `deploy/iis/web.config`, `.github/workflows/deploy-intdev-prod.yml`, `.gitignore`.
