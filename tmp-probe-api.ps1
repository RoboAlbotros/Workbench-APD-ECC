$ErrorActionPreference = "Continue"
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8741/health" -TimeoutSec 5
  Write-Output ("LOCAL_OK=" + ($h | ConvertTo-Json -Compress))
} catch {
  Write-Output ("LOCAL_FAIL=" + $_.Exception.Message)
}
try {
  $h2 = Invoke-RestMethod -Uri "http://localhost:8741/health" -TimeoutSec 5
  Write-Output ("LOCALHOST_OK")
} catch {
  Write-Output ("LOCALHOST_FAIL=" + $_.Exception.Message)
}
# Common INTDEV host patterns from prior work
foreach ($u in @(
  "http://intdev/api/applicants",
  "https://intdev/api/applicants",
  "http://clearancetracker/api/applicants"
)) {
  try {
    $r = Invoke-WebRequest -Uri $u -Method Head -TimeoutSec 5 -UseBasicParsing
    Write-Output ("HEAD_OK " + $u + " " + $r.StatusCode)
  } catch {
    Write-Output ("HEAD_FAIL " + $u + " " + $_.Exception.Message)
  }
}
