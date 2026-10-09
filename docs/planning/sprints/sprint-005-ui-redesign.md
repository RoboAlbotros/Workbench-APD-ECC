# Sprint 005 — UI/UX redesign: Tabbed Workspace with Form Drawer (Option B)

Status: PROPOSED (awaiting owner go)
Owner: Brett (technical and UX/accessibility owner); product impact approval Jessica Solis
Version: 0.1.0
Approval: Direction selected 2026-10-09 by project owner Brett (DEC-019, verbatim
statements below). Sprint designation recorded earlier the same session ("I agree we
will redesign in sprint SPRINT-005." — project.json history run 20 context).
Implementation NOT yet authorized; owner go and governance approval (Jessica Solis +
Annamarie Zambrano, relay permitted per prior sprints with ratification open) required
before any code change.
Date: 2026-10-09
Controlling work ID: SPRINT-005

## Sprint objective

Redesign the CJISTracker single-page app (vanilla JS, `CJISTracker/`) per Option B —
"Tabbed Workspace with Form Drawer" — so that applicant data is visible on the first
screen when signed in, the admin table fits without horizontal scrolling at common
widths, and all behaviors currently supplied by the `tracker-list-overrides.js` overlay
are folded natively into `app.js`/`styles.css`/`index.html`, allowing the overlay file
to be retired.

## Authorized basis (verbatim owner statements)

Direction selection and the three design answers, project owner Brett,
2026-10-09 10:23 AM (UTC-06:00):

> "Yes to Option B,
>
> 1. the 8 coluns that stay visable are Actions, Clearance Type, Access Type, Name,
> Requestor,III - Status, CJIS Security Role, NCIC Certification
> 2. Default grouping - keep current grouping
> 3. This field should be a calculated value of field Date of III Completion + 5 years
> = Next III Inquiry Due (5 yrs) date."

Sprint designation, earlier the same session:

> "I agree we will redesign in sprint SPRINT-005."

Recorded interpretations of the owner answers:

1. Visible admin-table columns = the Actions column plus seven data columns
   (mapping table below; all seven map to existing field keys — no new fields).
2. "Keep current grouping" = the grouping users currently see, i.e. the vendor
   grouping applied today by `tracker-list-overrides.js`, carried into the base app
   as the default.
3. `queriedEveryFiveYears` becomes a calculated, read-only due date =
   Date of III Completion (`dateOfIiiCompletion`) + 5 years, displayed as
   "Next III Inquiry Due (5 yrs)", with a one-time migration of stored records on
   load and the "Query Due" metric updated to compare that due date against today.

## Column-to-field mapping (admin "All Applicant Records" table)

All owner-named columns map to existing field keys in `app.js`; no field invention
is required.

| Owner-named column | Field key (`app.js`) | Current base label |
| --- | --- | --- |
| Actions | — (row action buttons, not a data field) | "Actions" |
| Clearance Type | `clearanceType` | "Clearance Type" |
| Access Type | `accessType` | "Access Type" |
| Name | `name` | "Name (Last, First, MI, Suffix)" |
| Requestor | `requestor` | "Requestor" |
| III - Status | `iiiStatus` | "III - Status" |
| CJIS Security Role | `cjisSecurityAwarenessRole` | "CJIS Security and Awareness Role" |
| NCIC Certification | `ncicCertification` | "NCIC Certification" |

All other admin fields remain in the data model, search, CSV export, and the record
drawer (read/edit); they are removed only from the table display. This extends the
precedent of the SPRINT-004 Control ID / Source column hiding (history run 18).

## Change classification

Class: C2-C3 — material user-visible restructuring of the interface plus one governed
data-semantics change (`queriedEveryFiveYears` becomes a calculated due date, with a
one-time stored-record migration). No trust-boundary change: views, sign-in model, and
localStorage persistence are unchanged.

## In-scope work

1. **Slim sticky header (~56px)** — app title, inline metric counts, view switch,
   signed-in badge. Replaces the current full-height header region.
2. **Sign-in collapse** — the sign-in card is shown only when signed out; after
   sign-in it disappears entirely (reclaiming ~424px of vertical space), with
   sign-out available from the header badge.
3. **Sticky toolbar** — search, filters, and a "New Applicant" button pinned below
   the header.
4. **Admin table column diet** — table shows only the eight columns in the mapping
   table above; all other fields visible in the record drawer.
5. **Record/edit drawer** — the edit form becomes a slide-in drawer with grouped
   sections (Identity, Clearance & Access, Certifications & Dates, Contact & Notes),
   keyboard- and focus-trap-accessible (Escape closes, focus returns to the invoking
   control), eliminating the current jump-to-top behavior.
6. **Overlay retirement** — delete `tracker-list-overrides.js` and its `index.html`
   script tag after folding ALL of its behaviors into `app.js`/`styles.css`:
   - Label renames: "Query Date (every 5 years)" → "Next III Inquiry Due (5 yrs)";
     "Security and Awareness Expiration Annually" → "Security and Awareness Cert";
     "Phone Number" → "Applicant Phone Number".
   - "Next III Inquiry Due (5 yrs)" auto-calculation (form field read-only; value =
     III Completion + 5 years) — superseded by the native data fix below.
   - Expired-certification row highlighting (row tint + emphasized cell, tooltip,
     aria-label) on limited and admin tables.
   - Vendor grouping as the default grouping (group header rows, sort by vendor then
     name) with Vendor and Fingerprint Outcome columns hidden from the table,
     per owner answer 2.
   - Compact table density (reduced cell padding).
   - Export CSV button removal — see open questions before carrying this forward.
7. **queriedEveryFiveYears data fix + migration (DEC-019 answer 3)** — resolve the
   current inconsistency (`app.js` `isQueryDue` treats the stored value as a
   last-queried date and adds 5 years; the overlay treats the field as a due date =
   III Completion + 5 years):
   - The field becomes a calculated, read-only due date =
     `dateOfIiiCompletion` + 5 years, labeled "Next III Inquiry Due (5 yrs)".
   - One-time migration of stored records on load: recompute the stored value from
     `dateOfIiiCompletion` where present (blank where III Completion is absent),
     recorded in the change log.
   - The "Query Due" metric compares the stored due date against today
     (due ≤ today ⇒ due), replacing the +5-years arithmetic in `isQueryDue`.
8. **Density pass** — spacing/typography review so admin data fits the first screen
   at common desktop widths.

## Explicit exclusions (out of scope)

- No frameworks, build step, or new dependencies — the app remains vanilla
  HTML/CSS/JS served as static files.
- No new PII fields and no data-scope change (DEC-012/DEC-017 unchanged).
- localStorage persistence model unchanged (same storage keys; only the documented
  `queriedEveryFiveYears` value migration).
- The commented-out import panel stays commented out (SPRINT-004 owner direction,
  history run 19).
- No changes to sign-in/PIN mechanics or the three-view access model.

## Acceptance criteria

- No horizontal scroll on the admin records table at 1280px viewport width.
- Signed in (any view), applicant data is visible on the first screen without
  scrolling past chrome; signed out, the sign-in card is presented.
- `tracker-list-overrides.js` is removed and every overlay behavior listed above is
  preserved natively (labels, vendor grouping, expired-cert highlighting, compact
  density, calculated due date), subject to the Export CSV open question.
- Metric/column agreement: the "Query Due" metric count equals the number of rows
  whose displayed "Next III Inquiry Due (5 yrs)" date is on or before today.
- Drawer accessibility: focus trapped while open, Escape closes, focus returns to
  the invoking control, all form controls reachable by keyboard, no jump-to-top.
- Existing records and CSV export are unaffected apart from the documented
  `queriedEveryFiveYears` migration; export columns and values otherwise unchanged.
- Test evidence recorded; project.json updated and schema-validated.

## Test plan

- Scripted browser acceptance tests (same approach as SPRINT-002/003/004), using
  7 fictitious test records covering: multiple vendors (grouping), a record with an
  expired Security and Awareness cert (highlighting), records with and without
  Date of III Completion (migration/blank due date), a due and a non-due III inquiry
  date (metric agreement), and a One Time Visit clearance (group/filter behavior).
- Checks: 1280px no-horizontal-scroll; first-screen data visibility signed in;
  column set exactly per the mapping table; drawer keyboard/focus behavior;
  migration result in localStorage and change log; CSV export before/after
  comparison; reload persistence.
- Evidence recorded in `docs/reviews/sprint-005-test-evidence.md`.

## Risks

- **Migration risk:** the one-time `queriedEveryFiveYears` recompute overwrites
  stored values; mitigated by deriving strictly from `dateOfIiiCompletion`, logging
  the migration in the change log, and testing on fictitious records first.
- **Behavior-parity risk:** the overlay mutates the DOM generically (MutationObserver
  over all tables); folding into `app.js` must reproduce outcomes, not mechanisms —
  the acceptance criteria pin the observable behaviors.
- **Semantics change:** users who relied on "Query Date" as a last-queried date will
  now see a due date; label and read-only state make this explicit, and DEC-019
  records the owner decision.
- **Layout regressions** at other viewport widths; density pass tested at common
  desktop widths, 1280px as the measured floor.

## Open questions

- **Export CSV button removal:** the overlay currently removes any "Export CSV"
  button from the UI. Carrying this forward natively conflicts in spirit with the
  acceptance criterion that CSV export be unaffected (export code remains, but the
  control is inaccessible). Owner to confirm: keep the Export CSV button removed in
  the redesigned UI, or restore it?
- None on column mapping: "Requestor" maps to the existing `requestor` field key
  (resolved — see mapping table).
