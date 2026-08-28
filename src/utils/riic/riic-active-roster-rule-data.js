import RIIC_ACTIVE_ROSTER_RULES from "../../static/json/tools/riic-candidates/R65-roster.json" with {
  type: "json",
};
import { resolveRiicOperatorIdByName } from "./riic-operator-identity.js";
import { getRiicOperatorIdsByTag } from "./riic-operator-tags.js";

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeActiveRosterRuleData(ruleData) {
  const tagOperatorIdsById = new Map(
    (ruleData?.tagSets || []).flatMap((tagSet) => {
      const id = String(tagSet?.id || "").trim();
      if (!id) {
        return [];
      }

      const taggedOperatorIds = new Set(getRiicOperatorIdsByTag(id));
      for (const operatorId of (tagSet?.operatorNames || [])
        .map(resolveRiicOperatorIdByName)
        .filter(Boolean)) {
        taggedOperatorIds.add(operatorId);
      }

      return [
        [
          id,
          taggedOperatorIds,
        ],
      ];
    }),
  );

  const runtimeRules = (ruleData?.rules || []).flatMap((rule) => {
    const ownerName = String(rule?.owner?.operatorName || "").trim();
    const ownerId = resolveRiicOperatorIdByName(ownerName);
    const roomType = String(rule?.scope?.roomType || "").trim();
    const product = String(rule?.scope?.product || "").trim();
    const effect = rule?.effect || {};
    const tag = String(effect?.tag || "").trim();
    const percentPerOperator = toFiniteNumber(effect?.percentPerOperator, NaN);
    const maximumOperatorCount = toNonNegativeInteger(
      effect?.maximumOperatorCount,
      0,
    );

    if (
      !String(rule?.id || "").trim() ||
      !ownerId ||
      !roomType ||
      !product ||
      effect?.type !== "perActiveTaggedOperator" ||
      !tagOperatorIdsById.has(tag) ||
      !Number.isFinite(percentPerOperator) ||
      maximumOperatorCount <= 0
    ) {
      return [];
    }

    return [
      {
        id: String(rule.id),
        ownerId,
        ownerName,
        eliteAtLeast: toNonNegativeInteger(rule?.owner?.eliteAtLeast),
        roomType,
        product,
        tag,
        taggedOperatorIds: tagOperatorIdsById.get(tag),
        excludeOwner: effect?.excludeOwner === true,
        percentPerOperator,
        maximumOperatorCount,
      },
    ];
  });

  const selectionPriorityRules = (
    ruleData?.selectionPriorityRules || []
  ).flatMap((rule) => {
    const triggerName = String(rule?.trigger?.operatorName || "").trim();
    const triggerOperatorId = resolveRiicOperatorIdByName(triggerName);
    const effect = rule?.effect || {};
    const tag = String(effect?.tag || "").trim();
    const roomPriorityPerOperator = toFiniteNumber(
      effect?.roomPriorityPerOperator,
      NaN,
    );

    if (
      !String(rule?.id || "").trim() ||
      !triggerOperatorId ||
      effect?.type !== "perCandidateTaggedOperator" ||
      !tagOperatorIdsById.has(tag) ||
      !Number.isFinite(roomPriorityPerOperator)
    ) {
      return [];
    }

    return [
      {
        id: String(rule.id),
        triggerOperatorId,
        triggerName,
        tag,
        taggedOperatorIds: tagOperatorIdsById.get(tag),
        roomPriorityPerOperator,
      },
    ];
  });

  return {
    runtimeRules,
    selectionPriorityRules,
  };
}

const NORMALIZED_RULE_DATA = normalizeActiveRosterRuleData(
  RIIC_ACTIVE_ROSTER_RULES,
);

export const RIIC_ACTIVE_ROSTER_RUNTIME_RULES =
  NORMALIZED_RULE_DATA.runtimeRules;
export const RIIC_ACTIVE_ROSTER_SELECTION_PRIORITY_RULES =
  NORMALIZED_RULE_DATA.selectionPriorityRules;
