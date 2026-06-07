$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "leads-$Stamp.log"

Push-Location $ProjectRoot
try {
  "[$(Get-Date -Format o)] TrendFoundry lead sync started" | Tee-Object -FilePath $LogFile
  npm run leads 2>&1 | Tee-Object -FilePath $LogFile -Append
  "[$(Get-Date -Format o)] TrendFoundry lead sync finished" | Tee-Object -FilePath $LogFile -Append
} finally {
  Pop-Location
}
