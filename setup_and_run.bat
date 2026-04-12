@echo off
title Ascencio CRM Setup
color 0A
cls

echo ============================================
echo   ASCENCIO CRM - First Time Setup
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    py -3.12 --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Python 3.12 not found.
        echo Download from https://python.org/downloads
        pause
        exit
    )
    set PYTHON=py -3.12
) else (
    set PYTHON=python
)

echo [1/5] Installing Node.js...
winget install --id OpenJS.NodeJS.LTS -e --silent >nul 2>&1
if errorlevel 1 (
    echo Node.js install failed - trying manual check...
    node --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Node.js not installed.
        echo Download from https://nodejs.org and run this file again.
        pause
        exit
    )
)
echo      Node.js OK

echo [2/5] Installing Python packages...
cd /d "%~dp0backend"
%PYTHON% -m pip install -r requirements.txt --break-system-packages --quiet
echo      Python packages OK

echo [3/5] Installing Node packages...
cd /d "%~dp0frontend"
call npm install --silent
echo      Node packages OK

echo [4/5] Checking .env file...
if not exist "%~dp0backend\.env" (
    echo.
    echo ERROR: backend\.env file is missing!
    echo Copy the .env file from Khaled into backend\.env then run this again.
    echo.
    pause
    exit
)
echo      .env OK

echo [5/5] Launching...
echo.
echo ============================================
echo   Starting Ascencio CRM...
echo ============================================
echo.

:: Start backend
start "Ascencio Backend" cmd /k "cd /d "%~dp0backend" && title Ascencio Backend && py -3.12 -m uvicorn app.main:app --reload"

:: Wait for backend to start
timeout /t 4 /nobreak >nul

:: Start frontend
start "Ascencio Frontend" cmd /k "cd /d "%~dp0frontend" && title Ascencio Frontend && npm run dev"

:: Wait for frontend to start
timeout /t 8 /nobreak >nul

:: Open Chrome
start chrome "http://localhost:3000"

echo.
echo ============================================
echo   Ascencio CRM is running!
echo   http://localhost:3000
echo ============================================
echo.
echo Keep this window and the two terminal windows open.
echo Close them to shut down the CRM.
echo.
pause
