import BUILDING_TABLE from "../../static/json/build/building_table.json" with {
  type: "json",
};
import {
  calculateRiicExpectedPerDrone,
  getRiicTradeOrderDistribution,
  RIIC_TRADE_ORDER_GOLD,
} from "./riic-trade-order-model.js";

const ORDER_GOLD = RIIC_TRADE_ORDER_GOLD;
const HIGH_QUALITY_ORDER_PATTERN = /高品质贵金属订单/;

const DRONE_SECONDS = 180;
const LMD_PER_GOLD = 500;
const CLOSURE_LMD_PER_GOLD = 600;
const ORUNDUM_PER_HOUR = 10;
const ORUNDUM_PER_SHARD = 10;

const CLOSURE_ID = "char_4228_closur";
const BUTSHU_ID = "char_4032_provs";
const TEQUILA_ID = "char_486_takila";

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

function getOperator(operators, charId) {
  return operators.find((operator) => operator.charId === charId) || null;
}

function getHighQualityOrderVariant(operator) {
  const skill = (BUILDING_TABLE || [])
    .filter(
      (candidate) =>
        candidate?.charId === operator.charId &&
        candidate?.roomType === "trading" &&
        Number(candidate?.phase) <= operator.elite &&
        Number(candidate?.level) <= operator.level &&
        HIGH_QUALITY_ORDER_PATTERN.test(String(candidate?.description || "")),
    )
    .sort(
      (left, right) =>
        Number(right?.phase) - Number(left?.phase) ||
        Number(right?.level) - Number(left?.level),
    )[0];

  if (!skill) {
    return null;
  }

  return String(skill.description || "").includes("小幅提升")
    ? "alpha"
    : "beta";
}

function getOrderDistribution({ stationLevel, highQualityVariants }) {
  return getRiicTradeOrderDistribution({
    stationLevel,
    highQualityVariants,
  });
}

function calculateLmdDrone({ stationLevel, operators }) {
  const closure = getOperator(operators, CLOSURE_ID);
  const butshu = getOperator(operators, BUTSHU_ID);
  const tequila = getOperator(operators, TEQUILA_ID);
  const highQualityVariants = operators
    .map(getHighQualityOrderVariant)
    .filter(Boolean);
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

  const distribution = getOrderDistribution({
    stationLevel,
    highQualityVariants,
  });
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
    lmdOutput: calculateRiicExpectedPerDrone(distribution, lmdPerOrder),
    goldConsumption: calculateRiicExpectedPerDrone(
      distribution,
      goldPerOrder,
    ),
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
