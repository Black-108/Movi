@echo off
TITLE Movi Frontend
COLOR 0B
SETLOCAL

SET FRONTEND_DIR=%~dp0

echo ============================================================
echo   Movi Frontend  —  React + Vite
echo ============================================================
echo.

:: Check Node is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo Download it from https://nodejs.org and install, then retry.
    echo.
    pause
    exit /b 1
)

:: Install packages if node_modules missing
if not exist "%FRONTEND_DIR%node_modules\" (
    echo node_modules not found. Running npm install...
    echo.
    cd /d "%FRONTEND_DIR%"
    npm install
    echo.
)

cd /d "%FRONTEND_DIR%"

:: Wait 2 seconds for Vite to start, then open browser
start /b "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5174"

echo Frontend starting at http://localhost:5174 ...
echo Press Ctrl+C to stop.
echo ============================================================
npm run dev
