# Product Concept — CJIS Applicant Tracker prototype baseline

Status: RECORDED — observation of existing prototype, not a decision
Owner: Jessica Solis (product owner)
Version: 0.1.0
Approval: Informational; carried into product-definition.md for approval
Date: 2026-10-08
Controlling work ID: SPRINT-001

## Origin

A working browser prototype was built prior to SGK-style governance and adopted into this repository at `CJISTracker/` on 2026-10-08 (commit 8d94060). It consists of `index.html`, `app.js`, `styles.css`, `tracker-list-overrides.js`, a proposed `database-schema.sql`, a field dictionary CSV (no applicant records), and a README.

## Observed capabilities

- Single-page application; data in browser local storage (no server).
- Three local PIN-gated views: Limited (read-only, sensitive fields hidden), Records (view/edit, no delete), Full Admin (full CRUD, filter, export, change log).
- 23 tracked fields covering identity, vendor, III completion/status, clearance and access types, fingerprints, security-awareness expiration, security addendum, NCIC certification/expiration, full-process completion, site-visit date, 5-year query date, contact fields, documents (hidden in UI), and notes.
- Applicant lists grouped by clearance type; search across name, vendor, and email; vendor autosuggest from existing records.
- Change log of created/updated/deleted records in Full Admin.

## Known limitations (from the prototype's own README)

Local PINs are prototype-only controls. Production CJIS use requires server-side authentication, authorization, encryption, auditing, and a managed database. Local storage is per-browser: no sharing, no backup, no concurrency.

## Companion artifact

`database-schema.sql` sketches a server-side schema, indicating the intended growth path beyond local storage.
