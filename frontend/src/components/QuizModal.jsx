import { useState, useEffect } from "react";
import api from "../api";

export default function QuizModal({ domain, onClose, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { q_id: 'a' }
  const [timer, setTimer] = useState(900); // 15 minutes for 10 questions
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuizQuestions();
  }, [domain]);

  useEffect(() => {
    let interval = null;
    if (!isSubmitted && timer > 0 && questions.length > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isSubmitted, timer, questions]);

  const fetchQuizQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/quiz/generate/${encodeURIComponent(domain)}?limit=10`);
      setQuestions(res.data.questions || []);
    } catch (err) {
      setError("Failed to load dynamic quiz questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, optionKey) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qId]: optionKey
    }));
  };

  const handleSubmitQuiz = async () => {
    if (questions.length === 0) return;
    setLoading(true);
    setError("");

    const payload = {
      domain: domain,
      difficulty: "Industry",
      time_taken: 900 - timer,
      answers: questions.map(q => {
        const sel = selectedAnswers[q.id] || "";
        const isCorr = sel && q.correct_key ? (sel.toLowerCase() === q.correct_key.toLowerCase()) : false;
        return {
          question_id: q.id,
          selected_option: sel,
          is_correct: isCorr,
          correct_key: q.correct_key || "a",
          question: q.question,
          topic: q.topic,
          options: q.options
        };
      })
    };

    try {
      const res = await api.post("/quiz/submit", payload);
      setResult(res.data);
      setIsSubmitted(true);
      if (onComplete) onComplete(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Quiz submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚡</div>
          <h3>Generating 10 Unique Questions for {domain}...</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Selecting 10 randomized scenario-based industry questions...
          </p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "740px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="role-tag" style={{ background: "rgba(139,92,246,0.2)", color: "#c084fc" }}>
                {domain}
              </span>
              <span className="role-tag" style={{ background: "rgba(6,182,212,0.2)", color: "#67e8f9" }}>
                10 Questions Assessment
              </span>
            </div>
          </div>
          {!isSubmitted && (
            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: timer < 120 ? "#ef4444" : "#a78bfa" }}>
              ⏱️ {formatTimer(timer)}
            </div>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>
            ✕
          </button>
        </header>

        {error && <div className="alert-banner alert-warning">{error}</div>}

        {isSubmitted && result ? (
          <div>
            <div style={{ textAlign: "center", padding: "1.5rem", background: "rgba(30,27,75,0.4)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                {result.percentage >= 80 ? "🏆" : "🎯"}
              </div>
              <h2 style={{ fontSize: "1.8rem", color: result.percentage >= 80 ? "#4ade80" : "#fbbf24" }}>
                Score: {result.score} / {result.total} ({result.percentage}%)
              </h2>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                Time Taken: {Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s
              </p>
            </div>

            <h4 style={{ marginBottom: "1rem" }}>📋 Answer Breakdown & Explanations (10 Questions):</h4>
            <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {result.detailed_results?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    background: item.is_correct ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${item.is_correct ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`
                  }}
                >
                  <p style={{ fontWeight: "600", fontSize: "0.92rem", marginBottom: "0.4rem" }}>
                    Q{idx + 1}: {item.question}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: item.is_correct ? "#4ade80" : "#fca5a5" }}>
                    Your Choice: <strong>{item.selected ? item.selected.toUpperCase() : "Skipped"}</strong> | Correct Answer: <strong>{item.correct.toUpperCase()}</strong>
                  </p>
                  {item.explanation && (
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.4rem", fontStyle: "italic" }}>
                      💡 {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={onClose} style={{ marginTop: "1.5rem" }}>
              Close & View Progress
            </button>
          </div>
        ) : (
          currentQ && (
            <div className="quiz-container">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                <span>Question <strong>{currentIndex + 1}</strong> of <strong>{questions.length}</strong></span>
                <span>Topic: <strong>{currentQ.topic}</strong></span>
              </div>

              {/* Progress bar */}
              <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px", marginBottom: "1.2rem", overflow: "hidden" }}>
                <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, background: "linear-gradient(90deg, #8b5cf6, #38bdf8)", height: "100%", transition: "width 0.3s ease" }} />
              </div>

              <h3 style={{ fontSize: "1.1rem", lineHeight: "1.5", color: "var(--text-primary)", marginBottom: "1.2rem" }}>
                {currentQ.question}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {Object.entries(currentQ.options).map(([optKey, optText]) => {
                  const isSelected = selectedAnswers[currentQ.id] === optKey;
                  return (
                    <div
                      key={optKey}
                      className={`quiz-option ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectOption(currentQ.id, optKey)}
                    >
                      <span style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: isSelected ? "var(--primary)" : "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                        color: isSelected ? "#fff" : "var(--text-secondary)"
                      }}>
                        {optKey.toUpperCase()}
                      </span>
                      <span>{optText}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
                <button
                  className="btn-secondary"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  ← Previous
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    className="btn-primary"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    style={{ width: "auto" }}
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={handleSubmitQuiz}
                    style={{ width: "auto", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                  >
                    ⚡ Submit 10-Question Assessment
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
