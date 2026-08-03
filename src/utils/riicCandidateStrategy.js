const CALCULATION_STATUS_RANK = Object.freeze({
  calculated: 0,
  estimated: 1,
  estimatePending: 2,
});

const STRATEGY_KIND_RANK = Object.freeze({
  roomTemplate: 0,
  coreTemplate: 1,
  generic: 2,
  fallback: 3,
});

function normalizeCalculationStatus(value) {
  return Object.hasOwn(CALCULATION_STATUS_RANK, value)
    ? value
    : "calculated";
}

function normalizeStrategy(source) {
  const familyId = String(source?.familyId || "").trim();
  const kind = Object.hasOwn(STRATEGY_KIND_RANK, source?.kind)
    ? source.kind
    : "generic";

  if (!familyId) {
    return null;
  }

  return {
    familyId,
    kind,
    displayName: String(source?.displayName || familyId).trim() || familyId,
    calculationStatus: normalizeCalculationStatus(
      source?.calculationStatus,
    ),
  };
}

function compareStrategies(left, right) {
  const kindDifference =
    STRATEGY_KIND_RANK[left.kind] - STRATEGY_KIND_RANK[right.kind];
  if (kindDifference !== 0) {
    return kindDifference;
  }

  const calculationDifference =
    getRiicCalculationStatusRank(left.calculationStatus) -
    getRiicCalculationStatusRank(right.calculationStatus);
  if (calculationDifference !== 0) {
    return calculationDifference;
  }

  return left.familyId.localeCompare(right.familyId, "en");
}

export function createRiicTemplateStrategy(template) {
  const templateId = String(template?.templateId || "").trim();
  if (!templateId) {
    throw new Error("A template id is required for a RIIC strategy");
  }

  return {
    familyId: `template:${templateId}`,
    kind:
      template?.candidateTier === "room" ? "roomTemplate" : "coreTemplate",
    displayName: String(template?.templateName || templateId).trim() || templateId,
    calculationStatus: normalizeCalculationStatus(
      template?.estimateStatus,
    ),
  };
}

export function createRiicGenericStrategy({ roomType, product }) {
  const normalizedRoomType = String(roomType || "").trim() || "room";
  const normalizedProduct = String(product || "").trim() || "all";

  return {
    familyId: `generic:${normalizedRoomType}:${normalizedProduct}`,
    kind: "generic",
    displayName: "泛用候选",
    calculationStatus: "calculated",
  };
}

export function createRiicFallbackStrategy({ roomType, product }) {
  const normalizedRoomType = String(roomType || "").trim() || "room";
  const normalizedProduct = String(product || "").trim() || "all";

  return {
    familyId: `fallback:${normalizedRoomType}:${normalizedProduct}`,
    kind: "fallback",
    displayName: "基础补位",
    calculationStatus: "calculated",
  };
}

export function getRiicCandidateStrategies(candidate) {
  const directStrategies =
    candidate?.strategySources || candidate?.sources?.strategies || [];
  const normalizedStrategies = directStrategies
    .map(normalizeStrategy)
    .filter(Boolean);

  if (normalizedStrategies.length > 0) {
    return [
      ...new Map(
        normalizedStrategies.map((strategy) => [
          strategy.familyId,
          strategy,
        ]),
      ).values(),
    ].sort((left, right) => left.familyId.localeCompare(right.familyId, "en"));
  }

  if (
    Array.isArray(candidate?.operatorIds) &&
    candidate.operatorIds.length === 0 &&
    Number(candidate?.fallback?.count || 0) > 0
  ) {
    return [
      createRiicFallbackStrategy({
        roomType: candidate?.roomType,
        product: candidate?.product,
      }),
    ];
  }

  return [
    createRiicGenericStrategy({
      roomType: candidate?.roomType,
      product: candidate?.product,
    }),
  ];
}

export function getRiicStrategySignature(strategies) {
  return getRiicCandidateStrategies({ strategySources: strategies })
    .map((strategy) => strategy.familyId)
    .join("|");
}

export function getRiicStrategyQuota(strategies) {
  const normalizedStrategies = getRiicCandidateStrategies({
    strategySources: strategies,
  });
  if (
    normalizedStrategies.some(
      (strategy) => strategy.kind === "roomTemplate",
    )
  ) {
    return 1;
  }
  if (
    normalizedStrategies.some(
      (strategy) => strategy.kind === "coreTemplate",
    )
  ) {
    return 2;
  }
  if (
    normalizedStrategies.some((strategy) => strategy.kind === "fallback")
  ) {
    return 1;
  }
  return 2;
}

export function getRiicCalculationStatusRank(value) {
  return CALCULATION_STATUS_RANK[normalizeCalculationStatus(value)];
}

export function mergeRiicCalculationStatuses(statuses) {
  return (statuses || []).reduce((worstStatus, status) =>
    getRiicCalculationStatusRank(status) >
    getRiicCalculationStatusRank(worstStatus)
      ? normalizeCalculationStatus(status)
      : worstStatus,
  "calculated");
}

export function selectRiicCandidatesByStrategy({
  items,
  limit,
  compare,
  getStrategies = getRiicCandidateStrategies,
  quotaMultiplier = 1,
}) {
  const normalizedLimit = Number(limit);
  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1) {
    throw new Error("A positive strategy candidate limit is required");
  }
  const normalizedQuotaMultiplier = Number(quotaMultiplier);
  if (
    !Number.isInteger(normalizedQuotaMultiplier) ||
    normalizedQuotaMultiplier < 1
  ) {
    throw new Error("A positive strategy quota multiplier is required");
  }
  if (typeof compare !== "function") {
    throw new Error("A strategy candidate comparator is required");
  }

  const itemsByStrategyFamily = new Map();
  const normalizedItems = [];
  for (const item of items || []) {
    if (!item?.key) {
      continue;
    }

    const strategies = getStrategies(item);
    const normalizedStrategies = getRiicCandidateStrategies({
      strategySources: strategies,
    });
    const normalizedItem = {
      item,
      strategies: normalizedStrategies,
    };
    normalizedItems.push(normalizedItem);

    for (const strategy of normalizedStrategies) {
      if (!itemsByStrategyFamily.has(strategy.familyId)) {
        itemsByStrategyFamily.set(strategy.familyId, {
          strategy,
          items: [],
        });
      }
      itemsByStrategyFamily.get(strategy.familyId).items.push(normalizedItem);
    }
  }

  const strategies = [...itemsByStrategyFamily.values()]
    .map((entry) => ({
      ...entry,
      items: entry.items.sort((left, right) => compare(left.item, right.item)),
    }))
    .sort((left, right) => {
      const strategyDifference = compareStrategies(
        left.strategy,
        right.strategy,
      );
      if (strategyDifference !== 0) {
        return strategyDifference;
      }

      return compare(left.items[0].item, right.items[0].item);
    });

  const selected = [];
  const selectedKeys = new Set();
  const selectedFamilyCounts = new Map();
  const canAddItem = (item) =>
    item.strategies.every((strategy) => {
      const count = selectedFamilyCounts.get(strategy.familyId) || 0;
      return (
        count <
        getRiicStrategyQuota([strategy]) * normalizedQuotaMultiplier
      );
    });
  const addItem = (item) => {
    if (
      !item?.item?.key ||
      selectedKeys.has(item.item.key) ||
      !canAddItem(item)
    ) {
      return false;
    }

    selectedKeys.add(item.item.key);
    selected.push(item.item);
    for (const strategy of item.strategies) {
      selectedFamilyCounts.set(
        strategy.familyId,
        (selectedFamilyCounts.get(strategy.familyId) || 0) + 1,
      );
    }
    return true;
  };

  // Seed every strategy family once before adding any extra variants. This
  // makes a hard-combo family a search-space boundary instead of a sort hint.
  for (const strategy of strategies) {
    if (selected.length >= normalizedLimit) {
      break;
    }
    for (const item of strategy.items) {
      if (addItem(item)) {
        break;
      }
    }
  }

  // Then add only the bounded number of variants each family permits.
  for (const item of normalizedItems.sort((left, right) =>
    compare(left.item, right.item),
  )) {
    if (selected.length >= normalizedLimit) {
      break;
    }
    addItem(item);
  }

  return selected.sort(compare);
}
