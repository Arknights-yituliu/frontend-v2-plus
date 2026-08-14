const ORDER_SECONDS = Object.freeze([8640, 12600, 16560]);
const ORDER_GOLD = Object.freeze([2, 3, 4]);
const ORDER_DISTRIBUTION_BY_LEVEL = Object.freeze({
  1: Object.freeze([1, 0, 0]),
  2: Object.freeze([0.6, 0.4, 0]),
  3: Object.freeze([0.3, 0.5, 0.2]),
});
const TAILOR_ALPHA_DISTRIBUTION = Object.freeze([0.15, 0.3, 0.55]);
const TAILOR_BETA_DISTRIBUTION = Object.freeze([0.05, 0.1, 0.85]);

const DRONE_SECONDS = 180;
const LMD_PER_GOLD = 500;
const CLOSURE_LMD_PER_GOLD = 600;
const ORUNDUM_PER_HOUR = 10;
const ORUNDUM_PER_SHARD = 10;

const CLOSURE_ID = "char_4228_closur";
const BUTSHU_ID = "char_4032_provs";
const TEQUILA_ID = "char_486_takila";
const TAILOR_ID = "char_252_bibeak";

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function createFailure(error) {
  return {
    ok: false,
    lmdOutput: null,
    goldConsumption: null,
    orundumOutput: null,
    shardConsumption: null,
    error,
  };
}

function createSuccess({
  lmdOutput = 0,
  goldConsumption = 0,
  orundumOutput = 0,
  shardConsumption = 0,
}) {
  return {
    ok: true,
    lmdOutput: round(lmdOutput),
    goldConsumption: round(goldConsumption),
    orundumOutput: round(orundumOutput),
    shardConsumption: round(shardConsumption),
    error: "",
  };
}

function normalizeOperators(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const seen = new Set();
  const operators = [];
  for (const source of value) {
    const charId = String(source?.charId || "").trim();
    const elite = Number(source?.elite);
    const level = Number(source?.level);
    if (
      !charId ||
      seen.has(charId) ||
      !Number.isInteger(elite) ||
      elite < 0 ||
      !Number.isInteger(level) ||
      level < 1
    ) {
      return null;
    }
    seen.add(charId);
    operators.push({ charId, elite, level });
  }

  return operators;
}

function calculateExpectedPerDrone(distribution, values) {
  const seconds = distribution.reduce(
    (total, probability, index) =>
      total + probability * ORDER_SECONDS[index],
    0,
  );
  const amount = distribution.reduce(
    (total, probability, index) => total + probability * values[index],
    0,
  );
  return (amount * DRONE_SECONDS) / seconds;
}

function getOperator(operators, charId) {
  return operators.find((operator) => operator.charId === charId) || null;
}

function getOrderDistribution({ stationLevel, tailor }) {
  if (!tailor) {
    return ORDER_DISTRIBUTION_BY_LEVEL[stationLevel] || null;
  }
  if (stationLevel !== 3) {
    return null;
  }
  return tailor.elite >= 2
    ? TAILOR_BETA_DISTRIBUTION
    : TAILOR_ALPHA_DISTRIBUTION;
}

function calculateLmdDrone({ stationLevel, operators }) {
  const closure = getOperator(operators, CLOSURE_ID);
  const butshu = getOperator(operators, BUTSHU_ID);
  const tequila = getOperator(operators, TEQUILA_ID);
  const tailor = getOperator(operators, TAILOR_ID);
  const hasClosureSpecialOrder = closure?.elite >= 2;

  if (hasClosureSpecialOrder) {
    const speedMultiplier = 1.1;
    return createSuccess({
      lmdOutput:
        CLOSURE_LMD_PER_GOLD *
        (5 / 6) *
        speedMultiplier *
        (DRONE_SECONDS / 3600),
      goldConsumption:
        (5 / 6) * speedMultiplier * (DRONE_SECONDS / 3600),
    });
  }

  const distribution = getOrderDistribution({ stationLevel, tailor });
  if (!distribution) {
    return createFailure("notSupported");
  }

  const goldPerOrder = butshu
    ? butshu.elite >= 2
      ? [4, 5, 4]
      : [3, 4, 4]
    : ORDER_GOLD;
  const tequilaBonus = tequila
    ? tequila.elite >= 2
      ? 500
      : 250
    : 0;
  const lmdPerOrder = goldPerOrder.map((gold, index) =>
    gold * LMD_PER_GOLD + (index === 2 && tequila ? tequilaBonus : 0),
  );

  return createSuccess({
    lmdOutput: calculateExpectedPerDrone(distribution, lmdPerOrder),
    goldConsumption: calculateExpectedPerDrone(distribution, goldPerOrder),
  });
}

/**
 * P02: calculate the actual resource change from one drone used in a trading
 * station. It ignores ordinary efficiency, room bonuses, and control-center
 * bonuses; L80 applies the number of drones for each shift.
 */
export function calculateRiicTradingDrone(facility, operators) {
  const normalizedOperators = normalizeOperators(operators);
  const product = String(facility?.product || "").trim();
  const stationLevel = Number(facility?.level);

  if (
    String(facility?.type || "").trim() !== "trading" ||
    !["lmd", "orundum"].includes(product) ||
    !Number.isInteger(stationLevel) ||
    ![1, 2, 3].includes(stationLevel)
  ) {
    return createFailure("invalidFacility");
  }
  if (!normalizedOperators) {
    return createFailure("invalidOperators");
  }

  if (product === "orundum") {
    if (stationLevel !== 3) {
      return createFailure("unsupportedStationLevel");
    }
    const orundumOutput = ORUNDUM_PER_HOUR * (DRONE_SECONDS / 3600);
    return createSuccess({
      orundumOutput,
      shardConsumption: orundumOutput / ORUNDUM_PER_SHARD,
    });
  }

  return calculateLmdDrone({
    stationLevel,
    operators: normalizedOperators,
  });
}
