import RIIC_BASELINE_SKILL_RULES from "../../static/json/tools/R00-baseline.json";
import {
  compareRiicOperatorUnlock,
  createRiicUpgradeRequirement,
  mergeRiicUpgradeRequirements,
} from "./P00-upgrade-requirements.js";

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function createRoomIdealUnlockTargets(ruleData) {
  const targetsByRoom = new Map();

  for (const sourceRule of [
    ...(ruleData?.skillStates || []),
    ...(ruleData?.rules || []),
    ...(ruleData?.sameRoomRules || []),
  ]) {
    const charId = String(sourceRule?.charId || "").trim();
    const roomType = String(sourceRule?.roomType || "").trim();
    const unlock = sourceRule?.unlock;
    if (!charId || !roomType || !unlock) {
      continue;
    }

    const target = {
      elite: toNonNegativeInteger(unlock.phase),
      level: toNonNegativeInteger(unlock.level, 1),
    };
    const key = `${charId}|${roomType}`;
    const current = targetsByRoom.get(key);
    if (!current || compareRiicOperatorUnlock(target, current) > 0) {
      targetsByRoom.set(key, target);
    }
  }

  return targetsByRoom;
}

const ROOM_IDEAL_UNLOCK_TARGETS = createRoomIdealUnlockTargets(
  RIIC_BASELINE_SKILL_RULES,
);

function getCurrentRosterById(ownedOperators) {
  const rosterById = new Map();

  for (const operator of ownedOperators || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const normalized = {
      charId,
      name: String(operator?.name || charId).trim() || charId,
      elite: toNonNegativeInteger(operator?.elite),
      level: toNonNegativeInteger(operator?.level, 1),
    };
    const current = rosterById.get(charId);
    if (
      !current ||
      compareRiicOperatorUnlock(normalized, current) > 0
    ) {
      rosterById.set(charId, normalized);
    }
  }

  return rosterById;
}

function normalizeNameToCharId(operatorNameToCharId) {
  if (operatorNameToCharId instanceof Map) {
    return operatorNameToCharId;
  }

  return new Map(
    Object.entries(operatorNameToCharId || {}).flatMap(([name, charId]) => {
      const normalizedName = String(name || "").trim();
      const normalizedCharId = String(charId || "").trim();
      return normalizedName && normalizedCharId
        ? [[normalizedName, normalizedCharId]]
        : [];
    }),
  );
}

function collectCandidateRequirements(
  candidate,
  rosterById,
  matchingRosterById,
  operatorNameToCharId,
) {
  if (!candidate) {
    return [];
  }

  const requirements = [];
  for (const member of candidate.members || []) {
    const charId = operatorNameToCharId.get(
      String(member?.name || "").trim(),
    );
    const operator = rosterById.get(charId);
    const requirement = createRiicUpgradeRequirement(operator, {
      elite: member?.elite,
      level: member?.level,
    });
    if (requirement) {
      requirements.push(requirement);
    }
  }

  for (const fallbackOperator of candidate?.fallback?.operators || []) {
    if (fallbackOperator?.idleFill) {
      continue;
    }

    const charId = String(fallbackOperator?.charId || "").trim();
    const operator = rosterById.get(charId);
    const roomType = String(candidate?.candidateScope?.roomType || "").trim();
    const roomTarget = roomType
      ? ROOM_IDEAL_UNLOCK_TARGETS.get(`${charId}|${roomType}`) || null
      : matchingRosterById.get(charId);
    const requirement = fallbackOperator?.upgradeRequirement
      ? createRiicUpgradeRequirement(
          operator,
          fallbackOperator.upgradeRequirement.required,
        )
      : createRiicUpgradeRequirement(operator, roomTarget);
    if (requirement) {
      requirements.push(requirement);
    }
  }

  return requirements;
}

/**
 * L83: derive upgrade recommendations from the finalized schedule while
 * preserving the original imported operator levels as the comparison source.
 * Candidates that carry a room scope only ask pool fillers for the level their
 * own room needs.
 */
export function getRiicScheduleTrainingRecommendations({
  scheduleCandidates,
  ownedOperators,
  matchingOperators,
  operatorNameToCharId,
} = {}) {
  const rosterById = getCurrentRosterById(ownedOperators);
  const matchingRosterById = getCurrentRosterById(matchingOperators);
  const nameToCharId = normalizeNameToCharId(operatorNameToCharId);
  const requirements = [];

  for (const scheduleCandidate of scheduleCandidates || []) {
    for (const segment of scheduleCandidate?.segments || []) {
      for (const assignment of segment?.stationAssignments || []) {
        requirements.push(
          ...collectCandidateRequirements(
            assignment?.candidate,
            rosterById,
            matchingRosterById,
            nameToCharId,
          ),
        );
      }
    }
  }

  return mergeRiicUpgradeRequirements(requirements);
}
