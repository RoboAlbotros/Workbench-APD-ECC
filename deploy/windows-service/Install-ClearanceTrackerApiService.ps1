#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Installs the Clearance Tracker Node API as a Windows Service that starts on reboot.

.DESCRIPTION
  SPRINT-009. Uses NSSM when available (recommended). Falls back to documenting sc.exe
  if NSSM is missing. Service runs as COA\svc-clearancetracker so SQL Windows/NTLM
  auth can use that identity. Secrets stay in backend\.env on the server (gitignored).

.PARAMETER SiteRoot
  Deploy root containing backend\ (e.g. D:\inetpub\clearancetracker).

.PARAMETER ServiceName
  Windows service name.

.PARAMETER DisplayName
  Service display name.

.PARAMETER ServiceAccount
  Domain account, e.g. COA\svc-clearancetracker.

.PARAMETER ServiceAccountPassword
  Password for the service logon. Required for first install.

.PARAMETER NodeExe
  Full path to node.exe on the server.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SiteRoot,
  [string]$ServiceName = "ClearanceTrackerApi",
  [string]$DisplayName = "Clearance Tracker API",
  [string]$ServiceAccount = "COA\svc-clearancetracker",
  [Parameter(Mandatory = $true)]
  [SecureString]$ServiceAccountPassword,
  [string]$NodeExe = ""
)

$ErrorActionPreference = "Stop"

$backendDir = Join-Path $SiteRoot "backend"
$entry = Join-Path $backendDir "src\index.js"
if (-not (Test-Path -LiteralPath $entry)) {
  throw "API entry not found: $entry"
}

if (-not $NodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $NodeExe = $cmd.Source }
}
if (-not $NodeExe -or -not (Test-Path -LiteralPath $NodeExe)) {
  throw "node.exe not found. Install Node.js LTS on the server and re-run, or pass -NodeExe."
}

$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if (-not $nssm) {
  $candidates = @(
    "C:\Tools\nssm\nssm.exe",
    "C:\Program Files\nssm\nssm.exe",
    "${env:ProgramFiles(x86)}\nssm\nssm.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) {
      $nssm = @{ Source = $c }
      break
    }
  }
}

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ServiceAccountPassword)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $nssm) {
  Write-Error @"
NSSM was not found. Install NSSM (https://nssm.cc) into PATH or C:\Tools\nssm\, then re-run.

Manual alternative (not recommended): create a Scheduled Task at startup that runs:
  `"$NodeExe" `"$entry`"`
under $ServiceAccount with WorkingDirectory $backendDir.
"@
  exit 1
}

$nssmExe = $nssm.Source
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  & $nssmExe stop $ServiceName
  & $nssmExe remove $ServiceName confirm
}

& $nssmExe install $ServiceName $NodeExe $entry
& $nssmExe set $ServiceName AppDirectory $backendDir
& $nssmExe set $ServiceName DisplayName $DisplayName
& $nssmExe set $ServiceName Description "Clearance Tracker localhost API (127.0.0.1:8741) behind IIS"
& $nssmExe set $ServiceName Start SERVICE_AUTO_START
& $nssmExe set $ServiceName AppStdout (Join-Path $backendDir "logs\api.out.log")
& $nssmExe set $ServiceName AppStderr (Join-Path $backendDir "logs\api.err.log")
& $nssmExe set $ServiceName AppRotateFiles 1
& $nssmExe set $ServiceName ObjectName $ServiceAccount $plain

New-Item -ItemType Directory -Path (Join-Path $backendDir "logs") -Force | Out-Null

Start-Service -Name $ServiceName
Get-Service -Name $ServiceName | Format-List Name, Status, StartType

Write-Host "Service $ServiceName installed (Automatic). Confirm GET http://127.0.0.1:8741/health"
