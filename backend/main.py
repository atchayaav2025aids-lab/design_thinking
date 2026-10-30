from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routers import auth_router, students, grades, attendance, prediction, notifications, domains, quiz_router, reports_router, leave
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Student Success Ecosystem API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(students.router)
app.include_router(grades.router)
app.include_router(attendance.router)
app.include_router(prediction.router)
app.include_router(notifications.router)
app.include_router(domains.router)
app.include_router(quiz_router.router)
app.include_router(reports_router.router)
app.include_router(leave.router)

@app.get("/")
def root():
    return {"message": "Intelligent Student Success Ecosystem API v2.0 is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

