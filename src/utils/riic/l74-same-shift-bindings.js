import {
  getRiicSameShiftBindingBonusBreakdown,
} from "./l51-control-effects.js";
import {
  recalculateRiicRoomTeamCandidateForActiveControlBindings,
} from "./l62-team-calculation.js";
import {
  RIIC_ACTIVE_ROSTER_RUNTIME_RULES,
  RIIC_ACTIVE_ROSTER_SELECTION_PRIORITY_RULES,
  riicActiveRosterScopeMatches,
} from "./riic-active-roster-rule-data.js";

const EPSILON = 1e-9;
const PREFERRED_SAME_SHIFT_PAIRS = Object.freeze([
  Object.freeze({
    key: "rosmontis-ebenholz",
    leftOperatorId: "char_391_rosmon",
    leftLabel: "迷迭香",
    leftFacility: "manufacture",
    rightOperatorId: "char_4046_ebnhlz",
    rightLabel: "黑键",
    rightFacility: "trading",
  }),
]);

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

function getSegmentOperatorIds(segment) {
  return new Set(
    [
      ...(segment?.operatorIds || []),
      ...(segment?.stationAssignments || []).flatMap((assignment) => [
        ...(assignment?.operatorIds || []),
        ...(assignment?.candidate?.operatorIds || []),
        ...(assignment?.candidate?.operators || []).map(
          (operator) => operator?.charId,
        ),
      ]),
    ]
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean),
  );
}

function candidateHasOperator(candidate, operatorId) {
  const expectedOperatorId = String(operatorId || "").trim();
  if (!expectedOperatorId) {
    return false;
  }

  return (candidate?.segments || []).some((segment) =>
    getSegmentOperatorIds(segment).has(expectedOperatorId),
  );
}

function getCandidateOperatorIdsAtHour(candidate, hour) {
  return getSegmentOperatorIds(getSegmentAtHour(candidate?.segments, hour));
}

function getEntryScope(entry) {
  return {
    roomType: normalizeRoomType(
      entry?.candidate?.candidateScope?.roomType || entry?.group?.facility,
    ),
    product: normalizeProduct(
      entry?.candidate?.candidateScope?.product ||
        entry?.group?.candidateProduct,
    ),
  };
}

function getActiveRosterBonusHours({
  groupEntries = [],
  ownedOperators = [],
} = {}) {
  const candidates = (groupEntries || []).map((entry) => entry?.candidate);
  const cycles = candidates
    .map((candidate) => getSegmentCycleHours(candidate?.segments))
    .filter((cycle) => cycle > 0);
  const cycleHours = cycles.reduce(
    (cycle, current) =>
      cycle > 0 ? leastCommonMultiple(cycle, current) : current,
    0,
  );
  if (cycleHours <= 0) {
    return 0;
  }

  const rosterById = new Map(
    (ownedOperators || []).map((operator) => [
      String(operator?.charId || "").trim(),
      operator,
    ]),
  );
  const boundaries = getTimelineBoundaries(candidates, cycleHours);
  let bonusPercentHours = 0;

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startHour = boundaries[index];
    const durationHours = boundaries[index + 1] - startHour;
    const activeEntries = (groupEntries || [])
      .map((entry) => ({
        entry,
        scope: getEntryScope(entry),
        operatorIds: getCandidateOperatorIdsAtHour(
          entry?.candidate,
          startHour,
        ),
      }))
      .filter(({ operatorIds }) => operatorIds.size > 0);
    const activeOperatorIds = new Set(
      activeEntries.flatMap(({ operatorIds }) => [...operatorIds]),
    );

    for (const rule of RIIC_ACTIVE_ROSTER_RUNTIME_RULES) {
      const owner = rosterById.get(rule.ownerId);
      if (!owner || Number(owner.elite || 0) < rule.eliteAtLeast) {
        continue;
      }

      const ownerIsActive = activeEntries.some(
        ({ entry, scope, operatorIds }) =>
          riicActiveRosterScopeMatches(
            { roomType: rule.roomType, product: rule.product },
            scope,
          ) &&
          operatorIds.has(rule.ownerId) &&
          String(entry?.candidate?.candidateScope?.roomType || "").trim() !==
            "control",
      );
      if (!ownerIsActive) {
        continue;
      }

      const sourceOperatorIds = rule.sourceScope
        ? new Set(
            activeEntries
              .filter(({ scope }) =>
                riicActiveRosterScopeMatches(rule.sourceScope, scope),
              )
              .flatMap(({ operatorIds }) => [...operatorIds]),
          )
        : activeOperatorIds;
      const matchingOperatorCount = Math.min(
        [...sourceOperatorIds].filter(
          (operatorId) =>
            rule.taggedOperatorIds.has(operatorId) &&
            (!rule.excludeOwner || operatorId !== rule.ownerId),
        ).length,
        rule.maximumOperatorCount,
      );
      bonusPercentHours +=
        matchingOperatorCount * rule.percentPerOperator * durationHours;
    }
  }

  return bonusPercentHours;
}

function hasSourceScopedActiveRosterOwner(entry, ownedOperators) {
  const candidate = entry?.candidate;
  const scope = getEntryScope(entry);
  const operatorIds = new Set(
    (candidate?.segments || []).flatMap((segment) => [
      ...getSegmentOperatorIds(segment),
    ]),
  );
  const rosterById = new Map(
    (ownedOperators || []).map((operator) => [
      String(operator?.charId || "").trim(),
      operator,
    ]),
  );

  return RIIC_ACTIVE_ROSTER_RUNTIME_RULES.some((rule) => {
    const owner = rosterById.get(rule.ownerId);
    return (
      Boolean(rule.sourceScope) &&
      operatorIds.has(rule.ownerId) &&
      owner &&
      Number(owner.elite || 0) >= rule.eliteAtLeast &&
      riicActiveRosterScopeMatches(
        { roomType: rule.roomType, product: rule.product },
        scope,
      )
    );
  });
}

function getCandidateTeamCoverageByOperator({
  groupEntries = [],
  operatorId,
} = {}) {
  const candidates = (groupEntries || []).map((entry) => entry?.candidate);
  const cycles = candidates
    .map((candidate) => getSegmentCycleHours(candidate?.segments))
    .filter((cycle) => cycle > 0);
  const cycleHours = cycles.reduce(
    (cycle, current) =>
      cycle > 0 ? leastCommonMultiple(cycle, current) : current,
    0,
  );
  if (cycleHours <= 0) {
    return new Map();
  }

  const statsByCandidateKey = new Map();
  const boundaries = getTimelineBoundaries(candidates, cycleHours);
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startHour = boundaries[index];
    const durationHours = boundaries[index + 1] - startHour;
    const activeEntries = (groupEntries || [])
      .map((entry) => ({
        entry,
        segment: getSegmentAtHour(entry?.candidate?.segments, startHour),
      }))
      .filter(({ segment }) => segment);
    const activeOperatorIds = new Set(
      activeEntries.flatMap(({ segment }) => [...getSegmentOperatorIds(segment)]),
    );

    for (const { entry, segment } of activeEntries) {
      for (const assignment of segment?.stationAssignments || []) {
        const candidate = assignment?.candidate;
        const candidateKey = String(candidate?.key || "").trim();
        if (!candidateKey) {
          continue;
        }
        const key = `${String(entry?.group?.id || "").trim()}:${candidateKey}`;
        const stats = statsByCandidateKey.get(key) || {
          groupId: String(entry?.group?.id || "").trim(),
          candidateKey,
          activeHours: 0,
          operatorActiveHours: 0,
        };
        stats.activeHours += durationHours;
        if (activeOperatorIds.has(operatorId)) {
          stats.operatorActiveHours += durationHours;
        }
        statsByCandidateKey.set(key, stats);
      }
    }
  }

  return statsByCandidateKey;
}

function replaceFallbackOperator(candidate, oldOperatorId, newOperator) {
  const oldId = String(oldOperatorId || "").trim();
  const newId = String(newOperator?.charId || "").trim();
  if (!oldId || !newId || !candidate?.fallback?.operators) {
    return candidate;
  }
  const fallbackOperators = candidate.fallback.operators.map((operator) =>
    String(operator?.charId || "").trim() === oldId
      ? { ...newOperator }
      : operator,
  );
  const operators = (candidate.operators || []).map((operator) =>
    String(operator?.charId || "").trim() === oldId
      ? {
          ...(candidate.operators || []).find(
            (item) => String(item?.charId || "").trim() === newId,
          ),
          ...newOperator,
        }
      : operator,
  );

  return {
    ...candidate,
    operatorIds: (candidate.operatorIds || []).map((operatorId) =>
      String(operatorId || "").trim() === oldId ? newId : operatorId,
    ),
    operators,
    fallback: {
      ...candidate.fallback,
      operators: fallbackOperators,
      fallbackOperatorIds: fallbackOperators.map((operator) => operator.charId),
    },
  };
}

function replaceCandidateInEntries(groupEntries, groupId, candidateKey, update) {
  return (groupEntries || []).map((entry) => {
    if (String(entry?.group?.id || "").trim() !== groupId) {
      return entry;
    }

    return {
      ...entry,
      candidate: {
        ...entry.candidate,
        segments: (entry.candidate?.segments || []).map((segment) => ({
          ...segment,
          stationAssignments: (segment?.stationAssignments || []).map(
            (assignment) =>
              String(assignment?.candidate?.key || "").trim() === candidateKey
                ? {
                    ...assignment,
                    candidate: update(assignment.candidate),
                  }
                : assignment,
          ),
        })),
      },
    };
  });
}

function alignActiveRosterHangerAssignments(groupEntries) {
  let alignedEntries = [...(groupEntries || [])];
  const transfers = [];
  const teamDiagnostics = [];

  for (const rule of RIIC_ACTIVE_ROSTER_SELECTION_PRIORITY_RULES) {
    const statsByCandidateKey = getCandidateTeamCoverageByOperator({
      groupEntries: alignedEntries,
      operatorId: rule.triggerOperatorId,
    });
    const teams = [];
    for (const entry of alignedEntries) {
      for (const segment of entry?.candidate?.segments || []) {
        for (const assignment of segment?.stationAssignments || []) {
          const candidate = assignment?.candidate;
          const groupId = String(entry?.group?.id || "").trim();
          const candidateKey = String(candidate?.key || "").trim();
          const stats = statsByCandidateKey.get(`${groupId}:${candidateKey}`);
          if (!stats || teams.some((team) =>
            team.groupId === groupId && team.candidateKey === candidateKey,
          )) {
            continue;
          }
          teams.push({
            groupId,
            candidateKey,
            candidate,
            operatorIds: candidate.operatorIds || [],
            fallbackOperators: candidate.fallback?.operators || [],
            coverage:
              stats.activeHours > 0
                ? stats.operatorActiveHours / stats.activeHours
                : 0,
          });
        }
      }
    }
    teamDiagnostics.push({
      triggerOperatorId: rule.triggerOperatorId,
      teams: teams.map((team) => ({
        groupId: team.groupId,
        candidateKey: team.candidateKey,
        operatorIds: team.operatorIds,
        coverage: team.coverage,
        fallbackOperators: team.fallbackOperators.map((operator) => ({
          charId: operator?.charId,
          idleFill: operator?.idleFill === true,
          hangerPriority: Number(operator?.hangerPriority || 0),
        })),
      })),
    });

    for (const source of teams) {
      const hanger = (source.candidate?.fallback?.operators || []).find(
        (operator) =>
          rule.taggedOperatorIds.has(String(operator?.charId || "").trim()) &&
          (operator?.idleFill === true || Number(operator?.hangerPriority) > 0),
      );
      if (!hanger || source.coverage > 0) {
        continue;
      }

      const target = teams
        .filter(
          (team) =>
            team.groupId === source.groupId &&
            team.candidateKey !== source.candidateKey &&
            team.coverage > source.coverage,
        )
        .sort((left, right) => right.coverage - left.coverage)
        .find((team) =>
          (team.candidate?.fallback?.operators || []).some(
            (operator) =>
              operator?.idleFill === true &&
              !rule.taggedOperatorIds.has(
                String(operator?.charId || "").trim(),
              ),
          ),
        );
      if (!target) {
        continue;
      }

      const replacement = (target.candidate?.fallback?.operators || []).find(
        (operator) =>
          operator?.idleFill === true &&
          !rule.taggedOperatorIds.has(String(operator?.charId || "").trim()),
      );
      if (!replacement) {
        continue;
      }

      alignedEntries = replaceCandidateInEntries(
        alignedEntries,
        source.groupId,
        source.candidateKey,
        (candidate) =>
          replaceFallbackOperator(candidate, hanger.charId, replacement),
      );
      alignedEntries = replaceCandidateInEntries(
        alignedEntries,
        target.groupId,
        target.candidateKey,
        (candidate) =>
          replaceFallbackOperator(candidate, replacement.charId, hanger),
      );
      transfers.push({
        groupId: source.groupId,
        triggerOperatorId: rule.triggerOperatorId,
        operatorId: hanger.charId,
        fromCandidateKey: source.candidateKey,
        toCandidateKey: target.candidateKey,
      });
      source.coverage = 1;
      target.coverage = 0;
    }
  }

  return {
    groupEntries: alignedEntries,
    transfers,
    teamDiagnostics,
  };
}

function getCandidatePairSameShiftHours({
  leftCandidate,
  rightCandidate,
  leftOperatorId,
  rightOperatorId,
}) {
  const leftCycleHours = getSegmentCycleHours(leftCandidate?.segments);
  const rightCycleHours = getSegmentCycleHours(rightCandidate?.segments);
  const cycleHours = leastCommonMultiple(leftCycleHours, rightCycleHours);
  if (cycleHours <= 0) {
    return 0;
  }

  const boundaries = getTimelineBoundaries(
    [leftCandidate, rightCandidate],
    cycleHours,
  );
  let sameShiftHours = 0;

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startHour = boundaries[index];
    const durationHours = boundaries[index + 1] - startHour;
    const leftOperatorIds = getCandidateOperatorIdsAtHour(
      leftCandidate,
      startHour,
    );
    const rightOperatorIds = getCandidateOperatorIdsAtHour(
      rightCandidate,
      startHour,
    );
    if (
      leftOperatorIds.has(leftOperatorId) &&
      rightOperatorIds.has(rightOperatorId)
    ) {
      sameShiftHours += durationHours;
    }
  }

  return sameShiftHours;
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
  controlOperatorIds,
}) {
  const candidateBindings = getCandidateBindings(candidate, group);
  if (candidateBindings.length === 0) {
    return {
      status: "notApplicable",
      bonusPercent: 0,
      bindings: [],
      controlTeamIndex: null,
      controlOperatorIds: [],
      candidateBindingCount: 0,
    };
  }

  const controlTeamIndex = getControlTeamIndexAtHour(
    controlCandidate,
    startHour,
  );
  const activeControlOperatorIds =
    controlOperatorIds instanceof Set
      ? controlOperatorIds
      : Array.isArray(controlOperatorIds)
        ? new Set(
            controlOperatorIds
              .map((operatorId) => String(operatorId || "").trim())
              .filter(Boolean),
          )
        : getControlTeamOperatorIdsAtHour(controlCandidate, startHour);
  if (controlTeamIndex === null) {
    return {
      status: "unavailable",
      bonusPercent: 0,
      bindings: [],
      controlTeamIndex: null,
      controlOperatorIds: [...activeControlOperatorIds],
      candidateBindingCount: candidateBindings.length,
    };
  }

  const bindings = candidateBindings
    .filter(
      (binding) =>
        Number(binding?.sourceTeamIndex) === controlTeamIndex,
    )
    .map((binding) => {
      const effects = (binding.effects || [])
        .filter((effect) => {
          const sourceOperatorIds = (effect?.sourceOperatorIds || [])
            .map((operatorId) => String(operatorId || "").trim())
            .filter(Boolean);
          return (
            sourceOperatorIds.length === 0 ||
            sourceOperatorIds.some((operatorId) =>
              activeControlOperatorIds.has(operatorId),
            )
          );
        })
        .filter((effect) =>
          areBindingConditionsSatisfied(effect, activeControlOperatorIds),
        );
      const activeBinding = {
        ...binding,
        effects,
      };
      return {
        ...activeBinding,
        ...getRiicSameShiftBindingBonusBreakdown(activeBinding),
      };
    })
    .filter(
      (binding) =>
        binding?.effects?.length > 0 ||
        Math.abs(Number(binding?.bonusPercent || 0)) > EPSILON,
    );
  const bindingBonusPercent = bindings.reduce(
    (total, binding) => total + Number(binding.bonusPercent || 0),
    0,
  );
  const teamCalculation = recalculateRiicRoomTeamCandidateForActiveControlBindings({
    candidate,
    scope: candidate?.candidateScope || {
      roomType: group?.facility,
      product: group?.candidateProduct,
    },
    fallbackOperators: candidate?.fallback?.operators || [],
    controlBindings: bindings,
  });
  const teamCalculationBonusPercent = Number(
    teamCalculation?.coreBonusAdjustmentPercent || 0,
  );
  const bonusPercent = bindingBonusPercent + teamCalculationBonusPercent;

  return {
    status:
      bindings.length > 0 || Math.abs(teamCalculationBonusPercent) > EPSILON
        ? "realized"
        : "unrealized",
    bonusPercent,
    bindingBonusPercent,
    teamCalculationBonusPercent,
    teamCalculation,
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
    controlTeamIndex,
    controlOperatorIds: [...activeControlOperatorIds],
    candidateBindingCount: candidateBindings.length,
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
    coreTeamSynergyWeightedBonus: 0,
    expectedBindingHours: 0,
    realizedBindingHours: 0,
    durationHours: 0,
    hasApplicableBinding: false,
  };
}

function getStationSummaryStatus(summary) {
  if (!summary?.hasApplicableBinding) {
    return "notApplicable";
  }

  if (summary.realizedBindingHours <= EPSILON) {
    return "unrealized";
  }
  if (
    summary.expectedBindingHours > EPSILON &&
    summary.realizedBindingHours + EPSILON <
      summary.expectedBindingHours
  ) {
    return "partial";
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
    return "realized";
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
      trace: [],
      stations: [],
    };
  }

  const stationSummaries = new Map();
  const trace = [];
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
      trace.push({
        startHour,
        durationHours,
        stationIndex,
        candidateKey: String(targetCandidate?.key || "").trim(),
        operatorIds: [...(targetCandidate?.operatorIds || [])],
        status: bindingStatus.status,
        controlTeamIndex: bindingStatus.controlTeamIndex,
        controlOperatorIds: bindingStatus.controlOperatorIds || [],
        candidateBindingCount: bindingStatus.candidateBindingCount || 0,
        realizedBindingCount: bindingStatus.bindings?.length || 0,
        bindingBonusPercent: Number(
          bindingStatus.bindingBonusPercent || 0,
        ),
        teamCalculationBonusPercent: Number(
          bindingStatus.teamCalculationBonusPercent || 0,
        ),
        realizedBonusPercent: Number(bindingStatus.bonusPercent || 0),
        bindingSources: (bindingStatus.bindings || []).map((binding) => ({
          sourceTeamIndex: binding?.sourceTeamIndex,
          roomType: binding?.roomType,
          product: binding?.product,
          effectCount: binding?.effects?.length || 0,
        })),
      });
      const expectedBonusPercent = candidateBindings.reduce(
        (total, binding) => {
          const bindingBonusPercent = Number(
            getRiicSameShiftBindingBonusBreakdown(binding).bonusPercent || 0,
          );
          const teamCalculation =
            recalculateRiicRoomTeamCandidateForActiveControlBindings({
              candidate: targetCandidate,
              scope: targetCandidate?.candidateScope || {
                roomType: group?.facility,
                product: group?.candidateProduct,
              },
              fallbackOperators:
                targetCandidate?.fallback?.operators || [],
              controlBindings: [binding],
            });
          return (
            total +
            bindingBonusPercent +
            Number(teamCalculation?.coreBonusAdjustmentPercent || 0)
          );
        },
        0,
      );

      summary.hasApplicableBinding = true;
      summary.durationHours += durationHours;
      summary.expectedBindingHours +=
        candidateBindings.length * durationHours;
      summary.realizedBindingHours +=
        (bindingStatus.bindings || []).length * durationHours;
      summary.expectedWeightedBonus += expectedBonusPercent * durationHours;
      summary.realizedWeightedBonus +=
        Number(bindingStatus.bonusPercent || 0) * durationHours;
      summary.coreTeamSynergyWeightedBonus +=
        Math.max(
          0,
          Number(bindingStatus.teamCalculationBonusPercent || 0),
        ) * durationHours;
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
  const coreTeamSynergyWeightedBonus = stations.reduce(
    (total, station) =>
      total + Number(station.coreTeamSynergyWeightedBonus || 0),
    0,
  );

  return {
    cycleHours,
    durationHours,
    trace,
    expectedBindingHours: stations.reduce(
      (total, station) =>
        total + Number(station.expectedBindingHours || 0),
      0,
    ),
    realizedBindingHours: stations.reduce(
      (total, station) =>
        total + Number(station.realizedBindingHours || 0),
      0,
    ),
    realizedWeightedBonus,
    coreTeamSynergyWeightedBonus,
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

function rotateEntryCandidate({ entry, offset, controlCandidate }) {
  const candidate = entry?.candidate || {};
  const segmentCount = candidate?.segments?.length || 0;
  const rotatedCandidate = rotateCandidateSegments(candidate, offset);
  const previousOffset = Number(candidate?.sameShiftBindingOffset);
  const nextOffset =
    segmentCount > 0
      ? ((Number.isInteger(previousOffset) ? previousOffset : 0) + offset) %
        segmentCount
      : 0;
  const summary = summarizeCandidateBindings({
    controlCandidate,
    group: entry?.group,
    candidate: rotatedCandidate,
  });
  const nextCandidate = {
    ...rotatedCandidate,
    sameShiftBindingOffset: nextOffset,
  };
  delete nextCandidate.sameShiftBindingSummary;
  if (summary.expectedBindingHours > EPSILON) {
    nextCandidate.sameShiftBindingSummary = {
      ...summary,
      groupId: String(entry?.group?.id || "").trim(),
      rotationOffset: nextOffset,
    };
  }

  return {
    ...entry,
    candidate: nextCandidate,
  };
}

function alignPreferredSameShiftPairs({
  groupEntries = [],
  controlCandidate,
} = {}) {
  const alignedEntries = [...groupEntries];
  const debug = [];

  for (const pair of PREFERRED_SAME_SHIFT_PAIRS) {
    const leftIndex = alignedEntries.findIndex(({ group, candidate }) =>
      candidateHasOperator(candidate, pair.leftOperatorId) &&
      String(group?.facility || "") === pair.leftFacility,
    );
    const rightIndex = alignedEntries.findIndex(({ group, candidate }) =>
      candidateHasOperator(candidate, pair.rightOperatorId) &&
      String(group?.facility || "") === pair.rightFacility,
    );

    if (leftIndex < 0 || rightIndex < 0) {
      debug.push({
        key: pair.key,
        leftLabel: pair.leftLabel,
        rightLabel: pair.rightLabel,
        status: "missingOperator",
        initialSameShiftHours: 0,
        finalSameShiftHours: 0,
        leftOffset: 0,
        rightOffset: 0,
      });
      continue;
    }
    if (leftIndex === rightIndex) {
      debug.push({
        key: pair.key,
        leftLabel: pair.leftLabel,
        rightLabel: pair.rightLabel,
        status: "sameGroup",
        initialSameShiftHours: 0,
        finalSameShiftHours: 0,
        leftOffset: 0,
        rightOffset: 0,
      });
      continue;
    }

    const leftCandidate = alignedEntries[leftIndex].candidate;
    const rightCandidate = alignedEntries[rightIndex].candidate;
    const initialSameShiftHours = getCandidatePairSameShiftHours({
      leftCandidate,
      rightCandidate,
      leftOperatorId: pair.leftOperatorId,
      rightOperatorId: pair.rightOperatorId,
    });
    let best = {
      leftOffset: 0,
      rightOffset: 0,
      sameShiftHours: initialSameShiftHours,
      changedEntryCount: 0,
    };
    const leftSegmentCount = leftCandidate?.segments?.length || 1;
    const rightSegmentCount = rightCandidate?.segments?.length || 1;

    for (let leftOffset = 0; leftOffset < leftSegmentCount; leftOffset += 1) {
      for (
        let rightOffset = 0;
        rightOffset < rightSegmentCount;
        rightOffset += 1
      ) {
        const sameShiftHours = getCandidatePairSameShiftHours({
          leftCandidate: rotateCandidateSegments(leftCandidate, leftOffset),
          rightCandidate: rotateCandidateSegments(rightCandidate, rightOffset),
          leftOperatorId: pair.leftOperatorId,
          rightOperatorId: pair.rightOperatorId,
        });
        const changedEntryCount =
          Number(leftOffset > 0) + Number(rightOffset > 0);
        const accepted =
          sameShiftHours > best.sameShiftHours + EPSILON ||
          (Math.abs(sameShiftHours - best.sameShiftHours) <= EPSILON &&
            changedEntryCount < best.changedEntryCount);
        if (accepted) {
          best = {
            leftOffset,
            rightOffset,
            sameShiftHours,
            changedEntryCount,
          };
        }
      }
    }

    if (best.leftOffset > 0) {
      alignedEntries[leftIndex] = rotateEntryCandidate({
        entry: alignedEntries[leftIndex],
        offset: best.leftOffset,
        controlCandidate,
      });
    }
    if (best.rightOffset > 0) {
      alignedEntries[rightIndex] = rotateEntryCandidate({
        entry: alignedEntries[rightIndex],
        offset: best.rightOffset,
        controlCandidate,
      });
    }

    debug.push({
      key: pair.key,
      leftLabel: pair.leftLabel,
      rightLabel: pair.rightLabel,
      status:
        best.sameShiftHours > initialSameShiftHours + EPSILON
          ? "aligned"
          : "alreadyBest",
      initialSameShiftHours,
      finalSameShiftHours: best.sameShiftHours,
      leftOffset: best.leftOffset,
      rightOffset: best.rightOffset,
    });
  }

  return {
    groupEntries: alignedEntries,
    debug,
  };
}

/**
 * L74: keeps selected teams intact while selecting the room rotation phase that
 * realizes the most control-center same-shift bonus.
 */
export function alignRiicScheduleSameShiftBindings({
  groupEntries = [],
  lockedOperatorIds = [],
  ownedOperators = [],
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
      debug: {
        status: "missingControlCandidate",
        control: {
          groupId: String(controlEntry?.group?.id || "").trim(),
          operatorIds: [],
          segments: [],
        },
        groups: [],
      },
    };
  }

  const summary = [];
  const debugGroups = [];
  const alignedEntries = (groupEntries || []).map((entry) => {
    const group = entry?.group;
    const candidate = entry?.candidate;
    const debug = {
      groupId: String(group?.id || "").trim(),
      groupLabel: String(group?.label || group?.id || "").trim(),
      facility: String(group?.facility || "").trim(),
      candidateKey: String(candidate?.key || "").trim(),
      operatorIds: [
        ...(candidate?.segments || [])
          .flatMap((segment) => segment?.stationAssignments || [])
          .flatMap((assignment) => assignment?.candidate?.operatorIds || []),
      ],
      segmentCount: candidate?.segments?.length || 0,
      skipReason: "",
      initial: null,
      attempts: [],
      selectedOffset: 0,
      selected: null,
    };
    if (
      !candidate ||
      entry === controlEntry ||
      (candidate?.segments || []).length <= 1
    ) {
      debug.skipReason = !candidate
        ? "missingCandidate"
        : entry === controlEntry
          ? "controlCenter"
          : "singleSegment";
      debugGroups.push(debug);
      return entry;
    }
    if (candidateHasAnyOperator(candidate, lockedOperatorIds)) {
      debug.skipReason = "lockedOperator";
      debugGroups.push(debug);
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
      debug.skipReason = "noCandidateBinding";
      debugGroups.push(debug);
      return entry;
    }

    let selectedOffset = 0;
    let selectedCandidate = candidate;
    let selectedSummary = summarizeCandidateBindings({
      controlCandidate,
      group,
      candidate,
    });
    debug.initial = {
      offset: 0,
      coreTeamSynergyWeightedBonus:
        selectedSummary.coreTeamSynergyWeightedBonus,
      realizedBindingHours: selectedSummary.realizedBindingHours,
      expectedBindingHours: selectedSummary.expectedBindingHours,
      realizedWeightedBonus: selectedSummary.realizedWeightedBonus,
      trace: selectedSummary.trace || [],
    };
    debug.attempts.push({
      offset: 0,
      coreTeamSynergyWeightedBonus:
        selectedSummary.coreTeamSynergyWeightedBonus,
      realizedBindingHours: selectedSummary.realizedBindingHours,
      expectedBindingHours: selectedSummary.expectedBindingHours,
      realizedWeightedBonus: selectedSummary.realizedWeightedBonus,
      acceptedAtComparison: true,
      reason: "baseline",
      trace: selectedSummary.trace || [],
    });

    for (let offset = 1; offset < candidate.segments.length; offset += 1) {
      const rotatedCandidate = rotateCandidateSegments(candidate, offset);
      const rotatedSummary = summarizeCandidateBindings({
        controlCandidate,
        group,
        candidate: rotatedCandidate,
      });
      const hasMoreCoreTeamSynergy =
        rotatedSummary.coreTeamSynergyWeightedBonus >
        selectedSummary.coreTeamSynergyWeightedBonus + EPSILON;
      const hasSameCoreTeamSynergy =
        Math.abs(
          rotatedSummary.coreTeamSynergyWeightedBonus -
            selectedSummary.coreTeamSynergyWeightedBonus,
        ) <= EPSILON;
      const hasMoreBindingHours =
        rotatedSummary.realizedBindingHours >
        selectedSummary.realizedBindingHours + EPSILON;
      const hasSameBindingHours =
        Math.abs(
          rotatedSummary.realizedBindingHours -
            selectedSummary.realizedBindingHours,
        ) <= EPSILON;
      const hasMoreWeightedBonus =
        rotatedSummary.realizedWeightedBonus >
        selectedSummary.realizedWeightedBonus + EPSILON;
      const acceptedAtComparison =
        hasMoreCoreTeamSynergy ||
        (hasSameCoreTeamSynergy &&
          (hasMoreBindingHours ||
            (hasSameBindingHours && hasMoreWeightedBonus)));
      debug.attempts.push({
        offset,
        coreTeamSynergyWeightedBonus:
          rotatedSummary.coreTeamSynergyWeightedBonus,
        realizedBindingHours: rotatedSummary.realizedBindingHours,
        expectedBindingHours: rotatedSummary.expectedBindingHours,
        realizedWeightedBonus: rotatedSummary.realizedWeightedBonus,
        acceptedAtComparison,
        reason: hasMoreCoreTeamSynergy
          ? "moreCoreTeamSynergy"
          : !hasSameCoreTeamSynergy
            ? "lessCoreTeamSynergy"
            : hasMoreBindingHours
              ? "moreBindingHours"
              : hasSameBindingHours && hasMoreWeightedBonus
                ? "sameHoursMoreBonus"
                : hasSameBindingHours
                  ? "sameHoursNotMoreBonus"
                  : "lessBindingHours",
        trace: rotatedSummary.trace || [],
      });
      if (acceptedAtComparison) {
        selectedOffset = offset;
        selectedCandidate = rotatedCandidate;
        selectedSummary = rotatedSummary;
      }
    }

    const resolvedSummary = {
      ...selectedSummary,
      groupId: String(group?.id || "").trim(),
      rotationOffset: selectedOffset,
    };
    summary.push(resolvedSummary);
    debug.selectedOffset = selectedOffset;
    debug.selected = {
      coreTeamSynergyWeightedBonus:
        selectedSummary.coreTeamSynergyWeightedBonus,
      realizedBindingHours: selectedSummary.realizedBindingHours,
      expectedBindingHours: selectedSummary.expectedBindingHours,
      realizedWeightedBonus: selectedSummary.realizedWeightedBonus,
      trace: selectedSummary.trace || [],
    };
    for (const attempt of debug.attempts) {
      attempt.selected = attempt.offset === selectedOffset;
    }
    debugGroups.push(debug);
    return {
      ...entry,
      candidate: {
        ...selectedCandidate,
        sameShiftBindingOffset: selectedOffset,
        sameShiftBindingSummary: resolvedSummary,
      },
    };
  });

  // L70 selects teams before same-shift groups are phase-aligned. Recheck
  // source-scoped active-roster effects afterward so those rotations cannot
  // leave the owner and its source team on different shifts.
  const activeRosterAlignedEntries = [...alignedEntries];
  const activeRosterAlignment = [];
  const activeRosterAlignmentOrder = activeRosterAlignedEntries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) =>
      hasSourceScopedActiveRosterOwner(entry, ownedOperators),
    );

  for (const { entry, index } of activeRosterAlignmentOrder) {
    const candidate = activeRosterAlignedEntries[index]?.candidate;
    const segmentCount = candidate?.segments?.length || 0;
    const initialBonusPercentHours = getActiveRosterBonusHours({
      groupEntries: activeRosterAlignedEntries,
      ownedOperators,
    });
    let selectedOffset = 0;
    let selectedBonusPercentHours = initialBonusPercentHours;
    const attempts = [{
      offset: 0,
      bonusPercentHours: initialBonusPercentHours,
      selected: true,
    }];

    for (let offset = 1; offset < segmentCount; offset += 1) {
      const rotatedCandidate = rotateCandidateSegments(candidate, offset);
      const rotatedEntries = activeRosterAlignedEntries.map(
        (currentEntry, currentIndex) =>
          currentIndex === index
            ? { ...currentEntry, candidate: rotatedCandidate }
            : currentEntry,
      );
      const bonusPercentHours = getActiveRosterBonusHours({
        groupEntries: rotatedEntries,
        ownedOperators,
      });
      const selected =
        bonusPercentHours > selectedBonusPercentHours + EPSILON;
      attempts.push({ offset, bonusPercentHours, selected });
      if (selected) {
        selectedOffset = offset;
        selectedBonusPercentHours = bonusPercentHours;
      }
    }

    if (selectedOffset > 0) {
      activeRosterAlignedEntries[index] = rotateEntryCandidate({
        entry: activeRosterAlignedEntries[index],
        offset: selectedOffset,
        controlCandidate,
      });
    }
    const alignment = {
      groupId: String(entry?.group?.id || "").trim(),
      ownerOperatorIds: [
        ...(candidate?.segments || []).flatMap((segment) => [
          ...getSegmentOperatorIds(segment),
        ]),
      ].filter((operatorId) =>
        RIIC_ACTIVE_ROSTER_RUNTIME_RULES.some(
          (rule) => rule.sourceScope && rule.ownerId === operatorId,
        ),
      ),
      initialBonusPercentHours,
      finalBonusPercentHours: selectedBonusPercentHours,
      selectedOffset,
      attempts,
    };
    activeRosterAlignment.push(alignment);
    const debugGroup = debugGroups[index];
    if (debugGroup) {
      debugGroup.activeRosterAlignment = alignment;
    }
  }

  const activeRosterHangerAlignment = alignActiveRosterHangerAssignments(
    activeRosterAlignedEntries,
  );
  const preferredSameShiftAlignment = alignPreferredSameShiftPairs({
    groupEntries: activeRosterHangerAlignment.groupEntries,
    controlCandidate,
  });

  return {
    groupEntries: preferredSameShiftAlignment.groupEntries,
    summary,
    signature: summary
      .map((entry) => `${entry.groupId}:${entry.rotationOffset}`)
      .join("|"),
    debug: {
      status: "ready",
      control: {
        groupId: String(controlEntry?.group?.id || "").trim(),
        operatorIds: [
          ...(controlCandidate?.segments || [])
            .flatMap((segment) => segment?.stationAssignments || [])
            .flatMap((assignment) => assignment?.candidate?.operatorIds || []),
        ],
        segments: (controlCandidate?.segments || []).map(
          (segment, index) => ({
            index,
            durationHours: Number(segment?.durationHours || 0),
            teamIndex:
              segment?.stationAssignments?.[0]?.candidate
                ?.controlCenterTeamIndex ??
              segment?.controlCenterTeamIndex ??
              null,
            operatorIds:
              segment?.stationAssignments?.[0]?.candidate?.operatorIds || [],
          }),
        ),
      },
      groups: debugGroups,
      activeRosterAlignment,
      activeRosterHangerTransfers:
        activeRosterHangerAlignment.transfers,
      activeRosterHangerDiagnostics:
        activeRosterHangerAlignment.teamDiagnostics,
      preferredSameShift: preferredSameShiftAlignment.debug,
    },
  };
}

export function getRiicSameShiftBindingAtHour({
  controlCandidate,
  group,
  candidate,
  startHour = 0,
  controlOperatorIds,
} = {}) {
  return getBindingStatus({
    controlCandidate,
    group,
    candidate,
    startHour,
    controlOperatorIds,
  });
}
