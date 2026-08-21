import {
  buildRiicAutomaticRoomGroupSelections,
} from "./l70-automatic-room-selection.js";
import {
  buildRiicTailFillResult,
} from "./l71-idle-fill.js";
import {
  reinforceRiicPerceptionResourceSuite,
} from "./l72-resource-suite-reinforcement.js";
import {
  reconcileRiicControlCenterAfterRoomSelection,
} from "./l73-control-center-reconciliation.js";

export function buildRiicFinalSelectedRoomTeams({
  groups = [],
  candidateStatesByGroupId = {},
  tailFillResult,
} = {}) {
  return (groups || []).flatMap((group) => {
    const state = candidateStatesByGroupId?.[group.id];
    if (state?.status !== "ready") {
      return [];
    }

    return (state.cohorts || []).flatMap((cohort) =>
      (tailFillResult?.selections?.[group.id]?.[cohort.id] || []).flatMap(
        (candidateKey, teamIndex) => {
          const candidate = (cohort.candidates || []).find(
            (item) => item.key === candidateKey,
          );
          if (!candidate) {
            return [];
          }

          const selectionKey = `${cohort.id}:${teamIndex}`;
          const fallbackOperators =
            tailFillResult?.fallbackOperatorsBySelectionKeyByGroup?.[
              group.id
            ]?.[selectionKey] || [];
          return [
            {
              groupId: group.id,
              cohortId: cohort.id,
              selectionKey,
              teamIndex,
              facility:
                candidate?.candidateScope?.roomType || group.facility || "",
              product:
                candidate?.candidateScope?.product ||
                group.candidateProduct ||
                "all",
              operatorIds: [
                ...new Set(
                  [
                    ...(candidate.operatorIds || []),
                    ...fallbackOperators.map((operator) => operator?.charId),
                  ]
                    .map((operatorId) => String(operatorId || "").trim())
                    .filter(Boolean),
                ),
              ],
            },
          ];
        },
      ),
    );
  });
}

export function runRiicAutomaticSchedule(input = {}) {
  const automaticSelection = buildRiicAutomaticRoomGroupSelections({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    controlCenterOperatorIds: input.controlCenterOperatorIds,
    controlCenterRuntimeContext: input.controlCenterRuntimeContext,
    layoutFacts: input.layoutFacts,
    selectionBeamLimit: input.selectionBeamLimit,
    selectionOptionLimit: input.selectionOptionLimit,
    selectionRepresentativeLimit: input.selectionRepresentativeLimit,
    selectionBatchSize: input.selectionBatchSize,
    fallbackPlanLimit: input.fallbackPlanLimit,
    ownedOperators: input.ownedOperators,
    controlCenterSegments: input.controlCenterSegments,
    idleFillOperators: input.idleFillOperators,
    fiammettaRecovery: input.fiammettaRecovery,
    collectPlanningDebug: input.collectPlanningDebug === true,
  });
  const tailFillResult = buildRiicTailFillResult({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    selections: automaticSelection.selections,
    fallbackOperatorIdBySlotKeyByGroup:
      automaticSelection.fallbackOperatorIdBySlotKeyByGroup,
    controlCenterOperatorIds: input.controlCenterOperatorIds,
    idleFillOperators: input.idleFillOperators,
    fiammettaRecovery: input.fiammettaRecovery,
    fiammettaControlUsage: input.fiammettaControlUsage,
  });
  const resourceSuiteResult = reinforceRiicPerceptionResourceSuite({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    tailFillResult,
    controlCenterOperatorIds: input.controlCenterOperatorIds,
    idleFillOperators: input.idleFillOperators,
    fiammettaRecovery: input.fiammettaRecovery,
    fiammettaControlUsage: input.fiammettaControlUsage,
    controlCenterRuntimeContext: input.controlCenterRuntimeContext,
  });
  const finalRoomTeams = buildRiicFinalSelectedRoomTeams({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    tailFillResult: resourceSuiteResult.tailFillResult,
  });
  const controlCenterReconciliation =
    reconcileRiicControlCenterAfterRoomSelection({
      controlState: input.controlCenterState,
      selectedRoomTeams: finalRoomTeams,
      selectionReady:
        automaticSelection.unavailableGroups.length === 0 &&
        finalRoomTeams.length > 0,
      manualOperatorIdsByTeamIndex:
        input.manualControlCenterOperatorIdsByTeamIndex,
      excludedOperatorIdsByTeamIndex:
        input.controlCenterLateFillExcludedOperatorIdsByTeamIndex,
      idleFillOperators: input.idleFillOperators,
      fiammettaRecovery: input.fiammettaRecovery,
    });

  return {
    automaticSelection,
    tailFillResult,
    resourceSuiteResult,
    controlCenterReconciliation,
  };
}
