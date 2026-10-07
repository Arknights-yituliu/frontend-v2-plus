import { inferScheduleLayout } from "/src/vendor/riic-efficiency/dist/index.js";

const ROOM_TYPES = Object.freeze([
  "control",
  "trading",
  "manufacture",
  "power",
  "meeting",
  "processing",
  "hire",
  "training",
  "dormitory",
]);

const ROOM_LEVEL_RANGES = Object.freeze({
  control: 5,
  trading: 3,
  manufacture: 3,
  power: 3,
  meeting: 3,
  processing: 3,
  hire: 3,
  training: 3,
  dormitory: 5,
});
const ROOM_COUNT_LIMITS = Object.freeze({
  control: 1,
  trading: 5,
  manufacture: 5,
  power: 3,
  meeting: 1,
  processing: 1,
  hire: 1,
  training: 1,
  dormitory: 4,
});

const DEFAULT_ROOM_LEVELS = Object.freeze({
  control: 5,
  trading: 3,
  manufacture: 3,
  power: 3,
  meeting: 3,
  processing: 3,
  hire: 3,
  training: 3,
  dormitory: 1,
});

const VARIABLE_POSITION_TYPES = Object.freeze([
  "trading",
  "manufacture",
  "power",
]);
const VARIABLE_POSITIONS = Object.freeze([
  "B101",
  "B102",
  "B103",
  "B201",
  "B202",
  "B203",
  "B301",
  "B302",
  "B303",
]);
const DORMITORY_POSITIONS = Object.freeze([
  "B104",
  "B204",
  "B304",
  "B404",
]);
const FIXED_POSITIONS = Object.freeze({
  processing: "B105",
  hire: "B205",
  training: "B305",
});
const ROOM_LABELS = Object.freeze({
  control: "控制中枢",
  trading: "贸易站",
  manufacture: "制造站",
  power: "发电站",
  meeting: "会客室",
  processing: "加工站",
  hire: "办公室",
  training: "训练室",
  dormitory: "宿舍",
});

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTypePositions(type) {
  if (VARIABLE_POSITION_TYPES.includes(type)) {
    return VARIABLE_POSITIONS;
  }
  if (type === "dormitory") {
    return DORMITORY_POSITIONS;
  }
  if (FIXED_POSITIONS[type]) {
    return [FIXED_POSITIONS[type]];
  }
  return [];
}

export function getRiicMaaRoomSortValue(room, roomIndexAssignments = {}) {
  const assignedIndex = Number(
    roomIndexAssignments?.[String(room?.key || "").trim()],
  );
  if (Number.isInteger(assignedIndex) && assignedIndex >= 1) {
    return assignedIndex - 1;
  }

  const stationIndex = Number(room?.stationIndex);
  return Number.isInteger(stationIndex) && stationIndex >= 0
    ? stationIndex
    : Number.MAX_SAFE_INTEGER;
}

export function normalizeRiicLayoutType(value) {
  const type = String(value || "").trim();
  if (type === "office") {
    return "hire";
  }
  if (type === "workshop") {
    return "processing";
  }
  return type;
}

function normalizeLayoutEntries(layout) {
  if (!Array.isArray(layout)) {
    throw new Error("布局错误：layout 必须是数组");
  }
  if (layout.length === 0) {
    throw new Error("布局错误：layout 不能为空");
  }

  const normalized = layout.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`布局错误：layout 第 ${index + 1} 项不是有效设施`);
    }

    const type = normalizeRiicLayoutType(entry.type);
    const maxLevel = ROOM_LEVEL_RANGES[type];
    if (!maxLevel) {
      throw new Error(`布局错误：layout 第 ${index + 1} 项包含无法识别的设施`);
    }
    if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > maxLevel) {
      throw new Error(
        `布局错误：${ROOM_LABELS[type]}等级必须为 1 至 ${maxLevel} 级`,
      );
    }

    return { ...entry, type };
  });

  const counts = new Map(ROOM_TYPES.map((type) => [type, 0]));
  for (const entry of normalized) {
    counts.set(entry.type, counts.get(entry.type) + 1);
    if (counts.get(entry.type) > ROOM_COUNT_LIMITS[entry.type]) {
      throw new Error(
        `布局错误：${ROOM_LABELS[entry.type]}最多建设 ${ROOM_COUNT_LIMITS[entry.type]} 间`,
      );
    }
  }
  if (
    VARIABLE_POSITION_TYPES.reduce(
      (total, type) => total + counts.get(type),
      0,
    ) > VARIABLE_POSITIONS.length
  ) {
    throw new Error("布局错误：贸易站、制造站和发电站合计最多建设 9 间");
  }

  return normalized;
}

export function validateRiicLayoutPositionOrder(layout) {
  const normalized = normalizeLayoutEntries(layout);
  const positionable = normalized.filter(
    (entry) => getTypePositions(entry.type).length > 0,
  );
  const specified = positionable.filter((entry) =>
    Object.prototype.hasOwnProperty.call(entry, "position"),
  );

  if (specified.length === 0) {
    return normalized;
  }
  if (specified.length !== positionable.length) {
    throw new Error("布局错误：position 字段不完整");
  }

  const usedPositions = new Set();
  for (const entry of positionable) {
    const allowedPositions = getTypePositions(entry.type);
    if (
      typeof entry.position !== "string" ||
      !allowedPositions.includes(entry.position)
    ) {
      throw new Error(
        `布局错误：${ROOM_LABELS[entry.type]}的位置 ${String(entry.position)} 无效`,
      );
    }
    if (usedPositions.has(entry.position)) {
      throw new Error(`布局错误：位置 ${entry.position} 被多个设施重复使用`);
    }
    usedPositions.add(entry.position);
  }

  let variablePositionIndex = 0;
  for (const type of VARIABLE_POSITION_TYPES) {
    const entries = normalized.filter((entry) => entry.type === type);
    entries.forEach((entry, index) => {
      const expected = VARIABLE_POSITIONS[variablePositionIndex + index];
      if (entry.position !== expected) {
        throw new Error(
          `布局错误：${ROOM_LABELS[type]}的位置顺序与 layout 顺序不一致`,
        );
      }
    });
    variablePositionIndex += entries.length;
  }

  for (const [type, expected] of Object.entries(FIXED_POSITIONS)) {
    if (
      normalized.some(
        (entry) => entry.type === type && entry.position !== expected,
      )
    ) {
      throw new Error(
        `布局错误：${ROOM_LABELS[type]}的位置顺序与 layout 顺序不一致`,
      );
    }
  }
  normalized
    .filter((entry) => entry.type === "dormitory")
    .forEach((entry, index) => {
      if (entry.position !== DORMITORY_POSITIONS[index]) {
        throw new Error("布局错误：宿舍的位置顺序与 layout 顺序不一致");
      }
    });

  return normalized;
}

export function assignRiicLayoutPositions(layout) {
  const normalized = normalizeLayoutEntries(layout);
  const indexesByType = new Map(ROOM_TYPES.map((type) => [type, []]));
  normalized.forEach((entry, index) => indexesByType.get(entry.type).push(index));

  const positionsByIndex = new Map();
  let variablePositionIndex = 0;
  for (const type of VARIABLE_POSITION_TYPES) {
    for (const index of indexesByType.get(type)) {
      const position = VARIABLE_POSITIONS[variablePositionIndex];
      if (!position) {
        throw new Error("布局错误：贸易站、制造站和发电站合计最多建设 9 间");
      }
      positionsByIndex.set(index, position);
      variablePositionIndex += 1;
    }
  }

  for (const [type, position] of Object.entries(FIXED_POSITIONS)) {
    for (const index of indexesByType.get(type)) {
      positionsByIndex.set(index, position);
    }
  }
  for (const [roomIndex, layoutIndex] of indexesByType
    .get("dormitory")
    .entries()) {
    const code = DORMITORY_POSITIONS[roomIndex];
    if (!code) {
      throw new Error("布局错误：最多建设 4 间宿舍");
    }
    positionsByIndex.set(layoutIndex, code);
  }

  return normalized.map((entry, index) => {
    const next = { ...entry };
    const position = positionsByIndex.get(index);
    if (position) {
      next.position = position;
    } else {
      delete next.position;
    }
    return next;
  });
}

export function inferRiicScheduleLayout(plans) {
  const inferred = inferScheduleLayout(Array.isArray(plans) ? plans : []);
  if (!Array.isArray(inferred) || inferred.length === 0) {
    throw new Error("布局错误：无法从排班推断设施布局");
  }
  return normalizeLayoutEntries(inferred);
}

export function reconcileRiicScheduleLayout(
  layout,
  fallbackLayout,
  roomCounts = {},
) {
  const source = Array.isArray(layout) && layout.length > 0
    ? normalizeLayoutEntries(layout)
    : [];
  const fallback = Array.isArray(fallbackLayout)
    ? normalizeLayoutEntries(fallbackLayout)
    : [];
  const sourceByType = new Map(ROOM_TYPES.map((type) => [type, []]));
  const fallbackByType = new Map(ROOM_TYPES.map((type) => [type, []]));
  for (const entry of source) {
    sourceByType.get(entry.type).push(entry);
  }
  for (const entry of fallback) {
    fallbackByType.get(entry.type).push(entry);
  }

  const reconciled = [];
  for (const type of ROOM_TYPES) {
    const sourceEntries = sourceByType.get(type);
    const fallbackEntries = fallbackByType.get(type);
    const rawCount = Number(roomCounts?.[type]);
    const targetCount = Number.isInteger(rawCount) && rawCount >= 0
      ? rawCount
      : sourceEntries.length || fallbackEntries.length;

    for (let index = 0; index < targetCount; index += 1) {
      reconciled.push(
        sourceEntries[index]
          ? { ...sourceEntries[index] }
          : fallbackEntries[index]
            ? { ...fallbackEntries[index] }
            : { type, level: DEFAULT_ROOM_LEVELS[type] },
      );
    }
  }

  return assignRiicLayoutPositions(reconciled);
}

export function resolveRiicScheduleLayout({ layout, scheduleType, plans } = {}) {
  if (layout !== undefined && layout !== null) {
    return validateRiicLayoutPositionOrder(layout);
  }

  const inferred = inferRiicScheduleLayout(plans);
  const legacyCounts = {};
  for (const type of ["trading", "manufacture", "power", "dormitory"]) {
    const count = Number(scheduleType?.[type]);
    if (Number.isInteger(count) && count >= 0) {
      legacyCounts[type] = count;
    }
  }

  return reconcileRiicScheduleLayout([], inferred, legacyCounts);
}

export function createRiicScheduleLayoutFromRooms(
  rooms,
  roomIndexAssignments = {},
) {
  const roomsByType = new Map(ROOM_TYPES.map((type) => [type, []]));
  for (const room of rooms || []) {
    const type = normalizeRiicLayoutType(room?.facility);
    if (!roomsByType.has(type)) {
      continue;
    }

    const level = Number(room?.stationLevel);
    roomsByType.get(type).push({
      type,
      level: Number.isInteger(level) ? level : null,
      key: room?.key,
      stationIndex: room?.stationIndex,
    });
  }

  const layout = [];
  for (const type of ROOM_TYPES) {
    const typeRooms = roomsByType.get(type).sort(
      (left, right) =>
        getRiicMaaRoomSortValue(left, roomIndexAssignments) -
        getRiicMaaRoomSortValue(right, roomIndexAssignments),
    );
    for (const room of typeRooms) {
      layout.push({ type, level: room.level });
    }
  }

  return assignRiicLayoutPositions(layout);
}
