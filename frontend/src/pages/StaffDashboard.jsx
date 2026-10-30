import { useEffect, useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import LeaveManagementPage from "./LeaveManagementPage";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const [activeSession, setActiveSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Filters for class attendance
  const [filters, setFilters] = useState({
    department: "Artificial Intelligence & Data Science",
    year: "II",
    section: "A",
    subject: "Data Science",
    hour: 1,
    date: new Date().toISOString().split("T")[0]
  });

  // Roster & Attendance state
  const [classAttendance, setClassAttendance] = useState([]);
  const [pendingAttendance, setPendingAttendance] = useState({});

  // Session form state
  const [sessionData, setSessionData] = useState({
    subject: "Data Science",
    department: "Artificial Intelligence & Data Science",
    year: "II",
    section: "A",
    duration_minutes: 15
  });

  // Bulk Marks Entry state matching media_1790340203061.png
  const [bulkMarksFilters, setBulkMarksFilters] = useState({
    subject: "Data Science",
    exam_type: "Internal 1",
    max_marks: 100,
    year: "II",
    section: "A"
  });
  const [bulkStudents, setBulkStudents] = useState([]);
  const [marksState, setMarksState] = useState({}); // { student_id: markValue }
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const markInputRefs = useRef({});

  // Reports state
  const [classReportData, setClassReportData] = useState(null);

  // Add Student form state
  const [newStudentData, setNewStudentData] = useState({
    name: "", email: "", roll_number: "",
    department: "Artificial Intelligence & Data Science",
    year: "II", section: "A", phone: "", parent_email: "", dob: "", address: ""
  });

  // Notification dispatch state
  const [notifData, setNotifData] = useState({
    user_id: "",
    message: "⚠️ Official Academic Warning: Your attendance has fallen below 80%. Please report to faculty office.",
    category: "attendance"
  });

  const [studentsList, setStudentsList] = useState([]);
  const [lowAttStudents, setLowAttStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchStaffData();
    fetchClassRoster();
    fetchNotifications();
    fetchPendingLeaveCount();
    checkActiveSession();
    const interval = setInterval(checkActiveSession, 5000);
    const rosterInterval = setInterval(() => fetchClassRoster(false), 5000);
    return () => {
      clearInterval(interval);
      clearInterval(rosterInterval);
    };
  }, [filters]);

  useEffect(() => {
    if (activeTab === "marks") {
      fetchBulkMarksRoster();
    } else if (activeTab === "reports") {
      fetchClassReport();
    }
  }, [activeTab, bulkMarksFilters]);

  useEffect(() => {
    if (activeTab !== "warnings" && activeTab !== "notifications") return;
    if (!notifications.some(n => !n.is_read)) return;

    api.post("/notifications/read-all")
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      })
      .catch(err => console.error("Error marking notifications read", err));
  }, [activeTab, notifications]);

  const fetchStaffData = async () => {
    try {
      const stRes = await api.get("/students/");
      const list = stRes.data || [];
      setStudentsList(list);

      if (list.length > 0) {
        setNotifData(prev => ({ ...prev, user_id: list[0].id }));
      }

      const low = list.filter(s => s.attendance_pct !== undefined && s.attendance_pct < 80);
      setLowAttStudents(low);
    } catch (err) {
      console.error("Error loading staff data", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const notifRes = await api.get("/notifications/");
      setNotifications(notifRes.data || []);
    } catch (err) {
      console.error("Error loading notifications", err);
    }
  };

  const fetchPendingLeaveCount = async () => {
    try {
      const res = await api.get("/leave/pending-count");
      setPendingLeaveCount(res.data.pending_count || 0);
    } catch (err) {
      console.error("Error fetching pending leave count", err);
    }
  };

  const fetchClassRoster = async (syncPending = true) => {
    try {
      const res = await api.get(`/attendance/class?department=${encodeURIComponent(filters.department)}&year=${filters.year}&section=${filters.section}&subject=${encodeURIComponent(filters.subject)}&date=${filters.date}&hour=${filters.hour}`);
      const students = res.data.students || [];
      setClassAttendance(students);
      if (syncPending) {
        const initialPending = {};
        students.forEach(student => {
          if (student.status && student.status !== "not_recorded") {
            initialPending[student.student_id] = student.status;
          }
        });
        setPendingAttendance(initialPending);
      }
    } catch (err) {
      console.error("Error fetching class roster", err);
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
      console.error("Error checking active session", err);
    }
  };

  const fetchBulkMarksRoster = async () => {
    try {
      const res = await api.get(`/grades/class?subject=${encodeURIComponent(bulkMarksFilters.subject)}&exam_type=${encodeURIComponent(bulkMarksFilters.exam_type)}&year=${bulkMarksFilters.year}&section=${bulkMarksFilters.section}`);
      const stList = res.data.students || [];
      setBulkStudents(stList);

      const initialMarks = {};
      stList.forEach(st => {
        initialMarks[st.student_id] = st.marks !== null && st.marks !== undefined ? st.marks : "";
      });
      setMarksState(initialMarks);
    } catch (err) {
      console.error("Error fetching bulk marks roster", err);
    }
  };

  const fetchClassReport = async () => {
    try {
      const res = await api.get(`/reports/class?department=${encodeURIComponent(filters.department)}&year=${filters.year}&section=${filters.section}`);
      setClassReportData(res.data);
    } catch (err) {
      console.error("Error fetching class report", err);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setErrorMsg("");
    try {
      const res = await api.post("/attendance/sessions/create", sessionData);
      setActiveSession(res.data.session);
      setShowSessionModal(false);
      setStatusMsg(`🟢 Attendance Session Active! Session Code: ${res.data.session.session_code}`);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to create attendance session.");
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    try {
      await api.post(`/attendance/sessions/${activeSession.id}/stop`);
      setActiveSession(null);
      setStatusMsg("Attendance session has been closed.");
    } catch (err) {
      setErrorMsg("Failed to stop session.");
    }
  };

  const handleMarkManualAttendance = (studentId, status) => {
    if (activeSession) return;
    setStatusMsg("");
    setErrorMsg("");
    setPendingAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    const changes = classAttendance
      .filter(student => pendingAttendance[student.student_id] && pendingAttendance[student.student_id] !== student.status)
      .map(student => ({
        student_id: student.student_id,
        subject: filters.subject,
        date: filters.date,
        hour: filters.hour,
        status: pendingAttendance[student.student_id],
        is_lab: filters.subject.toLowerCase().includes("lab")
      }));

    if (!changes.length) {
      setStatusMsg("No attendance changes to save.");
      return;
    }

    setStatusMsg("");
    setErrorMsg("");
    try {
      const res = await api.post("/attendance/manual/batch", {
        subject: filters.subject,
        date: filters.date,
        hour: filters.hour,
        department: filters.department,
        year: filters.year,
        section: filters.section,
        records: changes
      });
      setStatusMsg(`✅ ${res.data.message}`);
      await fetchClassRoster(true);
      await fetchStaffData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to save attendance.");
      await fetchClassRoster(true);
    }
  };

  const handleDownloadAttendanceReport = async () => {
    try {
      const response = await api.get(`/attendance/class/report.csv?department=${encodeURIComponent(filters.department)}&year=${filters.year}&section=${filters.section}&subject=${encodeURIComponent(filters.subject)}&date=${filters.date}&hour=${filters.hour}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_${filters.date}_hour${filters.hour}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg("✅ Attendance report downloaded cleanly.");
    } catch (err) {
      setErrorMsg("Failed to download attendance report.");
    }
  };

  const handleBulkMarkChange = (studentId, val) => {
    setMarksState(prev => ({ ...prev, [studentId]: val }));
  };

  const handleBulkKeyDown = (e, index) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = markInputRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = markInputRefs.current[index - 1];
      if (prevInput) prevInput.focus();
    }
  };

  const handleSaveAllMarks = async () => {
    setBulkSaving(true);
    setStatusMsg("");
    setErrorMsg("");

    try {
      const items = bulkStudents.map(st => {
        const val = marksState[st.student_id];
        return {
          student_id: st.student_id,
          marks: val !== "" && val !== null && !isNaN(val) ? parseFloat(val) : null
        };
      });

      const res = await api.post("/grades/batch", {
        subject: bulkMarksFilters.subject,
        exam_type: bulkMarksFilters.exam_type,
        max_marks: parseFloat(bulkMarksFilters.max_marks),
        year: bulkMarksFilters.year,
        section: bulkMarksFilters.section,
        items
      });

      setStatusMsg(`✅ ${res.data.message}`);
      await fetchBulkMarksRoster();
      await fetchStaffData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to save marks.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setErrorMsg("");
    try {
      const res = await api.post("/students/", newStudentData);
      setStatusMsg(`✅ ${res.data.message}`);
      setShowAddStudentModal(false);
      setNewStudentData({
        name: "", email: "", roll_number: "",
        department: "Artificial Intelligence & Data Science",
        year: "II", section: "A", phone: "", parent_email: "", dob: "", address: ""
      });
      fetchStaffData();
      fetchClassRoster();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to add student.");
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setErrorMsg("");
    try {
      await api.post("/notifications/send", notifData);
      setStatusMsg("📌 Official warning notification dispatched to Student & Parent!");
      fetchNotifications();
    } catch (err) {
      setErrorMsg("Failed to send notification.");
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.is_read).length;

  const sidebarItems = [
    { id: "overview", label: "Dashboard", icon: "📊" },
    { id: "attendance", label: "Attendance Control", icon: "🔑" },
    { id: "students", label: "Students Roster", icon: "👨‍🎓" },
    { id: "marks", label: "Marks Management", icon: "📝" },
    { id: "assessments", label: "Quiz Performance", icon: "⚡" },
    { id: "reports", label: "Class Reports", icon: "📑" },
    { id: "warnings", label: "Notifications & Alerts", icon: "🔔", badge: unreadNotifsCount > 0 ? unreadNotifsCount : null },
    { id: "leave_mgmt", label: "Leave Management", icon: "🗂️", badge: pendingLeaveCount > 0 ? pendingLeaveCount : null },
    { id: "profile", label: "Profile", icon: "👤" }
  ];

  const filteredBulkStudents = bulkStudents.filter(st => {
    if (!bulkSearchQuery) return true;
    const q = bulkSearchQuery.toLowerCase();
    return st.name.toLowerCase().includes(q) || st.roll_number.toLowerCase().includes(q);
  });

  const enteredCount = bulkStudents.filter(st => marksState[st.student_id] !== "" && marksState[st.student_id] !== null && marksState[st.student_id] !== undefined).length;
  const pendingCount = bulkStudents.length - enteredCount;

  return (
    <div>
      <Navbar />

      <div className="dashboard-container">
        <Sidebar items={sidebarItems} activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="main-content">
          {/* Header Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "800" }}>Faculty Control Center</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Department of Artificial Intelligence & Data Science
              </p>
            </div>
          </div>

          {statusMsg && <div className="alert-banner alert-active">{statusMsg}</div>}
          {errorMsg && <div className="alert-banner alert-warning">{errorMsg}</div>}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="grid-cards">
                <div className="card-stat">
                  <h4>Total Students</h4>
                  <div className="value">{studentsList.length}</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>II Year AI & DS - Section A</p>
                </div>

                <div className="card-stat">
                  <h4>Students Below 80%</h4>
                  <div className="value" style={{ color: lowAttStudents.length > 0 ? "#ef4444" : "#10b981" }}>
                    {lowAttStudents.length} Students
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Requires academic warning</p>
                </div>

                <div className="card-stat">
                  <h4>Active Attendance Session</h4>
                  <div className="value" style={{ color: activeSession ? "#10b981" : "var(--text-muted)", fontSize: "1.3rem" }}>
                    {activeSession ? "🟢 Active" : "🔴 Inactive"}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
                    {activeSession ? `Code: ${activeSession.session_code} (${activeSession.subject})` : "No session running"}
                  </p>
                </div>

                <div className="card-stat">
                  <h4>Class Average Marks</h4>
                  <div className="value" style={{ color: "#a78bfa" }}>
                    {studentsList.length ? (studentsList.reduce((acc, s) => acc + (s.avg_marks || 0), 0) / studentsList.length).toFixed(1) : "0.0"}%
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Internal Assessment Average</p>
                </div>
              </div>

              <div className="table-card" style={{ marginTop: "1.5rem" }}>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>👨‍🎓 Class Roster Summary</h3>
                  <button className="btn-secondary" onClick={() => setActiveTab("students")}>
                    Manage Students →
                  </button>
                </header>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Attendance %</th>
                      <th>Avg Marks</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map(st => (
                      <tr key={st.id}>
                        <td><strong>{st.roll_number}</strong></td>
                        <td>{st.name}</td>
                        <td>{st.email}</td>
                        <td><strong style={{ color: st.attendance_pct < 80 ? "#ef4444" : "#10b981" }}>{st.attendance_pct}%</strong></td>
                        <td>{st.avg_marks}%</td>
                        <td>
                          <span className="role-tag" style={{
                            background: st.attendance_pct < 80 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                            color: st.attendance_pct < 80 ? "#fca5a5" : "#6ee7b7"
                          }}>
                            {st.attendance_pct < 80 ? "AT RISK" : "NORMAL"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE CONTROL (BUTTON APPEARS ONLY HERE!) */}
          {activeTab === "attendance" && (
            <div>
              {/* Session Code Control Box */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", background: "rgba(30,27,75,0.4)", padding: "1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>🔑 Session Code Attendance Control</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    Generate a 6-character session code for students to mark attendance on their device.
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowSessionModal(true)}
                  style={{
                    padding: "0.85rem 1.6rem",
                    fontSize: "0.95rem",
                    background: activeSession ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                    boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                    width: "auto"
                  }}
                >
                  🔑 GENERATE ACTIVE SESSION CODE
                </button>
              </div>

              {/* Active Session Status Box */}
              {activeSession && (
                <div className="alert-banner alert-active" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "1.1rem" }}>🟢 <strong>ATTENDANCE SESSION ACTIVE</strong></span>
                      <div style={{ fontSize: "0.9rem", marginTop: "0.2rem" }}>
                        Subject: <strong>{activeSession.subject}</strong> | Class: <strong>{activeSession.department} ({activeSession.year}-{activeSession.section})</strong>
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={handleStopSession} style={{ background: "rgba(239,68,68,0.2)", borderColor: "#ef4444", color: "#fca5a5" }}>
                      ⏹ Close Attendance Session
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "2rem", width: "100%", background: "rgba(0,0,0,0.3)", padding: "0.85rem 1.25rem", borderRadius: "var(--radius-md)", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>SESSION CODE FOR STUDENTS: </span>
                      <strong style={{ fontSize: "1.8rem", color: "#c084fc", letterSpacing: "4px", display: "block" }}>{activeSession.session_code}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Time Remaining: </span>
                      <strong style={{ fontSize: "1.2rem", color: "#67e8f9" }}>
                        {Math.floor(activeSession.remaining_seconds / 60)}m {activeSession.remaining_seconds % 60}s
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Students Marked: </span>
                      <strong style={{ fontSize: "1.2rem", color: "#4ade80" }}>
                        {activeSession.marked_count} / {activeSession.total_students}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Attendance & Override */}
              <div className="table-card">
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3>📝 Manual Attendance Override & Roster Table</h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      Attendance is not selected by default. Click Present/Absent buttons to override.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button className="btn-secondary" onClick={handleDownloadAttendanceReport} style={{ width: "auto", padding: "0.55rem 1rem" }}>
                      ⬇ Download Report (CSV)
                    </button>
                    <button className="btn-primary" onClick={handleSaveAttendance} disabled={!!activeSession} style={{ width: "auto", padding: "0.55rem 1.25rem" }}>
                      💾 Save Attendance
                    </button>
                  </div>
                </header>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", margin: "1rem 0" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>Subject</label>
                    <select value={filters.subject} onChange={e => setFilters({ ...filters, subject: e.target.value })} className="form-input" style={{ width: "200px" }}>
                      <option value="Data Science">Data Science</option>
                      <option value="Machine Learning">Machine Learning</option>
                      <option value="Python Programming">Python Programming</option>
                      <option value="Database Management">Database Management</option>
                      <option value="Web Development">Web Development</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>Year & Section</label>
                    <select value={`${filters.year}-${filters.section}`} onChange={e => {
                      const [y, s] = e.target.value.split("-");
                      setFilters({ ...filters, year: y, section: s });
                    }} className="form-input" style={{ width: "160px" }}>
                      <option value="II-A">II Year - Sec A</option>
                      <option value="II-B">II Year - Sec B</option>
                      <option value="III-A">III Year - Sec A</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>Class Hour</label>
                    <select value={filters.hour} onChange={e => setFilters({ ...filters, hour: parseInt(e.target.value) })} className="form-input" style={{ width: "120px" }}>
                      {[1, 2, 3, 4, 5, 6, 7].map(h => (
                        <option key={h} value={h}>{h}{h === 1 ? "st" : h === 2 ? "nd" : h === 3 ? "rd" : "th"} Hour</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>Date</label>
                    <input type="date" value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} className="form-input" style={{ width: "160px" }} />
                  </div>
                </div>

                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Hour</th>
                      <th>Attendance %</th>
                      <th>Today's Status</th>
                      <th>Attendance Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classAttendance.length > 0 ? (
                      classAttendance.map(st => {
                        const currentChoice = pendingAttendance[st.student_id];
                        const isPresentSelected = currentChoice === "present";
                        const isAbsentSelected = currentChoice === "absent";

                        return (
                          <tr key={st.student_id}>
                            <td><strong>{st.roll_number}</strong></td>
                            <td>{st.name}</td>
                            <td>{filters.hour}{filters.hour === 1 ? "st" : filters.hour === 2 ? "nd" : filters.hour === 3 ? "rd" : "th"}</td>
                            <td><strong style={{ color: st.attendance_pct < 80 ? "#ef4444" : "#10b981" }}>{st.attendance_pct}%</strong></td>
                            <td>
                              <span className="role-tag" style={{
                                background: isPresentSelected ? "rgba(16,185,129,0.15)" : isAbsentSelected ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                                color: isPresentSelected ? "#6ee7b7" : isAbsentSelected ? "#fca5a5" : "var(--text-muted)"
                              }}>
                                {currentChoice ? currentChoice.toUpperCase() : "NOT RECORDED"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleMarkManualAttendance(st.student_id, "present")}
                                  disabled={!!activeSession}
                                  style={{
                                    background: isPresentSelected ? "#10b981" : "rgba(16,185,129,0.1)",
                                    borderColor: isPresentSelected ? "#10b981" : "rgba(16,185,129,0.3)",
                                    color: isPresentSelected ? "#fff" : "#6ee7b7",
                                    padding: "0.35rem 0.85rem",
                                    fontSize: "0.82rem",
                                    fontWeight: isPresentSelected ? "700" : "500"
                                  }}
                                >
                                  ✓ Present
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleMarkManualAttendance(st.student_id, "absent")}
                                  disabled={!!activeSession}
                                  style={{
                                    background: isAbsentSelected ? "#ef4444" : "rgba(239,68,68,0.1)",
                                    borderColor: isAbsentSelected ? "#ef4444" : "rgba(239,68,68,0.3)",
                                    color: isAbsentSelected ? "#fff" : "#fca5a5",
                                    padding: "0.35rem 0.85rem",
                                    fontSize: "0.82rem",
                                    fontWeight: isAbsentSelected ? "700" : "500"
                                  }}
                                >
                                  ✕ Absent
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="6">No students found for selected class filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ASSIGNED STUDENTS ROSTER */}
          {activeTab === "students" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h3>👨‍🎓 Student Roster Management</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Manage student database profiles and view contact links.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddStudentModal(true)} style={{ width: "auto" }}>
                  + Add Student
                </button>
              </div>

              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Parent Email</th>
                    <th>Department</th>
                    <th>Attendance</th>
                    <th>Avg Marks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.map(st => (
                    <tr key={st.id}>
                      <td><strong>{st.roll_number}</strong></td>
                      <td>{st.name}</td>
                      <td>{st.email}</td>
                      <td>{st.parent_email || "Not linked"}</td>
                      <td>{st.department}</td>
                      <td><strong style={{ color: st.attendance_pct < 80 ? "#ef4444" : "#10b981" }}>{st.attendance_pct}%</strong></td>
                      <td>{st.avg_marks}%</td>
                      <td>
                        <span className="role-tag" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: BULK MARKS MANAGEMENT (MATCHES media_1790340203061.png) */}
          {activeTab === "marks" && (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.6rem", fontWeight: "800" }}>Subject Marks Management</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Enter and save marks for all students in the selected subject and assessment type.
                </p>
              </div>

              {/* Controls Header Row */}
              <div className="table-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Subject</label>
                    <select
                      value={bulkMarksFilters.subject}
                      onChange={e => setBulkMarksFilters({ ...bulkMarksFilters, subject: e.target.value })}
                      className="form-input"
                    >
                      <option value="Data Science">Data Science</option>
                      <option value="Machine Learning">Machine Learning</option>
                      <option value="Python Programming">Python Programming</option>
                      <option value="Database Management">Database Management</option>
                      <option value="Web Development">Web Development</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Assessment Type</label>
                    <select
                      value={bulkMarksFilters.exam_type}
                      onChange={e => setBulkMarksFilters({ ...bulkMarksFilters, exam_type: e.target.value })}
                      className="form-input"
                    >
                      <option value="Internal 1">Internal 1</option>
                      <option value="Internal 2">Internal 2</option>
                      <option value="Lab Test">Lab Test</option>
                      <option value="Assignment">Assignment</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Maximum Marks</label>
                    <input
                      type="number"
                      value={bulkMarksFilters.max_marks}
                      onChange={e => setBulkMarksFilters({ ...bulkMarksFilters, max_marks: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Year & Section</label>
                    <select
                      value={`${bulkMarksFilters.year}-${bulkMarksFilters.section}`}
                      onChange={e => {
                        const [y, s] = e.target.value.split("-");
                        setBulkMarksFilters({ ...bulkMarksFilters, year: y, section: s });
                      }}
                      className="form-input"
                    >
                      <option value="II-A">II Year - Sec A</option>
                      <option value="II-B">II Year - Sec B</option>
                      <option value="III-A">III Year - Sec A</option>
                    </select>
                  </div>

                  <div>
                    <button className="btn-primary" onClick={fetchBulkMarksRoster} style={{ height: "42px", width: "100%" }}>
                      👥 Load Students
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Stats Cards Row & Search */}
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <div className="card-stat" style={{ minWidth: "140px", padding: "1rem" }}>
                    <h4 style={{ fontSize: "0.78rem" }}>Total Students</h4>
                    <div className="value" style={{ fontSize: "1.4rem" }}>{bulkStudents.length}</div>
                  </div>

                  <div className="card-stat" style={{ minWidth: "140px", padding: "1rem", borderColor: "rgba(16,185,129,0.3)" }}>
                    <h4 style={{ fontSize: "0.78rem", color: "#6ee7b7" }}>✓ Marks Entered</h4>
                    <div className="value" style={{ fontSize: "1.4rem", color: "#10b981" }}>{enteredCount}</div>
                  </div>

                  <div className="card-stat" style={{ minWidth: "140px", padding: "1rem", borderColor: "rgba(239,68,68,0.3)" }}>
                    <h4 style={{ fontSize: "0.78rem", color: "#fca5a5" }}>✕ Not Entered</h4>
                    <div className="value" style={{ fontSize: "1.4rem", color: "#ef4444" }}>{pendingCount}</div>
                  </div>

                  <div className="card-stat" style={{ minWidth: "140px", padding: "1rem", borderColor: "rgba(139,92,246,0.3)" }}>
                    <h4 style={{ fontSize: "0.78rem", color: "#c084fc" }}>Maximum Marks</h4>
                    <div className="value" style={{ fontSize: "1.4rem", color: "#a78bfa" }}>{bulkMarksFilters.max_marks}</div>
                  </div>
                </div>

                <div style={{ minWidth: "280px" }}>
                  <input
                    type="text"
                    value={bulkSearchQuery}
                    onChange={e => setBulkSearchQuery(e.target.value)}
                    placeholder="🔍 Search by Roll Number or Student Name..."
                    className="form-input"
                    style={{ borderRadius: "20px" }}
                  />
                </div>
              </div>

              {/* Roster Table */}
              <div className="table-card" style={{ padding: "0" }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ROLL NO</th>
                      <th>STUDENT NAME</th>
                      <th>MAX MARKS</th>
                      <th>MARKS OBTAINED</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBulkStudents.length > 0 ? (
                      filteredBulkStudents.map((st, idx) => {
                        const val = marksState[st.student_id];
                        const isSaved = val !== "" && val !== null && val !== undefined;

                        return (
                          <tr key={st.student_id}>
                            <td><strong>{st.roll_number}</strong></td>
                            <td>{st.name}</td>
                            <td>{bulkMarksFilters.max_marks}</td>
                            <td>
                              <input
                                ref={el => markInputRefs.current[idx] = el}
                                type="number"
                                step="0.5"
                                min="0"
                                max={bulkMarksFilters.max_marks}
                                value={val ?? ""}
                                onChange={e => handleBulkMarkChange(st.student_id, e.target.value)}
                                onKeyDown={e => handleBulkKeyDown(e, idx)}
                                placeholder="Enter mark"
                                className="form-input"
                                style={{ width: "120px", fontWeight: "700" }}
                              />
                            </td>
                            <td>
                              <span className="role-tag" style={{
                                background: isSaved ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                                color: isSaved ? "#6ee7b7" : "#fbbf24",
                                border: isSaved ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)"
                              }}>
                                {isSaved ? "✓ Saved" : "⚠ Not Entered"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>No students match the selected filter.</td></tr>
                    )}
                  </tbody>
                </table>

                {/* Save All Action */}
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
                  <button
                    className="btn-primary"
                    onClick={handleSaveAllMarks}
                    disabled={bulkSaving}
                    style={{
                      padding: "0.85rem 2rem",
                      fontSize: "1rem",
                      fontWeight: "700",
                      width: "auto",
                      background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                    }}
                  >
                    {bulkSaving ? "Saving & Publishing..." : "💾 SAVE & PUBLISH ALL MARKS"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QUIZ PERFORMANCE */}
          {activeTab === "assessments" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>⚡ Student Quiz & Assessment Performance</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                Monitor student quiz completion rates and domain accuracy.
              </p>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Average Quiz Score</th>
                    <th>Assessments Attempted</th>
                    <th>Top Domain</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.map(st => (
                    <tr key={st.id}>
                      <td><strong>{st.name}</strong></td>
                      <td>{st.roll_number}</td>
                      <td><strong>{st.avg_assessment || 82}%</strong></td>
                      <td>4</td>
                      <td><span className="role-tag" style={{ background: "rgba(139,92,246,0.15)", color: "#c084fc" }}>Data Science</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: CLASS REPORTS (REAL DB ANALYTICAL DASHBOARD) */}
          {activeTab === "reports" && (
            <div>
              <div className="grid-cards" style={{ marginBottom: "1.5rem" }}>
                <div className="card-stat">
                  <h4>Enrolled Students</h4>
                  <div className="value">{classReportData?.total_students ?? studentsList.length}</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Active Class Cohort</p>
                </div>
                <div className="card-stat">
                  <h4>Class Avg Attendance</h4>
                  <div className="value" style={{ color: (classReportData?.class_avg_attendance ?? 85) < 80 ? "#ef4444" : "#10b981" }}>
                    {classReportData?.class_avg_attendance ?? "85.0"}%
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Overall attendance average</p>
                </div>
                <div className="card-stat">
                  <h4>Class Avg Marks</h4>
                  <div className="value" style={{ color: "#a78bfa" }}>
                    {classReportData?.class_avg_marks ?? "80.0"}%
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Internal assessment average</p>
                </div>
                <div className="card-stat">
                  <h4>Students at Risk (&lt;80%)</h4>
                  <div className="value" style={{ color: (classReportData?.low_attendance_students?.length ?? 0) > 0 ? "#ef4444" : "#10b981" }}>
                    {classReportData?.low_attendance_students?.length ?? lowAttStudents.length}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>Low attendance count</p>
                </div>
              </div>

              {/* Subject Attendance & Performance Charts */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div className="table-card" style={{ padding: "1.5rem" }}>
                  <h4 style={{ color: "#c084fc", marginBottom: "1rem" }}>📊 Subject-Wise Class Attendance (%)</h4>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={classReportData?.subject_attendance ?? []}>
                      <XAxis dataKey="subject" stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="attendance" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Attendance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="table-card" style={{ padding: "1.5rem" }}>
                  <h4 style={{ color: "#38bdf8", marginBottom: "1rem" }}>📈 Subject Academic Performance (%)</h4>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={classReportData?.subject_performance ?? []}>
                      <XAxis dataKey="subject" stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="performance" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Marks %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Class Performance Roster Table */}
              <div className="table-card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <div>
                    <h3>📑 Department Analytics & Performance Reports</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      Class-wide progress score and attendance distribution.
                    </p>
                  </div>
                  <button className="btn-primary" onClick={handleDownloadAttendanceReport} style={{ width: "auto" }}>
                    📥 Export Class Report (CSV)
                  </button>
                </div>

                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Department</th>
                      <th>Attendance %</th>
                      <th>Average Marks</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map(st => (
                      <tr key={st.id}>
                        <td><strong>{st.roll_number}</strong></td>
                        <td>{st.name}</td>
                        <td>{st.department}</td>
                        <td><strong style={{ color: st.attendance_pct < 80 ? "#ef4444" : "#10b981" }}>{st.attendance_pct}%</strong></td>
                        <td>{st.avg_marks}%</td>
                        <td>
                          <span className="role-tag" style={{
                            background: st.attendance_pct < 80 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                            color: st.attendance_pct < 80 ? "#fca5a5" : "#6ee7b7"
                          }}>
                            {st.attendance_pct < 80 ? "HIGH RISK" : "LOW RISK"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: NOTIFICATIONS & WARNINGS */}
          {activeTab === "warnings" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>🔔 Dispatch Academic Warnings & Alerts</h3>
              <form onSubmit={handleSendNotification} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "block" }}>Target Student</label>
                  <select value={notifData.user_id} onChange={e => setNotifData({ ...notifData, user_id: parseInt(e.target.value) })} className="form-input" required>
                    {studentsList.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.roll_number}) - Att: {st.attendance_pct}%</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "block" }}>Warning Message</label>
                  <textarea value={notifData.message} onChange={e => setNotifData({ ...notifData, message: e.target.value })} className="form-input" rows="3" required />
                </div>

                <button type="submit" className="btn-primary" style={{ width: "auto" }}>
                  📨 Send Official Warning to Student & Parent
                </button>
              </form>
            </div>
          )}

          {/* TAB: LEAVE MANAGEMENT */}
          {activeTab === "leave_mgmt" && (
            <LeaveManagementPage />
          )}

          {/* TAB 8: PROFILE */}
          {activeTab === "profile" && (
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3>👤 Faculty Profile</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Faculty Name</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{user?.name}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Email</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{user?.email}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Department</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>Artificial Intelligence & Data Science</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE SESSION MODAL */}
      {showSessionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>🔑 Launch Active Session Code Attendance</h3>
              <button onClick={() => setShowSessionModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
            </header>

            <form onSubmit={handleCreateSession} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Subject</label>
                <select value={sessionData.subject} onChange={e => setSessionData({ ...sessionData, subject: e.target.value })} className="form-input">
                  <option value="Data Science">Data Science</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Python Programming">Python Programming</option>
                  <option value="Database Management">Database Management</option>
                  <option value="Web Development">Web Development</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Session Duration (Minutes)</label>
                <input type="number" value={sessionData.duration_minutes} onChange={e => setSessionData({ ...sessionData, duration_minutes: parseInt(e.target.value) })} className="form-input" min="1" max="60" required />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>
                🚀 Generate Session Code & Start Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>👨‍🎓 Add New Student</h3>
              <button onClick={() => setShowAddStudentModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
            </header>

            <form onSubmit={handleAddStudent} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Student Name *</label>
                <input type="text" value={newStudentData.name} onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })} className="form-input" required placeholder="e.g. John Doe" />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Student Email *</label>
                <input type="email" value={newStudentData.email} onChange={e => setNewStudentData({ ...newStudentData, email: e.target.value })} className="form-input" required placeholder="e.g. john@college.edu" />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Roll Number *</label>
                <input type="text" value={newStudentData.roll_number} onChange={e => setNewStudentData({ ...newStudentData, roll_number: e.target.value })} className="form-input" required placeholder="e.g. 21AI099" />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Parent Email</label>
                <input type="email" value={newStudentData.parent_email} onChange={e => setNewStudentData({ ...newStudentData, parent_email: e.target.value })} className="form-input" placeholder="e.g. parent@gmail.com" />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Department</label>
                <input type="text" value={newStudentData.department} onChange={e => setNewStudentData({ ...newStudentData, department: e.target.value })} className="form-input" />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Year & Section</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="text" value={newStudentData.year} onChange={e => setNewStudentData({ ...newStudentData, year: e.target.value })} className="form-input" placeholder="II" />
                  <input type="text" value={newStudentData.section} onChange={e => setNewStudentData({ ...newStudentData, section: e.target.value })} className="form-input" placeholder="A" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Phone Number</label>
                <input type="text" value={newStudentData.phone} onChange={e => setNewStudentData({ ...newStudentData, phone: e.target.value })} className="form-input" placeholder="+91 9876543210" />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Date of Birth</label>
                <input type="date" value={newStudentData.dob} onChange={e => setNewStudentData({ ...newStudentData, dob: e.target.value })} className="form-input" />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>Address</label>
                <input type="text" value={newStudentData.address} onChange={e => setNewStudentData({ ...newStudentData, address: e.target.value })} className="form-input" placeholder="Residential Address" />
              </div>

              <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                  💾 Save & Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
