const EPSILON = 1e-9;
const OPERATOR_EFFICIENCY_METRIC_BY_ROOM_TYPE = Object.freeze({
  trading: "orderEfficiency",
  manufacture: "production",
  meeting: "clueSearch",
  hire: "contactSpeed",
});

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

  let cursor = ((Number(hour) % cycleHours) + cycleHours) % cycleHours;
  for (const segment of segments || []) {
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

function getTimelineBoundaries(candidates, cycleHours) {
  const boundaries = new Set([0, cycleHours]);

  for (const candidate of candidates || []) {
    const segments = candidate?.segments || [];
    const candidateCycleHours = getSegmentCycleHours(segments);
    if (candidateCycleHours <= 0) {
      continue;
    }

    for (
      let cycleOffset = 0;
      cycleOffset < cycleHours;
      cycleOffset += candidateCycleHours
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

function normalizeRoomType(value) {
  const roomType = String(value || "").trim();
  return roomType === "office" ? "hire" : roomType;
}

function normalizeProduct(value) {
  return String(value || "").trim() || "all";
}

function candidateHasAnyOperator(candidate, operatorIds) {
  const expectedOperatorIds = new Set(
    (operatorIds || []).map((operatorId) => String(operatorId || "").trim()),
  );
  if (expectedOperatorIds.size === 0) {
    return false;
  }

  return [
    ...(candidate?.operatorIds || []),
    ...(candidate?.operators || []).map((operator) => operator?.charId),
  ].some((operatorId) => expectedOperatorIds.has(String(operatorId || "").trim()));
}

function getCandidateBindings(candidate, group) {
  const roomType = normalizeRoomType(
    candidate?.candidateScope?.roomType || group?.facility,
  );
  const product = normalizeProduct(
    candidate?.candidateScope?.product || group?.candidateProduct,
  );

  return (candidate?.sameShiftBindings || []).filter((binding) => {
    const bindingRoomType = normalizeRoomType(binding?.roomType);
    const bindingProduct = normalizeProduct(binding?.product);
    return (
      bindingRoomType === roomType &&
      (bindingProduct === "all" || bindingProduct === product)
    );
  });
}

function getBindingBonusBreakdown(binding) {
  const effects = Array.isArray(binding?.effects) ? binding.effects : [];
  const operatorEfficiencyMetric =
    OPERATOR_EFFICIENCY_METRIC_BY_ROOM_TYPE[
      normalizeRoomType(binding?.roomType)
    ] || "";
  const highestFacilityBonusByMetric = new Map();
  const highestOperatorBonusBySourceMetricAndId = new Map();

  for (const effect of effects) {
    const bonusPercent = Number(effect?.bonusPercent || 0);
    if (!Number.isFinite(bonusPercent) || bonusPercent === 0) {
      continue;
    }

    const affectedOperatorIds = (effect?.affectedOperatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean);
    const isOperatorEffect =
      String(effect?.scope || "").trim() === "operators" ||
      affectedOperatorIds.length > 0;
    if (!isOperatorEffect) {
      const metric = String(effect?.metric || "").trim();
      const existing = highestFacilityBonusByMetric.get(metric);
      if (!Number.isFinite(existing) || bonusPercent > existing) {
        highestFacilityBonusByMetric.set(metric, bonusPercent);
      }
      continue;
    }
    if (String(effect?.metric || "").trim() !== operatorEfficiencyMetric) {
      continue;
    }

    for (const operatorId of affectedOperatorIds) {
      const key = [
        ...(effect?.sourceOperatorIds || [])
          .map((sourceOperatorId) => String(sourceOperatorId || "").trim())
          .filter(Boolean)
          .sort(),
        String(effect?.metric || "").trim(),
        operatorId,
      ].join(":");
      const existing = highestOperatorBonusBySourceMetricAndId.get(key);
      if (!existing || bonusPercent > existing.bonusPercent) {
        highestOperatorBonusBySourceMetricAndId.set(key, {
          operatorId,
          bonusPercent,
        });
      }
    }
  }

  let facilityBonusPercent = [...highestFacilityBonusByMetric.values()].reduce(
    (total, bonusPercent) => total + Number(bonusPercent || 0),
    0,
  );
  const operatorBonusById = {};
  for (const { operatorId, bonusPercent } of highestOperatorBonusBySourceMetricAndId.values()) {
    operatorBonusById[operatorId] =
      Number(operatorBonusById[operatorId] || 0) + Number(bonusPercent || 0);
  }
  const operatorBonusPercent = Object.values(operatorBonusById).reduce(
    (total, bonusPercent) => total + Number(bonusPercent || 0),
    0,
  );

  if (
    effects.length === 0 &&
    Number.isFinite(Number(binding?.bonusPercent))
  ) {
    facilityBonusPercent = Number(binding.bonusPercent);
  }

  return {
    facilityBonusPercent,
    operatorBonusPercent,
    bonusPercent: facilityBonusPercent + operatorBonusPercent,
    operatorBonuses: Object.entries(operatorBonusById).map(
      ([operatorId, bonusPercent]) => ({
        operatorId,
        bonusPercent,
      }),
    ),
  };
}

function getControlTeamIndexAtHour(controlCandidate, hour) {
  const segment = getSegmentAtHour(controlCandidate?.segments, hour);
  const assignment = segment?.stationAssignments?.[0];
  const teamIndex = Number(
    assignment?.candidate?.controlCenterTeamIndex ??
      segment?.controlCenterTeamIndex,
  );
  return Number.isInteger(teamIndex) && teamIndex >= 0 ? teamIndex : null;
}

function getControlTeamOperatorIdsAtHour(controlCandidate, hour) {
  const segment = getSegmentAtHour(controlCandidate?.segments, hour);
  const assignment = segment?.stationAssignments?.[0];
  return new Set(
    (assignment?.candidate?.operatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean),
  );
}

function areBindingConditionsSatisfied(effect, controlOperatorIds) {
  const requiredOperatorIds = (
    effect?.conditions?.controlCoassignedOperatorIds || []
  )
    .map((operatorId) => String(operatorId || "").trim())
    .filter(Boolean);

  return [
    ...new Set(requiredOperatorIds),
  ].every((operatorId) => controlOperatorIds.has(operatorId));
}

function getBindingStatus({
  candidate,
  group,
  controlCandidate,
  startHour,
}) {
  const candidateBindings = getCandidateBindings(candidate, group);
  if (candidateBindings.length === 0) {
    return {
      status: "notApplicable",
      bonusPercent: 0,
      bindings: [],
    };
  }

  const controlTeamIndex = getControlTeamIndexAtHour(
    controlCandidate,
    startHour,
  );
  const controlOperatorIds = getControlTeamOperatorIdsAtHour(
    controlCandidate,
    startHour,
  );
  if (controlTeamIndex === null) {
    return {
      status: "unavailable",
      bonusPercent: 0,
      bindings: [],
    };
  }

  const bindings = candidateBindings
    .filter(
      (binding) =>
        Number(binding?.sourceTeamIndex) === controlTeamIndex,
    )
    .map((binding) => {
      const effects = (binding.effects || []).filter((effect) =>
        areBindingConditionsSatisfied(effect, controlOperatorIds),
      );
      const activeBinding = {
        ...binding,
        effects,
      };
      return {
        ...activeBinding,
        ...getBindingBonusBreakdown(activeBinding),
      };
    })
    .filter((binding) => Math.abs(Number(binding?.bonusPercent || 0)) > EPSILON);

  return {
    status: bindings.length > 0 ? "realized" : "unrealized",
    bonusPercent: bindings.reduce(
      (total, binding) => total + Number(binding.bonusPercent || 0),
      0,
    ),
    facilityBonusPercent: bindings.reduce(
      (total, binding) =>
        total + Number(binding.facilityBonusPercent || 0),
      0,
    ),
    operatorBonusPercent: bindings.reduce(
      (total, binding) =>
        total + Number(binding.operatorBonusPercent || 0),
      0,
    ),
    operatorBonuses: bindings.flatMap(
      (binding) => binding.operatorBonuses || [],
    ),
    bindings,
  };
}

function createStationSummary({
  group,
  stationIndex,
  candidate,
}) {
  return {
    groupId: String(group?.id || "").trim(),
    stationIndex: Number(stationIndex || 0),
    candidateKey: String(candidate?.key || "").trim(),
    expectedWeightedBonus: 0,
    realizedWeightedBonus: 0,
    durationHours: 0,
    hasApplicableBinding: false,
  };
}

function getStationSummaryStatus(summary) {
  if (!summary?.hasApplicableBinding) {
    return "notApplicable";
  }

  const actualBonusPercent =
    summary.durationHours > 0
      ? summary.realizedWeightedBonus / summary.durationHours
      : 0;
  const expectedBonusPercent =
    summary.durationHours > 0
      ? summary.expectedWeightedBonus / summary.durationHours
      : 0;
  if (Math.abs(actualBonusPercent) <= EPSILON) {
    return "unrealized";
  }
  if (Math.abs(actualBonusPercent - expectedBonusPercent) <= EPSILON) {
    return "realized";
  }
  return "partial";
}

function summarizeCandidateBindings({
  controlCandidate,
  group,
  candidate,
}) {
  const controlCycleHours = getSegmentCycleHours(controlCandidate?.segments);
  const candidateCycleHours = getSegmentCycleHours(candidate?.segments);
  const cycleHours = leastCommonMultiple(
    controlCycleHours,
    candidateCycleHours,
  );
  if (cycleHours <= 0) {
    return {
      cycleHours: 0,
      weightedBonusPercent: 0,
      realizedWeightedBonus: 0,
      stations: [],
    };
  }

  const stationSummaries = new Map();
  const boundaries = getTimelineBoundaries(
    [controlCandidate, candidate],
    cycleHours,
  );

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startHour = boundaries[index];
    const durationHours = boundaries[index + 1] - startHour;
    const targetSegment = getSegmentAtHour(candidate?.segments, startHour);

    for (const assignment of targetSegment?.stationAssignments || []) {
      const targetCandidate = assignment?.candidate;
      const candidateBindings = getCandidateBindings(targetCandidate, group);
      if (candidateBindings.length === 0) {
        continue;
      }

      const stationIndex = Number(assignment?.stationIndex || 0);
      const stationKey = `${stationIndex}:${targetCandidate?.key || ""}`;
      const summary =
        stationSummaries.get(stationKey) ||
        createStationSummary({
          group,
          stationIndex,
          candidate: targetCandidate,
        });
      const bindingStatus = getBindingStatus({
        candidate: targetCandidate,
        group,
        controlCandidate,
        startHour,
      });
      const expectedBonusPercent = candidateBindings.reduce(
        (total, binding) =>
          total + Number(getBindingBonusBreakdown(binding).bonusPercent || 0),
        0,
      );

      summary.hasApplicableBinding = true;
      summary.durationHours += durationHours;
      summary.expectedWeightedBonus += expectedBonusPercent * durationHours;
      summary.realizedWeightedBonus +=
        Number(bindingStatus.bonusPercent || 0) * durationHours;
      stationSummaries.set(stationKey, summary);
    }
  }

  const stations = [...stationSummaries.values()].map((summary) => {
    const weightedBonusPercent =
      summary.durationHours > 0
        ? summary.realizedWeightedBonus / summary.durationHours
        : 0;
    const expectedBonusPercent =
      summary.durationHours > 0
        ? summary.expectedWeightedBonus / summary.durationHours
        : 0;

    return {
      ...summary,
      status: getStationSummaryStatus(summary),
      weightedBonusPercent,
      expectedBonusPercent,
    };
  });
  const durationHours = stations.reduce(
    (total, station) => total + station.durationHours,
    0,
  );
  const realizedWeightedBonus = stations.reduce(
    (total, station) => total + station.realizedWeightedBonus,
    0,
  );

  return {
    cycleHours,
    durationHours,
    realizedWeightedBonus,
    weightedBonusPercent:
      durationHours > 0 ? realizedWeightedBonus / durationHours : 0,
    stations,
  };
}

function rotateCandidateSegments(candidate, offset) {
  const segments = candidate?.segments || [];
  if (offset <= 0 || offset >= segments.length) {
    return candidate;
  }

  return {
    ...candidate,
    // Shift team contents between existing time slots. The control-center
    // timeline remains authoritative, so a 12h / 6h / 6h rotation must not
    // become 6h / 6h / 12h and introduce an unrendered extra boundary.
    segments: segments.map((targetSegment, index) => ({
      ...segments[(index + offset) % segments.length],
      durationHours: targetSegment.durationHours,
      index,
    })),
  };
}

/**
 * Keeps selected teams intact while selecting the room rotation phase that
 * realizes the most control-center same-shift bonus.
 */
export function alignRiicScheduleSameShiftBindings({
  groupEntries = [],
  lockedOperatorIds = [],
} = {}) {
  const controlEntry = (groupEntries || []).find(
    (entry) => String(entry?.group?.facility || "") === "control",
  );
  const controlCandidate = controlEntry?.candidate;
  if (!controlCandidate) {
    return {
      groupEntries,
      summary: [],
      signature: "",
    };
  }

  const summary = [];
  const alignedEntries = (groupEntries || []).map((entry) => {
    const group = entry?.group;
    const candidate = entry?.candidate;
    if (
      !candidate ||
      entry === controlEntry ||
      (candidate?.segments || []).length <= 1
    ) {
      return entry;
    }
    if (candidateHasAnyOperator(candidate, lockedOperatorIds)) {
      return {
        ...entry,
        candidate: {
          ...candidate,
          sameShiftBindingOffset: 0,
          resourceChainLocked: true,
        },
      };
    }

    const hasBinding = (candidate?.segments || []).some((segment) =>
      (segment?.stationAssignments || []).some((assignment) =>
        getCandidateBindings(assignment?.candidate, group).length > 0,
      ),
    );
    if (!hasBinding) {
      return entry;
    }

    let selectedOffset = 0;
    let selectedCandidate = candidate;
    let selectedSummary = summarizeCandidateBindings({
      controlCandidate,
      group,
      candidate,
    });
    let selectedScore = selectedSummary.realizedWeightedBonus;

    for (let offset = 1; offset < candidate.segments.length; offset += 1) {
      const rotatedCandidate = rotateCandidateSegments(candidate, offset);
      const rotatedSummary = summarizeCandidateBindings({
        controlCandidate,
        group,
        candidate: rotatedCandidate,
      });
      if (rotatedSummary.realizedWeightedBonus > selectedScore + EPSILON) {
        selectedOffset = offset;
        selectedCandidate = rotatedCandidate;
        selectedSummary = rotatedSummary;
        selectedScore = rotatedSummary.realizedWeightedBonus;
      }
    }

    const resolvedSummary = {
      ...selectedSummary,
      groupId: String(group?.id || "").trim(),
      rotationOffset: selectedOffset,
    };
    summary.push(resolvedSummary);
    return {
      ...entry,
      candidate: {
        ...selectedCandidate,
        sameShiftBindingOffset: selectedOffset,
        sameShiftBindingSummary: resolvedSummary,
      },
    };
  });

  return {
    groupEntries: alignedEntries,
    summary,
    signature: summary
      .map((entry) => `${entry.groupId}:${entry.rotationOffset}`)
      .join("|"),
  };
}

export function getRiicSameShiftBindingAtHour({
  controlCandidate,
  group,
  candidate,
  startHour = 0,
} = {}) {
  return getBindingStatus({
    controlCandidate,
    group,
    candidate,
    startHour,
  });
}
