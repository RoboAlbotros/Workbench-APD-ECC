# Architecture Decision Records (ADRs)

Material architecture decisions for this project are recorded here per Rule 10
(`.governance/rules/10-architecture.md`).

## Naming

`ADR-NNNN-short-title.md` (example: `ADR-0001-sql-localhost-persistence.md`)

## Required sections

Each ADR MUST include:

- Status
- Context
- Decision
- Consequences
- Owner
- Date

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-0001](ADR-0001-browser-loopback-sql-api.md) | Browser UI with loopback SQL API | Accepted |
| [ADR-0002](ADR-0002-iis-dual-intdev-stacks.md) | IIS ARR dual INTDEV stacks | Accepted |
| [ADR-0003](ADR-0003-production-auth-city-sso.md) | Production authentication direction (City SSO / SAML) | Accepted (direction only) |

## Notes

- G-ARCH evidence: `docs/reviews/g-arch-evidence.md` (satisfied 2026-10-30).
- Scaffolding such as `docs/architecture/sso-entra-id.md` remains non-ADR outline
  material until rewritten here; ADR-0003 records the accepted direction only.
- G-SEC remains pending and is not satisfied by these ADRs.
