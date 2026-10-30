$ErrorActionPreference = "Stop"
$sec = 'Security-&-Authentication'
$backup = 'Security-&-Authentication-pre-rebuild'
$out = 'C:\Users\E41646\AppData\Local\Temp\rebuild-security-merge.txt'
$lines = New-Object System.Collections.Generic.List[string]
function Log([string]$msg) { [void]$lines.Add($msg); Write-Output $msg }

# Abort in-progress cherry-pick if any
git cherry-pick --abort 2>$null

git checkout -B $sec main
if ($LASTEXITCODE -ne 0) { throw "reset $sec to main failed" }
Log "BASE=$(git log -1 --oneline HEAD)"
Log "BACKUP=$(git log -1 --oneline $backup)"

git merge --no-edit $backup
$code = $LASTEXITCODE
if ($code -eq 0) {
  Log "MERGE_CLEAN=$(git log -1 --oneline HEAD)"
} else {
  Log "MERGE_CONFLICTS="
  git diff --name-only --diff-filter=U | ForEach-Object { Log "  $_" }
}
$lines | Set-Content -LiteralPath $out -Encoding UTF8
if ($code -ne 0) { exit 2 }
exit 0
