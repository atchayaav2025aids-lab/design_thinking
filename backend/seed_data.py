import json
from datetime import datetime, timedelta
from database import SessionLocal, User, Student, Staff, Parent, Grade, Attendance, Domain, Question, AssessmentAttempt, Notification

SAMPLE_QUESTIONS = [
    # Data Science
    {
        "domain": "Data Science", "topic": "Feature Engineering", "difficulty": "Industry",
        "question": "In a high-dimensional financial dataset with severe multicollinearity among 50 risk metrics, which feature selection technique guarantees zero correlation among transformed components while maximizing variance?",
        "option_a": "L1 (Lasso) Regularization",
        "option_b": "Principal Component Analysis (PCA)",
        "option_c": "Recursive Feature Elimination (RFE)",
        "option_d": "Mutual Information Gain",
        "correct": "b",
        "explanation": "PCA projects data onto orthogonal principal components, completely eliminating linear correlation between features while preserving maximum variance."
    },
    {
        "domain": "Data Science", "topic": "Data Preprocessing", "difficulty": "Intermediate",
        "question": "You have a streaming pipeline receiving missing values in a heavily skewed income feature. What is the most robust strategy to handle missingness without introducing data leakage or distortion?",
        "option_a": "Impute with global mean computed across full dataset",
        "option_b": "Impute with median calculated strictly on training split or dynamic rolling median window",
        "option_c": "Drop all rows containing missing values",
        "option_d": "Fill missing values with 0",
        "correct": "b",
        "explanation": "Median is robust against extreme skewness, and calculating statistics strictly on training/rolling windows prevents data leakage."
    },
    {
        "domain": "Data Science", "topic": "Model Evaluation", "difficulty": "Industry",
        "question": "A fraud detection model has 99.9% accuracy but misses 80% of fraudulent transactions. Which metric pair should you primary optimize for in production?",
        "option_a": "Accuracy and Specificity",
        "option_b": "Precision and Recall (F1-Score / PR-AUC)",
        "option_c": "Mean Absolute Error and R-squared",
        "option_d": "ROC-AUC alone without thresholding",
        "correct": "b",
        "explanation": "In imbalanced fraud detection, Precision (avoiding false alarms) and Recall (catching true fraud) via PR-AUC are the primary metrics."
    },
    {
        "domain": "Data Science", "topic": "Pandas & SQL", "difficulty": "Intermediate",
        "question": "What is the memory-efficient Pandas operation equivalent to SQL 'SELECT dept, AVG(salary) FROM emp GROUP BY dept HAVING AVG(salary) > 50000'?",
        "option_a": "df.groupby('dept')['salary'].mean().query('salary > 50000')",
        "option_b": "df.groupby('dept').filter(lambda x: x['salary'].mean() > 50000).groupby('dept')['salary'].mean()",
        "option_c": "df[df['salary'] > 50000].groupby('dept')['salary'].mean()",
        "option_d": "df.pivot_table(index='dept', values='salary', aggfunc='mean')",
        "correct": "b",
        "explanation": "filter() applies the HAVING group constraint before or during aggregation, matching SQL HAVING behavior."
    },
    {
        "domain": "Data Science", "topic": "Statistics & Hypothesis Testing", "difficulty": "Advanced",
        "question": "When testing if a new AI recommendation engine increases student quiz completion rate vs control, which statistical test is appropriate for comparing two independent categorical proportion rates?",
        "option_a": "Paired Student's t-test",
        "option_b": "Two-sample Z-test for Proportions / Chi-Square Test of Independence",
        "option_c": "One-way ANOVA",
        "option_d": "Mann-Whitney U Test",
        "correct": "b",
        "explanation": "Chi-Square Test or Two-sample Z-test for proportions compares binary conversion rates (completed vs not) between two independent cohorts."
    },

    # Machine Learning
    {
        "domain": "Machine Learning", "topic": "Ensemble Methods", "difficulty": "Industry",
        "question": "Why does Gradient Boosted Decision Trees (XGBoost/LightGBM) often outperform Random Forest on structured tabular benchmarking datasets?",
        "option_a": "Trees are built independently in parallel in XGBoost",
        "option_b": "Gradient Boosting builds trees sequentially to fit the residual errors of prior trees",
        "option_c": "Random Forest uses higher learning rates than XGBoost",
        "option_d": "Gradient Boosting only works with linear boundary separation",
        "correct": "b",
        "explanation": "Boosting minimizes objective loss by sequentially training new weak learners on negative gradients (residuals) of previous iterations."
    },
    {
        "domain": "Machine Learning", "topic": "Neural Networks & Deep Learning", "difficulty": "Advanced",
        "question": "What phenomenon occurs during deep neural network training when gradients vanish near initial layers, and how does Residual Connections (ResNet) resolve it?",
        "option_a": "Weights blow up to infinity; ResNet clips gradients",
        "option_b": "Gradients approach zero due to repeated chain rule multiplications; ResNet provides skip connections allowing identity gradient flow",
        "option_c": "Loss oscillates randomly; ResNet adds L2 penalty",
        "option_d": "Neurons freeze permanently; ResNet replaces ReLU with Sigmoid",
        "correct": "b",
        "explanation": "Identity shortcut connections (y = f(x) + x) allow gradients to pass backward directly without shrinking through layer multiplications."
    },
    {
        "domain": "Machine Learning", "topic": "Overfitting & Regularization", "difficulty": "Intermediate",
        "question": "A Random Forest model exhibits 100% accuracy on training data but 62% on validation. Which hyperparameter adjustment will BEST reduce overfitting?",
        "option_a": "Increase max_depth and min_samples_split",
        "option_b": "Decrease max_depth and increase min_samples_leaf / n_estimators",
        "option_c": "Set n_estimators = 1",
        "option_d": "Disable bootstrap sampling",
        "correct": "b",
        "explanation": "Constraining tree depth (max_depth) and requiring more samples per leaf node prevents individual trees from memorizing training noise."
    },

    # Artificial Intelligence
    {
        "domain": "Artificial Intelligence", "topic": "NLP & Transformers", "difficulty": "Industry",
        "question": "In the Transformer architecture (Attention Is All You Need), why is Scaled Dot-Product Self-Attention divided by sqrt(d_k)?",
        "option_a": "To reduce matrix multiplication computational complexity",
        "option_b": "To prevent large dot products from pushing the softmax function into regions with extremely small gradients",
        "option_c": "To convert token embeddings into integer indices",
        "option_d": "To enforce positional order without recurrent cells",
        "correct": "b",
        "explanation": "For large vector dimensions d_k, dot products grow large in magnitude, causing softmax to yield vanishing gradients; scaling by sqrt(d_k) stabilizes training."
    },
    {
        "domain": "Artificial Intelligence", "topic": "Generative AI & LLMs", "difficulty": "Advanced",
        "question": "What is the key mechanism in Retrieval-Augmented Generation (RAG) that prevents LLM hallucination when querying proprietary enterprise documents?",
        "option_a": "Fine-tuning the LLM weight matrices daily",
        "option_b": "Converting text chunks into vector embeddings, querying a Vector DB for top-k semantic context, and passing context in prompt",
        "option_c": "Increasing temperature parameter to 1.5",
        "option_d": "Using regex matching on raw SQL tables",
        "correct": "b",
        "explanation": "RAG fetches relevant factual contexts from a Vector Database (using cosine similarity on embeddings) and injects them directly into the LLM system prompt."
    },

    # Python
    {
        "domain": "Python", "topic": "Concurrency & Memory", "difficulty": "Advanced",
        "question": "In CPython, what is the Global Interpreter Lock (GIL) and how should CPU-bound tasks be executed to achieve true multi-core utilization?",
        "option_a": "GIL locks files; use asyncio for CPU tasks",
        "option_b": "GIL prevents multi-threading memory corruption by executing one bytecode instruction at a time; use multiprocessing or C-extensions",
        "option_c": "GIL is a garbage collector; use threading module",
        "option_d": "GIL only affects I/O bound tasks; threads utilize all CPU cores automatically",
        "correct": "b",
        "explanation": "The GIL restricts execution to a single thread per Python process; CPU-heavy computations require multiprocessing to spawn separate OS processes with independent GILs."
    },
    {
        "domain": "Python", "topic": "Decorators & Generators", "difficulty": "Intermediate",
        "question": "What is the memory footprint advantage of yielding items from a generator function using 'yield' versus returning a constructed list?",
        "option_a": "Generators execute 10x faster than lists",
        "option_b": "Generators evaluate lazily one element at a time (O(1) memory), avoiding allocation of the full list in RAM (O(N) memory)",
        "option_c": "Generators compress data automatically using gzip",
        "option_d": "Lists cannot store string data types",
        "correct": "b",
        "explanation": "Yielding generates values on-the-fly via iterator protocol, maintaining O(1) state memory regardless of dataset size."
    },

    # Java
    {
        "domain": "Java", "topic": "JVM & Memory Management", "difficulty": "Industry",
        "question": "Which JVM Garbage Collector is optimized for low-latency microservices with multi-gigabyte heaps by partitioning the heap into regions and operating concurrently without long Stop-The-World pauses?",
        "option_a": "Serial GC",
        "option_b": "Parallel GC",
        "option_c": "G1 GC / ZGC / Shenandoah",
        "option_d": "CMS (Concurrent Mark Sweep - Deprecated)",
        "correct": "c",
        "explanation": "G1 GC and modern ZGC partition the heap into dynamic regions and achieve sub-millisecond concurrent GC pause targets."
    },

    # Web Development
    {
        "domain": "Web Development", "topic": "React State & Virtual DOM", "difficulty": "Intermediate",
        "question": "In React 18+, why should asynchronous state updates depending on prior state always use the functional update form (e.g., setCount(prev => prev + 1))?",
        "option_a": "Functional updates bypass the virtual DOM reconciliation",
        "option_b": "State updates are batched asynchronously, so referencing outer scope state variable may evaluate stale closures",
        "option_c": "Direct updates trigger memory leaks in useEffect",
        "option_d": "Functional updates convert state into local storage",
        "correct": "b",
        "explanation": "Functional state updates receive the guaranteed latest state value at execution time, preventing stale closure state bugs during batched updates."
    },

    # Cloud Computing
    {
        "domain": "Cloud Computing", "topic": "Kubernetes & Containers", "difficulty": "Industry",
        "question": "In Kubernetes microservices deployment, what is the role of an Ingress Controller combined with a Service of type ClusterIP?",
        "option_a": "ClusterIP exposes pods to public internet directly on port 80",
        "option_b": "Ingress Controller manages external HTTP/HTTPS routing, SSL termination, and routes traffic internally to private ClusterIP endpoints",
        "option_c": "Ingress Controller acts as a persistent database volume driver",
        "option_d": "ClusterIP builds Docker container images dynamically",
        "correct": "b",
        "explanation": "Ingress provides a single HTTP(S) entry point with routing rules and TLS termination, directing external traffic into internal ClusterIP services."
    },

    # DBMS
    {
        "domain": "DBMS", "topic": "Transactions & ACID", "difficulty": "Industry",
        "question": "Which SQL transaction isolation level prevents Phantom Reads by placing range locks on index records during queries?",
        "option_a": "Read Uncommitted",
        "option_b": "Read Committed",
        "option_c": "Repeatable Read",
        "option_d": "Serializable",
        "correct": "d",
        "explanation": "Serializable isolation guarantees full serial execution order and eliminates phantom reads by locking index key ranges."
    },

    # Cyber Security
    {
        "domain": "Cyber Security", "topic": "Application Security", "difficulty": "Industry",
        "question": "Which defense mechanism is most effective against SQL Injection (SQLi) vulnerabilities in REST APIs?",
        "option_a": "Filtering input string for single quotes on frontend",
        "option_b": "Using Parameterized Queries (Prepared Statements) or ORM query builders",
        "option_c": "Encrypting database disk using AES-256",
        "option_d": "Using Base64 encoding for URL parameters",
        "correct": "b",
        "explanation": "Prepared statements compile SQL command structure separately from data inputs, preventing user data from altering query execution logic."
    },

    # Generative AI
    {
        "domain": "Generative AI", "topic": "Model Alignment", "difficulty": "Advanced",
        "question": "What is the primary role of Reinforcement Learning from Human Feedback (RLHF) or Direct Preference Optimization (DPO) in modern LLM development?",
        "option_a": "To teach the model basic grammar and syntax",
        "option_b": "To align model output with human preferences for helpfulness, accuracy, and safety",
        "option_c": "To compress model weights for edge deployment",
        "option_d": "To extract tabular data into JSON format",
        "correct": "b",
        "explanation": "RLHF/DPO tunes pre-trained base models so their responses adhere to human intent, safety guidelines, and tone preferences."
    }
]

import os
from database import SessionLocal, User, Student, Staff, Parent, Grade, Attendance, Domain, Question, AssessmentAttempt, Notification, init_db, engine, Base

def seed_database():
    # Ensure fresh table schemas
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Users if empty or missing default accounts
        existing_users = db.query(User).all()
        user_emails = {u.email: u for u in existing_users}

        # Demo Accounts
        accounts = [
            {"name": "Alex Mercer", "email": "student@college.edu", "role": "student"},
            {"name": "Prof. Sarah Vance", "email": "staff@college.edu", "role": "staff"},
            {"name": "Robert Mercer", "email": "parent@college.edu", "role": "parent"}
        ]

        for acc in accounts:
            if acc["email"] not in user_emails:
                u = User(name=acc["name"], email=acc["email"], role=acc["role"])
                db.add(u)
                db.flush()
                user_emails[acc["email"]] = u

        db.commit()

        # 2. Seed Student profile
        student_user = user_emails["student@college.edu"]
        student = db.query(Student).filter(Student.user_id == student_user.id).first()
        if not student:
            student = Student(
                user_id=student_user.id,
                roll_number="21AI042",
                department="Artificial Intelligence & Data Science",
                year="II",
                section="A",
                semester=4,
                parent_email="parent@college.edu",
                total_working_hours=0,
                present_hours=0,
                absent_hours=0,
                missed_labs=0,
                leave_count=0
            )
            db.add(student)
            db.flush()
        
        # Seed Staff profile
        staff_user = user_emails["staff@college.edu"]
        staff = db.query(Staff).filter(Staff.user_id == staff_user.id).first()
        if not staff:
            staff = Staff(user_id=staff_user.id, department="Artificial Intelligence & Data Science")
            db.add(staff)
            db.flush()

        # Seed Parent profile
        parent_user = user_emails["parent@college.edu"]
        parent = db.query(Parent).filter(Parent.user_id == parent_user.id).first()
        if not parent:
            parent = Parent(user_id=parent_user.id, student_email="student@college.edu")
            db.add(parent)
            db.flush()

        db.commit()

        # 3. Seed Grades if none exist
        if db.query(Grade).filter(Grade.student_id == student.id).count() == 0:
            grades_data = [
                {"subject": "Data Science", "marks": 88.0, "max_marks": 100.0, "exam_type": "Internal 1"},
                {"subject": "Machine Learning", "marks": 82.5, "max_marks": 100.0, "exam_type": "Internal 1"},
                {"subject": "Python Programming", "marks": 94.0, "max_marks": 100.0, "exam_type": "Lab Test"},
                {"subject": "Database Management", "marks": 78.0, "max_marks": 100.0, "exam_type": "Internal 1"},
                {"subject": "Web Development", "marks": 91.0, "max_marks": 100.0, "exam_type": "Assignment"}
            ]
            for g in grades_data:
                db.add(Grade(student_id=student.id, subject=g["subject"], marks=g["marks"], max_marks=g["max_marks"], exam_type=g["exam_type"]))
            db.commit()

        # 4. Seed Attendance records if none exist
        if db.query(Attendance).filter(Attendance.student_id == student.id).count() == 0:
            subjects = ["Data Science", "Machine Learning", "Python Programming", "Database Management"]
            today = datetime.utcnow()
            for i in range(15):
                d_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
                status = "present" if i % 6 != 0 else "absent"
                is_lab = i % 4 == 0
                db.add(Attendance(
                    student_id=student.id,
                    subject=subjects[i % len(subjects)],
                    date=d_str,
                    time="09:30 AM",
                    status=status,
                    attendance_method="CAMERA_VERIFIED" if status == "present" else "MANUAL",
                    verification_status="VERIFIED" if status == "present" else "FAILED",
                    is_lab=is_lab
                ))
            db.commit()

        # 5. Seed Student Interested Domains
        if db.query(Domain).filter(Domain.student_id == student.id).count() == 0:
            for d_name in ["Data Science", "Artificial Intelligence", "Python"]:
                db.add(Domain(student_id=student.id, name=d_name))
            db.commit()

        # 6. Seed Question Bank
        if db.query(Question).count() == 0:
            for q_data in SAMPLE_QUESTIONS:
                db.add(Question(**q_data))
            db.commit()

        # 7. Seed Sample Quiz Attempt
        if db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == student.id).count() == 0:
            db.add(AssessmentAttempt(
                student_id=student.id,
                domain="Data Science",
                difficulty="Industry",
                score=4,
                total=5,
                percentage=80.0,
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                time_taken=320
            ))
            db.commit()

        # 8. Seed Sample Notification
        if db.query(Notification).filter(Notification.user_id == student_user.id).count() == 0:
            db.add(Notification(
                user_id=student_user.id,
                message="🎉 Welcome to Intelligent Student Success Platform! Your profile and domains are active.",
                category="system"
            ))
            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
    print("Database successfully seeded with demo accounts and question bank.")
