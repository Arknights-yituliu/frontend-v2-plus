const DEFAULT_BEAM_LIMIT = 32;

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeOperatorIds(operatorIds) {
  return [
    ...new Set(
      [...(operatorIds || [])]
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
}

function comparePlans(left, right) {
  const fiammettaTargetUsageDifference =
    Number(right.fiammettaTargetStateIndexes?.length || 0) -
    Number(left.fiammettaTargetStateIndexes?.length || 0);
  if (fiammettaTargetUsageDifference !== 0) {
    return fiammettaTargetUsageDifference;
  }

  if (left.rankingValue !== right.rankingValue) {
    return right.rankingValue - left.rankingValue;
  }

  return left.key.localeCompare(right.key, "en");
}

function createNextPlan(
  plan,
  cohort,
  selectionKey,
  option,
  evaluatePlan,
) {
  const claimedOperatorIds = new Set(plan.claimedOperatorIds);
  for (const operatorId of option.claimedOperatorIds) {
    claimedOperatorIds.add(operatorId);
  }
  const fiammettaTargetStateIndexes = new Set(
    plan.fiammettaTargetStateIndexes,
  );
  for (const stateIndex of option.fiammettaTargetStateIndexes || []) {
    fiammettaTargetStateIndexes.add(stateIndex);
  }

  const selectedCandidateKeysByCohort = {
    ...plan.selectedCandidateKeysByCohort,
    [cohort.cohortKey]: [
      ...(plan.selectedCandidateKeysByCohort[cohort.cohortKey] || []),
      option.candidateKey,
    ],
  };

  const baseRankingValue =
    Number(plan.baseRankingValue ?? plan.rankingValue ?? 0) +
    Number(option.baseRankingValue ?? option.rankingValue ?? 0);
  const nextPlan = {
    key: plan.key
      ? `${plan.key}>>${cohort.key}:${selectionKey}:${option.key}`
      : `${cohort.key}:${selectionKey}:${option.key}`,
    baseRankingValue,
    rankingValue: baseRankingValue,
    claimedOperatorIds: [...claimedOperatorIds].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
    fiammettaTargetStateIndexes: [...fiammettaTargetStateIndexes].sort(
      (left, right) => left - right,
    ),
    selectedCandidateKeysByCohort,
    selections: [...plan.selections, { slot: cohort, option }],
  };

  const evaluatedRankingValue = Number(evaluatePlan?.(nextPlan));
  if (Number.isFinite(evaluatedRankingValue)) {
    nextPlan.rankingValue = evaluatedRankingValue;
  }

  return nextPlan;
}

/**
 * Chooses room-team options with bounded beam search. A cohort asks the caller
 * for its next option only after the current beam branch has claimed people,
 * so fallback members are always selected from the remaining roster.
 */
export function planRiicAutomaticRoomSelections({
  selectionCohorts = [],
  selectionSlots = [],
  initiallyClaimedOperatorIds = [],
  beamLimit = DEFAULT_BEAM_LIMIT,
  resolveTeamOptions,
  evaluatePlan,
} = {}) {
  const normalizedBeamLimit = normalizePositiveInteger(
    beamLimit,
    DEFAULT_BEAM_LIMIT,
  );
  const normalizedSelectionCohorts =
    selectionCohorts.length > 0
      ? selectionCohorts
      : (selectionSlots || []).map((slot) => ({
          ...slot,
          cohortId: slot.cohortId || slot.key,
          cohortKey: slot.cohortKey || slot.key,
          teamCount: 1,
        }));
  const maxSelectionCount = normalizedSelectionCohorts.reduce(
    (total, cohort) => total + Math.max(0, Number(cohort?.teamCount || 0)),
    0,
  );
  const completedPlans = [];
  let beam = [
    {
      key: "",
      baseRankingValue: 0,
      rankingValue: 0,
      claimedOperatorIds: normalizeOperatorIds(initiallyClaimedOperatorIds),
      fiammettaTargetStateIndexes: [],
      selectedCandidateKeysByCohort: {},
      selections: [],
    },
  ];

  for (let roundIndex = 0; roundIndex < maxSelectionCount; roundIndex += 1) {
    const nextPlans = [];
    for (const plan of beam) {
      const claimedOperatorIds = new Set(plan.claimedOperatorIds);
      let canExpandPlan = false;

      for (const cohort of normalizedSelectionCohorts) {
        const selectedCandidateKeys =
          plan.selectedCandidateKeysByCohort[cohort.cohortKey] || [];
        const selectedCount = selectedCandidateKeys.length;
        if (selectedCount >= Number(cohort.teamCount || 0)) {
          continue;
        }

        const selectionKey = `${cohort.cohortId}:${selectedCount}`;
        const options =
          resolveTeamOptions?.({
            cohort,
            selectionKey,
            claimedOperatorIds,
            fiammettaTargetStateIndexes: new Set(
              plan.fiammettaTargetStateIndexes,
            ),
            selectedCandidateKeys,
          }) ||
          cohort.options ||
          [];

        for (const option of options) {
          if (
            (selectedCandidateKeys.includes(option.candidateKey) &&
              option.allowDuplicateCandidateKey !== true) ||
            option.claimedOperatorIds.some((operatorId) =>
              claimedOperatorIds.has(operatorId),
            ) ||
            (option.fiammettaTargetStateIndexes || []).some((stateIndex) =>
              plan.fiammettaTargetStateIndexes.includes(stateIndex),
            )
          ) {
            continue;
          }

          canExpandPlan = true;
          nextPlans.push(
            createNextPlan(
              plan,
              cohort,
              selectionKey,
              option,
              evaluatePlan,
            ),
          );
        }
      }

      if (!canExpandPlan) {
        completedPlans.push(plan);
      }
    }

    if (nextPlans.length === 0) {
      break;
    }

    beam = nextPlans.sort(comparePlans).slice(0, normalizedBeamLimit);
  }

  const bestPlan = [...completedPlans, ...beam].sort(comparePlans)[0] || null;
  return {
    bestPlan,
    unavailableGroupIds: [],
  };
}
