import {
  getRiicRuntimeCandidateRankingValue,
} from "./l60-candidate-ranking.js";
import {
  materializeRiicRoomTeamCandidate,
} from "./l62-room-team-materializer.js";
import {
  buildRiicTailFillResult,
} from "./l71-idle-fill.js";

const OPERATOR_ID = Object.freeze({
  rosmontis: "char_391_rosmon",
  ebenholz: "char_4046_ebnhlz",
  dusk: "char_2015_dusk",
  ling: "char_2023_ling",
});
const CORE_OPERATOR_IDS = Object.freeze([
  OPERATOR_ID.rosmontis,
  OPERATOR_ID.ebenholz,
]);
const SCORE_EPSILON = 1e-6;

function cloneSelections(selections = {}) {
  return Object.fromEntries(
    Object.entries(selections).map(([groupId, cohorts]) => [
      groupId,
      Object.fromEntries(
        Object.entries(cohorts || {}).map(([cohortId, candidateKeys]) => [
          cohortId,
          [...(candidateKeys || [])],
        ]),
      ),
    ]),
  );
}

function getSelectedEntries({
  groups,
  candidateStatesByGroupId,
  selections,
}) {
  return (groups || []).flatMap((group) => {
    const state = candidateStatesByGroupId?.[group.id];
    if (state?.status !== "ready") {
      return [];
    }

    return (state.cohorts || []).flatMap((cohort) =>
      (selections?.[group.id]?.[cohort.id] || []).flatMap(
        (candidateKey, teamIndex) => {
          const candidate = (cohort.candidates || []).find(
            (item) => item.key === candidateKey,
          );
          return candidate
            ? [
                {
                  group,
                  cohort,
                  candidate,
                  teamIndex,
                  selectionKey: `${cohort.id}:${teamIndex}`,
                },
              ]
            : [];
        },
      ),
    );
  });
}

function getSelectedCoreOperatorIds(entries) {
  return new Set(
    (entries || []).flatMap((entry) =>
      (entry.candidate?.operatorIds || []).filter((operatorId) =>
        CORE_OPERATOR_IDS.includes(operatorId),
      ),
    ),
  );
}

function getCoreEntry(entries, operatorId) {
  return (entries || []).find((entry) =>
    (entry.candidate?.operatorIds || []).includes(operatorId),
  );
}

function getCoreElite(entry, operatorId) {
  return Math.max(
    0,
    Number(
      (entry?.candidate?.operators || []).find(
        (operator) => operator?.charId === operatorId,
      )?.elite || 0,
    ),
  );
}

function getBaselineSupportValue(entry, operatorId) {
  const baseline = entry?.candidate?.resourceChainBaseline || {};
  return (baseline?.sources || [])
    .filter((source) => source?.operatorId !== operatorId)
    .reduce((total, source) => total + Number(source?.value || 0), 0);
}

function getPerceptionSuiteAdditionalBonusByOperatorId({
  entries,
  controlCenterOperatorIds,
}) {
  const rosmontisEntry = getCoreEntry(entries, OPERATOR_ID.rosmontis);
  const ebenholzEntry = getCoreEntry(entries, OPERATOR_ID.ebenholz);
  if (!rosmontisEntry || !ebenholzEntry) {
    return {};
  }

  const rosmontisBaseline =
    rosmontisEntry.candidate?.resourceChainBaseline || {};
  const dormitoryOccupantCount = Number(
    rosmontisBaseline.dormitoryOccupantCount || 0,
  );
  const dormitorySupportValue = getBaselineSupportValue(
    rosmontisEntry,
    OPERATOR_ID.rosmontis,
  );
  const selectedControlCenterOperatorIds = new Set(
    [...(controlCenterOperatorIds || [])]
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean),
  );
  const lingDuskBonus =
    selectedControlCenterOperatorIds.has(OPERATOR_ID.ling) &&
    selectedControlCenterOperatorIds.has(OPERATOR_ID.dusk)
      ? 10
      : 0;
  const perceptionInformation =
    dormitoryOccupantCount * 2 + dormitorySupportValue + lingDuskBonus;
  const rosmontisBonus =
    getCoreElite(rosmontisEntry, OPERATOR_ID.rosmontis) >= 2
      ? perceptionInformation
      : Math.floor(perceptionInformation / 2);
  const ebenholzBonus =
    getCoreElite(ebenholzEntry, OPERATOR_ID.ebenholz) >= 2
      ? Math.floor(perceptionInformation / 2)
      : Math.floor(perceptionInformation / 4);

  return {
    [OPERATOR_ID.rosmontis]:
      rosmontisBonus - Number(rosmontisBaseline.bonusPercent || 0),
    [OPERATOR_ID.ebenholz]:
      ebenholzBonus -
      Number(ebenholzEntry.candidate?.resourceChainBaseline?.bonusPercent || 0),
  };
}

function getTrialScore({
  groups,
  candidateStatesByGroupId,
  tailFillResult,
  controlCenterRuntimeContext,
  controlCenterOperatorIds,
}) {
  const entries = getSelectedEntries({
    groups,
    candidateStatesByGroupId,
    selections: tailFillResult?.selections,
  });
  const additionalBonusByOperatorId =
    getPerceptionSuiteAdditionalBonusByOperatorId({
      entries,
      controlCenterOperatorIds,
    });
  const score = entries.reduce((total, entry) => {
    const fallbackOperators =
      tailFillResult?.fallbackOperatorsBySelectionKeyByGroup?.[
        entry.group.id
      ]?.[entry.selectionKey] || [];
    const candidate = materializeRiicRoomTeamCandidate(
      entry.candidate,
      fallbackOperators,
      { controlCenterRuntimeContext },
    );
    const additionalBonus = (entry.candidate?.operatorIds || []).reduce(
      (candidateTotal, operatorId) =>
        candidateTotal + Number(additionalBonusByOperatorId[operatorId] || 0),
      0,
    );

    return (
      total + getRiicRuntimeCandidateRankingValue(candidate) + additionalBonus
    );
  }, 0);

  return {
    score,
    selectedCoreOperatorIds: [...getSelectedCoreOperatorIds(entries)].sort(
      (left, right) => left.localeCompare(right, "en"),
    ),
    additionalBonusByOperatorId,
  };
}

function getCoreCandidateSlots({
  groups,
  candidateStatesByGroupId,
  selections,
  operatorId,
}) {
  return (groups || []).flatMap((group) => {
    const state = candidateStatesByGroupId?.[group.id];
    if (state?.status !== "ready") {
      return [];
    }

    return (state.cohorts || []).flatMap((cohort) => {
      const candidateKeys = selections?.[group.id]?.[cohort.id] || [];
      const candidates = (cohort.candidates || []).filter((candidate) =>
        (candidate.operatorIds || []).includes(operatorId),
      );

      return candidates.flatMap((candidate) =>
        candidateKeys.flatMap((currentCandidateKey, teamIndex) =>
          currentCandidateKey === candidate.key
            ? []
            : [
                {
                  groupId: group.id,
                  cohortId: cohort.id,
                  teamIndex,
                  candidateKey: candidate.key,
                },
              ],
        ),
      );
    });
  });
}

function withReplacements(selections, replacements) {
  const nextSelections = cloneSelections(selections);

  for (const replacement of replacements || []) {
    const candidateKeys =
      nextSelections?.[replacement.groupId]?.[replacement.cohortId];
    if (!candidateKeys || !Object.hasOwn(candidateKeys, replacement.teamIndex)) {
      return null;
    }

    candidateKeys[replacement.teamIndex] = replacement.candidateKey;
  }

  return nextSelections;
}

function isSameSelectionSlot(left, right) {
  return (
    left.groupId === right.groupId &&
    left.cohortId === right.cohortId &&
    left.teamIndex === right.teamIndex
  );
}

function createTrialDebug(trial) {
  return {
    score: trial.score,
    selectedCoreOperatorIds: trial.selectedCoreOperatorIds,
    replacements: trial.replacements,
    additionalBonusByOperatorId: trial.additionalBonusByOperatorId,
  };
}

function buildTrial({
  groups,
  candidateStatesByGroupId,
  selections,
  fallbackOperatorIdBySlotKeyByGroup,
  controlCenterOperatorIds,
  idleFillOperators,
  fiammettaRecovery,
  fiammettaControlUsage,
  controlCenterRuntimeContext,
  replacements,
}) {
  const nextSelections = withReplacements(selections, replacements);
  if (!nextSelections) {
    return null;
  }

  const tailFillResult = buildRiicTailFillResult({
    groups,
    candidateStatesByGroupId,
    selections: nextSelections,
    fallbackOperatorIdBySlotKeyByGroup,
    controlCenterOperatorIds,
    idleFillOperators,
    fiammettaRecovery,
    fiammettaControlUsage,
  });
  const evaluation = getTrialScore({
    groups,
    candidateStatesByGroupId,
    tailFillResult,
    controlCenterRuntimeContext,
    controlCenterOperatorIds,
  });

  return {
    replacements,
    tailFillResult,
    ...evaluation,
  };
}

/**
 * L72: compare the existing L70/L71 result with small, forced perception-core
 * trials. It preserves ordinary selections and only replaces the room-team
 * slot needed to introduce the missing core operator(s).
 */
export function reinforceRiicPerceptionResourceSuite({
  groups = [],
  candidateStatesByGroupId = {},
  tailFillResult,
  controlCenterOperatorIds = [],
  idleFillOperators = [],
  fiammettaRecovery = null,
  fiammettaControlUsage = null,
  controlCenterRuntimeContext,
} = {}) {
  if (!tailFillResult?.selections) {
    return {
      tailFillResult,
      debug: {
        status: "unavailable",
      },
    };
  }

  const baseline = {
    replacements: [],
    tailFillResult,
    ...getTrialScore({
      groups,
      candidateStatesByGroupId,
      tailFillResult,
      controlCenterRuntimeContext,
      controlCenterOperatorIds,
    }),
  };
  const selectedCoreOperatorIds = new Set(baseline.selectedCoreOperatorIds);
  const missingCoreOperatorIds = CORE_OPERATOR_IDS.filter(
    (operatorId) => !selectedCoreOperatorIds.has(operatorId),
  );
  const trials = [];

  if (missingCoreOperatorIds.length === 1) {
    for (const replacement of getCoreCandidateSlots({
      groups,
      candidateStatesByGroupId,
      selections: tailFillResult.selections,
      operatorId: missingCoreOperatorIds[0],
    })) {
      const trial = buildTrial({
        groups,
        candidateStatesByGroupId,
        selections: tailFillResult.selections,
        fallbackOperatorIdBySlotKeyByGroup:
          tailFillResult.fallbackOperatorIdBySlotKeyByGroup,
        controlCenterOperatorIds,
        idleFillOperators,
        fiammettaRecovery,
        fiammettaControlUsage,
        controlCenterRuntimeContext,
        replacements: [replacement],
      });
      if (trial) {
        trials.push(trial);
      }
    }
  } else if (missingCoreOperatorIds.length === 2) {
    const rosmontisSlots = getCoreCandidateSlots({
      groups,
      candidateStatesByGroupId,
      selections: tailFillResult.selections,
      operatorId: OPERATOR_ID.rosmontis,
    });
    const ebenholzSlots = getCoreCandidateSlots({
      groups,
      candidateStatesByGroupId,
      selections: tailFillResult.selections,
      operatorId: OPERATOR_ID.ebenholz,
    });

    for (const rosmontisReplacement of rosmontisSlots) {
      for (const ebenholzReplacement of ebenholzSlots) {
        if (isSameSelectionSlot(rosmontisReplacement, ebenholzReplacement)) {
          continue;
        }

        const trial = buildTrial({
          groups,
          candidateStatesByGroupId,
          selections: tailFillResult.selections,
          fallbackOperatorIdBySlotKeyByGroup:
            tailFillResult.fallbackOperatorIdBySlotKeyByGroup,
          controlCenterOperatorIds,
          idleFillOperators,
          fiammettaRecovery,
          fiammettaControlUsage,
          controlCenterRuntimeContext,
          replacements: [rosmontisReplacement, ebenholzReplacement],
        });
        if (trial) {
          trials.push(trial);
        }
      }
    }
  }

  const bestTrial = [...trials].sort(
    (left, right) =>
      right.score - left.score ||
      left.replacements.length - right.replacements.length ||
      JSON.stringify(left.replacements).localeCompare(
        JSON.stringify(right.replacements),
        "en",
      ),
  )[0];
  const adopted =
    bestTrial && bestTrial.score > baseline.score + SCORE_EPSILON
      ? bestTrial
      : baseline;
  const decision =
    missingCoreOperatorIds.length === 0
      ? "alreadyComplete"
      : trials.length === 0
        ? "noEligibleCandidate"
        : adopted !== baseline
          ? "improved"
          : "notImproved";

  return {
    tailFillResult: adopted.tailFillResult,
    debug: {
      status: "ready",
      decision,
      baselineScore: baseline.score,
      selectedCoreOperatorIds: baseline.selectedCoreOperatorIds,
      trialCount: trials.length,
      adopted: adopted !== baseline,
      adoptedScore: adopted.score,
      adoptedCoreOperatorIds: adopted.selectedCoreOperatorIds,
      replacements: adopted.replacements,
      additionalBonusByOperatorId: adopted.additionalBonusByOperatorId,
      bestTrial: bestTrial ? createTrialDebug(bestTrial) : null,
      trials: trials.map(createTrialDebug),
    },
  };
}
