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

  const upgradeRequirementDifference =
    Number(left.unmetUpgradeRequirementCount || 0) -
    Number(right.unmetUpgradeRequirementCount || 0);
  if (upgradeRequirementDifference !== 0) {
    return upgradeRequirementDifference;
  }

  return left.key.localeCompare(right.key, "en");
}

function pruneNextBeamPlans(nextPlans, beamLimit) {
  const sortedPlans = [...nextPlans].sort(comparePlans);
  return sortedPlans.slice(0, beamLimit);
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
  const unmetUpgradeRequirementCount =
    Number(plan.unmetUpgradeRequirementCount || 0) +
    Number(option.unmetUpgradeRequirementCount || 0);
  const planKey = plan.key
      ? `${plan.key}>>${cohort.key}:${selectionKey}:${option.key}`
      : `${cohort.key}:${selectionKey}:${option.key}`;
  const nextPlan = {
    key: planKey,
    baseRankingValue,
    rankingValue: baseRankingValue,
    unmetUpgradeRequirementCount,
    claimedOperatorIds: [...claimedOperatorIds].sort((left, right) =>
      left.localeCompare(right, "en"),
    ),
    fiammettaTargetStateIndexes: [...fiammettaTargetStateIndexes].sort(
      (left, right) => left - right,
    ),
    selectedCandidateKeysByCohort,
    selections: [
      ...plan.selections,
      {
        slot: cohort,
        option,
        parentPlanKey: plan.key,
        planKey,
      },
    ],
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
  collectDebug = false,
  onOptionsResolved,
  onOptionEvaluated,
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
  const planningRounds = [];
  let beam = [
    {
      key: "",
      baseRankingValue: 0,
      rankingValue: 0,
      unmetUpgradeRequirementCount: 0,
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
        onOptionsResolved?.({
          roundIndex,
          parentPlanKey: plan.key,
          parentRankingValue: Number(plan.rankingValue || 0),
          parentBaseRankingValue: Number(plan.baseRankingValue || 0),
          cohort,
          selectionKey,
          options,
        });

        for (const option of options) {
          const duplicateCandidateKey =
            selectedCandidateKeys.includes(option.candidateKey) &&
            option.allowDuplicateCandidateKey !== true;
          const claimedOperatorId = option.claimedOperatorIds.find(
            (operatorId) => claimedOperatorIds.has(operatorId),
          );
          const fiammettaStateIndex = (
            option.fiammettaTargetStateIndexes || []
          ).find((stateIndex) =>
            plan.fiammettaTargetStateIndexes.includes(stateIndex),
          );

          if (duplicateCandidateKey || claimedOperatorId || fiammettaStateIndex !== undefined) {
            onOptionEvaluated?.({
              roundIndex,
              parentPlanKey: plan.key,
              cohort,
              selectionKey,
              option,
              status: "rejected",
              reason: duplicateCandidateKey
                ? "duplicateCandidate"
                : claimedOperatorId
                  ? "claimedOperator"
                  : "fiammettaState",
              claimedOperatorId: claimedOperatorId || "",
              fiammettaStateIndex:
                fiammettaStateIndex === undefined ? null : fiammettaStateIndex,
            });
            continue;
          }

          canExpandPlan = true;
          const nextPlan = createNextPlan(
            plan,
            cohort,
            selectionKey,
            option,
            evaluatePlan,
          );
          nextPlans.push(nextPlan);
          onOptionEvaluated?.({
            roundIndex,
            parentPlanKey: plan.key,
            cohort,
            selectionKey,
            option,
            status: "generated",
            planKey: nextPlan.key,
          });
        }
      }

      if (!canExpandPlan) {
        completedPlans.push(plan);
      }
    }

    if (nextPlans.length === 0) {
      break;
    }

    const rankedNextPlans = [...nextPlans].sort(comparePlans);
    beam = pruneNextBeamPlans(rankedNextPlans, normalizedBeamLimit);
    if (collectDebug) {
      const retainedPlanKeys = new Set(beam.map((plan) => plan.key));
      planningRounds.push({
        roundIndex,
        generatedPlanCount: nextPlans.length,
        retainedPlanKeys: [...retainedPlanKeys],
        plansByKey: Object.fromEntries(
          rankedNextPlans.map((plan, index) => [
            plan.key,
            {
              rank: index + 1,
              rankingValue: Number(plan.rankingValue || 0),
              baseRankingValue: Number(plan.baseRankingValue || 0),
              retained: retainedPlanKeys.has(plan.key),
            },
          ]),
        ),
      });
    }
  }

  const bestPlan = [...completedPlans, ...beam].sort(comparePlans)[0] || null;
  return {
    bestPlan,
    debug: collectDebug
      ? {
          planningRounds,
        }
      : null,
  };
}
