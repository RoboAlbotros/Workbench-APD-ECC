$ErrorActionPreference = "Stop"
$path = "D:\inetpub\clearancetracker\app.js"
$html = "D:\inetpub\clearancetracker\index.html"
Write-Output ("APP_EXISTS=" + (Test-Path $path))
Write-Output ("HTML_EXISTS=" + (Test-Path $html))
Select-String -Path $path -Pattern "adminStaff|normalizeManagedUserType|randomUUID|canAccessAdminConsole|managedUserRole" |
  Select-Object -First 40 |
  ForEach-Object { "{0}:{1}" -f $_.LineNumber, $_.Line.Trim() }
Write-Output "---HTML---"
Select-String -Path $html -Pattern "adminStaff|newManagedUserType|managementAccessLevel" |
  Select-Object -First 20 |
  ForEach-Object { "{0}:{1}" -f $_.LineNumber, $_.Line.Trim() }
Write-Output "---CACHEBUST---"
Select-String -Path $html -Pattern "app\.js" |
  ForEach-Object { "{0}:{1}" -f $_.LineNumber, $_.Line.Trim() }
