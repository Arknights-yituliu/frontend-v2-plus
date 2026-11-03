import {
  buildRiicControlCenterLateFillState,
  mergeRiicControlCenterLateFillState,
  removeRiicControlCenterOperators,
  swapRiicControlCenterOperatorRotations,
  swapRiicControlCenterTeamOperators,
} from "./l50-control-planner.js";
import { buildRiicControlCenterRuntimeContext, getRiicControlCenterRoomAdjustment } from "./l51-control-effects.js";
import { getRiicSameShiftBindingAtHour } from "./l74-same-shift-bindings.js";
import { compareRiicSelectedRoomTeamResults, evaluateRiicSelectedRoomTeams, getRiicWorkPattern } from "./l72-fallback-shift-optimization.js";

const EPSILON = 1e-9;

function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function normalizeTeamIndex(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function hasConditions(effect) {
  return Boolean(
    effect?.conditions && Object.keys(effect.conditions).length > 0,
  );
}

function getManualOperatorIdsByTeamIndex(value = {}) {
  return new Map(
    Object.entries(value || {}).map(([teamIndex, operatorIds]) => [
      Number(teamIndex),
      new Set(
        (operatorIds || [])
          .map(normalizeOperatorId)
          .filter(Boolean),
      ),
    ]),
  );
}

function getCapturedOperatorIds(selectedRoomTeams) {
  return new Set(
    (selectedRoomTeams || [])
      .flatMap((roomTeam) => roomTeam?.operatorIds || [])
      .map(normalizeOperatorId)
      .filter(Boolean),
  );
}

function getOperatorTargetIds(operator) {
  return new Set(
    (operator?.controlCenterResolvedEffects || [])
      .filter(
        (effect) =>
          !hasConditions(effect) && effect?.target?.scope === "operators",
      )
      .flatMap((effect) => effect?.target?.operatorIds || [])
      .map(normalizeOperatorId)
      .filter(Boolean),
  );
}

function getAutomaticEffectOperators(team = {}) {
  return [...(team?.operatorEffectOperators || [])];
}

function getRoomEffectSignature(operator) {
  const effects = (operator?.controlCenterResolvedEffects || [])
    .filter((effect) => effect?.target?.scope === "allRooms")
    .map((effect) => JSON.stringify(effect))
    .sort();
  return effects.length ? JSON.stringify(effects) : "";
}

function getControlOperatorBonusByRoom(controlState, selectedRoomTeams) {
  const context = buildRiicControlCenterRuntimeContext({ controlState });
  const controlCandidate = {
    segments: (controlState.segments || []).map((segment) => ({
      durationHours: segment.durationHours,
      stationAssignments: [
        {
          candidate: {
            controlCenterTeamIndex: segment.teamIndex,
            operatorIds: segment.operatorIds,
          },
        },
      ],
    })),
  };
  const totals = new Map();
  let startHour = 0;
  for (const [index, segment] of (controlState.segments || []).entries()) {
    for (const team of selectedRoomTeams) {
      if (!team.activeStateIndexes.includes(index)) continue;
      const scope = { roomType: team.facility, product: team.product };
      const adjustment = getRiicControlCenterRoomAdjustment({
        context,
        scope,
        operatorIds: team.operatorIds,
      });
      const status = getRiicSameShiftBindingAtHour({
        controlCandidate,
        startHour,
        group: { facility: team.facility, candidateProduct: team.product },
        candidate: { candidateScope: scope, sameShiftBindings: adjustment.sameShiftBindings },
      });
      const key = `${team.facility}:${team.product}`;
      totals.set(key, Number(totals.get(key) || 0) + Number(status.operatorBonusPercent || 0) * Number(segment.durationHours || 0));
    }
    startHour += Number(segment.durationHours || 0);
  }
  return totals;
}

function getControlOperatorWorkPattern(controlState, operatorId) {
  const segments = controlState.segments || [];
  const activeStateIndexes = segments.flatMap((segment, index) =>
    (segment.operatorIds || []).includes(operatorId) ? [index] : [],
  );
  return getRiicWorkPattern({ activeStateIndexes }, segments);
}

function optimizeControlCenterSameShift({
  controlState,
  selectedRoomTeams,
  manualIdsByTeamIndex,
  excludedOperatorIds,
  excludedOperatorIdsByTeamIndex,
  fiammettaRecovery,
  ownedOperators,
}) {
  const segments = controlState?.segments || [];
  if (selectedRoomTeams.some((team) => !Array.isArray(team.activeStateIndexes))) return controlState;
  let bestState = controlState;
  let bestScores = getControlOperatorBonusByRoom(bestState, selectedRoomTeams);
  let bestSettlement = null;
  const manualIds = new Set([...manualIdsByTeamIndex.values()].flatMap((ids) => [...ids]));
  const linkedIds = new Set(
    (controlState.teams || []).flatMap((team) =>
      [...(team.roomEffectOperators || []), ...(team.operatorEffectOperators || []), ...(team.fillerOperators || [])].flatMap((operator) => {
        const partners = [
          ...(operator.controlCenterSameTeamWithOperatorIds || []),
          ...(operator.controlCenterResolvedEffects || []).flatMap((effect) => [
            ...(effect?.conditions?.controlCoassignedOperatorIds || []),
            ...(effect?.conditions?.perControlOperatorIds || []),
          ]),
        ];
        return partners.length ? [operator.charId, ...partners] : [];
      })
    )
  );
  const protectedIds = new Set([...manualIds, ...linkedIds, fiammettaRecovery?.enabled ? fiammettaRecovery.targetOperatorId : ""]);
  const hasAssignmentConflict = (candidate, operatorIds) => candidate.segments.some((segment, index) =>
    operatorIds.some((operatorId) =>
      (segment.operatorIds || []).includes(operatorId) && (
        (excludedOperatorIdsByTeamIndex?.[segment.teamIndex] || []).includes(operatorId) ||
        selectedRoomTeams.some((team) => team.activeStateIndexes.includes(index) && (team.operatorIds || []).includes(operatorId))
      )
    )
  );
  const changesWorkPattern = (candidate, operatorIds) => operatorIds.some((operatorId) => {
    const before = getControlOperatorWorkPattern(bestState, operatorId);
    const after = getControlOperatorWorkPattern(candidate, operatorId);
    return Math.abs(before[0] - after[0]) > EPSILON || after[1] > before[1] + EPSILON;
  });
  const rotationOperators = [...new Map(segments.flatMap((segment) => segment.operators || []).map((operator) => [operator.charId, operator])).values()];
  for (let leftIndex = 0; leftIndex < rotationOperators.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < rotationOperators.length; rightIndex += 1) {
      const left = rotationOperators[leftIndex];
      const right = rotationOperators[rightIndex];
      const signature = getRoomEffectSignature(left);
      if (
        !left?.charId || !right?.charId || protectedIds.has(left.charId) || protectedIds.has(right.charId) ||
        (excludedOperatorIds || []).includes(left.charId) || (excludedOperatorIds || []).includes(right.charId) ||
        !signature || signature !== getRoomEffectSignature(right) ||
        bestState.segments.some((segment) => (segment.operatorIds || []).includes(left.charId) === (segment.operatorIds || []).includes(right.charId))
      ) continue;
      const candidate = swapRiicControlCenterOperatorRotations({ baseState: bestState, leftOperatorId: left.charId, rightOperatorId: right.charId });
      if (!candidate) continue;
      if (hasAssignmentConflict(candidate, [left.charId, right.charId])) continue;
      if (changesWorkPattern(candidate, [left.charId, right.charId])) continue;
      const scores = getControlOperatorBonusByRoom(candidate, selectedRoomTeams);
      const keys = new Set([...bestScores.keys(), ...scores.keys()]);
      if ([...keys].some((key) => Number(scores.get(key) || 0) + EPSILON < Number(bestScores.get(key) || 0))) continue;
      const improvement = [...keys].reduce((total, key) => total + Number(scores.get(key) || 0) - Number(bestScores.get(key) || 0), 0);
      if (improvement <= EPSILON) continue;
      bestSettlement ||= evaluateRiicSelectedRoomTeams({ teams: selectedRoomTeams, controlState: bestState, ownedOperators });
      const settlement = evaluateRiicSelectedRoomTeams({ teams: selectedRoomTeams, controlState: candidate, ownedOperators });
      if (!compareRiicSelectedRoomTeamResults(bestSettlement, settlement)) continue;
      bestState = candidate;
      bestScores = scores;
      bestSettlement = settlement;
    }
  }
  for (let leftIndex = 0; leftIndex < segments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < segments.length; rightIndex += 1) {
      const leftSegment = bestState.segments[leftIndex];
      const rightSegment = bestState.segments[rightIndex];
      if (
        Number(leftSegment.durationHours) !== Number(rightSegment.durationHours) ||
        Number(leftSegment.teamIndex) === Number(rightSegment.teamIndex) ||
        segments.filter((segment) => Number(segment.teamIndex) === Number(leftSegment.teamIndex)).length !== 1 ||
        segments.filter((segment) => Number(segment.teamIndex) === Number(rightSegment.teamIndex)).length !== 1
      )
        continue;
      const leftTeamIndex = Number(leftSegment.teamIndex);
      const rightTeamIndex = Number(rightSegment.teamIndex);
      for (const left of leftSegment.operators || []) {
        for (const right of rightSegment.operators || []) {
          const signature = getRoomEffectSignature(left);
          if (
            !left?.charId ||
            !right?.charId ||
            protectedIds.has(left.charId) ||
            protectedIds.has(right.charId) ||
            (excludedOperatorIds || []).includes(left.charId) ||
            (excludedOperatorIds || []).includes(right.charId) ||
            !signature ||
            signature !== getRoomEffectSignature(right) ||
            (excludedOperatorIdsByTeamIndex?.[leftTeamIndex] || []).includes(right.charId) ||
            (excludedOperatorIdsByTeamIndex?.[rightTeamIndex] || []).includes(left.charId)
          )
            continue;
          const candidate = swapRiicControlCenterTeamOperators({
            baseState: bestState,
            leftTeamIndex,
            rightTeamIndex,
            leftOperatorId: left.charId,
            rightOperatorId: right.charId,
          });
          if (!candidate) continue;
          if (hasAssignmentConflict(candidate, [left.charId, right.charId])) continue;
          if (changesWorkPattern(candidate, [left.charId, right.charId])) continue;
          const scores = getControlOperatorBonusByRoom(candidate, selectedRoomTeams);
          const keys = new Set([...bestScores.keys(), ...scores.keys()]);
          if ([...keys].some((key) => Number(scores.get(key) || 0) + EPSILON < Number(bestScores.get(key) || 0))) continue;
          const improvement = [...keys].reduce((total, key) => total + Number(scores.get(key) || 0) - Number(bestScores.get(key) || 0), 0);
          if (improvement > EPSILON) {
            bestSettlement ||= evaluateRiicSelectedRoomTeams({ teams: selectedRoomTeams, controlState: bestState, ownedOperators });
            const settlement = evaluateRiicSelectedRoomTeams({ teams: selectedRoomTeams, controlState: candidate, ownedOperators });
            if (!compareRiicSelectedRoomTeamResults(bestSettlement, settlement)) continue;
            bestState = candidate;
            bestScores = scores;
            bestSettlement = settlement;
          }
        }
      }
    }
  }
  return bestState;
}

/**
 * L73: withdraw automatic control-center operators whose linked operators
 * were not captured, then refill only the resulting control-center vacancies.
 */
export function reconcileRiicControlCenterAfterRoomSelection({
  controlState,
  selectedRoomTeams = [],
  selectionReady = true,
  manualOperatorIdsByTeamIndex = {},
  excludedOperatorIds = [],
  excludedOperatorIdsByTeamIndex = {},
  idleFillOperators = [],
  ownedOperators = [],
  fiammettaRecovery = null,
} = {}) {
  if (controlState?.status !== "ready" || selectionReady !== true) {
    return {
      status:
        controlState?.status !== "ready"
          ? controlState?.status || "unavailable"
          : "waitingForRoomSelection",
      controlState,
      lateFillState: null,
      removedOperatorIdsByTeamIndex: {},
      decisions: [],
    };
  }

  const manualIdsByTeamIndex = getManualOperatorIdsByTeamIndex(
    manualOperatorIdsByTeamIndex,
  );
  const capturedOperatorIds = getCapturedOperatorIds(selectedRoomTeams);
  const removedOperatorIdsByTeamIndex = {};
  const decisions = [];

  for (const team of controlState.teams || []) {
    const teamIndex = normalizeTeamIndex(team?.teamIndex);
    if (teamIndex === null) {
      continue;
    }

    const manualIds = manualIdsByTeamIndex.get(teamIndex) || new Set();
    for (const operator of getAutomaticEffectOperators(team)) {
      const operatorId = normalizeOperatorId(operator?.charId);
      if (!operatorId) {
        continue;
      }
      if (manualIds.has(operatorId)) {
        decisions.push({
          teamIndex,
          operatorId,
          action: "kept",
          reason: "manual",
        });
        continue;
      }

      const targetOperatorIds = getOperatorTargetIds(operator);
      if (targetOperatorIds.size === 0) {
        decisions.push({
          teamIndex,
          operatorId,
          action: "kept",
          reason: "notApplicable",
        });
        continue;
      }

      const realized = [...targetOperatorIds].some((targetOperatorId) =>
        capturedOperatorIds.has(targetOperatorId),
      );
      decisions.push({
        teamIndex,
        operatorId,
        action: realized ? "kept" : "removed",
        reason: realized ? "targetRealized" : "targetMissing",
      });
      if (!realized) {
        removedOperatorIdsByTeamIndex[teamIndex] = [
          ...(removedOperatorIdsByTeamIndex[teamIndex] || []),
          operatorId,
        ];
      }
    }
  }

  const reconciledBaseState = removeRiicControlCenterOperators({
    baseState: controlState,
    removedOperatorIdsByTeamIndex,
  });
  const roomOperatorIds = selectedRoomTeams.flatMap(
    (roomTeam) => roomTeam?.operatorIds || [],
  );
  const lateFillState = buildRiicControlCenterLateFillState({
    baseState: reconciledBaseState,
    roomOperatorIds,
    excludedOperatorIds,
    excludedOperatorIdsByTeamIndex,
    idleFillOperators,
    fiammettaRecovery,
  });
  const filledControlState = mergeRiicControlCenterLateFillState({
    baseState: reconciledBaseState,
    lateFillState,
  });
  const finalControlState = optimizeControlCenterSameShift({
    controlState: filledControlState,
    selectedRoomTeams,
    manualIdsByTeamIndex,
    excludedOperatorIds,
    excludedOperatorIdsByTeamIndex,
    fiammettaRecovery,
    ownedOperators,
  });

  return {
    status: "ready",
    controlState: finalControlState,
    lateFillState,
    removedOperatorIdsByTeamIndex,
    decisions,
  };
}
