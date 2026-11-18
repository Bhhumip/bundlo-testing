import React from "react";
import {
    getUnlockedRewardForCart,
    getRewardLabel,
    sortRules,
} from "../../../utils/progressBarUtils.js";

function formatTemplate(template = "", values = {}) {
    return Object.entries(values).reduce(
        (text, [key, value]) =>
            text.replaceAll(`{{${key}}}`, String(value)),
        template
    );
}

export function FreeShippingProgressBarPreview({
    theme = {},
    isMobileView = false,
}) {
    const appearance = theme.appearance || {};
    const labels = theme.labels || {};
    const rules = Array.isArray(theme.rules) ? theme.rules : [];

    const enabledRules = sortRules(rules.filter((rule) => rule.enabled));
    const cartValue = 35;
    const maxGoal = enabledRules.length
        ? Math.max(...enabledRules.map((rule) => Number(rule.threshold || 0)), 25)
        : 100;

    const formatMoney = (amount) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: theme.currencyCode || "USD",
            maximumFractionDigits: 2,
        }).format(Number(amount) || 0);

    const { nextRule, unlockedRule } = getUnlockedRewardForCart(
        enabledRules,
        cartValue
    );

    const rewardRule =
        unlockedRule || enabledRules[enabledRules.length - 1];

    const headline = nextRule
        ? formatTemplate(labels.beforeGoal || "Spend {{remaining}} more to unlock {{reward}}", {
              remaining: formatMoney(Number(nextRule.threshold || 0) - cartValue),
              reward: getRewardLabel(nextRule, formatMoney),
              current: formatMoney(cartValue),
              goal: formatMoney(nextRule.threshold),
          })
        : formatTemplate(labels.afterGoal || "You've unlocked {{reward}}!", {
              reward: getRewardLabel(rewardRule, formatMoney),
              current: formatMoney(cartValue),
              goal: formatMoney(maxGoal),
              remaining: formatMoney(0),
          });

    const subtext = nextRule
        ? formatTemplate(labels.progress || "{{current}} of {{goal}}", {
              current: formatMoney(cartValue),
              goal: formatMoney(nextRule.threshold),
              remaining: formatMoney(Number(nextRule.threshold || 0) - cartValue),
              reward: getRewardLabel(nextRule, formatMoney),
          })
        : labels.footer || "";

    const progress = Math.min((cartValue / maxGoal) * 100, 100);
    const filledColor = appearance.filledColor || "#111827";
    const emptyColor = appearance.emptyColor || "#D1D5DB";

    return (
        <div
            style={{
                width: "100%",
                maxWidth: isMobileView ? "320px" : "100%",
                boxSizing: "border-box",
                padding: isMobileView ? "16px" : "20px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                color: "#111827",
                fontFamily: "inherit",
            }}
        >
            <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "8px" }}>
                {theme.title || "Free Shipping Progress"}
            </div>

            <div style={{ fontSize: "14px", marginBottom: "6px", lineHeight: 1.5 }}>
                {headline}
            </div>

            <div
                style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "12px",
                    lineHeight: 1.5,
                }}
            >
                {subtext}
            </div>

            <div
                style={{
                    height: appearance.compactMode ? "6px" : "10px",
                    background: emptyColor,
                    borderRadius: "999px",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        width: `${progress}%`,
                        background: filledColor,
                        borderRadius: "999px",
                        transition: appearance.animation === "none"
                            ? "none"
                            : "width 0.4s ease",
                    }}
                />
            </div>

            {appearance.showMilestones && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginTop: "14px",
                    }}
                >
                    {enabledRules.map((rule) => {
                        const unlocked = Number(rule.threshold || 0) <= cartValue;

                        return (
                            <div
                                key={rule.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "10px",
                                    borderRadius: "6px",
                                    background: unlocked ? "#ecfdf5" : "#f9fafb",
                                    border: "1px solid #e5e7eb",
                                    fontSize: "12px",
                                }}
                            >
                                <span>
                                    {rule.icon || "⭐"}{" "}
                                    {getRewardLabel(rule, formatMoney)}
                                </span>
                                <span style={{ color: "#6b7280" }}>
                                    {unlocked
                                        ? "Unlocked"
                                        : `Unlock at ${formatMoney(rule.threshold)}`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default FreeShippingProgressBarPreview;