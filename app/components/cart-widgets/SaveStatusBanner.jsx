export function SaveStatusBanner({ fetcher }) {
    if (fetcher.state !== "idle" || !fetcher.data) return null;

    const ok = fetcher.data.ok === true;

    return (
        <div
            style={{
                padding: "8px 12px",
                background: ok ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
                borderRadius: "6px",
                fontSize: "12px",
                color: ok ? "#16a34a" : "#dc2626",
            }}
        >
            {ok
                ? "✓ Theme saved successfully"
                : `Could not save: ${fetcher.data.error || "something went wrong"}`}
        </div>
    );
}