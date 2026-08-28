# Farm2Home PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Green
Write-Host "             Starting Farm2Home Servers                 " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend in a new window
Write-Host "[1/2] Launching Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\backend'; python -m uvicorn app.main:app --port 8000 --reload"

Start-Sleep -Seconds 2

# Start Frontend in a new window
Write-Host "[2/2] Launching Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\frontend'; npm run dev"

Write-Host "`nAll servers started in separate terminal windows!" -ForegroundColor Green
Write-Host "Backend API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "Frontend App:     http://localhost:5173" -ForegroundColor Cyan
