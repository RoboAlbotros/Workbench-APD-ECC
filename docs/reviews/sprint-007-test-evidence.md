# SPRINT-007 Test Evidence — Wire the SQL API

Controlling work ID: SPRINT-007
Tester: Project owner Brett (live INTDEV / localhost exercise) with Cursor primary agent
  recording; under technical owner Brett
Date: 2026-10-28
Environment: Localhost API on `127.0.0.1:8741`; INTDEV Clearance Tracker with SQL
  (`TRACKERAPP_TEST` / connected health); browser CJISTracker with SQL when connected
  and localStorage fallback when not
Status: PASS — G-TEST accepted as relayed 2026-10-28 by project owner Brett on behalf of
  QA authority Annamarie Zambrano; ratification open

## Acceptance criteria

| # | Criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | `node backend/src/index.js` starts a `127.0.0.1` listener | API served on `127.0.0.1:8741` (NSSM / INTDEV and local runs); history 2026-10-19T23:45:00-06:00 | PASS |
| 2 | `GET /health` reports SQL configured and connected | Health JSON used by browser storage footer (`Storage: SQL` when connected) | PASS |
| 3 | When SQL connected, GET/PUT persists name parts, Driver Lic Num, department (incl. APD), dates, archive flags | INTDEV seed imports and DL/department updates; archive delete soft-sets `IsDeleted`; schema refresh includes APD | PASS |
| 4 | When SQL not connected, browser still loads from localStorage | Documented fallback in README and app adapter; footer `Storage: this browser` | PASS |
| 5 | No secrets in repository; `project.json` validates | `.env` gitignored; schema validation recorded on close | PASS |

## Sprint follow-ons exercised under SPRINT-007 (not separate authorized work)

- Schema refresh (Read Only role label, APD department)
- Archive delete for Admin-Full / Admin-Global / Admin-Staff
- Active/InActive rules (NCIC Y/N; One Time Visit)
- Read Only excludes One Time Visit
- Export CSV removed
- Settings data-protection status check
- Silent SQL refresh and Audit Activity Stream (browser change log)

## Explicit non-claims

- No Entra / City SSO login
- No public bind claimed as production
- G-ARCH, G-SEC, G-CAND, and G-REL remain unsatisfied
- Change log and document blobs remain browser-side this sprint
- Agent review does not satisfy G-TEST

## Limitations

- G-TEST acceptance is relayed by the project owner; ratification by Jessica Solis and
  Annamarie Zambrano remains open.
- Owner statement closing the sprint: "Close sprint 007 as complete and approved"
  (also: plan attach / "Close SPRINT-007 as complete and approved").
