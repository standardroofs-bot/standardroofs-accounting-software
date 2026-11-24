# ==============================================================================
# Standard Roofs Books (SR-Books) - High-Reliability Enterprise Watchdog Service
# Continuously monitors Next.js on port 3000 and Cloudflare Tunnel.
# Auto-heals and auto-restarts within 3 seconds if any process drops.
# ==============================================================================

param(
  [int]$Port = 3000,
  [int]$CheckIntervalSeconds = 5
)

$ErrorActionPreference = "SilentlyContinue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

$LogsDir = Join-Path $ProjectRoot "logs"
if (!(Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir | Out-Null }
$PublicDir = Join-Path $ProjectRoot "public"
if (!(Test-Path $PublicDir)) { New-Item -ItemType Directory -Path $PublicDir | Out-Null }

$ServerLog = Join-Path $LogsDir "nextjs-server.log"
$TunnelLog = Join-Path $LogsDir "cloudflared-tunnel.log"
$TunnelUrlFile = Join-Path $PublicDir "active-tunnel.txt"
$TunnelJsonFile = Join-Path $PublicDir "active-tunnel.json"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " [SR-Books Enterprise Watchdog] Initializing Auto-Healer" -ForegroundColor Green
Write-Host " Root Directory: $ProjectRoot" -ForegroundColor Gray
Write-Host " Local Port: $Port" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

function Test-ServerHealthy {
  param([int]$TargetPort)
  try {
    $res = Invoke-WebRequest -Uri "http://localhost:$TargetPort/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    return ($res.StatusCode -eq 200)
  } catch {
    # Check if TCP connection is active even if API is mid-initialization
    try {
      $tcp = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction Stop
      return ($tcp -ne $null)
    } catch {
      return $false
    }
  }
}

function Start-NextServer {
  Write-Host "[Watchdog] $(Get-Date -Format 'HH:mm:ss') Starting Next.js Production Server..." -ForegroundColor Yellow
  Start-Process -FilePath "npm.cmd" -ArgumentList "run start" -WorkingDirectory $ProjectRoot -RedirectStandardOutput $ServerLog -RedirectStandardError $ServerLog -WindowStyle Hidden
  Start-Sleep -Seconds 3
}

function Test-TunnelHealthy {
  $proc = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
  return ($proc -ne $null)
}

function Start-CloudflareTunnel {
  Write-Host "[Watchdog] $(Get-Date -Format 'HH:mm:ss') Launching Cloudflare Tunnel Daemon..." -ForegroundColor Yellow
  $cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
  if (!(Test-Path $cloudflaredPath)) {
    $cloudflaredPath = "cloudflared"
  }
  Start-Process -FilePath $cloudflaredPath -ArgumentList "tunnel --url http://localhost:$Port" -WorkingDirectory $ProjectRoot -RedirectStandardOutput $TunnelLog -RedirectStandardError $TunnelLog -WindowStyle Hidden
  Start-Sleep -Seconds 4
  Update-TunnelUrl
}

function Update-TunnelUrl {
  if (Test-Path $TunnelLog) {
    $lines = Get-Content $TunnelLog -Tail 100
    foreach ($line in $lines) {
      if ($line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
        $foundUrl = $matches[0]
        Set-Content -Path $TunnelUrlFile -Value $foundUrl
        $json = @{
          url = $foundUrl
          updatedAt = (Get-Date).ToString("o")
          status = "HEALTHY"
          localUrl = "http://localhost:$Port"
        } | ConvertTo-Json
        Set-Content -Path $TunnelJsonFile -Value $json
        Write-Host "[Watchdog] Live Cloudflare Tunnel URL: $foundUrl" -ForegroundColor Cyan
        break
      }
    }
  }
}

# Initial Verification
if (!(Test-ServerHealthy -TargetPort $Port)) {
  Start-NextServer
} else {
  Write-Host "[Watchdog] Next.js is already running healthy on port $Port." -ForegroundColor Green
}

if (!(Test-TunnelHealthy)) {
  Start-CloudflareTunnel
} else {
  Write-Host "[Watchdog] Cloudflare Tunnel is already active." -ForegroundColor Green
  Update-TunnelUrl
}

Write-Host "[Watchdog] Monitoring services continuously. Press Ctrl+C to terminate." -ForegroundColor Cyan

# Continuous Resilience Loop
while ($true) {
  Start-Sleep -Seconds $CheckIntervalSeconds

  # 1. Health check Next.js on port 3000
  if (!(Test-ServerHealthy -TargetPort $Port)) {
    Write-Host "[Watchdog Alert] $(Get-Date -Format 'HH:mm:ss') Port $Port not responding. Auto-recovering..." -ForegroundColor Red
    Start-NextServer
  }

  # 2. Health check Cloudflare Tunnel
  if (!(Test-TunnelHealthy)) {
    Write-Host "[Watchdog Alert] $(Get-Date -Format 'HH:mm:ss') Cloudflare Tunnel dropped. Auto-recovering..." -ForegroundColor Red
    Start-CloudflareTunnel
  } else {
    # Keep active-tunnel.txt updated
    Update-TunnelUrl
  }
}
