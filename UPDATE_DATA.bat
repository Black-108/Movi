@echo off
title Movi — Update Database
echo ============================================
echo  MOVI DATA UPDATER
echo  Copies latest Movi.json into movi-site
echo ============================================
echo.

set SRC="%~dp0..\movi\frontend\public\Movi.json"
set DST="%~dp0frontend\public\Movi.json"

if not exist %SRC% (
    echo [ERROR] Source file not found: %SRC%
    echo Make sure you ran the scraper first and the file exists at:
    echo   movi\frontend\public\Movi.json
    pause
    exit /b 1
)

echo Copying Movi.json...
copy /Y %SRC% %DST%

if %errorlevel%==0 (
    echo.
    echo [OK] Movi.json updated successfully!
    echo.
    echo Next steps:
    echo   1. Open GitHub Desktop
    echo   2. Commit and push this movi-site folder
    echo   3. GitHub Actions will deploy automatically
) else (
    echo [ERROR] Copy failed!
)

echo.
pause
