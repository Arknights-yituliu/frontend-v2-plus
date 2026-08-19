import {
  buildRiicControlCenterLateFillState,
  mergeRiicControlCenterLateFillState,
  removeRiicControlCenterOperators,
} from "./l50-control-planner.js";

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

/**
 * L73: withdraw automatic control-center operators whose linked operators
 * were not captured, then refill only the resulting control-center vacancies.
 */
export function reconcileRiicControlCenterAfterRoomSelection({
  controlState,
  selectedRoomTeams = [],
  selectionReady = true,
  manualOperatorIdsByTeamIndex = {},
  excludedOperatorIdsByTeamIndex = {},
  idleFillOperators = [],
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
    excludedOperatorIdsByTeamIndex,
    idleFillOperators,
    fiammettaRecovery,
  });
  const finalControlState = mergeRiicControlCenterLateFillState({
    baseState: reconciledBaseState,
    lateFillState,
  });

  return {
    status: "ready",
    controlState: finalControlState,
    lateFillState,
    removedOperatorIdsByTeamIndex,
    decisions,
  };
}
