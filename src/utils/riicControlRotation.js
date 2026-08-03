function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function compareOwnedOperators(left, right) {
  if (left.elite !== right.elite) {
    return right.elite - left.elite;
  }

  if (left.level !== right.level) {
    return right.level - left.level;
  }

  return (
    left.name.localeCompare(right.name, "zh-CN") ||
    left.charId.localeCompare(right.charId, "en")
  );
}

function normalizeOwnedOperators(ownedOperators) {
  const byId = new Map();

  for (const source of ownedOperators || []) {
    const charId = String(source?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const operator = {
      charId,
      name: String(source?.name || charId).trim() || charId,
      elite: toNonNegativeInteger(source?.elite),
      level: toNonNegativeInteger(source?.level, 1),
    };
    const current = byId.get(charId);
    if (!current || compareOwnedOperators(operator, current) < 0) {
      byId.set(charId, operator);
    }
  }

  return [...byId.values()].sort(compareOwnedOperators);
}

function isEligible(operator, requirement = {}) {
  return (
    operator &&
    operator.elite >= toNonNegativeInteger(requirement.minimumElite)
  );
}

function normalizeRequirement(requirement) {
  const charId = String(requirement?.charId || "").trim();

  return charId
    ? {
        charId,
        minimumElite: toNonNegativeInteger(requirement?.minimumElite),
        role: String(requirement?.role || "").trim(),
      }
    : null;
}

function normalizeShiftEffect(effect) {
  const charId = String(effect?.charId || "").trim();
  const sourceFacility = String(effect?.facility || "").trim();
  const facility = sourceFacility === "hire" ? "office" : sourceFacility;
  const percent = Number(effect?.percent || 0);

  if (
    !charId ||
    !["trading", "manufacture", "office"].includes(facility) ||
    !Number.isFinite(percent) ||
    percent <= 0
  ) {
    return null;
  }

  return {
    charId,
    minimumElite: toNonNegativeInteger(effect?.minimumElite),
    facility,
    percent,
    requiresSameShiftOperatorIds: [
      ...new Set(
        (effect?.requiresSameShiftOperatorIds || [])
          .map((operatorId) => String(operatorId || "").trim())
          .filter(Boolean),
      ),
    ],
  };
}

function getShiftMutualExclusionSets(rules) {
  return (rules?.mutuallyExclusiveWithinShift || [])
    .map((operatorIds) => {
      const normalizedIds = new Set(
        (operatorIds || [])
          .map((charId) => String(charId || "").trim())
          .filter(Boolean),
      );
      return normalizedIds.size >= 2 ? normalizedIds : null;
    })
    .filter(Boolean);
}

function hasShiftMutualExclusionConflict(
  team,
  operator,
  mutuallyExclusiveWithinShift,
) {
  if (!team || !operator) {
    return false;
  }

  return mutuallyExclusiveWithinShift.some(
    (operatorIds) =>
      operatorIds.has(operator.charId) &&
      team.operators.some(
        (existingOperator) =>
          existingOperator.charId !== operator.charId &&
          operatorIds.has(existingOperator.charId),
      ),
  );
}

function getEligibleConfiguredOperator({
  requirements,
  rosterById,
  usedOperatorIds,
  team,
  mutuallyExclusiveWithinShift = [],
}) {
  for (const source of requirements || []) {
    const requirement = normalizeRequirement(source);
    if (!requirement || usedOperatorIds.has(requirement.charId)) {
      continue;
    }

    const operator = rosterById.get(requirement.charId);
    if (
      isEligible(operator, requirement) &&
      !hasShiftMutualExclusionConflict(
        team,
        operator,
        mutuallyExclusiveWithinShift,
      )
    ) {
      return {
        operator,
        requirement,
      };
    }
  }

  return null;
}

function addOperator(
  team,
  operator,
  reason,
  usedOperatorIds,
  mutuallyExclusiveWithinShift = [],
) {
  if (
    !team ||
    !operator ||
    usedOperatorIds.has(operator.charId) ||
    hasShiftMutualExclusionConflict(
      team,
      operator,
      mutuallyExclusiveWithinShift,
    )
  ) {
    return false;
  }

  team.operators.push({
    ...operator,
    reason,
  });
  usedOperatorIds.add(operator.charId);
  return true;
}

function hasOperator(team, charId) {
  return team.operators.some((operator) => operator.charId === charId);
}

function createTeams(rules) {
  const shiftCount = Math.max(1, Number(rules?.shiftCount || 2));
  const slotsPerShift = Math.max(1, Number(rules?.slotsPerShift || 5));

  return Array.from({ length: shiftCount }, (_, index) => ({
    id: `control-shift-${index + 1}`,
    label: `${String.fromCharCode(65 + index)}班`,
    slotsPerShift,
    operators: [],
    effectMetrics: [],
  }));
}

function fillTeams({
  teams,
  candidates,
  rosterById,
  usedOperatorIds,
  reason,
  mutuallyExclusiveWithinShift,
}) {
  const requirements = candidates.map(normalizeRequirement).filter(Boolean);
  let cursor = 0;

  for (const team of teams) {
    while (team.operators.length < team.slotsPerShift) {
      const result = getEligibleConfiguredOperator({
        requirements: requirements.slice(cursor),
        rosterById,
        usedOperatorIds,
        team,
        mutuallyExclusiveWithinShift,
      });
      if (!result) {
        break;
      }

      const sourceIndex = requirements.findIndex(
        (requirement) => requirement.charId === result.requirement.charId,
      );
      cursor = Math.max(cursor, sourceIndex + 1);
      addOperator(
        team,
        result.operator,
        reason,
        usedOperatorIds,
        mutuallyExclusiveWithinShift,
      );
    }
  }
}

function fillTeamsFromOperatorList({
  teams,
  operators,
  usedOperatorIds,
  reason,
  mutuallyExclusiveWithinShift,
}) {
  let cursor = 0;

  for (const team of teams) {
    while (team.operators.length < team.slotsPerShift) {
      const operator = operators
        .slice(cursor)
        .find(
          (item) =>
            !usedOperatorIds.has(item.charId) &&
            !hasShiftMutualExclusionConflict(
              team,
              item,
              mutuallyExclusiveWithinShift,
            ),
        );
      if (!operator) {
        break;
      }

      cursor =
        operators.findIndex((item) => item.charId === operator.charId) + 1;
      addOperator(
        team,
        operator,
        reason,
        usedOperatorIds,
        mutuallyExclusiveWithinShift,
      );
    }
  }
}

function getShiftEffectMetrics(team, shiftEffects) {
  const operatorIds = new Set(
    (team?.operators || []).map((operator) => operator.charId),
  );
  const operatorsById = new Map(
    (team?.operators || []).map((operator) => [operator.charId, operator]),
  );
  const highestBonusByFacility = new Map();

  for (const effect of shiftEffects) {
    const owner = operatorsById.get(effect.charId);
    if (
      !owner ||
      owner.elite < effect.minimumElite ||
      !effect.requiresSameShiftOperatorIds.every((operatorId) =>
        operatorIds.has(operatorId),
      )
    ) {
      continue;
    }

    highestBonusByFacility.set(
      effect.facility,
      Math.max(highestBonusByFacility.get(effect.facility) || 0, effect.percent),
    );
  }

  return [...highestBonusByFacility.entries()].map(([facility, percent]) => ({
    facility,
    percent,
  }));
}

function getControlRoleRequirements(rules) {
  return {
    office: (rules?.officePriority || [])
      .map(normalizeRequirement)
      .filter(Boolean),
    trading: (rules?.tradingPriority || [])
      .map(normalizeRequirement)
      .filter(Boolean),
    manufacture: (rules?.manufacturePriority || [])
      .map(normalizeRequirement)
      .filter(Boolean),
    swireManufacturePair: normalizeRequirement(rules?.swireManufacturePair),
    shiftEffects: (rules?.shiftEffects || [])
      .map(normalizeShiftEffect)
      .filter(Boolean),
    morale: (rules?.unconditionalControlMorale || [])
      .map(normalizeRequirement)
      .filter(Boolean),
    trainingOnlyOperatorIds: [
      ...new Set(
        (rules?.trainingOnlyOperatorIds || [])
          .map((charId) => String(charId || "").trim())
          .filter(Boolean),
      ),
    ],
    mutuallyExclusiveWithinShift: getShiftMutualExclusionSets(rules),
  };
}

function normalizeTrainingMode(value) {
  return value === "ideal" ? "ideal" : "current";
}

function buildControlTrainingRoster({
  ownedOperators,
  roleRequirements,
  trainingMode,
}) {
  const roster = normalizeOwnedOperators(ownedOperators);
  if (trainingMode !== "ideal") {
    return {
      roster,
      upgradeRequirements: [],
    };
  }

  const requiredEliteByCharId = new Map();
  const addRequirement = (requirement) => {
    if (!requirement?.charId) {
      return;
    }

    const current = requiredEliteByCharId.get(requirement.charId) || 0;
    requiredEliteByCharId.set(
      requirement.charId,
      Math.max(current, toNonNegativeInteger(requirement.minimumElite)),
    );
  };

  for (const requirement of [
    ...roleRequirements.office,
    ...roleRequirements.trading,
    ...roleRequirements.manufacture,
    ...roleRequirements.morale,
    roleRequirements.swireManufacturePair,
  ]) {
    addRequirement(requirement);
  }
  for (const effect of roleRequirements.shiftEffects) {
    addRequirement({
      charId: effect.charId,
      minimumElite: effect.minimumElite,
    });
  }

  const upgradeRequirements = [];
  const idealRoster = roster.map((operator) => {
    const requiredElite = requiredEliteByCharId.get(operator.charId);
    if (
      !Number.isInteger(requiredElite) ||
      operator.elite >= requiredElite
    ) {
      return operator;
    }

    upgradeRequirements.push({
      charId: operator.charId,
      name: operator.name,
      current: {
        elite: operator.elite,
        level: operator.level,
      },
      required: {
        elite: requiredElite,
        level: 1,
      },
    });
    return {
      ...operator,
      elite: requiredElite,
      level: 1,
    };
  });

  return {
    roster: idealRoster,
    upgradeRequirements,
  };
}

/**
 * Builds the control-center rotation without yield scoring. It follows a
 * deliberately small, manually maintainable priority list and only uses
 * unconditional control-center morale restoration as a filler source.
 */
export function buildRiicControlRotation({
  ownedOperators,
  rules,
  trainingMode = "current",
}) {
  if (!Array.isArray(ownedOperators) || ownedOperators.length === 0) {
    return {
      status: "requiresOperators",
      shifts: [],
      claimedOperatorIds: [],
      missingSlotCount: 0,
    };
  }

  if (Number(rules?.schemaVersion) !== 2) {
    throw new Error("A RIIC control rotation rule set is required");
  }

  const roleRequirements = getControlRoleRequirements(rules);
  const training = buildControlTrainingRoster({
    ownedOperators,
    roleRequirements,
    trainingMode: normalizeTrainingMode(trainingMode),
  });
  const roster = training.roster;
  const rosterById = new Map(
    roster.map((operator) => [operator.charId, operator]),
  );
  const teams = createTeams(rules);
  const usedOperatorIds = new Set();

  // The two office priorities deliberately start in separate shifts.
  for (const [teamIndex, requirement] of roleRequirements.office.entries()) {
    const team = teams[teamIndex];
    if (!team) {
      break;
    }

    const result = getEligibleConfiguredOperator({
      requirements: [requirement],
      rosterById,
      usedOperatorIds,
      team,
      mutuallyExclusiveWithinShift:
        roleRequirements.mutuallyExclusiveWithinShift,
    });
    if (result) {
      addOperator(
        team,
        result.operator,
        "办公室优先",
        usedOperatorIds,
        roleRequirements.mutuallyExclusiveWithinShift,
      );
    }
  }

  const swireRequirement = roleRequirements.trading.find(
    (requirement) => requirement.role === "swire",
  );
  const swireResult = getEligibleConfiguredOperator({
    requirements: swireRequirement ? [swireRequirement] : [],
    rosterById,
    usedOperatorIds,
    team: teams[0],
    mutuallyExclusiveWithinShift: roleRequirements.mutuallyExclusiveWithinShift,
  });
  const swireTeam = swireResult ? teams[0] : null;
  if (swireResult && swireTeam) {
    addOperator(
      swireTeam,
      swireResult.operator,
      "贸易站优先",
      usedOperatorIds,
      roleRequirements.mutuallyExclusiveWithinShift,
    );
  }

  if (swireTeam && roleRequirements.swireManufacturePair) {
    const hoshigumaResult = getEligibleConfiguredOperator({
      requirements: [roleRequirements.swireManufacturePair],
      rosterById,
      usedOperatorIds,
      team: swireTeam,
      mutuallyExclusiveWithinShift:
        roleRequirements.mutuallyExclusiveWithinShift,
    });
    if (hoshigumaResult) {
      addOperator(
        swireTeam,
        hoshigumaResult.operator,
        "诗怀雅同班联动",
        usedOperatorIds,
        roleRequirements.mutuallyExclusiveWithinShift,
      );
    }
  }

  for (const team of teams) {
    if (
      roleRequirements.swireManufacturePair &&
      hasOperator(team, roleRequirements.swireManufacturePair.charId)
    ) {
      continue;
    }

    const result = getEligibleConfiguredOperator({
      requirements: roleRequirements.manufacture,
      rosterById,
      usedOperatorIds,
      team,
      mutuallyExclusiveWithinShift: roleRequirements.mutuallyExclusiveWithinShift,
    });
    if (result) {
      addOperator(
        team,
        result.operator,
        "制造站加成",
        usedOperatorIds,
        roleRequirements.mutuallyExclusiveWithinShift,
      );
    }
  }

  const nonSwireTradingRequirements = roleRequirements.trading.filter(
    (requirement) => requirement.role !== "swire",
  );
  for (const team of teams) {
    if (
      swireRequirement &&
      hasOperator(team, swireRequirement.charId)
    ) {
      continue;
    }

    const result = getEligibleConfiguredOperator({
      requirements: nonSwireTradingRequirements,
      rosterById,
      usedOperatorIds,
      team,
      mutuallyExclusiveWithinShift: roleRequirements.mutuallyExclusiveWithinShift,
    });
    if (result) {
      addOperator(
        team,
        result.operator,
        "贸易站加成",
        usedOperatorIds,
        roleRequirements.mutuallyExclusiveWithinShift,
      );
    }
  }

  fillTeams({
    teams,
    candidates: roleRequirements.morale,
    rosterById,
    usedOperatorIds,
    reason: "中枢回心情",
    mutuallyExclusiveWithinShift: roleRequirements.mutuallyExclusiveWithinShift,
  });

  fillTeamsFromOperatorList({
    teams,
    operators: roleRequirements.trainingOnlyOperatorIds
      .map((charId) => rosterById.get(charId))
      .filter(Boolean),
    usedOperatorIds,
    reason: "训练室兜底",
    mutuallyExclusiveWithinShift: roleRequirements.mutuallyExclusiveWithinShift,
  });

  fillTeamsFromOperatorList({
    teams,
    operators: roster.filter(
      (operator) =>
        operator.charId !== roleRequirements.swireManufacturePair?.charId ||
        usedOperatorIds.has(operator.charId),
    ),
    usedOperatorIds,
    reason: "普通值班",
    mutuallyExclusiveWithinShift: roleRequirements.mutuallyExclusiveWithinShift,
  });

  for (const team of teams) {
    team.effectMetrics = getShiftEffectMetrics(
      team,
      roleRequirements.shiftEffects,
    );
  }

  const claimedOperatorIds = teams.flatMap((team) =>
    team.operators.map((operator) => operator.charId),
  );
  const requiredSlotCount = teams.reduce(
    (total, team) => total + team.slotsPerShift,
    0,
  );
  const missingSlotCount = Math.max(
    0,
    requiredSlotCount - claimedOperatorIds.length,
  );
  const claimedOperatorIdSet = new Set(claimedOperatorIds);

  return {
    status: missingSlotCount === 0 ? "ready" : "insufficient",
    shifts: teams,
    claimedOperatorIds,
    missingSlotCount,
    upgradeRequirements: training.upgradeRequirements.filter((requirement) =>
      claimedOperatorIdSet.has(requirement.charId),
    ),
  };
}
