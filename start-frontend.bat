@echo off
title Knowlix AI - Frontend Server (Vite)
echo ===================================================
echo Starting Knowlix AI Frontend on Port 5173...
echo ===================================================
set PATH=C:\Program Files\nodejs;C:\Users\shubh\anaconda3;C:\Users\shubh\anaconda3\Scripts;%PATH%
cd /d "%~dp0frontend"
npm run dev -- --host 127.0.0.1 --port 5173
pause
