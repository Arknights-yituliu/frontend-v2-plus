import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULE_PATH = "src/static/json/tools/riic_baseline_skill_rules.json";
const OPERATOR_PATH =
  "src/static/json/operator/character_table_simple.v2.json";
const OUTPUT_PATH =
  "src/static/json/tools/riic_manual_meeting_candidates.json";

const MEETING_LEVEL_BONUSES = Object.freeze({
  1: 7,
  3: 11,
});
const CONDITIONAL_DESCRIPTION_PATTERN = new RegExp(
  [
    "\u4eba\u95f4\u70df\u706b",
    "\u60c5\u62a5\u50a8\u5907",
    "\u9b54\u7269\u6599\u7406",
    "\u4e0e\u5176\u4ed6",
    "\u5f53\u4e0e",
    "\u6bcf\u62e5\u6709",
  ].join("|"),
);

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(absolute(relativePath), "utf8"));
}

function shortHash(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), "zh-CN");
}

function getMaxElite(rarity) {
  const value = Number(rarity);
  if (value >= 3) {
    return 2;
  }
  return value === 2 ? 1 : 0;
}

function getRarityBonus(rarity) {
  const value = Number(rarity);
  if (value >= 5) {
    return 5;
  }
  if (value === 4) {
    return 4;
  }
  if (value === 3) {
    return 2;
  }
  return 0;
}

function getEliteBonus(elite) {
  if (elite >= 2) {
    return 16;
  }
  return elite >= 1 ? 8 : 0;
}

function isUnlocked(entry, elite) {
  return elite >= Number(entry?.unlock?.phase || 0);
}

function normalizeActivation(entry) {
  return {
    mode: entry?.activation?.mode === "replace" ? "replace" : "stack",
    group: String(entry?.activation?.group || "").trim() || null,
  };
}

function getActiveSourceSkillIds({ skillStates, charId, elite }) {
  const stackIds = new Set();
  const replacementStates = new Map();

  for (const state of skillStates) {
    if (
      state?.charId !== charId ||
      state?.roomType !== "meeting" ||
      !isUnlocked(state, elite)
    ) {
      continue;
    }

    const activation = normalizeActivation(state);
    if (activation.mode !== "replace" || !activation.group) {
      stackIds.add(state.id);
      continue;
    }

    const current = replacementStates.get(activation.group);
    const currentRank =
      Number(current?.unlock?.phase || 0) * 1000 +
      Number(current?.unlock?.level || 1);
    const candidateRank =
      Number(state?.unlock?.phase || 0) * 1000 +
      Number(state?.unlock?.level || 1);
    if (
      !current ||
      candidateRank > currentRank ||
      (candidateRank === currentRank &&
        String(state.id).localeCompare(String(current.id), "en") < 0)
    ) {
      replacementStates.set(activation.group, state);
    }
  }

  for (const state of replacementStates.values()) {
    stackIds.add(state.id);
  }
  return stackIds;
}

function isSupportedDirectMeetingRule(rule) {
  const description = String(rule?.rawDescription || "");
  return (
    rule?.roomType === "meeting" &&
    rule?.effect?.metric === "clueSearch" &&
    Number.isFinite(Number(rule?.effect?.percent)) &&
    !CONDITIONAL_DESCRIPTION_PATTERN.test(description)
  );
}

function getOperatorVariant({
  operator,
  elite,
  directRules,
  skillStates,
}) {
  const activeSourceSkillIds = getActiveSourceSkillIds({
    skillStates,
    charId: operator.id,
    elite,
  });
  const activeRules = directRules.filter(
    (rule) =>
      rule.charId === operator.id &&
      activeSourceSkillIds.has(rule.sourceSkillId || rule.id),
  );
  const directPercent = activeRules.reduce(
    (total, rule) => total + Number(rule.effect.percent),
    0,
  );

  return {
    id: operator.id,
    name: operator.name,
    rarity: Number(operator.rarity),
    elite,
    maxElite: elite < getMaxElite(operator.rarity) ? elite : null,
    directPercent,
    calculationStatus: activeRules.some(
      (rule) =>
        rule?.effect?.coverage === "baseOnly" ||
        /\u5fc3\u60c5/.test(String(rule?.rawDescription || "")),
    )
      ? "estimated"
      : "calculated",
  };
}

function toMember(variant) {
  return {
    name: variant.name,
    ...(variant.elite > 0 ? { elite: variant.elite } : {}),
    ...(variant.maxElite !== null ? { maxElite: variant.maxElite } : {}),
  };
}

function createCandidate({ level, variant }) {
  const meetingPercent =
    100 +
    5 +
    15 +
    MEETING_LEVEL_BONUSES[level] +
    getRarityBonus(variant.rarity) +
    getEliteBonus(variant.elite) +
    variant.directPercent;
  const family = {
    type: "meeting",
    member: variant.name,
  };
  const identity = {
    level,
    family,
    member: {
      id: variant.id,
      elite: variant.elite,
      maxElite: variant.maxElite,
    },
    meetingPercent,
  };

  return {
    id: `meeting-${shortHash(identity)}`,
    variantGroupId: `meeting-family-${shortHash(family)}`,
    name: variant.name,
    roomType: "meeting",
    product: "all",
    stationLevel: level,
    slotCount: 2,
    selectionMode: "individual",
    members: [toMember(variant)],
    tradingPercent: 0,
    manufacturePercent: 0,
    meetingPercent,
    officePercent: 0,
    powerPercent: 0,
    sortScore: 0,
    calculationStatus: variant.calculationStatus,
  };
}

function buildMeetingCandidates({
  directRules,
  operatorById,
  skillStates,
}) {
  const supportedOperatorIds = [
    ...new Set(directRules.map((rule) => rule.charId)),
  ].filter((charId) => operatorById.has(charId));
  const candidates = [];

  for (const operatorId of supportedOperatorIds) {
    const operator = operatorById.get(operatorId);
    for (
      let elite = 0;
      elite <= getMaxElite(operator.rarity);
      elite += 1
    ) {
      const variant = getOperatorVariant({
        operator,
        elite,
        directRules,
        skillStates,
      });
      if (variant.directPercent <= 0) {
        continue;
      }

      for (const level of Object.keys(MEETING_LEVEL_BONUSES).map(Number)) {
        candidates.push(createCandidate({ level, variant }));
      }
    }
  }

  return candidates;
}

const [ruleData, operatorTable] = await Promise.all([
  readJson(RULE_PATH),
  readJson(OPERATOR_PATH),
]);
const operatorById = new Map(
  Object.entries(operatorTable).map(([id, operator]) => [
    id,
    {
      id,
      name: String(operator?.name || id),
      rarity: Number(operator?.rarity || 0),
    },
  ]),
);
const directRules = (ruleData?.rules || []).filter(
  isSupportedDirectMeetingRule,
);
const skillStates = ruleData?.skillStates || [];
const candidates = buildMeetingCandidates({
  directRules,
  operatorById,
  skillStates,
})
  .sort(
    (left, right) =>
      right.meetingPercent - left.meetingPercent ||
      compareText(left.name, right.name) ||
      left.id.localeCompare(right.id, "en"),
  )
  .filter(
    (candidate, index, allCandidates) =>
      index === 0 || candidate.id !== allCandidates[index - 1].id,
  );

await fs.writeFile(
  absolute(OUTPUT_PATH),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      candidates,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Built ${candidates.length} static individual meeting candidates.`,
);
