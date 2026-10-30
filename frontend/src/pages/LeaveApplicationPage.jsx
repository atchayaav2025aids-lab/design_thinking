import { useEffect, useState } from "react";
import api from "../api";

const LEAVE_TYPES = [
  "Medical Leave",
  "Personal Leave",
  "Family Function",
  "Emergency Leave",
  "Other",
];

const STATUS_STYLE = {
  Pending:  { background: "rgba(245,158,11,0.15)",  color: "#fbbf24", border: "1px solid rgba(245,158,11,0.35)" },
  Approved: { background: "rgba(16,185,129,0.15)",  color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.35)" },
  Rejected: { background: "rgba(239,68,68,0.15)",   color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" },
};

// Shared input style matching the dark theme
const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  background: "rgba(30,41,59,0.5)",
  border: "1px solid rgba(148,163,184,0.15)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const readonlyStyle = {
  ...inputStyle,
  background: "rgba(15,23,42,0.6)",
  color: "var(--text-secondary)",
  cursor: "not-allowed",
  border: "1px solid rgba(148,163,184,0.08)",
};

const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: "600",
  color: "var(--text-muted)",
  marginBottom: "0.35rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const cardStyle = {
  background: "var(--bg-card)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--border-color)",
  borderRadius: "var(--radius-lg)",
  padding: "1.75rem",
  boxShadow: "var(--shadow-main)",
  marginBottom: "1.5rem",
};

export default function LeaveApplicationPage({ studentInfo, userName }) {
  const [form, setForm] = useState({
    leave_type: "Medical Leave",
    from_date: "",
    to_date: "",
    reason: "",
  });
  const [document, setDocument] = useState(null);
  const [numDays, setNumDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Focus state for inputs
  const [focused, setFocused] = useState("");

  useEffect(() => {
    if (form.from_date && form.to_date) {
      const diff = Math.floor((new Date(form.to_date) - new Date(form.from_date)) / 86400000) + 1;
      setNumDays(diff > 0 ? diff : 0);
    } else {
      setNumDays(0);
    }
  }, [form.from_date, form.to_date]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get("/leave/my");
      setHistory(res.data);
    } catch (e) {
      console.error("Failed to load leave history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(""); setErrorMsg("");
    if (!form.from_date || !form.to_date) { setErrorMsg("Please select both From Date and To Date."); return; }
    if (numDays <= 0) { setErrorMsg("To Date must be on or after From Date."); return; }
    if (!form.reason.trim()) { setErrorMsg("Please provide a reason for your leave."); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("leave_type", form.leave_type);
      fd.append("from_date", form.from_date);
      fd.append("to_date", form.to_date);
      fd.append("reason", form.reason);
      if (document) fd.append("document", document);
      await api.post("/leave/apply", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccessMsg("✅ Leave application submitted successfully! You will be notified once approved.");
      setForm({ leave_type: "Medical Leave", from_date: "", to_date: "", reason: "" });
      setDocument(null);
      setNumDays(0);
      fetchHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "❌ Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const focusStyle = (name) => focused === name
    ? { ...inputStyle, borderColor: "var(--primary)", boxShadow: "0 0 12px var(--primary-glow)", background: "rgba(30,41,59,0.8)" }
    : inputStyle;

  const thStyle = {
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    background: "rgba(30,41,59,0.4)",
    borderBottom: "1px solid var(--border-color)",
    letterSpacing: "0.05em",
    fontWeight: "700",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "0.8rem 1rem",
    fontSize: "0.88rem",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  };

  return (
    <div>
      {/* Heading */}
      <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.25rem", color: "var(--text-primary)" }}>
        📋 Leave Application
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Apply for leave and track the status of your applications.
      </p>

      {/* ── FORM CARD ── */}
      <div style={cardStyle}>
        <h3 style={{ fontWeight: "700", marginBottom: "1.5rem", fontSize: "1.05rem", color: "var(--text-primary)" }}>
          Apply for Leave
        </h3>

        <style>{`
          .leave-input::placeholder { color: var(--text-muted); }
          .leave-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 12px var(--primary-glow) !important; background: rgba(30,41,59,0.8) !important; outline: none; }
          .leave-select option { background: #0f172a; color: #f8fafc; }
          .leave-file::-webkit-file-upload-button {
            background: rgba(139,92,246,0.2);
            border: 1px solid rgba(139,92,246,0.4);
            color: #c084fc;
            padding: 0.4rem 0.9rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            margin-right: 0.75rem;
            transition: background 0.2s;
          }
          .leave-file::-webkit-file-upload-button:hover { background: rgba(139,92,246,0.35); }
          .leave-file::file-selector-button {
            background: rgba(139,92,246,0.2);
            border: 1px solid rgba(139,92,246,0.4);
            color: #c084fc;
            padding: 0.4rem 0.9rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            margin-right: 0.75rem;
          }
        `}</style>

        <form onSubmit={handleSubmit}>
          {/* Row 1 – auto-filled */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Student Name</label>
              <input style={readonlyStyle} value={userName || ""} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Register Number</label>
              <input style={readonlyStyle} value={studentInfo?.roll_number || ""} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input style={readonlyStyle} value={studentInfo?.department || ""} readOnly />
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Year</label>
              <input style={readonlyStyle} value={`Year ${studentInfo?.year || "II"}`} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Leave Type</label>
              <select
                name="leave_type"
                className="leave-select"
                style={inputStyle}
                value={form.leave_type}
                onChange={handleChange}
                required
              >
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Number of Days</label>
              <input
                style={{
                  ...readonlyStyle,
                  fontWeight: "700",
                  color: numDays > 0 ? "#a78bfa" : "var(--text-muted)",
                  fontSize: "1rem",
                }}
                value={numDays > 0 ? `${numDays} day${numDays > 1 ? "s" : ""}` : "—"}
                readOnly
              />
            </div>
          </div>

          {/* Row 3 – Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>From Date</label>
              <input
                type="date"
                name="from_date"
                className="leave-input"
                style={inputStyle}
                value={form.from_date}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>To Date</label>
              <input
                type="date"
                name="to_date"
                className="leave-input"
                style={inputStyle}
                value={form.to_date}
                min={form.from_date || undefined}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Row 4 – Reason */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Reason for Leave</label>
            <textarea
              name="reason"
              rows={4}
              className="leave-input"
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Please describe the reason for your leave request..."
              value={form.reason}
              onChange={handleChange}
              required
            />
          </div>

          {/* Row 5 – Document */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Supporting Document (Optional)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="leave-file"
              style={{
                ...inputStyle,
                padding: "0.55rem 0.75rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
              onChange={(e) => setDocument(e.target.files[0] || null)}
            />
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
              Upload medical certificate or any supporting proof. (PDF, JPG, PNG)
            </p>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="alert-banner alert-active" style={{ marginBottom: "1rem" }}>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="alert-banner alert-warning" style={{ marginBottom: "1rem" }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "auto", padding: "0.8rem 2rem", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
            disabled={submitting}
          >
            {submitting ? "⏳ Submitting..." : "📤 Submit Leave Application"}
          </button>
        </form>
      </div>

      {/* ── HISTORY TABLE ── */}
      <div className="table-card">
        <header>
          <h3>📂 My Leave Application History</h3>
        </header>

        {loadingHistory ? (
          <p style={{ color: "var(--text-secondary)", padding: "2rem 1.5rem" }}>Loading…</p>
        ) : history.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem 1.5rem" }}>
            No leave applications yet. Apply for leave above.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  {["ID", "Leave Type", "From", "To", "Days", "Reason", "Applied On", "Status"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((app) => (
                  <>
                    <tr
                      key={app.id}
                      style={{ cursor: "pointer", transition: "background 0.15s" }}
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}
                    >
                      <td style={{ ...tdStyle, fontWeight: "700", color: "#a78bfa" }}>#{app.id}</td>
                      <td style={tdStyle}>{app.leave_type}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{app.from_date}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{app.to_date}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{app.num_days}</td>
                      <td style={{ ...tdStyle, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {app.reason}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          ...STATUS_STYLE[app.status],
                          padding: "0.25rem 0.75rem",
                          borderRadius: "var(--radius-pill)",
                          fontWeight: "700",
                          fontSize: "0.78rem",
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}>
                          {app.status === "Pending" ? "⏳ Pending" : app.status === "Approved" ? "✅ Approved" : "❌ Rejected"}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded remarks row */}
                    {expandedId === app.id && (app.status === "Approved" || app.status === "Rejected") && (
                      <tr key={`${app.id}-remarks`}>
                        <td colSpan={8} style={{
                          padding: "0.85rem 1.5rem",
                          fontSize: "0.88rem",
                          background: app.status === "Approved" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          color: "var(--text-primary)",
                        }}>
                          <strong style={{ color: app.status === "Approved" ? "#6ee7b7" : "#fca5a5" }}>
                            Teacher Remarks:
                          </strong>{" "}
                          <span style={{ color: "var(--text-secondary)" }}>
                            {app.remarks || "No remarks provided."}
                          </span>
                          {app.processed_by_name && (
                            <span style={{ marginLeft: "1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                              — {app.status === "Approved" ? "✅" : "❌"} Processed by{" "}
                              <strong style={{ color: "var(--text-secondary)" }}>{app.processed_by_name}</strong>
                              {app.processed_at ? ` on ${new Date(app.processed_at).toLocaleDateString("en-IN")}` : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.75rem 1rem" }}>
              💡 Click any row to view teacher remarks for approved / rejected applications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
