import {
  getRiicRuntimeCandidateRankingValue,
} from "./riicRuntimeContribution.js";
import { createRiicFallbackEstimate } from "./riicDynamicFallback.js";
import {
  getRiicLayer3CandidateRoomPriority,
  getRiicLayer3OperatorLocalBonus,
} from "./riicLayer3Rules.js";
import {
  getRiicButshuFallbackMinimumPercent,
  recalculateRiicButshuCandidate,
} from "./riicButshuDynamicFallback.js";

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

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

function normalizeTrainingMode(value) {
  return value === "ideal" ? "ideal" : "current";
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

function normalizeRoster(ownedOperators) {
  const byId = new Map();

  for (const operator of ownedOperators || []) {
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
    const existing = byId.get(charId);
    if (!existing || compareUnlock(normalized, existing) > 0) {
      byId.set(charId, normalized);
    }
  }

  return byId;
}

function normalizeNameToCharId(operatorNameToCharId) {
  if (operatorNameToCharId instanceof Map) {
    return operatorNameToCharId;
  }

  return new Map(
    Object.entries(operatorNameToCharId || {}).flatMap(([name, charId]) => {
      const normalizedName = String(name || "").trim();
      const normalizedCharId = String(charId || "").trim();
      return normalizedName && normalizedCharId
        ? [[normalizedName, normalizedCharId]]
        : [];
    }),
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

function getRateForTrainingMode(operator, pool, trainingMode) {
  const rates = pool.operatorsByName.get(operator.name) || [];
  let appliedRate = null;

  for (const rate of rates) {
    if (
      trainingMode === "ideal" ||
      compareUnlock(operator, rate) >= 0
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
        upgradeRequirement:
          trainingMode === "ideal"
            ? createUpgradeRequirement(operator, appliedRate)
            : null,
      }
    : null;
}

function getCandidateFallback(catalog, candidate) {
  const createFallback = (count) => ({
    count,
    percent: Number(catalog?.fallback?.percent || 0),
    label: catalog?.fallback?.label || "基础补位",
    poolKey: String(catalog?.fallback?.poolKey || "").trim(),
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

function matchesCandidateFacilityCounts({
  candidate,
  powerPlantCount,
  tradingStationCount,
  goldManufactureStationCount,
}) {
  const counts = {
    powerPlantCount,
    tradingStationCount,
    goldManufactureStationCount,
  };

  return [
    "powerPlantCount",
    "tradingStationCount",
    "goldManufactureStationCount",
  ].every((field) => {
    if (!Object.hasOwn(candidate || {}, field)) {
      return true;
    }

    const required = Number(candidate?.[field]);
    const actual = Number(counts[field]);
    return (
      Number.isInteger(required) &&
      required >= 1 &&
      Number.isInteger(actual) &&
      actual >= 1 &&
      required === actual
    );
  });
}

function resolveCandidateMembers({
  candidate,
  rosterById,
  nameToCharId,
  trainingMode,
}) {
  const operatorIds = [];
  const upgradeRequirements = [];

  for (const member of candidate?.members || []) {
    const name = String(member?.name || "").trim();
    const charId = nameToCharId.get(name);
    if (!name || !charId || operatorIds.includes(charId)) {
      return null;
    }

    const operator = rosterById.get(charId);
    const requirement = {
      elite: toNonNegativeInteger(member?.elite),
      level: toNonNegativeInteger(member?.level, 1),
    };
    const hasMaxElite = Object.hasOwn(member || {}, "maxElite");
    const maxElite = Number(member?.maxElite);
    if (
      !operator ||
      (hasMaxElite &&
        (member.maxElite === null ||
          member.maxElite === "" ||
          !Number.isInteger(maxElite) ||
          maxElite < requirement.elite ||
          operator.elite > maxElite))
    ) {
      return null;
    }

    const upgradeRequirement = createUpgradeRequirement(operator, requirement);
    if (upgradeRequirement) {
      if (trainingMode !== "ideal") {
        return null;
      }
      upgradeRequirements.push(upgradeRequirement);
    }

    operatorIds.push(charId);
  }

  return {
    operatorIds,
    upgradeRequirements,
  };
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
  scope,
  layoutFacts,
  minimumPercent = null,
}) {
  if (fallback.count === 0) {
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

const VALID_STATUSES = new Set([
  "calculated",
  "estimated",
  "estimatePending",
]);

function toRuntimeCandidate({
  catalog,
  candidate,
  operatorIds,
  coreUpgradeRequirements,
  rosterById,
  fallbackOperators,
  layoutFacts,
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
  const layer3RoomPriority = getRiicLayer3CandidateRoomPriority({
    candidate,
    operatorIds,
    ownedOperators: rosterById,
    scope: candidateScope,
    layoutFacts,
  });
  const layer3CoreBonusPercent = operatorIds.reduce(
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
  const coreBonusPercent = publishedCoreBonusPercent + layer3CoreBonusPercent;
  const fallbackEstimate = createRiicFallbackEstimate({
    rankedOperators: fallbackOperators,
    slotCount: candidateScope.slotCount,
    fallbackCount: fallback.count,
    defaultPercent: fallback.percent,
  });
  const fallbackPreviewOperators = fallbackEstimate.selectedOperators;
  const fallbackPercent = fallbackEstimate.totalPercent;
  const butshuResult = recalculateRiicButshuCandidate({
    candidate,
    scope: candidateScope,
    fallbackOperators: fallbackPreviewOperators,
  });
  if (
    getRiicButshuFallbackMinimumPercent(candidate) !== null &&
    fallbackEstimate.missingCount > 0
  ) {
    return null;
  }
  const resolvedCoreBonusPercent = butshuResult
    ? butshuResult.tradingPercent - fallbackPercent
    : coreBonusPercent;
  const resolvedTotalPercent = butshuResult
    ? 100 + butshuResult.tradingPercent
    : 100 + coreBonusPercent + fallbackPercent;
  const fallbackUpgradeRequirements = mergeUpgradeRequirements(
    fallbackPreviewOperators.map((operator) => operator.upgradeRequirement),
  );
  let publishedEquivalentByProduct =
    getCandidatePublishedEquivalentByProduct(candidate);
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
      candidateOperators: fallbackOperators,
      operators: [],
      totalPercent: fallbackPercent,
    },
    bestAvailableTotalPercent: resolvedTotalPercent,
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

export function matchRiicStaticRoomCandidates({
  catalog,
  fallbackCatalog,
  operatorNameToCharId,
  ownedOperators,
  roomType,
  product,
  stationLevel,
  slotCount,
  powerPlantCount,
  tradingStationCount,
  goldManufactureStationCount,
  manufactureProductKindCount,
  facilities,
  trainingMode = "current",
}) {
  if (!catalog) {
    throw new Error("A RIIC static room candidate catalog is required");
  }
  if (!fallbackCatalog) {
    throw new Error("A RIIC fallback operator catalog is required");
  }
  const normalizedStationLevel = Number(stationLevel);
  const normalizedSlotCount = Number(slotCount);
  if (
    !String(roomType || "").trim() ||
    !String(product || "").trim() ||
    !Number.isInteger(normalizedStationLevel) ||
    normalizedStationLevel < 1 ||
    !Number.isInteger(normalizedSlotCount) ||
    normalizedSlotCount < 1
  ) {
    throw new Error(
      "A room type, product, station level, and slot count are required",
    );
  }

  const normalizedTrainingMode = normalizeTrainingMode(trainingMode);
  const rosterById = normalizeRoster(ownedOperators);
  const nameToCharId = normalizeNameToCharId(operatorNameToCharId);
  const fallbackPools = normalizeFallbackPools(fallbackCatalog);
  const fallbackScope = {
    roomType,
    product,
    stationLevel: normalizedStationLevel,
    slotCount: normalizedSlotCount,
  };
  const layoutFacts = {
    powerPlantCount,
    tradingStationCount,
    goldManufactureStationCount,
    manufactureProductKindCount,
    facilities,
  };
  const matchingCandidates = (catalog.candidates || []).flatMap(
    (candidate) => {
      if (
        !matchesCandidateFacilityCounts({
          candidate,
          powerPlantCount,
          tradingStationCount,
          goldManufactureStationCount,
        })
      ) {
        return [];
      }

      const memberResolution = resolveCandidateMembers({
        candidate,
        rosterById,
        nameToCharId,
        trainingMode: normalizedTrainingMode,
      });
      if (!memberResolution) {
        return [];
      }

      const fallback = getCandidateFallback(catalog, candidate);
      const fallbackOperators = getFallbackOperators({
        fallback,
        rosterById,
        excludedOperatorIds: new Set(memberResolution.operatorIds),
        fallbackPools,
        trainingMode: normalizedTrainingMode,
        scope: fallbackScope,
        layoutFacts,
        minimumPercent: getRiicButshuFallbackMinimumPercent(candidate),
      });
      if (!fallbackOperators) {
        return [];
      }

      const runtimeCandidate = toRuntimeCandidate({
          catalog,
          candidate,
          operatorIds: memberResolution.operatorIds,
          coreUpgradeRequirements: memberResolution.upgradeRequirements,
          rosterById,
          fallbackOperators,
          layoutFacts,
        });
      return runtimeCandidate ? [runtimeCandidate] : [];
    },
  );
  const fallback = getCandidateFallback(catalog, { members: [] });
  const fallbackOperators = getFallbackOperators({
    fallback,
    rosterById,
    excludedOperatorIds: new Set(),
    fallbackPools,
    trainingMode: normalizedTrainingMode,
    scope: fallbackScope,
    layoutFacts,
  });
  const usesIndividualSelection = (catalog.candidates || []).some(
    (candidate) => candidate?.selectionMode === "individual",
  );
  const fallbackCandidate = fallbackOperators
    ? toRuntimeCandidate({
        catalog,
        candidate: {
          id: `fallback:${roomType}:${product}:${normalizedStationLevel}:${normalizedSlotCount}`,
          name: fallback.label,
          members: [],
          ...(usesIndividualSelection ? { isIndividualFallback: true } : {}),
          efficiency: 0,
          sortScore: 0,
        },
        operatorIds: [],
        coreUpgradeRequirements: [],
        rosterById,
        fallbackOperators,
        layoutFacts,
      })
    : null;

  return {
    candidates: getHighestAvailableVariants(matchingCandidates),
    fallbackCandidate,
  };
}
