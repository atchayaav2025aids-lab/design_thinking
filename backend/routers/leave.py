from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import shutil, os

from backend.database import get_db, User, Student, Staff, Notification
from backend.auth import get_current_user, require_role
from backend.models_leave import LeaveApplication

router = APIRouter(prefix="/leave", tags=["leave"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "leave_docs")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── Helper ──────────────────────────────────────────────────────────────────

def _notify(db: Session, user_id: int, message: str, category: str = "leave"):
    db.add(Notification(user_id=user_id, message=message, category=category))


def _serialize(app: LeaveApplication, student_name: str = None, roll_number: str = None,
               department: str = None, year: str = None) -> dict:
    return {
        "id": app.id,
        "student_user_id": app.student_user_id,
        "student_name": student_name or app.student_name,
        "roll_number": roll_number or app.roll_number,
        "department": department or app.department,
        "year": year or app.year,
        "leave_type": app.leave_type,
        "from_date": app.from_date,
        "to_date": app.to_date,
        "num_days": app.num_days,
        "reason": app.reason,
        "document_path": app.document_path,
        "status": app.status,
        "remarks": app.remarks,
        "applied_at": app.applied_at.isoformat() if app.applied_at else None,
        "processed_at": app.processed_at.isoformat() if app.processed_at else None,
        "processed_by_name": app.processed_by_name,
    }


# ─── Student: Submit Leave ────────────────────────────────────────────────────

@router.post("/apply")
async def apply_leave(
    leave_type: str = Form(...),
    from_date: str = Form(...),
    to_date: str = Form(...),
    reason: str = Form(...),
    document: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can apply for leave.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    # Calculate number of days
    try:
        fd = datetime.strptime(from_date, "%Y-%m-%d").date()
        td = datetime.strptime(to_date, "%Y-%m-%d").date()
        if td < fd:
            raise HTTPException(status_code=400, detail="To date cannot be before From date.")
        num_days = (td - fd).days + 1
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Save document if uploaded
    doc_path = None
    if document and document.filename:
        safe_name = f"{current_user.id}_{int(datetime.utcnow().timestamp())}_{document.filename}"
        dest = os.path.join(UPLOAD_DIR, safe_name)
        with open(dest, "wb") as f:
            shutil.copyfileobj(document.file, f)
        doc_path = safe_name

    app = LeaveApplication(
        student_user_id=current_user.id,
        student_name=current_user.name,
        roll_number=student.roll_number,
        department=student.department,
        year=student.year,
        leave_type=leave_type,
        from_date=from_date,
        to_date=to_date,
        num_days=num_days,
        reason=reason,
        document_path=doc_path,
        status="Pending",
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Notify the student
    _notify(db, current_user.id,
            f"✅ Your leave application (ID #{app.id}) for {leave_type} from {from_date} to {to_date} has been submitted successfully.",
            "leave")

    # Notify all staff members about new leave application
    staff_users = db.query(Staff).all()
    for s in staff_users:
        _notify(db, s.user_id,
                f"📋 New leave application from {current_user.name} ({student.roll_number}) — {leave_type} [{from_date} → {to_date}].",
                "leave")

    db.commit()
    return {"message": "Leave application submitted successfully.", "application_id": app.id}


# ─── Student: My Applications ────────────────────────────────────────────────

@router.get("/my")
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their applications.")

    apps = (
        db.query(LeaveApplication)
        .filter(LeaveApplication.student_user_id == current_user.id)
        .order_by(LeaveApplication.applied_at.desc())
        .all()
    )
    return [_serialize(a) for a in apps]


# ─── Staff: All Applications ──────────────────────────────────────────────────

@router.get("/all")
def get_all_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "staff":
        raise HTTPException(status_code=403, detail="Only staff can view all leave applications.")

    query = db.query(LeaveApplication)

    if status and status.lower() != "all":
        query = query.filter(LeaveApplication.status == status)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (LeaveApplication.student_name.ilike(s)) |
            (LeaveApplication.roll_number.ilike(s))
        )

    apps = query.order_by(LeaveApplication.applied_at.desc()).all()
    return [_serialize(a) for a in apps]


# ─── Staff: Pending count ─────────────────────────────────────────────────────

@router.get("/pending-count")
def pending_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "staff":
        raise HTTPException(status_code=403, detail="Staff only.")
    count = db.query(LeaveApplication).filter(LeaveApplication.status == "Pending").count()
    return {"pending_count": count}


# ─── Staff: Approve / Reject ──────────────────────────────────────────────────

class ProcessLeaveRequest(BaseModel):
    action: str       # "Approved" | "Rejected"
    remarks: Optional[str] = ""


@router.post("/{app_id}/process")
def process_leave(
    app_id: int,
    req: ProcessLeaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "staff":
        raise HTTPException(status_code=403, detail="Only staff can approve or reject leave.")

    if req.action not in ("Approved", "Rejected"):
        raise HTTPException(status_code=400, detail="Action must be 'Approved' or 'Rejected'.")

    app = db.query(LeaveApplication).filter(LeaveApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Leave application not found.")

    if app.status != "Pending":
        raise HTTPException(status_code=409, detail=f"Application is already {app.status}. Cannot process again.")

    app.status = req.action
    app.remarks = req.remarks or ""
    app.processed_at = datetime.utcnow()
    app.processed_by_name = current_user.name
    db.commit()

    # Notify the student
    if req.action == "Approved":
        msg = (
            f"✅ Your leave application (ID #{app_id}) for {app.leave_type} "
            f"[{app.from_date} → {app.to_date}] has been APPROVED by {current_user.name}."
        )
        if req.remarks:
            msg += f" Remarks: {req.remarks}"
    else:
        msg = (
            f"❌ Your leave application (ID #{app_id}) for {app.leave_type} "
            f"[{app.from_date} → {app.to_date}] has been REJECTED by {current_user.name}."
        )
        if req.remarks:
            msg += f" Reason: {req.remarks}"

    _notify(db, app.student_user_id, msg, "leave")
    db.commit()

    return {"message": f"Leave application {req.action.lower()} successfully."}
