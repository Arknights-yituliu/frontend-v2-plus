import BUILDING_TABLE from "../../static/json/build/building_table.json";
import IDLE_FILL_PRIORITY from "../../static/json/tools/riic-candidates/R71-idle-fill.json";
import {
  createRiicRoomGroupFallbackPlan,
} from "./l63-fallback.js";
import {
  getRiicAutomaticRoomGroupPlanningOrder,
} from "./l70-automatic-room-selection.js";
import {
  getRiicFiammettaTeamStateIndexes,
  normalizeRiicFiammettaRecovery,
} from "./l65-fiammetta-recovery.js";

const SKILLS_BY_OPERATOR_ID = new Map();

for (const skill of BUILDING_TABLE || []) {
  const charId = String(skill?.charId || "").trim();
  const roomType = String(skill?.roomType || "").trim();
  if (!charId || !roomType) {
    continue;
  }

  const skills = SKILLS_BY_OPERATOR_ID.get(charId) || [];
  skills.push({
    roomType,
    phase: Math.max(0, Number(skill?.phase || 0)),
    level: Math.max(1, Number(skill?.level || 1)),
  });
  SKILLS_BY_OPERATOR_ID.set(charId, skills);
}

function normalizeOperator(operator) {
  const charId = String(operator?.charId || "").trim();
  if (!charId) {
    return null;
  }

  return {
    charId,
    name: String(operator?.name || charId).trim() || charId,
    elite: Math.max(0, Number(operator?.elite || 0)),
    level: Math.max(1, Number(operator?.level || 1)),
  };
}

function getOperatorRank(operator) {
  return Number(operator?.elite || 0) * 1000 + Number(operator?.level || 1);
}

function normalizeRoster(roster) {
  const rosterById = new Map();

  for (const sourceOperator of roster || []) {
    const operator = normalizeOperator(sourceOperator);
    if (!operator) {
      continue;
    }

    const current = rosterById.get(operator.charId);
    if (!current || getOperatorRank(operator) > getOperatorRank(current)) {
      rosterById.set(operator.charId, operator);
    }
  }

  return [...rosterById.values()];
}

function isSkillUnlocked(operator, skill, unlockAllSkills) {
  if (unlockAllSkills) {
    return true;
  }

  if (operator.elite > skill.phase) {
    return true;
  }

  return operator.elite === skill.phase && operator.level >= skill.level;
}

function getActiveRoomTypes(operator, unlockAllSkills) {
  return [
    ...new Set(
      (SKILLS_BY_OPERATOR_ID.get(operator.charId) || [])
        .filter((skill) => isSkillUnlocked(operator, skill, unlockAllSkills))
        .map((skill) => skill.roomType),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
}

function hasSameValues(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function matchesPriorityTier(roomTypes, match) {
  if (match?.otherwise) {
    return true;
  }

  const normalizedRoomTypes = [...roomTypes].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  if (Array.isArray(match?.activeRoomTypesEqual)) {
    const expected = [...new Set(match.activeRoomTypesEqual)]
      .map((roomType) => String(roomType || "").trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "en"));
    if (!hasSameValues(normalizedRoomTypes, expected)) {
      return false;
    }
  }

  if (Array.isArray(match?.allActiveRoomTypesMustBeWithin)) {
    const allowed = new Set(
      match.allActiveRoomTypesMustBeWithin
        .map((roomType) => String(roomType || "").trim())
        .filter(Boolean),
    );
    if (normalizedRoomTypes.some((roomType) => !allowed.has(roomType))) {
      return false;
    }
  }

  if (Array.isArray(match?.activeRoomTypesMustInclude)) {
    const active = new Set(normalizedRoomTypes);
    if (
      match.activeRoomTypesMustInclude.some(
        (roomType) => !active.has(String(roomType || "").trim()),
      )
    ) {
      return false;
    }
  }

  const minimumCount = Number(match?.minimumDistinctActiveRoomTypeCount);
  return (
    !Number.isFinite(minimumCount) ||
    normalizedRoomTypes.length >= minimumCount
  );
}

function getPriorityTier(roomTypes, priorityConfig) {
  const tiers = priorityConfig?.tiers || [];
  return (
    tiers.find((tier) => matchesPriorityTier(roomTypes, tier?.match)) ||
    tiers[tiers.length - 1] ||
    { id: "other", label: "Other" }
  );
}

function getSelectedEntries(group, state, selections) {
  const selectedEntries = [];

  for (const cohort of state?.cohorts || []) {
    const candidateByKey = new Map(
      (cohort?.candidates || []).map((candidate) => [candidate.key, candidate]),
    );
    const selectedKeys = selections?.[group.id]?.[cohort.id] || [];

    for (const [teamIndex, candidateKey] of selectedKeys.entries()) {
      const candidate = candidateByKey.get(candidateKey);
      if (candidate) {
        selectedEntries.push({
          selectionKey: `${cohort.id}:${teamIndex}`,
          candidate,
          cohort,
          teamIndex,
        });
      }
    }
  }

  return selectedEntries;
}

function cloneSelections(selections) {
  return Object.fromEntries(
    Object.entries(selections || {}).map(([groupId, cohorts]) => [
      groupId,
      Object.fromEntries(
        Object.entries(cohorts || {}).map(([cohortId, candidateKeys]) => [
          cohortId,
          [...(candidateKeys || [])],
        ]),
      ),
    ]),
  );
}

function getSelectedCoreOperatorIds(
  groups,
  candidateStatesByGroupId,
  selections,
  fiammettaRecovery,
) {
  const operatorIds = new Set();

  for (const group of groups || []) {
    const state = candidateStatesByGroupId?.[group.id];
    for (const entry of getSelectedEntries(group, state, selections)) {
      for (const charId of entry.candidate?.operatorIds || []) {
        if (
          !fiammettaRecovery.enabled ||
          charId !== fiammettaRecovery.targetOperatorId
        ) {
          operatorIds.add(charId);
        }
      }
    }
  }

  return operatorIds;
}

function getSelectedCoreFiammettaUsage(
  groups,
  candidateStatesByGroupId,
  selections,
  fiammettaRecovery,
) {
  const selectionKeys = new Set();
  const stateIndexes = new Set();

  if (!fiammettaRecovery.enabled) {
    return {
      selectionKeys,
      stateIndexes,
    };
  }

  for (const group of groups || []) {
    const state = candidateStatesByGroupId?.[group.id];
    for (const entry of getSelectedEntries(group, state, selections)) {
      if (
        !(entry.candidate?.operatorIds || []).includes(
          fiammettaRecovery.targetOperatorId,
        )
      ) {
        continue;
      }

      selectionKeys.add(`${group.id}:${entry.selectionKey}`);
      for (const stateIndex of getRiicFiammettaTeamStateIndexes(
        entry.cohort,
        entry.teamIndex,
      )) {
        stateIndexes.add(stateIndex);
      }
    }
  }

  return {
    selectionKeys,
    stateIndexes,
  };
}

/**
 * L71: Rank unclaimed operators for final idle fill. The priority file is
 * evaluated from skills unlocked by the operator's current elite and level.
 */
export function getRiicIdleFillOperators({
  roster = [],
  priorityConfig = IDLE_FILL_PRIORITY,
  unlockAllSkills = false,
} = {}) {
  const excludedNames = new Set(
    (priorityConfig?.excludeNames || [])
      .map((name) => String(name || "").trim())
      .filter(Boolean),
  );
  const priorityIndexByName = new Map(
    (priorityConfig?.priorityNames || [])
      .map((name, index) => [String(name || "").trim(), index])
      .filter(([name]) => name),
  );

  return normalizeRoster(roster)
    .filter((operator) => !excludedNames.has(operator.name))
    .map((operator) => {
      const activeRoomTypes = getActiveRoomTypes(operator, unlockAllSkills);
      const tier = getPriorityTier(activeRoomTypes, priorityConfig);
      const tierIndex = Math.max(
        0,
        (priorityConfig?.tiers || []).indexOf(tier),
      );

      return {
        ...operator,
        percent: 0,
        basePercent: 0,
        effectivePercent: 0,
        fillPriority: 0,
        tags: [],
        idleFill: true,
        idleFillTier: String(tier?.id || "other"),
        idleFillPriority: tierIndex,
        idleFillNamedPriority:
          priorityIndexByName.get(operator.name) ?? Number.POSITIVE_INFINITY,
        activeRoomTypes,
      };
    })
    .sort(
      (left, right) =>
        left.idleFillNamedPriority - right.idleFillNamedPriority ||
        left.idleFillPriority - right.idleFillPriority ||
        left.name.localeCompare(right.name, "zh-CN") ||
        left.charId.localeCompare(right.charId, "en"),
    );
}

export function withRiicIdleFillOperators(selectedEntries, idleFillOperators) {
  return (selectedEntries || []).map((entry) => ({
    ...entry,
    candidate: {
      ...entry.candidate,
      fallback: {
        ...entry.candidate?.fallback,
        idleCandidateOperators: idleFillOperators || [],
      },
    },
  }));
}

/**
 * L71: Preserve L70's selected teams while filling remaining ordinary slots
 * with idle operators. Candidate-team selection, including pure fallback
 * teams, belongs to L70.
 */
export function buildRiicTailFillResult({
  groups = [],
  candidateStatesByGroupId = {},
  selections = {},
  fallbackOperatorIdBySlotKeyByGroup = {},
  controlCenterOperatorIds = [],
  idleFillOperators = [],
  fiammettaRecovery = null,
  fiammettaControlUsage = null,
  onProgress,
} = {}) {
  onProgress?.("L71_FILL");
  const planningGroups = getRiicAutomaticRoomGroupPlanningOrder(groups);
  const nextSelections = cloneSelections(selections);
  const controlCenterOperatorIdSet = new Set(
    controlCenterOperatorIds || [],
  );
  const recovery = normalizeRiicFiammettaRecovery(fiammettaRecovery);
  const selectedCoreOperatorIds = getSelectedCoreOperatorIds(
    planningGroups,
    candidateStatesByGroupId,
    nextSelections,
    recovery,
  );
  const fiammettaUsage = getSelectedCoreFiammettaUsage(
    planningGroups,
    candidateStatesByGroupId,
    nextSelections,
    recovery,
  );
  const controlSelectionCount = recovery.enabled
    ? Math.max(0, Number(fiammettaControlUsage?.selectionCount || 0))
    : 0;
  for (const stateIndex of fiammettaControlUsage?.stateIndexes || []) {
    const normalizedStateIndex = Number(stateIndex);
    if (Number.isInteger(normalizedStateIndex) && normalizedStateIndex >= 0) {
      fiammettaUsage.stateIndexes.add(normalizedStateIndex);
    }
  }
  const occupiedOperatorIds = new Set([
    ...controlCenterOperatorIdSet,
    ...selectedCoreOperatorIds,
  ].filter((charId) => charId !== recovery.targetOperatorId));
  const nextFallbackOperatorIdBySlotKeyByGroup = Object.fromEntries(
    Object.entries(fallbackOperatorIdBySlotKeyByGroup || {}).map(
      ([groupId, assignments]) => [groupId, { ...(assignments || {}) }],
    ),
  );
  const fallbackOperatorsBySelectionKeyByGroup = {};

  for (const group of planningGroups) {
    const state = candidateStatesByGroupId[group.id];
    if (state?.status !== "ready") {
      continue;
    }

    const selectedEntries = getSelectedEntries(group, state, nextSelections);
    if (selectedEntries.length === 0) {
      continue;
    }

    const fallbackPlan = createRiicRoomGroupFallbackPlan({
      selectedEntries: withRiicIdleFillOperators(
        selectedEntries,
        idleFillOperators,
      ),
      occupiedOperatorIds,
      preferredOperatorIdBySlotKey:
        nextFallbackOperatorIdBySlotKeyByGroup[group.id] || {},
      excludedOperatorIds: selectedEntries.flatMap(
        (entry) => entry.candidate?.operatorIds || [],
      ),
      fiammettaRecovery: {
        ...recovery,
        usedStateIndexes: [...fiammettaUsage.stateIndexes],
        stateIndexesBySelectionKey: Object.fromEntries(
          selectedEntries.map((entry) => [
            entry.selectionKey,
            getRiicFiammettaTeamStateIndexes(
              entry.cohort,
              entry.teamIndex,
            ),
          ]),
        ),
      },
      allowAutomaticFill: true,
    });
    nextFallbackOperatorIdBySlotKeyByGroup[group.id] = {
      ...fallbackPlan.operatorIdBySlotKey,
    };
    fallbackOperatorsBySelectionKeyByGroup[group.id] = Object.fromEntries(
      Object.entries(fallbackPlan.assignmentsBySelectionKey || {}).map(
        ([selectionKey, operators]) => [
          selectionKey,
          [...(operators || [])],
        ],
      ),
    );

    for (const charId of fallbackPlan.selectedOperatorIds || []) {
      if (charId !== recovery.targetOperatorId) {
        occupiedOperatorIds.add(charId);
      }
    }
    for (const selectionKey of fallbackPlan.fiammettaTargetSelectionKeys || []) {
      fiammettaUsage.selectionKeys.add(`${group.id}:${selectionKey}`);
    }
    for (const stateIndex of fallbackPlan.fiammettaTargetStateIndexes || []) {
      fiammettaUsage.stateIndexes.add(stateIndex);
    }
  }

  return {
    selections: nextSelections,
    fallbackOperatorIdBySlotKeyByGroup:
      nextFallbackOperatorIdBySlotKeyByGroup,
    fallbackOperatorsBySelectionKeyByGroup,
    fiammettaTargetUsage: {
      targetOperatorId: recovery.targetOperatorId,
      selectionCount:
        controlSelectionCount + fiammettaUsage.selectionKeys.size,
      selectionKeys: [...fiammettaUsage.selectionKeys],
      stateIndexes: [...fiammettaUsage.stateIndexes].sort(
        (left, right) => left - right,
      ),
    },
  };
}
