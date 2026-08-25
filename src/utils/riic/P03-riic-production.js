import {
  RIIC_REFERENCE_DAILY_RATES,
} from "../riicYield/riicYieldCore.js";

const PURE_GOLD_LMD_VALUE = 500;

export const RIIC_PRODUCTION_OUTPUT_META = Object.freeze({
  "manufacture:experience": Object.freeze({
    resource: "exp",
    label: "经验书",
    rateKey: "exp",
    unit: "经验/天",
  }),
  "manufacture:gold": Object.freeze({
    resource: "gold",
    label: "赤金",
    rateKey: "gold",
    unit: "根/天",
  }),
  "manufacture:orundum": Object.freeze({
    resource: "originiumShard",
    label: "源石碎片",
    dailyRate: 24,
    unit: "枚/天",
  }),
  "trading:lmd": Object.freeze({
    resource: "lmd",
    label: "龙门币",
    rateKey: "lmd",
    unit: "龙门币/天",
  }),
  "trading:orundum": Object.freeze({
    resource: "orundum",
    label: "合成玉",
    dailyRate: 240,
    unit: "合成玉/天",
  }),
  "hire:all": Object.freeze({
    resource: "recruitmentRefresh",
    label: "公招净刷新",
    dailyRate: 2,
    unit: "次/天",
    isNetBonus: true,
  }),
});

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getRiicRoomYieldMeta(room) {
  const sourceFacility = String(room?.facility || "").trim();
  const facility = sourceFacility === "office" ? "hire" : sourceFacility;
  const product = String(room?.product || "").trim();
  return (
    RIIC_PRODUCTION_OUTPUT_META[`${facility}:${product}`] ||
    (facility === "hire"
      ? RIIC_PRODUCTION_OUTPUT_META["hire:all"]
      : null)
  );
}

export function getRiicReferenceDailyRate(room, meta = getRiicRoomYieldMeta(room)) {
  if (!meta) {
    return null;
  }

  const facility = String(room?.facility || "").trim();
  const stationLevel = Number(room?.stationLevel);
  if (
    ["manufacture", "trading"].includes(facility) &&
    ![1, 2, 3].includes(stationLevel)
  ) {
    return null;
  }

  if (meta.dailyRate !== undefined) {
    return toFiniteNumber(meta.dailyRate);
  }

  const rate = toFiniteNumber(
    RIIC_REFERENCE_DAILY_RATES?.[facility]?.[meta.rateKey],
  );
  if (rate === null) {
    return null;
  }

  return meta.resource === "gold" ? rate / PURE_GOLD_LMD_VALUE : rate;
}

export function calculateRiicDirectProductionOutput({
  room,
  efficiency,
  durationHours,
  meta = getRiicRoomYieldMeta(room),
} = {}) {
  const normalizedEfficiency = toFiniteNumber(efficiency);
  const normalizedDurationHours = toFiniteNumber(durationHours);
  const dailyRate = getRiicReferenceDailyRate(room, meta);
  if (
    !meta ||
    normalizedEfficiency === null ||
    normalizedDurationHours === null ||
    normalizedDurationHours < 0 ||
    dailyRate === null
  ) {
    return 0;
  }

  return meta.isNetBonus
    ? dailyRate *
        Math.max(0, (normalizedEfficiency - 100) / 100) *
        (normalizedDurationHours / 24)
    : dailyRate *
        (normalizedEfficiency / 100) *
        (normalizedDurationHours / 24);
}
