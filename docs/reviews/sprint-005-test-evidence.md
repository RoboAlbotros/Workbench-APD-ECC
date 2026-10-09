# SPRINT-005 Test Evidence — UI/UX redesign (Option B)

Controlling work ID: SPRINT-005
Tester: Cursor primary agent (scripted browser acceptance run), under technical owner Brett
Date: 2026-10-09
Environment: Cursor IDE browser (Chromium), app served from `CJISTracker/` on
`http://127.0.0.1:8760` (separate origin from any existing 8750 preview; that
origin's localStorage was not cleared). Seven fictitious TEST-0001..0007 records
seeded for this run.
Status: PASS (all checks) — G-TEST acceptance by Annamarie Zambrano (QA) pending

## Acceptance tests

| # | Test | Expected | Result |
| --- | --- | --- | --- |
| 1 | Signed-out first screen | Sign-in / first-run card only; slim title header; no applicant table | PASS |
| 2 | Signed-in first screen (Full Admin) | Sign-in card gone (`display:none`); sticky ~56px header with inline metrics, view switch, badge, Sign Out; sticky toolbar; applicant data visible without scrolling past chrome (first table row top ≈ 284px) | PASS |
| 3 | Admin column diet | Headers exactly: Actions, Clearance Type, Access Type, Name, Requestor, III - Status, CJIS Security Role, NCIC Certification | PASS |
| 4 | No horizontal scroll at 1280px | `documentElement.scrollWidth === 1280`; admin table width 1232px inside wrap | PASS |
| 5 | Vendor grouping | Group headers Alpha Vendor, Beta Vendor, Gamma Vendor on admin and limited tables | PASS |
| 6 | Expired-cert highlight (TEST-0002) | Row class `compliance-expired-row`; Limited view emphasizes Security and Awareness Cert cell 01/01/2025 | PASS |
| 7 | Inquiry Due = III + 5 years | Seeded stale values migrated on load. Examples: 01/01/2020→2025-01-01; 01/06/2023→2028-06-01; blank III→blank; 09/10/2021→2026-10-09; 10/10/2021→2026-10-10 | PASS |
| 8 | Query Due metric | Count = 2 (TEST-0001 due 2025-01-01 and TEST-0004 due 2026-10-09); blank III not counted; agrees with stored due dates vs today (2026-10-09) | PASS |
| 9 | One-time migration log | Change-log entry: "Recomputed Next III Inquiry Due (5 yrs) for 7 stored record(s) from Date of III Completion + 5 years." | PASS |
| 10 | Drawer open / focus | Edit opens slide-in drawer; sections Identity, Clearance & Access, Certifications & Dates, Contact & Notes; focus on Name; `scrollY` remains 0 | PASS |
| 11 | Drawer Escape | Escape closes drawer; focus returns to invoking Edit button | PASS |
| 12 | Drawer save | Requestor saved as "Req One Updated"; III 15/02/2021 recalculated due 2026-02-15; drawer closes; Query Due still 2 | PASS |
| 13 | Overlay not loaded | No `tracker-list-overrides.js` script tag/src | PASS |
| 14 | Limited view compact | Columns: Name, Control ID, Clearance Type, Security and Awareness Cert, Last Changed By; vendor grouping; expired TEST-0002 visible; no import panel | PASS |
| 15 | Import panel | Remains HTML-commented; `#importForm` absent | PASS |
| 16 | Export CSV | Button remains visible on admin table heading (overlay removal not carried forward; owner open question) | PASS |

## Requestor mapping

Owner-named column "Requestor" maps to the existing `requestor` field key in
`app.js` / `index.html` / the field dictionary. No field was invented. The
admin table displays it; search includes it; the drawer Identity section edits it.

## Limitations

- Scripted Chromium run on port 8760 with fictitious records only.
- Focus-trap Tab wrap was implemented and Escape/return-focus were exercised;
  exhaustive Tab cycling through every control was not separately timed.
- G-TEST acceptance by Annamarie Zambrano remains outstanding.
