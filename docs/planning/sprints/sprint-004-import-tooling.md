# Sprint 004 — Import tooling and sample-data removal

Status: COMPLETE (2026-10-09)
Owner: Brett (technical owner); product impact approval Jessica Solis
Version: 0.1.0
Approval: Approved 2026-10-09 — directed explicitly by project owner Brett in agent
session ("next is Import tooling and I want to remove all exsisting records from tracker
and import records in MasterSheet…"), relayed on behalf of the joint governance
authorities consistent with prior sprints; ratification open.
Date: 2026-10-09
Controlling work ID: SPRINT-004

## Sprint objective

Enable governed data import from the CJIS MasterSheet per the approved crosswalk, and
remove all built-in sample records so the tracker holds only deliberately entered or
imported data.

## In-scope work

- Remove sample-data seeding entirely (12 fictitious records and the re-merge logic).
- Admin-only "Import Applicants from CSV" feature: header-name mapping per the
  crosswalk, US-date conversion, replace-all or additive modes, per-row error
  reporting (missing name, duplicate Control ID in file or existing data), change-log
  entry for every import.
- Unconditional exclusion of sensitive-PII columns (DOB/SSN/driver's license) by
  header pattern, reported to the operator (DEC-012 enforcement).
- Generate a sanitized import CSV from the MasterSheet (outside the repository).
- Documentation (README, crosswalk updates) and recorded test evidence.

## Explicit exclusions

- No direct xlsx parsing in the app (CSV is the import format; conversion happens
  outside the app).
- The source spreadsheet and generated CSV remain outside the repository.

## Change classification

Class: C3 — material user-visible feature (import) plus removal of sample-data
behavior; no trust-boundary change (import is gated behind existing Full Admin access).

## Acceptance criteria

- App starts with zero records; no sample data returns after reload.
- MasterSheet CSV imports correctly: all rows, Source and Control ID populated,
  vocabulary and dates normalized, metrics and change log updated.
- PII columns excluded even when present in the CSV, with operator-visible notice.
- Replace and additive modes behave as documented.
- Test evidence recorded; project.json updated and schema-validated.

## Execution record (2026-10-09)

- `app.js`: sample records and re-merge logic removed; CSV parser, header mapper,
  date converters, and `importCsvText` engine added; import gated to Full Admin.
- `index.html`: import panel added to the admin tools.
- Sanitized CSV generated from `CJIS_MasterSheet_wPII-Test.xlsx` via Excel COM with
  DOB/SSN/DL columns dropped at extraction; stored next to the source workbook,
  outside the repository.
- README and import crosswalk updated (seeding quirk resolved; importer handles the
  III date format and vocabulary normalization).
- Scripted browser acceptance tests PASSED; evidence:
  `docs/reviews/sprint-004-test-evidence.md`.

- **Live import confirmed by the project owner, 2026-10-09** ("import looks good" —
  project.json history run 18): sample records replaced with the four MasterSheet
  records in the owner's working environment, exercising the file-picker path noted as
  untested in the scripted evidence.
- Post-implementation UI adjustment at owner direction: Control ID and Source columns
  hidden from the Full Admin records table (fields retained in form, search, export).

## Completion record (2026-10-09)

- Sprint approval ratified and G-TEST accepted as relayed by project owner Brett on
  behalf of Jessica Solis and Annamarie Zambrano (owner statement: "I have approval
  for sprint 004."; project.json history run 20).
- G-TEST evidence: `docs/reviews/sprint-004-test-evidence.md`.
- All acceptance criteria met and definition of done satisfied.
