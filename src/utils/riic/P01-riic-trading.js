import BUILDING_TABLE from "../../static/json/build/building_table.json" with {
  type: "json",
};
import REPLACE_GROUPS from "../../static/json/build/logistics_skill_replace_groups.json" with {
  type: "json",
};
import BASELINE_RULES from "../../static/json/tools/R00-baseline.json" with {
  type: "json",
};

const ORDER_SECONDS = Object.freeze([8640, 12600, 16560]);
const ORDER_GOLD = Object.freeze([2, 3, 4]);
const ORDER_DISTRIBUTION_BY_LEVEL = Object.freeze({
  1: Object.freeze([1, 0, 0]),
  2: Object.freeze([0.6, 0.4, 0]),
  3: Object.freeze([0.3, 0.5, 0.2]),
});

const PURE_GOLD_LMD_VALUE = 500;
const ORUNDUM_TRADE_CAPACITY_PER_HOUR = 10;
const ORUNDUM_PER_ORIGINIUM_SHARD = 10;
const ORUNDUM_TRADE_STATION_LEVEL = 3;
const CLOSURE_ID = "char_4228_closur";
const BUTSHU_ID = "char_4032_provs";
const TEQUILA_ID = "char_486_takila";
const TAILOR_ID = "char_252_bibeak";
const SHAMARE_ID = "char_254_vodfox";
const DEEP_ID = "char_4137_udflow";
const VIGIL_ID = "char_427_vigil";
const BELLONE_ID = "char_4037_demetr";
const ULPIAN_ID = "char_4145_ulpia";
const ARCHET_ID = "char_332_archet";
const QUARTZ_ID = "char_4063_quartz";
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
const BELLONE_ALPHA_SKILL_ID =
  `${BELLONE_ID}|trading|\u5bb6\u65cf\u7ecf\u8425\u00b7\u03b1|0|1`;
const BELLONE_BETA_SKILL_ID =
  `${BELLONE_ID}|trading|\u5bb6\u65cf\u7ecf\u8425\u00b7\u03b2|2|1`;
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

function createFailure(type, product, error) {
  return {
    ok: false,
    type,
    product,
    rate: null,
    lmd: null,
    gold: null,
    virtualGold: null,
    orundumCapacity: null,
    shardConsumption: null,
    error,
  };
}

function createSuccess({
  type,
  product,
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
    rate: round(rate),
    lmd: round(lmd),
    gold: round(gold),
    virtualGold: round(virtualGold),
    orundumCapacity: round(orundumCapacity),
    shardConsumption: round(shardConsumption),
    error: "",
  };
}

function normalizeOperators(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = [];
  const seen = new Set();

  for (const source of value) {
    const charId = String(source?.charId || "").trim();
    const elite = Number(source?.elite);
    const level = Number(source?.level);
    if (
      !charId ||
      seen.has(charId) ||
      !Number.isInteger(elite) ||
      elite < 0 ||
      !Number.isInteger(level) ||
      level < 1
    ) {
      return null;
    }

    seen.add(charId);
    normalized.push({ charId, elite, level });
  }

  return normalized;
}

function normalizeBonus(value, operators) {
  const room = Number(value?.room ?? 0);
  const rawOperatorBonuses =
    value?.operators && typeof value.operators === "object"
      ? value.operators
      : {};
  const operatorIds = new Set(operators.map((operator) => operator.charId));
  const operatorsById = {};

  if (!Number.isFinite(room)) {
    return null;
  }

  for (const [charId, sourceBonus] of Object.entries(rawOperatorBonuses)) {
    const bonus = Number(sourceBonus);
    if (!operatorIds.has(charId) || !Number.isFinite(bonus)) {
      return null;
    }
    operatorsById[charId] = bonus;
  }

  return {
    room,
    operators: operatorsById,
  };
}

function normalizeFacilityContext(value) {
  const source =
    value?.context && typeof value.context === "object"
      ? value.context
      : {};
  const rawMeetingLevel = Number(source?.meetingLevel);
  const meetingLevel = Number.isInteger(rawMeetingLevel) && rawMeetingLevel >= 0
    ? rawMeetingLevel
    : null;
  const baseOperatorIds = Array.isArray(source?.baseOperatorIds)
    ? new Set(
        source.baseOperatorIds
          .map((charId) => String(charId || "").trim())
          .filter(Boolean),
      )
    : null;
  const dormitoryLevels = Array.isArray(source?.dormitoryLevels)
    ? source.dormitoryLevels
        .map((level) => Number(level))
        .filter((level) => Number.isInteger(level) && level >= 0)
    : null;
  const rawManufactureProductKindCount = Number(
    source?.manufactureProductKindCount,
  );
  const manufactureProductKindCount =
    Number.isInteger(rawManufactureProductKindCount) &&
    rawManufactureProductKindCount >= 0
      ? rawManufactureProductKindCount
      : null;

  return {
    baseOperatorIds,
    dormitoryLevels,
    manufactureProductKindCount,
    meetingLevel,
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

function getExternalOrderBonus(rule, facilityContext, operators) {
  const skillId = String(rule?.sourceSkillId || rule?.id || "").trim();

  if (skillId === VIGNA_BETA_SKILL_ID) {
    return operators.some((operator) =>
      GLASGOW_OPERATOR_IDS.has(operator.charId),
    )
      ? 10
      : 0;
  }

  if (
    skillId === BELLONE_ALPHA_SKILL_ID ||
    skillId === BELLONE_BETA_SKILL_ID
  ) {
    if (!(facilityContext?.baseOperatorIds instanceof Set)) {
      return null;
    }

    if (!facilityContext.baseOperatorIds.has(VIGIL_ID)) {
      return 0;
    }

    return skillId === BELLONE_BETA_SKILL_ID ? 10 : 5;
  }

  if (
    skillId === `${DEEP_ID}|trading|\u5bf9\u9646\u63a5\u6d3d\u4ee3\u8868\u00b7\u03b1|0|1` ||
    skillId === `${DEEP_ID}|trading|\u5bf9\u9646\u63a5\u6d3d\u4ee3\u8868\u00b7\u03b2|2|1`
  ) {
    if (!(facilityContext?.baseOperatorIds instanceof Set)) {
      return null;
    }

    if (!facilityContext.baseOperatorIds.has(ULPIAN_ID)) {
      return 0;
    }

    return skillId.endsWith("|\u03b2|2|1") ? 10 : 5;
  }

  if (skillId === `${VIGIL_ID}|trading|\u65b0\u57ce\u8d38\u6613|2|1`) {
    if (!Number.isInteger(facilityContext?.meetingLevel)) {
      return null;
    }

    return Math.min(40, facilityContext.meetingLevel * 5);
  }

  if (skillId === `${QUARTZ_ID}|trading|\u7cbe\u51c6\u6392\u671f|1|1`) {
    if (!Number.isInteger(facilityContext?.manufactureProductKindCount)) {
      return null;
    }

    return facilityContext.manufactureProductKindCount * 2;
  }

  return null;
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

  if (!Array.isArray(facilityContext?.dormitoryLevels)) {
    return null;
  }

  const percentPerDormitoryLevel =
    skillId === ARCHET_BETA_SKILL_ID ? 2 : 1;
  return (
    facilityContext.dormitoryLevels.reduce(
      (total, level) => total + level,
      0,
    ) * percentPerDormitoryLevel
  );
}

function isArchetDormitoryOrderExclusion(exclusion) {
  return String(exclusion?.charId || "").trim() === ARCHET_ID;
}

function createTradingContext(operators, product, facilityContext) {
  const activeStatesByOperatorId = new Map();
  const unmodeledHighQualityOrderSkills = [];

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
    if (hasUnknownUnlockedTradingSkill(operator, stateIds)) {
      return { error: "notSupported" };
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

  const activeOperatorIds = new Set(operators.map((operator) => operator.charId));
  const hasClosure = activeOperatorIds.has(CLOSURE_ID) &&
    activeStatesByOperatorId.get(CLOSURE_ID)?.has(
      `${CLOSURE_ID}|trading|\u7279\u522b\u8ba2\u5355|2|1`,
    );
  const hasButshu = activeOperatorIds.has(BUTSHU_ID);
  const hasTequila = activeOperatorIds.has(TEQUILA_ID);
  const hasShamareOverride = activeStatesByOperatorId.get(SHAMARE_ID)?.has(
    `${SHAMARE_ID}|trading|\u4f4e\u8bed|2|1`,
  );

  const highQualityOrderSkills =
    product === "lmd"
      ? [
          ...exclusions.filter(
            (rule) =>
              isTimeDependentOrderProbability(rule) &&
              !(hasShamareOverride && rule.charId === SHAMARE_ID),
          ),
          ...unmodeledHighQualityOrderSkills,
        ]
      : [];
  const supportedExclusionIds = new Set([
    ...highQualityOrderSkills.map((rule) => rule.id),
    ...exclusions
      .filter(
        (rule) =>
          (product === "orundum" && isLmdOnlyExclusion(rule)) ||
          rule.charId === BUTSHU_ID ||
          rule.charId === TEQUILA_ID ||
          rule.charId === CLOSURE_ID ||
          rule.charId === SHAMARE_ID ||
          rule.id === DEGENBRECHER_CHAMPION_SKILL_ID ||
          isArchetDormitoryOrderExclusion(rule) ||
          isHarmlessExclusion(rule),
      )
      .map((rule) => rule.id),
  ]);

  if (exclusions.some((rule) => !supportedExclusionIds.has(rule.id))) {
    return { error: "notSupported" };
  }

  let conditionalOrderBonus = 0;
  for (const exclusion of exclusions) {
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
      return { error: "notSupported" };
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
      return { error: "notSupported" };
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

    const externalBonus = getExternalOrderBonus(
      rule,
      facilityContext,
      operators,
    );
    if (externalBonus === null) {
      return { error: "notSupported" };
    }

    externalOrderBonusByRuleId.set(rule.id, externalBonus);
  }

  return {
    activeOperatorIds,
    conditionalOrderBonus,
    directRules,
    hasButshu,
    hasClosure,
    hasDegenbrecherChampion: exclusions.some(
      (rule) => rule.id === DEGENBRECHER_CHAMPION_SKILL_ID,
    ),
    hasShamareOverride,
    hasTequila,
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
      return null;
    }
    result += percent;
  }

  return result + [...maxRules.values()].reduce((sum, percent) => sum + percent, 0);
}

function getOrderDistribution(context, stationLevel) {
  const highQualitySkills = context.highQualityOrderSkills || [];
  if (highQualitySkills.length === 0) {
    return ORDER_DISTRIBUTION_BY_LEVEL[stationLevel] || null;
  }

  if (context.hasButshu) {
    return null;
  }

  if (stationLevel !== 3) {
    return null;
  }

  const highQualityVariants = highQualitySkills
    .filter(
      (rule) => !(context.hasShamareOverride && rule.charId === SHAMARE_ID),
    )
    .map(getHighQualityOrderProbabilityVariant);
  if (highQualityVariants.some((variant) => variant === null)) {
    return null;
  }

  const activeHighQualityVariants = highQualityVariants.filter(Boolean);
  const betaCount = activeHighQualityVariants.filter(
    (variant) => variant === "\u63d0\u5347",
  ).length;
  const alphaCount = activeHighQualityVariants.filter(
    (variant) => variant === "alpha",
  ).length;

  if (
    betaCount > 1 ||
    alphaCount + betaCount !== activeHighQualityVariants.length
  ) {
    return null;
  }
  if (betaCount === 1) {
    return Object.freeze([0.05, 0.1, 0.85]);
  }
  if (alphaCount === 0) {
    return ORDER_DISTRIBUTION_BY_LEVEL[stationLevel] || null;
  }
  if (
    alphaCount > 1 ||
    context.hasShamareOverride ||
    (context.hasButshu && context.activeOperatorIds.has(SHAMARE_ID))
  ) {
    return Object.freeze([0.13, 0.22, 0.65]);
  }
  return Object.freeze([0.15, 0.3, 0.55]);
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

function calculateExpectedPerHour(distribution, values) {
  const seconds = distribution.reduce(
    (sum, probability, index) => sum + probability * ORDER_SECONDS[index],
    0,
  );
  const amount = distribution.reduce(
    (sum, probability, index) => sum + probability * values[index],
    0,
  );
  return (amount / seconds) * 3600;
}

function getStaffingBonusPercent(operators) {
  return operators.length;
}

function calculateNormalOrButshu({
  type,
  context,
  operators,
  stationLevel,
  bonus,
  includeOrdinaryBonuses = true,
}) {
  const distribution = getOrderDistribution(context, stationLevel);
  if (!distribution) {
    return createFailure(type, "lmd", "timeDependentOrderProbability");
  }

  const localOrderBonus = calculateLocalOrderBonus(context, operators, "lmd");
  if (localOrderBonus === null) {
    return createFailure(type, "lmd", "notSupported");
  }

  const operatorBonus = includeOrdinaryBonuses
    ? Object.values(bonus.operators).reduce((sum, value) => sum + value, 0)
    : 0;
  const staffingBonus = includeOrdinaryBonuses
    ? getStaffingBonusPercent(operators)
    : 0;
  const speedMultiplier =
    1 + (localOrderBonus + staffingBonus + bonus.room + operatorBonus) / 100;
  if (speedMultiplier < 0) {
    return createFailure(type, "lmd", "invalidBonus");
  }

  const physicalGoldPerHour = calculateExpectedPerHour(
    distribution,
    getButshuGoldByOrder(operators),
  );
  const virtualGoldPerHour = calculateExpectedPerHour(
    distribution,
    getTequilaVirtualGoldByOrder(context, operators),
  );
  const referenceGoldPerHour = calculateExpectedPerHour(
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
  bonus,
  includeOrdinaryBonuses = true,
}) {
  if (stationLevel !== 3) {
    return createFailure("closure", "lmd", "notSupported");
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
    return createFailure("closure", "lmd", "notSupported");
  }

  const operatorBonus = includeOrdinaryBonuses
    ? Object.values(bonus.operators).reduce((sum, value) => sum + value, 0)
    : 0;
  const staffingBonus = includeOrdinaryBonuses
    ? getStaffingBonusPercent(operators)
    : 0;
  const speedMultiplier =
    1 +
    (10 + teammateOrderBonus + staffingBonus + bonus.room + operatorBonus) /
      100;
  if (speedMultiplier < 0) {
    return createFailure("closure", "lmd", "invalidBonus");
  }

  const physicalGoldPerHour = (5 / 6) * speedMultiplier;
  const virtualGold = (1 / 6) * speedMultiplier;
  const gold = -physicalGoldPerHour;
  const lmd = physicalGoldPerHour * PURE_GOLD_LMD_VALUE;
  const referenceGoldPerHour = calculateExpectedPerHour(
    ORDER_DISTRIBUTION_BY_LEVEL[stationLevel],
    ORDER_GOLD,
  );
  const rate =
    ((physicalGoldPerHour + virtualGold) / referenceGoldPerHour) * 100;

  return createSuccess({
    type: "closure",
    product: "lmd",
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
  bonus,
  includeOrdinaryBonuses = true,
}) {
  const localOrderBonus = calculateLocalOrderBonus(
    context,
    operators,
    "orundum",
  );
  if (localOrderBonus === null) {
    return createFailure("normal", "orundum", "notSupported");
  }

  const operatorBonus = includeOrdinaryBonuses
    ? Object.values(bonus.operators).reduce((sum, value) => sum + value, 0)
    : 0;
  const staffingBonus = includeOrdinaryBonuses
    ? getStaffingBonusPercent(operators)
    : 0;
  const speedMultiplier =
    1 + (localOrderBonus + staffingBonus + bonus.room + operatorBonus) / 100;
  if (speedMultiplier < 0) {
    return createFailure("normal", "orundum", "invalidBonus");
  }
  const orundumCapacity =
    ORUNDUM_TRADE_CAPACITY_PER_HOUR * speedMultiplier;

  return createSuccess({
    type: "normal",
    product: "orundum",
    rate: speedMultiplier * 100,
    lmd: 0,
    gold: 0,
    virtualGold: 0,
    orundumCapacity,
    shardConsumption: orundumCapacity / ORUNDUM_PER_ORIGINIUM_SHARD,
  });
}

/**
 * P01: calculate one trading station from facility and operator data only.
 * LMD values, order consumption, and orundum capacity are per hour.
 * Unsupported active skills return an explicit error instead of a baseline
 * estimate.
 */
export function calculateRiicTrading(facility, operators, bonus = {}) {
  const normalizedOperators = normalizeOperators(operators);
  const product = String(facility?.product || "").trim();
  const type = getSpecialType(normalizedOperators || [], product);
  const stationLevel = Number(facility?.level);

  if (
    String(facility?.type || "").trim() !== "trading" ||
    !["lmd", "orundum"].includes(product) ||
    !Number.isInteger(stationLevel) ||
    ![1, 2, 3].includes(stationLevel)
  ) {
    return createFailure(type, product, "invalidFacility");
  }

  if (
    product === "orundum" &&
    stationLevel !== ORUNDUM_TRADE_STATION_LEVEL
  ) {
    return createFailure(type, product, "unsupportedStationLevel");
  }

  if (!normalizedOperators) {
    return createFailure(type, product, "invalidOperators");
  }

  const normalizedBonus = normalizeBonus(bonus, normalizedOperators);
  if (!normalizedBonus) {
    return createFailure(type, product, "invalidBonus");
  }

  const context = createTradingContext(
    normalizedOperators,
    product,
    normalizeFacilityContext(facility),
  );
  if (context.error) {
    return createFailure(type, product, context.error);
  }

  if (product === "orundum") {
    return calculateOrundum({
      context,
      operators: normalizedOperators,
      bonus: normalizedBonus,
    });
  }

  if (context.hasClosure) {
    return calculateClosure({
      context,
      operators: normalizedOperators,
      stationLevel,
      bonus: normalizedBonus,
    });
  }

  return calculateNormalOrButshu({
    type:
      context.hasButshu || context.hasTequila
        ? "butshu"
        : "normal",
    context,
    operators: normalizedOperators,
    stationLevel,
    bonus: normalizedBonus,
  });
}
