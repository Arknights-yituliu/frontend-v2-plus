// Workspace persistence is split by lifecycle so generated results do not
// become indistinguishable from source-specific configuration.
export const RIIC_WORKSPACE_SCHEMA_VERSION = 2;

export function createRiicWorkspaceSnapshot({
  sourceConfig = {},
  layoutConfig = {},
  generatedState = {},
  editState = {},
  assessmentSchedule = null,
  operatorRosterSignature = "",
  currentStep = 0,
} = {}) {
  return {
    version: RIIC_WORKSPACE_SCHEMA_VERSION,
    operatorRosterSignature,
    sourceConfig,
    layoutConfig,
    generatedState,
    editState,
    assessmentSchedule,
    currentStep,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeRiicWorkspaceSnapshot(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (value.version === RIIC_WORKSPACE_SCHEMA_VERSION) {
    return value;
  }

  // Keep old local workspaces readable. They are normalized in memory and
  // will be rewritten in the new shape after the page has loaded them.
  if (value.version !== 25 || !value.answers) {
    return null;
  }

  return createRiicWorkspaceSnapshot({
    operatorRosterSignature: value.operatorRosterSignature || "",
    currentStep: value.currentStep || 0,
    sourceConfig: {
      answers: value.answers,
      twoShiftRotationMode: value.twoShiftRotationMode,
      treatUnderleveledOperatorsAsQualified:
        value.treatUnderleveledOperatorsAsQualified,
      idealTrainingRaritySelection: value.idealTrainingRaritySelection,
      fiammettaRecoverySettings: value.fiammettaRecoverySettings,
    },
    layoutConfig: {
      layoutEntry: value.layoutEntry,
      planningMode: value.planningMode,
      selectedLayoutId: value.selectedLayoutId,
      confirmedLayoutPlan: value.confirmedLayoutPlan,
      controlCenterRoleSettings: value.controlCenterRoleSettings,
      controlCenterManualOverrides: value.controlCenterManualOverrides,
      controlCenterLateFillExcludedOperatorIdsByTeamIndex:
        value.controlCenterLateFillExcludedOperatorIdsByTeamIndex,
    },
    generatedState: {
      selectedRoomGroupTeamCandidateKeys:
        value.selectedRoomGroupTeamCandidateKeys,
      roomGroupFallbackQueueStates: value.roomGroupFallbackQueueStates,
      lastAutomaticGenerationTriggerKey:
        value.lastAutomaticGenerationTriggerKey,
    },
    editState: {
      scheduleExecutionSettings: value.scheduleExecutionSettings,
      scheduleRoomOperatorOverrides: value.scheduleRoomOperatorOverrides,
      scheduleRoomProductOverrides: value.scheduleRoomProductOverrides,
      invalidatedScheduleRoomKeys: value.invalidatedScheduleRoomKeys,
      scheduleRoomMaaSettingOverrides: value.scheduleRoomMaaSettingOverrides,
      scheduleRoomMaaIndexAssignments: value.scheduleRoomMaaIndexAssignments,
    },
    assessmentSchedule: value.assessmentSchedule || null,
  });
}

