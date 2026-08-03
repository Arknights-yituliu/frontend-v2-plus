import assert from "node:assert/strict";
import { materializeRiicFallbackOperators } from "../src/utils/riicFallbackOperatorMaterializer.js";

function createStationCandidate({
  key,
  operatorIds = [],
  fallbackCount,
  fallbackOperatorIds,
}) {
  return {
    key,
    operatorIds,
    operators: operatorIds.map((charId) => ({
      charId,
      name: charId,
    })),
    fallback: {
      count: fallbackCount,
      percent: 30,
      label: "基础补位",
    },
    fallbackOperatorIds,
  };
}

const resolvedSkills = {
  ownedOperators: [
    "anchor-a",
    "anchor-b",
    "base-1",
    "base-2",
    "base-3",
    "base-4",
  ].map((charId) => ({
    charId,
    name: charId,
  })),
};

const materialized = materializeRiicFallbackOperators({
  resolvedSkills,
  rotationCandidates: [
    {
      key: "usable",
      segments: [
        {
          durationHours: 12,
          stationAssignments: [
            {
              stationIndex: 0,
              candidate: createStationCandidate({
                key: "team-a",
                operatorIds: ["anchor-a"],
                fallbackCount: 2,
                fallbackOperatorIds: [
                  "base-1",
                  "base-2",
                  "base-3",
                  "base-4",
                ],
              }),
            },
          ],
        },
        {
          durationHours: 12,
          stationAssignments: [
            {
              stationIndex: 0,
              candidate: createStationCandidate({
                key: "team-b",
                operatorIds: ["anchor-b"],
                fallbackCount: 2,
                fallbackOperatorIds: [
                  "base-1",
                  "base-2",
                  "base-3",
                  "base-4",
                ],
              }),
            },
          ],
        },
      ],
    },
  ],
});

assert.equal(materialized.candidates.length, 1);
const usableCandidate = materialized.candidates[0];
assert.equal(usableCandidate.materializedFallbackCount, 4);
assert.equal(
  usableCandidate.segments.every((segment) =>
    segment.stationAssignments.every(
      (assignment) => assignment.candidate.fallback.count === 0,
    ),
  ),
  true,
);
assert.equal(
  usableCandidate.segments.every((segment) => {
    const operatorIds = segment.stationAssignments.flatMap(
      (assignment) => assignment.candidate.operatorIds,
    );
    return operatorIds.length === new Set(operatorIds).size;
  }),
  true,
);
assert.equal(
  usableCandidate.operatorUsage.every(
    (operator) => operator.longestContinuousHours <= 24,
  ),
  true,
);
assert.equal(
  usableCandidate.segments.every((segment) =>
    segment.stationAssignments.every((assignment) =>
      assignment.candidate.operators.every((operator) => operator.name),
    ),
  ),
  true,
);

const insufficient = materializeRiicFallbackOperators({
  resolvedSkills,
  rotationCandidates: [
    {
      key: "insufficient",
      segments: [
        {
          durationHours: 12,
          stationAssignments: [
            {
              stationIndex: 0,
              candidate: createStationCandidate({
                key: "needs-three",
                fallbackCount: 3,
                fallbackOperatorIds: ["base-1", "base-2"],
              }),
            },
          ],
        },
        {
          durationHours: 12,
          stationAssignments: [
            {
              stationIndex: 0,
              candidate: createStationCandidate({
                key: "rest",
                fallbackCount: 0,
                fallbackOperatorIds: [],
              }),
            },
          ],
        },
      ],
    },
  ],
});

assert.deepEqual(insufficient.candidates, []);
assert.deepEqual(insufficient.summary.unresolvedCandidateKeys, ["insufficient"]);

console.log("RIIC fallback operator materializer checks passed.");
