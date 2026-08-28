/** Shared middle-variable calculation for stateful RIIC skills. */
import { getRiicOperatorTags } from "./riic-operator-tags.js";

const ROOM_VARIABLE_TYPES = new Set([
  "roomOperatorCountByTag",
  "roomSkillCountByTag",
]);

function normalizeId(value) {
  return String(value || "").trim();
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRoomsByKey(rooms) {
  return new Map(
    (rooms || [])
      .map((room) => [normalizeId(room?.key), room])
      .filter(([key]) => key),
  );
}

function getResolvedOperatorsById(resolvedSkills) {
  return new Map(
    (resolvedSkills?.operators || [])
      .map((operator) => [normalizeId(operator?.charId), operator])
      .filter(([charId]) => charId),
  );
}

function getActiveSkillIdsByOperator(resolvedSkills) {
  return new Map(
    (resolvedSkills?.operators || []).map((operator) => [
      normalizeId(operator?.charId),
      new Set(
        (operator?.activeSkillIds || [])
          .map((skillId) => normalizeId(skillId))
          .filter(Boolean),
      ),
    ]),
  );
}

function getRoomVariableMap(roomVariables, roomKey) {
  const key = normalizeId(roomKey);
  if (!roomVariables.has(key)) {
    roomVariables.set(key, new Map());
  }
  return roomVariables.get(key);
}

function getRoomSkillTagCount(room, resolvedOperatorsById, tag) {
  return (room?.operators || []).reduce((count, operator) => {
    const resolvedOperator = resolvedOperatorsById.get(
      normalizeId(operator?.charId),
    );
    const matched = (resolvedOperator?.activeRules || []).some((rule) =>
      (rule?.skillTags || []).includes(tag),
    );
    return count + (matched ? 1 : 0);
  }, 0);
}

function getRoomOperatorTagCount(room, tag) {
  return (room?.operators || []).reduce((count, operator) => {
    const tags = new Set([
      ...(Array.isArray(operator?.tags) ? operator.tags : []),
      ...getRiicOperatorTags(operator),
    ]);
    return count + (tags.has(tag) ? 1 : 0);
  }, 0);
}

function hasActiveSkill(
  activeSkillIdsByOperator,
  operatorId,
  sourceSkillId,
) {
  const normalizedSourceSkillId = normalizeId(sourceSkillId);
  if (!normalizedSourceSkillId) {
    return true;
  }
  return (
    activeSkillIdsByOperator.get(normalizeId(operatorId))?.has(
      normalizedSourceSkillId,
    ) === true
  );
}

function getPlanOperatorPresence({
  rooms,
  rule,
  activeSkillIdsByOperator,
} = {}) {
  const facility = normalizeId(rule?.facility);
  const operatorIds = new Set(
    (rule?.operatorIds || []).map(normalizeId).filter(Boolean),
  );
  const sourceOperatorId = normalizeId(rule?.sourceOperatorId);
  if (!facility || operatorIds.size === 0) {
    return 0;
  }

  return (rooms || []).some(
    (room) =>
      normalizeId(room?.facility) === facility &&
      (room?.operators || []).some((operator) => {
        const operatorId = normalizeId(operator?.charId);
        return (
          operatorIds.has(operatorId) &&
          (!sourceOperatorId || operatorId === sourceOperatorId) &&
          hasActiveSkill(
            activeSkillIdsByOperator,
            operatorId,
            rule?.sourceSkillId,
          )
        );
      }),
  )
    ? toFiniteNumber(rule?.value, 1)
    : 0;
}

function resolvePlanVariable({
  rule,
  planVariables,
  resourceValues,
  rooms,
  activeSkillIdsByOperator,
} = {}) {
  const type = normalizeId(rule?.type);
  if (type === "resource") {
    return toFiniteNumber(resourceValues?.[normalizeId(rule?.resource)]);
  }

  if (type === "resourceTransform") {
    const input = toFiniteNumber(
      planVariables.get(normalizeId(rule?.input)) ??
        resourceValues?.[normalizeId(rule?.input)],
    );
    const divisor = toFiniteNumber(rule?.divisor, 0);
    if (divisor <= 0) {
      return 0;
    }
    const value = input / divisor;
    return rule?.round === "floor" ? Math.floor(value) : value;
  }

  if (type === "facilityOperatorPresence") {
    return getPlanOperatorPresence({
      rooms,
      rule,
      activeSkillIdsByOperator,
    });
  }

  return null;
}

function calculateMiddleVariables({
  rooms,
  ruleData,
  resolvedSkills,
  resourceValues,
} = {}) {
  const definitions = ruleData?.middleDataRules || {};
  const variables = Array.isArray(definitions?.variables)
    ? definitions.variables
    : [];
  const roomVariables = new Map();
  const planVariables = new Map(
    Object.entries(resourceValues || {}).map(([key, value]) => [
      normalizeId(key),
      toFiniteNumber(value),
    ]),
  );
  const resolvedOperatorsById = getResolvedOperatorsById(resolvedSkills);
  const activeSkillIdsByOperator = getActiveSkillIdsByOperator(resolvedSkills);

  for (const room of rooms || []) {
    const roomKey = normalizeId(room?.key);
    if (!roomKey) {
      continue;
    }

    const values = getRoomVariableMap(roomVariables, roomKey);
    for (const rule of variables) {
      if (
        !ROOM_VARIABLE_TYPES.has(normalizeId(rule?.type)) ||
        normalizeId(rule?.scope || "room") !== "room" ||
        (rule?.roomType &&
          normalizeId(rule.roomType) !== normalizeId(room?.facility))
      ) {
        continue;
      }

      const tag = normalizeId(rule?.tag);
      if (!tag) {
        continue;
      }

      const value =
        rule.type === "roomOperatorCountByTag"
          ? getRoomOperatorTagCount(room, tag)
          : getRoomSkillTagCount(room, resolvedOperatorsById, tag);
      values.set(normalizeId(rule.id), value);
    }
  }

  for (const rule of variables) {
    if (normalizeId(rule?.scope || "plan") !== "plan") {
      continue;
    }
    const value = resolvePlanVariable({
      rule,
      planVariables,
      resourceValues,
      rooms,
      activeSkillIdsByOperator,
    });
    if (value !== null) {
      planVariables.set(normalizeId(rule.id), value);
    }
  }

  return {
    plan: Object.fromEntries(planVariables.entries()),
    rooms: Object.fromEntries(
      [...roomVariables.entries()].map(([roomKey, values]) => [
        roomKey,
        Object.fromEntries(values.entries()),
      ]),
    ),
  };
}

function getMiddleDataValue({
  variable,
  scope,
  roomKey,
  variableState,
} = {}) {
  const normalizedVariable = normalizeId(variable);
  if (!normalizedVariable) {
    return 0;
  }
  if (normalizeId(scope || "room") === "plan") {
    return toFiniteNumber(variableState?.plan?.[normalizedVariable]);
  }
  return toFiniteNumber(
    variableState?.rooms?.[normalizeId(roomKey)]?.[normalizedVariable],
  );
}

function getMiddleDataEntries(rule) {
  const declaredVariables = Array.isArray(rule?.middleData)
    ? rule.middleData
    : [];
  const effectsByVariable = new Map(
    (Array.isArray(rule?.effects) ? rule.effects : [])
      .map((effect) => [normalizeId(effect?.variable), effect])
      .filter(([variable]) => variable),
  );

  return declaredVariables.flatMap((entry) => {
    if (entry && typeof entry === "object") {
      return [entry];
    }

    const variable = normalizeId(entry);
    const effect = effectsByVariable.get(variable);
    return effect ? [{ ...effect, variable }] : [];
  });
}

function calculateMiddleDataEffects({
  rooms,
  ruleData,
  resolvedSkills,
  variableState,
} = {}) {
  const skillRules = Array.isArray(ruleData?.middleDataRules?.skills)
    ? ruleData.middleDataRules.skills
    : [];
  const activeSkillIdsByOperator = getActiveSkillIdsByOperator(resolvedSkills);
  const resolvedOperatorsById = getResolvedOperatorsById(resolvedSkills);
  const effectsByRoom = new Map();
  const roomsByKey = getRoomsByKey(rooms);

  for (const rule of skillRules) {
    const operatorId = normalizeId(rule?.operatorId);
    const sourceSkillId = normalizeId(rule?.sourceSkillId);
    const roomType = normalizeId(rule?.roomType);
    if (
      !operatorId ||
      !roomType ||
      !hasActiveSkill(
        activeSkillIdsByOperator,
        operatorId,
        sourceSkillId,
      )
    ) {
      continue;
    }

    const owner = resolvedOperatorsById.get(operatorId);
    for (const room of rooms || []) {
      if (
        normalizeId(room?.facility) !== roomType ||
        !(room?.operators || []).some(
          (operator) => normalizeId(operator?.charId) === operatorId,
        )
      ) {
        continue;
      }

      const roomKey = normalizeId(room?.key);
      const roomResult = effectsByRoom.get(roomKey) || {
        variables: variableState?.rooms?.[roomKey] || {},
        operatorBonuses: [],
        storageContributions: [],
      };

      for (const middleData of getMiddleDataEntries(rule)) {
        const variableValue = getMiddleDataValue({
          variable: middleData?.variable,
          scope: middleData?.scope,
          roomKey,
          variableState,
        });
        const amountPerUnit = toFiniteNumber(
          middleData?.amountPerUnit,
          0,
        );
        const amount = variableValue * amountPerUnit;
        if (!Number.isFinite(amount) || amount === 0) {
          continue;
        }

        const effect = {
          ruleId: normalizeId(rule?.id),
          sourceSkillId,
          operatorId,
          operatorName: String(owner?.name || operatorId),
          buffName: String(rule?.buffName || ""),
          variable: normalizeId(middleData?.variable),
          variableValue,
          metric: normalizeId(middleData?.metric),
          amount,
        };

        if (effect.metric === "storageCapacity") {
          roomResult.storageContributions.push({
            operatorId,
            name: String(owner?.name || operatorId),
            delta: amount,
            increase: Math.max(0, amount),
            rules: [
              {
                ruleId: effect.ruleId,
                sourceSkillId,
                buffName: effect.buffName,
                amount,
                increase: Math.max(0, amount),
                variable: effect.variable,
                variableValue,
              },
            ],
          });
        } else if (effect.metric === "production") {
          roomResult.operatorBonuses.push({
            ...effect,
            bonusPercent: amount,
          });
        }
      }

      effectsByRoom.set(roomKey, roomResult);
    }
  }

  return {
    variables: variableState,
    rooms: Object.fromEntries(
      [...effectsByRoom.entries()]
        .filter(([roomKey]) => roomsByKey.has(roomKey))
        .map(([roomKey, result]) => [roomKey, result]),
    ),
  };
}

export function calculateRiicMiddleData({
  rooms = [],
  ruleData,
  resolvedSkills,
  resourceValues = {},
} = {}) {
  const variables = calculateMiddleVariables({
    rooms,
    ruleData,
    resolvedSkills,
    resourceValues,
  });
  return calculateMiddleDataEffects({
    rooms,
    ruleData,
    resolvedSkills,
    variableState: variables,
  });
}
