# Rule 70 — Operations

Status: APPROVED — project-authored baseline
Owner: Operations authority — TBD
Version: 0.1.0
Approval: Approved by the project owner on 2026-10-08 (recorded via agent session; see docs/reviews/initialization-status.md, run 5)
Date: 2026-10-08

## Production baseline

The production baseline (version, environment, owner, assessment time) is recorded in `project.json`. Production status is never inferred from a version number or repository state.

## Requirements

- Deployment, rollback, observability, and operational ownership MUST be documented in `docs/operations/` before a runtime release (G-REL for `runtime` or `hybrid` release types).
- Incidents are recorded with timeline, impact, response, and root cause; material incidents feed the improvement process in Rule 50.
- Backup, recovery, and continuity expectations follow the approved security baseline.
- Environment separation (development / test / production) MUST be maintained; production data is not used in lower environments without a recorded security/privacy decision.
- Operational changes to production are C2 minimum; emergency changes use the approved expedited path and are reconciled into the record afterward.
