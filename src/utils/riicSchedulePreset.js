import { getRiicRoomGroupStaffingRequirement } from "/src/utils/riicStaffingRequirement.js";

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function getOwnedOperatorMap(ownedOperators) {
  const byId = new Map();

  for (const source of ownedOperators || []) {
    const charId = normalizeOperatorId(source?.charId);
    if (!charId) {
      continue;
    }

    const candidate = {
      charId,
      name: String(source?.name || charId).trim() || charId,
      elite: toNonNegativeInteger(source?.elite),
      level: toNonNegativeInteger(source?.level, 1),
    };
    const current = byId.get(charId);
    if (
      !current ||
      candidate.elite > current.elite ||
      (candidate.elite === current.elite && candidate.level > current.level)
    ) {
      byId.set(charId, candidate);
    }
  }

  return byId;
}

function isQualified(operator, minimumElite, trainingMode) {
  return Boolean(
    operator &&
      (trainingMode === "ideal" ||
        operator.elite >= toNonNegativeInteger(minimumElite)),
  );
}

function getConditionResult(preset, ownedById, trainingMode) {
  const missingOperatorIds = [];

  for (const requirement of preset?.conditions?.operators || []) {
    const charId = normalizeOperatorId(requirement?.operatorId);
    if (
      charId &&
      !isQualified(
        ownedById.get(charId),
        requirement?.minimumElite,
        trainingMode,
      )
    ) {
      missingOperatorIds.push(charId);
    }
  }

  for (const group of preset?.conditions?.operatorGroups || []) {
    const qualifiedCount = (group?.operators || []).filter((requirement) =>
      isQualified(
        ownedById.get(normalizeOperatorId(requirement?.operatorId)),
        requirement?.minimumElite,
        trainingMode,
      ),
    ).length;
    if (qualifiedCount < toNonNegativeInteger(group?.minimumCount)) {
      missingOperatorIds.push(
        ...((group?.operators || [])
          .map((requirement) => normalizeOperatorId(requirement?.operatorId))
          .filter(Boolean)),
      );
    }
  }

  return {
    available: missingOperatorIds.length === 0,
    missingOperatorIds: [...new Set(missingOperatorIds)],
  };
}

function getPlacementOperatorIds(placement, ownedById, trainingMode) {
  const operatorIds = [];

  for (const charId of placement?.operatorPoolIds || []) {
    const normalizedId = normalizeOperatorId(charId);
    const operator = ownedById.get(normalizedId);
    if (!operator) {
      continue;
    }

    if (
      !isQualified(
        operator,
        placement?.minimumEliteByOperatorId?.[normalizedId],
        trainingMode,
      )
    ) {
      continue;
    }

    operatorIds.push(normalizedId);
  }

  return operatorIds;
}

function placementMatchesRoomGroup(placement, group) {
  return (
    placement?.roomType === group?.facility &&
    (!placement?.product || placement.product === group?.candidateProduct)
  );
}

function getDutySegmentIndexes(cohort, teamIndex) {
  return (cohort?.rotationSegments || [])
    .filter((segment) =>
      (segment?.assignments || []).some(
        (assignment) => assignment?.teamIndex === teamIndex,
      ),
    )
    .map((segment) => segment.index)
    .filter(Number.isInteger);
}

function compareCohorts(left, right) {
  return (
    Number(right?.slotCount || 0) - Number(left?.slotCount || 0) ||
    String(left?.id || "").localeCompare(String(right?.id || ""), "en")
  );
}

function createUnavailableRuntime(preset, reason, conditionResult = null) {
  return {
    status: "unavailable",
    preset,
    reason,
    missingOperatorIds: conditionResult?.missingOperatorIds || [],
    roomPlacements: [],
    shiftGroupBindings: [],
    suiteRequirementsByShift: [],
    controlShiftIndexesBySegment: [],
  };
}

function buildShiftGroupBindings(roomPlacements, controlPlacements) {
  const bindingsById = new Map();

  function getBinding(shiftGroupId) {
    let binding = bindingsById.get(shiftGroupId);
    if (!binding) {
      binding = {
        shiftGroupId,
        activeSegmentIndexes: [],
        roomPlacements: [],
        controlPlacements: [],
      };
      bindingsById.set(shiftGroupId, binding);
    }
    return binding;
  }

  for (const placement of roomPlacements || []) {
    const binding = getBinding(placement.shiftGroupId);
    binding.activeSegmentIndexes = [...placement.dutySegmentIndexes];
    binding.roomPlacements.push({
      placementId: placement.id,
      groupId: placement.groupId,
      cohortId: placement.cohortId,
      operatorIds: [...placement.operatorIds],
    });
  }

  for (const placement of controlPlacements || []) {
    const binding = getBinding(placement.shiftGroupId);
    binding.controlPlacements.push({
      placementId: placement.id,
      operatorIds: [...placement.operatorIds],
    });
  }

  return [...bindingsById.values()];
}

export function getRiicSchedulePresetOptions({
  presets,
  ownedOperators,
  trainingMode = "current",
}) {
  const ownedById = getOwnedOperatorMap(ownedOperators);

  return (presets || []).map((preset) => {
    const conditionResult = getConditionResult(
      preset,
      ownedById,
      trainingMode,
    );
    return {
      id: String(preset?.id || "").trim(),
      name: String(preset?.name || preset?.id || "").trim(),
      description: String(preset?.description || "").trim(),
      available: conditionResult.available,
      missingOperatorIds: conditionResult.missingOperatorIds,
    };
  });
}

export function buildRiicSchedulePresetRuntime({
  presetRequests,
  presets,
  ownedOperators,
  trainingMode = "current",
  roomGroups,
  shiftMode,
  twoShiftRotationMode,
  controlShiftCount = 2,
}) {
  const requestedPresetId = String(
    (presetRequests || [])[0]?.presetId || "",
  ).trim();
  if (!requestedPresetId) {
    return {
      status: "idle",
      preset: null,
      reason: "",
      missingOperatorIds: [],
      roomPlacements: [],
      shiftGroupBindings: [],
      suiteRequirementsByShift: [],
      controlShiftIndexesBySegment: [],
    };
  }

  const preset = (presets || []).find(
    (item) => String(item?.id || "").trim() === requestedPresetId,
  );
  if (!preset) {
    return createUnavailableRuntime(null, "unknownPreset");
  }

  const ownedById = getOwnedOperatorMap(ownedOperators);
  const conditionResult = getConditionResult(preset, ownedById, trainingMode);
  if (!conditionResult.available) {
    return createUnavailableRuntime(preset, "conditions", conditionResult);
  }

  const roomPlacements = [];
  const controlPlacements = [];

  for (const placement of preset?.actions?.placements || []) {
    const placementId = String(placement?.id || "").trim();
    const shiftGroupId = String(placement?.shiftGroupId || "").trim();
    if (!placementId || !shiftGroupId) {
      return createUnavailableRuntime(preset, "invalidPlacement");
    }

    const operatorIds = getPlacementOperatorIds(
      placement,
      ownedById,
      trainingMode,
    );
    if (operatorIds.length === 0) {
      return createUnavailableRuntime(preset, "placementOperators");
    }

    if (placement.roomType === "control") {
      controlPlacements.push({
        id: placementId,
        shiftGroupId,
        operatorIds,
      });
      continue;
    }

    const group = (roomGroups || []).find((item) =>
      placementMatchesRoomGroup(placement, item),
    );
    if (!group) {
      return createUnavailableRuntime(preset, "missingRoom");
    }

    const staffingRequirement = getRiicRoomGroupStaffingRequirement({
      stations: group.stations,
      shiftMode,
      roomType: group.facility,
      twoShiftRotationMode,
    });
    const cohort = [...(staffingRequirement?.cohorts || [])]
      .sort(compareCohorts)
      .find((item) => Number(item?.slotCount || 0) > 0);
    if (!cohort) {
      return createUnavailableRuntime(preset, "missingCapacity");
    }

    const assignedOperatorIds = operatorIds.slice(
      0,
      Number(cohort.slotCount || 0),
    );
    const dutySegmentIndexes = getDutySegmentIndexes(cohort, 0);
    if (assignedOperatorIds.length === 0 || dutySegmentIndexes.length === 0) {
      return createUnavailableRuntime(preset, "missingDutyWindow");
    }

    roomPlacements.push({
      id: placementId,
      shiftGroupId,
      groupId: group.id,
      cohortId: cohort.id,
      operatorIds: assignedOperatorIds,
      fallbackCount: Math.max(
        0,
        Number(cohort.slotCount || 0) - assignedOperatorIds.length,
      ),
      segmentCount: (cohort.rotationSegments || []).length,
      dutySegmentIndexes,
      candidateKey: `preset:${preset.id}:${placementId}:${cohort.id}`,
    });
  }

  const dutySegmentsByShiftGroupId = new Map();
  for (const placement of roomPlacements) {
    const signature = placement.dutySegmentIndexes.join(",");
    const current = dutySegmentsByShiftGroupId.get(placement.shiftGroupId);
    if (current && current.signature !== signature) {
      return createUnavailableRuntime(preset, "incompatibleDutyWindows");
    }
    dutySegmentsByShiftGroupId.set(placement.shiftGroupId, {
      signature,
      dutySegmentIndexes: placement.dutySegmentIndexes,
    });
  }

  const suiteRequirementsByShift = Array.from(
    { length: Math.max(1, Number(controlShiftCount || 2)) },
    () => [],
  );
  let controlShiftIndexesBySegment = [];

  for (const placement of controlPlacements) {
    const dutyWindow = dutySegmentsByShiftGroupId.get(placement.shiftGroupId);
    if (!dutyWindow) {
      return createUnavailableRuntime(preset, "unpairedControlPlacement");
    }

    suiteRequirementsByShift[0].push(
      ...placement.operatorIds.map((charId) => ({
        charId,
        minimumElite: 0,
      })),
    );
    controlShiftIndexesBySegment = dutyWindow.dutySegmentIndexes.map(
      () => 0,
    );
  }

  const segmentCount = Number(roomPlacements[0]?.segmentCount || 0);
  const sharedDutyWindow = dutySegmentsByShiftGroupId.values().next().value;
  if (sharedDutyWindow && segmentCount > 0) {
    const dutySegmentSet = new Set(sharedDutyWindow.dutySegmentIndexes);
    controlShiftIndexesBySegment = Array.from(
      { length: segmentCount },
      (_, segmentIndex) => (dutySegmentSet.has(segmentIndex) ? 0 : 1),
    );
  }

  return {
    status: "ready",
    preset,
    reason: "",
    missingOperatorIds: [],
    roomPlacements,
    shiftGroupBindings: buildShiftGroupBindings(
      roomPlacements,
      controlPlacements,
    ),
    suiteRequirementsByShift,
    controlShiftIndexesBySegment,
  };
}
