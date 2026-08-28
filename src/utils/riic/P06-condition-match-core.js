import RIIC_LAYER3_RULES from "../../static/json/tools/riic-candidates/R30-rules.json" with {
  type: "json",
};
import { resolveRiicOperatorIdByName } from "./riic-operator-identity.js";

function resolveRuleOperatorId(value) {
  const operatorName = String(value?.operatorName || "").trim();
  return operatorName ? resolveRiicOperatorIdByName(operatorName) : "";
}

function normalizeRuleEffects(effects) {
  return (effects || []).map((effect) => {
    const operatorId = resolveRuleOperatorId(effect);
    return operatorId ? { ...effect, operatorId } : effect;
  });
}

function getAssignedOperatorIdsByRoomType(roomAssignments) {
  const operatorIdsByRoomType = new Map();

  for (const assignment of roomAssignments || []) {
    const roomType = String(assignment?.roomType || "").trim();
    if (!roomType) {
      continue;
    }

    const operatorIds = operatorIdsByRoomType.get(roomType) || new Set();
    for (const operatorId of assignment?.operatorIds || []) {
      const normalizedOperatorId = String(operatorId || "").trim();
      if (normalizedOperatorId) {
        operatorIds.add(normalizedOperatorId);
      }
    }
    operatorIdsByRoomType.set(roomType, operatorIds);
  }

  return operatorIdsByRoomType;
}

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
  const operatorName = String(requirement?.operatorName || "").trim();
  const operatorId = resolveRuleOperatorId(requirement);
  const eliteAtLeast = toNonNegativeInteger(requirement?.eliteAtLeast);
  const operator = rosterById.get(operatorId);
  const actualElite = toNonNegativeInteger(operator?.elite);

  return {
    operatorName,
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

function getLayoutFacilities(layoutData) {
  return (Array.isArray(layoutData?.facilities) ? layoutData.facilities : [])
    .flatMap((facility) => {
      const facilityType = String(facility?.facilityType || "").trim();
      const product = String(facility?.product || "").trim();
      const stationLevel = toNonNegativeInteger(facility?.stationLevel);

      return facilityType
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

function inspectFacilityRequirement(
  requirement,
  layoutData,
  staffingData = {},
) {
  const facilityType = String(requirement?.facilityType || "").trim();
  const count = toNonNegativeInteger(requirement?.count);
  const productKindCount = toNonNegativeInteger(
    requirement?.productKindCount,
  );
  const levelTotal = toNonNegativeInteger(requirement?.levelTotal);
  const staffedEliteCount = toNonNegativeInteger(
    requirement?.staffedEliteCount,
  );
  const product = String(requirement?.product || "").trim();
  const stationLevel = toNonNegativeInteger(requirement?.stationLevel);
  const supportedKeys = [
    "facilityType",
    "count",
    "levelTotal",
    "product",
    "stationLevel",
    "productKindCount",
    "staffedEliteCount",
  ];
  const validShape = Boolean(
    requirement &&
      typeof requirement === "object" &&
      facilityType &&
      !Object.keys(requirement).some((key) => !supportedKeys.includes(key)) &&
      ((count !== null &&
        productKindCount === null &&
        levelTotal === null &&
        staffedEliteCount === null) ||
        (facilityType === "manufacture" &&
          count === null &&
          productKindCount !== null &&
          levelTotal === null &&
          staffedEliteCount === null &&
          !product &&
          stationLevel === null) ||
        (levelTotal !== null &&
          count === null &&
          productKindCount === null &&
          staffedEliteCount === null &&
          !product &&
          stationLevel === null) ||
        (facilityType === "any" &&
          staffedEliteCount !== null &&
          count === null &&
          productKindCount === null &&
          levelTotal === null &&
          !product &&
          stationLevel === null)),
  );
  const base = {
    facilityType,
    product,
    stationLevel,
    count,
    productKindCount,
    levelTotal,
    staffedEliteCount,
    actualValue: null,
    kind: "unsupported",
    matched: false,
  };

  if (!validShape) {
    return base;
  }

  const facilities = getLayoutFacilities(layoutData);
  if (staffedEliteCount !== null) {
    const actualValue = toNonNegativeInteger(
      staffingData?.staffedEliteCount,
    );
    return {
      ...base,
      actualValue,
      kind: "staffedEliteCount",
      matched: actualValue === staffedEliteCount,
    };
  }

  if (productKindCount !== null) {
    const actualValue = facilities.length
      ? new Set(
          facilities
            .filter((facility) => facility.facilityType === facilityType)
            .map((facility) => facility.product)
            .filter((value) => value && value !== "all"),
        ).size
      : Number(layoutData?.manufactureProductKindCount);
    return {
      ...base,
      actualValue,
      kind: "manufactureProductKindCount",
      matched: actualValue === productKindCount,
    };
  }

  if (levelTotal !== null) {
    if (!facilities.length) {
      return base;
    }

    const actualValue = facilities
      .filter((facility) => facility.facilityType === facilityType)
      .reduce(
        (total, facility) => total + Number(facility.stationLevel || 0),
        0,
      );
    return {
      ...base,
      actualValue,
      kind: "facilityLevelTotal",
      matched: actualValue === levelTotal,
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
    const actualValue = Number(layoutData?.powerPlantCount);
    return {
      ...base,
      actualValue,
      kind: "powerCount",
      matched: actualValue === count,
    };
  }
  if (facilityType === "trading" && !product) {
    const actualValue = Number(layoutData?.tradingStationCount);
    return {
      ...base,
      actualValue,
      kind: "tradingCount",
      matched: actualValue === count,
    };
  }
  if (facilityType === "manufacture" && product === "gold") {
    const actualValue = Number(layoutData?.goldManufactureStationCount);
    return {
      ...base,
      actualValue,
      kind: "goldManufactureCount",
      matched: actualValue === count,
    };
  }

  return base;
}

function normalizeFacilityTypeList(value) {
  const facilityTypes = [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map((facilityType) => String(facilityType || "").trim())
        .filter(Boolean),
    ),
  ];
  return facilityTypes.length > 0 ? facilityTypes : null;
}

function inspectFacilityComparison(requirement, layoutData) {
  const leftFacilityTypes = normalizeFacilityTypeList(
    requirement?.leftFacilityTypes,
  );
  const rightFacilityTypes = normalizeFacilityTypeList(
    requirement?.rightFacilityTypes,
  );
  const operator = String(requirement?.operator || "").trim();
  const validOperator = operator === "gte" || operator === "gt";
  const facilities = getLayoutFacilities(layoutData);
  const leftCount = leftFacilityTypes
    ? facilities.filter((facility) =>
        leftFacilityTypes.includes(facility.facilityType),
      ).length
    : null;
  const rightCount = rightFacilityTypes
    ? facilities.filter((facility) =>
        rightFacilityTypes.includes(facility.facilityType),
      ).length
    : null;
  const validShape = Boolean(
    leftFacilityTypes && rightFacilityTypes && validOperator,
  );

  return {
    leftFacilityTypes: leftFacilityTypes || [],
    rightFacilityTypes: rightFacilityTypes || [],
    operator,
    leftCount,
    rightCount,
    matched: Boolean(
      validShape &&
        facilities.length > 0 &&
        (operator === "gte"
          ? leftCount >= rightCount
          : leftCount > rightCount),
    ),
  };
}

function inspectConditions(
  conditions,
  rosterById,
  layoutData,
  staffingData = {},
) {
  const hasOperatorRequirements = Array.isArray(conditions?.operators);
  const hasFacilityRequirements = Array.isArray(conditions?.facilities);
  const hasFacilityComparison = Boolean(conditions?.facilityComparison);
  const operatorConditions = hasOperatorRequirements
    ? conditions.operators.map((requirement) =>
        inspectOperatorRequirement(requirement, rosterById),
      )
    : [];
  const facilityConditions = hasFacilityRequirements
    ? conditions.facilities.map((requirement) =>
        inspectFacilityRequirement(requirement, layoutData, staffingData),
      )
    : [];
  const facilityComparison = hasFacilityComparison
    ? inspectFacilityComparison(conditions.facilityComparison, layoutData)
    : null;

  return {
    operatorConditions,
    facilityConditions,
    facilityComparison,
    matched: Boolean(
      conditions &&
        hasOperatorRequirements &&
        operatorConditions.every((condition) => condition.matched) &&
        hasFacilityRequirements &&
        facilityConditions.every((condition) => condition.matched) &&
        (!facilityComparison || facilityComparison.matched),
    ),
  };
}

function matchesConditions(
  conditions,
  rosterById,
  layoutData,
  staffingData = {},
) {
  return inspectConditions(
    conditions,
    rosterById,
    layoutData,
    staffingData,
  ).matched;
}

function hasFacilityCountCondition(conditions) {
  return (conditions?.facilities || []).some((requirement) => {
    const facilityType = String(requirement?.facilityType || "").trim();
    return (
      facilityType &&
      facilityType !== "any" &&
      (toNonNegativeInteger(requirement?.count) !== null ||
        toNonNegativeInteger(requirement?.productKindCount) !== null)
    );
  });
}

function resolveEffectBonusPercent(effect, layoutData) {
  const dynamicRule = effect?.bonusPercentPerLevelTotal;
  if (dynamicRule && typeof dynamicRule === "object") {
    const facilityType = String(dynamicRule.facilityType || "").trim();
    const multiplier = Number(dynamicRule.multiplier);
    if (!facilityType || !Number.isFinite(multiplier)) {
      return null;
    }

    const levelTotal = getLayoutFacilities(layoutData)
      .filter((facility) => facility.facilityType === facilityType)
      .reduce(
        (total, facility) => total + Number(facility.stationLevel || 0),
        0,
      );
    return levelTotal * multiplier;
  }

  const bonusPercent = Number(effect?.bonusPercent);
  return Number.isFinite(bonusPercent) ? bonusPercent : null;
}

export function getRiicLayer3RuleConditionChecks({
  ownedOperators,
  layoutData,
  staffingData,
}) {
  const rosterById = getRosterById(ownedOperators);

  return (RIIC_LAYER3_RULES.rules || []).map((rule, index) => {
    const conditions = inspectConditions(
      rule?.conditions,
      rosterById,
      layoutData,
      staffingData,
    );

    return {
      id: String(rule?.id || `rule-${index + 1}`),
      matched: conditions.matched,
      operatorConditions: conditions.operatorConditions,
      facilityConditions: conditions.facilityConditions,
      facilityComparison: conditions.facilityComparison,
      effects: normalizeRuleEffects(rule?.effects),
    };
  });
}

/**
 * Resolves auxiliary-room placements activated by an operator who was actually
 * selected for a room. This intentionally does not create a fallback pool or
 * fill unrelated auxiliary-room slots.
 */
export function getRiicLayer3SupportRoomPlacements({
  roomAssignments,
  ownedOperators,
  claimedOperatorIds,
  layoutData,
  staffingData,
  idleFillOperators = [],
  roomCapacityByType = {},
}) {
  const rosterById = getRosterById(ownedOperators);
  const assignedOperatorIdsByRoomType = getAssignedOperatorIdsByRoomType(
    roomAssignments,
  );
  const claimedIds = new Set(
    [...(claimedOperatorIds || [])]
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean),
  );
  const placementsByRoomType = new Map();
  const unclaimedFillRequestsByRoomType = new Map();

  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (
      !matchesConditions(
        rule?.conditions,
        rosterById,
        layoutData,
        staffingData,
      )
    ) {
      continue;
    }

    const activationRoomType = String(rule?.activation?.roomType || "").trim();
    const activationOperatorId = resolveRuleOperatorId(rule?.activation);
    if (
      !activationRoomType ||
      !activationOperatorId ||
      !assignedOperatorIdsByRoomType
        .get(activationRoomType)
        ?.has(activationOperatorId)
    ) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      const roomType = String(effect?.roomType || "").trim();
      const operatorId = resolveRuleOperatorId(effect);
      const priority = Number(effect?.roomPriority);
      if (
        roomType &&
        effect?.fillUnclaimedOperators === true &&
        Number.isFinite(priority)
      ) {
        const current = unclaimedFillRequestsByRoomType.get(roomType);
        unclaimedFillRequestsByRoomType.set(roomType, {
          sourceRuleId: String(rule?.id || "").trim(),
          priority: Math.max(Number(current?.priority || -Infinity), priority),
          roomOrder:
            String(effect?.roomOrder || "").trim() === "last" ? "last" : "",
        });
      }
      if (
        !roomType ||
        !operatorId ||
        !Number.isFinite(priority) ||
        claimedIds.has(operatorId)
      ) {
        continue;
      }

      const placementsByOperatorId = placementsByRoomType.get(roomType) || new Map();
      const current = placementsByOperatorId.get(operatorId);
      placementsByOperatorId.set(operatorId, {
        charId: operatorId,
        name: String(effect?.operatorName || "").trim(),
        sourceRuleId: String(rule?.id || "").trim(),
        priority: Math.max(Number(current?.priority || -Infinity), priority),
        roomOrder:
          String(effect?.roomOrder || "").trim() === "last" ? "last" : "",
      });
      placementsByRoomType.set(roomType, placementsByOperatorId);
    }
  }

  for (const [roomType, request] of unclaimedFillRequestsByRoomType) {
    const capacity = Math.max(
      0,
      Math.trunc(Number(roomCapacityByType?.[roomType]) || 0),
    );
    if (capacity === 0) {
      continue;
    }

    const placementsByOperatorId = placementsByRoomType.get(roomType) || new Map();
    const selectedOperatorIds = new Set([
      ...claimedIds,
      ...placementsByOperatorId.keys(),
    ]);

    for (const operator of idleFillOperators || []) {
      if (placementsByOperatorId.size >= capacity) {
        break;
      }

      const charId = String(operator?.charId || "").trim();
      if (!charId || selectedOperatorIds.has(charId)) {
        continue;
      }

      placementsByOperatorId.set(charId, {
        charId,
        name: String(operator?.name || charId).trim() || charId,
        sourceRuleId: request.sourceRuleId,
        priority: request.priority,
        roomOrder: request.roomOrder,
      });
      selectedOperatorIds.add(charId);
    }

    if (placementsByOperatorId.size > 0) {
      placementsByRoomType.set(roomType, placementsByOperatorId);
    }
  }

  return Object.fromEntries(
    [...placementsByRoomType.entries()].map(([roomType, placementsByOperatorId]) => [
      roomType,
      [...placementsByOperatorId.values()].sort(
        (left, right) =>
          Number(right.priority || 0) - Number(left.priority || 0) ||
          String(left.name || left.charId).localeCompare(
            String(right.name || right.charId),
            "zh-CN",
          ),
      ),
    ]),
  );
}

export function getRiicLayer3ControlCenterEffects({
  operatorId,
  ownedOperators,
  layoutData,
  staffingData,
}) {
  const normalizedOperatorId = String(operatorId || "").trim();
  const rosterById = getRosterById(ownedOperators);
  if (!normalizedOperatorId || !rosterById.has(normalizedOperatorId)) {
    return [];
  }

  const effectsByKey = new Map();
  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (
      !matchesConditions(
        rule?.conditions,
        rosterById,
        layoutData,
        staffingData,
      )
    ) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      if (resolveRuleOperatorId(effect) !== normalizedOperatorId) {
        continue;
      }

      for (const controlCenterEffect of effect?.controlCenterEffects || []) {
        const target = controlCenterEffect?.target || {};
        const key = [
          String(target.scope || "").trim(),
          String(target.roomType || "").trim(),
          String(target.product || "").trim(),
          String(controlCenterEffect?.metric || "").trim(),
          Number(controlCenterEffect?.bonusPercent),
        ].join(":");
        effectsByKey.set(key, controlCenterEffect);
      }
    }
  }

  return [...effectsByKey.values()];
}

export function getRiicLayer3OperatorLocalBonus({
  operatorId,
  ownedOperators,
  scope,
  layoutData,
  staffingData,
  excludeFacilityCountBonuses = false,
}) {
  const normalizedOperatorId = String(operatorId || "").trim();
  const normalizedScope = normalizeScope(scope);
  const rosterById = getRosterById(ownedOperators);
  if (!normalizedOperatorId || !normalizedScope || !rosterById.has(normalizedOperatorId)) {
    return 0;
  }

  const bonusesByEffect = new Map();
  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (
      !matchesConditions(
        rule?.conditions,
        rosterById,
        layoutData,
        staffingData,
      )
    ) {
      continue;
    }
    if (
      excludeFacilityCountBonuses &&
      hasFacilityCountCondition(rule?.conditions)
    ) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      const bonusPercent = resolveEffectBonusPercent(effect, layoutData);
      const effectProduct = String(effect?.product || "").trim();
      if (
        bonusPercent === null ||
        resolveRuleOperatorId(effect) !== normalizedOperatorId ||
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

export function getRiicLayer3CandidateEquivalentByProduct({
  candidate,
  ownedOperators,
  scope,
  layoutData,
  staffingData,
}) {
  const normalizedScope = normalizeScope(scope);
  const candidateName = String(candidate?.name || "").trim();
  const rosterById = getRosterById(ownedOperators);
  if (!normalizedScope || !candidateName) {
    return {};
  }

  const equivalentByProduct = {};
  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (
      !matchesConditions(
        rule?.conditions,
        rosterById,
        layoutData,
        staffingData,
      )
    ) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      if (
        String(effect?.candidateName || "").trim() !== candidateName ||
        String(effect?.roomType || "").trim() !== normalizedScope.roomType
      ) {
        continue;
      }

      const effectProduct = String(effect?.product || "").trim();
      const effectStationLevel = toNonNegativeInteger(effect?.stationLevel);
      if (
        (effectProduct && effectProduct !== normalizedScope.product) ||
        (effectStationLevel !== null &&
          effectStationLevel !== normalizedScope.stationLevel)
      ) {
        continue;
      }

      for (const [product, value] of Object.entries(
        effect?.setEquivalentByProduct || {},
      )) {
        const normalizedProduct = String(product || "").trim();
        const normalizedValue = Number(value);
        if (normalizedProduct && Number.isFinite(normalizedValue)) {
          equivalentByProduct[normalizedProduct] = normalizedValue;
        }
      }
    }
  }

  return equivalentByProduct;
}

export function getRiicLayer3CandidateLocalBonus({
  candidate,
  ownedOperators,
  scope,
  layoutData,
  staffingData,
}) {
  const normalizedScope = normalizeScope(scope);
  const candidateName = String(candidate?.name || "").trim();
  const rosterById = getRosterById(ownedOperators);
  if (!normalizedScope || !candidateName) {
    return 0;
  }

  let totalBonusPercent = 0;
  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (
      !matchesConditions(
        rule?.conditions,
        rosterById,
        layoutData,
        staffingData,
      )
    ) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      const bonusPercent = resolveEffectBonusPercent(effect, layoutData);
      if (
        bonusPercent === null ||
        String(effect?.candidateName || "").trim() !== candidateName ||
        String(effect?.roomType || "").trim() !== normalizedScope.roomType
      ) {
        continue;
      }

      const effectProduct = String(effect?.product || "").trim();
      const effectStationLevel = toNonNegativeInteger(effect?.stationLevel);
      if (
        (effectProduct && effectProduct !== normalizedScope.product) ||
        (effectStationLevel !== null &&
          effectStationLevel !== normalizedScope.stationLevel)
      ) {
        continue;
      }

      totalBonusPercent += bonusPercent;
    }
  }

  return totalBonusPercent;
}

export function getRiicLayer3CandidateOperatorBonusExclusions({
  candidate,
  ownedOperators,
  scope,
  layoutData,
  staffingData,
}) {
  const normalizedScope = normalizeScope(scope);
  const candidateName = String(candidate?.name || "").trim();
  const rosterById = getRosterById(ownedOperators);
  if (!normalizedScope || !candidateName) {
    return [];
  }

  const excludedOperatorIds = new Set();
  for (const rule of RIIC_LAYER3_RULES.rules || []) {
    if (
      !matchesConditions(
        rule?.conditions,
        rosterById,
        layoutData,
        staffingData,
      )
    ) {
      continue;
    }

    for (const effect of rule?.effects || []) {
      const effectProduct = String(effect?.product || "").trim();
      const effectStationLevel = toNonNegativeInteger(effect?.stationLevel);
      if (
        String(effect?.candidateName || "").trim() !== candidateName ||
        String(effect?.roomType || "").trim() !== normalizedScope.roomType ||
        (effectProduct && effectProduct !== normalizedScope.product) ||
        (effectStationLevel !== null &&
          effectStationLevel !== normalizedScope.stationLevel)
      ) {
        continue;
      }

      for (const operatorName of effect?.suppressOperatorBonusFor || []) {
        const operatorId = resolveRuleOperatorId({ operatorName });
        if (operatorId) {
          excludedOperatorIds.add(operatorId);
        }
      }
    }
  }

  return [...excludedOperatorIds];
}

export function getRiicLayer3CandidateRoomPriority({
  candidate,
  operatorIds,
  ownedOperators,
  scope,
  layoutData,
  staffingData,
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
    if (
      !matchesConditions(
        rule?.conditions,
        rosterById,
        layoutData,
        staffingData,
      )
    ) {
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

      const effectOperatorId = resolveRuleOperatorId(effect);
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
