import assert from "node:assert/strict";
import { createRiicRoomGroupFallbackPlan } from "../src/utils/riicDynamicFallback.js";

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
assert.deepEqual(plan.selectedOperatorIds.sort(), ["private-35", "private-45"]);
assert.deepEqual(
  plan.highEfficiencyOperators.map((operator) => operator.charId),
  [
    "private-45",
    "private-35",
    "basic-25",
    "public-50",
    "public-40",
  ],
);
assert.deepEqual(
  createRiicRoomGroupFallbackPlan({
    selectedEntries: [{ selectionKey: "cohort:0", candidate }],
    occupiedOperatorIds: new Set(["private-45", "private-35"]),
  }).selectedOperatorIds.sort(),
  ["basic-25", "public-50"],
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
  }).selectedBasicOperators.map((operator) => operator.charId),
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

console.log("RIIC dynamic fallback checks passed.");
