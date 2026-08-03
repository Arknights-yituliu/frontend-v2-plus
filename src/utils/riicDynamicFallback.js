function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function normalizePercent(value) {
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : 0;
}

function compareFallbackOperators(left, right) {
  const leftPriority = left?.publicSkill ? 1 : 0;
  const rightPriority = right?.publicSkill ? 1 : 0;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const percentDifference =
    normalizePercent(right?.percent) - normalizePercent(left?.percent);
  if (percentDifference !== 0) {
    return percentDifference;
  }

  return (
    String(left?.name || left?.charId || "").localeCompare(
      String(right?.name || right?.charId || ""),
      "zh-CN",
    ) ||
    String(left?.charId || "").localeCompare(String(right?.charId || ""), "en")
  );
}

function getCandidateFallbackOperators(candidate) {
  return (candidate?.fallback?.candidateOperators ||
    candidate?.fallback?.operators ||
    [])
    .map((operator) => ({
      charId: normalizeOperatorId(operator?.charId),
      name: String(operator?.name || operator?.charId || "").trim(),
      percent: normalizePercent(operator?.percent),
      publicSkill: Boolean(operator?.publicSkill),
      upgradeRequirement: operator?.upgradeRequirement || null,
    }))
    .filter((operator) => operator.charId && operator.name)
    .sort(compareFallbackOperators);
}

function getFallbackBaseline(candidate) {
  return normalizePercent(candidate?.fallback?.percent);
}

function getFallbackSlots(selectedEntries) {
  return (selectedEntries || []).flatMap((entry) => {
    const count = Math.max(0, Number(entry?.candidate?.fallback?.count || 0));
    return Array.from({ length: count }, (_, index) => ({
      key: `${entry.selectionKey || entry.candidate?.key || "candidate"}:${index}`,
      selectionKey: entry.selectionKey || entry.candidate?.key || "",
      candidate: entry.candidate,
    }));
  });
}

function mergeOperatorById(operatorById, operator) {
  const current = operatorById.get(operator.charId);
  if (
    !current ||
    compareFallbackOperators(operator, current) < 0 ||
    normalizePercent(operator.percent) > normalizePercent(current.percent)
  ) {
    operatorById.set(operator.charId, operator);
  }
}

/**
 * Builds the facility-local greedy fallback assignment. The caller owns the
 * order in which facilities claim operators; this helper only respects the
 * already occupied ids it receives.
 */
export function createRiicRoomGroupFallbackPlan({
  selectedEntries = [],
  occupiedOperatorIds = new Set(),
}) {
  const occupied = new Set(
    [...(occupiedOperatorIds || [])]
      .map(normalizeOperatorId)
      .filter(Boolean),
  );
  const slots = getFallbackSlots(selectedEntries);
  const selectedIds = new Set();
  const assignmentsBySelectionKey = new Map();
  const allOperatorsById = new Map();
  const highOperatorsById = new Map();
  const basicOperatorsById = new Map();

  for (const entry of selectedEntries) {
    for (const operator of getCandidateFallbackOperators(entry.candidate)) {
      mergeOperatorById(allOperatorsById, operator);
      if (operator.percent >= getFallbackBaseline(entry.candidate)) {
        mergeOperatorById(highOperatorsById, operator);
      } else {
        mergeOperatorById(basicOperatorsById, operator);
      }
    }
  }

  const slotOptions = slots.map((slot) => {
    const operators = getCandidateFallbackOperators(slot.candidate);
    const baseline = getFallbackBaseline(slot.candidate);
    const highOperators = operators.filter(
      (operator) => operator.percent >= baseline,
    );
    const basicOperators = operators.filter(
      (operator) => operator.percent < baseline,
    );

    return {
      ...slot,
      highOperators,
      basicOperators,
      allOperators: operators,
    };
  });

  // Resolve constrained slots first. Within a slot, high-efficiency entries
  // win, while public/shared skills are deliberately placed later.
  slotOptions.sort(
    (left, right) =>
      left.highOperators.length - right.highOperators.length ||
      left.allOperators.length - right.allOperators.length ||
      left.key.localeCompare(right.key, "en"),
  );

  for (const slot of slotOptions) {
    const options = [
      ...slot.highOperators.sort(compareFallbackOperators),
      ...slot.basicOperators.sort(compareFallbackOperators),
    ];
    const selected = options.find(
      (operator) =>
        !occupied.has(operator.charId) && !selectedIds.has(operator.charId),
    );

    if (!selected) {
      continue;
    }

    selectedIds.add(selected.charId);
    if (!assignmentsBySelectionKey.has(slot.selectionKey)) {
      assignmentsBySelectionKey.set(slot.selectionKey, []);
    }
    assignmentsBySelectionKey.get(slot.selectionKey).push(selected);
  }

  const sortForDisplay = (left, right) =>
    compareFallbackOperators(left, right) ||
    Number(occupied.has(left.charId)) - Number(occupied.has(right.charId));
  const selectedBasicOperators = [...basicOperatorsById.values()]
    .filter((operator) => selectedIds.has(operator.charId))
    .sort(sortForDisplay);

  return {
    status: selectedIds.size === slots.length ? "ready" : "insufficient",
    pendingCount: slots.length,
    selectedCount: selectedIds.size,
    selectedOperatorIds: [...selectedIds],
    assignmentsBySelectionKey: Object.fromEntries(
      [...assignmentsBySelectionKey.entries()].map(([key, operators]) => [
        key,
        operators,
      ]),
    ),
    operators: [...allOperatorsById.values()].sort(sortForDisplay),
    highEfficiencyOperators: [...highOperatorsById.values()].sort(sortForDisplay),
    basicOperators: [...basicOperatorsById.values()]
      .filter((operator) => !highOperatorsById.has(operator.charId))
      .sort(sortForDisplay),
    selectedBasicOperators,
  };
}

export function getRiicFallbackPreviewOperators(candidate, count) {
  const normalizedCount = Math.max(0, Number(count || 0));
  return getCandidateFallbackOperators(candidate).slice(0, normalizedCount);
}

export function getRiicFallbackPreviewTotalPercent(candidate) {
  return getRiicFallbackPreviewOperators(
    candidate,
    candidate?.fallback?.count,
  ).reduce((total, operator) => total + operator.percent, 0);
}
