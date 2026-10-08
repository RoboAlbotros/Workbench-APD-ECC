# Product Definition — CJIS Applicant Tracker

Status: DRAFT — prepared under SPRINT-001
Owner: Jessica Solis (product owner)
Version: 0.1.0
Approval: Pending — Jessica Solis (product); outcome acceptance Jessica Solis + Annamarie Zambrano (joint)
Date: 2026-10-08
Controlling work ID: SPRINT-001

## Purpose

Give ECC staff a single, consistent tool to track every CJIS applicant's clearance process — from initial information intake through fingerprints, III completion, security awareness training, NCIC certification, and periodic re-query — replacing per-person spreadsheets that drift apart in format and completeness.

## Problem it solves

Clearance tracking currently lives in individually maintained spreadsheets (observed: separate trackers kept by different staff members with inconsistent columns, value formats, and casing). This makes status lookups, expiration monitoring, and audits slow and error-prone, and creates uncontrolled copies of applicant PII.

## Intended users

- **ECC staff (limited)** — read-only status lookups with sensitive personal fields hidden (Limited View).
- **Records staff** — view and edit applicant records without delete access (Records View).
- **Administrators** — full create/edit/delete, filtering, export, and change-log review (Full Admin View).

## Outcomes

1. One authoritative record per applicant with a consistent field dictionary.
2. Role-appropriate visibility: sensitive fields hidden from users who do not need them.
3. Expiration and re-query dates (security awareness annual, NCIC certification, 5-year query) are visible and trackable.
4. Change accountability: who changed what, when (change log).
5. Elimination of ad-hoc spreadsheet copies containing PII.

## Initial scope (toward 0.1.0)

The existing prototype capabilities, adopted as the concept baseline (see docs/discovery/product-concept.md): applicant CRUD with the tracked-field dictionary, three PIN-gated local views, grouping by clearance type, search, vendor suggestions, change log, and export — operating on browser local storage.

## Explicit exclusions (0.1.0)

- Server-side authentication/authorization, managed database, encryption at rest, and centralized audit logging (required before any production CJIS use; direction to be recorded under the security baseline, targeted at a later release).
- Multi-user concurrent editing and synchronization.
- Integration with state/federal CJIS systems.
- Document file storage (the Documents field stays in the data model but hidden in the UI).
- Import/migration tooling for the legacy spreadsheets (manual re-entry or a later sprint).

## Public contract

None yet. The prototype's behavior is not a supported contract; the 0.1.0 contract will be defined at release preparation per Rule 60.

## Constraints

- **No PII and no CJI/CJIS data will be stored in the system** (DEC-012, security/privacy authority, 2026-10-08). Consequence: the prototype's sensitive identity fields (DOB, SSN, driver's license, and similar) must be removed or replaced with non-PII references before real use — recorded as FIND-001, assigned to SPRINT-002.
- No real applicant data in the repository, examples, or test data.
- Production use is prohibited until the remaining security baseline decisions (authentication direction) are recorded and the designated gates pass.
