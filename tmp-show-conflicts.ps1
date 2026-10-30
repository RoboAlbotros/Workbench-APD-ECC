$ErrorActionPreference = "Stop"
$files = @(
  'backend/.env.example',
  'docs/planning/future-considerations.md',
  'project.json',
  'CJISTracker/index.html'
)
foreach ($f in $files) {
  Write-Output "===== $f ====="
  $i = 0
  Get-Content -LiteralPath $f | ForEach-Object {
    $i++
    if ($_ -match '^(<<<<<<<|=======|>>>>>>>)' -or ($i -gt 0 -and $script:near)) {
      # print conflict blocks with context via simple state machine
    }
  }
  # Print lines around markers
  $lines = Get-Content -LiteralPath $f
  for ($n = 0; $n -lt $lines.Count; $n++) {
    if ($lines[$n] -match '^<<<<<<<') {
      $start = [Math]::Max(0, $n - 2)
      $end = [Math]::Min($lines.Count - 1, $n + 80)
      for ($k = $start; $k -le $end; $k++) {
        Write-Output ("{0,5}|{1}" -f ($k + 1), $lines[$k])
        if ($lines[$k] -match '^>>>>>>>' -and $k -gt $n) { break }
      }
      Write-Output "-----"
    }
  }
}
# app.js: only list marker line numbers and short snippets
Write-Output "===== CJISTracker/app.js markers ====="
$lines = Get-Content -LiteralPath 'CJISTracker/app.js'
for ($n = 0; $n -lt $lines.Count; $n++) {
  if ($lines[$n] -match '^(<<<<<<<|=======|>>>>>>>)') {
    Write-Output ("{0}:{1}" -f ($n + 1), $lines[$n])
  }
}
