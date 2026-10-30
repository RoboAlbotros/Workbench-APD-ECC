$ErrorActionPreference = "Stop"
$p = "C:\Users\E41646\AppData\Local\Temp\brianna-dl-dept-apply.json"
Write-Output ("LEN=" + (Get-Item -LiteralPath $p).Length)
$raw = Get-Content -LiteralPath $p -Raw -Encoding UTF8
$take = [Math]::Min(300, $raw.Length)
Write-Output ("HEAD=" + $raw.Substring(0, $take))
$j = $raw | ConvertFrom-Json
$arr = @($j)
Write-Output ("TYPE=" + $j.GetType().FullName)
Write-Output ("COUNT=" + $arr.Count)
if ($arr.Count -gt 0) {
  Write-Output ("FIRST_DL=" + [string]$arr[0].dl)
  Write-Output ("FIRST_DEPT=" + [string]$arr[0].dept)
  Write-Output ("LAST_DL=" + [string]$arr[$arr.Count - 1].dl)
}
# Check if it's a single object with nested structure
if ($arr.Count -eq 1) {
  Write-Output ("PROPS=" + (($arr[0].PSObject.Properties.Name) -join ","))
}
