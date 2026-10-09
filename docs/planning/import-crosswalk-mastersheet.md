# Import Crosswalk — CJIS MasterSheet → CJIS Applicant Tracker

Status: DRAFT — planning artifact for a future import sprint (candidate SPRINT-003+ scope)
Author: Cursor primary agent, reviewed by Brett (technical owner)
Date: 2026-10-09
Source reviewed: `CJIS_MasterSheet_wPII-Test.xlsx` (local file outside the repository;
sheet `wPII+CJIS`, 20 columns, header row 1). Column names only are recorded here —
no spreadsheet data appears in this document or anywhere in the repository.

## Source structure

Single worksheet with one header row and one row per applicant. All dates are in US
`M/D/YYYY` display format. Several columns use ALL-CAPS values (e.g. clearance types,
outcomes) that the tracker normalizes on save/load.

## Crosswalk table

| # | Spreadsheet column | Tracker field (`app.js`) | Import action | Transformation / notes |
| --- | --- | --- | --- | --- |
| 1 | Source | `source` | Import | **Resolved by DEC-018 (2026-10-09):** dedicated read-only field added to the tracker; populated at import, not user-editable. SQL column `SourceName`. |
| 2 | Control_ID | `controlNumber` | Import | **Resolved by DEC-018 (2026-10-09):** dedicated field added; manually entered per applicant, enforced unique (case-insensitive) as a secondary key. Matches existing SQL `ControlNumber` (unique). |
| 3 | Name (Last, First, MI, Suffix) | `name` | Import | Already "Last, First" format; `normalizeApplicantName` handles any stragglers. |
| 4 | Vendor | `vendor` | Import | Direct copy. Drives vendor grouping in list views. |
| 5 | III Completion | `dateOfIiiCompletion` | Import | Convert `M/D/YYYY` → the tracker's `DD/MM/YYYY` text format (note: this field is text with a DD/MM/YYYY pattern, unlike all other date fields — see Known quirks). |
| 6 | Date of Birth | — | **EXCLUDE — DEC-012** | Sensitive PII. Must not be imported; tracker deletes this field on load if present. |
| 7 | Social Security Number | — | **EXCLUDE — DEC-012** | Sensitive PII. Must not be imported; tracker deletes this field on load if present. |
| 8 | State / Driver's License Number | — | **EXCLUDE — DEC-012** | Sensitive PII. Must not be imported; tracker deletes this field on load if present. |
| 9 | III - Status | `iiiStatus` | Import | Normalized: "clear" → Clear; "felony"/"review needed" → Felony; anything else → Misd/Clear. Verify source vocabulary before import. |
| 10 | Type of Clearance | `clearanceType` | Import | Normalized case-insensitively to Full Clearance / One Time Visit / No Access Given; **unrecognized values become blank** — pre-validate source values. |
| 11 | Fingerprints Completed | `fingerprintsNotifiedCompleted` | Import | Convert `M/D/YYYY` → ISO `YYYY-MM-DD` (invalid dates are blanked by the tracker). |
| 12 | Outcome | `outcome` | Import | Normalized: approved/clear → Clear; denied/unauthorized/felony → Felony; misd/clear → Misd/Clear; **anything else → Needs Follow Up**. Pre-validate to avoid accidental follow-up flags. |
| 13 | Security and Awareness Expiration Annually | `securityAwarenessExpiration` | Import | Convert to ISO. Drives the expired-compliance row highlighting. |
| 14 | Security Addendum | `securityAddendum` | Import | Convert to ISO. |
| 15 | NCIC Certification Expiration | `ncicCertificationExpiration` | Import | Convert to ISO. Tracker also has a separate `ncicCertification` Y/N field with no source column — see gaps. |
| 16 | Phone Number | `phoneNumber` | Import | Direct copy (kept in scope per DEC-017). |
| 17 | Completed Full Process | `completedFullProcess` | Import | Convert to ISO. |
| 18 | Date of Site Visit Only | `dateOfSiteVisitOnly` | Import | Convert to ISO. |
| 19 | Queried (every 5 years) | `queriedEveryFiveYears` | Import (informational) | Tracker **recalculates** this as III Completion + 5 years and makes it read-only; imported values will be overwritten by the calculation. |
| 20 | Email | `emailAddress` | Import | Direct copy (kept in scope per DEC-017). Trim trailing whitespace in header/values. |

## Tracker fields with no source column (default on import)

| Tracker field | Default |
| --- | --- |
| `requestor` | Blank |
| `dateInformationProvided` | Blank — no source equivalent |
| `accessType` | Blank — no source equivalent |
| `cjisSecurityAwarenessRole` | Blank — no source equivalent |
| `ncicCertification` (Y/N) | Blank — could be derived as "Y" when an NCIC expiration date exists (decision needed) |
| `lastChangedBy` | Name of the person performing the import |
| `documents` | Empty list |
| `notes` | Blank |
| `id` / `updatedAt` | Generated at import time |

## Known quirks affecting import

1. **`dateOfIiiCompletion` is a text field with a `DD/MM/YYYY` pattern** while every
   other date field is ISO `YYYY-MM-DD`. The source is US `M/D/YYYY`. An importer must
   handle this one field differently (or the field should be converted to a standard
   date input first — recommended fix before import).
2. **Query date is derived.** The overlay recalculates `queriedEveryFiveYears` from III
   Completion + 5 years and makes it read-only. Source values in column 19 that differ
   from the calculation will not survive.
3. **Normalization is lossy.** Unrecognized clearance types become blank and
   unrecognized outcomes become "Needs Follow Up". A pre-import validation pass over
   the source vocabulary is required.
4. **Sample records re-merge on load.** ~~The tracker's 12 fictitious sample records are
   re-added whenever missing.~~ **Resolved in SPRINT-004 (2026-10-09):** sample-data
   seeding removed entirely; the app ships with no built-in records. Quirks 1–3 are
   handled inside the SPRINT-004 CSV importer (III date conversion, derived query date
   noted as informational, header/vocabulary normalization with per-row error reporting).

## Security constraints (binding)

- Columns 6–8 (DOB, SSN, driver's license) MUST NOT be imported in any form — DEC-012
  as interpreted by DEC-017. The tracker's `normalizeRecords` deletes these fields as a
  backstop, but the importer must exclude them at the source.
- The source spreadsheet contains PII and MUST remain outside the repository. No
  spreadsheet rows, values, or extracts may be committed.
- Import of real applicant data is out of scope until the governance authorities
  approve an import sprint and the sample-data seeding is removed.
