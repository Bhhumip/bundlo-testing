// FormControls.jsx — small shared building blocks for the customize form
import { S } from "./formStyles";

export function Field({ label, children }) {
    return (
        <div style={S.field}>
            <span style={S.fieldLabel}>{label}</span>
            {children}
        </div>
    );
}

export function Group({ label, children }) {
    return (
        <div style={S.group}>
            <span style={S.groupLabel}>{label}</span>
            {children}
        </div>
    );
}

export function ColorSwatch({ colors, value, onChange }) {
    return (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {colors.map((c) => (
                <div
                    key={c}
                    onClick={() => onChange(c)}
                    title={c}
                    style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: c,
                        cursor: "pointer",
                        border: value === c ? "2px solid #111827" : "2px solid transparent",
                        outline: value === c ? "2px solid #fff" : "none",
                        outlineOffset: "-3px",
                        transition: "border .1s",
                    }}
                />
            ))}
        </div>
    );
}