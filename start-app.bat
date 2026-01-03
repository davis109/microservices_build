@echo off
echo ========================================
echo Starting Kontrol Application
echo ========================================
echo.

echo [1/4] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    pause
    exit /b 1
)

echo [2/4] Starting MongoDB...
echo Make sure MongoDB is running on localhost:27017
echo.

echo [3/4] Starting Backend Server...
start cmd /k "cd backend && npm start"
timeout /t 5 /nobreak >nul

echo [4/4] Starting Frontend Server...
start cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Application Starting!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:3000
