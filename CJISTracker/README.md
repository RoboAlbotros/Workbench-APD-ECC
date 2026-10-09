# CJIS Applicant Tracker

Open `index.html` in a browser to use the CJIS Applicant Tracker.

## Views

- Limited View is read-only and hides sensitive personal fields.
- Records View uses the Limited View table style and allows applicant view/edit actions without delete access.
- Full Admin View requires the admin access code and can create, view, edit, delete, filter, and export applicant records.

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

Full Admin includes a change log for created, updated, and deleted applicant records.

## Importing records from CSV

Full Admin includes an "Import Applicants from CSV" panel. Columns are mapped by header
name per `docs/planning/import-crosswalk-mastersheet.md`. US-format dates (MM/DD/YYYY) and ISO dates (YYYY-MM-DD) are
accepted; Date of III Completion is stored as ISO like other date fields. "Replace all existing records" (default) clears current records
first; unchecked, rows are added and rows whose Control ID already exists are skipped.
Date of Birth, Social Security Number, and Driver's License columns are always excluded
and never stored (DEC-012), and every import is recorded in the change log.

The import panel is currently commented out in `index.html` at owner direction (it is a
one-time pre-go-live function); re-enable it by uncommenting that section.

The application ships with no built-in records; data arrives via manual entry or CSV
import only.
Notes remain editable on applicant records but are hidden from list tables.
Applicant list tables are grouped by Vendor (default grouping).
The Full Admin table shows Actions plus Clearance Type, Access Type, Name,
Requestor, III - Status, CJIS Security Role, and NCIC Certification. Remaining
fields are edited in the slide-in record drawer.
Next III Inquiry Due (5 yrs) is a calculated, read-only date equal to Date of
III Completion plus 5 years. The Query Due metric counts records whose due date
is on or before today.

These access codes are local prototype controls. For production use, replace them with server-side authentication, authorization, and audit logging (recorded direction: City SSO / Entra ID with server-side role-based access, decision DEC-015).

Vendor uses suggestions from existing records. Search checks name, vendor, and Applicant Email Address.
Applicant document data remains in the data model, but the Applicant Documents field is hidden in the UI.
Access Type supports multiple selections.

## Tracked fields

- Name (Last, First, MI, Suffix)
- Vendor
- Requestor
- Date Information Provided
- Date of III Completion (entered as MM/DD/YYYY; stored as ISO YYYY-MM-DD)
- III - Status
- Clearance Type
- Access Type
- CJIS Security and Awareness Role
- Fingerprints Completed
- Fingerprint Outcome
- Security and Awareness Cert
- Security Addendum
- NCIC Date of Cert Expiration
- NCIC Certification
- Applicant Phone Number
- Completed Full Process
- Date of Site Visit Only
- Next III Inquiry Due (5 yrs) (calculated from Date of III Completion + 5 years)
- Last Changed By
- Applicant Email Address
- Documents
- Notes

Data is stored in the browser's local storage. For production CJIS workflows, connect this interface to server-side authentication, authorization, encryption, auditing, and a managed database.
