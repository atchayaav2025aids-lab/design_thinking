"""
Separate module to hold the LeaveApplication ORM model,
imported by both database.py (for init_db) and leave.py router.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from backend.database import Base

class LeaveApplication(Base):
    __tablename__ = "leave_applications"

    id                 = Column(Integer, primary_key=True, index=True)
    student_user_id    = Column(Integer, nullable=False, index=True)
    student_name       = Column(String, nullable=False)
    roll_number        = Column(String, nullable=False)
    department         = Column(String, nullable=False)
    year               = Column(String, nullable=False)
    leave_type         = Column(String, nullable=False)   # Medical | Personal | Family Function | Emergency | Other
    from_date          = Column(String, nullable=False)   # YYYY-MM-DD
    to_date            = Column(String, nullable=False)
    num_days           = Column(Integer, nullable=False)
    reason             = Column(Text, nullable=False)
    document_path      = Column(String, nullable=True)    # filename inside uploads/leave_docs/
    status             = Column(String, default="Pending") # Pending | Approved | Rejected
    remarks            = Column(Text, nullable=True)
    applied_at         = Column(DateTime, default=datetime.utcnow)
    processed_at       = Column(DateTime, nullable=True)
    processed_by_name  = Column(String, nullable=True)
