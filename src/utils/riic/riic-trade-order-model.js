export const RIIC_TRADE_ORDER_SECONDS = Object.freeze([
  8640,
  12600,
  16560,
]);

export const RIIC_TRADE_ORDER_GOLD = Object.freeze([2, 3, 4]);

export const RIIC_TRADE_ORDER_DISTRIBUTION_BY_LEVEL = Object.freeze({
  1: Object.freeze([1, 0, 0]),
  2: Object.freeze([0.6, 0.4, 0]),
  3: Object.freeze([0.3, 0.5, 0.2]),
});

const TAILOR_ALPHA_DISTRIBUTION = Object.freeze([0.15, 0.3, 0.55]);
const TAILOR_BETA_DISTRIBUTION = Object.freeze([0.05, 0.1, 0.85]);
const TAILOR_ALPHA_PAIR_DISTRIBUTION = Object.freeze([0.13, 0.22, 0.65]);
const TAILOR_ALPHA_WARMUP_HOURS = 3;
const TAILOR_BETA_WARMUP_HOURS = 5;

export function getRiicTradeOrderDistribution({
  stationLevel,
  highQualityVariants = [],
  allowExtraAlphaWithBeta = false,
} = {}) {
  if (highQualityVariants.length === 0) {
    return RIIC_TRADE_ORDER_DISTRIBUTION_BY_LEVEL[stationLevel] || null;
  }
  if (stationLevel !== 3) {
    return null;
  }

  const betaCount = highQualityVariants.filter(
    (variant) => variant === "beta",
  ).length;
  const alphaCount = highQualityVariants.filter(
    (variant) => variant === "alpha",
  ).length;
  if (betaCount > 1 || alphaCount + betaCount !== highQualityVariants.length) {
    return null;
  }
  if (betaCount === 1) {
    return TAILOR_BETA_DISTRIBUTION;
  }
  if (alphaCount > 2 && !allowExtraAlphaWithBeta) {
    return null;
  }
  if (alphaCount === 2) {
    return TAILOR_ALPHA_PAIR_DISTRIBUTION;
  }
  return TAILOR_ALPHA_DISTRIBUTION;
}

function getAverageWarmupProgress(durationHours, warmupHours) {
  if (durationHours <= 0) {
    return 0;
  }
  if (durationHours <= warmupHours) {
    return durationHours / (2 * warmupHours);
  }
  return 1 - warmupHours / (2 * durationHours);
}

export function getRiicTradeAverageOrderDistribution({
  stationLevel,
  highQualityVariants = [],
  durationHours,
  allowExtraAlphaWithBeta = false,
} = {}) {
  const peakDistribution = getRiicTradeOrderDistribution({
    stationLevel,
    highQualityVariants,
    allowExtraAlphaWithBeta,
  });
  if (!peakDistribution || highQualityVariants.length === 0) {
    return peakDistribution;
  }

  const baselineDistribution =
    RIIC_TRADE_ORDER_DISTRIBUTION_BY_LEVEL[stationLevel];
  const normalizedDurationHours = Number(durationHours);
  if (
    !baselineDistribution ||
    !Number.isFinite(normalizedDurationHours) ||
    normalizedDurationHours < 0
  ) {
    return null;
  }

  const warmupHours = highQualityVariants.includes("beta")
    ? TAILOR_BETA_WARMUP_HOURS
    : TAILOR_ALPHA_WARMUP_HOURS;
  const progress = getAverageWarmupProgress(
    normalizedDurationHours,
    warmupHours,
  );
  return baselineDistribution.map(
    (baseline, index) =>
      baseline + (peakDistribution[index] - baseline) * progress,
  );
}

export function calculateRiicExpectedPerHour(distribution, values) {
  const seconds = distribution.reduce(
    (sum, probability, index) =>
      sum + probability * RIIC_TRADE_ORDER_SECONDS[index],
    0,
  );
  const amount = distribution.reduce(
    (sum, probability, index) => sum + probability * values[index],
    0,
  );
  return (amount / seconds) * 3600;
}

export function calculateRiicExpectedPerDrone(distribution, values) {
  const seconds = distribution.reduce(
    (total, probability, index) =>
      total + probability * RIIC_TRADE_ORDER_SECONDS[index],
    0,
  );
  const amount = distribution.reduce(
    (total, probability, index) => total + probability * values[index],
    0,
  );
  return (amount * 180) / seconds;
}
