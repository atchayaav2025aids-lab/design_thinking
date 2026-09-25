from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db, Grade, Student, User, Notification, Parent
from auth import get_current_user, require_role

router = APIRouter(prefix="/grades", tags=["grades"])

class GradeCreate(BaseModel):
    student_id: int
    subject: str
    marks: float
    max_marks: float = 100.0
    exam_type: str = "Internal 1"  # Internal 1 | Internal 2 | Lab Test | Assignment
    semester: int = 4

class BatchGradeItem(BaseModel):
    student_id: int
    marks: Optional[float] = None

class BatchGradeRequest(BaseModel):
    subject: str
    exam_type: str = "Internal 1"  # Internal 1 | Internal 2 | Lab Test | Assignment
    max_marks: float = 100.0
    department: str = "Artificial Intelligence & Data Science"
    year: str = "II"
    section: str = "A"
    semester: int = 4
    items: List[BatchGradeItem]

VALID_EXAM_TYPES = ["Internal 1", "Internal 2", "Lab Test", "Assignment"]

def get_student_for_user(user: User, db: Session):
    if user.role == "student":
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if not student:
            student = Student(user_id=user.id, roll_number=f"21AI{user.id:03d}")
            db.add(student)
            db.commit()
            db.refresh(student)
        return student
    elif user.role == "parent":
        parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        if parent and parent.student_email:
            st_user = db.query(User).filter(User.email == parent.student_email).first()
            if st_user:
                return db.query(Student).filter(Student.user_id == st_user.id).first()
        return None
    return None

@router.post("/")
def add_grade(data: GradeCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("staff"))):
    if data.exam_type not in VALID_EXAM_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid exam_type. Must be one of: {', '.join(VALID_EXAM_TYPES)}")
    
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing = db.query(Grade).filter(
        Grade.student_id == data.student_id,
        Grade.subject == data.subject,
        Grade.exam_type == data.exam_type
    ).first()

    if existing:
        existing.marks = data.marks
        existing.max_marks = data.max_marks
        existing.semester = data.semester
        grade = existing
    else:
        grade = Grade(
            student_id=data.student_id,
            subject=data.subject,
            marks=data.marks,
            max_marks=data.max_marks,
            exam_type=data.exam_type,
            semester=data.semester
        )
        db.add(grade)
    
    pct = round((data.marks / data.max_marks) * 100, 1) if data.max_marks > 0 else 0
    msg = f"📝 Marks Updated: {data.subject} ({data.exam_type}) - {data.marks}/{data.max_marks} ({pct}%)"
    db.add(Notification(user_id=student.user_id, message=msg, category="marks"))

    if student.parent_email:
        parent = db.query(Parent).join(User).filter(User.email == student.parent_email).first()
        if parent:
            db.add(Notification(user_id=parent.user_id, message=f"📝 Marks Notification: {student.user.name}'s marks for {data.subject} ({data.exam_type}) have been published: {pct}%.", category="marks"))

    db.commit()
    db.refresh(grade)
    return {"message": "Grade saved successfully", "grade": grade, "pct": pct}

@router.get("/class")
def get_class_grades(subject: str = "Data Science", exam_type: str = "Internal 1", department: str = "Artificial Intelligence & Data Science", year: str = "II", section: str = "A", db: Session = Depends(get_db), _=Depends(require_role("staff"))):
    students = db.query(Student).filter(
        Student.department == department,
        Student.year == year,
        Student.section == section
    ).all()

    items = []
    entered_count = 0

    for st in students:
        existing = db.query(Grade).filter(
            Grade.student_id == st.id,
            Grade.subject == subject,
            Grade.exam_type == exam_type
        ).first()

        marks_val = existing.marks if existing else None
        max_marks_val = existing.max_marks if existing else 100.0

        if marks_val is not None:
            entered_count += 1

        items.append({
            "student_id": st.id,
            "roll_number": st.roll_number,
            "name": st.user.name if st.user else "Student",
            "marks": marks_val,
            "max_marks": max_marks_val,
            "status": "Saved" if marks_val is not None else "Not Entered"
        })

    return {
        "subject": subject,
        "exam_type": exam_type,
        "department": department,
        "year": year,
        "section": section,
        "total_students": len(students),
        "entered_count": entered_count,
        "pending_count": len(students) - entered_count,
        "max_marks": 100,
        "students": items
    }

@router.post("/batch")
def batch_save_grades(data: BatchGradeRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("staff"))):
    if data.exam_type not in VALID_EXAM_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid exam_type. Must be one of: {', '.join(VALID_EXAM_TYPES)}")

    saved_count = 0
    for item in data.items:
        if item.marks is None:
            continue

        student = db.query(Student).filter(Student.id == item.student_id).first()
        if not student:
            continue

        existing = db.query(Grade).filter(
            Grade.student_id == student.id,
            Grade.subject == data.subject,
            Grade.exam_type == data.exam_type
        ).first()

        if existing:
            existing.marks = item.marks
            existing.max_marks = data.max_marks
            existing.semester = data.semester
        else:
            g = Grade(
                student_id=student.id,
                subject=data.subject,
                marks=item.marks,
                max_marks=data.max_marks,
                exam_type=data.exam_type,
                semester=data.semester
            )
            db.add(g)

        pct = round((item.marks / data.max_marks) * 100, 1) if data.max_marks > 0 else 0
        msg = f"📝 Marks Published: {data.subject} ({data.exam_type}) - {item.marks}/{data.max_marks} ({pct}%)"
        db.add(Notification(user_id=student.user_id, message=msg, category="marks"))

        if student.parent_email:
            parent = db.query(Parent).join(User).filter(User.email == student.parent_email).first()
            if parent:
                db.add(Notification(user_id=parent.user_id, message=f"📝 Marks Published: {student.user.name}'s {data.subject} ({data.exam_type}) mark is {pct}%.", category="marks"))

        saved_count += 1

    db.commit()
    return {"message": f"Successfully saved and published marks for {saved_count} student(s)", "saved_count": saved_count}

@router.get("/student/{student_id}")
def get_grades(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "parent":
        linked_student = get_student_for_user(current_user, db)
        if not linked_student or linked_student.id != student.id:
            raise HTTPException(status_code=403, detail="Access denied")
    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    return grades

@router.get("/my")
def my_grades(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    grades = db.query(Grade).filter(Grade.student_id == student.id).all()
    by_subject = {}
    for g in grades:
        by_subject.setdefault(g.subject, []).append({
            "id": g.id,
            "marks": g.marks,
            "max_marks": g.max_marks,
            "exam_type": g.exam_type,
            "semester": g.semester,
            "pct": round((g.marks / g.max_marks) * 100, 1) if g.max_marks > 0 else 0
        })
    return {"grades": grades, "by_subject": by_subject}

@router.delete("/{grade_id}")
def delete_grade(grade_id: int, db: Session = Depends(get_db), _=Depends(require_role("staff"))):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    db.delete(grade)
    db.commit()
    return {"message": "Grade deleted"}
