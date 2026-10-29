<#
.SYNOPSIS
    Utilix Unified Local Startup Script
.DESCRIPTION
    Launches both the Next.js Frontend/API Server and the Python FastAPI AI Allocation Service
    with automated environment setup, dependency verification, and graceful shutdown handling.
.PARAMETER Mode
    Runtime mode: 'demo' (zero-config local mock mode) or 'cloud' (real Firebase mode). Default: 'demo'.
.PARAMETER SkipAi
    Switch to skip starting the Python AI service.
.PARAMETER Port
    Next.js port. Default: 3000.
.PARAMETER AiPort
    FastAPI AI service port. Default: 8000.
#>

[CmdletBinding()]
param(
    [ValidateSet('demo', 'cloud')]
    [string]$Mode = 'demo',

    [switch]$SkipAi = $false,

    [int]$Port = 3000,

    [int]$AiPort = 8000
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host @"
========================================================================
     _   _ _____ ___ _     _____  __
    | | | |_   _|_ _| |   |_ _\ \/ /   UTILIX RESOURCE PLATFORM
    | | | | | |  | || |    | | \  /    Share. Use. Build.
    | |_| | | |  | || |___ | | /  \    v1.0 (Full Integration)
     \___/  |_| |___|_____|___/_/\_\ 
========================================================================
"@ -ForegroundColor Yellow

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Cyan

# 1. Verify Node.js
try {
    $nodeVersion = node -v
    Write-Host "  ✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not installed or not in PATH. Please install Node.js (v18.17+ or v20+)."
    exit 1
}

# 2. Verify Python
if (-not $SkipAi) {
    try {
        $pythonVersion = python --version
        Write-Host "  ✓ Python detected: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Warning "Python is not found in PATH. Proceeding with AI service skipped."
        $SkipAi = $true
    }
}

Write-Host "[2/5] Preparing environment configurations..." -ForegroundColor Cyan

# Prepare root .env.local
$RootEnv = Join-Path $ScriptDir ".env.local"
$RootEnvExample = Join-Path $ScriptDir ".env.example"

if (-not (Test-Path $RootEnv)) {
    if (Test-Path $RootEnvExample) {
        Copy-Item $RootEnvExample $RootEnv
        Write-Host "  ✓ Created .env.local from .env.example" -ForegroundColor Green
    } else {
        New-Item -ItemType File -Path $RootEnv -Force | Out-Null
        Write-Host "  ✓ Created empty .env.local" -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ .env.local exists" -ForegroundColor Gray
}

# Prepare ai-service/.env
$AiDir = Join-Path $ScriptDir "ai-service"
$AiEnv = Join-Path $AiDir ".env"
$AiEnvExample = Join-Path $AiDir ".env.example"

if (-not (Test-Path $AiEnv)) {
    if (Test-Path $AiEnvExample) {
        Copy-Item $AiEnvExample $AiEnv
        Write-Host "  ✓ Created ai-service/.env from .env.example" -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ ai-service/.env exists" -ForegroundColor Gray
}

# Configure default matching shared secret & mode if needed
$DefaultSecret = "utilix-shared-dev-secret-2026"
$rootEnvContent = Get-Content $RootEnv -Raw -ErrorAction SilentlyContinue

if ($rootEnvContent -notmatch "AI_SERVICE_SECRET=") {
    Add-Content $RootEnv "`nAI_SERVICE_SECRET=$DefaultSecret"
    Write-Host "  ✓ Configured AI_SERVICE_SECRET in .env.local" -ForegroundColor Green
}

if ($Mode -eq 'demo') {
    # Ensure local mock auth and mock data are enabled for seamless out-of-the-box demo
    $env:NEXT_PUBLIC_USE_MOCK_AUTH = "true"
    $env:USE_MOCK_DATA = "true"
    Write-Host "  ✓ Active Mode: DEMO (Mock Auth & Mock Workflow Adapter enabled)" -ForegroundColor Green
} else {
    $env:NEXT_PUBLIC_USE_MOCK_AUTH = "false"
    $env:USE_MOCK_DATA = "false"
    Write-Host "  ✓ Active Mode: CLOUD (Real Firebase Authentication & Firestore enabled)" -ForegroundColor Green
}

Write-Host "[3/5] Verifying Node packages..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $ScriptDir "node_modules"))) {
    Write-Host "  → Installing node packages (npm install)..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "  ✓ node_modules verified" -ForegroundColor Green
}

$aiProcess = $null

try {
    # 4. Start Python AI Service
    if (-not $SkipAi) {
        Write-Host "[4/5] Launching Python FastAPI AI Service on port $AiPort..." -ForegroundColor Cyan
        
        $aiCommand = "python"
        $aiArgs = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$AiPort", "--reload")

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $aiCommand
        $psi.Arguments = $aiArgs -join " "
        $psi.WorkingDirectory = $AiDir
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $false
        $psi.RedirectStandardError = $false

        $aiProcess = [System.Diagnostics.Process]::Start($psi)

        Start-Sleep -Seconds 2
        if ($aiProcess.HasExited) {
            Write-Warning "AI Service process exited unexpectedly. Continuing with Next.js deterministic fallback."
        } else {
            Write-Host "  ✓ AI Service started (PID: $($aiProcess.Id)) -> http://127.0.0.1:$AiPort/docs" -ForegroundColor Green
        }
    } else {
        Write-Host "[4/5] Skipping AI service launch (-SkipAi specified)." -ForegroundColor Yellow
    }

    # 5. Start Next.js Development Server
    Write-Host "[5/5] Launching Next.js Application on port $Port..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Yellow
    Write-Host "  🌐 Web Platform : http://localhost:$Port" -ForegroundColor Green
    Write-Host "  🤖 AI Docs Docs  : http://localhost:$AiPort/docs" -ForegroundColor Green
    Write-Host "  👥 Demo Logins   : http://localhost:$Port/login" -ForegroundColor Green
    Write-Host "  📜 8 Fair Rules  : http://localhost:$Port/rules" -ForegroundColor Green
    Write-Host "========================================================================" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop both Next.js and the AI service." -ForegroundColor Gray
    Write-Host ""

    # Start Next.js in foreground
    npm run dev -- -p $Port

} finally {
    Write-Host "`nStopping Utilix services..." -ForegroundColor Yellow
    if ($aiProcess -and -not $aiProcess.HasExited) {
        Write-Host "Terminating AI Service (PID: $($aiProcess.Id))..." -ForegroundColor Gray
        try {
            $aiProcess.Kill()
            $aiProcess.WaitForExit(3000)
            Write-Host "  ✓ AI Service terminated." -ForegroundColor Green
        } catch {
            Write-Warning "Could not cleanly terminate AI process: $_"
        }
    }
    Write-Host "Utilix shutdown complete." -ForegroundColor Green
}
