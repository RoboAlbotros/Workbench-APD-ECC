# SPRINT-002 Test Evidence — Adopt and harden the CJISTracker prototype

Controlling work ID: SPRINT-002
Tester: Cursor primary agent (automated browser acceptance run), under technical owner Brett
Date: 2026-10-08
Environment: Cursor IDE browser (Chromium), app served locally via `python -m http.server` from `CJISTracker/`; fresh browser local storage (no prior app data)
Status: PASS (all executed checks) — G-TEST acceptance by Annamarie Zambrano (QA) pending

## Scope of this run

Acceptance and regression evidence for the two code changes made in SPRINT-002:

1. **PII field verification (FIND-001):** static verification that no PII fields exist in the committed prototype.
2. **PIN hardening:** removal of hardcoded default access codes (1111/2222/2468) and introduction of an operator-configured first-run setup.

## 1. PII field verification (static) — PASS

Method: full read of `CJISTracker/app.js` (1,258 lines pre-change), `index.html`, and
`CJIS Applicant Details Field Dictionary.csv`; case-insensitive search across all of
`CJISTracker/` for `dateOfBirth`, `ssn`, `socialSecurityNumber`, `driver`, `license`,
`Birth`, `Social`.

| Artifact | Result |
| --- | --- |
| `app.js` field model (22 fields) | No DOB, SSN, or driver's-license fields. `normalizeRecords()` actively deletes `dateOfBirth`, `socialSecurityNumber`, and `driversLicense` from any legacy stored records. |
| `index.html` form and views | No PII inputs; fields match the field dictionary. |
| `CJIS Applicant Details Field Dictionary.csv` (23 rows) | No PII fields. |
| `database-schema.sql` | Header comment states DOB, SSN, and driver's-license fields are intentionally excluded; no such columns exist. |
| `tracker-list-overrides.js` | Only match was an unrelated CSS class name; no PII fields. |
| Sample data | Fictitious only (example.com emails, 555-pattern phone numbers). |

Finding: the committed prototype already satisfies the DOB/SSN/driver's-license portion of
FIND-001. Remaining identity/contact fields in the model: applicant name, applicant phone
number, applicant email address, free-text notes, and the (hidden) document-upload field.
Disposition of these under DEC-012 is an open decision for the security/privacy authority
(Brett); see FIND-001 in `project.json`.

## 2. PIN hardening acceptance tests (browser) — PASS

| # | Test | Expected | Result |
| --- | --- | --- | --- |
| 2.1 | Load app with empty local storage | First-run setup form shown; sign-in form hidden; view tabs disabled | PASS |
| 2.2 | Save three distinct codes (≥4 chars: `lim-7431`, `rec-8562`, `adm-9174`) | Codes accepted; status "Access codes saved. Sign in to continue."; setup hidden, sign-in shown | PASS |
| 2.3 | Sign in as Full Admin with former default code `2468` | Rejected: "Invalid management access." | PASS |
| 2.4 | Sign in as Full Admin with configured code `adm-9174` | Signed in ("Signed in as Test Operator."); Full Admin tab selected; all records table, editor form, Export CSV, and sign-out render | PASS |
| 2.5 | Reload page | Setup form remains hidden; sign-in form shown; codes persist in local storage | PASS (verified via DOM/localStorage inspection after reload) |

Validation rules implemented and present in code (`completeAccessSetup` in `app.js`):
minimum 4 characters per code; all three codes must differ; former defaults and trivial
sequences (1111, 2222, 2468, 0000, 1234) rejected.

Test data was cleared from browser local storage after the run.

## 3. Regression observations

- Existing record rendering, summary metrics, filters, and the editor form rendered
  normally after sign-in (test 2.4). No field-removal regression testing was needed this
  sprint because no fields were removed (the committed prototype was already PII-free).
- No defects found in this run. No unresolved defects carried.

## Limitations

- Manual acceptance by a human tester has not yet occurred; this evidence is from an
  automated agent-driven browser session. G-TEST acceptance decision belongs to
  Annamarie Zambrano (QA).
- Limited View and Records View sign-ins were not separately exercised in this run; the
  code path is identical to the admin sign-in (single `accessCodes[role]` comparison).
