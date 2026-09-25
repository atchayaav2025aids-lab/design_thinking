import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Landing() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [role, setRole] = useState("student"); // "student" | "staff" | "parent"

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openAuth = (mode = "login", selectedRole = "student") => {
    setAuthMode(mode);
    setRole(selectedRole);
    setError("");
    if (selectedRole === "student") setEmail("student@college.edu");
    else if (selectedRole === "staff") setEmail("staff@college.edu");
    else if (selectedRole === "parent") setEmail("parent@college.edu");
    else setEmail("");
    setPassword("password123");
    setShowAuthModal(true);
  };

  const handleRoleSelect = (r) => {
    setRole(r);
    setError("");
    if (r === "student" && (!email || email.includes("staff") || email.includes("parent"))) setEmail("student@college.edu");
    if (r === "staff" && (!email || email.includes("student") || email.includes("parent"))) setEmail("staff@college.edu");
    if (r === "parent" && (!email || email.includes("student") || email.includes("staff"))) setEmail("parent@college.edu");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (authMode === "login") {
        const u = await login(email, password, role);
        setShowAuthModal(false);
        navigate(`/${u.role}`);
      } else {
        if (!name) {
          setError("Please enter your full name.");
          setLoading(false);
          return;
        }
        const u = await register(name, email, password, role);
        setShowAuthModal(false);
        navigate(`/${u.role || role}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#090D16", color: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* HEADER / NAVIGATION */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.2rem 4rem",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(9, 13, 22, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", fontWeight: "800" }}>
          <span style={{ fontSize: "1.6rem" }}>🎓</span>
          <span>Student Success <span style={{ color: "#a78bfa" }}>Ecosystem</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem", fontSize: "0.95rem", fontWeight: "500", color: "#94a3b8" }}>
          <a href="#home" style={{ color: "#c084fc", textDecoration: "none" }}>Home</a>
          <a href="#features" style={{ color: "#94a3b8", textDecoration: "none" }}>Features</a>
          <a href="#roles" style={{ color: "#94a3b8", textDecoration: "none" }}>Portals</a>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => openAuth("login", "student")}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              padding: "0.6rem 1.4rem",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            👤 Login
          </button>
          <button
            onClick={() => openAuth("register", "student")}
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              border: "none",
              color: "#fff",
              padding: "0.6rem 1.4rem",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(139, 92, 246, 0.4)"
            }}
          >
            👤+ Register
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="home" style={{ padding: "4rem 4rem 6rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
        <div>
          <div style={{
            display: "inline-block",
            background: "rgba(139, 92, 246, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            color: "#c084fc",
            padding: "0.4rem 1rem",
            borderRadius: "20px",
            fontSize: "0.85rem",
            fontWeight: "700",
            marginBottom: "1.5rem"
          }}>
            Smarter • Connected • Student Centric
          </div>

          <h1 style={{ fontSize: "3.4rem", fontWeight: "900", lineHeight: "1.15", marginBottom: "1.5rem", letterSpacing: "-1px" }}>
            Intelligent Student <br />
            <span style={{ background: "linear-gradient(135deg, #c084fc, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Success Ecosystem
            </span>
          </h1>

          <p style={{ color: "#94a3b8", fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "2.5rem", maxWidth: "540px" }}>
            A unified platform for smarter student monitoring, academic progress, attendance, assessments and early intervention.
          </p>

          <div style={{ display: "flex", gap: "1.2rem" }}>
            <button
              onClick={() => openAuth("login", "student")}
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                border: "none",
                color: "#fff",
                padding: "0.9rem 2.2rem",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(139, 92, 246, 0.5)"
              }}
            >
              👤 Login
            </button>
            <button
              onClick={() => openAuth("register", "student")}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "0.9rem 2.2rem",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              👤+ Register
            </button>
          </div>
        </div>

        {/* HERO GRAPHIC CARD */}
        <div style={{
          background: "linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          padding: "2.5rem",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          position: "relative"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem", marginBottom: "1.5rem" }}>
            <div style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: "16px", padding: "1.2rem" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>📊</div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>Track Progress</div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Real-time metrics & scores</div>
            </div>

            <div style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "16px", padding: "1.2rem" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🔔</div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>Stay Updated</div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Instant session notifications</div>
            </div>
          </div>

          <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "16px", padding: "1.2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "2rem" }}>🎓</div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "1.1rem" }}>Achieve More</div>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>AI-driven recommendations & early interventions</div>
            </div>
          </div>
        </div>
      </section>

      {/* KEY FEATURES */}
      <section id="features" style={{ padding: "4rem", background: "rgba(15, 23, 42, 0.5)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "800", marginBottom: "0.5rem" }}>Key Features</h2>
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>Everything you need for a successful academic journey</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.8rem" }}>
          {[
            { icon: "📊", title: "Academic Performance", desc: "Track marks and progress across subjects.", color: "#8b5cf6" },
            { icon: "📅", title: "Smart Attendance", desc: "Session-code based attendance system.", color: "#10b981" },
            { icon: "📄", title: "Assessments", desc: "Quizzes, tests and evaluations.", color: "#38bdf8" },
            { icon: "📈", title: "Progress Tracking", desc: "Monitor learning and skill development.", color: "#f59e0b" },
            { icon: "🔔", title: "Notifications & Alerts", desc: "Important updates and reminders.", color: "#ec4899" },
            { icon: "🎯", title: "Student Success", desc: "Identify risks early and provide timely support.", color: "#a855f7" }
          ].map((feat, idx) => (
            <div key={idx} style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.8rem"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: `${feat.color}20`,
                border: `1px solid ${feat.color}50`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                marginBottom: "1.2rem"
              }}>
                {feat.icon}
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem" }}>{feat.title}</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: "1.5" }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DESIGNED FOR EVERYONE */}
      <section id="roles" style={{ padding: "4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "800", marginBottom: "0.5rem" }}>Designed for Everyone</h2>
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>Different roles. One platform. A common goal – Student Success.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
          {/* STUDENT CARD */}
          <div style={{
            background: "linear-gradient(145deg, rgba(139, 92, 246, 0.1), rgba(15, 23, 42, 0.6))",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            borderRadius: "20px",
            padding: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
              <div style={{ background: "#8b5cf6", width: "54px", height: "54px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
                👨‍🎓
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>For Students</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.2rem", maxWidth: "240px" }}>
                  Track your attendance, marks, assessments & progress.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuth("login", "student")}
              style={{
                background: "#8b5cf6",
                border: "none",
                color: "#fff",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                fontSize: "1.2rem",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              →
            </button>
          </div>

          {/* STAFF CARD */}
          <div style={{
            background: "linear-gradient(145deg, rgba(56, 189, 248, 0.1), rgba(15, 23, 42, 0.6))",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "20px",
            padding: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
              <div style={{ background: "#0284c7", width: "54px", height: "54px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
                👩‍🏫
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>For Staff / Faculty</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.2rem", maxWidth: "240px" }}>
                  Manage students, session code attendance & bulk marks.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuth("login", "staff")}
              style={{
                background: "#0284c7",
                border: "none",
                color: "#fff",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                fontSize: "1.2rem",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              →
            </button>
          </div>

          {/* PARENT CARD */}
          <div style={{
            background: "linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.6))",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "20px",
            padding: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
              <div style={{ background: "#059669", width: "54px", height: "54px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
                👨‍👩‍👧
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>For Parents</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.2rem", maxWidth: "240px" }}>
                  Monitor ward's academic progress & attendance.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuth("login", "parent")}
              style={{
                background: "#059669",
                border: "none",
                color: "#fff",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                fontSize: "1.2rem",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: "2rem 4rem",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.85rem",
        color: "#64748b"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "700", color: "#94a3b8" }}>
          🎓 Student Success Ecosystem
        </div>
        <div>Empowering Students • Supporting Educators • Building a Better Future</div>
        <div>Privacy Policy | Terms & Conditions</div>
      </footer>

      {/* AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "20px",
            padding: "2.2rem",
            width: "100%",
            maxWidth: "440px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: "800" }}>
                {authMode === "login" ? "🔑 Portal Login" : "📝 Register Account"}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: "4px", borderRadius: "10px", marginBottom: "1.2rem" }}>
              <button
                onClick={() => setAuthMode("login")}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  border: "none",
                  borderRadius: "8px",
                  background: authMode === "login" ? "#8b5cf6" : "transparent",
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode("register")}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  border: "none",
                  borderRadius: "8px",
                  background: authMode === "register" ? "#8b5cf6" : "transparent",
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Register
              </button>
            </div>

            {/* Role Switcher */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {["student", "staff", "parent"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleSelect(r)}
                  style={{
                    flex: 1,
                    padding: "0.45rem",
                    borderRadius: "8px",
                    border: role === r ? "1px solid #8b5cf6" : "1px solid rgba(255,255,255,0.1)",
                    background: role === r ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.02)",
                    color: role === r ? "#c084fc" : "#94a3b8",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {r === "student" ? "👨‍🎓 Student" : r === "staff" ? "👩‍🏫 Staff" : "👨‍👩‍👧 Parent"}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {authMode === "register" && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    required
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                  />
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@college.edu"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  color: "#fff",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                {loading ? "Authenticating..." : authMode === "login" ? `🔑 Login as ${role.toUpperCase()}` : `📝 Register & Login`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
