import { isRiicIdealTrainingEnabledForOperator } from "./l00-training-policy.js";
import { getRiicLayer3ControlCenterEffects } from "./l30-rules.js";

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function isSkillUnlocked(operator, skill) {
  const operatorElite = toNonNegativeInteger(operator?.elite);
  const requiredElite = toNonNegativeInteger(skill?.elite);
  if (operatorElite !== requiredElite) {
    return operatorElite > requiredElite;
  }

  return (
    toNonNegativeInteger(operator?.level, 1) >=
    toNonNegativeInteger(skill?.level, 1)
  );
}

function isSkillAvailable(
  operator,
  skill,
  trainingMode,
  idealTrainingRaritySelection,
) {
  return (
    (trainingMode === "ideal" &&
      isRiicIdealTrainingEnabledForOperator(
        operator,
        idealTrainingRaritySelection,
      )) ||
    isSkillUnlocked(operator, skill)
  );
}

function isRoomEffect(effect) {
  const target = effect?.target || {};
  const scope = String(target?.scope || "").trim();

  return Boolean(
    ["allRooms", "operators"].includes(scope) &&
      ["trading", "manufacture", "meeting", "hire"].includes(
        String(target?.roomType || "").trim(),
      ) &&
      (scope !== "operators" ||
        (target?.operatorIds || []).some(
          (operatorId) => String(operatorId || "").trim(),
        )) &&
      Number.isFinite(Number(effect?.bonusPercent)),
  );
}

function getEffectKey(effect) {
  const target = effect?.target || {};
  return [
    String(target?.scope || "").trim(),
    String(target?.roomType || "").trim(),
    String(target?.product || "").trim(),
    String(effect?.metric || "").trim(),
    Number(effect?.bonusPercent),
    (target?.operatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean)
      .sort()
      .join(","),
    JSON.stringify(effect?.conditions || null),
  ].join(":");
}

function getRosterById(roster) {
  const rosterById = new Map();

  for (const operator of roster || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const current = rosterById.get(charId);
    if (
      !current ||
      toNonNegativeInteger(operator?.elite) >
        toNonNegativeInteger(current?.elite) ||
      (toNonNegativeInteger(operator?.elite) ===
        toNonNegativeInteger(current?.elite) &&
        toNonNegativeInteger(operator?.level, 1) >
          toNonNegativeInteger(current?.level, 1))
    ) {
      rosterById.set(charId, operator);
    }
  }

  return rosterById;
}

/**
 * Build L50 control-center candidates from a supplied roster. The returned
 * operators contain only scheduling data; presentation labels stay in Vue.
 */
export function buildRiicControlCenterCandidateOperators({
  roster = [],
  skills = [],
  layoutData = {},
  trainingMode = "current",
  idealTrainingRaritySelection,
  idleFillOperators = [],
} = {}) {
  const rosterById = getRosterById(roster);
  const activeTagsByOperatorId = new Map();
  const activeEffectsByOperatorId = new Map();
  const activeSkillDescriptionsByOperatorId = new Map();
  const sameTeamPartnerIdsByOperatorId = new Map();
  const priorityFillOperatorIds = new Set(
    (idleFillOperators || [])
      .filter((operator) =>
        Number.isFinite(Number(operator?.idleFillNamedPriority)),
      )
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );

  for (const skill of skills || []) {
    const charId = String(skill?.operatorId || "").trim();
    const operator = rosterById.get(charId);
    const tags = [...new Set(skill?.bufftag || [])].filter(Boolean);
    const hasOperatorEffect =
      (skill?.middleData || []).length > 0 ||
      (skill?.sameTeamWithOperatorIds || []).some(Boolean) ||
      (skill?.resolvedEffects || []).some((effect) =>
        ["operators", "controlCenterState"].includes(
          String(effect?.target?.scope || "").trim(),
        ),
      );
    if (hasOperatorEffect && !tags.includes("operator-effect")) {
      tags.push("operator-effect");
    }
    if (
      !operator ||
      (tags.length === 0 && !priorityFillOperatorIds.has(charId)) ||
      !isSkillAvailable(
        operator,
        skill,
        trainingMode,
        idealTrainingRaritySelection,
      )
    ) {
      continue;
    }

    const activeTags = activeTagsByOperatorId.get(charId) || new Set();
    tags.forEach((tag) => activeTags.add(tag));
    activeTagsByOperatorId.set(charId, activeTags);

    const activeSkillDescriptions =
      activeSkillDescriptionsByOperatorId.get(charId) || new Set();
    const skillName = String(skill?.skillName || "").trim();
    const skillEffect = String(skill?.effect || "").trim();
    if (skillName) {
      activeSkillDescriptions.add(
        skillEffect ? `${skillName}：${skillEffect}` : skillName,
      );
    }
    activeSkillDescriptionsByOperatorId.set(
      charId,
      activeSkillDescriptions,
    );

    const activeEffects = activeEffectsByOperatorId.get(charId) || new Map();
    for (const effect of skill?.resolvedEffects || []) {
      if (isRoomEffect(effect)) {
        activeEffects.set(getEffectKey(effect), effect);
      }
    }
    activeEffectsByOperatorId.set(charId, activeEffects);

    const sameTeamPartnerIds = [
      ...new Set(
        (skill?.sameTeamWithOperatorIds || [])
          .map((operatorId) => String(operatorId || "").trim())
          .filter((operatorId) => operatorId && operatorId !== charId),
      ),
    ];
    if (sameTeamPartnerIds.length > 0) {
      const existingPartnerIds =
        sameTeamPartnerIdsByOperatorId.get(charId) || new Set();
      sameTeamPartnerIds.forEach((operatorId) =>
        existingPartnerIds.add(operatorId),
      );
      sameTeamPartnerIdsByOperatorId.set(charId, existingPartnerIds);
    }
  }

  return [...activeTagsByOperatorId.entries()]
    .map(([charId, tags]) => {
      const resolvedEffects = new Map(
        activeEffectsByOperatorId.get(charId) || [],
      );
      for (const effect of getRiicLayer3ControlCenterEffects({
        operatorId: charId,
        ownedOperators: roster,
        layoutData,
      })) {
        if (isRoomEffect(effect)) {
          resolvedEffects.set(getEffectKey(effect), effect);
        }
      }

      return {
        ...rosterById.get(charId),
        controlCenterBuffTags: [...tags],
        controlCenterSkillDescriptions: [
          ...(activeSkillDescriptionsByOperatorId.get(charId) || []),
        ],
        controlCenterResolvedEffects: [...resolvedEffects.values()],
        controlCenterSameTeamWithOperatorIds: [
          ...(sameTeamPartnerIdsByOperatorId.get(charId) || []),
        ],
      };
    })
    .sort(
      (left, right) =>
        String(left?.name || "").localeCompare(
          String(right?.name || ""),
          "zh-CN",
        ) ||
        String(left?.charId || "").localeCompare(
          String(right?.charId || ""),
          "en",
        ),
    );
}
