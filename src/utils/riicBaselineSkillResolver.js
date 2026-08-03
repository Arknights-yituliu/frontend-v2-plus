const ROOM_TYPES = [
  "manufacture",
  "trading",
  "power",
  "control",
  "meeting",
  "hire",
];
const SAME_ROOM_CONDITION_TYPES = new Set([
  "sameRoomHasAny",
  "sameRoomMemberCount",
]);

function toNonNegativeInteger(value, fallback = null) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function getUnlockRank({ phase, level }) {
  return phase * 1000 + level;
}

function normalizeActivation(activation) {
  return {
    mode: activation?.mode === "replace" ? "replace" : "stack",
    group: activation?.group || null,
  };
}

function normalizeOwnedOperators(ownedOperators) {
  const operatorMap = new Map();
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const operator of ownedOperators || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      invalidCount += 1;
      continue;
    }

    const elite = toNonNegativeInteger(operator?.elite, 0);
    const level = toNonNegativeInteger(operator?.level);
    const current = operatorMap.get(charId);

    if (current) {
      duplicateCount += 1;
    }

    if (
      !current ||
      getUnlockRank({ phase: elite, level: level || 0 }) >
        getUnlockRank({
          phase: current.elite,
          level: current.level || 0,
        })
    ) {
      operatorMap.set(charId, {
        charId,
        name: String(operator?.name || charId),
        elite,
        level,
      });
    }
  }

  return {
    operators: [...operatorMap.values()].sort((left, right) =>
      left.charId.localeCompare(right.charId, "en"),
    ),
    invalidCount,
    duplicateCount,
  };
}

function getHigherUnlock(left, right) {
  return getUnlockRank(left) >= getUnlockRank(right) ? left : right;
}

function getIdealUnlockTargets(ruleData) {
  const targets = new Map();
  const sourceRules = [
    ...(ruleData?.skillStates || []),
    ...(ruleData?.rules || []),
    ...(ruleData?.sameRoomRules || []),
  ];

  for (const sourceRule of sourceRules) {
    const charId = String(sourceRule?.charId || "").trim();
    const unlock = sourceRule?.unlock;
    if (!charId || !unlock) {
      continue;
    }

    const normalizedUnlock = {
      phase: toNonNegativeInteger(unlock.phase, 0),
      level: toNonNegativeInteger(unlock.level, 1),
    };
    const current = targets.get(charId);
    targets.set(
      charId,
      current ? getHigherUnlock(current, normalizedUnlock) : normalizedUnlock,
    );
  }

  return targets;
}

export function createRiicIdealTrainingRoster(ownedOperators, ruleData) {
  const owned = normalizeOwnedOperators(ownedOperators);
  const idealTargets = getIdealUnlockTargets(ruleData);
  const upgradeRequirements = [];
  const operators = owned.operators.map((operator) => {
    const target = idealTargets.get(operator.charId);
    if (!target || isRiicBaselineRuleUnlocked(operator, { unlock: target })) {
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
        elite: target.phase,
        level: target.level,
      },
    });
    return {
      ...operator,
      elite: target.phase,
      level: target.level,
    };
  });

  return {
    operators,
    currentOperators: owned.operators,
    summary: {
      ignoredOwnedOperatorCount: owned.invalidCount,
      duplicateOwnedOperatorCount: owned.duplicateCount,
      upgradeRequirementCount: upgradeRequirements.length,
    },
    upgradeRequirements,
  };
}

function normalizeSkillState(state) {
  if (
    !state?.id ||
    !state?.charId ||
    !ROOM_TYPES.includes(state?.roomType) ||
    !state?.unlock
  ) {
    return null;
  }

  return {
    id: state.id,
    charId: state.charId,
    roomType: state.roomType,
    unlock: {
      phase: toNonNegativeInteger(state.unlock.phase, 0),
      level: toNonNegativeInteger(state.unlock.level, 1),
    },
    activation: normalizeActivation(state.activation),
  };
}

function normalizeSkillStates(ruleData) {
  const sourceStates =
    ruleData?.skillStates ||
    [...(ruleData?.rules || []), ...(ruleData?.sameRoomRules || [])].map(
      (rule) => ({
        id: rule.sourceSkillId || rule.id,
        charId: rule.charId,
        roomType: rule.roomType,
        unlock: rule.unlock,
        activation: rule.activation,
      }),
    );
  const statesByCharId = new Map();
  const statesById = new Map();
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const sourceState of sourceStates) {
    const state = normalizeSkillState(sourceState);
    if (!state) {
      invalidCount += 1;
      continue;
    }

    if (statesById.has(state.id)) {
      duplicateCount += 1;
      continue;
    }

    statesById.set(state.id, state);
    if (!statesByCharId.has(state.charId)) {
      statesByCharId.set(state.charId, []);
    }
    statesByCharId.get(state.charId).push(state);
  }

  return {
    statesByCharId,
    statesById,
    invalidCount,
    duplicateCount,
  };
}

function normalizeEffectRule(rule, { isSameRoomRule = false } = {}) {
  if (
    !rule?.id ||
    !rule?.charId ||
    !ROOM_TYPES.includes(rule?.roomType) ||
    !rule?.effect?.metric ||
    !Number.isFinite(Number(rule?.effect?.percent)) ||
    !rule?.unlock
  ) {
    return null;
  }

  if (
    rule.confidence &&
    !["high", "reviewed"].includes(rule.confidence)
  ) {
    return null;
  }

  const normalizedRule = {
    ...rule,
    sourceSkillId: rule.sourceSkillId || rule.id,
    unlock: {
      phase: toNonNegativeInteger(rule.unlock.phase, 0),
      level: toNonNegativeInteger(rule.unlock.level, 1),
    },
    activation: normalizeActivation(rule.activation),
    effect: {
      ...rule.effect,
      percent: Number(rule.effect.percent),
      coverage: rule.effect.coverage === "baseOnly" ? "baseOnly" : "complete",
      targetRoomType: ROOM_TYPES.includes(rule.effect.targetRoomType)
        ? rule.effect.targetRoomType
        : null,
      stackMode: rule.effect.stackMode === "max" ? "max" : "add",
      stackGroup:
        rule.effect.stackMode === "max" && rule.effect.stackGroup
          ? String(rule.effect.stackGroup)
          : null,
    },
  };

  if (!isSameRoomRule) {
    return normalizedRule;
  }

  if (
    !SAME_ROOM_CONDITION_TYPES.has(rule?.condition?.type) ||
    !Array.isArray(rule.condition.charIds) ||
    rule.condition.charIds.length === 0
  ) {
    return null;
  }

  return {
    ...normalizedRule,
    condition: {
      type: rule.condition.type,
      charIds: [...new Set(rule.condition.charIds)].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
      excludeOwner: Boolean(rule.condition.excludeOwner),
    },
  };
}

function normalizeRuleCollection(rules, options) {
  const rulesByCharId = new Map();
  const ruleIds = new Set();
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const sourceRule of rules || []) {
    const rule = normalizeEffectRule(sourceRule, options);
    if (!rule) {
      invalidCount += 1;
      continue;
    }

    if (ruleIds.has(rule.id)) {
      duplicateCount += 1;
      continue;
    }

    ruleIds.add(rule.id);
    if (!rulesByCharId.has(rule.charId)) {
      rulesByCharId.set(rule.charId, []);
    }
    rulesByCharId.get(rule.charId).push(rule);
  }

  return {
    rulesByCharId,
    invalidCount,
    duplicateCount,
  };
}

export function isRiicBaselineRuleUnlocked(operator, rule) {
  if (operator.elite < rule.unlock.phase) {
    return false;
  }

  if (operator.elite > rule.unlock.phase || rule.unlock.level <= 1) {
    return true;
  }

  return operator.level !== null && operator.level >= rule.unlock.level;
}

function getActiveSourceSkillIds(operator, skillStates) {
  const activeStackSourceIds = new Set();
  const activeReplacementStates = new Map();

  for (const skillState of skillStates) {
    if (!isRiicBaselineRuleUnlocked(operator, skillState)) {
      continue;
    }

    if (
      skillState.activation.mode !== "replace" ||
      !skillState.activation.group
    ) {
      activeStackSourceIds.add(skillState.id);
      continue;
    }

    const replacementKey =
      `${skillState.roomType}|${skillState.activation.group}`;
    const current = activeReplacementStates.get(replacementKey);
    if (
      !current ||
      getUnlockRank(skillState.unlock) > getUnlockRank(current.unlock) ||
      (getUnlockRank(skillState.unlock) ===
        getUnlockRank(current.unlock) &&
        skillState.id.localeCompare(current.id, "en") < 0)
    ) {
      activeReplacementStates.set(replacementKey, skillState);
    }
  }

  for (const state of activeReplacementStates.values()) {
    activeStackSourceIds.add(state.id);
  }

  return activeStackSourceIds;
}

function getActiveRules(operator, rules, activeSourceSkillIds, skillStatesById) {
  return rules
    .filter((rule) => {
      const sourceState = skillStatesById.get(rule.sourceSkillId);
      if (sourceState) {
        return activeSourceSkillIds.has(sourceState.id);
      }
      return isRiicBaselineRuleUnlocked(operator, rule);
    })
    .sort((left, right) => left.id.localeCompare(right.id, "en"));
}

function formatActiveRule(rule) {
  return {
    id: rule.id,
    sourceSkillId: rule.sourceSkillId,
    buffName: rule.buffName,
    roomType: rule.roomType,
    unlock: rule.unlock,
    effect: rule.effect,
    poolKey: rule.poolKey,
    ignoredMechanics: rule.ignoredMechanics || [],
  };
}

function formatSameRoomRule(rule) {
  return {
    id: rule.id,
    sourceSkillId: rule.sourceSkillId,
    buffName: rule.buffName,
    roomType: rule.roomType,
    unlock: rule.unlock,
    condition: rule.condition,
    effect: rule.effect,
    ignoredMechanics: rule.ignoredMechanics || [],
  };
}

function createCandidate(operator, rules, sameRoomRules) {
  return {
    charId: operator.charId,
    name: operator.name,
    elite: operator.elite,
    level: operator.level,
    activeRuleIds: rules.map((rule) => rule.id),
    activeSameRoomRuleIds: sameRoomRules.map((rule) => rule.id),
    effects: rules.map(formatActiveRule),
    sameRoomRules: sameRoomRules.map(formatSameRoomRule),
  };
}

function createEmptyRoomCandidates() {
  return Object.fromEntries(ROOM_TYPES.map((roomType) => [roomType, []]));
}

function addPoolMember(poolMap, operator, rule) {
  if (!poolMap.has(rule.poolKey)) {
    poolMap.set(rule.poolKey, {
      key: rule.poolKey,
      roomType: rule.roomType,
      product: rule.effect.product,
      metric: rule.effect.metric,
      percent: rule.effect.percent,
      members: [],
    });
  }

  const pool = poolMap.get(rule.poolKey);
  let member = pool.members.find((item) => item.charId === operator.charId);
  if (!member) {
    member = {
      charId: operator.charId,
      name: operator.name,
      ruleIds: [],
    };
    pool.members.push(member);
  }

  member.ruleIds.push(rule.id);
}

function isProductCompatible(effect, product) {
  return effect.product === "all" || effect.product === product;
}

function getSameRoomRuleMultiplier(rule, occupantIds, ownerCharId) {
  const matchingCharIds = occupantIds.filter((charId) =>
    rule.condition.charIds.includes(charId),
  );
  const eligibleCharIds = rule.condition.excludeOwner
    ? matchingCharIds.filter((charId) => charId !== ownerCharId)
    : matchingCharIds;

  if (rule.condition.type === "sameRoomHasAny") {
    return eligibleCharIds.length > 0 ? 1 : 0;
  }

  return eligibleCharIds.length;
}

/**
 * Resolves the V0 skill set that an owned operator list can use. Pool members
 * retain physical operator ids, and same-room rules stay attached to their
 * actual owner instead of becoming virtual efficiency entries.
 */
export function resolveRiicBaselineSkills(
  ownedOperators,
  ruleData,
  { trainingMode = "current" } = {},
) {
  if (!["current", "ideal"].includes(trainingMode)) {
    throw new Error("trainingMode must be current or ideal");
  }

  const idealTraining =
    trainingMode === "ideal"
      ? createRiicIdealTrainingRoster(ownedOperators, ruleData)
      : null;
  const owned = idealTraining
    ? {
        operators: idealTraining.operators,
        invalidCount: idealTraining.summary.ignoredOwnedOperatorCount,
        duplicateCount: idealTraining.summary.duplicateOwnedOperatorCount,
      }
    : normalizeOwnedOperators(ownedOperators);
  const normalizedSkillStates = normalizeSkillStates(ruleData);
  const normalizedDirectRules = normalizeRuleCollection(ruleData?.rules);
  const normalizedSameRoomRules = normalizeRuleCollection(
    ruleData?.sameRoomRules,
    { isSameRoomRule: true },
  );
  const candidatesByRoom = createEmptyRoomCandidates();
  const poolMap = new Map();
  const operators = [];

  for (const operator of owned.operators) {
    const activeSourceSkillIds = getActiveSourceSkillIds(
      operator,
      normalizedSkillStates.statesByCharId.get(operator.charId) || [],
    );
    const activeRules = getActiveRules(
      operator,
      normalizedDirectRules.rulesByCharId.get(operator.charId) || [],
      activeSourceSkillIds,
      normalizedSkillStates.statesById,
    );
    const activeSameRoomRules = getActiveRules(
      operator,
      normalizedSameRoomRules.rulesByCharId.get(operator.charId) || [],
      activeSourceSkillIds,
      normalizedSkillStates.statesById,
    );

    if (activeRules.length === 0 && activeSameRoomRules.length === 0) {
      continue;
    }

    operators.push({
      ...operator,
      activeRules: activeRules.map(formatActiveRule),
      activeSameRoomRules: activeSameRoomRules.map(formatSameRoomRule),
    });

    for (const roomType of ROOM_TYPES) {
      const roomRules = activeRules.filter(
        (rule) => rule.roomType === roomType,
      );
      const roomSameRoomRules = activeSameRoomRules.filter(
        (rule) => rule.roomType === roomType,
      );
      if (roomRules.length === 0 && roomSameRoomRules.length === 0) {
        continue;
      }

      candidatesByRoom[roomType].push(
        createCandidate(operator, roomRules, roomSameRoomRules),
      );
      for (const rule of roomRules) {
        addPoolMember(poolMap, operator, rule);
      }
    }
  }

  for (const roomType of ROOM_TYPES) {
    candidatesByRoom[roomType].sort((left, right) =>
      left.charId.localeCompare(right.charId, "en"),
    );
  }

  const pools = [...poolMap.values()]
    .map((pool) => ({
      ...pool,
      members: pool.members
        .map((member) => ({
          ...member,
          ruleIds: [...member.ruleIds].sort((left, right) =>
            left.localeCompare(right, "en"),
          ),
        }))
        .sort((left, right) => left.charId.localeCompare(right.charId, "en")),
      operatorIds: pool.members
        .map((member) => member.charId)
        .sort((left, right) => left.localeCompare(right, "en")),
    }))
    .sort((left, right) => left.key.localeCompare(right.key, "en"));

  return {
    schemaVersion: 2,
    training: {
      mode: trainingMode,
      upgradeRequirements: idealTraining?.upgradeRequirements || [],
    },
    summary: {
      ownedOperatorCount: owned.operators.length,
      operatorWithActiveRuleCount: operators.length,
      activeRuleCount: operators.reduce(
        (count, operator) => count + operator.activeRules.length,
        0,
      ),
      activeSameRoomRuleCount: operators.reduce(
        (count, operator) => count + operator.activeSameRoomRules.length,
        0,
      ),
      poolCount: pools.length,
      ignoredOwnedOperatorCount: owned.invalidCount,
      duplicateOwnedOperatorCount: owned.duplicateCount,
      ignoredSkillStateCount: normalizedSkillStates.invalidCount,
      duplicateSkillStateCount: normalizedSkillStates.duplicateCount,
      ignoredRuleCount:
        normalizedDirectRules.invalidCount +
        normalizedSameRoomRules.invalidCount,
      duplicateRuleCount:
        normalizedDirectRules.duplicateCount +
        normalizedSameRoomRules.duplicateCount,
      idealizedOperatorCount: idealTraining?.upgradeRequirements.length || 0,
    },
    ownedOperatorIds: owned.operators.map((operator) => operator.charId),
    ownedOperators: owned.operators,
    currentOwnedOperators:
      idealTraining?.currentOperators || owned.operators,
    operators,
    candidatesByRoom,
    pools,
  };
}

/**
 * Scores one room in one time segment. It deliberately has no morale state:
 * morale changes can be reported on a skill but do not alter V0 output score.
 */
export function calculateRiicRoomEfficiency({
  resolvedSkills,
  roomType,
  product = "all",
  operatorIds = [],
  expectedSlots,
  fallbackSlotCount = 0,
  fallbackPercent = 0,
}) {
  if (!ROOM_TYPES.includes(roomType)) {
    throw new Error(`Unknown RIIC room type: ${roomType}`);
  }

  if (!Number.isInteger(expectedSlots) || expectedSlots < 1) {
    throw new Error("expectedSlots must be a positive integer");
  }

  if (!Array.isArray(operatorIds)) {
    throw new Error("operatorIds must be an array");
  }

  const normalizedFallbackSlotCount = toNonNegativeInteger(
    fallbackSlotCount,
  );
  if (normalizedFallbackSlotCount === null) {
    throw new Error("fallbackSlotCount must be a non-negative integer");
  }

  const normalizedFallbackPercent = Number(fallbackPercent);
  if (
    !Number.isFinite(normalizedFallbackPercent) ||
    normalizedFallbackPercent < 0
  ) {
    throw new Error("fallbackPercent must be a non-negative number");
  }

  const normalizedOperatorIds = operatorIds.map((charId) =>
    String(charId || "").trim(),
  );
  const emptySlotIndexes = normalizedOperatorIds
    .map((charId, index) => (charId ? null : index))
    .filter((index) => index !== null);
  const seenOperatorIds = new Set();
  const duplicateOperatorIds = new Set();
  const uniqueOperatorIds = [];

  for (const charId of normalizedOperatorIds) {
    if (!charId) {
      continue;
    }

    if (seenOperatorIds.has(charId)) {
      duplicateOperatorIds.add(charId);
      continue;
    }

    seenOperatorIds.add(charId);
    uniqueOperatorIds.push(charId);
  }

  const candidates = new Map(
    (resolvedSkills?.candidatesByRoom?.[roomType] || []).map(
      (candidate) => [candidate.charId, candidate],
    ),
  );
  const ownedOperatorIds = new Set(
    resolvedSkills?.ownedOperatorIds || [...candidates.keys()],
  );
  const missingOperatorIds = uniqueOperatorIds.filter(
    (charId) => !ownedOperatorIds.has(charId),
  );
  const unscoredOperatorIds = uniqueOperatorIds.filter(
    (charId) => !candidates.has(charId),
  );
  const validation = {
    expectedSlots,
    assignedSlotCount: normalizedOperatorIds.length,
    realOperatorSlotCount: normalizedOperatorIds.length,
    fallbackSlotCount: normalizedFallbackSlotCount,
    totalAssignedSlotCount:
      normalizedOperatorIds.length + normalizedFallbackSlotCount,
    emptySlotIndexes,
    duplicateOperatorIds: [...duplicateOperatorIds].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
    missingOperatorIds,
    unscoredOperatorIds,
  };
  const isValid =
    validation.totalAssignedSlotCount === expectedSlots &&
    validation.emptySlotIndexes.length === 0 &&
    validation.duplicateOperatorIds.length === 0 &&
    validation.missingOperatorIds.length === 0;

  if (!isValid) {
    return {
      roomType,
      product,
      valid: false,
      validation,
      basePercent: null,
      bonusPercent: null,
      totalPercent: null,
      appliedRules: [],
      missingOperatorIds,
    };
  }

  const appliedRules = [];
  const maxStackedRules = new Map();
  const fallbackBonusPercent =
    normalizedFallbackSlotCount * normalizedFallbackPercent;
  let bonusPercent = fallbackBonusPercent;

  if (normalizedFallbackSlotCount > 0) {
    appliedRules.push({
      id: "fallback",
      kind: "fallback",
      slotCount: normalizedFallbackSlotCount,
      percent: fallbackBonusPercent,
      perSlotPercent: normalizedFallbackPercent,
      coverage: "complete",
    });
  }

  for (const charId of uniqueOperatorIds) {
    const candidate = candidates.get(charId);
    if (!candidate) {
      continue;
    }

    for (const rule of candidate.effects) {
      if (!isProductCompatible(rule.effect, product)) {
        continue;
      }

      const appliedRule = {
        id: rule.id,
        ownerCharId: charId,
        kind: "direct",
        percent: rule.effect.percent,
        coverage: rule.effect.coverage,
        targetRoomType: rule.effect.targetRoomType,
      };

      if (rule.effect.stackMode === "max" && rule.effect.stackGroup) {
        const currentRule = maxStackedRules.get(rule.effect.stackGroup);
        if (
          !currentRule ||
          appliedRule.percent > currentRule.percent ||
          (appliedRule.percent === currentRule.percent &&
            appliedRule.id.localeCompare(currentRule.id, "en") < 0)
        ) {
          maxStackedRules.set(rule.effect.stackGroup, appliedRule);
        }
        continue;
      }

      bonusPercent += appliedRule.percent;
      appliedRules.push(appliedRule);
    }

    for (const rule of candidate.sameRoomRules) {
      if (!isProductCompatible(rule.effect, product)) {
        continue;
      }

      const multiplier = getSameRoomRuleMultiplier(
        rule,
        uniqueOperatorIds,
        charId,
      );
      if (multiplier === 0) {
        continue;
      }

      const percent = rule.effect.percent * multiplier;
      bonusPercent += percent;
      appliedRules.push({
        id: rule.id,
        ownerCharId: charId,
        kind: "sameRoom",
        percent,
        multiplier,
        coverage: "complete",
      });
    }
  }

  for (const appliedRule of maxStackedRules.values()) {
    bonusPercent += appliedRule.percent;
    appliedRules.push({
      ...appliedRule,
      stackMode: "max",
    });
  }

  const downstreamEffects = appliedRules.filter(
    (rule) => Boolean(rule.targetRoomType),
  );
  const downstreamBonusPercentByRoom = Object.fromEntries(
    [...downstreamEffects]
      .reduce((effectMap, rule) => {
        const current = effectMap.get(rule.targetRoomType) || 0;
        effectMap.set(rule.targetRoomType, current + Number(rule.percent || 0));
        return effectMap;
      }, new Map())
      .entries(),
  );
  const downstreamBonusPercent = downstreamEffects.reduce(
    (total, rule) => total + Number(rule.percent || 0),
    0,
  );
  const localBonusPercent = bonusPercent - downstreamBonusPercent;

  return {
    roomType,
    product,
    valid: true,
    validation,
    basePercent: 100,
    bonusPercent,
    totalPercent: 100 + bonusPercent,
    localBonusPercent,
    localTotalPercent: 100 + localBonusPercent,
    downstreamEffects,
    downstreamBonusPercentByRoom,
    fallbackSlotCount: normalizedFallbackSlotCount,
    fallbackPercent: normalizedFallbackPercent,
    fallbackBonusPercent,
    appliedRules,
    missingOperatorIds,
  };
}
