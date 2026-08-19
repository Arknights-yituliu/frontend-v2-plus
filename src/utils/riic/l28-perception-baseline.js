const ROSMONTIS_OPERATOR_ID = "char_391_rosmon";
const EBENHOLZ_OPERATOR_ID = "char_4046_ebnhlz";
const ALICE_OPERATOR_ID = "char_338_iris";
const CZERNY_OPERATOR_ID = "char_4047_pianst";
const DEFAULT_DORMITORY_CAPACITY_PER_ROOM = 5;
const DEFAULT_DORMITORY_ROOM_COUNT = 4;

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function getDormitoryRoomCount(layoutFacts = {}) {
  const facilities = Array.isArray(layoutFacts?.facilities)
    ? layoutFacts.facilities
    : [];
  const count = facilities.filter(
    (facility) => String(facility?.facilityType || "").trim() === "dormitory",
  ).length;

  return count > 0 ? count : DEFAULT_DORMITORY_ROOM_COUNT;
}

function hasOwnedOperatorAtElite(
  ownedOperators,
  operatorId,
  requiredElite,
) {
  if (ownedOperators instanceof Map) {
    return Number(ownedOperators.get(operatorId)?.elite) >= requiredElite;
  }

  return (ownedOperators || []).some(
    (item) =>
      String(item?.charId || "").trim() === operatorId &&
      Number(item?.elite) >= requiredElite,
  );
}

export function getRiicDormitoryOccupantCount({
  layoutFacts,
  dormitoryOccupantCount,
} = {}) {
  const explicitCount = Number(dormitoryOccupantCount);
  if (Number.isFinite(explicitCount) && explicitCount >= 0) {
    return explicitCount;
  }

  return (
    getDormitoryRoomCount(layoutFacts) * DEFAULT_DORMITORY_CAPACITY_PER_ROOM
  );
}

export function getRiicDormitoryLevel({
  layoutFacts,
  dormitoryLevel,
} = {}) {
  const explicitLevel = Number(dormitoryLevel);
  if (Number.isFinite(explicitLevel) && explicitLevel >= 0) {
    return explicitLevel;
  }

  const facilities = Array.isArray(layoutFacts?.facilities)
    ? layoutFacts.facilities
    : [];
  const powerPlantCount =
    facilities.filter(
      (facility) => String(facility?.facilityType || "").trim() === "power",
    ).length || toNonNegativeInteger(layoutFacts?.powerPlantCount);

  return powerPlantCount === 3 ? 5 : powerPlantCount === 2 ? 3 : null;
}

export function getRiicPerceptionCoreBaseline({
  operatorId,
  elite,
  ownedOperators,
  layoutFacts,
  dormitoryOccupantCount,
  dormitoryLevel,
} = {}) {
  const normalizedOperatorId = String(operatorId || "").trim();
  if (
    normalizedOperatorId !== ROSMONTIS_OPERATOR_ID &&
    normalizedOperatorId !== EBENHOLZ_OPERATOR_ID
  ) {
    return {
      operatorId: normalizedOperatorId,
      bonusPercent: 0,
      dormitoryOccupantCount: 0,
    };
  }

  const occupants = getRiicDormitoryOccupantCount({
    layoutFacts,
    dormitoryOccupantCount,
  });
  const normalizedElite = toNonNegativeInteger(elite);
  const resolvedDormitoryLevel = getRiicDormitoryLevel({
    layoutFacts,
    dormitoryLevel,
  });

  const sources = [
    {
      operatorId: normalizedOperatorId,
      resource: "perceptionInformation",
      value: occupants,
    },
  ];

  if (resolvedDormitoryLevel !== null) {
    for (const supportOperatorId of [
      ALICE_OPERATOR_ID,
      CZERNY_OPERATOR_ID,
    ]) {
      if (hasOwnedOperatorAtElite(ownedOperators, supportOperatorId, 2)) {
        sources.push({
          operatorId: supportOperatorId,
          resource: "perceptionInformation",
          value: resolvedDormitoryLevel,
        });
      }
    }
  }
  const perceptionInformation = sources.reduce(
    (total, source) => total + source.value,
    0,
  );

  return {
    operatorId: normalizedOperatorId,
    bonusPercent:
      normalizedOperatorId === EBENHOLZ_OPERATOR_ID
        ? normalizedElite >= 2
          ? Math.floor(perceptionInformation / 2)
          : Math.floor(perceptionInformation / 4)
        : normalizedElite >= 2
          ? perceptionInformation
          : Math.floor(perceptionInformation / 2),
    dormitoryOccupantCount: occupants,
    dormitoryLevel: resolvedDormitoryLevel,
    sources,
  };
}
