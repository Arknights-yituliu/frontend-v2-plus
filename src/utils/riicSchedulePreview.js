function toPositiveHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b > 0) {
    [a, b] = [b, a % b];
  }

  return a || 1;
}

function leastCommonMultiple(left, right) {
  if (left <= 0 || right <= 0) {
    return 0;
  }

  return Math.abs(left * right) / greatestCommonDivisor(left, right);
}

function getSegmentCycleHours(segments) {
  return (segments || []).reduce(
    (total, segment) => total + toPositiveHours(segment?.durationHours),
    0,
  );
}

function getSegmentAtHour(segments, hour) {
  const cycleHours = getSegmentCycleHours(segments);
  if (cycleHours <= 0) {
    return null;
  }

  let cursor = ((hour % cycleHours) + cycleHours) % cycleHours;
  for (const segment of segments) {
    const durationHours = toPositiveHours(segment?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    if (cursor < durationHours) {
      return segment;
    }
    cursor -= durationHours;
  }

  return segments?.[segments.length - 1] || null;
}

function getTimelineBoundaries(groupEntries, cycleHours) {
  const boundaries = new Set([0, cycleHours]);

  for (const entry of groupEntries) {
    const segments = entry?.candidate?.segments || [];
    const groupCycleHours = getSegmentCycleHours(segments);
    if (groupCycleHours <= 0) {
      continue;
    }

    for (
      let cycleOffset = 0;
      cycleOffset < cycleHours;
      cycleOffset += groupCycleHours
    ) {
      let segmentOffset = cycleOffset;
      boundaries.add(segmentOffset);

      for (const segment of segments) {
        segmentOffset += toPositiveHours(segment?.durationHours);
        if (segmentOffset < cycleHours) {
          boundaries.add(segmentOffset);
        }
      }
    }
  }

  return [...boundaries].sort((left, right) => left - right);
}

function getFallbackCount(candidate) {
  const configuredCount = Number(candidate?.fallback?.count || 0);
  const materializedCount = (candidate?.operators || []).filter(
    (operator) => operator?.fallback,
  ).length;

  return Math.max(configuredCount, materializedCount);
}

function getCandidateOperatorIds(candidate) {
  return new Set([
    ...(candidate?.operatorIds || []),
    ...(candidate?.operators || []).map((operator) => operator?.charId),
  ]);
}

function createRoomLabel(group, assignment) {
  const facilityLabel = group?.facilityLabel || group?.label || "";
  const shortLabel = String(group?.shortLabel || "").trim();
  const prefix = shortLabel && shortLabel !== facilityLabel ? shortLabel : "";
  const number = Number(assignment?.stationIndex) + 1;
  const suffix = Number(group?.count || 0) > 1 ? ` ${number}` : "";

  return `${prefix}${facilityLabel}${suffix}`;
}

function createRoomPreview({
  group,
  assignment,
  stateIndex,
  roomOperatorOverrides,
  productOverrides,
  invalidatedRoomKeys,
}) {
  const candidate = assignment?.candidate || {};
  const key = `${group.id}:${assignment?.stationIndex ?? 0}`;
  const overrideKey = `${stateIndex}:${key}`;
  const overriddenOperators = roomOperatorOverrides?.[overrideKey];
  const isInvalidated = invalidatedRoomKeys?.[key] === true;

  return {
    key,
    groupId: group.id,
    groupLabel: group.label,
    label: createRoomLabel(group, assignment),
    facility: group.facility,
    tone: group.tone,
    product: productOverrides?.[key] || group.candidateProduct,
    stationIndex: Number(assignment?.stationIndex || 0),
    stationLevel: assignment?.stationLevel || null,
    expectedSlots: assignment?.expectedSlots || null,
    operators: Array.isArray(overriddenOperators)
      ? overriddenOperators
      : isInvalidated
        ? []
        : candidate.operators || [],
    fallbackCount: getFallbackCount(candidate),
    effectMetrics: candidate.effectMetrics || [],
    isStatic: false,
    manuallyEdited: Array.isArray(overriddenOperators) || isInvalidated,
  };
}

function createStaticRoomPreview({
  room,
  stateIndex,
  roomOperatorOverrides,
  productOverrides,
  invalidatedRoomKeys,
}) {
  const key = String(room?.key || "").trim();
  const overrideKey = `${stateIndex}:${key}`;
  const overriddenOperators = roomOperatorOverrides?.[overrideKey];
  const isInvalidated = invalidatedRoomKeys?.[key] === true;

  return {
    key,
    groupId: "",
    groupLabel: room?.label || "",
    label: room?.label || "",
    facility: room?.facility || "dormitory",
    tone: room?.tone || room?.facility || "dormitory",
    product: productOverrides?.[key] || room?.product || "",
    stationIndex: Number(room?.stationIndex || 0),
    stationLevel: room?.stationLevel || null,
    expectedSlots: room?.expectedSlots || null,
    operators: Array.isArray(overriddenOperators)
      ? overriddenOperators
      : isInvalidated
        ? []
        : room?.operators || [],
    fallbackCount: 0,
    effectMetrics: [],
    isStatic: true,
    manuallyEdited: Array.isArray(overriddenOperators) || isInvalidated,
  };
}

function applyRoomOperatorOverride(room, stateIndex, roomOperatorOverrides) {
  const overrideKey = `${stateIndex}:${room.key}`;
  const overriddenOperators = roomOperatorOverrides?.[overrideKey];

  return Array.isArray(overriddenOperators)
    ? {
        ...room,
        operators: overriddenOperators,
        manuallyEdited: true,
      }
    : room;
}

function findStickyPlacement(groupEntries, stickyOperatorIds) {
  for (const charId of stickyOperatorIds || []) {
    for (const entry of groupEntries) {
      for (const segment of entry.candidate?.segments || []) {
        for (const assignment of segment?.stationAssignments || []) {
          if (getCandidateOperatorIds(assignment?.candidate).has(charId)) {
            return {
              charId,
              groupId: entry.group.id,
              stationIndex: Number(assignment.stationIndex || 0),
            };
          }
        }
      }
    }
  }

  return null;
}

function getStationAssignmentsForState({
  group,
  candidate,
  startHour,
  stickyPlacement,
}) {
  const segment = getSegmentAtHour(candidate.segments, startHour);
  const assignments = (segment?.stationAssignments || []).map((assignment) => ({
    ...assignment,
  }));

  if (!stickyPlacement || stickyPlacement.groupId !== group.id) {
    return assignments;
  }

  const stickyAssignment = assignments.find((assignment) =>
    getCandidateOperatorIds(assignment?.candidate).has(stickyPlacement.charId),
  );
  const targetAssignment = assignments.find(
    (assignment) =>
      Number(assignment?.stationIndex || 0) === stickyPlacement.stationIndex,
  );

  if (
    !stickyAssignment ||
    !targetAssignment ||
    stickyAssignment === targetAssignment
  ) {
    return assignments;
  }

  const stationIndex = stickyAssignment.stationIndex;
  stickyAssignment.stationIndex = targetAssignment.stationIndex;
  targetAssignment.stationIndex = stationIndex;

  return assignments;
}

function getOrderedSourceStateIndexes(stateCount, stateOrder) {
  const ordered = [];
  const seen = new Set();

  for (const value of stateOrder || []) {
    const index = Number(value);
    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < stateCount &&
      !seen.has(index)
    ) {
      ordered.push(index);
      seen.add(index);
    }
  }

  for (let index = 0; index < stateCount; index += 1) {
    if (!seen.has(index)) {
      ordered.push(index);
    }
  }

  return ordered;
}

function getPreferredDroneRoomKey({ states, stickyPlacement }) {
  if (stickyPlacement) {
    return `${stickyPlacement.groupId}:${stickyPlacement.stationIndex}`;
  }

  const rooms = states.flatMap((state) => state.rooms || []);
  const goldManufactureRoom = rooms.find(
    (room) => room.facility === "manufacture" && room.product === "gold",
  );
  if (goldManufactureRoom) {
    return goldManufactureRoom.key;
  }

  return rooms.find((room) =>
    ["trading", "manufacture"].includes(room.facility),
  )?.key;
}

/**
 * Converts an already assembled RIIC schedule into display states. It only
 * projects existing rotations, applies room-level edits, and keeps a sticky
 * drone operator in one physical room when possible.
 */
export function buildRiicSchedulePreview({
  scheduleCandidate,
  roomGroups,
  staticRooms = [],
  stateOrder = [],
  roomOperatorOverrides = {},
  productOverrides = {},
  invalidatedRoomKeys = {},
  stickyOperatorIds = [],
} = {}) {
  const groupById = new Map(
    (roomGroups || []).map((group) => [String(group?.id || ""), group]),
  );
  const groupEntries = (scheduleCandidate?.groups || [])
    .map((entry) => {
      const group = groupById.get(String(entry?.groupId || ""));
      const segments = entry?.candidate?.segments || [];
      const cycleHours = getSegmentCycleHours(segments);

      return group && cycleHours > 0
        ? {
            group,
            candidate: entry.candidate,
            cycleHours,
          }
        : null;
    })
    .filter(Boolean);

  if (groupEntries.length === 0) {
    return null;
  }

  const cycleHours = groupEntries.reduce(
    (total, entry) => leastCommonMultiple(total, entry.cycleHours),
    1,
  );
  if (cycleHours <= 0) {
    return null;
  }

  const stickyPlacement = findStickyPlacement(
    groupEntries,
    stickyOperatorIds,
  );
  const boundaries = getTimelineBoundaries(groupEntries, cycleHours);
  const rawStates = boundaries.slice(0, -1).map((startHour, index) => {
    const endHour = boundaries[index + 1];
    const rooms = [
      ...groupEntries.flatMap(({ group, candidate }) =>
        getStationAssignmentsForState({
          group,
          candidate,
          startHour,
          stickyPlacement,
        }).map((assignment) =>
          createRoomPreview({
            group,
            assignment,
            stateIndex: index,
            roomOperatorOverrides: {},
            productOverrides,
            invalidatedRoomKeys,
          }),
        ),
      ),
      ...(staticRooms || []).map((room) =>
        createStaticRoomPreview({
          room,
          stateIndex: index,
          roomOperatorOverrides: {},
          productOverrides,
          invalidatedRoomKeys,
        }),
      ),
    ];

    return {
      id: `state-${index + 1}`,
      sourceStateIndex: index,
      startHour,
      durationHours: endHour - startHour,
      rooms,
    };
  });
  const sourceIndexes = getOrderedSourceStateIndexes(
    rawStates.length,
    stateOrder,
  );
  const states = sourceIndexes.map((sourceStateIndex, index) => ({
    ...rawStates[sourceStateIndex],
    id: `state-${index + 1}`,
    index,
    rooms: rawStates[sourceStateIndex].rooms.map((room) =>
      applyRoomOperatorOverride(room, index, roomOperatorOverrides),
    ),
  }));

  const sourceKey = `${scheduleCandidate.key || "schedule"}:${cycleHours}:${states.length}:${sourceIndexes.join(",")}`;

  return {
    sourceKey,
    key: `${sourceKey}:${Object.keys(roomOperatorOverrides || {}).join(",")}:${Object.keys(productOverrides || {}).join(",")}:${Object.keys(invalidatedRoomKeys || {}).join(",")}`,
    cycleHours,
    states,
    preferredDroneRoomKey: getPreferredDroneRoomKey({
      states,
      stickyPlacement,
    }),
  };
}
