# Sprint 001 — CJISTracker product definition and security baseline

Status: COMPLETE (2026-10-08)
Owner: Jessica Solis (product owner); prepared by Cursor primary agent at project owner direction
Version: 0.1.0
Approval: Approved 2026-10-08 — relayed by project owner Brett on behalf of the joint governance authorities; ratification confirmed by the project owner 2026-10-08T16:06-06:00 ("go review and confirmed"). The relayed-approval limitation is closed.
Date: 2026-10-08
Controlling work ID: SPRINT-001

## Sprint objective

Establish the approved foundations required before any CJISTracker build work: an approved product definition, data classification, security baseline decisions, and CJIS policy applicability — so that a build sprint can be authorized with clear scope and constraints.

## In-scope work

- Author `docs/product/product-definition.md`: purpose, intended users, outcomes, initial scope, explicit exclusions (product owner approves).
- Author `docs/discovery/product-concept.md` capturing the existing prototype's capabilities as the concept baseline.
- Record the data classification decision and sensitive-data inventory in `project.json` (security/privacy authority).
- Record CJIS Security Policy applicability and edition decision (security/privacy + governance authorities).
- Record authentication/authorization direction for production (decision only; no implementation).
- Record privacy impact assessment applicability decision.
- Record NIST CSF 2.0 / SSDF 1.1 / Privacy Framework applicability decisions in `project.json` `security.nistBaseline`.
- Author `docs/planning/roadmap.md` (first-release outline toward 0.1.0).
- Create `.github/pull_request_template.md` and remaining Phase 3 directories (`docs/architecture/decisions/`, `docs/release/`, `docs/operations/`).
- Update `project.json` state and validate.

## Explicit exclusions

- No product implementation, refactoring, or changes to `CJISTracker/` application files.
- No dependency installation, cloud configuration, or deployment.
- No handling or committing of real applicant records or PII.
- No City policy adoption decisions.

## Acceptance criteria

- `docs/product/product-definition.md` exists and is approved by Jessica Solis.
- Data classification, CJIS applicability, auth direction, PIA applicability, and NIST applicability decisions are recorded in `project.json` with decision owners and dates.
- `project.json` validates against the schema after all updates.
- Roadmap and PR template exist.
- G-SCOPE recorded as satisfied by the product and business/outcome owners.

## Change classification

Class: C2 (documentation and governed-state changes integrated via reviewed change; no code or runtime behavior change). Security *decisions* are recorded by their accountable authority, which keeps this below C4 since no security-relevant implementation occurs.

## Required artifacts

- `docs/product/product-definition.md`, `docs/discovery/product-concept.md`, `docs/planning/roadmap.md`, `.github/pull_request_template.md`
- Updated `project.json` with decisions DEC-012+ and validation evidence

## Required tests

- Schema validation of `project.json` (structural).
- Document review by the accountable owners (acceptance in lieu of automated tests; documentation-only sprint).

## Security considerations

- Decisions recorded this sprint (classification, CJIS applicability, auth direction, PIA applicability) constrain all future sprints.
- No real PII may appear in any artifact; examples must use clearly fictitious data.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano (governance, joint) — REQUIRED to start.
- G-SCOPE: Jessica Solis (product) + Jessica Solis/Annamarie Zambrano (business/outcome) — target of this sprint.
- G-SEC: Brett (security/privacy) — decisions recorded this sprint feed the gate; gate itself remains pending until the baseline review is complete.

## Scoped specialist gates and applicability decisions

- UX/accessibility, documentation, release, operations gates: not applicable this sprint (no implementation or release).

## Delegation plan and charter references

None. Primary agent drafts documents; accountable humans decide and approve.

## Handoff expectations

Drafts presented in-session to the accountable owners; decisions recorded in `project.json` with owner and date; all changes committed with Conventional Commits referencing SPRINT-001.

## Definition of done

- All acceptance criteria met with recorded evidence
- Sprint-approval and in-sprint decisions recorded by their accountable owners
- `project.json` updated, validated, and pushed
- Initialization status log updated

## Readiness decision and evidence

Readiness: READY — approved as relayed by the project owner; ratified 2026-10-08.
Decided by: Jessica Solis + Annamarie Zambrano (joint governance), relayed by Brett, 2026-10-08
Evidence: project.json history runs 7-8; currentAuthorizedWork = SPRINT-001.

## Completion record

Completed 2026-10-08. All acceptance criteria met: product-definition.md 0.1.0 APPROVED (G-SCOPE satisfied); decisions recorded — DEC-012 (no PII / no CJIS data; classification internal), DEC-013 (CJIS Security Policy not directly applicable), DEC-014 (PIA not required; revisit on scope change), DEC-015 (production auth: City SSO/Entra ID with server-side RBAC), DEC-016 (NIST applicability: CSF 2.0 applicable-lightweight, SSDF 1.1 applicable, Privacy Framework not applicable under DEC-012, SP 800-218A not applicable, SP 800-204D applicable-minimal); roadmap and PR template created; project.json schema-validated (python-jsonschema 4.26.0, pass). Finding carried forward: FIND-001 (prototype PII fields violate DEC-012) — assigned to SPRINT-002. Evidence: project.json history runs 8-10.
