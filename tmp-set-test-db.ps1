$ErrorActionPreference = "Stop"
$envPath = "D:\inetpub\clearancetracker\backend\.env"
if (-not (Test-Path -LiteralPath $envPath)) { throw "Missing $envPath" }

$raw = Get-Content -LiteralPath $envPath -Raw -Encoding UTF8
$before = ([regex]::Match($raw, '(?m)^SQL_DATABASE=(.*)$')).Groups[1].Value.Trim()
Write-Output ("SQL_DATABASE_BEFORE=" + $before)

if ($raw -match '(?m)^SQL_DATABASE=') {
  $raw = [regex]::Replace($raw, '(?m)^SQL_DATABASE=.*$', 'SQL_DATABASE=TRACKERAPP_TEST')
} else {
  if (-not $raw.EndsWith("`n")) { $raw += "`r`n" }
  $raw += "SQL_DATABASE=TRACKERAPP_TEST`r`n"
}

$bak = $envPath + ".bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Copy-Item -LiteralPath $envPath -Destination $bak -Force
Set-Content -LiteralPath $envPath -Value $raw -Encoding UTF8 -NoNewline
$after = ([regex]::Match((Get-Content -LiteralPath $envPath -Raw -Encoding UTF8), '(?m)^SQL_DATABASE=(.*)$')).Groups[1].Value.Trim()
Write-Output ("SQL_DATABASE_AFTER=" + $after)
Write-Output ("BACKUP=" + $bak)

$svc = Get-Service -Name "ClearanceTrackerApi" -ErrorAction SilentlyContinue
if ($svc) {
  Restart-Service -Name "ClearanceTrackerApi" -Force
  Start-Sleep -Seconds 2
  Write-Output ("SERVICE=" + (Get-Service -Name "ClearanceTrackerApi").Status)
} else {
  Write-Output "SERVICE=not-found"
}

try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8741/health" -TimeoutSec 15
  Write-Output ("HEALTH_DB=" + $h.database.name + " CONNECTED=" + $h.database.connected)
} catch {
  Write-Output ("HEALTH_FAIL=" + $_.Exception.Message)
}
