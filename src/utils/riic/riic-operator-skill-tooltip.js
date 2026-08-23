import BUILDING_TABLE from "../../static/json/build/building_table.json";

const SKILLS_BY_OPERATOR_ID = new Map();

for (const skill of BUILDING_TABLE || []) {
  const charId = String(skill?.charId || "").trim();
  if (!charId) {
    continue;
  }

  const skills = SKILLS_BY_OPERATOR_ID.get(charId) || [];
  skills.push(skill);
  SKILLS_BY_OPERATOR_ID.set(charId, skills);
}

function isSkillUnlocked(operator, skill) {
  const elite = Number(operator?.elite);
  const level = Number(operator?.level);
  const requiredElite = Number(skill?.phase);
  const requiredLevel = Number(skill?.level);

  if (!Number.isFinite(elite) || !Number.isFinite(level)) {
    return false;
  }

  return (
    elite > requiredElite ||
    (elite === requiredElite && level >= requiredLevel)
  );
}

function stripMarkup(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRiicOperatorSkillTooltip(operator, fallbackOperator = null) {
  const source = {
    ...(fallbackOperator || {}),
    ...(operator || {}),
  };
  const charId = String(source?.charId || "").trim();
  if (!charId) {
    return "暂无已解锁基建技能";
  }

  const presetDescriptions = Array.isArray(
    source?.controlCenterSkillDescriptions,
  )
    ? source.controlCenterSkillDescriptions.filter(Boolean)
    : [];
  if (presetDescriptions.length > 0) {
    return presetDescriptions.join("\n");
  }

  const descriptions = (SKILLS_BY_OPERATOR_ID.get(charId) || [])
    .filter((skill) => isSkillUnlocked(source, skill))
    .map((skill) => {
      const name = String(skill?.buffName || "").trim();
      const description = stripMarkup(skill?.description);
      return name && description ? `${name}：${description}` : name || description;
    })
    .filter(Boolean);

  return descriptions.length > 0
    ? [...new Set(descriptions)].join("\n")
    : "暂无已解锁基建技能";
}
