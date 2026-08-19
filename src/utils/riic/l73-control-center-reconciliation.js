import {
  buildRiicControlCenterLateFillState,
  mergeRiicControlCenterLateFillState,
  removeRiicControlCenterOperators,
} from "./l50-control-planner.js";
import {
  buildRiicControlCenterRuntimeContext,
} from "./l51-control-effects.js";

function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function normalizeTeamIndex(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function normalizeRoomType(value) {
  const roomType = String(value || "").trim();
  return roomType === "office" ? "hire" : roomType;
}

function normalizeProduct(value) {
  return String(value || "").trim() || "all";
}

function isRoomEffectType(value) {
  return ["trading", "manufacture", "meeting", "hire"].includes(
    normalizeRoomType(value),
  );
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

function getOperatorEffects({
  effectsByTeamIndex,
  teamIndex,
  operatorId,
}) {
  return (effectsByTeamIndex?.[String(teamIndex)] || []).filter(
    (effect) =>
      effect?.scope === "operators" &&
      !hasConditions(effect) &&
      isRoomEffectType(effect?.roomType) &&
      (effect?.sourceOperatorIds || []).includes(operatorId) &&
      (effect?.targetOperatorIds || []).length > 0,
  );
}

function hasRealizedTarget(effect, selectedRoomTeams, teamIndex) {
  const effectRoomType = normalizeRoomType(effect?.roomType);
  const effectProduct = normalizeProduct(effect?.product);
  const targetOperatorIds = new Set(
    (effect?.targetOperatorIds || []).map(normalizeOperatorId).filter(Boolean),
  );

  return (selectedRoomTeams || []).some((roomTeam) => {
    if (normalizeTeamIndex(roomTeam?.teamIndex) !== teamIndex) {
      return false;
    }
    if (normalizeRoomType(roomTeam?.facility) !== effectRoomType) {
      return false;
    }
    const roomProduct = normalizeProduct(roomTeam?.product);
    if (effectProduct !== "all" && effectProduct !== roomProduct) {
      return false;
    }

    return (roomTeam?.operatorIds || []).some((operatorId) =>
      targetOperatorIds.has(normalizeOperatorId(operatorId)),
    );
  });
}

function getAutomaticEffectOperators(team = {}) {
  return [...(team?.operatorEffectOperators || [])];
}

/**
 * L73: withdraw automatic control-center operators whose final room targets
 * are absent, then refill only the resulting control-center vacancies.
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

  const runtimeContext = buildRiicControlCenterRuntimeContext({
    controlState,
  });
  const manualIdsByTeamIndex = getManualOperatorIdsByTeamIndex(
    manualOperatorIdsByTeamIndex,
  );
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

      const effects = getOperatorEffects({
        effectsByTeamIndex: runtimeContext.effectsByTeamIndex,
        teamIndex,
        operatorId,
      });
      if (effects.length === 0) {
        decisions.push({
          teamIndex,
          operatorId,
          action: "kept",
          reason: "notApplicable",
        });
        continue;
      }

      const realized = effects.some((effect) =>
        hasRealizedTarget(effect, selectedRoomTeams, teamIndex),
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
    runtimeContext: buildRiicControlCenterRuntimeContext({
      controlState: finalControlState,
    }),
    lateFillState,
    removedOperatorIdsByTeamIndex,
    decisions,
  };
}
