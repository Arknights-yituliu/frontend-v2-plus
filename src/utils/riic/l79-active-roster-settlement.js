import {
  RIIC_ACTIVE_ROSTER_RUNTIME_RULES,
} from "./riic-active-roster-rule-data.js";
import { getRiicOperatorName } from "./riic-operator-identity.js";

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
      for (const rule of RIIC_ACTIVE_ROSTER_RUNTIME_RULES) {
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
          matchingOperatorNames: matchingOperatorIds.map(getRiicOperatorName),
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
          matchingOperatorNames: matchingOperatorIds.map(getRiicOperatorName),
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
 * Applies active-roster effects to an already assembled schedule preview.
 * It reads only rooms and operator profiles; it never reads candidates,
 * fallback pools, or selection state.
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
