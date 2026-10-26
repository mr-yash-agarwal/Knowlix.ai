@echo off
title Knowlix AI Launcher
echo =========================================================
echo              Launching Knowlix AI Platform               
echo           "Learn Smarter. Remember Longer."              
echo =========================================================
echo.
echo Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "Knowlix AI Backend" "%~dp0start-backend.bat"

timeout /t 3 /nobreak >nul

echo Starting Frontend (Vite on http://localhost:5173)...
start "Knowlix AI Frontend" "%~dp0start-frontend.bat"

echo.
echo =========================================================
echo Both services are starting!
echo Open your browser at: http://localhost:5173
echo =========================================================
timeout /t 2 /nobreak >nul
start http://localhost:5173
