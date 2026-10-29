# Clearance Tracker — IIS hosting (INTDEV / INTPRD)

Status: SPRINT-009 INTDEV site and runner applied 2026-10-22; identity, SQL, and DNS still open
Owner: Brett (technical / operations)
Hosts: `DTIAPPSINTDEV` (develop), `DTIAPPSINTPRD` (main)
Public hostname (INTDEV): `clearancetracker.cabq.gov`
Service account: `COA\svc-clearancetracker`

## INTDEV apply (2026-10-22)

Applied on `DTIAPPSINTDEV` (`10.5.16.108`):

- Site `ClearanceTracker` at `D:\inetpub\clearancetracker`, started, binding `http *:80:clearancetracker.cabq.gov`.
- App pool `ClearanceTrackerAppPool` runs as `ApplicationPoolIdentity` (service-account password was not available).
- `ClearanceTrackerApi` is Automatic and running as `LocalSystem`. Node v22.23.2. NSSM is `C:\Tools\nssm\nssm.exe`.
- `GET /` and `GET /health` return HTTP 200 through IIS when the host header is `clearancetracker.cabq.gov`. Health is degraded because `backend\.env` still has placeholder SQL values.
- `COA\svc-clearancetracker` has Modify on the site root. Re-run the install scripts with that password to switch the service and app pool.
- `clearancetracker.cabq.gov` does not resolve. No HTTPS binding.
- GitHub runner `DTIAPPSINTDEV` is online with labels `self-hosted`, `Windows`, `X64`, `intdev`. Service `actions.runner.RoboAlbotros-Workbench-APD-ECC.DTIAPPSINTDEV` runs as `NT AUTHORITY\SYSTEM` from `D:\actions-runner\intdev`. Repository variable `INTDEV_SITE_ROOT` is `D:\inetpub\clearancetracker`. Environment `intdev` exists.

## Architecture

- **IIS** serves `CJISTracker/` static files and reverse-proxies `/api/*` and `/health` to the Node API via ARR + URL Rewrite ([deploy/iis/web.config](../../deploy/iis/web.config)).
- **Node API** (`backend/`) listens on loopback only and runs as a Windows Service (Automatic).
- **Secrets** live only in `backend\.env` on the server (never in git or workflow YAML).

### Dual INTDEV stacks (TEST vs PROD)

INTDEV hosts two independent stacks so TEST and PROD work do not overwrite each other:

| Stack | Site root | IIS site | Host header | API service | Port | SQL database | Deploy branch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TEST | `D:\inetpub\clearancetracker` | `ClearanceTracker` | `clearancetracker.cabq.gov` | `ClearanceTrackerApi` | 8741 | `TRACKERAPP_TEST` | `develop` / manual |
| PROD | `D:\inetpub\clearancetracker-prod` | `ClearanceTrackerProd` | `clearancetracker-prod.cabq.gov` | `ClearanceTrackerApiProd` | 8742 | `TRACKERAPP_PROD` | `Security-&-Authentication` |

One-time PROD stack create (admin on `DTIAPPSINTDEV`):

```powershell
.\deploy\iis\Install-ClearanceTrackerProdStack.ps1
```

Optional GitHub variable: `INTDEV_PROD_SITE_ROOT` = `D:\inetpub\clearancetracker-prod`. Add a hosts-file (or DNS) entry for `clearancetracker-prod.cabq.gov` → `10.5.16.108` the same way as the TEST hostname.

```text
Browser → http://clearancetracker.cabq.gov
       → IIS static + ARR → 127.0.0.1:8741 → TRACKERAPP_TEST

Browser → http://clearancetracker-prod.cabq.gov
       → IIS static + ARR → 127.0.0.1:8742 → TRACKERAPP_PROD
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
| `develop` | [.github/workflows/deploy-intdev.yml](../../.github/workflows/deploy-intdev.yml) | `self-hosted`, `Windows`, `intdev` | `intdev` (TEST stack) |
| `Security-&-Authentication` | [.github/workflows/deploy-intdev-prod.yml](../../.github/workflows/deploy-intdev-prod.yml) | `self-hosted`, `Windows`, `intdev` | `intdev` (PROD stack) |
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
