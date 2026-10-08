# Rule 10 — Architecture

Status: DRAFT — project-authored baseline, pending owner approval
Owner: Technical owner — TBD
Version: 0.1.0
Approval: Pending
Date: 2026-10-08

## Architecture decisions

Material architecture decisions MUST be recorded as Architecture Decision Records (ADRs) in `docs/architecture/decisions/`, numbered `ADR-NNNN-short-title.md`, each with status, context, decision, consequences, owner, and date.

## Requirements

- System boundaries, external dependencies, interfaces, and trust boundaries MUST be documented before G-ARCH approval.
- Architecture constrains implementation but MUST NOT silently redefine approved product scope or outcomes. A material product/architecture conflict MUST be escalated for a joint recorded decision by the product and technical owners.
- Proportionate threat and privacy risk analysis MUST be recorded before architecture approval (see Rule 50).
- Dependency additions beyond the approved set are C2 minimum; new trust boundaries or externally reachable surfaces are C4 unless the security function determines otherwise.
