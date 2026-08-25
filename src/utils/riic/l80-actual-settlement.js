import {
  createRiicOperatorRosterById,
  getRiicTradingOperators,
} from "./P01-riic-trading.js";
import { calculateRiicTradingDrone } from "./P02-riic-trading-drone.js";
import {
  calculateRiicDirectProductionOutput,
  getRiicReferenceDailyRate,
  getRiicRoomYieldMeta,
} from "./P03-riic-production.js";
import { settleRiicNetResources } from "./P04-riic-resource-netting.js";
import {
  calculateRiicExpectedPerHour,
  RIIC_TRADE_ORDER_DISTRIBUTION_BY_LEVEL,
  RIIC_TRADE_ORDER_GOLD,
} from "./riic-trade-order-model.js";

const EPSILON = 1e-9;
const DRONE_BASE_CHARGE_MINUTES = 6;
const DRONE_BASE_PER_HOUR = 60 / DRONE_BASE_CHARGE_MINUTES;
const POWER_OPERATOR_CHARGE_BONUS_PERCENT = 5;
const DRONE_ACCELERATION_HOURS = 3 / 60;
const DRONE_STORAGE_LIMIT = 235;
const ORUNDUM_MANUFACTURE_RECIPES = Object.freeze({
  orirock: Object.freeze({
    material: "orirock",
    materialLabel: "固源岩",
    materialPerShard: 2,
    lmdPerShard: 1600,
  }),
  device: Object.freeze({
    material: "device",
    materialLabel: "装置",
    materialPerShard: 1,
    lmdPerShard: 1000,
  }),
});
const YIELD_FACILITIES = new Set([
  "manufacture",
  "trading",
  "hire",
  "office",
]);
const DISPLAY_RESOURCE_ORDER = Object.freeze([
  "lmd",
  "exp",
  "gold",
  "originiumShard",
  "orundum",
  "recruitmentRefresh",
]);

const DISPLAY_RESOURCE_META = Object.freeze({
  lmd: Object.freeze({ label: "龙门币", unit: "龙门币/天" }),
  exp: Object.freeze({ label: "经验书", unit: "经验/天" }),
  gold: Object.freeze({ label: "净赤金", unit: "根/天" }),
  originiumShard: Object.freeze({ label: "净源石碎片", unit: "枚/天" }),
  orundum: Object.freeze({ label: "合成玉", unit: "合成玉/天" }),
  recruitmentRefresh: Object.freeze({
    label: "公招净刷新",
    unit: "次/天",
  }),
});

function toPositiveHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function toFinitePercent(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const percent = Number(value);
  return Number.isFinite(percent) ? percent : null;
}

function roundPercent(value) {
  return Math.round(value * 10) / 10;
}

function roundYield(value) {
  return Math.round(value * 100) / 100;
}

function isTradingRoom(room) {
  return (
    String(room?.facility || "").trim() === "trading" &&
    ["lmd", "orundum"].includes(String(room?.product || "").trim())
  );
}

function isOrundumManufactureRoom(room) {
  return (
    String(room?.facility || "").trim() === "manufacture" &&
    String(room?.product || "").trim() === "orundum"
  );
}

function normalizeOrundumCraftMaterial(value) {
  const material = String(value || "").trim();
  return ORUNDUM_MANUFACTURE_RECIPES[material] ? material : "orirock";
}

function createOrundumManufactureFlow(output, craftMaterial) {
  const shardOutput = Number(output);
  if (!Number.isFinite(shardOutput)) {
    return null;
  }

  const recipe =
    ORUNDUM_MANUFACTURE_RECIPES[
      normalizeOrundumCraftMaterial(craftMaterial)
    ];
  return {
    lmdConsumption: shardOutput * recipe.lmdPerShard,
    craftMaterial: recipe.material,
    craftMaterialLabel: recipe.materialLabel,
    craftMaterialConsumption: shardOutput * recipe.materialPerShard,
  };
}

function calculateTradingDroneRoom({ room, rosterById }) {
  if (!isTradingRoom(room)) {
    return null;
  }

  const operators =
    room?.tradingSettlement?.calculation?.inputDiagnostics?.p01Operators ||
    getRiicTradingOperators(room, rosterById || new Map());
  return calculateRiicTradingDrone(
    {
      type: "trading",
      product: String(room?.product || "").trim(),
      level: Number(room?.stationLevel),
    },
    operators,
  );
}

function createTradingDroneFlow(calculation, droneCount) {
  const multiplier = Number(droneCount);
  const normalizedCalculation = calculation || {};
  if (
    !Number.isFinite(multiplier) ||
    multiplier < 0
  ) {
    return {
      type: normalizedCalculation.type || "normal",
      lmdOutput: 0,
      orundumOutput: 0,
      goldConsumption: 0,
      virtualGoldOutput: 0,
      shardConsumption: 0,
    };
  }

  return {
    type: "drone",
    lmdOutput: Number(normalizedCalculation.lmdOutput || 0) * multiplier,
    orundumOutput:
      Number(normalizedCalculation.orundumOutput || 0) * multiplier,
    goldConsumption:
      Number(normalizedCalculation.goldConsumption || 0) * multiplier,
    virtualGoldOutput: 0,
    shardConsumption:
      Number(normalizedCalculation.shardConsumption || 0) * multiplier,
  };
}

function createTradingFlow(calculation, durationHours) {
  const normalizedDurationHours =
    Number.isFinite(Number(durationHours)) && Number(durationHours) >= 0
      ? Number(durationHours)
      : 0;

  return {
    type: calculation?.type || "normal",
    lmdOutput:
      calculation?.product === "lmd"
        ? Number(calculation?.lmd || 0) * normalizedDurationHours
        : 0,
    orundumOutput:
      calculation?.product === "orundum"
        ? Number(calculation?.orundumCapacity || 0) *
          normalizedDurationHours
        : 0,
    goldConsumption:
      calculation?.product === "lmd"
        ? Math.max(
            0,
            -Number(calculation?.gold || 0) * normalizedDurationHours,
          )
        : 0,
    virtualGoldOutput:
      calculation?.product === "lmd"
        ? Number(calculation?.virtualGold || 0) * normalizedDurationHours
        : 0,
    shardConsumption:
      calculation?.product === "orundum"
        ? Number(calculation?.shardConsumption || 0) *
          normalizedDurationHours
        : 0,
  };
}

function createMaaFallbackTradingCalculation(room, durationHours) {
  const stationLevel = Number(room?.stationLevel);
  const distribution = RIIC_TRADE_ORDER_DISTRIBUTION_BY_LEVEL[stationLevel];
  if (!distribution || durationHours <= 0) {
    return null;
  }

  const roomBonus =
    Number(room?.controlCenterFacilityBonusPercent || 0) +
    Number(room?.activeRosterBonusPercent || 0) +
    Number(room?.resourceChainAdditionalBonusPercent || 0);
  const operatorCount = Array.isArray(room?.operators)
    ? room.operators.filter(Boolean).length
    : 0;
  const speedMultiplier = 1 + (roomBonus + operatorCount) / 100;
  const goldPerHour = calculateRiicExpectedPerHour(
    distribution,
    RIIC_TRADE_ORDER_GOLD,
  );
  const gold = -goldPerHour * speedMultiplier;

  return {
    ok: true,
    type: "normal",
    product: "lmd",
    durationHours,
    rate: speedMultiplier * 100,
    lmd: -gold * 500,
    gold,
    virtualGold: 0,
    orundumCapacity: 0,
    fallback: true,
    fallbackReason: "notSupported",
    fallbackDiagnostics: {
      method: "普通贸易订单预置估算",
      stationLevel,
      orderDistribution: distribution,
      orderGold: RIIC_TRADE_ORDER_GOLD,
      operatorCount,
      roomBonus,
      speedMultiplier,
    },
  };
}

function createRoomSummary(room) {
  return {
    key: String(room?.key || "").trim(),
    label: String(room?.label || room?.key || "").trim(),
    facility: String(room?.facility || "").trim(),
    product: String(room?.product || "").trim(),
    products: new Set(),
    durationHours: 0,
    calculatedDurationHours: 0,
    efficiencyPercentHours: 0,
    controlCenterBonusPercentHours: 0,
    manuallyEdited: false,
    segments: [],
  };
}

function createSegment({ room, state, durationHours }) {
  const efficiency = toFinitePercent(room?.efficiency);
  const manuallyEdited = room?.manuallyEdited === true;
  const calculated = true;
  const normalizedEfficiency = efficiency === null ? 0 : efficiency;
  const controlCenterFacilityBonusPercent = toFinitePercent(
    room?.controlCenterFacilityBonusPercent,
  );
  const controlCenterOperatorBonusPercent = toFinitePercent(
    room?.controlCenterOperatorBonusPercent,
  );
  const controlCenterBonusPercent =
    (controlCenterFacilityBonusPercent || 0) +
    (controlCenterOperatorBonusPercent || 0);

  return {
    startHour: Number.isFinite(Number(state?.startHour))
      ? Number(state.startHour)
      : 0,
    durationHours,
    efficiency: normalizedEfficiency,
    controlCenterBonusPercent: controlCenterBonusPercent || 0,
    sameShiftBindingStatus: String(
      room?.sameShiftBindingStatus || "notApplicable",
    ),
    manuallyEdited,
    calculated,
  };
}

function createYieldRoomSummary(room) {
  return {
    key: String(room?.key || "").trim(),
    label: String(room?.label || room?.key || "").trim(),
    facility: String(room?.facility || "").trim(),
    product: String(room?.product || "").trim(),
    stationLevel: Number(room?.stationLevel) || null,
    meta: getRiicRoomYieldMeta(room),
    durationHours: 0,
    calculatedDurationHours: 0,
    outputPerCycle: 0,
    segments: [],
  };
}

function createL79TradingFlow(room, durationHours) {
  const settlement = room?.l79Settlement;
  const hourly = settlement?.hourly || {};
  const calculation = room?.tradingSettlement?.calculation || null;

  const product = String(room?.product || "").trim();
  return {
    type: calculation?.type || "normal",
    lmdOutput:
      product === "lmd" ? Number(hourly.lmd || 0) * durationHours : 0,
    orundumOutput:
      product === "orundum"
        ? Number(hourly.orundum || 0) * durationHours
        : 0,
    goldConsumption:
      product === "lmd"
        ? Math.max(0, -Number(hourly.gold || 0) * durationHours)
        : 0,
    virtualGoldOutput:
      product === "lmd" ? Number(hourly.vgold || 0) * durationHours : 0,
    shardConsumption:
      product === "orundum"
        ? Math.max(0, -Number(hourly.shard || 0) * durationHours)
        : 0,
  };
}

function createL79ManufactureFlow(room, durationHours, orundumCraftMaterial) {
  const settlement = room?.l79Settlement;
  const hourly = settlement?.hourly || {};
  if (
    String(room?.facility || "").trim() !== "manufacture" ||
    String(room?.product || "").trim() !== "orundum"
  ) {
    return null;
  }

  const craftMaterial =
    Number(hourly.device || 0) < 0 ? "device" : orundumCraftMaterial;
  const flow = createOrundumManufactureFlow(
    Number(hourly.shard || 0) * durationHours,
    craftMaterial,
  );
  if (!flow) {
    return null;
  }

  return {
    ...flow,
    lmdConsumption: Math.max(
      0,
      -Number(hourly.lmd || 0) * durationHours,
    ),
  };
}

function createL79YieldSegment({
  room,
  durationHours,
  orundumCraftMaterial,
} = {}) {
  if (!room?.l79Settlement) {
    return null;
  }

  const settlement = room.l79Settlement;
  const facility = String(room?.facility || "").trim();
  const product = String(room?.product || "").trim();
  const meta = getRiicRoomYieldMeta(room);
  const calculated = true;
  const tradingFlow =
    facility === "trading"
      ? createL79TradingFlow(room, durationHours)
      : null;
  const orundumManufactureFlow = createL79ManufactureFlow(
    room,
    durationHours,
    orundumCraftMaterial,
  );
  const directOutput =
    facility === "trading"
      ? tradingFlow
        ? product === "orundum"
          ? tradingFlow.orundumOutput
          : tradingFlow.lmdOutput
        : null
      : facility === "manufacture"
        ? product === "orundum"
          ? Number(settlement.hourly?.shard || 0) * durationHours
          : product === "experience"
            ? Number(settlement.hourly?.exp || 0) * durationHours
            : product === "gold"
              ? Number(settlement.hourly?.gold || 0) * durationHours
              : null
        : facility === "hire"
          ? Number(settlement.hourly?.recruitmentRefresh || 0) *
            durationHours
          : null;
  const unavailableReason =
    directOutput === null && meta
      ? "unsupportedProduct"
      : settlement.message?.[0]?.text || "";

  return {
    durationHours,
    calculated: true,
    unavailableReason,
    output: Number.isFinite(directOutput) ? directOutput : 0,
    tradingFlow,
    tradingCalculation: room?.tradingSettlement?.calculation || null,
    calculationMethod: "L79统一资源流",
    fallbackDiagnostics: null,
    orundumManufactureFlow,
  };
}

function createYieldSegment({
  room,
  durationHours,
  orundumCraftMaterial,
  allowMaaFallback = false,
}) {
  const tradingRoom = isTradingRoom(room);
  const maaFallbackEligible =
    allowMaaFallback &&
    tradingRoom &&
    String(room?.product || "").trim() === "lmd" &&
    !room?.tradingSettlement?.calculation?.ok &&
    room?.tradingSettlement?.calculation?.error === "notSupported";
  const l79Segment = createL79YieldSegment({
    room,
    durationHours,
    orundumCraftMaterial,
  });
  if (l79Segment && !maaFallbackEligible) {
    return l79Segment;
  }

  const efficiency = toFinitePercent(room?.efficiency);
  const efficiencyCalculated =
    efficiency !== null &&
    room?.efficiencyMetrics?.actual?.status === "calculated";
  const meta = getRiicRoomYieldMeta(room);
  const usesDirectEfficiency = !tradingRoom;
  const dailyRate = usesDirectEfficiency
    ? getRiicReferenceDailyRate(room, meta)
    : null;
  const tradingCalculation = tradingRoom
    ? room?.tradingSettlement?.calculation || null
    : null;
  const fallbackTradingCalculation =
    maaFallbackEligible
      ? createMaaFallbackTradingCalculation(room, durationHours)
      : null;
  const effectiveTradingCalculation =
    fallbackTradingCalculation || tradingCalculation;
  const calculatedTradingFlow = createTradingFlow(
    effectiveTradingCalculation,
    durationHours,
  );
  const unavailableReason = usesDirectEfficiency
    ? !efficiencyCalculated
      ? "efficiencyUnavailable"
      : !meta
        ? "unsupportedProduct"
        : dailyRate === null
          ? "unsupportedStationLevel"
          : ""
    : effectiveTradingCalculation?.ok
      ? ""
      : tradingCalculation?.error ||
        room?.tradingSettlement?.error ||
        "tradingSettlementUnavailable";

  const directProductionOutput = calculateRiicDirectProductionOutput({
    room,
    efficiency,
    durationHours,
    meta,
  });
  const output =
    tradingRoom && calculatedTradingFlow
      ? tradingCalculation?.product === "orundum"
        ? calculatedTradingFlow.orundumOutput
        : calculatedTradingFlow.lmdOutput
      : Number.isFinite(Number(directProductionOutput))
        ? Number(directProductionOutput)
        : 0;
  const tradingFlow = tradingRoom ? calculatedTradingFlow : null;
  const orundumManufactureFlow =
    isOrundumManufactureRoom(room) && output !== null
      ? createOrundumManufactureFlow(output, orundumCraftMaterial)
      : null;

  return {
    durationHours,
    calculated: true,
    unavailableReason,
    output,
    tradingFlow,
    tradingCalculation: effectiveTradingCalculation,
    calculationMethod: fallbackTradingCalculation
      ? "普通贸易订单预置估算"
      : tradingRoom
        ? "P01贸易站统一结算"
        : "常规规则",
    fallbackDiagnostics: fallbackTradingCalculation?.fallbackDiagnostics || null,
    orundumManufactureFlow,
  };
}

function finalizeRoomSummary(summary) {
  const calculated = true;
  const effectiveDurationHours =
    summary.durationHours > 0
      ? summary.durationHours
      : summary.calculatedDurationHours;

  return {
    key: summary.key,
    label: summary.label,
    facility: summary.facility,
    product: summary.products.size === 1 ? [...summary.products][0] : "",
    products: [...summary.products],
    durationHours: summary.durationHours,
    calculatedDurationHours: effectiveDurationHours,
    isCalculated: calculated,
    calculationStatus: "calculated",
    averageEfficiency:
      effectiveDurationHours > 0
        ? roundPercent(summary.efficiencyPercentHours / effectiveDurationHours)
        : 0,
    averageControlCenterBonusPercent:
      effectiveDurationHours > 0
        ? roundPercent(
            summary.controlCenterBonusPercentHours / effectiveDurationHours,
          )
        : 0,
    segments: summary.segments,
  };
}

function finalizeYieldRoomSummary(summary, cycleHours) {
  const calculated = true;
  const outputPerDay =
    cycleHours > 0
      ? summary.outputPerCycle * (24 / cycleHours)
      : 0;

  return {
    key: summary.key,
    label: summary.label,
    facility: summary.facility,
    product: summary.product,
    resource: summary.meta?.resource || "",
    resourceLabel: summary.meta?.label || "",
    unit: summary.meta?.unit || "",
    stationLevel: summary.stationLevel,
    durationHours: summary.durationHours,
    calculatedDurationHours: summary.calculatedDurationHours,
    isCalculated: calculated,
    calculationStatus: "calculated",
    unavailableReason: summary.segments.find(
      (segment) => segment.unavailableReason,
    )?.unavailableReason || "",
    outputPerCycle: roundYield(summary.outputPerCycle),
    outputPerDay: roundYield(outputPerDay),
    segments: summary.segments,
  };
}

function buildFacilitySummaries(rooms) {
  const facilityMap = new Map();

  for (const room of rooms) {
    const facility = room.facility || "unknown";
    const summary = facilityMap.get(facility) || {
      facility,
      roomCount: 0,
      calculatedRoomCount: 0,
      calculatedDurationHours: 0,
      efficiencyPercentHours: 0,
      controlCenterBonusPercentHours: 0,
    };

    summary.roomCount += 1;
    summary.calculatedRoomCount += 1;
    summary.calculatedDurationHours += Number(room.durationHours || 0);
    summary.efficiencyPercentHours +=
      Number(room.averageEfficiency || 0) * Number(room.durationHours || 0);
    summary.controlCenterBonusPercentHours +=
      Number(room.averageControlCenterBonusPercent || 0) *
      Number(room.durationHours || 0);
    facilityMap.set(facility, summary);
  }

  return [...facilityMap.values()].map((summary) => ({
    facility: summary.facility,
    roomCount: summary.roomCount,
    calculatedRoomCount: summary.calculatedRoomCount,
    averageEfficiency:
      summary.calculatedDurationHours > 0
        ? roundPercent(
            summary.efficiencyPercentHours / summary.calculatedDurationHours,
          )
        : 0,
    averageControlCenterBonusPercent:
      summary.calculatedDurationHours > 0
        ? roundPercent(
            summary.controlCenterBonusPercentHours /
              summary.calculatedDurationHours,
          )
        : 0,
  }));
}

function createEmptyYieldResource(resource) {
  const meta = DISPLAY_RESOURCE_META[resource] || {};
  return {
    resource,
    label: meta.label || resource,
    unit: meta.unit || "",
    roomCount: 0,
    calculatedRoomCount: 0,
    outputPerCycle: 0,
    outputPerDay: 0,
    isCalculated: true,
    detail: "无对应设施",
  };
}

function buildDirectYieldResources(rooms) {
  const resourcesByKey = new Map();

  for (const room of rooms) {
    const resource = room.resource || "unsupported";
    const summary = resourcesByKey.get(resource) || {
      resource,
      label: room.resourceLabel || room.product || resource,
      unit: room.unit || "",
      roomCount: 0,
      calculatedRoomCount: 0,
      outputPerCycle: 0,
      outputPerDay: 0,
    };
    summary.roomCount += 1;
    summary.calculatedRoomCount += 1;
    summary.outputPerCycle += Number(room.outputPerCycle || 0);
    summary.outputPerDay += Number(room.outputPerDay || 0);
    resourcesByKey.set(resource, summary);
  }

  return new Map(
    [...resourcesByKey.values()].map((summary) => {
      return [
        summary.resource,
        {
          ...summary,
          isCalculated: true,
          outputPerCycle: roundYield(summary.outputPerCycle),
          outputPerDay: roundYield(summary.outputPerDay),
          detail: `${summary.calculatedRoomCount} / ${summary.roomCount} 间已计算`,
        },
      ];
    }),
  );
}

function getDirectYieldResource(resourcesByKey, resource) {
  return resourcesByKey.get(resource) || createEmptyYieldResource(resource);
}

function applyDroneTargetSettlementToResources(
  resourcesByKey,
  settlement,
  cycleHours,
) {
  const adjustedResourcesByKey = new Map(
    [...resourcesByKey.entries()].map(([resource, summary]) => [
      resource,
      { ...summary },
    ]),
  );
  if (!settlement?.isCalculated || cycleHours <= 0) {
    return adjustedResourcesByKey;
  }

  const perDayMultiplier = 24 / cycleHours;
  for (const segment of settlement.segments || []) {
    const resource = String(segment?.resource || "").trim();
    const output = Number(segment?.output);
    if (!segment?.calculated || !resource || !Number.isFinite(output)) {
      continue;
    }

    const current = adjustedResourcesByKey.get(resource) || {
      ...createEmptyYieldResource(resource),
      detail: "仅由无人机加速产生",
    };
    adjustedResourcesByKey.set(resource, {
      ...current,
      outputPerCycle: roundYield(Number(current.outputPerCycle || 0) + output),
      outputPerDay: roundYield(
        Number(current.outputPerDay || 0) + output * perDayMultiplier,
      ),
    });

  }

  return adjustedResourcesByKey;
}

function buildTradingFlowTotals({
  tradingSettlements,
  droneTargetSettlement,
}) {
  let goldConsumptionPerCycle = 0;
  let virtualGoldOutputPerCycle = 0;

  for (const settlement of tradingSettlements || []) {
    if (String(settlement?.product || "").trim() !== "lmd") {
      continue;
    }

    goldConsumptionPerCycle += Number(
      settlement.goldConsumptionPerCycle || 0,
    );
    virtualGoldOutputPerCycle += Number(
      settlement.virtualGoldOutputPerCycle || 0,
    );
  }

  for (const segment of droneTargetSettlement?.segments || []) {
    goldConsumptionPerCycle += Number(
      segment.tradingFlow?.goldConsumption || 0,
    );
    virtualGoldOutputPerCycle += Number(
      segment.tradingFlow?.virtualGoldOutput || 0,
    );
  }

  return {
    isCalculated: true,
    goldConsumptionPerCycle,
    virtualGoldOutputPerCycle,
  };
}

function buildOrundumTradeFlowTotals({
  tradingSettlements,
  droneTargetSettlement,
}) {
  let shardConsumptionPerCycle = 0;
  const orundumSettlements = (tradingSettlements || []).filter(
    (settlement) => String(settlement?.product || "").trim() === "orundum",
  );

  for (const settlement of orundumSettlements) {
    shardConsumptionPerCycle += Number(
      settlement.shardConsumptionPerCycle || 0,
    );
  }

  for (const segment of droneTargetSettlement?.segments || []) {
    if (String(segment?.resource || "").trim() !== "orundum") {
      continue;
    }
    shardConsumptionPerCycle += Number(
      segment.tradingFlow?.shardConsumption || 0,
    );
  }

  return {
    isCalculated: true,
    roomCount: orundumSettlements.length,
    calculatedRoomCount: orundumSettlements.filter(
      (settlement) => settlement?.isCalculated,
    ).length,
    shardConsumptionPerCycle,
  };
}

function buildOrundumManufactureFlowTotals({
  states,
  droneTargetSettlement,
  orundumCraftMaterial,
}) {
  let lmdConsumptionPerCycle = 0;
  let craftMaterialConsumptionPerCycle = 0;
  const roomSummariesByKey = new Map();
  const recipe =
    ORUNDUM_MANUFACTURE_RECIPES[
      normalizeOrundumCraftMaterial(orundumCraftMaterial)
    ];

  for (const state of states || []) {
    const durationHours = toPositiveHours(state?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    for (const room of state?.rooms || []) {
      if (!isOrundumManufactureRoom(room)) {
        continue;
      }

      const key = String(room?.key || "").trim();
      if (!key) {
        continue;
      }
      const summary = roomSummariesByKey.get(key) || {
        segmentCount: 0,
        calculatedSegmentCount: 0,
      };
      summary.segmentCount += 1;
      const segment = createYieldSegment({
        room,
        durationHours,
        orundumCraftMaterial,
      });
      summary.calculatedSegmentCount += 1;
      lmdConsumptionPerCycle += Number(
        segment.orundumManufactureFlow?.lmdConsumption || 0,
      );
      craftMaterialConsumptionPerCycle += Number(
        segment.orundumManufactureFlow?.craftMaterialConsumption || 0,
      );
      roomSummariesByKey.set(key, summary);
    }
  }

  for (const segment of droneTargetSettlement?.segments || []) {
    if (String(segment?.resource || "").trim() !== "originiumShard") {
      continue;
    }
    lmdConsumptionPerCycle += Number(
      segment.orundumManufactureFlow?.lmdConsumption || 0,
    );
    craftMaterialConsumptionPerCycle += Number(
      segment.orundumManufactureFlow?.craftMaterialConsumption || 0,
    );
  }

  return {
    isCalculated: true,
    roomCount: roomSummariesByKey.size,
    calculatedRoomCount: [...roomSummariesByKey.values()].filter(
      (summary) =>
        summary.segmentCount > 0 &&
        summary.segmentCount === summary.calculatedSegmentCount,
    ).length,
    lmdConsumptionPerCycle,
    craftMaterial: recipe.material,
    craftMaterialLabel: recipe.materialLabel,
    craftMaterialConsumptionPerCycle,
  };
}

function buildYieldResourceSettlement({
  directResourcesByKey,
  tradingSettlements,
  orundumTradeFlowTotals,
  orundumManufactureFlowTotals,
  droneTargetSettlement,
  cycleHours,
}) {
  const resourcesByKey = applyDroneTargetSettlementToResources(
    directResourcesByKey,
    droneTargetSettlement,
    cycleHours,
  );
  const tradingFlowTotals = buildTradingFlowTotals({
    tradingSettlements,
    droneTargetSettlement,
  });
  const {
    gold,
    lmd,
    originiumShard,
  } = settleRiicNetResources({
    resourcesByKey,
    tradingFlowTotals,
    orundumTradeFlowTotals,
    orundumManufactureFlowTotals,
    cycleHours,
  });

  resourcesByKey.set("gold", gold);
  resourcesByKey.set("lmd", lmd);
  resourcesByKey.set("originiumShard", originiumShard);

  return {
    resourcesByKey,
    resources: DISPLAY_RESOURCE_ORDER.map((resource) =>
      getDirectYieldResource(resourcesByKey, resource),
    ),
    flows: {
      gold: {
        isCalculated: true,
        grossOutputPerCycle: gold.grossOutputPerCycle ?? 0,
        grossOutputPerDay: gold.grossOutputPerDay ?? 0,
        tradeConsumptionPerCycle: gold.tradeConsumptionPerCycle ?? 0,
        tradeConsumptionPerDay: gold.tradeConsumptionPerDay ?? 0,
        virtualGoldOutputPerCycle: gold.virtualGoldOutputPerCycle ?? 0,
        virtualGoldOutputPerDay: gold.virtualGoldOutputPerDay ?? 0,
      },
      orundum: {
        isCalculated: true,
        lmdConsumptionPerCycle:
          lmd.orundumManufactureConsumptionPerCycle ?? 0,
        lmdConsumptionPerDay:
          lmd.orundumManufactureConsumptionPerDay ?? 0,
        shardConsumptionPerCycle:
          originiumShard.tradeConsumptionPerCycle ?? 0,
        shardConsumptionPerDay: originiumShard.tradeConsumptionPerDay ?? 0,
        craftMaterial: orundumManufactureFlowTotals.craftMaterial || "",
        craftMaterialLabel:
          orundumManufactureFlowTotals.craftMaterialLabel || "",
        craftMaterialConsumptionPerCycle:
          orundumManufactureFlowTotals.craftMaterialConsumptionPerCycle ?? 0,
        craftMaterialConsumptionPerDay:
          cycleHours > 0
            ? roundYield(
                Number(
                  orundumManufactureFlowTotals.craftMaterialConsumptionPerCycle ||
                    0,
              ) *
                  (24 / cycleHours),
              )
            : 0,
      },
    },
  };
}

function getSettlementPrimaryResource(resource) {
  return String(resource || "").trim();
}

function buildDirectDroneSegmentResourceEffects(segment) {
  const output = Number(segment?.output);
  const goldConsumption = Number(segment?.tradingFlow?.goldConsumption);
  const virtualGoldOutput = Number(segment?.tradingFlow?.virtualGoldOutput);
  const shardConsumption = Number(segment?.tradingFlow?.shardConsumption);
  const lmdConsumption = Number(
    segment?.orundumManufactureFlow?.lmdConsumption,
  );
  const hasGoldConsumption = Number.isFinite(goldConsumption);
  const hasVirtualGoldOutput = Number.isFinite(virtualGoldOutput);
  const hasShardConsumption =
    Number.isFinite(shardConsumption) && shardConsumption > EPSILON;
  const hasLmdConsumption =
    Number.isFinite(lmdConsumption) && lmdConsumption > EPSILON;
  const isCalculated = true;

  return {
    isCalculated,
    primaryResource: getSettlementPrimaryResource(segment?.resource),
    primaryOutput: Number.isFinite(output) ? roundYield(output) : 0,
    goldConsumption: hasGoldConsumption
      ? roundYield(goldConsumption)
      : 0,
    shardConsumption: hasShardConsumption
      ? roundYield(shardConsumption)
      : 0,
    lmdConsumption: hasLmdConsumption ? roundYield(lmdConsumption) : 0,
    netGold:
      hasGoldConsumption || hasVirtualGoldOutput
        ? roundYield(
            (hasVirtualGoldOutput ? virtualGoldOutput : 0) -
              (hasGoldConsumption ? goldConsumption : 0),
          )
        : 0,
    virtualGoldOutput: hasVirtualGoldOutput
      ? roundYield(virtualGoldOutput)
      : 0,
    craftMaterial: segment?.orundumManufactureFlow?.craftMaterial || "",
    craftMaterialLabel:
      segment?.orundumManufactureFlow?.craftMaterialLabel || "",
    craftMaterialConsumption:
      Number.isFinite(
        Number(segment?.orundumManufactureFlow?.craftMaterialConsumption),
      ) &&
      Number(segment?.orundumManufactureFlow?.craftMaterialConsumption) > EPSILON
        ? roundYield(
            segment.orundumManufactureFlow.craftMaterialConsumption,
          )
        : 0,
  };
}

function buildDirectDroneSettlementResourceEffects(settlement) {
  const segments = Array.isArray(settlement?.segments)
    ? settlement.segments
    : [];
  const effects = segments.map(buildDirectDroneSegmentResourceEffects);

  const sum = (field) =>
    roundYield(
      effects.reduce((total, effect) => total + Number(effect[field] || 0), 0),
    );
  const hasGoldConsumption = effects.some(
    (effect) => Number(effect.goldConsumption) !== 0,
  );
  const hasVirtualGoldOutput = effects.some(
    (effect) => Number(effect.virtualGoldOutput) !== 0,
  );
  const hasShardConsumption = effects.some(
    (effect) => Number(effect.shardConsumption) !== 0,
  );
  const hasLmdConsumption = effects.some(
    (effect) => Number(effect.lmdConsumption) !== 0,
  );
  const hasCraftMaterialConsumption = effects.some(
    (effect) => Number(effect.craftMaterialConsumption) !== 0,
  );
  const craftMaterialEffect = effects.find(
    (effect) => effect.craftMaterial,
  );

  return {
    isCalculated: true,
    primaryResource:
      effects[0]?.primaryResource ||
      getSettlementPrimaryResource(settlement?.resource),
    primaryOutput: sum("primaryOutput"),
    goldConsumption: hasGoldConsumption ? sum("goldConsumption") : 0,
    shardConsumption: hasShardConsumption ? sum("shardConsumption") : 0,
    lmdConsumption: hasLmdConsumption ? sum("lmdConsumption") : 0,
    netGold: hasGoldConsumption || hasVirtualGoldOutput ? sum("netGold") : 0,
    virtualGoldOutput: hasVirtualGoldOutput ? sum("virtualGoldOutput") : 0,
    craftMaterial: craftMaterialEffect?.craftMaterial || "",
    craftMaterialLabel: craftMaterialEffect?.craftMaterialLabel || "",
    craftMaterialConsumption: hasCraftMaterialConsumption
      ? sum("craftMaterialConsumption")
      : 0,
  };
}

function getTradingSettlementTypeLabel(type) {
  return (
    {
      normal: "普通贸易",
      butshu: "但书/龙舌兰订单",
      closure: "可露希尔特别订单",
    }[type] || "贸易订单"
  );
}

function buildTradingSettlements({
  states,
  cycleHours,
  orundumCraftMaterial,
  allowMaaFallback = false,
}) {
  const summariesByKey = new Map();

  for (const [stateIndex, state] of states.entries()) {
    const durationHours = toPositiveHours(state?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    for (const room of state?.rooms || []) {
      if (String(room?.facility || "").trim() !== "trading") {
        continue;
      }

      const segment = createYieldSegment({
        room,
        durationHours,
        orundumCraftMaterial,
        allowMaaFallback,
      });
      const key = String(room?.key || "").trim();
      if (!key) {
        continue;
      }

      const summary = summariesByKey.get(key) || {
        key,
        label: String(room?.label || key).trim(),
        products: new Set(),
        durationHours: 0,
        calculatedDurationHours: 0,
        lmdOutputPerCycle: 0,
        orundumOutputPerCycle: 0,
        goldConsumptionPerCycle: 0,
        shardConsumptionPerCycle: 0,
        virtualGoldOutputPerCycle: 0,
        types: new Set(),
        segments: [],
      };
      summary.durationHours += durationHours;
      summary.products.add(String(room?.product || "").trim());

      if (segment.calculated && segment.tradingFlow) {
        summary.calculatedDurationHours += durationHours;
        if (String(room?.product || "").trim() === "orundum") {
          summary.orundumOutputPerCycle += segment.tradingFlow.orundumOutput;
          summary.shardConsumptionPerCycle +=
            segment.tradingFlow.shardConsumption;
        } else {
          summary.lmdOutputPerCycle += segment.tradingFlow.lmdOutput;
          summary.goldConsumptionPerCycle +=
            segment.tradingFlow.goldConsumption;
          summary.virtualGoldOutputPerCycle +=
            segment.tradingFlow.virtualGoldOutput;
        }
        summary.types.add(segment.tradingFlow.type);
      }

      summary.segments.push({
        stateIndex,
        durationHours,
        calculated: true,
        unavailableReason: segment.unavailableReason,
        type: segment.tradingFlow?.type || "",
        typeLabel: getTradingSettlementTypeLabel(segment.tradingFlow?.type),
        rate:
          segment.tradingCalculation?.ok &&
          Number.isFinite(Number(segment.tradingCalculation.rate))
            ? segment.tradingCalculation.rate
            : 0,
        operatorIds: (room?.operators || [])
          .map((operator) => String(operator?.charId || "").trim())
          .filter(Boolean),
        lmdOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.lmdOutput)
          : 0,
        orundumOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.orundumOutput)
          : 0,
        goldConsumption: segment.tradingFlow
          ? roundYield(segment.tradingFlow.goldConsumption)
          : 0,
        shardConsumption: segment.tradingFlow
          ? roundYield(segment.tradingFlow.shardConsumption)
          : 0,
        virtualGoldOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.virtualGoldOutput)
          : 0,
        error: segment.tradingCalculation?.ok
          ? ""
          : segment.tradingCalculation?.error || segment.unavailableReason,
        calculationMethod: segment.calculationMethod,
        fallbackDiagnostics: segment.fallbackDiagnostics,
      });
      summariesByKey.set(key, summary);
    }
  }

  return [...summariesByKey.values()].map((summary) => {
    const calculated = true;
    const perDayMultiplier = cycleHours > 0 ? 24 / cycleHours : 0;
    const types = [...summary.types];
    const type = types.length === 1 ? types[0] : "";

    return {
      key: summary.key,
      label: summary.label,
      product:
        summary.products.size === 1 ? [...summary.products][0] : "",
      type,
      typeLabel:
        type ? getTradingSettlementTypeLabel(type) : "混合贸易订单",
      durationHours: summary.durationHours,
      calculatedDurationHours: summary.calculatedDurationHours,
      isCalculated: calculated,
      lmdOutputPerCycle: roundYield(summary.lmdOutputPerCycle),
      lmdOutputPerDay: roundYield(
        summary.lmdOutputPerCycle * perDayMultiplier,
      ),
      orundumOutputPerCycle: roundYield(summary.orundumOutputPerCycle),
      orundumOutputPerDay: roundYield(
        summary.orundumOutputPerCycle * perDayMultiplier,
      ),
      goldConsumptionPerCycle: roundYield(summary.goldConsumptionPerCycle),
      goldConsumptionPerDay: roundYield(
        summary.goldConsumptionPerCycle * perDayMultiplier,
      ),
      shardConsumptionPerCycle: roundYield(summary.shardConsumptionPerCycle),
      shardConsumptionPerDay: roundYield(
        summary.shardConsumptionPerCycle * perDayMultiplier,
      ),
      virtualGoldOutputPerCycle: roundYield(
        summary.virtualGoldOutputPerCycle,
      ),
      virtualGoldOutputPerDay: roundYield(
        summary.virtualGoldOutputPerCycle * perDayMultiplier,
      ),
      segments: summary.segments,
    };
  });
}

function getWorkingPowerOperatorCount(room) {
  return (room?.operators || []).filter((operator) =>
    String(operator?.charId || operator?.name || "").trim(),
  ).length;
}

function createDroneChargeSegment({ state, durationHours }) {
  const rooms = (state?.rooms || [])
    .filter((room) => String(room?.facility || "").trim() === "power")
    .map((room) => {
      const efficiency = toFinitePercent(room?.efficiency);
      const calculated = true;
      const operatorCount = getWorkingPowerOperatorCount(room);
      const operatorBonusPercent =
        operatorCount * POWER_OPERATOR_CHARGE_BONUS_PERCENT;
      const skillBonusPercent = Math.max(
        0,
        (efficiency === null ? 0 : efficiency) - 100,
      );

      return {
        key: String(room?.key || "").trim(),
        label: String(room?.label || room?.key || "").trim(),
        calculated,
        operatorCount,
        operatorBonusPercent,
        skillBonusPercent,
        chargeBonusPercent: operatorBonusPercent + skillBonusPercent,
      };
    });
  const calculated = true;
  const operatorBonusPercent = rooms.reduce(
    (total, room) => total + room.operatorBonusPercent,
    0,
  );
  const skillBonusPercent = rooms.reduce(
    (total, room) => total + room.skillBonusPercent,
    0,
  );
  const chargeBonusPercent = operatorBonusPercent + skillBonusPercent;
  const droneOutput =
    rooms.length > 0
      ? DRONE_BASE_PER_HOUR *
        (1 + chargeBonusPercent / 100) *
        durationHours
      : 0;

  return {
    durationHours,
    calculated,
    powerRoomCount: rooms.length,
    operatorBonusPercent,
    skillBonusPercent,
    chargeBonusPercent,
    droneOutput,
    rooms,
  };
}

function buildDroneChargeSummary({ states, cycleHours }) {
  const segments = [];
  let durationHours = 0;
  let calculatedDurationHours = 0;
  let droneOutputPerCycle = 0;

  for (const [stateIndex, state] of states.entries()) {
    const segmentDurationHours = toPositiveHours(state?.durationHours);
    if (segmentDurationHours <= 0) {
      continue;
    }

    const segment = createDroneChargeSegment({
      state,
      durationHours: segmentDurationHours,
    });
    durationHours += segmentDurationHours;
    if (segment.calculated) {
      calculatedDurationHours += segmentDurationHours;
      droneOutputPerCycle += segment.droneOutput;
    }
    segments.push({
      stateIndex,
      ...segment,
      operatorBonusPercent: roundPercent(segment.operatorBonusPercent),
      skillBonusPercent: roundPercent(segment.skillBonusPercent),
      chargeBonusPercent: roundPercent(segment.chargeBonusPercent),
      droneOutput: roundYield(segment.droneOutput),
      rooms: segment.rooms.map((room) => ({
        ...room,
        skillBonusPercent: roundPercent(room.skillBonusPercent),
        chargeBonusPercent: roundPercent(room.chargeBonusPercent),
      })),
    });
  }

  const calculated = true;
  const perDayMultiplier = cycleHours > 0 ? 24 / cycleHours : 0;

  return {
    durationHours,
    calculatedDurationHours,
    isCalculated: calculated,
    droneOutputPerCycle: roundYield(droneOutputPerCycle),
    droneOutputPerDay: roundYield(droneOutputPerCycle * perDayMultiplier),
    segments,
  };
}

function normalizeDroneOrder(value) {
  if (value === "retain") {
    return "retain";
  }

  return value === "post" ? "post" : "pre";
}

function buildDroneUsageSummary({ droneCharge, droneOrdersByState }) {
  const chargeSegments = Array.isArray(droneCharge?.segments)
    ? droneCharge.segments
    : [];
  // A shift consumes the drones accumulated during the preceding state.
  const segments = chargeSegments.map((chargeSegment, index) => {
    const previousChargeSegment =
      chargeSegments[
        (index - 1 + chargeSegments.length) % chargeSegments.length
      ];

    return {
      stateIndex: Number(chargeSegment?.stateIndex),
      order: normalizeDroneOrder(
        Array.isArray(droneOrdersByState)
          ? droneOrdersByState[Number(chargeSegment?.stateIndex)]
          : "",
      ),
      generatedDroneOutput: Number.isFinite(
        Number(previousChargeSegment?.droneOutput),
      )
        ? Number(previousChargeSegment.droneOutput)
        : 0,
      rawAvailableDroneOutput: null,
      availableDroneOutput: null,
      usedDroneOutput: null,
      storedDroneOutput: null,
      capacityReached: false,
    };
  });
  if (segments.length === 0) {
    return {
      isCalculated: true,
      storageLimit: DRONE_STORAGE_LIMIT,
      capacityReached: false,
      segments,
    };
  }

  const lastUsedIndex = segments.reduce(
    (lastIndex, segment, index) =>
      segment.order === "retain" ? lastIndex : index,
    -1,
  );
  const startIndex =
    lastUsedIndex >= 0 ? (lastUsedIndex + 1) % segments.length : 0;
  let storedDroneOutput =
    lastUsedIndex < 0 ? DRONE_STORAGE_LIMIT : 0;

  for (let offset = 0; offset < segments.length; offset += 1) {
    const index = (startIndex + offset) % segments.length;
    const segment = segments[index];
    const rawAvailableDroneOutput =
      storedDroneOutput + segment.generatedDroneOutput;
    const availableDroneOutput = Math.min(
      DRONE_STORAGE_LIMIT,
      rawAvailableDroneOutput,
    );
    const capacityReached = rawAvailableDroneOutput >= DRONE_STORAGE_LIMIT;
    const retainsDrones = segment.order === "retain";

    segment.rawAvailableDroneOutput = roundYield(rawAvailableDroneOutput);
    segment.availableDroneOutput = roundYield(availableDroneOutput);
    segment.usedDroneOutput = retainsDrones
      ? 0
      : roundYield(availableDroneOutput);
    segment.storedDroneOutput = retainsDrones
      ? roundYield(availableDroneOutput)
      : 0;
    segment.capacityReached = capacityReached;
    storedDroneOutput = retainsDrones ? availableDroneOutput : 0;
  }

  return {
    isCalculated: true,
    storageLimit: DRONE_STORAGE_LIMIT,
    capacityReached: segments.some((segment) => segment.capacityReached),
    segments,
  };
}

export function createDroneTargetBenefitSegment({
  room,
  droneOutput,
  tradingRosterById,
  orundumCraftMaterial,
}) {
  const l79Segment = createL79DroneTargetBenefitSegment({
    room,
    droneOutput,
    orundumCraftMaterial,
  });
  if (l79Segment) {
    return l79Segment;
  }

  const facility = String(room?.facility || "").trim();
  const product = String(room?.product || "").trim();
  const rawDroneCount = Number(droneOutput);
  const droneCount =
    Number.isFinite(rawDroneCount) && rawDroneCount >= 0 ? rawDroneCount : 0;
  const meta = getRiicRoomYieldMeta(room);
  const acceleratedHours = droneCount * DRONE_ACCELERATION_HOURS;
  const manufactureOutput =
    facility !== "manufacture"
      ? 0
      : product === "experience"
        ? (droneCount * 1000) / 60
        : product === "gold"
          ? droneCount / 24
          : product === "orundum"
            ? droneCount / 20
            : 0;
  const tradingCalculation = isTradingRoom(room)
    ? calculateTradingDroneRoom({
        room,
        rosterById: tradingRosterById,
      })
    : null;
  const unavailableReason =
    rawDroneCount !== droneCount
      ? "droneUnavailable"
      : isTradingRoom(room)
        ? tradingCalculation?.warning
          ? tradingCalculation.error || "tradingCalculationWarning"
          : ""
        : facility === "manufacture" && !meta
          ? "unsupportedProduct"
          : facility === "manufacture" || facility === "trading"
            ? ""
            : "unsupportedDroneTarget";

  const tradingFlow = createTradingDroneFlow(tradingCalculation, droneCount);
  const output =
    facility === "manufacture"
      ? manufactureOutput
      : product === "orundum"
        ? tradingFlow.orundumOutput
        : tradingFlow.lmdOutput;
  const orundumManufactureFlow =
    isOrundumManufactureRoom(room)
      ? createOrundumManufactureFlow(output, orundumCraftMaterial)
      : null;

  return {
    calculated: true,
    unavailableReason,
    acceleratedHours,
    resource: meta?.resource || "",
    resourceLabel: meta?.label || "",
    unit: meta?.unit || "",
    output: Number.isFinite(Number(output)) ? Number(output) : 0,
    tradingFlow,
    tradingCalculation,
    orundumManufactureFlow,
  };
}

function buildDroneTargetSettlement({
  states,
  cycleHours,
  droneCharge,
  droneUsage,
  droneTargetKey,
  droneTargetKeysByState,
  tradingRosterById,
  orundumCraftMaterial,
}) {
  const targetsByState = Array.isArray(droneTargetKeysByState)
    ? droneTargetKeysByState.map((value) => String(value || "").trim())
    : null;
  const targetKey = String(droneTargetKey || "").trim();
  const usesPerStateTargets = targetsByState !== null;
  if (
    (usesPerStateTargets && targetsByState.every((value) => !value)) ||
    (!usesPerStateTargets && !targetKey)
  ) {
    return {
      status: "notSelected",
      isCalculated: true,
      label: "",
      outputPerCycle: 0,
      outputPerDay: 0,
      goldConsumptionPerCycle: 0,
      goldConsumptionPerDay: 0,
      virtualGoldOutputPerCycle: 0,
      virtualGoldOutputPerDay: 0,
      shardConsumptionPerCycle: 0,
      shardConsumptionPerDay: 0,
      lmdConsumptionPerCycle: 0,
      lmdConsumptionPerDay: 0,
      craftMaterialConsumptionPerCycle: 0,
      craftMaterialConsumptionPerDay: 0,
      segments: [],
    };
  }

  const segments = [];
  let durationHours = 0;
  let calculatedDurationHours = 0;
  let outputPerCycle = 0;
  let goldConsumptionPerCycle = 0;
  let virtualGoldOutputPerCycle = 0;
  let shardConsumptionPerCycle = 0;
  let lmdConsumptionPerCycle = 0;
  let craftMaterialConsumptionPerCycle = 0;
  let label = "";
  let resource = "";
  let resourceLabel = "";
  let unit = "";
  const chargeSegmentsByStateIndex = new Map(
    (droneCharge?.segments || []).map((segment) => [
      Number(segment?.stateIndex),
      segment,
    ]),
  );
  const usageSegmentsByStateIndex = new Map(
    (droneUsage?.segments || []).map((segment) => [
      Number(segment?.stateIndex),
      segment,
    ]),
  );
  const activeStateIndexes = [...usageSegmentsByStateIndex.keys()].filter(
    (stateIndex) =>
      Number.isInteger(stateIndex) &&
      stateIndex >= 0 &&
      stateIndex < states.length,
  );
  const previousStateIndexByStateIndex = new Map(
    activeStateIndexes.map((stateIndex, index) => [
      stateIndex,
      activeStateIndexes[
        (index - 1 + activeStateIndexes.length) % activeStateIndexes.length
      ],
    ]),
  );

  for (const [stateIndex, state] of states.entries()) {
    const segmentDurationHours = toPositiveHours(state?.durationHours);
    if (segmentDurationHours <= 0) {
      continue;
    }

    durationHours += segmentDurationHours;
    const stateTargetKey = usesPerStateTargets
      ? targetsByState[stateIndex] || ""
      : targetKey;
    const usageSegment = usageSegmentsByStateIndex.get(stateIndex);
    const chargeSegment = chargeSegmentsByStateIndex.get(stateIndex);
    const roomStateIndex =
      usageSegment?.order === "pre"
        ? previousStateIndexByStateIndex.get(stateIndex)
        : stateIndex;
    const roomState = states[roomStateIndex] || state;
    const room = (roomState?.rooms || []).find(
      (item) => String(item?.key || "").trim() === stateTargetKey,
    );
    const droneOutput =
      usageSegment?.usedDroneOutput === null ||
      usageSegment?.usedDroneOutput === undefined
        ? chargeSegment?.droneOutput
        : usageSegment.usedDroneOutput;
    const benefit = !stateTargetKey
      ? {
          calculated: true,
          unavailableReason: "",
          acceleratedHours: 0,
          resource: "",
          resourceLabel: "",
          unit: "",
          output: 0,
          tradingFlow: null,
          tradingCalculation: null,
          orundumManufactureFlow: null,
        }
      : room
      ? createDroneTargetBenefitSegment({
          room,
          droneOutput,
          tradingRosterById,
          orundumCraftMaterial,
        })
      : {
          calculated: true,
          unavailableReason: "targetMissing",
          acceleratedHours: 0,
          resource: "",
          resourceLabel: "",
          unit: "",
          output: 0,
          tradingFlow: createTradingDroneFlow(null, 0),
          tradingCalculation: null,
          orundumManufactureFlow: null,
        };

    label ||= String(room?.label || stateTargetKey || "").trim();
    if (!usesPerStateTargets) {
      resource ||= benefit.resource;
      resourceLabel ||= benefit.resourceLabel;
      unit ||= benefit.unit;
    }
    if (benefit.calculated) {
      calculatedDurationHours += segmentDurationHours;
      outputPerCycle += benefit.output;
      goldConsumptionPerCycle += Number(
        benefit.tradingFlow?.goldConsumption || 0,
      );
      virtualGoldOutputPerCycle += Number(
        benefit.tradingFlow?.virtualGoldOutput || 0,
      );
      shardConsumptionPerCycle += Number(
        benefit.tradingFlow?.shardConsumption || 0,
      );
      lmdConsumptionPerCycle += Number(
        benefit.orundumManufactureFlow?.lmdConsumption || 0,
      );
      craftMaterialConsumptionPerCycle += Number(
        benefit.orundumManufactureFlow?.craftMaterialConsumption || 0,
      );
    }
    segments.push({
      durationHours: segmentDurationHours,
      targetKey: stateTargetKey,
      targetLabel: String(room?.label || stateTargetKey || "").trim(),
      droneOutput:
        Number.isFinite(Number(droneOutput)) ? roundYield(droneOutput) : 0,
      retainedDroneOutput:
        Number.isFinite(Number(usageSegment?.storedDroneOutput))
          ? roundYield(usageSegment.storedDroneOutput)
          : 0,
      droneStorageLimitReached: usageSegment?.capacityReached === true,
      calculated: benefit.calculated,
      unavailableReason: benefit.unavailableReason,
      acceleratedHours: roundYield(benefit.acceleratedHours || 0),
      output: roundYield(benefit.output || 0),
      resource: benefit.resource,
      resourceLabel: benefit.resourceLabel,
      unit: benefit.unit,
      tradingFlow: benefit.tradingFlow
        ? {
            typeLabel: getTradingSettlementTypeLabel(benefit.tradingFlow.type),
            goldConsumption: roundYield(benefit.tradingFlow.goldConsumption),
            virtualGoldOutput: roundYield(
              benefit.tradingFlow.virtualGoldOutput,
            ),
            shardConsumption: roundYield(
              benefit.tradingFlow.shardConsumption,
            ),
          }
        : null,
      orundumManufactureFlow: benefit.orundumManufactureFlow
        ? {
            lmdConsumption: roundYield(
              benefit.orundumManufactureFlow.lmdConsumption,
            ),
            craftMaterial: benefit.orundumManufactureFlow.craftMaterial,
            craftMaterialLabel:
              benefit.orundumManufactureFlow.craftMaterialLabel,
            craftMaterialConsumption: roundYield(
              benefit.orundumManufactureFlow.craftMaterialConsumption,
            ),
          }
        : null,
    });
  }

  const calculated = true;
  const perDayMultiplier = cycleHours > 0 ? 24 / cycleHours : 0;

  return {
    status: targetKey || usesPerStateTargets ? "calculated" : "notSelected",
    isCalculated: calculated,
    key: usesPerStateTargets ? "" : targetKey,
    label: usesPerStateTargets ? "按班次投向" : label,
    resource: usesPerStateTargets ? "" : resource,
    resourceLabel: usesPerStateTargets ? "" : resourceLabel,
    unit: usesPerStateTargets ? "" : unit,
    outputPerCycle: roundYield(outputPerCycle),
    outputPerDay: roundYield(outputPerCycle * perDayMultiplier),
    goldConsumptionPerCycle: roundYield(goldConsumptionPerCycle),
    goldConsumptionPerDay: roundYield(goldConsumptionPerCycle * perDayMultiplier),
    virtualGoldOutputPerCycle: roundYield(virtualGoldOutputPerCycle),
    virtualGoldOutputPerDay: roundYield(
      virtualGoldOutputPerCycle * perDayMultiplier,
    ),
    shardConsumptionPerCycle: roundYield(shardConsumptionPerCycle),
    shardConsumptionPerDay: roundYield(
      shardConsumptionPerCycle * perDayMultiplier,
    ),
    lmdConsumptionPerCycle: roundYield(lmdConsumptionPerCycle),
    lmdConsumptionPerDay: roundYield(lmdConsumptionPerCycle * perDayMultiplier),
    craftMaterialConsumptionPerCycle: roundYield(
      craftMaterialConsumptionPerCycle,
    ),
    craftMaterialConsumptionPerDay: roundYield(
      craftMaterialConsumptionPerCycle * perDayMultiplier,
    ),
    segments,
  };
}

function getDroneTargetKeys(states) {
  const targetKeys = new Set();

  for (const state of states || []) {
    for (const room of state?.rooms || []) {
      if (
        ["trading", "manufacture"].includes(
          String(room?.facility || "").trim(),
        )
      ) {
        const key = String(room?.key || "").trim();
        if (key) {
          targetKeys.add(key);
        }
      }
    }
  }

  return [...targetKeys];
}

function hasAssignedDroneTargetOperator(room) {
  if (!Array.isArray(room?.operators)) {
    return true;
  }

  return (room?.operators || []).some((operator) =>
    String(operator?.charId || operator?.name || "").trim(),
  );
}

function resolveDronePlanByState({
  states,
  droneTargetKeysByState,
  droneOrdersByState,
}) {
  if (!Array.isArray(droneTargetKeysByState)) {
    return {
      droneTargetKeysByState,
      droneOrdersByState,
    };
  }

  const getTargetRoom = (stateIndex) => {
    const targetKey = String(
      droneTargetKeysByState[stateIndex] || "",
    ).trim();
    if (!targetKey) {
      return {
        targetKey,
        room: null,
      };
    }

    return {
      targetKey,
      room: (states[stateIndex]?.rooms || []).find(
      (item) => String(item?.key || "").trim() === targetKey,
      ),
    };
  };

  return {
    droneTargetKeysByState: states.map((_, stateIndex) => {
      const { targetKey, room } = getTargetRoom(stateIndex);
      return !targetKey || (room && hasAssignedDroneTargetOperator(room))
        ? targetKey
        : "";
    }),
    droneOrdersByState: states.map((_, stateIndex) => {
      const { targetKey, room } = getTargetRoom(stateIndex);
      return !targetKey || (room && hasAssignedDroneTargetOperator(room))
        ? droneOrdersByState?.[stateIndex]
        : "retain";
    }),
  };
}

function createL79DroneTargetBenefitSegment({
  room,
  droneOutput,
  orundumCraftMaterial,
} = {}) {
  if (!room?.l79Settlement) {
    return null;
  }

  const settlement = room.l79Settlement;
  const facility = String(room?.facility || "").trim();
  const product = String(room?.product || "").trim();
  const rawDroneCount = Number(droneOutput);
  const droneCount =
    Number.isFinite(rawDroneCount) && rawDroneCount >= 0 ? rawDroneCount : 0;
  const meta = getRiicRoomYieldMeta(room);
  const calculated = true;
  const hourly = settlement.perDrone || {};
  const output =
    facility === "trading"
      ? product === "orundum"
        ? Number(hourly.orundum || 0) * droneCount
        : product === "lmd"
          ? Number(hourly.lmd || 0) * droneCount
          : 0
      : facility === "manufacture"
        ? product === "orundum"
          ? Number(hourly.shard || 0) * droneCount
          : product === "experience"
            ? Number(hourly.exp || 0) * droneCount
            : product === "gold"
              ? Number(hourly.gold || 0) * droneCount
              : 0
        : 0;
  const tradingFlow =
    facility === "trading"
      ? {
          type: room?.tradingSettlement?.calculation?.type || "normal",
          lmdOutput:
            product === "lmd" ? Number(hourly.lmd || 0) * droneCount : 0,
          orundumOutput:
            product === "orundum"
              ? Number(hourly.orundum || 0) * droneCount
              : 0,
          goldConsumption:
            product === "lmd"
              ? Math.max(0, -Number(hourly.gold || 0) * droneCount)
              : 0,
          virtualGoldOutput:
            product === "lmd" ? Number(hourly.vgold || 0) * droneCount : 0,
          shardConsumption:
            product === "orundum"
              ? Math.max(0, -Number(hourly.shard || 0) * droneCount)
              : 0,
      }
      : null;
  const manufactureFlow =
    facility === "manufacture" &&
    product === "orundum"
      ? {
          lmdConsumption: Math.max(
            0,
            -Number(hourly.lmd || 0) * droneCount,
          ),
          craftMaterial:
            Number(hourly.device || 0) < 0 ? "device" : orundumCraftMaterial,
          craftMaterialLabel:
            Number(hourly.device || 0) < 0 ? "装置" : "固源岩",
          craftMaterialConsumption: Math.max(
            0,
            -(
              Number(hourly.device || 0) ||
              Number(hourly.orirock || 0)
            ) * droneCount,
          ),
        }
      : null;
  const unavailableReason =
    output === null || !meta
      ? settlement.message?.[0]?.text || "l79SettlementUnavailable"
      : "";

  return {
    calculated: true,
    unavailableReason,
    acceleratedHours: droneCount * DRONE_ACCELERATION_HOURS,
    resource: meta?.resource || "",
    resourceLabel: meta?.label || "",
    unit: meta?.unit || "",
    output: Number.isFinite(Number(output)) ? Number(output) : 0,
    tradingFlow,
    tradingCalculation: room?.tradingSettlement?.calculation || null,
    orundumManufactureFlow: manufactureFlow,
  };
}

function buildYieldSummary({
  states,
  cycleHours,
  droneTargetKey,
  droneTargetKeysByState,
  droneOrdersByState,
  legacyTradingOperators,
  orundumCraftMaterial,
  allowMaaFallback = false,
}) {
  const tradingRosterById = createRiicOperatorRosterById(
    legacyTradingOperators,
  );
  const summariesByKey = new Map();

  for (const state of states) {
    const durationHours = toPositiveHours(state?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    for (const room of state?.rooms || []) {
      if (!YIELD_FACILITIES.has(String(room?.facility || "").trim())) {
        continue;
      }

      const key = String(room?.key || "").trim();
      if (!key) {
        continue;
      }

      const summary =
        summariesByKey.get(key) || createYieldRoomSummary(room);
      const segment = createYieldSegment({
        room,
        durationHours,
        orundumCraftMaterial,
        allowMaaFallback,
      });
      summary.durationHours += durationHours;
      if (segment.calculated) {
        summary.calculatedDurationHours += durationHours;
      }
      if (segment.output !== null) {
        summary.outputPerCycle += segment.output;
      }
      summary.segments.push(segment);
      summariesByKey.set(key, summary);
    }
  }

  const rooms = [...summariesByKey.values()].map((summary) =>
    finalizeYieldRoomSummary(summary, cycleHours),
  );
  const directResourcesByKey = buildDirectYieldResources(rooms);
  const droneCharge = buildDroneChargeSummary({ states, cycleHours });
  const resolvedDronePlan = resolveDronePlanByState({
    states,
    droneTargetKeysByState,
    droneOrdersByState,
  });
  const droneUsage = buildDroneUsageSummary({
    droneCharge,
    droneOrdersByState: resolvedDronePlan.droneOrdersByState,
  });
  const tradingSettlements = buildTradingSettlements({
    states,
    cycleHours,
    allowMaaFallback,
  });
  const droneTargetSettlement = buildDroneTargetSettlement({
    states,
    cycleHours,
    droneCharge,
    droneUsage,
    droneTargetKey,
    droneTargetKeysByState: resolvedDronePlan.droneTargetKeysByState,
    tradingRosterById,
    orundumCraftMaterial,
  });
  const orundumTradeFlowTotals = buildOrundumTradeFlowTotals({
    tradingSettlements,
    droneTargetSettlement,
  });
  const orundumManufactureFlowTotals = buildOrundumManufactureFlowTotals({
    states,
    droneTargetSettlement,
    orundumCraftMaterial,
  });
  const selectedSettlement = buildYieldResourceSettlement({
    directResourcesByKey,
    tradingSettlements,
    orundumTradeFlowTotals,
    orundumManufactureFlowTotals,
    droneTargetSettlement,
    cycleHours,
  });
  const buildStateScopedDroneResourceEffects = (targetKey) =>
    states.map((_, stateIndex) => {
      const stateSettlement = buildDroneTargetSettlement({
        states,
        cycleHours,
        droneCharge,
        droneUsage,
        droneTargetKeysByState: states.map((__, index) =>
          index === stateIndex ? targetKey : "",
        ),
        tradingRosterById,
        orundumCraftMaterial,
      });
      const stateSegment = stateSettlement.segments[stateIndex];

      return buildDirectDroneSegmentResourceEffects(stateSegment);
    });
  const droneTargetSettlements = getDroneTargetKeys(states).map(
    (targetKey) => {
      const settlement = buildDroneTargetSettlement({
        states,
        cycleHours,
        droneCharge,
        droneUsage,
        droneTargetKey: targetKey,
        tradingRosterById,
        orundumCraftMaterial,
      });
      return {
        ...settlement,
        resourceEffects: buildDirectDroneSettlementResourceEffects(settlement),
        resourceEffectsBySegment: buildStateScopedDroneResourceEffects(targetKey),
      };
    },
  );
  const selectedDroneResourceEffects = droneTargetSettlement.isCalculated
    ? buildDirectDroneSettlementResourceEffects(droneTargetSettlement)
    : null;

  return {
    cycleHours,
    roomCount: rooms.length,
    calculatedRoomCount: rooms.filter((room) => room.isCalculated).length,
    resources: selectedSettlement.resources,
    rooms,
    tradingSettlements,
    droneCharge,
    droneUsage,
    droneTargetSettlements,
    droneTargetSettlement: {
      ...droneTargetSettlement,
      resourceEffects: selectedDroneResourceEffects,
    },
    resourceFlows: selectedSettlement.flows,
    assumptions: [
      "level2AndLevel3ProductionRoomReferences",
      "l79EfficiencyAndShiftDuration",
      "officeNetRefreshAboveBaseContactSpeed",
      "goldNetAfterLmdTradeConsumption",
      "lmdGrossNoCollectionOrDrones",
      "tradingSpecialOrderResourceStreams",
      "droneChargeFromFinalPowerRoster",
    ],
  };
}

/**
 * Summarizes the already assembled schedule. This is deliberately read-only:
 * it never changes candidates, fallback assignments, or control-center picks.
 */
export function summarizeRiicActualSchedule({
  l79,
  preview,
  droneTargetKey = "",
  droneTargetKeysByState = null,
  droneOrdersByState = null,
  tradingOperators = [],
  orundumCraftMaterial = "orirock",
  // Only the dedicated MAA compatibility test should set this to true.
  // It only selects a legacy estimate path; it never blocks settlement.
  allowMaaFallback = false,
} = {}) {
  const settledPreview = l79?.preview || preview || {};
  const states = Array.isArray(settledPreview?.states)
    ? settledPreview.states
    : [];
  const roomSummaries = new Map();
  let cycleHours = 0;

  for (const state of states) {
    const durationHours = toPositiveHours(state?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    cycleHours += durationHours;
    for (const room of state?.rooms || []) {
      const key = String(room?.key || "").trim();
      if (!key) {
        continue;
      }

      const summary = roomSummaries.get(key) || createRoomSummary(room);
      const segment = createSegment({ room, state, durationHours });

      summary.durationHours += durationHours;
      summary.manuallyEdited ||= segment.manuallyEdited;
      if (room?.product) {
        summary.products.add(String(room.product));
      }
      if (segment.calculated) {
        summary.calculatedDurationHours += durationHours;
        summary.efficiencyPercentHours +=
          Number(segment.efficiency) * durationHours;
        summary.controlCenterBonusPercentHours +=
          Number(segment.controlCenterBonusPercent) * durationHours;
      }
      summary.segments.push(segment);
      roomSummaries.set(key, summary);
    }
  }

  const rooms = [...roomSummaries.values()].map(finalizeRoomSummary);
  const calculatedRoomCount = rooms.filter((room) => room.isCalculated).length;
  const resolvedCycleHours =
    cycleHours || toPositiveHours(settledPreview?.cycleHours);

  return {
    cycleHours: resolvedCycleHours,
    roomCount: rooms.length,
    calculatedRoomCount,
    rooms,
    facilities: buildFacilitySummaries(rooms),
    yield: buildYieldSummary({
      states,
      cycleHours: resolvedCycleHours,
      droneTargetKey,
      droneTargetKeysByState,
      droneOrdersByState,
      legacyTradingOperators: tradingOperators,
      orundumCraftMaterial,
      allowMaaFallback,
    }),
  };
}
