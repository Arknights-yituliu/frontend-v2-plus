function normalizePercent(value) {
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : 0;
}

function hasAutomationTag(operator) {
  return (operator?.tags || []).some(
    (tag) => String(tag || "").trim() === "automation",
  );
}

export function recalculateRiicAutomationManufacture({
  scope,
  coreBaseBonusPercent = 0,
  coreLayer3BonusPercent = 0,
  fallbackOperators = [],
} = {}) {
  if (String(scope?.roomType || "").trim() !== "manufacture") {
    return null;
  }

  const operators = Array.isArray(fallbackOperators)
    ? fallbackOperators
    : [];
  if (!operators.some(hasAutomationTag)) {
    return null;
  }

  const coreBonusPercent = normalizePercent(coreLayer3BonusPercent);
  const fallbackPercent = operators.reduce((total, operator) => {
    const basePercent = normalizePercent(operator?.basePercent);
    const layer3Bonus = normalizePercent(operator?.layer3Bonus);
    return total + layer3Bonus + (hasAutomationTag(operator) ? basePercent : 0);
  }, 0);

  return {
    coreBonusPercent,
    fallbackPercent,
    totalPercent: 100 + coreBonusPercent + fallbackPercent,
    clearedCoreBonusPercent: normalizePercent(coreBaseBonusPercent),
    clearedFallbackOperatorIds: operators
      .filter((operator) => !hasAutomationTag(operator))
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  };
}
