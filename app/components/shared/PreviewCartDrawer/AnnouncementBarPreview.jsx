export function AnnouncementBarPreview({ theme }) {
    const messages = [
        theme.text1,
        theme.text2,
        theme.text3,
        theme.text4,
        theme.text5,
    ].slice(0, theme.messageCount ?? 5).filter(Boolean);

    const isVisible =
        theme.showHome ||
        theme.showCart ||
        theme.showCartDrawer;

    if (theme.enableBar === false || !isVisible) {
        return (
            <div
                style={{
                    width: "100%",
                    padding: "24px",
                    textAlign: "center",
                    color: "#6d7175",
                    fontSize: "13px",
                }}
            >
                Announcement bar is hidden for the selected visibility settings.
            </div>
        );
    }

    return (
        <div
            style={{
                width: "100%",
                boxSizing: "border-box",
                background: theme.bgColor || "#000000",
                color: theme.textColor || "#ffffff",
                textAlign: "center",
                padding: `${theme.padding ?? 12}px 16px`,
                margin: `${theme.margin ?? 0}px 0`,
                fontSize: "14px",
            }}
        >
            {theme.enableScroll ? (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                    }}
                >
                    {messages.map((message, index) => (
                        <div key={index}>{message}</div>
                    ))}
                </div>
            ) : (
                <div>{messages[0] || "Announcement"}</div>
            )}
        </div>
    );
}

