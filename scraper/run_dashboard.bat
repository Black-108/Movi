@echo off
TITLE Movi Scraper Dashboard
COLOR 0A

SET SCRIPT_DIR=%~dp0
SET VENV_PYTHON=%SCRIPT_DIR%venv\Scripts\python.exe
SET REQUIREMENTS=%SCRIPT_DIR%requirements.txt

echo ============================================================
echo   Movi Scraper Web Dashboard
echo ============================================================
echo.

:: Create venv if missing
if not exist "%SCRIPT_DIR%venv\" (
    echo Creating virtual environment...
    python -m venv "%SCRIPT_DIR%venv"
    echo.
)

:: Install/update dependencies
echo Checking dependencies...
"%VENV_PYTHON%" -m pip install --upgrade pip --quiet
"%VENV_PYTHON%" -m pip install -r "%REQUIREMENTS%" --quiet
echo Dependencies ready.
echo.

:: FIX: wait for server to start before opening browser, then open in background
echo Dashboard starting at http://localhost:5050 ...
start /b "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5050"

echo Press Ctrl+C to stop.
echo ============================================================
"%VENV_PYTHON%" "%SCRIPT_DIR%dashboard.py"

pause
