# Sprint 003 — Import readiness: Source and Control ID fields

Status: IMPLEMENTED — pending G-TEST acceptance and ratification
Owner: Brett (technical owner); product impact approval Jessica Solis
Version: 0.1.0
Approval: Approved 2026-10-09 — directed explicitly by project owner Brett in agent
session ("Yes Source create field called Source as read only / Yes create a Control_ID
field which will be manually input for each applicant tracked treat as secondary key
the is unique, which would be a C3 data-model change"), relayed on behalf of the joint
governance authorities consistent with SPRINT-001/002 handling; ratification open.
Date: 2026-10-09
Controlling work ID: SPRINT-003

## Sprint objective

Resolve the two open crosswalk mapping decisions from
`docs/planning/import-crosswalk-mastersheet.md` by extending the tracker data model
(DEC-018), preparing the application for future spreadsheet imports.

## In-scope work

- Add `source` field: read-only in the UI; populated at import time or left blank.
- Add `controlNumber` field ("Control ID"): manually entered, unique secondary key
  (case-insensitive uniqueness enforced on save).
- Surface Control ID in Limited/Records/Admin tables and in search.
- Align the field dictionary CSV, `database-schema.sql` (add `SourceName`; document
  `ControlNumber` usage), and the import crosswalk.
- Acceptance testing with recorded evidence.

## Explicit exclusions

- No import tooling or data import (future sprint).
- No removal of sample-data seeding (recorded in crosswalk quirks; future sprint).

## Change classification

Class: C3 — material, user-visible data-model change, classified as such by the
project owner in the authorizing statement.

## Acceptance criteria

- Source field renders read-only; cannot be edited by users.
- Control ID is manually enterable, displayed in tables, searchable, and duplicates
  are rejected case-insensitively with a clear message.
- Field dictionary, SQL schema, and crosswalk updated consistently.
- Test evidence recorded; project.json updated and schema-validated.

## Execution record (2026-10-09)

- Implemented in `app.js` and `index.html`: fields added to the data model, form,
  limited/admin field sets, search haystack, and normalization (legacy `controlId`
  values migrate to `controlNumber`); uniqueness check added to `saveApplicant`;
  `source` added to the always-read-only control set.
- `CJIS Applicant Details Field Dictionary.csv`: two rows added.
- `database-schema.sql`: `SourceName NVARCHAR(160) NULL` added to `dbo.Applicants`;
  header notes updated. Existing unique `ControlNumber` column documented as the
  DEC-018 secondary key.
- `docs/planning/import-crosswalk-mastersheet.md`: Source and Control_ID rows marked
  resolved by DEC-018.
- Scripted browser acceptance tests PASSED (2026-10-09): setup/sign-in regression,
  source read-only, save with Control ID, case-insensitive duplicate rejection,
  corrected save, single-record storage integrity, search by Control ID. Evidence:
  `docs/reviews/sprint-003-test-evidence.md`.

## Remaining to close the sprint

1. G-TEST acceptance (Annamarie Zambrano, QA).
2. Ratification of the relayed sprint approval (Jessica Solis + Annamarie Zambrano).
