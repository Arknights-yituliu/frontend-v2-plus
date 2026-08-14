import { getRiicSameShiftBindingAtHour } from "./riic/l81-same-shift-bindings.js";

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

function getCandidateSegmentStartHours(candidate) {
  const startHours = [];
  let startHour = 0;

  for (const segment of candidate?.segments || []) {
    const durationHours = toPositiveHours(segment?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    startHours.push(startHour);
    startHour += durationHours;
  }

  return startHours;
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
  sameShiftBinding,
}) {
  const candidate = assignment?.candidate || {};
  const key = `${group.id}:${assignment?.stationIndex ?? 0}`;
  const overrideKey = `${stateIndex}:${key}`;
  const overriddenOperators = roomOperatorOverrides?.[overrideKey];
  const isInvalidated = invalidatedRoomKeys?.[key] === true;
  const operators = Array.isArray(overriddenOperators)
    ? overriddenOperators
    : isInvalidated
      ? []
      : candidate.operators || [];
  const manuallyEdited = Array.isArray(overriddenOperators) || isInvalidated;
  const controlCenterFacilityBonusPercent = Number.isFinite(
    Number(sameShiftBinding?.facilityBonusPercent),
  )
    ? Number(sameShiftBinding.facilityBonusPercent)
    : 0;
  const controlCenterOperatorBonusPercent = Number.isFinite(
    Number(sameShiftBinding?.operatorBonusPercent),
  )
    ? Number(sameShiftBinding.operatorBonusPercent)
    : 0;
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
    operators,
    efficiency: null,
    fallbackCount: getFallbackCount(candidate),
    effectMetrics: candidate.effectMetrics || [],
    controlCenterFacilityBonusPercent,
    controlCenterOperatorBonusPercent,
    controlCenterOperatorBonuses: sameShiftBinding?.operatorBonuses || [],
    sameShiftBindingStatus: sameShiftBinding?.status || "notApplicable",
    sameShiftBindings: sameShiftBinding?.bindings || [],
    isStatic: false,
    manuallyEdited,
    efficiencySource: {
      candidate,
      candidateTotalPercent: candidate?.totalPercent,
      estimatedControlCenterOperatorBonusPercent:
        candidate?.controlCenterOperatorBonusPercent,
    },
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
  const stateOperators = room?.operatorsByStateIndex?.[stateIndex];

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
        : Array.isArray(stateOperators)
          ? stateOperators
          : room?.operators || [],
    efficiency: null,
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
        efficiency: null,
        manuallyEdited: true,
      }
    : room;
}

function invalidateSameShiftBindingsForManualEdits(rooms = []) {
  const hasEditedControlCenter = rooms.some(
    (room) => room?.facility === "control" && room?.manuallyEdited,
  );

  return rooms.map((room) => {
    const hasSameShiftBinding = (room?.sameShiftBindings || []).length > 0;
    const requiresReview =
      hasSameShiftBinding &&
      room?.facility !== "control" &&
      (room?.manuallyEdited || hasEditedControlCenter);
    if (!requiresReview) {
      return room;
    }

    return {
      ...room,
      controlCenterFacilityBonusPercent: 0,
      controlCenterOperatorBonusPercent: 0,
      controlCenterOperatorBonuses: [],
      sameShiftBindingStatus: "manualReviewRequired",
      sameShiftBindings: [],
      sameShiftBindingInvalidatedByManualEdit: true,
    };
  });
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
    return assignments.sort(
      (left, right) =>
        Number(left?.stationIndex || 0) - Number(right?.stationIndex || 0),
    );
  }

  const stationIndex = stickyAssignment.stationIndex;
  stickyAssignment.stationIndex = targetAssignment.stationIndex;
  targetAssignment.stationIndex = stationIndex;

  return assignments.sort(
    (left, right) =>
      Number(left?.stationIndex || 0) - Number(right?.stationIndex || 0),
  );
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

  if (ordered.length > 0) {
    return ordered;
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
  shiftGroupBindings = [],
} = {}) {
  const groupById = new Map(
    (roomGroups || []).map((group) => [String(group?.id || ""), group]),
  );
  const candidateEntriesByGroupId = new Map(
    (scheduleCandidate?.groups || []).flatMap((entry) => {
      const groupId = String(entry?.groupId || "");
      return groupId ? [[groupId, entry]] : [];
    }),
  );
  const orderedGroups =
    roomGroups?.length > 0
      ? roomGroups
      : (scheduleCandidate?.groups || [])
          .map((entry) => groupById.get(String(entry?.groupId || "")))
          .filter(Boolean);
  const groupEntries = orderedGroups
    .map((group) => {
      const entry = candidateEntriesByGroupId.get(String(group?.id || ""));
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
  const controlGroupEntry =
    groupEntries.find((entry) => entry.group?.facility === "control") || null;
  const boundaries = getTimelineBoundaries(groupEntries, cycleHours);
  // The control-center rotation defines the displayed shift cards. Other
  // rooms may have extra internal boundaries that must not hide a control team.
  const stateStartHours =
    getCandidateSegmentStartHours(controlGroupEntry?.candidate).length > 0
      ? getCandidateSegmentStartHours(controlGroupEntry?.candidate)
      : boundaries.slice(0, -1);
  const rawStates = stateStartHours.map((startHour, index) => {
    const endHour = stateStartHours[index + 1] ?? cycleHours;
    const rooms = [
      ...groupEntries.flatMap(({ group, candidate }) =>
        getStationAssignmentsForState({
          group,
          candidate,
          startHour,
          stickyPlacement,
        }).map((assignment) => {
          const sameShiftBinding =
            group?.facility === "control" || !controlGroupEntry
              ? null
              : getRiicSameShiftBindingAtHour({
                  controlCandidate: controlGroupEntry.candidate,
                  group,
                  candidate: assignment?.candidate,
                  startHour,
                });

          return createRoomPreview({
            group,
            assignment,
            stateIndex: index,
            roomOperatorOverrides: {},
            productOverrides,
            invalidatedRoomKeys,
            sameShiftBinding,
          });
        }),
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
    rooms: invalidateSameShiftBindingsForManualEdits(
      rawStates[sourceStateIndex].rooms.map((room) =>
        applyRoomOperatorOverride(room, index, roomOperatorOverrides),
      ),
    ),
  }));

  const sourceKey = `${scheduleCandidate.key || "schedule"}:${cycleHours}:${states.length}:${sourceIndexes.join(",")}`;

  return {
    sourceKey,
    key: `${sourceKey}:${Object.keys(roomOperatorOverrides || {}).join(",")}:${Object.keys(productOverrides || {}).join(",")}:${Object.keys(invalidatedRoomKeys || {}).join(",")}`,
    cycleHours,
    states,
    sameShiftBindingSummary: Array.isArray(
      scheduleCandidate?.sameShiftBindingSummary,
    )
      ? scheduleCandidate.sameShiftBindingSummary
      : [],
    shiftGroupBindings: Array.isArray(shiftGroupBindings)
      ? shiftGroupBindings
      : [],
    preferredDroneRoomKey: getPreferredDroneRoomKey({
      states,
      stickyPlacement,
    }),
  };
}
