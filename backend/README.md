# CJIS Applicant Tracker — SQL API (loopback)

Status: SPRINT-007 localhost prototype; SPRINT-009 IIS edge on INTDEV/INTPRD.
Owner: Brett (technical owner). See `docs/operations/iis-hosting.md`.

This folder serves a **127.0.0.1-only** HTTP API that persists applicant records
to SQL Server. IIS reverse-proxies `/api` and `/health` on the public host.
Prototype PIN login stays in the browser. City SSO / Entra ID (DEC-015) is
**not** implemented here (SPRINT-008).

## What is true today

- Bind host is `127.0.0.1` (default port `8741`). A public bind is excluded.
- `GET /health` reports whether SQL is configured and connected.
- `GET /api/applicants` and `PUT /api/applicants` round-trip current `app.js` fields.
- `SQL_AUTHENTICATION=sql` (default) or `windows` (NTLM for `DOMAIN\user`).
- Documents and the change log stay in browser storage this sprint.
- If SQL is not configured or the API is down, `CJISTracker/` keeps using localStorage.
- Prototype PINs are never production controls (DEC-015).

## Create the database

The creatable T-SQL script is `CJISTracker/database-schema.sql` (SQL Server / Azure SQL).
It is idempotent. Re-run it to refresh constraints and labels. It seeds
Read Only (`RoleCode` limited), Records View, and Full Admin plus lookup values.

```text
sqlcmd -S <server> -E -i "CJISTracker\database-schema.sql"
```

SSMS: open `CJISTracker/database-schema.sql` and Execute (F5).

Do not put credentials, tenant IDs, or applicant records in this repository.
Copy `.env.example` to `.env` locally or on the app server and replace `TBD`.
`.env` is gitignored. Prefer Windows/NTLM (`SQL_AUTHENTICATION=windows`) for
`COA\svc-clearancetracker` on INTDEV once DBA grants access.

## Prototype trusted-source (this sprint only)

Package: `mssql` from `https://registry.npmjs.org`.
Recorded for the SPRINT-007 localhost prototype only. Production supply-chain
policy remains TBD (SP 800-204D expansion). This is not organizational approval
of npm for production.

```text
cd backend
copy .env.example .env
npm install
npm start
```

`GET http://127.0.0.1:8741/health` should return JSON. `database.connected` is
true only after `.env` points at a reachable `CjisApplicantTracker` database.

## Layout

```text
backend/
  README.md                    this file
  .env.example                 SQL and Entra placeholders (no secrets)
  .gitignore                   ignores .env and node_modules
  package.json                 mssql prototype dependency
  sso.config.example.json      Entra / role-claim stubs (all IDs TBD)
  src/
    index.js                   127.0.0.1 listener; /health and /api/applicants
    env.js                     reads local .env (does not print secrets)
    db.js                      mssql connection from environment
    health.js                  health payload
    sso.js                     role-claim map stub (no live Entra login)
    repositories/
      applicants.js            list + upsert mapped to database-schema.sql
```

SSO outline (authorize URL, claim → Limited/Records/Admin, server-side enforcement):
`docs/architecture/sso-entra-id.md`.

## Hosting

IIS + Windows Service install and GitHub Actions: `docs/operations/iis-hosting.md`
and `deploy/`.

## Explicit non-goals

- No Entra / City SSO login, no client secret, no tenant configuration (SPRINT-008).
- No bind to `0.0.0.0` — IIS is the public edge; API stays on loopback.
- No production API authentication until Entra is wired.
- G-ARCH and G-SEC remain pending.
