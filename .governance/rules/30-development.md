# Rule 30 — Development

Status: APPROVED — project-authored baseline
Owner: Technical owner — TBD
Version: 0.1.0
Approval: Approved by the project owner on 2026-10-08 (recorded via agent session; see docs/reviews/initialization-status.md, run 5)
Date: 2026-10-08

## Work-identity preflight (REQUIRED before every development run)

Before any human or AI development run, the actor MUST derive and record from `project.json` and the controlling sprint or change record — never from natural-language task wording alone:

1. Project identity and current development version
2. Controlling sprint or change-record ID (`currentAuthorizedWork`); if `null`, implementation is NOT authorized and the run MUST stop
3. Change class of the planned work and its required gates
4. Allowed files/scope and explicit exclusions
5. Acting function and whether required approvals exist for the planned actions

A run that cannot complete this preflight MUST stop and report rather than proceed.

## Integration rules

- Primary branch: `main`. C2–C4 work and all governance changes REQUIRE a pull request or equivalent reviewed change. C1 MAY use an approved expedited path.
- Retained integration or squash-merge commits MUST follow Conventional Commits 1.0.0 and reference the controlling work item.
- Working branches: `feat/...`, `fix/...`, `docs/...`, `chore/...` referencing the sprint or change record.
- Never discard or overwrite uncommitted work. Never overwrite a populated file without reviewing it.

## AI agent rules

- AI agents act only within a recorded charter or direct owner instruction; tool access does not establish permission.
- Delegation does not transfer accountability or decision authority. Subagent limits: at most three active, one delegation level, read-only review by default.
- Agents MUST NOT approve scope, architecture, policy, outcomes, risk acceptance, gates, candidates, or releases.
