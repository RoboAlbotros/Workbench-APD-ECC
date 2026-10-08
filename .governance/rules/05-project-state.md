# Rule 05 — Project State

Status: APPROVED — project-authored baseline
Owner: Governance authority — TBD
Version: 0.1.0
Approval: Approved by the project owner on 2026-10-08 (recorded via agent session; see docs/reviews/initialization-status.md, run 5)
Date: 2026-10-08

`project.json` is the machine-readable source of current project state, validated against `.governance/schemas/project.schema.json`. One project-state owner (or primary agent) reconciles updates; concurrent agents MUST return proposed changes instead of overwriting the file.

## Canonical state dimensions

Each dimension is recorded separately. State MUST NOT be inferred from missing data or from another dimension. Use `unknown`, `not-assessed`, `not-baselined`, `not-released`, or `null` as applicable.

- **lifecycleStage**: `initiation` | `discovery` | `definition` | `development` | `stabilization` | `released` | `operations` | `retired`
- **workStatus**: `not-started` | `active` | `paused` | `blocked` | `complete`
- **blockingState**: `clear` | `blocked`, with an explicit list of blockers (ID, description, owner)
- **gateStates**: per-gate `pending` | `satisfied` | `waived` | `not-applicable`, each with decision owner and date
- **health**: `healthy` | `at-risk` | `unhealthy` | `not-assessed`, with reason, assessor, and assessment date
- **planBaseline / forecast / actuals**: dates or `not-baselined`
- **planComparison**: `on-plan` | `ahead` | `behind` | `not-baselined`
- **progress**: evidence-based measure or `null`, with measurement basis
- **releaseState**: `planned` | `candidate` | `released` | `not-released`
- **distributionBaseline / productionBaseline**: populated tuples or explicit `null`

## State transitions

Material state transitions MUST be recorded in `project.json` history (or a controlled history reference) with timestamp, actor, and basis. Schema conformance proves structure only — never factual accuracy, approval, or gate satisfaction.
