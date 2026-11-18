import { DEFAULT_THEME } from "../config/theme.js";
import React from "react";

export function PageNav({ pageIndex, totalPages, onPrev, onNext, theme = DEFAULT_THEME }) {
    if (totalPages <= 1) return null;
    return (
        <s-grid gridTemplateColumns="auto 1fr auto" gap="small" alignItems="center">
            <s-button variant="subtle" onClick={onPrev}>
                ‹ Prev
            </s-button>
            <s-text alignment="center" tone="subdued">
                {pageIndex + 1} / {totalPages}
            </s-text>
            <s-button variant="subtle" onClick={onNext}>
                Next ›
            </s-button>
        </s-grid>
    );
}