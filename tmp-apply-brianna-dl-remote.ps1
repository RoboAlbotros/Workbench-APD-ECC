$ErrorActionPreference = "Stop"
$mapPath = "C:\Users\Public\brianna-dl-dept-apply.json"
if (-not (Test-Path -LiteralPath $mapPath)) { throw "Missing $mapPath" }
Write-Output ("MAP_FILE_LEN=" + (Get-Item -LiteralPath $mapPath).Length)
$raw = Get-Content -LiteralPath $mapPath -Raw -Encoding UTF8
Write-Output ("MAP_RAW_LEN=" + $raw.Length)
Write-Output ("MAP_HEAD=" + $raw.Substring(0, [Math]::Min(120, $raw.Length)))

$parsed = $raw | ConvertFrom-Json
$rows = [System.Collections.Generic.List[object]]::new()
if ($parsed -is [System.Array]) {
  foreach ($item in $parsed) { [void]$rows.Add($item) }
} else {
  [void]$rows.Add($parsed)
}
Write-Output ("PARSED_ROWS=" + $rows.Count)

function Norm-Dl([string]$text) {
  if (-not $text) { return "" }
  return (($text.Trim()).ToUpperInvariant() -replace '\s+', '')
}

$dlToDept = @{}
foreach ($r in $rows) {
  $dl = Norm-Dl ([string]$r.dl)
  $dept = [string]$r.dept
  if (-not $dl -or -not $dept) { continue }
  $dlToDept[$dl] = $dept
}
Write-Output ("MAP_KEYS=" + $dlToDept.Count)
$sampleKeys = @($dlToDept.Keys | Select-Object -First 3)
Write-Output ("SAMPLE_KEYS=" + ($sampleKeys -join "; "))

$api = Invoke-RestMethod -Uri "http://127.0.0.1:8741/api/applicants" -TimeoutSec 90
$records = [System.Collections.Generic.List[object]]::new()
foreach ($rec in @($api.records)) { [void]$records.Add($rec) }
Write-Output ("API_BEFORE=" + $records.Count)

$changed = 0
$matched = 0
$same = 0
$samples = New-Object System.Collections.Generic.List[string]
$now = (Get-Date).ToUniversalTime().ToString("o")
foreach ($rec in $records) {
  $dl = Norm-Dl ([string]$rec.driversLicense)
  if (-not $dl) { continue }
  if (-not $dlToDept.ContainsKey($dl)) { continue }
  $matched++
  $dept = $dlToDept[$dl]
  $cur = [string]$rec.department
  if ($cur -eq $dept) { $same++; continue }
  $rec.department = $dept
  if ($rec.PSObject.Properties.Name -contains "updatedAt") { $rec.updatedAt = $now }
  if ($rec.PSObject.Properties.Name -contains "lastChangedBy") { $rec.lastChangedBy = "Brianna DL dept update" }
  $changed++
  if ($samples.Count -lt 8) {
    [void]$samples.Add(("$($rec.name) | $dl | '$cur' -> '$dept'"))
  }
}

Write-Output ("MATCHED_APPLICANTS=" + $matched)
Write-Output ("CHANGED=" + $changed)
Write-Output ("ALREADY_SAME=" + $same)
Write-Output "SAMPLES="
foreach ($s in $samples) { Write-Output ("  " + $s) }

$bodyObj = @{ records = $records.ToArray() }
$payload = $bodyObj | ConvertTo-Json -Depth 8 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
$resp = Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:8741/api/applicants" -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 300
Write-Output ("SAVED=" + $resp.saved)

$verify = Invoke-RestMethod -Uri "http://127.0.0.1:8741/api/applicants" -TimeoutSec 90
$apdNow = 0
$stillBlank = 0
foreach ($rec in @($verify.records)) {
  $dl = Norm-Dl ([string]$rec.driversLicense)
  if (-not $dl -or -not $dlToDept.ContainsKey($dl)) { continue }
  if ([string]$rec.department -eq $dlToDept[$dl]) { $apdNow++ }
  elseif (-not [string]$rec.department) { $stillBlank++ }
}
Write-Output ("VERIFY_MATCHED_WITH_TARGET_DEPT=" + $apdNow)
Write-Output ("VERIFY_MATCHED_STILL_BLANK=" + $stillBlank)
Remove-Item -LiteralPath $mapPath, "C:\Users\Public\apply-brianna-dl-remote.ps1" -Force -ErrorAction SilentlyContinue
