import {
  materializeRiicRoomCandidateSkeletons,
} from "./riic03aCandidates.js";
import {
  normalizeRiicIdealTrainingRaritySelection,
  isRiicIdealTrainingEnabledForOperator,
} from "./riicTrainingPolicy.js";

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
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
      rarity: toNonNegativeInteger(operator?.rarity, null),
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

function resolveCandidateMembers({
  candidate,
  rosterById,
  nameToCharId,
  trainingMode,
  idealTrainingRaritySelection,
}) {
  const operatorIds = [];
  const upgradeRequirements = [];
  const taggedMemberRequirements = [];

  for (const member of candidate?.members || []) {
    const name = String(member?.name || "").trim();
    const tags = [
      ...new Set(
        (member?.tags || [])
          .map((tag) => String(tag || "").trim())
          .filter(Boolean),
      ),
    ];
    if (!name && tags.length > 0) {
      taggedMemberRequirements.push({ tags });
      continue;
    }

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
      if (
        trainingMode !== "ideal" ||
        !isRiicIdealTrainingEnabledForOperator(
          operator,
          idealTrainingRaritySelection,
        )
      ) {
        return null;
      }
      upgradeRequirements.push(upgradeRequirement);
    }

    operatorIds.push(charId);
  }

  return {
    candidate,
    operatorIds,
    coreUpgradeRequirements: upgradeRequirements,
    taggedMemberRequirements,
  };
}

function createFallbackCandidateSkeleton(catalog) {
  const usesIndividualSelection = (catalog.candidates || []).some(
    (candidate) => candidate?.selectionMode === "individual",
  );

  return {
    candidate: {
      id: `fallback:${catalog.scope.roomType}:${catalog.scope.product}:${catalog.scope.stationLevel}:${catalog.scope.slotCount}`,
      name: catalog?.fallback?.label || "Fallback",
      members: [],
      ...(usesIndividualSelection ? { isIndividualFallback: true } : {}),
      efficiency: 0,
      sortScore: 0,
    },
    operatorIds: [],
    coreUpgradeRequirements: [],
    taggedMemberRequirements: [],
  };
}

/**
 * 02 only resolves the fixed core of each candidate. It deliberately does not
 * estimate fallback, apply static effects, or calculate a runtime score.
 */
export function resolveRiicRoomCandidateSkeletons({
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
  idealTrainingRaritySelection,
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
  const normalizedRaritySelection =
    normalizeRiicIdealTrainingRaritySelection(
      idealTrainingRaritySelection,
    );
  const rosterById = normalizeRoster(ownedOperators);
  const nameToCharId = normalizeNameToCharId(operatorNameToCharId);
  const scope = {
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

  return {
    catalog,
    fallbackCatalog,
    rosterById,
    trainingMode: normalizedTrainingMode,
    idealTrainingRaritySelection: normalizedRaritySelection,
    scope,
    layoutFacts,
    candidateSkeletons: (catalog.candidates || []).flatMap((candidate) => {
      const resolution = resolveCandidateMembers({
        candidate,
        rosterById,
        nameToCharId,
        trainingMode: normalizedTrainingMode,
        idealTrainingRaritySelection: normalizedRaritySelection,
      });
      return resolution ? [resolution] : [];
    }),
    fallbackCandidateSkeleton: createFallbackCandidateSkeleton(catalog),
  };
}

/**
 * Compatibility adapter for scripts that have not moved to the explicit
 * 02 -> 03A pipeline yet. New UI code should call both stages directly.
 */
export function matchRiicStaticRoomCandidates({
  controlCenterRuntimeContext,
  ...options
}) {
  return materializeRiicRoomCandidateSkeletons({
    resolution: resolveRiicRoomCandidateSkeletons(options),
    controlCenterRuntimeContext,
  });
}
