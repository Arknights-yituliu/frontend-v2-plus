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

function getCandidatePercentFields(candidate) {
  return Object.fromEntries(
    PERCENT_FIELDS.map((field) => [field, Number(candidate?.[field] || 0)]),
  );
}

function getLocalFacilityBonusPercent(candidate) {
  const localPercentField = getPercentField(candidate?.sourceRoomType);
  return Number(localPercentField ? candidate?.[localPercentField] || 0 : 0);
}

function getCandidateRankingBonus(candidate) {
  return (
    getLocalFacilityBonusPercent(candidate) + Number(candidate?.sortScore || 0)
  );
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
          const rates = (operator?.rates || [])
            .map((rate) => ({
              elite: toNonNegativeInteger(rate?.elite),
              level: toNonNegativeInteger(rate?.level, 1),
              percent: Number(rate?.percent || 0),
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
  let percent = Number(pool.defaultPercent || 0);
  let appliedRate = null;

  for (const rate of rates) {
    if (
      trainingMode === "ideal" ||
      compareUnlock(operator, rate) >= 0
    ) {
      percent = rate.percent;
      appliedRate = rate;
    }
  }

  return {
    percent,
    upgradeRequirement:
      trainingMode === "ideal"
        ? createUpgradeRequirement(operator, appliedRate)
        : null,
  };
}

function getCandidateFallback(catalog, candidate) {
  if (candidate?.selectionMode === "individual") {
    return {
      count: 0,
      percent: Number(catalog?.fallback?.percent || 0),
      label: catalog?.fallback?.label || "基础补位",
      poolKey: String(catalog?.fallback?.poolKey || "").trim(),
    };
  }

  const slotCount = Number(catalog?.scope?.slotCount || 0);
  const memberCount = (candidate?.members || []).length;

  return {
    count: Math.max(0, slotCount - memberCount),
    percent: Number(catalog?.fallback?.percent || 0),
    label: catalog?.fallback?.label || "基础补位",
    poolKey: String(catalog?.fallback?.poolKey || "").trim(),
  };
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
}) {
  if (fallback.count === 0) {
    return [];
  }

  const pool = fallbackPools.get(fallback.poolKey);
  if (!pool) {
    return null;
  }

  const selected = [...rosterById.values()]
    .filter((operator) => !excludedOperatorIds.has(operator.charId))
    .map((operator) => {
      const rate = getRateForTrainingMode(
        operator,
        pool,
        trainingMode,
      );

      return {
        charId: operator.charId,
        name: operator.name,
        percent: rate.percent,
        upgradeRequirement: rate.upgradeRequirement,
      };
    })
    .sort(
      (left, right) =>
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
}) {
  const fallback = getCandidateFallback(catalog, candidate);
  const sourceRoomType = String(catalog?.scope?.roomType || "").trim();
  const localPercentField = getPercentField(sourceRoomType);
  const percentFields = getCandidatePercentFields(candidate);
  const coreBonusPercent = Number(
    localPercentField ? percentFields[localPercentField] : 0,
  );
  const fallbackPreviewOperators = [...fallbackOperators]
    .sort(
      (left, right) =>
        right.percent - left.percent ||
        left.name.localeCompare(right.name, "zh-CN") ||
        left.charId.localeCompare(right.charId, "en"),
    )
    .slice(0, fallback.count);
  const fallbackPercent = fallbackPreviewOperators.reduce(
    (total, operator) => total + operator.percent,
    0,
  );
  const fallbackUpgradeRequirements = mergeUpgradeRequirements(
    fallbackPreviewOperators.map((operator) => operator.upgradeRequirement),
  );
  const totalPercent = 100 + coreBonusPercent + fallbackPercent;

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
    bestAvailableTotalPercent: totalPercent,
    corePercent: 100 + coreBonusPercent,
    totalPercent,
    bonusPercent: coreBonusPercent + fallbackPercent,
    sourceRoomType,
    ...percentFields,
    sortScore: Number(candidate?.sortScore || 0),
    ...(Number.isFinite(Number(candidate?.virtualGoldPerHour)) &&
    Number(candidate.virtualGoldPerHour) > 0
      ? { virtualGoldPerHour: Number(candidate.virtualGoldPerHour) }
      : {}),
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
  trainingMode = "current",
}) {
  if (!catalog || Number(catalog.schemaVersion) !== 5) {
    throw new Error("A RIIC static room candidate catalog is required");
  }
  if (!fallbackCatalog || Number(fallbackCatalog.schemaVersion) !== 1) {
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

  if (
    catalog?.scope?.roomType !== roomType ||
    catalog?.scope?.product !== product ||
    Number(catalog?.scope?.stationLevel) !== normalizedStationLevel ||
    Number(catalog?.scope?.slotCount) !== normalizedSlotCount
  ) {
    throw new Error("RIIC static room candidate catalog scope does not match");
  }

  const normalizedTrainingMode = normalizeTrainingMode(trainingMode);
  const rosterById = normalizeRoster(ownedOperators);
  const nameToCharId = normalizeNameToCharId(operatorNameToCharId);
  const fallbackPools = normalizeFallbackPools(fallbackCatalog);
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
      });
      if (!fallbackOperators) {
        return [];
      }

      return [
        toRuntimeCandidate({
          catalog,
          candidate,
          operatorIds: memberResolution.operatorIds,
          coreUpgradeRequirements: memberResolution.upgradeRequirements,
          rosterById,
          fallbackOperators,
        }),
      ];
    },
  );
  const fallback = getCandidateFallback(catalog, { members: [] });
  const fallbackOperators = getFallbackOperators({
    fallback,
    rosterById,
    excludedOperatorIds: new Set(),
    fallbackPools,
    trainingMode: normalizedTrainingMode,
  });
  const fallbackCandidate = fallbackOperators
    ? toRuntimeCandidate({
        catalog,
        candidate: {
          id: `fallback:${roomType}:${product}:${normalizedStationLevel}:${normalizedSlotCount}`,
          name: fallback.label,
          members: [],
          tradingPercent: 0,
          manufacturePercent: 0,
          meetingPercent: 0,
          officePercent: 0,
          powerPercent: 0,
          sortScore: 0,
        },
        operatorIds: [],
        coreUpgradeRequirements: [],
        rosterById,
        fallbackOperators,
      })
    : null;

  return {
    candidates: getHighestAvailableVariants(matchingCandidates),
    fallbackCandidate,
  };
}
