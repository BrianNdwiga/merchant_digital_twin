@echo off
echo ========================================
echo Rebuilding Simulation Agent Docker Image
echo ========================================
echo.

cd simulation-agent

echo Removing old image...
docker rmi simulation-agent:latest 2>nul

echo.
echo Building Docker image (this may take a few minutes)...
docker build --no-cache -t simulation-agent:latest .

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Docker build failed!
    echo Make sure Docker is running and try again.
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo Docker image rebuilt successfully!
echo Image: simulation-agent:latest
echo ========================================
echo.
echo Testing the image...
docker run --rm simulation-agent:latest node -e "console.log('✅ Image works!')"

echo.
echo You can now run simulations from the UI.
pause
