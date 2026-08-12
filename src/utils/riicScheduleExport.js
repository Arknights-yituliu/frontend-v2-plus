const MAA_ROOM_TYPE_BY_FACILITY = Object.freeze({
  control: "control",
  manufacture: "manufacture",
  trading: "trading",
  power: "power",
  meeting: "meeting",
  office: "hire",
  hire: "hire",
  dormitory: "dormitory",
  processing: "processing",
  training: "training",
});

const MAA_PRODUCT_BY_PRODUCT = Object.freeze({
  lmd: "LMD",
  experience: "Battle Record",
  gold: "Pure Gold",
  orundum: "Originium Shard",
});

const ROOM_TYPES_WITH_PRODUCT = new Set(["manufacture", "trading"]);

function getOperatorName(operator) {
  return String(operator?.name || "").trim();
}

function getRoomOperators(room) {
  return (room?.operators || []).map(getOperatorName).filter(Boolean);
}

function getMaaRoomType(facility) {
  return MAA_ROOM_TYPE_BY_FACILITY[String(facility || "").trim()] || null;
}

function getRoomSortValue(room) {
  const stationIndex = Number(room?.stationIndex);
  return Number.isInteger(stationIndex) && stationIndex >= 0
    ? stationIndex
    : Number.MAX_SAFE_INTEGER;
}

function getTimeInMinutes(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ""));
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function getDurationMinutes(startTime, endTime) {
  const start = getTimeInMinutes(startTime);
  const end = getTimeInMinutes(endTime);
  if (start === null || end === null) {
    return 0;
  }

  const duration = (end - start + 24 * 60) % (24 * 60);
  return duration || 24 * 60;
}

function getPeriod(startTime, endTime) {
  if (getTimeInMinutes(startTime) === null || getTimeInMinutes(endTime) === null) {
    return [];
  }

  if (startTime < endTime) {
    return [[startTime, endTime]];
  }

  return [
    [startTime, "23:59"],
    ["00:00", endTime],
  ];
}

function getRoomSettingsOverride(room, stateIndex, roomSettingOverrides) {
  const key = `${stateIndex}:${String(room?.key || "").trim()}`;
  const value = roomSettingOverrides?.[key];
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    ["sort", "autofill", "skip"].flatMap((field) =>
      typeof value[field] === "boolean" ? [[field, value[field]]] : [],
    ),
  );
}

function createMaaRoom(room, stateIndex, roomSettingOverrides) {
  const operators = getRoomOperators(room);
  const maaRoom = {
    operators,
    sort: ["control", "manufacture", "trading"].includes(room?.facility),
  };

  if (room?.facility === "dormitory") {
    maaRoom.sort = false;
    maaRoom.autofill = true;
  } else if (operators.length === 0) {
    maaRoom.skip = true;
  }

  if (ROOM_TYPES_WITH_PRODUCT.has(room?.facility)) {
    const product = MAA_PRODUCT_BY_PRODUCT[room?.product];
    if (product) {
      maaRoom.product = product;
    }
  }

  if (room?.facility === "meeting" && operators.length < 2) {
    maaRoom.autofill = true;
  }

  return {
    ...maaRoom,
    ...getRoomSettingsOverride(room, stateIndex, roomSettingOverrides),
  };
}

function createPlanRooms(rooms, stateIndex, roomSettingOverrides) {
  const byType = new Map();

  for (const room of rooms || []) {
    const roomType = getMaaRoomType(room?.facility);
    if (!roomType) {
      continue;
    }

    const entries = byType.get(roomType) || [];
    entries.push(room);
    byType.set(roomType, entries);
  }

  const maaRooms = {};
  for (const [roomType, facilityRooms] of byType.entries()) {
    const sortedRooms = [...facilityRooms].sort(
      (left, right) => getRoomSortValue(left) - getRoomSortValue(right),
    );

    if (
      roomType !== "dormitory" &&
      sortedRooms.every((room) => getRoomOperators(room).length === 0) &&
      !sortedRooms.some(
        (room) =>
          Object.keys(
            getRoomSettingsOverride(room, stateIndex, roomSettingOverrides),
          ).length > 0,
      )
    ) {
      continue;
    }

    maaRooms[roomType] = sortedRooms.map((room) =>
      createMaaRoom(room, stateIndex, roomSettingOverrides),
    );
  }

  return maaRooms;
}

function getDroneSetting(state, droneTarget, droneOrder) {
  const targetKey = String(droneTarget || "").trim();
  if (!targetKey) {
    return null;
  }

  const targetRoom = (state?.rooms || []).find(
    (room) => String(room?.key || "") === targetKey,
  );
  if (!targetRoom || !["trading", "manufacture"].includes(targetRoom.facility)) {
    return null;
  }

  const stationIndex = Number(targetRoom.stationIndex);
  return {
    enable: true,
    room: targetRoom.facility,
    index: Number.isInteger(stationIndex) && stationIndex >= 0 ? stationIndex + 1 : 1,
    rule: "all",
    order: droneOrder === "post" ? "post" : "pre",
  };
}

function getFiammettaSetting(shift) {
  const source = shift?.fiammetta;
  return {
    enable: source?.enable === true,
    target: String(source?.target || "").trim(),
    order: source?.order === "post" ? "post" : "pre",
  };
}

function createLegacyScheduleType(state, planTimes) {
  const scheduleType = {
    planTimes,
    trading: 0,
    manufacture: 0,
    power: 0,
    dormitory: 0,
  };

  for (const room of state?.rooms || []) {
    const facility = String(room?.facility || "").trim();
    if (Object.prototype.hasOwnProperty.call(scheduleType, facility)) {
      scheduleType[facility] += 1;
    }
  }

  return scheduleType;
}

/**
 * Serializes the assembled preview only. It deliberately does not inspect or
 * score candidate data: all schedule choices have already happened upstream.
 */
export function buildRiicMaaScheduleFromPreview({
  preview,
  shifts,
  droneTarget,
  droneOrder = "pre",
  shiftMode,
  title = "一图流基建排班表",
  author = "",
  description = "",
  roomSettingOverrides = {},
  hasFiammetta = false,
} = {}) {
  const states = Array.isArray(preview?.states) ? preview.states : [];
  if (states.length === 0) {
    throw new Error("No RIIC schedule preview is available");
  }

  const warnings = new Set();
  const plans = states.map((state, index) => {
    const shift = shifts?.[index] || {};
    const nextShift = shifts?.[(index + 1) % states.length] || {};
    const name = String(shift?.name || `班次 ${index + 1}`).trim();
    const time = String(shift?.time || "").trim();
    const nextTime = String(nextShift?.time || "").trim();
    const duration = getDurationMinutes(time, nextTime);
    const period = getPeriod(time, nextTime);
    const drones = getDroneSetting(state, droneTarget, droneOrder);
    const fiammetta = getFiammettaSetting(shift);
    const usesAlternatingDailyPlans = shiftMode === "once" && states.length > 1;

    if (!duration || period.length === 0) {
      warnings.add(`“${name}”的开始时间无效，未写入时间段。`);
    }
    if (usesAlternatingDailyPlans) {
      warnings.add(
        "一天一换为隔日 A/B 轮换，已保留两份计划，但未写入会重叠的时间段。",
      );
    }
    if (!drones && droneTarget) {
      warnings.add("无人机目标未匹配到可导出的贸易站或制造站。");
    }

    const plan = {
      name,
      duration: duration || Math.round(Number(state?.durationHours || 0) * 60),
      rooms: createPlanRooms(state?.rooms, index, roomSettingOverrides),
    };

    const shiftDescription = String(shift?.description || "").trim();
    const shiftDescriptionPost = String(shift?.descriptionPost || "").trim();
    if (shiftDescription) {
      plan.description = shiftDescription;
    }
    if (shiftDescriptionPost) {
      plan.description_post = shiftDescriptionPost;
    }
    if (period.length && !usesAlternatingDailyPlans) {
      plan.period = period;
    }
    if (drones) {
      plan.drones = drones;
    }
    if (hasFiammetta) {
      plan.Fiammetta = fiammetta;
      if (fiammetta.enable && !fiammetta.target) {
        warnings.add(`“${name}”已启用菲亚梅塔，但未选择回复目标。`);
      }
    }

    return plan;
  });

  const planTimes = plans.length;
  const scheduleType = createLegacyScheduleType(states[0], planTimes);

  return {
    schedule: {
      planTimes: `${planTimes}班`,
      scheduleType,
      title: String(title || "一图流基建排班表").trim(),
      author: String(author || "").trim(),
      description:
        String(description || "").trim() || "由一图流基建排班表生成器导出。",
      plans,
    },
    warnings: [...warnings],
  };
}
