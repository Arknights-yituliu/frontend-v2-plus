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
  333: {
    id: "333",
    name: "333 龙门币与赤金布局",
    shortName: "333",
    tradingRooms: 3,
    manufactureRooms: 3,
    powerRooms: 3,
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

const CARD_LAYOUT_IDS = {
  153: "153",
  243: "243",
  "243-orundum": "243",
  "252-2-gold": "252",
  "252-3-gold": "252",
  333: "333",
  "333-orundum": "333",
  342: "342",
  "342-orundum": "342",
};

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

function getRecommendedCardKey(config, tendency) {
  if (config.shiftMode === "once") {
    return "243";
  }

  if (config.orundumPreference === "accept") {
    if (config.carbonNeed === "needed" || tendency.id === "lmd") {
      return "342-orundum";
    }

    return "243-orundum";
  }

  if (config.carbonNeed === "needed") {
    return tendency.id === "lmd" ? "252-3-gold" : "252-2-gold";
  }

  if (config.executionReliability === "unreliable") {
    return tendency.id === "experience" ? "153" : "243";
  }

  if (tendency.id === "experience") {
    return "153";
  }

  if (tendency.id === "lmd") {
    return "243";
  }

  return "252-2-gold";
}

function getLayoutReasons(config, tendency, cardKey) {
  const reasons = [];

  if (config.shiftMode === "once") {
    reasons.push("一天一换只推荐 243，优先保证能稳定执行。");
    return reasons;
  }

  if (config.orundumPreference === "accept") {
    reasons.push("你愿意以养成产出换取合成玉，因此进入搓玉布局方向。");

    if (config.carbonNeed === "needed") {
      reasons.push("当前缺碳，两电站布局的碳优势被提高到最高优先级。");
    } else if (cardKey === "342-orundum") {
      reasons.push("你对龙门币的需求更强，优先采用贸易站更多的搓玉布局。");
    } else {
      reasons.push("在保留搓玉方向的前提下，优先选择三电站的 243。");
    }

    return reasons;
  }

  if (config.carbonNeed === "needed") {
    reasons.push("当前缺碳，两电站布局的碳优势被提高到最高优先级。");
    reasons.push(
      cardKey === "252-3-gold"
        ? "你更缺龙门币，因此选择赤金更多的 252。"
        : "书和钱未明显偏向一侧，因此选择书钱更均衡的 252。",
    );
    return reasons;
  }

  if (config.executionReliability === "unreliable") {
    reasons.push("你不常能稳定换班，优先选择三电站布局，提高执行容错。");
    reasons.push(
      cardKey === "153"
        ? "当前经验书需求最强，因此保留经验书优先。"
        : "当前不需要让布局强行偏向经验书，优先保留更均衡的 243。",
    );
    return reasons;
  }

  if (tendency.id === "experience") {
    reasons.push("当前经验书需求最强，优先选择经验书产能更高的 153。");
  } else if (tendency.id === "lmd") {
    reasons.push("当前龙门币需求最强，优先选择龙门币方向的 243。");
  } else {
    reasons.push("书和钱没有强烈偏向，优先选择书钱均衡的 252。");
  }

  return reasons;
}

function getLayoutByCardKey(cardKey) {
  const layoutId = CARD_LAYOUT_IDS[cardKey];

  if (!layoutId) {
    throw new Error(`Unknown RIIC layout card: ${cardKey}`);
  }

  return RIIC_LAYOUTS[layoutId];
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

export function createRiicLayoutRecommendation(config) {
  const tendency = getResourceTendency(config);
  const cardKey = getRecommendedCardKey(config, tendency);
  const requestedShiftMode = SHIFT_MODES[config.shiftMode];

  if (!requestedShiftMode) {
    throw new Error(`Unknown RIIC shift mode: ${config.shiftMode}`);
  }

  return {
    cardKey,
    layout: getLayoutByCardKey(cardKey),
    requestedShiftMode,
    shiftMode: requestedShiftMode,
    tendency,
    droneTarget: getDroneTarget(tendency),
    droneReason: getDroneReason(tendency),
    layoutReasons: getLayoutReasons(config, tendency, cardKey),
    layoutReason: getLayoutReasons(config, tendency, cardKey).join(" "),
  };
}
