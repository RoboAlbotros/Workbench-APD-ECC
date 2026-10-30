$ErrorActionPreference = "Stop"
$xlsx = "X:\COA SHARE\ECC\Brianna DL.xlsx"
if (-not (Test-Path -LiteralPath $xlsx)) { throw "Missing $xlsx" }

function Norm-Dl([string]$text) {
  return (($text.Trim()).ToUpperInvariant() -replace '\s+', '')
}

# Build DL -> dept map from file (no header; col1 dept, col2 DL)
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($xlsx)
$ws = $wb.Worksheets.Item(1)
$rows = $ws.UsedRange.Rows.Count
function Cell([int]$r, [int]$c) { return ([string]$ws.Cells.Item($r, $c).Text).Trim() }

$dlToDept = @{}
$fileValid = 0
$fileBlankDl = 0
for ($r = 1; $r -le $rows; $r++) {
  $dept = Cell $r 1
  $rawDl = Cell $r 2
  if ($dept -match '^[A-Za-z]{2}/' -and $rawDl -notmatch '^[A-Za-z]{2}/') {
    $tmp = $dept; $dept = $rawDl; $rawDl = $tmp
  }
  $dl = Norm-Dl $rawDl
  if (-not $dl) { if ($dept) { $fileBlankDl++ }; continue }
  if ($dl -notmatch '^[A-Z]{2}/[A-Z0-9]{1,15}$') { continue }
  if (-not $dept) { continue }
  $dlToDept[$dl] = $dept
  $fileValid++
}
$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
[GC]::Collect()

$mapPath = "C:\Users\E41646\AppData\Local\Temp\brianna-dl-dept-apply.json"
$dlToDept.GetEnumerator() | ForEach-Object {
  [pscustomobject]@{ dl = $_.Key; dept = $_.Value }
} | ConvertTo-Json -Depth 4 -Compress | Set-Content -LiteralPath $mapPath -Encoding UTF8
Write-Output ("FILE_VALID_DL_KEYS=" + $fileValid)
Write-Output ("FILE_BLANK_DL=" + $fileBlankDl)
Write-Output ("MAP_KEYS=" + $dlToDept.Count)
Write-Output ("MAP_JSON=" + $mapPath)
