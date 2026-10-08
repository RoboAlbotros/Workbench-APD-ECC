# Rule 40 — Testing

Status: DRAFT — project-authored baseline, pending owner approval
Owner: QA authority — TBD
Version: 0.1.0
Approval: Pending
Date: 2026-10-08

## Test levels

- **Unit** — required for C2+ code changes touching logic.
- **Integration** — required where components, storage, or external interfaces interact.
- **Acceptance** — required against recorded acceptance criteria before G-TEST.
- **Regression** — required for changes to released behavior.
- **Manual/exploratory** — permitted as supplementary evidence, recorded with tester, date, and scope.

## Security and privacy verification categories

Required-or-not-required decisions per category are recorded in the security baseline (Rule 50) with evidence locations:

1. Authentication and session verification
2. Authorization and access-control verification
3. Input validation and injection testing
4. Sensitive-data handling and storage verification
5. Dependency and supply-chain vulnerability scanning
6. Logging/audit verification
7. Privacy-control verification (minimization, retention, notice)

## Evidence

Test evidence MUST identify the commands or procedures run, environment, results, date, and actor, and be referenced from the sprint or change record. Unresolved defects MUST be recorded with severity and owner. G-TEST is satisfied only by the QA authority's recorded acceptance.
