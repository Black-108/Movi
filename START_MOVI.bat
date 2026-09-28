@echo off
TITLE Movi — Launcher
COLOR 0E
SETLOCAL

SET ROOT_DIR=%~dp0
SET FRONTEND_DIR=%ROOT_DIR%frontend\
SET SCRAPER_DIR=%ROOT_DIR%scraper\
SET VENV_PYTHON=%SCRAPER_DIR%venv\Scripts\python.exe

:MENU
cls
echo.
echo  ============================================================
echo    MOVI  —  Master Launcher
echo  ============================================================
echo.
echo  [1]  Open Frontend Website       (React app  — port 5174)
echo  [2]  Open Scraper Dashboard      (Admin view — port 5050)
echo  [3]  Open BOTH at once
echo  [4]  Quick scrape + open website (scrape then launch)
echo  [5]  Run Scraper Menu            (full scraping options)
echo  [6]  Exit
echo.
set /p CHOICE=  Choose option (1-6):

if "%CHOICE%"=="1" goto FRONTEND
if "%CHOICE%"=="2" goto DASHBOARD
if "%CHOICE%"=="3" goto BOTH
if "%CHOICE%"=="4" goto SCRAPE_AND_OPEN
if "%CHOICE%"=="5" goto SCRAPER_MENU
if "%CHOICE%"=="6" goto END
goto MENU

:: ─────────────────────────────────────────────────────────────────
:FRONTEND
cls
echo.
echo  Starting Movi Frontend at http://localhost:5174 ...
echo.

:: Check Node
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    echo Download from https://nodejs.org then retry.
    echo.
    pause
    goto MENU
)

:: Install packages if missing
if not exist "%FRONTEND_DIR%node_modules\" (
    echo Installing frontend dependencies (first time only)...
    cd /d "%FRONTEND_DIR%"
    npm install
    echo.
)

cd /d "%FRONTEND_DIR%"
start /b "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5174"
start "Movi Frontend" cmd /k "npm run dev"
echo.
echo Frontend launched in a new window.
echo Press any key to return to menu.
pause >nul
goto MENU

:: ─────────────────────────────────────────────────────────────────
:DASHBOARD
cls
echo.
echo  Starting Scraper Dashboard at http://localhost:5050 ...
echo.

if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python venv not found at: %SCRAPER_DIR%venv\
    echo Run the scraper once first  ^(it creates the venv automatically^).
    echo.
    pause
    goto MENU
)

start /b "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5050"
start "Movi Dashboard" cmd /k ""%VENV_PYTHON%" "%SCRAPER_DIR%dashboard.py""
echo.
echo Dashboard launched in a new window.
echo Press any key to return to menu.
pause >nul
goto MENU

:: ─────────────────────────────────────────────────────────────────
:BOTH
cls
echo.
echo  Starting BOTH  —  Frontend (5174) + Dashboard (5050) ...
echo.

:: Check Node
where node >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js not found — Frontend will not start.
)

if not exist "%VENV_PYTHON%" (
    echo [WARNING] Python venv not found — Dashboard will not start.
)

:: Install frontend deps if missing
if not exist "%FRONTEND_DIR%node_modules\" (
    echo Installing frontend dependencies (first time only)...
    cd /d "%FRONTEND_DIR%"
    npm install
    echo.
)

:: Open both browser tabs after a short delay
start /b "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5174"
start /b "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5050"

:: Launch both server windows
cd /d "%FRONTEND_DIR%"
start "Movi Frontend" cmd /k "npm run dev"

if exist "%VENV_PYTHON%" (
    start "Movi Dashboard" cmd /k ""%VENV_PYTHON%" "%SCRAPER_DIR%dashboard.py""
)

echo.
echo Both servers launched in separate windows.
echo   Frontend  →  http://localhost:5174
echo   Dashboard →  http://localhost:5050
echo.
echo Press any key to return to menu.
pause >nul
goto MENU

:: ─────────────────────────────────────────────────────────────────
:SCRAPE_AND_OPEN
cls
echo.
echo  ============================================================
echo   Quick Scrape  (parallel, 3 sites at once)  +  open website
echo  ============================================================
echo.

if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python venv not found.
    echo Run run_dashboard.bat first to create it.
    echo.
    pause
    goto MENU
)

echo  Scraping all enabled sites...
echo  (This may take several minutes — window will say Done when finished)
echo.
cd /d "%SCRAPER_DIR%"
"%VENV_PYTHON%" run_scraper.py --split --site-concurrency 3
echo.
echo  Scrape complete. Launching frontend...
echo.

:: Install frontend deps if missing
if not exist "%FRONTEND_DIR%node_modules\" (
    cd /d "%FRONTEND_DIR%"
    npm install
)

start /b "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5174"
cd /d "%FRONTEND_DIR%"
start "Movi Frontend" cmd /k "npm run dev"

echo  Frontend launched at http://localhost:5174
echo.
pause >nul
goto MENU

:: ─────────────────────────────────────────────────────────────────
:SCRAPER_MENU
cls
call "%SCRAPER_DIR%run_menu.bat"
goto MENU

:: ─────────────────────────────────────────────────────────────────
:END
ENDLOCAL
exit
