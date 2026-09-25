import { useAuth } from "../AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="brand-logo">
        <span>🎓</span>
        <span>Student Success Ecosystem</span>
      </div>

      <div className="user-profile-badge">
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{user?.name || "User"}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{user?.email}</div>
        </div>
        <span className="role-tag">{user?.role}</span>
        <button onClick={logout} className="btn-secondary" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}>
          🚪 Logout
        </button>
      </div>
    </header>
  );
}
