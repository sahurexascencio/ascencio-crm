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
start "Ascencio Backend" cmd /k "title Ascencio Backend && cd /d "%~dp0backend" && py -3.12 -m uvicorn app.main:app --reload"

:: Wait for backend
timeout /t 4 /nobreak >nul

:: Start frontend
start "Ascencio Frontend" cmd /k "title Ascencio Frontend && cd /d "%~dp0frontend" && npm run dev"

:: Wait for frontend
timeout /t 8 /nobreak >nul

:: Start Cloudflare tunnel
start "Ascencio Tunnel" cmd /k "title Ascencio Tunnel && cd /d "%~dp0" && cloudflared tunnel --url http://localhost:8000"

:: Wait for tunnel
timeout /t 5 /nobreak >nul

:: Open Chrome
start chrome "http://localhost:3000"

echo.
echo ============================================
echo   All services started!
echo   http://localhost:3000
echo ============================================
echo.
echo IMPORTANT: Copy the tunnel URL from the
echo "Ascencio Tunnel" window and update Twilio:
echo   Messaging: [url]/messages/incoming
echo   TwiML App: [url]/calls/twiml
echo.
pause
