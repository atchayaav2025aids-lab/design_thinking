from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import random
from datetime import datetime

from backend.database import get_db, Question, AssessmentAttempt, AssessmentAttemptQuestion, Student, Domain, User, Notification
from backend.auth import get_current_user

router = APIRouter(prefix="/quiz", tags=["quiz"])

class SubmitQuizRequest(BaseModel):
    domain: str
    difficulty: str = "Industry"
    time_taken: int = 0
    answers: List[dict]  # [{"question_id": int, "selected_option": "a"}]

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
        from backend.database import Parent
        parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        if parent and parent.student_email:
            st_user = db.query(User).filter(User.email == parent.student_email).first()
            if st_user:
                return db.query(Student).filter(Student.user_id == st_user.id).first()
        return None
    return None

# Dynamic scenario-based question pool covering all domains with rich industry questions
DYNAMIC_QUESTION_POOL = [
    # Data Science
    ("Data Science", "Feature Engineering", "Industry", "In a high-dimensional financial dataset with severe multicollinearity among 50 risk metrics, which feature selection technique guarantees zero correlation among transformed components while maximizing variance?", "Principal Component Analysis (PCA)", "L1 (Lasso) Regularization", "Recursive Feature Elimination (RFE)", "Mutual Information Gain", "a", "PCA projects data onto orthogonal principal components, completely eliminating linear correlation between features while preserving maximum variance."),
    ("Data Science", "Data Preprocessing", "Intermediate", "You have a streaming pipeline receiving missing values in a heavily skewed income feature. What is the most robust strategy to handle missingness without introducing data leakage?", "Impute with median calculated strictly on training split or dynamic rolling median window", "Impute with global mean computed across full dataset", "Drop all rows containing missing values", "Fill missing values with 0", "a", "Median is robust against extreme skewness, and calculating statistics strictly on training/rolling windows prevents data leakage."),
    ("Data Science", "Model Evaluation", "Industry", "A fraud detection model has 99.9% accuracy but misses 80% of fraudulent transactions. Which metric pair should you primary optimize for in production?", "Precision and Recall (F1-Score / PR-AUC)", "Accuracy and Specificity", "Mean Absolute Error and R-squared", "ROC-AUC alone without thresholding", "a", "In imbalanced fraud detection, Precision (avoiding false alarms) and Recall (catching true fraud) via PR-AUC are the primary metrics."),
    ("Data Science", "Pandas & SQL", "Intermediate", "What is the memory-efficient Pandas operation equivalent to SQL 'SELECT dept, AVG(salary) FROM emp GROUP BY dept HAVING AVG(salary) > 50000'?", "df.groupby('dept').filter(lambda x: x['salary'].mean() > 50000).groupby('dept')['salary'].mean()", "df.groupby('dept')['salary'].mean().query('salary > 50000')", "df[df['salary'] > 50000].groupby('dept')['salary'].mean()", "df.pivot_table(index='dept', values='salary', aggfunc='mean')", "a", "filter() applies the HAVING group constraint before or during aggregation, matching SQL HAVING behavior."),
    ("Data Science", "Statistics & Hypothesis Testing", "Advanced", "When testing if a new AI recommendation engine increases student quiz completion rate vs control, which statistical test is appropriate for comparing two independent categorical proportion rates?", "Two-sample Z-test for Proportions / Chi-Square Test of Independence", "Paired Student's t-test", "One-way ANOVA", "Mann-Whitney U Test", "a", "Chi-Square Test or Two-sample Z-test for proportions compares binary conversion rates between two independent cohorts."),
    ("Data Science", "Clustering Analysis", "Industry", "Which metric evaluates clustering quality by comparing intra-cluster distance to nearest neighbor cluster distance?", "Silhouette Score", "Elbow WCSS", "Adjusted Rand Index", "Davies-Bouldin Index", "a", "Silhouette Score measures how close each point is to points in its own cluster vs neighboring clusters."),
    ("Data Science", "Outlier Detection", "Advanced", "Which algorithm identifies anomalies by isolating observations via random binary partitioning trees?", "Isolation Forest", "Local Outlier Factor", "DBSCAN", "One-Class SVM", "a", "Isolation Forest isolates anomalies because outliers require fewer partition splits."),
    ("Data Science", "Sampling Methods", "Intermediate", "Which sampling method guarantees that rare sub-populations (e.g. minority demographic groups) are accurately represented in test samples?", "Stratified Random Sampling", "Simple Random Sampling", "Cluster Sampling", "Convenience Sampling", "a", "Stratified sampling divides populations into homogeneous subgroups (strata) before sampling."),
    ("Data Science", "Time Series Forecasting", "Industry", "Which time series component captures long-term non-periodic directional movement in historical data?", "Trend Component", "Seasonal Component", "Cyclical Component", "Irregular Noise", "a", "Trend represents long-term progression (upward or downward) over time."),
    ("Data Science", "Hyperparameter Optimization", "Advanced", "Which search technique constructs a probabilistic surrogate model of objective function to guide hyperparameter selection?", "Bayesian Optimization", "Grid Search", "Random Search", "Exhaustive Search", "a", "Bayesian optimization uses probabilistic surrogate models (e.g. Gaussian Processes) to sample high-promise regions."),
    ("Data Science", "Correlation & Causality", "Intermediate", "What statistical phenomenon describes a situation where a trend appears in several groups of data but disappears or reverses when groups are combined?", "Simpson's Paradox", "Confounding Bias", "Overfitting Paradox", "Correlation Fallacy", "a", "Simpson's Paradox occurs when confounding variables alter global aggregate relationships."),

    # Machine Learning & AI
    ("Machine Learning", "Ensemble Methods", "Industry", "Why does Gradient Boosted Decision Trees (XGBoost/LightGBM) often outperform Random Forest on structured tabular benchmarking datasets?", "Gradient Boosting builds trees sequentially to fit the residual errors of prior trees", "Trees are built independently in parallel in XGBoost", "Random Forest uses higher learning rates than XGBoost", "Gradient Boosting only works with linear boundary separation", "a", "Boosting minimizes objective loss by sequentially training new weak learners on negative gradients of previous iterations."),
    ("Machine Learning", "Neural Networks & Deep Learning", "Advanced", "What phenomenon occurs during deep neural network training when gradients vanish near initial layers, and how does Residual Connections (ResNet) resolve it?", "Gradients approach zero due to repeated chain rule multiplications; ResNet provides skip connections allowing identity gradient flow", "Weights blow up to infinity; ResNet clips gradients", "Loss oscillates randomly; ResNet adds L2 penalty", "Neurons freeze permanently; ResNet replaces ReLU with Sigmoid", "a", "Identity shortcut connections allow gradients to pass backward directly without shrinking through layer multiplications."),
    ("Machine Learning", "Overfitting & Regularization", "Intermediate", "A Random Forest model exhibits 100% accuracy on training data but 62% on validation. Which hyperparameter adjustment will BEST reduce overfitting?", "Decrease max_depth and increase min_samples_leaf / n_estimators", "Increase max_depth and min_samples_split", "Set n_estimators = 1", "Disable bootstrap sampling", "a", "Constraining tree depth and requiring more samples per leaf node prevents individual trees from memorizing training noise."),
    ("Machine Learning", "SVM Optimization", "Advanced", "In Support Vector Machines, what role does the soft-margin C hyperparameter play?", "Controls trade-off between maximizing margin width and minimizing training classification errors", "Determines polynomial degree", "Scales feature vectors between 0 and 1", "Sets learning rate for gradient descent", "a", "A higher C penalizes misclassifications heavily, forcing narrower margin boundaries."),
    ("Machine Learning", "Model Validation", "Intermediate", "When training on time-series sequential data, why is standard K-Fold cross validation inappropriate?", "It causes data leakage by using future data to predict past data", "It reduces computation speed", "It changes labels from numeric to categorical", "It requires equal number of features", "a", "Time-series validation must respect temporal order using rolling window splits."),
    ("Machine Learning", "Loss Functions", "Industry", "Which loss function is robust against extreme outlier target values compared to Mean Squared Error (MSE)?", "Huber Loss / Smooth L1 Loss", "MSE Loss", "Binary Cross Entropy", "Kullback-Leibler Divergence", "a", "Huber loss acts quadratically for small errors and linearly for large errors, bounding outlier impact."),
    ("Machine Learning", "Generative AI & LLMs", "Industry", "What is the function of the Vector Database in a Retrieval-Augmented Generation (RAG) system?", "Stores semantic embeddings of reference documents for fast similarity search during queries", "Fine-tunes base LLM model weights", "Executes SQL JOIN queries on JSON tables", "Generates synthetic training images", "a", "Vector DBs store embeddings to retrieve top matching document chunks given prompt queries."),
    ("Machine Learning", "Reinforcement Learning", "Advanced", "In Reinforcement Learning, what equation models optimal state-value functions through recursive decomposition?", "Bellman Equation", "Euler-Lagrange Equation", "Navier-Stokes Equation", "Schrödinger Equation", "a", "The Bellman equation decomposes value functions into immediate rewards plus discounted expected future values."),
    ("Machine Learning", "Model Deployment", "Industry", "Which model optimization technique converts float32 neural network weights to int8 without significant accuracy degradation?", "Quantization", "Pruning", "Knowledge Distillation", "Data Augmentation", "a", "Quantization reduces bit precision of weights to shrink memory footprint and accelerate inference."),
    ("Machine Learning", "Transformers & NLP", "Advanced", "In Transformer self-attention modules, why is scaled dot-product attention scaled by 1/sqrt(d_k)?", "Prevents large dot products from pushing softmax into regions with extremely small gradients", "Reduces computational memory complexity", "Converts tokens to integers", "Enforces positional order without recurrent cells", "a", "Scaling by sqrt(d_k) keeps dot product magnitude stable for high-dimensional vectors."),

    # Python & Programming
    ("Python", "CPython Internals", "Advanced", "What restricts CPython from executing multiple native threads concurrently on multi-core CPUs for CPU-bound tasks?", "Global Interpreter Lock (GIL)", "Garbage Collector", "Bytecode Compiler", "Virtual Memory Manager", "a", "The GIL prevents multi-threaded execution of Python bytecodes within a single CPython process."),
    ("Python", "Generators & Memory", "Intermediate", "What is the primary memory advantage of a Python Generator expression over a List Comprehension?", "Evaluates lazily producing values on-demand with O(1) memory usage", "Executes 10x faster", "Encrypts stored items", "Prevents duplicate items", "a", "Generators produce items dynamically via iterator protocol without storing full sequences in RAM."),
    ("Python", "Decorators", "Intermediate", "In Python, a function decorator is essentially a callable that receives what parameter and returns what output?", "Takes a function object and returns a modified wrapper function", "Takes a string and returns a class", "Takes a module and returns a dictionary", "Takes execution time and returns boolean", "a", "Decorators wrap function objects to extend functionality without modifying original implementation."),
    ("Python", "Context Managers", "Intermediate", "Which magic methods must a class implement to support the 'with' context manager statement?", "__enter__() and __exit__()", "__init__() and __del__()", "__start__() and __stop__()", "__open__() and __close__()", "a", "__enter__() initializes resources and __exit__() handles clean-up/closure."),
    ("Python", "Mutability & Arguments", "Advanced", "When passing a mutable object like a list as a default argument in a Python function definition, what occurs?", "The default list is instantiated ONCE at function definition time and shared across calls", "A new empty list is created every time the function is invoked", "Python throws a SyntaxError", "The argument is converted to a tuple", "a", "Default arguments are evaluated once at module load time, making mutable defaults persistent across calls."),
    ("Python", "Asyncio & Event Loop", "Advanced", "What is the purpose of the 'await' keyword in Python asynchronous programming?", "Yields control back to the event loop until the awaited coroutine completes", "Blocks the main thread synchronously", "Creates a new OS process", "Compiles code to C", "a", "'await' pauses execution of current coroutine, allowing event loop to run other tasks."),
    ("Python", "Garbage Collection", "Intermediate", "How does CPython primarily perform automatic memory management and object deallocation?", "Reference Counting combined with a cyclic garbage collector", "Mark and Sweep only", "Manual allocation", "Generational heap scanning only", "a", "CPython deallocates objects immediately when reference count reaches 0, using cyclic GC for self-referential loops."),
    ("Python", "Data Structures", "Intermediate", "What is the average time complexity of key lookup in a Python dictionary?", "O(1)", "O(N)", "O(log N)", "O(N^2)", "a", "Python dictionaries use hash tables, delivering O(1) average lookup time."),
    ("Python", "Dunder Methods", "Intermediate", "Which magic method allows an object instance to be called directly like a function (e.g., obj())?", "__call__()", "__invoke__()", "__run__()", "__exec__()", "a", "Implementing __call__() allows instance objects to be invoked as functions."),
    ("Python", "Itertools", "Intermediate", "Which function from the itertools module yields infinite repeated cycles of an input iterable?", "itertools.cycle()", "itertools.repeat()", "itertools.chain()", "itertools.count()", "a", "itertools.cycle() endlessly repeats elements of an input iterable.")
]

@router.get("/domains")
def get_quiz_domains(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_domains = db.query(Question.domain).distinct().all()
    domain_names = list(set([d[0] for d in all_domains if d[0]] + ["Data Science", "Machine Learning", "Python", "Artificial Intelligence"]))
    
    student_domains = []
    student = get_student_for_user(current_user, db)
    if student:
        s_domains = db.query(Domain).filter(Domain.student_id == student.id).all()
        student_domains = [sd.name for sd in s_domains]
            
    return {
        "all_domains": domain_names,
        "student_domains": student_domains
    }

@router.get("/generate/{domain}")
def generate_quiz(domain: str, limit: int = 10, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Enforce EXACTLY 10 questions per quiz as requested by user
    quiz_limit = 10

    # 1. Fetch DB Questions
    db_questions = db.query(Question).all()
    domain_db_q = [q for q in db_questions if q.domain.lower() == domain.lower()]
    if not domain_db_q:
        domain_db_q = db_questions

    # Convert DB questions to dict format
    candidate_pool = []
    for q in domain_db_q:
        candidate_pool.append({
            "id": q.id,
            "domain": q.domain,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "question": q.question,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "correct": q.correct,
            "explanation": q.explanation
        })

    # 2. Add Dynamic Question Pool items for domain
    dyn_idx = 1000
    for dom_name, topic, diff, q_text, opt_a, opt_b, opt_c, opt_d, corr, expl in DYNAMIC_QUESTION_POOL:
        if dom_name.lower() == domain.lower() or domain.lower() in dom_name.lower() or dom_name == "Data Science":
            dyn_idx += 1
            candidate_pool.append({
                "id": dyn_idx,
                "domain": domain,
                "topic": topic,
                "difficulty": diff,
                "question": q_text,
                "option_a": opt_a,
                "option_b": opt_b,
                "option_c": opt_c,
                "option_d": opt_d,
                "correct": corr,
                "explanation": expl
            })

    # 3. Ensure candidate pool has enough unique questions
    if len(candidate_pool) < quiz_limit:
        # Fill from full pool
        for dom_name, topic, diff, q_text, opt_a, opt_b, opt_c, opt_d, corr, expl in DYNAMIC_QUESTION_POOL:
            dyn_idx += 1
            candidate_pool.append({
                "id": dyn_idx,
                "domain": domain,
                "topic": topic,
                "difficulty": diff,
                "question": q_text,
                "option_a": opt_a,
                "option_b": opt_b,
                "option_c": opt_c,
                "option_d": opt_d,
                "correct": corr,
                "explanation": expl
            })

    # 4. Sample EXACTLY 10 unique questions randomly for every attempt
    selected_raw = random.sample(candidate_pool, min(quiz_limit, len(candidate_pool)))
    if len(selected_raw) < quiz_limit:
        selected_raw = (selected_raw * (quiz_limit // len(selected_raw) + 1))[:quiz_limit]

    random.shuffle(selected_raw)

    # 5. For every single attempt, randomize the 4 options and correct option key so every attempt is 100% unique!
    final_questions = []
    for idx, item in enumerate(selected_raw[:10]):
        original_opts = [
            ("a", item["option_a"]),
            ("b", item["option_b"]),
            ("c", item["option_c"]),
            ("d", item["option_d"])
        ]
        
        # Find correct text before shuffling
        correct_text = item["option_a"]
        if item["correct"] == "b": correct_text = item["option_b"]
        elif item["correct"] == "c": correct_text = item["option_c"]
        elif item["correct"] == "d": correct_text = item["option_d"]

        # Shuffle option choices
        shuffled_choice_texts = [o[1] for o in original_opts]
        random.shuffle(shuffled_choice_texts)

        new_options = {
            "a": shuffled_choice_texts[0],
            "b": shuffled_choice_texts[1],
            "c": shuffled_choice_texts[2],
            "d": shuffled_choice_texts[3]
        }

        # Identify new correct key
        new_correct_key = "a"
        for k, val in new_options.items():
            if val == correct_text:
                new_correct_key = k
                break

        final_questions.append({
            "id": item["id"] if isinstance(item["id"], int) else (idx + 1),
            "domain": domain,
            "topic": item["topic"],
            "difficulty": item["difficulty"],
            "question": item["question"],
            "options": new_options,
            "correct_key": new_correct_key
        })

    return {
        "domain": domain,
        "total_questions": len(final_questions), # ALWAYS 10
        "difficulty": "Industry",
        "questions": final_questions
    }

@router.post("/submit")
def submit_quiz(req: SubmitQuizRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if not req.answers:
        raise HTTPException(status_code=400, detail="No answers provided")

    total = len(req.answers)
    score = 0
    detailed_results = []

    for ans in req.answers:
        q_id = ans.get("question_id")
        selected_opt = ans.get("selected_option", "").lower().strip()
        
        question = db.query(Question).filter(Question.id == q_id).first()
        if question:
            is_correct = (selected_opt == question.correct.lower().strip())
            correct_val = question.correct
            expl_val = question.explanation
            q_text = question.question
            t_text = question.topic
            opts = {"a": question.option_a, "b": question.option_b, "c": question.option_c, "d": question.option_d}
        else:
            # Look in dynamic question pool
            is_correct = ans.get("is_correct", False)
            correct_val = ans.get("correct_key", "a")
            expl_val = ans.get("explanation", "Scenario analysis question.")
            q_text = ans.get("question", "Industry scenario question")
            t_text = ans.get("topic", "Industry Assessment")
            opts = ans.get("options", {"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D"})

        if is_correct:
            score += 1

        detailed_results.append({
            "question_id": q_id,
            "topic": t_text,
            "question": q_text,
            "options": opts,
            "selected": selected_opt,
            "correct": correct_val,
            "is_correct": is_correct,
            "explanation": expl_val
        })

    pct = round((score / total) * 100, 1) if total > 0 else 0.0
    now_str = datetime.utcnow().strftime("%Y-%m-%d")

    attempt = AssessmentAttempt(
        student_id=student.id,
        domain=req.domain,
        difficulty=req.difficulty,
        score=score,
        total=total,
        percentage=pct,
        date=now_str,
        time_taken=req.time_taken
    )
    db.add(attempt)
    db.flush()

    for item in detailed_results:
        if isinstance(item["question_id"], int) and item["question_id"] < 1000:
            db.add(AssessmentAttemptQuestion(
                attempt_id=attempt.id,
                question_id=item["question_id"],
                selected_option=item["selected"],
                is_correct=item["is_correct"]
            ))

    if pct >= 80:
        db.add(Notification(
            user_id=current_user.id,
            message=f"🌟 Outstanding Quiz Performance! You scored {score}/{total} ({pct}%) in {req.domain}.",
            category="quiz"
        ))
    db.commit()

    return {
        "attempt_id": attempt.id,
        "domain": req.domain,
        "score": score,
        "total": total,
        "percentage": pct,
        "time_taken": req.time_taken,
        "detailed_results": detailed_results
    }

@router.get("/history")
def get_quiz_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = get_student_for_user(current_user, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == student.id).order_by(AssessmentAttempt.id.desc()).all()
    
    total_completed = len(attempts)
    avg_score = round(sum(a.percentage for a in attempts) / total_completed, 1) if total_completed > 0 else 0.0

    domain_stats = {}
    for a in attempts:
        if a.domain not in domain_stats:
            domain_stats[a.domain] = {"scores": [], "attempts": 0}
        domain_stats[a.domain]["scores"].append(a.percentage)
        domain_stats[a.domain]["attempts"] += 1

    domain_averages = {
        d: round(sum(v["scores"]) / len(v["scores"]), 1) for d, v in domain_stats.items()
    }

    return {
        "total_completed": total_completed,
        "avg_score": avg_score,
        "domain_averages": domain_averages,
        "attempts": [
            {
                "id": a.id,
                "domain": a.domain,
                "score": a.score,
                "total": a.total,
                "percentage": a.percentage,
                "date": a.date,
                "time_taken": a.time_taken
            } for a in attempts
        ]
    }
