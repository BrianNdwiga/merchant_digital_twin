@echo off
echo ========================================
echo Rebuilding all simulation Docker images
echo ========================================
echo.

docker compose build --no-cache

if %errorlevel% neq 0 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo All images rebuilt. Run start-all.bat to launch.
echo ========================================
pause
