<#
.SYNOPSIS
  Local Storage Backup Engine for SR-Books ERP.
  Creates complete Git bundles and source archives in local storage.
#>

$RepoDir = Split-Path -Parent $PSScriptRoot
Set-Location -Path $RepoDir

$BackupDir = Join-Path $RepoDir "backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundlePath = Join-Path $BackupDir "sr-books-backup-$timestamp.bundle"
$latestBundle = Join-Path $BackupDir "sr-books-backup-latest.bundle"

Write-Host "Creating full git bundle..." -ForegroundColor Cyan
git bundle create $bundlePath --all
Copy-Item -Path $bundlePath -Destination $latestBundle -Force

Write-Host "Local storage git bundle saved to: $bundlePath" -ForegroundColor Green
Write-Host "Latest pointer updated at: $latestBundle" -ForegroundColor Green
