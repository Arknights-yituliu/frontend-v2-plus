import RIIC_ACTIVE_ROSTER_RULES from "../../static/json/tools/riic-candidates/R65-roster.json" with {
  type: "json",
};
import { operatorTableV2 } from "/src/utils/gameData.js";
import {
  getRiicSameShiftBindingBonusBreakdown,
} from "./l51-control-effects.js";
import {
  recalculateRiicRoomTeamCandidateForActiveControlBindings,
} from "./l62-team-calculation.js";

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
    stationLevel: Number(scope?.stationLevel),
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

function getSegmentCycleHours(segments) {
  return (segments || []).reduce(
    (total, segment) =>
      total + Math.max(0, toFiniteNumber(segment?.durationHours, 0)),
    0,
  );
}

function getSegmentAtHour(segments, hour) {
  const cycleHours = getSegmentCycleHours(segments);
  if (cycleHours <= 0) {
    return null;
  }

  let cursor = ((Number(hour) % cycleHours) + cycleHours) % cycleHours;
  for (const segment of segments || []) {
    const durationHours = Math.max(
      0,
      toFiniteNumber(segment?.durationHours, 0),
    );
    if (durationHours <= 0) {
      continue;
    }
    if (cursor < durationHours) {
      return segment;
    }
    cursor -= durationHours;
  }

  return segments?.[segments.length - 1] || null;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));
  while (b > 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

function leastCommonMultiple(left, right) {
  if (left <= 0 || right <= 0) {
    return 0;
  }
  return Math.abs(left * right) / greatestCommonDivisor(left, right);
}

function getPlanCycleHours(plan, controlCenterSegments) {
  const cycles = [
    getSegmentCycleHours(controlCenterSegments),
    ...(plan?.selections || []).map((selection) =>
      getSegmentCycleHours(selection?.slot?.staffingCohort?.rotationSegments),
    ),
  ].filter((value) => value > 0);

  return cycles.reduce(
    (cycleHours, currentCycleHours) =>
      cycleHours > 0
        ? leastCommonMultiple(cycleHours, currentCycleHours)
        : currentCycleHours,
    0,
  );
}

function getPlanTimelineBoundaries(plan, controlCenterSegments, cycleHours) {
  const segmentLists = [
    controlCenterSegments,
    ...(plan?.selections || []).map(
      (selection) => selection?.slot?.staffingCohort?.rotationSegments || [],
    ),
  ];
  const boundaries = new Set([0, cycleHours]);

  for (const segments of segmentLists) {
    const segmentCycleHours = getSegmentCycleHours(segments);
    if (segmentCycleHours <= 0) {
      continue;
    }

    for (
      let cycleOffset = 0;
      cycleOffset < cycleHours;
      cycleOffset += segmentCycleHours
    ) {
      let segmentOffset = cycleOffset;
      boundaries.add(segmentOffset);
      for (const segment of segments || []) {
        segmentOffset += Math.max(
          0,
          toFiniteNumber(segment?.durationHours, 0),
        );
        if (segmentOffset < cycleHours) {
          boundaries.add(segmentOffset);
        }
      }
    }
  }

  return [...boundaries].sort((left, right) => left - right);
}

function getActivePlanSelectionAtHour(selection, hour) {
  const segment = getSegmentAtHour(
    selection?.slot?.staffingCohort?.rotationSegments,
    hour,
  );
  const teamIndex = Number(selection?.option?.teamIndex);
  const activeTeamIndexes = segment?.activeTeamIndexes || [];

  if (!Number.isInteger(teamIndex) || !activeTeamIndexes.includes(teamIndex)) {
    return null;
  }

  const candidate = selection?.option?.materializedCandidate || null;
  const teamCalculationExpectedBonusPercent = toFiniteNumber(
    candidate?.teamCalculation?.result?.coreBonusAdjustmentPercent ??
      candidate?.teamCalculation?.preview?.coreBonusAdjustmentPercent,
    0,
  );

  return {
    key: getPlanSelectionKey(selection),
    groupId: String(selection?.slot?.groupId || "").trim(),
    cohortId: String(selection?.slot?.cohortId || "").trim(),
    teamIndex,
    candidateName: String(
      candidate?.name || "",
    ).trim(),
    scope: getPlanSelectionScope(selection),
    operatorIds: getPlanSelectionOperatorIds(selection),
    candidate,
    sameShiftBindings: candidate?.sameShiftBindings || [],
    controlCenterExpectedBonusPercent:
      toFiniteNumber(candidate?.controlCenterExpectedBonusPercent, 0) +
      teamCalculationExpectedBonusPercent,
    teamCalculationExpectedBonusPercent,
  };
}

function createPlanRosterStates({ plan, controlCenterSegments }) {
  const cycleHours = getPlanCycleHours(plan, controlCenterSegments);
  const boundaries = getPlanTimelineBoundaries(
    plan,
    controlCenterSegments,
    cycleHours,
  );

  return Array.from(
    { length: Math.max(0, boundaries.length - 1) },
    (_, stateIndex) => {
      const startHour = boundaries[stateIndex];
      const durationHours = boundaries[stateIndex + 1] - startHour;
      const controlSegment = getSegmentAtHour(controlCenterSegments, startHour);
      const targets = (plan?.selections || [])
        .map((selection) => getActivePlanSelectionAtHour(selection, startHour))
        .filter(Boolean);
      const controlCenterOperatorIds = (
        controlSegment?.operatorIds || []
      )
        .map(normalizeOperatorId)
        .filter(Boolean);
      const activeOperatorIds = new Set([
        ...controlCenterOperatorIds,
        ...targets.flatMap((target) => target.operatorIds),
      ]);

      return {
        index: stateIndex,
        startHour,
        durationHours,
        controlCenterTeamIndex: Number.isInteger(
          Number(controlSegment?.teamIndex),
        )
          ? Number(controlSegment.teamIndex)
          : null,
        activeOperatorIds,
        controlCenterOperatorIds,
        targets,
      };
    },
  );
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

function normalizeBindingRoomType(value) {
  const roomType = String(value || "").trim();
  return roomType === "office" ? "hire" : roomType;
}

function normalizeBindingProduct(value) {
  return String(value || "").trim() || "all";
}

function getTargetSameShiftBindings(target) {
  const roomType = normalizeBindingRoomType(target?.scope?.roomType);
  const product = normalizeBindingProduct(target?.scope?.product);

  return (target?.sameShiftBindings || []).filter((binding) => {
    const bindingRoomType = normalizeBindingRoomType(binding?.roomType);
    const bindingProduct = normalizeBindingProduct(binding?.product);
    return (
      bindingRoomType === roomType &&
      (bindingProduct === "all" || bindingProduct === product)
    );
  });
}

function areSameShiftConditionsSatisfied(effect, controlOperatorIds) {
  const requiredOperatorIds = (
    effect?.conditions?.controlCoassignedOperatorIds || []
  )
    .map(normalizeOperatorId)
    .filter(Boolean);
  return requiredOperatorIds.every((operatorId) =>
    controlOperatorIds.has(operatorId),
  );
}

function getActiveSameShiftBindingEffects(binding, controlOperatorIds) {
  return (binding?.effects || []).filter((effect) => {
    const sourceOperatorIds = (effect?.sourceOperatorIds || [])
      .map(normalizeOperatorId)
      .filter(Boolean);
    return (
      (sourceOperatorIds.length === 0 ||
        sourceOperatorIds.some((operatorId) =>
          controlOperatorIds.has(operatorId),
        )) &&
      areSameShiftConditionsSatisfied(effect, controlOperatorIds)
    );
  });
}

function evaluateRiicPlanSameShiftPriority({ states = [] } = {}) {
  const summariesByTarget = new Map();
  const applications = [];

  for (const state of states) {
    const controlTeamIndex = state?.controlCenterTeamIndex;
    if (!Number.isInteger(controlTeamIndex)) {
      continue;
    }

    const controlOperatorIds = new Set(
      (state?.controlCenterOperatorIds || [])
        .map(normalizeOperatorId)
        .filter(Boolean),
    );
    const durationHours = toFiniteNumber(state?.durationHours, 0);
    if (durationHours <= 0) {
      continue;
    }

    for (const target of state?.targets || []) {
      const bindings = getTargetSameShiftBindings(target);
      if (bindings.length === 0) {
        continue;
      }

      const summary = summariesByTarget.get(target.key) || {
        targetKey: target.key,
        groupId: target.groupId,
        cohortId: target.cohortId,
        teamIndex: target.teamIndex,
        candidateName: target.candidateName,
        expectedBonusPercent: toFiniteNumber(
          target.controlCenterExpectedBonusPercent,
          0,
        ),
        activeHours: 0,
        expectedBonusPercentHours: 0,
        realizedBonusPercentHours: 0,
        expectedBindingHours: 0,
        realizedBindingHours: 0,
        states: [],
      };

      const matchingBindings = bindings
        .filter(
          (binding) =>
            Number(binding?.sourceTeamIndex) === controlTeamIndex,
        )
        .map((binding) => {
          const activeBinding = {
            ...binding,
            effects: getActiveSameShiftBindingEffects(
              binding,
              controlOperatorIds,
            ),
          };
          return {
            binding: activeBinding,
            ...getRiicSameShiftBindingBonusBreakdown(activeBinding),
          };
        })
        .filter(
          (binding) =>
            binding?.binding?.effects?.length > 0 ||
            Math.abs(Number(binding?.bonusPercent || 0)) > 1e-9,
        );
      const bindingBonusPercent = matchingBindings.reduce(
        (total, binding) => total + Number(binding.bonusPercent || 0),
        0,
      );
      const teamCalculation = recalculateRiicRoomTeamCandidateForActiveControlBindings({
        candidate: target.candidate,
        scope: target.scope,
        fallbackOperators: target?.candidate?.fallback?.operators || [],
        controlBindings: matchingBindings.map((binding) => binding.binding),
      });
      const teamCalculationBonusPercent = toFiniteNumber(
        teamCalculation?.coreBonusAdjustmentPercent,
        0,
      );
      const realizedBonusPercent =
        bindingBonusPercent + teamCalculationBonusPercent;

      summary.activeHours += durationHours;
      summary.expectedBonusPercentHours +=
        summary.expectedBonusPercent * durationHours;
      summary.realizedBonusPercentHours +=
        realizedBonusPercent * durationHours;
      summary.expectedBindingHours += bindings.length * durationHours;
      summary.realizedBindingHours +=
        matchingBindings.length * durationHours;
      summary.states.push({
        stateIndex: Number(state?.index || 0),
        startHour: toFiniteNumber(state?.startHour, 0),
        durationHours,
        controlTeamIndex,
        controlOperatorIds: [...controlOperatorIds],
        realizedBindingCount: matchingBindings.length,
        bindingBonusPercent,
        teamCalculationBonusPercent,
        realizedBonusPercent,
      });
      summariesByTarget.set(target.key, summary);
      applications.push({
        targetKey: target.key,
        stateIndex: Number(state?.index || 0),
        startHour: toFiniteNumber(state?.startHour, 0),
        durationHours,
        controlTeamIndex,
        candidateName: target.candidateName,
        realizedBindingCount: matchingBindings.length,
        bindingBonusPercent,
        teamCalculationBonusPercent,
        realizedBonusPercent,
      });
    }
  }

  const summaries = [...summariesByTarget.values()]
    .map((summary) => {
      const realizedBonusPercent =
        summary.activeHours > 0
          ? summary.realizedBonusPercentHours / summary.activeHours
          : 0;
      const expectedBonusPercent =
        summary.activeHours > 0
          ? summary.expectedBonusPercentHours / summary.activeHours
          : summary.expectedBonusPercent;

      return {
        ...summary,
        realizedBonusPercent,
        expectedBonusPercent,
        rankingCorrection:
          realizedBonusPercent - expectedBonusPercent,
      };
    })
    .sort((left, right) => left.targetKey.localeCompare(right.targetKey, "en"));
  const rankingCorrection = summaries.reduce(
    (total, summary) => total + Number(summary.rankingCorrection || 0),
    0,
  );

  return {
    summaries,
    applications,
    expectedBindingHours: summaries.reduce(
      (total, summary) => total + Number(summary.expectedBindingHours || 0),
      0,
    ),
    realizedBindingHours: summaries.reduce(
      (total, summary) => total + Number(summary.realizedBindingHours || 0),
      0,
    ),
    rankingCorrection,
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
  const states = createPlanRosterStates({
    plan,
    controlCenterSegments,
  });
  const result = getActiveRuleApplications({
    states,
    rosterById: getRosterById(ownedOperators),
  });
  const sameShiftPriority = evaluateRiicPlanSameShiftPriority({ states });
  const rankingBonus = result.summaries.reduce(
    (total, summary) => total + Number(summary.expectedBonusPercent || 0),
    0,
  );

  return {
    ...result,
    rankingBonus,
    sameShiftPriority,
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
        const isEmptyProductiveRoom =
          ["manufacture", "trading"].includes(
            String(room?.facility || "").trim(),
          ) &&
          !(room?.operators || []).some((operator) =>
            String(operator?.charId || operator?.name || "").trim(),
          );

        if (
          isEmptyProductiveRoom ||
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
