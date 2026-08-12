function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function compareUnlock(left, right) {
  const eliteDifference =
    toNonNegativeInteger(left?.elite) - toNonNegativeInteger(right?.elite);
  if (eliteDifference !== 0) {
    return eliteDifference;
  }

  return (
    toNonNegativeInteger(left?.level, 1) -
    toNonNegativeInteger(right?.level, 1)
  );
}

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
    if (!current || compareUnlock(normalized, current) > 0) {
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

function createRequirement(operator, required) {
  if (!operator || compareUnlock(operator, required) >= 0) {
    return null;
  }

  return {
    charId: operator.charId,
    name: operator.name,
    current: {
      elite: operator.elite,
      level: operator.level,
    },
    required: {
      elite: toNonNegativeInteger(required?.elite),
      level: toNonNegativeInteger(required?.level, 1),
    },
  };
}

function mergeRequirements(requirements) {
  const byCharId = new Map();

  for (const requirement of requirements) {
    if (!requirement?.charId) {
      continue;
    }

    const current = byCharId.get(requirement.charId);
    if (
      !current ||
      compareUnlock(requirement.required, current.required) > 0
    ) {
      byCharId.set(requirement.charId, requirement);
    }
  }

  return [...byCharId.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name, "zh-CN") ||
      left.charId.localeCompare(right.charId, "en"),
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
    const requirement = createRequirement(operator, {
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

    const operator = rosterById.get(
      String(fallbackOperator?.charId || "").trim(),
    );
    const matchingOperator = matchingRosterById.get(
      String(fallbackOperator?.charId || "").trim(),
    );
    const requirement = createRequirement(operator, matchingOperator);
    if (requirement) {
      requirements.push(requirement);
    }
  }

  return requirements;
}

/**
 * L83: derive upgrade recommendations from the finalized schedule while
 * preserving the original imported operator levels as the comparison source.
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

  return mergeRequirements(requirements);
}
