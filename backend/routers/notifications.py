from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import get_db, Notification, User, Student, Parent
from backend.auth import get_current_user, require_role

router = APIRouter(prefix="/notifications", tags=["notifications"])

class SendNotificationRequest(BaseModel):
    user_id: int
    message: str
    category: str = "general"

@router.get("/")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notes = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(30).all()
    return notes

@router.post("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == 0
    ).update({Notification.is_read: 1}, synchronize_session=False)
    db.commit()
    return {"message": "Notifications marked as read"}

@router.put("/{notif_id}/read")
@router.post("/{notif_id}/read")
def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if n:
        n.is_read = 1
        db.commit()
    return {"message": "Marked as read"}

@router.post("/send")
def staff_send_notification(req: SendNotificationRequest, db: Session = Depends(get_db), _=Depends(require_role("staff"))):
    n = Notification(user_id=req.user_id, message=req.message, category=req.category)
    db.add(n)
    
    # Also notify parent if user is student
    student = db.query(Student).filter(Student.user_id == req.user_id).first()
    if student and student.parent_email:
        parent = db.query(Parent).join(User).filter(User.email == student.parent_email).first()
        if parent:
            db.add(Notification(user_id=parent.user_id, message=f"📌 Faculty Message regarding {student.user.name}: {req.message}", category=req.category))

    db.commit()
    return {"message": "Notification sent successfully"}

