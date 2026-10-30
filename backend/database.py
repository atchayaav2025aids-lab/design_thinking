from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    DateTime,
    Text,
    Boolean,
    inspect
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os


# Database configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Use PostgreSQL on Render (Neon)
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1
    )

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )

else:
    # Use SQLite for local development
    DATABASE_URL = (
        f"sqlite:///{os.path.join(BASE_DIR, 'student_success.db').replace(os.sep, '/')}"
    )

    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False)
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
    department = Column(
        String,
        default="Artificial Intelligence & Data Science"
    )
    year = Column(String, default="II")
    section = Column(String, default="A")
    semester = Column(Integer, default=4)
    parent_email = Column(String, nullable=True)
    total_working_hours = Column(Integer, default=0)
    present_hours = Column(Integer, default=0)
    absent_hours = Column(Integer, default=0)
    missed_labs = Column(Integer, default=0)
    leave_count = Column(Integer, default=0)
    face_encoding = Column(Text, nullable=True)

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
    department = Column(
        String,
        default="Artificial Intelligence & Data Science"
    )

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
    exam_type = Column(String, default="Internal 1")
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
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    attendance_session_id = Column(
        Integer,
        ForeignKey("attendance_sessions.id"),
        nullable=True
    )
    subject = Column(String)
    date = Column(String)
    hour = Column(Integer, default=1)
    time = Column(String, nullable=True)
    status = Column(String)
    attendance_method = Column(String, default="MANUAL")
    verification_status = Column(String, default="VERIFIED")
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
    difficulty = Column(String, default="Intermediate")
    question = Column(Text, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct = Column(String, nullable=False)
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
    recommendations_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text)
    category = Column(String, default="general")
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def init_db():
    # Import leave model so its table is included in metadata
    from backend.models_leave import LeaveApplication

    # Create all missing tables
    Base.metadata.create_all(bind=engine)

    # Add missing columns for existing databases
    migrations = {
        "attendance": {
            "hour": "INTEGER DEFAULT 1"
        },
        "attendance_sessions": {
            "hour": "INTEGER DEFAULT 1",
            "session_code": "VARCHAR(10)",
            "expires_at": "TIMESTAMP"
        },
        "users": {
            "password": "VARCHAR(255)"
        }
    }

    with engine.begin() as connection:
        inspector = inspect(connection)

        for table, columns in migrations.items():

            existing_columns = {
                column["name"]
                for column in inspector.get_columns(table)
            }

            for column_name, column_type in columns.items():

                if column_name not in existing_columns:
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table} ADD COLUMN {column_name} {column_type}"
                    )
