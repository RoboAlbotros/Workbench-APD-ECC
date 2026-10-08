# Project Governance

Status: APPROVED — project-authored governance baseline
Owner: Governance and approval authority — TBD (assignment required; approval below was recorded by the project owner)
Version: 0.2.0
Approval: Approved by the project owner on 2026-10-08 (recorded via agent session; see docs/reviews/initialization-status.md, run 5)
Date: 2026-10-08 (supersedes 2026-10-05 draft)

## Scope and authority

This document governs the Workbench APD ECC project, whose first capability is the CJIS Applicant Tracker (`CJISTracker/`). It is a project-authored governance baseline created and approved at the project owner's direction because no authoritative SDLC Governance Kit (SGK) distribution was available. It MUST NOT be represented as the official SGK Constitution or an adopted City of Albuquerque policy. Distribution approval and formal City policy adoption remain separate decisions. This baseline cannot override applicable law or formally adopted policy; conflicts MUST be escalated to the accountable authority.

The project-artifact authority order is:
1. Organizational SDLC Framework (when adopted)
2. Project GOVERNANCE.md (this document)
3. Approved Architecture Decisions
4. Product Definition
5. Approved Roadmap
6. Active Sprint Specification
7. Repository / Agent Rules (`.governance/rules/`)
8. Implementation Decisions

Architecture MUST NOT silently redefine approved product scope or outcomes. A material conflict requires a joint recorded decision by the accountable functions.

## Normative language

MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are interpreted per BCP 14 (RFC 2119 and RFC 8174) only when written in uppercase.

## Governance artifacts

- `.governance/rules/00-governance.md` … `70-operations.md` — the nine approved project rules (authority order, change classes C1–C4, gates, project state, architecture, product, development, testing, security, release, operations).
- `.governance/schemas/project.schema.json` — JSON Schema Draft 2020-12 profile 3.0.0 for `project.json`.
- `project.json` — machine-readable source of current project state; one designated project-state owner reconciles updates, concurrent agents return proposals.
- `docs/appendices/nist/` — five controlled NIST publications with SHA-256 integrity sums. Presence of a reference or schema validation MUST NOT be described as compliance or approval.

## Accountable functions and decisions

The project owner MUST designate product, business/outcome acceptance, technical, governance/approval, coordination (if applicable), QA, security/privacy, UX/accessibility, documentation, release, and operations authorities. Assignments are recorded in `project.json` (currently TBD, decisions TBD-DEC-001…011). Candidate acceptance and final release authorization MUST be recorded as separate decisions. Agent review MUST NOT be represented as human approval or a satisfied gate.

## Work identity and shared state

Before every human or AI development run, the actor MUST perform the work-identity preflight in `.governance/rules/30-development.md`, deriving authority from schema-valid `project.json` and the controlling approved sprint or change record. Natural-language task wording alone MUST NOT establish authority. While `project.json` `currentAuthorizedWork` is null, implementation is not authorized.

## Integration and release

The primary branch is `main` at https://github.com/RoboAlbotros/Workbench-APD-ECC. Governance changes and C2–C4 work MUST use a pull request or equivalent reviewed change; C1 MAY use an approved expedited path. GitHub branch protection is not configured — this mechanical limitation is recorded in `project.json` and MUST NOT be treated as permission for direct integration.

SemVer 2.0.0, v-prefixed release tags, and Conventional Commits 1.0.0 apply per Rule 60. Development, candidate, distribution, and production identities remain distinct; no release, candidate, or production baseline exists.

## Security and references

Data classification, authentication, authorization, secrets management, approved AI services, external transmission boundaries, legal/policy obligations, NIST applicability and tailoring, threat-model and privacy-assessment applicability, vulnerability intake, and disclosure authorities remain TBD pending the security/privacy authority (see `project.json` `security`). Credentials, personal applicant information, and production secrets MUST NOT be placed in repository files.

## Implementation gate

Product implementation MUST NOT start before the designated authorities approve the first sprint and `project.json` records it as `currentAuthorizedWork`. Owner approval of this governance baseline (2026-10-08) satisfies the baseline-approval blocker only; owner assignments and first-sprint approval remain outstanding.
