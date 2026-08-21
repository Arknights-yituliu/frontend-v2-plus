import { operatorTableV2 } from "../gameData.js";
import { parseRiicMaaOperatorBox } from "../riicMaaOperatorData.js";
import {
  getRiicFacilityProfile,
  getRiicRoomStations,
} from "./l10-facility-model.js";
import {
  settleRiicMaaScheduleEfficiency,
} from "./l79-preview-efficiency-settlement.js";
import { summarizeRiicActualSchedule } from "./l80-actual-settlement.js";
import { normalizeMaaRiicSchedule } from "../riicYield/maaScheduleNormalizer.js";

const LOCAL_OPERATOR_SOURCES_KEY = "riic_operator_sources_v2";
const LOCAL_OPERATOR_SOURCE_KEY = "riic_operator_source_v1";
const LOCAL_SKLAND_SNAPSHOT_KEY = "riic_skland_operator_snapshot_v1";
const LOCAL_MAA_SNAPSHOT_KEY = "riic_maa_operator_data_v1";
const DEFAULT_CYCLE_MINUTES = 24 * 60;

const LAYOUT_CARD_KEYS = Object.freeze([
  "153",
  "243",
  "243-orundum",
  "252-2-gold",
  "252-3-gold",
  "333",
  "333-orundum",
  "342",
  "342-orundum",
]);

const LAYOUT_LABELS = Object.freeze({
  153: "153",
  243: "243",
  "243-orundum": "243 搓玉",
  "252-2-gold": "252（2赤金）",
  "252-3-gold": "252（3赤金）",
  333: "333",
  "333-orundum": "333 搓玉",
  342: "342",
  "342-orundum": "342 搓玉",
});

function getMaaYieldSettlementProduct(room) {
  const product = toText(room?.product);
  if (room?.facility !== "manufacture") {
    return product;
  }

  return (
    {
      exp: "experience",
      originiumShard: "orundum",
    }[product] || product
  );
}

function toText(value) {
  return String(value ?? "").trim();
}

function toInteger(value, fallback = null) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function getPositiveDurationMinutes(value) {
  const duration = toInteger(value);
  return duration !== null && duration > 0 ? duration : null;
}

export function getRiicMaaYieldPlanDurations(maaSchedule) {
  const plans = Array.isArray(maaSchedule?.plans) ? maaSchedule.plans : [];
  if (plans.length === 0) {
    return [];
  }

  const defaultDuration = Math.floor(DEFAULT_CYCLE_MINUTES / plans.length);
  const remainingMinutes =
    DEFAULT_CYCLE_MINUTES - defaultDuration * plans.length;

  return plans.map((plan, index) => {
    const sourceDuration = getPositiveDurationMinutes(plan?.duration);
    return sourceDuration || defaultDuration + (index < remainingMinutes ? 1 : 0);
  });
}

function applyRiicMaaYieldPlanDurations(
  maaSchedule,
  planDurations = [],
) {
  const plans = Array.isArray(maaSchedule?.plans) ? maaSchedule.plans : [];
  const defaultDurations = getRiicMaaYieldPlanDurations(maaSchedule);

  return {
    ...maaSchedule,
    plans: plans.map((plan, index) => ({
      ...plan,
      duration:
        getPositiveDurationMinutes(planDurations[index]) ||
        defaultDurations[index] ||
        1,
    })),
  };
}

function normalizeRoster(list) {
  const byId = new Map();

  for (const source of list || []) {
    const charId = toText(source?.charId);
    const name = toText(source?.name) || toText(operatorTableV2?.[charId]?.name);
    if (!charId || !name) {
      continue;
    }

    const operator = {
      charId,
      name,
      elite: Math.max(0, toInteger(source?.elite, 0)),
      level: Math.max(0, toInteger(source?.level, 0)),
      rarity: toInteger(source?.rarity, operatorTableV2?.[charId]?.rarity || 1),
    };
    const current = byId.get(charId);
    if (
      !current ||
      operator.elite > current.elite ||
      (operator.elite === current.elite && operator.level > current.level)
    ) {
      byId.set(charId, operator);
    }
  }

  return [...byId.values()];
}

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readRiicMaaYieldTestLocalOperators() {
  if (typeof localStorage === "undefined") {
    return [];
  }

  const activeSource = toText(
    readJsonStorage(LOCAL_OPERATOR_SOURCE_KEY) ||
      localStorage.getItem(LOCAL_OPERATOR_SOURCE_KEY),
  );
  const storedSources = readJsonStorage(LOCAL_OPERATOR_SOURCES_KEY);
  const sourceList = Array.isArray(storedSources?.sources)
    ? storedSources.sources
    : [];
  const prioritizedSources = [
    sourceList.find((source) => source?.id === activeSource),
    ...sourceList,
    readJsonStorage(LOCAL_SKLAND_SNAPSHOT_KEY),
    readJsonStorage(LOCAL_MAA_SNAPSHOT_KEY),
  ].filter(Boolean);

  return normalizeRoster(
    prioritizedSources.flatMap((source) =>
      Array.isArray(source?.operators) ? source.operators : [],
    ),
  );
}

export function parseRiicMaaYieldTestOperatorFile(payload) {
  return parseRiicMaaOperatorBox(payload, operatorTableV2);
}

function getStaticOperatorByName(name) {
  const target = toText(name);
  return Object.entries(operatorTableV2 || {}).find(
    ([, operator]) => toText(operator?.name) === target,
  )?.[0] || "";
}

function getLayoutId(cardKey) {
  return String(cardKey || "").startsWith("252") ? "252" : cardKey;
}

function getFacilityProfile(cardKey) {
  const layoutId = getLayoutId(cardKey);
  return getRiicFacilityProfile({
    layoutId,
    cardKey,
    facilityRequirement: layoutId === "252" ? "rightFull" : null,
  });
}

function getProfileRoomKey(room) {
  const facility = toText(room?.facility);
  const product = getMaaYieldSettlementProduct(room);
  if (facility === "trading") {
    return product === "orundum" ? "orundum-trading" : "lmd-trading";
  }
  if (facility === "manufacture") {
    if (product === "orundum") {
      return "orundum-manufacture";
    }
    return product === "gold" ? "gold-manufacture" : "experience-manufacture";
  }
  return facility;
}

function inferLayoutCardKey(schedule) {
  const rooms = schedule?.plans?.[0]?.rooms || [];
  const count = (facility) =>
    rooms.filter((room) => room?.facility === facility).length;
  const hasProduct = (product) =>
    rooms.some((room) => room?.product === product);
  const tradingCount = count("trading");
  const manufactureCount = count("manufacture");
  const powerCount = count("power");

  if (tradingCount === 1 && manufactureCount === 5 && powerCount === 3) {
    return "153";
  }
  if (tradingCount === 2 && manufactureCount === 4 && powerCount === 3) {
    return hasProduct("orundum") ? "243-orundum" : "243";
  }
  if (tradingCount === 2 && manufactureCount === 5 && powerCount === 2) {
    return rooms.filter((room) => room?.product === "gold").length >= 3
      ? "252-3-gold"
      : "252-2-gold";
  }
  if (tradingCount === 3 && manufactureCount === 3 && powerCount === 3) {
    return hasProduct("orundum") ? "333-orundum" : "333";
  }
  if (tradingCount === 3 && manufactureCount === 4 && powerCount === 2) {
    return hasProduct("orundum") ? "342-orundum" : "342";
  }
  return "243";
}

function getRoomStationConfig(plan, room, facilityProfile) {
  const profileRoomKey = getProfileRoomKey(room);
  const roomCount = (plan?.rooms || []).filter(
    (candidate) => getProfileRoomKey(candidate) === profileRoomKey,
  ).length;
  const stations = getRiicRoomStations({
    facilityProfile,
    roomKey: profileRoomKey,
    roomCount,
  });
  const station = stations[Number(room?.index) || 0] || null;
  const facility = toText(room?.facility);
  const defaultLevel = facility === "dormitory" ? 5 : facility === "control" ? 5 : 3;
  const defaultSlots =
    facility === "power" || facility === "hire" || facility === "office"
      ? 1
      : facility === "meeting" || facility === "training"
        ? 2
        : facility === "dormitory"
          ? 5
          : defaultLevel;

  return {
    stationLevel: station?.stationLevel || defaultLevel,
    expectedSlots: station?.slotCount || defaultSlots,
  };
}

function createRosterResolver({
  schedule,
  localOperators,
  uploadedOperators,
  forceAllSkills,
}) {
  const sourceOperators = normalizeRoster(
    uploadedOperators?.length ? uploadedOperators : localOperators,
  );
  const byName = new Map(sourceOperators.map((operator) => [operator.name, operator]));
  const scheduleNames = [
    ...new Set(
      (schedule?.plans || []).flatMap((plan) =>
        (plan?.rooms || []).flatMap((room) => room?.operators || []),
      ),
    ),
  ];
  const unmatchedNames = scheduleNames.filter((name) => !byName.has(name));
  const fullMatch =
    unmatchedNames.length === 0 &&
    scheduleNames.every((name) => Boolean(byName.get(name)?.charId));
  const allSkillsUnlocked = forceAllSkills || !fullMatch;
  const unresolvedNames = [];
  const effectiveByName = new Map();

  for (const name of scheduleNames) {
    const local = byName.get(name);
    const charId = local?.charId || getStaticOperatorByName(name);
    if (!charId) {
      unresolvedNames.push(name);
      continue;
    }

    effectiveByName.set(
      name,
      allSkillsUnlocked
        ? {
            charId,
            name,
            elite: 2,
            level: 90,
            rarity: local?.rarity || operatorTableV2?.[charId]?.rarity || 1,
          }
        : local,
    );
  }

  return {
    scheduleNames,
    effectiveByName,
    allSkillsUnlocked,
    fullMatch,
    unmatchedNames,
    unresolvedNames,
    operators: normalizeRoster([...effectiveByName.values()]),
  };
}

function createL79Schedule({ schedule, facilityProfile } = {}) {
  return {
    plans: (schedule?.plans || []).map((plan) => {
      const rooms = {};

      for (const room of plan?.rooms || []) {
        const facility = toText(room?.facility);
        const index = Math.max(0, Number(room?.index || 0));
        if (!facility) {
          continue;
        }

        const entries = rooms[facility] || [];
        while (entries.length <= index) {
          entries.push({ operators: [] });
        }
        const { stationLevel } = getRoomStationConfig(
          plan,
          room,
          facilityProfile,
        );
        entries[index] = {
          level: stationLevel,
          product: toText(room?.sourceProduct),
          operators: Array.isArray(room?.operators) ? room.operators : [],
        };
        rooms[facility] = entries;
      }

      return {
        name: toText(plan?.name),
        duration: Number(plan?.durationMinutes || 0),
        rooms,
      };
    }),
  };
}

function getDroneTargetKey(plan, normalizedPlan) {
  const drone = plan?.drones;
  if (!drone?.enable || !drone?.room) {
    return "";
  }

  const facility = drone.room === "office" ? "hire" : toText(drone.room);
  const index = Math.max(0, Number(drone.index || 1) - 1);
  const room = (normalizedPlan?.rooms || [])
    .filter((candidate) => candidate?.facility === facility)[index];
  return room ? `${room.facility}:${room.index}` : "";
}

function createMaaYieldCalculationTrace({ preview, summary } = {}) {
  const states = Array.isArray(preview?.states) ? preview.states : [];
  const yieldRooms = summary?.yield?.rooms || [];

  const rooms = yieldRooms.map((room) => ({
    ...room,
    segments: (room.segments || []).map((segment, index) => {
      const state = states[index];
      const sourceRoom = state?.rooms?.find(
        (candidate) => candidate.key === room.key,
      );
      return {
        ...segment,
        stateIndex: state?.index ?? index,
        startHour: state?.startHour ?? null,
        facility: sourceRoom?.facility || room.facility,
        product: sourceRoom?.product || room.product,
        sourceProduct: sourceRoom?.sourceProduct || "",
        stationLevel: sourceRoom?.stationLevel ?? room.stationLevel,
        expectedSlots: sourceRoom?.expectedSlots ?? null,
        operators: sourceRoom?.operators || [],
        efficiency: sourceRoom?.efficiency ?? null,
        efficiencyMetrics: sourceRoom?.efficiencyMetrics || null,
      };
    }),
  }));

  return {
    rooms,
    resources: summary?.yield?.resources || [],
    resourceFlows: summary?.yield?.resourceFlows || {},
    tradingSettlements: summary?.yield?.tradingSettlements || [],
    droneCharge: summary?.yield?.droneCharge || null,
    droneUsage: summary?.yield?.droneUsage || null,
    droneTargetSettlement: summary?.yield?.droneTargetSettlement || null,
  };
}

export function createRiicMaaYieldTestModel({
  maaSchedule,
  localOperators = [],
  uploadedOperators = [],
  forceAllSkills = false,
  layoutCardKey = "",
  planDurations = [],
} = {}) {
  const scheduleInput = applyRiicMaaYieldPlanDurations(
    maaSchedule,
    planDurations,
  );
  const normalized = normalizeMaaRiicSchedule(scheduleInput, {
    allowSequentialDuration: true,
  });
  if (!normalized.schedule) {
    return {
      preview: null,
      summary: null,
      normalized,
      layoutCardKey: "",
      matching: null,
      droneTargetKeysByState: [],
      droneOrdersByState: [],
    };
  }

  const schedule = normalized.schedule;
  const cardKey = LAYOUT_CARD_KEYS.includes(layoutCardKey)
    ? layoutCardKey
    : inferLayoutCardKey(schedule);
  const facilityProfile = getFacilityProfile(cardKey);
  const rosterResolution = createRosterResolver({
    schedule,
    localOperators,
    uploadedOperators,
    forceAllSkills,
  });
  const l79 = settleRiicMaaScheduleEfficiency({
    schedule: createL79Schedule({
      schedule,
      facilityProfile,
    }),
    operatorProfiles: rosterResolution.operators.map((operator) => ({
      charId: operator.charId,
      elite: operator.elite,
      level: operator.level,
    })),
  });
  const droneTargetKeysByState = [];
  const droneOrdersByState = [];

  schedule.plans.forEach((plan, index) => {
    const rawPlan = maaSchedule.plans[index] || {};
    droneTargetKeysByState.push(getDroneTargetKey(rawPlan, plan));
    droneOrdersByState.push(
      rawPlan?.drones?.enable === true
        ? rawPlan.drones.order === "post"
          ? "post"
          : "pre"
        : "retain",
    );
  });

  const preview = l79.preview;
  const summary = summarizeRiicActualSchedule({
    l79,
    droneTargetKeysByState,
    droneOrdersByState,
  });
  const calculationTrace = createMaaYieldCalculationTrace({
    preview,
    summary,
  });

  return {
    preview,
    summary,
    calculationTrace,
    normalized,
    planDurations: getRiicMaaYieldPlanDurations(scheduleInput),
    layoutCardKey: cardKey,
    matching: {
      fullMatch: rosterResolution.fullMatch,
      allSkillsUnlocked: rosterResolution.allSkillsUnlocked,
      matchedCount:
        rosterResolution.scheduleNames.length -
        rosterResolution.unmatchedNames.length,
      totalCount: new Set(
        schedule.plans.flatMap((plan) =>
          plan.rooms.flatMap((room) => room.operators),
        ),
      ).size,
      unmatchedNames: rosterResolution.unmatchedNames,
      unresolvedNames: rosterResolution.unresolvedNames,
      source: uploadedOperators?.length ? "uploaded" : "local",
    },
    droneTargetKeysByState,
    droneOrdersByState,
  };
}

export { LAYOUT_CARD_KEYS, LAYOUT_LABELS };
