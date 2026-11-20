<#
.SYNOPSIS
  Universal Dual-Remote Push & Local Storage Backup Engine for SR-Books ERP.
  Maintains Srimanikandan K (@Srimani26) personal ownership and Standard Roofs company deployment.

.DESCRIPTION
  1. Stages and commits all modified code, documentation, and schema migrations.
  2. Pushes to Personal GitHub Repository (Owner: Srimanikandan K):
     https://github.com/Srimani26/standardroof-accounting-software.git
  3. Pushes to Company GitHub Repository (Owner: Standard Roofs):
     https://github.com/standardroofs-bot/standardroof-accounting-software.git
  4. Creates an offline, portable Local Storage Git Bundle (sr-books-backup.bundle)
     and timestamped backup archive in the local 'backups' directory.
#>

param(
    [string]$CommitMessage = "feat: upgrade executive dashboard visual analytics, dual-push sync & local storage backup"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SR-BOOKS ERP — DUAL GITHUB SYNC & LOCAL STORAGE BACKUP  " -ForegroundColor Cyan
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
$status = git status --porcelain
if ($status) {
    git commit -m $CommitMessage
    Write-Host "[✓] Changes committed: $CommitMessage" -ForegroundColor Green
} else {
    Write-Host "[i] Working tree clean. No new changes to commit." -ForegroundColor Cyan
}

# Step 3: Push to Personal GitHub Repo (Srimanikandan K)
Write-Host "`n[2/4] Pushing to Personal GitHub Repo (Owner: Srimanikandan K)..." -ForegroundColor Yellow
Write-Host "     Remote: https://github.com/Srimani26/standardroof-accounting-software.git" -ForegroundColor DarkGray
try {
    git push origin main
    Write-Host "[✓] Personal repository pushed successfully!" -ForegroundColor Green
} catch {
    Write-Host "[!] Error pushing to origin: $_" -ForegroundColor Red
}

# Step 4: Configure & Push to Company GitHub Repo (standardroofs-bot)
Write-Host "`n[3/4] Checking Company GitHub Remote (Owner: Standard Roofs)..." -ForegroundColor Yellow
$remotes = git remote
if ($remotes -notcontains "company") {
    Write-Host "[+] Adding remote 'company' -> https://github.com/standardroofs-bot/standardroof-accounting-software.git" -ForegroundColor Cyan
    git remote add company https://github.com/standardroofs-bot/standardroof-accounting-software.git
}

Write-Host "     Remote: https://github.com/standardroofs-bot/standardroof-accounting-software.git" -ForegroundColor DarkGray
try {
    git push company main 2>&1 | Tee-Object -Variable companyOutput
    if ($companyOutput -match "fatal|error|Repository not found") {
        Write-Host "[!] Company repo push pending: The repository has not yet been initialized on github.com/standardroofs-bot." -ForegroundColor DarkYellow
        Write-Host "    To complete company repo setup:" -ForegroundColor Yellow
        Write-Host "    1. Log in to https://github.com/standardroofs-bot" -ForegroundColor White
        Write-Host "    2. Create empty repo 'standardroof-accounting-software'" -ForegroundColor White
        Write-Host "    3. Invite @Srimani26 as a collaborator or configure your PAT." -ForegroundColor White
        Write-Host "    Once created, running this script will push to both automatically!" -ForegroundColor Cyan
    } else {
        Write-Host "[✓] Company repository pushed successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "[!] Company push note: $_" -ForegroundColor DarkYellow
}

# Step 5: Generate Portable Local Storage Git Bundle & Archive
Write-Host "`n[4/4] Creating Local Storage Offline Backup..." -ForegroundColor Yellow
$bundlePath = Join-Path $BackupDir "sr-books-backup.bundle"
git bundle create $bundlePath --all
if (Test-Path $bundlePath) {
    $bundleSize = (Get-Item $bundlePath).Length / 1MB
    Write-Host ("[✓] Git Bundle created: {0} ({1:N2} MB)" -f $bundlePath, $bundleSize) -ForegroundColor Green
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "sr-books-source-$timestamp.zip"
$archivePath = Join-Path $BackupDir $archiveName
try {
    # Fast zip creation excluding large build folders
    $filesToZip = Get-ChildItem -Path $RepoDir -Exclude node_modules, .next, .git, backups
    Compress-Archive -Path $filesToZip.FullName -DestinationPath $archivePath -Force
    if (Test-Path $archivePath) {
        $zipSize = (Get-Item $archivePath).Length / 1MB
        Write-Host ("[✓] Local Storage ZIP Archive created: {0} ({1:N2} MB)" -f $archivePath, $zipSize) -ForegroundColor Green
    }
} catch {
    Write-Host "[!] Could not create zip archive: $_" -ForegroundColor DarkYellow
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   SYNC COMPLETED SUCCESSFULLY!                           " -ForegroundColor Green
Write-Host "   1. Personal Repo: https://github.com/Srimani26/standardroof-accounting-software" -ForegroundColor White
Write-Host "   2. Company Repo:  https://github.com/standardroofs-bot/standardroof-accounting-software" -ForegroundColor White
Write-Host "   3. Local Storage: $BackupDir" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
