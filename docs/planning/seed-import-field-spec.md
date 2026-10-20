# Seed import field sizes

Status: DRAFT — planning list for preparing seed records
Owner: Brett (technical owner)
Date: 2026-10-19
Controlling work: SPRINT-006 (recorded); schema sizes refreshed under
SPRINT-007. Actual seed import of real applicant
data stays out of scope until governance authorities approve an import sprint.
This file does not authorize import of production PII.

Sizes come from `CJISTracker/database-schema.sql` (SQL Server NVARCHAR character
lengths) and from tracker validation in `CJISTracker/app.js` / `index.html`.
Where UI maxlength and SQL length differ, use the **smaller** value for seed
cells so the same file can load in the browser prototype and later SQL.

Working list: `docs/planning/seed-import-field-spec.csv`.

## Seed file rules

1. Required on create: Last Name, First Name, Driver Lic Num, Requestor.
2. Dates as ISO `YYYY-MM-DD` (10 characters). US `M/D/YYYY` is accepted by the
   current CSV importer and stored as ISO.
3. Driver Lic Num: two-letter state prefix, `/`, then 1–15 letters or numbers;
   max 18 characters; example `NM/A23456H8X0H23H5`.
4. Phone: 10 digits, stored as `XXX-XXX-XXXX` (12 characters).
5. Closed lists must match allowed values exactly (department including APD,
   clearance type, III status, outcome, CJIS role, access type tokens).
6. Do not seed calculated or system columns: Name, Next III Inquiry Due,
   Last Changed By, Archived*, Record Id, Updated At.
7. Do not include Date of Birth, Social Security Number, or the raw MasterSheet
   State / Driver's License header (DEC-012 / DEC-017 / DEC-020).
8. Keep real applicant spreadsheets **outside** the repository. Never commit
   seed rows that contain real PII.

## Length mismatches to watch

| Field | Tracker / UI | SQL | Seed to |
| --- | --- | --- | --- |
| Last Name / First Name | no maxlength | 80 | 80 |
| Vendor | Settings add-option 80 | 200 | 80 if entered through Settings; 200 is SQL max |
| Position/Role | Settings add-option 80 | 160 | 80 if entered through Settings; 160 is SQL max |
| Phone | 12 (`XXX-XXX-XXXX`) | 40 | 12 |
| Notes | none | MAX | no practical cap |
| Access Type | comma-separated names | 100 per token (junction table) | 100 per token |

See also: `CJISTracker/CJIS Applicant Details Field Dictionary.csv` and
`docs/planning/import-crosswalk-mastersheet.md`.

SQL landing: run `CJISTracker/database-schema.sql`, then
`CJISTracker/database-data-migration.sql`. Bulk-insert the seed CSV into
`stg.ApplicantSeed` and execute `dbo.usp_MigrateApplicantSeed`. Do not put
real applicant files in the repository.
