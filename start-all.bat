@echo off
echo ========================================
echo Merchant Digital Twin Simulation Platform
echo 1000+ Concurrent Merchant Architecture
echo ========================================
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

rem Default scaling values
set SIM_WORKER_COUNT=20
set MAX_CONTEXTS_PER_WORKER=50

rem Override from .env if it exists
if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="SIM_WORKER_COUNT" set SIM_WORKER_COUNT=%%B
        if "%%A"=="MAX_CONTEXTS_PER_WORKER" set MAX_CONTEXTS_PER_WORKER=%%B
    )
)

echo Scaling config:
echo   Workers:         %SIM_WORKER_COUNT%
echo   Contexts/worker: %MAX_CONTEXTS_PER_WORKER%
echo.

echo [1/3] Starting Docker services (Redis, Queue, Workers, Backend, Insight Service...)
start "Docker Compose" cmd /k "docker compose up --build --scale simulation-worker=%SIM_WORKER_COUNT%"

echo Waiting for backend to be ready...
timeout /t 15 /nobreak >nul

echo [2/3] Starting Frontend (port 3001)...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo All services starting:
echo   Backend API    : http://localhost:3000
echo   Frontend UI    : http://localhost:3003
echo   Insight Service: http://localhost:3002
echo   Merchant Gen   : http://localhost:3001
echo   Queue Stats    : http://localhost:3005/stats
echo   Mock Portal    : http://localhost:8888
echo ========================================
echo.
echo Close the opened terminal windows to stop services.
