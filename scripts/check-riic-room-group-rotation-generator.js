import assert from "node:assert/strict";
import {
  getRiicRotationCycle,
  getRiicRotationCycles,
} from "../src/utils/riicScheduleModel.js";
import { generateRiicRoomGroupRotationCandidates } from "../src/utils/riicRoomGroupRotationGenerator.js";

function getCyclicRotationSignature(candidate) {
  const tokens = candidate.segments.map((segment) => {
    const stations = [...segment.stationAssignments]
      .sort((left, right) => left.stationIndex - right.stationIndex)
      .map(
        (assignment) =>
          `${assignment.stationIndex}:${assignment.candidate.key}`,
      )
      .join("|");
    return `${segment.durationHours}:${stations}`;
  });

  return tokens
    .map((_, offset) => [...tokens.slice(offset), ...tokens.slice(0, offset)].join(">>"))
    .sort()[0];
}

const threeTimesCycle = getRiicRotationCycle("threeTimes");
assert.ok(threeTimesCycle);
assert.equal(
  threeTimesCycle.cycleHours,
  threeTimesCycle.segments.reduce(
    (total, segment) => total + segment.durationHours,
    0,
  ),
);
assert.equal(
  threeTimesCycle.segments.every(
    (segment) => segment.durationHours === [12, 6, 6][segment.phase],
  ),
  true,
);

const rotationCycle = {
  segments: [
    { phase: 0, durationHours: 12 },
    { phase: 1, durationHours: 12 },
    { phase: 2, durationHours: 12 },
  ],
};
const fallbackCandidate = {
  key: "fallback",
  operatorIds: [],
  operators: [],
  fallback: { count: 3, percent: 25, label: "基础补位" },
  totalPercent: 175,
  bonusPercent: 75,
  quality: "complete",
};
const alphaCandidate = {
  key: "alpha",
  operatorIds: ["alpha"],
  operators: [{ charId: "alpha", name: "Alpha" }],
  fallback: { count: 2, percent: 25, label: "基础补位" },
  totalPercent: 190,
  bonusPercent: 90,
  quality: "complete",
};
const betaCandidate = {
  key: "beta",
  operatorIds: ["beta"],
  operators: [{ charId: "beta", name: "Beta" }],
  fallback: { count: 2, percent: 25, label: "基础补位" },
  totalPercent: 188,
  bonusPercent: 88,
  quality: "complete",
};
const protectedTemplateCandidate = {
  key: "protected-template",
  operatorIds: ["protected-template"],
  operators: [{ charId: "protected-template", name: "Protected template" }],
  fallback: { count: 2, percent: 25, label: "基础补位" },
  totalPercent: 176,
  bonusPercent: 76,
  quality: "complete",
  retainForGlobalComparison: true,
  sources: {
    templates: [
      {
        templateId: "trading-dela",
        candidateTier: "core",
      },
    ],
  },
  strategySources: [
    {
      familyId: "template:trading-dela",
      kind: "coreTemplate",
      displayName: "Dela core",
      calculationStatus: "calculated",
    },
  ],
};

const oneStationPlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle,
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 3,
      candidates: [alphaCandidate, fallbackCandidate],
    },
  ],
});
assert.ok(oneStationPlans.candidates.length > 0);
assert.equal(
  oneStationPlans.candidates.every(
    (plan) => plan.longestContinuousWorkHours <= 24,
  ),
  true,
);
assert.equal(
  new Set(
    oneStationPlans.candidates.map(getCyclicRotationSignature),
  ).size,
  oneStationPlans.candidates.length,
);
assert.equal(
  oneStationPlans.candidates.some((plan) =>
    plan.operatorUsage.some(
      (operator) =>
        operator.charId === "alpha" && operator.longestContinuousHours === 24,
    ),
  ),
  true,
);

const weightedCandidate = {
  key: "weighted",
  operatorIds: ["weighted"],
  operators: [{ charId: "weighted", name: "Weighted" }],
  fallback: { count: 0, percent: 0, label: "" },
  totalPercent: 165,
  bonusPercent: 65,
  sortScore: 2,
  quality: "complete",
};
const higherEfficiencyCandidate = {
  key: "higher-efficiency",
  operatorIds: ["higher-efficiency"],
  operators: [{ charId: "higher-efficiency", name: "Higher efficiency" }],
  fallback: { count: 0, percent: 0, label: "" },
  totalPercent: 166,
  bonusPercent: 66,
  sortScore: 0,
  quality: "complete",
};
const weightedPlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle,
  candidateLimit: 1,
  stationCandidateLimit: 2,
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 1,
      candidates: [weightedCandidate, higherEfficiencyCandidate],
    },
  ],
});
assert.equal(
  weightedPlans.candidates[0].segments.filter(
    (segment) =>
      segment.stationAssignments[0].candidate.key === "weighted",
  ).length,
  2,
);
assert.equal(weightedPlans.candidates[0].averagePercent, 165.3);
assert.equal(weightedPlans.candidates[0].rankingPercent, 166.7);

const threePersonTwoSlotCycle = getRiicRotationCycles("twice").find(
  (cycle) => cycle.cycleHours === 36,
);
assert.ok(threePersonTwoSlotCycle);
const abCandidate = {
  key: "ab",
  operatorIds: ["alpha", "beta"],
  operators: [],
  fallback: { count: 0, percent: 0, label: "" },
  totalPercent: 160,
  bonusPercent: 60,
  quality: "complete",
};
const bcCandidate = {
  key: "bc",
  operatorIds: ["beta", "gamma"],
  operators: [],
  fallback: { count: 0, percent: 0, label: "" },
  totalPercent: 160,
  bonusPercent: 60,
  quality: "complete",
};
const acCandidate = {
  key: "ac",
  operatorIds: ["alpha", "gamma"],
  operators: [],
  fallback: { count: 0, percent: 0, label: "" },
  totalPercent: 160,
  bonusPercent: 60,
  quality: "complete",
};
const threePersonTwoSlotPlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle: threePersonTwoSlotCycle,
  stationCandidateLimit: 3,
  segmentConfigurationLimit: 6,
  beamLimit: 24,
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 2,
      candidates: [abCandidate, bcCandidate, acCandidate],
    },
  ],
});
assert.ok(threePersonTwoSlotPlans.candidates.length > 0);
assert.equal(
  threePersonTwoSlotPlans.candidates.some((plan) => {
    const candidateKeys = plan.segments.map(
      (segment) => segment.stationAssignments[0].candidate.key,
    );
    return (
      new Set(candidateKeys).size === 3 &&
      plan.operatorUsage.every(
        (operator) => operator.longestContinuousHours <= 24,
      )
    );
  }),
  true,
);

const nonstopPlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle: {
    segments: [
      { phase: 0, durationHours: 12 },
      { phase: 1, durationHours: 6 },
      { phase: 2, durationHours: 6 },
    ],
  },
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 3,
      candidates: [alphaCandidate],
    },
  ],
});
assert.deepEqual(nonstopPlans.candidates, []);

const protectedTemplatePlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle,
  stationCandidateLimit: 2,
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 3,
      candidates: [
        alphaCandidate,
        betaCandidate,
        protectedTemplateCandidate,
        fallbackCandidate,
      ],
    },
  ],
});
assert.equal(
  protectedTemplatePlans.candidates.some((plan) =>
    plan.segments.some((segment) =>
      segment.stationAssignments.some(
        (assignment) => assignment.candidate.key === "protected-template",
      ),
    ),
  ),
  true,
);
assert.equal(
  protectedTemplatePlans.candidates.some((plan) =>
    plan.templateIds.includes("trading-dela"),
  ),
  true,
);

const twoStationPlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle,
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 3,
      candidates: [alphaCandidate, fallbackCandidate],
    },
    {
      stationIndex: 1,
      expectedSlots: 3,
      candidates: [alphaCandidate, betaCandidate, fallbackCandidate],
    },
  ],
});
assert.ok(twoStationPlans.candidates.length > 0);
for (const plan of twoStationPlans.candidates) {
  for (const segment of plan.segments) {
    const operatorIds = segment.stationAssignments.flatMap((assignment) =>
      assignment.candidate.operatorIds,
    );
    assert.equal(operatorIds.length, new Set(operatorIds).size);
  }
}

const sharedAnchorCandidates = [
  ...Array.from({ length: 7 }, (_, index) => ({
    key: `anchor-${index + 1}`,
    operatorIds: ["anchor", `partner-${index + 1}`],
    operators: [],
    fallback: { count: 1, percent: 25, label: "基础补位" },
    totalPercent: 180,
    bonusPercent: 80,
    quality: "complete",
  })),
  fallbackCandidate,
];
const sharedAnchorPlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle,
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 3,
      candidates: sharedAnchorCandidates,
    },
  ],
});
assert.ok(sharedAnchorPlans.candidates.length > 0);
assert.equal(
  sharedAnchorPlans.candidates.some((plan) =>
    plan.operatorUsage.some(
      (operator) =>
        operator.charId === "anchor" && operator.longestContinuousHours === 24,
    ),
  ),
  true,
);

const threeShiftCycle = {
  segments: [
    { phase: 0, durationHours: 12 },
    { phase: 1, durationHours: 6 },
    { phase: 2, durationHours: 6 },
  ],
};
const secondSharedAnchorCandidates = [
  ...Array.from({ length: 7 }, (_, index) => ({
    key: `second-anchor-${index + 1}`,
    operatorIds: ["second-anchor", `second-partner-${index + 1}`],
    operators: [],
    fallback: { count: 1, percent: 25, label: "基础补位" },
    totalPercent: 180,
    bonusPercent: 80,
    quality: "complete",
  })),
  fallbackCandidate,
];
const threeShiftTwoStationPlans = generateRiicRoomGroupRotationCandidates({
  rotationCycle: threeShiftCycle,
  stationCandidateSets: [
    {
      stationIndex: 0,
      expectedSlots: 3,
      candidates: sharedAnchorCandidates,
    },
    {
      stationIndex: 1,
      expectedSlots: 3,
      candidates: secondSharedAnchorCandidates,
    },
  ],
});
assert.ok(threeShiftTwoStationPlans.candidates.length > 0);
assert.equal(
  threeShiftTwoStationPlans.candidates.every((plan) =>
    plan.operatorUsage.every(
      (operator) => operator.longestContinuousHours <= 18,
    ),
  ),
  true,
);

console.log("RIIC room-group rotation generator checks passed.");
