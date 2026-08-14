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

  console.log("RIIC dynamic fallback checks passed.");
} finally {
  await vite.close();
}
