import {
  BATTLE_RECORD_EXPERIENCE,
  calculateEfficiency,
  createEfficiencyCatalog,
  facilityId,
} from "/src/vendor/riic-efficiency/dist/index.js";

export { buildEfficiencyNotices } from "/src/vendor/riic-efficiency/dist/index.js";

const operatorModules = import.meta.glob(
  "/src/vendor/riic-efficiency/data/operators/*.json",
  { eager: true, import: "default" },
);
const rulesetModules = import.meta.glob(
  "/src/vendor/riic-efficiency/data/ruleset.json",
  { eager: true, import: "default" },
);
const termsModules = import.meta.glob(
  "/src/vendor/riic-efficiency/data/terms.json",
  { eager: true, import: "default" },
);

const ruleset = Object.values(rulesetModules)[0];
const termsData = Object.values(termsModules)[0];
if (!ruleset || !termsData) {
  throw new Error("riic-efficiency 规则或术语数据未加载");
}

const catalog = {
  ...createEfficiencyCatalog(
    Object.values(operatorModules),
    termsData.terms,
  ),
  ruleset,
};

const ROOM_TYPE_ALIASES = Object.freeze({ office: "hire" });
const PRODUCT_ALIASES = Object.freeze({
  LMD: "龙门币",
  Orundum: "合成玉",
  "Pure Gold": "赤金",
  "Battle Record": "中级作战记录",
  "Originium Shard": "源石碎片",
});
const PRODUCT_RESOURCE_KEYS = Object.freeze({
  龙门币: "lmd",
  中级作战记录: "exp",
  赤金: "gold",
  合成玉: "orundum",
  源石碎片: "originiumShard",
});
const RESOURCE_LABELS = Object.freeze({
  lmd: ["龙门币", "龙门币/天"],
  exp: ["作战记录", "本/天"],
  gold: ["赤金", "根/天"],
  orundum: ["合成玉", "合成玉/天"],
  originiumShard: ["源石碎片", "片/天"],
  recruitmentRefresh: ["公开招募刷新", "次/天"],
});

export const DEFAULT_RIIC_EFFICIENCY_SETTINGS = Object.freeze({
  clueExchanging: true,
  dormFullTreat: true,
  preferMaxJieEfficiency: true,
  overflowMode: "continue",
  droneOverflowMode: "zero",
  firstItemProgress: 0,
});

export function normalizeRiicEfficiencySettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const firstItemProgress = Number(source.firstItemProgress);

  return {
    clueExchanging: source.clueExchanging !== false,
    dormFullTreat: source.dormFullTreat !== false,
    preferMaxJieEfficiency: source.preferMaxJieEfficiency !== false,
    overflowMode: source.overflowMode === "zero" ? "zero" : "continue",
    droneOverflowMode:
      source.droneOverflowMode === "continue" ? "continue" : "zero",
    firstItemProgress: Number.isFinite(firstItemProgress)
      ? Math.max(0, Math.min(1, firstItemProgress))
      : DEFAULT_RIIC_EFFICIENCY_SETTINGS.firstItemProgress,
  };
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeRoomType(value) {
  const type = String(value || "").trim();
  return ROOM_TYPE_ALIASES[type] || type;
}

function normalizeProduct(product) {
  const value = String(product || "").trim();
  return PRODUCT_ALIASES[value] || value;
}

function createOperatorStateByName(operatorProfiles, operatorTable) {
  const states = new Map();
  for (const profile of operatorProfiles || []) {
    const charId = String(profile?.charId || "").trim();
    const name = String(operatorTable?.[charId]?.name || "").trim();
    if (!name) {
      continue;
    }
    states.set(name, {
      ...(profile?.elite !== null &&
      profile?.elite !== undefined &&
      Number.isInteger(Number(profile.elite)) &&
      Number(profile.elite) >= 0
        ? { elite: Number(profile.elite) }
        : {}),
      ...(profile?.level !== null &&
      profile?.level !== undefined &&
      Number.isInteger(Number(profile.level)) &&
      Number(profile.level) >= 1
        ? { level: Number(profile.level) }
        : {}),
    });
  }
  return states;
}

function cloneRoomAssignment(
  room,
  roomType,
  operatorStates,
  craftMaterial,
  initializeMood,
) {
  if (!room || typeof room !== "object") {
    return room;
  }
  const type = normalizeRoomType(roomType);
  const operators = Array.isArray(room.operators)
    ? room.operators.filter(Boolean)
    : [];
  const states = Object.fromEntries(
    operators.map((name) => [
      name,
      {
        ...(initializeMood ? { mood: 24 } : {}),
        ...(operatorStates.get(name) || {}),
      },
    ]),
  );
  const product = normalizeProduct(room.product);
  return {
    ...room,
    ...(product ? { product } : {}),
    ...(type === "manufacture" && product === "源石碎片"
      ? { sourceMaterial: craftMaterial }
      : {}),
    ...(operators.length ? { operators } : {}),
    operatorStates: states,
  };
}

function createLayout(rooms) {
  return Object.entries(rooms || {}).flatMap(([rawType, assignments]) => {
    const type = normalizeRoomType(rawType);
    if (!Array.isArray(assignments)) {
      return [];
    }
    return assignments.map((room) => ({
      type,
      level: Math.max(1, Math.floor(toFiniteNumber(room?.level) ?? 1)),
    }));
  });
}

export function buildRiicEfficiencySchedule(
  sourceSchedule,
  {
    operatorProfiles = [],
    operatorTable = {},
    orundumCraftMaterial = "orirock",
    efficiencySettings = DEFAULT_RIIC_EFFICIENCY_SETTINGS,
  } = {},
) {
  const sourcePlans = Array.isArray(sourceSchedule?.plans)
    ? sourceSchedule.plans
    : [];
  const operatorStates = createOperatorStateByName(
    operatorProfiles,
    operatorTable,
  );
  const craftMaterial = orundumCraftMaterial === "device" ? "装置" : "固源岩";
  const plans = sourcePlans.map((sourcePlan, planIndex) => {
    const rooms = Object.fromEntries(
      Object.entries(sourcePlan?.rooms || {}).map(([roomType, assignments]) => [
        normalizeRoomType(roomType),
        Array.isArray(assignments)
          ? assignments.map((room) =>
              cloneRoomAssignment(
                room,
                roomType,
                operatorStates,
                craftMaterial,
                planIndex === 0,
              ),
            )
          : assignments,
      ]),
    );
    const drones = sourcePlan?.drones
      ? {
          ...sourcePlan.drones,
          index: Math.max(0, Number(sourcePlan.drones.index || 1) - 1),
        }
      : undefined;
    const fiammettaTarget = sourcePlan?.Fiammetta?.enable
      ? String(sourcePlan.Fiammetta.target || "").trim()
      : "";
    return {
      ...sourcePlan,
      rooms,
      ...(drones ? { drones } : {}),
      ...(fiammettaTarget ? { fiammettaTarget } : {}),
      Fiammetta: undefined,
    };
  });
  const layout = createLayout(plans[0]?.rooms);
  if (plans.length === 0 || layout.length === 0) {
    throw new Error("排班缺少可供 riic-efficiency 计算的班次或基建布局");
  }

  const roomIndexes = new Map();
  const tradeOrderCount = Object.fromEntries(
    layout.flatMap((entry) => {
      const index = roomIndexes.get(entry.type) || 0;
      roomIndexes.set(entry.type, index + 1);
      return entry.type === "trading"
        ? [[facilityId(entry.type, index), 0]]
        : [];
    }),
  );
  const fiammettaQueue = plans.map((plan) =>
    plan.fiammettaTarget ? { operators: [plan.fiammettaTarget] } : {},
  );
  const normalizedPlans = plans.map(({ fiammettaTarget, ...plan }) => plan);

  return {
    ...sourceSchedule,
    layout,
    plans: normalizedPlans,
    fiammetta: { queue: fiammettaQueue },
    settings: {
      ...normalizeRiicEfficiencySettings(efficiencySettings),
      fiammettaMode: "queue",
      tradeOrderCount,
    },
  };
}

export function calculateRiicEfficiency(schedule) {
  return calculateEfficiency(schedule, { catalog, ruleset });
}

export function createRiicEfficiencyDroneScenario(
  schedule,
  planIndex,
  roomKey,
  order,
) {
  const [room, rawIndex] = String(roomKey || "").split(":");
  const index = Number(rawIndex);
  if (
    !["trading", "manufacture"].includes(room) ||
    !Number.isInteger(index) ||
    index < 0 ||
    !schedule?.plans?.[planIndex]
  ) {
    return null;
  }
  return {
    ...schedule,
    plans: schedule.plans.map((plan, currentIndex) => ({
      ...plan,
      ...(currentIndex === planIndex
        ? { drones: { enable: true, room, index, rule: "all", order } }
        : {}),
    })),
  };
}

function facilityById(plan, key) {
  return (plan?.facilities || []).find(
    (facility) => facility?.facility?.id === key,
  );
}

function resourceAmount(result, product, kind = "production") {
  const output = (result?.dailyOutputs || []).find(
    (item) => item.product === product && item.kind === kind,
  );
  if (output) {
    return toFiniteNumber(output.amountPerDay);
  }
  const production = (result?.dailyProductions || []).find(
    (item) => item.product === product,
  );
  const amountPerDay = toFiniteNumber(
    production?.effectiveAmountPerDay ?? production?.amountPerDay,
  );
  if (amountPerDay === null) {
    return null;
  }
  if (kind !== "net") {
    return amountPerDay;
  }

  const materialPerHour =
    production?.effectiveMaterialPerHour || production?.materialPerHour || {};
  return amountPerDay + (toFiniteNumber(materialPerHour[product]) || 0) * 24;
}

function roomProductKey(room) {
  const product = normalizeProduct(room?.product);
  if (room?.facility === "trading" && product === "合成玉") {
    return "orundum";
  }
  return PRODUCT_RESOURCE_KEYS[product] || "";
}

function createResourceRows(result, schedule, { dailyOverview = false } = {}) {
  const outputProducts = {
    lmd: ["龙门币", dailyOverview ? "net" : "production"],
    exp: ["中级作战记录", "production"],
    gold: ["赤金", "net"],
    orundum: ["合成玉", "production"],
    originiumShard: ["源石碎片", "net"],
    recruitmentRefresh: ["公开招募标签刷新次数", "production"],
  };
  const roomCounts = new Map();
  const roomIndexes = new Map();
  for (const entry of schedule.layout || []) {
    const index = roomIndexes.get(entry.type) || 0;
    roomIndexes.set(entry.type, index + 1);
    const facility = facilityById(
      result.plans?.[0],
      facilityId(entry.type, index),
    );
    if (entry.type === "hire" && facility?.production) {
      roomCounts.set(
        "recruitmentRefresh",
        (roomCounts.get("recruitmentRefresh") || 0) + 1,
      );
    }
    const resource = roomProductKey({
      facility: entry.type,
      product: facility?.production?.product,
    });
    if (resource) {
      roomCounts.set(resource, (roomCounts.get(resource) || 0) + 1);
    }
  }

  return Object.entries(outputProducts).flatMap(
    ([resource, [product, kind]]) => {
      const roomCount = roomCounts.get(resource) || 0;
      const calculatedOutputPerDay = resourceAmount(result, product, kind);
      const outputPerDay =
        calculatedOutputPerDay === null
          ? null
          : dailyOverview && resource === "exp"
            ? calculatedOutputPerDay * BATTLE_RECORD_EXPERIENCE
            : calculatedOutputPerDay;
      const canShowWithoutRoom =
        resource === "gold" || (dailyOverview && resource === "lmd");
      if (roomCount === 0 && !(canShowWithoutRoom && outputPerDay !== null)) {
        return [];
      }
      return [
        {
          resource,
          label: RESOURCE_LABELS[resource][0],
          unit: RESOURCE_LABELS[resource][1],
          outputPerDay,
          isCalculated: outputPerDay !== null,
          roomCount,
          calculatedRoomCount: roomCount,
        },
      ];
    },
  );
}

function createRoomRows(result, preview, roomIndexAssignments) {
  const firstStateRooms = preview?.states?.[0]?.rooms || [];
  return firstStateRooms
    .filter((room) => ["trading", "manufacture"].includes(room?.facility))
    .map((room) => {
      const assignedIndex = Number(roomIndexAssignments?.[room.key]);
      const sourceIndex = Number(room.stationIndex);
      const stationIndex =
        Number.isInteger(assignedIndex) && assignedIndex >= 1
          ? assignedIndex - 1
          : sourceIndex;
      const key = `${room.facility}:${stationIndex}`;
      const packageFacilityId = facilityId(room.facility, stationIndex);
      return {
        key,
        facility: room.facility,
        product: String(room.product || ""),
        label: String(room.label || room.key || ""),
        stationIndex,
        segments: result.plans.map((plan, stateIndex) => {
          const facility = facilityById(plan, packageFacilityId);
          return {
            stateIndex,
            calculated: Boolean(facility?.production),
            rate:
              facility?.production?.effectiveAmountPerHour ??
              facility?.production?.amountPerHour ??
              null,
          };
        }),
      };
    })
    .sort((left, right) => {
      const facilityOrder = { trading: 0, manufacture: 1 };
      return (
        facilityOrder[left.facility] - facilityOrder[right.facility] ||
        left.stationIndex - right.stationIndex
      );
    });
}

function createResourceEffect(droneDetail) {
  if (!droneDetail) {
    return { isCalculated: false };
  }
  const material = droneDetail.extraMaterial || {};
  const experienceScale =
    droneDetail.product === "中级作战记录" ? BATTLE_RECORD_EXPERIENCE : 1;
  return {
    isCalculated: true,
    primaryOutput: droneDetail.extraAmount * experienceScale,
    netGold: material["赤金"] ?? null,
    shardConsumption: material["源石碎片"]
      ? Math.max(0, -material["源石碎片"])
      : null,
    lmdConsumption: material["龙门币"]
      ? Math.max(0, -material["龙门币"])
      : null,
    droneAmount: droneDetail?.droneAmount ?? 0,
    sourcePlanIndex: droneDetail?.sourcePlanIndex ?? null,
  };
}

export function createRiicEfficiencyYield(
  result,
  preview,
  droneScenarioResults = {},
  roomIndexAssignments = {},
) {
  const rooms = createRoomRows(result, preview, roomIndexAssignments);
  const droneTargetSettlements = rooms.map((room) => {
    const facilityKey = `${room.facility}:${room.stationIndex}`;
    const packageFacilityId = facilityId(room.facility, room.stationIndex);
    const effects = room.segments.map((_, stateIndex) => {
      const scenario = droneScenarioResults[`${stateIndex}:${facilityKey}`] || result;
      const droneDetail = scenario.maaDroneAcceleration?.details?.find(
        (detail) =>
          detail.planIndex === stateIndex &&
          detail.facilityId === packageFacilityId,
      );
      return createResourceEffect(droneDetail);
    });
    return {
      key: room.key,
      segments: effects.map(({ isCalculated, droneAmount }) => ({
        calculated: isCalculated,
        droneAmount,
      })),
      resourceEffectsBySegment: effects,
    };
  });
  const droneDetailsByState = new Map();
  for (const [key, scenario] of Object.entries(droneScenarioResults)) {
    const stateIndex = Number(key.slice(0, key.indexOf(":")));
    const detail = scenario?.maaDroneAcceleration?.details?.find(
      (item) => item.planIndex === stateIndex,
    );
    if (Number.isInteger(stateIndex) && detail) {
      droneDetailsByState.set(stateIndex, detail);
    }
  }
  for (const detail of result.maaDroneAcceleration?.details || []) {
    if (!droneDetailsByState.has(detail.planIndex)) {
      droneDetailsByState.set(detail.planIndex, detail);
    }
  }
  const droneUsageSegments = result.plans.map((_, stateIndex) => {
    const detail = droneDetailsByState.get(stateIndex);
    return {
      stateIndex,
      availableDroneAmount: detail?.droneAmount ?? null,
      capacityReached: detail?.overflowed === true,
    };
  });
  const dailyProduction = (product) =>
    (result.dailyProductions || []).find((item) => item.product === product);
  const orundumProduction = dailyProduction("合成玉");
  const shardProduction = dailyProduction("源石碎片");
  const craftMaterial = String(
    result.document?.plans?.[0]?.rooms?.manufacture?.find(
      (room) => room?.product === "源石碎片",
    )?.sourceMaterial || "",
  );
  const craftMaterialConsumptionPerDay = craftMaterial
    ? Math.max(
        0,
        -Number(
          (shardProduction?.effectiveMaterialPerHour ||
            shardProduction?.materialPerHour)?.[craftMaterial] || 0,
        ) * 24,
      )
    : 0;
  const lmdConsumptionPerDay = Math.max(
    0,
    -(
      Number(
        (orundumProduction?.effectiveMaterialPerHour ||
          orundumProduction?.materialPerHour)?.["龙门币"] || 0,
      ) +
      Number(
        (shardProduction?.effectiveMaterialPerHour ||
          shardProduction?.materialPerHour)?.["龙门币"] || 0,
      )
    ) * 24,
  );
  const shardConsumptionPerDay = Math.max(
    0,
    -Number(
      (orundumProduction?.effectiveMaterialPerHour ||
        orundumProduction?.materialPerHour)?.["源石碎片"] || 0,
    ) * 24,
  );
  return {
    cycleHours: result.dailyHours,
    resources: createResourceRows(result, result.document),
    overviewResources: createResourceRows(result, result.document, {
      dailyOverview: true,
    }),
    roomCount: rooms.length,
    calculatedRoomCount: rooms.filter((room) =>
      room.segments.some((segment) => segment.calculated),
    ).length,
    rooms,
    droneTargetSettlements,
    droneUsage: { segments: droneUsageSegments },
    tradingSettlements: rooms
      .filter((room) => room.facility === "trading")
      .map((room) => ({
        key: room.key,
        segments: room.segments.map((segment, stateIndex) => ({
          stateIndex,
          calculated: segment.calculated,
          rate: segment.rate,
        })),
      })),
    resourceFlows: {
      orundum: {
        isCalculated: Boolean(orundumProduction || shardProduction),
        craftMaterial,
        craftMaterialLabel: craftMaterial,
        craftMaterialConsumptionPerDay,
        lmdConsumptionPerDay,
        shardConsumptionPerDay,
      },
    },
    assumptions: [],
  };
}

export function createRiicEfficiencySettlement(result) {
  return {
    cycleHours: result.dailyHours,
    calculationStatus: "calculated",
    warnings: [
      ...(result.warnings || []),
      ...(result.fiammettaWarnings || []),
      ...(result.maaDroneAcceleration?.warnings || []),
    ],
    states: (result.plans || []).map((plan) => ({
      rooms: (plan.facilities || []).map((facility) => ({
        key: `${facility.facility.type}:${facility.facility.index}`,
        efficiency: facility.efficiency,
        efficiencyMetrics: {
          actual: {
            status: "calculated",
            breakdown: {
              baseEfficiency: facility.baseEfficiency,
              moodEfficiency: facility.moodEfficiency,
              operatorEfficiency: facility.operatorEfficiency,
              skillEfficiency: facility.skillEfficiency,
              details: facility.details,
            },
          },
        },
        l79Settlement: facility,
        issues: [],
      })),
    })),
  };
}

export function createRiicEfficiencyMetrics(result, yieldSummary) {
  const facilitiesByType = new Map();
  for (const facility of result.dailyFacilities || []) {
    const type = facility.facility.type;
    const current = facilitiesByType.get(type) || {
      facility: type,
      averageEfficiency: 0,
      calculatedRoomCount: 0,
      roomCount: 0,
      total: 0,
    };
    current.roomCount += 1;
    if (Number.isFinite(facility.efficiency)) {
      current.total += facility.efficiency;
      current.calculatedRoomCount += 1;
    }
    facilitiesByType.set(type, current);
  }
  const facilities = [...facilitiesByType.values()].map((item) => ({
    ...item,
    averageEfficiency: item.calculatedRoomCount
      ? item.total / item.calculatedRoomCount
      : null,
  }));
  return {
    cycleHours: result.dailyHours,
    roomCount: (result.dailyFacilities || []).length,
    calculatedRoomCount: (result.dailyFacilities || []).filter((facility) =>
      Number.isFinite(facility.efficiency),
    ).length,
    facilities,
    rooms: [],
    yield: yieldSummary,
    packageResult: result,
  };
}
