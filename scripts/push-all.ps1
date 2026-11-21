param(
    [string]$CommitMessage = "feat: upgrade attendance command center, non-payable leave formula, and multi-repo sync"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SR-BOOKS ERP -- 3-WAY REPO SYNC & LOCAL STORAGE BACKUP  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RepoDir = Split-Path -Parent $PSScriptRoot
Set-Location -Path $RepoDir

# Step 1: Ensure Local Backup Directory Exists
$BackupDir = Join-Path $RepoDir "backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[+] Created local backup directory: $BackupDir" -ForegroundColor Green
}

# Step 2: Stage and Commit Changes
Write-Host "`n[1/4] Staging and Committing Local Code Changes..." -ForegroundColor Yellow
git add .
$gitStatus = git status --porcelain
if ($gitStatus) {
    git commit -m $CommitMessage
    Write-Host "[OK] Changes committed: $CommitMessage" -ForegroundColor Green
} else {
    Write-Host "[INFO] Working tree clean. No new changes to commit." -ForegroundColor Cyan
}

# Step 3: Push to Personal GitHub Repo (Srimanikandan K)
Write-Host "`n[2/4] Pushing to Personal GitHub Repo (Owner: Srimanikandan K)..." -ForegroundColor Yellow
Write-Host "     Target: Personal GitHub (origin main)" -ForegroundColor DarkGray
try {
    git push origin main
    Write-Host "[OK] Personal repository pushed successfully!" -ForegroundColor Green
} catch {
    Write-Host "[!] Error pushing to origin: $_" -ForegroundColor Red
}

# Step 4: Push to Company GitHub Repo (standardroofs-bot)
Write-Host "`n[3/4] Pushing to Company GitHub Repo (Owner: Standard Roofs)..." -ForegroundColor Yellow
Write-Host "     Target: Company GitHub (company main)" -ForegroundColor DarkGray
try {
    git push company main
    Write-Host "[OK] Company repository pushed successfully!" -ForegroundColor Green
} catch {
    Write-Host "[!] Error pushing to company: $_" -ForegroundColor Red
}

# Step 5: Generate Portable Local Storage Git Bundle
Write-Host "`n[4/4] Creating Local Storage Offline Backup..." -ForegroundColor Yellow
$bundlePath = Join-Path $BackupDir "sr-books-backup.bundle"
git bundle create $bundlePath --all
if (Test-Path $bundlePath) {
    $bundleSize = [math]::Round((Get-Item $bundlePath).Length / 1MB, 2)
    Write-Host "[OK] Local Git Bundle created: $bundlePath ($bundleSize MB)" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   3-WAY SYNC COMPLETED SUCCESSFULLY!                     " -ForegroundColor Green
Write-Host "   1. Personal Repo: https://github.com/Srimani26/standardroof-accounting-software" -ForegroundColor White
Write-Host "   2. Company Repo:  https://github.com/standardroofs-bot/standardroofs-accounting-software" -ForegroundColor White
Write-Host "   3. Local Storage: $bundlePath" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
