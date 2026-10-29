#Requires -Version 5.1
<#
.SYNOPSIS
  Syncs CJISTracker static files and backend sources into the IIS site root, then restarts the API service.

.DESCRIPTION
  Used by GitHub Actions self-hosted runners on DTIAPPSINTDEV / DTIAPPSINTPRD (SPRINT-009).
  Does not copy .env or node_modules from the workspace; runs npm ci on the server when package-lock exists.
  Does not print secrets.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot,
  [Parameter(Mandatory = $true)]
  [string]$SiteRoot,
  [string]$ServiceName = "ClearanceTrackerApi",
  [switch]$SkipNpmCi,
  [switch]$SkipServiceRestart
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$staticSrc = Join-Path $repoRoot "CJISTracker"
$backendSrc = Join-Path $repoRoot "backend"
$webConfigSrc = Join-Path $repoRoot "deploy\iis\web.config"

if (-not (Test-Path -LiteralPath $staticSrc)) { throw "Missing $staticSrc" }
if (-not (Test-Path -LiteralPath $backendSrc)) { throw "Missing $backendSrc" }

$staticDest = $SiteRoot
$backendDest = Join-Path $SiteRoot "backend"

New-Item -ItemType Directory -Path $staticDest -Force | Out-Null
New-Item -ItemType Directory -Path $backendDest -Force | Out-Null

# Preserve server-only .env
$envBackup = $null
$envPath = Join-Path $backendDest ".env"
if (Test-Path -LiteralPath $envPath) {
  $envBackup = Get-Content -LiteralPath $envPath -Raw
}

Get-ChildItem -LiteralPath $staticSrc -File | Where-Object {
  $_.Name -notin @("database-schema.sql", "database-data-migration.sql") -and
  $_.Extension -ne ".sql"
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $staticDest $_.Name) -Force
}

# Copy common static assets / folders if present
foreach ($name in @("assets", "images", "fonts")) {
  $p = Join-Path $staticSrc $name
  if (Test-Path -LiteralPath $p) {
    Copy-Item -LiteralPath $p -Destination (Join-Path $staticDest $name) -Recurse -Force
  }
}

if (Test-Path -LiteralPath $webConfigSrc) {
  Copy-Item -LiteralPath $webConfigSrc -Destination (Join-Path $staticDest "web.config") -Force
}

# Sync backend (exclude node_modules, .env, logs)
robocopy $backendSrc $backendDest /MIR /NFL /NDL /NJH /NJS /nc /ns /np `
  /XD node_modules .env logs `
  /XF .env | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit $LASTEXITCODE"
}

if ($null -ne $envBackup) {
  Set-Content -LiteralPath $envPath -Value $envBackup -Encoding UTF8 -NoNewline
} elseif (-not (Test-Path -LiteralPath $envPath)) {
  Write-Warning "No backend\.env on the server. Copy from .env.example and set SQL values before the API can connect."
}

if (-not $SkipNpmCi) {
  Push-Location $backendDest
  try {
    if (Test-Path -LiteralPath "package-lock.json") {
      npm ci --omit=dev
    } else {
      npm install --omit=dev
    }
  } finally {
    Pop-Location
  }
}

if (-not $SkipServiceRestart) {
  $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($svc) {
    Restart-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2
    $svc.Refresh()
    if ($svc.Status -ne "Running") {
      throw "Service $ServiceName is $($svc.Status) after restart"
    }
  } else {
    Write-Warning "Service $ServiceName not found. Install with deploy\windows-service\Install-ClearanceTrackerApiService.ps1"
  }
}

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8741/health" -TimeoutSec 10
  Write-Host ("health listen={0} sql.configured={1} sql.connected={2}" -f `
    $health.listen, $health.database.configured, $health.database.connected)
} catch {
  Write-Warning "Health check failed: $($_.Exception.Message)"
}

Write-Host "Publish complete to $SiteRoot"
