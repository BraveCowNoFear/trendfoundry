$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "ops-$Stamp.log"

Push-Location $ProjectRoot
try {
  "[$(Get-Date -Format o)] TrendFoundry operate run started" | Tee-Object -FilePath $LogFile
  npm run operate 2>&1 | Tee-Object -FilePath $LogFile -Append
  "[$(Get-Date -Format o)] TrendFoundry operate run finished" | Tee-Object -FilePath $LogFile -Append
} finally {
  Pop-Location
}
