# Bulk-create OneDrive sharing links and fill oneDriveUrl in data/catalog.json
#
# Prerequisite: Microsoft.Graph.Files, Microsoft.Graph.Authentication modules installed,
# and Connect-MgGraph -Scopes "Files.ReadWrite" already run successfully (same session).
#
# Usage:
#   cd C:\doit\library-site
#   Connect-MgGraph -Scopes "Files.ReadWrite"
#   .\scripts\create-onedrive-links.ps1
#
# Sharing scope is "organization" (only signed-in users in the org can access).
# Results are written to data/onedrive-links.json (id -> url) as well as catalog.json
# (the catalog.json write is best-effort; if it fails due to a file lock, the
# onedrive-links.json file can be used to merge afterwards).

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $repoRoot "data\catalog.json"
$linksPath = Join-Path $repoRoot "data\onedrive-links.json"

# Local sync root of OneDrive (maps to drive root "/")
$oneDriveRoot = "F:\OneDrive - 세익엠이씨"

$catalog = Get-Content $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json

$links = @{}
$updated = 0
$skipped = 0
$failed = 0

foreach ($item in $catalog) {
    if (-not [string]::IsNullOrWhiteSpace($item.oneDriveUrl)) {
        $skipped++
        continue
    }

    $fullPath = $item.relativePath
    if (-not $fullPath.StartsWith($oneDriveRoot)) {
        Write-Warning ("Path outside OneDrive root, skipping: " + $fullPath)
        $skipped++
        continue
    }

    $relative = $fullPath.Substring($oneDriveRoot.Length).TrimStart('\') -replace '\\', '/'
    $encodedSegments = $relative.Split('/') | ForEach-Object { [Uri]::EscapeDataString($_) }
    $encodedPath = $encodedSegments -join '/'

    $uri = "https://graph.microsoft.com/v1.0/me/drive/root:/$encodedPath" + ":/createLink"
    $body = @{ type = "view"; scope = "organization" } | ConvertTo-Json

    try {
        $result = Invoke-MgGraphRequest -Method POST -Uri $uri -Body $body -ContentType "application/json"
        $item.oneDriveUrl = $result.link.webUrl
        $links[[string]$item.id] = $result.link.webUrl
        Write-Host ("[OK] " + $item.title + " -> " + $result.link.webUrl)
        $updated++
    } catch {
        Write-Warning ("[FAIL] " + $item.title + ": " + $_.Exception.Message)
        $failed++
    }
}

$links | ConvertTo-Json -Depth 10 | Set-Content -Path $linksPath -Encoding UTF8
Write-Host ("Wrote link map to " + $linksPath)

try {
    $catalog | ConvertTo-Json -Depth 10 | Set-Content -Path $catalogPath -Encoding UTF8
    Write-Host "catalog.json updated successfully"
} catch {
    Write-Warning ("Could not write catalog.json directly (" + $_.Exception.Message + "). Use onedrive-links.json to merge.")
}

Write-Host ""
Write-Host ("Done. Updated: " + $updated + ", Skipped: " + $skipped + ", Failed: " + $failed)
