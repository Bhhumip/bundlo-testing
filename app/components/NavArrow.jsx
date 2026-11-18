// app/components/NavArrows.jsx

import { useNavigate } from "react-router";

const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#303030",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    flexShrink: 0,
    transition: "background 0.15s",
};

function ArrowBtn({ label, title, onClick }) {
    return (
        <button
            title={title}
            onClick={onClick}
            style={btnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#444")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#303030")}
        >
            {label}
        </button>
    );
}

// ── NavRow ────────────────────────────────────────────────────────────
// Use this on pages that have their OWN manual 2-column grid layout
// (Dashboard, Edit bundle). Place it as the first child of that grid div
// with gridColumn "1 / -1" so it spans both columns.
//
// <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"24px" }}>
//   <NavRow />          ← spans both columns, arrows flush left/right
//   <div>...left...</div>
//   <div>...right...</div>
// </div>
export function NavRow() {
    const navigate = useNavigate();
    return (
        <div
            style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 0 8px 0",
            }}
        >
            <ArrowBtn label="←" title="Go back" onClick={() => navigate(-1)} />
            <ArrowBtn label="→" title="Go forward" onClick={() => navigate(1)} />
        </div>
    );
}

// ── NavBar ────────────────────────────────────────────────────────────
// Use this on pages that rely on <s-page>'s built-in aside slot
// (Create fixed, Create mix-match, Create volume).
// Place it as the very first child inside <s-page> — it renders
// full-width ABOVE the s-page slot layout so the aside is unaffected.
// s-page renders its aside slot independently; this bar sits in the
// default slot before any <s-section> elements.
export function NavBar() {
    const navigate = useNavigate();
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 0 8px 0",
                width: "100%",
            }}
        >
            <ArrowBtn label="←" title="Go back" onClick={() => navigate(-1)} />
            <ArrowBtn label="→" title="Go forward" onClick={() => navigate(1)} />
        </div>
    );
}

// ── Legacy exports (keep so nothing breaks during migration) ──────────
export function BackArrow() {
    const navigate = useNavigate();
    return <ArrowBtn label="←" title="Go back" onClick={() => navigate(-1)} />;
}
export function ForwardArrow() {
    const navigate = useNavigate();
    return <ArrowBtn label="→" title="Go forward" onClick={() => navigate(1)} />;
}