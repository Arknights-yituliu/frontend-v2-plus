function gcd(left, right) {
  let a = Math.abs(Math.trunc(left));
  let b = Math.abs(Math.trunc(right));

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

function lcm(left, right) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return Math.abs((left / gcd(left, right)) * right);
}

function normalizeSegments(candidate) {
  const segments = (candidate?.segments || [])
    .map((segment, index) => {
      const durationHours = Number(segment?.durationHours);
      if (!Number.isInteger(durationHours) || durationHours <= 0) {
        return null;
      }

      return {
        ...segment,
        index,
        durationHours,
      };
    })
    .filter(Boolean);
  const cycleHours = segments.reduce(
    (total, segment) => total + segment.durationHours,
    0,
  );

  return cycleHours > 0
    ? {
        cycleHours,
        segments,
      }
    : null;
}

function getSegmentAtHour(rotation, hour) {
  const cycleHour = hour % rotation.cycleHours;
  let boundary = 0;

  for (const segment of rotation.segments) {
    boundary += segment.durationHours;
    if (cycleHour < boundary) {
      return segment;
    }
  }

  return rotation.segments[rotation.segments.length - 1];
}

function getStationAveragePercent(segment) {
  const assignments = segment?.stationAssignments || [];
  if (assignments.length === 0) {
    return null;
  }

  const percentages = assignments
    .map((assignment) => Number(assignment?.candidate?.totalPercent))
    .filter(Number.isFinite);
  if (percentages.length === 0) {
    return null;
  }

  return (
    percentages.reduce((total, percent) => total + percent, 0) /
    percentages.length
  );
}

function roundPercent(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Calculates each assembled room group's own time-weighted candidate
 * efficiency. Candidate contributions are not propagated to other rooms.
 */
export function calculateRiicAssembledScheduleMetrics({ groups }) {
  const normalizedGroups = (groups || [])
    .map((group) => {
      const facility = String(group?.facility || "").trim();
      const rotation = normalizeSegments(group?.candidate);
      if (!facility || !rotation) {
        return null;
      }

      return {
        id: String(group?.groupId || group?.id || "").trim(),
        facility,
        rotation,
      };
    })
    .filter(Boolean);

  if (normalizedGroups.length === 0) {
    return {
      cycleHours: 0,
      groups: {},
    };
  }

  const cycleHours = normalizedGroups.reduce(
    (total, group) => lcm(total, group.rotation.cycleHours),
    1,
  );
  const segmentUnitHours = normalizedGroups
    .flatMap((group) =>
      group.rotation.segments.map((segment) => segment.durationHours),
    )
    .reduce((unit, durationHours) => gcd(unit, durationHours));
  const totalsByGroup = new Map(
    normalizedGroups.map((group) => [
      group.id,
      {
        facility: group.facility,
        basePercentHours: 0,
        hours: 0,
      },
    ]),
  );

  for (
    let hour = 0;
    hour < cycleHours;
    hour += segmentUnitHours
  ) {
    for (const group of normalizedGroups) {
      const segment = getSegmentAtHour(group.rotation, hour);
      const basePercent = getStationAveragePercent(segment);
      if (!Number.isFinite(basePercent)) {
        continue;
      }

      const total = totalsByGroup.get(group.id);
      total.basePercentHours += basePercent * segmentUnitHours;
      total.hours += segmentUnitHours;
    }
  }

  return {
    cycleHours,
    groups: Object.fromEntries(
      [...totalsByGroup.entries()].map(([groupId, total]) => {
        const divisor = total.hours || 1;
        const baseAveragePercent = total.basePercentHours / divisor;

        return [
          groupId,
          {
            facility: total.facility,
            baseAveragePercent: roundPercent(baseAveragePercent),
          },
        ];
      }),
    ),
  };
}
