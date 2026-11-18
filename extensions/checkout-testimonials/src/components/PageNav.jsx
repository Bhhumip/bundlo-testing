export function PageNav({ pageIndex, totalPages, onPrev, onNext }) {
    if (totalPages <= 1) return null;

    return (
        <s-grid
            grid-template-columns="auto 1fr auto"
            gap="small"
            block-alignment="center"
        >
            <s-button kind="plain" onPress={onPrev}>
                ← Prev
            </s-button>

            <s-text size="small" appearance="subdued">
                {pageIndex + 1} / {totalPages}
            </s-text>

            <s-button kind="plain" onPress={onNext}>
                Next →
            </s-button>
        </s-grid>
    );
}