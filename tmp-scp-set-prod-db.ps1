$ErrorActionPreference = "Stop"
$local = "C:\Users\E41646\Documents\DTI - In House Tools\Development\tmp-set-prod-db.ps1"
& scp -q $local "intdev:C:/Users/Public/tmp-set-prod-db.ps1"
if ($LASTEXITCODE -ne 0) { throw "scp failed: $LASTEXITCODE" }
& ssh intdev "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Public\tmp-set-prod-db.ps1"
$code = $LASTEXITCODE
& ssh intdev "powershell -NoProfile -Command \"Remove-Item -LiteralPath 'C:\Users\Public\tmp-set-prod-db.ps1' -Force -ErrorAction SilentlyContinue\""
if ($code -ne 0) { throw "remote set-prod-db failed: $code" }
