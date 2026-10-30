import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import SessionCodeModal from "../components/SessionCodeModal";
import QuizModal from "../components/QuizModal";
import LeaveApplicationPage from "./LeaveApplicationPage";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const [studentInfo, setStudentInfo] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const [availableDomains, setAvailableDomains] = useState([]);
  const [myDomains, setMyDomains] = useState([]);
  const [selectedQuizDomain, setSelectedQuizDomain] = useState(null);
  const [domainSaveStatus, setDomainSaveStatus] = useState("");

  const [predictLeaves, setPredictLeaves] = useState(1);
  const [predictResult, setPredictResult] = useState(null);

  const [quizHistory, setQuizHistory] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [progressTrends, setProgressTrends] = useState(null);
  const [grades, setGrades] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(checkActiveSession, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab !== "notifications" || !notifications.some(n => !n.is_read)) return;
    api.post("/notifications/read-all").then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    }).catch(err => console.error("Error marking notifications read", err));
  }, [activeTab, notifications]);

  const fetchStudentData = async () => {
    try {
      const meRes = await api.get("/auth/me");
      setStudentInfo(meRes.data.student || {});

      const attRes = await api.get("/attendance/my");
      setAttendance(attRes.data);

      const domRes = await api.get("/domains/my");
      setMyDomains(domRes.data.map(d => d.name));

      const availDomRes = await api.get("/domains/available");
      setAvailableDomains(availDomRes.data || []);

      const qHistRes = await api.get("/quiz/history");
      setQuizHistory(qHistRes.data);

      const rptRes = await api.get("/reports/weekly");
      setWeeklyReport(rptRes.data);

      const trendRes = await api.get("/reports/progress/trends");
      setProgressTrends(trendRes.data);

      const grRes = await api.get("/grades/my");
      setGrades(grRes.data);

      const notifRes = await api.get("/notifications/");
      setNotifications(notifRes.data || []);

      checkActiveSession();
    } catch (err) {
      console.error("Error loading student data", err);
    }
  };

  const checkActiveSession = async () => {
    try {
      const res = await api.get("/attendance/sessions/active");
      if (res.data.active) {
        setActiveSession(res.data.session);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Error checking session", err);
    }
  };

  const handlePredictLeave = async (numLeaves) => {
    setPredictLeaves(numLeaves);
    try {
      const res = await api.get(`/attendance/predict/leaves?leaves=${numLeaves}`);
      setPredictResult(res.data);
    } catch (err) {
      console.error("Predict error", err);
    }
  };

  const handleToggleDomain = (domainName) => {
    if (myDomains.includes(domainName)) {
      setMyDomains(prev => prev.filter(d => d !== domainName));
    } else {
      setMyDomains(prev => [...prev, domainName]);
    }
  };

  const handleSaveDomains = async () => {
    setDomainSaveStatus("");
    try {
      await api.post("/domains/my/save", { domains: myDomains });
      setDomainSaveStatus("✅ Interested domains saved successfully to database!");
      fetchStudentData();
    } catch (err) {
      setDomainSaveStatus("❌ Failed to save domains.");
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const sidebarItems = [
    { id: "overview", label: "Dashboard Overview", icon: "📊" },
    { id: "attendance", label: "Attendance & Predictor", icon: "📅" },
    { id: "domains", label: "Interested Domains", icon: "🎯" },
    { id: "quiz", label: "Take Assessment", icon: "⚡" },
    { id: "progress", label: "Progress Check", icon: "📈" },
    { id: "weekly_trends", label: "Weekly Progress Trends", icon: "📉" },
    { id: "report", label: "Weekly Report", icon: "📑" },
    { id: "marks", label: "Academic Marks", icon: "📝" },
    { id: "notifications", label: "Notifications", icon: "🔔", badge: unreadNotifCount > 0 ? unreadNotifCount : null },
    { id: "leave", label: "Leave Application", icon: "📋" },
    { id: "profile", label: "Profile", icon: "👤" }
  ];

  const attPct = attendance?.percentage ?? 0;

  return (
    <div>
      <Navbar />

      <div className="dashboard-container">
        <Sidebar items={sidebarItems} activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="main-content">
          {/* Welcome Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "800" }}>Welcome back, {user?.name}!</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Department of {studentInfo?.department || "Artificial Intelligence & Data Science"} | Section {studentInfo?.section || "A"} (Year {studentInfo?.year || "II"})
              </p>
            </div>
          </div>

          {/* Low Attendance Alert */}
          {attPct < 80 && (
            <div className="alert-banner alert-warning">
              <span>⚠ Attendance Alert: Your attendance has fallen below 80%. Please improve your attendance to avoid academic eligibility issues.</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="grid-cards">
                <div className="card-stat" style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <div className="circle-progress-container">
                    <svg className="circle-progress-svg" viewBox="0 0 100 100">
                      <circle className="circle-progress-bg" cx="50" cy="50" r="40" />
                      <circle
                        className="circle-progress-bar"
                        cx="50"
                        cy="50"
                        r="40"
                        stroke={attPct < 80 ? "#ef4444" : "#10b981"}
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * attPct) / 100}
                      />
                    </svg>
                    <div className="circle-text">
                      <div className="pct">{attPct}%</div>
                      <div className="label">Attendance</div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Overall Status</h4>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: attPct < 80 ? "#ef4444" : "#10b981" }}>
                      {attPct < 80 ? "⚠ Below 80%" : "✅ Excellent"}
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      {attendance?.present_hours ?? 0} Present / {attendance?.total_working_hours ?? 0} Working Hrs
                    </p>
                  </div>
                </div>

                <div className="card-stat">
                  <h4>Present Hours</h4>
                  <div className="value" style={{ color: "#10b981" }}>{attendance?.present_hours ?? 0} hrs</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Regular Lecture & Lab hours</p>
                </div>

                <div className="card-stat">
                  <h4>Absent Hours</h4>
                  <div className="value" style={{ color: "#ef4444" }}>{attendance?.absent_hours ?? 0} hrs</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Missed class hours</p>
                </div>

                <div className="card-stat">
                  <h4>Labs Missed</h4>
                  <div className="value" style={{ color: "#f59e0b" }}>{attendance?.missed_labs ?? 0} Labs</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Practical lab sessions missed</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem", marginTop: "1.25rem" }}>
                <div className="table-card" style={{ padding: "1.5rem" }}>
                  <h3 style={{ marginBottom: "1rem" }}>⚡ Take Daily Industry Assessment</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                    Select your domain and attempt unique 5-10 minute real-time industry quizzes.
                  </p>
                  <div className="domain-tags">
                    {myDomains.length > 0 ? (
                      myDomains.map(d => (
                        <button key={d} className="domain-pill active" onClick={() => setSelectedQuizDomain(d)}>
                          ▶ Start {d} Quiz
                        </button>
                      ))
                    ) : (
                      <button className="btn-secondary" onClick={() => setActiveTab("domains")}>
                        + Select Interested Domains
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-card" style={{ padding: "1.5rem" }}>
                  <h3 style={{ marginBottom: "1rem" }}>📈 Overall Progress Score</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div style={{ fontSize: "2.8rem", fontWeight: "800", color: "#a78bfa" }}>
                      {weeklyReport?.overall_progress_score ?? 0} <span style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>/ 100</span>
                    </div>
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#4ade80" }}>Progress Status</div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        Formula: Attendance (35%) + Quiz Performance (40%) + Academic Marks (25%).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE HUB & PREDICTOR */}
          {activeTab === "attendance" && (
            <div>
              {/* Active Session Action (ONLY ON ATTENDANCE PAGE) */}
              {activeSession ? (
                <div className="alert-banner alert-active" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "1.1rem" }}>🟢 <strong>ATTENDANCE SESSION ACTIVE</strong></span>
                    <p style={{ fontSize: "0.88rem", marginTop: "0.2rem" }}>
                      Subject: <strong>{activeSession.subject}</strong> ({activeSession.department} {activeSession.year}-{activeSession.section}) | Time Remaining: <strong>{Math.floor(activeSession.remaining_seconds / 60)}m {activeSession.remaining_seconds % 60}s</strong>
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCodeModal(true)}
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)", width: "auto" }}
                  >
                    ✓ MARK MY ATTENDANCE
                  </button>
                </div>
              ) : (
                <div className="alert-banner" style={{ background: "rgba(30,41,59,0.5)", border: "1px solid var(--border-color)", marginBottom: "1.5rem" }}>
                  <span>🔑 Session code attendance is currently inactive. (Faculty has not started an active session).</span>
                </div>
              )}

              {/* Attendance Statistics Cards */}
              <div className="grid-cards" style={{ marginBottom: "1.5rem" }}>
                <div className="card-stat">
                  <h4>Attendance Percentage</h4>
                  <div className="value" style={{ color: attPct < 80 ? "#ef4444" : "#10b981" }}>{attPct}%</div>
                </div>
                <div className="card-stat">
                  <h4>Present Hours</h4>
                  <div className="value" style={{ color: "#10b981" }}>{attendance?.present_hours ?? 0} hrs</div>
                </div>
                <div className="card-stat">
                  <h4>Absent Hours</h4>
                  <div className="value" style={{ color: "#ef4444" }}>{attendance?.absent_hours ?? 0} hrs</div>
                </div>
                <div className="card-stat">
                  <h4>Total Working Hours</h4>
                  <div className="value">{attendance?.total_working_hours ?? 0} hrs</div>
                </div>
                <div className="card-stat">
                  <h4>Labs Present</h4>
                  <div className="value" style={{ color: "#10b981" }}>{attendance?.labs_present ?? 0}</div>
                </div>
                <div className="card-stat">
                  <h4>Labs Missed</h4>
                  <div className="value" style={{ color: "#f59e0b" }}>{attendance?.missed_labs ?? 0}</div>
                </div>
                <div className="card-stat">
                  <h4>Leave Count</h4>
                  <div className="value">{attendance?.leave_count ?? 0}</div>
                </div>
              </div>

              {/* Predictor */}
              <div className="table-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                <h3>🔮 Attendance Predictor ("What-If" Calculator)</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0.5rem 0 1.25rem 0" }}>
                  Simulate future leaves to calculate predicted impact on your overall attendance eligibility.
                </p>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span>Simulate taking additional leaves:</span>
                  {[1, 2, 3, 5].map(num => (
                    <button
                      key={num}
                      className={`btn-secondary ${predictLeaves === num ? "btn-primary" : ""}`}
                      onClick={() => handlePredictLeave(num)}
                      style={{ padding: "0.4rem 1rem" }}
                    >
                      {num} Additional Day(s) Leave
                    </button>
                  ))}
                </div>

                {predictResult && (
                  <div style={{
                    marginTop: "1.25rem",
                    padding: "1rem 1.25rem",
                    borderRadius: "var(--radius-md)",
                    background: predictResult.warning ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                    border: `1px solid ${predictResult.warning ? "rgba(239,68,68,0.35)" : "rgba(16,185,129,0.35)"}`
                  }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: predictResult.warning ? "#fca5a5" : "#6ee7b7" }}>
                      Current: {predictResult.current_pct}% ➔ If you take {predictResult.additional_leaves} more leave(s): Predicted Attendance = {predictResult.predicted_pct}%
                    </div>
                    <p style={{ fontSize: "0.88rem", marginTop: "0.3rem", color: "var(--text-primary)" }}>
                      {predictResult.warning
                        ? "⚠ Warning: If you continue taking leave at this frequency, your attendance may fall below 80%."
                        : "✅ You will remain eligible above the 80% threshold."}
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Attendance History Table */}
              <div className="table-card">
                <header>
                  <h3>📅 Attendance History Records</h3>
                </header>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Hours</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance?.recent_records && attendance.recent_records.length > 0 ? (
                      attendance.recent_records.map(r => (
                        <tr key={r.id}>
                          <td>{r.date}</td>
                          <td><strong>{r.subject}</strong></td>
                          <td>{r.is_lab ? "Lab" : "Lecture"}</td>
                          <td>
                            <span className="role-tag" style={{
                              background: r.status === "present" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                              color: r.status === "present" ? "#6ee7b7" : "#fca5a5"
                            }}>
                              {r.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{r.hour || 1}</td>
                          <td>{r.method || "MANUAL"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6">No detailed attendance log records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INTERESTED DOMAINS */}
          {activeTab === "domains" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3>🎯 Select Your Interested Learning Domains</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.2rem" }}>
                    Choose your domain areas. Quizzes and assessments will generate industry-level questions tailored to your selected domains.
                  </p>
                </div>
                <button className="btn-primary" onClick={handleSaveDomains} style={{ width: "auto" }}>
                  💾 Save My Domains
                </button>
              </div>

              {domainSaveStatus && <div className="alert-banner alert-active" style={{ marginBottom: "1.5rem" }}>{domainSaveStatus}</div>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                {availableDomains.map(dom => {
                  const name = typeof dom === "string" ? dom : dom.name;
                  const icon = typeof dom === "object" ? dom.icon : "💡";
                  const desc = typeof dom === "object" ? dom.description : "Industry learning domain.";
                  const isSelected = myDomains.includes(name);

                  return (
                    <div
                      key={name}
                      onClick={() => handleToggleDomain(name)}
                      style={{
                        padding: "1.25rem",
                        borderRadius: "var(--radius-lg)",
                        background: isSelected ? "rgba(139,92,246,0.15)" : "rgba(30,27,75,0.3)",
                        border: `1px solid ${isSelected ? "var(--primary-glow)" : "var(--border-color)"}`,
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "1.8rem" }}>{icon}</span>
                        <span className="role-tag" style={{
                          background: isSelected ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                          color: isSelected ? "#4ade80" : "var(--text-muted)"
                        }}>
                          {isSelected ? "✓ Selected" : "[ ] Not Selected"}
                        </span>
                      </div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.3rem" }}>{name}</h4>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: REAL-TIME QUIZ / TAKE ASSESSMENT */}
          {activeTab === "quiz" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>⚡ Take Daily Industry Assessment</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0.5rem 0 1.5rem 0" }}>
                Select an assessment below. Every attempt generates a 5-10 minute unique, randomized set of scenario-based industry questions.
              </p>

              {myDomains.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  {myDomains.map(d => (
                    <div key={d} className="card-stat" style={{ border: "1px solid var(--primary-glow)" }}>
                      <h4 style={{ color: "#c084fc" }}>Selected Domain</h4>
                      <div className="value" style={{ fontSize: "1.3rem", margin: "0.4rem 0" }}>{d}</div>
                      <button className="btn-primary" onClick={() => setSelectedQuizDomain(d)} style={{ marginTop: "1rem", width: "100%" }}>
                        ⚡ Take {d} Assessment
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 1.5rem", background: "rgba(30,27,75,0.3)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎯</div>
                  <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>No Interested Domains Selected Yet</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                    Please select your learning domains first to unlock domain-specific industry assessments.
                  </p>
                  <button className="btn-primary" onClick={() => setActiveTab("domains")} style={{ width: "auto" }}>
                    + Select Learning Domains
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROGRESS CHECK */}
          {activeTab === "progress" && (
            <div>
              <div className="grid-cards">
                <div className="card-stat">
                  <h4>Assessments Completed</h4>
                  <div className="value" style={{ color: "#10b981" }}>{quizHistory?.total_completed ?? 0}</div>
                </div>
                <div className="card-stat">
                  <h4>Assessments Skipped</h4>
                  <div className="value" style={{ color: "#f59e0b" }}>0</div>
                </div>
                <div className="card-stat">
                  <h4>Average Quiz Score</h4>
                  <div className="value" style={{ color: "#a78bfa" }}>{quizHistory?.avg_score ?? 0}%</div>
                </div>
                <div className="card-stat">
                  <h4>Overall Progress Score</h4>
                  <div className="value" style={{ color: "#4ade80" }}>{weeklyReport?.overall_progress_score ?? 0}/100</div>
                </div>
              </div>

              <div className="table-card" style={{ marginTop: "1.5rem" }}>
                <header>
                  <h3>📊 Domain-Wise Learning Progress Check</h3>
                </header>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Tests Taken</th>
                      <th>Average Accuracy</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizHistory?.domain_averages && Object.keys(quizHistory.domain_averages).length > 0 ? (
                      Object.entries(quizHistory.domain_averages).map(([dName, avg]) => (
                        <tr key={dName}>
                          <td><strong>{dName}</strong></td>
                          <td>{quizHistory?.attempts?.filter(a => a.domain === dName).length ?? 0}</td>
                          <td><strong>{avg}%</strong></td>
                          <td>
                            <span className="role-tag" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>
                              {avg >= 80 ? "Mastery Active ↗" : avg >= 60 ? "In Progress" : "Needs Practice"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4">No domain quiz history recorded yet. Complete an assessment to see progress.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PREVIOUS WEEK PROGRESS TRENDS */}
          {activeTab === "weekly_trends" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>📉 Weekly Domain Progress Trends</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                Track your accuracy and mastery growth across Week 1, Week 2, Week 3, and Week 4 per domain.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                {progressTrends && Object.entries(progressTrends).map(([dName, dataPoints]) => (
                  <div key={dName} style={{ background: "rgba(30,27,75,0.4)", padding: "1.2rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <h4 style={{ color: "#c084fc", marginBottom: "0.75rem" }}>{dName} Growth</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={dataPoints}>
                        <XAxis dataKey="week" stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: WEEKLY REPORT */}
          {activeTab === "report" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h3>📑 Automated Weekly Performance Report</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{weeklyReport?.week_label}</p>
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#c084fc" }}>
                  Overall Score: {weeklyReport?.overall_progress_score ?? 0}/100
                </div>
              </div>

              <div className="grid-cards" style={{ marginBottom: "1.5rem" }}>
                <div className="card-stat">
                  <h4>Attendance Rate</h4>
                  <div className="value">{weeklyReport?.attendance?.percentage ?? 0}%</div>
                </div>
                <div className="card-stat">
                  <h4>Quizzes Completed</h4>
                  <div className="value">{weeklyReport?.learning?.assessments_completed ?? 0}</div>
                </div>
                <div className="card-stat">
                  <h4>Quiz Average</h4>
                  <div className="value">{weeklyReport?.learning?.avg_quiz_score ?? 0}%</div>
                </div>
              </div>

              <h4 style={{ marginBottom: "0.75rem" }}>🤖 Personalized AI Recommendations:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {weeklyReport?.recommendations?.map((tip, idx) => (
                  <div key={idx} style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(30,41,59,0.5)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.9rem"
                  }}>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: ACADEMIC MARKS */}
          {activeTab === "marks" && (
            <div className="table-card">
              <header>
                <h3>📝 Subject Academic Marks</h3>
              </header>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Exam Type</th>
                    <th>Marks Obtained</th>
                    <th>Max Marks</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {grades?.by_subject && Object.keys(grades.by_subject).length > 0 ? (
                    Object.entries(grades.by_subject).flatMap(([subj, list]) =>
                      list.map((g, i) => (
                        <tr key={`${subj}-${i}`}>
                          <td><strong>{subj}</strong></td>
                          <td>{g.exam_type}</td>
                          <td>{g.marks}</td>
                          <td>{g.max_marks}</td>
                          <td><strong style={{ color: g.pct >= 75 ? "#10b981" : "#f59e0b" }}>{g.pct}%</strong></td>
                        </tr>
                      ))
                    )
                  ) : (
                    <tr><td colSpan="5">No subject marks recorded yet by staff.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 9: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>🔔 Notification Center</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                {notifications.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>No notifications available.</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: "1rem 1.25rem",
                        borderRadius: "var(--radius-md)",
                        background: n.is_read ? "rgba(30,41,59,0.3)" : "rgba(139,92,246,0.12)",
                        border: `1px solid ${n.is_read ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.3)"}`,
                        fontSize: "0.9rem"
                      }}
                    >
                      {n.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: LEAVE APPLICATION */}
          {activeTab === "leave" && (
            <LeaveApplicationPage studentInfo={studentInfo} userName={user?.name} />
          )}

          {/* TAB 10: PROFILE */}
          {activeTab === "profile" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>👤 Student Profile</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Full Name</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{user?.name}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Student Email</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{user?.email}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Roll Number</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{studentInfo?.roll_number || "Not available"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Department</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{studentInfo?.department || "Not available"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Year & Section</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>Year {studentInfo?.year || "II"} - Section {studentInfo?.section || "A"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Parent Email</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{studentInfo?.parent_email || "Not linked"}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SESSION CODE ATTENDANCE MODAL */}
      {showCodeModal && activeSession && (
        <SessionCodeModal
          activeSession={activeSession}
          onClose={() => setShowCodeModal(false)}
          onSuccess={() => {
            setShowCodeModal(false);
            fetchStudentData();
          }}
        />
      )}

      {/* QUIZ MODAL */}
      {selectedQuizDomain && (
        <QuizModal
          domain={selectedQuizDomain}
          onClose={() => setSelectedQuizDomain(null)}
          onComplete={() => {
            fetchStudentData();
          }}
        />
      )}
    </div>
  );
}
