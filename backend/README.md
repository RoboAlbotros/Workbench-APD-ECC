# CJIS Applicant Tracker — backend scaffolding

Status: SCAFFOLDING ONLY (SPRINT-006). Not a working production API.
Owner: Brett (technical owner). Deployment target, hosting, and City policy remain TBD.

This folder is the reserved server-side surface for a future SQL-backed API and
City SSO / Entra ID login (DEC-015). It does **not** serve the browser app today.

## What is true today

- The operator application remains `CJISTracker/` (static HTML/JS, **localStorage**).
- Opening `CJISTracker/index.html` does not call this backend.
- A later sprint must wire persistence, auth, and RBAC before any production use.
- Prototype PINs in the browser app are never production controls (DEC-015).

## Create the database

The creatable T-SQL script is `CJISTracker/database-schema.sql` (SQL Server / Azure SQL).
It is idempotent and seeds Limited / Records / Admin roles plus lookup values.

sqlcmd (Windows Authentication):

```text
sqlcmd -S <server> -E -i "CJISTracker\database-schema.sql"
```

SSMS: open `CJISTracker/database-schema.sql` and Execute (F5).

Do not put credentials, tenant IDs, or applicant records in this repository.
Copy `.env.example` to `.env` locally if you need placeholders; `.env` is gitignored.

## Layout

```text
backend/
  README.md                    this file
  .env.example                 SQL and Entra placeholders (no secrets)
  .gitignore                   ignores .env and node_modules
  package.json                 scripts only; no packages installed this sprint
  sso.config.example.json      Entra / role-claim stubs (all IDs TBD)
  src/
    index.js                   process entry; prints health JSON (no HTTP listen)
    db.js                      connection placeholder (does not connect)
    health.js                  health payload stub
    sso.js                     role-claim map stub (no live Entra login)
    repositories/
      applicants.js            applicants repository stub (not implemented)
```

SSO outline (authorize URL, claim → Limited/Records/Admin, server-side enforcement):
`docs/architecture/sso-entra-id.md`.

## Node runtime

`package.json` lists no installed dependencies. `src/*.js` uses Node built-ins only
so the stubs can be inspected without `npm install`. A SQL driver (for example
`mssql`) is an intended future dependency and requires a recorded trusted-source
decision before install. **Do not run `npm install` for this sprint.**

```text
node src/index.js
```

prints a scaffold health object. It does not open a port, connect to SQL, or
contact Entra ID.

## Explicit non-goals (this sprint)

- No live HTTP API, no listener, no CORS policy.
- No live Entra login, no client secret, no tenant configuration.
- No deployment, cloud workspace, or connection-string check-in.
- No npm install, no credentials in the repo.
