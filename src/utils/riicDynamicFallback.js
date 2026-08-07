function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function normalizePercent(value) {
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : 0;
}

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
}

function compareFallbackOperators(left, right) {
  const fillScoreDifference =
    normalizePercent(right?.percent) +
      normalizePercent(right?.fillPriority) -
      (normalizePercent(left?.percent) +
        normalizePercent(left?.fillPriority));
  if (fillScoreDifference !== 0) {
    return fillScoreDifference;
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
      basePercent: normalizePercent(
        operator?.basePercent ?? operator?.percent,
      ),
      layer3Bonus: normalizePercent(operator?.layer3Bonus),
      fillPriority: normalizePercent(operator?.fillPriority),
      publicSkill: Boolean(operator?.publicSkill),
      upgradeRequirement: operator?.upgradeRequirement || null,
    }))
    .filter((operator) => operator.charId && operator.name)
    .sort(compareFallbackOperators);
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
    compareFallbackOperators(operator, current) < 0
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
  preferredOperatorIds = [],
  allowAutomaticFill = true,
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

  for (const entry of selectedEntries) {
    for (const operator of getCandidateFallbackOperators(entry.candidate)) {
      mergeOperatorById(allOperatorsById, operator);
    }
  }

  const slotOptions = slots.map((slot) => {
    return {
      ...slot,
      operators: getCandidateFallbackOperators(slot.candidate),
    };
  });

  const assignedSlotKeys = new Set();
  const selectOperatorForSlot = (slot, operator) => {
    selectedIds.add(operator.charId);
    assignedSlotKeys.add(slot.key);
    if (!assignmentsBySelectionKey.has(slot.selectionKey)) {
      assignmentsBySelectionKey.set(slot.selectionKey, []);
    }
    assignmentsBySelectionKey.get(slot.selectionKey).push(operator);
  };

  for (const preferredOperatorId of preferredOperatorIds || []) {
    const charId = normalizeOperatorId(preferredOperatorId);
    if (
      !allOperatorsById.has(charId) ||
      occupied.has(charId) ||
      selectedIds.has(charId)
    ) {
      continue;
    }

    const slot = slotOptions.find(
      (item) =>
        !assignedSlotKeys.has(item.key) &&
        item.operators.some(
          (candidateOperator) => candidateOperator.charId === charId,
        ),
    );
    if (slot) {
      const slotOperator = slot.operators.find(
        (candidateOperator) => candidateOperator.charId === charId,
      );
      selectOperatorForSlot(slot, slotOperator);
    }
  }

  if (allowAutomaticFill) {
    // Resolve constrained slots first. Within a slot, fill score wins.
    const automaticSlotOptions = [...slotOptions].sort(
      (left, right) =>
        left.operators.length - right.operators.length ||
        left.key.localeCompare(right.key, "en"),
    );

    for (const slot of automaticSlotOptions) {
      if (assignedSlotKeys.has(slot.key)) {
        continue;
      }

      const selected = slot.operators.find(
        (operator) =>
          !occupied.has(operator.charId) && !selectedIds.has(operator.charId),
      );

      if (selected) {
        selectOperatorForSlot(slot, selected);
      }
    }
  }

  const sortForDisplay = (left, right) =>
    compareFallbackOperators(left, right) ||
    Number(occupied.has(left.charId)) - Number(occupied.has(right.charId));

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
  };
}

export function createRiicFallbackEstimate({
  rankedOperators = [],
  slotCount = 0,
  fallbackCount = 0,
  defaultPercent = 0,
} = {}) {
  const normalizedSlotCount = normalizeCount(slotCount);
  const normalizedFallbackCount = normalizeCount(fallbackCount);
  const selectedOperators = (Array.isArray(rankedOperators)
    ? rankedOperators
    : []
  ).slice(
    normalizedSlotCount,
    normalizedSlotCount + normalizedFallbackCount,
  );
  const missingCount = Math.max(
    0,
    normalizedFallbackCount - selectedOperators.length,
  );
  const totalPercent =
    selectedOperators.reduce(
      (total, operator) => total + normalizePercent(operator?.percent),
      0,
    ) +
    missingCount * normalizePercent(defaultPercent);

  return {
    selectedOperators,
    missingCount,
    totalPercent,
  };
}

export function getRiicFallbackPreviewOperators(candidate, count) {
  return createRiicFallbackEstimate({
    rankedOperators: getCandidateFallbackOperators(candidate),
    slotCount: candidate?.candidateScope?.slotCount,
    fallbackCount: count,
    defaultPercent: candidate?.fallback?.percent,
  }).selectedOperators;
}

export function getRiicFallbackPreviewTotalPercent(candidate) {
  return createRiicFallbackEstimate({
    rankedOperators: getCandidateFallbackOperators(candidate),
    slotCount: candidate?.candidateScope?.slotCount,
    fallbackCount: candidate?.fallback?.count,
    defaultPercent: candidate?.fallback?.percent,
  }).totalPercent;
}
