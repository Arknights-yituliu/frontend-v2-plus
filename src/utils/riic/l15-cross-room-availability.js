import {
  isRiicIdealTrainingEnabledForOperator,
  normalizeRiicIdealTrainingRaritySelection,
} from "./l00-training-policy.js";
import {
  compareRiicOperatorUnlock,
  createRiicUpgradeRequirement,
  mergeRiicUpgradeRequirements,
} from "./P00-upgrade-requirements.js";

function toNonNegativeInteger(value, fallback = null) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeTrainingMode(value) {
  return value === "ideal" ? "ideal" : "current";
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
      rarity: toNonNegativeInteger(operator?.rarity),
      elite: toNonNegativeInteger(operator?.elite, 0),
      level: toNonNegativeInteger(operator?.level, 1),
    };
    const current = byId.get(charId);
    if (!current || compareRiicOperatorUnlock(normalized, current) > 0) {
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

function normalizeFacilities(layoutData) {
  return (Array.isArray(layoutData?.facilities)
    ? layoutData.facilities
    : []
  ).flatMap((facility) => {
    const facilityType = String(facility?.facilityType || "").trim();
    if (!facilityType) {
      return [];
    }

    return [
      {
        facilityType,
        product: String(facility?.product || "").trim(),
        stationLevel: toNonNegativeInteger(facility?.stationLevel),
      },
    ];
  });
}

function inspectFacilityRequirement(requirement, facilities) {
  const facilityType = String(requirement?.facilityType || "").trim();
  const product = String(requirement?.product || "").trim();
  const minCount = toNonNegativeInteger(requirement?.minCount, 1);
  const minStationLevel = toNonNegativeInteger(
    requirement?.minStationLevel,
  );

  if (!facilityType || minCount === null || minCount < 1) {
    return {
      requirement,
      status: "invalidRequirement",
      matched: false,
      actualCount: 0,
    };
  }

  const matchedFacilities = facilities.filter(
    (facility) =>
      facility.facilityType === facilityType &&
      (!product || facility.product === product) &&
      (minStationLevel === null ||
        Number(facility.stationLevel) >= minStationLevel),
  );

  return {
    facilityType,
    product,
    minCount,
    minStationLevel,
    actualCount: matchedFacilities.length,
    status: matchedFacilities.length >= minCount ? "matched" : "missing",
    matched: matchedFacilities.length >= minCount,
  };
}

function inspectVariantMembers({
  members,
  rosterById,
  currentRosterById,
  nameToCharId,
  trainingMode,
  idealTrainingRaritySelection,
}) {
  const operatorIds = [];
  const memberChecks = [];
  const upgradeRequirements = [];
  const unresolvedTags = [];
  let hasInvalidMember = false;

  for (const member of members || []) {
    const name = String(member?.name || "").trim();
    const charId = String(member?.charId || "").trim() || nameToCharId.get(name);
    const tags = [
      ...new Set(
        (member?.tags || [])
          .map((tag) => String(tag || "").trim())
          .filter(Boolean),
      ),
    ];

    if (!name && !charId && tags.length > 0) {
      unresolvedTags.push({ tags });
      continue;
    }

    if (!charId || operatorIds.includes(charId)) {
      hasInvalidMember = true;
      memberChecks.push({
        name,
        charId,
        status: charId ? "duplicateMember" : "unknownOperator",
        matched: false,
      });
      continue;
    }

    const requirement = {
      elite: toNonNegativeInteger(member?.elite, 0),
      level: toNonNegativeInteger(member?.level, 1),
    };
    const operator = rosterById.get(charId);
    const hasMaxElite = Object.hasOwn(member || {}, "maxElite");
    const maxElite = toNonNegativeInteger(member?.maxElite);
    const exceedsMaxElite =
      hasMaxElite &&
      (maxElite === null ||
        maxElite < requirement.elite ||
        (operator && Number(operator.elite) > maxElite));

    if (!operator || exceedsMaxElite) {
      memberChecks.push({
        name: name || charId,
        charId,
        requirement,
        status: exceedsMaxElite ? "maxEliteMismatch" : "notOwned",
        matched: false,
      });
      continue;
    }

    const upgradeRequirement = createRiicUpgradeRequirement(
      currentRosterById.get(charId) || operator,
      requirement,
    );
    const canTreatAsUnlocked =
      upgradeRequirement &&
      trainingMode === "ideal" &&
      isRiicIdealTrainingEnabledForOperator(
        operator,
        idealTrainingRaritySelection,
      );

    memberChecks.push({
      name: name || operator.name,
      charId,
      requirement,
      status: upgradeRequirement
        ? canTreatAsUnlocked
          ? "requiresTraining"
          : "skillLocked"
        : "matched",
      matched: !upgradeRequirement || canTreatAsUnlocked,
    });
    operatorIds.push(charId);

    if (upgradeRequirement) {
      upgradeRequirements.push(upgradeRequirement);
    }
  }

  const hasMissingOperators = memberChecks.some(
    (check) => check.status === "notOwned" || check.status === "maxEliteMismatch",
  );
  const hasLockedMembers = memberChecks.some(
    (check) => check.status === "skillLocked",
  );

  return {
    operatorIds,
    memberChecks,
    upgradeRequirements: mergeRiicUpgradeRequirements(upgradeRequirements),
    unresolvedTags,
    hasInvalidMember,
    hasMissingOperators,
    hasLockedMembers,
  };
}

function inspectVariant({
  variant,
  rosterById,
  currentRosterById,
  nameToCharId,
  facilities,
  trainingMode,
  idealTrainingRaritySelection,
  groupId,
  index,
}) {
  const members = Array.isArray(variant?.members) ? variant.members : [];
  const memberState = inspectVariantMembers({
    members,
    rosterById,
    currentRosterById,
    nameToCharId,
    trainingMode,
    idealTrainingRaritySelection,
  });
  const facilityChecks = (variant?.facilityRequirements || []).map(
    (requirement) => inspectFacilityRequirement(requirement, facilities),
  );
  const hasLayoutMismatch = facilityChecks.some((check) => !check.matched);

  let status = "ready";
  if (!String(variant?.id || "").trim() || members.length === 0) {
    status = "invalidDefinition";
  } else if (memberState.hasInvalidMember) {
    status = "invalidDefinition";
  } else if (memberState.unresolvedTags.length > 0) {
    status = "requiresTagResolution";
  } else if (hasLayoutMismatch) {
    status = "layoutMismatch";
  } else if (memberState.hasMissingOperators) {
    status = "missingOperators";
  } else if (memberState.hasLockedMembers) {
    status = "skillLocked";
  } else if (memberState.upgradeRequirements.length > 0) {
    status = "requiresTraining";
  }

  return {
    id: String(variant?.id || `${groupId}:variant:${index + 1}`),
    name: String(variant?.name || variant?.id || "").trim(),
    status,
    isAvailable: status === "ready" || status === "requiresTraining",
    isReady: status === "ready",
    operatorIds: memberState.operatorIds,
    memberChecks: memberState.memberChecks,
    upgradeRequirements: memberState.upgradeRequirements,
    unresolvedTags: memberState.unresolvedTags,
    facilityChecks,
  };
}

/**
 * Evaluates only explicitly declared cross-room group variants.
 *
 * A variant contains its fixed members plus optional minimum facility
 * requirements. L15 never enumerates arbitrary operator subsets, estimates
 * output, ranks variants, or reserves operators for any room.
 */
export function evaluateRiicCrossRoomGroupAvailability({
  groups = [],
  ownedOperators = [],
  currentOwnedOperators,
  operatorNameToCharId,
  layoutData,
  trainingMode = "current",
  idealTrainingRaritySelection,
} = {}) {
  const normalizedTrainingMode = normalizeTrainingMode(trainingMode);
  const normalizedRaritySelection =
    normalizeRiicIdealTrainingRaritySelection(idealTrainingRaritySelection);
  const rosterById = normalizeRoster(ownedOperators);
  const currentRosterById = normalizeRoster(
    currentOwnedOperators || ownedOperators,
  );
  const nameToCharId = normalizeNameToCharId(operatorNameToCharId);
  const facilities = normalizeFacilities(layoutData);

  const results = (groups || []).map((group, index) => {
    const groupId = String(group?.id || `cross-room-group-${index + 1}`).trim();
    const variants = (Array.isArray(group?.variants) ? group.variants : []).map(
      (variant, variantIndex) =>
        inspectVariant({
          variant,
          rosterById,
          currentRosterById,
          nameToCharId,
          facilities,
          trainingMode: normalizedTrainingMode,
          idealTrainingRaritySelection: normalizedRaritySelection,
          groupId,
          index: variantIndex,
        }),
    );
    const readyVariantCount = variants.filter((variant) => variant.isReady).length;
    const availableVariantCount = variants.filter(
      (variant) => variant.isAvailable,
    ).length;

    return {
      id: groupId,
      name: String(group?.name || groupId).trim(),
      status:
        readyVariantCount > 0
          ? "ready"
          : availableVariantCount > 0
            ? "requiresTraining"
            : variants.length > 0
              ? "unavailable"
              : "invalidDefinition",
      isAvailable: availableVariantCount > 0,
      readyVariantCount,
      availableVariantCount,
      variants,
    };
  });

  return {
    trainingMode: normalizedTrainingMode,
    idealTrainingRaritySelection: normalizedRaritySelection,
    groups: results,
    readyGroupCount: results.filter((group) => group.status === "ready").length,
    availableGroupCount: results.filter((group) => group.isAvailable).length,
  };
}
