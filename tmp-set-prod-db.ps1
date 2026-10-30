$ErrorActionPreference = "Stop"
$envPath = "D:\inetpub\clearancetracker\backend\.env"
if (-not (Test-Path -LiteralPath $envPath)) { throw "Missing $envPath" }

$raw = Get-Content -LiteralPath $envPath -Raw -Encoding UTF8
$before = ([regex]::Match($raw, '(?m)^SQL_DATABASE=(.*)$')).Groups[1].Value.Trim()
Write-Output ("SQL_DATABASE_BEFORE=" + $before)

if ($raw -match '(?m)^SQL_DATABASE=') {
  $raw = [regex]::Replace($raw, '(?m)^SQL_DATABASE=.*$', 'SQL_DATABASE=TRACKERAPP_PROD')
} else {
  if (-not $raw.EndsWith("`n")) { $raw += "`r`n" }
  $raw += "SQL_DATABASE=TRACKERAPP_PROD`r`n"
}

# Backup then write
$bak = $envPath + ".bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Copy-Item -LiteralPath $envPath -Destination $bak -Force
Set-Content -LiteralPath $envPath -Value $raw -Encoding UTF8 -NoNewline
$after = ([regex]::Match((Get-Content -LiteralPath $envPath -Raw -Encoding UTF8), '(?m)^SQL_DATABASE=(.*)$')).Groups[1].Value.Trim()
Write-Output ("SQL_DATABASE_AFTER=" + $after)
Write-Output ("BACKUP=" + $bak)

# Restart API service if present
$svcNames = @("ClearanceTrackerApi", "clearancetrackerapi")
$restarted = $false
foreach ($name in $svcNames) {
  $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($svc) {
    Restart-Service -Name $name -Force
    Start-Sleep -Seconds 2
    $svc2 = Get-Service -Name $name
    Write-Output ("SERVICE=" + $svc2.Name + " STATUS=" + $svc2.Status)
    $restarted = $true
    break
  }
}
if (-not $restarted) {
  Write-Output "SERVICE=not-found-try-nssm"
  $nssm = "C:\Tools\nssm\nssm.exe"
  if (Test-Path -LiteralPath $nssm) {
    & $nssm restart ClearanceTrackerApi
    Write-Output ("NSSM_EXIT=" + $LASTEXITCODE)
  }
}

# Health check
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8741/health" -TimeoutSec 15
  Write-Output ("HEALTH=" + ($h | ConvertTo-Json -Compress -Depth 6))
} catch {
  Write-Output ("HEALTH_FAIL=" + $_.Exception.Message)
}
