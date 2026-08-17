import { calculateRiicTrading } from "./P01-riic-trading.js";
import { calculateRiicTradingDrone } from "./P02-riic-trading-drone.js";
import {
  calculateRiicDirectProductionOutput,
  getRiicReferenceDailyRate,
  getRiicRoomYieldMeta,
} from "./P03-riic-production.js";
import { settleRiicNetResources } from "./P04-riic-resource-netting.js";
import {
  resolveRiicTradingExternalOrderBonuses,
} from "./riic-trading-context.js";

const EPSILON = 1e-9;
const ORUNDUM_PER_ORIGINIUM_SHARD = 10;
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

function isOrundumTradingRoom(room) {
  return (
    isTradingRoom(room) &&
    String(room?.product || "").trim() === "orundum"
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

function createOperatorRosterById(operators) {
  const rosterById = new Map();

  for (const operator of operators || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      continue;
    }

    rosterById.set(charId, operator);
  }

  return rosterById;
}

function getTradingOperators(room, rosterById) {
  return (room?.operators || []).map((roomOperator) => {
    const charId = String(roomOperator?.charId || "").trim();
    const rosterOperator = rosterById.get(charId) || {};

    return {
      charId,
      elite: rosterOperator?.elite ?? roomOperator?.elite,
      level: rosterOperator?.level ?? roomOperator?.level,
    };
  });
}

function getPerceptionState(perceptionSettlement, state) {
  const stateIndex = Number(state?.index);
  if (!Number.isInteger(stateIndex)) {
    return null;
  }

  return (
    (perceptionSettlement?.states || []).find(
      (candidate) => Number(candidate?.index) === stateIndex,
    ) || null
  );
}

function getTradingOperatorBonuses(room) {
  return (room?.controlCenterOperatorBonuses || []).reduce(
    (bonuses, entry) => {
      const charId = String(entry?.operatorId || "").trim();
      const percent = toFinitePercent(entry?.bonusPercent);
      if (!charId || percent === null) {
        return bonuses;
      }

      bonuses[charId] = Number(bonuses[charId] || 0) + percent;
      return bonuses;
    },
    {},
  );
}

function getTradingTeamCalculationBonus(room) {
  const calculation =
    room?.efficiencyMetrics?.actual?.breakdown?.teamCalculation;
  if (
    String(calculation?.type || "").trim() !== "jayeOrderLimit" ||
    !Number.isFinite(Number(calculation?.coreBonusPercentBeforeControl))
  ) {
    return {};
  }

  return {
    localOrderBonusOverride: Number(
      calculation.coreBonusPercentBeforeControl,
    ),
    ignoredUnsupportedOperatorIds: [
      String(calculation?.sourceMemberId || "").trim(),
    ].filter(Boolean),
  };
}

function calculateTradingRoom({
  room,
  rosterById,
  stateRooms,
  perceptionState,
}) {
  if (!isTradingRoom(room)) {
    return null;
  }

  const roomBonus =
    Number(toFinitePercent(room?.controlCenterFacilityBonusPercent) || 0) +
    Number(toFinitePercent(room?.activeRosterBonusPercent) || 0) +
    Number(toFinitePercent(room?.resourceChainAdditionalBonusPercent) || 0);

  return calculateRiicTrading(
    {
      type: "trading",
      product: String(room?.product || "").trim(),
      level: Number(room?.stationLevel),
      context: {
        resolvedExternalOrderBonuses:
          resolveRiicTradingExternalOrderBonuses(stateRooms),
        silentResonance: Number(
          perceptionState?.resources?.silentResonance,
        ),
      },
    },
    getTradingOperators(room, rosterById || new Map()),
    {
      room: roomBonus,
      operators: getTradingOperatorBonuses(room),
      ...getTradingTeamCalculationBonus(room),
    },
  );
}

function calculateTradingDroneRoom({ room, rosterById }) {
  if (!isTradingRoom(room)) {
    return null;
  }

  return calculateRiicTradingDrone(
    {
      type: "trading",
      product: String(room?.product || "").trim(),
      level: Number(room?.stationLevel),
    },
    getTradingOperators(room, rosterById || new Map()),
  );
}

function createTradingDroneFlow(calculation, droneCount) {
  const multiplier = Number(droneCount);
  if (
    !calculation?.ok ||
    !Number.isFinite(multiplier) ||
    multiplier < 0
  ) {
    return null;
  }

  return {
    type: "drone",
    lmdOutput: Number(calculation.lmdOutput || 0) * multiplier,
    orundumOutput: Number(calculation.orundumOutput || 0) * multiplier,
    goldConsumption: Number(calculation.goldConsumption || 0) * multiplier,
    virtualGoldOutput: 0,
    shardConsumption: Number(calculation.shardConsumption || 0) * multiplier,
  };
}

function createTradingFlow(calculation, durationHours) {
  if (!calculation?.ok) {
    return null;
  }

  return {
    type: calculation.type,
    lmdOutput:
      calculation.product === "lmd" ? calculation.lmd * durationHours : 0,
    orundumOutput:
      calculation.product === "orundum"
        ? calculation.orundumCapacity * durationHours
        : 0,
    goldConsumption:
      calculation.product === "lmd"
        ? Math.max(0, -calculation.gold * durationHours)
        : 0,
    virtualGoldOutput:
      calculation.product === "lmd"
        ? calculation.virtualGold * durationHours
        : 0,
    shardConsumption:
      calculation.product === "orundum"
        ? calculation.shardConsumption * durationHours
        : 0,
  };
}

function createOrundumTradingFlow(orundumOutput) {
  const output = Number(orundumOutput);
  if (!Number.isFinite(output) || output < 0) {
    return null;
  }

  return {
    type: "normal",
    lmdOutput: 0,
    orundumOutput: output,
    goldConsumption: 0,
    virtualGoldOutput: 0,
    shardConsumption: output / ORUNDUM_PER_ORIGINIUM_SHARD,
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
  const calculated =
    efficiency !== null &&
    room?.efficiencyMetrics?.actual?.status === "calculated";
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
    efficiency: calculated ? efficiency : null,
    controlCenterBonusPercent: calculated
      ? controlCenterBonusPercent || 0
      : null,
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

function createYieldSegment({
  room,
  durationHours,
  tradingRosterById,
  stateRooms,
  perceptionState,
  orundumCraftMaterial,
}) {
  const efficiency = toFinitePercent(room?.efficiency);
  const efficiencyCalculated =
    efficiency !== null &&
    room?.efficiencyMetrics?.actual?.status === "calculated";
  const meta = getRiicRoomYieldMeta(room);
  const dailyRate = getRiicReferenceDailyRate(room, meta);
  const isOrundumTrading = isOrundumTradingRoom(room);
  const usesDirectEfficiency = isOrundumTrading || !isTradingRoom(room);
  const tradingCalculation = isTradingRoom(room) && !isOrundumTrading
    ? calculateTradingRoom({
      room,
      rosterById: tradingRosterById,
      stateRooms,
      perceptionState,
    })
    : null;
  const calculatedTradingFlow = tradingCalculation?.ok
    ? createTradingFlow(tradingCalculation, durationHours)
    : null;
  const unavailableReason = usesDirectEfficiency
    ? !efficiencyCalculated
      ? "efficiencyUnavailable"
      : !meta
        ? "unsupportedProduct"
        : dailyRate === null
          ? "unsupportedStationLevel"
          : ""
    : tradingCalculation?.ok
      ? ""
      : tradingCalculation?.error || "tradingCalculationUnavailable";

  const directProductionOutput = calculateRiicDirectProductionOutput({
    room,
    efficiency,
    durationHours,
    meta,
  });
  const output = unavailableReason
    ? null
    : calculatedTradingFlow
      ? calculatedTradingFlow.lmdOutput
      : directProductionOutput;
  const tradingFlow = isOrundumTrading && output !== null
    ? createOrundumTradingFlow(output)
    : calculatedTradingFlow;
  const orundumManufactureFlow =
    isOrundumManufactureRoom(room) && output !== null
      ? createOrundumManufactureFlow(output, orundumCraftMaterial)
      : null;

  return {
    durationHours,
    calculated: !unavailableReason,
    unavailableReason,
    output,
    tradingFlow,
    tradingCalculation,
    orundumManufactureFlow,
  };
}

function finalizeRoomSummary(summary) {
  const calculated =
    summary.durationHours > 0 &&
    Math.abs(summary.calculatedDurationHours - summary.durationHours) <=
      EPSILON;

  return {
    key: summary.key,
    label: summary.label,
    facility: summary.facility,
    product: summary.products.size === 1 ? [...summary.products][0] : "",
    products: [...summary.products],
    durationHours: summary.durationHours,
    calculatedDurationHours: summary.calculatedDurationHours,
    isCalculated: calculated,
    calculationStatus: calculated
      ? "calculated"
      : summary.manuallyEdited
        ? "manuallyEdited"
        : "unavailable",
    averageEfficiency: calculated
      ? roundPercent(
          summary.efficiencyPercentHours / summary.calculatedDurationHours,
        )
      : null,
    averageControlCenterBonusPercent: calculated
      ? roundPercent(
          summary.controlCenterBonusPercentHours /
            summary.calculatedDurationHours,
        )
      : null,
    segments: summary.segments,
  };
}

function finalizeYieldRoomSummary(summary, cycleHours) {
  const calculated =
    summary.durationHours > 0 &&
    Math.abs(summary.calculatedDurationHours - summary.durationHours) <=
      EPSILON;
  const outputPerDay =
    calculated && cycleHours > 0
      ? summary.outputPerCycle * (24 / cycleHours)
      : null;

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
    calculationStatus: calculated ? "calculated" : "unavailable",
    unavailableReason: summary.segments.find(
      (segment) => segment.unavailableReason,
    )?.unavailableReason || "",
    outputPerCycle: calculated ? roundYield(summary.outputPerCycle) : null,
    outputPerDay: outputPerDay === null ? null : roundYield(outputPerDay),
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
    if (room.isCalculated) {
      summary.calculatedRoomCount += 1;
      summary.calculatedDurationHours += room.durationHours;
      summary.efficiencyPercentHours +=
        Number(room.averageEfficiency || 0) * room.durationHours;
      summary.controlCenterBonusPercentHours +=
        Number(room.averageControlCenterBonusPercent || 0) *
        room.durationHours;
    }
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
        : null,
    averageControlCenterBonusPercent:
      summary.calculatedDurationHours > 0
        ? roundPercent(
            summary.controlCenterBonusPercentHours /
              summary.calculatedDurationHours,
          )
        : null,
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
    if (room.isCalculated) {
      summary.calculatedRoomCount += 1;
      summary.outputPerCycle += Number(room.outputPerCycle || 0);
      summary.outputPerDay += Number(room.outputPerDay || 0);
    }
    resourcesByKey.set(resource, summary);
  }

  return new Map(
    [...resourcesByKey.values()].map((summary) => {
      const isCalculated =
        summary.roomCount > 0 &&
        summary.calculatedRoomCount === summary.roomCount;
      return [
        summary.resource,
        {
          ...summary,
          isCalculated,
          outputPerCycle: isCalculated
            ? roundYield(summary.outputPerCycle)
            : null,
          outputPerDay: isCalculated ? roundYield(summary.outputPerDay) : null,
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
  let isCalculated = true;
  let goldConsumptionPerCycle = 0;
  let virtualGoldOutputPerCycle = 0;

  for (const settlement of tradingSettlements || []) {
    if (String(settlement?.product || "").trim() !== "lmd") {
      continue;
    }

    if (!settlement?.isCalculated) {
      isCalculated = false;
      continue;
    }

    goldConsumptionPerCycle += Number(
      settlement.goldConsumptionPerCycle || 0,
    );
    virtualGoldOutputPerCycle += Number(
      settlement.virtualGoldOutputPerCycle || 0,
    );
  }

  if (
    droneTargetSettlement &&
    droneTargetSettlement.status !== "notSelected" &&
    !droneTargetSettlement.isCalculated
  ) {
    isCalculated = false;
  }

  for (const segment of droneTargetSettlement?.segments || []) {
    if (!segment?.calculated) {
      continue;
    }

    goldConsumptionPerCycle += Number(
      segment.tradingFlow?.goldConsumption || 0,
    );
    virtualGoldOutputPerCycle += Number(
      segment.tradingFlow?.virtualGoldOutput || 0,
    );
  }

  return {
    isCalculated,
    goldConsumptionPerCycle,
    virtualGoldOutputPerCycle,
  };
}

function buildOrundumTradeFlowTotals({
  tradingSettlements,
  droneTargetSettlement,
}) {
  let isCalculated = true;
  let shardConsumptionPerCycle = 0;
  const orundumSettlements = (tradingSettlements || []).filter(
    (settlement) => String(settlement?.product || "").trim() === "orundum",
  );

  for (const settlement of orundumSettlements) {
    if (!settlement?.isCalculated) {
      isCalculated = false;
      continue;
    }

    shardConsumptionPerCycle += Number(
      settlement.shardConsumptionPerCycle || 0,
    );
  }

  for (const segment of droneTargetSettlement?.segments || []) {
    if (String(segment?.resource || "").trim() !== "orundum") {
      continue;
    }
    if (!segment.calculated || !segment.tradingFlow) {
      isCalculated = false;
      continue;
    }

    shardConsumptionPerCycle += Number(
      segment.tradingFlow.shardConsumption || 0,
    );
  }

  return {
    isCalculated,
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
  let isCalculated = true;
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
        stateRooms: state?.rooms || [],
        orundumCraftMaterial,
      });
      if (!segment.calculated || !segment.orundumManufactureFlow) {
        isCalculated = false;
        roomSummariesByKey.set(key, summary);
        continue;
      }

      summary.calculatedSegmentCount += 1;
      lmdConsumptionPerCycle += Number(
        segment.orundumManufactureFlow.lmdConsumption || 0,
      );
      craftMaterialConsumptionPerCycle += Number(
        segment.orundumManufactureFlow.craftMaterialConsumption || 0,
      );
      roomSummariesByKey.set(key, summary);
    }
  }

  for (const segment of droneTargetSettlement?.segments || []) {
    if (String(segment?.resource || "").trim() !== "originiumShard") {
      continue;
    }
    if (!segment.calculated || !segment.orundumManufactureFlow) {
      isCalculated = false;
      continue;
    }

    lmdConsumptionPerCycle += Number(
      segment.orundumManufactureFlow.lmdConsumption || 0,
    );
    craftMaterialConsumptionPerCycle += Number(
      segment.orundumManufactureFlow.craftMaterialConsumption || 0,
    );
  }

  return {
    isCalculated,
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
        isCalculated: gold.isCalculated,
        grossOutputPerCycle: gold.grossOutputPerCycle ?? null,
        grossOutputPerDay: gold.grossOutputPerDay ?? null,
        tradeConsumptionPerCycle: gold.tradeConsumptionPerCycle ?? null,
        tradeConsumptionPerDay: gold.tradeConsumptionPerDay ?? null,
        virtualGoldOutputPerCycle: gold.virtualGoldOutputPerCycle ?? null,
        virtualGoldOutputPerDay: gold.virtualGoldOutputPerDay ?? null,
      },
      orundum: {
        isCalculated:
          orundumTradeFlowTotals.isCalculated &&
          orundumManufactureFlowTotals.isCalculated,
        lmdConsumptionPerCycle:
          lmd.orundumManufactureConsumptionPerCycle ?? null,
        lmdConsumptionPerDay:
          lmd.orundumManufactureConsumptionPerDay ?? null,
        shardConsumptionPerCycle:
          originiumShard.tradeConsumptionPerCycle ?? null,
        shardConsumptionPerDay: originiumShard.tradeConsumptionPerDay ?? null,
        craftMaterial: orundumManufactureFlowTotals.craftMaterial || "",
        craftMaterialLabel:
          orundumManufactureFlowTotals.craftMaterialLabel || "",
        craftMaterialConsumptionPerCycle:
          orundumManufactureFlowTotals.craftMaterialConsumptionPerCycle ?? null,
        craftMaterialConsumptionPerDay:
          orundumManufactureFlowTotals.isCalculated && cycleHours > 0
            ? roundYield(
                Number(
                  orundumManufactureFlowTotals.craftMaterialConsumptionPerCycle ||
                    0,
                ) *
                  (24 / cycleHours),
              )
            : null,
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
  const isCalculated =
    segment?.calculated === true && Number.isFinite(output);

  return {
    isCalculated,
    primaryResource: getSettlementPrimaryResource(segment?.resource),
    primaryOutput: isCalculated ? roundYield(output) : null,
    goldConsumption: hasGoldConsumption
      ? roundYield(goldConsumption)
      : null,
    shardConsumption: hasShardConsumption
      ? roundYield(shardConsumption)
      : null,
    lmdConsumption: hasLmdConsumption ? roundYield(lmdConsumption) : null,
    netGold:
      hasGoldConsumption || hasVirtualGoldOutput
        ? roundYield(
            (hasVirtualGoldOutput ? virtualGoldOutput : 0) -
              (hasGoldConsumption ? goldConsumption : 0),
          )
        : null,
    virtualGoldOutput: hasVirtualGoldOutput
      ? roundYield(virtualGoldOutput)
      : null,
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
        : null,
  };
}

function buildDirectDroneSettlementResourceEffects(settlement) {
  const segments = Array.isArray(settlement?.segments)
    ? settlement.segments
    : [];
  const effects = segments.map(buildDirectDroneSegmentResourceEffects);
  const isCalculated =
    effects.length > 0 && effects.every((effect) => effect.isCalculated);

  if (!isCalculated) {
    return {
      isCalculated: false,
      primaryResource: getSettlementPrimaryResource(settlement?.resource),
      primaryOutput: null,
      goldConsumption: null,
      shardConsumption: null,
      lmdConsumption: null,
      netGold: null,
      virtualGoldOutput: null,
      craftMaterial: "",
      craftMaterialLabel: "",
      craftMaterialConsumption: null,
    };
  }

  const sum = (field) =>
    roundYield(
      effects.reduce((total, effect) => total + Number(effect[field] || 0), 0),
    );
  const hasGoldConsumption = effects.some(
    (effect) => effect.goldConsumption !== null,
  );
  const hasVirtualGoldOutput = effects.some(
    (effect) => effect.virtualGoldOutput !== null,
  );
  const hasShardConsumption = effects.some(
    (effect) => effect.shardConsumption !== null,
  );
  const hasLmdConsumption = effects.some(
    (effect) => effect.lmdConsumption !== null,
  );
  const hasCraftMaterialConsumption = effects.some(
    (effect) => effect.craftMaterialConsumption !== null,
  );
  const craftMaterialEffect = effects.find(
    (effect) => effect.craftMaterial,
  );

  return {
    isCalculated: true,
    primaryResource: effects[0].primaryResource,
    primaryOutput: sum("primaryOutput"),
    goldConsumption: hasGoldConsumption ? sum("goldConsumption") : null,
    shardConsumption: hasShardConsumption ? sum("shardConsumption") : null,
    lmdConsumption: hasLmdConsumption ? sum("lmdConsumption") : null,
    netGold:
      hasGoldConsumption || hasVirtualGoldOutput ? sum("netGold") : null,
    virtualGoldOutput: hasVirtualGoldOutput ? sum("virtualGoldOutput") : null,
    craftMaterial: craftMaterialEffect?.craftMaterial || "",
    craftMaterialLabel: craftMaterialEffect?.craftMaterialLabel || "",
    craftMaterialConsumption: hasCraftMaterialConsumption
      ? sum("craftMaterialConsumption")
      : null,
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
  tradingRosterById,
  orundumCraftMaterial,
  perceptionSettlement,
}) {
  const summariesByKey = new Map();

  for (const state of states) {
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
        tradingRosterById,
        stateRooms: state?.rooms || [],
        perceptionState: getPerceptionState(perceptionSettlement, state),
        orundumCraftMaterial,
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
        durationHours,
        calculated: segment.calculated && Boolean(segment.tradingFlow),
        unavailableReason: segment.unavailableReason,
        type: segment.tradingFlow?.type || "",
        typeLabel: getTradingSettlementTypeLabel(segment.tradingFlow?.type),
        operatorIds: (room?.operators || [])
          .map((operator) => String(operator?.charId || "").trim())
          .filter(Boolean),
        lmdOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.lmdOutput)
          : null,
        orundumOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.orundumOutput)
          : null,
        goldConsumption: segment.tradingFlow
          ? roundYield(segment.tradingFlow.goldConsumption)
          : null,
        shardConsumption: segment.tradingFlow
          ? roundYield(segment.tradingFlow.shardConsumption)
          : null,
        virtualGoldOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.virtualGoldOutput)
          : null,
        error: segment.tradingCalculation?.ok
          ? ""
          : segment.tradingCalculation?.error || segment.unavailableReason,
      });
      summariesByKey.set(key, summary);
    }
  }

  return [...summariesByKey.values()].map((summary) => {
    const calculated =
      summary.durationHours > 0 &&
      Math.abs(summary.calculatedDurationHours - summary.durationHours) <=
        EPSILON;
    const perDayMultiplier = calculated && cycleHours > 0 ? 24 / cycleHours : 0;
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
      lmdOutputPerCycle: calculated
        ? roundYield(summary.lmdOutputPerCycle)
        : null,
      lmdOutputPerDay: calculated
        ? roundYield(summary.lmdOutputPerCycle * perDayMultiplier)
        : null,
      orundumOutputPerCycle: calculated
        ? roundYield(summary.orundumOutputPerCycle)
        : null,
      orundumOutputPerDay: calculated
        ? roundYield(summary.orundumOutputPerCycle * perDayMultiplier)
        : null,
      goldConsumptionPerCycle: calculated
        ? roundYield(summary.goldConsumptionPerCycle)
        : null,
      goldConsumptionPerDay: calculated
        ? roundYield(summary.goldConsumptionPerCycle * perDayMultiplier)
        : null,
      shardConsumptionPerCycle: calculated
        ? roundYield(summary.shardConsumptionPerCycle)
        : null,
      shardConsumptionPerDay: calculated
        ? roundYield(summary.shardConsumptionPerCycle * perDayMultiplier)
        : null,
      virtualGoldOutputPerCycle: calculated
        ? roundYield(summary.virtualGoldOutputPerCycle)
        : null,
      virtualGoldOutputPerDay: calculated
        ? roundYield(summary.virtualGoldOutputPerCycle * perDayMultiplier)
        : null,
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
      const calculated =
        efficiency !== null &&
        room?.efficiencyMetrics?.actual?.status === "calculated";
      const operatorCount = getWorkingPowerOperatorCount(room);
      const operatorBonusPercent =
        operatorCount * POWER_OPERATOR_CHARGE_BONUS_PERCENT;
      const skillBonusPercent = calculated
        ? Math.max(0, efficiency - 100)
        : null;

      return {
        key: String(room?.key || "").trim(),
        label: String(room?.label || room?.key || "").trim(),
        calculated,
        operatorCount,
        operatorBonusPercent,
        skillBonusPercent,
        chargeBonusPercent:
          skillBonusPercent === null
            ? null
            : operatorBonusPercent + skillBonusPercent,
      };
    });
  const calculated = rooms.length > 0 && rooms.every((room) => room.calculated);
  const operatorBonusPercent = rooms.reduce(
    (total, room) => total + room.operatorBonusPercent,
    0,
  );
  const skillBonusPercent = calculated
    ? rooms.reduce((total, room) => total + room.skillBonusPercent, 0)
    : null;
  const chargeBonusPercent =
    skillBonusPercent === null
      ? null
      : operatorBonusPercent + skillBonusPercent;
  const droneOutput =
    chargeBonusPercent === null
      ? null
      : DRONE_BASE_PER_HOUR *
        (1 + chargeBonusPercent / 100) *
        durationHours;

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
      skillBonusPercent:
        segment.skillBonusPercent === null
          ? null
          : roundPercent(segment.skillBonusPercent),
      chargeBonusPercent:
        segment.chargeBonusPercent === null
          ? null
          : roundPercent(segment.chargeBonusPercent),
      droneOutput:
        segment.droneOutput === null ? null : roundYield(segment.droneOutput),
      rooms: segment.rooms.map((room) => ({
        ...room,
        skillBonusPercent:
          room.skillBonusPercent === null
            ? null
            : roundPercent(room.skillBonusPercent),
        chargeBonusPercent:
          room.chargeBonusPercent === null
            ? null
            : roundPercent(room.chargeBonusPercent),
      })),
    });
  }

  const calculated =
    durationHours > 0 &&
    Math.abs(calculatedDurationHours - durationHours) <= EPSILON;
  const perDayMultiplier = calculated && cycleHours > 0 ? 24 / cycleHours : 0;

  return {
    durationHours,
    calculatedDurationHours,
    isCalculated: calculated,
    droneOutputPerCycle: calculated ? roundYield(droneOutputPerCycle) : null,
    droneOutputPerDay: calculated
      ? roundYield(droneOutputPerCycle * perDayMultiplier)
      : null,
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
  const segments = chargeSegments.map((chargeSegment) => ({
    stateIndex: Number(chargeSegment?.stateIndex),
    order: normalizeDroneOrder(
      Array.isArray(droneOrdersByState)
        ? droneOrdersByState[Number(chargeSegment?.stateIndex)]
        : "",
    ),
    generatedDroneOutput: Number.isFinite(Number(chargeSegment?.droneOutput))
      ? Number(chargeSegment.droneOutput)
      : null,
    rawAvailableDroneOutput: null,
    availableDroneOutput: null,
    usedDroneOutput: null,
    storedDroneOutput: null,
    capacityReached: false,
  }));
  const isCalculated =
    segments.length > 0 &&
    segments.every((segment) => segment.generatedDroneOutput !== null);

  if (!isCalculated) {
    return {
      isCalculated: false,
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
  const facility = String(room?.facility || "").trim();
  const product = String(room?.product || "").trim();
  const droneCount = Number(droneOutput);
  const meta = getRiicRoomYieldMeta(room);
  const acceleratedHours =
    Number.isFinite(droneCount) && droneCount >= 0
      ? droneCount * DRONE_ACCELERATION_HOURS
      : null;
  const manufactureOutput =
    acceleratedHours === null || facility !== "manufacture"
      ? null
      : product === "experience"
        ? (droneCount * 1000) / 60
        : product === "gold"
          ? droneCount / 24
          : product === "orundum"
            ? droneCount / 20
            : null;
  const tradingCalculation = isTradingRoom(room)
    ? calculateTradingDroneRoom({
        room,
        rosterById: tradingRosterById,
      })
    : null;
  const unavailableReason =
    acceleratedHours === null
      ? "droneUnavailable"
      : isTradingRoom(room)
        ? tradingCalculation?.ok
          ? ""
          : tradingCalculation?.error || "tradingCalculationUnavailable"
      : facility === "manufacture"
        ? manufactureOutput === null
          ? "unsupportedProduct"
          : ""
      : "unsupportedDroneTarget";

  if (unavailableReason) {
    return {
      calculated: false,
      unavailableReason,
      acceleratedHours: null,
      resource: meta?.resource || "",
      resourceLabel: meta?.label || "",
      unit: meta?.unit || "",
      output: null,
      tradingFlow: null,
      tradingCalculation,
    };
  }

  const tradingFlow = tradingCalculation?.ok
    ? createTradingDroneFlow(tradingCalculation, droneCount)
    : null;
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
    unavailableReason: "",
    acceleratedHours,
    resource: meta.resource,
    resourceLabel: meta.label,
    unit: meta.unit,
    output,
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
      isCalculated: false,
      label: "",
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
  let droneSegmentIndex = 0;

  for (const [stateIndex, state] of states.entries()) {
    const segmentDurationHours = toPositiveHours(state?.durationHours);
    if (segmentDurationHours <= 0) {
      continue;
    }

    durationHours += segmentDurationHours;
    const stateTargetKey = usesPerStateTargets
      ? targetsByState[stateIndex] || ""
      : targetKey;
    const room = (state?.rooms || []).find(
      (item) => String(item?.key || "").trim() === stateTargetKey,
    );
    const chargeSegment = droneCharge?.segments?.[droneSegmentIndex];
    const usageSegment = droneUsage?.segments?.[droneSegmentIndex];
    const droneOutput =
      usageSegment?.usedDroneOutput === null ||
      usageSegment?.usedDroneOutput === undefined
        ? chargeSegment?.droneOutput
        : usageSegment.usedDroneOutput;
    droneSegmentIndex += 1;
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
          calculated: false,
          unavailableReason: "targetMissing",
          acceleratedHours: null,
          resource: "",
          resourceLabel: "",
          unit: "",
          output: null,
          tradingFlow: null,
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
        droneOutput === null || droneOutput === undefined
          ? null
          : roundYield(droneOutput),
      retainedDroneOutput:
        usageSegment?.storedDroneOutput === null ||
        usageSegment?.storedDroneOutput === undefined
          ? null
          : roundYield(usageSegment.storedDroneOutput),
      droneStorageLimitReached: usageSegment?.capacityReached === true,
      calculated: benefit.calculated,
      unavailableReason: benefit.unavailableReason,
      acceleratedHours:
        benefit.acceleratedHours === null
          ? null
          : roundYield(benefit.acceleratedHours),
      output: benefit.output === null ? null : roundYield(benefit.output),
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

  const calculated =
    durationHours > 0 &&
    Math.abs(calculatedDurationHours - durationHours) <= EPSILON;
  const perDayMultiplier = calculated && cycleHours > 0 ? 24 / cycleHours : 0;

  return {
    status: calculated ? "calculated" : "unavailable",
    isCalculated: calculated,
    key: usesPerStateTargets ? "" : targetKey,
    label: usesPerStateTargets ? "按班次投向" : label,
    resource: usesPerStateTargets ? "" : resource,
    resourceLabel: usesPerStateTargets ? "" : resourceLabel,
    unit: usesPerStateTargets ? "" : unit,
    outputPerCycle: calculated ? roundYield(outputPerCycle) : null,
    outputPerDay: calculated
      ? roundYield(outputPerCycle * perDayMultiplier)
      : null,
    goldConsumptionPerCycle: calculated
      ? roundYield(goldConsumptionPerCycle)
      : null,
    goldConsumptionPerDay: calculated
      ? roundYield(goldConsumptionPerCycle * perDayMultiplier)
      : null,
    virtualGoldOutputPerCycle: calculated
      ? roundYield(virtualGoldOutputPerCycle)
      : null,
    virtualGoldOutputPerDay: calculated
      ? roundYield(virtualGoldOutputPerCycle * perDayMultiplier)
      : null,
    shardConsumptionPerCycle: calculated
      ? roundYield(shardConsumptionPerCycle)
      : null,
    shardConsumptionPerDay: calculated
      ? roundYield(shardConsumptionPerCycle * perDayMultiplier)
      : null,
    lmdConsumptionPerCycle: calculated
      ? roundYield(lmdConsumptionPerCycle)
      : null,
    lmdConsumptionPerDay: calculated
      ? roundYield(lmdConsumptionPerCycle * perDayMultiplier)
      : null,
    craftMaterialConsumptionPerCycle: calculated
      ? roundYield(craftMaterialConsumptionPerCycle)
      : null,
    craftMaterialConsumptionPerDay: calculated
      ? roundYield(craftMaterialConsumptionPerCycle * perDayMultiplier)
      : null,
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

function buildYieldSummary({
  states,
  cycleHours,
  droneTargetKey,
  droneTargetKeysByState,
  droneOrdersByState,
  tradingOperators,
  orundumCraftMaterial,
  perceptionSettlement,
}) {
  const tradingRosterById = createOperatorRosterById(tradingOperators);
  const summariesByKey = new Map();

  for (const state of states) {
    const durationHours = toPositiveHours(state?.durationHours);
    if (durationHours <= 0) {
      continue;
    }
    const perceptionState = getPerceptionState(perceptionSettlement, state);

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
        tradingRosterById,
        stateRooms: state?.rooms || [],
        perceptionState,
        orundumCraftMaterial,
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
  const droneUsage = buildDroneUsageSummary({
    droneCharge,
    droneOrdersByState,
  });
  const tradingSettlements = buildTradingSettlements({
    states,
    cycleHours,
    tradingRosterById,
    perceptionSettlement,
  });
  const droneTargetSettlement = buildDroneTargetSettlement({
    states,
    cycleHours,
    droneCharge,
    droneUsage,
    droneTargetKey,
    droneTargetKeysByState,
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
  preview,
  droneTargetKey = "",
  droneTargetKeysByState = null,
  droneOrdersByState = null,
  tradingOperators = [],
  orundumCraftMaterial = "orirock",
} = {}) {
  const states = Array.isArray(preview?.states) ? preview.states : [];
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
  const resolvedCycleHours = cycleHours || toPositiveHours(preview?.cycleHours);

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
      tradingOperators,
      orundumCraftMaterial,
      perceptionSettlement: preview?.perceptionSettlement,
    }),
  };
}
