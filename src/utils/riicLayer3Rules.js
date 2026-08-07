import RIIC_LAYER3_RULES from "/src/static/json/tools/riic-candidates/riic-layer3-rules.json";

function toNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function getRosterById(ownedOperators) {
  if (ownedOperators instanceof Map) {
    return ownedOperators;
  }

  return new Map(
    (ownedOperators || []).flatMap((operator) => {
      const charId = String(operator?.charId || "").trim();
      const elite = toNonNegativeInteger(operator?.elite);
      return charId && elite !== null ? [[charId, { ...operator, elite }]] : [];
    }),
  );
}

function normalizeScope(scope) {
  const roomType = String(scope?.roomType || "").trim();
  const product = String(scope?.product || "").trim();
  const stationLevel = Number(scope?.stationLevel);
  const slotCount = Number(scope?.slotCount);

  return roomType &&
    product &&
    Number.isInteger(stationLevel) &&
    stationLevel >= 1 &&
    Number.isInteger(slotCount) &&
    slotCount >= 1
    ? { roomType, product, stationLevel, slotCount }
    : null;
}

function inspectOperatorRequirement(requirement, rosterById) {
  const operatorId = String(requirement?.operatorId || "").trim();
  const eliteAtLeast = toNonNegativeInteger(requirement?.eliteAtLeast);
  const operator = rosterById.get(operatorId);
  const actualElite = toNonNegativeInteger(operator?.elite);

  return {
    operatorId,
    eliteAtLeast,
    actualElite,
    matched: Boolean(
      operatorId &&
        eliteAtLeast !== null &&
        operator &&
        actualElite !== null &&
        actualElite >= eliteAtLeast,
    ),
  };
}

function getLayoutFacilities(layoutFacts) {
  return (Array.isArray(layoutFacts?.facilities) ? layoutFacts.facilities : [])
    .flatMap((facility) => {
      const facilityType = String(facility?.facilityType || "").trim();
      const product = String(facility?.product || "").trim();
      const stationLevel = toNonNegativeInteger(facility?.stationLevel);

      return facilityType && product
        ? [
            {
              facilityType,
              product,
              stationLevel:
                stationLevel !== null && stationLevel >= 1
                  ? stationLevel
                  : null,
            },
          ]
        : [];
    });
}

function inspectFacilityRequirement(requirement, layoutFacts) {
  const facilityType = String(requirement?.facilityType || "").trim();
  const count = toNonNegativeInteger(requirement?.count);
  const productKindCount = toNonNegativeInteger(
    requirement?.productKindCount,
  );
  const product = String(requirement?.product || "").trim();
  const stationLevel = toNonNegativeInteger(requirement?.stationLevel);
  const supportedKeys = [
    "facilityType",
    "count",
    "product",
    "stationLevel",
    "productKindCount",
  ];
  const validShape = Boolean(
    requirement &&
      typeof requirement === "object" &&
      facilityType &&
      !Object.keys(requirement).some((key) => !supportedKeys.includes(key)) &&
      ((count !== null && productKindCount === null) ||
        (facilityType === "manufacture" &&
          count === null &&
          productKindCount !== null &&
          !product &&
          stationLevel === null)),
  );
  const base = {
    facilityType,
    product,
    stationLevel,
    count,
    productKindCount,
    actualValue: null,
    kind: "unsupported",
    matched: false,
  };

  if (!validShape) {
    return base;
  }

  const facilities = getLayoutFacilities(layoutFacts);
  if (productKindCount !== null) {
    const actualValue = facilities.length
      ? new Set(
          facilities
            .filter((facility) => facility.facilityType === facilityType)
            .map((facility) => facility.product)
            .filter((value) => value && value !== "all"),
        ).size
      : Number(layoutFacts?.manufactureProductKindCount);
    return {
      ...base,
      actualValue,
      kind: "manufactureProductKindCount",
      matched: actualValue === productKindCount,
    };
  }

  if (facilities.length) {
    const actualValue = facilities.filter(
      (facility) =>
        facility.facilityType === facilityType &&
        (!product || facility.product === product) &&
        (stationLevel === null || facility.stationLevel === stationLevel),
    ).length;
    return {
      ...base,
      actualValue,
      kind: "facilityCount",
      matched: actualValue === count,
    };
  }

  if (stationLevel !== null) {
    return base;
  }
  if (facilityType === "power" && !product) {
    const actualValue = Number(layoutFacts?.powerPlantCount);
    return {
      ...base,
      actualValue,
      kind: "powerCount",
      matched: actualValue === count,
    };
  }
  if (facilityType === "trading" && !product) {
    const actualValue = Number(layoutFacts?.tradingStationCount);
    return {
      ...base,
      actualValue,
      kind: "tradingCount",
      matched: actualValue === count,
    };
  }
  if (facilityType === "manufacture" && product === "gold") {
    const actualValue = Number(layoutFacts?.goldManufactureStationCount);
    return {
      ...base,
      actualValue,
      kind: "goldManufactureCount",
      matched: actualValue === count,
    };
  }

  return base;
}

function inspectConditions(conditions, rosterById, layoutFacts) {
  const hasOperatorRequirements = Array.isArray(conditions?.operators);
  const hasFacilityRequirements = Array.isArray(conditions?.facilities);
  const operatorConditions = hasOperatorRequirements
    ? conditions.operators.map((requirement) =>
        inspectOperatorRequirement(requirement, rosterById),
      )
    : [];
  const facilityConditions = hasFacilityRequirements
    ? conditions.facilities.map((requirement) =>
        inspectFacilityRequirement(requirement, layoutFacts),
      )
    : [];

  return {
    operatorConditions,
    facilityConditions,
    matched: Boolean(
      conditions &&
        hasOperatorRequirements &&
        operatorConditions.every((condition) => condition.matched) &&
        hasFacilityRequirements &&
        facilityConditions.every((condition) => condition.matched),
    ),
  };
}

function matchesConditions(conditions, rosterById, layoutFacts) {
  return inspectConditions(conditions, rosterById, layoutFacts).matched;
}

export function getRiicLayer3RuleConditionChecks({
  ownedOperators,
  layoutFacts,
}) {
  const rosterById = getRosterById(ownedOperators);

  return (RIIC_LAYER3_RULES.rules || []).map((rule, index) => {
    const conditions = inspectConditions(
      rule?.conditions,
      rosterById,
      layoutFacts,
    );

    return {
      id: String(rule?.id || `rule-${index + 1}`),
      matched: conditions.matched,
      operatorConditions: conditions.operatorConditions,
      facilityConditions: conditions.facilityConditions,
      effects: Array.isArray(rule?.effects) ? rule.effects : [],
    };
  });
}

export function getRiicLayer3OperatorLocalBonus({
  operatorId,
  ownedOperators,
  scope,
  layoutFacts,
}) {
  const normalizedOperatorId = String(operatorId || "").trim();
  const normalizedScope = normalizeScope(scope);
  const rosterById = getRosterById(ownedOperators);
  if (!normalizedOperatorId || !normalizedScope || !rosterById.has(normalizedOperatorId)) {
    return 0;
  }

  const bonusesByEffect = new Map();
  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (!matchesConditions(rule?.conditions, rosterById, layoutFacts)) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      const bonusPercent = Number(effect?.bonusPercent);
      const effectProduct = String(effect?.product || "").trim();
      if (
        !Number.isFinite(bonusPercent) ||
        String(effect?.operatorId || "").trim() !== normalizedOperatorId ||
        String(effect?.roomType || "").trim() !== normalizedScope.roomType ||
        (effectProduct && effectProduct !== normalizedScope.product)
      ) {
        continue;
      }

      const effectKey = [
        normalizedOperatorId,
        normalizedScope.roomType,
        effectProduct,
      ].join(":");
      bonusesByEffect.set(
        effectKey,
        Math.max(Number(bonusesByEffect.get(effectKey) ?? -Infinity), bonusPercent),
      );
    }
  }

  return [...bonusesByEffect.values()].reduce(
    (total, bonusPercent) => total + bonusPercent,
    0,
  );
}

export function getRiicLayer3CandidateRoomPriority({
  candidate,
  operatorIds,
  ownedOperators,
  scope,
  layoutFacts,
}) {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) {
    return 0;
  }

  const rosterById = getRosterById(ownedOperators);
  const candidateVariantGroupId = String(
    candidate?.variantGroupId || candidate?.id || candidate?.key || "",
  ).trim();
  const candidateOperatorIds = new Set(
    (operatorIds || []).map((operatorId) => String(operatorId || "").trim()),
  );
  let totalPriority = 0;

  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (!matchesConditions(rule?.conditions, rosterById, layoutFacts)) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      const roomPriority = Number(effect?.roomPriority);
      if (!Number.isFinite(roomPriority)) {
        continue;
      }

      const effectVariantGroupId = String(effect?.variantGroupId || "").trim();
      if (
        effectVariantGroupId &&
        effectVariantGroupId === candidateVariantGroupId
      ) {
        totalPriority += roomPriority;
        continue;
      }

      const effectOperatorId = String(effect?.operatorId || "").trim();
      const effectRoomType = String(effect?.roomType || "").trim();
      const effectProduct = String(effect?.product || "").trim();
      const effectStationLevel = toNonNegativeInteger(effect?.stationLevel);
      if (
        !effectOperatorId ||
        !effectRoomType ||
        !effectProduct ||
        effectStationLevel === null ||
        effectStationLevel < 1 ||
        !candidateOperatorIds.has(effectOperatorId) ||
        effectRoomType !== normalizedScope.roomType ||
        effectProduct !== normalizedScope.product ||
        effectStationLevel !== normalizedScope.stationLevel
      ) {
        continue;
      }

      totalPriority += roomPriority;
    }
  }

  return totalPriority;
}
