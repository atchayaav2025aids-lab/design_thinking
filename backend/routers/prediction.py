from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Student, Grade, Attendance, User, Parent
from auth import get_current_user, require_role
from ml.predictor import predict_risk

router = APIRouter(prefix="/predict", tags=["prediction"])

@router.get("/{student_id}")
def get_prediction(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "parent":
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent or parent.student_email != student.user.email:
            raise HTTPException(status_code=403, detail="Access denied")

    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    attendance = db.query(Attendance).filter(Attendance.student_id == student_id).all()

    if not grades:
        return {"risk_level": "unknown", "message": "Not enough data for prediction"}

    avg_marks = sum(g.marks / g.max_marks * 100 for g in grades) / len(grades)
    total_att = len(attendance)
    present = sum(1 for a in attendance if a.status == "present")
    att_pct = (present / total_att * 100) if total_att > 0 else 0

    risk = predict_risk(avg_marks, att_pct)
    tips = []
    if avg_marks < 50:
        tips.append("Focus on weak subjects and seek extra help from staff.")
    if att_pct < 75:
        tips.append("Attendance is below 75%. Try to attend all classes.")
    if avg_marks >= 75 and att_pct >= 85:
        tips.append("Great performance! Keep it up.")

    return {
        "student_id": student_id,
        "avg_marks": round(avg_marks, 1),
        "attendance_pct": round(att_pct, 1),
        "risk_level": risk,
        "tips": tips
    }

@router.get("/my/prediction")
def my_prediction(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return get_prediction(student.id, db, current_user)
