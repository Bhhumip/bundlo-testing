export function CountdownCartDrawerPreview({ theme }) {
    const wrapperStyle = {
        backgroundColor: theme.backgroundColor,
        color: theme.messageTextColor,
        padding: `${theme.padding}px`,
        margin: `${theme.margin}px`,
        borderRadius: `${theme.borderRadius}px`,
        borderStyle: theme.borderStyle,
        borderWidth: `${theme.borderWidth}px`,
        borderColor: theme.borderColor,
        fontSize: `${theme.fontSize}px`,
        fontWeight: theme.fontBold ? "700" : "400",
        textAlign: "center",
    };

    const timerStyle = {
        color: theme.timerColor,
        fontWeight: "700",
        fontSize: `${Math.round((Number(theme.fontSize) || 16) * 1.2)}px`,
        marginTop: "8px",
    };

    const minutes = Math.max(0, Math.floor(Number(theme.countdownDuration) || 0));
    const mockTimer = `${String(minutes).padStart(2, "0")}:00`;

    return (
        <div style={wrapperStyle}>
            <div>{theme.mainMessage}</div>
            <div style={{ marginTop: 6 }}>{theme.itemCartMessage}</div>
            <div style={timerStyle}>{mockTimer}</div>
        </div>
    );
}