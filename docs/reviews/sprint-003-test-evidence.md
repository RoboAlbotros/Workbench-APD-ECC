# SPRINT-003 Test Evidence — Source and Control ID fields

Controlling work ID: SPRINT-003
Tester: Cursor primary agent (scripted browser acceptance run), under technical owner Brett
Date: 2026-10-09
Environment: Cursor IDE browser (Chromium), app served locally via `python -m http.server`
from `CJISTracker/`; fresh browser local storage
Status: PASS (all checks) — G-TEST acceptance by Annamarie Zambrano (QA) pending

## Acceptance tests

| # | Test | Expected | Result |
| --- | --- | --- | --- |
| 1 | First-run setup + admin sign-in (regression) | Setup accepts codes; sign-in succeeds | PASS |
| 2 | Source field editability | `#source` input is read-only | PASS (`readOnly === true`) |
| 3 | Save applicant with Control ID `CJIS-TEST-001` | "Applicant record saved." | PASS |
| 4 | Save second applicant with Control ID `cjis-test-001` (case variant) | Rejected: "Control ID … is already assigned to another applicant. Control IDs must be unique." | PASS |
| 5 | Correct to `CJIS-TEST-002` and save | Saved | PASS |
| 6 | Storage integrity | Exactly one record each for CJIS-TEST-001 and CJIS-TEST-002; no duplicate | PASS |
| 7 | Search by Control ID (`CJIS-TEST-002`) | Exactly one data row returned (plus vendor group header) | PASS |
| 8 | Control ID visible in admin table row | Rendered in the record row | PASS |

Test data was cleared from browser local storage after the run.

## Limitations

- Scripted DOM-level run (form submissions driven via `requestSubmit` with synthetic
  input events); human acceptance by QA pending.
- Legacy `controlId` → `controlNumber` migration path implemented in
  `normalizeRecords` but not exercised (no legacy data exists).
