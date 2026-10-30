$ErrorActionPreference = "Stop"
& scp -q "C:\Users\E41646\Documents\DTI - In House Tools\Development\tmp-check-james.ps1" "intdev:C:/Users/Public/tmp-check-james.ps1"
if ($LASTEXITCODE -ne 0) { throw "scp failed: $LASTEXITCODE" }
& ssh intdev "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Public\tmp-check-james.ps1"
& ssh intdev "powershell -NoProfile -Command \"Remove-Item -LiteralPath 'C:\Users\Public\tmp-check-james.ps1' -Force -ErrorAction SilentlyContinue\""
