const SYSTEM_PERCENT_RULES = Object.freeze({
  "control-cross-room": [
    {
      id: "w-island-meeting",
      core: { name: "维什戴尔", roomType: "control" },
      helpers: [{ id: "ines", name: "伊内丝", roomType: "meeting" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "facility", roomType: "meeting" },
          metric: "线索速度",
          percent: 5,
          requires: [{ source: "ines", min: 1 }],
        },
      ],
    },
    {
      id: "silverash-karlan",
      core: { name: "凛御银灰", roomType: "control" },
      helpers: [{ id: "karlan", group: "karlan", roomType: "trading" }],
      effects: [
        {
          type: "perSourceRoomThreshold",
          source: "karlan",
          min: 3,
          target: { scope: "sourceRoom", source: "karlan" },
          metric: "订单效率",
          percent: 10,
        },
      ],
    },
    {
      id: "gnosis-karlan",
      core: { name: "灵知", roomType: "control" },
      helpers: [{ id: "karlan", group: "karlan", roomType: "trading" }],
      effects: [
        {
          type: "perSource",
          source: "karlan",
          target: { scope: "sourceRoom", source: "karlan" },
          metric: "订单效率",
          percent: -15,
        },
      ],
    },
    {
      id: "ave-maria-siracusa",
      core: { name: "八幡海铃", roomType: "control" },
      helpers: [{ id: "siracusa", group: "siracusa", roomType: "trading" }],
      effects: [
        {
          type: "perSource",
          source: "siracusa",
          target: { scope: "sourceRoom", source: "siracusa" },
          metric: "订单效率",
          percent: 5,
        },
      ],
    },
    {
      id: "jessica-blacksteel",
      core: { name: "涤火杰西卡", roomType: "control" },
      helpers: [
        { id: "blacksteel", group: "blacksteel", roomType: "manufacture" },
      ],
      effects: [
        {
          type: "perSource",
          source: "blacksteel",
          target: { scope: "sourceRoom", source: "blacksteel" },
          metric: "生产力",
          percent: 5,
        },
      ],
    },
    {
      id: "gladiia-abyssal",
      core: { name: "歌蕾蒂娅", roomType: "control" },
      helpers: [
        {
          id: "abyssal",
          group: "abyssal",
          roomType: "manufacture",
          excludeCore: true,
        },
      ],
      effects: [
        {
          type: "perSourceCount",
          source: "abyssal",
          target: { scope: "sourceRoom", source: "abyssal" },
          metric: "生产力",
          percent: 10,
          cap: 9,
        },
      ],
    },
    {
      id: "viviana-knight",
      core: { name: "薇薇安娜", roomType: "control" },
      helpers: [{ id: "knight", group: "knight", roomType: "manufacture" }],
      effects: [
        {
          type: "perSource",
          source: "knight",
          target: { scope: "sourceRoom", source: "knight" },
          metric: "生产力",
          percent: 7,
        },
      ],
    },
    {
      id: "dafine-glasgow",
      core: { name: "戴菲恩", roomType: "control" },
      helpers: [{ id: "glasgow", group: "glasgow", roomType: "trading" }],
      effects: [
        {
          type: "perSource",
          source: "glasgow",
          target: { scope: "sourceRoom", source: "glasgow" },
          metric: "订单效率",
          percent: 10,
        },
      ],
    },
    {
      id: "flametail-redpine",
      core: { name: "焰尾", roomType: "control" },
      helpers: [{ id: "redpine", group: "redpine", roomType: "manufacture" }],
      effects: [
        {
          type: "perSourceByProduct",
          source: "redpine",
          target: { scope: "sourceRoom", source: "redpine" },
          metric: "生产力",
          values: { exp: 10, gold: -10 },
        },
      ],
    },
    {
      id: "bellone-sileach",
      core: { name: "贝洛内", roomType: "trading" },
      helpers: [{ id: "vigil", name: "伺夜", roomType: "trading" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "订单效率",
          percent: 10,
          requires: [{ source: "vigil", min: 1 }],
        },
      ],
    },
    {
      id: "deep-scout-ulpian",
      core: { name: "深巡", roomType: "trading" },
      helpers: [{ id: "ulpian", name: "乌尔比安", roomType: "any" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "订单效率",
          percent: 10,
          requires: [{ source: "ulpian", min: 1 }],
        },
      ],
    },
    {
      id: "rushu-gummy",
      core: { name: "烈夏", roomType: "manufacture", product: "exp" },
      helpers: [{ id: "gummy", name: "古米", roomType: "trading" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "生产力",
          percent: 35,
          requires: [{ source: "gummy", min: 1 }],
        },
      ],
    },
    {
      id: "justice-wildmane",
      core: { name: "正义骑士号", roomType: "power" },
      helpers: [{ id: "wildmane", name: "野鬃", roomType: "manufacture" }],
      effects: [
        {
          type: "perSource",
          source: "wildmane",
          target: { scope: "sourceRoom", source: "wildmane" },
          metric: "生产力",
          percent: 5,
        },
      ],
    },
    {
      id: "friston-kaltsit",
      core: { name: "Friston-3", roomType: "power" },
      helpers: [{ id: "kaltsit", name: "凯尔希", roomType: "control" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "metric" },
          metric: "无人机充能",
          percent: 5,
          requires: [{ source: "kaltsit", min: 1 }],
        },
      ],
    },
    {
      id: "phonor-logos",
      core: { name: "PhonoR-0", roomType: "power" },
      helpers: [{ id: "logos", name: "逻各斯", roomType: "training" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "metric" },
          metric: "无人机充能",
          percent: 5,
          requires: [{ source: "logos", min: 1 }],
        },
      ],
    },
    {
      id: "secret-team-firefox",
      core: { name: "罗德岛隐秘队", roomType: "meeting" },
      helpers: [
        { id: "firefox", name: "焰狐龙梓兰", roomType: "control" },
      ],
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "线索速度",
          percent: 10,
          requires: [{ source: "firefox", min: 1 }],
        },
      ],
    },
    {
      id: "faith-mixer-fiammetta",
      core: { name: "信仰搅拌机", roomType: "meeting" },
      helpers: [
        { id: "fiammetta", name: "菲亚梅塔", roomType: "dormitory" },
      ],
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "线索速度",
          percent: 10,
          requires: [{ source: "fiammetta", min: 1 }],
        },
      ],
    },
    {
      id: "saint-snow-silverash",
      core: { name: "圣聆初雪", roomType: "hire" },
      helpers: [{ id: "silverash", name: "凛御银灰", roomType: "control" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "联络速度",
          percent: 10,
          requires: [{ source: "silverash", min: 1 }],
        },
      ],
    },
  ],
  "elite-facilities": [
    {
      id: "kaltsit-elite-facilities",
      core: { name: "凯尔希·思衡托", roomType: "hire" },
      helpers: [{ id: "elite", group: "elite", roomType: "any" }],
      effects: [
        {
          type: "perDistinctSourceRoom",
          source: "elite",
          target: { scope: "coreRoom" },
          metric: "联络速度",
          percent: 4,
          cap: 5,
        },
      ],
    },
    {
      id: "veritas-elite-facilities",
      core: { name: "真言", roomType: "trading" },
      helpers: [{ id: "elite", group: "elite", roomType: "any" }],
      effects: [
        {
          type: "perDistinctSourceRoom",
          source: "elite",
          target: { scope: "coreRoom" },
          metric: "订单效率",
          percent: 2,
          cap: 10,
        },
      ],
    },
  ],
  rhine: [
    {
      id: "nastya-rhine",
      core: { name: "娜斯提", roomType: "manufacture", product: "gold" },
      helpers: [
        {
          id: "rhine",
          group: "rhine",
          roomType: "any",
          excludeCore: true,
        },
      ],
      effects: [
        {
          type: "perSourceCount",
          sources: ["core", "rhine"],
          target: { scope: "coreRoom" },
          metric: "生产力",
          percent: 3,
          cap: 5,
        },
      ],
    },
    {
      id: "muelsyse-rhine",
      core: { name: "缪尔赛思", roomType: "power" },
      helpers: [
        {
          id: "rhine",
          group: "rhine",
          roomType: "any",
          excludeCore: true,
        },
      ],
      effects: [
        {
          type: "perSourceCount",
          source: "rhine",
          target: { scope: "metric" },
          metric: "无人机充能",
          percent: 3,
          cap: 5,
        },
      ],
    },
  ],
  ussg: [
    {
      id: "istina-meeting",
      core: { name: "真理", roomType: "meeting" },
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "线索速度",
          percent: 10,
        },
      ],
    },
  ],
  "work-platform": [
    {
      id: "gallus-platform",
      core: { name: "GALLUS²", roomType: "power" },
      helpers: [
        {
          id: "platform",
          group: "workPlatform",
          roomType: "power",
          excludeCore: true,
        },
      ],
      effects: [
        {
          type: "fixed",
          target: { scope: "metric" },
          metric: "无人机充能",
          percent: 5,
          requires: [{ source: "platform", min: 1 }],
        },
      ],
    },
    {
      id: "alanna-platform",
      core: { name: "阿兰娜", roomType: "manufacture", product: "gold" },
      helpers: [
        { id: "platform", group: "workPlatform", roomType: "power" },
        { id: "warmi", name: "温米", roomType: "manufacture", product: "gold" },
      ],
      effects: [
        {
          type: "perSourceCount",
          source: "platform",
          target: { scope: "coreRoom" },
          metric: "生产力",
          percent: 10,
        },
        {
          type: "fixedIfSourceInCoreRoom",
          source: "warmi",
          target: { scope: "coreRoom" },
          metric: "生产力",
          percent: 15,
        },
      ],
    },
    {
      id: "pudding-platform",
      core: { name: "布丁", roomType: "control" },
      helpers: [{ id: "platform", group: "workPlatform", roomType: "power" }],
      effects: [
        {
          type: "fixed",
          target: { scope: "facility", roomType: "manufacture" },
          metric: "生产力",
          percent: 2,
          requires: [{ source: "platform", min: 2 }],
        },
      ],
    },
  ],
  "virtual-facility": [
    {
      id: "matoimaru-power",
      core: { name: "森蚺", roomType: "manufacture" },
      effects: [
        {
          type: "perLayoutFacilityCount",
          facilityType: "power",
          target: { scope: "coreRoom" },
          metric: "生产力",
          percent: 10,
        },
      ],
    },
  ],
  "monster-hunter": [
    {
      id: "rathalos-mh",
      core: { name: "火龙S黑角", roomType: "control" },
      helpers: [
        {
          id: "monster-hunter",
          group: "monsterHunter",
          roomType: "control",
          excludeCore: true,
        },
      ],
      effects: [
        {
          type: "fixed",
          target: { scope: "facility", roomType: "trading" },
          metric: "订单效率",
          percent: 7,
          requires: [{ source: "monster-hunter", min: 1 }],
        },
      ],
    },
    {
      id: "kirin-mh",
      core: { name: "麒麟R夜刀", roomType: "control" },
      helpers: [
        {
          id: "monster-hunter",
          group: "monsterHunter",
          roomType: "control",
          excludeCore: true,
        },
      ],
      effects: [
        {
          type: "fixed",
          target: { scope: "facility", roomType: "manufacture" },
          metric: "生产力",
          percent: 2,
          requires: [{ source: "monster-hunter", min: 1 }],
        },
      ],
    },
    {
      id: "firefox-shadow-hunter",
      core: { name: "焰狐龙梓兰", roomType: "trading" },
      helpers: [
        {
          id: "shadow-hunter",
          group: "monsterHunterShadow",
          roomType: "trading",
          excludeCore: true,
        },
      ],
      effects: [
        {
          type: "perSourceInCoreRoom",
          source: "shadow-hunter",
          target: { scope: "coreRoom" },
          metric: "订单效率",
          percent: 20,
        },
      ],
    },
    {
      id: "secret-team-firefox",
      core: { name: "罗德岛隐秘队", roomType: "meeting" },
      helpers: [
        { id: "firefox", name: "焰狐龙梓兰", roomType: "control" },
      ],
      effects: [
        {
          type: "fixed",
          target: { scope: "coreRoom" },
          metric: "线索速度",
          percent: 10,
          requires: [{ source: "firefox", min: 1 }],
        },
      ],
    },
  ],
  "human-fireworks": [
    {
      id: "windflit-sui",
      core: { name: "风絮", roomType: "trading" },
      helpers: [
        {
          id: "sui",
          group: "sui",
          roomType: "any",
          allowedRoomTypes: [
            "control",
            "trading",
            "manufacture",
            "power",
            "meeting",
            "hire",
            "training",
          ],
        },
      ],
      effects: [
        {
          type: "perDistinctSourceRoom",
          source: "sui",
          target: { scope: "coreRoom" },
          metric: "订单效率",
          percent: 4,
          cap: 5,
        },
      ],
    },
  ],
});

function normalizeOperators(operators) {
  const byName = new Map();

  for (const operator of operators || []) {
    const name = String(operator?.name || "").trim();
    if (!name) {
      continue;
    }

    byName.set(name, {
      name,
      charId: String(operator?.charId || "").trim(),
      rarity: Number(operator?.rarity || 1),
      elite: Number(operator?.elite || 0),
      level: Number(operator?.level || 1),
    });
  }

  return byName;
}

function buildRooms(layoutFacts) {
  const indexByFacility = new Map();

  return (layoutFacts?.facilities || []).flatMap((facility) => {
    const facilityType = String(facility?.facilityType || "").trim();
    const slotCount = Number(facility?.slotCount);
    if (!facilityType || !Number.isFinite(slotCount) || slotCount < 1) {
      return [];
    }

    const index = Number(indexByFacility.get(facilityType) || 0) + 1;
    indexByFacility.set(facilityType, index);
    return [
      {
        id: `${facilityType}:${index}`,
        facilityType,
        product: String(facility?.product || "all").trim() || "all",
        stationLevel: Number(facility?.stationLevel) || null,
        slotCount,
        index,
        assigned: [],
        bonusByMetric: new Map(),
      },
    ];
  });
}

function matchesRoom(room, roomType, product) {
  return (
    room?.facilityType === roomType &&
    (!product || product === "all" || room.product === product)
  );
}

function meetsRequirement(operator, requirement) {
  if (!operator) {
    return false;
  }
  if (!requirement) {
    return true;
  }

  const elite = Number(operator.elite || 0);
  const level = Number(operator.level || 1);
  const requiredElite = Number(requirement.elite || 0);
  const requiredLevel = Number(requirement.level || 1);
  return elite > requiredElite || (elite === requiredElite && level >= requiredLevel);
}

function uniqueNames(names) {
  return [...new Set((names || []).filter(Boolean))];
}

function createSourceState() {
  return {
    candidates: [],
    assigned: [],
  };
}

function addCandidate(sourceStates, sourceId, candidate) {
  if (!sourceStates.has(sourceId)) {
    sourceStates.set(sourceId, createSourceState());
  }

  const state = sourceStates.get(sourceId);
  if (!state.candidates.some((item) => item.name === candidate.name)) {
    state.candidates.push(candidate);
  }
}

function addAssignedSource(sourceStates, sourceIds, assignment) {
  for (const sourceId of sourceIds || []) {
    if (!sourceStates.has(sourceId)) {
      sourceStates.set(sourceId, createSourceState());
    }

    const source = sourceStates.get(sourceId);
    if (
      !source.assigned.some(
        (item) => item.name === assignment.name && item.roomId === assignment.roomId,
      )
    ) {
      source.assigned.push(assignment);
    }
  }
}

function getSourceAssignments(sourceStates, sourceIds) {
  return uniqueNames(sourceIds).flatMap(
    (sourceId) => sourceStates.get(sourceId)?.assigned || [],
  );
}

function getSourceCount(sourceStates, sourceIds) {
  return new Set(
    getSourceAssignments(sourceStates, sourceIds).map((item) => item.name),
  ).size;
}

function getTargetRooms({ target, rooms, sourceStates, coreAssignment }) {
  if (!target || target.scope === "metric") {
    return [];
  }
  if (target.scope === "coreRoom") {
    return coreAssignment?.roomId
      ? rooms.filter((room) => room.id === coreAssignment.roomId)
      : [];
  }
  if (target.scope === "sourceRoom") {
    const roomIds = new Set(
      getSourceAssignments(sourceStates, [target.source]).map(
        (item) => item.roomId,
      ),
    );
    return rooms.filter((room) => roomIds.has(room.id));
  }
  if (target.scope === "facility") {
    return rooms.filter((room) =>
      matchesRoom(room, target.roomType, target.product),
    );
  }
  return [];
}

function addRoomBonus(room, effect, percent, ownerName = "") {
  if (!Number.isFinite(percent) || percent === 0) {
    return;
  }

  const metric = String(effect.metric || "加成").trim() || "加成";
  const current = room.bonusByMetric.get(metric) || {
    metric,
    percent: 0,
    items: [],
  };
  current.percent += percent;
  current.items.push({
    ruleId: effect.ruleId,
    percent,
    ownerName: String(ownerName || ""),
  });
  room.bonusByMetric.set(metric, current);
}

function addMetricBonus(metricBonuses, effect, percent) {
  if (!Number.isFinite(percent) || percent === 0) {
    return;
  }

  const metric = String(effect.metric || "加成").trim() || "加成";
  const current = metricBonuses.get(metric) || {
    metric,
    percent: 0,
    items: [],
  };
  current.percent += percent;
  current.items.push({
    ruleId: effect.ruleId,
    percent,
  });
  metricBonuses.set(metric, current);
}

function getChoiceSelection({ choices, choiceId, candidateNames, limit }) {
  const saved = Array.isArray(choices?.[choiceId]) ? choices[choiceId] : null;
  const selectable = new Set(candidateNames);
  const normalized = (saved || candidateNames)
    .filter((name) => selectable.has(name))
    .slice(0, limit);

  return uniqueNames(normalized);
}

function formatTargetLabel(target, rooms) {
  if (target.kind === "any") {
    return "任意可用设施";
  }

  const matchingRooms = rooms.filter((room) =>
    matchesRoom(room, target.roomType, target.product),
  );
  if (matchingRooms.length === 0) {
    return target.roomType;
  }

  return matchingRooms.length === 1
    ? matchingRooms[0].id
    : `${target.roomType}（${matchingRooms.length} 间）`;
}

function buildTargetKey(target) {
  if (target.kind === "any") {
    return `any:${(target.allowedRoomTypes || []).join(",")}`;
  }
  return `${target.roomType}:${target.product || "all"}`;
}

function toTarget(helper) {
  if (helper?.roomType === "any") {
    return {
      kind: "any",
      allowedRoomTypes: helper.allowedRoomTypes || [],
    };
  }

  return {
    kind: "facility",
    roomType: String(helper?.roomType || "").trim(),
    product: String(helper?.product || "").trim(),
  };
}

function assignToRooms({ rooms, candidateEntries, spread = false }) {
  const assignments = [];
  const orderedRooms = [...rooms];
  if (spread) {
    const roomIndexes = new Map(orderedRooms.map((room) => [room.id, 0]));
    for (const candidate of candidateEntries) {
      const room = orderedRooms.find(
        (item) => Number(roomIndexes.get(item.id) || 0) < item.slotCount,
      );
      if (!room) {
        break;
      }
      roomIndexes.set(room.id, Number(roomIndexes.get(room.id) || 0) + 1);
      assignments.push({ ...candidate, roomId: room.id });
    }
    return assignments;
  }

  let roomIndex = 0;
  let usedInRoom = 0;
  for (const candidate of candidateEntries) {
    while (
      roomIndex < orderedRooms.length &&
      usedInRoom >= orderedRooms[roomIndex].slotCount
    ) {
      roomIndex += 1;
      usedInRoom = 0;
    }
    if (roomIndex >= orderedRooms.length) {
      break;
    }
    assignments.push({
      ...candidate,
      roomId: orderedRooms[roomIndex].id,
    });
    usedInRoom += 1;
  }
  return assignments;
}

function getRemainingRooms(rooms) {
  return rooms.flatMap((room) => {
    const used = room.assigned.length;
    const remaining = Math.max(0, room.slotCount - used);
    return remaining > 0 ? [{ ...room, slotCount: remaining }] : [];
  });
}

function isEffectAvailable(effect, sourceStates) {
  return (effect.requires || []).every(
    (requirement) =>
      getSourceCount(sourceStates, [requirement.source]) >=
      Number(requirement.min || 1),
  );
}

function applyEffect({
  effect,
  ruleId,
  rooms,
  sourceStates,
  coreAssignment,
  metricBonuses,
}) {
  if (!isEffectAvailable(effect, sourceStates)) {
    return false;
  }

  const normalizedEffect = { ...effect, ruleId };
  const targetRooms = getTargetRooms({
    target: effect.target,
    rooms,
    sourceStates,
    coreAssignment,
  });
  const addBonus = (percent, target = targetRooms, ownerName = "") => {
    if (effect.target?.scope === "metric") {
      addMetricBonus(metricBonuses, normalizedEffect, percent);
      return;
    }
    for (const room of target) {
      addRoomBonus(room, normalizedEffect, percent, ownerName);
    }
  };

  if (effect.type === "fixed") {
    addBonus(Number(effect.percent || 0));
    return true;
  }

  if (effect.type === "perSource") {
    let appliedCount = 0;
    for (const assignment of getSourceAssignments(sourceStates, [effect.source])) {
      const sourceRoom = rooms.find((room) => room.id === assignment.roomId);
      if (sourceRoom) {
        addBonus(
          Number(effect.percent || 0),
          [sourceRoom],
          assignment.name,
        );
        appliedCount += 1;
      }
    }
    return appliedCount > 0;
  }

  if (effect.type === "perSourceByProduct") {
    let appliedCount = 0;
    for (const assignment of getSourceAssignments(sourceStates, [effect.source])) {
      const sourceRoom = rooms.find((room) => room.id === assignment.roomId);
      const percent = Number(effect.values?.[sourceRoom?.product] || 0);
      if (sourceRoom && percent) {
        addBonus(percent, [sourceRoom], assignment.name);
        appliedCount += 1;
      }
    }
    return appliedCount > 0;
  }

  if (effect.type === "perSourceRoomThreshold") {
    const countByRoom = new Map();
    for (const assignment of getSourceAssignments(sourceStates, [effect.source])) {
      countByRoom.set(
        assignment.roomId,
        Number(countByRoom.get(assignment.roomId) || 0) + 1,
      );
    }
    const eligibleRooms = rooms.filter(
      (room) => Number(countByRoom.get(room.id) || 0) >= Number(effect.min || 1),
    );
    addBonus(Number(effect.percent || 0), eligibleRooms);
    return eligibleRooms.length > 0;
  }

  if (effect.type === "perSourceInCoreRoom") {
    const count = getSourceAssignments(sourceStates, [effect.source]).filter(
      (assignment) => assignment.roomId === coreAssignment?.roomId,
    ).length;
    addBonus(Number(effect.percent || 0) * count);
    return count > 0;
  }

  if (effect.type === "fixedIfSourceInCoreRoom") {
    const matched = getSourceAssignments(sourceStates, [effect.source]).some(
      (assignment) => assignment.roomId === coreAssignment?.roomId,
    );
    if (matched) {
      addBonus(Number(effect.percent || 0));
    }
    return matched;
  }

  if (effect.type === "perSourceCount") {
    const count = getSourceCount(
      sourceStates,
      effect.sources || [effect.source],
    );
    const multiplier = Math.min(
      count,
      Number.isFinite(Number(effect.cap)) ? Number(effect.cap) : count,
    );
    addBonus(Number(effect.percent || 0) * multiplier);
    return multiplier > 0;
  }

  if (effect.type === "perDistinctSourceRoom") {
    const count = new Set(
      getSourceAssignments(sourceStates, [effect.source]).map(
        (assignment) => assignment.roomId,
      ),
    ).size;
    const multiplier = Math.min(
      count,
      Number.isFinite(Number(effect.cap)) ? Number(effect.cap) : count,
    );
    addBonus(Number(effect.percent || 0) * multiplier);
    return multiplier > 0;
  }

  if (effect.type === "perLayoutFacilityCount") {
    const count = rooms.filter(
      (room) => room.facilityType === effect.facilityType,
    ).length;
    addBonus(Number(effect.percent || 0) * count);
    return count > 0;
  }

  return false;
}

function getSystemPercentRules(systemId, ruleIds) {
  const rules = SYSTEM_PERCENT_RULES[systemId] || [];
  if (!Array.isArray(ruleIds)) {
    return rules;
  }

  const allowedIds = new Set(ruleIds);
  return rules.filter((rule) => allowedIds.has(rule.id));
}

export function getRiicSystemPercentRuleCount(systemId, ruleIds) {
  return getSystemPercentRules(systemId, ruleIds).length;
}

export function planRiicSystemPercentAssessment({
  systemId,
  ruleIds,
  operators = [],
  layoutFacts,
  groupMembers = {},
  choices = {},
  getCoreRequirement,
} = {}) {
  const rules = getSystemPercentRules(systemId, ruleIds);
  const operatorByName = normalizeOperators(operators);
  const rooms = buildRooms(layoutFacts);
  const sourceStates = new Map();
  const ruleStates = new Map();
  const fixedTargets = new Map();
  const anyCandidates = [];
  const manualChoices = [];

  for (const rule of rules) {
    const coreOperator = operatorByName.get(rule.core.name);
    const requirement =
      typeof getCoreRequirement === "function"
        ? getCoreRequirement(rule.core.name, rule.core.roomType)
        : null;
    const coreReady = meetsRequirement(coreOperator, requirement);
    const state = {
      id: rule.id,
      core: rule.core,
      coreOperator,
      requirement,
      status: !coreOperator
        ? "notOwned"
        : !coreReady
          ? "skillLocked"
          : "pending",
      sources: new Map(),
      effects: rule.effects || [],
    };
    ruleStates.set(rule.id, state);
    if (!coreReady) {
      continue;
    }

    const coreSourceId = `${rule.id}:core`;
    state.sources.set("core", coreSourceId);
    addCandidate(sourceStates, coreSourceId, {
      name: rule.core.name,
      sourceIds: [coreSourceId],
      ruleIds: [rule.id],
      role: "core",
    });

    const coreTarget = toTarget(rule.core);
    const targetKey = buildTargetKey(coreTarget);
    if (coreTarget.kind === "any") {
      anyCandidates.push({
        name: rule.core.name,
        sourceIds: [coreSourceId],
        ruleIds: [rule.id],
        role: "core",
        target: coreTarget,
      });
    } else {
      if (!fixedTargets.has(targetKey)) {
        fixedTargets.set(targetKey, { target: coreTarget, candidates: [] });
      }
      fixedTargets.get(targetKey).candidates.push({
        name: rule.core.name,
        sourceIds: [coreSourceId],
        ruleIds: [rule.id],
        role: "core",
        required: true,
      });
    }

    for (const helper of rule.helpers || []) {
      const sourceId = `${rule.id}:${helper.id}`;
      state.sources.set(helper.id, sourceId);
      const candidateNames = helper.group
        ? (groupMembers?.[helper.group] || []).filter(
            (name) => !helper.excludeCore || name !== rule.core.name,
          )
        : [helper.name];
      const ownedNames = candidateNames.filter((name) => operatorByName.has(name));

      for (const name of ownedNames) {
        const candidate = {
          name,
          sourceIds: [sourceId],
          ruleIds: [rule.id],
          role: helper.group ? "related" : "helper",
          required: false,
        };
        addCandidate(sourceStates, sourceId, candidate);
        const target = toTarget(helper);
        const helperTargetKey = buildTargetKey(target);
        if (target.kind === "any") {
          anyCandidates.push({ ...candidate, target });
        } else {
          if (!fixedTargets.has(helperTargetKey)) {
            fixedTargets.set(helperTargetKey, { target, candidates: [] });
          }
          fixedTargets.get(helperTargetKey).candidates.push(candidate);
        }
      }
    }
  }

  const assignedNames = new Set();
  const commitAssignments = (assignments) => {
    for (const assignment of assignments) {
      if (assignedNames.has(assignment.name)) {
        continue;
      }
      const room = rooms.find((item) => item.id === assignment.roomId);
      if (!room || room.assigned.length >= room.slotCount) {
        continue;
      }
      const normalized = {
        name: assignment.name,
        roomId: assignment.roomId,
        role: assignment.role,
        ruleIds: uniqueNames(assignment.ruleIds),
      };
      room.assigned.push(normalized);
      assignedNames.add(normalized.name);
      addAssignedSource(sourceStates, assignment.sourceIds, normalized);
    }
  };

  for (const [targetKey, targetEntry] of fixedTargets.entries()) {
    const candidateByName = new Map();
    for (const candidate of targetEntry.candidates) {
      const current = candidateByName.get(candidate.name);
      candidateByName.set(
        candidate.name,
        current
          ? {
              ...current,
              sourceIds: uniqueNames([
                ...current.sourceIds,
                ...candidate.sourceIds,
              ]),
              ruleIds: uniqueNames([...current.ruleIds, ...candidate.ruleIds]),
              required: current.required || candidate.required,
            }
          : candidate,
      );
    }

    const candidates = [...candidateByName.values()].filter(
      (candidate) => !assignedNames.has(candidate.name),
    );
    const matchingRooms = rooms.filter((room) =>
      matchesRoom(
        room,
        targetEntry.target.roomType,
        targetEntry.target.product,
      ),
    );
    const availableSlots = matchingRooms.reduce(
      (total, room) => total + Math.max(0, room.slotCount - room.assigned.length),
      0,
    );
    const requiredCandidates = candidates.filter((candidate) => candidate.required);
    const optionalCandidates = candidates.filter((candidate) => !candidate.required);
    const requiredNames = requiredCandidates.map((candidate) => candidate.name);
    const candidateNames = optionalCandidates.map((candidate) => candidate.name);
    const optionalCapacity = Math.max(0, availableSlots - requiredNames.length);
    const choiceId = `target:${targetKey}`;
    const selectedNames = getChoiceSelection({
      choices,
      choiceId,
      candidateNames,
      limit: optionalCapacity,
    });
    if (candidateNames.length > optionalCapacity) {
      manualChoices.push({
        id: choiceId,
        label: formatTargetLabel(targetEntry.target, rooms),
        candidateNames: candidateNames,
        selectedNames,
        limit: optionalCapacity,
        requiredNames,
      });
    }
    const selectedCandidates = [...requiredCandidates, ...optionalCandidates].filter(
      (candidate) =>
        requiredNames.includes(candidate.name) ||
        selectedNames.includes(candidate.name),
    );
    commitAssignments(
      assignToRooms({
        rooms: getRemainingRooms(matchingRooms),
        candidateEntries: selectedCandidates,
      }),
    );
  }

  const anyByName = new Map();
  for (const candidate of anyCandidates) {
    if (assignedNames.has(candidate.name)) {
      continue;
    }
    const current = anyByName.get(candidate.name);
      anyByName.set(
      candidate.name,
      current
        ? {
            ...current,
            sourceIds: uniqueNames([...current.sourceIds, ...candidate.sourceIds]),
            ruleIds: uniqueNames([...current.ruleIds, ...candidate.ruleIds]),
            required: current.required || candidate.required,
            target: {
              kind: "any",
              allowedRoomTypes: uniqueNames([
                ...current.target.allowedRoomTypes,
                ...candidate.target.allowedRoomTypes,
              ]),
            },
          }
        : candidate,
    );
  }
  const anyEntries = [...anyByName.values()];
  const anyRooms = getRemainingRooms(rooms).filter(
    (room) =>
      !anyEntries[0]?.target?.allowedRoomTypes?.length ||
      anyEntries.some(
        (candidate) =>
          !candidate.target.allowedRoomTypes.length ||
          candidate.target.allowedRoomTypes.includes(room.facilityType),
      ),
  );
  const anyCapacity = anyRooms.reduce((total, room) => total + room.slotCount, 0);
  const anyChoiceId = "target:any";
  const anyRequiredEntries = anyEntries.filter((candidate) => candidate.required);
  const anyOptionalEntries = anyEntries.filter((candidate) => !candidate.required);
  const anyRequiredNames = anyRequiredEntries.map((candidate) => candidate.name);
  const anyCandidateNames = anyOptionalEntries.map((candidate) => candidate.name);
  const anyOptionalCapacity = Math.max(0, anyCapacity - anyRequiredNames.length);
  const anySelectedNames = getChoiceSelection({
    choices,
    choiceId: anyChoiceId,
    candidateNames: anyCandidateNames,
    limit: anyOptionalCapacity,
  });
  if (anyCandidateNames.length > anyOptionalCapacity) {
    manualChoices.push({
      id: anyChoiceId,
      label: "任意可用设施",
      candidateNames: anyCandidateNames,
      selectedNames: anySelectedNames,
      limit: anyOptionalCapacity,
      requiredNames: anyRequiredNames,
    });
  }
  const anySelectedEntries = [...anyRequiredEntries, ...anyOptionalEntries]
    .filter(
      (candidate) =>
        anyRequiredNames.includes(candidate.name) ||
        anySelectedNames.includes(candidate.name),
    )
    .filter((candidate) => !assignedNames.has(candidate.name));
  const anyAssignments = [];
  for (const candidate of anySelectedEntries) {
    const allowedRooms = getRemainingRooms(rooms).filter(
      (room) =>
        !candidate.target.allowedRoomTypes.length ||
        candidate.target.allowedRoomTypes.includes(room.facilityType),
    );
    const assignment = assignToRooms({
      rooms: allowedRooms,
      candidateEntries: [candidate],
      spread: true,
    })[0];
    if (assignment) {
      anyAssignments.push(assignment);
      commitAssignments([assignment]);
    }
  }

  const metricBonuses = new Map();
  const ruleResults = [];
  for (const rule of rules) {
    const state = ruleStates.get(rule.id);
    if (!state || state.status !== "pending") {
      ruleResults.push({
        id: rule.id,
        core: rule.core.name,
        status: state?.status || "notRegistered",
        activeEffectCount: 0,
      });
      continue;
    }

    const coreSourceId = state.sources.get("core");
    const coreAssignment = getSourceAssignments(sourceStates, [coreSourceId])[0];
    if (!coreAssignment) {
      ruleResults.push({
        id: rule.id,
        core: rule.core.name,
        status: "noSlot",
        activeEffectCount: 0,
      });
      continue;
    }

    const localSources = new Map();
    for (const [sourceKey, sourceId] of state.sources.entries()) {
      localSources.set(sourceKey, {
        candidates: sourceStates.get(sourceId)?.candidates || [],
        assigned: sourceStates.get(sourceId)?.assigned || [],
      });
    }
    const activeEffectCount = state.effects.filter((effect) =>
      applyEffect({
        effect,
        ruleId: rule.id,
        rooms,
        sourceStates: localSources,
        coreAssignment,
        metricBonuses,
      }),
    ).length;
    ruleResults.push({
      id: rule.id,
      core: rule.core.name,
      status: activeEffectCount > 0 ? "active" : "conditionMissing",
      activeEffectCount,
    });
  }

  return {
    registeredRuleCount: rules.length,
    rooms: rooms.map((room) => ({
      ...room,
      bonusByMetric: [...room.bonusByMetric.values()],
    })),
    metricBonuses: [...metricBonuses.values()],
    manualChoices,
    ruleResults,
    activeRuleCount: ruleResults.filter((rule) => rule.status === "active").length,
    unavailableRuleCount: ruleResults.filter(
      (rule) =>
        rule.status === "notOwned" ||
        rule.status === "skillLocked" ||
        rule.status === "noSlot" ||
        rule.status === "conditionMissing",
    ).length,
  };
}
