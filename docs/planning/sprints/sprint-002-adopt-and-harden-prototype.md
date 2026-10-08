# Sprint 002 — Adopt and harden the CJISTracker prototype

Status: PROPOSED
Owner: Brett (technical owner); product impact approvals Jessica Solis
Version: 0.1.0
Approval: Pending — Jessica Solis + Annamarie Zambrano (governance, joint)
Date: 2026-10-08
Controlling work ID: SPRINT-002

## Sprint objective

Bring the adopted prototype in `CJISTracker/` into conformance with the approved product definition and security decisions — above all DEC-012 (no PII and no CJIS data stored) — producing a reviewed, tested application ready for release preparation toward 0.1.0.

## In-scope work

- **FIND-001 remediation (primary):** remove Date of Birth, Social Security Number, and State/Driver's License Number from the data model, forms, list views, exports, field dictionary CSV, and `database-schema.sql`; evaluate remaining fields (phone, email, name) against DEC-012 and record the decision on each.
- Replace default PINs (1111/2222/2468) with operator-configured values; document setup in the README.
- Align `CJIS Applicant Details Field Dictionary.csv` with the final field set.
- Review `app.js`, `index.html`, `tracker-list-overrides.js` against the product definition; fix defects found.
- Add clearly fictitious sample data for testing; verify no real data anywhere in the repo.
- Acceptance testing per Rule 40 (manual acceptance against the criteria below, recorded with tester/date/results).
- Update README, project.json state, and validation.

## Explicit exclusions

- No server-side platform work (auth, database, hosting) — DEC-015 direction is recorded for a later release.
- No new dependencies, build tooling, or CI/CD.
- No release tagging (release preparation is a later sprint).

## Acceptance criteria

- No PII fields exist in the data model, UI, exports, schema file, or field dictionary (FIND-001 closed by security/privacy authority).
- Default PINs removed; configuration documented.
- All three views function per the product definition with fictitious sample data (create, edit, delete, search, group, export, change log).
- Test evidence recorded; unresolved defects listed with severity and owner.
- project.json updated and schema-validated.

## Change classification

Class: C3 — removing fields is a material, user-visible data-model change against the adopted baseline. (Not C4: the change *removes* sensitive-data handling and does not alter trust boundaries; security function concurrence recorded at sprint approval.)

## Required artifacts

- Updated `CJISTracker/` application files, field dictionary, and README
- Test evidence in `docs/reviews/sprint-002-test-evidence.md`
- FIND-001 closure record (security/privacy authority)

## Required tests

- Manual acceptance tests per view (Limited, Records, Full Admin) against the acceptance criteria
- Regression check of search, grouping, export, and change log after field removal

## Security considerations

- DEC-012 enforcement is the sprint's core purpose; FIND-001 closes only on the security/privacy authority's recorded confirmation.
- No real applicant data may be used at any point; test data must be clearly fictitious.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano (governance, joint) — REQUIRED to start.
- G-TEST: Annamarie Zambrano (QA) — accepts test evidence at sprint end.
- FIND-001 closure: Brett (security/privacy).
- Product impact of field removals: Jessica Solis (product).

## Scoped specialist gates and applicability decisions

- UX/accessibility: advisory review by Brett of changed forms/views; no formal gate this sprint.
- Release/operations gates: not applicable (no release, no deployment).

## Delegation plan and charter references

None planned; primary agent implements under the technical owner with decisions by the accountable humans.

## Handoff expectations

Changes integrated via reviewed change referencing SPRINT-002 with Conventional Commits; test evidence and decision records updated before sprint close.

## Definition of done

- All acceptance criteria met with recorded evidence
- FIND-001 closed by the security/privacy authority
- G-TEST satisfied by the QA authority
- project.json updated, validated, and pushed

## Readiness decision and evidence

Readiness: NOT READY — pending joint approval by Jessica Solis and Annamarie Zambrano.
Decided by: (pending)
Evidence: to be recorded at approval.
