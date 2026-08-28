@echo off
title Farm2Home Launcher
echo ========================================================
echo               Starting Farm2Home Servers
echo ========================================================
echo.

echo [1/2] Launching Backend API Server on http://127.0.0.1:8000 ...
start "Farm2Home Backend (FastAPI)" cmd /k "cd /d %~dp0farm2home\backend && python -m uvicorn app.main:app --port 8000 --reload"

timeout /t 2 >nul

echo [2/2] Launching Frontend Web App on http://localhost:5173 ...
start "Farm2Home Frontend (Vite)" cmd /k "cd /d %~dp0farm2home\frontend && npm run dev"

echo.
echo ========================================================
echo All servers launched in separate terminal windows!
echo Backend Docs: http://127.0.0.1:8000/docs
echo Frontend App: http://localhost:5173
echo ========================================================
