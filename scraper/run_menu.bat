@echo off
TITLE Movi Scraper Menu
COLOR 0E
SETLOCAL

SET SCRIPT_DIR=%~dp0
SET VENV_PYTHON=%SCRIPT_DIR%venv\Scripts\python.exe
SET LOG_FILE=%SCRIPT_DIR%scraper_log.txt

:MENU
cls
echo.
echo  =====================================================
echo    MOVI SCRAPER — Quick Run Menu
echo  =====================================================
echo.
echo  [1]  Run ALL sites PARALLEL (3 at a time)  →  Movi.json
echo  [2]  Run ALL sites PARALLEL (3 at a time)  →  split files
echo  [3]  Run ALL sites PARALLEL (5 at a time)  →  split files  (faster)
echo  [4]  Run FilmyFly only                     →  combined
echo  [5]  Run FilmyFly only                     →  split
echo  [6]  Test run  (5 items / all sites / split)
echo  [7]  Validate Movi.json
echo  [8]  Open Web Dashboard
echo  [9]  View last log
echo  [0]  Exit
echo.
set /p CHOICE=  Choose option (0-9):

if "%CHOICE%"=="1" goto RUN_ALL_PARALLEL_3
if "%CHOICE%"=="2" goto RUN_ALL_PARALLEL_3_SPLIT
if "%CHOICE%"=="3" goto RUN_ALL_PARALLEL_5_SPLIT
if "%CHOICE%"=="4" goto RUN_FILMYFLY_COMBINED
if "%CHOICE%"=="5" goto RUN_FILMYFLY_SPLIT
if "%CHOICE%"=="6" goto TEST_RUN
if "%CHOICE%"=="7" goto VALIDATE
if "%CHOICE%"=="8" goto DASHBOARD
if "%CHOICE%"=="9" goto VIEW_LOG
if "%CHOICE%"=="0" goto END
goto MENU

:RUN_ALL_PARALLEL_3
echo.
echo Running all sites in parallel (3 at a time)... output: Movi.json
echo [%date% %time%] RUN_ALL_PARALLEL_3 >> "%LOG_FILE%"
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --site-concurrency 3 >> "%LOG_FILE%" 2>&1
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --site-concurrency 3
echo.
echo Done! Press any key to return to menu.
pause >nul
goto MENU

:RUN_ALL_PARALLEL_3_SPLIT
echo.
echo Running all sites in parallel (3 at a time)... output: site_data\*.json
echo [%date% %time%] RUN_ALL_PARALLEL_3_SPLIT >> "%LOG_FILE%"
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --split --site-concurrency 3 >> "%LOG_FILE%" 2>&1
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --split --site-concurrency 3
echo.
echo Done! Press any key to return to menu.
pause >nul
goto MENU

:RUN_ALL_PARALLEL_5_SPLIT
echo.
echo Running all sites in parallel (5 at a time)... output: site_data\*.json
echo [%date% %time%] RUN_ALL_PARALLEL_5_SPLIT >> "%LOG_FILE%"
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --split --site-concurrency 5 >> "%LOG_FILE%" 2>&1
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --split --site-concurrency 5
echo.
echo Done! Press any key to return to menu.
pause >nul
goto MENU

:RUN_FILMYFLY_COMBINED
echo.
echo Running FilmyFly only... output: Movi.json
echo [%date% %time%] RUN_FILMYFLY_COMBINED >> "%LOG_FILE%"
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --site filmyfly >> "%LOG_FILE%" 2>&1
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --site filmyfly
echo.
pause >nul
goto MENU

:RUN_FILMYFLY_SPLIT
echo.
echo Running FilmyFly only... output: site_data\filmyfly.json
echo [%date% %time%] RUN_FILMYFLY_SPLIT >> "%LOG_FILE%"
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --site filmyfly --split >> "%LOG_FILE%" 2>&1
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --site filmyfly --split
echo.
pause >nul
goto MENU

:TEST_RUN
echo.
echo Test run: all enabled sites, 5 items each, split mode...
echo [%date% %time%] TEST_RUN >> "%LOG_FILE%"
"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --limit 5 --split --site-concurrency 3
echo.
pause >nul
goto MENU

:VALIDATE
echo.
echo Validating Movi.json...
"%VENV_PYTHON%" "%SCRIPT_DIR%validate_data.py"
echo.
pause >nul
goto MENU

:DASHBOARD
echo.
echo Launching Web Dashboard...
start "" "%SCRIPT_DIR%run_dashboard.bat"
goto MENU

:VIEW_LOG
echo.
if exist "%LOG_FILE%" (
    type "%LOG_FILE%"
) else (
    echo No log file found yet.
)
echo.
pause >nul
goto MENU

:END
ENDLOCAL
exit
