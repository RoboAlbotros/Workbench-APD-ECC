$ErrorActionPreference = "Stop"
$xlsx = "C:\Users\E41646\Documents\DTI - In House Tools\Development\CJISTracker\Import Seed Files\No PII - AH.xlsx"
$outJson = "C:\Users\E41646\AppData\Local\Temp\ah-seed-import.json"
if (-not (Test-Path -LiteralPath $xlsx)) { throw "Missing $xlsx" }

function To-IsoDate([string]$text) {
  $t = $text.Trim()
  if (-not $t) { return "" }
  if ($t -match '^(\d{4})-(\d{2})-(\d{2})') { return $Matches[0] }
  $dt = [datetime]::MinValue
  if ([datetime]::TryParse($t, [ref]$dt)) { return $dt.ToString("yyyy-MM-dd") }
  return ""
}
function Norm-Dl([string]$text) {
  $t = ($text.Trim()).ToUpperInvariant()
  if (-not $t) { return "" }
  if ($t -match '^[A-Z]{2}/[A-Z0-9]{1,15}$') { return $t }
  return ""
}
function Norm-Iii([string]$text) {
  $t = $text.Trim()
  if (-not $t) { return "" }
  switch -Regex ($t.ToLowerInvariant()) {
    '^(clear|c;ear)$' { return "Clear" }
    '^(felony|review needed)$' { return "Felony" }
    '^(misd/?\s*clear|misd|misdemeanor)$' { return "Misd/Clear" }
    default { return $t }
  }
}
function Norm-Clearance([string]$text) {
  $t = $text.Trim()
  if (-not $t) { return "" }
  switch -Regex ($t.ToLowerInvariant()) {
    '^(full clearance|full clearnace|full)$' { return "Full Clearance" }
    '^(one time visit)$' { return "One Time Visit" }
    '^(in-?progress|in process)$' { return "InProgress" }
    '^(no access given)$' { return "No Access Given" }
    default { return $t }
  }
}
function Norm-Outcome([string]$text) {
  $t = $text.Trim()
  if (-not $t) { return "" }
  switch -Regex ($t.ToLowerInvariant()) {
    '^(clear|clera|approved)$' { return "Clear" }
    '^(felony|denied|unauthorized)$' { return "Felony" }
    '^(misd/?\s*clear)$' { return "Misd/Clear" }
    default { if ($t -match 'clear') { return "Clear" }; return $t }
  }
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($xlsx)
$ws = $wb.Worksheets.Item(1)
$rows = $ws.UsedRange.Rows.Count
$cols = $ws.UsedRange.Columns.Count
function Cell([int]$r, [int]$c) { return ([string]$ws.Cells.Item($r, $c).Text).Trim() }

$records = New-Object System.Collections.Generic.List[object]
$dlKept = 0; $dlBlank = 0; $deptFilled = 0
for ($r = 2; $r -le $rows; $r++) {
  $any = $false
  for ($c = 1; $c -le $cols; $c++) { if ((Cell $r $c) -ne "") { $any = $true; break } }
  if (-not $any) { continue }
  $last = Cell $r 1
  $first = Cell $r 2
  if (-not $last -and -not $first) { continue }
  $dl = Norm-Dl (Cell $r 10)
  if ($dl) { $dlKept++ } else { $dlBlank++ }
  $dept = Cell $r 7
  if ($dept) { $deptFilled++ }
  $mi = Cell $r 3
  if ($mi.Length -gt 1) { $mi = $mi.Substring(0, 1) }
  $aka = Cell $r 5
  $comments = Cell $r 23
  $notesText = (@($aka, $comments) | Where-Object { $_ }) -join " | "
  $src = Cell $r 24
  if (-not $src) { $src = "Ashley H" }
  $rec = [ordered]@{
    id                            = [guid]::NewGuid().ToString()
    lastName                      = $last.ToUpperInvariant()
    firstName                     = $first.ToUpperInvariant()
    middleInitial                 = $mi.ToUpperInvariant()
    suffix                        = (Cell $r 4).ToUpperInvariant()
    vendor                        = (Cell $r 6).ToUpperInvariant()
    department                    = $dept
    positionRole                  = (Cell $r 8).ToUpperInvariant()
    dateOfIiiCompletion           = To-IsoDate (Cell $r 9)
    driversLicense                = $dl
    iiiStatus                     = Norm-Iii (Cell $r 11)
    clearanceType                 = Norm-Clearance (Cell $r 12)
    fingerprintsNotifiedCompleted = To-IsoDate (Cell $r 13)
    outcome                       = Norm-Outcome (Cell $r 14)
    securityAwarenessExpiration   = To-IsoDate (Cell $r 15)
    securityAddendum              = To-IsoDate (Cell $r 16)
    ncicCertificationExpiration   = To-IsoDate (Cell $r 17)
    phoneNumber                   = Cell $r 18
    completedFullProcess          = To-IsoDate (Cell $r 19)
    dateOfSiteVisitOnly           = To-IsoDate (Cell $r 20)
    queriedEveryFiveYears         = To-IsoDate (Cell $r 21)
    emailAddress                  = (Cell $r 22).ToUpperInvariant()
    notes                         = $notesText
    source                        = $src
    requestor                     = "AH IMPORT"
    lastChangedBy                 = "AH seed import"
    archived                      = $false
    documents                     = @()
    updatedAt                     = (Get-Date).ToUniversalTime().ToString("o")
  }
  $records.Add([pscustomobject]$rec) | Out-Null
}
$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
[GC]::Collect()

@{ records = $records } | ConvertTo-Json -Depth 6 -Compress | Set-Content -LiteralPath $outJson -Encoding UTF8
Write-Output ("COUNT=" + $records.Count)
Write-Output ("DL_KEPT=" + $dlKept)
Write-Output ("DL_BLANK=" + $dlBlank)
Write-Output ("DEPT_FILLED=" + $deptFilled)
Write-Output ("JSON=" + $outJson)
Write-Output ("BYTES=" + (Get-Item $outJson).Length)
