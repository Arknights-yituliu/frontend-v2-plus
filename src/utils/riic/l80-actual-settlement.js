import {
  RIIC_REFERENCE_DAILY_RATES,
} from "../riicYield/riicYieldCore.js";

const EPSILON = 1e-9;
const PURE_GOLD_LMD_VALUE = 500;
const DRONE_BASE_CHARGE_MINUTES = 6;
const DRONE_BASE_PER_HOUR = 60 / DRONE_BASE_CHARGE_MINUTES;
const POWER_OPERATOR_CHARGE_BONUS_PERCENT = 5;
const DRONE_ACCELERATION_HOURS = 3 / 60;
const GOLD_MANUFACTURE_PER_DAY_AT_100_PERCENT =
  RIIC_REFERENCE_DAILY_RATES.manufacture.gold / PURE_GOLD_LMD_VALUE;
const TRADING_L2_REFERENCE_DAILY_RATE = 10140.845070422536;
const YIELD_FACILITIES = new Set([
  "manufacture",
  "trading",
  "hire",
  "office",
]);
const PRODUCT_OUTPUT_META = Object.freeze({
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
    resource: "orundumTradeCapacity",
    label: "合成玉订单产能",
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
  originiumShard: Object.freeze({ label: "源石碎片", unit: "枚/天" }),
  orundum: Object.freeze({ label: "合成玉净收益", unit: "合成玉/天" }),
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

function getRoomYieldMeta(room) {
  const sourceFacility = String(room?.facility || "").trim();
  const facility = sourceFacility === "office" ? "hire" : sourceFacility;
  const product = String(room?.product || "").trim();
  return (
    PRODUCT_OUTPUT_META[`${facility}:${product}`] ||
    (facility === "hire" ? PRODUCT_OUTPUT_META["hire:all"] : null)
  );
}

function getReferenceDailyRate(room, meta) {
  if (!meta) {
    return null;
  }

  const facility = String(room?.facility || "").trim();
  const stationLevel = Number(room?.stationLevel);

  if (meta.dailyRate !== undefined) {
    return stationLevel === 3 ||
      facility === "hire" ||
      facility === "office"
      ? Number(meta.dailyRate)
      : null;
  }

  if (facility === "manufacture" && (stationLevel === 2 || stationLevel === 3)) {
    const rate = Number(
      RIIC_REFERENCE_DAILY_RATES?.[facility]?.[meta.rateKey],
    );
    if (!Number.isFinite(rate)) {
      return null;
    }

    return meta.resource === "gold" ? rate / PURE_GOLD_LMD_VALUE : rate;
  }

  if (facility === "trading" && meta.rateKey === "lmd") {
    if (stationLevel === 2) {
      return TRADING_L2_REFERENCE_DAILY_RATE;
    }
    if (stationLevel === 3) {
      return Number(RIIC_REFERENCE_DAILY_RATES.trading.lmd);
    }
  }

  if (stationLevel !== 3) {
    return null;
  }

  const rate = Number(
    RIIC_REFERENCE_DAILY_RATES?.[facility]?.[meta.rateKey],
  );
  if (!Number.isFinite(rate)) {
    return null;
  }

  return meta.resource === "gold" ? rate / PURE_GOLD_LMD_VALUE : rate;
}

function getTradingSettlementType(room) {
  const closureCalculation =
    room?.efficiencyMetrics?.actual?.breakdown?.closureCalculation;
  if (closureCalculation) {
    return "closure";
  }

  const variantGroupId = String(
    room?.efficiencySource?.candidate?.variantGroupId || "",
  ).trim();
  if (variantGroupId.startsWith("family-butshu:")) {
    return "butshu";
  }

  const virtualGoldPercent = Number(
    room?.efficiencySource?.candidate?.publishedEquivalentByProduct?.gold,
  );
  return Number.isFinite(virtualGoldPercent) && virtualGoldPercent > 0
    ? "butshu"
    : "normal";
}

function getTradingYieldFlow({ room, durationHours, efficiency, dailyRate }) {
  const type = getTradingSettlementType(room);
  const durationRatio = durationHours / 24;
  const closureCalculation =
    room?.efficiencyMetrics?.actual?.breakdown?.closureCalculation;

  if (type === "closure") {
    const actualGoldSalePerHour = Number(
      closureCalculation?.actualGoldSalePerHour,
    );
    const virtualGoldProductionPerHour = Number(
      closureCalculation?.virtualGoldProductionPerHour,
    );
    const facilityBonusPercent = toFinitePercent(
      room?.controlCenterFacilityBonusPercent,
    );
    const facilityMultiplier =
      1 + Number(facilityBonusPercent || 0) / 100;

    if (
      !Number.isFinite(actualGoldSalePerHour) ||
      !Number.isFinite(virtualGoldProductionPerHour)
    ) {
      return null;
    }

    const goldConsumption =
      actualGoldSalePerHour * facilityMultiplier * durationHours;
    const virtualGoldOutput =
      virtualGoldProductionPerHour * facilityMultiplier * durationHours;
    return {
      type,
      lmdOutput: goldConsumption * PURE_GOLD_LMD_VALUE,
      goldConsumption,
      virtualGoldOutput,
    };
  }

  const lmdOutput = dailyRate * (efficiency / 100) * durationRatio;
  const virtualGoldPercent = Number(
    room?.efficiencySource?.candidate?.publishedEquivalentByProduct?.gold,
  );
  const virtualGoldOutput =
    type === "butshu" && Number.isFinite(virtualGoldPercent)
      ? GOLD_MANUFACTURE_PER_DAY_AT_100_PERCENT *
        (virtualGoldPercent / 100) *
        durationRatio
      : 0;

  return {
    type,
    lmdOutput,
    goldConsumption: Math.max(
      0,
      lmdOutput / PURE_GOLD_LMD_VALUE - virtualGoldOutput,
    ),
    virtualGoldOutput,
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
    meta: getRoomYieldMeta(room),
    durationHours: 0,
    calculatedDurationHours: 0,
    outputPerCycle: 0,
    segments: [],
  };
}

function createYieldSegment({ room, durationHours }) {
  const efficiency = toFinitePercent(room?.efficiency);
  const efficiencyCalculated =
    efficiency !== null &&
    room?.efficiencyMetrics?.actual?.status === "calculated";
  const meta = getRoomYieldMeta(room);
  const dailyRate = getReferenceDailyRate(room, meta);
  const unavailableReason = !efficiencyCalculated
    ? "efficiencyUnavailable"
    : !meta
      ? "unsupportedProduct"
      : dailyRate === null
        ? "unsupportedStationLevel"
        : "";
  const tradingFlow =
    !unavailableReason &&
    meta.resource === "lmd" &&
    String(room?.facility || "").trim() === "trading"
      ? getTradingYieldFlow({
          room,
          durationHours,
          efficiency,
          dailyRate,
        })
      : null;

  return {
    durationHours,
    calculated: !unavailableReason,
    unavailableReason,
    output: unavailableReason
      ? null
      : meta.isNetBonus
        ? dailyRate *
          Math.max(0, (efficiency - 100) / 100) *
          (durationHours / 24)
        : dailyRate * (efficiency / 100) * (durationHours / 24),
    tradingFlow,
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

function buildNetGoldResource(resourcesByKey) {
  const manufacturedGold = getDirectYieldResource(resourcesByKey, "gold");
  const lmd = getDirectYieldResource(resourcesByKey, "lmd");
  const isCalculated = manufacturedGold.isCalculated && lmd.isCalculated;
  const roomCount = manufacturedGold.roomCount + lmd.roomCount;
  const calculatedRoomCount =
    manufacturedGold.calculatedRoomCount + lmd.calculatedRoomCount;

  if (!isCalculated) {
    return {
      ...createEmptyYieldResource("gold"),
      roomCount,
      calculatedRoomCount,
      isCalculated: false,
      outputPerCycle: null,
      outputPerDay: null,
      detail: "赤金制造或龙门币贸易存在未计算房间",
    };
  }

  const manufacturedPerCycle = Number(manufacturedGold.outputPerCycle || 0);
  const manufacturedPerDay = Number(manufacturedGold.outputPerDay || 0);
  const consumedPerCycle =
    Number(lmd.outputPerCycle || 0) / PURE_GOLD_LMD_VALUE;
  const consumedPerDay = Number(lmd.outputPerDay || 0) / PURE_GOLD_LMD_VALUE;

  return {
    ...createEmptyYieldResource("gold"),
    roomCount,
    calculatedRoomCount,
    outputPerCycle: roundYield(manufacturedPerCycle - consumedPerCycle),
    outputPerDay: roundYield(manufacturedPerDay - consumedPerDay),
    detail: `制造 ${roundYield(manufacturedPerDay)}；贸易消耗 ${roundYield(
      consumedPerDay,
    )}`,
    grossOutputPerCycle: roundYield(manufacturedPerCycle),
    grossOutputPerDay: roundYield(manufacturedPerDay),
    tradeConsumptionPerCycle: roundYield(consumedPerCycle),
    tradeConsumptionPerDay: roundYield(consumedPerDay),
  };
}

function buildOrundumNetResource(resourcesByKey) {
  const shards = getDirectYieldResource(resourcesByKey, "originiumShard");
  const tradeCapacity = getDirectYieldResource(
    resourcesByKey,
    "orundumTradeCapacity",
  );
  const hasOrundumChainRoom =
    shards.roomCount > 0 || tradeCapacity.roomCount > 0;
  const isCompleteChain =
    shards.roomCount > 0 && tradeCapacity.roomCount > 0;
  const isCalculated =
    !hasOrundumChainRoom ||
    (isCompleteChain && shards.isCalculated && tradeCapacity.isCalculated);

  if (!isCalculated) {
    return {
      ...createEmptyYieldResource("orundum"),
      roomCount: shards.roomCount + tradeCapacity.roomCount,
      calculatedRoomCount:
        shards.calculatedRoomCount + tradeCapacity.calculatedRoomCount,
      isCalculated: false,
      outputPerCycle: null,
      outputPerDay: null,
      detail: isCompleteChain
        ? "源石碎片或合成玉订单存在未计算班段"
        : "缺少源石碎片制造站或合成玉贸易站",
    };
  }

  const shardOrundumPerCycle = Number(shards.outputPerCycle || 0) * 10;
  const shardOrundumPerDay = Number(shards.outputPerDay || 0) * 10;
  const tradeOrundumPerCycle = Number(tradeCapacity.outputPerCycle || 0);
  const tradeOrundumPerDay = Number(tradeCapacity.outputPerDay || 0);
  const bottleneck =
    shardOrundumPerDay <= tradeOrundumPerDay ? "碎片供给" : "订单产能";

  return {
    ...createEmptyYieldResource("orundum"),
    roomCount: shards.roomCount + tradeCapacity.roomCount,
    calculatedRoomCount:
      shards.calculatedRoomCount + tradeCapacity.calculatedRoomCount,
    outputPerCycle: roundYield(
      Math.min(shardOrundumPerCycle, tradeOrundumPerCycle),
    ),
    outputPerDay: roundYield(Math.min(shardOrundumPerDay, tradeOrundumPerDay)),
    detail: hasOrundumChainRoom
      ? `碎片可换 ${roundYield(shardOrundumPerDay)}，订单产能 ${roundYield(tradeOrundumPerDay)}；${bottleneck}受限`
      : "无搓玉设施",
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

function buildTradingSettlements({ states, cycleHours }) {
  const summariesByKey = new Map();

  for (const state of states) {
    const durationHours = toPositiveHours(state?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    for (const room of state?.rooms || []) {
      if (
        String(room?.facility || "").trim() !== "trading" ||
        String(room?.product || "").trim() !== "lmd"
      ) {
        continue;
      }

      const segment = createYieldSegment({ room, durationHours });
      const key = String(room?.key || "").trim();
      if (!key) {
        continue;
      }

      const summary = summariesByKey.get(key) || {
        key,
        label: String(room?.label || key).trim(),
        durationHours: 0,
        calculatedDurationHours: 0,
        lmdOutputPerCycle: 0,
        goldConsumptionPerCycle: 0,
        virtualGoldOutputPerCycle: 0,
        types: new Set(),
        segments: [],
      };
      summary.durationHours += durationHours;

      if (segment.calculated && segment.tradingFlow) {
        summary.calculatedDurationHours += durationHours;
        summary.lmdOutputPerCycle += segment.tradingFlow.lmdOutput;
        summary.goldConsumptionPerCycle +=
          segment.tradingFlow.goldConsumption;
        summary.virtualGoldOutputPerCycle +=
          segment.tradingFlow.virtualGoldOutput;
        summary.types.add(segment.tradingFlow.type);
      }

      summary.segments.push({
        durationHours,
        calculated: segment.calculated && Boolean(segment.tradingFlow),
        unavailableReason: segment.unavailableReason,
        type: segment.tradingFlow?.type || "",
        typeLabel: getTradingSettlementTypeLabel(segment.tradingFlow?.type),
        lmdOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.lmdOutput)
          : null,
        goldConsumption: segment.tradingFlow
          ? roundYield(segment.tradingFlow.goldConsumption)
          : null,
        virtualGoldOutput: segment.tradingFlow
          ? roundYield(segment.tradingFlow.virtualGoldOutput)
          : null,
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
      goldConsumptionPerCycle: calculated
        ? roundYield(summary.goldConsumptionPerCycle)
        : null,
      goldConsumptionPerDay: calculated
        ? roundYield(summary.goldConsumptionPerCycle * perDayMultiplier)
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

  for (const state of states) {
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

function createDroneTargetBenefitSegment({
  room,
  durationHours,
  droneOutput,
}) {
  const meta = getRoomYieldMeta(room);
  const efficiency = toFinitePercent(room?.efficiency);
  const efficiencyCalculated =
    efficiency !== null &&
    room?.efficiencyMetrics?.actual?.status === "calculated";
  const dailyRate = getReferenceDailyRate(room, meta);
  const acceleratedHours =
    Number.isFinite(Number(droneOutput)) && Number(droneOutput) >= 0
      ? Number(droneOutput) * DRONE_ACCELERATION_HOURS
      : null;
  const unavailableReason =
    acceleratedHours === null
      ? "droneUnavailable"
      : !efficiencyCalculated
        ? "efficiencyUnavailable"
        : !meta
          ? "unsupportedProduct"
          : dailyRate === null
            ? "unsupportedStationLevel"
            : "";

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
    };
  }

  const tradingFlow =
    meta.resource === "lmd" &&
    String(room?.facility || "").trim() === "trading"
      ? getTradingYieldFlow({
          room,
          durationHours: acceleratedHours,
          efficiency,
          dailyRate,
        })
      : null;
  const output = tradingFlow
    ? tradingFlow.lmdOutput
    : meta.isNetBonus
      ? dailyRate * Math.max(0, (efficiency - 100) / 100) *
        (acceleratedHours / 24)
      : dailyRate * (efficiency / 100) * (acceleratedHours / 24);

  return {
    calculated: true,
    unavailableReason: "",
    acceleratedHours,
    resource: meta.resource,
    resourceLabel: meta.label,
    unit: meta.unit,
    output,
    tradingFlow,
  };
}

function buildDroneTargetSettlement({
  states,
  cycleHours,
  droneCharge,
  droneTargetKey,
}) {
  const targetKey = String(droneTargetKey || "").trim();
  if (!targetKey) {
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
  let label = "";
  let resource = "";
  let resourceLabel = "";
  let unit = "";
  let droneSegmentIndex = 0;

  for (const state of states) {
    const segmentDurationHours = toPositiveHours(state?.durationHours);
    if (segmentDurationHours <= 0) {
      continue;
    }

    durationHours += segmentDurationHours;
    const room = (state?.rooms || []).find(
      (item) => String(item?.key || "").trim() === targetKey,
    );
    const droneOutput = droneCharge?.segments?.[droneSegmentIndex]?.droneOutput;
    droneSegmentIndex += 1;
    const benefit = room
      ? createDroneTargetBenefitSegment({
          room,
          durationHours: segmentDurationHours,
          droneOutput,
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
        };

    label ||= String(room?.label || targetKey).trim();
    resource ||= benefit.resource;
    resourceLabel ||= benefit.resourceLabel;
    unit ||= benefit.unit;
    if (benefit.calculated) {
      calculatedDurationHours += segmentDurationHours;
      outputPerCycle += benefit.output;
      goldConsumptionPerCycle += Number(
        benefit.tradingFlow?.goldConsumption || 0,
      );
      virtualGoldOutputPerCycle += Number(
        benefit.tradingFlow?.virtualGoldOutput || 0,
      );
    }
    segments.push({
      durationHours: segmentDurationHours,
      droneOutput:
        droneOutput === null || droneOutput === undefined
          ? null
          : roundYield(droneOutput),
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
    key: targetKey,
    label,
    resource,
    resourceLabel,
    unit,
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

function buildYieldSummary({ states, cycleHours, droneTargetKey }) {
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
      const segment = createYieldSegment({ room, durationHours });
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
  const droneTargetSettlements = getDroneTargetKeys(states).map(
    (targetKey) =>
      buildDroneTargetSettlement({
        states,
        cycleHours,
        droneCharge,
        droneTargetKey: targetKey,
      }),
  );
  const resources = DISPLAY_RESOURCE_ORDER.map((resource) =>
    resource === "gold"
      ? buildNetGoldResource(directResourcesByKey)
      : resource === "orundum"
        ? buildOrundumNetResource(directResourcesByKey)
        : getDirectYieldResource(directResourcesByKey, resource),
  );

  return {
    cycleHours,
    roomCount: rooms.length,
    calculatedRoomCount: rooms.filter((room) => room.isCalculated).length,
    resources,
    rooms,
    tradingSettlements: buildTradingSettlements({ states, cycleHours }),
    droneCharge,
    droneTargetSettlements,
    droneTargetSettlement: buildDroneTargetSettlement({
      states,
      cycleHours,
      droneCharge,
      droneTargetKey,
    }),
    assumptions: [
      "level2AndLevel3ProductionRoomReferences",
      "l79EfficiencyAndShiftDuration",
      "orundumSustainedByShardSupplyAndTradeCapacity",
      "officeNetRefreshAboveBaseContactSpeed",
      "goldNetAfterLmdTradeConsumption",
      "lmdGrossNoCollectionOrDrones",
      "tradingSpecialOrderResourceStreams",
      "droneChargeFromFinalPowerRoster",
      "droneTargetBenefitFromFinalRoomOutput",
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
    }),
  };
}
