import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  calculateRiicRoomEfficiency,
  resolveRiicBaselineSkills,
} from "../src/utils/riicBaselineSkillResolver.js";
import {
  findRiicRoomCandidateProfile,
  generateRiicRoomGroupCandidates,
} from "../src/utils/riicRoomCandidateGenerator.js";
import { generateRiicRoomGroupRotationCandidates } from "../src/utils/riicRoomGroupRotationGenerator.js";
import { materializeRiicFallbackOperators } from "../src/utils/riicFallbackOperatorMaterializer.js";
import { assembleRiicExclusiveScheduleCandidates } from "../src/utils/riicScheduleAssembler.js";

const [ruleData, profileData] = await Promise.all([
  fs
    .readFile("src/static/json/tools/riic_baseline_skill_rules.json", "utf8")
    .then(JSON.parse),
  fs
    .readFile("src/static/json/tools/riic_room_candidate_profiles.json", "utf8")
    .then(JSON.parse),
]);

const ownedOperators = [
  { charId: "char_103_angel", name: "能天使", elite: 2, level: 1 },
  { charId: "char_4045_heidi", name: "海蒂", elite: 2, level: 1 },
  { charId: "char_101_sora", name: "空", elite: 2, level: 1 },
  { charId: "char_123_fang", name: "芬", elite: 2, level: 1 },
  { charId: "char_141_nights", name: "夜烟", elite: 2, level: 1 },
  { charId: "char_185_frncat", name: "慕斯", elite: 2, level: 1 },
  { charId: "char_118_yuki", name: "白雪", elite: 2, level: 1 },
  { charId: "char_193_frostl", name: "霜叶", elite: 2, level: 1 },
  { charId: "char_108_silent", name: "赫默", elite: 2, level: 1 },
  { charId: "char_128_plosis", name: "白面鸮", elite: 2, level: 1 },
  { charId: "char_135_halo", name: "星源", elite: 2, level: 1 },
  { charId: "char_181_flower", name: "调香师", elite: 2, level: 1 },
];
const resolvedSkills = resolveRiicBaselineSkills(ownedOperators, ruleData);
const ownedOperatorIds = new Set(resolvedSkills.ownedOperatorIds);

function getFallbackCandidates({
  roomType,
  product,
  anchorIds,
  fallbackCount,
}) {
  const profile = findRiicRoomCandidateProfile({
    profileData,
    roomType,
    product,
    expectedSlots: 3,
  });
  assert.ok(profile);

  const candidates = generateRiicRoomGroupCandidates({
    resolvedSkills,
    profile: {
      ...profile,
      selection: {
        ...profile.selection,
        candidateLimit: 12,
        completeSeedLimit: anchorIds.length,
      },
    },
    expectedSlots: 3,
    calculateRoomEfficiency: calculateRiicRoomEfficiency,
  }).candidates;
  return anchorIds.map((anchorId) => {
    const candidate = candidates.find(
      (item) =>
        item.operatorIds.length === 1 &&
        item.operatorIds[0] === anchorId &&
        item.fallback.count === fallbackCount,
    );
    assert.ok(candidate);
    assert.ok(candidate.fallbackOperatorIds.length >= fallbackCount * 2);
    return candidate;
  });
}

function createMaterializedRotation(candidates) {
  const result = generateRiicRoomGroupRotationCandidates({
    stationCandidateSets: [
      {
        stationIndex: 0,
        expectedSlots: 3,
        candidates,
      },
    ],
    rotationCycle: {
      segments: [
        { phase: 0, durationHours: 12 },
        { phase: 1, durationHours: 6 },
        { phase: 2, durationHours: 6 },
      ],
    },
    candidateLimit: 4,
    stationCandidateLimit: 2,
    segmentConfigurationLimit: 4,
    beamLimit: 12,
  });
  assert.ok(result.candidates.length > 0);

  const materialized = materializeRiicFallbackOperators({
    rotationCandidates: result.candidates,
    resolvedSkills,
  });
  assert.ok(materialized.candidates.length > 0);
  return materialized.candidates[0];
}

const tradingRotation = createMaterializedRotation(
  getFallbackCandidates({
    roomType: "trading",
    product: "all",
    anchorIds: ["char_103_angel", "char_4045_heidi"],
    fallbackCount: 2,
  }),
);
const manufactureRotation = createMaterializedRotation(
  getFallbackCandidates({
    roomType: "manufacture",
    product: "experience",
    anchorIds: ["char_118_yuki", "char_193_frostl"],
    fallbackCount: 2,
  }),
);

for (const rotation of [tradingRotation, manufactureRotation]) {
  assert.ok(rotation.materializedFallbackCount > 0);
  assert.equal(
    rotation.operatorUsage.every(
      (operator) => operator.longestContinuousHours < 24,
    ),
    true,
  );
  for (const segment of rotation.segments) {
    for (const assignment of segment.stationAssignments) {
      assert.equal(assignment.candidate.fallback.count, 0);
      assert.equal(
        assignment.candidate.operatorIds.every((charId) =>
          ownedOperatorIds.has(charId),
        ),
        true,
      );
      assert.equal(
        assignment.candidate.operatorIds.length,
        assignment.expectedSlots,
      );
    }
  }
}

const assembled = assembleRiicExclusiveScheduleCandidates({
  roomGroups: [
    {
      id: "trading",
      label: "贸易站组",
      candidates: [tradingRotation],
    },
    {
      id: "manufacture",
      label: "经验书制造组",
      candidates: [manufactureRotation],
    },
  ],
  candidateLimit: 1,
  groupCandidateLimit: 1,
  beamLimit: 4,
});

assert.equal(assembled.candidates.length, 1);
const schedule = assembled.candidates[0];
assert.equal(
  schedule.claimedOperatorIds.every((charId) => ownedOperatorIds.has(charId)),
  true,
);
assert.equal(
  schedule.claimedOperatorIds.length,
  new Set(schedule.claimedOperatorIds).size,
);
assert.equal(
  schedule.groups.every((group) =>
    group.candidate.segments.every((segment) =>
      segment.stationAssignments.every(
        (assignment) => assignment.candidate.fallback.count === 0,
      ),
    ),
  ),
  true,
);

console.log("RIIC schedule generation pipeline checks passed.");
