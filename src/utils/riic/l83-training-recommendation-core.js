import RIIC_BASELINE_SKILL_RULES from "../../static/json/tools/R00-baseline.json";
import RIIC_CONTROL_CENTER_SKILLS from "../../static/json/tools/riic-candidates/R50-control.json";
import {
  createRiicIdealTrainingRoster,
  resolveRiicBaselineSkills,
} from "./l00-baseline-resolver.js";
import {
  buildRiicControlCenterCandidateOperators,
} from "./l50-control-candidates.js";
import {
  applyRiicControlCenterManualOverrides,
  buildRiicControlCenterAutomaticRoleState,
} from "./l50-control-planner.js";
import {
  buildRiicControlCenterRuntimeContext,
} from "./l51-control-effects.js";
import {
  createRiicRoomGroupCandidateState,
} from "./l60-room-group-state.js";
import {
  evaluateRiicControlCenterScenarios,
} from "./l40-control-trial.js";
import {
  getRiicIdleFillOperators,
} from "./l71-idle-fill.js";
import {
  runRiicAutomaticSchedule,
} from "./l70-scheduler-core.js";
import {
  getRiicScheduleTrainingRecommendations,
} from "./l83-training-recommendations.js";
import {
  materializeRiicRoomTeamCandidate,
  mergeRiicIndividualRoomTeamCandidates,
} from "./l62-room-team-materializer.js";
import { buildRiicSchedulePreview } from "../riicSchedulePreview.js";
import { buildRiicMaaScheduleFromPreview } from "../riicScheduleExport.js";
import { settleRiicMaaScheduleEfficiency } from "./l79-preview-efficiency-settlement.js";
import { summarizeRiicActualSchedule } from "./l80-actual-settlement.js";

function getPublicSkillOperatorIds({
  roster,
  idealTrainingRaritySelection,
}) {
  const resolvedSkills = resolveRiicBaselineSkills(
    roster,
    RIIC_BASELINE_SKILL_RULES,
    {
      trainingMode: "ideal",
      idealTrainingRaritySelection,
    },
  );

  return new Set(
    (resolvedSkills.operators || [])
      .filter((operator) =>
        (operator.activeRules || []).some(
          (rule) => rule?.effect?.product === "all",
        ),
      )
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );
}

function getControlCenterFiammettaUsage(controlState, recovery) {
  const targetOperatorId = String(recovery?.targetOperatorId || "").trim();
  if (!recovery?.enabled || !targetOperatorId) {
    return {
      selectionCount: 0,
      stateIndexes: [],
    };
  }

  const teamIndexes = new Set();
  const stateIndexes = new Set();
  for (const segment of controlState?.segments || []) {
    if (!(segment?.operatorIds || []).includes(targetOperatorId)) {
      continue;
    }

    const teamIndex = Number(segment?.teamIndex);
    if (Number.isInteger(teamIndex) && teamIndex >= 0) {
      teamIndexes.add(teamIndex);
    }

    const stateIndex = Number(segment?.index);
    if (Number.isInteger(stateIndex) && stateIndex >= 0) {
      stateIndexes.add(stateIndex);
    }
  }

  return {
    selectionCount: teamIndexes.size,
    stateIndexes: [...stateIndexes].sort((left, right) => left - right),
  };
}

function getSelectedTrainingCandidates({
  groups,
  candidateStatesByGroupId,
  tailFillResult,
}) {
  return (groups || []).flatMap((group) => {
    if (group?.facility === "meeting") {
      return [];
    }

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
              segments: [
                {
                  stationAssignments: [
                    {
                      candidate: {
                        ...candidate,
                        fallback: {
                          ...candidate.fallback,
                          operators: fallbackOperators,
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ];
        },
      ),
    );
  });
}

export function runRiicTrainingRecommendationTrial(input = {}) {
  const idealTraining = createTrialRoster(input);
  const idealOperators = idealTraining.operators;
  if (idealOperators.length === 0) {
    return {
      status: "requiresOperators",
      requirements: [],
    };
  }

  const idleFillOperators = getRiicIdleFillOperators({
    roster: idealOperators,
    unlockAllSkills: true,
  });
  const controlCenterCandidates = buildRiicControlCenterCandidateOperators({
    roster: idealOperators,
    skills: RIIC_CONTROL_CENTER_SKILLS.skills,
    layoutData: input.layoutData,
    trainingMode: "ideal",
    idealTrainingRaritySelection: input.idealTrainingRaritySelection,
    idleFillOperators,
  });
  const scenarioTrials = evaluateRiicControlCenterScenarios({
    skills: RIIC_CONTROL_CENTER_SKILLS.skills,
    ownedOperators: idealOperators,
    layoutData: input.layoutData,
    trainingMode: "ideal",
    idealTrainingRaritySelection: input.idealTrainingRaritySelection,
  });
  const automaticControlState = buildRiicControlCenterAutomaticRoleState({
    staffingRequirement: input.controlCenterStaffingRequirement,
    roomGroup: input.controlRoomGroup,
    hasRoster: true,
    candidates: controlCenterCandidates,
    roleDefinitions: input.controlCenterRoleDefinitions,
    scenarioTrials,
    fiammettaRecovery: input.fiammettaRecovery,
  });
  const controlState = applyRiicControlCenterManualOverrides({
    automaticState: automaticControlState,
    manualOverrides: input.manualControlCenterOverrides,
    candidates: controlCenterCandidates,
    roleDefinitions: input.controlCenterRoleDefinitions,
    scenarioTrials,
    fiammettaRecovery: input.fiammettaRecovery,
  });
  const controlCenterRuntimeContext = buildRiicControlCenterRuntimeContext({
    controlState,
  });
  const publicSkillOperatorIds = getPublicSkillOperatorIds({
    roster: idealOperators,
    idealTrainingRaritySelection: input.idealTrainingRaritySelection,
  });
  const candidateStatesByGroupId = Object.fromEntries(
    (input.groups || []).map((group) => [
      group.id,
      createRiicRoomGroupCandidateState({
        group,
        roster: idealOperators,
        currentOwnedOperators: input.currentOwnedOperators,
        shiftMode: input.shiftMode,
        twoShiftRotationMode: input.twoShiftRotationMode,
        catalogsByKey: input.catalogsByKey,
        operatorNameToCharId: input.operatorNameToCharId,
        publicSkillOperatorIds,
        layoutData: input.layoutData,
        trainingMode: "ideal",
        idealTrainingRaritySelection: input.idealTrainingRaritySelection,
        controlCenterRuntimeContext,
        idleFillOperators,
      }),
    ]),
  );
  const unavailableGroupIds = Object.entries(candidateStatesByGroupId)
    .filter(([, state]) => state?.status !== "ready")
    .map(([groupId]) => groupId);
  if (unavailableGroupIds.length > 0) {
    return {
      status: "unavailable",
      requirements: [],
      unavailableGroupIds,
    };
  }

  const fiammettaControlUsage = getControlCenterFiammettaUsage(
    controlState,
    input.fiammettaRecovery,
  );
  const workerResult = runRiicAutomaticSchedule({
    groups: input.groups,
    candidateStatesByGroupId,
    controlCenterOperatorIds: controlState.operatorIds,
    controlCenterState: controlState,
    controlCenterRuntimeContext,
    layoutData: input.layoutData,
    selectionBeamLimit: input.selectionBeamLimit,
    selectionOptionLimit: input.selectionOptionLimit,
    selectionRepresentativeLimit: input.selectionRepresentativeLimit,
    selectionBatchSize: input.selectionBatchSize,
    fallbackPlanLimit: input.fallbackPlanLimit,
    ownedOperators: idealOperators,
    controlCenterSegments: controlState.segments,
    manualControlCenterOperatorIdsByTeamIndex:
      input.manualControlCenterOperatorIdsByTeamIndex,
    controlCenterLateFillExcludedOperatorIdsByTeamIndex:
      input.controlCenterLateFillExcludedOperatorIdsByTeamIndex,
    fiammettaRecovery: {
      ...input.fiammettaRecovery,
      usedStateIndexes: fiammettaControlUsage.stateIndexes,
    },
    idleFillOperators,
    fiammettaControlUsage,
    collectPlanningDebug: false,
  });
  const tailFillResult = workerResult?.resourceSuiteResult?.tailFillResult;
  if (!tailFillResult) {
    return {
      status: "unavailable",
      requirements: [],
      unavailableGroupIds: [],
    };
  }

  return {
    status: "ready",
    operators: idealOperators,
    requirements: getRiicScheduleTrainingRecommendations({
      scheduleCandidates: getSelectedTrainingCandidates({
        groups: input.groups,
        candidateStatesByGroupId,
        tailFillResult,
      }),
      ownedOperators: input.currentOwnedOperators,
      matchingOperators: idealOperators,
      operatorNameToCharId: input.operatorNameToCharId,
    }),
    candidateStatesByGroupId,
    tailFillResult,
    controlState,
  };
}

function createTrialRoster(input) {
  const operators = (input.schedulingOperators || []).map((operator) => {
    if (input.trialOperatorId !== operator?.charId) {
      return operator;
    }

    return {
      ...operator,
      elite: Number(input.trialRequired?.elite ?? operator.elite),
      level: Number(input.trialRequired?.level ?? operator.level),
    };
  });

  if (input.trialOperatorId) {
    return {
      operators,
      currentOperators: input.schedulingOperators || [],
      upgradeRequirements: [],
      summary: {},
    };
  }

  return createRiicIdealTrainingRoster(
    operators,
    RIIC_BASELINE_SKILL_RULES,
    input.idealTrainingRaritySelection,
  );
}

function buildTrialRoomCandidate({ group, state, tailFillResult }) {
  if (state?.status !== "ready") {
    return null;
  }

  const segments = (state.staffingRequirement?.segmentHours || []).map(
    (durationHours, segmentIndex) => {
      const stationAssignments = [];
      for (const cohort of state.cohorts || []) {
        const selectedKeys =
          tailFillResult?.selections?.[group.id]?.[cohort.id] || [];
        const selectedCandidates = selectedKeys
          .map((key) => (cohort.candidates || []).find((candidate) => candidate.key === key))
          .filter(Boolean);
        const rotation = cohort.rotationSegments?.[segmentIndex];

        for (const assignment of rotation?.assignments || []) {
          const indexes = Array.isArray(assignment.candidateIndexes)
            ? assignment.candidateIndexes
            : [assignment.teamIndex];
          const materialized = indexes.map((index) => {
            const source = selectedCandidates[index];
            if (!source) {
              return {
                operatorIds: [],
                operators: [],
                fallback: { count: cohort.slotCount || 0, operators: [] },
              };
            }
            const selectionKey = `${cohort.id}:${index}`;
            const fallback =
              tailFillResult?.fallbackOperatorsBySelectionKeyByGroup?.[
                group.id
              ]?.[selectionKey] || [];
            return materializeRiicRoomTeamCandidate(source, fallback);
          });
          const candidate =
            cohort.selectionMode === "individual"
              ? mergeRiicIndividualRoomTeamCandidates(materialized)
              : materialized[0];
          stationAssignments.push({
            stationIndex: assignment.stationIndex,
            stationLevel: cohort.stationLevel,
            expectedSlots: cohort.slotCount,
            candidate,
          });
        }
      }

      return { durationHours, stationAssignments };
    },
  );

  return {
    key: `${group.id}:training-impact`,
    segments,
  };
}

function buildTrialScheduleCandidate({ input, candidateStatesByGroupId, tailFillResult, controlState }) {
  const groups = (input.groups || []).flatMap((group) => {
    const candidate = buildTrialRoomCandidate({
      group,
      state: candidateStatesByGroupId?.[group.id],
      tailFillResult,
    });
    return candidate
      ? [{
          groupId: group.id,
          groupLabel: group.label,
          facility: group.facility,
          candidateKey: candidate.key,
          candidate,
        }]
      : [];
  });

  const controlGroup = input.controlRoomGroup;
  if (controlGroup && controlState?.status === "ready") {
    groups.unshift({
      groupId: controlGroup.id,
      groupLabel: controlGroup.label,
      facility: controlGroup.facility,
      candidateKey: `${controlGroup.id}:training-impact-control`,
      candidate: {
        key: `${controlGroup.id}:training-impact-control`,
        segments: (controlState.segments || []).map((segment) => ({
          index: segment.index,
          durationHours: segment.durationHours,
          stationAssignments: [{
            stationIndex: 0,
            stationLevel: controlGroup.stations?.[0]?.stationLevel || 5,
            expectedSlots: controlGroup.stations?.[0]?.slotCount || 5,
            candidate: {
              operatorIds: segment.operatorIds || [],
              operators: segment.operators || [],
              corePercent: 100,
              totalPercent: 100,
            },
          }],
        })),
      },
    });
  }

  return { key: `training-impact:${Date.now()}`, groups };
}

export function runRiicTrainingImpactTrials(input = {}) {
  const requirements = input.requirements || [];
  const baseline = calculateTrialYield({
    schedule: input.baselineSchedule,
    operatorProfiles: input.baselineOperatorProfiles,
    droneTargetKeysByState: input.droneTargetKeysByState,
    droneOrdersByState: input.droneOrdersByState,
    orundumCraftMaterial: input.orundumCraftMaterial,
  });

  return requirements.map((requirement) => {
    try {
      const result = runRiicTrainingRecommendationTrial({
        ...input,
        trialOperatorId: requirement.charId,
        trialRequired: requirement.required,
      });
      if (result.status !== "ready") {
        return {
          charId: requirement.charId,
          status: result.status || "unavailable",
          error: "试算排班未完成",
        };
      }

      const schedule = buildTrialMaaSchedule({
        input,
        scheduleCandidate: buildTrialScheduleCandidate({
          input,
          candidateStatesByGroupId: result.candidateStatesByGroupId,
          tailFillResult: result.tailFillResult,
          controlState: result.controlState,
        }),
      });
      const trialYield = calculateTrialYield({
        schedule,
        operatorProfiles: createTrialOperatorProfiles(result.operators),
        droneTargetKeysByState: input.droneTargetKeysByState,
        droneOrdersByState: input.droneOrdersByState,
        orundumCraftMaterial: input.orundumCraftMaterial,
      });
      const delta = calculateYieldDelta(baseline?.yield, trialYield?.yield);

      return {
        charId: requirement.charId,
        name: requirement.name,
        required: requirement.required,
        status: "ready",
        delta,
        yield: trialYield?.yield || null,
      };
    } catch (error) {
      return {
        charId: requirement.charId,
        name: requirement.name,
        status: "error",
        error: error instanceof Error ? error.message : "单项试算失败",
      };
    }
  });
}

function createTrialOperatorProfiles(operators = []) {
  return (operators || []).map((operator) => ({
    charId: operator?.charId,
    elite: Number.isInteger(Number(operator?.elite)) ? Number(operator.elite) : null,
    level: Number.isInteger(Number(operator?.level)) ? Number(operator.level) : null,
  })).filter((operator) => operator.charId);
}

function buildTrialMaaSchedule({ input, scheduleCandidate }) {
  const preview = buildRiicSchedulePreview({
    scheduleCandidate,
    roomGroups: [input.controlRoomGroup, ...(input.groups || [])].filter(Boolean),
    staticRooms: input.staticRooms || [],
    stateOrder: input.stateOrder || [],
    roomOperatorOverrides: input.roomOperatorOverrides || {},
    productOverrides: input.productOverrides || {},
    invalidatedRoomKeys: input.invalidatedRoomKeys || {},
    stickyOperatorIds: input.stickyOperatorIds || [],
    shiftGroupBindings: input.shiftGroupBindings || [],
  });
  if (!preview) {
    throw new Error("试算排班无法生成预览");
  }

  return buildRiicMaaScheduleFromPreview({
    preview,
    shifts: input.shifts || [],
    shiftMode: input.shiftMode,
    title: "training-impact-trial",
    roomSettingOverrides: input.roomSettingOverrides || {},
    roomIndexAssignments: input.roomIndexAssignments || {},
    hasFiammetta: input.hasFiammetta === true,
    includeRiicRoomLevels: true,
    durationSource: "preview",
  }).schedule;
}

function calculateTrialYield({
  schedule,
  operatorProfiles,
  droneTargetKeysByState,
  droneOrdersByState,
  orundumCraftMaterial,
} = {}) {
  if (!schedule) {
    return null;
  }

  const l79 = settleRiicMaaScheduleEfficiency({
    schedule,
    operatorProfiles,
  });
  return summarizeRiicActualSchedule({
    l79,
    droneTargetKeysByState,
    droneOrdersByState,
    orundumCraftMaterial,
  });
}

function calculateYieldDelta(baselineYield, trialYield) {
  if (!baselineYield || !trialYield) {
    return null;
  }

  const baselineResources = Object.fromEntries(
    (baselineYield.resources || []).map((item) => [
      item.resource,
      item,
    ]),
  );
  return (trialYield.resources || []).map((item) => {
    const baseline = baselineResources[item.resource];
    const calculated =
      baseline?.isCalculated === true && item?.isCalculated === true;
    return {
      key: item.resource,
      label: item.label,
      value: calculated
        ? Number(item.outputPerDay) - Number(baseline.outputPerDay)
        : null,
      unit: item.unit,
    };
  });
}
