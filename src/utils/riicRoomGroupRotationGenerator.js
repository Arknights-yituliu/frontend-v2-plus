import {
  getRiicCalculationStatusRank,
  getRiicCandidateStrategies,
  mergeRiicCalculationStatuses,
  selectRiicCandidatesByStrategy,
} from "./riicCandidateStrategy.js";

const MAX_CONTINUOUS_WORK_HOURS = 24;
const DEFAULT_OPTIONS = Object.freeze({
  candidateLimit: 12,
  stationCandidateLimit: 12,
  segmentConfigurationLimit: 36,
  beamLimit: 72,
});

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function getQualityRank(quality) {
  return quality === "baseOnly" ? 1 : 0;
}

function getRankingPercent(candidate) {
  const explicitRankingPercent = Number(candidate?.rankingPercent);
  if (Number.isFinite(explicitRankingPercent)) {
    return explicitRankingPercent;
  }

  const averagePercent = Number(candidate?.averagePercent);
  const basePercent = Number.isFinite(averagePercent)
    ? averagePercent
    : Number(candidate?.totalPercent || 0);
  return basePercent + Number(candidate?.sortScore || 0);
}

function compareByQualityAndEfficiency(left, right) {
  const calculationDifference =
    getRiicCalculationStatusRank(left.calculationStatus) -
    getRiicCalculationStatusRank(right.calculationStatus);
  if (calculationDifference !== 0) {
    return calculationDifference;
  }

  const qualityDifference =
    getQualityRank(left.quality) - getQualityRank(right.quality);
  if (qualityDifference !== 0) {
    return qualityDifference;
  }

  const leftRankingPercent = getRankingPercent(left);
  const rightRankingPercent = getRankingPercent(right);
  if (leftRankingPercent !== rightRankingPercent) {
    return rightRankingPercent - leftRankingPercent;
  }

  return left.key.localeCompare(right.key, "en");
}

function getCandidateOperatorIds(candidate) {
  return [
    ...new Set(
      (candidate?.operatorIds || [])
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
}

function normalizeRotationCycle(rotationCycle) {
  const segments = (rotationCycle?.segments || [])
    .map((segment, index) => {
      const durationHours = Number(segment?.durationHours);
      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        return null;
      }

      return {
        index,
        phase: Number.isInteger(segment?.phase) ? segment.phase : index,
        durationHours,
      };
    })
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return {
    cycleHours: segments.reduce(
      (total, segment) => total + segment.durationHours,
      0,
    ),
    segments,
  };
}

function getTemplateSources(candidate) {
  return (candidate?.sources?.templates || []).filter(
    (template) => template?.templateId,
  );
}

function getCandidateTemplateIds(candidate) {
  return [
    ...new Set(
      getTemplateSources(candidate).map((template) => template.templateId),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
}

function selectStationCandidatePool(candidates, limit) {
  const validCandidates = (candidates || []).filter(
    (candidate) =>
      candidate?.key &&
      Number.isFinite(Number(candidate.totalPercent)) &&
        Number.isFinite(Number(candidate.bonusPercent)),
  );

  return selectRiicCandidatesByStrategy({
    items: validCandidates,
    limit,
    compare: compareByQualityAndEfficiency,
    // Rotation construction needs several generic variants at once. Limiting
    // this stage to two would remove a valid AB -> BC -> AC cycle before it
    // can be evaluated. The later rotation and whole-schedule stages still
    // apply their own bounded strategy selection.
    quotaMultiplier: Math.max(1, Math.ceil(limit / 2)),
  });
}

function mergeStrategySources(items) {
  return [
    ...new Map(
      (items || [])
        .flatMap((item) => getRiicCandidateStrategies(item))
        .map((strategy) => [strategy.familyId, strategy]),
    ).values(),
  ].sort((left, right) => left.familyId.localeCompare(right.familyId, "en"));
}

function normalizeStations(stationCandidateSets, stationCandidateLimit) {
  const stations = (stationCandidateSets || [])
    .map((station, stationIndex) => {
      const expectedSlots = Number(station?.expectedSlots);
      const candidates = selectStationCandidatePool(
        station?.candidates,
        stationCandidateLimit,
      );

      if (!Number.isInteger(expectedSlots) || expectedSlots < 1) {
        return null;
      }

      return {
        stationIndex: Number.isInteger(station?.stationIndex)
          ? station.stationIndex
          : stationIndex,
        expectedSlots,
        candidates,
      };
    })
    .filter(Boolean);

  if (
    stations.length === 0 ||
    stations.some((station) => station.candidates.length === 0)
  ) {
    return null;
  }

  return stations;
}

function buildSegmentConfigurations(stations, limit) {
  const configurations = [];

  const build = (
    stationIndex,
    assignments,
    usedOperatorIds,
    totalPercent,
    totalRankingPercent,
    hasBaseOnly,
  ) => {
    if (stationIndex === stations.length) {
      const key = assignments
        .map(
          (assignment) =>
            `${assignment.stationIndex}:${assignment.candidate.key}`,
        )
        .join("|");
      configurations.push({
        key,
        stationAssignments: assignments,
        operatorIds: [...usedOperatorIds].sort((left, right) =>
          left.localeCompare(right, "en"),
        ),
        templateIds: [
          ...new Set(
            assignments.flatMap((assignment) =>
              getCandidateTemplateIds(assignment.candidate),
            ),
          ),
        ].sort((left, right) => left.localeCompare(right, "en")),
        strategySources: mergeStrategySources(
          assignments.map((assignment) => assignment.candidate),
        ),
        calculationStatus: mergeRiicCalculationStatuses(
          assignments.map(
            (assignment) => assignment.candidate.calculationStatus,
          ),
        ),
        averagePercent: totalPercent / stations.length,
        rankingPercent: totalRankingPercent / stations.length,
        quality: hasBaseOnly ? "baseOnly" : "complete",
      });
      return;
    }

    const station = stations[stationIndex];
    for (const candidate of station.candidates) {
      const operatorIds = getCandidateOperatorIds(candidate);
      if (operatorIds.some((charId) => usedOperatorIds.has(charId))) {
        continue;
      }

      const nextUsedOperatorIds = new Set(usedOperatorIds);
      for (const charId of operatorIds) {
        nextUsedOperatorIds.add(charId);
      }

      build(
        stationIndex + 1,
        [
          ...assignments,
          {
            stationIndex: station.stationIndex,
            expectedSlots: station.expectedSlots,
            candidate,
          },
        ],
        nextUsedOperatorIds,
        totalPercent + Number(candidate.totalPercent),
        totalRankingPercent + getRankingPercent(candidate),
        hasBaseOnly || candidate.quality === "baseOnly",
      );
    }
  };

  build(0, [], new Set(), 0, 0, false);
  const sortedConfigurations = configurations.sort(compareByQualityAndEfficiency);
  const fallbackConfiguration = sortedConfigurations.find(
    (configuration) => configuration.operatorIds.length === 0,
  );

  return selectRiicCandidatesByStrategy({
    items: sortedConfigurations,
    limit,
    compare: compareByQualityAndEfficiency,
    getStrategies: (configuration) => configuration.strategySources || [],
    quotaMultiplier: Math.max(2, stations.length * 2),
  });
}

function getNextOperatorStreaks(
  currentStreaks,
  activeOperatorIds,
  durationHours,
) {
  const nextStreaks = new Map();

  for (const charId of activeOperatorIds) {
    const nextHours = (currentStreaks.get(charId) || 0) + durationHours;
    if (nextHours > MAX_CONTINUOUS_WORK_HOURS) {
      return null;
    }
    nextStreaks.set(charId, nextHours);
  }

  return nextStreaks;
}

function limitBeam(partialPlans, limit, quotaMultiplier) {
  const completePlans = [];
  const baseOnlyPlans = [];

  for (const plan of partialPlans) {
    if (plan.quality === "baseOnly") {
      baseOnlyPlans.push(plan);
    } else {
      completePlans.push(plan);
    }
  }

  completePlans.sort(compareByQualityAndEfficiency);
  baseOnlyPlans.sort(compareByQualityAndEfficiency);

  const completeLimit = Math.max(1, Math.ceil((limit * 2) / 3));
  const baseOnlyLimit = Math.max(0, limit - completeLimit);
  const standardPlans = [
    ...completePlans.slice(0, completeLimit),
    ...baseOnlyPlans.slice(0, baseOnlyLimit),
  ];
  const remainingPlans = [
    ...completePlans.slice(completeLimit),
    ...baseOnlyPlans.slice(baseOnlyLimit),
  ].sort(compareByQualityAndEfficiency);

  return selectRiicCandidatesByStrategy({
    items: [...standardPlans, ...remainingPlans],
    limit,
    compare: compareByQualityAndEfficiency,
    getStrategies: (plan) => plan.strategySources || [],
    quotaMultiplier,
  });
}

function getCyclicOperatorUsage(segments) {
  const activityByOperator = new Map();

  for (const segment of segments) {
    for (const charId of segment.operatorIds) {
      if (!activityByOperator.has(charId)) {
        activityByOperator.set(
          charId,
          Array.from({ length: segments.length }, () => false),
        );
      }
      activityByOperator.get(charId)[segment.index] = true;
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
      const durationHours = segments[index].durationHours;

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

  return usage.sort((left, right) =>
    left.charId.localeCompare(right.charId, "en"),
  );
}

function getSegmentCycleToken(segment) {
  const assignments = [...(segment?.stationAssignments || [])]
    .sort(
      (left, right) =>
        Number(left?.stationIndex || 0) - Number(right?.stationIndex || 0),
    )
    .map(
      (assignment) =>
        `${assignment.stationIndex}:${assignment.candidate?.key || ""}`,
    )
    .join("|");

  return `${segment?.durationHours || 0}:${assignments}`;
}

function getCanonicalRotationCycleKey(segments) {
  const tokens = (segments || []).map(getSegmentCycleToken);
  if (tokens.length === 0) {
    return "";
  }

  let canonicalKey = null;
  for (let offset = 0; offset < tokens.length; offset += 1) {
    const rotation = [
      ...tokens.slice(offset),
      ...tokens.slice(0, offset),
    ].join(">>");
    if (canonicalKey === null || rotation.localeCompare(canonicalKey, "en") < 0) {
      canonicalKey = rotation;
    }
  }

  return canonicalKey;
}

function deduplicateCyclicRotations(candidates) {
  const selected = [];
  const seenCycleKeys = new Set();

  for (const candidate of candidates) {
    const cycleKey = getCanonicalRotationCycleKey(candidate?.segments);
    if (seenCycleKeys.has(cycleKey)) {
      continue;
    }

    seenCycleKeys.add(cycleKey);
    selected.push(candidate);
  }

  return selected;
}

/**
 * Combines per-station candidates into a bounded, cyclic room-group schedule.
 * It only validates the current room group; cross-room conflicts remain a
 * later whole-schedule concern.
 */
export function generateRiicRoomGroupRotationCandidates({
  stationCandidateSets,
  rotationCycle,
  candidateLimit = DEFAULT_OPTIONS.candidateLimit,
  stationCandidateLimit = DEFAULT_OPTIONS.stationCandidateLimit,
  segmentConfigurationLimit = DEFAULT_OPTIONS.segmentConfigurationLimit,
  beamLimit = DEFAULT_OPTIONS.beamLimit,
}) {
  const normalizedCycle = normalizeRotationCycle(rotationCycle);
  if (!normalizedCycle) {
    throw new Error("A valid RIIC rotation cycle is required");
  }

  const normalizedOptions = {
    candidateLimit: toPositiveInteger(
      candidateLimit,
      DEFAULT_OPTIONS.candidateLimit,
    ),
    stationCandidateLimit: toPositiveInteger(
      stationCandidateLimit,
      DEFAULT_OPTIONS.stationCandidateLimit,
    ),
    segmentConfigurationLimit: toPositiveInteger(
      segmentConfigurationLimit,
      DEFAULT_OPTIONS.segmentConfigurationLimit,
    ),
    beamLimit: toPositiveInteger(beamLimit, DEFAULT_OPTIONS.beamLimit),
  };
  const stations = normalizeStations(
    stationCandidateSets,
    normalizedOptions.stationCandidateLimit,
  );
  if (!stations) {
    throw new Error("Each room-group station requires at least one candidate");
  }

  const segmentConfigurations = buildSegmentConfigurations(
    stations,
    normalizedOptions.segmentConfigurationLimit,
  );
  let evaluatedPartialPlanCount = 0;
  let beam = [
    {
      key: "",
      quality: "complete",
      weightedEfficiencyTotal: 0,
      weightedRankingTotal: 0,
      durationHours: 0,
      averagePercent: 0,
      rankingPercent: 0,
      templateIds: [],
      strategySources: [],
      calculationStatus: "calculated",
      operatorStreaks: new Map(),
          segments: [],
    },
  ];

  for (
    let segmentIndex = 0;
    segmentIndex < normalizedCycle.segments.length;
    segmentIndex += 1
  ) {
    const segment = normalizedCycle.segments[segmentIndex];
    const nextPlans = [];

    for (const partialPlan of beam) {
      for (const configuration of segmentConfigurations) {
        const operatorStreaks = getNextOperatorStreaks(
          partialPlan.operatorStreaks,
          configuration.operatorIds,
          segment.durationHours,
        );
        if (!operatorStreaks) {
          continue;
        }

        evaluatedPartialPlanCount += 1;
        nextPlans.push({
          key: partialPlan.key
            ? `${partialPlan.key}>>${configuration.key}`
            : configuration.key,
          quality:
            partialPlan.quality === "baseOnly" ||
            configuration.quality === "baseOnly"
              ? "baseOnly"
              : "complete",
          weightedEfficiencyTotal:
            partialPlan.weightedEfficiencyTotal +
            configuration.averagePercent * segment.durationHours,
          weightedRankingTotal:
            partialPlan.weightedRankingTotal +
            configuration.rankingPercent * segment.durationHours,
          durationHours: partialPlan.durationHours + segment.durationHours,
          averagePercent:
            (partialPlan.weightedEfficiencyTotal +
              configuration.averagePercent * segment.durationHours) /
            (partialPlan.durationHours + segment.durationHours),
          rankingPercent:
            (partialPlan.weightedRankingTotal +
              configuration.rankingPercent * segment.durationHours) /
            (partialPlan.durationHours + segment.durationHours),
          templateIds: [
            ...new Set([
              ...partialPlan.templateIds,
              ...configuration.templateIds,
            ]),
          ].sort((left, right) => left.localeCompare(right, "en")),
          strategySources: mergeStrategySources([
            partialPlan,
            configuration,
          ]),
          calculationStatus: mergeRiicCalculationStatuses([
            partialPlan.calculationStatus,
            configuration.calculationStatus,
          ]),
          operatorStreaks,
          segments: [
            ...partialPlan.segments,
            {
              ...segment,
              operatorIds: configuration.operatorIds,
              stationAssignments: configuration.stationAssignments,
              averagePercent: configuration.averagePercent,
              rankingPercent: configuration.rankingPercent,
              quality: configuration.quality,
              calculationStatus: configuration.calculationStatus,
            },
          ],
        });
      }
    }

    const viablePlans =
      segmentIndex === normalizedCycle.segments.length - 1
        ? nextPlans.filter((plan) => getCyclicOperatorUsage(plan.segments))
        : nextPlans;
    beam = limitBeam(
      viablePlans,
      normalizedOptions.beamLimit,
      Math.max(2, stations.length * 2),
    );
    if (beam.length === 0) {
      break;
    }
  }

  const candidates = deduplicateCyclicRotations(
    beam
      .map((plan) => {
        const operatorUsage = getCyclicOperatorUsage(plan.segments);
        if (!operatorUsage) {
          return null;
        }

        return {
          key: plan.key,
          quality: plan.quality,
          cycleHours: normalizedCycle.cycleHours,
          averagePercent:
            Math.round(
              (plan.weightedEfficiencyTotal / plan.durationHours) * 10,
            ) / 10,
          rankingPercent:
            Math.round(
              (plan.weightedRankingTotal / plan.durationHours) * 10,
            ) / 10,
          longestContinuousWorkHours: operatorUsage.reduce(
            (longestHours, operator) =>
              Math.max(longestHours, operator.longestContinuousHours),
            0,
          ),
          templateIds: plan.templateIds,
          strategySources: plan.strategySources,
          calculationStatus: plan.calculationStatus,
          operatorUsage,
          segments: plan.segments,
        };
      })
      .filter(Boolean)
      .sort(compareByQualityAndEfficiency),
  );
  const selectedCandidates = selectRiicCandidatesByStrategy({
    items: candidates,
    limit: normalizedOptions.candidateLimit,
    compare: compareByQualityAndEfficiency,
    getStrategies: (candidate) => candidate.strategySources || [],
  });

  return {
    cycleHours: normalizedCycle.cycleHours,
    segments: normalizedCycle.segments,
    candidates: selectedCandidates,
    summary: {
      stationCount: stations.length,
      segmentCount: normalizedCycle.segments.length,
      segmentConfigurationCount: segmentConfigurations.length,
      evaluatedPartialPlanCount,
      candidateCount: selectedCandidates.length,
    },
  };
}
