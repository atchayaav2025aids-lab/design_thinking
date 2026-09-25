import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import api from "../api";

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Mode: "login" or "register"
  const [mode, setMode] = useState("login");
  
  // Role: "student", "staff", "parent"
  const [role, setRole] = useState("student");
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Step: "form" (email/name input) or "otp" (verification code input)
  const [step, setStep] = useState("form");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [timer, setTimer] = useState(600);

  useEffect(() => {
    let interval = null;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleRoleSelect = (r) => {
    setRole(r);
    setError("");
    setInfo("");
    if (r === "student" && !email) setEmail("student@college.edu");
    if (r === "staff" && (!email || email.includes("student"))) setEmail("staff@college.edu");
    if (r === "parent" && (!email || email.includes("student") || email.includes("staff"))) setEmail("parent@college.edu");
  };

  const handleModeChange = (m) => {
    setMode(m);
    setStep("form");
    setError("");
    setInfo("");
    setOtp("");
  };

  // Handle Login submission -> Request OTP
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(email, role);
      setDevOtp(res.dev_otp || "");
      setInfo(res.message || `Verification code sent to ${email}`);
      setStep("otp");
      setTimer(600);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send verification code. Check your email.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register submission -> Create account then Request OTP
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!name || !email) {
      setError("Please fill out your full name and email address.");
      return;
    }

    setLoading(true);
    try {
      // 1. Call register endpoint
      await api.post("/auth/register", { name, email, role });
      
      // 2. Automatically request OTP code for instant login
      const res = await sendOtp(email, role);
      setDevOtp(res.dev_otp || "");
      setInfo(`Account created successfully! Verification code sent to ${email}`);
      setStep("otp");
      setTimer(600);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try logging in if account already exists.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Verification submission -> Verify OTP & Redirect to Dashboard
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const user = await verifyOtp(email, role, otp);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Incorrect verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>🎓 Student Success Ecosystem</h2>
        <p className="subtitle">AI-Powered Educational Platform</p>

        {/* Mode Selector: LOGIN vs REGISTER */}
        <div style={{
          display: "flex",
          background: "rgba(15, 23, 42, 0.9)",
          borderRadius: "var(--radius-md)",
          padding: "4px",
          marginBottom: "1.2rem",
          border: "1px solid var(--border-color)"
        }}>
          <button
            type="button"
            className={`role-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => handleModeChange("login")}
            style={{ fontSize: "0.9rem", fontWeight: "700" }}
          >
            🔑 LOGIN
          </button>
          <button
            type="button"
            className={`role-btn ${mode === "register" ? "active" : ""}`}
            onClick={() => handleModeChange("register")}
            style={{ fontSize: "0.9rem", fontWeight: "700" }}
          >
            📝 REGISTER
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="role-selector">
          <button
            type="button"
            className={`role-btn ${role === "student" ? "active" : ""}`}
            onClick={() => handleRoleSelect("student")}
          >
            👨‍🎓 Student
          </button>
          <button
            type="button"
            className={`role-btn ${role === "staff" ? "active" : ""}`}
            onClick={() => handleRoleSelect("staff")}
          >
            👩‍🏫 Staff
          </button>
          <button
            type="button"
            className={`role-btn ${role === "parent" ? "active" : ""}`}
            onClick={() => handleRoleSelect("parent")}
          >
            👨‍👩‍👧 Parent
          </button>
        </div>

        {error && <div className="alert-banner alert-warning">{error}</div>}
        {info && <div className="alert-banner alert-active">{info}</div>}

        {step === "form" ? (
          mode === "login" ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.5rem" }}>
                {loading ? "Sending Code..." : `🔑 Login as ${role.toUpperCase()} (Get Code)`}
              </button>

              <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "1rem" }}>
                Don't have an account?{" "}
                <span
                  onClick={() => handleModeChange("register")}
                  style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "700" }}
                >
                  Register here
                </span>
              </p>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.5rem" }}>
                {loading ? "Creating Account..." : `📝 Register & Send Verification Code`}
              </button>

              <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "1rem" }}>
                Already have an account?{" "}
                <span
                  onClick={() => handleModeChange("login")}
                  style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "700" }}
                >
                  Login here
                </span>
              </p>
            </form>
          )
        ) : (
          /* VERIFICATION / OTP FORM */
          <form onSubmit={handleVerifyOtp}>
            {devOtp && (
              <div style={{
                background: "rgba(139, 92, 246, 0.15)",
                border: "1px solid var(--border-glow)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                textAlign: "center",
                marginBottom: "1rem"
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Demo Verification Code: </span>
                <strong style={{ fontSize: "1.3rem", color: "#c084fc", letterSpacing: "2px" }}>{devOtp}</strong>
              </div>
            )}

            <div className="form-group">
              <label>Enter 6-Digit Verification Code</label>
              <input
                type="text"
                className="input-field"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ textAlign: "center", fontSize: "1.4rem", letterSpacing: "6px", fontWeight: "bold" }}
                required
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              <span>Expires in: <strong>{formatTimer(timer)}</strong></span>
              <button
                type="button"
                onClick={mode === "login" ? handleLoginSubmit : handleRegisterSubmit}
                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: "600" }}
              >
                Resend Code
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Verifying..." : "⚡ Verify & Enter Dashboard"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setStep("form"); setError(""); setInfo(""); }}
              style={{ width: "100%", marginTop: "0.75rem" }}
            >
              ← Back to {mode.toUpperCase()} Form
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
