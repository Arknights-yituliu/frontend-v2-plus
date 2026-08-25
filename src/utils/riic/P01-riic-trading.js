import BUILDING_TABLE from "../../static/json/build/building_table.json" with {
  type: "json",
};
import REPLACE_GROUPS from "../../static/json/build/logistics_skill_replace_groups.json" with {
  type: "json",
};
import BASELINE_RULES from "../../static/json/tools/R00-baseline.json" with {
  type: "json",
};
import {
  calculateRiicExpectedPerHour,
  getRiicTradeAverageOrderDistribution,
  RIIC_TRADE_ORDER_DISTRIBUTION_BY_LEVEL,
  RIIC_TRADE_ORDER_GOLD,
} from "./riic-trade-order-model.js";
import {
  resolveRiicTradingExternalOrderBonuses,
} from "./riic-trading-context.js";

const ORDER_GOLD = RIIC_TRADE_ORDER_GOLD;
const ORDER_DISTRIBUTION_BY_LEVEL =
  RIIC_TRADE_ORDER_DISTRIBUTION_BY_LEVEL;

const PURE_GOLD_LMD_VALUE = 500;
const ORUNDUM_TRADE_CAPACITY_PER_HOUR = 10;
const ORUNDUM_PER_ORIGINIUM_SHARD = 10;
const CLOSURE_ID = "char_4228_closur";
const EBENHOLZ_ID = "char_4046_ebnhlz";
const BUTSHU_ID = "char_4032_provs";
const TEQUILA_ID = "char_486_takila";
const TAILOR_ID = "char_252_bibeak";
const SHAMARE_ID = "char_254_vodfox";
const KICHI_ID = "char_4203_kichi";
const ARCHET_ID = "char_332_archet";
const VIGNA_ID = "char_1019_siege2";
const DEGENBRECHER_ID = "char_4116_blkkgt";
const GLASGOW_OPERATOR_IDS = new Set([
  "char_112_siege",
  "char_154_morgan",
  "char_157_dagda",
  "char_155_tiger",
]);
const ARCHET_ALPHA_SKILL_ID =
  `${ARCHET_ID}|trading|\u8654\u8bda\u7b79\u6b3e\u00b7\u03b1|0|1`;
const ARCHET_BETA_SKILL_ID =
  `${ARCHET_ID}|trading|\u8654\u8bda\u7b79\u6b3e\u00b7\u03b2|2|1`;
const VIGNA_BETA_SKILL_ID =
  `${VIGNA_ID}|trading|\u5916\u8d38\u51b3\u8bae\u00b7\u03b2|2|1`;
const DEGENBRECHER_CHAMPION_SKILL_ID =
  `${DEGENBRECHER_ID}|trading|\u51a0\u519b\u98ce\u91c7|2|1`;

const HIGH_QUALITY_ORDER_PATTERN =
  /\u9ad8\u54c1\u8d28\u8d35\u91d1\u5c5e\u8ba2\u5355/;
const ORDER_EFFICIENCY_CLAUSE_PATTERN =
  /\u8ba2\u5355\u83b7\u53d6\u6548\u7387[^+]*\+\s*\d+(?:\.\d+)?%/;
const HARMLESS_EXCLUSION_PATTERN =
  /\u5fc3\u60c5|\u8ba2\u5355\u4e0a\u9650/;
const ALLOWED_IGNORED_MECHANICS = new Set([
  "morale",
  "orderLimit",
  "conditionalThresholdApproximation",
]);
const LMD_ONLY_EXCLUSION_REASONS = new Set([
  "specialOrderOrProbability",
  "timeDependentOrThreshold",
]);

const SKILL_STATES_BY_CHAR_ID = groupByCharId(
  (BASELINE_RULES.skillStates || []).filter(
    (state) => state.roomType === "trading",
  ),
);
const DIRECT_RULES_BY_CHAR_ID = groupByCharId(
  (BASELINE_RULES.rules || []).filter(
    (rule) => rule.roomType === "trading",
  ),
);
const SAME_ROOM_RULES_BY_CHAR_ID = groupByCharId(
  (BASELINE_RULES.sameRoomRules || []).filter(
    (rule) => rule.roomType === "trading",
  ),
);
const EXCLUSIONS_BY_CHAR_ID = groupByCharId(
  (BASELINE_RULES.exclusions || []).filter(
    (rule) => rule.roomType === "trading",
  ),
);
const BUILDING_SKILLS_BY_CHAR_ID = groupByCharId(
  (BUILDING_TABLE || [])
    .filter((skill) => skill.roomType === "trading")
    .map((skill) => ({
      ...skill,
      id: createSkillId(skill),
    })),
);

function groupByCharId(items) {
  const result = new Map();

  for (const item of items || []) {
    const charId = String(item?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const entries = result.get(charId) || [];
    entries.push(item);
    result.set(charId, entries);
  }

  return result;
}

function createSkillId({ charId, roomType, buffName, phase, level }) {
  return [charId, roomType, buffName, phase, level].join("|");
}

function getUnlockRank(unlock) {
  return Number(unlock?.phase || 0) * 1000 + Number(unlock?.level || 1);
}

function isUnlocked(operator, unlock) {
  if (operator.elite > Number(unlock?.phase || 0)) {
    return true;
  }

  if (operator.elite < Number(unlock?.phase || 0)) {
    return false;
  }

  return operator.level >= Number(unlock?.level || 1);
}

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function createFailure(
  type,
  product,
  error,
  durationHours = null,
  diagnostics = null,
) {
  const normalizedDurationHours =
    Number.isFinite(Number(durationHours)) && Number(durationHours) >= 0
      ? Number(durationHours)
      : 0;
  const result = createSuccess({
    type,
    product,
    durationHours: normalizedDurationHours,
    rate: 0,
    lmd: 0,
    gold: 0,
    virtualGold: 0,
    orundumCapacity: 0,
    shardConsumption: 0,
  });
  result.warning = true;
  result.warnings = [
    {
      code: error || "calculationWarning",
      ...(diagnostics ? { diagnostics } : {}),
    },
  ];
  result.error = error || "calculationWarning";
  if (diagnostics) {
    result.diagnostics = diagnostics;
  }
  return result;
}

function appendCalculationWarnings(result, warnings = []) {
  if (!result || !Array.isArray(warnings) || warnings.length === 0) {
    return result;
  }

  return {
    ...result,
    warning: true,
    warnings: [...(result.warnings || []), ...warnings],
  };
}

function createSuccess({
  type,
  product,
  durationHours,
  rate,
  lmd,
  gold,
  virtualGold,
  orundumCapacity,
  shardConsumption = 0,
}) {
  return {
    ok: true,
    type,
    product,
    durationHours: round(durationHours),
    rate: round(rate),
    lmd: round(lmd),
    gold: round(gold),
    virtualGold: round(virtualGold),
    orundumCapacity: round(orundumCapacity),
    shardConsumption: round(shardConsumption),
    segment: {
      lmdOutput: round(lmd * durationHours),
      goldConsumption: round(Math.max(0, -gold * durationHours)),
      virtualGoldOutput: round(virtualGold * durationHours),
      orundumOutput: round(orundumCapacity * durationHours),
      shardConsumption: round(shardConsumption * durationHours),
    },
    error: "",
  };
}

function normalizeOperators(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();

  for (const source of value) {
    const charId = String(source?.charId || "").trim();
    const rawElite = Number(source?.elite);
    const rawLevel = Number(source?.level);
    const elite =
      Number.isInteger(rawElite) && rawElite >= 0 ? rawElite : 0;
    const level =
      Number.isInteger(rawLevel) && rawLevel >= 1 ? rawLevel : 1;
    if (
      !charId ||
      !Number.isInteger(elite) ||
      elite < 0 ||
      !Number.isInteger(level) ||
      level < 1
    ) {
      continue;
    }
    if (seen.has(charId)) {
      continue;
    }

    seen.add(charId);
    normalized.push({ charId, elite, level });
  }

  return normalized;
}

function getInvalidOperatorDiagnostics(value) {
  if (!Array.isArray(value)) {
    return {
      receivedOperators: [],
      invalidOperators: [
        {
          index: null,
          invalidFields: ["operators"],
          reason: "notArray",
        },
      ],
    };
  }

  const seen = new Set();
  const receivedOperators = value.map((source) => ({
    charId: source?.charId,
    elite: source?.elite,
    level: source?.level,
  }));
  const invalidOperators = [];

  for (const [index, source] of value.entries()) {
    const charId = String(source?.charId || "").trim();
    const elite = Number(source?.elite);
    const level = Number(source?.level);
    const invalidFields = [];

    if (!charId) {
      invalidFields.push("charId");
    } else if (seen.has(charId)) {
      invalidFields.push("charId(duplicate)");
    }
    if (!Number.isInteger(elite) || elite < 0) {
      invalidFields.push("elite");
    }
    if (!Number.isInteger(level) || level < 1) {
      invalidFields.push("level");
    }

    if (invalidFields.length) {
      invalidOperators.push({
        index,
        charId: source?.charId,
        elite: source?.elite,
        level: source?.level,
        invalidFields,
      });
    }
    if (charId) {
      seen.add(charId);
    }
  }

  return {
    receivedOperators,
    invalidOperators,
  };
}

function normalizeTradingFactors(value, operators) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const product = String(value?.product || "").trim();
  const stationLevel = Number(value?.stationLevel);
  const roomBonus = Number(value?.roomBonus ?? 0);
  const hasLocalOrderBonusOverride = Object.hasOwn(
    value?.orderAdjustment || {},
    "localOrderBonusOverride",
  );
  const localOrderBonusOverride = hasLocalOrderBonusOverride
    ? Number(value.orderAdjustment.localOrderBonusOverride)
    : null;
  const ignoredUnsupportedOperatorIds = new Set(
    (value?.orderAdjustment?.ignoredUnsupportedOperatorIds || [])
      .map((charId) => String(charId || "").trim())
      .filter(Boolean),
  );
  const rawOperatorBonuses =
    value?.operatorBonusesById &&
    typeof value.operatorBonusesById === "object"
      ? value.operatorBonusesById
      : {};
  const operatorIds = new Set(operators.map((operator) => operator.charId));
  const operatorBonusesById = {};

  if (
    !["lmd", "orundum"].includes(product) ||
    !Number.isInteger(stationLevel) ||
    ![1, 2, 3].includes(stationLevel) ||
    !Number.isFinite(roomBonus) ||
    (hasLocalOrderBonusOverride && !Number.isFinite(localOrderBonusOverride))
  ) {
    return null;
  }
  if (
    [...ignoredUnsupportedOperatorIds].some(
      (charId) => !operatorIds.has(charId),
    )
  ) {
    return null;
  }

  for (const [charId, sourceBonus] of Object.entries(rawOperatorBonuses)) {
    const bonus = Number(sourceBonus);
    if (!operatorIds.has(charId) || !Number.isFinite(bonus)) {
      return null;
    }
    operatorBonusesById[charId] = bonus;
  }

  const crossRoomFactors =
    value?.crossRoomFactors && typeof value.crossRoomFactors === "object"
      ? value.crossRoomFactors
      : {};
  const rawSilentResonance = Number(crossRoomFactors?.silentResonance);
  const silentResonance =
    Number.isFinite(rawSilentResonance) && rawSilentResonance >= 0
      ? rawSilentResonance
      : null;
  const rawResolvedExternalOrderBonuses =
    crossRoomFactors?.resolvedExternalOrderBonuses &&
    typeof crossRoomFactors.resolvedExternalOrderBonuses === "object"
      ? crossRoomFactors.resolvedExternalOrderBonuses
      : null;
  const resolvedExternalOrderBonuses = rawResolvedExternalOrderBonuses
    ? Object.fromEntries(
        Object.entries(rawResolvedExternalOrderBonuses)
          .map(([skillId, value]) => [String(skillId || "").trim(), Number(value)])
          .filter(([skillId, bonus]) => skillId && Number.isFinite(bonus)),
      )
    : null;

  return {
    product,
    stationLevel,
    roomBonus,
    operatorBonusesById,
    orderAdjustment: {
      localOrderBonusOverride,
      ignoredUnsupportedOperatorIds,
    },
    crossRoomFactors: {
      silentResonance,
      resolvedExternalOrderBonuses,
    },
  };
}

function getSpecialType(operators, product) {
  if (product !== "lmd") {
    return "normal";
  }

  const operatorIds = new Set(operators.map((operator) => operator.charId));
  if (operatorIds.has(CLOSURE_ID)) {
    return "closure";
  }
  if (operatorIds.has(BUTSHU_ID) || operatorIds.has(TEQUILA_ID)) {
    return "butshu";
  }
  return "normal";
}

function getActiveStates(operator) {
  const activeStackStates = [];
  const activeReplacementStates = new Map();

  for (const state of SKILL_STATES_BY_CHAR_ID.get(operator.charId) || []) {
    if (!isUnlocked(operator, state.unlock)) {
      continue;
    }

    if (
      state?.activation?.mode !== "replace" ||
      !String(state?.activation?.group || "").trim()
    ) {
      activeStackStates.push(state);
      continue;
    }

    const group = String(state.activation.group).trim();
    const current = activeReplacementStates.get(group);
    if (
      !current ||
      getUnlockRank(state.unlock) > getUnlockRank(current.unlock) ||
      (getUnlockRank(state.unlock) === getUnlockRank(current.unlock) &&
        state.id.localeCompare(current.id, "en") < 0)
    ) {
      activeReplacementStates.set(group, state);
    }
  }

  return [
    ...activeStackStates,
    ...activeReplacementStates.values(),
  ].sort((left, right) => left.id.localeCompare(right.id, "en"));
}

function hasUnknownUnlockedTradingSkill(operator, activeStateIds) {
  const knownStateIds = new Set(
    (SKILL_STATES_BY_CHAR_ID.get(operator.charId) || []).map(
      (state) => state.id,
    ),
  );

  return (BUILDING_SKILLS_BY_CHAR_ID.get(operator.charId) || []).some(
    (skill) =>
      isUnlocked(operator, {
        phase: skill.phase,
        level: skill.level,
      }) &&
      !knownStateIds.has(skill.id) &&
      !activeStateIds.has(skill.id) &&
      !isHighQualityOrderProbabilitySkill(skill),
  );
}

function isTimeDependentOrderProbability(exclusion) {
  return HIGH_QUALITY_ORDER_PATTERN.test(
    String(exclusion?.rawDescription || ""),
  );
}

function isHarmlessExclusion(exclusion) {
  const description = String(exclusion?.rawDescription || "");
  return (
    HARMLESS_EXCLUSION_PATTERN.test(description) &&
    !/\u8ba2\u5355\u83b7\u53d6\u6548\u7387/.test(description)
  );
}

function isCompleteOutputRule(rule) {
  if (rule?.effect?.coverage === "complete") {
    return true;
  }

  const description = String(rule?.rawDescription || "");
  const trailingDescription = description
    .replace(/\u8fdb\u9a7b\u8d38\u6613\u7ad9\u65f6/g, "")
    .replace(ORDER_EFFICIENCY_CLAUSE_PATTERN, "")
    .replace(
      /[,\uff0c]?\u5fc3\u60c5\u6bcf\u5c0f\u65f6\u6d88\u8017[+-]\d+(?:\.\d+)?/g,
      "",
    )
    .replace(
      /[,\uff0c]?(?:\u4e14)?\u8ba2\u5355\u4e0a\u9650[+-]\d+(?:\.\d+)?/g,
      "",
    )
    .replace(/[,\uff0c\u3002\uff1b;\s]/g, "");
  return (
    ORDER_EFFICIENCY_CLAUSE_PATTERN.test(description) &&
    trailingDescription.length === 0 &&
    HARMLESS_EXCLUSION_PATTERN.test(description)
  );
}

function isLmdOnlyExclusion(rule) {
  return LMD_ONLY_EXCLUSION_REASONS.has(
    String(rule?.reason || "").trim(),
  );
}

function isHighQualityOrderProbabilitySkill(skill) {
  return HIGH_QUALITY_ORDER_PATTERN.test(
    String(skill?.rawDescription || skill?.description || ""),
  );
}

function getHighQualityOrderProbabilityVariant(rule) {
  if (!isHighQualityOrderProbabilitySkill(rule)) {
    return null;
  }

  return String(rule?.rawDescription || rule?.description || "").includes(
    "\u5c0f\u5e45\u63d0\u5347",
  )
    ? "alpha"
    : "\u63d0\u5347";
}

function getUnmodeledHighQualityOrderSkills(operator, activeStateIds) {
  const activeStackSkills = [];
  const activeReplacementSkills = new Map();

  for (const skill of BUILDING_SKILLS_BY_CHAR_ID.get(operator.charId) || []) {
    if (
      !isUnlocked(operator, {
        phase: skill.phase,
        level: skill.level,
      }) ||
      activeStateIds.has(skill.id) ||
      !isHighQualityOrderProbabilitySkill(skill)
    ) {
      continue;
    }

    const replacementGroup = String(REPLACE_GROUPS[skill.id] || "").trim();
    if (!replacementGroup) {
      activeStackSkills.push(skill);
      continue;
    }

    const current = activeReplacementSkills.get(replacementGroup);
    if (
      !current ||
      getUnlockRank(skill) > getUnlockRank(current) ||
      (getUnlockRank(skill) === getUnlockRank(current) &&
        skill.id.localeCompare(current.id, "en") < 0)
    ) {
      activeReplacementSkills.set(replacementGroup, skill);
    }
  }

  return [
    ...activeStackSkills,
    ...activeReplacementSkills.values(),
  ]
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
    .map((skill) => ({
      id: skill.id,
      charId: skill.charId,
      name: skill.name,
      buffName: skill.buffName,
      roomType: skill.roomType,
      rawDescription: String(skill.description || "").replace(
        /<[^>]*>/g,
        "",
      ),
    }));
}

function hasResolvableSameRoomRule(rule, sameRoomRules, product) {
  return (sameRoomRules || []).some(
    (sameRoomRule) =>
      String(sameRoomRule?.sourceSkillId || "").trim() ===
        String(rule?.sourceSkillId || rule?.id || "").trim() &&
      isProductCompatible(sameRoomRule, product) &&
      ["sameRoomHasAny", "sameRoomMemberCount"].includes(
        String(sameRoomRule?.condition?.type || "").trim(),
      ),
  );
}

function getLegacyExternalOrderBonus(rule, facilityContext, operators) {
  const skillId = String(rule?.sourceSkillId || rule?.id || "").trim();

  if (skillId === VIGNA_BETA_SKILL_ID) {
    return operators.some((operator) =>
      GLASGOW_OPERATOR_IDS.has(operator.charId),
    )
      ? 10
      : 0;
  }

  const resolvedExternalOrderBonuses =
    facilityContext?.resolvedExternalOrderBonuses;
  return resolvedExternalOrderBonuses &&
    Object.hasOwn(resolvedExternalOrderBonuses, skillId)
    ? resolvedExternalOrderBonuses[skillId]
    : null;
}

function getRuleSourceSkillId(rule) {
  return String(rule?.sourceSkillId || rule?.id || "").trim();
}

function getLegacyExclusions(exclusions, directRules, sameRoomRules) {
  const genericSkillIds = new Set(
    [...(directRules || []), ...(sameRoomRules || [])]
      .map(getRuleSourceSkillId)
      .filter(Boolean),
  );

  return (exclusions || []).filter(
    (exclusion) => !genericSkillIds.has(getRuleSourceSkillId(exclusion)),
  );
}

function getPositiveOrderLimitIncrease(rule) {
  const description = String(rule?.rawDescription || "");
  const matches = description.matchAll(
    /\u8ba2\u5355\u4e0a\u9650\s*\+\s*(\d+(?:\.\d+)?)/g,
  );
  let increase = 0;

  for (const match of matches) {
    increase += Number(match[1]);
  }

  return increase;
}

function getDegenbrecherChampionBonus(context) {
  if (!context.hasDegenbrecherChampion) {
    return 0;
  }

  const increasedOrderLimit = context.directRules.reduce(
    (total, rule) =>
      rule.charId === DEGENBRECHER_ID
        ? total
        : total + getPositiveOrderLimitIncrease(rule),
    0,
  );

  return Math.min(100, Math.floor(increasedOrderLimit / 5) * 25);
}

function getArchetDormitoryOrderBonus(exclusion, facilityContext) {
  const skillId = String(exclusion?.id || "").trim();
  if (skillId !== ARCHET_ALPHA_SKILL_ID && skillId !== ARCHET_BETA_SKILL_ID) {
    return null;
  }

  if (facilityContext?.resolvedExternalOrderBonuses) {
    return Object.hasOwn(
      facilityContext.resolvedExternalOrderBonuses,
      skillId,
    )
      ? facilityContext.resolvedExternalOrderBonuses[skillId]
      : null;
  }

  return null;
}

function isArchetDormitoryOrderExclusion(exclusion) {
  return String(exclusion?.charId || "").trim() === ARCHET_ID;
}

function createTradingContext(
  operators,
  product,
  facilityContext,
  { ignoredUnsupportedOperatorIds = new Set() } = {},
) {
  const activeStatesByOperatorId = new Map();
  const unmodeledHighQualityOrderSkills = [];
  const warnings = [];

  for (const operator of operators) {
    const states = getActiveStates(operator);
    const stateIds = new Set(states.map((state) => state.id));
    const unmodeledSkills = getUnmodeledHighQualityOrderSkills(
      operator,
      stateIds,
    );
    for (const skill of unmodeledSkills) {
      stateIds.add(skill.id);
    }
    if (
      hasUnknownUnlockedTradingSkill(operator, stateIds) &&
      !ignoredUnsupportedOperatorIds.has(operator.charId)
    ) {
      warnings.push({
        code: "unsupportedSkill",
        operatorId: operator.charId,
      });
    }

    activeStatesByOperatorId.set(operator.charId, stateIds);
    unmodeledHighQualityOrderSkills.push(...unmodeledSkills);
  }

  const exclusions = [];
  const directRules = [];
  const sameRoomRules = [];

  for (const operator of operators) {
    const stateIds = activeStatesByOperatorId.get(operator.charId) || new Set();

    exclusions.push(
      ...(EXCLUSIONS_BY_CHAR_ID.get(operator.charId) || []).filter((rule) =>
        stateIds.has(rule.id),
      ),
    );
    directRules.push(
      ...(DIRECT_RULES_BY_CHAR_ID.get(operator.charId) || []).filter((rule) =>
        stateIds.has(rule.sourceSkillId || rule.id),
      ),
    );
    sameRoomRules.push(
      ...(SAME_ROOM_RULES_BY_CHAR_ID.get(operator.charId) || []).filter(
        (rule) => stateIds.has(rule.sourceSkillId || rule.id),
      ),
    );
  }

  const legacyExclusions = getLegacyExclusions(
    exclusions,
    directRules,
    sameRoomRules,
  );
  const activeOperatorIds = new Set(operators.map((operator) => operator.charId));
  const hasClosure = activeOperatorIds.has(CLOSURE_ID) &&
    activeStatesByOperatorId.get(CLOSURE_ID)?.has(
      `${CLOSURE_ID}|trading|\u7279\u522b\u8ba2\u5355|2|1`,
    );
  const hasButshu = activeOperatorIds.has(BUTSHU_ID);
  const hasTequila = activeOperatorIds.has(TEQUILA_ID);
  const hasEbenholz = legacyExclusions.some(
    (rule) => rule.charId === EBENHOLZ_ID,
  );
  const hasKichi = legacyExclusions.some(
    (rule) => rule.charId === KICHI_ID,
  );
  const hasShamareOverride = legacyExclusions.some(
    (rule) =>
      rule.charId === SHAMARE_ID &&
      rule.id === `${SHAMARE_ID}|trading|\u4f4e\u8bed|2|1`,
  );
  const ebenholz = operators.find(
    (operator) => operator.charId === EBENHOLZ_ID,
  );
  const kichi = operators.find((operator) => operator.charId === KICHI_ID);

  if (hasEbenholz && !Number.isFinite(facilityContext?.silentResonance)) {
    warnings.push({
      code: "missingSilentResonance",
      operatorId: EBENHOLZ_ID,
    });
  }

  const highQualityOrderSkills =
    product === "lmd"
      ? [
          ...legacyExclusions.filter(
            (rule) => isTimeDependentOrderProbability(rule),
          ),
          ...unmodeledHighQualityOrderSkills,
        ]
      : [];
  const supportedExclusionIds = new Set([
    ...highQualityOrderSkills.map((rule) => rule.id),
    ...legacyExclusions
      .filter(
        (rule) =>
           (product === "orundum" && isLmdOnlyExclusion(rule)) ||
           rule.charId === BUTSHU_ID ||
           rule.charId === TEQUILA_ID ||
           rule.charId === CLOSURE_ID ||
           rule.charId === SHAMARE_ID ||
           ignoredUnsupportedOperatorIds.has(rule.charId) ||
           rule.charId === EBENHOLZ_ID ||
           rule.charId === KICHI_ID ||
           rule.id === DEGENBRECHER_CHAMPION_SKILL_ID ||
           isArchetDormitoryOrderExclusion(rule) ||
           isHarmlessExclusion(rule),
      )
      .map((rule) => rule.id),
  ]);

  const unsupportedExclusions = legacyExclusions.filter(
    (rule) => !supportedExclusionIds.has(rule.id),
  );
  for (const rule of unsupportedExclusions) {
    warnings.push({
      code: "unsupportedExclusion",
      operatorId: rule.charId,
      ruleId: rule.id,
    });
  }

  let conditionalOrderBonus = 0;
  for (const exclusion of legacyExclusions) {
    if (!isArchetDormitoryOrderExclusion(exclusion)) {
      continue;
    }

    // 巫恋会清零同房其他干员提供的订单获取效率，因此无需读取空弦的宿舍条件。
    if (hasShamareOverride && exclusion.charId !== SHAMARE_ID) {
      continue;
    }

    const externalBonus = getArchetDormitoryOrderBonus(
      exclusion,
      facilityContext,
    );
    if (externalBonus === null) {
      warnings.push({
        code: "missingExternalOrderBonus",
        ruleId: exclusion.id,
      });
      continue;
    }

    conditionalOrderBonus += externalBonus;
  }

  const externalOrderBonusByRuleId = new Map();
  for (const rule of directRules) {
    if (!isProductCompatible(rule, product)) {
      continue;
    }

    if (
      (rule?.ignoredMechanics || []).some(
        (mechanic) => !ALLOWED_IGNORED_MECHANICS.has(mechanic),
      )
    ) {
      warnings.push({
        code: "unsupportedIgnoredMechanic",
        operatorId: rule.charId,
        ruleId: rule.id,
      });
      continue;
    }

    if (isCompleteOutputRule(rule)) {
      continue;
    }

    if (
      (rule?.ignoredMechanics || []).includes(
        "conditionalThresholdApproximation",
      )
    ) {
      continue;
    }

    if (hasShamareOverride && rule.charId !== SHAMARE_ID) {
      continue;
    }

    if (hasResolvableSameRoomRule(rule, sameRoomRules, product)) {
      continue;
    }

    const externalBonus = getLegacyExternalOrderBonus(
      rule,
      facilityContext,
      operators,
    );
    if (externalBonus === null) {
      warnings.push({
        code: "missingExternalOrderBonus",
        operatorId: rule.charId,
        ruleId: rule.id,
      });
      externalOrderBonusByRuleId.set(rule.id, 0);
      continue;
    }

    externalOrderBonusByRuleId.set(rule.id, externalBonus);
  }

  return {
    activeOperatorIds,
    warnings,
    conditionalOrderBonus,
    directRules,
    hasButshu,
    hasClosure,
    hasDegenbrecherChampion: legacyExclusions.some(
      (rule) => rule.id === DEGENBRECHER_CHAMPION_SKILL_ID,
    ),
    ebenholzOrderBonus: hasEbenholz
      ? Math.floor(
          (Number.isFinite(facilityContext?.silentResonance)
            ? facilityContext.silentResonance
            : 0) /
            (ebenholz?.elite >= 2 ? 2 : 4),
        )
      : 0,
    hasShamareOverride,
    hasTequila,
    kichiTeammateBonus: hasKichi ? (kichi?.elite >= 2 ? 20 : 10) : 0,
    highQualityOrderSkills,
    sameRoomRules,
    externalOrderBonusByRuleId,
  };
}

function isProductCompatible(rule, requestedProduct) {
  const ruleProduct = String(rule?.effect?.product || "all").trim();
  return ruleProduct === "all" || ruleProduct === requestedProduct;
}

function getSameRoomRulePercent(rule, operatorIds, product) {
  if (!isProductCompatible(rule, product)) {
    return 0;
  }

  const sourceIds = Array.isArray(rule?.condition?.charIds)
    ? rule.condition.charIds
    : [];
  let matchingCount = operatorIds.filter((charId) =>
    sourceIds.includes(charId),
  ).length;
  if (rule?.condition?.excludeOwner && sourceIds.includes(rule.charId)) {
    matchingCount -= 1;
  }

  if (rule?.condition?.type === "sameRoomHasAny") {
    return matchingCount > 0 ? Number(rule.effect.percent || 0) : 0;
  }

  if (rule?.condition?.type === "sameRoomMemberCount") {
    return Math.max(0, matchingCount) * Number(rule.effect.percent || 0);
  }

  return null;
}

function calculateLocalOrderBonus(context, operators, product) {
  const operatorIds = operators.map((operator) => operator.charId);
  if (context.hasShamareOverride) {
    return 45 * Math.max(0, operatorIds.length - 1);
  }

  let result =
    Number(context.conditionalOrderBonus || 0) +
    getDegenbrecherChampionBonus(context);
  result += Number(context.ebenholzOrderBonus || 0);
  result +=
    Number(context.kichiTeammateBonus || 0) *
    Math.max(0, operatorIds.length - 1);
  const maxRules = new Map();

  for (const rule of context.directRules) {
    if (
      !isProductCompatible(rule, product) ||
      rule?.effect?.metric !== "orderEfficiency" ||
      rule?.effect?.targetRoomType
    ) {
      continue;
    }

    const percent = Number(rule?.effect?.percent || 0);
    if (
      rule?.effect?.stackMode === "max" &&
      String(rule?.effect?.stackGroup || "").trim()
    ) {
      const key = String(rule.effect.stackGroup).trim();
      maxRules.set(key, Math.max(maxRules.get(key) || 0, percent));
      continue;
    }

    result +=
      percent + Number(context.externalOrderBonusByRuleId.get(rule.id) || 0);
  }

  for (const rule of context.sameRoomRules) {
    const percent = getSameRoomRulePercent(rule, operatorIds, product);
    if (percent === null) {
      continue;
    }
    result += percent;
  }

  return result + [...maxRules.values()].reduce((sum, percent) => sum + percent, 0);
}

function getOrderDistribution(context, stationLevel, durationHours) {
  const highQualitySkills = context.highQualityOrderSkills || [];
  if (highQualitySkills.length === 0) {
    return ORDER_DISTRIBUTION_BY_LEVEL[stationLevel] || null;
  }

  if (stationLevel !== 3) {
    return null;
  }

  const highQualityVariants = highQualitySkills
    .map(getHighQualityOrderProbabilityVariant);
  if (highQualityVariants.some((variant) => variant === null)) {
    return null;
  }

  const activeHighQualityVariants = highQualityVariants.filter(Boolean);
  return getRiicTradeAverageOrderDistribution({
    stationLevel,
    highQualityVariants: activeHighQualityVariants.map((variant) =>
      variant === "\u63d0\u5347" ? "beta" : variant,
    ),
    durationHours,
    allowExtraAlphaWithBeta: true,
  });
}

function getButshuGoldByOrder(operators) {
  const butshu = operators.find((operator) => operator.charId === BUTSHU_ID);
  if (!butshu) {
    return ORDER_GOLD;
  }

  return butshu.elite >= 2
    ? Object.freeze([4, 5, 4])
    : Object.freeze([3, 4, 4]);
}

function getTequilaVirtualGoldByOrder(context, operators) {
  const tequila = operators.find(
    (operator) => operator.charId === TEQUILA_ID,
  );
  if (!context.hasTequila || !tequila) {
    return Object.freeze([0, 0, 0]);
  }

  return tequila.elite >= 2
    ? Object.freeze([0, 0, 1])
    : Object.freeze([0, 0, 0.5]);
}

function getStaffingBonusPercent(operators) {
  return operators.length;
}

export function createRiicOperatorRosterById(operators = []) {
  return new Map(
    (operators || []).flatMap((operator) => {
      const charId = String(operator?.charId || "").trim();
      return charId ? [[charId, operator]] : [];
    }),
  );
}

export function resolveRiicTradingOperators(
  room,
  rosterById = new Map(),
) {
  const resolvedOperators = (room?.operators || []).flatMap((roomOperator) => {
    const charId = String(roomOperator?.charId || "").trim();
    if (!charId || roomOperator?.hasUsableProfile === false) {
      return [];
    }

    const rosterOperator = rosterById.get(charId) || {};
    const hasRosterOperator = rosterById.has(charId);
    const hasRosterElite =
      rosterOperator?.elite !== null && rosterOperator?.elite !== undefined;
    const hasRosterLevel =
      rosterOperator?.level !== null && rosterOperator?.level !== undefined;
    const hasRoomElite =
      roomOperator?.elite !== null && roomOperator?.elite !== undefined;
    const hasRoomLevel =
      roomOperator?.level !== null && roomOperator?.level !== undefined;

    return [
      {
        operator: {
          charId,
          elite: rosterOperator?.elite ?? roomOperator?.elite,
          level: rosterOperator?.level ?? roomOperator?.level,
        },
        resolution: {
          charId,
          rosterMatched: hasRosterOperator,
          eliteSource: hasRosterElite
            ? "legacyRoster"
            : hasRoomElite
              ? "roomOperator"
              : "missing",
          levelSource: hasRosterLevel
            ? "legacyRoster"
            : hasRoomLevel
              ? "roomOperator"
              : "missing",
        },
      },
    ];
  });

  return {
    operators: resolvedOperators.map((entry) => entry.operator),
    operatorResolution: resolvedOperators.map((entry) => entry.resolution),
  };
}

export function getRiicTradingOperators(room, rosterById = new Map()) {
  return resolveRiicTradingOperators(room, rosterById).operators;
}

export function getRiicTradingOperatorBonuses(
  room,
  operatorIds = new Set(),
) {
  return (room?.controlCenterOperatorBonuses || []).reduce(
    (bonuses, entry) => {
      const charId = String(entry?.operatorId || "").trim();
      const percent = Number(entry?.bonusPercent);
      if (!charId || !operatorIds.has(charId) || !Number.isFinite(percent)) {
        return bonuses;
      }

      bonuses[charId] = Number(bonuses[charId] || 0) + percent;
      return bonuses;
    },
    {},
  );
}

export function getRiicTradingTeamCalculationBonus(
  room,
  operatorIds = new Set(),
) {
  const calculation =
    room?.efficiencyMetrics?.actual?.breakdown?.teamCalculation;
  if (
    String(calculation?.type || "").trim() !== "jayeOrderLimit" ||
    !Number.isFinite(Number(calculation?.coreBonusPercentBeforeControl)) ||
    !operatorIds.has(String(calculation?.sourceMemberId || "").trim())
  ) {
    return {};
  }

  return {
    localOrderBonusOverride: Number(
      calculation.coreBonusPercentBeforeControl,
    ),
    ignoredUnsupportedOperatorIds: [
      String(calculation?.sourceMemberId || "").trim(),
    ].filter(Boolean),
  };
}

export function createRiicTradingFacilityContext({
  stateRooms = [],
  perceptionState,
} = {}) {
  return {
    resolvedExternalOrderBonuses:
      resolveRiicTradingExternalOrderBonuses(stateRooms),
    silentResonance: Number(perceptionState?.resources?.silentResonance),
  };
}

export function resolveRiicTradingRoomInput({
  room,
  rosterById = new Map(),
} = {}) {
  const resolvedOperators = resolveRiicTradingOperators(room, rosterById);
  const operators = resolvedOperators.operators;
  const operatorIds = new Set(
    operators
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );

  return {
    operators,
    operatorResolution: resolvedOperators.operatorResolution,
    tradingFactors: {
      product: String(room?.product || "").trim(),
      stationLevel: Number(room?.stationLevel),
      roomBonus:
        Number(room?.controlCenterFacilityBonusPercent || 0) +
        Number(room?.activeRosterBonusPercent || 0) +
        Number(room?.resourceChainAdditionalBonusPercent || 0),
      operatorBonusesById: getRiicTradingOperatorBonuses(
        room,
        operatorIds,
      ),
      orderAdjustment: getRiicTradingTeamCalculationBonus(
        room,
        operatorIds,
      ),
    },
  };
}

export function calculateRiicTradingRoom({
  room,
  rosterById = new Map(),
  tradingContext,
  durationHours,
} = {}) {
  const settlementInput = resolveRiicTradingRoomInput({
    room,
    rosterById,
  });
  const calculation = calculateRiicTrading({
    durationHours,
    operators: settlementInput.operators,
    tradingFactors: {
      ...settlementInput.tradingFactors,
      crossRoomFactors:
        tradingContext || createRiicTradingFacilityContext(),
    },
  });

  return {
    ...calculation,
    inputDiagnostics: {
      p01Operators: settlementInput.operators,
      l80OperatorResolution: settlementInput.operatorResolution,
    },
  };
}

function calculateNormalOrButshu({
  type,
  context,
  operators,
  stationLevel,
  tradingFactors,
  durationHours,
  includeOrdinaryBonuses = true,
}) {
  const distribution = getOrderDistribution(
    context,
    stationLevel,
    durationHours,
  );
  if (!distribution) {
    return createFailure(
      type,
      "lmd",
      "timeDependentOrderProbability",
      durationHours,
    );
  }

  const localOrderBonus =
    tradingFactors.orderAdjustment.localOrderBonusOverride ??
    calculateLocalOrderBonus(context, operators, "lmd");
  if (localOrderBonus === null) {
    return createFailure(type, "lmd", "notSupported", durationHours);
  }

  const operatorBonus = includeOrdinaryBonuses
    ? Object.values(tradingFactors.operatorBonusesById).reduce(
        (sum, value) => sum + value,
        0,
      )
    : 0;
  const staffingBonus = includeOrdinaryBonuses
    ? getStaffingBonusPercent(operators)
    : 0;
  const speedMultiplier =
    1 +
    (localOrderBonus +
      staffingBonus +
      tradingFactors.roomBonus +
      operatorBonus) /
      100;
  if (speedMultiplier < 0) {
    return createFailure(type, "lmd", "invalidBonus", durationHours);
  }

  const physicalGoldPerHour = calculateRiicExpectedPerHour(
    distribution,
    getButshuGoldByOrder(operators),
  );
  const virtualGoldPerHour = calculateRiicExpectedPerHour(
    distribution,
    getTequilaVirtualGoldByOrder(context, operators),
  );
  const referenceGoldPerHour = calculateRiicExpectedPerHour(
    ORDER_DISTRIBUTION_BY_LEVEL[stationLevel],
    ORDER_GOLD,
  );
  const gold = -physicalGoldPerHour * speedMultiplier;
  const virtualGold = virtualGoldPerHour * speedMultiplier;
  const lmd = -gold * PURE_GOLD_LMD_VALUE;
  const rate =
    ((-gold + virtualGold) / referenceGoldPerHour) * 100;

  return createSuccess({
    type,
    product: "lmd",
    durationHours,
    rate,
    lmd,
    gold,
    virtualGold,
    orundumCapacity: 0,
  });
}

function calculateClosure({
  context,
  operators,
  stationLevel,
  tradingFactors,
  durationHours,
  includeOrdinaryBonuses = true,
}) {
  if (stationLevel !== 3) {
    return createFailure("closure", "lmd", "notSupported", durationHours);
  }

  const teammateContext = {
    ...context,
    directRules: context.directRules.filter(
      (rule) => rule.charId !== CLOSURE_ID,
    ),
    sameRoomRules: context.sameRoomRules.filter(
      (rule) => rule.charId !== CLOSURE_ID,
    ),
  };
  const teammateOrderBonus = calculateLocalOrderBonus(
    teammateContext,
    operators,
    "lmd",
  );
  if (teammateOrderBonus === null) {
    return createFailure("closure", "lmd", "notSupported", durationHours);
  }

  const operatorBonus = includeOrdinaryBonuses
    ? Object.values(tradingFactors.operatorBonusesById).reduce(
        (sum, value) => sum + value,
        0,
      )
    : 0;
  const staffingBonus = includeOrdinaryBonuses
    ? getStaffingBonusPercent(operators)
    : 0;
  const speedMultiplier =
    1 +
    (10 +
      teammateOrderBonus +
      staffingBonus +
      tradingFactors.roomBonus +
      operatorBonus) /
      100;
  if (speedMultiplier < 0) {
    return createFailure("closure", "lmd", "invalidBonus", durationHours);
  }

  const physicalGoldPerHour = (5 / 6) * speedMultiplier;
  const virtualGold = (1 / 6) * speedMultiplier;
  const gold = -physicalGoldPerHour;
  const lmd = physicalGoldPerHour * PURE_GOLD_LMD_VALUE;
  const referenceGoldPerHour = calculateRiicExpectedPerHour(
    ORDER_DISTRIBUTION_BY_LEVEL[stationLevel],
    ORDER_GOLD,
  );
  const rate =
    ((physicalGoldPerHour + virtualGold) / referenceGoldPerHour) * 100;

  return createSuccess({
    type: "closure",
    product: "lmd",
    durationHours,
    rate,
    lmd,
    gold,
    virtualGold,
    orundumCapacity: 0,
  });
}

function calculateOrundum({
  context,
  operators,
  tradingFactors,
  durationHours,
  includeOrdinaryBonuses = true,
}) {
  const localOrderBonus = calculateLocalOrderBonus(
    context,
    operators,
    "orundum",
  );
  if (localOrderBonus === null) {
    return createFailure("normal", "orundum", "notSupported", durationHours);
  }

  const operatorBonus = includeOrdinaryBonuses
    ? Object.values(tradingFactors.operatorBonusesById).reduce(
        (sum, value) => sum + value,
        0,
      )
    : 0;
  const staffingBonus = includeOrdinaryBonuses
    ? getStaffingBonusPercent(operators)
    : 0;
  const speedMultiplier =
    1 +
    (localOrderBonus +
      staffingBonus +
      tradingFactors.roomBonus +
      operatorBonus) /
      100;
  if (speedMultiplier < 0) {
    return createFailure("normal", "orundum", "invalidBonus", durationHours);
  }
  const orundumCapacity =
    ORUNDUM_TRADE_CAPACITY_PER_HOUR * speedMultiplier;

  return createSuccess({
    type: "normal",
    product: "orundum",
    durationHours,
    rate: speedMultiplier * 100,
    lmd: 0,
    gold: 0,
    virtualGold: 0,
    orundumCapacity,
    shardConsumption: orundumCapacity / ORUNDUM_PER_ORIGINIUM_SHARD,
  });
}

/**
 * P01: calculate one trading-station shift from its on-duty operators and
 * resolved external factors. Per-hour values remain available for callers that
 * need rates; `segment` carries the same result for `durationHours`.
 * Unsupported active skills return an explicit error instead of a baseline
 * estimate.
 */
export function calculateRiicTrading({
  durationHours,
  operators,
  tradingFactors,
} = {}) {
  const normalizedDurationHours = Number(durationHours);
  const operatorDiagnostics = getInvalidOperatorDiagnostics(operators);
  const normalizedOperators = normalizeOperators(operators);
  const normalizedTradingFactors = normalizeTradingFactors(
    tradingFactors,
    normalizedOperators,
  );
  const product = String(normalizedTradingFactors?.product || "").trim();
  const type = getSpecialType(normalizedOperators, product);
  const inputWarnings =
    operatorDiagnostics.invalidOperators.length > 0
      ? [
          {
            code: "invalidOperators",
            diagnostics: operatorDiagnostics,
          },
        ]
      : [];

  if (
    !Number.isFinite(normalizedDurationHours) ||
    normalizedDurationHours < 0
  ) {
    return appendCalculationWarnings(
      createFailure(type, product, "invalidDuration"),
      inputWarnings,
    );
  }

  if (!normalizedTradingFactors) {
    return appendCalculationWarnings(
      createFailure(type, product, "invalidTradingFactors", normalizedDurationHours),
      inputWarnings,
    );
  }

  if (normalizedOperators.length === 0) {
    return appendCalculationWarnings(createSuccess({
      type,
      product,
      durationHours: normalizedDurationHours,
      rate: 0,
      lmd: 0,
      gold: 0,
      virtualGold: 0,
      orundumCapacity: 0,
      shardConsumption: 0,
    }), inputWarnings);
  }

  const context = createTradingContext(
    normalizedOperators,
    product,
    normalizedTradingFactors.crossRoomFactors,
    {
      ignoredUnsupportedOperatorIds:
        normalizedTradingFactors.orderAdjustment.ignoredUnsupportedOperatorIds,
    },
  );
  if (context.error) {
    return appendCalculationWarnings(
      createFailure(type, product, context.error, normalizedDurationHours),
      inputWarnings,
    );
  }

  if (product === "orundum") {
    return appendCalculationWarnings(
      calculateOrundum({
        context,
        operators: normalizedOperators,
        tradingFactors: normalizedTradingFactors,
        durationHours: normalizedDurationHours,
      }),
      [...inputWarnings, ...(context.warnings || [])],
    );
  }

  if (context.hasClosure) {
    return appendCalculationWarnings(
      calculateClosure({
        context,
        operators: normalizedOperators,
        stationLevel: normalizedTradingFactors.stationLevel,
        tradingFactors: normalizedTradingFactors,
        durationHours: normalizedDurationHours,
      }),
      [...inputWarnings, ...(context.warnings || [])],
    );
  }

  return appendCalculationWarnings(
    calculateNormalOrButshu({
      type:
        context.hasButshu || context.hasTequila
          ? "butshu"
          : "normal",
      context,
      operators: normalizedOperators,
      stationLevel: normalizedTradingFactors.stationLevel,
      tradingFactors: normalizedTradingFactors,
      durationHours: normalizedDurationHours,
    }),
    [...inputWarnings, ...(context.warnings || [])],
  );
}
