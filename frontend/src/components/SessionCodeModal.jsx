import { useState } from "react";
import api from "../api";

export default function SessionCodeModal({ activeSession, onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!code || code.trim().length !== 6) {
      setError("Please enter the 6-character session code provided by your faculty.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/attendance/sessions/verify-code", { session_code: code });
      setSuccessMsg(res.data.message || "✅ Attendance marked successfully!");
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid session code or session expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "460px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>🔑 Mark My Attendance</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>
            ✕
          </button>
        </header>

        {activeSession && (
          <div style={{
            background: "rgba(139, 92, 246, 0.12)",
            border: "1px solid var(--border-glow)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            marginBottom: "1.2rem"
          }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>ACTIVE SESSION FOR:</div>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#c084fc", margin: "0.2rem 0" }}>{activeSession.subject}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {activeSession.department} ({activeSession.year}-{activeSession.section}) | Time Remaining: {Math.floor(activeSession.remaining_seconds / 60)}m {activeSession.remaining_seconds % 60}s
            </div>
          </div>
        )}

        {error && <div className="alert-banner alert-warning" style={{ marginBottom: "1rem" }}>{error}</div>}
        {successMsg && <div className="alert-banner alert-active" style={{ marginBottom: "1rem" }}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.4rem", display: "block" }}>
              Enter 6-Character Session Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DS7K92"
              maxLength={6}
              className="form-input"
              style={{
                textAlign: "center",
                fontSize: "1.6rem",
                letterSpacing: "8px",
                fontWeight: "800",
                color: "#c084fc",
                textTransform: "uppercase"
              }}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !!successMsg}
            style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", fontWeight: "700" }}
          >
            {loading ? "Validating Code..." : "⚡ Submit Code & Mark Attendance"}
          </button>
        </form>
      </div>
    </div>
  );
}
