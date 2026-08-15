const DEFAULT_BEAM_LIMIT = 32;
const DEFAULT_SELECTION_BATCH_SIZE = 1;

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeOptionalPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
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

function normalizeProtectionKeys(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [value])
        .map((key) => String(key || "").trim())
        .filter(Boolean),
    ),
  ];
}

function pruneNextBeamPlans(nextPlans, beamLimit, getPlanProtectionKeys) {
  const sortedPlans = [...nextPlans].sort(comparePlans);
  if (typeof getPlanProtectionKeys !== "function") {
    return sortedPlans.slice(0, beamLimit);
  }

  const selectedPlans = [];
  const selectedPlanKeys = new Set();
  const protectedPlanByKey = new Map();
  for (const plan of sortedPlans) {
    for (const protectionKey of normalizeProtectionKeys(
      getPlanProtectionKeys(plan),
    )) {
      if (!protectedPlanByKey.has(protectionKey)) {
        protectedPlanByKey.set(protectionKey, plan);
      }
    }
  }

  for (const plan of protectedPlanByKey.values()) {
    if (
      selectedPlans.length >= beamLimit ||
      selectedPlanKeys.has(plan.key)
    ) {
      continue;
    }
    selectedPlans.push(plan);
    selectedPlanKeys.add(plan.key);
  }

  for (const plan of sortedPlans) {
    if (
      selectedPlans.length >= beamLimit ||
      selectedPlanKeys.has(plan.key)
    ) {
      continue;
    }
    selectedPlans.push(plan);
    selectedPlanKeys.add(plan.key);
  }

  return selectedPlans.sort(comparePlans);
}

function getCanonicalPlanStateKey(plan) {
  return [...(plan?.selections || [])]
    .map((selection) => {
      const cohortKey = String(
        selection?.slot?.cohortKey ||
          selection?.slot?.key ||
          selection?.slot?.cohortId ||
          "",
      );
      const selectionKey = String(selection?.selectionKey || "");
      const optionKey = String(
        selection?.option?.key || selection?.option?.candidateKey || "",
      );
      return `${cohortKey}:${selectionKey}:${optionKey}`;
    })
    .sort((left, right) => left.localeCompare(right, "en"))
    .join(">>");
}

function dedupeEquivalentPlanStates(plans) {
  const bestPlanByStateKey = new Map();
  for (const plan of plans) {
    const stateKey = getCanonicalPlanStateKey(plan);
    const existingPlan = bestPlanByStateKey.get(stateKey);
    if (!existingPlan || comparePlans(plan, existingPlan) < 0) {
      bestPlanByStateKey.set(stateKey, plan);
    }
  }
  return [...bestPlanByStateKey.values()];
}

function getCohortGroupKey(cohort, index) {
  return String(
    cohort?.groupId ||
      cohort?.groupKey ||
      cohort?.cohortKey ||
      cohort?.key ||
      index,
  );
}

function getSelectedCohortTeamCount(plan, cohort) {
  return (
    plan.selectedCandidateKeysByCohort[cohort.cohortKey] || []
  ).length;
}

function getCurrentGroupCohorts(plan, selectionCohorts) {
  let activeGroupKey = "";
  for (let index = 0; index < selectionCohorts.length; index += 1) {
    const cohort = selectionCohorts[index];
    if (
      getSelectedCohortTeamCount(plan, cohort) <
      Number(cohort.teamCount || 0)
    ) {
      activeGroupKey = getCohortGroupKey(cohort, index);
      break;
    }
  }
  if (!activeGroupKey) {
    return [];
  }

  return selectionCohorts.filter(
    (cohort, index) =>
      getCohortGroupKey(cohort, index) === activeGroupKey &&
      getSelectedCohortTeamCount(plan, cohort) <
        Number(cohort.teamCount || 0),
  );
}

function selectParentPlanRoutes(
  routes,
  {
    optionLimit,
    representativeLimit,
  },
) {
  const rankedRoutes = [...routes].sort((left, right) =>
    comparePlans(left.plan, right.plan),
  );
  if (optionLimit === null) {
    return rankedRoutes.map((route) => route.plan);
  }

  const normalizedRepresentativeLimit = Math.min(
    representativeLimit ?? optionLimit,
    optionLimit,
  );
  const protectedRouteByKey = new Map();
  const representativeByKey = new Map();
  for (const route of rankedRoutes) {
    for (const protectionKey of normalizeProtectionKeys(
      route.protectionKeys,
    )) {
      if (!protectedRouteByKey.has(protectionKey)) {
        protectedRouteByKey.set(protectionKey, route);
      }
    }
    if (!representativeByKey.has(route.diversityKey)) {
      representativeByKey.set(route.diversityKey, route);
    }
  }

  const selectedRoutes = [];
  const selectedRouteKeys = new Set();
  const selectedDiversityKeys = new Set();
  const addRoute = (route) => {
    if (
      !route ||
      selectedRoutes.length >= optionLimit ||
      selectedRouteKeys.has(route.plan.key)
    ) {
      return;
    }
    selectedRoutes.push(route);
    selectedRouteKeys.add(route.plan.key);
    selectedDiversityKeys.add(route.diversityKey);
  };

  for (const route of protectedRouteByKey.values()) {
    addRoute(route);
  }
  for (const route of representativeByKey.values()) {
    if (selectedDiversityKeys.size >= normalizedRepresentativeLimit) {
      break;
    }
    addRoute(route);
  }

  for (const route of rankedRoutes) {
    if (
      selectedRoutes.length >= optionLimit ||
      !selectedDiversityKeys.has(route.diversityKey) ||
      selectedRouteKeys.has(route.plan.key)
    ) {
      continue;
    }
    selectedRoutes.push(route);
    selectedRouteKeys.add(route.plan.key);
  }

  for (const route of rankedRoutes) {
    if (
      selectedRoutes.length >= optionLimit ||
      selectedRouteKeys.has(route.plan.key)
    ) {
      continue;
    }
    selectedRoutes.push(route);
    selectedRouteKeys.add(route.plan.key);
  }

  return selectedRoutes
    .map((route) => route.plan)
    .sort(comparePlans);
}

function summarizeSelectionForDebug(selection) {
  return {
    groupId: selection.slot?.groupId || "",
    cohortId: selection.slot?.cohortId || "",
    selectionKey: selection.selectionKey || "",
    candidateKey: selection.option?.candidateKey || "",
    candidateName:
      selection.option?.materializedCandidate?.name ||
      selection.option?.candidateName ||
      "",
    operatorIds:
      selection.option?.materializedCandidate?.operatorIds ||
      selection.option?.operatorIds ||
      [],
    fallbackPlanScore: Number(selection.option?.fallbackPlan?.score || 0),
    automationEffectivePowerPlantCount:
      selection.option?.materializedCandidate?.automationCalculation
        ?.effectivePowerPlantCount ?? null,
    automationSupportOperatorId:
      selection.option?.materializedCandidate?.automationCalculation
        ?.supportOperatorId || "",
  };
}

function summarizePlanForDebug(plan, selectionCount) {
  const splitIndex = Math.max(0, plan.selections.length - selectionCount);
  return {
    key: plan.key,
    rankingValue: Number(plan.rankingValue || 0),
    baseRankingValue: Number(plan.baseRankingValue || 0),
    priorSelections: plan.selections
      .slice(0, splitIndex)
      .map(summarizeSelectionForDebug),
    selections: plan.selections
      .slice(splitIndex)
      .map(summarizeSelectionForDebug),
  };
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
        selectionKey,
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
 * so fallback members are always selected from the remaining roster. A batch
 * may expand multiple choices before the beam is pruned.
 */
export function planRiicAutomaticRoomSelections({
  selectionCohorts = [],
  selectionSlots = [],
  initiallyClaimedOperatorIds = [],
  beamLimit = DEFAULT_BEAM_LIMIT,
  optionLimit,
  representativeLimit,
  selectionBatchSize = DEFAULT_SELECTION_BATCH_SIZE,
  getOptionDiversityKey,
  getOptionProtectionKeys,
  getPlanProtectionKeys,
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
  const normalizedOptionLimit = normalizeOptionalPositiveInteger(optionLimit);
  const normalizedRepresentativeLimit = normalizeOptionalPositiveInteger(
    representativeLimit,
  );
  const normalizedSelectionBatchSize = normalizePositiveInteger(
    selectionBatchSize,
    DEFAULT_SELECTION_BATCH_SIZE,
  );
  const normalizedSelectionCohorts =
    selectionCohorts.length > 0
      ? selectionCohorts
      : (selectionSlots || []).map((slot) => ({
          ...slot,
          groupId: slot.groupId || slot.cohortKey || slot.key,
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
  const planningBatches = [];
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

  for (
    let batchStartIndex = 0;
    batchStartIndex < maxSelectionCount;
    batchStartIndex += normalizedSelectionBatchSize
  ) {
    let batchPlans = beam;
    const batchStages = [];
    const batchSelectionCount = Math.min(
      normalizedSelectionBatchSize,
      maxSelectionCount - batchStartIndex,
    );

    for (
      let batchSelectionIndex = 0;
      batchSelectionIndex < batchSelectionCount;
      batchSelectionIndex += 1
    ) {
      const roundIndex = batchStartIndex + batchSelectionIndex;
      const nextPlans = [];
      for (const plan of batchPlans) {
        const claimedOperatorIds = new Set(plan.claimedOperatorIds);
        const nextPlanRoutesForCurrentPlan = [];
        let canExpandPlan = false;

        for (const cohort of getCurrentGroupCohorts(
          plan,
          normalizedSelectionCohorts,
        )) {
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
              plan,
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

            if (
              duplicateCandidateKey ||
              claimedOperatorId ||
              fiammettaStateIndex !== undefined
            ) {
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
                  fiammettaStateIndex === undefined
                    ? null
                    : fiammettaStateIndex,
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
            nextPlanRoutesForCurrentPlan.push({
              plan: nextPlan,
              diversityKey: String(
                getOptionDiversityKey?.({
                  cohort,
                  selectionKey,
                  option,
                  plan: nextPlan,
                }) ||
                  `${cohort.key || cohort.cohortKey || ""}:${selectionKey}:${
                    option.candidateKey || option.key || nextPlan.key
                  }`,
              ),
              protectionKeys: normalizeProtectionKeys(
                getOptionProtectionKeys?.({
                  cohort,
                  selectionKey,
                  option,
                  plan: nextPlan,
                }),
              ),
            });
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
          continue;
        }
        nextPlans.push(
          ...selectParentPlanRoutes(nextPlanRoutesForCurrentPlan, {
            optionLimit: normalizedOptionLimit,
            representativeLimit: normalizedRepresentativeLimit,
          }),
        );
      }

      if (nextPlans.length === 0) {
        batchPlans = [];
        break;
      }

      const uniqueNextPlans = dedupeEquivalentPlanStates(nextPlans);
      const rankedNextPlans = [...uniqueNextPlans].sort(comparePlans);
      const isFinalSelectionInBatch =
        batchSelectionIndex === batchSelectionCount - 1;
      batchPlans = isFinalSelectionInBatch
        ? pruneNextBeamPlans(
            rankedNextPlans,
            normalizedBeamLimit,
            getPlanProtectionKeys,
          )
        : rankedNextPlans;
      batchStages.push({
        roundIndex,
        generatedPlanCount: nextPlans.length,
        uniquePlanCount: rankedNextPlans.length,
        retainedPlanCount: batchPlans.length,
      });
      if (collectDebug) {
        const retainedPlanKeys = new Set(batchPlans.map((plan) => plan.key));
        planningRounds.push({
          roundIndex,
          generatedPlanCount: nextPlans.length,
          uniquePlanCount: rankedNextPlans.length,
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

    if (collectDebug) {
      planningBatches.push({
        batchIndex: Math.floor(
          batchStartIndex / normalizedSelectionBatchSize,
        ),
        startRoundIndex: batchStartIndex,
        selectionCount: batchSelectionCount,
        stages: batchStages,
        retainedPlans: batchPlans.map((plan, index) => ({
          rank: index + 1,
          ...summarizePlanForDebug(plan, batchSelectionCount),
        })),
      });
    }
    if (batchPlans.length === 0) {
      break;
    }
    beam = batchPlans;
  }

  const bestPlan = [...completedPlans, ...beam].sort(comparePlans)[0] || null;
  return {
    bestPlan,
    debug: collectDebug
      ? {
          planningRounds,
          planningBatches,
        }
      : null,
  };
}
