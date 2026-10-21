# Sprint 008 — City SSO / Entra and server-side RBAC

Status: PROPOSED — NOT AUTHORIZED
Owner: Brett (technical owner and security/privacy authority)
Version: 0.1.0
Approval: Pending — designated 2026-10-21 by the project owner; not approved to start
Date: 2026-10-21
Controlling work ID: SPRINT-008 (proposed). `currentAuthorizedWork` remains SPRINT-007.

## Work-identity preflight

1. Project: Workbench APD ECC; developmentVersion `0.1.0-dev.1`.
2. Controlling authorized work today: SPRINT-007. This document is a designation
   only. Implementation of SPRINT-008 is NOT authorized until the owner records
   approval and `project.json` `currentAuthorizedWork` is set to SPRINT-008.
3. Proposed change class: C4 — identity, authorization, and a live trust
   boundary (Rule 00). Requires security review, a documented threat model, and
   governance authority approval in addition to C3 requirements.
4. Proposed files (when authorized): `backend/**`, `CJISTracker/app.js`,
   `CJISTracker/index.html`, `CJISTracker/README.md`,
   `docs/architecture/sso-entra-id.md`, `backend/sso.config.example.json`,
   this sprint document, `project.json`. Do not invent tenant IDs, client IDs,
   secrets, or a hosting target.
5. Acting function: technical owner / security/privacy authority Brett designated
   the theme. Agent review cannot approve C4, satisfy G-ARCH, G-SEC, G-TEST, or
   substitute for City identity operations.

## Sprint objective

Replace prototype PIN login as the production control with City SSO / Microsoft
Entra ID and enforce Read Only / Records / Admin on the server, per DEC-015.

## Authorized basis

Owner statement (verbatim, 2026-10-21):

> Sprint 008 will be SS/Entra and server-side RBAC.

Read as City SSO / Entra ID plus server-side RBAC. DEC-015 already records that
production direction. Tenant ID, client ID, client secret, redirect URI, scopes,
app registration, and role-claim names remain TBD. Do not invent them.

## Change classification

Class: C4 — identity, authorization, trust boundary.
Uncertain classification MUST take the more controlled class (Rule 00).
A localhost-only rehearsal that still validates Entra tokens is still C4.
This sprint does not satisfy G-ARCH or G-SEC by being written down.

## In-scope work (when authorized)

1. Wire City SSO / Entra ID sign-in using the SPRINT-006 outline in
   `docs/architecture/sso-entra-id.md` and `backend/sso.config.example.json`.
   Use values supplied by City identity operations. Do not invent identifiers.
2. Validate tokens on the server. Browser-supplied role names and prototype
   PINs MUST NOT authorize API access.
3. Map a validated role claim onto `limited` | `records` | `admin`
   (`backend/src/sso.js` `mapRoleClaim`). Unknown or missing claims deny
   access. Do not default to Admin.
4. Enforce `SecurityRoles` flags in the API / repository layer on each
   request (view, edit, archive, delete).
5. Persist the Entra object ID on `dbo.AppUsers.EntraObjectId` when a user is
   provisioned. Bind change-log actor to the signed-in `AppUsers` row when
   that path is in scope.

## Explicit exclusions

- Not authorized to start while SPRINT-007 remains `currentAuthorizedWork`,
  unless the owner records an overlap.
- No invented tenant ID, client ID, secret, redirect URI, or role-claim name.
- No public bind, cloud deploy, or invented `deploymentTarget`.
- Prototype PINs remain never-production (DEC-015). Do not accept them as
  API proof of identity.
- Admin-Full / Admin-Global / Admin-Staff mapping is TBD. Recorded Entra
  roles are only `limited` | `records` | `admin`.
- Documents blob and change-log SQL cutover stay out unless separately named.
- FC-003 Admin Console MFA / SSO placeholder UI stays FUTURE.
- FC-007 product-owner confirmation checklist build-out stays FUTURE.
- No claim that G-ARCH, G-SEC, G-CAND, or G-REL are satisfied.
- No DOB/SSN. No CJI.

## Acceptance criteria (when authorized)

- A user can sign in through City SSO / Entra ID using supplied registration
  values (not invented placeholders).
- `GET` / `PUT /api/applicants` reject unauthenticated requests.
- A Read Only token cannot edit, archive, or delete.
- A Records token can edit and cannot delete from Archived Records.
- An Admin token can perform the recorded admin actions for `admin`.
- Unknown role claims are denied.
- No secrets in the repository. `project.json` validates.

## Required artifacts

- `docs/planning/sprints/sprint-008-sso-entra-rbac.md` (this file)
- Updates to `docs/architecture/sso-entra-id.md` when values are supplied
- Server authn/authz on the existing localhost API (or a later recorded host)
- Tracker sign-in path that does not treat PINs as production
- Updated `backend/README.md`, `CJISTracker/README.md`, `project.json`

## Required tests

- Schema-validate `project.json`.
- Unauthenticated API calls fail.
- Role-denied actions fail on the server, not only in the browser.
- G-TEST evidence for Annamarie Zambrano when the sprint is executed.

## Security considerations

- C4: documented threat model is required before or with this work (Rule 00/50).
  Threat model remains "Not started."
- G-SEC is pending and is not satisfied by this proposal.
- Privacy Framework / PIA revisit after DEC-020 remains TBD.
- Connection secrets and Entra client secret live only in gitignored `.env`.
- Prototype PIN codes in the browser and source stay non-production.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano (governance, joint) —
  pending. Owner designation is not approval to implement.
- G-ARCH: pending (technical owner). Live Entra is architecture work.
- G-SEC: pending (security/privacy authority). C4 requires this gate.
- G-TEST: Annamarie Zambrano (QA) — pending when the sprint is executed.
- SPRINT-007 G-TEST remains pending and is not closed by this designation.

## Definition of done

- Acceptance criteria met with recorded evidence
- Required C4 gates recorded by their accountable functions
- `project.json` updated and schema-validated
- Documentation updated
- No invented Entra identifiers and no secrets in git

## Readiness decision and evidence

Readiness: NOT READY
Decided by: Cursor primary agent recording owner designation (not an approval)
Evidence: Tenant / client / redirect / role-claim values are TBD; G-ARCH and
G-SEC unsatisfied; SPRINT-007 still authorized; no threat model recorded.

This sprint MUST NOT start from this file alone. Owner must say the sprint is
approved or "go," and `currentAuthorizedWork` must be updated.
