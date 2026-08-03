import assert from "node:assert/strict";
import { selectRiicCandidatesByStrategy } from "../src/utils/riicCandidateStrategy.js";

function createCandidate({
  key,
  averagePercent,
  familyId,
  kind,
  calculationStatus = "calculated",
}) {
  return {
    key,
    averagePercent,
    strategySources: [
      {
        familyId,
        kind,
        displayName: familyId,
        calculationStatus,
      },
    ],
  };
}

function compareCandidates(left, right) {
  if (left.averagePercent !== right.averagePercent) {
    return right.averagePercent - left.averagePercent;
  }
  return left.key.localeCompare(right.key, "en");
}

const candidates = [
  ...Array.from({ length: 4 }, (_, index) =>
    createCandidate({
      key: `room-${index + 1}`,
      averagePercent: 220 - index,
      familyId: "template:room",
      kind: "roomTemplate",
      calculationStatus: "estimatePending",
    }),
  ),
  ...Array.from({ length: 4 }, (_, index) =>
    createCandidate({
      key: `core-${index + 1}`,
      averagePercent: 210 - index,
      familyId: "template:core",
      kind: "coreTemplate",
    }),
  ),
  ...Array.from({ length: 4 }, (_, index) =>
    createCandidate({
      key: `generic-${index + 1}`,
      averagePercent: 200 - index,
      familyId: "generic:trading:all",
      kind: "generic",
    }),
  ),
];

const selected = selectRiicCandidatesByStrategy({
  items: candidates,
  limit: 12,
  compare: compareCandidates,
  getStrategies: (candidate) => candidate.strategySources,
});
const countByFamily = Object.fromEntries(
  ["template:room", "template:core", "generic:trading:all"].map(
    (familyId) => [
      familyId,
      selected.filter((candidate) =>
        candidate.strategySources.some(
          (strategy) => strategy.familyId === familyId,
        ),
      ).length,
    ],
  ),
);

assert.deepEqual(countByFamily, {
  "template:room": 1,
  "template:core": 2,
  "generic:trading:all": 2,
});
assert.equal(selected.some((candidate) => candidate.key === "room-1"), true);

console.log("RIIC candidate strategy checks passed.");
