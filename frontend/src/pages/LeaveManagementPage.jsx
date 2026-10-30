import { useEffect, useState } from "react";
import api from "../api";

const STATUS_STYLE = {
  Pending:  { background: "rgba(245,158,11,0.15)",  color: "#fbbf24", border: "1px solid rgba(245,158,11,0.35)" },
  Approved: { background: "rgba(16,185,129,0.15)",  color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.35)" },
  Rejected: { background: "rgba(239,68,68,0.15)",   color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" },
};

const inputStyle = {
  width: "100%",
  padding: "0.7rem 1rem",
  background: "rgba(30,41,59,0.5)",
  border: "1px solid rgba(148,163,184,0.15)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontSize: "0.92rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

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

export default function LeaveManagementPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { fetchApplications(); }, [filterStatus, search]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "All") params.append("status", filterStatus);
      if (search.trim()) params.append("search", search.trim());
      const res = await api.get(`/leave/all?${params.toString()}`);
      setApplications(res.data);
    } catch (e) {
      console.error("Failed to load leave applications", e);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (action) => {
    if (!selectedApp) return;
    setProcessing(true); setActionMsg(""); setErrorMsg("");
    try {
      await api.post(`/leave/${selectedApp.id}/process`, { action, remarks: remarks.trim() });
      setActionMsg(`✅ Leave application has been ${action.toLowerCase()} successfully.`);
      setSelectedApp(null); setRemarks("");
      fetchApplications();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "❌ Failed to process application.");
    } finally {
      setProcessing(false);
    }
  };

  const filterPills = [
    { label: "All",      color: "#8b5cf6", count: applications.length },
    { label: "Pending",  color: "#f59e0b", count: applications.filter(a => a.status === "Pending").length },
    { label: "Approved", color: "#10b981", count: applications.filter(a => a.status === "Approved").length },
    { label: "Rejected", color: "#ef4444", count: applications.filter(a => a.status === "Rejected").length },
  ];

  const detailRow = (label, value) => (
    <div key={label}>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{label}</div>
      <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>{value}</div>
    </div>
  );

  return (
    <div>
      <style>{`
        .leave-mgmt-input::placeholder { color: var(--text-muted); }
        .leave-mgmt-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 12px var(--primary-glow) !important; background: rgba(30,41,59,0.8) !important; outline: none; }
        .leave-mgmt-select option { background: #0f172a; color: #f8fafc; }
      `}</style>

      <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.25rem", color: "var(--text-primary)" }}>
        🗂️ Leave Management
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
        Review and process student leave applications.
      </p>

      {/* Filter Pills */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {filterPills.map(({ label, color, count }) => (
          <div
            key={label}
            onClick={() => setFilterStatus(label)}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "var(--radius-pill)",
              background: filterStatus === label ? `${color}22` : "rgba(30,41,59,0.5)",
              color: filterStatus === label ? color : "var(--text-secondary)",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.88rem",
              border: filterStatus === label ? `1px solid ${color}66` : "1px solid rgba(148,163,184,0.12)",
              transition: "all 0.2s",
            }}
          >
            {label} <span style={{ opacity: 0.8 }}>({count})</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1.25rem" }}>
        <input
          className="leave-mgmt-input"
          placeholder="🔍 Search by student name or register number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "420px" }}
        />
      </div>

      {/* Status Messages */}
      {actionMsg && <div className="alert-banner alert-active" style={{ marginBottom: "1rem" }}>{actionMsg}</div>}
      {errorMsg  && <div className="alert-banner alert-warning" style={{ marginBottom: "1rem" }}>{errorMsg}</div>}

      {/* Detail / Action Panel */}
      {selectedApp && (
        <div style={{
          background: "var(--bg-card)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          marginBottom: "1.5rem",
          boxShadow: "var(--shadow-main)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <h3 style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--text-primary)" }}>
              📄 Application #{selectedApp.id} — {selectedApp.student_name}
            </h3>
            <button
              className="btn-secondary"
              onClick={() => { setSelectedApp(null); setRemarks(""); setActionMsg(""); setErrorMsg(""); }}
              style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
            {[
              ["Student Name",   selectedApp.student_name],
              ["Register No.",   selectedApp.roll_number],
              ["Department",     selectedApp.department],
              ["Year",           `Year ${selectedApp.year}`],
              ["Leave Type",     selectedApp.leave_type],
              ["Number of Days", `${selectedApp.num_days} day${selectedApp.num_days > 1 ? "s" : ""}`],
              ["From Date",      selectedApp.from_date],
              ["To Date",        selectedApp.to_date],
              ["Applied On",     selectedApp.applied_at ? new Date(selectedApp.applied_at).toLocaleDateString("en-IN") : "—"],
            ].map(([l, v]) => detailRow(l, v))}
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>Reason</div>
            <div style={{ background: "rgba(30,41,59,0.5)", padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.92rem", border: "1px solid rgba(148,163,184,0.12)", color: "var(--text-primary)" }}>
              {selectedApp.reason}
            </div>
          </div>

          {selectedApp.document_path && (
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>Supporting Document</div>
              <span style={{ background: "rgba(139,92,246,0.15)", color: "#c084fc", padding: "0.3rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: "600", border: "1px solid rgba(139,92,246,0.3)" }}>
                📎 {selectedApp.document_path}
              </span>
            </div>
          )}

          {selectedApp.status !== "Pending" ? (
            <div style={{ ...STATUS_STYLE[selectedApp.status], padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", fontWeight: "700" }}>
              This application has already been <strong>{selectedApp.status}</strong>.
              {selectedApp.remarks && <div style={{ marginTop: "0.5rem", fontWeight: "400", color: "var(--text-secondary)" }}>Remarks: {selectedApp.remarks}</div>}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                  Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  className="leave-mgmt-input"
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Add comments or feedback for the student..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  disabled={processing}
                  onClick={() => handleProcess("Approved")}
                  className="btn-primary"
                  style={{ width: "auto", padding: "0.75rem 2rem", background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}
                >
                  {processing ? "Processing…" : "✅ Approve Leave"}
                </button>
                <button
                  disabled={processing}
                  onClick={() => handleProcess("Rejected")}
                  className="btn-primary"
                  style={{ width: "auto", padding: "0.75rem 2rem", background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 4px 15px rgba(239,68,68,0.3)" }}
                >
                  {processing ? "Processing…" : "❌ Reject Leave"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "3rem" }}>Loading leave applications…</p>
        ) : applications.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>
            No leave applications found for the selected filter.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  {["#", "Student", "Reg. No.", "Dept", "Yr", "Leave Type", "From", "To", "Days", "Applied On", "Status", "Action"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    style={{ transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <td style={{ ...tdStyle, fontWeight: "700", color: "#a78bfa" }}>#{app.id}</td>
                    <td style={{ ...tdStyle, fontWeight: "600" }}>{app.student_name}</td>
                    <td style={tdStyle}>{app.roll_number}</td>
                    <td style={{ ...tdStyle, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.department}</td>
                    <td style={tdStyle}>{app.year}</td>
                    <td style={tdStyle}>{app.leave_type}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{app.from_date}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{app.to_date}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{app.num_days}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        ...STATUS_STYLE[app.status],
                        padding: "0.2rem 0.7rem",
                        borderRadius: "var(--radius-pill)",
                        fontWeight: "700",
                        fontSize: "0.78rem",
                        display: "inline-block",
                        whiteSpace: "nowrap",
                      }}>
                        {app.status === "Pending" ? "⏳ Pending" : app.status === "Approved" ? "✅ Approved" : "❌ Rejected"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => { setSelectedApp(app); setRemarks(""); setActionMsg(""); setErrorMsg(""); }}
                        className="btn-secondary"
                        style={{
                          padding: "0.35rem 0.9rem",
                          fontSize: "0.82rem",
                          background: app.status === "Pending" ? "rgba(139,92,246,0.2)" : "rgba(30,41,59,0.5)",
                          borderColor: app.status === "Pending" ? "rgba(139,92,246,0.4)" : "rgba(148,163,184,0.15)",
                          color: app.status === "Pending" ? "#c084fc" : "var(--text-secondary)",
                        }}
                      >
                        {app.status === "Pending" ? "Review" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
