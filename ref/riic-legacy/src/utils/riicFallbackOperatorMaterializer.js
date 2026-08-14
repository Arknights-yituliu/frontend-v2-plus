const MAX_CONTINUOUS_WORK_HOURS = 24;

function normalizeOperatorIds(operatorIds) {
  return [
    ...new Set(
      (operatorIds || [])
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
}

function getOperatorNames(resolvedSkills) {
  return new Map(
    (resolvedSkills?.ownedOperators || []).map((operator) => [
      operator.charId,
      operator.name || operator.charId,
    ]),
  );
}

function getSegmentOperatorIds(segment) {
  return normalizeOperatorIds(
    (segment?.stationAssignments || []).flatMap(
      (assignment) => assignment?.candidate?.operatorIds || [],
    ),
  );
}

function getCyclicOperatorUsage(segments) {
  const activityByOperator = new Map();

  for (const [segmentIndex, segment] of (segments || []).entries()) {
    for (const charId of getSegmentOperatorIds(segment)) {
      if (!activityByOperator.has(charId)) {
        activityByOperator.set(
          charId,
          Array.from({ length: segments.length }, () => false),
        );
      }
      activityByOperator.get(charId)[segmentIndex] = true;
    }
  }

  const usage = [];
  for (const [charId, activity] of activityByOperator.entries()) {
    if (activity.every(Boolean)) {
      // The rotation repeats from its last segment back to its first segment.
      // An operator assigned in every segment would therefore never rest.
      return null;
    }

    const firstRestIndex = activity.findIndex((isWorking) => !isWorking);
    let currentContinuousHours = 0;
    let longestContinuousHours = 0;
    let workHours = 0;

    for (let offset = 1; offset <= segments.length; offset += 1) {
      const index = (firstRestIndex + offset) % segments.length;
      const durationHours = Number(segments[index]?.durationHours || 0);
      if (activity[index]) {
        currentContinuousHours += durationHours;
        workHours += durationHours;
        longestContinuousHours = Math.max(
          longestContinuousHours,
          currentContinuousHours,
        );
      } else {
        currentContinuousHours = 0;
      }
    }

    if (longestContinuousHours > MAX_CONTINUOUS_WORK_HOURS) {
      return null;
    }

    usage.push({
      charId,
      workHours,
      longestContinuousHours,
    });
  }

  return usage.sort((left, right) => left.charId.localeCompare(right.charId, "en"));
}

function chooseFallbackOperatorIds({
  candidate,
  count,
  occupiedOperatorIds,
  previousOperatorIds,
  operatorWorkHours,
}) {
  const eligibleOperatorIds = normalizeOperatorIds(
    candidate?.fallbackOperatorIds,
  ).filter((charId) => !occupiedOperatorIds.has(charId));

  if (eligibleOperatorIds.length < count) {
    return null;
  }

  return eligibleOperatorIds
    .sort((left, right) => {
      const leftWasWorking = previousOperatorIds.has(left) ? 1 : 0;
      const rightWasWorking = previousOperatorIds.has(right) ? 1 : 0;
      if (leftWasWorking !== rightWasWorking) {
        return leftWasWorking - rightWasWorking;
      }

      const workDifference =
        (operatorWorkHours.get(left) || 0) -
        (operatorWorkHours.get(right) || 0);
      if (workDifference !== 0) {
        return workDifference;
      }

      return left.localeCompare(right, "en");
    })
    .slice(0, count);
}

function materializeCandidate({
  candidate,
  operatorNames,
  startSegmentIndex,
}) {
  const sourceSegments = candidate?.segments || [];
  const materializedSegments = Array.from({ length: sourceSegments.length });
  const operatorWorkHours = new Map();
  let previousOperatorIds = new Set();
  let materializedFallbackCount = 0;

  for (let offset = 0; offset < sourceSegments.length; offset += 1) {
    const segmentIndex = (startSegmentIndex + offset) % sourceSegments.length;
    const segment = sourceSegments[segmentIndex];
    const occupiedOperatorIds = new Set(
      (segment?.stationAssignments || []).flatMap(
        (assignment) => assignment?.candidate?.operatorIds || [],
      ),
    );
    const stationAssignments = [];

    for (const assignment of segment?.stationAssignments || []) {
      const sourceCandidate = assignment?.candidate || {};
      const fallbackCount = Number(sourceCandidate?.fallback?.count || 0);
      const fallbackOperatorIds = chooseFallbackOperatorIds({
        candidate: sourceCandidate,
        count: fallbackCount,
        occupiedOperatorIds,
        previousOperatorIds,
        operatorWorkHours,
      });

      if (!fallbackOperatorIds) {
        return null;
      }

      for (const charId of fallbackOperatorIds) {
        occupiedOperatorIds.add(charId);
        operatorWorkHours.set(
          charId,
          (operatorWorkHours.get(charId) || 0) +
            Number(segment?.durationHours || 0),
        );
      }
      materializedFallbackCount += fallbackOperatorIds.length;

      const sourceOperators = sourceCandidate.operators || [];
      stationAssignments.push({
        ...assignment,
        candidate: {
          ...sourceCandidate,
          operatorIds: normalizeOperatorIds([
            ...(sourceCandidate.operatorIds || []),
            ...fallbackOperatorIds,
          ]),
          operators: [
            ...sourceOperators,
            ...fallbackOperatorIds.map((charId) => ({
              charId,
              name: operatorNames.get(charId) || charId,
              scored: true,
              baseline: true,
            })),
          ],
          fallback: {
            ...sourceCandidate.fallback,
            count: 0,
          },
          materializedFallback: fallbackOperatorIds.length
            ? {
                count: fallbackOperatorIds.length,
                percent: Number(sourceCandidate?.fallback?.percent || 0),
                label: sourceCandidate?.fallback?.label || "基础补位",
              }
            : null,
        },
      });
    }

    const materializedSegment = {
      ...segment,
      stationAssignments,
    };
    materializedSegment.operatorIds = getSegmentOperatorIds(materializedSegment);
    materializedSegments[segmentIndex] = materializedSegment;
    previousOperatorIds = new Set(materializedSegment.operatorIds);
  }

  const operatorUsage = getCyclicOperatorUsage(materializedSegments);
  if (!operatorUsage) {
    return null;
  }

  return {
    ...candidate,
    operatorUsage,
    longestContinuousWorkHours: operatorUsage.reduce(
      (longestHours, operator) =>
        Math.max(longestHours, operator.longestContinuousHours),
      0,
    ),
    materializedFallbackCount,
    segments: materializedSegments,
  };
}

/**
 * Turns the generic 25% / 30% / 20% placeholders into real owned operators
 * before the whole-schedule conflict check runs.
 */
export function materializeRiicFallbackOperators({
  rotationCandidates,
  resolvedSkills,
}) {
  if (!Array.isArray(rotationCandidates)) {
    throw new Error("rotationCandidates must be an array");
  }

  const operatorNames = getOperatorNames(resolvedSkills);
  const candidates = [];
  const unresolvedCandidateKeys = [];

  for (const sourceCandidate of rotationCandidates) {
    let materializedCandidate = null;
    const segmentCount = Math.max(1, sourceCandidate?.segments?.length || 0);

    for (
      let startSegmentIndex = 0;
      startSegmentIndex < segmentCount;
      startSegmentIndex += 1
    ) {
      materializedCandidate = materializeCandidate({
        candidate: sourceCandidate,
        operatorNames,
        startSegmentIndex,
      });
      if (materializedCandidate) {
        break;
      }
    }

    if (materializedCandidate) {
      candidates.push(materializedCandidate);
    } else {
      unresolvedCandidateKeys.push(sourceCandidate?.key || "");
    }
  }

  return {
    candidates,
    summary: {
      inputCandidateCount: rotationCandidates.length,
      candidateCount: candidates.length,
      unresolvedCandidateCount: unresolvedCandidateKeys.length,
      unresolvedCandidateKeys,
    },
  };
}
