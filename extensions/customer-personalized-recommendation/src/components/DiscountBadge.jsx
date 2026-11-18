// components/DiscountBadge.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared discount badge — used by any widget that shows a "Save X%" pill.
// Just pass `show` (from theme.showBadge) and `percentage` (from theme.discountValue).
// Copy this file into any new checkout extension that needs the same badge.
// ─────────────────────────────────────────────────────────────────────────────

export function DiscountBadge({
  show,
  percentage,
  inlineAlign = "start",
}) {
  if (!show || !percentage) return null;

  return (
    <s-stack alignItems={inlineAlign}>
      <s-badge tone="success">
        Save {percentage}%
      </s-badge>
    </s-stack>
  );
}