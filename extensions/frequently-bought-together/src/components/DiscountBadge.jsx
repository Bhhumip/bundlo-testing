// components/DiscountBadge.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared discount badge — used by any widget that shows a "Save X%" pill.
// Just pass `show` (from theme.showBadge) and `percentage` (from theme.discountValue).
// Copy this file into any new checkout extension that needs the same badge.
// ─────────────────────────────────────────────────────────────────────────────

export function DiscountBadge({ show, percentage }) {

    console.log(
        "[DiscountBadge]",
        "show =", show,
        "percentage =", percentage
    );

    if (!show || !percentage) return null;

    return (
        <s-badge tone="success">
            Save {percentage}%
        </s-badge>
    );
}