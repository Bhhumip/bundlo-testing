// app/utils/progressBarUtils.js

export function sortRules(rules = []) {
  return [...rules].sort(
    (a, b) => Number(a.threshold || 0) - Number(b.threshold || 0),
  );
}

export function getRewardLabel(rule, formatMoney) {
  if (!rule) return "Reward";

  if (rule.type === "discount_percent") {
    return rule.label?.trim() || `${rule.value || "0"}% OFF`;
  }

  if (rule.type === "discount_fixed") {
    return rule.label?.trim() || `${formatMoney(rule.value || 0)} OFF`;
  }

  if (rule.type === "free_gift") {
    return rule.label?.trim() || "Free gift";
  }

  return rule.label?.trim() || "Free shipping";
}

export function getUnlockedRewardForCart(rules, cartValue) {
  const enabledSortedRules = sortRules(rules || []).filter(
    (rule) => rule.enabled,
  );

  const numericCart = Number(cartValue || 0);

  const nextRule =
    enabledSortedRules.find(
      (rule) => Number(rule.threshold || 0) > numericCart,
    ) || null;

  const unlockedRule = [...enabledSortedRules]
    .reverse()
    .find((rule) => Number(rule.threshold || 0) <= numericCart) || null;

  return { nextRule, unlockedRule };
}

