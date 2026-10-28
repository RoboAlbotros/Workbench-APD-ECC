# Sprint 007 — Wire the SQL API

Status: COMPLETE — G-TEST accepted as relayed 2026-10-28
Owner: Brett (technical owner and security/privacy authority)
Version: 0.1.0
Approval: Authorized 2026-10-19 — explicit owner-directed work. Sprint approval
and G-TEST accepted as relayed 2026-10-28 by the project owner on behalf of
joint governance authorities Jessica Solis and Annamarie Zambrano, consistent
with prior sprints; ratification open.
Date: 2026-10-19
Controlling work ID: SPRINT-007

## Work-identity preflight

1. Project: Workbench APD ECC; developmentVersion `0.1.0-dev.1`.
2. Controlling work: SPRINT-007 (was `currentAuthorizedWork`; null as of 2026-10-28 close).
3. Change class: C3 — prototype localhost persistence API using the SPRINT-006
   schema. Bind to `127.0.0.1` only. A deployed or non-localhost listener would
   be C4 and is excluded. Does not satisfy G-ARCH or G-SEC.
4. Allowed files: `backend/**`, `CJISTracker/app.js`, `CJISTracker/index.html`,
   `CJISTracker/README.md`, `CJISTracker/database-schema.sql`,
   `CJISTracker/database-data-migration.sql`, this sprint document,
   `project.json`. Schema refresh is required to persist current app.js fields
   and labels (including Read Only RoleName and the APD department list).
5. Acting function: technical owner Brett directed the work. Agent review does
   not satisfy G-ARCH, G-SEC, G-TEST, or release gates.

## Sprint objective

Wire the CJIS Applicant Tracker so applicant records can persist through a
localhost HTTP API into SQL Server (`CjisApplicantTracker`), using the existing
`database-schema.sql`. Prototype PIN login stays in the browser. If SQL is not
configured or the API is down, the browser keeps using localStorage.

## Authorized basis

Owner statement (verbatim, 2026-10-19):

> SPRINT-007 Wire the SQL API

DEC-015 production auth (City SSO / Entra ID) is **not** in this sprint.

## Change classification

Class: C3 — prototype localhost API and SQL persistence wiring.
Not C4: no public/deployed trust boundary, no Entra, no change to data
classification. G-ARCH and G-SEC remain pending. Production hosting remains TBD.

## In-scope work

1. Localhost HTTP API (`127.0.0.1` only) with health and applicant
   list/create/update (archive via `IsArchived`). Owner-directed delete from
   Archived Records is allowed for Admin-Full, Admin-Global, and Admin-Staff;
   SQL sets `IsDeleted` for rows omitted from the PUT set. No table drop.
2. SQL Server connection from environment values (`.env` local only). Create
   or refresh the database with `CJISTracker/database-schema.sql` so columns,
   department values, and role labels match the current app.js model.
3. Map current `app.js` applicant fields to schema columns. Do not persist
   DOB or SSN (DEC-012 / DEC-017).
4. Wire `CJISTracker` load/save to the API when health reports SQL connected;
   otherwise keep localStorage.
5. Record a prototype trusted-source decision for npm package `mssql` from
   registry.npmjs.org (already named in the SPRINT-006 backend README as the
   intended driver). Production supply-chain policy remains TBD.

## Prototype trusted-source (this sprint only)

- Package: `mssql` (npm), registry `https://registry.npmjs.org`
- Scope: localhost SQL driver for SPRINT-007
- Production supply-chain policy, CI pinning, and SP 800-204D expansion remain TBD
- This is not organizational approval of npm for production hosts

## Explicit exclusions

- No Entra / City SSO login and no live tenant, client ID, or secret.
- No bind to `0.0.0.0`, no cloud deploy, no invented hosting target.
- No production API authentication (localhost prototype only).
- No change-log or documents-blob cutover (documents stay empty arrays in SQL
  this sprint; change log stays in localStorage).
- No claim that G-ARCH, G-SEC, G-CAND, or G-REL are satisfied.
- No DOB/SSN columns.

## Acceptance criteria

- `node backend/src/index.js` can start a `127.0.0.1` listener.
- `GET /health` reports whether SQL is configured and connected.
- When SQL is connected, applicant GET/PUT round-trip persists name parts,
  Driver Lic Num, department (including APD), dates, archive flags.
- When SQL is not connected, the browser app still loads from localStorage.
- No secrets in the repository. `project.json` validates.

## Required artifacts

- `docs/planning/sprints/sprint-007-wire-sql-api.md`
- `backend/src/*` HTTP + SQL wiring
- `CJISTracker/app.js` API adapter
- `CJISTracker/database-schema.sql` (idempotent create/refresh)
- Updated `backend/README.md`, `CJISTracker/README.md`, `project.json`

## Required tests

- Schema-validate `project.json`.
- Health endpoint returns JSON.
- Browser: with API down, localStorage path still works.

## Security considerations

- Localhost bind only. Prototype PIN is never production (DEC-015).
- Threat model remains "Not started" (Rule 50). This sprint does not complete it.
- Privacy Framework / PIA revisit after DEC-020 remains TBD.
- Connection string and SQL password live only in gitignored `.env`.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano (governance, joint) —
  relayed by project owner; ratification open.
- G-TEST: Annamarie Zambrano (QA) — accepted as relayed 2026-10-28 by
  project owner Brett (owner statement: "Close sprint 007 as complete and
  approved"). Ratification by Jessica Solis and Annamarie Zambrano remains
  open. Evidence: `docs/reviews/sprint-007-test-evidence.md`.
- G-ARCH / G-SEC: remain pending; this sprint does not satisfy them.

## Definition of done

- API and browser adapter in the repository
- `project.json` updated and schema-validated
- No Entra login; no public bind
- Documentation updated

## Completion record (2026-10-28)

- Sprint approval and G-TEST accepted as relayed by project owner Brett on
  behalf of Jessica Solis and Annamarie Zambrano (owner statement: "Close
  sprint 007 as complete and approved"; `project.json` history
  2026-10-28T15:09:00-06:00).
- Agent review does not satisfy the gate. Ratification by Jessica Solis and
  Annamarie Zambrano remains open.
- G-TEST evidence: `docs/reviews/sprint-007-test-evidence.md`.
- `currentAuthorizedWork` returned to null. SPRINT-008 remains designated
  (DRAFT — PROPOSED / NOT READY) and is not authorized. G-ARCH and G-SEC
  remain pending. No live Entra login; prototype PIN is never production.
