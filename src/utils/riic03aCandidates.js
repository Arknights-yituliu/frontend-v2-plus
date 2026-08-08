import {
  getRiicRuntimeCandidateRankingValue,
} from "./riicRuntimeContribution.js";
import {
  applyRiicFallbackOperatorControlCenterBonus,
  createRiicFallbackEstimate,
} from "./riicDynamicFallback.js";
import {
  getRiicLayer3CandidateEquivalentByProduct,
  getRiicLayer3CandidateLocalBonus,
  getRiicLayer3CandidateRoomPriority,
  getRiicLayer3OperatorLocalBonus,
} from "./riic03Rules.js";
import {
  getRiicButshuFallbackMinimumPercent,
  recalculateRiicButshuCandidate,
} from "./riicButshuDynamicFallback.js";
import {
  recalculateRiicAutomationManufacture,
} from "./riicAutomationDynamicFallback.js";
import {
  getRiicControlCenterRoomAdjustment,
} from "./riicControlCenterRuntime.js";
import {
  isRiicIdealTrainingEnabledForOperator,
} from "./riicTrainingPolicy.js";

const PERCENT_FIELD_BY_ROOM_TYPE = Object.freeze({
  trading: "tradingPercent",
  manufacture: "manufacturePercent",
  meeting: "meetingPercent",
  hire: "officePercent",
  power: "powerPercent",
});
const PERCENT_FIELDS = Object.freeze([
  "tradingPercent",
  "manufacturePercent",
  "meetingPercent",
  "officePercent",
  "powerPercent",
]);
const VALID_STATUSES = new Set([
  "calculated",
  "estimated",
  "estimatePending",
]);

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function getPercentField(roomType) {
  return PERCENT_FIELD_BY_ROOM_TYPE[roomType] || null;
}

function getCandidateRankingBonus(candidate) {
  return getRiicRuntimeCandidateRankingValue(candidate);
}

function getCandidateCoreBonusPercent(candidate) {
  return Number(candidate?.efficiency || 0);
}

function getCandidatePublishedEquivalentByProduct(candidate) {
  if (!Object.hasOwn(candidate || {}, "gold")) {
    return {};
  }

  const gold = Number(candidate.gold);
  return Number.isFinite(gold) && gold !== 0 ? { gold } : {};
}

function compareUnlock(left, right) {
  const eliteDifference =
    toNonNegativeInteger(left?.elite) - toNonNegativeInteger(right?.elite);
  if (eliteDifference !== 0) {
    return eliteDifference;
  }

  return (
    toNonNegativeInteger(left?.level, 1) -
    toNonNegativeInteger(right?.level, 1)
  );
}

function createUpgradeRequirement(operator, requirement) {
  if (!operator || compareUnlock(operator, requirement) >= 0) {
    return null;
  }

  return {
    charId: operator.charId,
    name: operator.name,
    current: {
      elite: toNonNegativeInteger(operator.elite),
      level: toNonNegativeInteger(operator.level, 1),
    },
    required: {
      elite: toNonNegativeInteger(requirement?.elite),
      level: toNonNegativeInteger(requirement?.level, 1),
    },
  };
}

function mergeUpgradeRequirements(requirements) {
  const byCharId = new Map();

  for (const requirement of requirements || []) {
    const charId = String(requirement?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const current = byCharId.get(charId);
    if (
      !current ||
      compareUnlock(requirement.required, current.required) > 0
    ) {
      byCharId.set(charId, requirement);
    }
  }

  return [...byCharId.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name, "zh-CN") ||
      left.charId.localeCompare(right.charId, "en"),
  );
}

function normalizeFallbackPools(fallbackCatalog) {
  const pools = new Map();

  for (const pool of fallbackCatalog?.pools || []) {
    const key = String(pool?.key || "").trim();
    if (!key) {
      continue;
    }

    pools.set(key, {
      defaultPercent: Number(pool?.defaultPercent || 0),
      operatorsByName: new Map(
        (pool?.operators || []).flatMap((operator) => {
          const name = String(operator?.name || "").trim();
          if (!name) {
            return [];
          }
          const fillPriority = Number(operator?.fillPriority || 0);
          const rates = (operator?.rates || [])
            .map((rate) => ({
              elite: toNonNegativeInteger(rate?.elite),
              level: toNonNegativeInteger(rate?.level, 1),
              percent: Number(rate?.percent || 0),
              fillPriority: Number.isFinite(fillPriority) ? fillPriority : 0,
              tags: [
                ...new Set(
                  (rate?.tags || [])
                    .map((tag) => String(tag || "").trim())
                    .filter(Boolean),
                ),
              ],
            }))
            .filter((rate) => Number.isFinite(rate.percent))
            .sort(compareUnlock);
          return [[name, rates]];
        }),
      ),
    });
  }

  return pools;
}

function getRateForTrainingMode(
  operator,
  pool,
  trainingMode,
  idealTrainingRaritySelection,
) {
  const rates = pool.operatorsByName.get(operator.name) || [];
  let appliedRate = null;
  const useIdealTraining =
    trainingMode === "ideal" &&
    isRiicIdealTrainingEnabledForOperator(
      operator,
      idealTrainingRaritySelection,
    );

  for (const rate of rates) {
    if (useIdealTraining || compareUnlock(operator, rate) >= 0) {
      appliedRate = rate;
    }
  }

  return appliedRate
    ? {
        percent: appliedRate.percent,
        fillPriority: appliedRate.fillPriority,
        elite: appliedRate.elite,
        level: appliedRate.level,
        tags: appliedRate.tags,
        upgradeRequirement:
          useIdealTraining
            ? createUpgradeRequirement(operator, appliedRate)
            : null,
      }
    : null;
}

function getCandidateFallback(catalog, candidate) {
  const createFallback = (count) => ({
    count,
    percent: Number(catalog?.fallback?.percent || 0),
    label: catalog?.fallback?.label || "Fallback",
    poolKey: String(catalog?.fallback?.poolKey || "").trim(),
    sourceFile: String(catalog?.fallback?.sourceFile || "").trim(),
  });

  if (candidate?.isIndividualFallback) {
    return createFallback(1);
  }

  if (candidate?.selectionMode === "individual") {
    return createFallback(0);
  }

  const slotCount = Number(catalog?.scope?.slotCount || 0);
  const memberCount = (candidate?.members || []).length;

  return createFallback(Math.max(0, slotCount - memberCount));
}

function operatorMatchesTags(operator, requiredTags) {
  const operatorTags = new Set(operator?.tags || []);
  return requiredTags.every((tag) => operatorTags.has(tag));
}

function getOrdinaryFallbackOperators(fallbackOperators) {
  return (fallbackOperators || []).filter((operator) => {
    const tags = new Set(operator?.tags || []);
    return !tags.has("tailor") && !tags.has("automation");
  });
}

function canFillTaggedMemberRequirements(requirements, fallbackOperators) {
  const slots = (requirements || [])
    .map((requirement) => ({
      tags: [...new Set(requirement?.tags || [])],
    }))
    .sort((left, right) => left.tags.length - right.tags.length);
  if (slots.length === 0) {
    return true;
  }

  const usedOperatorIds = new Set();
  const tryAssign = (index) => {
    if (index >= slots.length) {
      return true;
    }

    return (fallbackOperators || []).some((operator) => {
      if (
        usedOperatorIds.has(operator.charId) ||
        !operatorMatchesTags(operator, slots[index].tags)
      ) {
        return false;
      }

      usedOperatorIds.add(operator.charId);
      const matched = tryAssign(index + 1);
      usedOperatorIds.delete(operator.charId);
      return matched;
    });
  };

  return tryAssign(0);
}

function getMatchedOperators(
  operatorIds,
  rosterById,
  upgradeRequirements = [],
) {
  const upgradeRequirementsByCharId = new Map(
    upgradeRequirements.map((requirement) => [
      requirement.charId,
      requirement,
    ]),
  );

  return operatorIds
    .map((charId) => rosterById.get(charId))
    .filter(Boolean)
    .map((operator) => ({
      charId: operator.charId,
      name: operator.name,
      elite: operator.elite,
      level: operator.level,
      upgradeRequirement:
        upgradeRequirementsByCharId.get(operator.charId) || null,
    }));
}

function getFallbackOperators({
  fallback,
  rosterById,
  excludedOperatorIds,
  fallbackPools,
  trainingMode,
  idealTrainingRaritySelection,
  scope,
  layoutFacts,
  minimumPercent = null,
  includeCandidatesWhenNoFallback = false,
}) {
  if (fallback.count === 0 && !includeCandidatesWhenNoFallback) {
    return [];
  }

  const pool = fallbackPools.get(fallback.poolKey);
  if (!pool) {
    return null;
  }

  const normalizedMinimumPercent =
    minimumPercent === null || minimumPercent === undefined
      ? null
      : Number(minimumPercent);
  const selected = [...rosterById.values()]
    .filter((operator) => !excludedOperatorIds.has(operator.charId))
    .flatMap((operator) => {
      const rate = getRateForTrainingMode(
        operator,
        pool,
        trainingMode,
        idealTrainingRaritySelection,
      );
      const layer3Bonus = rate
        ? getRiicLayer3OperatorLocalBonus({
            operatorId: operator.charId,
            ownedOperators: rosterById,
            scope,
            layoutFacts,
          })
        : null;

      return rate && Number.isFinite(layer3Bonus)
        ? [
            {
              charId: operator.charId,
              name: operator.name,
              percent: rate.percent + layer3Bonus,
              basePercent: rate.percent,
              layer3Bonus,
              fillPriority: rate.fillPriority,
              tags: rate.tags,
              upgradeRequirement: rate.upgradeRequirement,
            },
          ]
        : [];
    })
    .filter(
      (operator) =>
        normalizedMinimumPercent === null ||
        !Number.isFinite(normalizedMinimumPercent) ||
        operator.percent >= normalizedMinimumPercent,
    )
    .sort(
      (left, right) =>
        right.percent +
          right.fillPriority -
          (left.percent + left.fillPriority) ||
        right.percent - left.percent ||
        left.name.localeCompare(right.name, "zh-CN") ||
        left.charId.localeCompare(right.charId, "en"),
    );

  return selected.length >= fallback.count ? selected : null;
}

function getTaggedFallbackPreviewOperators(
  taggedMemberRequirements,
  fallbackOperators,
) {
  const usedOperatorIds = new Set();

  return (taggedMemberRequirements || []).flatMap((requirement) => {
    const requiredTags = new Set(
      (requirement?.tags || [])
        .map((tag) => String(tag || "").trim())
        .filter(Boolean),
    );
    const operator = (fallbackOperators || []).find(
      (candidateOperator) =>
        !usedOperatorIds.has(candidateOperator.charId) &&
        [...requiredTags].every((tag) =>
          (candidateOperator?.tags || []).includes(tag),
        ),
    );
    if (!operator) {
      return [];
    }

    usedOperatorIds.add(operator.charId);
    return [{ ...operator, taggedMember: true }];
  });
}

function toRuntimeCandidate({
  catalog,
  candidate,
  operatorIds,
  coreUpgradeRequirements,
  rosterById,
  fallbackOperators,
  layoutFacts,
  taggedMemberRequirements = [],
  controlCenterRuntimeContext,
}) {
  const fallback = getCandidateFallback(catalog, candidate);
  const sourceRoomType = String(catalog?.scope?.roomType || "").trim();
  const localPercentField = getPercentField(sourceRoomType);
  const publishedCoreBonusPercent = getCandidateCoreBonusPercent(candidate);
  const candidateScope = {
    roomType: String(catalog?.scope?.roomType || ""),
    product: String(catalog?.scope?.product || ""),
    stationLevel: Number(catalog?.scope?.stationLevel),
    slotCount: Number(catalog?.scope?.slotCount),
  };
  const fallbackPoolAdjustment = getRiicControlCenterRoomAdjustment({
    context: controlCenterRuntimeContext,
    scope: candidateScope,
    operatorIds: [
      ...operatorIds,
      ...(fallbackOperators || []).map((operator) => operator?.charId),
    ],
  });
  const rankedFallbackOperators = applyRiicFallbackOperatorControlCenterBonus(
    fallbackOperators,
    fallbackPoolAdjustment.operatorBonusById,
  );
  const ordinaryFallbackOperators = getOrdinaryFallbackOperators(
    rankedFallbackOperators,
  );
  const layer3RoomPriority = getRiicLayer3CandidateRoomPriority({
    candidate,
    operatorIds,
    ownedOperators: rosterById,
    scope: candidateScope,
    layoutFacts,
  });
  const layer3EquivalentByProduct = getRiicLayer3CandidateEquivalentByProduct({
    candidate,
    ownedOperators: rosterById,
    scope: candidateScope,
    layoutFacts,
  });
  const layer3OperatorBonusPercent = operatorIds.reduce(
    (total, operatorId) =>
      total +
      getRiicLayer3OperatorLocalBonus({
        operatorId,
        ownedOperators: rosterById,
        scope: candidateScope,
        layoutFacts,
      }),
    0,
  );
  const layer3CandidateLocalBonusPercent =
    getRiicLayer3CandidateLocalBonus({
      candidate,
      ownedOperators: rosterById,
      scope: candidateScope,
      layoutFacts,
    });
  const layer3CoreBonusPercent =
    layer3OperatorBonusPercent + layer3CandidateLocalBonusPercent;
  const coreBonusPercent = publishedCoreBonusPercent + layer3CoreBonusPercent;
  const fallbackEstimate = createRiicFallbackEstimate({
    rankedOperators: ordinaryFallbackOperators,
    slotCount: candidateScope.slotCount,
    fallbackCount: fallback.count,
    defaultPercent: fallback.percent,
  });
  const taggedFallbackPreviewOperators = getTaggedFallbackPreviewOperators(
    taggedMemberRequirements,
    rankedFallbackOperators,
  );
  const fallbackPreviewOperators = [
    ...taggedFallbackPreviewOperators,
    ...fallbackEstimate.selectedOperators.filter(
      (operator) =>
        !taggedFallbackPreviewOperators.some(
          (taggedOperator) => taggedOperator.charId === operator.charId,
        ),
    ),
  ];
  const controlCenterAdjustment = getRiicControlCenterRoomAdjustment({
    context: controlCenterRuntimeContext,
    scope: candidateScope,
    operatorIds: [
      ...operatorIds,
      ...fallbackPreviewOperators.map((operator) => operator?.charId),
    ],
  });
  const controlCenterFacilityBonusPercent = Number(
    controlCenterAdjustment.facilityBonusPercent || 0,
  );
  const controlCenterOperatorBonusPercent = Number(
    controlCenterAdjustment.operatorBonusPercent || 0,
  );
  const controlCenterOperatorBonusById = {
    ...(controlCenterAdjustment.operatorBonusById || {}),
  };
  const controlCenterExpectedBonusPercent = Number(
    controlCenterAdjustment.bonusPercent || 0,
  );
  const fallbackPercent = fallbackPreviewOperators.reduce(
    (total, operator) => total + Number(operator?.percent || 0),
    0,
  );
  const butshuResult = recalculateRiicButshuCandidate({
    candidate,
    scope: candidateScope,
    fallbackOperators: fallbackPreviewOperators,
  });
  const automationResult = recalculateRiicAutomationManufacture({
    scope: candidateScope,
    coreBaseBonusPercent: publishedCoreBonusPercent,
    coreLayer3BonusPercent: layer3CoreBonusPercent,
    fallbackOperators: fallbackPreviewOperators,
  });
  if (
    getRiicButshuFallbackMinimumPercent(candidate) !== null &&
    fallbackEstimate.missingCount > 0
  ) {
    return null;
  }
  const resolvedCoreBonusPercentBeforeControl = butshuResult
    ? butshuResult.tradingPercent - fallbackPercent
    : automationResult
      ? automationResult.coreBonusPercent
      : coreBonusPercent;
  const resolvedTotalPercentBeforeControl = butshuResult
    ? 100 + butshuResult.tradingPercent
    : automationResult
      ? automationResult.totalPercent
      : 100 + coreBonusPercent + fallbackPercent;
  const resolvedCoreBonusPercent =
    resolvedCoreBonusPercentBeforeControl + controlCenterOperatorBonusPercent;
  const resolvedTotalPercent =
    resolvedTotalPercentBeforeControl + controlCenterOperatorBonusPercent;
  const fallbackUpgradeRequirements = mergeUpgradeRequirements(
    fallbackPreviewOperators.map((operator) => operator.upgradeRequirement),
  );
  let publishedEquivalentByProduct = {
    ...getCandidatePublishedEquivalentByProduct(candidate),
    ...layer3EquivalentByProduct,
  };
  if (butshuResult && Object.hasOwn(butshuResult, "gold")) {
    publishedEquivalentByProduct = { gold: butshuResult.gold };
  }
  const runtimePercentFields = {
    ...Object.fromEntries(PERCENT_FIELDS.map((field) => [field, 0])),
    ...(localPercentField
      ? { [localPercentField]: resolvedCoreBonusPercent }
      : {}),
  };

  return {
    key: candidate.id,
    name: String(candidate?.name || fallback.label).trim() || fallback.label,
    sourceFile: String(
      candidate?.sourceFile || fallback?.sourceFile || "",
    ).trim(),
    operatorIds,
    operators: getMatchedOperators(
      operatorIds,
      rosterById,
      coreUpgradeRequirements,
    ),
    coreUpgradeRequirements,
    upgradeRequirements: mergeUpgradeRequirements([
      ...coreUpgradeRequirements,
      ...fallbackUpgradeRequirements,
    ]),
    fallback: {
      ...fallback,
      candidateOperators: rankedFallbackOperators,
      operators: [],
      totalPercent: fallbackPercent,
      taggedMemberRequirements,
    },
    bestAvailableTotalPercent: resolvedTotalPercent,
    coreBaseBonusPercent: publishedCoreBonusPercent,
    coreLayer3BonusPercent: layer3CoreBonusPercent,
    layer3CandidateLocalBonusPercent,
    corePercent: 100 + resolvedCoreBonusPercent,
    totalPercent: resolvedTotalPercent,
    bonusPercent: resolvedTotalPercent - 100,
    sourceRoomType,
    candidateScope,
    localBonusPercent: resolvedCoreBonusPercent,
    publishedEquivalentByProduct,
    ...runtimePercentFields,
    sortScore: Number(candidate?.sortScore || 0),
    layer3RoomPriority,
    controlCenterFacilityBonusPercent,
    controlCenterOperatorBonusPercent,
    controlCenterOperatorBonusById,
    controlCenterExpectedBonusPercent,
    controlCenterFacilityCalculation:
      controlCenterAdjustment.facilityCalculation,
    controlCenterOperatorCalculation:
      controlCenterAdjustment.operatorCalculation,
    sameShiftBindings: controlCenterAdjustment.sameShiftBindings,
    ...(candidate?.selectionMode === "individual"
      ? { selectionMode: "individual" }
      : {}),
    quality: candidate.quality === "baseOnly" ? "baseOnly" : "complete",
    calculationStatus: VALID_STATUSES.has(candidate.calculationStatus)
      ? candidate.calculationStatus
      : "calculated",
    variantGroupId: candidate.variantGroupId || candidate.id,
  };
}

function compareCandidates(left, right) {
  const leftRankingBonus = getCandidateRankingBonus(left);
  const rightRankingBonus = getCandidateRankingBonus(right);
  if (leftRankingBonus !== rightRankingBonus) {
    return rightRankingBonus - leftRankingBonus;
  }
  const leftFallbackCount = Number(left?.fallback?.count || 0);
  const rightFallbackCount = Number(right?.fallback?.count || 0);
  if (leftFallbackCount !== rightFallbackCount) {
    return leftFallbackCount - rightFallbackCount;
  }
  if (left.quality !== right.quality) {
    return left.quality === "complete" ? -1 : 1;
  }
  if (left.calculationStatus !== right.calculationStatus) {
    return left.calculationStatus.localeCompare(right.calculationStatus, "en");
  }
  return left.key.localeCompare(right.key, "en");
}

function getHighestAvailableVariants(candidates) {
  const byGroup = new Map();

  for (const candidate of candidates) {
    const groupId = candidate.variantGroupId || candidate.key;
    const existing = byGroup.get(groupId);
    if (!existing || compareCandidates(candidate, existing) < 0) {
      byGroup.set(groupId, candidate);
    }
  }

  return [...byGroup.values()].sort(compareCandidates);
}

export function materializeRiicRoomCandidateSkeletons({
  resolution,
  controlCenterRuntimeContext,
} = {}) {
  if (!resolution?.catalog || !resolution?.fallbackCatalog) {
    throw new Error("A RIIC candidate skeleton resolution is required");
  }

  const {
    catalog,
    fallbackCatalog,
    rosterById,
    trainingMode,
    idealTrainingRaritySelection,
    scope,
    layoutFacts,
    candidateSkeletons = [],
    fallbackCandidateSkeleton,
  } = resolution;
  const fallbackPools = normalizeFallbackPools(fallbackCatalog);
  const materializeCandidate = (skeleton) => {
    const fallback = getCandidateFallback(catalog, skeleton.candidate);
    const fallbackOperators = getFallbackOperators({
      fallback,
      rosterById,
      excludedOperatorIds: new Set(skeleton.operatorIds),
      fallbackPools,
      trainingMode,
      idealTrainingRaritySelection,
      scope,
      layoutFacts,
      minimumPercent: getRiicButshuFallbackMinimumPercent(skeleton.candidate),
      includeCandidatesWhenNoFallback:
        skeleton.taggedMemberRequirements.length > 0,
    });
    if (
      !fallbackOperators ||
      getOrdinaryFallbackOperators(fallbackOperators).length < fallback.count ||
      !canFillTaggedMemberRequirements(
        skeleton.taggedMemberRequirements,
        fallbackOperators,
      )
    ) {
      return null;
    }

    return toRuntimeCandidate({
      catalog,
      candidate: skeleton.candidate,
      operatorIds: skeleton.operatorIds,
      coreUpgradeRequirements: skeleton.coreUpgradeRequirements,
      rosterById,
      fallbackOperators,
      layoutFacts,
      taggedMemberRequirements: skeleton.taggedMemberRequirements,
      controlCenterRuntimeContext,
    });
  };

  const candidates = candidateSkeletons
    .map(materializeCandidate)
    .filter(Boolean);
  const fallbackCandidate = fallbackCandidateSkeleton
    ? materializeCandidate(fallbackCandidateSkeleton)
    : null;

  return {
    candidates: getHighestAvailableVariants(candidates),
    fallbackCandidate,
  };
}
