# Clearance Tracker — system boundaries

Status: APPROVED for G-ARCH (current prototype / INTDEV architecture)
Owner: Brett (technical owner)
Date: 2026-10-30
Evidence for: G-ARCH (does not satisfy G-SEC, G-CAND, or G-REL)

## Purpose

Document system boundaries, external dependencies, interfaces, and trust
boundaries for the CJIS Applicant Tracker as operated today (browser prototype +
localhost Node API + SQL + IIS on INTDEV). Live City SSO / Entra / SAML login is
out of scope for this approval; see `docs/architecture/sso-entra-id.md` and
SPRINT-008 (draft).

## System boundary

| In scope | Out of scope (this G-ARCH) |
| --- | --- |
| Browser UI (`CJISTracker/`) | Live SAML / Entra sign-in |
| Loopback Node API (`backend/`, `127.0.0.1` only) | Public internet bind of the API |
| SQL Server databases `TRACKERAPP_TEST` / `TRACKERAPP_PROD` | Production release candidate |
| IIS ARR reverse proxy on DTIAPPSINTDEV / DTIAPPSINTPRD | Claiming CJIS Security Policy compliance |
| Prototype named users / access codes (browser-local) | Server-side RBAC enforcement (SPRINT-008) |
| Browser change log / audit activity stream | Immutable server-side audit ledger |

## Components and interfaces

```text
Browser (operator)
  → HTTP(S) host header (clearancetracker*.cabq.gov)
  → IIS static files + ARR /api,/health
  → 127.0.0.1:8741 (TEST) or :8742 (PROD INTDEV stack)
  → SQL Server (Windows/NTLM or SQL auth via server-only .env)
```

| Interface | Protocol | AuthN today | Notes |
| --- | --- | --- | --- |
| Browser ↔ IIS | HTTP (HTTPS TBD) | Network / host header | No app-level auth at IIS |
| IIS ↔ Node API | HTTP loopback | None (localhost-unauthenticated prototype) | Must remain loopback |
| Node API ↔ SQL | TDS | Windows or SQL login from `.env` | Secrets not in git |
| Browser localStorage | N/A | Same-origin browser | PINs, change log, some settings |

## External dependencies

| Dependency | Role | Trust note |
| --- | --- | --- |
| SQL Server (`COADTI-APD\APD` on INTDEV) | Applicant persistence | Host/DBA controlled |
| IIS + ARR + URL Rewrite | Static + reverse proxy | App-server controlled |
| Node.js LTS + NSSM Windows Service | API process | App-server controlled |
| npm package `mssql` | SQL driver | Prototype trusted-source (registry.npmjs.org) |
| GitHub Actions self-hosted runners | Deploy | Labels `intdev` / `intprd` |
| Future City IdP (SAML / Entra) | Production auth | TBD identifiers; not connected |

## Trust boundaries

1. **Operator browser ↔ application host** — untrusted network path; prototype has
   no live SSO. Host header and network placement are the interim controls.
2. **IIS ↔ Node API** — trust limited to loopback. Binding the API to a public
   address is excluded.
3. **API ↔ SQL** — credentials or Windows identity live only in server
   `backend\.env` / process identity; not in the repository.
4. **Browser localStorage** — not a trust boundary for production identity;
   prototype PINs and change log are browser-local only.
5. **INTDEV TEST vs PROD stacks** — separate site roots, ports, services, and
   databases so TEST and PROD work do not overwrite each other
   (`docs/operations/iis-hosting.md`).

## Constraints carried into implementation

- Prototype PIN / access-code login is never a production control (DEC-015).
- No DOB/SSN in the data model; Driver Lic Num is in-scope per DEC-020.
- CJIS Security Policy is not claimed as applicable under DEC-013 (no CJI stored);
  revisit if data scope changes.
- G-SEC remains a separate gate and is not satisfied by this document.
