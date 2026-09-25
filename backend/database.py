from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./student_success.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False)  # student | staff | parent
    password = Column(String, nullable=True)
    otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    otp_attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    roll_number = Column(String, unique=True)
    department = Column(String, default="Artificial Intelligence & Data Science")
    year = Column(String, default="II")
    section = Column(String, default="A")
    semester = Column(Integer, default=4)
    parent_email = Column(String, nullable=True)
    total_working_hours = Column(Integer, default=0)
    present_hours = Column(Integer, default=0)
    absent_hours = Column(Integer, default=0)
    missed_labs = Column(Integer, default=0)
    leave_count = Column(Integer, default=0)
    face_encoding = Column(Text, nullable=True) # JSON string representation for face descriptor

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.total_working_hours is None:
            self.total_working_hours = 0
        if self.present_hours is None:
            self.present_hours = 0
        if self.absent_hours is None:
            self.absent_hours = 0
        if self.missed_labs is None:
            self.missed_labs = 0
        if self.leave_count is None:
            self.leave_count = 0

    user = relationship("User")
    grades = relationship("Grade", back_populates="student")
    attendance = relationship("Attendance", back_populates="student")

class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    department = Column(String, default="Artificial Intelligence & Data Science")
    user = relationship("User")

class Parent(Base):
    __tablename__ = "parents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    student_email = Column(String, nullable=True)
    user = relationship("User")

class Grade(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject = Column(String)
    marks = Column(Float)
    max_marks = Column(Float, default=100)
    exam_type = Column(String, default="Internal 1")  # Internal 1, Internal 2, Lab Test, Assignment
    semester = Column(Integer, default=4)
    date = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    student = relationship("Student", back_populates="grades")

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"))
    subject = Column(String)
    department = Column(String)
    year = Column(String)
    section = Column(String)
    hour = Column(Integer, default=1)
    date = Column(String)
    start_time = Column(String)
    end_time = Column(String)
    duration_minutes = Column(Integer, default=15)
    session_code = Column(String, nullable=True, index=True)
    expires_at = Column(DateTime, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE | CLOSED | EXPIRED
    created_at = Column(DateTime, default=datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    attendance_session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=True)
    subject = Column(String)
    date = Column(String)
    hour = Column(Integer, default=1)
    time = Column(String, nullable=True)
    status = Column(String)  # present | absent | leave
    attendance_method = Column(String, default="MANUAL")  # MANUAL | SESSION_CODE
    verification_status = Column(String, default="VERIFIED")  # VERIFIED | FAILED
    is_lab = Column(Boolean, default=False)
    student = relationship("Student", back_populates="attendance")

class Domain(Base):
    __tablename__ = "domains"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    name = Column(String)
    added_at = Column(DateTime, default=datetime.utcnow)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True)
    topic = Column(String)
    difficulty = Column(String, default="Intermediate")  # Beginner | Intermediate | Advanced | Industry
    question = Column(Text, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct = Column(String, nullable=False)  # a | b | c | d
    explanation = Column(Text, nullable=True)

class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    domain = Column(String)
    difficulty = Column(String, default="Industry")
    score = Column(Integer)
    total = Column(Integer)
    percentage = Column(Float)
    date = Column(String)
    time_taken = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class AssessmentAttemptQuestion(Base):
    __tablename__ = "assessment_attempt_questions"
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("assessment_attempts.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_option = Column(String)
    is_correct = Column(Boolean)

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    week_label = Column(String)
    attendance_pct = Column(Float)
    present_hours = Column(Integer)
    absent_hours = Column(Integer)
    leave_count = Column(Integer)
    missed_labs = Column(Integer)
    assessments_completed = Column(Integer)
    assessments_skipped = Column(Integer)
    avg_quiz_score = Column(Float)
    overall_progress_score = Column(Float)
    recommendations_json = Column(Text)  # JSON list of text tips
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text)
    category = Column(String, default="general") # attendance | marks | quiz | system
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(attendance)").fetchall()}
        if "hour" not in columns:
            connection.exec_driver_sql("ALTER TABLE attendance ADD COLUMN hour INTEGER DEFAULT 1")
        session_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(attendance_sessions)").fetchall()}
        if "hour" not in session_columns:
            connection.exec_driver_sql("ALTER TABLE attendance_sessions ADD COLUMN hour INTEGER DEFAULT 1")
        if "session_code" not in session_columns:
            connection.exec_driver_sql("ALTER TABLE attendance_sessions ADD COLUMN session_code VARCHAR(10)")
        if "expires_at" not in session_columns:
            connection.exec_driver_sql("ALTER TABLE attendance_sessions ADD COLUMN expires_at DATETIME")
        user_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()}
        if "password" not in user_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN password VARCHAR(255)")


