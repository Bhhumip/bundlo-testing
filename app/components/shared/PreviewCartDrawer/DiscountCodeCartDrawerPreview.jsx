export function DiscountCodeCartDrawerPreview({ theme }) {
    const wrapperStyle = {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
    };

    const rowStyle = {
        display: "flex",
        alignItems: "center",
        gap: `${theme.gap}px`,
        width: "100%",
    };

    const inputStyle = {
        flex: 1,
        height: `${theme.inputHeight}px`,
        padding: "0 16px",
        border: `1px solid ${theme.inputBorderColor}`,
        borderRadius: `${theme.inputBorderRadius}px`,
        fontSize: `${theme.fontSize}px`,
        outline: "none",
        background: "#fff",
        boxSizing: "border-box",
    };

    const buttonStyle = {
        height: `${theme.inputHeight}px`,
        minWidth: "110px",
        border: "none",
        borderRadius: `${theme.buttonRadius}px`,
        background: theme.buttonBackground,
        color: theme.buttonTextColor,
        fontSize: `${theme.fontSize}px`,
        fontWeight: 600,
        cursor: "pointer",
        padding: "0 24px",
    };

    return (
        <div style={wrapperStyle}>
            {theme.heading && (
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{theme.heading}</div>
            )}
            <div style={rowStyle}>
                <input readOnly placeholder={theme.placeholder} style={inputStyle} />
                <button style={buttonStyle} type="button">{theme.buttonLabel}</button>
            </div>
            <div style={{ fontSize: "12px", color: theme.successColor }}>
                {theme.successMessage}
            </div>
            <div style={{ fontSize: "12px", color: theme.errorColor }}>
                {theme.errorMessage}
            </div>
        </div>
    );
}