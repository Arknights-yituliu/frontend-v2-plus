import RIIC_SCHEDULE_DATA from "/src/static/json/tools/riic_schedule_candidates.json";

const LMD_PER_GOLD = 500;
const CARBON_PRIORITY_BOOST = 35000;
const UNRELIABLE_TWO_POWER_PENALTY = 18000;
const PRIORITIZED_TWO_POWER_PENALTY = 5000;

export const RIIC_LAYOUTS = {
  153: {
    id: "153",
    name: "153 经验优先布局",
    shortName: "153",
    tradingRooms: 1,
    manufactureRooms: 5,
    powerRooms: 3,
  },
  243: {
    id: "243",
    name: "243 均衡布局",
    shortName: "243",
    tradingRooms: 2,
    manufactureRooms: 4,
    powerRooms: 3,
  },
  252: {
    id: "252",
    name: "252 高养成产出布局",
    shortName: "252",
    tradingRooms: 2,
    manufactureRooms: 5,
    powerRooms: 2,
  },
  342: {
    id: "342",
    name: "342 搓玉布局",
    shortName: "342",
    tradingRooms: 3,
    manufactureRooms: 4,
    powerRooms: 2,
  },
};

export const SHIFT_MODES = {
  once: {
    id: "once",
    name: "一天一换",
    shortName: "一天一换",
    description: "每天只需操作一次。",
    queueHours: [24, 24],
  },
  twice: {
    id: "twice",
    name: "一天两换",
    shortName: "一天两换",
    description: "早晚各操作一次。",
    queueHours: [12, 12, 12],
  },
  threeTimes: {
    id: "threeTimes",
    name: "一天三换",
    shortName: "一天三换",
    description: "通常按 12 / 6 / 6 执行。",
    queueHours: [12, 6, 6],
  },
};

export const RESOURCE_TENDENCIES = {
  experience: {
    id: "experience",
    name: "倾向产书",
  },
  slightExperience: {
    id: "slightExperience",
    name: "略微倾向产书",
  },
  balanced: {
    id: "balanced",
    name: "均衡",
  },
  slightLmd: {
    id: "slightLmd",
    name: "略微倾向产钱",
  },
  lmd: {
    id: "lmd",
    name: "倾向产钱",
  },
};

const DRONE_TARGETS = {
  experience: {
    id: "experience",
    name: "作战记录",
    roomName: "经验制造站",
  },
  trading: {
    id: "trading",
    name: "龙门币订单",
    roomName: "贸易站",
  },
  flexible: {
    id: "flexible",
    name: "灵活调整",
    roomName: "经验制造站或贸易站",
  },
};

function parseQueueHours(queueDescriptions) {
  return queueDescriptions.map((description) => {
    const match = String(description).match(/\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
  });
}

function getNeedScore(value) {
  return {
    high: 2,
    medium: 1,
    low: 0,
  }[value] ?? 0;
}

function getFarmingAdjustment(value) {
  return {
    rarely: 0,
    sometimes: 1,
    frequently: 3,
  }[value] ?? 0;
}

export function getResourceTendency(config) {
  const score =
    getNeedScore(config.experienceNeed) -
    getNeedScore(config.lmdNeed) +
    getFarmingAdjustment(config.farmingHabit);

  if (score >= 2) {
    return RESOURCE_TENDENCIES.experience;
  }

  if (score === 1) {
    return RESOURCE_TENDENCIES.slightExperience;
  }

  if (score === -1) {
    return RESOURCE_TENDENCIES.slightLmd;
  }

  if (score <= -2) {
    return RESOURCE_TENDENCIES.lmd;
  }

  return RESOURCE_TENDENCIES.balanced;
}

function getDroneTarget(tendency) {
  if (
    tendency.id === "experience" ||
    tendency.id === "slightExperience"
  ) {
    return DRONE_TARGETS.experience;
  }

  if (tendency.id === "lmd" || tendency.id === "slightLmd") {
    return DRONE_TARGETS.trading;
  }

  return DRONE_TARGETS.flexible;
}

function getCandidateProduction(candidate, droneTarget) {
  const source = candidate.production;
  const experienceDrone =
    droneTarget === "experience" ? source.experience?.drone || 0 : 0;
  const lmdDrone =
    droneTarget === "trading" ? source.lmd?.drone || 0 : 0;
  const goldDrone =
    droneTarget === "gold" ? source.goldValue?.drone || 0 : 0;
  const experience = (source.experience?.base || 0) + experienceDrone;
  const lmd = (source.lmd?.base || 0) + lmdDrone;
  const goldProduced = ((source.goldValue?.base || 0) + goldDrone) /
    LMD_PER_GOLD;
  const goldConsumed = lmd / LMD_PER_GOLD;

  return {
    experience,
    lmd,
    goldProduced,
    goldConsumed,
    goldNet: goldProduced - goldConsumed,
    orundum: source.orundum?.base || 0,
    drones: source.drones || 0,
    dataComplete: source.complete,
    source: "schedule",
    raw: source,
  };
}

function getBaseProduction(candidate) {
  return getCandidateProduction(candidate, "flexible");
}

function getTrackKey(candidate) {
  return [
    candidate.layout,
    candidate.variant,
    candidate.shiftMode,
    candidate.isOrundum ? "orundum" : "normal",
  ].join("/");
}

function compareSourceCandidates(left, right) {
  if (left.production.complete !== right.production.complete) {
    return left.production.complete ? -1 : 1;
  }

  if (left.sourceUpdatedAt !== right.sourceUpdatedAt) {
    return right.sourceUpdatedAt.localeCompare(left.sourceUpdatedAt);
  }

  return right.id.localeCompare(left.id, "zh-CN");
}

function getCurrentTrackCandidates() {
  const tracks = new Map();

  for (const candidate of RIIC_SCHEDULE_DATA.candidates) {
    const key = getTrackKey(candidate);
    const current = tracks.get(key);

    if (!current || compareSourceCandidates(candidate, current) < 0) {
      tracks.set(key, candidate);
    }
  }

  return [...tracks.values()];
}

function isCandidateShiftCompatible(candidate, requestedShiftMode) {
  if (requestedShiftMode === "once") {
    return candidate.layout === "243" && candidate.shiftMode === "once";
  }

  if (requestedShiftMode === "threeTimes") {
    return ["twice", "threeTimes"].includes(candidate.shiftMode);
  }

  return candidate.shiftMode === "twice";
}

function getPool(config) {
  const expectsOrundum =
    config.shiftMode !== "once" &&
    config.orundumPreference === "accept";

  return getCurrentTrackCandidates().filter(
    (candidate) =>
      candidate.isOrundum === expectsOrundum &&
      isCandidateShiftCompatible(candidate, config.shiftMode),
  );
}

function getCultivationScore(production) {
  return (
    Math.min(production.experience, production.lmd) * 0.7 +
    (production.experience + production.lmd) * 0.3
  );
}

function getResourceScore(production, tendency) {
  if (tendency.id === "experience") {
    return production.experience;
  }

  if (tendency.id === "lmd") {
    return production.lmd;
  }

  return getCultivationScore(production);
}

function getCandidateScore(candidate, config, tendency, options = {}) {
  const production = getBaseProduction(candidate);
  let score = getResourceScore(production, tendency);
  const carbonPriority =
    options.includeCarbonPriority !== false && config.carbonNeed === "needed";
  const twoPowerPriority =
    carbonPriority || config.orundumPreference === "accept";

  if (carbonPriority && candidate.powerPlantCount === 2) {
    score += CARBON_PRIORITY_BOOST;
  }

  if (
    config.executionReliability === "unreliable" &&
    candidate.powerPlantCount === 2
  ) {
    score -= twoPowerPriority
      ? PRIORITIZED_TWO_POWER_PENALTY
      : UNRELIABLE_TWO_POWER_PENALTY;
  }

  return score;
}

function getAllocation(candidate) {
  const allocation = {
    experienceRooms: 0,
    goldRooms: 0,
    orundumRooms: 0,
  };

  for (const station of candidate.lines.flat()) {
    if (!station.title.startsWith("制造站")) {
      continue;
    }

    if (station.title.includes("作战记录")) {
      allocation.experienceRooms += 1;
    } else if (station.title.includes("赤金")) {
      allocation.goldRooms += 1;
    } else if (station.title.includes("源石碎片")) {
      allocation.orundumRooms += 1;
    }
  }

  return allocation;
}

function createScheduleEntry(candidate, config, tendency) {
  const droneTarget = getDroneTarget(tendency);
  const production = getCandidateProduction(candidate, droneTarget.id);

  return {
    candidate,
    production,
    score: getCandidateScore(candidate, config, tendency),
    queueHours: parseQueueHours(candidate.queueDescriptions),
    ownership: {
      compatible: true,
      missing: [],
      underleveled: [],
      unavailableCount: 0,
      eliteDeficit: 0,
      requiredCount: candidate.requirements.length,
    },
  };
}

function compareEntries(left, right) {
  if (left.candidate.production.complete !== right.candidate.production.complete) {
    return left.candidate.production.complete ? -1 : 1;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.candidate.sourceUpdatedAt !== right.candidate.sourceUpdatedAt) {
    return right.candidate.sourceUpdatedAt.localeCompare(
      left.candidate.sourceUpdatedAt,
    );
  }

  return left.candidate.id.localeCompare(right.candidate.id, "zh-CN");
}

function getLayoutReason(config, tendency, candidate) {
  const reasons = [];

  if (config.shiftMode === "once") {
    reasons.push("一天一换只保留 243 候选，避免推荐无法稳定执行的布局。");
  }

  if (candidate.isOrundum) {
    reasons.push("你愿意以养成产出换取合成玉，因此优先进入搓玉方案。");
  } else if (tendency.id === "experience") {
    reasons.push("当前书的需求最强，优先比较作战记录产出。");
  } else if (tendency.id === "lmd") {
    reasons.push("当前钱的需求最强，优先比较龙门币产出。");
  } else {
    reasons.push("书和钱不以布局强行偏向，优先比较整体养成产出。");
  }

  if (config.carbonNeed === "needed" && candidate.powerPlantCount === 2) {
    reasons.push("你当前缺碳，两电站的碳优势被提高到主方案优先级。");
  }

  if (
    config.executionReliability === "unreliable" &&
    candidate.powerPlantCount === 2
  ) {
    reasons.push("虽然你不常能稳定换班，但搓玉或缺碳目标仍保留了两电站优先级。");
  }

  return reasons;
}

function getDroneReason(tendency) {
  if (tendency.id === "experience" || tendency.id === "slightExperience") {
    return "将无人机投向经验制造站，补足作战记录需求。";
  }

  if (tendency.id === "lmd" || tendency.id === "slightLmd") {
    return "将无人机投向贸易站，优先推进龙门币订单。";
  }

  return "无人机按当前库存灵活投向经验制造站或贸易站，不固定偏向某一种资源。";
}

function getFallbackEntry(entries, selectedEntry, config, tendency) {
  const candidates = entries
    .filter(
      (entry) =>
        entry.candidate.powerPlantCount === 3 &&
        entry.candidate.id !== selectedEntry.candidate.id,
    )
    .map((entry) => ({
      ...entry,
      score: getCandidateScore(entry.candidate, config, tendency, {
        includeCarbonPriority: false,
      }),
    }))
    .sort(compareEntries);

  return candidates[0] || null;
}

function buildAlternatives(entries, selectedEntry, config, tendency) {
  if (selectedEntry.candidate.powerPlantCount !== 2) {
    return [];
  }

  const fallback = getFallbackEntry(entries, selectedEntry, config, tendency);
  if (!fallback) {
    return [];
  }

  const alternatives = [];

  if (config.executionReliability === "unreliable") {
    alternatives.push({
      ...fallback,
      type: "robust",
      label: "稳妥备选",
      reason: "三电站对无法稳定上线换班的情况更宽容。",
    });
  }

  if (
    config.carbonNeed === "needed" &&
    !alternatives.some(
      (alternative) => alternative.candidate.id === fallback.candidate.id,
    )
  ) {
    alternatives.push({
      ...fallback,
      type: "afterCarbon",
      label: "碳充足后的回退方案",
      reason: "碳不再紧缺后，可回到这一套三电站方案比较养成产出。",
    });
  }

  if (
    config.carbonNeed === "needed" &&
    alternatives.length === 0
  ) {
    alternatives.push({
      ...fallback,
      type: "afterCarbon",
      label: "碳充足后的回退方案",
      reason: "碳不再紧缺后，可回到这一套三电站方案比较养成产出。",
    });
  }

  return alternatives.slice(0, 2);
}

export function createRiicLayoutRecommendation(config) {
  const tendency = getResourceTendency(config);
  const droneTarget = getDroneTarget(tendency);
  const entries = getPool(config)
    .map((candidate) => createScheduleEntry(candidate, config, tendency))
    .sort(compareEntries);
  const selectedSchedule = entries[0] || null;

  if (!selectedSchedule) {
    throw new Error("No RIIC schedule candidate matches the selected constraints");
  }

  const candidate = selectedSchedule.candidate;
  const productionAllocation = getAllocation(candidate);
  const layout = {
    ...RIIC_LAYOUTS[candidate.layout],
    experienceRooms: productionAllocation.experienceRooms,
    goldRooms: productionAllocation.goldRooms,
    orundumRooms: productionAllocation.orundumRooms,
  };
  const scheduleShiftMode = SHIFT_MODES[candidate.shiftMode];
  const requestedShiftMode = SHIFT_MODES[config.shiftMode];
  const productionAlternatives = ["experience", "trading"].map((targetId) => ({
    target: DRONE_TARGETS[targetId],
    production: getCandidateProduction(candidate, targetId),
  }));

  return {
    layout,
    requestedShiftMode,
    shiftMode: {
      ...scheduleShiftMode,
      queueHours: selectedSchedule.queueHours,
      isCompatibleFallback:
        config.shiftMode === "threeTimes" &&
        candidate.shiftMode === "twice",
    },
    tendency,
    droneTarget,
    droneReason: getDroneReason(tendency),
    production: selectedSchedule.production,
    productionAlternatives,
    productionAllocation,
    selectedSchedule,
    alternatives: buildAlternatives(entries, selectedSchedule, config, tendency),
    layoutReasons: getLayoutReason(config, tendency, candidate),
    layoutReason: getLayoutReason(config, tendency, candidate).join(" "),
    productionIsFallback: false,
    useOwnedOperators: false,
    closestSchedule: null,
    reference: {
      candidateCount: entries.length,
      sourceUpdatedAt: candidate.sourceUpdatedAt,
      selectionBasis: [
        `从 ${entries.length} 个符合换班频率的原表布局候选中排序。`,
        candidate.isOrundum
          ? "只比较搓玉方案。"
          : "只比较常规养成方案。",
        `资源倾向为“${tendency.name}”。`,
      ],
      fullRotationHours: selectedSchedule.queueHours.every(Number.isFinite)
        ? selectedSchedule.queueHours.reduce(
            (total, hours) => total + hours,
            0,
          )
        : null,
      operationRisks: [],
      comparison: null,
    },
  };
}
