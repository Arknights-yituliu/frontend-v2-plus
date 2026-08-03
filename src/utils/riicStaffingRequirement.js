const ROTATION_SEGMENTS = Object.freeze({
  once: [24, 24],
  twice: [12, 12, 12],
  threeTimes: [12, 6, 6],
});

function isMaaTwoShiftRotation(shiftMode, twoShiftRotationMode) {
  return shiftMode === "twice" && twoShiftRotationMode === "maa";
}

function getRotationSegments(shiftMode, twoShiftRotationMode) {
  if (isMaaTwoShiftRotation(shiftMode, twoShiftRotationMode)) {
    return [12, 12];
  }

  return ROTATION_SEGMENTS[shiftMode];
}

function normalizeStations({ stations, stationSlots }) {
  const source = Array.isArray(stations)
    ? stations
    : (stationSlots || []).map((slotCount) => ({
        stationLevel: slotCount,
        slotCount,
      }));

  return source
    .map((currentStation) => ({
      stationLevel: Number(currentStation?.stationLevel),
      slotCount: Number(currentStation?.slotCount),
    }))
    .filter(
      (currentStation) =>
        Number.isInteger(currentStation.stationLevel) &&
        currentStation.stationLevel > 0 &&
        Number.isInteger(currentStation.slotCount) &&
        currentStation.slotCount > 0,
    );
}

function createRotationSegments({
  activeTeamCount,
  teamCount,
  segmentHours,
  stationIndexes,
}) {
  if (
    teamCount === 2 &&
    activeTeamCount === 1 &&
    segmentHours.length === 3
  ) {
    // In a three-segment cycle, two teams deliberately run A -> A -> B.
    // A can work for 24 hours; this keeps the cycle usable without
    // inventing an unnecessary third team.
    return segmentHours.map((durationHours, segmentIndex) => {
      const activeTeamIndex = segmentIndex === 2 ? 1 : 0;
      return {
        index: segmentIndex,
        durationHours,
        activeTeamIndexes: [activeTeamIndex],
        restingTeamIndexes: [activeTeamIndex === 0 ? 1 : 0],
        assignments: stationIndexes.map((stationIndex) => ({
          stationIndex,
          teamIndex: activeTeamIndex,
        })),
      };
    });
  }

  const restingTeamCount = teamCount - activeTeamCount;

  return segmentHours.map((durationHours, segmentIndex) => {
    const restingTeamIndexes = Array.from(
      { length: restingTeamCount },
      (_, offset) => (segmentIndex * restingTeamCount + offset) % teamCount,
    );
    const restingTeamIndexSet = new Set(restingTeamIndexes);

    const activeTeamIndexes = Array.from(
      { length: teamCount },
      (_, teamIndex) => teamIndex,
    ).filter((teamIndex) => !restingTeamIndexSet.has(teamIndex));

    return {
      index: segmentIndex,
      durationHours,
      activeTeamIndexes,
      restingTeamIndexes,
      assignments: stationIndexes.map((stationIndex, stationOffset) => ({
        stationIndex,
        teamIndex: activeTeamIndexes[stationOffset],
      })),
    };
  });
}

function createMaaTwoShiftRotationSegments({
  stationIndexes,
  segmentHours,
}) {
  const activeTeamCount = stationIndexes.length;
  const teamCount = activeTeamCount * 2;

  return segmentHours.map((durationHours, segmentIndex) => {
    const firstActiveTeamIndex = segmentIndex * activeTeamCount;
    const activeTeamIndexes = stationIndexes.map(
      (_, stationOffset) => firstActiveTeamIndex + stationOffset,
    );
    const activeTeamIndexSet = new Set(activeTeamIndexes);

    return {
      index: segmentIndex,
      durationHours,
      activeTeamIndexes,
      restingTeamIndexes: Array.from(
        { length: teamCount },
        (_, teamIndex) => teamIndex,
      ).filter((teamIndex) => !activeTeamIndexSet.has(teamIndex)),
      assignments: stationIndexes.map((stationIndex, stationOffset) => ({
        stationIndex,
        teamIndex: firstActiveTeamIndex + stationOffset,
      })),
    };
  });
}

function createCohort({
  stationLevel,
  slotCount,
  stationIndexes,
  segmentHours,
  teamCount,
  shiftMode,
  twoShiftRotationMode,
}) {
  const stationCount = stationIndexes.length;
  const resolvedTeamCount =
    teamCount ||
    (isMaaTwoShiftRotation(shiftMode, twoShiftRotationMode)
      ? stationCount * 2
      : Math.ceil((stationCount * 3) / 2));
  const cohortId = `level-${stationLevel}-slot-${slotCount}`;
  const teams = Array.from({ length: resolvedTeamCount }, (_, index) => ({
    id: `${cohortId}-team-${index + 1}`,
    index,
    label: `Lv.${stationLevel} ${slotCount}人班组 ${index + 1}`,
    stationLevel,
    slotCount,
  }));

  return {
    id: cohortId,
    stationLevel,
    slotCount,
    stationCount,
    stationIndexes,
    activeTeamCount: stationCount,
    teamCount: resolvedTeamCount,
    operatorCount: resolvedTeamCount * slotCount,
    teams,
    rotationSegments: isMaaTwoShiftRotation(
      shiftMode,
      twoShiftRotationMode,
    )
      ? createMaaTwoShiftRotationSegments({
          stationIndexes,
          segmentHours,
        })
      : createRotationSegments({
          activeTeamCount: stationCount,
          teamCount: resolvedTeamCount,
          segmentHours,
          stationIndexes,
        }),
  };
}

function createMeetingIndividualCohort({
  stationLevel,
  slotCount,
  stationIndexes,
  segmentHours,
  shiftMode,
  twoShiftRotationMode,
}) {
  const usesMaaTwoShiftRotation = isMaaTwoShiftRotation(
    shiftMode,
    twoShiftRotationMode,
  );
  const selectionCount =
    shiftMode === "once" || usesMaaTwoShiftRotation ? 4 : 3;
  const cohortId = `level-${stationLevel}-slot-${slotCount}`;
  const selectedCandidateIndexesBySegment =
    shiftMode === "once"
      ? [
          [0, 1],
          [2, 3],
        ]
      : usesMaaTwoShiftRotation
        ? [
            [0, 1],
            [2, 3],
          ]
      : [
          [0, 1],
          [1, 2],
          [2, 0],
        ];

  return {
    id: cohortId,
    stationLevel,
    slotCount,
    stationCount: 1,
    stationIndexes,
    activeTeamCount: 1,
    teamCount: selectionCount,
    operatorCount: selectionCount,
    selectionMode: "individual",
    selectionLabel: "干员",
    teams: Array.from({ length: selectionCount }, (_, index) => ({
      id: `${cohortId}-operator-${index + 1}`,
      index,
      label: `会客室干员 ${index + 1}`,
      stationLevel,
      slotCount: 1,
    })),
    rotationSegments: segmentHours.map((durationHours, segmentIndex) => ({
      index: segmentIndex,
      durationHours,
      activeTeamIndexes: selectedCandidateIndexesBySegment[segmentIndex],
      restingTeamIndexes: Array.from(
        { length: selectionCount },
        (_, index) => index,
      ).filter(
        (index) => !selectedCandidateIndexesBySegment[segmentIndex].includes(index),
      ),
      assignments: [
        {
          stationIndex: stationIndexes[0],
          candidateIndexes: selectedCandidateIndexesBySegment[segmentIndex],
        },
      ],
    })),
  };
}

/**
 * Converts room station metadata into manually selectable staffing units.
 * Facility level and occupant capacity are both part of a cohort identity:
 * two stations with the same capacity but different levels never share a
 * catalog or a rotation cohort by accident.
 */
export function getRiicRoomGroupStaffingRequirement({
  stations,
  stationSlots,
  shiftMode,
  roomType,
  twoShiftRotationMode = "manual",
}) {
  const normalizedStations = normalizeStations({ stations, stationSlots });
  if (normalizedStations.length === 0) {
    return {
      status: "missingCapacity",
      cohorts: [],
    };
  }

  const segmentHours = getRotationSegments(
    shiftMode,
    twoShiftRotationMode,
  );
  if (!segmentHours) {
    return {
      status: "missingCadence",
      cohorts: [],
    };
  }

  if (
    roomType === "meeting" &&
    normalizedStations.length === 1 &&
    normalizedStations[0].slotCount === 2
  ) {
    const [station] = normalizedStations;
    const cohort = createMeetingIndividualCohort({
      stationLevel: station.stationLevel,
      slotCount: station.slotCount,
      stationIndexes: [0],
      segmentHours,
      shiftMode,
      twoShiftRotationMode,
    });

    return {
      status: "ready",
      segmentHours,
      cohorts: [cohort],
      operatorCount: cohort.operatorCount,
    };
  }

  const stationIndexesByCohort = new Map();
  for (const [stationIndex, currentStation] of normalizedStations.entries()) {
    const key = `${currentStation.stationLevel}:${currentStation.slotCount}`;
    const entry = stationIndexesByCohort.get(key) || {
      ...currentStation,
      stationIndexes: [],
    };
    entry.stationIndexes.push(stationIndex);
    stationIndexesByCohort.set(key, entry);
  }

  const cohorts = [...stationIndexesByCohort.values()]
    .map((entry) =>
      createCohort({
        stationLevel: entry.stationLevel,
        slotCount: entry.slotCount,
        stationIndexes: entry.stationIndexes,
        segmentHours,
        shiftMode,
        twoShiftRotationMode,
        teamCount:
          shiftMode === "once" ||
          isMaaTwoShiftRotation(shiftMode, twoShiftRotationMode)
            ? entry.stationIndexes.length * 2
            : null,
      }),
    )
    .sort(
      (left, right) =>
        right.stationLevel - left.stationLevel ||
        right.slotCount - left.slotCount,
    );

  return {
    status: "ready",
    segmentHours,
    cohorts,
    operatorCount: cohorts.reduce(
      (total, cohort) => total + cohort.operatorCount,
      0,
    ),
  };
}
