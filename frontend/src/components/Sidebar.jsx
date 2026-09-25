export default function Sidebar({ items, activeTab, onSelectTab }) {
  return (
    <aside className="sidebar">
      {items.map((item) => (
        <div
          key={item.id}
          className={`nav-item ${activeTab === item.id ? "active" : ""}`}
          onClick={() => onSelectTab(item.id)}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
          {item.badge > 0 ? (
            <span style={{
              marginLeft: "auto",
              background: "#ef4444",
              color: "#fff",
              borderRadius: "50%",
              padding: "0.1rem 0.45rem",
              fontSize: "0.7rem",
              fontWeight: "700"
            }}>
              {item.badge}
            </span>
          ) : null}
        </div>
      ))}
    </aside>
  );
}
