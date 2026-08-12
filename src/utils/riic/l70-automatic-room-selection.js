import {
  createRiicRoomGroupFallbackPlanAlternatives,
} from "./l63-fallback.js";
import {
  planRiicAutomaticRoomSelections,
} from "./l70-selection-planner.js";
import {
  getRiicRuntimeCandidateRankingValue,
} from "./l60-candidate-ranking.js";
import {
  materializeRiicRoomTeamCandidate,
} from "./l62-room-team-materializer.js";
import {
  getRiicFiammettaTeamStateIndexes,
  normalizeRiicFiammettaRecovery,
} from "./l65-fiammetta-recovery.js";
import {
  evaluateRiicActiveRosterPlanEffects,
  getRiicActiveRosterCandidatePriority,
} from "./l65-active-roster-effects.js";

function getAutomaticRoomGroupPriority(group) {
  return ["meeting", "office"].includes(group?.facility) ? 1 : 0;
}

export function getRiicAutomaticRoomGroupPlanningOrder(groups = []) {
  const orderById = new Map(
    groups.map((group, index) => [group.id, index]),
  );

  return [...groups].sort(
    (left, right) =>
      getAutomaticRoomGroupPriority(left) -
        getAutomaticRoomGroupPriority(right) ||
      Number(orderById.get(left.id) || 0) - Number(orderById.get(right.id) || 0),
  );
}

function getAutomaticRoomTeamOptions({
  candidate,
  selectionKey,
  controlCenterOperatorIds,
  controlCenterRuntimeContext,
  fallbackPlanLimit,
  claimedOperatorIds = new Set(),
  fiammettaTargetStateIndexes = new Set(),
  fiammettaRecovery,
  ownedOperators,
  selectedCandidateKeys = [],
  teamIndex,
}) {
  const recovery = normalizeRiicFiammettaRecovery(fiammettaRecovery);
  const coreOperatorIds = candidate?.operatorIds || [];
  const activeSelectionOperatorIds = new Set([
    ...controlCenterOperatorIds,
    ...claimedOperatorIds,
  ]);
  const isReusableTarget = (charId) =>
    recovery.enabled && charId === recovery.targetOperatorId;
  const candidateUsesReusableTarget = coreOperatorIds.some((charId) =>
    isReusableTarget(charId),
  );
  const candidateCanUseReusableTarget =
    candidateUsesReusableTarget ||
    [
      ...(candidate?.fallback?.candidateOperators || []),
      ...(candidate?.fallback?.operators || []),
    ].some((operator) => isReusableTarget(operator?.charId));
  if (
    (selectedCandidateKeys.includes(candidate?.key) &&
      !candidateCanUseReusableTarget) ||
    coreOperatorIds.some(
      (charId) =>
        (controlCenterOperatorIds.has(charId) && !isReusableTarget(charId)) ||
        (!isReusableTarget(charId) && claimedOperatorIds.has(charId)),
    )
  ) {
    return [];
  }

  const fallbackPlans = createRiicRoomGroupFallbackPlanAlternatives({
    selectedEntries: [{ selectionKey, candidate }],
    occupiedOperatorIds: new Set([
      ...activeSelectionOperatorIds,
    ].filter((charId) => !isReusableTarget(charId))),
    excludedOperatorIds: coreOperatorIds,
    ownedOperators,
    activeOperatorIds: activeSelectionOperatorIds,
    fiammettaRecovery: {
      ...recovery,
      usedStateIndexes: [
        ...new Set([
          ...(recovery.usedStateIndexes || []),
          ...fiammettaTargetStateIndexes,
        ]),
      ],
    },
    maxPlanCount: fallbackPlanLimit,
    ordinaryOperatorLimit: 24,
  });

  return fallbackPlans.flatMap((fallbackPlan) => {
    const fallbackOperators =
      fallbackPlan.assignmentsBySelectionKey?.[selectionKey] || [];
    const materializedCandidate = materializeRiicRoomTeamCandidate(
      candidate,
      fallbackOperators,
      { controlCenterRuntimeContext },
    );
    const materializedOperatorIds = materializedCandidate?.operatorIds || [];
    const claimedOperatorIds = materializedOperatorIds.filter(
      (charId) => !isReusableTarget(charId),
    );
    const targetStateIndexes = materializedOperatorIds.includes(
      recovery.targetOperatorId,
    )
      ? getRiicFiammettaTeamStateIndexes(
          fiammettaRecovery?.cohort,
          fiammettaRecovery?.teamIndex,
        )
      : [];

    if (
      !materializedCandidate ||
      materializedOperatorIds.length !== new Set(materializedOperatorIds).size
    ) {
      return [];
    }

    const activeRosterPriority = getRiicActiveRosterCandidatePriority({
      candidate: materializedCandidate,
      activeOperatorIds: activeSelectionOperatorIds,
    });
    const baseRankingValue =
      getRiicRuntimeCandidateRankingValue(materializedCandidate) +
      Number(activeRosterPriority.roomPriority || 0);

    return [
      {
        key: `${candidate.key}:${Object.entries(
          fallbackPlan.operatorIdBySlotKey || {},
        )
          .map(([slotKey, charId]) => `${slotKey}=${charId}`)
          .join(",")}`,
        candidateKey: candidate.key,
        candidate,
        fallbackPlan,
        claimedOperatorIds,
        allowDuplicateCandidateKey: materializedOperatorIds.includes(
          recovery.targetOperatorId,
        ),
        fiammettaTargetStateIndexes: targetStateIndexes,
        teamIndex,
        materializedCandidate,
        activeRosterPriority,
        baseRankingValue,
        rankingValue: baseRankingValue,
      },
    ];
  });
}

function createSelectionCohorts({
  groups,
  candidateStatesByGroupId,
}) {
  const unavailableGroupIds = [];
  const selectionCohorts = [];

  for (const group of groups) {
    const state = candidateStatesByGroupId[group.id];
    if (state?.status !== "ready") {
      unavailableGroupIds.push(group.id);
      continue;
    }

    for (const cohort of state.cohorts || []) {
      const teamCount = Math.max(0, Number(cohort?.teamCount || 0));
      if (teamCount <= 0) {
        continue;
      }

      selectionCohorts.push({
        key: `${group.id}:${cohort.id}`,
        groupId: group.id,
        cohortId: cohort.id,
        cohortKey: `${group.id}:${cohort.id}`,
        teamCount,
        facility: group.facility,
        candidates: cohort.candidates || [],
        staffingCohort: cohort,
      });
    }
  }

  return {
    selectionCohorts,
    unavailableGroupIds,
  };
}

/**
 * L70: choose mutually exclusive, fully materialized room-team options.
 * L61 fallback alternatives and L62 formulas are resolved for each beam branch,
 * using the operators that branch has already claimed.
 */
export function buildRiicAutomaticRoomGroupSelections({
  groups = [],
  candidateStatesByGroupId = {},
  controlCenterOperatorIds = [],
  controlCenterRuntimeContext,
  selectionBeamLimit,
  fallbackPlanLimit,
  fiammettaRecovery,
  ownedOperators = [],
  controlCenterSegments = [],
} = {}) {
  const planningGroups = getRiicAutomaticRoomGroupPlanningOrder(groups);
  const groupLabelById = new Map(
    planningGroups.map((group) => [group.id, group.label || group.id]),
  );
  const normalizedControlCenterOperatorIds = new Set(
    [...controlCenterOperatorIds]
      .map((charId) => String(charId || "").trim())
      .filter(Boolean),
  );
  const recovery = normalizeRiicFiammettaRecovery({
    ...fiammettaRecovery,
  });
  const { selectionCohorts, unavailableGroupIds: unavailableStateGroupIds } =
    createSelectionCohorts({
      groups: planningGroups,
      candidateStatesByGroupId,
    });
  const { bestPlan } = planRiicAutomaticRoomSelections({
    selectionCohorts,
    initiallyClaimedOperatorIds: [...normalizedControlCenterOperatorIds].filter(
      (charId) => charId !== recovery.targetOperatorId,
    ),
    beamLimit: selectionBeamLimit,
    resolveTeamOptions: ({
      cohort,
      selectionKey,
      claimedOperatorIds,
      fiammettaTargetStateIndexes,
      selectedCandidateKeys,
    }) => {
      const teamIndex = Number(
        String(selectionKey || "").split(":").at(-1),
      );
      const targetStateIndexes = getRiicFiammettaTeamStateIndexes(
        cohort.staffingCohort,
        teamIndex,
      );

      return (
      cohort.candidates
        .flatMap((candidate) =>
          getAutomaticRoomTeamOptions({
            candidate,
            selectionKey,
            controlCenterOperatorIds: normalizedControlCenterOperatorIds,
            controlCenterRuntimeContext,
            fallbackPlanLimit,
            claimedOperatorIds,
            fiammettaTargetStateIndexes,
            fiammettaRecovery: {
              ...recovery,
              cohort: cohort.staffingCohort,
              teamIndex,
              stateIndexesBySelectionKey: {
                [selectionKey]: targetStateIndexes,
              },
            },
            ownedOperators,
            selectedCandidateKeys,
            teamIndex,
          }),
        )
        .sort(
          (left, right) =>
            right.rankingValue - left.rankingValue ||
            left.key.localeCompare(right.key, "en"),
        )
      );
    },
    evaluatePlan: (plan) => {
      const activeRosterEffects = evaluateRiicActiveRosterPlanEffects({
        plan,
        ownedOperators,
        controlCenterSegments,
      });
      plan.activeRosterEffects = activeRosterEffects;

      return (
        Number(plan.baseRankingValue || 0) +
        Number(activeRosterEffects.rankingBonus || 0)
      );
    },
  });
  const selections = {};
  const fallbackOperatorIdBySlotKeyByGroup = {};

  for (const { slot, option } of bestPlan?.selections || []) {
    selections[slot.groupId] = {
      ...selections[slot.groupId],
      [slot.cohortId]: [
        ...(selections[slot.groupId]?.[slot.cohortId] || []),
        option.candidateKey,
      ],
    };
    const operatorIdBySlotKey = option.fallbackPlan?.operatorIdBySlotKey || {};
    if (Object.keys(operatorIdBySlotKey).length > 0) {
      fallbackOperatorIdBySlotKeyByGroup[slot.groupId] = {
        ...(fallbackOperatorIdBySlotKeyByGroup[slot.groupId] || {}),
        ...operatorIdBySlotKey,
      };
    }
  }

  return {
    selections,
    fallbackOperatorIdBySlotKeyByGroup,
    unavailableGroups: [
      ...unavailableStateGroupIds,
    ]
      .map((groupId) => groupLabelById.get(groupId) || groupId)
      .filter(
        (groupLabel, index, labels) => labels.indexOf(groupLabel) === index,
      ),
    debug: {
      planningOrder: planningGroups.map((group) => ({
        id: group.id,
        label: group.label || group.id,
        facility: group.facility,
      })),
      selectionCohorts: selectionCohorts.map((cohort) => ({
        groupId: cohort.groupId,
        cohortId: cohort.cohortId,
        facility: cohort.facility,
        teamCount: cohort.teamCount,
        candidateCount: cohort.candidates.length,
      })),
      bestPlan: bestPlan
        ? {
            baseRankingValue: Number(bestPlan.baseRankingValue || 0),
            rankingValue: Number(bestPlan.rankingValue || 0),
            activeRosterEffects: bestPlan.activeRosterEffects || null,
            selections: bestPlan.selections.map(({ slot, option }) => ({
              groupId: slot.groupId,
              cohortId: slot.cohortId,
              facility: slot.facility,
              candidateKey: option.candidateKey,
              candidateName: option.materializedCandidate?.name || "",
              operatorIds: option.materializedCandidate?.operatorIds || [],
              fallbackOperatorIds:
                option.materializedCandidate?.fallback?.fallbackOperatorIds ||
                [],
            })),
          }
        : null,
    },
  };
}
