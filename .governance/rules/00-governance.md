# Rule 00 — Governance

Status: APPROVED — project-authored baseline
Owner: Governance authority — TBD
Version: 0.1.0
Approval: Approved by the project owner on 2026-10-08 (recorded via agent session; see docs/reviews/initialization-status.md, run 5)
Date: 2026-10-08

Provenance: Authored in-repository at the project owner's direction on 2026-10-08 because no authoritative SGK distribution was available. This is the project's governance baseline, not the official SGK Constitution. Normative terms (MUST, SHOULD, MAY, etc.) follow BCP 14 (RFC 2119 / RFC 8174).

## Authority order

1. Organizational SDLC Framework (when adopted)
2. Project GOVERNANCE.md
3. Approved Architecture Decisions
4. Product Definition
5. Approved Roadmap
6. Active Sprint Specification
7. Repository / Agent Rules (these files)
8. Implementation Decisions

Conflicts MUST be resolved in favor of the higher authority and reported. Applicable law and formally adopted City of Albuquerque policy constrain all work without changing this internal order.

## Change classes

- **C1 — Minimal.** Documentation-only or trivially reversible changes with no behavior, data, or security effect. MAY use an approved expedited path.
- **C2 — Standard.** Backward-compatible code or configuration changes within approved scope. Requires reviewed integration (PR or equivalent) and applicable tests.
- **C3 — Significant.** New capabilities, interface changes, deprecations, or material refactors. Requires reviewed integration, test evidence, and product/technical owner approval. Material C3 work requires a documented threat model.
- **C4 — Critical.** Any change involving identity, authorization, sensitive-data handling, major security controls, trust boundaries, or material attack surface. Requires security review, documented threat model, and governance authority approval in addition to C3 requirements.

If classification is uncertain, the more controlled class MUST be selected and flagged for owner confirmation.

## Gates

- **G-SCOPE** — Product scope and outcome approval (product + business/outcome owners).
- **G-ARCH** — Architecture approval (technical owner).
- **G-SEC** — Security/privacy baseline and C4 approvals (security/privacy authority).
- **G-TEST** — Test evidence acceptance (QA authority).
- **G-CAND** — Release candidate acceptance (release authority).
- **G-REL** — Final release authorization (release authority; a separate recorded decision from G-CAND).

A gate is satisfied only by its accountable function's recorded decision. No AI agent, prompt, charter, or tool access satisfies a gate.

## Integration paths

The primary branch is `main`. Governance changes and C2–C4 work REQUIRE a pull request or equivalent reviewed change. Direct integration to `main` is prohibited except for C1 work via an approved expedited path. GitHub branch protection is not currently configured; this is recorded as a mechanical limitation, not permission.
