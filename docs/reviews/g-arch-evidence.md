# G-ARCH Evidence — Architecture gate

Gate: G-ARCH  
Authority: Technical owner — Brett (project owner)  
Decision date: 2026-10-30  
State: satisfied (project architecture for current prototype / INTDEV)  
Scope: project  

## Owner decision

Close G-ARCH as technical owner. Recorded in this agent session from the owner
statement: "Close G-ARCH — architecture gate (technical owner)".

Agent review does not approve the gate; this file records the technical owner's
acceptance and points to the architecture artifacts required by Rule 10.

## Rule 10 checklist

| Requirement | Evidence |
| --- | --- |
| System boundaries, external dependencies, interfaces, trust boundaries | `docs/architecture/system-boundaries.md` |
| Material decisions as ADRs | `docs/architecture/decisions/ADR-0001-browser-loopback-sql-api.md`, `ADR-0002-iis-dual-intdev-stacks.md`, `ADR-0003-production-auth-city-sso.md` |
| Proportionate threat and privacy risk analysis | `docs/architecture/threat-and-privacy-risk.md` |
| Ops topology (supporting) | `docs/operations/iis-hosting.md` |

## Explicit non-claims

- G-SEC remains **pending** (security/privacy gate).
- G-CAND and G-REL remain pending.
- Live SAML / Entra login is not connected; identifiers remain TBD.
- CJIS Security Policy compliance is not claimed (DEC-013).
- Browser change log is not a server-side immutable audit ledger.
- This gate does not authorize SPRINT-008 or a production release.

## Limitations

- Privacy Framework / PIA revisit after DEC-020 remains TBD under G-SEC / privacy
  work.
- Threat analysis is proportionate to the current architecture only; production
  SSO expands the attack surface and requires refreshed analysis before go-live.
