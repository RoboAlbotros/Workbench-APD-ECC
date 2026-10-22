# Clearance Tracker — IIS hosting (INTDEV / INTPRD)

Status: SPRINT-009 active scaffolding
Owner: Brett (technical / operations)
Hosts: `DTIAPPSINTDEV` (develop), `DTIAPPSINTPRD` (main)
Public hostname (INTDEV): `clearancetracker.cabq.gov`
Service account: `COA\svc-clearancetracker`

## Architecture

- **IIS** serves `CJISTracker/` static files and reverse-proxies `/api/*` and `/health` to the Node API via ARR + URL Rewrite ([deploy/iis/web.config](../../deploy/iis/web.config)).
- **Node API** (`backend/`) listens on `127.0.0.1:8741` only and runs as Windows Service `ClearanceTrackerApi` (Automatic) under `COA\svc-clearancetracker`.
- **Secrets** live only in `backend\.env` on the server (never in git or workflow YAML).

```text
Browser → https://clearancetracker.cabq.gov
       → IIS static (index.html, app.js, …)
       → IIS ARR /api,/health → 127.0.0.1:8741 → SQL
```

## One-time server setup (run as admin on the host)

1. Install **IIS**, **URL Rewrite**, **Application Request Routing**, **Node.js LTS**, **NSSM**.
2. Create site root (default `D:\inetpub\clearancetracker`). Grant `COA\svc-clearancetracker` Modify on that tree.
3. Copy application files (or let the first Actions publish run).
4. Create `backend\.env` from [backend/.env.example](../../backend/.env.example). Prefer `SQL_AUTHENTICATION=windows` with the service account once DBA grants access; otherwise a SQL login.
5. Install API service:

```powershell
$pw = Read-Host -AsSecureString "Password for COA\svc-clearancetracker"
.\deploy\windows-service\Install-ClearanceTrackerApiService.ps1 `
  -SiteRoot "D:\inetpub\clearancetracker" `
  -ServiceAccountPassword $pw
```

6. Install IIS site:

```powershell
$pw = Read-Host -AsSecureString "Password for COA\svc-clearancetracker"
.\deploy\iis\Install-ClearanceTrackerIis.ps1 `
  -PhysicalPath "D:\inetpub\clearancetracker" `
  -HostHeader "clearancetracker.cabq.gov" `
  -ServiceAccountPassword $pw `
  -CertificateThumbprint "<thumbprint if HTTPS ready>"
```

7. Inventory check: `.\deploy\Inventory-Host.ps1`
8. Smoke: browse the host header; `Invoke-RestMethod http://127.0.0.1:8741/health`

## GitHub Actions

| Branch | Workflow | Runner labels | GitHub environment |
| --- | --- | --- | --- |
| `develop` | [.github/workflows/deploy-intdev.yml](../../.github/workflows/deploy-intdev.yml) | `self-hosted`, `Windows`, `intdev` | `intdev` |
| `main` | [.github/workflows/deploy-intprd.yml](../../.github/workflows/deploy-intprd.yml) | `self-hosted`, `Windows`, `intprd` | `intprd` |

### Runner install (each app server)

1. GitHub → repo Settings → Actions → Runners → New self-hosted runner (Windows).
2. Run the configure script; add labels `intdev` or `intprd`.
3. Install the runner as a Windows Service that starts on boot (runner docs: `run.cmd` / service install). Prefer a deploy principal that can write the site root and restart `ClearanceTrackerApi`.
4. Repository **Variables**: `INTDEV_SITE_ROOT` / `INTPRD_SITE_ROOT` (optional; default `D:\inetpub\clearancetracker`).
5. Protect environment `intprd` with required reviewers.

Do **not** put SQL passwords or the service-account password in GitHub secrets if the self-hosted runner already has local `backend\.env` and the service logon configured.

## Security notes

- Prototype PIN login remains browser-only until SPRINT-008 (Entra). Publishing INTDEV without server auth is an accepted interim risk only if the owner records it; it does not satisfy G-SEC.
- API must stay on loopback. Do not set `API_LISTEN_HOST` to a public address.
- G-ARCH and G-SEC remain pending.
- Entra redirect URIs (later) must include `https://clearancetracker.cabq.gov/...` — tenant/client IDs stay TBD.
