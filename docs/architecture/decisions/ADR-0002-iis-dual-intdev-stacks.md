# ADR-0002 — IIS ARR with dual INTDEV stacks

Status: Accepted
Date: 2026-10-30
Owner: Brett (technical owner)
Related: SPRINT-009; `docs/operations/iis-hosting.md`

## Context

A single INTDEV site/API/.env caused TEST and PROD database work to overwrite
each other when switching `SQL_DATABASE`.

## Decision

Run two independent stacks on DTIAPPSINTDEV:

| Stack | Site root | API port | Service | Database | Deploy |
| --- | --- | --- | --- | --- | --- |
| TEST | `D:\inetpub\clearancetracker` | 8741 | `ClearanceTrackerApi` | `TRACKERAPP_TEST` | manual `deploy-intdev.yml` |
| PROD | `D:\inetpub\clearancetracker-prod` | 8742 | `ClearanceTrackerApiProd` | `TRACKERAPP_PROD` | branch `dev` |

IIS ARR proxies `/api` and `/health` to the matching loopback port. INTPRD
remains `main` → DTIAPPSINTPRD.

## Consequences

- Positive: TEST and PROD INTDEV work no longer share one .env/API.
- Negative: Operators must use the correct host header; two services to monitor.
- Follow-on: DNS/TLS for both hostnames; keep `develop` deleted (no auto TEST push).
