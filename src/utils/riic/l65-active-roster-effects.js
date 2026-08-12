import RIIC_ACTIVE_ROSTER_RULES from "../../static/json/tools/riic-candidates/R65-roster.json" with {
  type: "json",
};
import { operatorTableV2 } from "/src/utils/gameData.js";

const OPERATOR_ID_BY_NAME = new Map(
  Object.entries(operatorTableV2 || {}).flatMap(([charId, operator]) => {
    const name = String(operator?.name || "").trim();
    return name ? [[name, charId]] : [];
  }),
);

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function getOperatorName(charId) {
  const operatorId = normalizeOperatorId(charId);
  return String(operatorTableV2?.[operatorId]?.name || operatorId).trim();
}

function getRosterById(ownedOperators) {
  return new Map(
    (ownedOperators || []).flatMap((operator) => {
      const charId = normalizeOperatorId(operator?.charId);
      return charId
        ? [
            [
              charId,
              {
                ...operator,
                charId,
                elite: toNonNegativeInteger(operator?.elite),
              },
            ],
          ]
        : [];
    }),
  );
}

function getCandidateScope(candidate) {
  const scope = candidate?.candidateScope || candidate?.scope || {};
  return {
    roomType: String(scope?.roomType || "").trim(),
    product: String(scope?.product || "").trim(),
  };
}

function normalizeRuleData(ruleData) {
  const tagOperatorIdsById = new Map(
    (ruleData?.tagSets || []).flatMap((tagSet) => {
      const id = String(tagSet?.id || "").trim();
      if (!id) {
        return [];
      }

      return [
        [
          id,
          new Set(
            (tagSet?.operatorNames || [])
              .map((name) => OPERATOR_ID_BY_NAME.get(String(name || "").trim()))
              .filter(Boolean),
          ),
        ],
      ];
    }),
  );

  const rules = (ruleData?.rules || []).flatMap((rule) => {
    const ownerName = String(rule?.owner?.operatorName || "").trim();
    const ownerId = OPERATOR_ID_BY_NAME.get(ownerName);
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

  const selectionPriorityRules = (ruleData?.selectionPriorityRules || []).flatMap(
    (rule) => {
      const triggerName = String(rule?.trigger?.operatorName || "").trim();
      const triggerOperatorId = OPERATOR_ID_BY_NAME.get(triggerName);
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
    },
  );

  return { rules, selectionPriorityRules };
}

const NORMALIZED_RULE_DATA = normalizeRuleData(RIIC_ACTIVE_ROSTER_RULES);

/**
 * L65 runtime selection priority for a candidate considered after earlier
 * selections in the same automatic-scheduling branch.
 */
export function getRiicActiveRosterCandidatePriority({
  candidate,
  activeOperatorIds = [],
} = {}) {
  const activeIds = new Set(
    Array.from(activeOperatorIds || []).map(normalizeOperatorId).filter(Boolean),
  );
  const candidateOperatorIds = [
    ...new Set(
      (candidate?.operatorIds || []).map(normalizeOperatorId).filter(Boolean),
    ),
  ];
  const applications = [];
  let roomPriority = 0;

  for (const rule of NORMALIZED_RULE_DATA.selectionPriorityRules) {
    if (!activeIds.has(rule.triggerOperatorId)) {
      continue;
    }

    const matchingOperatorIds = candidateOperatorIds.filter((operatorId) =>
      rule.taggedOperatorIds.has(operatorId),
    );
    if (matchingOperatorIds.length === 0) {
      continue;
    }

    const priority = matchingOperatorIds.length * rule.roomPriorityPerOperator;
    roomPriority += priority;
    applications.push({
      ruleId: rule.id,
      triggerOperatorId: rule.triggerOperatorId,
      triggerName: rule.triggerName,
      tag: rule.tag,
      matchingOperatorIds,
      matchingOperatorNames: matchingOperatorIds.map(getOperatorName),
      roomPriority: priority,
    });
  }

  return {
    roomPriority,
    applications,
  };
}

/**
 * L65 runtime estimate for a fallback operator that is about to enter a room.
 * It adds only effects whose owner is that operator and keeps JSON rates intact.
 */
export function applyRiicActiveRosterFallbackOperatorEffects({
  candidate,
  fallbackOperators = [],
  ownedOperators = [],
  activeOperatorIds = [],
} = {}) {
  const rosterById = getRosterById(ownedOperators);
  const scope = getCandidateScope(candidate);
  const baseActiveOperatorIds = new Set([
    ...Array.from(activeOperatorIds || [])
      .map(normalizeOperatorId)
      .filter(Boolean),
    ...(candidate?.operatorIds || []).map(normalizeOperatorId).filter(Boolean),
  ]);

  return (fallbackOperators || []).map((fallbackOperator) => {
    const operatorId = normalizeOperatorId(fallbackOperator?.charId);
    if (!operatorId) {
      return fallbackOperator;
    }

    const projectedActiveOperatorIds = new Set([
      ...baseActiveOperatorIds,
      operatorId,
    ]);
    const applications = [];
    let activeRosterBonusPercent = 0;

    for (const rule of NORMALIZED_RULE_DATA.rules) {
      if (
        rule.ownerId !== operatorId ||
        rule.roomType !== scope.roomType ||
        rule.product !== scope.product
      ) {
        continue;
      }

      const owner = rosterById.get(rule.ownerId);
      if (!owner || owner.elite < rule.eliteAtLeast) {
        continue;
      }

      const matchingOperatorIds = [...projectedActiveOperatorIds]
        .filter(
          (activeOperatorId) =>
            rule.taggedOperatorIds.has(activeOperatorId) &&
            (!rule.excludeOwner || activeOperatorId !== rule.ownerId),
        )
        .sort((left, right) => left.localeCompare(right, "en"));
      const matchingOperatorCount = Math.min(
        matchingOperatorIds.length,
        rule.maximumOperatorCount,
      );
      const bonusPercent = matchingOperatorCount * rule.percentPerOperator;

      if (bonusPercent <= 0) {
        continue;
      }

      activeRosterBonusPercent += bonusPercent;
      applications.push({
        ruleId: rule.id,
        matchingOperatorCount,
        matchingOperatorIds,
        matchingOperatorNames: matchingOperatorIds.map(getOperatorName),
        bonusPercent,
      });
    }

    const effectivePercent =
      toFiniteNumber(
        fallbackOperator?.effectivePercent ?? fallbackOperator?.percent,
      ) + activeRosterBonusPercent;

    return {
      ...fallbackOperator,
      activeRosterBonusPercent,
      activeRosterEffects: applications,
      effectivePercent,
    };
  });
}

function getPlanStateCount(plan, controlCenterSegments) {
  return Math.max(
    ...(plan?.selections || []).map(
      (selection) =>
        selection?.slot?.staffingCohort?.rotationSegments?.length || 0,
    ),
    (controlCenterSegments || []).length,
    0,
  );
}

function getPlanSelectionKey(selection) {
  return [
    String(selection?.slot?.groupId || "").trim(),
    String(selection?.slot?.cohortId || "").trim(),
    Number(selection?.option?.teamIndex || 0),
  ].join(":");
}

function getPlanSelectionScope(selection) {
  const scope = selection?.option?.materializedCandidate?.candidateScope || {};
  return {
    roomType: String(scope?.roomType || "").trim(),
    product: String(scope?.product || "").trim(),
  };
}

function getPlanSelectionOperatorIds(selection) {
  return [
    ...new Set(
      (selection?.option?.materializedCandidate?.operatorIds || [])
        .map(normalizeOperatorId)
        .filter(Boolean),
    ),
  ];
}

function getActivePlanSelectionForState(selection, stateIndex) {
  const segment =
    selection?.slot?.staffingCohort?.rotationSegments?.[stateIndex] || null;
  const teamIndex = Number(selection?.option?.teamIndex);
  const activeTeamIndexes = segment?.activeTeamIndexes || [];

  if (!Number.isInteger(teamIndex) || !activeTeamIndexes.includes(teamIndex)) {
    return null;
  }

  return {
    key: getPlanSelectionKey(selection),
    groupId: String(selection?.slot?.groupId || "").trim(),
    cohortId: String(selection?.slot?.cohortId || "").trim(),
    teamIndex,
    candidateName: String(
      selection?.option?.materializedCandidate?.name || "",
    ).trim(),
    scope: getPlanSelectionScope(selection),
    operatorIds: getPlanSelectionOperatorIds(selection),
    durationHours: toFiniteNumber(segment?.durationHours, 1) || 1,
  };
}

function createPlanRosterStates({ plan, controlCenterSegments }) {
  const stateCount = getPlanStateCount(plan, controlCenterSegments);

  return Array.from({ length: stateCount }, (_, stateIndex) => {
    const targets = (plan?.selections || [])
      .map((selection) => getActivePlanSelectionForState(selection, stateIndex))
      .filter(Boolean);
    const controlCenterOperatorIds = (
      controlCenterSegments?.[stateIndex]?.operatorIds || []
    )
      .map(normalizeOperatorId)
      .filter(Boolean);
    const activeOperatorIds = new Set([
      ...controlCenterOperatorIds,
      ...targets.flatMap((target) => target.operatorIds),
    ]);
    const durationHours =
      targets[0]?.durationHours ||
      toFiniteNumber(controlCenterSegments?.[stateIndex]?.durationHours, 1) ||
      1;

    return {
      index: stateIndex,
      durationHours,
      activeOperatorIds,
      targets,
    };
  });
}

function createPreviewRosterStates(preview) {
  return (preview?.states || []).map((state, stateIndex) => {
    const targets = (state?.rooms || [])
      .filter(
        (room) =>
          !room?.isStatic &&
          (!room?.manuallyEdited ||
            room?.efficiencyMetrics?.actual?.status === "calculated"),
      )
      .map((room) => ({
        key: `${stateIndex}:${String(room?.key || "").trim()}`,
        roomKey: String(room?.key || "").trim(),
        groupId: String(room?.groupId || "").trim(),
        cohortId: "",
        teamIndex: null,
        candidateName: String(room?.label || "").trim(),
        scope: {
          roomType: String(room?.facility || "").trim(),
          product: String(room?.product || "").trim(),
        },
        operatorIds: [
          ...new Set(
            (room?.operators || [])
              .map((operator) => normalizeOperatorId(operator?.charId))
              .filter(Boolean),
          ),
        ],
      }))
      .filter((target) => target.key && target.scope.roomType);
    const activeOperatorIds = new Set(
      (state?.rooms || []).flatMap((room) =>
        (room?.operators || [])
          .map((operator) => normalizeOperatorId(operator?.charId))
          .filter(Boolean),
      ),
    );

    return {
      index: stateIndex,
      durationHours: toFiniteNumber(state?.durationHours, 1) || 1,
      activeOperatorIds,
      targets,
    };
  });
}

function getActiveRuleApplications({ states, rosterById }) {
  const summariesByTargetAndRule = new Map();
  const applications = [];

  for (const state of states || []) {
    for (const target of state?.targets || []) {
      const targetOperatorIds = new Set(target?.operatorIds || []);
      for (const rule of NORMALIZED_RULE_DATA.rules) {
        if (
          target?.scope?.roomType !== rule.roomType ||
          target?.scope?.product !== rule.product ||
          !targetOperatorIds.has(rule.ownerId)
        ) {
          continue;
        }

        const owner = rosterById.get(rule.ownerId);
        if (!owner || owner.elite < rule.eliteAtLeast) {
          continue;
        }

        const matchingOperatorIds = [...state.activeOperatorIds]
          .filter(
            (operatorId) =>
              rule.taggedOperatorIds.has(operatorId) &&
              (!rule.excludeOwner || operatorId !== rule.ownerId),
          )
          .sort((left, right) => left.localeCompare(right, "en"));
        const matchingOperatorCount = Math.min(
          matchingOperatorIds.length,
          rule.maximumOperatorCount,
        );
        const bonusPercent = matchingOperatorCount * rule.percentPerOperator;
        const summaryKey = `${target.key}:${rule.id}`;
        const summary = summariesByTargetAndRule.get(summaryKey) || {
          targetKey: target.key,
          roomKey: target.roomKey || "",
          groupId: target.groupId,
          cohortId: target.cohortId,
          teamIndex: target.teamIndex,
          candidateName: target.candidateName,
          ruleId: rule.id,
          ownerId: rule.ownerId,
          ownerName: rule.ownerName,
          tag: rule.tag,
          activeHours: 0,
          bonusPercentHours: 0,
          states: [],
        };
        const durationHours = toFiniteNumber(state?.durationHours, 1) || 1;

        summary.activeHours += durationHours;
        summary.bonusPercentHours += bonusPercent * durationHours;
        summary.states.push({
          stateIndex: Number(state?.index || 0),
          durationHours,
          matchingOperatorCount,
          matchingOperatorIds,
          matchingOperatorNames: matchingOperatorIds.map(getOperatorName),
          bonusPercent,
        });
        summariesByTargetAndRule.set(summaryKey, summary);
        applications.push({
          targetKey: target.key,
          roomKey: target.roomKey || "",
          stateIndex: Number(state?.index || 0),
          ruleId: rule.id,
          ownerId: rule.ownerId,
          ownerName: rule.ownerName,
          matchingOperatorCount,
          matchingOperatorIds,
          matchingOperatorNames: matchingOperatorIds.map(getOperatorName),
          bonusPercent,
        });
      }
    }
  }

  const summaries = [...summariesByTargetAndRule.values()]
    .map((summary) => ({
      ...summary,
      expectedBonusPercent:
        summary.activeHours > 0
          ? summary.bonusPercentHours / summary.activeHours
          : 0,
    }))
    .sort(
      (left, right) =>
        left.targetKey.localeCompare(right.targetKey, "en") ||
        left.ruleId.localeCompare(right.ruleId, "en"),
    );

  return {
    summaries,
    applications,
  };
}

/**
 * L65: trial rules whose inputs depend on operators actually active in each
 * schedule state. L70 uses only the returned ranking bonus.
 */
export function evaluateRiicActiveRosterPlanEffects({
  plan,
  ownedOperators = [],
  controlCenterSegments = [],
} = {}) {
  const result = getActiveRuleApplications({
    states: createPlanRosterStates({
      plan,
      controlCenterSegments,
    }),
    rosterById: getRosterById(ownedOperators),
  });
  const rankingBonus = result.summaries.reduce(
    (total, summary) => total + Number(summary.expectedBonusPercent || 0),
    0,
  );

  return {
    ...result,
    rankingBonus,
  };
}

/**
 * Applies the same L65 rules to the assembled display schedule. This is the
 * exact per-state value and never changes candidate or fallback selection.
 */
export function applyRiicActiveRosterPreviewEffects({
  preview,
  ownedOperators = [],
} = {}) {
  if (!preview) {
    return preview;
  }

  const result = getActiveRuleApplications({
    states: createPreviewRosterStates(preview),
    rosterById: getRosterById(ownedOperators),
  });
  const applicationsByRoomKey = new Map();

  for (const application of result.applications) {
    if (!application.roomKey) {
      continue;
    }

    const key = `${application.stateIndex}:${application.roomKey}`;
    const current = applicationsByRoomKey.get(key) || {
      bonusPercent: 0,
      applications: [],
    };
    current.bonusPercent += Number(application.bonusPercent || 0);
    current.applications.push(application);
    applicationsByRoomKey.set(key, current);
  }

  return {
    ...preview,
    activeRosterEffects: result,
    states: (preview.states || []).map((state, stateIndex) => ({
      ...state,
      rooms: (state?.rooms || []).map((room) => {
        const application =
          applicationsByRoomKey.get(
            `${stateIndex}:${String(room?.key || "").trim()}`,
          ) || null;
        const bonusPercent = Number(application?.bonusPercent || 0);

        if (
          bonusPercent === 0 ||
          !Number.isFinite(Number(room?.efficiency))
        ) {
          return room;
        }

        return {
          ...room,
          efficiency: Number(room.efficiency) + bonusPercent,
          activeRosterBonusPercent: bonusPercent,
          activeRosterEffects: application.applications,
          efficiencyMetrics: {
            ...(room.efficiencyMetrics || {}),
            actual: {
              ...(room.efficiencyMetrics?.actual || {}),
              value:
                Number(room.efficiencyMetrics?.actual?.value || 0) +
                bonusPercent,
              breakdown: {
                ...(room.efficiencyMetrics?.actual?.breakdown || {}),
                activeRosterBonusPercent: bonusPercent,
                activeRosterEffects: application.applications,
              },
            },
          },
        };
      }),
    })),
  };
}
