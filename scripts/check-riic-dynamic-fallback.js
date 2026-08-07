import assert from "node:assert/strict";
import {
  createRiicFallbackEstimate,
  createRiicRoomGroupFallbackPlan,
  getRiicFallbackPreviewOperators,
  getRiicFallbackPreviewTotalPercent,
} from "../src/utils/riicDynamicFallback.js";

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
  ["rank-4"],
);
assert.deepEqual(
  getRiicFallbackPreviewOperators(estimateCandidate, 2).map(
    (operator) => operator.charId,
  ),
  ["rank-4", "rank-5"],
);
assert.deepEqual(
  getRiicFallbackPreviewOperators(estimateCandidate, 3).map(
    (operator) => operator.charId,
  ),
  ["rank-4", "rank-5", "rank-6"],
);
assert.equal(getRiicFallbackPreviewTotalPercent(estimateCandidate), 60);

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
  ["rank-4"],
);
assert.equal(missingRankEstimate.missingCount, 1);
assert.equal(missingRankEstimate.totalPercent, 55);

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
  ["tie-bravo"],
);

console.log("RIIC dynamic fallback checks passed.");
