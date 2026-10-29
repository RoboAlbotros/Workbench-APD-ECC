#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Creates the IIS site, app pool, and bindings for Clearance Tracker on INTDEV/INTPRD.

.DESCRIPTION
  SPRINT-009. Idempotent where practical. Does not store passwords in the repo.
  Requires IIS with URL Rewrite and Application Request Routing (ARR) for /api proxy.

.PARAMETER SiteName
  IIS site name (default ClearanceTracker).

.PARAMETER PhysicalPath
  Site root that will contain index.html (CJISTracker content) and web.config.

.PARAMETER AppPoolName
  Application pool name.

.PARAMETER ServiceAccount
  Domain account for the app pool identity, e.g. COA\svc-clearancetracker.

.PARAMETER ServiceAccountPassword
  Password for the app pool identity. Prefer SecureString; omit to leave pool as ApplicationPoolIdentity.

.PARAMETER HostHeader
  Host binding, e.g. clearancetracker.cabq.gov.

.PARAMETER HttpPort
  HTTP port (default 80).

.PARAMETER HttpsPort
  HTTPS port (default 443). Set to 0 to skip HTTPS binding.

.PARAMETER CertificateThumbprint
  Optional cert thumbprint for HTTPS. If empty, HTTPS binding is skipped.
#>
[CmdletBinding()]
param(
  [string]$SiteName = "ClearanceTracker",
  [Parameter(Mandatory = $true)]
  [string]$PhysicalPath,
  [string]$AppPoolName = "ClearanceTrackerAppPool",
  [string]$ServiceAccount = "COA\svc-clearancetracker",
  [SecureString]$ServiceAccountPassword,
  [string]$HostHeader = "clearancetracker.cabq.gov",
  [int]$HttpPort = 80,
  [int]$HttpsPort = 443,
  [string]$CertificateThumbprint = ""
)

$ErrorActionPreference = "Stop"

Import-Module WebAdministration -ErrorAction Stop

if (-not (Test-Path -LiteralPath $PhysicalPath)) {
  New-Item -ItemType Directory -Path $PhysicalPath -Force | Out-Null
}

$repoWebConfig = Join-Path $PSScriptRoot "web.config"
if (Test-Path -LiteralPath $repoWebConfig) {
  Copy-Item -LiteralPath $repoWebConfig -Destination (Join-Path $PhysicalPath "web.config") -Force
}

if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
  New-WebAppPool -Name $AppPoolName | Out-Null
}

Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value "AlwaysRunning"

if ($ServiceAccountPassword) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ServiceAccountPassword)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.identityType -Value "SpecificUser"
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.userName -Value $ServiceAccount
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.password -Value $plain
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
} else {
  Write-Warning "No ServiceAccountPassword supplied; leaving app pool identity unchanged or ApplicationPoolIdentity."
}

if (-not (Test-Path "IIS:\Sites\$SiteName")) {
  New-Website -Name $SiteName -PhysicalPath $PhysicalPath -ApplicationPool $AppPoolName -Port $HttpPort -HostHeader $HostHeader | Out-Null
} else {
  Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $PhysicalPath
  Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
}

$httpBinding = "*:${HttpPort}:${HostHeader}"
$existing = Get-WebBinding -Name $SiteName -ErrorAction SilentlyContinue
if (-not ($existing | Where-Object { $_.bindingInformation -eq $httpBinding -and $_.protocol -eq "http" })) {
  New-WebBinding -Name $SiteName -Protocol http -Port $HttpPort -HostHeader $HostHeader
}

if ($HttpsPort -gt 0 -and $CertificateThumbprint) {
  $httpsBinding = "*:${HttpsPort}:${HostHeader}"
  if (-not ($existing | Where-Object { $_.bindingInformation -eq $httpsBinding -and $_.protocol -eq "https" })) {
    New-WebBinding -Name $SiteName -Protocol https -Port $HttpsPort -HostHeader $HostHeader
  }
  $bind = Get-WebBinding -Name $SiteName -Protocol https -Port $HttpsPort -HostHeader $HostHeader
  $bind.AddSslCertificate(($CertificateThumbprint -replace "\s", "").ToUpperInvariant(), "my")
}

# Enable ARR proxy at server level when the module is present
try {
  Set-WebConfigurationProperty -pspath "MACHINE/WEBROOT/APPHOST" -filter "system.webServer/proxy" -name "enabled" -value "True"
} catch {
  Write-Warning "Could not enable ARR proxy. Install Application Request Routing and URL Rewrite, then re-run."
}

Start-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
Start-Website -Name $SiteName -ErrorAction SilentlyContinue

Write-Host "IIS site '$SiteName' configured at $PhysicalPath host $HostHeader"
Write-Host "Ensure Node API Windows service is running on 127.0.0.1:8741"
