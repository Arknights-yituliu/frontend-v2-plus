function normalizePercent(value) {
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : 0;
}

function hasAutomationTag(operator) {
  return (operator?.tags || []).some(
    (tag) => String(tag || "").trim() === "automation",
  );
}

/**
 * Resolves an automation skill bonus against the effective power-plant count.
 * The count is only an input to automation skill conditions; it is not a
 * physical facility count and must not be reused for drone charging.
 */
export function getRiicAutomationOperatorLayer3Bonus({
  operatorId,
  ownedOperators,
  scope,
  layoutData,
  effectivePowerPlantCount,
  getLayer3OperatorLocalBonus,
} = {}) {
  const normalizedOperatorId = String(operatorId || "").trim();
  const normalizedEffectivePowerPlantCount = Number(effectivePowerPlantCount);
  if (
    !normalizedOperatorId ||
    !layoutData ||
    !Array.isArray(ownedOperators) ||
    !Number.isFinite(normalizedEffectivePowerPlantCount) ||
    typeof getLayer3OperatorLocalBonus !== "function"
  ) {
    return null;
  }

  const getBonusAtPowerPlantCount = (powerPlantCount) =>
    getLayer3OperatorLocalBonus({
      operatorId: normalizedOperatorId,
      ownedOperators,
      scope,
      layoutData: {
        ...layoutData,
        powerPlantCount,
      },
    });

  if (normalizedEffectivePowerPlantCount <= 3) {
    return getBonusAtPowerPlantCount(normalizedEffectivePowerPlantCount);
  }

  const bonusAtTwo = getBonusAtPowerPlantCount(2);
  const bonusAtThree = getBonusAtPowerPlantCount(3);
  return (
    bonusAtThree +
    (bonusAtThree - bonusAtTwo) *
      (normalizedEffectivePowerPlantCount - 3)
  );
}

export function recalculateRiicAutomationManufacture({
  scope,
  coreBaseBonusPercent = 0,
  coreLayer3BonusPercent = 0,
  fallbackOperators = [],
  runtimeContext,
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
    ...(runtimeContext
      ? {
          powerPlantCount: Number(runtimeContext.powerPlantCount || 0),
          effectivePowerPlantCount: Number(
            runtimeContext.effectivePowerPlantCount || 0,
          ),
          supportOperatorId: String(
            runtimeContext.supportOperatorId || "",
          ).trim(),
        }
      : {}),
  };
}
