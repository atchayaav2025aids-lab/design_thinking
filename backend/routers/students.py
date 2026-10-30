from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.database import get_db, Student, User, Grade, Attendance, AssessmentAttempt, Domain, Parent
from backend.auth import get_current_user, require_role

router = APIRouter(prefix="/students", tags=["students"])

class CreateStudentRequest(BaseModel):
    name: str
    email: str
    roll_number: str
    department: str = "Artificial Intelligence & Data Science"
    year: str = "II"
    section: str = "A"
    parent_email: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None

@router.post("/")
def create_student(data: CreateStudentRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("staff"))):
    email_clean = data.email.strip().lower()
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        student = db.query(Student).filter(Student.user_id == existing_user.id).first()
        if student:
            raise HTTPException(status_code=400, detail="Student with this email already exists.")
        user = existing_user
    else:
        user = User(name=data.name.strip(), email=email_clean, role="student")
        db.add(user)
        db.flush()

    student = Student(
        user_id=user.id,
        roll_number=data.roll_number.strip(),
        department=data.department,
        year=data.year,
        section=data.section,
        parent_email=data.parent_email.strip().lower() if data.parent_email else None,
        total_working_hours=0,
        present_hours=0,
        absent_hours=0,
        missed_labs=0,
        leave_count=0
    )
    db.add(student)
    db.flush()

    if data.parent_email:
        parent_email_clean = data.parent_email.strip().lower()
        parent_user = db.query(User).filter(User.email == parent_email_clean).first()
        if not parent_user:
            parent_user = User(name=f"Parent of {data.name}", email=parent_email_clean, role="parent")
            db.add(parent_user)
            db.flush()
        
        parent_rec = db.query(Parent).filter(Parent.user_id == parent_user.id).first()
        if not parent_rec:
            parent_rec = Parent(user_id=parent_user.id, student_email=email_clean)
            db.add(parent_rec)
        else:
            parent_rec.student_email = email_clean

    default_domains = ["Data Science", "Artificial Intelligence", "Python", "Machine Learning"]
    for d in default_domains:
        db.add(Domain(student_id=student.id, name=d))

    db.commit()
    db.refresh(student)
    return {
        "message": f"Student '{data.name}' created successfully!",
        "student": {
            "id": student.id,
            "name": user.name,
            "email": user.email,
            "roll_number": student.roll_number,
            "department": student.department,
            "year": student.year,
            "section": student.section,
            "parent_email": student.parent_email
        }
    }

def calc_success_score(att_pct, avg_marks, avg_assessment, domains_count):
    att_score = min(att_pct, 100) * 0.25
    marks_score = min(avg_marks, 100) * 0.30
    assess_score = min(avg_assessment, 100) * 0.25
    domain_score = min(domains_count * 10, 100) * 0.20
    return round(att_score + marks_score + assess_score + domain_score, 1)

@router.get("/me")
def my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    grades = db.query(Grade).filter(Grade.student_id == student.id).all()
    attendance = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == student.id).all()
    domains = db.query(Domain).filter(Domain.student_id == student.id).all()

    total_att = len(attendance)
    present = sum(1 for a in attendance if a.status == "present")
    att_pct = round(present / total_att * 100, 1) if total_att > 0 else 0

    avg_marks = round(sum(g.marks / g.max_marks * 100 for g in grades) / len(grades), 1) if grades else 0
    avg_assess = round(sum(a.score / a.total * 100 for a in attempts if a.total > 0) / len(attempts), 1) if attempts else 0

    labs = [a for a in attendance if a.is_lab]
    missed_labs = sum(1 for a in labs if a.status == "absent")
    present_hours = present
    absent_hours = total_att - present

    success_score = calc_success_score(att_pct, avg_marks, avg_assess, len(domains))

    return {
        "id": student.id,
        "roll_number": student.roll_number,
        "department": student.department,
        "semester": student.semester,
        "name": current_user.name,
        "email": current_user.email,
        "parent_email": student.parent_email,
        "attendance_pct": att_pct,
        "present_hours": present_hours,
        "absent_hours": absent_hours,
        "missed_labs": missed_labs,
        "avg_marks": avg_marks,
        "avg_assessment": avg_assess,
        "success_score": success_score,
        "domains_count": len(domains)
    }

@router.get("/")
def list_students(db: Session = Depends(get_db), _=Depends(require_role("staff"))):
    students = db.query(Student).all()
    result = []
    for s in students:
        grades = db.query(Grade).filter(Grade.student_id == s.id).all()
        attendance = db.query(Attendance).filter(Attendance.student_id == s.id).all()
        attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == s.id).all()
        domains = db.query(Domain).filter(Domain.student_id == s.id).all()
        total_att = len(attendance)
        present = sum(1 for a in attendance if a.status == "present")
        att_pct = round(present / total_att * 100, 1) if total_att > 0 else 0
        avg_marks = round(sum(g.marks / g.max_marks * 100 for g in grades) / len(grades), 1) if grades else 0
        avg_assess = round(sum(a.score / a.total * 100 for a in attempts if a.total > 0) / len(attempts), 1) if attempts else 0
        risk = "low"
        if att_pct < 75 or avg_marks < 40:
            risk = "high"
        elif att_pct < 80 or avg_marks < 60:
            risk = "medium"
        result.append({
            "id": s.id, "roll_number": s.roll_number, "department": s.department,
            "semester": s.semester, "name": s.user.name, "email": s.user.email,
            "parent_email": s.parent_email, "attendance_pct": att_pct,
            "avg_marks": avg_marks, "avg_assessment": avg_assess,
            "success_score": calc_success_score(att_pct, avg_marks, avg_assess, len(domains)),
            "risk": risk
        })
    return result

@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "parent":
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent or parent.student_email != student.user.email:
            raise HTTPException(status_code=403, detail="Access denied")
    grades = db.query(Grade).filter(Grade.student_id == student.id).all()
    attendance = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == student.id).all()
    domains = db.query(Domain).filter(Domain.student_id == student.id).all()
    total_att = len(attendance)
    present = sum(1 for a in attendance if a.status == "present")
    att_pct = round(present / total_att * 100, 1) if total_att > 0 else 0
    avg_marks = round(sum(g.marks / g.max_marks * 100 for g in grades) / len(grades), 1) if grades else 0
    avg_assess = round(sum(a.score / a.total * 100 for a in attempts if a.total > 0) / len(attempts), 1) if attempts else 0
    missed_labs = sum(1 for a in attendance if a.is_lab and a.status == "absent")
    return {
        "id": student.id, "roll_number": student.roll_number, "department": student.department,
        "semester": student.semester, "name": student.user.name, "email": student.user.email,
        "parent_email": student.parent_email, "attendance_pct": att_pct,
        "present_hours": present, "absent_hours": total_att - present,
        "missed_labs": missed_labs, "avg_marks": avg_marks, "avg_assessment": avg_assess,
        "success_score": calc_success_score(att_pct, avg_marks, avg_assess, len(domains)),
        "domains": [{"id": d.id, "name": d.name} for d in domains]
    }
