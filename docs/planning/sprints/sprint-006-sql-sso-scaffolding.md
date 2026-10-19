# Sprint 006 — SQL backend and future Entra SSO scaffolding

Status: COMPLETE — G-TEST accepted as relayed 2026-10-19
Owner: Brett (technical owner and security/privacy authority)
Version: 0.1.0
Approval: Authorized 2026-10-13 — explicit owner-directed work. Sprint approval
relayed by the project owner on behalf of joint governance authorities Jessica
Solis and Annamarie Zambrano, consistent with prior sprints; ratification open.
Date: 2026-10-13
Controlling work ID: SPRINT-006

## Work-identity preflight

1. Project: Workbench APD ECC; developmentVersion `0.1.0-dev.1`.
2. Controlling work: SPRINT-006 (was `currentAuthorizedWork`; null as of 2026-10-19 close).
3. Change class: C3 — new backend surface and future trust-boundary scaffolding
   (SQL schema + reserved server folder + SSO outline). No live API or Entra
   login in this sprint.
4. Allowed files: `CJISTracker/database-schema.sql` (preserve/extend),
   `backend/**`, `docs/architecture/sso-entra-id.md`, this sprint document,
   `project.json`. Browser `app.js` remains localStorage (no API wiring).
5. Acting function: technical owner Brett directed the work; the agent
   implements scaffolding only. Agent review does not satisfy G-ARCH, G-SEC,
   G-TEST, or release gates.

## Sprint objective

Give operators a creatable SQL Server schema that matches the current
`CJISTracker/app.js` field model, plus reserved Node stubs and an Entra ID
connection outline, so a later sprint can wire persistence and City SSO without
inventing tenant IDs, secrets, or a deployment target.

## Authorized basis

Owner statement (verbatim, 2026-10-13):

> Create scafolding for a SQL DB backend and provide SQL schema so database can
> be created for this application. Create scafolding for future SSO connection.

DEC-015 already records production auth as City SSO / Entra ID with server-side
RBAC mirroring Limited / Records / Admin.

## Change classification

Class: C3 — new backend surface / future trust boundary (scaffolding only).
No live listener, no Entra login, no production secrets, no data-scope change.

## In-scope work

1. Extend `CJISTracker/database-schema.sql` so it can be run to create
   `CjisApplicantTracker` and tables aligned with the current app (Applicants
   with unique `ControlNumber`, `SourceName`, all current applicant fields,
   access types, documents, change log, roles Limited/Records/Admin). Idempotent
   `IF NOT EXISTS` / `IF OBJECT_ID` pattern. Comments for DEC-012 (no sensitive
   PII columns), ControlNumber as secondary key, Source read-only in the UI.
2. `backend/` scaffolding: README, `.env.example` (no secrets), db / health /
   applicants-repository stubs. `package.json` lists no installed packages;
   do not run `npm install`.
3. SSO scaffolding: `docs/architecture/sso-entra-id.md` and
   `backend/sso.config.example.json` with TBD fields only. No live Entra login.
4. Update `project.json` (SPRINT-006 authorized/active) and validate.

## Explicit exclusions

- No working production API and no change to the localStorage browser app.
- No `npm install`, deploy, cloud configuration, or external messages.
- No invented deployment target, tenant IDs, client secrets, or City policy.
- No DOB / SSN / driver's license columns (DEC-012 / DEC-017).
- No threat-model completion and no claim that G-ARCH or G-SEC are satisfied.
- SPRINT-005 UI work is not closed by this sprint.

## Acceptance criteria

- `database-schema.sql` is creatable T-SQL and documents sqlcmd / SSMS usage.
- Schema includes ControlNumber (unique when present), SourceName, all current
  applicant fields, junction access types, documents, change log, and the three
  roles. No DOB/SSN/DL columns.
- `backend/` README states the browser app remains localStorage until wired.
- `.env.example` and `sso.config.example.json` contain TBD placeholders only.
- SSO doc describes authorize URL, role claim → Limited/Records/Admin, and
  server-side enforcement; prototype PINs never production.
- `project.json` validates against schema 3.0.0.

## Required artifacts

- `CJISTracker/database-schema.sql`
- `backend/README.md`, `backend/.env.example`, `backend/src/*`
- `docs/architecture/sso-entra-id.md`
- `backend/sso.config.example.json`
- `docs/planning/sprints/sprint-006-sql-sso-scaffolding.md`
- Updated `project.json`

## Required tests

- Schema-validate `project.json` with
  `python $env:TEMP\validate_project.py`.
- Confirm stub entry runs without dependencies: `node backend/src/index.js`
  (prints scaffold health JSON; must not connect or listen).
- No browser API wiring this sprint; CJISTracker behavior is unchanged.

## Security considerations

- C3 scaffolding only; no live trust boundary is opened.
- Threat model remains "Not started" (Rule 50). A live API or Entra login is
  later work and requires threat-model attention before C4.
- PIA remains not required under DEC-012 as interpreted by DEC-017; revisit if
  data scope changes.
- No credentials, applicant PII, or production secrets in the repository.
- `backend/.gitignore` excludes `.env` and `node_modules`.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano (governance, joint) —
  relayed by project owner; ratification open.
- G-TEST: Annamarie Zambrano (QA) — accepted as relayed 2026-10-19 by
  project owner Brett (owner statement: "approve gate for next sprint").
  Ratification by Jessica Solis and Annamarie Zambrano remains open.
- G-ARCH / G-SEC: remain pending; this sprint does not satisfy them.

## Definition of done

- Scaffolding artifacts listed above are in the repository
- `project.json` updated and schema-validated
- Browser app still localStorage; no live Entra login
- Documentation updated

## Execution record (2026-10-13)

- Extended `CJISTracker/database-schema.sql`: idempotent create, field map to
  `app.js`, filtered unique `ControlNumber`, `SourceName`, Entra placeholder
  columns on `AppUsers`, `LastChangedByDisplayName`, seeded roles and lookups.
- Added `backend/` stubs and SSO outline. No npm install. No secrets committed.

## Completion record (2026-10-19)

- Sprint G-TEST accepted as relayed by project owner Brett on behalf of QA
  authority Annamarie Zambrano (owner statement: "approve gate for next sprint";
  `project.json` history 2026-10-19T15:43:00-06:00).
- Agent review does not satisfy the gate. Ratification by Jessica Solis and
  Annamarie Zambrano remains open.
- Scaffolding checks on 2026-10-19: `node backend/src/index.js` printed scaffold
  health JSON without listening or connecting; `project.json` schema-validated
  after this close record.
- `currentAuthorizedWork` returned to null. Next sprint is not authorized until
  the owner designates it. SPRINT-005 G-TEST remains pending. G-ARCH and G-SEC
  remain pending. Browser app remains localStorage; no live Entra login.
