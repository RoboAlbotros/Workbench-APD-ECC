$ErrorActionPreference = "Stop"
$paths = @(
  "D:\inetpub\clearancetracker\app.js",
  "D:\inetpub\clearancetracker\index.html"
)
foreach ($p in $paths) {
  Write-Output ("EXISTS_" + $p + "=" + (Test-Path -LiteralPath $p))
}
Select-String -Path "D:\inetpub\clearancetracker\app.js" -Pattern "E41718|James Gray|jg-admin-9383|seed-james-gray" |
  Select-Object -First 20 |
  ForEach-Object { "{0}:{1}" -f $_.LineNumber, $_.Line.Trim() }
Write-Output "---HTML---"
Select-String -Path "D:\inetpub\clearancetracker\index.html" -Pattern "app\.js\?v=" |
  ForEach-Object { "{0}:{1}" -f $_.LineNumber, $_.Line.Trim() }
