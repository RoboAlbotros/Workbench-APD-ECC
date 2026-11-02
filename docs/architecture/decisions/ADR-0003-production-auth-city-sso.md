# ADR-0003 — Production authentication direction (City SSO / SAML)

Status: Accepted (direction only — not implemented)
Date: 2026-10-30
Owner: Brett (technical owner and security/privacy authority)
Related: DEC-015; owner SAML direction 2026-10-23; SPRINT-008 draft

## Context

Prototype access codes cannot be production identity. City direction requires
enterprise SSO and server-side roles.

## Decision

1. **Production direction (DEC-015):** City SSO with **server-side** RBAC aligned
   to Read Only / Records / Admin capability levels. Prototype PINs are never
   production controls.
2. **Owner direction (2026-10-23):** Application sign-in is planned as **SAML**
   for this app (Entity ID, Reply URL, IdP certificate TBD for this application).
   Do not invent identifiers or reuse another application's SAML addresses.
3. **Not in this architecture approval:** Live SAML/Entra login, tenant/client
   IDs, or claiming G-SEC complete.

Scaffolding remains in `docs/architecture/sso-entra-id.md` and Admin-Global
Settings prototype fields; wiring is SPRINT-008 (not authorized).

## Consequences

- Positive: Clear separation between prototype login and production auth path.
- Negative: Until SPRINT-008/G-SEC, INTDEV uses a prototype signed session,
  not City SSO. That session does not satisfy G-SEC.
- Follow-on: Authorize SPRINT-008; register SAML for this app; satisfy G-SEC.
