# PIDS Diagnostic Script
# Run this from PowerShell in the Dummy directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PIDS System Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "F:\Muhammad Afnan Risandi\02_Projects\Learning\Magang\Eltran\PIDS\Dummy"
$masterApp = "$projectRoot\Eltran-PIDS-Dummy\packages\master-app"
$electronDb = "$masterApp\electron\database.js"

# 1. Check Docker
Write-Host "[1/7] Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>$null
if ($dockerRunning) {
    Write-Host "  ✓ Docker is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ Docker is NOT running" -ForegroundColor Red
    Write-Host "  → Start Docker Desktop first!" -ForegroundColor Red
}
Write-Host ""

# 2. Check PostgreSQL Container
Write-Host "[2/7] Checking PostgreSQL Container..." -ForegroundColor Yellow
$pgContainer = docker ps --filter "name=pids-postgres" --format "{{.Status}}" 2>$null
if ($pgContainer -match "Up") {
    Write-Host "  ✓ PostgreSQL container is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ PostgreSQL container is NOT running" -ForegroundColor Red
    Write-Host "  → Run: docker compose up -d db" -ForegroundColor Yellow
}
Write-Host ""

# 3. Check .env files
Write-Host "[3/7] Checking .env files..." -ForegroundColor Yellow

$rootEnv = "$projectRoot\.env"
$masterEnv = "$masterApp\.env"

if (Test-Path $rootEnv) {
    Write-Host "  ✓ Root .env exists" -ForegroundColor Green
    $rootContent = Get-Content $rootEnv | Where-Object { $_ -notmatch "^#" -and $_ -ne "" }
    Write-Host "    Content:" -ForegroundColor DarkGray
    $rootContent | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
} else {
    Write-Host "  ✗ Root .env NOT found" -ForegroundColor Red
}

if (Test-Path $masterEnv) {
    Write-Host "  ✓ master-app .env exists" -ForegroundColor Green
    $masterContent = Get-Content $masterEnv | Where-Object { $_ -notmatch "^#" -and $_ -ne "" }
    Write-Host "    Content:" -ForegroundColor DarkGray
    $masterContent | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
} else {
    Write-Host "  ✗ master-app .env NOT found" -ForegroundColor Red
    Write-Host "  → Create it with DATABASE_URL" -ForegroundColor Yellow
}
Write-Host ""

# 4. Check DATABASE_URL consistency
Write-Host "[4/7] Checking DATABASE_URL consistency..." -ForegroundColor Yellow

$rootDbUrl = (Get-Content $rootEnv | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "^DATABASE_URL=", ""
$masterDbUrl = if (Test-Path $masterEnv) { (Get-Content $masterEnv | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "^DATABASE_URL=", "" } else { $null }

if ($rootDbUrl -eq $masterDbUrl) {
    Write-Host "  ✓ DATABASE_URL is consistent" -ForegroundColor Green
    Write-Host "    $rootDbUrl" -ForegroundColor DarkGray
} else {
    Write-Host "  ✗ DATABASE_URL is INCONSISTENT" -ForegroundColor Red
    Write-Host "    Root:    $rootDbUrl" -ForegroundColor Red
    Write-Host "    Master:  $masterDbUrl" -ForegroundColor Red
}
Write-Host ""

# 5. Test PostgreSQL Connection
Write-Host "[5/7] Testing PostgreSQL connection..." -ForegroundColor Yellow
$testScript = "$projectRoot\Eltran-PIDS-Dummy\test_db_simple.js"
if (Test-Path $testScript) {
    $testOutput = node $testScript 2>&1 | Out-String
    if ($testOutput -match "SUCCESS") {
        Write-Host "  ✓ Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Database connection FAILED" -ForegroundColor Red
        $testOutput | Select-String "FAILED" | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    }
} else {
    Write-Host "  - Test script not found, skipping" -ForegroundColor Yellow
}
Write-Host ""

# 6. Check if Master App can start
Write-Host "[6/7] Checking Master App dependencies..." -ForegroundColor Yellow
if (Test-Path "$masterApp\node_modules") {
    Write-Host "  ✓ master-app node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ master-app node_modules NOT found" -ForegroundColor Red
    Write-Host "  → Run: npm install" -ForegroundColor Yellow
}

if (Test-Path "$masterApp\electron\database.js") {
    Write-Host "  ✓ database.js exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ database.js NOT found" -ForegroundColor Red
}

if (Test-Path "$masterApp\electron\api.js") {
    Write-Host "  ✓ api.js exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ api.js NOT found" -ForegroundColor Red
}

if (Test-Path "$masterApp\electron\main.js") {
    Write-Host "  ✓ main.js exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ main.js NOT found" -ForegroundColor Red
}
Write-Host ""

# 7. Check Port 3001 (API Server)
Write-Host "[7/7] Checking if Master App API (port 3001) is running..." -ForegroundColor Yellow
$apiPort = netstat -ano | Select-String ":3001.*LISTENING"
if ($apiPort) {
    Write-Host "  ✓ Port 3001 is in use (Master App API might be running)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Port 3001 is NOT listening" -ForegroundColor Red
    Write-Host "  → Master App is NOT running!" -ForegroundColor Red
    Write-Host "  → Run: npm run dev:master" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary & Recommendations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The login error 'Tidak dapat terhubung ke Master' means:" -ForegroundColor White
Write-Host "  The frontend (React) cannot reach the backend API at http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "To fix this, you need to:" -ForegroundColor Yellow
Write-Host "  1. Ensure Docker + PostgreSQL are running" -ForegroundColor White
Write-Host "  2. Start the Master App (which runs the API server)" -ForegroundColor White
Write-Host "  3. Then try logging in from Master/Selector/CC app" -ForegroundColor White
Write-Host ""
Write-Host "Commands to run:" -ForegroundColor Cyan
Write-Host "  cd '$projectRoot'" -ForegroundColor DarkGray
Write-Host "  docker compose up -d" -ForegroundColor White
Write-Host "  npm run dev:master" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Cyan
Write-Host "  Admin:    admin / admin123" -ForegroundColor White
Write-Host "  Operator: operator / operator123" -ForegroundColor White
Write-Host ""
