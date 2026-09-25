from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import csv
import io
import random
import string
from datetime import datetime, timedelta
from database import get_db, Attendance, AttendanceSession, Student, Staff, User, Notification, Parent
from auth import get_current_user, require_role

router = APIRouter(prefix="/attendance", tags=["attendance"])

class CreateSessionRequest(BaseModel):
    subject: str
    department: str = "Artificial Intelligence & Data Science"
    year: str = "II"
    section: str = "A"
    hour: int = 1
    duration_minutes: int = 15

class VerifyCodeRequest(BaseModel):
    session_code: str

class AttendanceCreate(BaseModel):
    student_id: int
    subject: str
    date: str
    status: str
    hour: int = 1
    is_lab: bool = False

def generate_session_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

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

def calculate_student_attendance(student: Student, db: Session):
    records = db.query(Attendance).filter(Attendance.student_id == student.id).all() if db else []
    total_records = len(records)

    present_records = sum(1 for r in records if r.status == "present")
    absent_records = sum(1 for r in records if r.status == "absent")
    leave_records = sum(1 for r in records if r.status == "leave")

    labs = [r for r in records if r.is_lab or "lab" in (r.subject or "").lower()]
    labs_missed = sum(1 for r in labs if r.status == "absent")
    labs_present = sum(1 for r in labs if r.status == "present")

    total_hours = present_records + absent_records + leave_records
    present_hours = present_records
    absent_hours = absent_records + leave_records
    leave_count = leave_records

    pct = round((present_hours / total_hours) * 100, 1) if total_hours > 0 else 0.0

    return {
        "percentage": pct,
        "total_working_hours": total_hours,
        "present_hours": present_hours,
        "absent_hours": absent_hours,
        "labs_present": labs_present,
        "missed_labs": labs_missed,
        "leave_count": leave_count,
        "records_count": total_records,
        "present_records": present_records,
        "below_80": pct < 80.0
    }

def check_and_send_low_attendance_alert(student: Student, pct: float, db: Session):
    if pct < 80.0:
        msg = f"⚠️ Attendance Alert: {student.user.name}'s attendance is {pct}%, below the required 80%."
        existing_student_alert = db.query(Notification).filter(
            Notification.user_id == student.user_id,
            Notification.category == "attendance",
            Notification.is_read == 0
        ).first()
        
        if not existing_student_alert:
            db.add(Notification(user_id=student.user_id, message=msg, category="attendance"))
            staff_list = db.query(Staff).all()
            for sf in staff_list:
                db.add(Notification(user_id=sf.user_id, message=msg, category="attendance"))
            if student.parent_email:
                parent = db.query(Parent).join(User).filter(User.email == student.parent_email).first()
                if parent:
                    db.add(Notification(user_id=parent.user_id, message=f"⚠️ Attendance Warning: Your ward {student.user.name}'s attendance is {pct}%, below 80%.", category="attendance"))
            db.commit()

# --- ATTENDANCE SESSIONS (Staff Control & Session Code) ---

@router.post("/sessions/create")
def create_session(data: CreateSessionRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("staff"))):
    if data.hour < 1 or data.hour > 7:
        raise HTTPException(status_code=400, detail="Hour must be between 1 and 7")
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    # Close any existing active sessions by this staff
    active_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.staff_id == staff.id,
        AttendanceSession.status == "ACTIVE"
    ).all()
    for s in active_sessions:
        s.status = "CLOSED"
    
    code = generate_session_code()
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=data.duration_minutes)
    
    session = AttendanceSession(
        staff_id=staff.id,
        subject=data.subject,
        department=data.department,
        year=data.year,
        section=data.section,
        hour=data.hour,
        date=now.strftime("%Y-%m-%d"),
        start_time=now.strftime("%H:%M:%S"),
        end_time=expires_at.strftime("%H:%M:%S"),
        duration_minutes=data.duration_minutes,
        session_code=code,
        expires_at=expires_at,
        status="ACTIVE"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Notify students of active session code
    students_in_class = db.query(Student).filter(
        Student.department == data.department,
        Student.year == data.year,
        Student.section == data.section
    ).all()
    
    for st in students_in_class:
        db.add(Notification(
            user_id=st.user_id,
            message=f"🔑 Active Attendance Session Code: {code} for {data.subject} ({data.year}-{data.section}). Valid for {data.duration_minutes} mins!",
            category="attendance"
        ))
    db.commit()

    return {
        "message": "Attendance session created successfully",
        "session": {
            "id": session.id,
            "subject": session.subject,
            "department": session.department,
            "year": session.year,
            "section": session.section,
            "hour": session.hour,
            "session_code": session.session_code,
            "duration_minutes": session.duration_minutes,
            "status": session.status,
            "start_time": session.start_time,
            "end_time": session.end_time
        }
    }

@router.post("/sessions/{session_id}/stop")
def stop_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("staff"))):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    session.status = "CLOSED"
    db.commit()
    return {"message": "Attendance session closed"}

@router.get("/sessions/active")
def get_active_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    
    if current_user.role == "student":
        student = get_student_for_user(current_user, db)
        if not student:
            return {"active": False, "session": None}
        session = db.query(AttendanceSession).filter(
            AttendanceSession.status == "ACTIVE",
            AttendanceSession.department == student.department,
            AttendanceSession.year == student.year,
            AttendanceSession.section == student.section
        ).order_by(AttendanceSession.created_at.desc()).first()
    else:
        session = db.query(AttendanceSession).filter(AttendanceSession.status == "ACTIVE").order_by(AttendanceSession.created_at.desc()).first()
    
    if not session:
        return {"active": False, "session": None}
    
    if session.expires_at and now > session.expires_at:
        session.status = "EXPIRED"
        db.commit()
        return {"active": False, "session": None}

    created_at = session.created_at or now
    elapsed_seconds = (now - created_at).total_seconds()
    total_seconds = session.duration_minutes * 60
    remaining_seconds = max(0, int(total_seconds - elapsed_seconds))

    if remaining_seconds <= 0 and session.status == "ACTIVE":
        session.status = "EXPIRED"
        db.commit()
        return {"active": False, "session": None}

    marked_count = db.query(Attendance).filter(Attendance.attendance_session_id == session.id, Attendance.status == "present").count()
    total_class_students = db.query(Student).filter(
        Student.department == session.department,
        Student.year == session.year,
        Student.section == session.section
    ).count() or 45

    return {
        "active": True,
        "session": {
            "id": session.id,
            "subject": session.subject,
            "department": session.department,
            "year": session.year,
            "section": session.section,
            "hour": session.hour,
            "session_code": session.session_code,
            "date": session.date,
            "remaining_seconds": remaining_seconds,
            "marked_count": marked_count,
            "total_students": total_class_students
        }
    }

@router.post("/sessions/verify-code")
def verify_session_code(req: VerifyCodeRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    code_clean = req.session_code.strip().upper()
    session = db.query(AttendanceSession).filter(AttendanceSession.session_code == code_clean).first()
    if not session:
        raise HTTPException(status_code=400, detail="Invalid Session Code. Please check the code and try again.")
    
    now = datetime.utcnow()
    if session.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="This attendance session is no longer active.")
    if session.expires_at and now > session.expires_at:
        session.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="Attendance session has expired.")

    if session.department != student.department or session.year != student.year or session.section != student.section:
        raise HTTPException(status_code=400, detail="This attendance session is for a different class/section.")

    existing = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.attendance_session_id == session.id
    ).first()

    if existing:
        return {
            "success": True,
            "already_marked": True,
            "message": "Attendance has already been recorded for this session.",
            "subject": session.subject,
            "date": session.date
        }

    att_record = Attendance(
        student_id=student.id,
        staff_id=session.staff_id,
        attendance_session_id=session.id,
        subject=session.subject,
        date=session.date,
        hour=session.hour,
        time=now.strftime("%I:%M %p"),
        status="present",
        attendance_method="SESSION_CODE",
        verification_status="VERIFIED",
        is_lab="lab" in session.subject.lower()
    )
    db.add(att_record)
    db.commit()

    att_info = calculate_student_attendance(student, db)
    check_and_send_low_attendance_alert(student, att_info["percentage"], db)

    return {
        "success": True,
        "message": f"✅ Attendance Marked Successfully for {session.subject}",
        "subject": session.subject,
        "date": session.date,
        "time": now.strftime("%I:%M %p"),
        "method": "SESSION_CODE",
        "attendance_pct": att_info["percentage"]
    }

@router.get("/my")
def my_attendance(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    records = db.query(Attendance).filter(Attendance.student_id == student.id).order_by(Attendance.id.desc()).all()
    att_info = calculate_student_attendance(student, db)
    
    subject_map = {}
    for r in records:
        subj = r.subject
        if subj not in subject_map:
            subject_map[subj] = {"present": 0, "absent": 0, "leave": 0, "total": 0}
        subject_map[subj][r.status] = subject_map[subj].get(r.status, 0) + 1
        subject_map[subj]["total"] += 1
    
    for subj, data in subject_map.items():
        data["percentage"] = round((data["present"] / data["total"]) * 100, 1) if data["total"] > 0 else 0.0

    return {
        **att_info,
        "subject_breakdown": subject_map,
        "recent_records": [
            {
                "id": r.id,
                "subject": r.subject,
                "date": r.date,
                "time": r.time or "09:30 AM",
                "status": r.status,
                "method": r.attendance_method,
                "is_lab": r.is_lab
            } for r in records[:10]
        ]
    }

@router.get("/predict/leaves")
def predict_leave_impact(leaves: int = 1, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    att_info = calculate_student_attendance(student, db)
    current_present = att_info["present_hours"]
    current_total = att_info["total_working_hours"] or 1
    hours_per_day = 6

    additional_absent_hours = leaves * hours_per_day
    new_total = current_total + additional_absent_hours
    new_pct = round((current_present / new_total) * 100, 1) if new_total > 0 else 0.0
    current_pct = att_info["percentage"]
    
    warning = new_pct < 80.0
    
    return {
        "current_pct": current_pct,
        "additional_leaves": leaves,
        "predicted_pct": new_pct,
        "warning": warning,
        "message": f"If you take {leaves} more leave(s), your attendance will drop from {current_pct}% to {new_pct}%." + (" ⚠ This will trigger an Attendance Warning!" if warning else "")
    }

class ManualAttendanceItem(BaseModel):
    student_id: int
    subject: str
    date: str
    status: str  # present | absent | leave
    hour: int = 1
    is_lab: bool = False

class ManualAttendanceBatch(BaseModel):
    subject: str
    date: str
    department: str = "Artificial Intelligence & Data Science"
    year: str = "II"
    section: str = "A"
    hour: int = 1
    records: List[ManualAttendanceItem]

def get_active_session_for_class(data, db: Session):
    return db.query(AttendanceSession).filter(
        AttendanceSession.status == "ACTIVE",
        AttendanceSession.subject == data.subject,
        AttendanceSession.department == data.department,
        AttendanceSession.year == data.year,
        AttendanceSession.section == data.section,
        AttendanceSession.date == data.date
    ).first()

@router.post("/manual")
def record_manual_attendance(data: ManualAttendanceItem, db: Session = Depends(get_db), current_user: User = Depends(require_role("staff"))):
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()

    active_session = db.query(AttendanceSession).filter(
        AttendanceSession.status == "ACTIVE",
        AttendanceSession.subject == data.subject,
        AttendanceSession.date == data.date,
        AttendanceSession.department == student.department,
        AttendanceSession.year == student.year,
        AttendanceSession.section == student.section
    ).first()
    if active_session:
        raise HTTPException(status_code=409, detail="Students are currently marking attendance. Stop the session before using manual attendance.")

    existing = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.subject == data.subject,
        Attendance.date == data.date
    ).first()

    now = datetime.utcnow()
    if existing:
        existing.status = data.status
        existing.attendance_method = "MANUAL"
        existing.staff_id = staff.id if staff else None
    else:
        record = Attendance(
            student_id=student.id,
            staff_id=staff.id if staff else None,
            subject=data.subject,
            date=data.date,
            time=now.strftime("%I:%M %p"),
            status=data.status,
            attendance_method="MANUAL",
            verification_status="VERIFIED",
            is_lab=data.is_lab
        )
        db.add(record)

    db.commit()

    att_info = calculate_student_attendance(student, db)
    check_and_send_low_attendance_alert(student, att_info["percentage"], db)

    return {
        "message": f"Attendance recorded as {data.status.upper()} for {student.user.name}",
        "attendance_pct": att_info["percentage"]
    }

@router.post("/manual/batch")
def record_manual_attendance_batch(data: ManualAttendanceBatch, db: Session = Depends(get_db), current_user: User = Depends(require_role("staff"))):
    if not data.records:
        raise HTTPException(status_code=400, detail="No attendance changes to save")
    if data.hour < 1 or data.hour > 7:
        raise HTTPException(status_code=400, detail="Hour must be between 1 and 7")

    if get_active_session_for_class(data, db):
        raise HTTPException(status_code=409, detail="Students are currently marking attendance. Stop the session before saving manual attendance.")

    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    students = {}
    for item in data.records:
        if item.subject != data.subject or item.date != data.date or item.hour != data.hour:
            raise HTTPException(status_code=400, detail="Attendance record does not match the selected subject and date")
        if item.status not in {"present", "absent", "leave"}:
            raise HTTPException(status_code=400, detail="Invalid attendance status")
        student = db.query(Student).filter(
            Student.id == item.student_id,
            Student.department == data.department,
            Student.year == data.year,
            Student.section == data.section
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student {item.student_id} not found in the selected class")
        students[student.id] = student

    now = datetime.utcnow()
    for item in data.records:
        student = students[item.student_id]
        existing = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.subject == data.subject,
            Attendance.date == data.date,
            Attendance.hour == item.hour
        ).first()
        if existing:
            existing.status = item.status
            existing.attendance_method = "MANUAL"
            existing.verification_status = "VERIFIED"
            existing.staff_id = staff.id if staff else None
            existing.is_lab = item.is_lab
        else:
            db.add(Attendance(
                student_id=student.id,
                staff_id=staff.id if staff else None,
                subject=data.subject,
                date=data.date,
                hour=item.hour,
                time=now.strftime("%I:%M %p"),
                status=item.status,
                attendance_method="MANUAL",
                verification_status="VERIFIED",
                is_lab=item.is_lab
            ))

    db.commit()
    return {"message": f"Attendance saved for {len(data.records)} student(s)", "saved_count": len(data.records)}

@router.get("/class")
def get_class_attendance(department: str = "Artificial Intelligence & Data Science", year: str = "II", section: str = "A", subject: str = "Data Science", date: str = "", hour: int = 1, db: Session = Depends(get_db), _=Depends(require_role("staff"))):
    if not date:
        date = datetime.utcnow().strftime("%Y-%m-%d")

    students = db.query(Student).filter(
        Student.department == department,
        Student.year == year,
        Student.section == section
    ).all()

    result = []
    for st in students:
        att_rec = db.query(Attendance).filter(
            Attendance.student_id == st.id,
            Attendance.subject == subject,
            Attendance.date == date,
            Attendance.hour == hour
        ).first()

        att_info = calculate_student_attendance(st, db)

        result.append({
            "student_id": st.id,
            "roll_number": st.roll_number,
            "name": st.user.name if st.user else "Student",
            "email": st.user.email if st.user else "",
            "date": date,
            "hour": hour,
            "status": att_rec.status if att_rec else "not_recorded",
            "method": att_rec.attendance_method if att_rec else "N/A",
            "attendance_pct": att_info["percentage"],
            "present_hours": att_info["present_hours"],
            "absent_hours": att_info["absent_hours"],
            "total_working_hours": att_info["total_working_hours"]
        })

    return {
        "department": department,
        "year": year,
        "section": section,
        "subject": subject,
        "date": date,
        "hour": hour,
        "students": result
    }

@router.get("/class/report.csv")
def download_class_attendance_report(department: str = "Artificial Intelligence & Data Science", year: str = "II", section: str = "A", subject: str = "Data Science", date: str = "", hour: int = 1, db: Session = Depends(get_db), _=Depends(require_role("staff"))):
    roster = get_class_attendance(department, year, section, subject, date, hour, db, None)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll Number", "Student Name", "Email", "Subject", "Hour", "Date", "Status", "Method", "Attendance Percentage"])
    
    formatted_date = date
    try:
        if date:
            formatted_date = datetime.strptime(date, "%Y-%m-%d").strftime("%d/%m/%Y")
        else:
            formatted_date = datetime.utcnow().strftime("%d/%m/%Y")
    except Exception:
        formatted_date = date

    for student in roster["students"]:
        writer.writerow([
            student["roll_number"], student["name"], student["email"], roster["subject"], roster["hour"],
            formatted_date, student["status"], student["method"], student["attendance_pct"]
        ])
    output.seek(0)
    filename = f"attendance_{date or datetime.utcnow().strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
