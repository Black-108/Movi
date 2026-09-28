@echo off
:: ============================================================
:: Movi Daily Scraper — Windows Scheduler Batch File
:: ============================================================
:: HOW TO SET UP DAILY AUTO-RUN (Windows Task Scheduler):
::
:: 1. Press Win + R, type: taskschd.msc, press Enter
:: 2. Click "Create Basic Task" in the right panel
:: 3. Name: "Movi Daily Scraper"
:: 4. Trigger: Daily — set your preferred time (e.g., 2:00 AM)
:: 5. Action: Start a program
::    Program/script: Full path to THIS .bat file
::    e.g.: C:\Users\prash\OneDrive\Projects\...\scheduler_daily.bat
:: 6. Finish.
::
:: To test it manually: double-click this file or run it in CMD.
:: ============================================================
:: OUTPUT FILES:
::   Combined mode (default): ../frontend/public/Movi.json
::   Split mode:               ../frontend/public/site_data/<site>.json
::
:: Change --split to combined mode or remove it below as needed.
:: ============================================================

SET SCRIPT_DIR=%~dp0
SET VENV_PYTHON=%SCRIPT_DIR%venv\Scripts\python.exe
SET LOG_FILE=%SCRIPT_DIR%scraper_log.txt

echo [%date% %time%] Starting Movi scraper... >> "%LOG_FILE%"

"%VENV_PYTHON%" "%SCRIPT_DIR%run_scraper.py" --split >> "%LOG_FILE%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Scraper completed successfully. >> "%LOG_FILE%"
) else (
    echo [%date% %time%] Scraper finished with errors. Check above. >> "%LOG_FILE%"
)

echo. >> "%LOG_FILE%"
