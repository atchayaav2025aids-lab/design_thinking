# Student Success Ecosystem

A full-stack web app with **React + FastAPI + SQLite** for managing student performance across 3 roles.

## Roles
- **Student** — View grades, attendance, AI risk prediction
- **Staff** — Add grades, mark attendance, view all students
- **Parent** — View child's performance and risk level

## Tech Stack
- Frontend: React + Vite + Recharts
- Backend: FastAPI + SQLAlchemy + SQLite
- Auth: JWT (python-jose) + bcrypt (passlib)
- ML: Rule-based risk predictor (low / medium / high)

## Quick Start

Double-click `start.bat` OR run manually:

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register user |
| POST | /auth/login | Login |
| GET | /students/ | List all students (staff) |
| GET | /students/me | My profile (student) |
| POST | /grades/ | Add grade (staff) |
| GET | /grades/my | My grades (student) |
| POST | /attendance/ | Mark attendance (staff) |
| GET | /attendance/my | My attendance (student) |
| GET | /predict/{id} | Risk prediction |
| GET | /predict/my/prediction | My prediction (student) |
