# Sprint 009 — IIS INTDEV hosting and GitHub Actions deploy

Status: ACTIVE — AUTHORIZED (owner directed implement plan)
Owner: Brett (technical owner and operations authority)
Version: 0.1.0
Approval: Owner-directed 2026-10-22 — implement IIS INTDEV + GitHub Actions plan.
  Ratification by Jessica Solis and Annamarie Zambrano remains open.
Date: 2026-10-22
Controlling work ID: SPRINT-009

## Sprint objective

Host the Clearance Tracker on `DTIAPPSINTDEV` under IIS at
`clearancetracker.cabq.gov`, run the Node API as a Windows Service under
`COA\svc-clearancetracker` (Automatic start), and add GitHub Actions so
`develop` publishes to INTDEV and `main` publishes to `DTIAPPSINTPRD`.

## Work-identity preflight

1. Project: Workbench APD ECC; developmentVersion `0.1.0-dev.1`.
2. Controlling work: SPRINT-009 (`currentAuthorizedWork`).
3. Change class: **C4** — live host, public hostname, service account, CI deploy.
4. Allowed files: `deploy/**`, `.github/workflows/**`, `backend/**`,
   `CJISTracker/app.js`, READMEs, this sprint document, `project.json`,
   `docs/operations/**`.
5. Acting function: technical / operations owner Brett. Agent review cannot
   satisfy G-ARCH, G-SEC, or G-TEST.

## In-scope work

- IIS site + ARR reverse proxy scripts and `web.config`.
- Windows Service install script for the Node API (NSSM, Automatic).
- Publish script used by Actions on self-hosted runners.
- CORS / same-origin API base for the public hostname; API remains on
  `127.0.0.1`.
- Optional SQL Windows/NTLM authentication mode for the service account.
- Branch `develop`; workflows `deploy-intdev.yml` and `deploy-intprd.yml`.
- Operations runbook `docs/operations/iis-hosting.md`.
- Record `deploymentTarget` for INTDEV / INTPRD.

## Explicit exclusions

- Live Entra / SPRINT-008 implementation.
- Inventing Entra tenant, client, or redirect values.
- Committing passwords or server `.env`.
- Claiming G-ARCH, G-SEC, or CJIS certification.
- Remote IIS configuration when SSH/WinRM credentials are not supplied —
  inventory and scripts are delivered; interactive server install waits for
  passwords and admin session.

## Acceptance criteria

- Repo contains idempotent IIS and Windows Service install scripts plus publish script.
- `develop` → INTDEV and `main` → INTPRD workflow files exist for self-hosted Windows runners.
- Browser uses same-origin `/api` and `/health` when not on localhost.
- API still refuses a public listen host.
- Operations runbook documents one-time setup and Actions runner labels.
- `project.json` records deployment targets and validates.
- When credentials are available: site responds on the host header; service
  restarts after reboot; `/health` reports SQL when DBA access is granted.

## Change classification

Class: C4
Reason: public hostname, service account identity, CI deploy to app servers.

## Required artifacts

- `docs/planning/sprints/sprint-009-iis-intdev-github-actions.md` (this file)
- `docs/operations/iis-hosting.md`
- `deploy/**`
- `.github/workflows/deploy-intdev.yml`
- `.github/workflows/deploy-intprd.yml`
- Updated `project.json`

## Required tests

- Schema-validate `project.json`.
- After server install: `GET /health` on loopback; browse host header.
- G-TEST evidence for Annamarie Zambrano when executed.

## Security considerations

- Threat model remains incomplete; G-SEC pending.
- Prototype PINs are never production controls (DEC-015).
- Publishing without Entra is an interim INTDEV risk and must stay recorded.
- Secrets only in server `backend\.env` and Windows service logon.

## Review and approval gates

- Sprint approval: Jessica Solis + Annamarie Zambrano — ratification open.
- G-ARCH / G-SEC: pending.
- G-TEST: Annamarie Zambrano — pending after host smoke.

## Definition of done

- Scripts and Actions in repo; branch `develop` was later deleted (TEST deploy is workflow_dispatch; PROD INTDEV uses `dev`).
- INTDEV host configured when access is provided.
- Documentation and `project.json` updated.
- No secrets in git.

## Readiness decision and evidence

Readiness: INTDEV site and API service are installed. Still open: service-account
password (service currently LocalSystem; app pool ApplicationPoolIdentity),
SQL credentials in the server `backend\.env`, and DNS and certificate for
`clearancetracker.cabq.gov`. The INTDEV runner is online.
Decided by: Owner direction 2026-10-22 to complete setup on DTIAPPSINTDEV.
