const VALID_ROOM_TYPES = new Set([
  "trading",
  "manufacture",
  "meeting",
  "hire",
]);
const OPERATOR_EFFICIENCY_METRIC_BY_ROOM_TYPE = Object.freeze({
  trading: "orderEfficiency",
  manufacture: "production",
  meeting: "clueSearch",
  hire: "contactSpeed",
});

function normalizeTeamIndex(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function normalizeRoomType(value) {
  const roomType = String(value || "").trim();
  return VALID_ROOM_TYPES.has(roomType) ? roomType : "";
}

function normalizeProduct(value) {
  const product = String(value || "").trim();
  return product || "all";
}

function normalizeTargetOperatorIds(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeEffectConditions(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const conditions = {};
  const controlCoassignedOperatorIds = normalizeTargetOperatorIds(
    value.controlCoassignedOperatorIds,
  );
  const perControlOperatorIds = normalizeTargetOperatorIds(
    value.perControlOperatorIds,
  );

  if (controlCoassignedOperatorIds.length > 0) {
    conditions.controlCoassignedOperatorIds = controlCoassignedOperatorIds;
  }
  if (perControlOperatorIds.length > 0) {
    conditions.perControlOperatorIds = perControlOperatorIds;
  }

  if (Object.hasOwn(value, "trainingInProgress")) {
    conditions.trainingInProgress = Boolean(value.trainingInProgress);
  }
  if (value.sourceMorale && typeof value.sourceMorale === "object") {
    conditions.sourceMorale = { ...value.sourceMorale };
  }

  return Object.keys(conditions).length > 0 ? conditions : null;
}

function normalizeEffect(effect, sourceTeamIndex, sourceOperatorIds) {
  const target = effect?.target || {};
  const scope = String(target?.scope || "").trim();
  const roomType = normalizeRoomType(target?.roomType);
  const product = normalizeProduct(target?.product);
  const metric = String(effect?.metric || "").trim();
  const bonusPercent = Number(effect?.bonusPercent);
  const targetOperatorIds = normalizeTargetOperatorIds(target?.operatorIds);
  const conditions = normalizeEffectConditions(effect?.conditions);

  if (
    !["allRooms", "operators"].includes(scope) ||
    !roomType ||
    !metric ||
    !Number.isFinite(bonusPercent) ||
    bonusPercent === 0 ||
    (scope === "operators" && targetOperatorIds.length === 0)
  ) {
    return null;
  }

  return {
    scope,
    sourceTeamIndex,
    sourceOperatorIds: [...new Set(sourceOperatorIds || [])],
    targetOperatorIds,
    roomType,
    product,
    metric,
    bonusPercent,
    conditions,
  };
}

function mergeSourceOperatorIds(left, right) {
  return [...new Set([...(left || []), ...(right || [])])];
}

function getEffectMergeKey(effect) {
  return [
    effect.scope,
    effect.roomType,
    effect.product,
    effect.metric,
    (effect.targetOperatorIds || []).join(","),
    JSON.stringify(effect.conditions || null),
  ].join(":");
}

function mergeEffectByHighestBonus(effects) {
  const effectsByKey = new Map();

  for (const effect of effects || []) {
    const key = getEffectMergeKey(effect);
    const existing = effectsByKey.get(key);

    if (!existing || effect.bonusPercent > existing.bonusPercent) {
      effectsByKey.set(key, effect);
      continue;
    }

    if (effect.bonusPercent === existing.bonusPercent) {
      effectsByKey.set(key, {
        ...existing,
        sourceOperatorIds: mergeSourceOperatorIds(
          existing.sourceOperatorIds,
          effect.sourceOperatorIds,
        ),
      });
    }
  }

  return [...effectsByKey.values()];
}

export function buildRiicControlCenterRuntimeContext({ controlState } = {}) {
  if (controlState?.status !== "ready") {
    return {
      status: controlState?.status || "unavailable",
      effectsByTeamIndex: {},
    };
  }

  const effectsByTeamIndex = new Map();
  for (const segment of controlState.segments || []) {
    const teamIndex = normalizeTeamIndex(segment?.teamIndex);
    if (teamIndex === null) {
      continue;
    }

    const segmentOperators = Array.isArray(segment?.operators)
      ? segment.operators
      : [];
    const segmentOperatorIds = [
      ...new Set(
        (segment?.operatorIds || [])
          .map((operatorId) => String(operatorId || "").trim())
          .filter(Boolean),
      ),
    ];
    const effects = [];

    for (const operator of segmentOperators) {
      const operatorId = String(operator?.charId || "").trim();
      if (!operatorId) {
        continue;
      }

      for (const effect of operator?.controlCenterResolvedEffects || []) {
        const normalizedEffect = normalizeEffect(
          effect,
          teamIndex,
          [operatorId],
        );
        if (normalizedEffect) {
          effects.push(normalizedEffect);
        }
      }
    }

    const knownOperatorIds = segmentOperatorIds.length
      ? segmentOperatorIds
      : segmentOperators
          .map((operator) => String(operator?.charId || "").trim())
          .filter(Boolean);
    const mergedEffects = mergeEffectByHighestBonus(
      effects.map((effect) => ({
        ...effect,
        sourceOperatorIds: mergeSourceOperatorIds(
          effect.sourceOperatorIds,
          knownOperatorIds.filter((operatorId) =>
            effect.sourceOperatorIds.includes(operatorId),
          ),
        ),
      })),
    );
    const existingEffects = effectsByTeamIndex.get(teamIndex) || [];
    effectsByTeamIndex.set(
      teamIndex,
      mergeEffectByHighestBonus([...existingEffects, ...mergedEffects]),
    );
  }

  return {
    status: "ready",
    effectsByTeamIndex: Object.fromEntries(
      [...effectsByTeamIndex.entries()].map(([teamIndex, effects]) => [
        String(teamIndex),
        effects,
      ]),
    ),
  };
}

function getTeamEffectsForScope(
  context,
  teamIndex,
  scope,
  operatorIds,
  { includeConditional = true } = {},
) {
  const effects = context?.effectsByTeamIndex?.[String(teamIndex)] || [];
  const roomType = normalizeRoomType(scope?.roomType);
  const product = String(scope?.product || "").trim();
  const candidateOperatorIdSet = new Set(
    (operatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean),
  );
  const roomEffectsByKey = new Map();
  const operatorEffects = [];

  for (const effect of effects) {
    if (!includeConditional && effect.conditions) {
      continue;
    }

    if (
      effect.roomType !== roomType ||
      (effect.product !== "all" && effect.product !== product)
    ) {
      continue;
    }

    if (effect.scope === "operators") {
      const affectedOperatorIds = (effect.targetOperatorIds || []).filter(
        (operatorId) => candidateOperatorIdSet.has(operatorId),
      );
      if (affectedOperatorIds.length === 0) {
        continue;
      }

      for (const operatorId of affectedOperatorIds) {
        operatorEffects.push({
          ...effect,
          sourceTeamIndex: teamIndex,
          affectedOperatorIds: [operatorId],
        });
      }
      continue;
    }

    const effectKey = [
      effect.metric,
      JSON.stringify(effect.conditions || null),
    ].join(":");
    const existing = roomEffectsByKey.get(effectKey);
    if (!existing || effect.bonusPercent > existing.bonusPercent) {
      roomEffectsByKey.set(effectKey, {
        ...effect,
        sourceTeamIndex: teamIndex,
      });
    } else if (effect.bonusPercent === existing.bonusPercent) {
      roomEffectsByKey.set(effectKey, {
        ...existing,
        sourceOperatorIds: mergeSourceOperatorIds(
          existing.sourceOperatorIds,
          effect.sourceOperatorIds,
        ),
      });
    }
  }

  return [...roomEffectsByKey.values(), ...operatorEffects];
}

function getContextTeamIndexes(context) {
  return Object.keys(context?.effectsByTeamIndex || {})
    .map(normalizeTeamIndex)
    .filter((teamIndex) => teamIndex !== null)
    .sort((left, right) => left - right);
}

function createEmptyRoomAdjustment() {
  return {
    bonusPercent: 0,
    facilityBonusPercent: 0,
    operatorBonusPercent: 0,
    operatorBonusById: {},
    operatorEffects: [],
    sameShiftBindings: [],
    facilityCalculation: {
      totalHours: 0,
      weightedBonusPercent: 0,
      segments: [],
    },
    operatorCalculation: {
      totalHours: 0,
      weightedBonusPercent: 0,
      segments: [],
    },
  };
}

function hasEffectConditions(effect) {
  return Boolean(
    effect?.conditions && Object.keys(effect.conditions).length > 0,
  );
}

function getCandidateOperatorEffects(effects) {
  const effectsByKey = new Map();

  for (const effect of effects || []) {
    if (effect.scope !== "operators" || hasEffectConditions(effect)) {
      continue;
    }

    const key = [
      effect.roomType,
      effect.product,
      effect.metric,
      (effect.affectedOperatorIds || []).join(","),
    ].join(":");
    const existing = effectsByKey.get(key);

    if (
      !existing ||
      Number(effect.bonusPercent) > Number(existing.bonusPercent)
    ) {
      effectsByKey.set(key, effect);
    } else if (
      Number(effect.bonusPercent) === Number(existing.bonusPercent)
    ) {
      effectsByKey.set(key, {
        ...existing,
        sourceOperatorIds: mergeSourceOperatorIds(
          existing.sourceOperatorIds,
          effect.sourceOperatorIds,
        ),
      });
    }
  }

  return [...effectsByKey.values()];
}

/**
 * Reduces a same-shift binding to the effective room and operator bonuses.
 * L65 uses it while searching; L74 uses the same reduction after assembly.
 */
export function getRiicSameShiftBindingBonusBreakdown(binding) {
  const effects = Array.isArray(binding?.effects) ? binding.effects : [];
  const operatorEfficiencyMetric =
    OPERATOR_EFFICIENCY_METRIC_BY_ROOM_TYPE[
      normalizeRoomType(binding?.roomType)
    ] || "";
  const highestFacilityBonusByMetric = new Map();
  const highestOperatorBonusBySourceMetricAndId = new Map();

  for (const effect of effects) {
    const bonusPercent = Number(effect?.bonusPercent || 0);
    if (!Number.isFinite(bonusPercent) || bonusPercent === 0) {
      continue;
    }

    const affectedOperatorIds = (effect?.affectedOperatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean);
    const isOperatorEffect =
      String(effect?.scope || "").trim() === "operators" ||
      affectedOperatorIds.length > 0;
    if (!isOperatorEffect) {
      const metric = String(effect?.metric || "").trim();
      const existing = highestFacilityBonusByMetric.get(metric);
      if (!Number.isFinite(existing) || bonusPercent > existing) {
        highestFacilityBonusByMetric.set(metric, bonusPercent);
      }
      continue;
    }
    if (String(effect?.metric || "").trim() !== operatorEfficiencyMetric) {
      continue;
    }

    for (const operatorId of affectedOperatorIds) {
      const key = [
        ...(effect?.sourceOperatorIds || [])
          .map((sourceOperatorId) => String(sourceOperatorId || "").trim())
          .filter(Boolean)
          .sort(),
        String(effect?.metric || "").trim(),
        operatorId,
      ].join(":");
      const existing = highestOperatorBonusBySourceMetricAndId.get(key);
      if (!existing || bonusPercent > existing.bonusPercent) {
        highestOperatorBonusBySourceMetricAndId.set(key, {
          operatorId,
          bonusPercent,
        });
      }
    }
  }

  let facilityBonusPercent = [...highestFacilityBonusByMetric.values()].reduce(
    (total, bonusPercent) => total + Number(bonusPercent || 0),
    0,
  );
  const operatorBonusById = {};
  for (const { operatorId, bonusPercent } of highestOperatorBonusBySourceMetricAndId.values()) {
    operatorBonusById[operatorId] =
      Number(operatorBonusById[operatorId] || 0) + Number(bonusPercent || 0);
  }
  const operatorBonusPercent = Object.values(operatorBonusById).reduce(
    (total, bonusPercent) => total + Number(bonusPercent || 0),
    0,
  );

  if (
    effects.length === 0 &&
    Number.isFinite(Number(binding?.bonusPercent))
  ) {
    facilityBonusPercent = Number(binding.bonusPercent);
  }

  return {
    facilityBonusPercent,
    operatorBonusPercent,
    bonusPercent: facilityBonusPercent + operatorBonusPercent,
    operatorBonuses: Object.entries(operatorBonusById).map(
      ([operatorId, bonusPercent]) => ({
        operatorId,
        bonusPercent,
      }),
    ),
  };
}

/**
 * Resolves the current control-center effects for candidate materialization.
 *
 * Candidate generation has no room rotation yet, so it applies the complete
 * unconditional operator-targeted estimate to candidate ranking. Every
 * applicable effect remains in sameShiftBindings so the assembled schedule
 * can replace that estimate with its actual same-shift result.
 */
export function getRiicControlCenterRoomAdjustment({
  context,
  scope,
  operatorIds = [],
} = {}) {
  if (context?.status !== "ready") {
    return createEmptyRoomAdjustment();
  }

  const teamIndexes = getContextTeamIndexes(context);
  if (teamIndexes.length === 0) {
    return createEmptyRoomAdjustment();
  }

  const bindingTeams = teamIndexes.flatMap((teamIndex) => {
    const effects = getTeamEffectsForScope(
      context,
      teamIndex,
      scope,
      operatorIds,
      { includeConditional: true },
    );
    if (effects.length === 0) {
      return [];
    }

    return [
      {
        sourceTeamIndex: teamIndex,
        sourceOperatorIds: [
          ...new Set(
            effects.flatMap((effect) => effect.sourceOperatorIds || []),
          ),
        ],
        roomType: String(scope?.roomType || "").trim(),
        product: String(scope?.product || "").trim(),
        effects,
      },
    ];
  });

  const operatorEfficiencyMetric =
    OPERATOR_EFFICIENCY_METRIC_BY_ROOM_TYPE[
      normalizeRoomType(scope?.roomType)
    ] || "";
  const candidateOperatorEffectsByTeamIndex = {};
  const operatorBonusByTeamIndex = {};
  const candidateOperatorEffects = [];
  for (const teamIndex of teamIndexes) {
    const teamEffects = getCandidateOperatorEffects(
      getTeamEffectsForScope(context, teamIndex, scope, operatorIds, {
        includeConditional: false,
      }),
    );
    candidateOperatorEffectsByTeamIndex[String(teamIndex)] = teamEffects;
    candidateOperatorEffects.push(...teamEffects);

    const operatorEfficiencyEffects = teamEffects.filter(
      (effect) => effect.metric === operatorEfficiencyMetric,
    );
    const teamBonusById = {};
    for (const effect of operatorEfficiencyEffects) {
      for (const operatorId of effect.affectedOperatorIds || []) {
        teamBonusById[operatorId] =
          Number(teamBonusById[operatorId] || 0) +
          Number(effect.bonusPercent || 0);
      }
    }
    operatorBonusByTeamIndex[String(teamIndex)] = teamBonusById;
  }

  const operatorBonusById = {};
  for (const teamBonusById of Object.values(operatorBonusByTeamIndex)) {
    for (const [operatorId, bonusPercent] of Object.entries(
      teamBonusById,
    )) {
      if (!Object.hasOwn(operatorBonusById, operatorId)) {
        operatorBonusById[operatorId] = Number(bonusPercent || 0);
      } else {
        operatorBonusById[operatorId] = Math.max(
          Number(operatorBonusById[operatorId] || 0),
          Number(bonusPercent || 0),
        );
      }
    }
  }
  const operatorBonusPercent = Object.values(operatorBonusById).reduce(
    (total, bonusPercent) => total + Number(bonusPercent || 0),
    0,
  );

  const operatorCalculation = {
    totalHours: 0,
    weightedBonusPercent: operatorBonusPercent,
    segments: teamIndexes.map((teamIndex) => {
      const bonusPercent = Object.values(
        operatorBonusByTeamIndex[String(teamIndex)] || {},
      ).reduce(
        (total, value) => total + Number(value || 0),
        0,
      );

      return {
        index: teamIndex,
        durationHours: 0,
        teams: [{ teamIndex, bonusPercent }],
        segmentBonus: bonusPercent,
      };
    }),
  };

  return {
    bonusPercent: operatorBonusPercent,
    facilityBonusPercent: 0,
    operatorBonusPercent,
    operatorBonusById,
    operatorBonusByTeamIndex,
    operatorEffects: candidateOperatorEffects,
    operatorEffectsByTeamIndex: candidateOperatorEffectsByTeamIndex,
    sameShiftBindings: bindingTeams,
    facilityCalculation: {
      totalHours: 0,
      weightedBonusPercent: 0,
      segments: [],
    },
    operatorCalculation,
  };
}
