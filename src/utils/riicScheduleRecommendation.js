import RIIC_SCHEDULE_DATA from "/src/static/json/tools/riic_schedule_candidates.json";

const MINUTES_PER_DAY = 24 * 60;
const DRONES_PER_DAY = 420;
const MINUTES_PER_DRONE = 3;
const GENERIC_ROOM_EFFICIENCY = 1 + 3 * 0.3;
const LMD_PER_GOLD = 500;

const BATTLE_RECORD = {
  minutes: 180,
  experience: 1000,
};

const PURE_GOLD = {
  minutes: 72,
  quantity: 1,
};

const TRADING_ORDERS = [
  { probability: 0.3, gold: 2, minutes: 144 },
  { probability: 0.5, gold: 3, minutes: 210 },
  { probability: 0.2, gold: 4, minutes: 276 },
];

const MAA_ROOM_TYPES = {
  控制中枢: "control",
  发电站: "power",
  会客室: "meeting",
  办公室: "hire",
  宿舍: "dormitory",
};

const averageOrder = TRADING_ORDERS.reduce(
  (result, order) => ({
    gold: result.gold + order.probability * order.gold,
    minutes: result.minutes + order.probability * order.minutes,
  }),
  { gold: 0, minutes: 0 },
);

export const RIIC_SCHEDULE_SOURCE = RIIC_SCHEDULE_DATA.source;
export const RIIC_SCHEDULE_CANDIDATES = RIIC_SCHEDULE_DATA.candidates;

export const RIIC_LAYOUTS = {
  153: {
    id: "153",
    name: "153 经验优先布局",
    shortName: "153",
    tradingRooms: 1,
    manufactureRooms: 5,
    powerRooms: 3,
    experienceRooms: 4,
    goldRooms: 1,
  },
  243: {
    id: "243",
    name: "243 均衡布局",
    shortName: "243",
    tradingRooms: 2,
    manufactureRooms: 4,
    powerRooms: 3,
    experienceRooms: 2,
    goldRooms: 2,
  },
};

export const SHIFT_MODES = {
  twice: {
    id: "twice",
    name: "每天换班 2 次",
    shortName: "一天两换",
    description: "早晚各操作一次",
    queueHours: [12, 12, 12],
  },
  threeTimes: {
    id: "threeTimes",
    name: "每天换班 3 次",
    shortName: "一天三换",
    description: "一天操作三次，推荐结果保留原排班表的实际时长",
    queueHours: [12, 6, 6],
  },
};

export const DRONE_TARGETS = {
  experience: {
    id: "experience",
    name: "作战记录",
    roomName: "经验制造站",
  },
  gold: {
    id: "gold",
    name: "赤金",
    roomName: "赤金制造站",
  },
  trading: {
    id: "trading",
    name: "龙门币订单",
    roomName: "贸易站",
  },
};

export const ESTIMATION_ASSUMPTIONS = {
  roomEfficiency: GENERIC_ROOM_EFFICIENCY,
  dronesPerDay: DRONES_PER_DAY,
  droneMinutes: DRONES_PER_DAY * MINUTES_PER_DRONE,
  collectInTime: true,
  progressPreserved: true,
};

export function recommendLayoutId(resourceGoal) {
  return resourceGoal === "experience" ? "153" : "243";
}

export function recommendDroneTarget({ resourceGoal, goldStock }) {
  if (goldStock === "low") {
    return "gold";
  }

  if (resourceGoal === "experience") {
    return "experience";
  }

  if (resourceGoal === "lmd") {
    return "trading";
  }

  if (goldStock === "plenty") {
    return "trading";
  }

  return "experience";
}

function calculateDroneAdjustment(droneTarget) {
  const acceleratedMinutes = DRONES_PER_DAY * MINUTES_PER_DRONE;

  if (droneTarget === "experience") {
    return {
      experience:
        acceleratedMinutes /
        BATTLE_RECORD.minutes *
        BATTLE_RECORD.experience,
      goldProduced: 0,
      goldConsumed: 0,
      lmd: 0,
    };
  }

  if (droneTarget === "gold") {
    return {
      experience: 0,
      goldProduced:
        acceleratedMinutes / PURE_GOLD.minutes * PURE_GOLD.quantity,
      goldConsumed: 0,
      lmd: 0,
    };
  }

  const acceleratedGold =
    acceleratedMinutes / averageOrder.minutes * averageOrder.gold;
  return {
    experience: 0,
    goldProduced: 0,
    goldConsumed: acceleratedGold,
    lmd: acceleratedGold * LMD_PER_GOLD,
  };
}

export function calculateDailyProduction(layoutId, droneTarget) {
  const layout = RIIC_LAYOUTS[layoutId];
  if (!layout) {
    throw new Error(`Unknown RIIC layout: ${layoutId}`);
  }

  if (!DRONE_TARGETS[droneTarget]) {
    throw new Error(`Unknown drone target: ${droneTarget}`);
  }

  const effectiveMinutes = MINUTES_PER_DAY * GENERIC_ROOM_EFFICIENCY;
  const experience =
    layout.experienceRooms *
    effectiveMinutes /
    BATTLE_RECORD.minutes *
    BATTLE_RECORD.experience;
  const goldProduced =
    layout.goldRooms *
    effectiveMinutes /
    PURE_GOLD.minutes *
    PURE_GOLD.quantity;
  const goldConsumed =
    layout.tradingRooms *
    effectiveMinutes /
    averageOrder.minutes *
    averageOrder.gold;
  const droneAdjustment = calculateDroneAdjustment(droneTarget);

  const result = {
    experience: experience + droneAdjustment.experience,
    goldProduced: goldProduced + droneAdjustment.goldProduced,
    goldConsumed: goldConsumed + droneAdjustment.goldConsumed,
    lmd: goldConsumed * LMD_PER_GOLD + droneAdjustment.lmd,
    drones: DRONES_PER_DAY,
    dataComplete: true,
    source: "generic",
  };

  result.goldNet = result.goldProduced - result.goldConsumed;
  return result;
}

function getCandidateProduction(candidate, droneTarget) {
  const source = candidate.production;
  const experienceDrone =
    droneTarget === "experience" ? source.experience?.drone || 0 : 0;
  const goldDrone =
    droneTarget === "gold" ? source.goldValue?.drone || 0 : 0;
  const lmdDrone = droneTarget === "trading" ? source.lmd?.drone || 0 : 0;
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
    drones: source.drones || DRONES_PER_DAY,
    dataComplete: source.complete,
    source: "schedule",
    raw: source,
  };
}

function getProductionScore(production, config) {
  let score;

  if (config.resourceGoal === "experience") {
    score = production.experience;
  } else if (config.resourceGoal === "lmd") {
    score = production.lmd;
  } else if (config.resourceGoal === "both") {
    score = production.experience + production.lmd;
  } else {
    score =
      Math.min(production.experience, production.lmd) * 0.6 +
      (production.experience + production.lmd) * 0.4;
  }

  if (
    ["low", "balanced", "unknown"].includes(config.goldStock) &&
    production.goldNet < 0
  ) {
    score += production.goldNet * LMD_PER_GOLD;
  }

  return score;
}

function normalizeOperatorName(value) {
  return String(value || "").trim();
}

export function evaluateScheduleOwnership(candidate, ownedOperators = []) {
  const ownedMap = new Map(
    ownedOperators
      .map((operator) => ({
        name: normalizeOperatorName(operator.name),
        elite: Number.isFinite(Number(operator.elite))
          ? Number(operator.elite)
          : 0,
      }))
      .filter((operator) => operator.name)
      .map((operator) => [operator.name, operator]),
  );
  const missing = [];
  const underleveled = [];

  for (const requirement of candidate.requirements) {
    const owned = ownedMap.get(normalizeOperatorName(requirement.name));

    if (!owned) {
      missing.push(requirement);
      continue;
    }

    if (
      requirement.eliteLevel !== null &&
      owned.elite < requirement.eliteLevel
    ) {
      underleveled.push({
        ...requirement,
        currentElite: owned.elite,
      });
    }
  }

  return {
    compatible: missing.length === 0 && underleveled.length === 0,
    missing,
    underleveled,
    unavailableCount: missing.length + underleveled.length,
    eliteDeficit: underleveled.reduce(
      (total, operator) =>
        total + operator.eliteLevel - operator.currentElite,
      0,
    ),
    requiredCount: candidate.requirements.length,
  };
}

function parseQueueHours(queueDescriptions) {
  return queueDescriptions.map((description) => {
    const match = description.match(/\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
  });
}

function getCandidateReferenceText(candidate) {
  return [
    candidate.description,
    ...candidate.queueDescriptions,
    ...candidate.lines
      .flat()
      .flatMap((station) =>
        station.queues.map((queue) => queue.description),
      ),
  ]
    .filter(Boolean)
    .join("\n");
}

export function getScheduleOperationRisks(candidate) {
  if (!candidate) {
    return [];
  }

  const description = String(candidate.description || "");
  const referenceText = getCandidateReferenceText(candidate);
  const tiredPositionCount = candidate.lines
    .flat()
    .flatMap((station) => station.queues)
    .flatMap((queue) => queue.operators)
    .filter((operator) => operator.isTired).length;
  const risks = [];

  if (
    description.includes("需要严格卡时间") ||
    description.includes("需要卡时间")
  ) {
    risks.push({
      id: "strict-timing",
      label: "严格时间要求",
      detail: "原表要求按标注时长卡点换班，延迟可能影响方案循环。",
      icon: "mdi-clock-alert-outline",
      tone: "warning",
    });
  }

  if (
    description.includes("手动换班不建议") ||
    description.includes("不要用一键轮换")
  ) {
    risks.push({
      id: "manual-steps",
      label: "换班步骤有要求",
      detail: "原表包含手动操作限制，执行前应先核对原表说明。",
      icon: "mdi-hand-back-right-outline",
      tone: "warning",
    });
  }

  if (/暖机|重置|初始化|归零|清空进度/.test(referenceText)) {
    risks.push({
      id: "warmup-reset",
      label: "包含暖机或重置",
      detail: "部分组合依赖前置状态，首次运行或中断后需要重新确认。",
      icon: "mdi-restart-alert",
      tone: "warning",
    });
  }

  if (referenceText.includes("心情")) {
    risks.push({
      id: "morale",
      label: "包含心情条件",
      detail: "原表对部分干员的心情区间有要求，应按表中条件切换。",
      icon: "mdi-heart-pulse",
      tone: "info",
    });
  }

  if (tiredPositionCount > 0) {
    risks.push({
      id: "tired-position",
      label: `${tiredPositionCount} 个疲劳标记位`,
      detail: "红色干员位来自原表的疲劳标记，不应按普通上班位理解。",
      icon: "mdi-battery-alert-variant-outline",
      tone: "danger",
    });
  }

  if (
    candidate.requirements.some(
      (requirement) => requirement.source === "fiammetta",
    )
  ) {
    risks.push({
      id: "fiammetta",
      label: "需要菲亚梅塔恢复",
      detail: "恢复目标与顺序应按原表说明执行；多目标导出 MAA 时需手动确认。",
      icon: "mdi-hospital-box-outline",
      tone: "info",
    });
  }

  if (candidate.variant === "simplified") {
    risks.push({
      id: "simplified",
      label: "原表简化版",
      detail: "该方案以原文标注的简化配置参与推荐，可结合其他高产方案比较。",
      icon: "mdi-format-list-checks",
      tone: "info",
    });
  }

  return risks;
}

function compareCandidateEntries(left, right, useOwnedOperators) {
  if (useOwnedOperators) {
    if (left.ownership.compatible !== right.ownership.compatible) {
      return left.ownership.compatible ? -1 : 1;
    }

    if (
      left.ownership.unavailableCount !==
      right.ownership.unavailableCount
    ) {
      return (
        left.ownership.unavailableCount -
        right.ownership.unavailableCount
      );
    }

    if (left.ownership.eliteDeficit !== right.ownership.eliteDeficit) {
      return left.ownership.eliteDeficit - right.ownership.eliteDeficit;
    }
  }

  if (left.production.dataComplete !== right.production.dataComplete) {
    return left.production.dataComplete ? -1 : 1;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.candidate.variant !== right.candidate.variant) {
    return left.candidate.variant === "standard" ? -1 : 1;
  }

  const leftDate = left.candidate.sourceUpdatedAt.slice(0, 10);
  const rightDate = right.candidate.sourceUpdatedAt.slice(0, 10);

  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate);
  }

  if (
    left.candidate.sourceUpdatedAt !== right.candidate.sourceUpdatedAt
  ) {
    return right.candidate.sourceUpdatedAt.localeCompare(
      left.candidate.sourceUpdatedAt,
    );
  }

  return (
    left.candidate.requirements.length -
    right.candidate.requirements.length
  );
}

export function rankRiicScheduleCandidates(config, options = {}) {
  const layoutId = recommendLayoutId(config.resourceGoal);
  const droneTarget =
    config.dronePreference === "auto"
      ? recommendDroneTarget(config)
      : config.dronePreference;
  const useOwnedOperators =
    options.useOwnedOperators === true &&
    Array.isArray(options.ownedOperators);
  const ownedOperators = options.ownedOperators || [];

  return RIIC_SCHEDULE_CANDIDATES
    .filter(
      (candidate) =>
        candidate.layout === layoutId &&
        candidate.shiftMode === config.shiftMode,
    )
    .map((candidate) => {
      const production = getCandidateProduction(candidate, droneTarget);
      return {
        candidate,
        production,
        score: getProductionScore(production, config),
        ownership: evaluateScheduleOwnership(candidate, ownedOperators),
        queueHours: parseQueueHours(candidate.queueDescriptions),
      };
    })
    .sort((left, right) =>
      compareCandidateEntries(left, right, useOwnedOperators),
    );
}

function getLayoutReason(resourceGoal, layout) {
  if (layout.id === "153") {
    return "经验是当前首要目标，153 可以安排 4 座制造站持续生产作战记录。";
  }

  if (resourceGoal === "lmd") {
    return "龙门币是当前首要目标，243 提供 2 座贸易站，并由 2 座赤金站支撑订单。";
  }

  return "经验和龙门币都需要兼顾，243 在作战记录、赤金与贸易订单之间更均衡。";
}

function getDroneReason({
  resourceGoal,
  goldStock,
  dronePreference,
  droneTarget,
}) {
  if (dronePreference !== "auto") {
    return `已按你的选择，将每日无人机全部投入${DRONE_TARGETS[droneTarget].roomName}。`;
  }

  if (goldStock === "low") {
    return "赤金库存偏紧，优先补充赤金可以降低贸易站断料风险。";
  }

  if (droneTarget === "trading") {
    return resourceGoal === "lmd"
      ? "龙门币是当前首要目标，无人机用于贸易站可以直接推进订单。"
      : "赤金库存充足，无人机可以直接推进贸易订单。";
  }

  if (resourceGoal === "experience") {
    return "经验是当前首要目标，无人机用于经验制造站可以直接增加作战记录产量。";
  }

  return "243 的基础经验产出低于龙门币侧，无人机补作战记录后整体更均衡。";
}

export function createRiicRecommendation(config, options = {}) {
  const layoutId = recommendLayoutId(config.resourceGoal);
  const droneTarget =
    config.dronePreference === "auto"
      ? recommendDroneTarget(config)
      : config.dronePreference;
  const layout = RIIC_LAYOUTS[layoutId];
  const shiftMode = SHIFT_MODES[config.shiftMode];
  const rankedSchedules = rankRiicScheduleCandidates(config, options);
  const useOwnedOperators = options.useOwnedOperators === true;
  const compatibleSchedules = useOwnedOperators
    ? rankedSchedules.filter((schedule) => schedule.ownership.compatible)
    : rankedSchedules;
  const selectedSchedule = compatibleSchedules[0] || null;
  const closestSchedule =
    useOwnedOperators && !selectedSchedule ? rankedSchedules[0] || null : null;

  if (!shiftMode) {
    throw new Error(`Unknown shift mode: ${config.shiftMode}`);
  }

  const genericProduction = calculateDailyProduction(layoutId, droneTarget);
  const productionIsFallback =
    !selectedSchedule?.production.dataComplete;
  const completeAlternatives = compatibleSchedules
    .filter(
      (schedule) =>
        schedule !== selectedSchedule && schedule.production.dataComplete,
    )
    .slice(0, 3);
  const comparisonSchedule =
    !productionIsFallback ? completeAlternatives[0] || null : null;
  const queueHours = selectedSchedule?.queueHours || shiftMode.queueHours;
  const fullRotationHours = queueHours.every(Number.isFinite)
    ? queueHours.reduce((total, hours) => total + hours, 0)
    : null;

  return {
    layout,
    shiftMode: {
      ...shiftMode,
      queueHours,
    },
    droneTarget: DRONE_TARGETS[droneTarget],
    production: productionIsFallback
      ? genericProduction
      : selectedSchedule.production,
    productionIsFallback,
    genericProduction,
    layoutReason: getLayoutReason(config.resourceGoal, layout),
    droneReason: getDroneReason({ ...config, droneTarget }),
    selectedSchedule,
    closestSchedule,
    alternatives: completeAlternatives,
    reference: {
      selectionBasis: [
        `只比较 ${layout.shortName} 布局和${shiftMode.shortName}文档`,
        "优先采用产量字段完整的排班",
        config.resourceGoal === "experience"
          ? "按经验产量优先排序"
          : config.resourceGoal === "lmd"
            ? "按龙门币产量优先排序"
            : config.resourceGoal === "both"
              ? "按经验与龙门币总产量排序"
              : "按经验与龙门币的均衡程度排序",
        useOwnedOperators
          ? "先排除缺少干员或精英化要求不足的方案"
          : "当前按全干员范围推荐，未校验个人持有情况",
      ],
      fullRotationHours,
      operationRisks: getScheduleOperationRisks(
        selectedSchedule?.candidate,
      ),
      comparison: comparisonSchedule
        ? {
            sourceUpdatedAt:
              comparisonSchedule.candidate.sourceUpdatedAt,
            variant: comparisonSchedule.candidate.variant,
            experience:
              selectedSchedule.production.experience -
              comparisonSchedule.production.experience,
            lmd:
              selectedSchedule.production.lmd -
              comparisonSchedule.production.lmd,
            goldNet:
              selectedSchedule.production.goldNet -
              comparisonSchedule.production.goldNet,
          }
        : null,
    },
    useOwnedOperators,
    hasCompatibleSchedule: Boolean(selectedSchedule),
  };
}

function getMaaRoomType(stationTitle) {
  if (stationTitle.startsWith("制造站")) {
    return "manufacture";
  }

  if (stationTitle.startsWith("贸易站")) {
    return "trading";
  }

  return MAA_ROOM_TYPES[stationTitle] || null;
}

function getMaaProduct(stationTitle) {
  if (stationTitle.includes("中级作战记录")) {
    return "Battle Record";
  }

  if (stationTitle.includes("赤金")) {
    return "Pure Gold";
  }

  if (stationTitle.startsWith("贸易站")) {
    return "LMD";
  }

  return null;
}

function getFiammettaTargets(description) {
  const match = description.match(/菲亚梅塔\s+007\s+([^\r\n]+)/);

  if (!match) {
    return [];
  }

  return match[1]
    .split(/[、，,]/)
    .map((target) => target.trim())
    .filter(Boolean);
}

function findDroneRoomIndex(candidate, droneTarget) {
  if (droneTarget === "trading") {
    return 1;
  }

  const manufactureStations = candidate.lines
    .flat()
    .filter((station) => station.title.startsWith("制造站"));
  const keyword = droneTarget === "gold" ? "赤金" : "中级作战记录";
  const index = manufactureStations.findIndex((station) =>
    station.title.includes(keyword),
  );
  return index >= 0 ? index + 1 : 1;
}

function createMaaRoom(queue, stationTitle) {
  if (queue.operators.length === 0) {
    return {
      skip: true,
    };
  }

  const room = {
    operators: queue.operators.map((operator) => operator.displayName),
    sort: ["控制中枢", "制造站", "贸易站", "宿舍"].some((roomType) =>
      stationTitle.startsWith(roomType),
    ),
  };
  const product = getMaaProduct(stationTitle);

  if (product) {
    room.product = product;
  }

  if (
    stationTitle.startsWith("会客室") &&
    queue.operators.length < 2
  ) {
    room.autofill = true;
  }

  if (stationTitle.startsWith("宿舍")) {
    room.autofill = true;
  }

  return room;
}

export function buildMaaSchedule(recommendation) {
  const candidate = recommendation.selectedSchedule?.candidate;

  if (!candidate) {
    throw new Error("No RIIC schedule candidate is selected");
  }

  const warnings = new Set();
  const fiammettaTargets = getFiammettaTargets(candidate.description);
  const plans = candidate.queueDescriptions.map(
    (queueDescription, queueIndex) => {
      const rooms = {};

      for (const station of candidate.lines.flat()) {
        const roomType = getMaaRoomType(station.title);

        if (!roomType) {
          warnings.add(`未导出“${station.title}”挂件，请在 MAA 中按需补充。`);
          continue;
        }

        const queue = station.queues[queueIndex];
        if (!queue) {
          continue;
        }

        if (!rooms[roomType]) {
          rooms[roomType] = [];
        }

        if (roomType === "power") {
          rooms[roomType].push(
            ...queue.operators.map((operator) => ({
              operators: [operator.displayName],
              sort: false,
            })),
          );
          continue;
        }

        rooms[roomType].push(createMaaRoom(queue, station.title));
      }

      if (rooms.dormitory) {
        while (rooms.dormitory.length < 4) {
          rooms.dormitory.push({
            operators: [],
            sort: false,
            autofill: true,
          });
        }
      }

      const plan = {
        name: `队列 ${queueIndex + 1}`,
        description: queueDescription,
        duration: Math.round(
          (recommendation.selectedSchedule.queueHours[queueIndex] || 0) * 60,
        ),
        drones: {
          enable: true,
          room:
            recommendation.droneTarget.id === "trading"
              ? "trading"
              : "manufacture",
          index: findDroneRoomIndex(
            candidate,
            recommendation.droneTarget.id,
          ),
          rule: "all",
          order: "pre",
        },
        rooms,
      };

      if (fiammettaTargets.length === 1) {
        plan.Fiammetta = {
          enable: true,
          target: fiammettaTargets[0],
          order: "pre",
        };
      }

      return plan;
    },
  );

  if (fiammettaTargets.length > 1) {
    warnings.add(
      `原表需要菲亚梅塔轮流恢复 ${fiammettaTargets.join("、")}，MAA 单计划只能填写一个目标，已留给用户手动设置。`,
    );
  }

  const warningList = [...warnings];
  const description = [
    candidate.description,
    warningList.length ? `导出提示：${warningList.join(" ")}` : "",
    `来源：${RIIC_SCHEDULE_SOURCE.repository}`,
    `源文件：${candidate.sourcePath}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    schedule: {
      title: `一图流推荐 ${candidate.title.replace(/\s+/g, " ")}`,
      description,
      plans,
    },
    warnings: warningList,
  };
}

export function buildRecommendationSummary(recommendation) {
  const {
    layout,
    shiftMode,
    droneTarget,
    production,
    productionIsFallback,
    selectedSchedule,
  } = recommendation;
  const queue = shiftMode.queueHours.map((hours) => `${hours}h`).join(" / ");
  const goldNet = `${production.goldNet >= 0 ? "+" : ""}${production.goldNet.toFixed(1)}`;
  const scheduleTitle = selectedSchedule?.candidate.title.replace(/\s+/g, " ");

  return [
    "基建排班方案",
    `布局：${layout.shortName}（${layout.tradingRooms} 贸易 / ${layout.manufactureRooms} 制造 / ${layout.powerRooms} 发电）`,
    `制造：${layout.experienceRooms} 座作战记录 / ${layout.goldRooms} 座赤金`,
    `换班：${shiftMode.shortName}，三组队列 ${queue}`,
    `无人机：全部投入${droneTarget.roomName}`,
    scheduleTitle ? `采用排班：${scheduleTitle}` : "",
    `产量口径：${
      productionIsFallback
        ? "原表产量字段不完整，使用普通补位 190% 的基础布局估算"
        : "采用原排班文档的完整稳定日均数据"
    }`,
    "",
    productionIsFallback ? "基础布局估算日均" : "原排班稳定日均产量",
    `经验：${Math.round(production.experience).toLocaleString("zh-CN")} EXP`,
    `龙门币：${Math.round(production.lmd).toLocaleString("zh-CN")}`,
    `赤金：生产 ${production.goldProduced.toFixed(1)}，贸易消耗 ${production.goldConsumed.toFixed(1)}，净变化 ${goldNet}`,
    `无人机：约 ${production.drones}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
