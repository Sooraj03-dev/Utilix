[CmdletBinding()]
param(
    [ValidateSet('demo', 'cloud')]
    [string]$Mode = 'demo',

    [switch]$SkipAi = $false,

    [int]$Port = 3000,

    [int]$AiPort = 8000,

    [switch]$Help = $false
)

if ($Help) {
    Write-Host "Utilix Startup Script Usage:" -ForegroundColor Cyan
    Write-Host "  .\start.ps1 [-Mode <demo|cloud>] [-SkipAi] [-Port <3000>] [-AiPort <8000>]"
    Write-Host "Parameters:"
    Write-Host "  -Mode demo   : (Default) Zero-config mode using local mock auth and simulated data."
    Write-Host "  -Mode cloud  : Connects to live Google Firebase Authentication and Firestore using .env.local."
    Write-Host "  -SkipAi      : Launches only the Next.js frontend, skipping the Python FastAPI service."
    Write-Host "  -Port        : Custom port for Next.js (default: 3000)."
    Write-Host "  -AiPort      : Custom port for Python AI Service (default: 8000)."
    return
}

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================================================" -ForegroundColor Yellow
Write-Host "  UTILIX RESOURCE PLATFORM - Share. Use. Build." -ForegroundColor Yellow
Write-Host "  Complete Branch Integration v1.0" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Yellow

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Cyan

# 1. Verify Node.js
try {
    $nodeVersion = node -v
    Write-Host "  [OK] Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not installed or not in PATH. Please install Node.js (v18.17+ or v20+)."
    exit 1
}

# 2. Verify Python
if (-not $SkipAi) {
    try {
        $pythonVersion = python --version
        Write-Host "  [OK] Python detected: $pythonVersion" -ForegroundColor Green
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
        Write-Host "  [OK] Created .env.local from .env.example" -ForegroundColor Green
    } else {
        New-Item -ItemType File -Path $RootEnv -Force | Out-Null
        Write-Host "  [OK] Created empty .env.local" -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] .env.local exists" -ForegroundColor Gray
}

# Prepare ai-service/.env
$AiDir = Join-Path $ScriptDir "ai-service"
$AiEnv = Join-Path $AiDir ".env"
$AiEnvExample = Join-Path $AiDir ".env.example"

if (-not (Test-Path $AiEnv)) {
    if (Test-Path $AiEnvExample) {
        Copy-Item $AiEnvExample $AiEnv
        Write-Host "  [OK] Created ai-service/.env from .env.example" -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] ai-service/.env exists" -ForegroundColor Gray
}

# Configure default matching shared secret if missing
$DefaultSecret = "utilix-shared-dev-secret-2026"
$rootEnvContent = Get-Content $RootEnv -Raw -ErrorAction SilentlyContinue

if ($rootEnvContent -notmatch "AI_SERVICE_SECRET=") {
    Add-Content $RootEnv "`nAI_SERVICE_SECRET=$DefaultSecret"
    Write-Host "  [OK] Configured AI_SERVICE_SECRET in .env.local" -ForegroundColor Green
}

# Auto-detect Cloud Mode if .env.local has live Firebase credentials and -Mode was not explicitly specified
if (-not $PSBoundParameters.ContainsKey('Mode')) {
    if ($rootEnvContent -match "NEXT_PUBLIC_USE_MOCK_AUTH\s*=\s*false" -or ($rootEnvContent -match "FIREBASE_PROJECT_ID\s*=\s*`"utilix" -and $rootEnvContent -notmatch "NEXT_PUBLIC_USE_MOCK_AUTH\s*=\s*true")) {
        $Mode = 'cloud'
        Write-Host "  [Auto-Detect] Live Firebase credentials detected in .env.local -> Starting in CLOUD mode" -ForegroundColor Cyan
    }
}

if ($Mode -eq 'demo') {
    $env:NEXT_PUBLIC_USE_MOCK_AUTH = "true"
    $env:USE_MOCK_DATA = "true"
    Write-Host "  [OK] Active Mode: DEMO (Mock Auth and Mock Data enabled)" -ForegroundColor Green
} else {
    $env:NEXT_PUBLIC_USE_MOCK_AUTH = "false"
    $env:USE_MOCK_DATA = "false"
    Write-Host "  [OK] Active Mode: CLOUD (Real Firebase Authentication and Firestore enabled)" -ForegroundColor Green
}

Write-Host "[3/5] Verifying Node packages..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $ScriptDir "node_modules"))) {
    Write-Host "  -> Installing node packages (npm install)..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "  [OK] node_modules verified" -ForegroundColor Green
}

function Free-Port([int]$portNumber, [string]$serviceName) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $pId = $conn.OwningProcess
                if ($pId -and $pId -gt 0) {
                    Write-Host "  [Notice] Port $portNumber is in use by PID $pId. Freeing port for $serviceName..." -ForegroundColor Yellow
                    cmd.exe /c "taskkill /PID $pId /T /F" 2>&1 | Out-Null
                }
            }
            Start-Sleep -Milliseconds 800
        }
    } catch {
        # ignore lookup errors
    }
}

$aiProcess = $null

try {
    # 4. Start Python AI Service
    if (-not $SkipAi) {
        Free-Port $AiPort "AI Service"
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
            Write-Host "  [OK] AI Service started (PID: $($aiProcess.Id)) -> http://127.0.0.1:$AiPort/docs" -ForegroundColor Green
        }
    } else {
        Write-Host "[4/5] Skipping AI service launch (-SkipAi specified)." -ForegroundColor Yellow
    }

    # 5. Start Next.js Development Server
    Free-Port $Port "Next.js"
    Write-Host "[5/5] Launching Next.js Application on port $Port..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Yellow
    Write-Host "  Web Platform : http://localhost:$Port" -ForegroundColor Green
    Write-Host "  AI Service   : http://localhost:$AiPort/docs" -ForegroundColor Green
    Write-Host "  Demo Logins  : http://localhost:$Port/login" -ForegroundColor Green
    Write-Host "  8 Fair Rules : http://localhost:$Port/rules" -ForegroundColor Green
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
            cmd.exe /c "taskkill /PID $($aiProcess.Id) /T /F" 2>&1 | Out-Null
            $aiProcess.WaitForExit(2000)
            Write-Host "  [OK] AI Service terminated." -ForegroundColor Green
        } catch {
            Write-Warning "Could not cleanly terminate AI process: $_"
        }
    }
    Free-Port $AiPort "AI Service"
    Write-Host "Utilix shutdown complete." -ForegroundColor Green
}
