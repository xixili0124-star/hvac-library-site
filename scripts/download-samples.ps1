# Download representative PDFs via Microsoft Graph (works even if OneDrive
# files are cloud-only placeholders locally) into a temp folder for text extraction.
#
# Usage:
#   cd C:\doit\library-site
#   Connect-MgGraph -Scopes "Files.Read"
#   .\scripts\download-samples.ps1

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$listPath = Join-Path $repoRoot "data\download-list.json"
$outDir = Join-Path $repoRoot "tmp\samples"

$oneDriveRoot = "F:\OneDrive - 세익엠이씨"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$content = Get-Content -Path $listPath -Raw -Encoding UTF8
$content = $content.TrimStart([char]0xFEFF)
$list = $content | ConvertFrom-Json

foreach ($item in $list) {
    $fullPath = $item.samplePath
    $relative = $fullPath.Substring($oneDriveRoot.Length).TrimStart('\') -replace '\\', '/'
    $encodedSegments = $relative.Split('/') | ForEach-Object { [Uri]::EscapeDataString($_) }
    $encodedPath = $encodedSegments -join '/'

    $uri = "https://graph.microsoft.com/v1.0/me/drive/root:/$encodedPath" + ":/content"
    $outFile = Join-Path $outDir ($item.id.ToString() + ".pdf")

    if (Test-Path $outFile) {
        Write-Host ("[SKIP] " + $item.id + " " + $item.title)
        continue
    }

    try {
        Invoke-MgGraphRequest -Method GET -Uri $uri -OutputFilePath $outFile
        $size = (Get-Item $outFile).Length
        Write-Host ("[OK] " + $item.id + " " + $item.title + " (" + [math]::Round($size/1MB,1) + "MB)")
    } catch {
        Write-Warning ("[FAIL] " + $item.id + " " + $item.title + ": " + $_.Exception.Message)
    }
}
