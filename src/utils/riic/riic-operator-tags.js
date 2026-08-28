import RIIC_OPERATOR_TAG_DATA from "../../static/json/build/riic_operator_tags.json" with {
  type: "json",
};
import RIIC_OPERATOR_TABLE from "../../static/json/operator/character_table_simple.v2.json" with {
  type: "json",
};
import RIIC_SKILL_TAG_DATA from "../../static/json/build/riic_skill_tags.json" with {
  type: "json",
};

const OPERATOR_ID_BY_NAME = new Map(
  Object.entries(RIIC_OPERATOR_TABLE || {}).flatMap(([charId, operator]) => {
    const name = String(operator?.name || "").trim();
    return name ? [[name, charId]] : [];
  }),
);

const OPERATOR_TAGS_BY_ID = new Map(
  Object.entries(RIIC_OPERATOR_TAG_DATA?.operatorTags || {}).map(
    ([charId, tags]) => [
      charId,
      new Set(
        (Array.isArray(tags) ? tags : [])
          .map((tag) => String(tag || "").trim())
          .filter(Boolean),
      ),
    ],
  ),
);

const RIIC_SKILL_TAG_RULES = Object.entries(
  RIIC_SKILL_TAG_DATA?.skillTags || {},
).map(([tag, definition]) => ({
  tag,
  skillNames: new Set(
    (Array.isArray(definition?.skillNames) ? definition.skillNames : [])
      .map((name) => String(name || "").trim())
      .filter(Boolean),
  ),
  skillNamePrefixes: (Array.isArray(definition?.skillNamePrefixes)
    ? definition.skillNamePrefixes
    : []
  )
    .map((prefix) => String(prefix || "").trim())
    .filter(Boolean),
}));

function resolveOperatorId(value) {
  if (value && typeof value === "object") {
    const charId = String(value.charId || "").trim();
    if (charId) {
      return charId;
    }

    return OPERATOR_ID_BY_NAME.get(String(value.name || "").trim()) || "";
  }

  const normalized = String(value || "").trim();
  return (
    (RIIC_OPERATOR_TABLE?.[normalized] ? normalized : "") ||
    OPERATOR_ID_BY_NAME.get(normalized) ||
    ""
  );
}

export function getRiicOperatorTags(value) {
  const operatorId = resolveOperatorId(value);
  return [...(OPERATOR_TAGS_BY_ID.get(operatorId) || [])];
}

export function getRiicOperatorIdsByTag(tag) {
  const normalizedTag = String(tag || "").trim();
  if (!normalizedTag) {
    return [];
  }

  return [...OPERATOR_TAGS_BY_ID.entries()]
    .filter(([, tags]) => tags.has(normalizedTag))
    .map(([charId]) => charId);
}

export function getRiicSkillTags(skillName) {
  const normalizedSkillName = String(skillName || "").trim();
  if (!normalizedSkillName) {
    return [];
  }

  return RIIC_SKILL_TAG_RULES.filter(
    ({ skillNames, skillNamePrefixes }) =>
      skillNames.has(normalizedSkillName) ||
      skillNamePrefixes.some((prefix) =>
        normalizedSkillName.startsWith(prefix),
      ),
  ).map(({ tag }) => tag);
}

export function withRiicOperatorTags(operator) {
  const existingTags = Array.isArray(operator?.tags)
    ? operator.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
    : [];
  const tags = [
    ...new Set([...existingTags, ...getRiicOperatorTags(operator)]),
  ];

  return tags.length > 0 ? { ...operator, tags } : { ...operator };
}
