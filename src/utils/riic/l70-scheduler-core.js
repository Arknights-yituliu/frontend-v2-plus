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
import { getRiicReservedDormitorySupportOperatorIds } from "./l30-rules.js";
import { getRiicFiammettaTeamStateIndexes } from "./l65-fiammetta-recovery.js";
import { optimizeRiicFallbackSameShift, optimizeRiicTradingTeamRotations } from "./l72-fallback-shift-optimization.js";

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
              activeStateIndexes: getRiicFiammettaTeamStateIndexes(cohort, teamIndex),
              stationLevel: cohort.stationLevel,
              stationIndexByStateIndex: Object.fromEntries(
                (cohort.rotationSegments || []).flatMap((segment) =>
                  (segment.assignments || []).flatMap((assignment) =>
                    (assignment.candidateIndexes || [assignment.teamIndex]).includes(teamIndex)
                      ? [[segment.index, assignment.stationIndex]]
                      : [],
                  ),
                ),
              ),
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
  const reportProgress =
    typeof input.onProgress === "function" ? input.onProgress : () => {};

  reportProgress("L70");
  const automaticSelection = buildRiicAutomaticRoomGroupSelections({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    controlCenterOperatorIds: input.controlCenterOperatorIds,
    controlCenterRuntimeContext: input.controlCenterRuntimeContext,
    layoutData: input.layoutData,
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
    onProgress: input.onProgress,
  });

  reportProgress("L71");
  const tailFillResult = buildRiicTailFillResult({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    selections: automaticSelection.selections,
    fallbackOperatorIdBySlotKeyByGroup:
      automaticSelection.fallbackOperatorIdBySlotKeyByGroup,
    controlCenterOperatorIds: input.controlCenterOperatorIds,
    controlCenterSegments: input.controlCenterSegments,
    ownedOperators: input.ownedOperators,
    layoutData: input.layoutData,
    idleFillOperators: input.idleFillOperators,
    fiammettaRecovery: input.fiammettaRecovery,
    fiammettaControlUsage: input.fiammettaControlUsage,
    onProgress: input.onProgress,
  });

  reportProgress("L72");
  const resourceSuiteResult = reinforceRiicPerceptionResourceSuite({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    tailFillResult,
    controlCenterOperatorIds: input.controlCenterOperatorIds,
    ownedOperators: input.ownedOperators,
    layoutData: input.layoutData,
    idleFillOperators: input.idleFillOperators,
    fiammettaRecovery: input.fiammettaRecovery,
    fiammettaControlUsage: input.fiammettaControlUsage,
    controlCenterRuntimeContext: input.controlCenterRuntimeContext,
  });

  reportProgress("L73");
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
      excludedOperatorIds: getRiicReservedDormitorySupportOperatorIds({
        selectedEntries: finalRoomTeams.map((team) => ({
          scope: { roomType: team.facility },
          candidate: { operatorIds: team.operatorIds },
        })),
        ownedOperators: input.ownedOperators,
        layoutData: input.layoutData,
      }),
      excludedOperatorIdsByTeamIndex:
        input.controlCenterLateFillExcludedOperatorIdsByTeamIndex,
      idleFillOperators: input.idleFillOperators,
      ownedOperators: input.ownedOperators,
      fiammettaRecovery: input.fiammettaRecovery,
    });

  const optimizedTailFillResult = optimizeRiicFallbackSameShift({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    tailFillResult: resourceSuiteResult.tailFillResult,
    selectedRoomTeams: finalRoomTeams,
    controlState: controlCenterReconciliation.controlState,
    ownedOperators: input.ownedOperators,
    fiammettaRecovery: input.fiammettaRecovery,
  });
  const optimizedRoomTeams = buildRiicFinalSelectedRoomTeams({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    tailFillResult: optimizedTailFillResult,
  });
  const finalTailFillResult = controlCenterReconciliation.status === "ready"
    ? optimizeRiicTradingTeamRotations({
        tailFillResult: optimizedTailFillResult,
        selectedRoomTeams: optimizedRoomTeams,
        controlState: controlCenterReconciliation.controlState,
        ownedOperators: input.ownedOperators,
        fiammettaRecovery: input.fiammettaRecovery,
      })
    : optimizedTailFillResult;

  return {
    automaticSelection,
    tailFillResult,
    resourceSuiteResult: { ...resourceSuiteResult, tailFillResult: finalTailFillResult },
    controlCenterReconciliation,
  };
}
