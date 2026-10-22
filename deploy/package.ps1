# Builds the single allskyfares.com app: the React site inside the Express API, zipped for Hostinger.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File deploy\package.ps1
# Output: deploy\out\allskyfares-app.zip (upload as app.zip to public_html, then start a Node.js build).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root "api"
$out = Join-Path $PSScriptRoot "out"
$stage = Join-Path $out "stage"

Push-Location $api
npm run build:web
if ($LASTEXITCODE -ne 0) { throw "Website build failed" }
npm test
if ($LASTEXITCODE -ne 0) { throw "API tests failed" }
Pop-Location

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force $stage | Out-Null
# Source only: no node_modules (Hostinger installs them), no .env files (variables live in hPanel), no tests.
foreach ($item in "package.json", "package-lock.json", "server.js", "pricing_rules.json", "src", "migrations", "scripts", "assets", "public") {
  Copy-Item (Join-Path $api $item) -Destination $stage -Recurse
}
$zip = Join-Path $out "allskyfares-app.zip"
# Not Compress-Archive: Windows PowerShell writes "\" in zip paths, which Hostinger's Linux unpacks as literal file names.
Push-Location $stage
tar.exe -a -cf $zip *
if ($LASTEXITCODE -ne 0) { throw "Zip failed" }
Pop-Location
Remove-Item $stage -Recurse -Force
Write-Host "Package ready: $zip ($([math]::Round((Get-Item $zip).Length / 1MB, 1)) MB)"
