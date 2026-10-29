#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Creates the second INTDEV stack for PROD-branch / TRACKERAPP_PROD work.

.DESCRIPTION
  Parallel site so TEST (clearancetracker / :8741 / TRACKERAPP_TEST) and PROD
  (clearancetracker-prod / :8742 / TRACKERAPP_PROD) do not overwrite each other.
  Idempotent where practical. Does not invent SQL passwords; clones .env from the
  TEST site when present and patches port + database name only.

.PARAMETER SourceSiteRoot
  Existing TEST site to seed files from (default D:\inetpub\clearancetracker).

.PARAMETER ProdSiteRoot
  New PROD stack root (default D:\inetpub\clearancetracker-prod).

.PARAMETER HostHeader
  Host binding for the PROD IIS site.

.PARAMETER ApiPort
  Loopback port for the PROD API (default 8742).

.PARAMETER SqlDatabase
  SQL database name written into the PROD backend\.env.
#>
[CmdletBinding()]
param(
  [string]$SourceSiteRoot = "D:\inetpub\clearancetracker",
  [string]$ProdSiteRoot = "D:\inetpub\clearancetracker-prod",
  [string]$SiteName = "ClearanceTrackerProd",
  [string]$AppPoolName = "ClearanceTrackerProdAppPool",
  [string]$ServiceName = "ClearanceTrackerApiProd",
  [string]$DisplayName = "Clearance Tracker API (PROD stack)",
  [string]$HostHeader = "clearancetracker-prod.cabq.gov",
  [int]$HttpPort = 80,
  [int]$ApiPort = 8742,
  [string]$SqlDatabase = "TRACKERAPP_PROD",
  [string]$WebConfigSource = "",
  [string]$NodeExe = "",
  [string]$NssmExe = "C:\Tools\nssm\nssm.exe"
)

$ErrorActionPreference = "Stop"

Import-Module WebAdministration -ErrorAction Stop

if (-not (Test-Path -LiteralPath $SourceSiteRoot)) {
  throw "Source site not found: $SourceSiteRoot"
}

New-Item -ItemType Directory -Path $ProdSiteRoot -Force | Out-Null
$backendDest = Join-Path $ProdSiteRoot "backend"
New-Item -ItemType Directory -Path $backendDest -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $backendDest "logs") -Force | Out-Null

# Seed static + backend from the TEST site (preserve any existing PROD .env)
$envPath = Join-Path $backendDest ".env"
$envBackup = $null
if (Test-Path -LiteralPath $envPath) {
  $envBackup = Get-Content -LiteralPath $envPath -Raw
}

robocopy $SourceSiteRoot $ProdSiteRoot /E /NFL /NDL /NJH /NJS /nc /ns /np `
  /XD node_modules logs `
  /XF .env | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "robocopy site seed failed with exit $LASTEXITCODE"
}

if ($null -ne $envBackup) {
  Set-Content -LiteralPath $envPath -Value $envBackup -Encoding UTF8 -NoNewline
} else {
  $srcEnv = Join-Path $SourceSiteRoot "backend\.env"
  if (-not (Test-Path -LiteralPath $srcEnv)) {
    throw "No backend\.env on source or prod site. Create one before installing the PROD stack."
  }
  Copy-Item -LiteralPath $srcEnv -Destination $envPath -Force
}

# Patch port + database only; leave credentials untouched
$envText = Get-Content -LiteralPath $envPath -Raw
if ($envText -match "(?m)^API_LISTEN_PORT=") {
  $envText = [regex]::Replace($envText, "(?m)^API_LISTEN_PORT=.*$", "API_LISTEN_PORT=$ApiPort")
} else {
  $envText = $envText.TrimEnd() + "`r`nAPI_LISTEN_PORT=$ApiPort`r`n"
}
if ($envText -match "(?m)^SQL_DATABASE=") {
  $envText = [regex]::Replace($envText, "(?m)^SQL_DATABASE=.*$", "SQL_DATABASE=$SqlDatabase")
} else {
  $envText = $envText.TrimEnd() + "`r`nSQL_DATABASE=$SqlDatabase`r`n"
}
Set-Content -LiteralPath $envPath -Value $envText -Encoding UTF8 -NoNewline

# PROD web.config → :ApiPort
if (-not $WebConfigSource) {
  $candidate = Join-Path $PSScriptRoot "web.config.prod"
  if (Test-Path -LiteralPath $candidate) {
    $WebConfigSource = $candidate
  }
}
if ($WebConfigSource -and (Test-Path -LiteralPath $WebConfigSource)) {
  Copy-Item -LiteralPath $WebConfigSource -Destination (Join-Path $ProdSiteRoot "web.config") -Force
} else {
  $cfg = Get-Content -LiteralPath (Join-Path $SourceSiteRoot "web.config") -Raw
  $cfg = $cfg -replace "127\.0\.0\.1:8741", "127.0.0.1:$ApiPort"
  Set-Content -LiteralPath (Join-Path $ProdSiteRoot "web.config") -Value $cfg -Encoding UTF8
}

# App pool + site
if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
  New-WebAppPool -Name $AppPoolName | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value "AlwaysRunning"

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
  New-Website -Name $SiteName -PhysicalPath $ProdSiteRoot -ApplicationPool $AppPoolName -Port $HttpPort -HostHeader $HostHeader | Out-Null
} else {
  Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $ProdSiteRoot
  Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
}

$binding = Get-WebBinding -Name $SiteName -Protocol http -Port $HttpPort -HostHeader $HostHeader -ErrorAction SilentlyContinue
if (-not $binding) {
  New-WebBinding -Name $SiteName -Protocol http -Port $HttpPort -HostHeader $HostHeader | Out-Null
}

Start-Website -Name $SiteName -ErrorAction SilentlyContinue

# API service (LocalSystem — matches current INTDEV TEST stack when svc password unavailable)
if (-not $NodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $NodeExe = $cmd.Source }
}
if (-not $NodeExe -or -not (Test-Path -LiteralPath $NodeExe)) {
  throw "node.exe not found"
}
if (-not (Test-Path -LiteralPath $NssmExe)) {
  throw "NSSM not found at $NssmExe"
}

$entry = Join-Path $backendDest "src\index.js"
if (-not (Test-Path -LiteralPath $entry)) {
  throw "API entry not found: $entry"
}

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

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  & $NssmExe stop $ServiceName
  & $NssmExe remove $ServiceName confirm
}

& $NssmExe install $ServiceName $NodeExe $entry
& $NssmExe set $ServiceName AppDirectory $backendDest
& $NssmExe set $ServiceName DisplayName $DisplayName
& $NssmExe set $ServiceName Description "Clearance Tracker PROD-stack API (127.0.0.1:$ApiPort) behind IIS"
& $NssmExe set $ServiceName Start SERVICE_AUTO_START
& $NssmExe set $ServiceName AppStdout (Join-Path $backendDest "logs\api.out.log")
& $NssmExe set $ServiceName AppStderr (Join-Path $backendDest "logs\api.err.log")
& $NssmExe set $ServiceName AppRotateFiles 1
& $NssmExe set $ServiceName ObjectName LocalSystem

Start-Service -Name $ServiceName
Start-Sleep -Seconds 2

$health = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/health" -TimeoutSec 15
Write-Host ($health | ConvertTo-Json -Depth 6 -Compress)
Write-Host "PROD stack ready: site=$SiteName root=$ProdSiteRoot host=$HostHeader api=:$ApiPort db=$SqlDatabase"
