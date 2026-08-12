function normalizeNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeSegmentHours(value) {
  return (value || [])
    .map((hours) => Number(hours))
    .filter((hours) => Number.isFinite(hours) && hours > 0);
}

function getRotationSegment(cohort, segmentIndex, durationHours) {
  const source = cohort?.rotationSegments?.[segmentIndex] || {};
  const activeTeamIndexes = [
    ...new Set(
      (source?.activeTeamIndexes || [])
        .map((index) => normalizeNonNegativeInteger(index, -1))
        .filter((index) => index >= 0),
    ),
  ];
  const restingTeamIndexes = [
    ...new Set(
      (source?.restingTeamIndexes || [])
        .map((index) => normalizeNonNegativeInteger(index, -1))
        .filter((index) => index >= 0),
    ),
  ];

  return {
    index: segmentIndex,
    durationHours,
    activeTeamIndexes,
    restingTeamIndexes,
    assignments: (source?.assignments || []).map((assignment) => ({
      stationIndex: normalizeNonNegativeInteger(assignment?.stationIndex),
      teamIndexes: Array.isArray(assignment?.candidateIndexes)
        ? assignment.candidateIndexes
            .map((index) => normalizeNonNegativeInteger(index, -1))
            .filter((index) => index >= 0)
        : [normalizeNonNegativeInteger(assignment?.teamIndex, -1)].filter(
            (index) => index >= 0,
          ),
    })),
  };
}

/**
 * Converts already-resolved room staffing requirements into a shared rotation
 * view. It deliberately contains no operator, candidate, or facility-choice
 * logic, so later stages can use it as their common time-segment reference.
 */
export function buildRiicRotationSkeleton({
  roomGroups = [],
  segmentHours = [],
} = {}) {
  const normalizedSegmentHours = normalizeSegmentHours(segmentHours);
  if (normalizedSegmentHours.length === 0) {
    return {
      status: "missingCadence",
      segmentHours: [],
      segments: [],
      teamDutyWindows: [],
    };
  }

  const segments = normalizedSegmentHours.map((durationHours, index) => ({
    index,
    durationHours,
    cohortStates: [],
  }));
  const teamDutyWindows = [];

  for (const roomGroup of roomGroups || []) {
    const roomGroupId = String(roomGroup?.id || "").trim();
    const staffingRequirement = roomGroup?.staffingRequirement;
    if (
      !roomGroupId ||
      staffingRequirement?.status !== "ready" ||
      !Array.isArray(staffingRequirement?.cohorts)
    ) {
      continue;
    }

    for (const cohort of staffingRequirement.cohorts) {
      const cohortId = String(cohort?.id || "").trim();
      if (!cohortId) {
        continue;
      }

      const dutySegmentIndexesByTeamIndex = new Map();
      for (const team of cohort?.teams || []) {
        const teamIndex = normalizeNonNegativeInteger(team?.index, -1);
        if (teamIndex >= 0) {
          dutySegmentIndexesByTeamIndex.set(teamIndex, []);
        }
      }

      for (const [segmentIndex, durationHours] of normalizedSegmentHours.entries()) {
        const rotationSegment = getRotationSegment(
          cohort,
          segmentIndex,
          durationHours,
        );
        segments[segmentIndex].cohortStates.push({
          roomGroupId,
          facility: String(roomGroup?.facility || "").trim(),
          cohortId,
          ...rotationSegment,
        });

        for (const teamIndex of rotationSegment.activeTeamIndexes) {
          const dutySegmentIndexes =
            dutySegmentIndexesByTeamIndex.get(teamIndex) || [];
          dutySegmentIndexes.push(segmentIndex);
          dutySegmentIndexesByTeamIndex.set(teamIndex, dutySegmentIndexes);
        }
      }

      for (const team of cohort?.teams || []) {
        const teamIndex = normalizeNonNegativeInteger(team?.index, -1);
        if (teamIndex < 0) {
          continue;
        }

        teamDutyWindows.push({
          roomGroupId,
          facility: String(roomGroup?.facility || "").trim(),
          cohortId,
          teamId: String(team?.id || `${cohortId}-team-${teamIndex + 1}`),
          teamIndex,
          label: String(team?.label || "").trim(),
          segmentIndexes: dutySegmentIndexesByTeamIndex.get(teamIndex) || [],
        });
      }
    }
  }

  return {
    status: "ready",
    segmentHours: normalizedSegmentHours,
    segments,
    teamDutyWindows,
  };
}
