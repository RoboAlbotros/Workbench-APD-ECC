#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Read-only inventory of IIS / Node / ARR on an app server (SPRINT-009 Phase 1).
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

Write-Host "=== Host ==="
Write-Host "ComputerName=$env:COMPUTERNAME"
Write-Host "User=$env:USERDOMAIN\$env:USERNAME"
Write-Host "Time=$(Get-Date -Format o)"

Write-Host "=== Node ==="
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  Write-Host "node=$($node.Source)"
  & node -v
} else {
  Write-Host "node=NOT_FOUND"
}

Write-Host "=== IIS ==="
try {
  Import-Module WebAdministration -ErrorAction Stop
  Get-Website | Select-Object Name, State, PhysicalPath, @{n="Bindings";e={ $_.Bindings.Collection.bindingInformation -join "," }} | Format-Table -AutoSize
  Get-WebAppPoolState | Format-Table -AutoSize
} catch {
  Write-Host "IIS module unavailable: $($_.Exception.Message)"
}

Write-Host "=== URL Rewrite / ARR ==="
$rewrite = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\IIS Extensions\URL Rewrite" -ErrorAction SilentlyContinue
$arr = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\IIS Extensions\Application Request Routing" -ErrorAction SilentlyContinue
Write-Host "UrlRewriteInstalled=$([bool]$rewrite)"
Write-Host "ArrInstalled=$([bool]$arr)"

Write-Host "=== ClearanceTracker service ==="
Get-Service -Name "ClearanceTrackerApi" -ErrorAction SilentlyContinue | Format-List Name, Status, StartType

Write-Host "=== Listening 8741 ==="
Get-NetTCPConnection -LocalPort 8741 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize
