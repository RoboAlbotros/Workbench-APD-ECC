# Sprint 008 — City SSO / Entra and server-side RBAC (DEC-015)

Status: DRAFT — PROPOSED / NOT READY
Owner: Brett (technical owner and security/privacy authority)
Version: 0.1.0
Approval: Pending
Date: 2026-10-22
Controlling work ID: SPRINT-008 (draft). `currentAuthorizedWork` remains SPRINT-007.

## Sprint objective

Implement DEC-015: City SSO / Microsoft Entra ID sign-in, with server-side
role-based access that mirrors Read Only (`limited`), Records (`records`), and
Admin (`admin`). Prototype PIN codes stop being accepted as proof of identity
or authorization on the API.

## Work-identity preflight

1. Project: Workbench APD ECC; developmentVersion `0.1.0-dev.1`.
2. Controlling authorized work today: SPRINT-007. This file is a draft only.
   Implementation is NOT authorized until the owner records approval and
   `project.json` `currentAuthorizedWork` is set to SPRINT-008.
3. Change class: C4 — identity, authorization, and a live trust boundary
   (Rule 00). Requires security review, a documented threat model, and
   governance authority approval in addition to C3 requirements.
4. Proposed files (when authorized): `backend/**`, `CJISTracker/app.js`,
   `CJISTracker/index.html`, `CJISTracker/README.md`,
   `docs/architecture/sso-entra-id.md`, `backend/sso.config.example.json`,
   `backend/.env.example`, this sprint document, `project.json`.
5. Acting function: technical owner / security/privacy authority Brett.
   Agent review cannot approve C4, satisfy G-ARCH, G-SEC, or G-TEST, or
   substitute for City identity operations.

## Recorded direction (DEC-015)

Recorded 2026-10-08 by security/privacy authority Brett:

- Production authentication is City SSO / Entra ID.
- Authorization is server-side RBAC mirroring the three prototype views.
- Prototype local PINs are never production controls.

Scaffolding already in the repository (SPRINT-006; not live):

- `docs/architecture/sso-entra-id.md`
- `backend/sso.config.example.json` (all identifiers TBD)
- `backend/src/sso.js` (`mapRoleClaim`; `assertServerSideEnforcement` throws)
- `dbo.AppUsers.EntraObjectId` and `SecurityRoles` flags in
  `CJISTracker/database-schema.sql`

## Inputs required before READY

Do not invent these values. City identity operations (or the named owner) must
supply them:

| Input | Current value | Owner |
| --- | --- | --- |
| Entra tenant ID | TBD | City identity operations |
| App registration / client ID | TBD | City identity operations |
| Client secret or certificate | TBD — gitignored `.env` only | City identity operations |
| Redirect URI | TBD | City identity operations + technical owner |
| Authorize / token URLs | `login.microsoftonline.com/TBD/oauth2/v2.0/…` | follows tenant ID |
| Role claim name | TBD | City identity operations |
| Claim values → `limited` / `records` / `admin` | TBD | City identity operations + product owner |
| Admin-Full / Admin-Global / Admin-Staff mapping | TBD — not in DEC-015 | Product + security/privacy authorities |
| Host / redirect environment | `deploymentTarget` is null | Technical owner — do not invent |

## In-scope work

- Wire Entra authorize + token redeem using supplied registration values.
- Validate tokens on the server. Ignore browser-supplied role names.
- Reject prototype PINs as API credentials.
- Map a validated role claim onto `limited` | `records` | `admin` through
  `backend/src/sso.js` `mapRoleClaim`. Unknown or missing claims deny access.
  Do not default to Admin.
- Enforce `SecurityRoles` flags (`CanViewLimited`, `CanViewRecords`,
  `CanViewAdmin`, `CanEditApplicants`, `CanDeleteApplicants`) on each
  applicant GET/PUT and on archive / restore / delete paths.
- Persist Entra object ID on `dbo.AppUsers.EntraObjectId` when a user is
  provisioned. Bind change-log actor to that `AppUsers` row when that path
  is in this sprint.
- Replace or retire the tracker PIN sign-in as the production control once
  Entra sign-in works. PIN leftover in the browser, if any, remains
  non-production.
- Update `docs/architecture/sso-entra-id.md` from scaffolding to the wired
  design without inventing identifiers.

## Explicit exclusions

- Not authorized to start while SPRINT-007 remains `currentAuthorizedWork`,
  unless the owner records an overlap.
- No invented tenant ID, client ID, secret, redirect URI, or role-claim name.
- No public bind, cloud deploy, or invented `deploymentTarget`.
- No live Entra login against TBD placeholders.
- Admin-Full / Admin-Global / Admin-Staff are not mapped until a recorded
  decision. DEC-015 names only `limited` | `records` | `admin`.
- Documents blob and change-log SQL cutover stay out unless separately named.
- FC-003 Admin Console MFA / SSO placeholder cards stay FUTURE.
- FC-007 product-owner confirmation checklist build-out stays FUTURE.
- Encryption at rest / CJIS certification stay out (DEC-013: CJIS Security
  Policy not directly applicable; G-SEC pending).
- No DOB/SSN. No CJI.
- No claim that G-ARCH, G-SEC, G-CAND, or G-REL are satisfied by this draft.

## Acceptance criteria

- A user signs in through City SSO / Entra ID using supplied registration
  values (not invented placeholders).
- Unauthenticated `GET` / `PUT /api/applicants` fail.
- A `limited` token cannot edit, archive, or delete.
- A `records` token can edit and cannot delete from Archived Records.
- An `admin` token can perform the recorded admin actions for `admin`.
- Unknown or missing role claims are denied.
- Prototype PIN codes do not authorize the API.
- No secrets in the repository. `project.json` validates.

## Change classification

Class: C4
Reason: identity, authorization, and a live trust boundary (Rule 00). A
localhost rehearsal that still validates Entra tokens is still C4. Uncertain
classification MUST take the more controlled class.

## Required artifacts

- `docs/planning/sprints/sprint-008-sso-entra-rbac.md` (this file)
- Wired `backend/src` authn/authz on the existing API (or a later recorded host)
- Updated `docs/architecture/sso-entra-id.md`
- Tracker sign-in path that does not treat PINs as production
- G-TEST evidence when the sprint is executed
- Updated `backend/README.md`, `CJISTracker/README.md`, `project.json`

## Required tests

- Schema-validate `project.json`.
- Unauthenticated API calls fail.
- Role-denied actions fail on the server, not only in the browser.
- PIN presented to the API is rejected.
- G-TEST evidence for Annamarie Zambrano (Rule 40) when executed.

## Security considerations

- C4 requires a documented threat model (Rule 00 / 50). Threat model remains
  "Not started."
- G-SEC is pending and is not satisfied by this draft.
- Privacy Framework / PIA revisit after DEC-020 remains TBD.
- Entra client secret and SQL password live only in gitignored `.env`.
- Prototype PIN codes in the browser and source stay non-production (DEC-015).
- DEC-013 remains: CJIS Security Policy is not directly applicable (no CJI).
  Revisit if data scope changes.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano (governance, joint) —
  pending. A draft or owner designation is not approval to implement.
- G-ARCH: pending (technical owner). Live Entra is architecture work.
- G-SEC: pending (security/privacy authority). Required for C4.
- G-TEST: Annamarie Zambrano (QA) — pending when the sprint is executed.
- SPRINT-007 G-TEST remains pending and is not closed by this draft.

## Scoped specialist gates and applicability decisions

- G-SCOPE: already satisfied for the tracker (DEC-001 product definition).
  This sprint does not change product scope.
- G-ARCH: applicable — Entra attach and server enforcement.
- G-SEC: applicable — C4 identity/authorization.
- Threat model: applicable before or with implementation.
- Privacy Framework / PIA: remains not-applicable under DEC-014 as later
  interpreted; revisit only if data scope changes.
- CJIS Security Policy: remains not directly applicable (DEC-013).
- G-CAND / G-REL: not in this sprint. No 0.1.0 candidate.

## Delegation plan and charter references

- none. Primary agent drafts and, if later authorized, implements within the
  recorded charter. Subagent review cannot approve C4 or satisfy gates.

## Handoff expectations

- To City identity operations: list of TBD inputs above; no invented IDs.
- To technical owner: wired API + tracker sign-in, README, threat-model
  draft if that work is authorized with the sprint.
- To QA (Annamarie): unauthenticated and role-denied test evidence.
- To governance (Jessica + Annamarie): sprint approval and ratification.
- Returned evidence lives in `docs/reviews/` when the sprint is executed.

## Definition of done

- All acceptance criteria met with recorded evidence
- Required C4 gates recorded by their accountable functions
- `project.json` updated and validated
- Documentation updated
- No invented Entra identifiers and no secrets in git

## Readiness decision and evidence

Readiness: NOT READY
Decided by: Cursor primary agent completing the DEC-015 sprint draft
  (not an approval)
Evidence: Tenant / client / redirect / role-claim values are TBD; G-ARCH and
G-SEC unsatisfied; SPRINT-007 still authorized; no threat model recorded.

This sprint MUST NOT start from this file alone. Owner must say the sprint is
approved or "go," and `currentAuthorizedWork` must be updated.
