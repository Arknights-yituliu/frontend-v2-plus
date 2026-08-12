const ORDER_SECONDS = [8640, 12600, 16560];
const ORDER_DISTRIBUTIONS = Object.freeze({
  default: [0.3, 0.5, 0.2],
  alpha: [0.15, 0.3, 0.55],
  alphaPair: [0.13, 0.22, 0.65],
  beta: [0.05, 0.1, 0.85],
});
const STATION_LEVEL_DEFAULT_ORDER_DISTRIBUTIONS = Object.freeze({
  1: [1, 0, 0],
  2: [0.6, 0.4, 0],
  3: ORDER_DISTRIBUTIONS.default,
});
const BUTSHU_PAYOUTS = Object.freeze({
  "0:false": [1500, 2000, 2000],
  "0:true": [1500, 2000, 2500],
  "2:false": [2000, 2500, 2000],
  "2:true": [2000, 2500, 2500],
});
const DEFAULT_ORDER_PAYOUTS = [1000, 1500, 2000];

function roundPercent(value) {
  return Number(value.toFixed(2));
}

function expectedRate(distribution, payouts) {
  const expectedSeconds = distribution.reduce(
    (total, probability, index) =>
      total + probability * ORDER_SECONDS[index],
    0,
  );
  const expectedPayout = distribution.reduce(
    (total, probability, index) => total + probability * payouts[index],
    0,
  );
  return expectedPayout / expectedSeconds;
}

function getOrderDistribution(distribution, stationLevel) {
  if (distribution === "default") {
    return STATION_LEVEL_DEFAULT_ORDER_DISTRIBUTIONS[stationLevel] || null;
  }

  return stationLevel === 3
    ? ORDER_DISTRIBUTIONS[distribution] || null
    : null;
}

function getButshuMultiplier({
  elite,
  tequila,
  distribution,
  stationLevel,
}) {
  const payouts = BUTSHU_PAYOUTS[`${elite}:${tequila}`];
  const probabilities = getOrderDistribution(distribution, stationLevel);
  const referenceProbabilities = getOrderDistribution(
    "default",
    stationLevel,
  );
  if (!payouts || !probabilities || !referenceProbabilities) {
    return null;
  }

  return (
    expectedRate(probabilities, payouts) /
    expectedRate(referenceProbabilities, DEFAULT_ORDER_PAYOUTS)
  );
}

function calculateTradingPercent({ rawOrderEfficiency, multiplier }) {
  return roundPercent(
    ((1 + Number(rawOrderEfficiency) / 100) * multiplier - 1) * 100,
  );
}

function calculateTequilaVirtualGoldMetrics({
  rawOrderEfficiency,
  distribution,
  stationLevel,
}) {
  const probabilities = getOrderDistribution(distribution, stationLevel);
  if (!probabilities) {
    return null;
  }

  const averageOrderHours =
    probabilities.reduce(
      (total, probability, index) =>
        total + probability * ORDER_SECONDS[index],
      0,
    ) / 3600;
  const virtualGoldPerHour =
    (probabilities[2] * (1 + Number(rawOrderEfficiency) / 100)) /
    averageOrderHours;

  return roundPercent(virtualGoldPerHour * 1.2 * 100);
}

function getButshuFamilyConfiguration(candidate) {
  const variantGroupId = String(candidate?.variantGroupId || "").trim();
  const members = Array.isArray(candidate?.members) ? candidate.members : [];
  if (!variantGroupId.startsWith("family-butshu:") || members.length === 0) {
    return null;
  }

  const group = variantGroupId
    .slice("family-butshu:".length)
    .split(":fixed-partner:", 1)[0];
  const firstMemberElite = Number(members[0]?.elite || 0);
  if (![0, 2].includes(firstMemberElite)) {
    return null;
  }

  if (group === "shamare-tequila") {
    return {
      elite: firstMemberElite,
      hasShamare: true,
      hasTequila: true,
      distribution: "default",
      fixedMemberCount: 3,
    };
  }
  if (group === "shamare-plain") {
    return {
      elite: firstMemberElite,
      hasShamare: true,
      hasTequila: false,
      distribution: "default",
      fixedMemberCount: 2,
    };
  }
  if (group === "tequila-plain") {
    return {
      elite: firstMemberElite,
      hasShamare: false,
      hasTequila: true,
      distribution: "default",
      fixedMemberCount: 2,
    };
  }
  if (group === "plain-pair") {
    return {
      elite: firstMemberElite,
      hasShamare: false,
      hasTequila: false,
      distribution: "default",
      fixedMemberCount: 1,
    };
  }
  if (group === `solo-${firstMemberElite === 0 ? "alpha" : "beta"}`) {
    return {
      elite: firstMemberElite,
      hasShamare: false,
      hasTequila: false,
      distribution: "default",
      fixedMemberCount: 1,
    };
  }

  const tailorMatch = group.match(
    /^(?:(shamare|tequila)-)?tailor-(alpha|beta)(?:-(plain|pair))?$/,
  );
  if (!tailorMatch) {
    return null;
  }

  const [, prefix = "", tailorState, shape = "plain"] = tailorMatch;
  const hasShamare = prefix === "shamare";
  const hasTequila = prefix === "tequila";
  if (!prefix && !tailorMatch[3]) {
    return null;
  }
  const tailorCount = shape === "pair" ? 2 : 1;
  const distribution =
    tailorState === "beta"
      ? "beta"
      : hasShamare || tailorCount > 1
        ? "alphaPair"
        : "alpha";

  return {
    elite: firstMemberElite,
    hasShamare,
    hasTequila,
    distribution,
    fixedMemberCount: 1 + Number(hasShamare) + Number(hasTequila) + tailorCount,
  };
}

function getButshuFixedPartnerPercent(candidate) {
  const composition = candidate?.composition;
  if (composition?.kind !== "butshu-fixed-partner") {
    return 0;
  }

  const percent = Number(composition.partnerBonusPercent);
  return Number.isFinite(percent) ? percent : 0;
}

function hasButshuFixedPartner(candidate) {
  return candidate?.composition?.kind === "butshu-fixed-partner";
}

export function getRiicButshuFallbackMinimumPercent(candidate) {
  return String(candidate?.variantGroupId || "").startsWith("family-butshu:")
    ? 20
    : null;
}

export function recalculateRiicButshuCandidate({
  candidate,
  scope,
  fallbackOperators,
}) {
  const configuration = getButshuFamilyConfiguration(candidate);
  const stationLevel = Number(scope?.stationLevel);
  const roomType = String(scope?.roomType || "").trim();
  const product = String(scope?.product || "").trim();
  const memberCount = (candidate?.members || []).length;
  const usesFixedPartner = hasButshuFixedPartner(candidate);
  if (
    !configuration ||
    roomType !== "trading" ||
    product !== "lmd" ||
    !Number.isInteger(stationLevel) ||
    stationLevel < 1 ||
    (memberCount !== configuration.fixedMemberCount &&
      (!usesFixedPartner || memberCount <= configuration.fixedMemberCount))
  ) {
    return null;
  }

  const fallbackPercent = (fallbackOperators || []).reduce(
    (total, operator) => total + Number(operator?.percent || 0),
    0,
  );
  const fixedPartnerPercent = getButshuFixedPartnerPercent(candidate);
  const rawOrderEfficiency =
    (configuration.hasShamare ? 90 : 0) +
    fallbackPercent +
    fixedPartnerPercent;
  const multiplier = getButshuMultiplier({
    elite: configuration.elite,
    tequila: configuration.hasTequila,
    distribution: configuration.distribution,
    stationLevel,
  });
  if (multiplier === null) {
    return null;
  }

  const tradingPercent = calculateTradingPercent({
    rawOrderEfficiency,
    multiplier,
  });
  const tequilaMetrics = configuration.hasTequila
    ? calculateTequilaVirtualGoldMetrics({
        rawOrderEfficiency,
        distribution: configuration.distribution,
        stationLevel,
      })
    : null;

  return {
    tradingPercent,
    fallbackPercent,
    fixedPartnerPercent,
    ...(tequilaMetrics
      ? {
          gold: tequilaMetrics,
        }
      : {}),
  };
}
