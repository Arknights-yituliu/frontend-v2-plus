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

const AUTOMATION_POWER_SUPPORT_OPERATOR_ID = "char_1027_greyy2";

function getAutomaticRoomGroupPriority(group) {
  return ["meeting", "office"].includes(group?.facility) ? 1 : 0;
}

function isAutomationCandidate(candidate) {
  return Boolean(
    candidate?.automationCalculation ||
      String(candidate?.variantGroupId || "").includes("automation") ||
      (candidate?.fallback?.taggedMemberRequirements || []).some((requirement) =>
        (requirement?.tags || []).includes("automation"),
      ) ||
      (candidate?.fallback?.candidateOperators || []).some((operator) =>
        (operator?.tags || []).includes("automation"),
      ),
  );
}

function hasUnlockedAutomationPowerSupport(ownedOperators = []) {
  const supportOperator = (ownedOperators || []).find(
    (operator) =>
      String(operator?.charId || "").trim() ===
      AUTOMATION_POWER_SUPPORT_OPERATOR_ID,
  );
  return Number(supportOperator?.elite ?? supportOperator?.evolvePhase ?? 0) >= 2;
}

function hasAutomationCandidateStates(
  groups = [],
  candidateStatesByGroupId = {},
) {
  return groups.some((group) =>
    (candidateStatesByGroupId[group.id]?.cohorts || []).some((cohort) =>
      (cohort?.candidates || []).some(isAutomationCandidate),
    ),
  );
}

function getAutomationRuntimeContext({
  layoutData,
  ownedOperators,
  powerSupportReserved = false,
}) {
  if (!powerSupportReserved) {
    return null;
  }

  const powerPlantCount = Number(layoutData?.powerPlantCount || 0);
  return {
    layoutData: layoutData || {},
    ownedOperators,
    powerPlantCount,
    effectivePowerPlantCount: powerPlantCount + 1,
    supportOperatorId: AUTOMATION_POWER_SUPPORT_OPERATOR_ID,
  };
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
  facility,
  automationRuntimeContext,
  reservedPowerOperatorId = "",
  idleFillOperators = [],
  reportProgress,
}) {
  const recovery = normalizeRiicFiammettaRecovery(fiammettaRecovery);
  const candidateWithIdleFallback =
    (idleFillOperators || []).length > 0
      ? {
          ...candidate,
          fallback: {
            ...(candidate?.fallback || {}),
            idleCandidateOperators: idleFillOperators,
          },
        }
      : candidate;
  const coreOperatorIds = candidate?.operatorIds || [];
  const reserveOperatorForPower =
    reservedPowerOperatorId && facility !== "power";
  const mustUseReservedPowerOperator =
    reservedPowerOperatorId && facility === "power" && teamIndex === 0;
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
      ...(candidateWithIdleFallback?.fallback?.idleCandidateOperators || []),
    ].some((operator) => isReusableTarget(operator?.charId));
  if (
    (reserveOperatorForPower &&
      coreOperatorIds.includes(reservedPowerOperatorId)) ||
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

  const excludedOperatorIds = new Set(coreOperatorIds);
  if (reserveOperatorForPower) {
    excludedOperatorIds.add(reservedPowerOperatorId);
  }
  reportProgress?.("L70_FALLBACK");
  const fallbackPlans = createRiicRoomGroupFallbackPlanAlternatives({
    selectedEntries: [{ selectionKey, candidate: candidateWithIdleFallback }],
    occupiedOperatorIds: new Set([
      ...activeSelectionOperatorIds,
    ].filter((charId) => !isReusableTarget(charId))),
    excludedOperatorIds,
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
      {
        controlCenterRuntimeContext,
        automationRuntimeContext: isAutomationCandidate(candidate)
          ? automationRuntimeContext
          : null,
      },
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
        unmetUpgradeRequirementCount: (
          materializedCandidate?.upgradeRequirements || []
        ).length,
      },
    ].filter(
      (option) =>
        !mustUseReservedPowerOperator ||
        option.materializedCandidate.operatorIds.includes(
          reservedPowerOperatorId,
        ),
    );
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
        candidateProduct: group.candidateProduct || "all",
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

function createAutomaticSelectionDiagnostics({
  selections = [],
  plannerDebug,
  plannerOptionTraces,
  plannerOptionEvaluations,
}) {
  const planningRounds = plannerDebug?.planningRounds || [];

  return (selections || []).map(({ slot, option, parentPlanKey, planKey }, roundIndex) => {
    const trace = (plannerOptionTraces || []).find(
      (item) =>
        item.roundIndex === roundIndex &&
        item.parentPlanKey === parentPlanKey &&
        item.groupId === slot?.groupId &&
        item.cohortId === slot?.cohortId,
    );
    const planningRound = planningRounds.find(
      (item) => item.roundIndex === roundIndex,
    );
    const evaluationsByOptionKey = new Map(
      (plannerOptionEvaluations || [])
        .filter(
          (item) =>
            item.roundIndex === roundIndex &&
            item.parentPlanKey === parentPlanKey &&
            item.groupId === slot?.groupId &&
            item.cohortId === slot?.cohortId &&
            item.selectionKey === trace?.selectionKey,
        )
        .map((item) => [item.optionKey, item]),
    );
    const summarizePlan = (optionTrace) => {
      const optionPlanKey = parentPlanKey
        ? `${parentPlanKey}>>${slot.key}:${trace?.selectionKey}:${optionTrace.key}`
        : `${slot.key}:${trace?.selectionKey}:${optionTrace.key}`;
      const plan = planningRound?.plansByKey?.[optionPlanKey] || null;
      const evaluation = evaluationsByOptionKey.get(optionTrace.key);

      return {
        ...optionTrace,
        planRank: Number(plan?.rank || 0),
        planRankingValue: Number(plan?.rankingValue || 0),
        planBaseRankingValue: Number(plan?.baseRankingValue || 0),
        planRetained: plan?.retained === true,
        rejectionReason: evaluation?.reason || "",
        claimedOperatorId: evaluation?.claimedOperatorId || "",
        fiammettaStateIndex: evaluation?.fiammettaStateIndex ?? null,
      };
    };
    const selected = summarizePlan({
      key: option?.key || "",
      candidateName: option?.materializedCandidate?.name || "",
      operatorIds: option?.materializedCandidate?.operatorIds || [],
      fallbackPlanScore: Number(option?.fallbackPlan?.score || 0),
      rankingValue: Number(option?.rankingValue || 0),
    });
    const alternatives = (trace?.options || []).map(summarizePlan);
    if (!alternatives.some((item) => item.key === selected.key)) {
      alternatives.push(selected);
    }

    return {
      groupId: slot?.groupId || "",
      cohortId: slot?.cohortId || "",
      selectionKey: trace?.selectionKey || "",
      selected,
      selectedRank: Math.max(
        1,
        alternatives.findIndex((item) => item.key === selected.key) + 1,
      ),
      availableOptionCount: Number(trace?.optionCount || alternatives.length),
      alternatives,
      traceFound: Boolean(trace),
    };
  });
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
  selectionOptionLimit,
  selectionRepresentativeLimit,
  selectionBatchSize,
  fallbackPlanLimit,
  fiammettaRecovery,
  ownedOperators = [],
  layoutData = {},
  controlCenterSegments = [],
  collectPlanningDebug = false,
  idleFillOperators = [],
  onProgress,
} = {}) {
  const reportedProgress = new Set();
  const reportProgress = (phase) => {
    if (reportedProgress.has(phase)) {
      return;
    }
    reportedProgress.add(phase);
    onProgress?.(phase);
  };
  reportProgress("L70_CANDIDATES");
  const automationOpportunity =
    hasUnlockedAutomationPowerSupport(ownedOperators) &&
    hasAutomationCandidateStates(groups, candidateStatesByGroupId);
  const planningGroups = getRiicAutomaticRoomGroupPlanningOrder(groups);
  const reservedPowerOperatorId = automationOpportunity
    ? AUTOMATION_POWER_SUPPORT_OPERATOR_ID
    : "";
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
  reportProgress("L70_COMBINING");
  const plannerOptionTraces = [];
  const plannerOptionEvaluations = [];
  const { bestPlan, debug: plannerDebug } = planRiicAutomaticRoomSelections({
    selectionCohorts,
    initiallyClaimedOperatorIds: [...normalizedControlCenterOperatorIds].filter(
      (charId) => charId !== recovery.targetOperatorId,
    ),
    beamLimit: selectionBeamLimit,
    optionLimit: selectionOptionLimit,
    representativeLimit: selectionRepresentativeLimit,
    selectionBatchSize,
    getOptionDiversityKey: ({ cohort, selectionKey, option }) =>
      `${cohort.key}:${selectionKey}:${option.candidateKey}`,
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
            facility: cohort.facility,
            idleFillOperators,
            reservedPowerOperatorId,
            automationRuntimeContext: getAutomationRuntimeContext({
              layoutData,
              ownedOperators,
              powerSupportReserved: Boolean(reservedPowerOperatorId),
            }),
            reportProgress,
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
        Number(activeRosterEffects.rankingBonus || 0) +
        Number(activeRosterEffects.sameShiftPriority?.rankingCorrection || 0)
      );
    },
    collectDebug: collectPlanningDebug,
    onOptionsResolved: collectPlanningDebug
      ? ({
          roundIndex,
          parentPlanKey,
          cohort,
          selectionKey,
          options,
        }) => {
          plannerOptionTraces.push({
            roundIndex,
            parentPlanKey,
            groupId: cohort.groupId,
            cohortId: cohort.cohortId,
            selectionKey,
            optionCount: options.length,
            options: options.slice(0, 12).map((item) => ({
              key: item.key,
              candidateName: item.materializedCandidate?.name || "",
              operatorIds: item.materializedCandidate?.operatorIds || [],
              fallbackPlanScore: Number(item.fallbackPlan?.score || 0),
              rankingValue: Number(item.rankingValue || 0),
            })),
          });
        }
      : null,
    onOptionEvaluated: collectPlanningDebug
      ? ({
          roundIndex,
          parentPlanKey,
          cohort,
          selectionKey,
          option,
          status,
          reason,
          claimedOperatorId,
          fiammettaStateIndex,
        }) => {
          plannerOptionEvaluations.push({
            roundIndex,
            parentPlanKey,
            groupId: cohort.groupId,
            cohortId: cohort.cohortId,
            selectionKey,
            optionKey: option.key,
            status,
            reason: reason || "",
            claimedOperatorId: claimedOperatorId || "",
            fiammettaStateIndex:
              fiammettaStateIndex === undefined ? null : fiammettaStateIndex,
          });
        }
      : null,
  });
  const selections = {};
  const fallbackOperatorIdBySlotKeyByGroup = {};
  const selectedRoomTeams = [];

  for (const { slot, selectionKey, option } of bestPlan?.selections || []) {
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
    selectedRoomTeams.push({
      groupId: slot.groupId,
      cohortId: slot.cohortId,
      selectionKey,
      teamIndex: Number(String(selectionKey || "").split(":").at(-1)),
      facility: slot.facility,
      product: slot.candidateProduct || "all",
      operatorIds: [
        ...(option.materializedCandidate?.operatorIds || []),
      ],
    });
  }

  return {
    selections,
    fallbackOperatorIdBySlotKeyByGroup,
    selectedRoomTeams,
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
            sameShiftPriority:
              bestPlan.activeRosterEffects?.sameShiftPriority || null,
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
              automationCalculation:
                option.materializedCandidate?.automationCalculation || null,
            })),
          }
        : null,
      selectionDiagnostics: collectPlanningDebug
        ? createAutomaticSelectionDiagnostics({
            selections: bestPlan?.selections,
            plannerDebug,
            plannerOptionTraces,
            plannerOptionEvaluations,
          })
        : [],
      batchDiagnostics: collectPlanningDebug
        ? plannerDebug?.planningBatches || []
        : [],
    },
  };
}
