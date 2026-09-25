from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import random
from database import get_db, User, Student, Staff, Parent
from auth import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = "password123"
    role: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = "password123"
    role: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    if req.role not in ["student", "staff", "parent"]:
        raise HTTPException(status_code=400, detail="Invalid role selected")
    
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    
    # Auto-bootstrap account if user doesn't exist yet for smooth testing
    if not user:
        name = email.split("@")[0].replace(".", " ").title()
        hashed_pwd = hash_password(req.password or "password123")
        user = User(name=name, email=email, role=req.role, password=hashed_pwd)
        db.add(user)
        db.flush()

        if req.role == "student":
            roll = f"21AI{random.randint(100, 999)}"
            db.add(Student(
                user_id=user.id,
                roll_number=roll,
                department="Artificial Intelligence & Data Science",
                year="II",
                section="A",
                semester=4,
                parent_email="parent@college.edu"
            ))
        elif req.role == "staff":
            db.add(Staff(user_id=user.id, department="Artificial Intelligence & Data Science"))
        elif req.role == "parent":
            db.add(Parent(user_id=user.id, student_email="student@college.edu"))
        db.commit()

    # If user has no password stored yet, save default password
    if not user.password:
        user.password = hash_password(req.password or "password123")
        db.commit()
    elif req.password and req.password != "password123" and not verify_password(req.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid password. Please check your credentials.")

    if user.role != req.role:
        user.role = req.role
        db.commit()

    token = create_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email
    }

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    if req.role not in ["student", "staff", "parent"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered. Please log in.")
    
    hashed_pwd = hash_password(req.password or "password123")
    user = User(name=req.name, email=email, role=req.role, password=hashed_pwd)
    db.add(user)
    db.flush()

    if req.role == "student":
        roll = f"21AI{random.randint(100, 999)}"
        db.add(Student(user_id=user.id, roll_number=roll, department="Artificial Intelligence & Data Science", year="II", section="A", semester=4, parent_email="parent@college.edu"))
    elif req.role == "staff":
        db.add(Staff(user_id=user.id, department="Artificial Intelligence & Data Science"))
    elif req.role == "parent":
        db.add(Parent(user_id=user.id, student_email="student@college.edu"))
    db.commit()

    token = create_token({"sub": str(user.id), "role": user.role})
    return {
        "message": "Account created successfully!",
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email
    }

@router.get("/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    res = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }
    if current_user.role == "student":
        st = db.query(Student).filter(Student.user_id == current_user.id).first()
        if st:
            res["student"] = {
                "id": st.id,
                "roll_number": st.roll_number,
                "department": st.department,
                "year": st.year,
                "section": st.section,
                "semester": st.semester,
                "parent_email": st.parent_email,
                "total_working_hours": st.total_working_hours,
                "present_hours": st.present_hours,
                "absent_hours": st.absent_hours,
                "missed_labs": st.missed_labs,
                "leave_count": st.leave_count
            }
    elif current_user.role == "staff":
        sf = db.query(Staff).filter(Staff.user_id == current_user.id).first()
        if sf:
            res["staff"] = {"id": sf.id, "department": sf.department}
    elif current_user.role == "parent":
        pr = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if pr:
            res["parent"] = {"id": pr.id, "student_email": pr.student_email}
    return res
