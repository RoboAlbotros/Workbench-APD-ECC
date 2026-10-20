# Sprint 005 — UI/UX redesign: compact operations layout

Status: COMPLETE — G-TEST accepted as relayed 2026-10-19
Owner: Brett (technical and UX/accessibility owner); product impact approval Jessica Solis
Version: 0.1.0
Approval: Authorized 2026-10-13 — project owner Brett said "go" after designating
SPRINT-005 as the UI/UX redesign to eliminate whitespace and provide an easier
daily experience. Sprint approval relayed by the project owner on behalf of joint
governance authorities Jessica Solis and Annamarie Zambrano, consistent with prior
sprints; ratification open.
Date: 2026-10-13
Controlling work ID: SPRINT-005

## Sprint objective

Compact the CJISTracker chrome so daily operators see applicant records first:
collapse Management Access after sign-in, put metrics/search/filters on one
toolbar row, reduce heading and panel spacing, and keep the applicant editor
closed until View, Edit, or New Applicant. Class C2 presentation only.

## Authorized basis

Owner designation (session preceding 2026-10-13T01:30:00-06:00): SPRINT-005 is
the UI/UX redesign to eliminate whitespace and provide an easier experience.
Owner go recorded 2026-10-13 ("go"). Compact operations layout is the
implementation direction for this authorization (no option selection was made
in this go).

Already-landed presentation work from earlier SPRINT-005 sessions remains in
force and is not reversed: table-first admin with a record drawer, DEC-019
admin column set and vendor grouping, calculated Next III Inquiry Due, hidden
Import/Export on the main screen, Control ID and Source in the form only,
and footer Version 0.1.0-dev.1.

## Change classification

Class: C2 — presentation. Backward-compatible UI density and chrome layout
within approved product scope. No data-model change, no new fields, no
re-enable of Import/Export on the main screen, no authentication or server work.

## In-scope work

1. **Collapsed session bar** — after sign-in, Management Access becomes a single
   compact bar: user badge + Sign Out. View switch stays in the topbar.
2. **Compact signed-out sign-in** — not a full-page card; three fields inline
   (User Name, Access Level, Access Code) plus Sign In.
3. **Unified operations toolbar** — metrics as inline pills on the same row as
   search and filters (not 88px metric cards; no separate search band).
4. **Density** — h1 about 22px; tighter panel padding; metric min-height removed.
5. **Table-first editor** — do not show an empty full form occupying the first
   admin screen. Open the editor only on View, Edit, or New Applicant. New
   Applicant remains available in admin (table header or toolbar). Records view
   still requires selecting a record.
6. **Preserve hidden controls and fields** — Control ID and Source stay in the
   form and stay hidden from the admin table. Import panel stays commented/hidden.
   Export button stays hidden; `downloadCsv` retained.
7. **Footer** — Version 0.1.0-dev.1 remains, footnote size.
8. **Overlay visuals** — prefer absorbing vendor grouping, expired-cert
   highlight, and query-date readonly in CSS/app. Do not delete
   `tracker-list-overrides.js` this sprint if retirement is risky; file may
   remain unloaded.

## Explicit exclusions

- No data-model change and no change to business rules, field set, or seed
  data values.
- No re-enabling Import/Export on the main screen.
- No authentication, PIN, or server-side work.
- No frameworks, build step, or new dependencies.
- No new PII fields and no data-scope change (DEC-012/DEC-017 unchanged).

## Acceptance criteria

- Signed in: Management Access is a compact bar (badge + Sign Out); view switch
  remains in the topbar; metrics, search, and filters share one compact toolbar
  row.
- Signed out: compact inline sign-in row (three fields, not stacked full width).
- Admin: applicant table is visible without scrolling past a giant empty form;
  New Applicant is available; editor opens only on View/Edit/New Applicant.
- Four fictitious test applicants remain listed; seed values unchanged.
- Limited and Records tabs still function; Records still requires a selected
  record to edit.
- Footer Version 0.1.0-dev.1 is present; Import and Export buttons are not
  visible on the main screen.
- Vendor grouping, expired-cert highlighting, and Next III Inquiry Due
  readonly calculation remain intact.
- Test evidence recorded; `project.json` updated and schema-validated.

## Required artifacts

- `CJISTracker/index.html`, `CJISTracker/styles.css`, `CJISTracker/app.js`
- `docs/reviews/sprint-005-test-evidence.md`
- Updated `project.json`

## Required tests

Browser acceptance on a desktop viewport (Full Admin / owner code 12345):
signed-in chrome is compact; table visible without scrolling past a giant form;
four test applicants listed; sign-out/sign-in still works; Limited and Records
tabs work; footer present; no Import/Export buttons visible.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano (governance, joint) —
  relayed by project owner; ratification open.
- G-TEST: Annamarie Zambrano (QA) — accepted as relayed 2026-10-19 by
  project owner Brett (owner statement: "Close SPRINT-005 approved").
  Ratification by Jessica Solis and Annamarie Zambrano remains open.
  Evidence: `docs/reviews/sprint-005-test-evidence.md`.

## Definition of done

- All acceptance criteria met with recorded evidence
- G-TEST accepted by QA authority (outstanding at implementation)
- project.json updated and validated
- Documentation updated

## Completion record (2026-10-19)

- Sprint approval ratified and G-TEST accepted as relayed by project owner Brett
  on behalf of Jessica Solis and Annamarie Zambrano (owner statement: "Close
  SPRINT-005 approved"; `project.json` history 2026-10-19T23:13:00-06:00).
- Agent review does not satisfy the gate. Ratification by Jessica Solis and
  Annamarie Zambrano remains open.
- G-TEST evidence: `docs/reviews/sprint-005-test-evidence.md`.
- `currentAuthorizedWork` remains null. SPRINT-006 was already complete.
  Next sprint is not authorized until the owner designates it. G-ARCH and
  G-SEC remain pending.
