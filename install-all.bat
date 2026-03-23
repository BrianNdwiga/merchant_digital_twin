@echo off
echo ═══════════════════════════════════════════════════════════════════
echo   Digital Twin Simulation - Install All Dependencies
echo ═══════════════════════════════════════════════════════════════════
echo.

call :install_deps "insight-service" "Insight Service"
call :install_deps "merchant-generator" "Merchant Generator"
call :install_deps "scenario-runner" "Scenario Runner"
call :install_deps "services\simulationQueue" "Simulation Queue Service"
call :install_deps "workers" "Simulation Workers"
call :install_deps "cli" "CLI Tools"
call :install_deps "backend" "Backend API"
call :install_deps "frontend" "Frontend Dashboard"

echo ═══════════════════════════════════════════════════════════════════
echo ✅ All dependencies installed successfully!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo Next steps:
echo   Run start-all.bat to launch the full platform via Docker Compose
echo.
goto :eof

:install_deps
set dir=%~1
set name=%~2

echo 📦 Installing %name%...
pushd %dir%
call npm install
if %errorlevel% neq 0 (
  echo ❌ Failed to install %name%
  popd
  exit /b 1
)
echo ✅ %name% installed
popd
echo.
goto :eof
