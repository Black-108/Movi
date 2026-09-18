@echo off
setlocal
title Movi Local Server
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Movi dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo.
echo Starting Movi at http://localhost:5173
echo Edit Movi.json in this same folder to update the catalog.
echo Leave this window open while using the site.
start "" http://localhost:5173
call npm run dev
