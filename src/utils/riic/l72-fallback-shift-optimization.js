import BASELINE from "../../static/json/tools/R00-baseline.json";
import { settleRiicMaaScheduleEfficiency } from "./l79-preview-efficiency-settlement.js";
import { summarizeRiicActualSchedule } from "./l80-actual-settlement.js";
import { buildRiicControlCenterRuntimeContext, getRiicControlCenterRoomAdjustment } from "./l51-control-effects.js";
import { getActiveRosterBonusHours, getRiicSameShiftBindingAtHour, summarizeCandidateBindings } from "./l74-same-shift-bindings.js";
import { RIIC_ACTIVE_ROSTER_RUNTIME_RULES, RIIC_ACTIVE_ROSTER_SELECTION_PRIORITY_RULES } from "./riic-active-roster-rule-data.js";

const EPSILON = 1e-9;
const SCORED_FACILITIES = new Set(["manufacture", "trading", "power", "meeting", "hire"]);
const SETTLEMENT_FACILITIES = new Set([...SCORED_FACILITIES, "recycle", "processing", "training", "dormitory"]);

function isOrdinaryManufactureOperator(operator) {
  const id = String(operator?.charId || "");
  if (!id || operator?.taggedMember || operator?.idleFill || operator?.hangerPriority) return false;
  const rules = (BASELINE.rules || []).filter((rule) => rule.charId === id && rule.roomType === "manufacture");
  if (
    !rules.length ||
    rules.some(
      (rule) =>
        rule.effect?.metric !== "production" || rule.effect?.coverage !== "complete" || rule.confidence !== "high" || (rule.ignoredMechanics || []).length > 0
    )
  )
    return false;
  if (
    [BASELINE.sameRoomRules, BASELINE.middleDataRules?.skills, BASELINE.roomStateRules].some((rules) =>
      (rules || []).some((rule) => rule.charId === id && rule.roomType === "manufacture")
    )
  )
    return false;
  return (
    !RIIC_ACTIVE_ROSTER_RUNTIME_RULES.some((rule) => rule.ownerId === id || rule.taggedOperatorIds.has(id)) &&
    !RIIC_ACTIVE_ROSTER_SELECTION_PRIORITY_RULES.some((rule) => rule.triggerOperatorId === id || rule.taggedOperatorIds.has(id))
  );
}

export function getRiicWorkPattern(team, segments) {
  const active = new Set(team.activeStateIndexes || []);
  const durations = segments.map((segment, index) => (active.has(index) ? Number(segment.durationHours || 0) : 0));
  const total = durations.reduce((sum, hours) => sum + hours, 0);
  let current = 0;
  let maximum = 0;
  for (const hours of [...durations, ...durations]) {
    current = hours > 0 ? current + hours : 0;
    maximum = Math.max(maximum, current);
  }
  return [total, Math.min(total, maximum)];
}

function createSchedule({ teams, controlState, namesById }) {
  const plans = (controlState?.segments || []).map((segment, index) => {
    const rooms = {
      control: [{ level: 5, operators: (segment.operatorIds || []).map((id) => namesById.get(id) || "") }],
    };
    const roomsByStation = new Map();
    for (const [teamIndex, team] of teams.entries()) {
      if (!(team.activeStateIndexes || []).includes(index)) continue;
      const facility = team.facility === "office" ? "hire" : team.facility;
      if (!SETTLEMENT_FACILITIES.has(facility)) continue;
      const stationIndex = team.stationIndexByStateIndex?.[index];
      const key = stationIndex == null ? `team:${teamIndex}` : `${team.groupId}:${stationIndex}`;
      const room = roomsByStation.get(key) || {
        facility,
        level: team.stationLevel,
        product: team.product,
        operators: [],
      };
      room.operators.push(...team.operatorIds.map((id) => namesById.get(id) || ""));
      roomsByStation.set(key, room);
    }
    for (const { facility, ...room } of roomsByStation.values()) {
      (rooms[facility] ||= []).push(room);
    }
    return { duration: Number(segment.durationHours || 0) * 60, rooms };
  });
  return { plans };
}

export function evaluateRiicSelectedRoomTeams({ teams, controlState, ownedOperators, orundumCraftMaterial = "orirock", includeDroneOutput = false }) {
  const namesById = new Map((ownedOperators || []).map((operator) => [operator.charId, operator.name]));
  const schedule = createSchedule({ teams, controlState, namesById });
  if (
    schedule.plans.some((plan) =>
      Object.values(plan.rooms)
        .flat()
        .some((room) => !room.level || room.operators.some((name) => !name))
    )
  )
    return null;
  const result = settleRiicMaaScheduleEfficiency({ schedule, operatorProfiles: ownedOperators, orundumCraftMaterial });
  const issues = new Set(
    (result.issues || []).map(
      (issue) => `${issue.code}:${issue.planIndex}:${issue.facility}:${issue.index}:${issue.operatorId || ""}:${issue.operatorName || ""}`
    )
  );
  const values = new Map();
  const grossResources = new Map();
  const roomValues = new Map();
  const roomResources = new Map();
  for (const state of result.states || []) {
    for (const room of state.rooms || []) {
      for (const [resource, rate] of Object.entries(room.l79Settlement?.hourly || {})) {
        if (Number(rate) > 0) {
          const amount = Number(rate) * Number(state.durationHours || 0);
          const roomKey = `${room.facility}:${room.index}:${resource}`;
          grossResources.set(resource, Number(grossResources.get(resource) || 0) + amount);
          roomResources.set(roomKey, Number(roomResources.get(roomKey) || 0) + amount);
        }
      }
      if (!SCORED_FACILITIES.has(room.facility)) continue;
      if (typeof room.efficiency !== "number" || !Number.isFinite(room.efficiency)) return null;
      const key = `${room.facility}:${room.product || "all"}:${room.stationLevel}`;
      values.set(key, Number(values.get(key) || 0) + Number(room.efficiency) * Number(state.durationHours || 0));
      const roomKey = `${room.facility}:${room.index}`;
      roomValues.set(roomKey, Number(roomValues.get(roomKey) || 0) + Number(room.efficiency) * Number(state.durationHours || 0));
    }
  }
  let droneOutputPerCycle = 0;
  if (includeDroneOutput) {
    const actual = summarizeRiicActualSchedule({ l79: result, orundumCraftMaterial });
    droneOutputPerCycle = Number(actual.yield?.droneCharge?.droneOutputPerCycle || 0);
  }
  return { values, issues, grossResources, droneOutputPerCycle, roomValues, roomResources };
}

export function compareRiicSelectedRoomTeamResults(before, after) {
  if (!before || !after || [...after.issues].some((issue) => !before.issues.has(issue))) return false;
  const keys = new Set([...before.values.keys(), ...after.values.keys()]);
  if ([...keys].some((key) => Number(after.values.get(key) || 0) + EPSILON < Number(before.values.get(key) || 0))) return false;
  return [...keys].reduce((sum, key) => sum + Number(after.values.get(key) || 0) - Number(before.values.get(key) || 0), 0) > EPSILON;
}

function hasNewRoomConflicts(beforeTeams, afterTeams, controlState) {
  const countAt = (teams, index) => {
    const counts = new Map();
    const ids = [
      ...(controlState.segments[index]?.operatorIds || []),
      ...teams.filter((team) => team.activeStateIndexes.includes(index)).flatMap((team) => team.operatorIds || []),
    ];
    for (const id of ids) counts.set(id, Number(counts.get(id) || 0) + 1);
    return counts;
  };
  return controlState.segments.some((_, index) => {
    const before = countAt(beforeTeams, index);
    return [...countAt(afterTeams, index)].some(([id, count]) => count > Math.max(1, before.get(id) || 0));
  });
}

// Refine the assembled timeline: a group-wide rotation cannot move one station
// independently while keeping the other stations on their existing shifts.
export function optimizeRiicAssembledTradingShifts({ alignment, ownedOperators = [], lockedOperatorIds = [], fiammettaRecovery, hasManualOverrides = false } = {}) {
  const entries = alignment?.groupEntries || [];
  const controlEntry = entries.find((entry) => entry.group?.facility === "control");
  const controlSegments = controlEntry?.candidate?.segments || [];
  if (hasManualOverrides || controlSegments.length !== 3 || entries.some((entry) =>
    entry.candidate?.segments?.length !== controlSegments.length ||
    entry.candidate.segments.some((segment, index) => Number(segment.durationHours) !== Number(controlSegments[index].durationHours))
  )) return alignment;

  const controlState = {
    status: "ready",
    segments: controlSegments.map((segment) => ({
      durationHours: segment.durationHours,
      operatorIds: segment.stationAssignments?.flatMap((assignment) => assignment.candidate?.operatorIds || []) || [],
    })),
  };
  const toTeams = (groupEntries) => groupEntries.flatMap(({ group, candidate }) =>
    group.facility === "control" ? [] : candidate.segments.flatMap((segment, index) =>
      (segment.stationAssignments || []).map((assignment) => ({
        groupId: group.id,
        facility: group.facility,
        product: group.candidateProduct,
        stationLevel: assignment.stationLevel,
        stationIndexByStateIndex: { [index]: assignment.stationIndex },
        activeStateIndexes: [index],
        operatorIds: assignment.candidate?.operatorIds || [],
      }))
    )
  );
  const originalTeams = toTeams(entries);
  const workPattern = (teams, id) => getRiicWorkPattern({
    activeStateIndexes: controlSegments.flatMap((_, index) =>
      controlState.segments[index].operatorIds.includes(id) || teams.some((team) => team.activeStateIndexes.includes(index) && team.operatorIds.includes(id)) ? [index] : []
    ),
  }, controlState.segments);
  const locked = new Set(lockedOperatorIds);
  const targetId = fiammettaRecovery?.enabled ? fiammettaRecovery.targetOperatorId : "";
  const baselineRosterBonus = getActiveRosterBonusHours({ groupEntries: entries, ownedOperators });
  let baseline = null;
  let best = null;

  for (const [entryIndex, entry] of entries.entries()) {
    if (entry.group?.facility !== "trading" || entry.group?.manualControl) continue;
    const segments = entry.candidate.segments;
    for (let left = 0; left < segments.length; left += 1) {
      for (let right = left + 1; right < segments.length; right += 1) {
        if (Number(segments[left].durationHours) !== Number(segments[right].durationHours)) continue;
        for (const leftAssignment of segments[left].stationAssignments || []) {
          const rightAssignment = (segments[right].stationAssignments || []).find((assignment) => assignment.stationIndex === leftAssignment.stationIndex);
          if (!rightAssignment || leftAssignment.stationLevel !== rightAssignment.stationLevel ||
            leftAssignment.candidate?.selectionMode === "individual" || rightAssignment.candidate?.selectionMode === "individual") continue;
          const leftIds = leftAssignment.candidate?.operatorIds || [];
          const rightIds = rightAssignment.candidate?.operatorIds || [];
          if (leftIds.length !== rightIds.length) continue;
          const changedIds = [...new Set([...leftIds, ...rightIds])].filter((id) => leftIds.includes(id) !== rightIds.includes(id));
          if (!changedIds.length || changedIds.some((id) => locked.has(id) || id === targetId)) continue;

          const nextSegments = segments.map((segment, index) => ({
            ...segment,
            stationAssignments: (segment.stationAssignments || []).map((assignment) =>
              assignment === leftAssignment ? rightAssignment : assignment === rightAssignment ? leftAssignment : assignment),
          }));
          const nextCandidate = { ...entry.candidate, segments: nextSegments };
          const nextEntries = entries.map((item, index) => index === entryIndex ? { ...item, candidate: nextCandidate } : item);
          const nextTeams = toTeams(nextEntries);
          if (hasNewRoomConflicts(originalTeams, nextTeams, controlState) || changedIds.some((id) =>
            JSON.stringify(workPattern(originalTeams, id)) !== JSON.stringify(workPattern(nextTeams, id))
          )) continue;
          if (getActiveRosterBonusHours({ groupEntries: nextEntries, ownedOperators }) + EPSILON < baselineRosterBonus) continue;
          baseline ||= evaluateRiicSelectedRoomTeams({ teams: originalTeams, controlState, ownedOperators });
          if (!baseline) return alignment;
          const result = evaluateRiicSelectedRoomTeams({ teams: nextTeams, controlState, ownedOperators });
          if (!compareRiicSelectedRoomTeamResults(best?.result || baseline, result)) continue;
          const resources = new Set([...baseline.grossResources.keys(), ...result.grossResources.keys()]);
          if ([...resources].some((resource) => Number(result.grossResources.get(resource) || 0) + EPSILON < Number(baseline.grossResources.get(resource) || 0))) continue;
          const stationKey = `${entry.group.id}:${leftAssignment.stationIndex}`;
          const stationIndexes = controlSegments.map((_, index) => [...new Set(originalTeams
            .filter((team) => team.facility === "trading" && team.activeStateIndexes.includes(index))
            .map((team) => `${team.groupId}:${team.stationIndexByStateIndex[index]}`))].indexOf(stationKey));
          if (stationIndexes.some((index) => index < 0 || index !== stationIndexes[0])) continue;
          const changedRoom = `trading:${stationIndexes[0]}`;
          if (["roomValues", "roomResources"].some((field) =>
            [...new Set([...baseline[field].keys(), ...result[field].keys()])].some((key) =>
              key !== changedRoom && !key.startsWith(`${changedRoom}:`) &&
              Number(result[field].get(key) || 0) + EPSILON < Number(baseline[field].get(key) || 0)
            )
          )) continue;
          best = { result, nextEntries, entryIndex, left, right, stationIndex: leftAssignment.stationIndex };
        }
      }
    }
  }
  if (!best) return alignment;
  const changedEntry = best.nextEntries[best.entryIndex];
  const rotation = `${best.stationIndex}:${best.left}:${best.right}`;
  const resolvedSummary = {
    ...summarizeCandidateBindings({ controlCandidate: controlEntry.candidate, group: changedEntry.group, candidate: changedEntry.candidate }),
    groupId: changedEntry.group.id,
    rotationOffset: Number(changedEntry.candidate.sameShiftBindingOffset || 0),
  };
  changedEntry.candidate = { ...changedEntry.candidate, independentStationSwap: rotation, sameShiftBindingSummary: resolvedSummary };
  const summary = (alignment.summary || []).map((item) => item.groupId === changedEntry.group.id ? resolvedSummary : item);
  const groups = (alignment.debug?.groups || []).map((group) => group.groupId !== changedEntry.group.id ? group : {
    ...group,
    independentStationSwap: rotation,
    selected: {
      coreTeamSynergyWeightedBonus: resolvedSummary.coreTeamSynergyWeightedBonus,
      realizedBindingHours: resolvedSummary.realizedBindingHours,
      expectedBindingHours: resolvedSummary.expectedBindingHours,
      realizedWeightedBonus: resolvedSummary.realizedWeightedBonus,
      trace: resolvedSummary.trace,
    },
    attempts: (group.attempts || []).map((attempt) => ({ ...attempt, selected: false })),
  });
  return { ...alignment, groupEntries: best.nextEntries, summary, signature: `${alignment.signature || ""}|${changedEntry.group.id}:${rotation}`, debug: { ...alignment.debug, groups } };
}

export function optimizeRiicTradingTeamRotations({
  tailFillResult,
  selectedRoomTeams = [],
  controlState,
  ownedOperators = [],
  fiammettaRecovery,
} = {}) {
  if (!tailFillResult || controlState?.status !== "ready" || !(controlState.segments || []).length ||
    selectedRoomTeams.some((team) => !Array.isArray(team.activeStateIndexes))) return tailFillResult;
  let baseline = null;
  let bestResult = null;
  let bestPair = null;
  for (let leftIndex = 0; leftIndex < selectedRoomTeams.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < selectedRoomTeams.length; rightIndex += 1) {
      const left = selectedRoomTeams[leftIndex];
      const right = selectedRoomTeams[rightIndex];
      if (left.facility !== "trading" || right.facility !== "trading" ||
        left.groupId !== right.groupId || left.cohortId !== right.cohortId ||
        left.product !== right.product || left.stationLevel !== right.stationLevel ||
        left.activeStateIndexes.some((index) => right.activeStateIndexes.includes(index))) continue;
      const stations = new Set([
        ...left.activeStateIndexes.map((index) => left.stationIndexByStateIndex?.[index]),
        ...right.activeStateIndexes.map((index) => right.stationIndexByStateIndex?.[index]),
      ]);
      if (stations.size !== 1 || !Number.isInteger([...stations][0]) || [...stations][0] < 0) continue;
      const targetId = fiammettaRecovery?.enabled ? fiammettaRecovery.targetOperatorId : "";
      if (targetId && left.operatorIds.includes(targetId) !== right.operatorIds.includes(targetId)) continue;
      const nextTeams = selectedRoomTeams.map((team) => team === left
        ? { ...team, operatorIds: right.operatorIds }
        : team === right ? { ...team, operatorIds: left.operatorIds } : team);
      if (hasNewRoomConflicts(selectedRoomTeams, nextTeams, controlState)) continue;
      baseline ||= evaluateRiicSelectedRoomTeams({ teams: selectedRoomTeams, controlState, ownedOperators });
      if (!baseline) return tailFillResult;
      bestResult ||= baseline;
      const result = evaluateRiicSelectedRoomTeams({ teams: nextTeams, controlState, ownedOperators });
      if (!compareRiicSelectedRoomTeamResults(bestResult, result)) continue;
      const resources = new Set([...baseline.grossResources.keys(), ...result.grossResources.keys()]);
      if ([...resources].some((resource) => Number(result.grossResources.get(resource) || 0) + EPSILON < Number(baseline.grossResources.get(resource) || 0))) continue;
      bestResult = result;
      bestPair = [left, right];
    }
  }
  if (!bestPair) return tailFillResult;
  const [left, right] = bestPair;
  const groupId = left.groupId;
  const cohortSelections = [...tailFillResult.selections[groupId][left.cohortId]];
  [cohortSelections[left.teamIndex], cohortSelections[right.teamIndex]] = [cohortSelections[right.teamIndex], cohortSelections[left.teamIndex]];
  const originalSlots = tailFillResult.fallbackOperatorIdBySlotKeyByGroup?.[groupId] || {};
  const slots = Object.fromEntries(Object.entries(originalSlots).map(([key, id]) => {
    const leftPrefix = `${left.selectionKey}:`;
    const rightPrefix = `${right.selectionKey}:`;
    return [key.startsWith(leftPrefix) ? rightPrefix + key.slice(leftPrefix.length) : key.startsWith(rightPrefix) ? leftPrefix + key.slice(rightPrefix.length) : key, id];
  }));
  const originalFallbacks = tailFillResult.fallbackOperatorsBySelectionKeyByGroup?.[groupId] || {};
  return {
    ...tailFillResult,
    selections: { ...tailFillResult.selections, [groupId]: { ...tailFillResult.selections[groupId], [left.cohortId]: cohortSelections } },
    fallbackOperatorIdBySlotKeyByGroup: { ...tailFillResult.fallbackOperatorIdBySlotKeyByGroup, [groupId]: slots },
    fallbackOperatorsBySelectionKeyByGroup: {
      ...tailFillResult.fallbackOperatorsBySelectionKeyByGroup,
      [groupId]: { ...originalFallbacks, [left.selectionKey]: originalFallbacks[right.selectionKey] || [], [right.selectionKey]: originalFallbacks[left.selectionKey] || [] },
    },
  };
}

function getTeamEntries(groups, candidateStatesByGroupId, tailFillResult, selectedRoomTeams) {
  return selectedRoomTeams.flatMap((team) => {
    const group = groups.find((item) => item.id === team.groupId);
    const cohort = (candidateStatesByGroupId?.[team.groupId]?.cohorts || []).find((item) => item.id === team.cohortId);
    const key = tailFillResult.selections?.[team.groupId]?.[team.cohortId]?.[team.teamIndex];
    const candidate = (cohort?.candidates || []).find((item) => item.key === key);
    const operators = tailFillResult.fallbackOperatorsBySelectionKeyByGroup?.[team.groupId]?.[team.selectionKey] || [];
    return group && candidate?.isManualFallbackTeam && !(candidate.operatorIds || []).length && operators.length
      ? [{ team, group, cohort, candidate, operators }]
      : [];
  });
}

export function optimizeRiicFallbackSameShift({
  groups = [],
  candidateStatesByGroupId = {},
  tailFillResult,
  selectedRoomTeams = [],
  controlState,
  ownedOperators = [],
  fiammettaRecovery,
} = {}) {
  if (!tailFillResult || controlState?.status !== "ready" || !(controlState.segments || []).length) return tailFillResult;
  const entries = getTeamEntries(groups, candidateStatesByGroupId, tailFillResult, selectedRoomTeams);
  const controlContext = buildRiicControlCenterRuntimeContext({ controlState });
  const controlCandidate = {
    segments: controlState.segments.map((segment) => ({
      durationHours: segment.durationHours,
      stationAssignments: [{ candidate: { controlCenterTeamIndex: segment.teamIndex, operatorIds: segment.operatorIds } }],
    })),
  };
  const bonusCache = new Map();
  const getBonusHours = (operatorId, team) => {
    const key = `${team.groupId}:${team.selectionKey}:${operatorId}`;
    if (bonusCache.has(key)) return bonusCache.get(key);
    const scope = { roomType: team.facility, product: team.product };
    const adjustment = getRiicControlCenterRoomAdjustment({ context: controlContext, scope, operatorIds: [operatorId] });
    let startHour = 0;
    let bonus = 0;
    for (const [index, segment] of controlState.segments.entries()) {
      if (team.activeStateIndexes.includes(index)) {
        const status = getRiicSameShiftBindingAtHour({
          controlCandidate,
          startHour,
          candidate: { candidateScope: scope, sameShiftBindings: adjustment.sameShiftBindings },
        });
        bonus += Number(status.operatorBonusPercent || 0) * Number(segment.durationHours || 0);
      }
      startHour += Number(segment.durationHours || 0);
    }
    bonusCache.set(key, bonus);
    return bonus;
  };
  let bestTeams = selectedRoomTeams;
  let bestResult = null;
  let adopted = null;
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      if (
        left.team.groupId !== right.team.groupId ||
        left.team.cohortId !== right.team.cohortId ||
        left.team.facility !== "manufacture" ||
        JSON.stringify(getRiicWorkPattern(left.team, controlState.segments)) !== JSON.stringify(getRiicWorkPattern(right.team, controlState.segments))
      )
        continue;
      for (const leftOperator of left.operators) {
        for (const rightOperator of right.operators) {
          const leftId = leftOperator.charId;
          const rightId = rightOperator.charId;
          if (
            leftId === rightId ||
            (fiammettaRecovery?.enabled && (leftId === fiammettaRecovery.targetOperatorId || rightId === fiammettaRecovery.targetOperatorId)) ||
            !isOrdinaryManufactureOperator(leftOperator) ||
            !isOrdinaryManufactureOperator(rightOperator) ||
            !(left.candidate.fallback?.candidateOperators || []).some((operator) => operator.charId === rightId) ||
            !(right.candidate.fallback?.candidateOperators || []).some((operator) => operator.charId === leftId)
          )
            continue;
          if (
            getBonusHours(rightId, left.team) + getBonusHours(leftId, right.team) <=
            getBonusHours(leftId, left.team) + getBonusHours(rightId, right.team) + EPSILON
          )
            continue;
          const slots = tailFillResult.fallbackOperatorIdBySlotKeyByGroup?.[left.team.groupId] || {};
          const leftSlot = Object.keys(slots).find((key) => key.startsWith(`${left.team.selectionKey}:fallback:`) && slots[key] === leftId);
          const rightSlot = Object.keys(slots).find((key) => key.startsWith(`${right.team.selectionKey}:fallback:`) && slots[key] === rightId);
          if (!leftSlot || !rightSlot) continue;
          const nextTeams = selectedRoomTeams.map((team) =>
            team === left.team
              ? { ...team, operatorIds: team.operatorIds.map((id) => (id === leftId ? rightId : id)) }
              : team === right.team
                ? { ...team, operatorIds: team.operatorIds.map((id) => (id === rightId ? leftId : id)) }
                : team
          );
          bestResult ||= evaluateRiicSelectedRoomTeams({ teams: bestTeams, controlState, ownedOperators });
          if (!bestResult) return tailFillResult;
          const result = evaluateRiicSelectedRoomTeams({ teams: nextTeams, controlState, ownedOperators });
          if (compareRiicSelectedRoomTeamResults(bestResult, result)) {
            bestTeams = nextTeams;
            bestResult = result;
            adopted = { left, right, leftOperator, rightOperator, leftSlot, rightSlot };
          }
        }
      }
    }
  }
  if (!adopted) return tailFillResult;
  const { left, right, leftOperator, rightOperator, leftSlot, rightSlot } = adopted;
  const groupId = left.team.groupId;
  const assignments = tailFillResult.fallbackOperatorsBySelectionKeyByGroup[groupId];
  return {
    ...tailFillResult,
    fallbackOperatorIdBySlotKeyByGroup: {
      ...tailFillResult.fallbackOperatorIdBySlotKeyByGroup,
      [groupId]: { ...tailFillResult.fallbackOperatorIdBySlotKeyByGroup[groupId], [leftSlot]: rightOperator.charId, [rightSlot]: leftOperator.charId },
    },
    fallbackOperatorsBySelectionKeyByGroup: {
      ...tailFillResult.fallbackOperatorsBySelectionKeyByGroup,
      [groupId]: {
        ...assignments,
        [left.team.selectionKey]: left.operators.map((operator) => (operator.charId === leftOperator.charId ? rightOperator : operator)),
        [right.team.selectionKey]: right.operators.map((operator) => (operator.charId === rightOperator.charId ? leftOperator : operator)),
      },
    },
  };
}
