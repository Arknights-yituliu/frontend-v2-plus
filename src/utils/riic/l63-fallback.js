import {
  canReuseRiicFiammettaTarget,
  getRiicFiammettaSelectionStateIndexes,
  normalizeRiicFiammettaRecovery,
} from "./l65-fiammetta-recovery.js";
import {
  applyRiicActiveRosterFallbackOperatorEffects,
} from "./l65-active-roster-effects.js";

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
  const leftIsIdleFill = Boolean(left?.idleFill);
  const rightIsIdleFill = Boolean(right?.idleFill);
  if (leftIsIdleFill !== rightIsIdleFill) {
    return Number(leftIsIdleFill) - Number(rightIsIdleFill);
  }

  if (leftIsIdleFill) {
    const idlePriorityDifference =
      normalizePercent(left?.idleFillPriority) -
      normalizePercent(right?.idleFillPriority);
    if (idlePriorityDifference !== 0) {
      return idlePriorityDifference;
    }
  }

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

function normalizeFallbackOperator(operator, { idleFill = false } = {}) {
  return {
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
    teammateManufacturePercent: normalizePercent(
      operator?.teammateManufacturePercent ??
        operator?.copyableManufacturePercent ??
        (normalizePercent(operator?.basePercent ?? operator?.percent) +
          normalizePercent(operator?.layer3Bonus)),
    ),
    controlCenterOperatorBonusPercent: normalizePercent(
      operator?.controlCenterOperatorBonusPercent,
    ),
    fillPriority: normalizePercent(operator?.fillPriority),
    idleFill: idleFill || Boolean(operator?.idleFill),
    idleFillTier: String(operator?.idleFillTier || "").trim(),
    idleFillPriority: normalizePercent(operator?.idleFillPriority),
    tags: [
      ...new Set(
        (operator?.tags || [])
          .map((tag) => String(tag || "").trim())
          .filter(Boolean),
      ),
    ],
    publicSkill: Boolean(operator?.publicSkill),
    upgradeRequirement: operator?.upgradeRequirement || null,
  };
}

function getCandidateFallbackOperators(
  candidate,
  {
    ownedOperators = [],
    activeOperatorIds = [],
  } = {},
) {
  const operatorsById = new Map();
  const addOperators = (operators, options) => {
    for (const sourceOperator of operators || []) {
      const operator = normalizeFallbackOperator(sourceOperator, options);
      if (!operator.charId || !operator.name) {
        continue;
      }

      const current = operatorsById.get(operator.charId);
      if (!current || compareFallbackOperators(operator, current) < 0) {
        operatorsById.set(operator.charId, operator);
      }
    }
  };

  addOperators(
    candidate?.fallback?.candidateOperators ||
      candidate?.fallback?.operators ||
      [],
  );
  addOperators(candidate?.fallback?.idleCandidateOperators || [], {
    idleFill: true,
  });

  return applyRiicActiveRosterFallbackOperatorEffects({
    candidate,
    fallbackOperators: [...operatorsById.values()],
    ownedOperators,
    activeOperatorIds,
  }).sort(compareFallbackOperators);
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

function createFallbackPlanVariant({
  slots,
  assignedOperatorBySlotKey,
  assignmentsBySelectionKey,
  score,
  fiammettaTargetSelectionKeys = [],
  fiammettaTargetStateIndexes = [],
}) {
  const selectedOperatorIds = [
    ...new Set(
      [...assignedOperatorBySlotKey.values()].map((operator) => operator.charId),
    ),
  ];

  return {
    status: "ready",
    pendingCount: slots.length,
    selectedCount: selectedOperatorIds.length,
    selectedOperatorIds,
    operatorIdBySlotKey: Object.fromEntries(
      [...assignedOperatorBySlotKey.entries()].map(([slotKey, operator]) => [
        slotKey,
        operator.charId,
      ]),
    ),
    assignmentsBySelectionKey: Object.fromEntries(
      [...assignmentsBySelectionKey.entries()].map(([key, operators]) => [
        key,
        [...operators],
      ]),
    ),
    score,
    fiammettaTargetSelectionKeys: [
      ...new Set(fiammettaTargetSelectionKeys),
    ],
    fiammettaTargetStateIndexes: [
      ...new Set(fiammettaTargetStateIndexes),
    ].sort((left, right) => left - right),
  };
}

function createFiammettaRecoverySelectionState({
  recovery,
  selectedStateIndexes = [],
} = {}) {
  const normalizedRecovery = normalizeRiicFiammettaRecovery(recovery);
  return {
    ...normalizedRecovery,
    usedStateIndexes: [
      ...new Set([
        ...normalizedRecovery.usedStateIndexes,
        ...selectedStateIndexes,
      ]),
    ].sort((left, right) => left - right),
  };
}

function isFiammettaTarget(recovery, operatorId) {
  return (
    recovery.enabled &&
    normalizeOperatorId(operatorId) === recovery.targetOperatorId
  );
}

function canSelectFallbackOperator({
  operator,
  slot,
  occupied,
  excluded,
  selectedOperatorIds,
  recovery,
  selectedFiammettaTargetStateIndexes,
}) {
  if (isFiammettaTarget(recovery, operator?.charId)) {
    return (
      !excluded.has(operator.charId) &&
      canReuseRiicFiammettaTarget({
        recovery,
        operatorId: operator.charId,
        selectionKey: slot.selectionKey,
        usedStateIndexes: [
          ...recovery.usedStateIndexes,
          ...selectedFiammettaTargetStateIndexes,
        ],
      })
    );
  }

  return (
    !occupied.has(operator.charId) &&
    !excluded.has(operator.charId) &&
    !selectedOperatorIds.has(operator.charId)
  );
}

function getFallbackPlanAssignmentSignature(plan) {
  return Object.entries(plan?.operatorIdBySlotKey || {})
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey, "en"))
    .map(([slotKey, operatorId]) => `${slotKey}=${operatorId}`)
    .join("|");
}

function createSeededFallbackPlanVariants({
  slots,
  slotOptions,
  occupied,
  excluded,
  fiammettaRecovery,
  maxPlanCount,
}) {
  return Array.from({ length: maxPlanCount }, (_, seedIndex) => {
    const selectedOperatorIds = new Set();
    const assignedOperatorBySlotKey = new Map();
    const assignmentsBySelectionKey = new Map();
    const fiammettaTargetStateIndexes = new Set();
    const fiammettaTargetSelectionKeys = new Set();
    let score = 0;

    for (const [slotIndex, slot] of slotOptions.entries()) {
      const operators = slot.operators || [];
      const startIndex =
        (seedIndex * slotOptions.length + slotIndex) % operators.length;
      let selectedOperator = null;

      for (let offset = 0; offset < operators.length; offset += 1) {
        const operator = operators[(startIndex + offset) % operators.length];
        if (
          canSelectFallbackOperator({
            operator,
            slot,
            occupied,
            excluded,
            selectedOperatorIds,
            recovery: fiammettaRecovery,
            selectedFiammettaTargetStateIndexes:
              fiammettaTargetStateIndexes,
          })
        ) {
          selectedOperator = operator;
          break;
        }
      }

      if (!selectedOperator) {
        return null;
      }

      const assignedOperator = {
        ...selectedOperator,
        taggedMember: slot.kind === "taggedMember",
      };
      selectedOperatorIds.add(selectedOperator.charId);
      if (isFiammettaTarget(fiammettaRecovery, selectedOperator.charId)) {
        fiammettaTargetSelectionKeys.add(slot.selectionKey);
        for (const stateIndex of getRiicFiammettaSelectionStateIndexes(
          fiammettaRecovery,
          slot.selectionKey,
        )) {
          fiammettaTargetStateIndexes.add(stateIndex);
        }
      }
      assignedOperatorBySlotKey.set(slot.key, assignedOperator);
      if (!assignmentsBySelectionKey.has(slot.selectionKey)) {
        assignmentsBySelectionKey.set(slot.selectionKey, []);
      }
      assignmentsBySelectionKey
        .get(slot.selectionKey)
        .push(assignedOperator);
      score +=
        normalizePercent(
          selectedOperator.effectivePercent ?? selectedOperator.percent,
        ) + normalizePercent(selectedOperator.fillPriority);
    }

    return createFallbackPlanVariant({
      slots,
      assignedOperatorBySlotKey,
      assignmentsBySelectionKey,
      score,
      fiammettaTargetSelectionKeys,
      fiammettaTargetStateIndexes,
    });
  }).filter(Boolean);
}

/**
 * Enumerates a small set of complete fallback assignments for automatic
 * scheduling. Special-tag slots are still resolved from their dedicated pool;
 * ordinary slots continue to exclude tailor and automation operators.
 */
export function createRiicRoomGroupFallbackPlanAlternatives({
  selectedEntries = [],
  occupiedOperatorIds = new Set(),
  excludedOperatorIds = new Set(),
  ownedOperators = [],
  activeOperatorIds = [],
  fiammettaRecovery = null,
  maxPlanCount = 12,
  ordinaryOperatorLimit = 8,
}) {
  const occupied = new Set(
    [...(occupiedOperatorIds || [])]
      .map(normalizeOperatorId)
      .filter(Boolean),
  );
  const excluded = new Set(
    [...(excludedOperatorIds || [])]
      .map(normalizeOperatorId)
      .filter(Boolean),
  );
  const recovery = createFiammettaRecoverySelectionState({
    recovery: fiammettaRecovery,
  });
  const slots = getFallbackSlots(selectedEntries);
  const normalizedMaxPlanCount = Math.max(1, Math.trunc(maxPlanCount) || 1);
  const normalizedOrdinaryOperatorLimit = Math.max(
    1,
    Math.trunc(ordinaryOperatorLimit) || 1,
  );
  const maxEnumeratedPlanCount = Math.max(
    normalizedMaxPlanCount * 32,
    normalizedMaxPlanCount,
  );

  if (slots.length === 0) {
    return [
      createFallbackPlanVariant({
        slots,
        assignedOperatorBySlotKey: new Map(),
        assignmentsBySelectionKey: new Map(),
        score: 0,
      }),
    ];
  }

  const slotOptions = slots
    .map((slot) => {
      const operators = getCandidateFallbackOperators(
        slot.candidate,
        {
          ownedOperators,
          activeOperatorIds,
        },
      ).filter((operator) =>
        operatorMatchesRequiredTags(operator, slot.requiredTags),
      );
      const isSpecialSlot = slot.requiredTags.length > 0;

      return {
        ...slot,
        operators: isSpecialSlot
          ? operators
          : operators.slice(0, normalizedOrdinaryOperatorLimit),
      };
    })
    .sort(
      (left, right) =>
        Number(right.requiredTags.length > 0) -
          Number(left.requiredTags.length > 0) ||
        left.operators.length - right.operators.length ||
        left.key.localeCompare(right.key, "en"),
    );

  if (slotOptions.some((slot) => slot.operators.length === 0)) {
    return [];
  }

  const variants = [];
  const selectedOperatorIds = new Set();
  const assignedOperatorBySlotKey = new Map();
  const assignmentsBySelectionKey = new Map();
  const fiammettaTargetStateIndexCounts = new Map();
  const fiammettaTargetSelectionKeyCounts = new Map();

  const getSelectedFiammettaTargetStateIndexes = () => [
    ...fiammettaTargetStateIndexCounts.keys(),
  ];
  const addFiammettaTargetSelection = (slot) => {
    if (!recovery.enabled) {
      return;
    }

    fiammettaTargetSelectionKeyCounts.set(
      slot.selectionKey,
      Number(fiammettaTargetSelectionKeyCounts.get(slot.selectionKey) || 0) +
        1,
    );
    for (const stateIndex of getRiicFiammettaSelectionStateIndexes(
      recovery,
      slot.selectionKey,
    )) {
      fiammettaTargetStateIndexCounts.set(
        stateIndex,
        Number(fiammettaTargetStateIndexCounts.get(stateIndex) || 0) + 1,
      );
    }
  };
  const removeFiammettaTargetSelection = (slot) => {
    const selectionCount =
      Number(fiammettaTargetSelectionKeyCounts.get(slot.selectionKey) || 0) -
      1;
    if (selectionCount > 0) {
      fiammettaTargetSelectionKeyCounts.set(slot.selectionKey, selectionCount);
    } else {
      fiammettaTargetSelectionKeyCounts.delete(slot.selectionKey);
    }

    for (const stateIndex of getRiicFiammettaSelectionStateIndexes(
      recovery,
      slot.selectionKey,
    )) {
      const stateCount =
        Number(fiammettaTargetStateIndexCounts.get(stateIndex) || 0) - 1;
      if (stateCount > 0) {
        fiammettaTargetStateIndexCounts.set(stateIndex, stateCount);
      } else {
        fiammettaTargetStateIndexCounts.delete(stateIndex);
      }
    }
  };

  const assign = (slot, operator) => {
    const assignedOperator = {
      ...operator,
      taggedMember: slot.kind === "taggedMember",
    };
    selectedOperatorIds.add(operator.charId);
    if (isFiammettaTarget(recovery, operator.charId)) {
      addFiammettaTargetSelection(slot);
    }
    assignedOperatorBySlotKey.set(slot.key, assignedOperator);
    if (!assignmentsBySelectionKey.has(slot.selectionKey)) {
      assignmentsBySelectionKey.set(slot.selectionKey, []);
    }
    assignmentsBySelectionKey.get(slot.selectionKey).push(assignedOperator);
  };
  const unassign = (slot, operator) => {
    selectedOperatorIds.delete(operator.charId);
    if (isFiammettaTarget(recovery, operator.charId)) {
      removeFiammettaTargetSelection(slot);
    }
    assignedOperatorBySlotKey.delete(slot.key);
    const assignments = assignmentsBySelectionKey.get(slot.selectionKey) || [];
    assignments.pop();
    if (assignments.length === 0) {
      assignmentsBySelectionKey.delete(slot.selectionKey);
    }
  };
  const visit = (slotIndex, score) => {
    if (variants.length >= maxEnumeratedPlanCount) {
      return;
    }

    if (slotIndex >= slotOptions.length) {
      variants.push(
        createFallbackPlanVariant({
          slots,
          assignedOperatorBySlotKey,
          assignmentsBySelectionKey,
          score,
          fiammettaTargetSelectionKeys: [
            ...fiammettaTargetSelectionKeyCounts.keys(),
          ],
          fiammettaTargetStateIndexes:
            getSelectedFiammettaTargetStateIndexes(),
        }),
      );
      return;
    }

    const slot = slotOptions[slotIndex];
    for (const operator of slot.operators) {
      if (
        !canSelectFallbackOperator({
          operator,
          slot,
          occupied,
          excluded,
          selectedOperatorIds,
          recovery,
          selectedFiammettaTargetStateIndexes:
            getSelectedFiammettaTargetStateIndexes(),
        })
      ) {
        continue;
      }

      assign(slot, operator);
      visit(
        slotIndex + 1,
        score +
          normalizePercent(operator.effectivePercent ?? operator.percent) +
          normalizePercent(operator.fillPriority),
      );
      unassign(slot, operator);
    }
  };

  visit(0, 0);

  const rankedVariants = variants
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.selectedOperatorIds.join(",").localeCompare(
          right.selectedOperatorIds.join(","),
          "en",
        ),
    );
  const seededVariants = createSeededFallbackPlanVariants({
    slots,
    slotOptions,
    occupied,
    excluded,
    fiammettaRecovery: recovery,
    maxPlanCount: normalizedMaxPlanCount,
  });
  const candidatesByAssignment = new Map();

  for (const variant of [
    rankedVariants[0],
    ...seededVariants,
    ...rankedVariants,
  ].filter(Boolean)) {
    const signature = getFallbackPlanAssignmentSignature(variant);
    if (!candidatesByAssignment.has(signature)) {
      candidatesByAssignment.set(signature, variant);
    }
  }

  return [...candidatesByAssignment.values()].slice(0, normalizedMaxPlanCount);
}

/**
 * Builds the facility-local greedy fallback assignment. The caller owns the
 * order in which facilities claim operators; this helper only respects the
 * already occupied ids it receives.
 */
export function createRiicRoomGroupFallbackPlan({
  selectedEntries = [],
  occupiedOperatorIds = new Set(),
  excludedOperatorIds = new Set(),
  ownedOperators = [],
  activeOperatorIds = [],
  fiammettaRecovery = null,
  preferredOperatorIdBySlotKey = {},
  preferredOperatorIds = [],
  allowAutomaticFill = true,
}) {
  const occupied = new Set(
    [...(occupiedOperatorIds || [])]
      .map(normalizeOperatorId)
      .filter(Boolean),
  );
  const excluded = new Set(
    [...(excludedOperatorIds || [])]
      .map(normalizeOperatorId)
      .filter(Boolean),
  );
  const recovery = createFiammettaRecoverySelectionState({
    recovery: fiammettaRecovery,
  });
  const slots = getFallbackSlots(selectedEntries);
  const selectedIds = new Set();
  const assignmentsBySelectionKey = new Map();
  const assignedOperatorBySlotKey = new Map();
  const allOperatorsById = new Map();
  const fiammettaTargetStateIndexes = new Set();
  const fiammettaTargetSelectionKeys = new Set();

  const slotOptions = slots.map((slot) => {
    const operators = getCandidateFallbackOperators(
      slot.candidate,
      {
        ownedOperators,
        activeOperatorIds,
      },
    ).filter((operator) =>
      operatorMatchesRequiredTags(operator, slot.requiredTags),
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
  const canSelect = (slot, operator) =>
    canSelectFallbackOperator({
      operator,
      slot,
      occupied,
      excluded,
      selectedOperatorIds: selectedIds,
      recovery,
      selectedFiammettaTargetStateIndexes: [
        ...fiammettaTargetStateIndexes,
      ],
    });
  const selectOperatorForSlot = (slot, operator) => {
    selectedIds.add(operator.charId);
    assignedSlotKeys.add(slot.key);
    const assignedOperator = {
      ...operator,
      taggedMember: slot.kind === "taggedMember",
    };
    if (isFiammettaTarget(recovery, operator.charId)) {
      fiammettaTargetSelectionKeys.add(slot.selectionKey);
      for (const stateIndex of getRiicFiammettaSelectionStateIndexes(
        recovery,
        slot.selectionKey,
      )) {
        fiammettaTargetStateIndexes.add(stateIndex);
      }
    }
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
    if (!charId) {
      continue;
    }

    const operator = slot.operators.find(
      (candidateOperator) => candidateOperator.charId === charId,
    );
    if (operator && canSelect(slot, operator)) {
      selectOperatorForSlot(slot, operator);
    }
  }

  for (const preferredOperatorId of preferredOperatorIds || []) {
    const charId = normalizeOperatorId(preferredOperatorId);
    if (
      !allOperatorsById.has(charId) ||
      !slotOptions.some(
        (slot) =>
          !assignedSlotKeys.has(slot.key) &&
          slot.operators.some(
            (candidateOperator) =>
              candidateOperator.charId === charId &&
              canSelect(slot, candidateOperator),
          ),
      )
    ) {
      continue;
    }

    const slot = slotOptions.find(
      (item) =>
        !assignedSlotKeys.has(item.key) &&
        item.operators.some(
          (candidateOperator) =>
            candidateOperator.charId === charId &&
            canSelect(item, candidateOperator),
        ),
    );
    if (slot) {
      const slotOperator = slot.operators.find(
        (candidateOperator) => candidateOperator.charId === charId,
      );
      if (canSelect(slot, slotOperator)) {
        selectOperatorForSlot(slot, slotOperator);
      }
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
        (operator) => canSelect(slot, operator),
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
    status:
      assignedSlotKeys.size === slots.length ? "ready" : "insufficient",
    pendingCount: slots.length,
    selectedCount: assignedSlotKeys.size,
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
    fiammettaTargetSelectionKeys: [...fiammettaTargetSelectionKeys],
    fiammettaTargetStateIndexes: [...fiammettaTargetStateIndexes].sort(
      (left, right) => left - right,
    ),
  };
}

export function createRiicFallbackEstimate({
  rankedOperators = [],
  fallbackCount = 0,
  defaultPercent = 0,
} = {}) {
  const normalizedFallbackCount = normalizeCount(fallbackCount);
  const selectedOperators = (Array.isArray(rankedOperators)
    ? rankedOperators
    : []
  ).slice(0, normalizedFallbackCount);
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
    fallbackCount: count,
    defaultPercent: candidate?.fallback?.percent,
  }).selectedOperators;
}

export function getRiicFallbackPreviewTotalPercent(candidate) {
  return createRiicFallbackEstimate({
    rankedOperators: getCandidateFallbackOperators(candidate),
    fallbackCount: candidate?.fallback?.count,
    defaultPercent: candidate?.fallback?.percent,
  }).totalPercent;
}
