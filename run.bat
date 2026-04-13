@echo off
title Ascencio CRM
color 0A
cls

cd /d "%~dp0"

echo ============================================
echo   ASCENCIO CRM - Starting...
echo ============================================
echo.

if not exist "backend\.env" (
    echo ERROR: backend\.env file is missing!
    pause & exit
)

for /f "usebackq tokens=1,2 delims==" %%a in ("backend\.env") do (
    if /i "%%a"=="TWILIO_ACCOUNT_SID"    set TWILIO_SID=%%b
    if /i "%%a"=="TWILIO_AUTH_TOKEN"     set TWILIO_TOKEN=%%b
    if /i "%%a"=="TWILIO_TWIML_APP_SID"  set TWIML_APP=%%b
)

start "Ascencio Backend" cmd /k "title Ascencio Backend && cd /d "%~dp0backend" && py -3.12 -m uvicorn app.main:app --reload"
timeout /t 4 /nobreak >nul

start "Ascencio Frontend" cmd /k "title Ascencio Frontend && cd /d "%~dp0frontend" && npm run dev"
timeout /t 6 /nobreak >nul

start "Ascencio Tunnel" cmd /k "title Ascencio Tunnel && cloudflared tunnel --url http://localhost:8000"
timeout /t 5 /nobreak >nul

echo Running Twilio auto-update...
py -3.12 update_twilio.py

start chrome "http://localhost:3000"
echo.
pause