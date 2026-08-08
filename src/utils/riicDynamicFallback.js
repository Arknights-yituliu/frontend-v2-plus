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
  const leftEffectivePercent = normalizePercent(
    left?.effectivePercent ?? left?.percent,
  );
  const rightEffectivePercent = normalizePercent(
    right?.effectivePercent ?? right?.percent,
  );
  const fillScoreDifference =
    rightEffectivePercent +
      normalizePercent(right?.fillPriority) -
      (leftEffectivePercent +
        normalizePercent(left?.fillPriority));
  if (fillScoreDifference !== 0) {
    return fillScoreDifference;
  }

  const percentDifference = rightEffectivePercent - leftEffectivePercent;
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
      effectivePercent: normalizePercent(
        operator?.effectivePercent ?? operator?.percent,
      ),
      basePercent: normalizePercent(
        operator?.basePercent ?? operator?.percent,
      ),
      layer3Bonus: normalizePercent(operator?.layer3Bonus),
      controlCenterOperatorBonusPercent: normalizePercent(
        operator?.controlCenterOperatorBonusPercent,
      ),
      fillPriority: normalizePercent(operator?.fillPriority),
      tags: [
        ...new Set(
          (operator?.tags || [])
            .map((tag) => String(tag || "").trim())
            .filter(Boolean),
        ),
      ],
      publicSkill: Boolean(operator?.publicSkill),
      upgradeRequirement: operator?.upgradeRequirement || null,
    }))
    .filter((operator) => operator.charId && operator.name)
    .sort(compareFallbackOperators);
}

export function applyRiicFallbackOperatorControlCenterBonus(
  fallbackOperators,
  operatorBonusById,
) {
  return (fallbackOperators || [])
    .map((operator) => {
      const charId = normalizeOperatorId(operator?.charId);
      const controlCenterOperatorBonusPercent =
        normalizePercent(operator?.controlCenterOperatorBonusPercent) +
        normalizePercent(operatorBonusById?.[charId]);
      const percent = normalizePercent(operator?.percent);

      return {
        ...operator,
        controlCenterOperatorBonusPercent,
        effectivePercent: percent + controlCenterOperatorBonusPercent,
      };
    })
    .sort(compareFallbackOperators);
}

function getFallbackSlots(selectedEntries) {
  return (selectedEntries || []).flatMap((entry) => {
    const selectionKey = entry.selectionKey || entry.candidate?.key || "";
    const candidateKey = entry.candidate?.key || "candidate";
    const taggedMemberSlots = (
      entry?.candidate?.fallback?.taggedMemberRequirements || []
    ).map((requirement, index) => ({
      key: `${selectionKey || candidateKey}:tagged-member:${index}`,
      selectionKey,
      candidate: entry.candidate,
      kind: "taggedMember",
      requiredTags: [
        ...new Set(
          (requirement?.tags || [])
            .map((tag) => String(tag || "").trim())
            .filter(Boolean),
        ),
      ],
    }));
    const count = Math.max(0, Number(entry?.candidate?.fallback?.count || 0));
    const fallbackSlots = Array.from({ length: count }, (_, index) => ({
      key: `${selectionKey || candidateKey}:fallback:${index}`,
      selectionKey,
      candidate: entry.candidate,
      kind: "fallback",
      requiredTags: [],
    }));
    return [...taggedMemberSlots, ...fallbackSlots];
  });
}

function getFallbackSlotSection(slot) {
  if (slot?.kind === "fallback") {
    return {
      key: "ordinary",
      title: "普通补位",
    };
  }

  const tags = new Set(slot?.requiredTags || []);
  if (tags.has("tailor-alpha")) {
    return {
      key: "required:tailor-alpha",
      title: "裁缝 α",
    };
  }
  if (tags.has("tailor-beta")) {
    return {
      key: "required:tailor-beta",
      title: "裁缝 β",
    };
  }
  if (tags.has("automation")) {
    return {
      key: "required:automation",
      title: "自动化",
    };
  }

  return {
    key: `required:${[...tags].sort().join("|") || "unknown"}`,
    title: "组合指定补位",
  };
}

function operatorMatchesRequiredTags(operator, requiredTags) {
  const operatorTags = new Set(operator?.tags || []);
  if (!requiredTags?.length) {
    return !operatorTags.has("tailor") && !operatorTags.has("automation");
  }

  return (requiredTags || []).every((tag) => operatorTags.has(tag));
}

function normalizePreferredOperatorIdBySlotKey(value) {
  return new Map(
    Object.entries(value || {}).flatMap(([slotKey, operatorId]) => {
      const normalizedSlotKey = String(slotKey || "").trim();
      const normalizedOperatorId = normalizeOperatorId(operatorId);
      return normalizedSlotKey && normalizedOperatorId
        ? [[normalizedSlotKey, normalizedOperatorId]]
        : [];
    }),
  );
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
  preferredOperatorIdBySlotKey = {},
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
  const assignedOperatorBySlotKey = new Map();
  const allOperatorsById = new Map();

  const slotOptions = slots.map((slot) => {
    const operators = getCandidateFallbackOperators(slot.candidate).filter(
      (operator) => operatorMatchesRequiredTags(operator, slot.requiredTags),
    );
    for (const operator of operators) {
      mergeOperatorById(allOperatorsById, operator);
    }

    return {
      ...slot,
      operators,
    };
  });

  const assignedSlotKeys = new Set();
  const selectOperatorForSlot = (slot, operator) => {
    selectedIds.add(operator.charId);
    assignedSlotKeys.add(slot.key);
    const assignedOperator = {
      ...operator,
      taggedMember: slot.kind === "taggedMember",
    };
    assignedOperatorBySlotKey.set(slot.key, assignedOperator);
    if (!assignmentsBySelectionKey.has(slot.selectionKey)) {
      assignmentsBySelectionKey.set(slot.selectionKey, []);
    }
    assignmentsBySelectionKey.get(slot.selectionKey).push(assignedOperator);
  };

  const preferredBySlotKey = normalizePreferredOperatorIdBySlotKey(
    preferredOperatorIdBySlotKey,
  );
  for (const slot of slotOptions) {
    const charId = preferredBySlotKey.get(slot.key);
    if (!charId || occupied.has(charId) || selectedIds.has(charId)) {
      continue;
    }

    const operator = slot.operators.find(
      (candidateOperator) => candidateOperator.charId === charId,
    );
    if (operator) {
      selectOperatorForSlot(slot, operator);
    }
  }

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

  const resolvedSlots = slotOptions.map((slot) => {
    const section = getFallbackSlotSection(slot);
    return {
      key: slot.key,
      selectionKey: slot.selectionKey,
      kind: slot.kind,
      requiredTags: slot.requiredTags,
      sectionKey: section.key,
      sectionTitle: section.title,
      operators: slot.operators,
      assignedOperatorId:
        assignedOperatorBySlotKey.get(slot.key)?.charId || "",
    };
  });

  return {
    status: selectedIds.size === slots.length ? "ready" : "insufficient",
    pendingCount: slots.length,
    selectedCount: selectedIds.size,
    selectedOperatorIds: [...selectedIds],
    operatorIdBySlotKey: Object.fromEntries(
      [...assignedOperatorBySlotKey.entries()].map(([slotKey, operator]) => [
        slotKey,
        operator.charId,
      ]),
    ),
    assignmentsBySelectionKey: Object.fromEntries(
      [...assignmentsBySelectionKey.entries()].map(([key, operators]) => [
        key,
        operators,
      ]),
    ),
    slots: resolvedSlots,
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
