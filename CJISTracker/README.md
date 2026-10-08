# CJIS Applicant Tracker

Open `index.html` in a browser to use the CJIS Applicant Tracker.

## Views

- Limited View is read-only and hides sensitive personal fields.
- Records View uses the Limited View table style and allows applicant view/edit actions without delete access.
- Full Admin View requires the admin PIN and can create, view, edit, delete, filter, and export applicant records.

Default local access codes:

```text
Limited View: 1111
Records View: 2222
Full Admin: 2468
```

Full Admin includes a change log for created, updated, and deleted applicant records.
Notes remain editable on applicant records but are hidden from list tables.
Applicant list tables are grouped by Clearance Type.

These access codes are local prototype controls. For production use, replace them with server-side authentication, authorization, and audit logging.

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
