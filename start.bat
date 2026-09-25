@echo off
echo Starting Student Success Ecosystem...
echo.
echo [1/2] Starting FastAPI backend on port 8000...
start "Backend - Student Success" cmd /k "cd /d C:\Users\HP\OneDrive\Desktop\student_success_ecosystem\backend && python main.py"
timeout /t 4 >nul
echo [2/2] Starting React frontend on port 5173...
start "Frontend - Student Success" cmd /k "cd /d C:\Users\HP\OneDrive\Desktop\student_success_ecosystem\frontend && npm run dev"
echo.
echo ✅ Both servers are starting...
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:5173
echo    API Docs: http://localhost:8000/docs
echo.
pause
