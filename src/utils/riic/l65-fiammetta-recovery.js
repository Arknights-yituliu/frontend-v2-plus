function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function normalizeStateIndexes(values) {
  return [
    ...new Set(
      [...(values || [])]
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0),
    ),
  ].sort((left, right) => left - right);
}

export function normalizeRiicFiammettaRecovery(value = {}) {
  const targetOperatorId = normalizeOperatorId(value?.targetOperatorId);

  return {
    enabled: value?.enabled === true && Boolean(targetOperatorId),
    targetOperatorId,
    usedStateIndexes: normalizeStateIndexes(value?.usedStateIndexes),
    stateIndexesBySelectionKey: Object.fromEntries(
      Object.entries(value?.stateIndexesBySelectionKey || {}).map(
        ([selectionKey, stateIndexes]) => [
          String(selectionKey || "").trim(),
          normalizeStateIndexes(stateIndexes),
        ],
      ),
    ),
  };
}

export function getRiicFiammettaTeamStateIndexes(cohort, teamIndex) {
  const normalizedTeamIndex = Number(teamIndex);
  if (!Number.isInteger(normalizedTeamIndex) || normalizedTeamIndex < 0) {
    return [];
  }

  return normalizeStateIndexes(
    (cohort?.rotationSegments || [])
      .filter((segment) =>
        (segment?.activeTeamIndexes || []).includes(normalizedTeamIndex),
      )
      .map((segment) => segment?.index),
  );
}

export function getRiicFiammettaSelectionStateIndexes(
  recovery,
  selectionKey,
) {
  const normalizedRecovery = normalizeRiicFiammettaRecovery(recovery);
  return (
    normalizedRecovery.stateIndexesBySelectionKey[
      String(selectionKey || "").trim()
    ] || []
  );
}

export function hasRiicFiammettaStateOverlap(left, right) {
  const rightIndexes = new Set(normalizeStateIndexes(right));
  return normalizeStateIndexes(left).some((index) => rightIndexes.has(index));
}

export function canReuseRiicFiammettaTarget({
  recovery,
  operatorId,
  selectionKey,
  usedStateIndexes,
} = {}) {
  const normalizedRecovery = normalizeRiicFiammettaRecovery(recovery);
  if (
    !normalizedRecovery.enabled ||
    normalizeOperatorId(operatorId) !== normalizedRecovery.targetOperatorId
  ) {
    return false;
  }

  const targetStateIndexes = getRiicFiammettaSelectionStateIndexes(
    normalizedRecovery,
    selectionKey,
  );
  return !hasRiicFiammettaStateOverlap(
    usedStateIndexes ?? normalizedRecovery.usedStateIndexes,
    targetStateIndexes,
  );
}

function getRiicFiammettaScheduleTeamKey({
  groupId,
  candidate,
  segmentIndex,
  stationIndex,
}) {
  const fallbackSelectionKey = String(
    candidate?.fallbackSelectionKey || "",
  ).trim();
  if (fallbackSelectionKey) {
    return `${groupId}:selection:${fallbackSelectionKey}`;
  }

  const controlCenterTeamIndex = Number(candidate?.controlCenterTeamIndex);
  if (
    Number.isInteger(controlCenterTeamIndex) &&
    controlCenterTeamIndex >= 0
  ) {
    return `${groupId}:control:${controlCenterTeamIndex}`;
  }

  const candidateKey = String(candidate?.key || "").trim();
  if (candidateKey) {
    return `${groupId}:candidate:${candidateKey}`;
  }

  return `${groupId}:segment:${segmentIndex}:station:${stationIndex}`;
}

/**
 * Counts the distinct assembled teams that use the configured recovery target.
 * This deliberately reads the assembled schedule rather than selection-only
 * state, so automatic and manual scheduling share one export decision.
 */
export function getRiicFiammettaScheduleUsage({
  scheduleCandidate,
  targetOperatorId,
} = {}) {
  const normalizedTargetOperatorId = normalizeOperatorId(targetOperatorId);
  if (!normalizedTargetOperatorId) {
    return {
      selectionCount: 0,
      teamKeys: [],
    };
  }

  const teamKeys = new Set();
  for (const groupEntry of scheduleCandidate?.groups || []) {
    const groupId = String(groupEntry?.groupId || "").trim();
    for (const segment of groupEntry?.candidate?.segments || []) {
      for (const assignment of segment?.stationAssignments || []) {
        const candidate = assignment?.candidate;
        if (
          !(candidate?.operatorIds || []).includes(normalizedTargetOperatorId)
        ) {
          continue;
        }

        teamKeys.add(
          getRiicFiammettaScheduleTeamKey({
            groupId,
            candidate,
            segmentIndex: Number(segment?.index || 0),
            stationIndex: Number(assignment?.stationIndex || 0),
          }),
        );
      }
    }
  }

  return {
    selectionCount: teamKeys.size,
    teamKeys: [...teamKeys].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
  };
}
