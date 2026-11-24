@echo off
title Standard Roofs Books - Production Watchdog Service
color 0A
echo ==============================================================================
echo   STANDARD ROOFS BOOKS (SR-BOOKS) - HIGH RELIABILITY PRODUCTION SERVICE
echo   Auto-monitors localhost:3000 and Cloudflare Tunnel
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/2] Verifying production build...
if not exist ".next\standalone\server.js" (
  if not exist ".next\BUILD_ID" (
    echo Building production bundles...
    call npm run build
  )
)

echo [2/2] Starting Auto-Healing Watchdog Daemon...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\watchdog.ps1"

pause
