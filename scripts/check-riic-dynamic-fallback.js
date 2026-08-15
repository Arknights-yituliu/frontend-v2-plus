import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  server: {
    middlewareMode: true,
  },
  appType: "custom",
});

try {
  const {
    createRiicFallbackEstimate,
    createRiicRoomGroupFallbackPlan,
    createRiicRoomGroupFallbackPlanAlternatives,
    getRiicFallbackPreviewOperators,
    getRiicFallbackPreviewTotalPercent,
  } = await vite.ssrLoadModule("/src/utils/riic/l63-fallback.js");
  const {
    planRiicAutomaticRoomSelections,
  } = await vite.ssrLoadModule("/src/utils/riic/l70-selection-planner.js");
  const {
    buildRiicAutomaticRoomGroupSelections,
  } = await vite.ssrLoadModule("/src/utils/riic/l70-automatic-room-selection.js");
  const {
    buildRiicTailFillResult,
  } = await vite.ssrLoadModule("/src/utils/riic/l71-idle-fill.js");

const candidate = {
  key: "candidate-a",
  fallback: {
    count: 2,
    percent: 25,
    candidateOperators: [
      { charId: "private-45", name: "Private 45", percent: 45 },
      {
        charId: "public-50",
        name: "Public 50",
        percent: 50,
        publicSkill: true,
      },
      { charId: "private-35", name: "Private 35", percent: 35 },
      {
        charId: "public-40",
        name: "Public 40",
        percent: 40,
        publicSkill: true,
      },
      { charId: "basic-25", name: "Basic 25", percent: 25 },
      { charId: "basic-20", name: "Basic 20", percent: 20 },
    ],
  },
};

const plan = createRiicRoomGroupFallbackPlan({
  selectedEntries: [{ selectionKey: "cohort:0", candidate }],
});

assert.equal(plan.status, "ready");
assert.equal(plan.pendingCount, 2);
assert.equal(plan.selectedCount, 2);
assert.deepEqual(plan.selectedOperatorIds.sort(), ["private-45", "public-50"]);
assert.deepEqual(
  plan.operators.map((operator) => operator.charId),
  [
    "public-50",
    "private-45",
    "public-40",
    "private-35",
    "basic-25",
    "basic-20",
  ],
);
assert.deepEqual(
  createRiicRoomGroupFallbackPlan({
    selectedEntries: [{ selectionKey: "cohort:0", candidate }],
    occupiedOperatorIds: new Set(["private-45", "private-35"]),
  }).selectedOperatorIds.sort(),
  ["public-40", "public-50"],
);
assert.deepEqual(
  createRiicRoomGroupFallbackPlan({
    selectedEntries: [{ selectionKey: "cohort:0", candidate }],
    occupiedOperatorIds: new Set([
      "private-45",
      "private-35",
      "public-40",
      "public-50",
      "basic-25",
    ]),
  }).selectedOperatorIds,
  ["basic-20"],
);

const oneGapCandidate = {
  ...candidate,
  key: "candidate-with-one-gap",
  fallback: {
    ...candidate.fallback,
    count: 1,
  },
};
const missingTeamPlan = createRiicRoomGroupFallbackPlan({
  selectedEntries: [
    { selectionKey: "cohort:0", candidate: oneGapCandidate },
    { selectionKey: "cohort:1", candidate: oneGapCandidate },
    { selectionKey: "cohort:2", candidate },
  ],
});
assert.equal(missingTeamPlan.status, "ready");
assert.equal(missingTeamPlan.pendingCount, 4);
assert.equal(missingTeamPlan.selectedCount, 4);
assert.equal(
  new Set(missingTeamPlan.selectedOperatorIds).size,
  missingTeamPlan.selectedOperatorIds.length,
);

const estimateCandidate = {
  candidateScope: {
    slotCount: 3,
  },
  fallback: {
    count: 3,
    percent: 30,
    candidateOperators: [
      { charId: "rank-6", name: "Rank 6", percent: 15 },
      { charId: "rank-2", name: "Rank 2", percent: 35 },
      { charId: "rank-4", name: "Rank 4", percent: 25 },
      { charId: "rank-1", name: "Rank 1", percent: 40 },
      { charId: "rank-5", name: "Rank 5", percent: 20 },
      { charId: "rank-3", name: "Rank 3", percent: 30 },
    ],
  },
};
assert.deepEqual(
  getRiicFallbackPreviewOperators(estimateCandidate, 1).map(
    (operator) => operator.charId,
  ),
  ["rank-1"],
);
assert.deepEqual(
  getRiicFallbackPreviewOperators(estimateCandidate, 2).map(
    (operator) => operator.charId,
  ),
  ["rank-1", "rank-2"],
);
assert.deepEqual(
  getRiicFallbackPreviewOperators(estimateCandidate, 3).map(
    (operator) => operator.charId,
  ),
  ["rank-1", "rank-2", "rank-3"],
);
assert.equal(getRiicFallbackPreviewTotalPercent(estimateCandidate), 105);

const missingRankEstimate = createRiicFallbackEstimate({
  rankedOperators: [
    { charId: "rank-1", percent: 40 },
    { charId: "rank-2", percent: 35 },
    { charId: "rank-3", percent: 30 },
    { charId: "rank-4", percent: 25 },
  ],
  slotCount: 3,
  fallbackCount: 2,
  defaultPercent: 30,
});
assert.deepEqual(
  missingRankEstimate.selectedOperators.map((operator) => operator.charId),
  ["rank-1", "rank-2"],
);
assert.equal(missingRankEstimate.missingCount, 0);
assert.equal(missingRankEstimate.totalPercent, 75);

const tiedEstimateCandidate = {
  candidateScope: {
    slotCount: 2,
  },
  fallback: {
    count: 1,
    percent: 30,
    candidateOperators: [
      { charId: "tie-bravo", name: "Bravo", percent: 30 },
      { charId: "rank-1", name: "Rank 1", percent: 40 },
      { charId: "tie-alpha", name: "Alpha", percent: 30 },
    ],
  },
};
assert.deepEqual(
  getRiicFallbackPreviewOperators(tiedEstimateCandidate, 1).map(
    (operator) => operator.charId,
  ),
  ["rank-1"],
);

const automaticFallbackOperators = Array.from({ length: 8 }, (_, index) => ({
  charId: `automatic-${index + 1}`,
  name: `Automatic ${index + 1}`,
  percent: 30,
}));
const automaticFallbackSlots = Array.from({ length: 4 }, (_, index) => {
  const selectionKey = `automatic:${index + 1}`;
  const automaticCandidate = {
    key: `automatic-candidate-${index + 1}`,
    fallback: {
      count: 2,
      candidateOperators: automaticFallbackOperators,
    },
  };
  const options = createRiicRoomGroupFallbackPlanAlternatives({
    selectedEntries: [{ selectionKey, candidate: automaticCandidate }],
  }).map((fallbackPlan) => ({
    candidateKey: automaticCandidate.key,
    claimedOperatorIds: fallbackPlan.selectedOperatorIds,
    rankingValue: fallbackPlan.score,
  }));

  return {
    key: `automatic-slot-${index + 1}`,
    groupId: "automatic-group",
    cohortKey: `automatic-cohort-${index + 1}`,
    options,
  };
});
const automaticFallbackPlan = planRiicAutomaticRoomSelections({
  selectionSlots: automaticFallbackSlots,
  beamLimit: 32,
});
assert.equal(automaticFallbackPlan.bestPlan.selections.length, 4);

const twoStepLookaheadPlan = planRiicAutomaticRoomSelections({
  selectionCohorts: [
    {
      key: "two-step-lookahead",
      cohortId: "two-step-lookahead",
      cohortKey: "two-step-lookahead",
      teamCount: 2,
    },
  ],
  beamLimit: 1,
  optionLimit: 2,
  selectionBatchSize: 2,
  collectDebug: true,
  resolveTeamOptions: ({ selectedCandidateKeys }) => {
    if (selectedCandidateKeys.length === 0) {
      return [
        {
          key: "first-high",
          candidateKey: "first-high",
          claimedOperatorIds: ["first-high"],
          baseRankingValue: 100,
        },
        {
          key: "first-low",
          candidateKey: "first-low",
          claimedOperatorIds: ["first-low"],
          baseRankingValue: 90,
        },
      ];
    }

    return selectedCandidateKeys.includes("first-low")
      ? [
          {
            key: "second-bonus",
            candidateKey: "second-bonus",
            claimedOperatorIds: ["second-bonus"],
            baseRankingValue: 50,
          },
        ]
      : [
          {
            key: "second-flat",
            candidateKey: "second-flat",
            claimedOperatorIds: ["second-flat"],
            baseRankingValue: 0,
          },
        ];
  },
});
assert.deepEqual(
  twoStepLookaheadPlan.bestPlan.selections.map(
    (selection) => selection.option.candidateKey,
  ),
  ["first-low", "second-bonus"],
);
assert.deepEqual(
  twoStepLookaheadPlan.debug?.planningBatches?.[0]?.stages.map(
    (stage) => [stage.generatedPlanCount, stage.retainedPlanCount],
  ),
  [
    [2, 2],
    [2, 1],
  ],
);
assert.deepEqual(
  twoStepLookaheadPlan.debug?.planningBatches?.[0]?.retainedPlans?.[0]
    ?.selections.map((selection) => selection.candidateKey),
  ["first-low", "second-bonus"],
);

const diverseRoutePlan = planRiicAutomaticRoomSelections({
  selectionCohorts: [
    {
      key: "diverse-route",
      cohortId: "diverse-route",
      cohortKey: "diverse-route",
      teamCount: 1,
    },
  ],
  beamLimit: 3,
  optionLimit: 3,
  representativeLimit: 2,
  collectDebug: true,
  getOptionDiversityKey: ({ option }) => option.candidateKey,
  resolveTeamOptions: () => [
    {
      key: "card-a:fallback-1",
      candidateKey: "card-a",
      claimedOperatorIds: ["a-1"],
      baseRankingValue: 100,
    },
    {
      key: "card-a:fallback-2",
      candidateKey: "card-a",
      claimedOperatorIds: ["a-2"],
      baseRankingValue: 99,
    },
    {
      key: "card-a:fallback-3",
      candidateKey: "card-a",
      claimedOperatorIds: ["a-3"],
      baseRankingValue: 98,
    },
    {
      key: "card-b:fallback-1",
      candidateKey: "card-b",
      claimedOperatorIds: ["b-1"],
      baseRankingValue: 70,
    },
  ],
});
assert.deepEqual(
  diverseRoutePlan.debug?.planningBatches?.[0]?.retainedPlans.map((plan) =>
    plan.selections[0]?.candidateKey,
  ),
  ["card-a", "card-a", "card-b"],
);

const twoLayerRepresentativePlan = planRiicAutomaticRoomSelections({
  selectionCohorts: [
    {
      key: "two-layer-representative",
      cohortId: "two-layer-representative",
      cohortKey: "two-layer-representative",
      teamCount: 2,
    },
  ],
  beamLimit: 9,
  optionLimit: 3,
  representativeLimit: 3,
  selectionBatchSize: 2,
  collectDebug: true,
  getOptionDiversityKey: ({ option }) => option.candidateKey,
  resolveTeamOptions: ({ selectedCandidateKeys }) => {
    const availableCandidates = ["card-a", "card-b", "card-c", "card-d"]
      .filter((candidateKey) => !selectedCandidateKeys.includes(candidateKey));
    return availableCandidates.flatMap((candidateKey, index) => {
      const baseRankingValue = 100 - index * 10;
      return candidateKey === "card-a"
        ? [
            {
              key: "card-a:fallback-1",
              candidateKey,
              claimedOperatorIds: ["a-1"],
              baseRankingValue,
            },
            {
              key: "card-a:fallback-2",
              candidateKey,
              claimedOperatorIds: ["a-2"],
              baseRankingValue: baseRankingValue - 1,
            },
          ]
        : [
            {
              key: `${candidateKey}:fallback-1`,
              candidateKey,
              claimedOperatorIds: [`${candidateKey}-1`],
              baseRankingValue,
            },
          ];
    });
  },
});
assert.deepEqual(
  twoLayerRepresentativePlan.debug?.planningBatches?.[0]?.stages.map(
    (stage) => [stage.generatedPlanCount, stage.retainedPlanCount],
  ),
  [
    [3, 3],
    [9, 9],
  ],
);

const orderEquivalentPlan = planRiicAutomaticRoomSelections({
  selectionCohorts: [
    {
      key: "left",
      groupId: "same-group",
      cohortId: "left",
      cohortKey: "left",
      teamCount: 1,
    },
    {
      key: "right",
      groupId: "same-group",
      cohortId: "right",
      cohortKey: "right",
      teamCount: 1,
    },
  ],
  beamLimit: 2,
  optionLimit: 2,
  representativeLimit: 2,
  selectionBatchSize: 2,
  collectDebug: true,
  resolveTeamOptions: ({ cohort }) => [
    {
      key: `${cohort.key}:option`,
      candidateKey: `${cohort.key}:card`,
      claimedOperatorIds: [`${cohort.key}:operator`],
      baseRankingValue: 10,
    },
  ],
});
assert.deepEqual(
  orderEquivalentPlan.debug?.planningBatches?.[0]?.stages.map((stage) => [
    stage.generatedPlanCount,
    stage.uniquePlanCount,
    stage.retainedPlanCount,
  ]),
  [
    [2, 2, 2],
    [2, 1, 1],
  ],
);

const roomGroupOrderedPlan = planRiicAutomaticRoomSelections({
  selectionCohorts: [
    {
      key: "first-room-group",
      groupId: "first-room-group",
      cohortId: "first-room-group",
      cohortKey: "first-room-group",
      teamCount: 2,
    },
    {
      key: "second-room-group",
      groupId: "second-room-group",
      cohortId: "second-room-group",
      cohortKey: "second-room-group",
      teamCount: 1,
    },
  ],
  beamLimit: 1,
  optionLimit: 2,
  representativeLimit: 2,
  selectionBatchSize: 2,
  resolveTeamOptions: ({ cohort, selectedCandidateKeys }) => {
    const candidatePrefix =
      cohort.groupId === "first-room-group" ? "first" : "second";
    return ["a", "b", "c"]
      .filter((suffix) => !selectedCandidateKeys.includes(`${candidatePrefix}-${suffix}`))
      .map((suffix, index) => ({
        key: `${candidatePrefix}-${suffix}`,
        candidateKey: `${candidatePrefix}-${suffix}`,
        claimedOperatorIds: [`${candidatePrefix}-${suffix}`],
        baseRankingValue:
          cohort.groupId === "second-room-group" ? 100 - index : 10 - index,
      }));
  },
});
assert.deepEqual(
  roomGroupOrderedPlan.bestPlan.selections.map(
    (selection) => selection.slot.groupId,
  ),
  ["first-room-group", "first-room-group", "second-room-group"],
);

const nightSmokeFallbackCandidate = {
  key: "night-smoke-fallback",
  fallback: {
    count: 1,
    candidateOperators: [
      ...Array.from({ length: 5 }, (_, index) => ({
        charId: `higher-${index + 1}`,
        name: `Higher ${index + 1}`,
        percent: 35,
      })),
      {
        charId: "night-smoke",
        name: "Night Smoke",
        percent: 30,
        fillPriority: -1,
      },
      ...Array.from({ length: 18 }, (_, index) => ({
        charId: `lower-${index + 1}`,
        name: `Lower ${index + 1}`,
        percent: 20,
      })),
    ],
  },
};
const nightSmokeFallbackPlans = createRiicRoomGroupFallbackPlanAlternatives({
  selectedEntries: [
    { selectionKey: "night-smoke:main", candidate: nightSmokeFallbackCandidate },
    {
      selectionKey: "night-smoke:backup-a",
      candidate: {
        key: "night-smoke-backup-a",
        fallback: {
          count: 1,
          candidateOperators: [
            { charId: "backup-25-a", name: "Backup 25 A", percent: 25 },
          ],
        },
      },
    },
    {
      selectionKey: "night-smoke:backup-b",
      candidate: {
        key: "night-smoke-backup-b",
        fallback: {
          count: 1,
          candidateOperators: [
            { charId: "backup-25-b", name: "Backup 25 B", percent: 25 },
          ],
        },
      },
    },
  ],
  maxPlanCount: 12,
  ordinaryOperatorLimit: 24,
});
const nightSmokeFallbackPlan = nightSmokeFallbackPlans.find((plan) =>
  plan.selectedOperatorIds.includes("night-smoke"),
);
assert.ok(nightSmokeFallbackPlan);
assert.deepEqual(
  [...nightSmokeFallbackPlan.selectedOperatorIds].sort(),
  ["backup-25-a", "backup-25-b", "night-smoke"],
);
assert.equal(
  new Set(nightSmokeFallbackPlan.selectedOperatorIds).size,
  nightSmokeFallbackPlan.selectedOperatorIds.length,
);

const pureFallbackSelectionGroup = {
  id: "pure-fallback-selection",
  label: "Pure fallback selection",
  facility: "trading",
};
const regularTeamCandidate = {
  key: "regular-team",
  name: "Regular team",
  operatorIds: ["regular-core"],
  sourceRoomType: "trading",
  corePercent: 140,
  localBonusPercent: 40,
  fallback: { count: 0, candidateOperators: [] },
};
const pureFallbackTeamCandidate = {
  key: "pure-fallback-team",
  name: "Pure fallback team",
  isManualFallbackTeam: true,
  operatorIds: ["pure-fallback-core"],
  sourceRoomType: "trading",
  corePercent: 125,
  localBonusPercent: 25,
  fallback: { count: 0, candidateOperators: [] },
};
const pureFallbackCandidateStates = {
  [pureFallbackSelectionGroup.id]: {
    status: "ready",
    cohorts: [
      {
        id: "trading:0",
        teamCount: 2,
        candidates: [regularTeamCandidate, pureFallbackTeamCandidate],
        manualFallbackCandidates: [pureFallbackTeamCandidate],
      },
    ],
  },
};
const pureFallbackAutomaticSelection =
  buildRiicAutomaticRoomGroupSelections({
    groups: [pureFallbackSelectionGroup],
    candidateStatesByGroupId: pureFallbackCandidateStates,
  });
assert.deepEqual(
  [
    ...pureFallbackAutomaticSelection.selections[
      pureFallbackSelectionGroup.id
    ]["trading:0"],
  ].sort(),
  ["pure-fallback-team", "regular-team"],
);
const pureFallbackTailFill = buildRiicTailFillResult({
  groups: [pureFallbackSelectionGroup],
  candidateStatesByGroupId: pureFallbackCandidateStates,
  selections: {
    [pureFallbackSelectionGroup.id]: {
      "trading:0": ["regular-team"],
    },
  },
});
assert.deepEqual(
  pureFallbackTailFill.selections[pureFallbackSelectionGroup.id]["trading:0"],
  ["regular-team"],
);

  console.log("RIIC dynamic fallback checks passed.");
} finally {
  await vite.close();
}
