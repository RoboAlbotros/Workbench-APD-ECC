# CJIS Applicant Tracker

Open `index.html` in a browser to use the CJIS Applicant Tracker.

## Views

- Limited View is read-only and hides sensitive personal fields.
- Records View uses the Limited View table style and allows applicant view/edit actions without delete access.
- Full Admin View requires the admin PIN and can create, view, edit, delete, filter, and export applicant records.

No default access codes ship with the application. On first run, the app shows a
one-time setup form where the operator creates the Limited, Records, and Full Admin
codes (minimum 4 characters, all different; former defaults and trivial sequences are
rejected). Codes are stored only in the browser's local storage. To reset them, clear
the browser's local storage for this page (this also clears applicant records).

Full Admin includes a change log for created, updated, and deleted applicant records.

## Importing records from CSV

Full Admin includes an "Import Applicants from CSV" panel. Columns are mapped by header
name per `docs/planning/import-crosswalk-mastersheet.md`. US-format dates (M/D/YYYY) are
converted automatically. "Replace all existing records" (default) clears current records
first; unchecked, rows are added and rows whose Control ID already exists are skipped.
Date of Birth, Social Security Number, and Driver's License columns are always excluded
and never stored (DEC-012), and every import is recorded in the change log.

The application ships with no built-in records; data arrives via manual entry or CSV
import only.
Notes remain editable on applicant records but are hidden from list tables.
Applicant list tables are grouped by Clearance Type.

These access codes are local prototype controls. For production use, replace them with server-side authentication, authorization, and audit logging (recorded direction: City SSO / Entra ID with server-side role-based access, decision DEC-015).

Vendor uses suggestions from existing records. Search checks name, vendor, and Applicant Email Address.
Applicant document data remains in the data model, but the Applicant Documents field is hidden in the UI.
Access Type supports multiple selections.

## Tracked fields

- Name (Last, First, MI, Suffix)
- Vendor
- Requestor
- Date Information Provided
- Date of III Completion (DD/MM/YYYY)
- III - Status
- Clearance Type
- Access Type
- CJIS Security and Awareness Role
- Fingerprints Completed
- Fingerprint Outcome
- Security and Awareness Expiration Annually
- Security Addendum
- NCIC Date of Cert Expiration
- NCIC Certification
- Phone Number
- Completed Full Process
- Date of Site Visit Only
- Query Date (every 5 years)
- Last Changed By
- Applicant Email Address
- Documents
- Notes

Data is stored in the browser's local storage. For production CJIS workflows, connect this interface to server-side authentication, authorization, encryption, auditing, and a managed database.
