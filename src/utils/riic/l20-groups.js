import {
  normalizeRiicIdealTrainingRaritySelection,
  isRiicIdealTrainingEnabledForOperator,
} from "./l00-training-policy.js";
import {
  getRiicPerceptionCoreBaseline,
} from "./l28-perception-baseline.js";
import {
  createRiicPairComponentCandidateSkeletons,
} from "./l21-pair-components.js";

const ROSMONTIS_OPERATOR_ID = "char_391_rosmon";
const EBENHOLZ_OPERATOR_ID = "char_4046_ebnhlz";

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

function getCandidateMemberCount(skeleton) {
  return Array.isArray(skeleton?.candidate?.members)
    ? skeleton.candidate.members.length
    : 0;
}

function isButshuCandidateSkeleton(skeleton) {
  return String(skeleton?.candidate?.variantGroupId || "").startsWith(
    "family-butshu:",
  );
}

function hasOverlappingOperatorIds(left, right) {
  const leftIds = new Set(left?.operatorIds || []);
  return (right?.operatorIds || []).some((operatorId) =>
    leftIds.has(operatorId),
  );
}

function stripFallbackLabel(name) {
  return String(name || "")
    .replace(/\s*\+\s*\d+位补位\s*$/, "")
    .trim();
}

/**
 * A three-person LMD trading room may combine a Butshu core that still has
 * empty slots with one fixed non-Butshu candidate. The generated record is
 * runtime-only: its partner contribution remains separate so L62 can feed it
 * into Butshu's order calculation instead of adding two displayed totals.
 */
export function createRiicButshuFixedPartnerCandidateSkeletons({
  candidateSkeletons = [],
  scope,
} = {}) {
  if (
    String(scope?.roomType || "") !== "trading" ||
    String(scope?.product || "") !== "lmd" ||
    Number(scope?.stationLevel) !== 3 ||
    Number(scope?.slotCount) !== 3
  ) {
    return [];
  }

  const explicitTeamSignatures = new Set(
    candidateSkeletons
      .filter(
        (skeleton) =>
          getCandidateMemberCount(skeleton) === Number(scope.slotCount),
      )
      .map((skeleton) =>
        [...(skeleton.operatorIds || [])]
          .sort((left, right) => left.localeCompare(right, "en"))
          .join("|"),
      ),
  );

  return candidateSkeletons.flatMap((butshuSkeleton) => {
    const butshuMemberCount = getCandidateMemberCount(butshuSkeleton);
    const missingSlotCount = Number(scope.slotCount) - butshuMemberCount;
    if (
      !isButshuCandidateSkeleton(butshuSkeleton) ||
      butshuMemberCount <= 0 ||
      missingSlotCount <= 0 ||
      (butshuSkeleton?.taggedMemberRequirements || []).length > 0
    ) {
      return [];
    }

    return candidateSkeletons.flatMap((partnerSkeleton) => {
      const partnerMemberCount = getCandidateMemberCount(partnerSkeleton);
      const partnerBonusPercent = Number(partnerSkeleton?.candidate?.efficiency);
      if (
        partnerSkeleton === butshuSkeleton ||
        isButshuCandidateSkeleton(partnerSkeleton) ||
        partnerSkeleton?.candidate?.lv3PairComponent !== true ||
        partnerMemberCount !== missingSlotCount ||
        !Number.isFinite(partnerBonusPercent) ||
        (partnerSkeleton?.taggedMemberRequirements || []).length > 0 ||
        hasOverlappingOperatorIds(butshuSkeleton, partnerSkeleton)
      ) {
        return [];
      }

      const butshuCandidate = butshuSkeleton.candidate;
      const partnerCandidate = partnerSkeleton.candidate;
      const operatorIds = [
        ...(butshuSkeleton.operatorIds || []),
        ...(partnerSkeleton.operatorIds || []),
      ];
      const operatorIdSignature = [...operatorIds]
        .sort((left, right) => left.localeCompare(right, "en"))
        .join("|");
      if (explicitTeamSignatures.has(operatorIdSignature)) {
        return [];
      }
      const sourceFiles = [
        butshuCandidate?.sourceFile,
        partnerCandidate?.sourceFile,
      ]
        .map((sourceFile) => String(sourceFile || "").trim())
        .filter(Boolean);

      return [
        {
          candidate: {
            ...butshuCandidate,
            id: `combined:${butshuCandidate.id}:${partnerCandidate.id}`,
            name: [
              stripFallbackLabel(butshuCandidate.name),
              stripFallbackLabel(partnerCandidate.name),
            ]
              .filter(Boolean)
              .join(" + "),
            members: [
              ...(butshuCandidate.members || []),
              ...(partnerCandidate.members || []),
            ],
            efficiency:
              Number(butshuCandidate.efficiency || 0) + partnerBonusPercent,
            sourceFile: sourceFiles.join(" + "),
            variantGroupId: `${String(
              butshuCandidate.variantGroupId || butshuCandidate.id || "",
            )}:fixed-partner:${String(partnerCandidate.id || "")}`,
            composition: {
              kind: "butshu-fixed-partner",
              partnerCandidateId: String(partnerCandidate.id || ""),
              partnerCandidateName: String(partnerCandidate.name || ""),
              partnerBonusPercent,
            },
          },
          operatorIds,
          coreUpgradeRequirements: [
            ...(butshuSkeleton.coreUpgradeRequirements || []),
            ...(partnerSkeleton.coreUpgradeRequirements || []),
          ],
          taggedMemberRequirements: [],
        },
      ];
    });
  });
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
  const perceptionCoreBaselinesByOperatorId = Object.fromEntries(
    [ROSMONTIS_OPERATOR_ID, EBENHOLZ_OPERATOR_ID].flatMap((operatorId) =>
      rosterById.has(operatorId)
        ? [
            [
              operatorId,
              getRiicPerceptionCoreBaseline({
                operatorId,
                elite: rosterById.get(operatorId)?.elite,
                ownedOperators: rosterById,
                layoutFacts,
              }),
            ],
          ]
        : [],
    ),
  );
  const candidateSkeletons = (catalog.candidates || []).flatMap((candidate) => {
    const resolution = resolveCandidateMembers({
      candidate,
      rosterById,
      nameToCharId,
      trainingMode: normalizedTrainingMode,
      idealTrainingRaritySelection: normalizedRaritySelection,
    });
    return resolution ? [resolution] : [];
  });
  const butshuPartnerCandidateSkeletons =
    createRiicButshuFixedPartnerCandidateSkeletons({
      candidateSkeletons,
      scope,
    });
  const pairComponentCandidateSkeletons =
    createRiicPairComponentCandidateSkeletons({
      candidateSkeletons,
      scope,
    });

  return {
    catalog,
    fallbackCatalog,
    rosterById,
    trainingMode: normalizedTrainingMode,
    idealTrainingRaritySelection: normalizedRaritySelection,
    scope,
    layoutFacts,
    perceptionCoreBaselinesByOperatorId,
    candidateSkeletons: [
      ...candidateSkeletons,
      ...butshuPartnerCandidateSkeletons,
      ...pairComponentCandidateSkeletons,
    ],
    fallbackCandidateSkeleton: createFallbackCandidateSkeleton(catalog),
  };
}
