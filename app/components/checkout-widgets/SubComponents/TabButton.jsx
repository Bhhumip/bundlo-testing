export function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "10px 0",
                fontSize: "12px",
                fontWeight: active ? 600 : 400,
                color: active ? "#111827" : "#6b7280",
                background: active ? "#ffffff" : "transparent",
                border: "none",
                borderBottom: active ? "2px solid #111827" : "2px solid transparent",
                cursor: "pointer",
                transition: "all .15s",
            }}
        >
            {label}
        </button>
    );
}