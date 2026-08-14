import assert from "node:assert/strict";
import { assembleRiicExclusiveScheduleCandidates } from "../src/utils/riicScheduleAssembler.js";

function createRotationCandidate({
  key,
  operatorIds = [],
  averagePercent = 100,
  rankingPercent = averagePercent,
  quality = "complete",
  templates = [],
}) {
  return {
    key,
    averagePercent,
    rankingPercent,
    quality,
    calculationStatus: templates.some(
      (template) => template.estimateStatus === "estimatePending",
    )
      ? "estimatePending"
      : "calculated",
    strategySources: templates.map((template) => ({
      familyId: `template:${template.templateId}`,
      kind:
        template.candidateTier === "room" ? "roomTemplate" : "coreTemplate",
      displayName: template.templateName,
      calculationStatus: template.estimateStatus || "calculated",
    })),
    operatorUsage: operatorIds.map((charId) => ({ charId })),
    segments: [
      {
        stationAssignments: [
          {
            candidate: {
              operatorIds,
              sources: {
                templates,
              },
            },
          },
        ],
      },
    ],
  };
}

const delaTemplate = {
  templateId: "trading-dela",
  templateName: "德拉核心",
  candidateTier: "core",
};
const fullRoomTemplate = {
  templateId: "manufacture-example",
  templateName: "整组示例",
  candidateTier: "room",
};

const assembled = assembleRiicExclusiveScheduleCandidates({
  roomGroups: [
    {
      id: "manufacture",
      label: "经验书制造组",
      candidates: [
        createRotationCandidate({
          key: "manufacture-texas",
          operatorIds: ["texas"],
          averagePercent: 220,
        }),
        createRotationCandidate({
          key: "manufacture-safe",
          operatorIds: ["phantom"],
          averagePercent: 180,
        }),
      ],
    },
    {
      id: "trading",
      label: "贸易组",
      candidates: [
        createRotationCandidate({
          key: "trading-dela",
          operatorIds: ["texas", "lappland"],
          averagePercent: 200,
          templates: [delaTemplate],
        }),
        createRotationCandidate({
          key: "trading-generic",
          operatorIds: ["exusiai"],
          averagePercent: 160,
        }),
      ],
    },
    {
      id: "control",
      label: "控制中枢组",
      candidates: [
        createRotationCandidate({
          key: "control-room-template",
          operatorIds: ["amiya"],
          averagePercent: 105,
          templates: [fullRoomTemplate],
        }),
      ],
    },
  ],
});

assert.equal(assembled.summary.groupOrder[0], "control");
assert.equal(assembled.summary.groupOrder[1], "trading");
assert.ok(assembled.candidates.length > 0);
assert.equal(
  assembled.candidates.every((candidate) => {
    const ids = candidate.groups.flatMap((group) => group.claimedOperatorIds);
    return ids.length === new Set(ids).size;
  }),
  true,
);
assert.equal(
  assembled.candidates.some((candidate) =>
    candidate.templateSources.some(
      (template) => template.templateId === "trading-dela",
    ),
  ),
  true,
);
assert.equal(
  assembled.candidates.some((candidate) =>
    candidate.groups.some(
      (group) =>
        group.groupId === "manufacture" &&
        group.candidateKey === "manufacture-safe",
    ),
  ),
  true,
);

const weightedRankingAssembly = assembleRiicExclusiveScheduleCandidates({
  candidateLimit: 1,
  roomGroups: [
    {
      id: "experience",
      candidates: [
        createRotationCandidate({
          key: "weighted",
          operatorIds: ["weighted"],
          averagePercent: 165,
          rankingPercent: 167,
        }),
        createRotationCandidate({
          key: "higher-actual",
          operatorIds: ["higher-actual"],
          averagePercent: 166,
          rankingPercent: 166,
        }),
      ],
    },
  ],
});
assert.equal(
  weightedRankingAssembly.candidates[0].groups[0].candidateKey,
  "weighted",
);

const boundedCoreFamilies = assembleRiicExclusiveScheduleCandidates({
  candidateLimit: 12,
  groupCandidateLimit: 8,
  roomGroups: [
    {
      id: "trading",
      candidates: Array.from({ length: 4 }, (_, index) =>
        createRotationCandidate({
          key: `trading-core-${index + 1}`,
          operatorIds: [`trading-${index + 1}`],
          averagePercent: 220 - index,
          templates: [delaTemplate],
        }),
      ),
    },
    {
      id: "manufacture",
      candidates: [
        createRotationCandidate({
          key: "manufacture-neutral",
          operatorIds: ["manufacture-neutral"],
          averagePercent: 160,
        }),
      ],
    },
  ],
});
assert.equal(boundedCoreFamilies.candidates.length, 2);
assert.equal(
  boundedCoreFamilies.candidates.every((candidate) =>
    candidate.templateSources.some(
      (template) => template.templateId === "trading-dela",
    ),
  ),
  true,
);

const manualRoomTemplate = {
  templateId: "trading-laden",
  templateName: "拉德能",
  candidateTier: "room",
  estimateStatus: "estimatePending",
};
const calculatedAndManual = assembleRiicExclusiveScheduleCandidates({
  candidateLimit: 12,
  roomGroups: [
    {
      id: "trading",
      candidates: [
        createRotationCandidate({
          key: "trading-calculated",
          operatorIds: ["calculated"],
          averagePercent: 180,
        }),
        createRotationCandidate({
          key: "trading-laden",
          operatorIds: ["laden"],
          averagePercent: 260,
          templates: [manualRoomTemplate],
        }),
      ],
    },
  ],
});
assert.equal(
  calculatedAndManual.candidates.some((candidate) =>
    candidate.templateSources.some(
      (template) => template.templateId === "trading-laden",
    ),
  ),
  true,
);
assert.equal(
  calculatedAndManual.candidates[0].groups[0].candidateKey,
  "trading-calculated",
);

const blocked = assembleRiicExclusiveScheduleCandidates({
  roomGroups: [
    {
      id: "trading",
      candidates: [
        createRotationCandidate({
          key: "trading-only",
          operatorIds: ["texas"],
        }),
      ],
    },
    {
      id: "manufacture",
      candidates: [
        createRotationCandidate({
          key: "manufacture-only",
          operatorIds: ["texas"],
        }),
      ],
    },
  ],
});
assert.deepEqual(blocked.candidates, []);
assert.equal(blocked.summary.conflictCount > 0, true);
assert.deepEqual(blocked.blockedGroups, [
  {
    id: "trading",
    label: "trading",
    reason: "operatorConflict",
  },
]);

const missing = assembleRiicExclusiveScheduleCandidates({
  roomGroups: [
    {
      id: "trading",
      candidates: [],
    },
  ],
});
assert.deepEqual(missing.candidates, []);
assert.deepEqual(missing.blockedGroups, [
  {
    id: "trading",
    label: "trading",
    reason: "noCandidates",
  },
]);

console.log("RIIC schedule assembler checks passed.");
