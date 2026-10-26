@echo off
title Knowlix AI - Backend Server (FastAPI)
echo ===================================================
echo Starting Knowlix AI Backend Server on Port 8000...
echo ===================================================
set PATH=C:\Program Files\nodejs;C:\Users\shubh\anaconda3;C:\Users\shubh\anaconda3\Scripts;%PATH%
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
