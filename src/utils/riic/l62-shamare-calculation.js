const ORDER_SECONDS = [8640, 12600, 16560];
const DEFAULT_ORDER_DISTRIBUTION = [0.3, 0.5, 0.2];
const TAILOR_ALPHA_ORDER_DISTRIBUTION = [0.15, 0.3, 0.55];
const DEFAULT_ORDER_PAYOUTS = [1000, 1500, 2000];
const SHAMARE_IDLE_VARIANT_GROUP = "family-shamare:idle-pair";

function expectedOrderRate(distribution) {
  const expectedSeconds = distribution.reduce(
    (total, probability, index) =>
      total + probability * ORDER_SECONDS[index],
    0,
  );
  const expectedPayout = distribution.reduce(
    (total, probability, index) =>
      total + probability * DEFAULT_ORDER_PAYOUTS[index],
    0,
  );
  return expectedPayout / expectedSeconds;
}

function roundPercent(value) {
  return Number(value.toFixed(2));
}

export function isRiicShamareIdleCandidate(candidate) {
  return (
    String(candidate?.variantGroupId || "").trim() ===
    SHAMARE_IDLE_VARIANT_GROUP
  );
}

export function recalculateRiicShamareIdleCandidate({
  candidate,
  scope,
  fallbackOperators,
} = {}) {
  if (
    !isRiicShamareIdleCandidate(candidate) ||
    String(scope?.roomType || "").trim() !== "trading" ||
    String(scope?.product || "").trim() !== "lmd" ||
    Number(scope?.stationLevel) !== 3 ||
    Number(scope?.slotCount) !== 3 ||
    (fallbackOperators || []).length !== 2
  ) {
    return null;
  }

  const whisperBonusPercent = 45 * fallbackOperators.length;
  const tailorAlphaMultiplier =
    expectedOrderRate(TAILOR_ALPHA_ORDER_DISTRIBUTION) /
    expectedOrderRate(DEFAULT_ORDER_DISTRIBUTION);
  const tradingPercent = roundPercent(
    ((1 + whisperBonusPercent / 100) * tailorAlphaMultiplier - 1) * 100,
  );

  return {
    tradingPercent,
    whisperBonusPercent,
    fillerPercent: 0,
    orderDistribution: "alpha",
  };
}
