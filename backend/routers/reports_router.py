from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from database import get_db, Student, Attendance, AssessmentAttempt, Grade, WeeklyReport, Parent, User, Notification
from auth import get_current_user, require_role

router = APIRouter(prefix="/reports", tags=["reports"])

def generate_student_recommendations(student: Student, att_pct: float, quiz_avg: float, grade_avg: float, missed_labs: int):
    tips = []
    
    if att_pct < 80.0:
        tips.append("⚠️ Critical Attendance: Your attendance is currently below 80%. Prioritize attending upcoming lectures to avoid exam debarment.")
    elif att_pct < 85.0:
        tips.append("📅 Attendance Watch: Your attendance is near 80%. Avoid taking unexcused leaves.")
    else:
        tips.append("✅ Great Job on Attendance: You are maintaining a healthy attendance above 85%.")

    if quiz_avg < 70.0:
        tips.append("💡 Learning Focus: Your average quiz score is below 70%. Practice daily scenario-based assessments in your selected domains.")
    else:
        tips.append("🚀 Strong Domain Aptitude: Keep challenging yourself with Industry-level problem sets.")

    if grade_avg < 75.0:
        tips.append("📚 Academic Target: Allocate extra review time for core subjects before upcoming Internal 2 exams.")

    if missed_labs > 0:
        tips.append(f"🔬 Lab Notice: You have missed {missed_labs} lab session(s). Contact your subject instructor to schedule make-up sessions.")

    return tips

def calculate_overall_progress_score(att_pct: float, quiz_avg: float, grade_avg: float):
    att_weight = min(100.0, att_pct) * 0.35
    quiz_weight = min(100.0, quiz_avg) * 0.40
    grade_weight = min(100.0, grade_avg) * 0.25
    
    score = round(att_weight + quiz_weight + grade_weight, 1)
    return min(100.0, max(0.0, score))

from routers.attendance import calculate_student_attendance, get_student_for_user

@router.get("/weekly")
def get_weekly_report(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "staff":
        raise HTTPException(status_code=403, detail="Weekly reports are student-specific")
    else:
        student = get_student_for_user(current_user, db)

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    att_info = calculate_student_attendance(student, db)
    att_pct = att_info["percentage"]

    quiz_attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == student.id).all()
    quiz_avg = round(sum(q.percentage for q in quiz_attempts) / len(quiz_attempts), 1) if quiz_attempts else 0.0

    grades = db.query(Grade).filter(Grade.student_id == student.id).all()
    grade_avg = round(sum((g.marks / g.max_marks * 100) for g in grades) / len(grades), 1) if grades else 0.0

    overall_score = calculate_overall_progress_score(att_pct, quiz_avg, grade_avg)
    recommendations = generate_student_recommendations(student, att_pct, quiz_avg, grade_avg, att_info["missed_labs"])

    week_label = f"Week of {datetime.utcnow().strftime('%b %d, %Y')}"

    return {
        "student_name": student.user.name if student.user else "Student",
        "roll_number": student.roll_number,
        "department": student.department,
        "week_label": week_label,
        "attendance": {
            "percentage": att_pct,
            "present_hours": att_info["present_hours"],
            "absent_hours": att_info["absent_hours"],
            "leave_count": att_info["leave_count"],
            "missed_labs": att_info["missed_labs"]
        },
        "learning": {
            "assessments_completed": len(quiz_attempts),
            "assessments_skipped": 0,
            "avg_quiz_score": quiz_avg
        },
        "academics": {
            "average_marks_pct": grade_avg,
            "total_subjects": len(grades)
        },
        "overall_progress_score": overall_score,
        "recommendations": recommendations
    }

@router.get("/progress/trends")
def get_domain_progress_trends(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "staff":
        raise HTTPException(status_code=403, detail="Progress trends are student-specific")

    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    attempts = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == student.id
    ).order_by(AssessmentAttempt.date, AssessmentAttempt.id).all()
    grouped = {}
    for attempt in attempts:
        grouped.setdefault(attempt.domain, []).append(attempt.percentage)

    return {
        domain: [
            {"week": f"Week {index}", "score": round(score, 1)}
            for index, score in enumerate(scores, start=1)
        ]
        for domain, scores in grouped.items()
    }

@router.get("/class")
def get_class_report(department: str = "Artificial Intelligence & Data Science", year: str = "II", section: str = "A", db: Session = Depends(get_db), _=Depends(require_role("staff"))):
    students = db.query(Student).filter(
        Student.department == department,
        Student.year == year,
        Student.section == section
    ).all()

    total_students = len(students)
    if total_students == 0:
        return {
            "total_students": 0,
            "class_avg_attendance": 0.0,
            "class_avg_marks": 0.0,
            "low_attendance_students": [],
            "subject_attendance": [],
            "subject_performance": []
        }

    att_pcts = []
    grade_pcts = []
    low_att_list = []

    for st in students:
        att_info = calculate_student_attendance(st, db)
        att_pcts.append(att_info["percentage"])
        if att_info["percentage"] < 80.0:
            low_att_list.append({
                "id": st.id,
                "roll_number": st.roll_number,
                "name": st.user.name if st.user else "Student",
                "attendance_pct": att_info["percentage"]
            })

        st_grades = db.query(Grade).filter(Grade.student_id == st.id).all()
        if st_grades:
            avg_g = sum((g.marks / g.max_marks * 100) for g in st_grades if g.max_marks > 0) / len(st_grades)
            grade_pcts.append(avg_g)

    class_avg_att = round(sum(att_pcts) / total_students, 1) if att_pcts else 0.0
    class_avg_marks = round(sum(grade_pcts) / len(grade_pcts), 1) if grade_pcts else 0.0

    # Subject-wise attendance breakdown
    default_subjects = ["Data Science", "Machine Learning", "Python Programming", "Database Management", "Web Development"]
    subj_att_list = []
    subj_perf_list = []

    for subj in default_subjects:
        all_att = db.query(Attendance).filter(
            Attendance.subject == subj,
            Attendance.student_id.in_([s.id for s in students])
        ).all()
        if all_att:
            present_c = sum(1 for a in all_att if a.status == "present")
            s_att_pct = round((present_c / len(all_att)) * 100, 1)
        else:
            s_att_pct = class_avg_att or 85.0

        all_g = db.query(Grade).filter(
            Grade.subject == subj,
            Grade.student_id.in_([s.id for s in students])
        ).all()
        if all_g:
            s_perf = round(sum((g.marks / g.max_marks * 100) for g in all_g if g.max_marks > 0) / len(all_g), 1)
        else:
            s_perf = class_avg_marks or 78.0

        subj_att_list.append({"subject": subj, "attendance": s_att_pct})
        subj_perf_list.append({"subject": subj, "performance": s_perf})

    return {
        "total_students": total_students,
        "class_avg_attendance": class_avg_att,
        "class_avg_marks": class_avg_marks,
        "low_attendance_students": low_att_list,
        "subject_attendance": subj_att_list,
        "subject_performance": subj_perf_list
    }
