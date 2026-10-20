# CJIS Applicant Tracker

Open `index.html` in a browser to use the CJIS Applicant Tracker.

## Views

- Limited View is read-only, hides sensitive personal fields, and filters Clearance Type to One Time Visit. Only non-archived applicants with Clearance Type `One Time Visit` appear there (search, Activity, and Fingerprint Outcome filters can hide rows further). Applicant identity uses separate Last Name, First Name, Middle Initial, and Suffix fields. Listings still show the composed name (Last Name, First Name MI Suffix). A View action opens a read-only popup with Last Name, First Name, Clearance Type, Department, Position/Role, and Certifications & Dates fields (Fingerprint Outcome and Date of Site Visit Only stay off that popup). It does not open the full applicant drawer. Two fictitious One Time Visit seed records (Guest, Pat and Visitor, Kim) are added when those IDs are not already stored.
- Records View uses the Limited View table style and allows applicant view/edit actions without archive access.
- Full Admin View requires the admin access code and can create, view, edit, archive, restore, and filter applicant records. The Export CSV control is hidden in the UI (owner 2026-10-09); `downloadCsv` and export logic remain in `app.js` for later use.

The Full Admin access code is operator-set to `12345` (local prototype only; not a
production control). On load the app writes that admin code into this browser's
local storage, overwriting any leftover admin value so a known Full Admin sign-in
always works. Former defaults (`1111`, `2222`, `2468`) and trivial sequences
(`0000`, `1234`) remain rejected and are not restored.

If Limited or Records codes are missing, the app stores the documented prototype
values `lim-7431` (Limited) and `rec-8562` (Records) so those roles are never empty
strings. Existing distinct Limited/Records codes are kept. Codes live only in this
browser's local storage. Clearing local storage for this page resets codes and
applicant records; Full Admin will again be `12345` on the next load.

Full Admin includes a change log for created, updated, archived, and restored applicant records.

Applicant records are archived, not permanently deleted. Archive sets `archived`, `archivedAt`, and `archivedBy` and leaves the record in local storage. Default lists, metrics, and search (Limited, Records, and Admin All Applicant Records) exclude archived records. Named Admin-Full users (and the shared Full Admin access code) can archive, review archived applicants, and restore them, and they can open the Settings Console. Named Admin-Global users sign in as Admin-Global (named user required; no shared Global code), have the same Full Admin, restore, and Settings Console access as Admin-Full. Settings Console sections Security & Authentication and Users, Roles & Permissions (RBAC) are visible only to Admin-Global. Named Admin-Staff users can use Full Admin and review archived applicants but cannot restore and cannot open the Settings Console. Limited and Records cannot archive or restore. Seed test applicants stay active. CSV import does not import records as archived or deleted.

## Importing records from CSV

Full Admin includes an "Import Applicants from CSV" panel. Columns are mapped by header
name per `docs/planning/import-crosswalk-mastersheet.md`. US-format dates (MM/DD/YYYY) and ISO dates (YYYY-MM-DD) are
accepted; Date of III Completion is stored as ISO like other date fields. "Replace all existing records" (default) clears current records
first; unchecked, rows are added and rows whose Control ID already exists are skipped.
Date of Birth and Social Security Number columns are always excluded and never
stored (DEC-012). Raw MasterSheet "State / Driver's License" headers stay excluded.
A Driver Lic Num column is accepted only when the value matches two letters, a
slash, and up to 15 letters or numbers (example: NM/A23456H8X0H23H5). Every import is recorded in the
change log.

The import panel is currently commented out in `index.html` at owner direction (it is a
one-time pre-go-live function); re-enable it by uncommenting that section.

When the browser has no stored records, the app seeds four fictitious test applicants
copied from the sanitized MasterSheet CSV (`CJIS_MasterSheet_import.csv`, kept outside
the repository) plus two fictitious One Time Visit records for Limited View. Source,
Control ID, names, vendors, and other MasterSheet cell values are unchanged. Existing
localStorage records are not replaced; the two Limited View seeds are appended when
those IDs are missing. Clearing storage and reloading restores the seed.
Notes remain editable on applicant records but are hidden from list tables.
Applicant list tables are a flat name-sorted list (not grouped by vendor).
The Full Admin table shows Actions plus Name, Driver Lic Num, Clearance Type,
Department, Position/Role, and Requestor. Limited View shows Name, Driver Lic Num,
Vendor, Department, Status (Active or InActive), Clearance Type,
Security and Awareness Cert Expiration, and NCIC Date of Cert Expiration. Tour/Orientation,
Source, III - Status, CJIS Security Role, NCIC Certification, Passport, Fingerprint
Outcome, and Access Type stay off both listings and are edited in the slide-in
record drawer. Control ID is hidden from the form and all lists (retained in
storage).
Next III Inquiry Due (5 yrs) is a calculated, read-only date equal to Date of
III Completion plus 5 years. The Query Due metric counts records whose due date
is on or before today.

These access codes are local prototype controls. For production use, replace them with server-side authentication, authorization, and audit logging (recorded direction: City SSO / Entra ID with server-side role-based access, decision DEC-015).

Vendor uses suggestions from existing records and is optional. Department is a closed city-code list (AV-Aviation through TR-Transit, plus APD). Position/Role uses suggestions from existing records. Search checks Last Name, First Name, Middle Initial, Suffix, composed name, Driver Lic Num, vendor, department, position/role, requestor, and Applicant Email Address.
Applicant document data remains in the data model, but the Applicant Documents field is hidden in the UI.
Access Type supports multiple selections. Physical and Non VPN are grayed out and
read-only on the applicant form in every view. Security Groups and System/Building
are hidden from the applicant form.

## Tracked fields

- Name (Last, First, MI, Suffix)
- Control ID (unique secondary key; hidden from the UI; retained in storage)
- Driver Lic Num (required on create; two-letter state prefix, a slash, and up to 15 letters or numbers, 18-character input limit; example: NM/A23456H8X0H23H5; stored uppercase; slash is inserted after the state prefix)
- Source (read-only in the UI)
- Vendor (optional)
- Department (closed city-code list: AV-Aviation, AW-Animal Welfare, CA-Chief Administrative Office, CC-Office of the City Clerk, CL-Council Services, CM-Community Safety Department, CP-Civilian Police OS Dept, CS-Cultural Services, ED-Economic Development, EH-Environmental Health, FA-Finance Admin Svc, FC-Youth and Family Svcs Dept, FD-Fire, GS-General Services Department, HH-Health,Housing,Hmlsns Dept, HR-Human Resources, IA-Internal Audit, IG-Office of Inspector GenDept, LG-Legal, MA-Mayor's Office Department, MD-Municipal Development, APD, PD-Police, PL-Planning Department, PR-Parks and Recreation, SA-Senior Affairs, SW-Solid Waste, TI-Technology and Innovation, TR-Transit)
- Position/Role (optional; suggestions from existing records)
- Requestor
- Date Information Provided
- Date of III Completion (calendar date control; stored as ISO YYYY-MM-DD)
- III - Status
- Clearance Type (Full Clearance, One Time Visit, InProgress, No Access Given)
- Applicant screen status Active when today is on or before both Security and Awareness Cert Expiration and NCIC Date of Cert Expiration; InActive when either date is missing or already past
- Tour/Orientation (Y/N checkbox)
- Access Type
- Passport (Y/N checkbox; yes/no flag only)
- CJIS Security and Awareness Role
- Fingerprints Completed
- Fingerprint Outcome
- Security and Awareness Cert Expiration
- Security Addendum
- NCIC Date of Cert Expiration
- NCIC Certification
- Applicant Phone Number (optional; 10 digits only; displayed and stored as XXX-XXX-XXXX)
- Completed Full Process
- Date of Site Visit Only
- Next III Inquiry Due (5 yrs) (calculated from Date of III Completion + 5 years)
- Last Changed By
- Applicant Email Address
- Documents
- Notes

Data is stored in this browser until the localhost SQL API reports a connected
database. Then load/save uses `http://127.0.0.1:8741` and a localStorage copy is
kept as fallback. The footer shows `Storage: this browser` or `Storage: SQL (localhost)`.
Change log and document blobs stay in this browser this sprint. For production
CJIS workflows, connect this interface to server-side authentication (DEC-015
City SSO / Entra ID), authorization, encryption, auditing, and a managed host.

## SQL schema and localhost API (SPRINT-007)

The creatable SQL Server script is `database-schema.sql`. Load a seed CSV with
`database-data-migration.sql` (staging table `stg.ApplicantSeed` and
`usp_MigrateApplicantSeed`). Create the database, then start the API:

```text
sqlcmd -S <server> -E -i "CJISTracker\database-schema.sql"
sqlcmd -S <server> -E -d CjisApplicantTracker -i "CJISTracker\database-data-migration.sql"
cd backend
copy .env.example .env
npm install
npm start
```

Serve this folder at `http://127.0.0.1:8740` (for example `python -m http.server 8740`).
If the API is down or `.env` still has TBD placeholders, the app keeps using
localStorage. Keep real applicant CSVs outside the repository. Entra login is
not wired (`docs/architecture/sso-entra-id.md`). G-ARCH and G-SEC remain pending.
