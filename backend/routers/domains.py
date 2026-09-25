from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db, Domain, Question, AssessmentAttempt, Student, User
from auth import get_current_user
from datetime import datetime


router = APIRouter(prefix="/domains", tags=["domains"])

DOMAIN_QUESTIONS = {
    "Python": [
        {"q": "Which keyword is used to define a function in Python?", "a": "func", "b": "def", "c": "define", "d": "function", "ans": "b"},
        {"q": "What is the output of print(type([]))?", "a": "<class 'tuple'>", "b": "<class 'dict'>", "c": "<class 'list'>", "d": "<class 'set'>", "ans": "c"},
        {"q": "Which method adds an element to a list?", "a": "add()", "b": "insert()", "c": "append()", "d": "push()", "ans": "c"},
        {"q": "What does len() return?", "a": "Last element", "b": "Length of object", "c": "Type of object", "d": "Sum of elements", "ans": "b"},
        {"q": "Which of these is a mutable data type?", "a": "tuple", "b": "string", "c": "list", "d": "int", "ans": "c"},
    ],
    "Machine Learning": [
        {"q": "Which algorithm is used for classification?", "a": "K-Means", "b": "Linear Regression", "c": "Random Forest", "d": "PCA", "ans": "c"},
        {"q": "What does overfitting mean?", "a": "Model performs well on test data", "b": "Model memorizes training data", "c": "Model has low variance", "d": "Model is too simple", "ans": "b"},
        {"q": "Which metric is used for regression?", "a": "Accuracy", "b": "F1 Score", "c": "RMSE", "d": "Precision", "ans": "c"},
        {"q": "What is a training set?", "a": "Data used to evaluate model", "b": "Data used to train model", "c": "Data used for deployment", "d": "Raw unprocessed data", "ans": "b"},
        {"q": "Which technique reduces overfitting?", "a": "Adding more features", "b": "Increasing model complexity", "c": "Regularization", "d": "Removing test data", "ans": "c"},
    ],
    "Data Science": [
        {"q": "Which library is used for data manipulation in Python?", "a": "NumPy", "b": "Pandas", "c": "Matplotlib", "d": "Scikit-learn", "ans": "b"},
        {"q": "What does EDA stand for?", "a": "Exploratory Data Analysis", "b": "Extended Data Algorithm", "c": "External Data Access", "d": "Evaluated Data Approach", "ans": "a"},
        {"q": "Which chart is best for showing distribution?", "a": "Pie chart", "b": "Line chart", "c": "Histogram", "d": "Scatter plot", "ans": "c"},
        {"q": "What is a null value?", "a": "Zero value", "b": "Missing value", "c": "Negative value", "d": "String value", "ans": "b"},
        {"q": "Which function fills missing values in Pandas?", "a": "dropna()", "b": "fillna()", "c": "replace()", "d": "clean()", "ans": "b"},
    ],
    "Web Development": [
        {"q": "What does HTML stand for?", "a": "Hyper Text Markup Language", "b": "High Tech Modern Language", "c": "Hyper Transfer Markup Logic", "d": "Home Tool Markup Language", "ans": "a"},
        {"q": "Which CSS property changes text color?", "a": "font-color", "b": "text-color", "c": "color", "d": "foreground", "ans": "c"},
        {"q": "What is React?", "a": "Backend framework", "b": "Database", "c": "Frontend JavaScript library", "d": "CSS framework", "ans": "c"},
        {"q": "Which HTTP method is used to send data?", "a": "GET", "b": "POST", "c": "DELETE", "d": "HEAD", "ans": "b"},
        {"q": "What does API stand for?", "a": "Application Programming Interface", "b": "Automated Program Integration", "c": "Applied Protocol Interface", "d": "Advanced Programming Index", "ans": "a"},
    ],
    "Artificial Intelligence": [
        {"q": "What is a neural network inspired by?", "a": "Computer circuits", "b": "Human brain", "c": "Database systems", "d": "File systems", "ans": "b"},
        {"q": "What does NLP stand for?", "a": "Natural Language Processing", "b": "Neural Learning Protocol", "c": "Network Layer Processing", "d": "Numeric Logic Programming", "ans": "a"},
        {"q": "Which is a type of supervised learning?", "a": "Clustering", "b": "Dimensionality Reduction", "c": "Classification", "d": "Association", "ans": "c"},
        {"q": "What is a chatbot?", "a": "A robot", "b": "An AI program that simulates conversation", "c": "A database", "d": "A web server", "ans": "b"},
        {"q": "What is reinforcement learning?", "a": "Learning from labeled data", "b": "Learning by reward and punishment", "c": "Learning without data", "d": "Learning from images", "ans": "b"},
    ],
    "Cloud Computing": [
        {"q": "What does AWS stand for?", "a": "Advanced Web Services", "b": "Amazon Web Services", "c": "Automated Web Systems", "d": "Applied Web Software", "ans": "b"},
        {"q": "What is IaaS?", "a": "Internet as a Service", "b": "Infrastructure as a Service", "c": "Integration as a Service", "d": "Intelligence as a Service", "ans": "b"},
        {"q": "Which is a cloud storage service?", "a": "GitHub", "b": "Google Drive", "c": "VS Code", "d": "Linux", "ans": "b"},
        {"q": "What is serverless computing?", "a": "Computing without internet", "b": "Running code without managing servers", "c": "Offline computing", "d": "Local computing", "ans": "b"},
        {"q": "What does SaaS mean?", "a": "Software as a Service", "b": "System as a Service", "c": "Storage as a Service", "d": "Security as a Service", "ans": "a"},
    ],
}

AVAILABLE_DOMAINS_DETAILED = [
    {
        "name": "Data Science",
        "icon": "📊",
        "description": "Data analysis, pandas, statistics, SQL, visualization, predictive modeling & EDA"
    },
    {
        "name": "Artificial Intelligence",
        "icon": "🧠",
        "description": "Neural networks, natural language processing, computer vision, AI systems & deep learning"
    },
    {
        "name": "Machine Learning",
        "icon": "🤖",
        "description": "Supervised & unsupervised algorithms, regression, decision trees, ensemble models & regularization"
    },
    {
        "name": "Python",
        "icon": "🐍",
        "description": "Core Python programming, data structures, OOP, file handling, modules & built-in functions"
    },
    {
        "name": "Java",
        "icon": "☕",
        "description": "Object-oriented programming, collections framework, multithreading, exceptions & JVM architecture"
    },
    {
        "name": "DBMS",
        "icon": "🗄️",
        "description": "Relational databases, SQL queries, normalization, ACID transactions, indexing & join operations"
    },
    {
        "name": "Web Development",
        "icon": "🌐",
        "description": "HTML5, CSS3, JavaScript ES6+, React, DOM manipulation, state management & responsive UI design"
    },
    {
        "name": "Full Stack Development",
        "icon": "💻",
        "description": "End-to-end web applications, frontend UI, RESTful APIs, backend architecture, databases & auth"
    },
    {
        "name": "Cloud Computing",
        "icon": "☁️",
        "description": "AWS, Azure, serverless architecture, IaaS, SaaS, microservices & cloud security"
    },
    {
        "name": "Cyber Security",
        "icon": "🛡️",
        "description": "Network security, cryptography, vulnerability assessment, ethical hacking & threat detection"
    },
    {
        "name": "Generative AI",
        "icon": "✨",
        "description": "LLMs, Transformers, prompt engineering, RAG pipelines, fine-tuning & AI agents"
    }
]

AVAILABLE_DOMAINS = [d["name"] for d in AVAILABLE_DOMAINS_DETAILED]

class DomainAdd(BaseModel):
    name: str

class SaveDomainsRequest(BaseModel):
    domains: List[str]

class SubmitAssessment(BaseModel):
    domain: str
    answers: List[str]
    time_taken: int = 0

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
        from database import Parent
        parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        if parent and parent.student_email:
            st_user = db.query(User).filter(User.email == parent.student_email).first()
            if st_user:
                return db.query(Student).filter(Student.user_id == st_user.id).first()
        return None
    return None

@router.get("/available")
def get_available_domains():
    return AVAILABLE_DOMAINS_DETAILED

@router.get("/my")
def my_domains(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    domains = db.query(Domain).filter(Domain.student_id == student.id).all()
    if not domains:
        default_names = ["Data Science", "Artificial Intelligence", "Python", "Machine Learning"]
        for d_name in default_names:
            d_obj = Domain(student_id=student.id, name=d_name)
            db.add(d_obj)
        db.commit()
        domains = db.query(Domain).filter(Domain.student_id == student.id).all()

    return [{"id": d.id, "name": d.name} for d in domains]

@router.post("/my/save")
def save_my_domains(req: SaveDomainsRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.query(Domain).filter(Domain.student_id == student.id).delete()
    db.commit()

    for d_name in req.domains:
        db.add(Domain(student_id=student.id, name=d_name))
    db.commit()
    
    saved = db.query(Domain).filter(Domain.student_id == student.id).all()
    return {"message": "Selected domains saved successfully", "domains": [{"id": d.id, "name": d.name} for d in saved]}


@router.post("/my")
def add_domain(data: DomainAdd, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    existing = db.query(Domain).filter(Domain.student_id == student.id, Domain.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Domain already added")
    domain = Domain(student_id=student.id, name=data.name)
    db.add(domain)
    db.commit()
    return {"message": "Domain added"}

@router.delete("/my/{domain_id}")
def remove_domain(domain_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    domain = db.query(Domain).filter(Domain.id == domain_id, Domain.student_id == student.id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    db.delete(domain)
    db.commit()
    return {"message": "Domain removed"}

@router.get("/questions/{domain}")
def get_questions(domain: str):
    questions = DOMAIN_QUESTIONS.get(domain)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions for this domain")
    return [{"id": i, "question": q["q"], "options": {"a": q["a"], "b": q["b"], "c": q["c"], "d": q["d"]}} for i, q in enumerate(questions)]

@router.post("/submit")
def submit_assessment(data: SubmitAssessment, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    questions = DOMAIN_QUESTIONS.get(data.domain)
    if not questions:
        raise HTTPException(status_code=404, detail="Domain not found")
    score = sum(1 for i, ans in enumerate(data.answers) if i < len(questions) and ans == questions[i]["ans"])
    total = len(questions)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    attempt = AssessmentAttempt(
        student_id=student.id, domain=data.domain,
        score=score, total=total, date=today, time_taken=data.time_taken
    )
    db.add(attempt)
    db.commit()
    correct_answers = [q["ans"] for q in questions]
    return {
        "score": score, "total": total,
        "percentage": round(score / total * 100, 1),
        "correct_answers": correct_answers,
        "your_answers": data.answers,
        "time_taken": data.time_taken
    }

@router.get("/attempts")
def my_attempts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == student.id).order_by(AssessmentAttempt.created_at.desc()).all()
    by_domain = {}
    for a in attempts:
        by_domain.setdefault(a.domain, []).append({"score": a.score, "total": a.total, "date": a.date, "pct": round(a.score/a.total*100,1) if a.total > 0 else 0})
    avg_by_domain = {d: round(sum(x["pct"] for x in v) / len(v), 1) for d, v in by_domain.items()}
    overall_avg = round(sum(avg_by_domain.values()) / len(avg_by_domain), 1) if avg_by_domain else 0
    return {
        "attempts": [{"id": a.id, "domain": a.domain, "score": a.score, "total": a.total, "date": a.date, "pct": round(a.score/a.total*100,1) if a.total > 0 else 0} for a in attempts],
        "by_domain": avg_by_domain,
        "overall_avg": overall_avg,
        "total_attempts": len(attempts)
    }
