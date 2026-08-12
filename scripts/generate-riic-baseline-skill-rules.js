import fs from "node:fs/promises";

const INPUT_PATH = "src/static/json/build/building_table.json";
const REPLACE_GROUP_PATH =
  "src/static/json/build/logistics_skill_replace_groups.json";
const TERM_DESCRIPTION_PATH = "src/static/json/build/term_description.json";
const OUTPUT_PATH = "src/static/json/tools/R00-baseline.json";

const ROOM_TYPES = new Set([
  "manufacture",
  "trading",
  "power",
  "control",
  "meeting",
  "hire",
]);
const METRIC_BY_ROOM_TYPE = {
  manufacture: "production",
  trading: "orderEfficiency",
  power: "droneCharge",
  meeting: "clueSearch",
  hire: "contactSpeed",
};
const PATTERN_BY_ROOM_TYPE = {
  manufacture:
    /\u751f\u4ea7\u529b[^+]*\+\s*(\d+(?:\.\d+)?)%/,
  trading:
    /\u8ba2\u5355\u83b7\u53d6\u6548\u7387[^+]*\+\s*(\d+(?:\.\d+)?)%/,
  power:
    /\u65e0\u4eba\u673a\u5145\u80fd\u901f\u5ea6[^+]*\+\s*(\d+(?:\.\d+)?)%/,
  meeting:
    /\u7ebf\u7d22\u641c\u96c6\u901f\u5ea6(?:\u989d\u5916)?(?:\u63d0\u5347)?\s*\+?\s*(\d+(?:\.\d+)?)%/,
  hire:
    /\u8054\u7edc\u901f\u5ea6(?:\u989d\u5916)?(?:\u63d0\u5347)?\s*\+?\s*(\d+(?:\.\d+)?)%/,
};
const CONTROL_TARGET_EFFECTS = [
  {
    targetRoomType: "manufacture",
    metric: "production",
    pattern:
      /\u6240\u6709\u5236\u9020\u7ad9\u751f\u4ea7\u529b[^+]*\+\s*(\d+(?:\.\d+)?)%/,
  },
  {
    targetRoomType: "trading",
    metric: "orderEfficiency",
    pattern:
      /\u6240\u6709\u8d38\u6613\u7ad9\u8ba2\u5355(?:\u83b7\u53d6)?\u6548\u7387[^+]*\+\s*(\d+(?:\.\d+)?)%/,
  },
  {
    targetRoomType: "power",
    metric: "droneCharge",
    pattern:
      /\u6240\u6709\u53d1\u7535\u7ad9\u65e0\u4eba\u673a\u5145\u80fd\u901f\u5ea6[^+]*\+\s*(\d+(?:\.\d+)?)%/,
  },
  {
    targetRoomType: "meeting",
    metric: "clueSearch",
    pattern:
      /\u4f1a\u5ba2\u5ba4\u7ebf\u7d22\u641c\u96c6\u901f\u5ea6(?:\u989d\u5916)?(?:\u63d0\u5347)?\s*\+?\s*(\d+(?:\.\d+)?)%/,
  },
  {
    targetRoomType: "hire",
    metric: "contactSpeed",
    pattern:
      /\u4eba\u529b\u529e\u516c\u5ba4\u8054\u7edc\u901f\u5ea6(?:\u989d\u5916)?(?:\u63d0\u5347)?\s*\+?\s*(\d+(?:\.\d+)?)%/,
  },
];
const PRODUCT_TOKENS = {
  experience: ["\u4f5c\u6218\u8bb0\u5f55"],
  gold: ["\u8d35\u91d1\u5c5e", "\u8d64\u91d1"],
  orundum: ["\u6e90\u77f3"],
};
const CONDITIONAL_START_PATTERN =
  /\u82e5|\u5982\u679c|\u5f53(?!\u524d)|\u6bcf(?:\u6709|\u4e2a|\u5c0f\u65f6|\u540d|\u4e00\u540d|\u95f4|\u7ea7|\d+\u540d|\d+(?:\.\d+)?(?:\u67b6|\u70b9|\u540d|\u95f4|\u6761|\u4e2a))|\u540c(?:\u4e00|\u4e2a)|\u57fa\u5efa\u5185|\u5f53\u524d(?:\u5236\u9020\u7ad9|\u8d38\u6613\u7ad9|\u53d1\u7535\u7ad9)\u5185|\u5f52\u96f6|\u5904\u4e8e|\u53ea\u6709\u81ea\u8eab|\u5c0f\u4e8e|\u5927\u4e8e|\u9ad8\u4e8e|\u4f4e\u4e8e/;
const TIME_DEPENDENT_PATTERN =
  /\u9996\u5c0f\u65f6|\u6b64\u540e\u6bcf\u5c0f\u65f6|\u751f\u4ea7\u529b\u6bcf\u5c0f\u65f6|\u5de5\u4f5c\u65f6\u957f\u5f71\u54cd|\u5fc3\u60c5\u843d\u5dee|\u5355\u6b21\u5de5\u4f5c\u65f6\u957f/;
const SPECIAL_ORDER_PATTERN =
  /\u56fa\u5b9a\u83b7\u53d6|\u51fa\u73b0\u6982\u7387|\u8fdd\u7ea6\u8ba2\u5355|\u7279\u522b\u8ba2\u5355|\u72ec\u5360\u8ba2\u5355/;

const REVIEWED_SAME_ROOM_SYNERGIES = [
  {
    id: "headb2-ussg-experience",
    source: {
      charId: "char_1051_headb2",
      roomType: "manufacture",
      phase: 2,
      level: 1,
    },
    condition: {
      type: "sameRoomHasAny",
      termId: "cc-g-ussg",
      excludeOwner: true,
    },
    effect: {
      percent: 10,
      product: "experience",
    },
  },
  {
    id: "christ-phatm2-experience",
    source: {
      charId: "char_4198_christ",
      roomType: "manufacture",
      phase: 2,
      level: 1,
    },
    condition: {
      type: "sameRoomHasAny",
      charIds: ["char_1042_phatm2"],
      excludeOwner: true,
    },
    effect: {
      percent: 30,
      product: "experience",
    },
  },
  {
    id: "lemuen-angel-trading",
    source: {
      charId: "char_4193_lemuen",
      roomType: "trading",
      phase: 2,
      level: 1,
    },
    condition: {
      type: "sameRoomHasAny",
      termId: "cc-angel",
      excludeOwner: true,
    },
    effect: {
      percent: 25,
      product: "all",
    },
  },
  {
    id: "alanna-warmy-gold",
    source: {
      charId: "char_4178_alanna",
      roomType: "manufacture",
      phase: 2,
      level: 1,
      descriptionToken: "\u6e29\u7c73",
    },
    condition: {
      type: "sameRoomHasAny",
      charIds: ["char_4081_warmy"],
      excludeOwner: true,
    },
    effect: {
      percent: 15,
      product: "gold",
    },
  },
  {
    id: "morgan-glasgow-trading",
    source: {
      charId: "char_154_morgan",
      roomType: "trading",
      phase: 2,
      level: 1,
    },
    condition: {
      type: "sameRoomMemberCount",
      termId: "cc-g-glasgow",
      excludeOwner: false,
    },
    effect: {
      percent: 20,
      product: "all",
    },
  },
  {
    id: "morgan-siege-trading",
    source: {
      charId: "char_154_morgan",
      roomType: "trading",
      phase: 2,
      level: 1,
    },
    condition: {
      type: "sameRoomHasAny",
      charIds: ["char_112_siege"],
      excludeOwner: true,
    },
    effect: {
      percent: 35,
      product: "all",
    },
  },
  {
    id: "texas-lappland-trading",
    source: {
      charId: "char_102_texas",
      roomType: "trading",
      phase: 0,
      level: 1,
    },
    condition: {
      type: "sameRoomHasAny",
      charIds: ["char_140_whitew"],
      excludeOwner: true,
    },
    effect: {
      percent: 65,
      product: "all",
    },
  },
  {
    id: "orchd2-mh2-trading",
    source: {
      charId: "char_1048_orchd2",
      roomType: "trading",
      phase: 2,
      level: 1,
    },
    condition: {
      type: "sameRoomMemberCount",
      termId: "cc-tag-mh2",
      excludeOwner: false,
    },
    effect: {
      percent: 20,
      product: "all",
    },
  },
];
const REVIEWED_DIRECT_APPROXIMATIONS = [
  {
    id: "snowsant-trading-e0",
    source: {
      charId: "char_383_snsant",
      roomType: "trading",
      phase: 0,
      level: 1,
    },
    effect: {
      percent: 25,
      product: "all",
    },
    ignoredMechanics: ["conditionalThresholdApproximation"],
  },
  {
    id: "snowsant-trading-e2",
    source: {
      charId: "char_383_snsant",
      roomType: "trading",
      phase: 2,
      level: 1,
    },
    effect: {
      percent: 35,
      product: "all",
    },
    ignoredMechanics: ["conditionalThresholdApproximation"],
  },
  // Fixed 12-hour rotations let these warm-up skills use their full-shift averages.
  {
    id: "fang-manufacture-acute-12h",
    source: {
      charId: "char_123_fang",
      roomType: "manufacture",
      phase: 0,
      level: 1,
    },
    effect: {
      percent: 23.75,
      product: "all",
      coverage: "complete",
    },
  },
  {
    id: "kroos-manufacture-slow-12h",
    source: {
      charId: "char_124_kroos",
      roomType: "manufacture",
      phase: 0,
      level: 1,
    },
    effect: {
      percent: 22.5,
      product: "all",
      coverage: "complete",
    },
  },
  {
    id: "ceobe-manufacture-acute-12h",
    source: {
      charId: "char_2013_cerber",
      roomType: "manufacture",
      phase: 2,
      level: 1,
    },
    effect: {
      percent: 23.75,
      product: "all",
      coverage: "complete",
    },
  },
  {
    id: "scene-manufacture-slow-12h",
    source: {
      charId: "char_336_folivo",
      roomType: "manufacture",
      phase: 0,
      level: 1,
    },
    effect: {
      percent: 22.5,
      product: "all",
      coverage: "complete",
    },
  },
  {
    id: "aroma-manufacture-routine-cleaning-12h",
    source: {
      charId: "char_446_aroma",
      roomType: "manufacture",
      phase: 2,
      level: 1,
    },
    effect: {
      percent: 35 / 3,
      product: "all",
      coverage: "complete",
    },
  },
];

function getSkillKey({ charId, roomType, buffName, phase, level }) {
  return [charId, roomType, buffName, phase, level].join("|");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getProductScope(roomType, description) {
  if (roomType !== "manufacture") {
    return "all";
  }

  for (const [product, tokens] of Object.entries(PRODUCT_TOKENS)) {
    if (tokens.some((token) => description.includes(token))) {
      return product;
    }
  }

  return "all";
}

function getActivation(skill, replaceGroups) {
  const replacementGroup = replaceGroups[getSkillKey(skill)] || null;
  return replacementGroup
    ? {
        mode: "replace",
        group: replacementGroup,
      }
    : {
        mode: "stack",
        group: null,
      };
}

function createSkillState(skill, replaceGroups) {
  return {
    id: getSkillKey(skill),
    charId: skill.charId,
    roomType: skill.roomType,
    unlock: {
      phase: Number(skill.phase || 0),
      level: Number(skill.level || 1),
    },
    activation: getActivation(skill, replaceGroups),
  };
}

function getDirectEffect(skill, description) {
  if (
    TIME_DEPENDENT_PATTERN.test(description) ||
    SPECIAL_ORDER_PATTERN.test(description)
  ) {
    return null;
  }

  const conditionStart = description.search(CONDITIONAL_START_PATTERN);
  const directDescription =
    conditionStart < 0
      ? description
      : description.slice(0, conditionStart).trim();
  if (skill.roomType === "control") {
    return getControlDirectEffect(directDescription);
  }

  const pattern = PATTERN_BY_ROOM_TYPE[skill.roomType];
  const percent = Number(pattern.exec(directDescription)?.[1]);

  if (!Number.isFinite(percent)) {
    return null;
  }

  return {
    metric: METRIC_BY_ROOM_TYPE[skill.roomType],
    percent,
    product: getProductScope(skill.roomType, directDescription),
    coverage: conditionStart < 0 ? "complete" : "baseOnly",
  };
}

function getControlDirectEffect(description) {
  for (const target of CONTROL_TARGET_EFFECTS) {
    const percent = Number(target.pattern.exec(description)?.[1]);
    if (!Number.isFinite(percent)) {
      continue;
    }

    return {
      metric: target.metric,
      percent,
      product: "all",
      coverage: "complete",
      targetRoomType: target.targetRoomType,
      stackMode: "max",
      stackGroup: [
        "control",
        target.targetRoomType,
        target.metric,
        "all",
      ].join(":"),
    };
  }

  return null;
}

function getIgnoredMechanics(description) {
  const ignoredMechanics = [];
  if (description.includes("\u5fc3\u60c5")) {
    ignoredMechanics.push("morale");
  }
  if (description.includes("\u4ed3\u5e93\u5bb9\u91cf")) {
    ignoredMechanics.push("storage");
  }
  if (description.includes("\u8ba2\u5355\u4e0a\u9650")) {
    ignoredMechanics.push("orderLimit");
  }
  return ignoredMechanics;
}

function createRule(skill, effect, replaceGroups) {
  const sourceSkillId = getSkillKey(skill);
  return {
    id: sourceSkillId,
    sourceSkillId,
    charId: skill.charId,
    name: skill.name,
    buffName: skill.buffName,
    roomType: skill.roomType,
    unlock: {
      phase: Number(skill.phase || 0),
      level: Number(skill.level || 1),
    },
    activation: getActivation(skill, replaceGroups),
    effect,
    poolKey: effect.targetRoomType
      ? [
          skill.roomType,
          effect.targetRoomType,
          effect.product,
          effect.percent,
        ].join(":")
      : [skill.roomType, effect.product, effect.percent].join(":"),
    confidence: "high",
    ignoredMechanics: getIgnoredMechanics(stripHtml(skill.description)),
    rawDescription: stripHtml(skill.description),
  };
}

function createExclusion(skill, reason) {
  return {
    id: getSkillKey(skill),
    charId: skill.charId,
    name: skill.name,
    buffName: skill.buffName,
    roomType: skill.roomType,
    unlock: {
      phase: Number(skill.phase || 0),
      level: Number(skill.level || 1),
    },
    reason,
    rawDescription: stripHtml(skill.description),
  };
}

function getExclusionReason(description) {
  if (TIME_DEPENDENT_PATTERN.test(description)) {
    return "timeDependentOrThreshold";
  }

  if (SPECIAL_ORDER_PATTERN.test(description)) {
    return "specialOrderOrProbability";
  }

  if (description.includes("\u5f52\u96f6")) {
    return "sameRoomOverride";
  }

  if (CONDITIONAL_START_PATTERN.test(description)) {
    return "conditionalOrUnsupported";
  }

  return "missingDirectEffect";
}

function buildNameCharIds(skills) {
  const charIdsByName = new Map();
  for (const skill of skills) {
    if (!charIdsByName.has(skill.name)) {
      charIdsByName.set(skill.name, new Set());
    }
    charIdsByName.get(skill.name).add(skill.charId);
  }
  return charIdsByName;
}

function getTermCharIds(termId, termDescriptions, charIdsByName) {
  const term = termDescriptions[termId];
  if (!term) {
    throw new Error(`Unknown RIIC term: ${termId}`);
  }

  const description = stripHtml(term.description);
  const membersMatch = description.match(
    /\u5305\u542b\u4ee5\u4e0b\u5e72\u5458\s*([\s\S]+)/,
  );
  if (!membersMatch) {
    throw new Error(`Term ${termId} does not declare operator members`);
  }

  const memberNames = membersMatch[1]
    .split(/[\u3001\uff0c,]/)
    .map((name) => name.trim())
    .filter(Boolean);
  const charIds = new Set();

  for (const memberName of memberNames) {
    const memberCharIds = charIdsByName.get(memberName);
    if (!memberCharIds || memberCharIds.size === 0) {
      throw new Error(
        `Term ${termId} has an unresolved operator member: ${memberName}`,
      );
    }
    for (const charId of memberCharIds) {
      charIds.add(charId);
    }
  }

  return [...charIds].sort((left, right) => left.localeCompare(right, "en"));
}

function getReviewedSourceSkill(spec, skills) {
  const candidates = skills.filter((skill) => {
    if (
      skill.charId !== spec.charId ||
      skill.roomType !== spec.roomType ||
      Number(skill.phase || 0) !== spec.phase ||
      Number(skill.level || 1) !== spec.level
    ) {
      return false;
    }

    return (
      !spec.descriptionToken ||
      stripHtml(skill.description).includes(spec.descriptionToken)
    );
  });

  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one source skill for same-room rule ${spec.charId}`,
    );
  }

  return candidates[0];
}

function createSameRoomRule(
  spec,
  sourceSkill,
  replaceGroups,
  termDescriptions,
  charIdsByName,
) {
  const description = stripHtml(sourceSkill.description);
  const charIds = spec.condition.termId
    ? getTermCharIds(
        spec.condition.termId,
        termDescriptions,
        charIdsByName,
      )
    : [...spec.condition.charIds];

  if (!description.includes(`+${spec.effect.percent}%`)) {
    throw new Error(
      `Same-room rule ${spec.id} does not match its expected effect value`,
    );
  }

  const sourceSkillId = getSkillKey(sourceSkill);
  return {
    id: `${sourceSkillId}|same-room|${spec.id}`,
    sourceSkillId,
    charId: sourceSkill.charId,
    name: sourceSkill.name,
    buffName: sourceSkill.buffName,
    roomType: sourceSkill.roomType,
    unlock: {
      phase: Number(sourceSkill.phase || 0),
      level: Number(sourceSkill.level || 1),
    },
    activation: getActivation(sourceSkill, replaceGroups),
    condition: {
      type: spec.condition.type,
      charIds,
      excludeOwner: Boolean(spec.condition.excludeOwner),
    },
    effect: {
      metric: METRIC_BY_ROOM_TYPE[sourceSkill.roomType],
      percent: spec.effect.percent,
      product: spec.effect.product,
    },
    confidence: "reviewed",
    ignoredMechanics: getIgnoredMechanics(description),
    rawDescription: description,
  };
}

function createReviewedDirectApproximation(spec, sourceSkill, replaceGroups) {
  const description = stripHtml(sourceSkill.description);
  const sourceSkillId = getSkillKey(sourceSkill);

  return {
    id: sourceSkillId,
    sourceSkillId,
    charId: sourceSkill.charId,
    name: sourceSkill.name,
    buffName: sourceSkill.buffName,
    roomType: sourceSkill.roomType,
    unlock: {
      phase: Number(sourceSkill.phase || 0),
      level: Number(sourceSkill.level || 1),
    },
    activation: getActivation(sourceSkill, replaceGroups),
    effect: {
      metric: METRIC_BY_ROOM_TYPE[sourceSkill.roomType],
      percent: spec.effect.percent,
      product: spec.effect.product,
      coverage: spec.effect.coverage === "complete" ? "complete" : "baseOnly",
    },
    poolKey: [
      sourceSkill.roomType,
      spec.effect.product,
      spec.effect.percent,
    ].join(":"),
    confidence: "reviewed",
    ignoredMechanics: [
      ...new Set([
        ...getIgnoredMechanics(description),
        ...(spec.ignoredMechanics || []),
      ]),
    ],
    rawDescription: description,
  };
}

function incrementCount(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function summarize({
  skillStates,
  rules,
  sameRoomRules,
  exclusions,
  inputRecordCount,
}) {
  const roomTypes = {};
  const roomProducts = {};
  const poolKeys = {};
  const exclusionsByReason = {};
  const includedSourceIds = new Set([
    ...rules.map((rule) => rule.sourceSkillId),
    ...sameRoomRules.map((rule) => rule.sourceSkillId),
  ]);

  for (const rule of rules) {
    incrementCount(roomTypes, rule.roomType);
    incrementCount(
      roomProducts,
      `${rule.roomType}:${rule.effect.product}`,
    );
    incrementCount(poolKeys, rule.poolKey);
  }

  for (const exclusion of exclusions) {
    incrementCount(exclusionsByReason, exclusion.reason);
  }

  return {
    inputRecordCount,
    scopedSkillCount: skillStates.length,
    includedSourceSkillCount: includedSourceIds.size,
    directRuleCount: rules.length,
    baseOnlyRuleCount: rules.filter(
      (rule) => rule.effect.coverage === "baseOnly",
    ).length,
    sameRoomRuleCount: sameRoomRules.length,
    excludedSkillCount: exclusions.length,
    byRoomType: roomTypes,
    byRoomProduct: roomProducts,
    byPoolKey: poolKeys,
    exclusionsByReason,
  };
}

const [skillText, replaceGroupText, termDescriptionText] = await Promise.all([
  fs.readFile(INPUT_PATH, "utf8"),
  fs.readFile(REPLACE_GROUP_PATH, "utf8"),
  fs.readFile(TERM_DESCRIPTION_PATH, "utf8"),
]);
const allSkills = JSON.parse(skillText);
const replaceGroups = JSON.parse(replaceGroupText);
const termDescriptions = JSON.parse(termDescriptionText);
const skills = allSkills.filter((skill) => ROOM_TYPES.has(skill.roomType));
const charIdsByName = buildNameCharIds(allSkills);
const skillStates = skills.map((skill) => createSkillState(skill, replaceGroups));
const rules = [];

for (const skill of skills) {
  const description = stripHtml(skill.description);
  const effect = getDirectEffect(skill, description);
  if (effect) {
    rules.push(createRule(skill, effect, replaceGroups));
  }
}
for (const spec of REVIEWED_DIRECT_APPROXIMATIONS) {
  rules.push(
    createReviewedDirectApproximation(
      spec,
      getReviewedSourceSkill(spec.source, skills),
      replaceGroups,
    ),
  );
}

const sameRoomRules = REVIEWED_SAME_ROOM_SYNERGIES.map((spec) =>
  createSameRoomRule(
    spec,
    getReviewedSourceSkill(spec.source, skills),
    replaceGroups,
    termDescriptions,
    charIdsByName,
  ),
);
const includedSourceIds = new Set([
  ...rules.map((rule) => rule.sourceSkillId),
  ...sameRoomRules.map((rule) => rule.sourceSkillId),
]);
const exclusions = skills
  .filter((skill) => !includedSourceIds.has(getSkillKey(skill)))
  .map((skill) =>
    createExclusion(skill, getExclusionReason(stripHtml(skill.description))),
  );

skillStates.sort((left, right) => left.id.localeCompare(right.id, "en"));
rules.sort((left, right) => left.id.localeCompare(right.id, "en"));
sameRoomRules.sort((left, right) => left.id.localeCompare(right.id, "en"));
exclusions.sort((left, right) => left.id.localeCompare(right.id, "en"));

const output = {
  schemaVersion: 2,
  source: {
    buildingTable: INPUT_PATH,
    replacementGroups: REPLACE_GROUP_PATH,
    termDescriptions: TERM_DESCRIPTION_PATH,
  },
  scope: {
    roomTypes: [...ROOM_TYPES],
    supportedEffects: [
      "manufacture production",
      "trading order efficiency",
      "power drone charge",
      "meeting clue search",
      "hire contact speed",
      "control generic cross-room percent",
      "same-room additive synergy",
    ],
    ignoredMechanics: [
      "morale impact",
      "storage capacity",
      "order limit",
    ],
    excludedMechanics: [
      "warmup",
      "threshold",
      "conditional cross-room",
      "sameRoomOverride",
      "specialOrder",
    ],
  },
  summary: summarize({
    skillStates,
    rules,
    sameRoomRules,
    exclusions,
    inputRecordCount: allSkills.length,
  }),
  poolDefinitions: [
    {
      id: "manufacture:all",
      roomType: "manufacture",
      product: "all",
    },
    {
      id: "manufacture:experience",
      roomType: "manufacture",
      product: "experience",
    },
    {
      id: "manufacture:gold",
      roomType: "manufacture",
      product: "gold",
    },
    {
      id: "manufacture:orundum",
      roomType: "manufacture",
      product: "orundum",
    },
    {
      id: "trading:all",
      roomType: "trading",
      product: "all",
    },
    {
      id: "power:all",
      roomType: "power",
      product: "all",
    },
    {
      id: "control:all",
      roomType: "control",
      product: "all",
    },
    {
      id: "meeting:all",
      roomType: "meeting",
      product: "all",
    },
    {
      id: "hire:all",
      roomType: "hire",
      product: "all",
    },
  ],
  skillStates,
  rules,
  sameRoomRules,
  exclusions,
};

await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Generated ${rules.length} direct RIIC rules, ${sameRoomRules.length} same-room rules, and ${exclusions.length} exclusions at ${OUTPUT_PATH}`,
);
