import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function ParentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const [attendance, setAttendance] = useState(null);
  const [grades, setGrades] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [quizHistory, setQuizHistory] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchParentViewData();
  }, []);

  useEffect(() => {
    if (activeTab !== "notifications" || !notifications.some(n => !n.is_read)) return;
    api.post("/notifications/read-all").then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    }).catch(err => console.error("Error marking notifications read", err));
  }, [activeTab, notifications]);

  const fetchParentViewData = async () => {
    try {
      const rptRes = await api.get("/reports/weekly");
      setWeeklyReport(rptRes.data);

      const attRes = await api.get("/attendance/my");
      setAttendance(attRes.data);

      const grRes = await api.get("/grades/my");
      setGrades(grRes.data);

      const qRes = await api.get("/quiz/history");
      setQuizHistory(qRes.data);

      const notifRes = await api.get("/notifications/");
      setNotifications(notifRes.data || []);
    } catch (err) {
      console.error("Error loading parent view data", err);
    }
  };

  const sidebarItems = [
    { id: "overview", label: "Dashboard", icon: "👨‍👩‍👧" },
    { id: "attendance", label: "Attendance", icon: "📅" },
    { id: "marks", label: "Academic Performance", icon: "📝" },
    { id: "learning", label: "Learning Progress", icon: "⚡" },
    { id: "report", label: "Weekly Report", icon: "📑" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "profile", label: "Profile", icon: "👤" }
  ];

  const attPct = attendance?.percentage ?? 0;

  return (
    <div>
      <Navbar />

      <div className="dashboard-container">
        <Sidebar items={sidebarItems} activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="main-content">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "800" }}>Parent Portal</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Monitoring Ward: <strong>{weeklyReport?.student_name || "Ward not linked"}</strong>{weeklyReport?.roll_number ? ` (${weeklyReport.roll_number})` : ""}{weeklyReport?.department ? ` | Department of ${weeklyReport.department}` : ""}
              </p>
            </div>
            <span className="role-tag" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)" }}>
              👁 VIEW-ONLY ACCESS
            </span>
          </div>

          {/* Low Attendance Alert */}
          {attPct < 80 && (
            <div className="alert-banner alert-warning">
              <span>⚠ Attendance Warning: Your ward's attendance is {attPct}%, below the required 80%. Please discuss with your ward to ensure regular class attendance.</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="grid-cards">
                <div className="card-stat">
                  <h4>Ward Attendance</h4>
                  <div className="value" style={{ color: attPct < 80 ? "#ef4444" : "#10b981" }}>{attPct}%</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
                    {attendance?.present_hours ?? 0} Present / {attendance?.total_working_hours ?? 0} Working Hrs
                  </p>
                </div>

                <div className="card-stat">
                  <h4>Overall Progress Score</h4>
                  <div className="value" style={{ color: "#a78bfa" }}>
                    {weeklyReport?.overall_progress_score ?? 0} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ 100</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Learning & Academic Index</p>
                </div>

                <div className="card-stat">
                  <h4>Missed Labs</h4>
                  <div className="value" style={{ color: "#f59e0b" }}>{attendance?.missed_labs ?? 0} Labs</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Practical sessions missed</p>
                </div>

                <div className="card-stat">
                  <h4>Quiz Performance</h4>
                  <div className="value">{quizHistory?.avg_score ?? 0}%</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Industry Quiz Average</p>
                </div>
              </div>

              {/* Recommendations Preview */}
              <div className="table-card" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
                <h3>🤖 AI Advisory for Parents</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
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
            </div>
          )}

          {/* TAB 2: ATTENDANCE RECORD */}
          {activeTab === "attendance" && (
            <div className="table-card">
              <header>
                <h3>📅 Ward Attendance Record</h3>
              </header>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Present Classes</th>
                    <th>Total Classes</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance?.subject_breakdown && Object.keys(attendance.subject_breakdown).length > 0 ? (
                    Object.entries(attendance.subject_breakdown).map(([subj, val]) => (
                      <tr key={subj}>
                        <td><strong>{subj}</strong></td>
                        <td>{val.present}</td>
                        <td>{val.total}</td>
                        <td><strong style={{ color: val.percentage < 80 ? "#ef4444" : "#10b981" }}>{val.percentage}%</strong></td>
                        <td>
                          <span className="role-tag" style={{
                            background: val.percentage < 80 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                            color: val.percentage < 80 ? "#fca5a5" : "#6ee7b7"
                          }}>
                            {val.percentage < 80 ? "Below 80%" : "Eligible"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5">Loading attendance records...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ACADEMIC PERFORMANCE (MARKS) */}
          {activeTab === "marks" && (
            <div className="table-card">
              <header>
                <h3>📝 Academic Performance & Assessment Marks</h3>
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
                    <tr><td colSpan="5">No subject marks recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: LEARNING PROGRESS */}
          {activeTab === "learning" && (
            <div className="table-card">
              <header>
                <h3>⚡ Domain Assessment Mastery</h3>
              </header>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Average Quiz Accuracy</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {quizHistory?.domain_averages && Object.keys(quizHistory.domain_averages).length > 0 ? (
                    Object.entries(quizHistory.domain_averages).map(([dName, avg]) => (
                      <tr key={dName}>
                        <td><strong>{dName}</strong></td>
                        <td><strong>{avg}%</strong></td>
                        <td>
                          <span className="role-tag" style={{ background: "rgba(139,92,246,0.15)", color: "#c084fc" }}>
                            Industry Level
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3">No quiz data available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: WEEKLY REPORT */}
          {activeTab === "report" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>📑 Weekly Performance Summary</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{weeklyReport?.week_label}</p>

              <div className="grid-cards">
                <div className="card-stat">
                  <h4>Attendance Rate</h4>
                  <div className="value">{weeklyReport?.attendance?.percentage ?? 0}%</div>
                </div>
                <div className="card-stat">
                  <h4>Overall Progress Score</h4>
                  <div className="value" style={{ color: "#a78bfa" }}>{weeklyReport?.overall_progress_score ?? 0}/100</div>
                </div>
                <div className="card-stat">
                  <h4>Quizzes Completed</h4>
                  <div className="value">{weeklyReport?.learning?.assessments_completed ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>🔔 Notifications</h3>
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
                        background: "rgba(30,41,59,0.4)",
                        border: "1px solid rgba(255,255,255,0.05)",
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

          {/* TAB 7: PROFILE */}
          {activeTab === "profile" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>👤 Ward & Parent Profile</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Parent Email</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{user?.email}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Ward Name</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{weeklyReport?.student_name || "Student"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Ward Roll Number</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{weeklyReport?.roll_number || "Not available"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Department</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{weeklyReport?.department || "Not available"}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
