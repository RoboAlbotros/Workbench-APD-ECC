# Future City SSO / Entra ID connection

Status: SCAFFOLDING — not implemented
Owner: Brett (technical owner and security/privacy authority)
Decision: DEC-015 (2026-10-08)
Date: 2026-10-13
Controlling work ID: SPRINT-006 (scaffolding). Proposed wiring sprint: SPRINT-008
(docs/planning/sprints/sprint-008-sso-entra-rbac.md) — DRAFT / NOT READY.

This document outlines how production authentication SHOULD attach later. It is
not an approved architecture decision record, not a City policy, and not a live
integration. Do not invent identifiers.

Owner direction (Brett, 2026-10-23): sign-in for this application uses **SAML**,
not an Entra OIDC app registration. Tenant ID and Client ID are not required.
Identifier (Entity ID), Reply URL, and the identity-provider certificate remain
**TBD** and must be issued for this application. Live SAML login is not
implemented. DEC-015 (below) remains the earlier recorded Entra ID direction.

## Recorded direction (DEC-015)

Production authentication is City SSO / Microsoft Entra ID, with **server-side**
role-based access that mirrors the three prototype views:

| App role | SecurityRoles.RoleCode | SecurityRoles.RoleName | Intended capability (already seeded) |
| --- | --- | --- | --- |
| Read Only | `limited` | Read Only | Read limited fields only |
| Records View | `records` | Records View | View and edit applicants; no delete |
| Full Admin | `admin` | Full Admin | Create, edit, delete, change log |

Prototype local PINs (`CJISTracker/` access codes, including operator-set Full
Admin `12345`) are **never** production controls. They MUST NOT be accepted by a
future API as proof of identity or authorization.

## Authorize and token URLs

Standard Entra ID v2 endpoints, with the tenant segment left unassigned:

```text
https://login.microsoftonline.com/TBD/oauth2/v2.0/authorize
https://login.microsoftonline.com/TBD/oauth2/v2.0/token
```

A later wiring sprint would send the user to the authorize URL, redeem the
authorization code at the token URL, and validate tokens on the server. Redirect
URI, scopes, and app registration remain TBD pending City identity operations.

Example config (empty / TBD fields only): `backend/sso.config.example.json`.
Example environment names: `backend/.env.example`.

## Role claim → Limited / Records / Admin

1. After a validated sign-in, the server reads a role claim (claim name TBD).
2. `backend/src/sso.js` `mapRoleClaim` is the placeholder for mapping that
   claim value onto `limited` | `records` | `admin`.
3. Unknown or missing claims MUST deny access. Do not default to Admin.
4. Persist the Entra object ID on `dbo.AppUsers.EntraObjectId` when users are
   provisioned (column exists; unused until wiring).

Browser-supplied role names MUST be ignored. The API enforces the mapped role
on every request.

## Server-side enforcement

When an API exists:

- Authentication: valid Entra token for the TBD app registration.
- Authorization: `SecurityRoles` flags (`CanViewLimited`, `CanViewRecords`,
  `CanViewAdmin`, `CanEditApplicants`, `CanDeleteApplicants`) applied in the
  repository / route layer — not only in CSS or `app.js`.
- Audit: `ApplicantChangeLog` already records actor display name and role;
  bind `ChangedByUserId` to the signed-in `AppUsers` row.

This sprint does **not** implement login, token validation, or HTTP routes.

## Explicit non-goals

- No live login against Entra ID.
- No tenant, client secret, or production redirect in the repository.
- No change to the current localStorage prototype sign-in.
- Deployment target remains `null` in `project.json`.
- G-ARCH and G-SEC remain pending; this outline does not satisfy them.

## Related artifacts

- `CJISTracker/database-schema.sql` — `SecurityRoles`, `AppUsers` Entra columns
- `backend/sso.config.example.json`
- `backend/src/sso.js`
- `project.json` `security.authentication` (DEC-015)
