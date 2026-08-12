const TRADE_GOLD_PER_HOUR_AT_100_PERCENT = 0.85546;
const GOLD_MANUFACTURE_PER_HOUR_AT_100_PERCENT = 5 / 6;

function toFinitePercent(value) {
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : 0;
}

function round(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function getSourceMemberIndex(candidate) {
  const sourceMemberName = String(
    candidate?.teamCalculation?.sourceMember || "",
  ).trim();
  if (!sourceMemberName) {
    return -1;
  }

  return (candidate?.members || []).findIndex(
    (member) => String(member?.name || "").trim() === sourceMemberName,
  );
}

function getSourceOperatorId(candidate) {
  const memberIndex = getSourceMemberIndex(candidate);
  if (memberIndex < 0) {
    return "";
  }

  return String(candidate?.operatorIds?.[memberIndex] || "").trim();
}

function getOperatorNamesById(candidate, fallbackOperators) {
  const namesById = new Map();
  const record = (operator) => {
    const charId = String(operator?.charId || "").trim();
    const name = String(operator?.name || "").trim();
    if (charId && name) {
      namesById.set(charId, name);
    }
  };

  for (const operator of candidate?.operators || []) {
    record(operator);
  }
  for (const operator of candidate?.teamMemberProductionProfiles || []) {
    record(operator);
  }
  for (const operator of fallbackOperators || []) {
    record(operator);
  }

  return namesById;
}

function getOperatorBonusEntries({
  candidate,
  fallbackOperators,
  operatorBonusById,
}) {
  const sourceOperatorId = getSourceOperatorId(candidate);
  const roomOperatorIds = new Set([
    ...(candidate?.operatorIds || []),
    ...(fallbackOperators || []).map((operator) => operator?.charId),
  ].map((operatorId) => String(operatorId || "").trim()).filter(Boolean));
  const namesById = getOperatorNamesById(candidate, fallbackOperators);

  return Object.entries(operatorBonusById || {})
    .flatMap(([operatorId, bonusPercent]) => {
      const normalizedOperatorId = String(operatorId || "").trim();
      const normalizedBonusPercent = toFinitePercent(bonusPercent);
      if (
        !normalizedOperatorId ||
        normalizedOperatorId === sourceOperatorId ||
        !roomOperatorIds.has(normalizedOperatorId) ||
        normalizedBonusPercent === 0
      ) {
        return [];
      }

      return [{
        operatorId: normalizedOperatorId,
        name: namesById.get(normalizedOperatorId) || normalizedOperatorId,
        bonusPercent: normalizedBonusPercent,
      }];
    })
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, "zh-CN") ||
        left.operatorId.localeCompare(right.operatorId, "en"),
    );
}

function isClosureSpecialOrder(candidate, scope) {
  return (
    String(candidate?.teamCalculation?.type || "").trim() ===
      "closureSpecialOrder" &&
    String(scope?.roomType || "").trim() === "trading" &&
    String(scope?.product || "").trim() === "lmd" &&
    Number(scope?.stationLevel) === 3
  );
}

/**
 * L62: calculates Closure's special-order output after a room team is known.
 * Inputs are ordinary order efficiency only; this function never selects staff
 * or mutates the source candidate.
 */
export function recalculateRiicClosureSpecialOrder({
  candidate,
  scope,
  normalCoreBonusPercent,
  fallbackOperators = [],
  operatorBonusById,
} = {}) {
  if (!isClosureSpecialOrder(candidate, scope)) {
    return null;
  }

  const resolvedNormalCoreBonusPercent = toFinitePercent(
    normalCoreBonusPercent ??
      candidate?.closureCalculation?.normalCoreBonusPercent,
  );
  const resolvedFallbackOperators = Array.isArray(fallbackOperators)
    ? fallbackOperators
    : [];
  const fallbackOrderBonusPercent = resolvedFallbackOperators.reduce(
    (total, operator) => total + toFinitePercent(operator?.percent),
    0,
  );
  const controlCenterBonusByOperator = getOperatorBonusEntries({
    candidate,
    fallbackOperators: resolvedFallbackOperators,
    operatorBonusById:
      operatorBonusById ??
      candidate?.controlCenterOperatorBonusById ??
      {},
  });
  const controlCenterOrderBonusPercent = controlCenterBonusByOperator.reduce(
    (total, entry) => total + entry.bonusPercent,
    0,
  );
  const teammateOrderBonusPercent =
    resolvedNormalCoreBonusPercent +
    fallbackOrderBonusPercent +
    controlCenterOrderBonusPercent;
  const actualGoldSalePerHour =
    11 / 12 + teammateOrderBonusPercent / 120;
  const virtualGoldProductionPerHour =
    11 / 60 + teammateOrderBonusPercent / 600;
  const equivalentGoldSalePerHour =
    actualGoldSalePerHour + virtualGoldProductionPerHour;
  const tradeEquivalentTotalPercent =
    (equivalentGoldSalePerHour / TRADE_GOLD_PER_HOUR_AT_100_PERCENT) * 100;
  const goldEquivalentProductionPercent =
    (virtualGoldProductionPerHour /
      GOLD_MANUFACTURE_PER_HOUR_AT_100_PERCENT) *
    100;

  return {
    type: "closureSpecialOrder",
    sourceMember: String(candidate?.teamCalculation?.sourceMember || "").trim(),
    sourceOrderBonusPercent: resolvedNormalCoreBonusPercent,
    normalCoreBonusPercent: resolvedNormalCoreBonusPercent,
    fallbackOrderBonusPercent,
    controlCenterBonusByOperator,
    controlCenterOrderBonusPercent,
    teammateOrderBonusPercent,
    actualGoldSalePerHour: round(actualGoldSalePerHour, 5),
    virtualGoldProductionPerHour: round(virtualGoldProductionPerHour, 5),
    equivalentGoldSalePerHour: round(equivalentGoldSalePerHour, 5),
    tradeEquivalentTotalPercent: round(tradeEquivalentTotalPercent),
    tradeEquivalentBonusPercent: round(tradeEquivalentTotalPercent - 100),
    goldEquivalentProductionPercent: round(goldEquivalentProductionPercent),
  };
}
