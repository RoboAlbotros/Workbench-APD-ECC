$ErrorActionPreference = "Stop"
$sec = 'Security-&-Authentication'
$backup = 'Security-&-Authentication-pre-rebuild'
$out = 'C:\Users\E41646\AppData\Local\Temp\rebuild-security-out.txt'
$lines = New-Object System.Collections.Generic.List[string]

function Log([string]$msg) { [void]$lines.Add($msg); Write-Output $msg }

# Real Security work oldest→newest (skip checkpoint commits)
$picks = @(
  '6e33341',  # feat(ops): IIS INTDEV + GHA deploy [SPRINT-009]
  '7a5f15f',  # fix(ops): Windows PowerShell deploy workflows
  '8ac0e75',  # feat: activate Security and Authentication for Admin-Global
  '978e97c',  # feat: Authenticator, SQL, SSO settings for Admin-Global
  '90c95a7'   # feat: Admin-Global SAML configuration and Enable SSO
)

Log "STATUS_START=$(git status -sb)"
Log "MAIN=$(git log -1 --oneline main)"
Log "SEC_OLD=$(git log -1 --oneline $sec)"

# Stay on main; ensure clean enough to switch (untracked ok)
git checkout main
if ($LASTEXITCODE -ne 0) { throw "checkout main failed" }

# Backup old tip if backup branch missing
$backupExists = git show-ref --verify --quiet "refs/heads/$backup"
if ($LASTEXITCODE -ne 0) {
  git branch $backup $sec
  Log "BACKUP_CREATED=$backup -> $(git log -1 --oneline $backup)"
} else {
  Log "BACKUP_EXISTS=$backup -> $(git log -1 --oneline $backup)"
}

# Rebuild Security from main
git checkout -B $sec main
if ($LASTEXITCODE -ne 0) { throw "recreate $sec from main failed" }
Log "SEC_NOW=$(git log -1 --oneline HEAD)"

foreach ($c in $picks) {
  Log "CHERRY_PICK=$c $(git log -1 --oneline $c)"
  git cherry-pick $c
  if ($LASTEXITCODE -ne 0) {
    Log "CHERRY_PICK_CONFLICT=$c"
    git status --short | ForEach-Object { Log "  $_" }
    $lines | Set-Content -LiteralPath $out -Encoding UTF8
    throw "Cherry-pick conflict on $c - stopped for manual resolve"
  }
  Log "OK=$(git log -1 --oneline HEAD)"
}

Log "FINAL=$(git log -1 --oneline HEAD)"
Log "LOG_VS_MAIN="
git log --oneline main..HEAD | ForEach-Object { Log "  $_" }
Log "STATUS_END=$(git status -sb)"
$lines | Set-Content -LiteralPath $out -Encoding UTF8
Log "WROTE $out"
