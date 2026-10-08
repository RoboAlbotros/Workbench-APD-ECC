# Roadmap

Status: DRAFT — prepared under SPRINT-001
Owner: Jessica Solis (product owner)
Version: 0.1.0
Approval: Pending — product owner
Date: 2026-10-08

## Toward 0.1.0 (first distribution baseline)

1. **SPRINT-001 (active)** — product definition, data classification, CJIS applicability, authentication direction, privacy and NIST applicability decisions.
2. **SPRINT-002 (proposed)** — adopt and harden the prototype as 0.1.0 scope: review `CJISTracker/` code against the approved definition, fix defects, align the field dictionary, replace default PINs, add fictitious sample data, acceptance testing per Rule 40.
3. **Release 0.1.0** — candidate (`v0.1.0-rc.1`) and final per Rule 60; distribution baseline only (no production/runtime deployment).

## Later (not committed)

- Server-side platform: authentication/authorization, managed database, encryption, centralized audit (prerequisite for any production CJIS use; C4 work).
- Spreadsheet import/migration tooling.
- Multi-user concurrency and notification of upcoming expirations.

Dates are not baselined; `project.json` plan comparison remains `not-baselined` until the owners set a baseline.
