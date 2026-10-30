$ErrorActionPreference = "Stop"
$mapLocal = "C:\Users\E41646\AppData\Local\Temp\brianna-dl-dept-apply.json"
$remoteScriptLocal = "C:\Users\E41646\Documents\DTI - In House Tools\Development\tmp-apply-brianna-dl-remote.ps1"
if (-not (Test-Path -LiteralPath $mapLocal)) { throw "Missing map $mapLocal" }
if (-not (Test-Path -LiteralPath $remoteScriptLocal)) { throw "Missing remote script" }

Write-Output ("LOCAL_MAP_LEN=" + (Get-Item -LiteralPath $mapLocal).Length)
& scp -q $mapLocal "intdev:C:/Users/Public/brianna-dl-dept-apply.json"
if ($LASTEXITCODE -ne 0) { throw "scp map failed: $LASTEXITCODE" }
& scp -q $remoteScriptLocal "intdev:C:/Users/Public/apply-brianna-dl-remote.ps1"
if ($LASTEXITCODE -ne 0) { throw "scp script failed: $LASTEXITCODE" }

# Confirm remote file size before apply
& ssh intdev "powershell -NoProfile -Command \"(Get-Item 'C:\Users\Public\brianna-dl-dept-apply.json').Length\""
if ($LASTEXITCODE -ne 0) { throw "remote size check failed: $LASTEXITCODE" }

& ssh intdev "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Public\apply-brianna-dl-remote.ps1"
if ($LASTEXITCODE -ne 0) { throw "remote apply failed: $LASTEXITCODE" }
