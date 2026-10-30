# Proportionate threat and privacy risk analysis (G-ARCH)

Status: RECORDED for G-ARCH — current prototype / INTDEV architecture only
Owner: Brett (technical owner; also security/privacy authority)
Date: 2026-10-30
Related: Rule 10, Rule 50; `project.json` security baseline

This analysis is proportionate to the current Clearance Tracker architecture. It
does **not** satisfy G-SEC, complete a production threat model for live SSO, or
certify CJIS compliance.

## Scope of analysis

In scope: browser UI, loopback Node API, IIS ARR, SQL persistence on INTDEV,
prototype access codes, browser-local change log, dual INTDEV stacks.

Out of scope for this record: live SAML/Entra attack surface, production TLS
termination design, formal SP 800-53 control mapping, production SBOM/CI pinning.

## Assets

| Asset | Sensitivity | Location |
| --- | --- | --- |
| Applicant clearance-process records | Internal; includes Driver Lic Num (DEC-020); no DOB/SSN/CJI claimed | SQL (+ browser cache) |
| Prototype access codes / named-user PINs | Prototype secrets | Browser localStorage |
| SQL / service credentials | Secrets | Server `backend\.env` only |
| Change log / audit activity stream | Operational audit (non-immutable) | Browser localStorage |
| Future IdP metadata / certs | Secrets (when issued) | Server-only; TBD |

## Threats considered (proportionate)

| ID | Threat | Likelihood (now) | Impact | Mitigation today | Residual |
| --- | --- | --- | --- | --- | --- |
| T1 | Unauthenticated use of loopback API if host compromised or mis-bound | Medium if host open; Low if loopback kept | High (read/write applicants) | API binds `127.0.0.1` only; IIS proxies | Remains until server auth (SPRINT-008 / G-SEC) |
| T2 | Secrets committed to git | Low (process) | High | `.env` gitignored; examples use TBD | Ongoing discipline |
| T3 | Prototype PIN treated as production auth | Medium (misuse) | High | Documented never-production (DEC-015); UI messaging | Operator training; G-SEC / SSO |
| T4 | PII / CJI scope creep | Medium over time | High | DEC-012/013/017/020; no DOB/SSN | Privacy revisit TBD after DEC-020 |
| T5 | TEST/PROD data overwrite on shared stack | Mitigated | Medium | Dual INTDEV stacks (ports, roots, DBs) | Ops must keep stacks separate |
| T6 | Browser change log loss / tampering | High (local) | Medium | Documented browser-only; not G-SEC audit | Server audit later |
| T7 | Supply-chain compromise of `mssql` | Low–Med | Medium | Named prototype trusted-source | Production pinning TBD |

## Privacy

- Classification: internal use; sensitive PII (DOB/SSN) excluded; Driver Lic Num in-scope (DEC-020).
- PIA: previously not required under DEC-012; **DEC-020 is a data-scope change** —
  Privacy Framework / PIA revisit remains TBD for the security/privacy authority
  and is tracked under G-SEC / privacy work, not closed by G-ARCH.
- Minimization: Control ID hidden in UI; export CSV removed; seed/import rules
  block raw DOB/SSN/DL MasterSheet columns.

## Decision for architecture gate

The technical owner accepts the residual risks above for the **current**
architecture under G-ARCH, with the explicit condition that:

1. The API remains loopback-only.
2. Live SSO and server-side RBAC remain unauthorized until SPRINT-008 (or successor)
   and G-SEC progress.
3. G-SEC stays **pending** and is not claimed by this analysis.

## Related ADRs

- ADR-0001 — Browser UI with loopback SQL API
- ADR-0002 — IIS ARR dual INTDEV stacks
- ADR-0003 — Production authentication direction (City SSO / SAML)
