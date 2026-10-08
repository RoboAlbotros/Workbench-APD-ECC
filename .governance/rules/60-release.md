# Rule 60 — Release

Status: DRAFT — project-authored baseline, pending owner approval
Owner: Release authority — TBD
Version: 0.1.0
Approval: Pending
Date: 2026-10-08

## Versioning

Semantic Versioning 2.0.0 applies (schema profile 3.0.0 — the standardized SemVer profile). The public contract (user-visible behavior, APIs/integrations, data and configuration formats, identity and security behavior, supported operational commitments) is defined in `project.json` `versioning.publicContract`.

- **MAJOR** — incompatible product, interface, data, or operational change
- **MINOR** — backward-compatible capability or deprecation
- **PATCH** — backward-compatible correction, including compatible security corrections
- **none** — no effect on a released deliverable

Prerelease stages: `-dev.N`, `-alpha.N`, `-beta.N`, `-rc.N` only. Tags: `vMAJOR.MINOR.PATCH` or the full prerelease version. A new unshipped product targets **0.1.0**; 1.0.0 requires a documented stable public contract. Versions never increment merely because files changed.

## Candidate-to-final identity procedure

1. `release.candidateIdentity` and `release.finalIdentity` remain `null` until their required evidence exists.
2. An immutable `-rc.N` tag plus reserved record identifier establishes *proposed* candidate identity while release state remains `planned`.
3. After readiness and candidate acceptance by the release authority (G-CAND, a recorded decision), state becomes `candidate` and `candidateIdentity` is populated: candidate version/tag, full source revision, artifact name/format/SHA-256/retained location, detached candidate-record ID/location.
4. Final release authorization (G-REL) is a separate recorded decision, even by the same person. Candidate and final tags MUST resolve to the same source commit; publication MUST use the same stored artifact bytes and SHA-256 digest.
5. `finalIdentity` (final tag, detached release-record ID/location, distribution location, timestamp) is populated only after publication or deployment.
6. Any source or artifact change requires `rc.N+1` and renewed validation and approval.

Every release updates: `project.json`, release evidence in `docs/release/`, source revision/tag/artifact identity, user or operator documentation, and the current sprint or release record. Published versions, tags, and artifacts are never reused, moved, or replaced. A rollback changes the production baseline but does not erase the rolled-back version.

`release.releaseType`: `distribution` (non-runtime publication), `runtime` (operating-environment deployment), or `hybrid`.
