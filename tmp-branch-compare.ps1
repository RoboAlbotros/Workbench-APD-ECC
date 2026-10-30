$ErrorActionPreference = "Continue"
$sec = 'Security-&-Authentication'
$out = 'C:\Users\E41646\AppData\Local\Temp\branch-compare-out.txt'
@(
  "MAIN=$(git log -1 --oneline main)"
  "SEC_LOCAL=$(git log -1 --oneline $sec)"
  "SEC_ORIGIN=$(git log -1 --oneline origin/$sec)"
  "COUNTS_LOCAL=$(git rev-list --left-right --count main...${sec})"
  "COUNTS_ORIGIN=$(git rev-list --left-right --count origin/main...origin/${sec})"
  "MERGE_BASE=$(git merge-base main $sec)"
  "---SEC_ONLY---"
  (git log --oneline "main..$sec")
  "---MAIN_ONLY_TOP20---"
  (git log --oneline "${sec}..main" | Select-Object -First 20)
) | Set-Content -LiteralPath $out -Encoding UTF8
Write-Output "WROTE $out"
Get-Content -LiteralPath $out
