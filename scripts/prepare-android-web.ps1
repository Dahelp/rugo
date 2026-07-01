$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root 'www'
$rootPath = [System.IO.Path]::GetFullPath($root)
$wwwPath = [System.IO.Path]::GetFullPath($www)

if (-not $wwwPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to prepare Android assets outside project root: $wwwPath"
}

if (Test-Path $www) {
    Remove-Item -LiteralPath $www -Recurse -Force
}

New-Item -ItemType Directory -Path $www | Out-Null

Copy-Item -LiteralPath (Join-Path $root 'index.html') -Destination $www

foreach ($dir in @('assets', 'configs', 'src', 'vendor')) {
    Copy-Item -LiteralPath (Join-Path $root $dir) -Destination (Join-Path $www $dir) -Recurse
}

Write-Host "Prepared Android web assets in $www"
