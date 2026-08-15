import {
  buildRiicAutomaticRoomGroupSelections,
} from "./l70-automatic-room-selection.js";
import {
  buildRiicTailFillResult,
} from "./l71-idle-fill.js";
import {
  reinforceRiicPerceptionResourceSuite,
} from "./l72-resource-suite-reinforcement.js";

function runRiicAutomaticSchedule(input = {}) {
  const automaticSelection = buildRiicAutomaticRoomGroupSelections({
    groups: input.groups,
    candidateStatesByGroupId: input.candidateStatesByGroupId,
    controlCenterOperatorIds: input.controlCenterOperatorIds,
    controlCenterRuntimeContext: input.controlCenterRuntimeContext,
    selectionBeamLimit: input.selectionBeamLimit,
    selectionOptionLimit: input.selectionOptionLimit,
    selectionRepresentativeLimit: input.selectionRepresentativeLimit,
    selectionBatchSize: input.selectionBatchSize,
    fallbackPlanLimit: input.fallbackPlanLimit,
    ownedOperators: input.ownedOperators,
    controlCenterSegments: input.controlCenterSegments,
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

  return {
    automaticSelection,
    tailFillResult,
    resourceSuiteResult,
  };
}

self.onmessage = (event) => {
  const { requestId, input } = event?.data || {};

  try {
    self.postMessage({
      requestId,
      result: runRiicAutomaticSchedule(input),
    });
  } catch (error) {
    self.postMessage({
      requestId,
      error:
        error instanceof Error
          ? error.message
          : "后台排班计算失败",
    });
  }
};
