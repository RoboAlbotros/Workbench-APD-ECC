# SPRINT-004 Test Evidence — Import tooling and sample-data removal

Controlling work ID: SPRINT-004
Tester: Cursor primary agent (scripted browser acceptance run), under technical owner Brett
Date: 2026-10-09
Environment: Cursor IDE browser (Chromium), app served locally via `python -m http.server`
from `CJISTracker/`; fresh browser local storage
Status: PASS (all checks) — G-TEST acceptance by Annamarie Zambrano (QA) pending

## Acceptance tests

| # | Test | Expected | Result |
| --- | --- | --- | --- |
| 1 | Fresh load after seeding removal | Zero records; "No applicant records match" in views | PASS |
| 2 | Import sanitized MasterSheet CSV (replace mode, 4 rows) | "Imported 4 records (existing records replaced)." | PASS |
| 3 | Field mapping | Control IDs CJIS-ECCID-001..004 and all four Source values stored | PASS |
| 4 | Normalization | "FULL CLEARANCE"→Full Clearance, "CLEAR"→Clear; ISO dates (e.g. 5/18/2027→2027-05-18); III completion 2/3/2026→03/02/2026 (DD/MM/YYYY field format) | PASS |
| 5 | PII backstop on stored records | No dateOfBirth / socialSecurityNumber / driversLicense keys on any record | PASS |
| 6 | Metrics and audit | Total Applicants = 4; change-log entry "Imported (replaced all)" | PASS |
| 7 | PII column exclusion (additive import of CSV containing SSN and DOB columns) | "Imported 1 record. Excluded PII columns: Social Security Number, Date of Birth."; stored record has no PII keys | PASS |
| 8 | lastChangedBy attribution | Imported records attributed to the signed-in admin | PASS |

Source CSV: generated from `CJIS_MasterSheet_wPII-Test.xlsx` (4 fictitious test rows) via
Excel COM with the three PII columns dropped at extraction (verified: "Excluded columns:
Date of Birth; Social Security Number; State / Driver's License Number"). The CSV lives
outside the repository.

Test data was cleared from browser local storage after the run.

## Limitations

- Scripted DOM-level run; the file-picker path (`handleCsvImport` FileReader wrapper)
  was not exercised because automation cannot populate file inputs — the underlying
  `importCsvText` engine was tested directly. Owner's live import will exercise the
  file-picker path.
- Additive-mode duplicate-skip against existing records implemented but exercised only
  for in-file duplicates.
