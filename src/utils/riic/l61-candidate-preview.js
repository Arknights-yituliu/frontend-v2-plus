import {
  getRiicRuntimeCandidateRankingValue,
} from "./l60-candidate-ranking.js";
import {
  applyRiicFallbackOperatorControlCenterBonus,
  createRiicFallbackEstimate,
} from "./l63-fallback.js";
import {
  getRiicButshuFallbackMinimumPercent,
  recalculateRiicButshuCandidate,
} from "./l62-butshu-calculation.js";
import {
  recalculateRiicShamareIdleCandidate,
} from "./l62-shamare-calculation.js";
import {
  recalculateRiicAutomationManufacture,
} from "./l62-automation-calculation.js";
import {
  recalculateRiicRoomTeamCandidate,
} from "./l62-team-calculation.js";
import {
  recalculateRiicClosureSpecialOrder,
} from "./l62-closure-calculation.js";
import {
  getRiicControlCenterRoomAdjustment,
} from "./l51-control-effects.js";
import {
  isRiicIdealTrainingEnabledForOperator,
} from "./l00-training-policy.js";
import {
  getRiicStaticFallbackOperatorBonus,
  matchRiicStaticCandidateRules,
} from "./l31-static-rule-match.js";
import {
  applyRiicStaticCandidateRules,
} from "./l32-static-rule-application.js";
import {
  getRiicPerceptionCoreBaseline,
} from "./l28-perception-baseline.js";
import {
  compareRiicOperatorUnlock,
  createRiicUpgradeRequirement,
  mergeRiicUpgradeRequirements,
} from "./P00-upgrade-requirements.js";

const PERCENT_FIELD_BY_ROOM_TYPE = Object.freeze({
  trading: "tradingPercent",
  manufacture: "manufacturePercent",
  meeting: "meetingPercent",
  hire: "officePercent",
  power: "powerPercent",
});
const PERCEPTION_CORE_ROOM_TYPE_BY_OPERATOR_ID = Object.freeze({
  char_391_rosmon: "manufacture",
  char_4046_ebnhlz: "trading",
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
const SHAMARE_IDLE_FILL_TIERS = new Set([
  "dormitory-only",
  "training-only",
  "workshop-only",
  "dormitory-training-workshop-mixed",
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

function getRosterById(operators) {
  const rosterById = new Map();

  for (const operator of operators || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const normalized = {
      charId,
      name: String(operator?.name || charId).trim() || charId,
      elite: toNonNegativeInteger(operator?.elite),
      level: toNonNegativeInteger(operator?.level, 1),
    };
    const current = rosterById.get(charId);
    if (
      !current ||
      compareRiicOperatorUnlock(normalized, current) > 0
    ) {
      rosterById.set(charId, normalized);
    }
  }

  return rosterById;
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
              ...(toNonNegativeInteger(rate?.slotCount) > 0
                ? { slotCount: toNonNegativeInteger(rate.slotCount) }
                : {}),
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
            .sort(compareRiicOperatorUnlock);
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
  currentOperator = operator,
  scope = null,
) {
  const rates = pool.operatorsByName.get(operator.name) || [];
  const slotCount = Number(scope?.slotCount);
  let appliedRate = null;
  const useIdealTraining =
    trainingMode === "ideal" &&
    isRiicIdealTrainingEnabledForOperator(
      operator,
      idealTrainingRaritySelection,
    );

  for (const rate of rates) {
    const matchesSlotCount =
      !rate.slotCount ||
      (Number.isFinite(slotCount) && rate.slotCount === slotCount);
    if (
      matchesSlotCount &&
      (useIdealTraining || compareRiicOperatorUnlock(operator, rate) >= 0)
    ) {
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
        skipR30: appliedRate.skipR30 === true,
        upgradeRequirement: createRiicUpgradeRequirement(
          currentOperator || operator,
          appliedRate,
        ),
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

function createFallbackOperatorProfiles({
  rosterById,
  currentRosterById,
  trainingMode,
  idealTrainingRaritySelection,
  scope,
  layoutFacts,
  pool,
}) {
  if (!pool) {
    return [];
  }

  return [...rosterById.values()]
    .flatMap((operator) => {
      const rate = getRateForTrainingMode(
        operator,
        pool,
        trainingMode,
        idealTrainingRaritySelection,
        currentRosterById?.get(operator.charId) || operator,
        scope,
      );
      const layer3Bonus = rate && !rate.skipR30
        ? getRiicStaticFallbackOperatorBonus({
            operatorId: operator.charId,
            ownedOperators: rosterById,
            scope,
            layoutFacts,
          })
        : null;
      const teammateLayer3Bonus =
        rate && !rate.skipR30
          ? getRiicStaticFallbackOperatorBonus({
              operatorId: operator.charId,
              ownedOperators: rosterById,
              scope,
              layoutFacts,
              excludeFacilityCountBonuses: true,
            })
          : 0;
      const resourceChainBaseline = rate
        ? getRiicPerceptionCoreBaseline({
            operatorId: operator.charId,
            elite: operator.elite,
            ownedOperators: rosterById,
            layoutFacts,
          })
        : null;
      const resourceChainBonus = Number(
        PERCEPTION_CORE_ROOM_TYPE_BY_OPERATOR_ID[operator.charId] ===
          scope?.roomType
          ? resourceChainBaseline?.bonusPercent || 0
          : 0,
      );

      return rate && Number.isFinite(layer3Bonus)
        ? [
            {
              charId: operator.charId,
              name: operator.name,
              percent: rate.percent + layer3Bonus + resourceChainBonus,
              basePercent: rate.percent + resourceChainBonus,
              layer3Bonus,
              teammateManufacturePercent:
                rate.percent +
                resourceChainBonus +
                teammateLayer3Bonus,
              fillPriority: Number(rate.fillPriority || 0),
              tags: rate.tags,
              upgradeRequirement: rate.upgradeRequirement,
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        right.percent +
          right.fillPriority -
          (left.percent + left.fillPriority) ||
        right.percent - left.percent ||
        left.name.localeCompare(right.name, "zh-CN") ||
        left.charId.localeCompare(right.charId, "en"),
    );
}

function createFallbackOperatorProfilesByPool({
  fallbackPools,
  rosterById,
  currentRosterById,
  trainingMode,
  idealTrainingRaritySelection,
  scope,
  layoutFacts,
}) {
  return new Map(
    [...fallbackPools.entries()].map(([poolKey, pool]) => [
      poolKey,
      (() => {
        const operators = createFallbackOperatorProfiles({
          rosterById,
          currentRosterById,
          trainingMode,
          idealTrainingRaritySelection,
          scope,
          layoutFacts,
          pool,
        });

        return {
          operators,
          operatorsById: new Map(
            operators.map((operator) => [operator.charId, operator]),
          ),
        };
      })(),
    ]),
  );
}

function getFallbackOperators({
  fallback,
  excludedOperatorIds,
  includedOperatorIds = null,
  fallbackOperatorProfilesByPool,
  minimumPercent = null,
  includeCandidatesWhenNoFallback = false,
  allowIncomplete = false,
}) {
  if (fallback.count === 0 && !includeCandidatesWhenNoFallback) {
    return [];
  }

  const profilePool = fallbackOperatorProfilesByPool.get(fallback.poolKey);
  if (!profilePool) {
    return null;
  }

  const normalizedMinimumPercent =
    minimumPercent === null || minimumPercent === undefined
      ? null
      : Number(minimumPercent);
  const includedIds =
    includedOperatorIds instanceof Set
      ? includedOperatorIds
      : Array.isArray(includedOperatorIds)
        ? new Set(includedOperatorIds)
        : null;
  const selected = profilePool.operators
    .filter(
      (operator) =>
        !excludedOperatorIds.has(operator.charId) &&
        (!includedIds || includedIds.has(operator.charId)),
    )
    .filter(
      (operator) =>
        normalizedMinimumPercent === null ||
        !Number.isFinite(normalizedMinimumPercent) ||
        operator.percent >= normalizedMinimumPercent,
    );

  return allowIncomplete || selected.length >= fallback.count ? selected : null;
}

function getRiicShamareIdleFallbackOperators({
  fallback,
  idleFillOperators,
  excludedOperatorIds,
}) {
  const excludedIds =
    excludedOperatorIds instanceof Set
      ? excludedOperatorIds
      : new Set(excludedOperatorIds || []);
  const operators = (idleFillOperators || []).filter((operator) => {
    const charId = String(operator?.charId || "").trim();
    return (
      charId &&
      !excludedIds.has(charId) &&
      SHAMARE_IDLE_FILL_TIERS.has(String(operator?.idleFillTier || "").trim())
    );
  });

  return operators.length >= fallback.count ? operators : null;
}

function isRiicShamareIdleFillCandidate(candidate) {
  const variantGroupId = String(candidate?.variantGroupId || "").trim();
  return (
    variantGroupId === "family-shamare:idle-pair" ||
    variantGroupId === "family-butshu:shamare-idle"
  );
}

function getTeamMemberProductionProfiles({
  operatorIds,
  rosterById,
  fallbackOperatorProfilesByPool,
  fallbackPoolKey,
}) {
  const normalizedOperatorIds = (operatorIds || [])
    .map((operatorId) => String(operatorId || "").trim())
    .filter(Boolean);
  const profilesById =
    fallbackOperatorProfilesByPool.get(fallbackPoolKey)?.operatorsById ||
    new Map();

  return normalizedOperatorIds.map((charId) => {
    const profile = profilesById.get(charId);
    if (profile) {
      const operator = rosterById.get(charId);
      return {
        ...profile,
        elite: operator?.elite,
        level: operator?.level,
      };
    }

    const operator = rosterById.get(charId);
    return {
      charId,
      name: String(operator?.name || charId).trim(),
      basePercent: 0,
      layer3Bonus: 0,
      teammateManufacturePercent: 0,
    };
  });
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
  teamMemberProductionProfiles,
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
  const staticRuleMatch = matchRiicStaticCandidateRules({
    candidate,
    operatorIds,
    ownedOperators: rosterById,
    scope: candidateScope,
    layoutFacts,
  });
  const staticRuleApplication = applyRiicStaticCandidateRules({
    publishedCoreBonusPercent,
    publishedEquivalentByProduct: getCandidatePublishedEquivalentByProduct(
      candidate,
    ),
    ruleMatch: staticRuleMatch,
  });
  const layer3RoomPriority = staticRuleApplication.roomPriority;
  const layer3OperatorBonusPercent =
    staticRuleApplication.operatorBonusPercent;
  const layer3CandidateLocalBonusPercent =
    staticRuleApplication.candidateLocalBonusPercent;
  const layer3CoreBonusPercent =
    staticRuleApplication.coreLayer3BonusPercent;
  const coreBonusPercent = staticRuleApplication.coreBonusPercent;
  const fallbackEstimate = createRiicFallbackEstimate({
    rankedOperators: ordinaryFallbackOperators,
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
  const shamareResult = recalculateRiicShamareIdleCandidate({
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
  const teamCalculationResult = recalculateRiicRoomTeamCandidate({
    candidate: {
      ...candidate,
      teamMemberProductionProfiles,
    },
    scope: candidateScope,
    fallbackOperators: fallbackPreviewOperators,
    controlCenterAdjustment,
  });
  const closureCalculation = recalculateRiicClosureSpecialOrder({
    candidate: {
      ...candidate,
      operatorIds,
      teamMemberProductionProfiles,
    },
    scope: candidateScope,
    normalCoreBonusPercent: coreBonusPercent,
    fallbackOperators: fallbackPreviewOperators,
    operatorBonusById: controlCenterOperatorBonusById,
  });
  if (
    getRiicButshuFallbackMinimumPercent(candidate) !== null &&
    fallbackEstimate.missingCount > 0
  ) {
    return null;
  }
  const resolvedCoreBonusPercentBeforeControl = closureCalculation
    ? closureCalculation.tradeEquivalentBonusPercent - fallbackPercent
    : teamCalculationResult
      ? coreBonusPercent + teamCalculationResult.coreBonusAdjustmentPercent
      : butshuResult
        ? butshuResult.tradingPercent - fallbackPercent
        : shamareResult
          ? shamareResult.tradingPercent
        : automationResult
          ? automationResult.coreBonusPercent
          : coreBonusPercent;
  const resolvedTotalPercentBeforeControl = closureCalculation
    ? closureCalculation.tradeEquivalentTotalPercent
    : teamCalculationResult
      ? 100 + resolvedCoreBonusPercentBeforeControl + fallbackPercent
      : butshuResult
        ? 100 + butshuResult.tradingPercent
        : shamareResult
          ? 100 + shamareResult.tradingPercent
        : automationResult
          ? automationResult.totalPercent
          : 100 + coreBonusPercent + fallbackPercent;
  const resolvedCoreBonusPercent = closureCalculation
    ? resolvedCoreBonusPercentBeforeControl
    : resolvedCoreBonusPercentBeforeControl + controlCenterOperatorBonusPercent;
  const resolvedTotalPercent = closureCalculation
    ? resolvedTotalPercentBeforeControl
    : resolvedTotalPercentBeforeControl + controlCenterOperatorBonusPercent;
  const fallbackUpgradeRequirements = mergeRiicUpgradeRequirements(
    fallbackPreviewOperators.map((operator) => operator.upgradeRequirement),
  );
  let publishedEquivalentByProduct = {
    ...staticRuleApplication.equivalentByProduct,
  };
  if (closureCalculation) {
    publishedEquivalentByProduct = {
      gold: closureCalculation.goldEquivalentProductionPercent,
    };
  } else if (butshuResult && Object.hasOwn(butshuResult, "gold")) {
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
    members: Array.isArray(candidate?.members) ? candidate.members : [],
    sourceFile: String(
      candidate?.sourceFile || fallback?.sourceFile || "",
    ).trim(),
    ...(candidate?.composition && typeof candidate.composition === "object"
      ? {
          composition: {
            ...candidate.composition,
          },
        }
      : {}),
    operatorIds,
    operators: getMatchedOperators(
      operatorIds,
      rosterById,
      coreUpgradeRequirements,
    ),
    coreUpgradeRequirements,
    upgradeRequirements: mergeRiicUpgradeRequirements([
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
    teamMemberProductionProfiles,
    ...(closureCalculation
      ? {
          closureCalculation,
        }
      : {}),
    ...(candidate?.teamCalculation
      ? {
          teamCalculation: {
            ...candidate.teamCalculation,
            preview: teamCalculationResult,
          },
          teamCalculationBaseCorePercent: 100 + coreBonusPercent,
          teamCalculationBaseLocalBonusPercent: coreBonusPercent,
        }
      : {}),
    ...(shamareResult
      ? {
          shamareCalculation: shamareResult,
        }
      : {}),
    layer3CandidateLocalBonusPercent,
    corePercent: 100 + resolvedCoreBonusPercent,
    totalPercent: resolvedTotalPercent,
    bonusPercent: resolvedTotalPercent - 100,
    sourceRoomType,
    candidateScope,
    resourceChainBaseline:
      candidate?.resourceChainBaseline &&
      typeof candidate.resourceChainBaseline === "object"
        ? { ...candidate.resourceChainBaseline }
        : null,
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
    debug: {
      l31: staticRuleMatch,
      l32: staticRuleApplication,
    },
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
  currentOwnedOperators = [],
  idleFillOperators = [],
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
  const currentRosterById = getRosterById(currentOwnedOperators);
  const fallbackOperatorProfilesByPool = createFallbackOperatorProfilesByPool({
    fallbackPools,
    rosterById,
    currentRosterById,
    trainingMode,
    idealTrainingRaritySelection,
    scope,
    layoutFacts,
  });
  const materializeCandidate = (
    skeleton,
    { allowIncompleteFallback = false } = {},
  ) => {
    const fallback = getCandidateFallback(catalog, skeleton.candidate);
    const fallbackOperators = isRiicShamareIdleFillCandidate(skeleton.candidate)
      ? getRiicShamareIdleFallbackOperators({
          fallback,
          idleFillOperators,
          excludedOperatorIds: new Set(skeleton.operatorIds),
        })
      : getFallbackOperators({
          fallback,
          excludedOperatorIds: new Set(skeleton.operatorIds),
          fallbackOperatorProfilesByPool,
          minimumPercent: getRiicButshuFallbackMinimumPercent(skeleton.candidate),
          includeCandidatesWhenNoFallback:
            skeleton.taggedMemberRequirements.length > 0,
          allowIncomplete: allowIncompleteFallback,
        });
    if (
      !fallbackOperators ||
      (!allowIncompleteFallback &&
        (getOrdinaryFallbackOperators(fallbackOperators).length <
          fallback.count ||
          !canFillTaggedMemberRequirements(
            skeleton.taggedMemberRequirements,
            fallbackOperators,
          )))
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
      teamMemberProductionProfiles: getTeamMemberProductionProfiles({
        operatorIds: skeleton.operatorIds,
        rosterById,
        fallbackOperatorProfilesByPool,
        fallbackPoolKey: fallback.poolKey,
      }),
      layoutFacts,
      taggedMemberRequirements: skeleton.taggedMemberRequirements,
      controlCenterRuntimeContext,
    });
  };

  const candidates = candidateSkeletons
    .map(materializeCandidate)
    .filter(Boolean);
  const fallbackCandidate = fallbackCandidateSkeleton
    ? materializeCandidate(fallbackCandidateSkeleton, {
        allowIncompleteFallback: true,
      })
    : null;

  return {
    candidates: getHighestAvailableVariants(candidates),
    fallbackCandidate,
  };
}
