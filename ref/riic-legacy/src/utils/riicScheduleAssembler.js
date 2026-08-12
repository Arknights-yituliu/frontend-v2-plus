import {
  getRiicCalculationStatusRank,
  getRiicCandidateStrategies,
  mergeRiicCalculationStatuses,
  selectRiicCandidatesByStrategy,
} from "./riicCandidateStrategy.js";

const DEFAULT_OPTIONS = Object.freeze({
  candidateLimit: 12,
  groupCandidateLimit: 8,
  beamLimit: 72,
});

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function getCandidateOperatorIds(candidate) {
  const usageIds = (candidate?.operatorUsage || [])
    .map((operator) => String(operator?.charId || "").trim())
    .filter(Boolean);
  if (usageIds.length > 0) {
    return [...new Set(usageIds)].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
  }

  return [
    ...new Set(
      (candidate?.segments || [])
        .flatMap((segment) => segment?.stationAssignments || [])
        .flatMap((assignment) => assignment?.candidate?.operatorIds || [])
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
}

function getTemplateSources(candidate) {
  const sources = new Map();
  for (const segment of candidate?.segments || []) {
    for (const assignment of segment?.stationAssignments || []) {
      for (const template of assignment?.candidate?.sources?.templates || []) {
        if (template?.templateId && !sources.has(template.templateId)) {
          sources.set(template.templateId, {
            templateId: template.templateId,
            templateName: template.templateName || template.templateId,
            candidateTier: template.candidateTier || "core",
            estimateStatus: template.estimateStatus || "calculated",
          });
        }
      }
    }
  }

  return [...sources.values()].sort((left, right) =>
    left.templateId.localeCompare(right.templateId, "en"),
  );
}

function getStrategyPriorityRank(strategies) {
  if (strategies.some((strategy) => strategy.kind === "roomTemplate")) {
    return 0;
  }
  if (strategies.some((strategy) => strategy.kind === "coreTemplate")) {
    return 1;
  }
  return 2;
}

function normalizeGroupCandidate(candidate) {
  const key = String(candidate?.key || "").trim();
  if (!key) {
    return null;
  }

  const templateSources = getTemplateSources(candidate);
  const strategySources = getRiicCandidateStrategies(candidate);
  const averagePercent = Number(candidate?.averagePercent);
  const rankingPercent = Number(candidate?.rankingPercent);
  return {
    key,
    candidate,
    claimedOperatorIds: getCandidateOperatorIds(candidate),
    templateSources,
    templateIds: templateSources.map((template) => template.templateId),
    strategySources,
    strategyPriorityRank: getStrategyPriorityRank(strategySources),
    calculationStatus: mergeRiicCalculationStatuses([
      candidate?.calculationStatus,
      ...strategySources.map((strategy) => strategy.calculationStatus),
    ]),
    quality: candidate.quality === "baseOnly" ? "baseOnly" : "complete",
    localTieBreakScore: Number.isFinite(rankingPercent)
      ? rankingPercent
      : Number.isFinite(averagePercent)
      ? averagePercent
      : 0,
  };
}

function compareGroupCandidates(left, right) {
  const calculationDifference =
    getRiicCalculationStatusRank(left.calculationStatus) -
    getRiicCalculationStatusRank(right.calculationStatus);
  if (calculationDifference !== 0) {
    return calculationDifference;
  }
  if (left.quality !== right.quality) {
    return left.quality === "complete" ? -1 : 1;
  }
  if (left.localTieBreakScore !== right.localTieBreakScore) {
    return right.localTieBreakScore - left.localTieBreakScore;
  }
  return left.key.localeCompare(right.key, "en");
}

function normalizeRoomGroups(roomGroups, groupCandidateLimit) {
  const groupIds = new Set();
  const blockedGroups = [];
  const groups = [];

  for (const sourceGroup of roomGroups || []) {
    const id = String(sourceGroup?.id || "").trim();
    if (!id || groupIds.has(id)) {
      throw new Error("Each room group requires a unique id");
    }
    groupIds.add(id);

    const candidates = (sourceGroup?.candidates || [])
      .map(normalizeGroupCandidate)
      .filter(Boolean)
      .sort(compareGroupCandidates);
    const selectedCandidates = selectRiicCandidatesByStrategy({
      items: candidates,
      limit: groupCandidateLimit,
      compare: compareGroupCandidates,
      getStrategies: (candidate) => candidate.strategySources,
    });
    if (selectedCandidates.length === 0) {
      blockedGroups.push({
        id,
        label: String(sourceGroup?.label || id),
        reason: "noCandidates",
      });
      continue;
    }

    groups.push({
      id,
      label: String(sourceGroup?.label || id),
      facility: String(sourceGroup?.facility || "").trim() || null,
      candidates: selectedCandidates,
      priorityTier: Math.min(
        ...selectedCandidates.map(
          (candidate) => candidate.strategyPriorityRank,
        ),
      ),
    });
  }

  return {
    blockedGroups,
    groups: groups.sort((left, right) => {
      if (left.priorityTier !== right.priorityTier) {
        return left.priorityTier - right.priorityTier;
      }
      if (left.candidates.length !== right.candidates.length) {
        return left.candidates.length - right.candidates.length;
      }
      return left.id.localeCompare(right.id, "en");
    }),
  };
}

function comparePlans(left, right) {
  const calculationDifference =
    getRiicCalculationStatusRank(left.calculationStatus) -
    getRiicCalculationStatusRank(right.calculationStatus);
  if (calculationDifference !== 0) {
    return calculationDifference;
  }
  if (left.baseOnlyGroupCount !== right.baseOnlyGroupCount) {
    return left.baseOnlyGroupCount - right.baseOnlyGroupCount;
  }
  if (left.localTieBreakScore !== right.localTieBreakScore) {
    return right.localTieBreakScore - left.localTieBreakScore;
  }
  return left.key.localeCompare(right.key, "en");
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

function createNextPlan(plan, group, candidate) {
  const claimedOperatorIds = new Set(plan.claimedOperatorIds);
  for (const charId of candidate.claimedOperatorIds) {
    claimedOperatorIds.add(charId);
  }
  const templateSources = new Map(
    plan.templateSources.map((template) => [template.templateId, template]),
  );
  for (const template of candidate.templateSources) {
    templateSources.set(template.templateId, template);
  }
  const mergedTemplateSources = [...templateSources.values()].sort(
    (left, right) => left.templateId.localeCompare(right.templateId, "en"),
  );

  return {
    key: plan.key ? `${plan.key}>>${group.id}:${candidate.key}` : `${group.id}:${candidate.key}`,
    groups: [
      ...plan.groups,
      {
        groupId: group.id,
        groupLabel: group.label,
        facility: group.facility,
        candidateKey: candidate.key,
        candidate: candidate.candidate,
        claimedOperatorIds: candidate.claimedOperatorIds,
      },
    ],
    claimedOperatorIds: [...claimedOperatorIds].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
    templateSources: mergedTemplateSources,
    strategySources: mergeStrategySources([plan, candidate]),
    calculationStatus: mergeRiicCalculationStatuses([
      plan.calculationStatus,
      candidate.calculationStatus,
    ]),
    baseOnlyGroupCount:
      plan.baseOnlyGroupCount + (candidate.quality === "baseOnly" ? 1 : 0),
    localTieBreakScore: plan.localTieBreakScore + candidate.localTieBreakScore,
  };
}

/**
 * Builds full schedules from room-group rotations under the default
 * single-facility-group ownership rule: any named operator used by one group
 * is excluded from every other group in that complete schedule.
 *
 * The result is a feasible candidate pool, not a cross-resource yield ranking.
 */
export function assembleRiicExclusiveScheduleCandidates({
  roomGroups,
  candidateLimit = DEFAULT_OPTIONS.candidateLimit,
  groupCandidateLimit = DEFAULT_OPTIONS.groupCandidateLimit,
  beamLimit = DEFAULT_OPTIONS.beamLimit,
}) {
  if (!Array.isArray(roomGroups)) {
    throw new Error("roomGroups must be an array");
  }

  const options = {
    candidateLimit: toPositiveInteger(
      candidateLimit,
      DEFAULT_OPTIONS.candidateLimit,
    ),
    groupCandidateLimit: toPositiveInteger(
      groupCandidateLimit,
      DEFAULT_OPTIONS.groupCandidateLimit,
    ),
    beamLimit: toPositiveInteger(beamLimit, DEFAULT_OPTIONS.beamLimit),
  };
  const { groups, blockedGroups } = normalizeRoomGroups(
    roomGroups,
    options.groupCandidateLimit,
  );
  if (blockedGroups.length > 0) {
    return {
      candidates: [],
      blockedGroups,
      summary: {
        inputGroupCount: roomGroups.length,
        assembledGroupCount: 0,
        candidateCount: 0,
        evaluatedCombinationCount: 0,
        conflictCount: 0,
        groupOrder: groups.map((group) => group.id),
      },
    };
  }

  let evaluatedCombinationCount = 0;
  let conflictCount = 0;
  let conflictBlockedGroup = null;
  let beam = [
    {
      key: "",
      groups: [],
      claimedOperatorIds: [],
      templateSources: [],
      strategySources: [],
      calculationStatus: "calculated",
      baseOnlyGroupCount: 0,
      localTieBreakScore: 0,
    },
  ];

  for (const group of groups) {
    const nextPlans = [];
    for (const plan of beam) {
      const claimedOperatorIds = new Set(plan.claimedOperatorIds);
      for (const candidate of group.candidates) {
        evaluatedCombinationCount += 1;
        if (
          candidate.claimedOperatorIds.some((charId) =>
            claimedOperatorIds.has(charId),
          )
        ) {
          conflictCount += 1;
          continue;
        }
        nextPlans.push(createNextPlan(plan, group, candidate));
      }
    }
    beam = selectRiicCandidatesByStrategy({
      items: nextPlans,
      limit: options.beamLimit,
      compare: comparePlans,
      getStrategies: (plan) => plan.strategySources,
      quotaMultiplier: Math.max(2, groups.length),
    });
    if (beam.length === 0) {
      conflictBlockedGroup = {
        id: group.id,
        label: group.label,
        reason: "operatorConflict",
      };
      break;
    }
  }

  const assembledGroupCount = beam[0]?.groups.length || 0;
  const candidates =
    assembledGroupCount === groups.length
      ? selectRiicCandidatesByStrategy({
          items: beam,
          limit: options.candidateLimit,
          compare: comparePlans,
          getStrategies: (plan) => plan.strategySources,
        })
      : [];

  return {
    candidates,
    blockedGroups: conflictBlockedGroup ? [conflictBlockedGroup] : [],
    summary: {
      inputGroupCount: roomGroups.length,
      assembledGroupCount,
      candidateCount: candidates.length,
      evaluatedCombinationCount,
      conflictCount,
      groupOrder: groups.map((group) => group.id),
    },
  };
}
