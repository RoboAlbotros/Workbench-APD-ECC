# Rule 50 — Security and Privacy

Status: DRAFT — project-authored baseline, pending owner approval
Owner: Security/privacy authority — TBD
Version: 0.1.0
Approval: Pending
Date: 2026-10-08

## Controlled NIST references

The local appendix `docs/appendices/nist/` retains the five controlled publications with SHA-256 integrity sums (`SHA256SUMS`):

1. NIST CSF 2.0 (CSWP 29)
2. NIST SP 800-218 (SSDF 1.1)
3. NIST Privacy Framework 1.0 (CSWP 01162020)
4. NIST SP 800-218A (SSDF profile for generative AI)
5. NIST SP 800-204D (software supply chain security in CI/CD)

For each publication the project records assessor, assessment date, applicability, applicable outcomes/practices, tailored controls, evidence locations, review date, and any not-required / equivalent-control / exception / residual-risk decision. `not-required` requires an accountable security/privacy decision. Presence of a reference or schema validation is never a compliance claim.

## Project security baseline (recorded in project.json)

- Data classification and sensitive-data inventory
- Authentication method and authorization model
- Secrets-management approach — credentials, tokens, personal information, and production secrets MUST NOT be committed to the repository
- Dependency and supply-chain expectations (trusted sources, inventory/SBOM, vulnerability monitoring)
- Logging and audit requirements
- Security testing expectations (see Rule 40 categories)
- Environment separation, backup and recovery
- Incident/vulnerability contact, intake path, severity method, response and disclosure expectations
- Known security exceptions with owners

## Classification triggers

Any change involving identity, authorization, sensitive-data handling, major security controls, trust-boundary changes, or material attack-surface changes is **C4** unless the authorized security function records otherwise. C4 and material C3 work require a documented threat model. Personal or sensitive information requires a recorded privacy applicability and impact-assessment decision (purpose, minimization, inference/linkage, sharing, retention/deletion authority, notices, third parties and AI services, mitigations, validation, residual risk, decision authority).

## AI and tooling boundaries

Approved AI services and development tools, external transmission boundaries, data-minimization requirements, and prohibited data or actions are recorded in `project.json` `extensions.aiBoundaries`. AI-assisted coding alone does not trigger the SP 800-218A delivered-AI-system profile; developing, integrating, or acquiring an AI system does.
