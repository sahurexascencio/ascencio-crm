@echo off
title Ascencio CRM
color 0A
cls

echo ============================================
echo   ASCENCIO CRM - Starting...
echo ============================================
echo.

:: Check .env
if not exist "%~dp0backend\.env" (
    echo ERROR: backend\.env file is missing!
    echo Run setup_and_run.bat first.
    pause
    exit
)

:: Start backend
start "Ascencio Backend" cmd /k "cd /d "%~dp0backend" && title Ascencio Backend && py -3.12 -m uvicorn app.main:app --reload"

:: Wait for backend
timeout /t 4 /nobreak >nul

:: Start frontend
start "Ascencio Frontend" cmd /k "cd /d "%~dp0frontend" && title Ascencio Frontend && npm run dev"

:: Wait for frontend
timeout /t 8 /nobreak >nul

:: Open Chrome
start chrome "http://localhost:3000"

echo Backend and Frontend started.
echo.
echo Close the terminal windows to shut down.
echo.
pause
