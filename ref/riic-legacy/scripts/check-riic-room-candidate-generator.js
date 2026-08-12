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

const [ruleData, profileData] = await Promise.all([
  fs
    .readFile("src/static/json/tools/riic_baseline_skill_rules.json", "utf8")
    .then(JSON.parse),
  fs
    .readFile("src/static/json/tools/riic_room_candidate_profiles.json", "utf8")
    .then(JSON.parse),
]);

const experienceProfile = findRiicRoomCandidateProfile({
  profileData,
  roomType: "manufacture",
  product: "experience",
  expectedSlots: 2,
});
assert.equal(experienceProfile.id, "manufacture-experience");
assert.deepEqual(experienceProfile.fallback, {
  percent: 25,
  label: "基础补位",
});

const christAndPhantom = resolveRiicBaselineSkills(
  [
    {
      charId: "char_4198_christ",
      name: "Miss. Christine",
      elite: 2,
      level: 1,
    },
    { charId: "char_1042_phatm2", name: "Phantom", elite: 2, level: 1 },
  ],
  ruleData,
);
const experienceCandidates = generateRiicRoomGroupCandidates({
  resolvedSkills: christAndPhantom,
  profile: experienceProfile,
  expectedSlots: 2,
  calculateRoomEfficiency: calculateRiicRoomEfficiency,
});
const pureExperienceFallback = experienceCandidates.candidates.find(
  (candidate) => candidate.operators.length === 0,
);
assert.equal(pureExperienceFallback.totalPercent, 150);
assert.deepEqual(pureExperienceFallback.fallback, {
  count: 2,
  percent: 25,
  label: "基础补位",
});
const christAndPhantomCandidate = experienceCandidates.candidates.find(
  (candidate) =>
    candidate.operatorIds.join("|") ===
    "char_1042_phatm2|char_4198_christ",
);
assert.equal(christAndPhantomCandidate.bonusPercent, 65);
assert.equal(christAndPhantomCandidate.quality, "baseOnly");
assert.equal(christAndPhantomCandidate.fallback.count, 0);

const tradingProfile = findRiicRoomCandidateProfile({
  profileData,
  roomType: "trading",
  product: "all",
  expectedSlots: 2,
});
const texasAndWhitew = resolveRiicBaselineSkills(
  [
    { charId: "char_102_texas", name: "Texas", elite: 2, level: 1 },
    { charId: "char_140_whitew", name: "Whitew", elite: 0, level: 1 },
  ],
  ruleData,
);
const tradingCandidates = generateRiicRoomGroupCandidates({
  resolvedSkills: texasAndWhitew,
  profile: tradingProfile,
  expectedSlots: 2,
  calculateRoomEfficiency: calculateRiicRoomEfficiency,
});
const texasAndWhitewCandidate = tradingCandidates.candidates.find(
  (candidate) =>
    candidate.operatorIds.join("|") === "char_102_texas|char_140_whitew",
);
assert.equal(texasAndWhitewCandidate.bonusPercent, 65);
assert.deepEqual(texasAndWhitewCandidate.unscoredOperatorIds, [
  "char_140_whitew",
]);
assert.equal(
  tradingCandidates.candidates.some(
    (candidate) =>
      candidate.operatorIds.length === 1 &&
      candidate.operatorIds[0] === "char_102_texas",
  ),
  false,
);

const supportRooms = resolveRiicBaselineSkills(
  [
    { charId: "char_4132_ascln", name: "Ascalon", elite: 2, level: 1 },
    { charId: "char_002_amiya", name: "Amiya", elite: 0, level: 1 },
    { charId: "char_003_kalts", name: "Kal'tsit", elite: 2, level: 1 },
  ],
  ruleData,
);
const controlProfile = findRiicRoomCandidateProfile({
  profileData,
  roomType: "control",
  product: "all",
  expectedSlots: 5,
});
assert.equal(controlProfile.id, "generic-control");
const controlCandidates = generateRiicRoomGroupCandidates({
  resolvedSkills: supportRooms,
  profile: controlProfile,
  expectedSlots: 5,
  calculateRoomEfficiency: calculateRiicRoomEfficiency,
});
assert.equal(
  controlCandidates.candidates.some(
    (candidate) => candidate.bonusPercent === 9,
  ),
  true,
);

const syntheticProfile = {
  id: "synthetic",
  roomType: "manufacture",
  product: "experience",
  allowedSlots: [1],
  fallback: {
    percent: 25,
    label: "基础补位",
  },
};
const syntheticCandidates = generateRiicRoomGroupCandidates({
  resolvedSkills: {
    ownedOperatorIds: ["complete", "base-only", "equal"],
    ownedOperators: [
      { charId: "complete", name: "Complete" },
      { charId: "base-only", name: "Base only" },
      { charId: "equal", name: "Equal" },
    ],
    candidatesByRoom: {
      manufacture: [
        {
          charId: "complete",
          name: "Complete",
          effects: [
            {
              effect: {
                product: "experience",
                percent: 30,
                coverage: "complete",
              },
            },
          ],
          sameRoomRules: [],
        },
        {
          charId: "base-only",
          name: "Base only",
          effects: [
            {
              effect: {
                product: "experience",
                percent: 90,
                coverage: "baseOnly",
              },
            },
          ],
          sameRoomRules: [],
        },
        {
          charId: "equal",
          name: "Equal",
          effects: [
            {
              effect: {
                product: "experience",
                percent: 25,
                coverage: "complete",
              },
            },
          ],
          sameRoomRules: [],
        },
      ],
    },
  },
  profile: syntheticProfile,
  expectedSlots: 1,
  calculateRoomEfficiency: ({
    operatorIds,
    fallbackSlotCount,
    fallbackPercent,
  }) => {
    const charId = operatorIds[0];
    if (!charId) {
      return {
        valid: true,
        totalPercent: 100 + fallbackSlotCount * fallbackPercent,
        bonusPercent: fallbackSlotCount * fallbackPercent,
        validation: { unscoredOperatorIds: [] },
        appliedRules: [{ kind: "fallback", coverage: "complete" }],
      };
    }

    return {
      valid: true,
      totalPercent: charId === "complete" ? 130 : 190,
      bonusPercent: charId === "complete" ? 30 : 90,
      validation: { unscoredOperatorIds: [] },
      appliedRules: [
        {
          kind: "direct",
          coverage: charId === "complete" ? "complete" : "baseOnly",
        },
      ],
    };
  },
});
assert.deepEqual(
  syntheticCandidates.candidates.map((candidate) => candidate.quality),
  ["baseOnly", "complete", "complete"],
);
assert.ok(
  syntheticCandidates.candidates.every(
    (candidate, index, candidates) =>
      index === 0 ||
      candidates[index - 1].totalPercent >= candidate.totalPercent,
  ),
);
assert.equal(
  syntheticCandidates.candidates.some(
    (candidate) => candidate.operatorIds.includes("equal"),
  ),
  false,
);

const fallbackRetentionProfile = {
  ...syntheticProfile,
  id: "fallback-retention",
};
const fallbackRetentionCandidates = generateRiicRoomGroupCandidates({
  resolvedSkills: {
    ownedOperatorIds: ["high", "medium", "low"],
    ownedOperators: [
      { charId: "high", name: "High" },
      { charId: "medium", name: "Medium" },
      { charId: "low", name: "Low" },
    ],
    candidatesByRoom: {
      manufacture: ["high", "medium", "low"].map((charId) => ({
        charId,
        name: charId,
        effects: [
          {
            effect: {
              product: "experience",
              percent: 30,
              coverage: "complete",
            },
          },
        ],
        sameRoomRules: [],
      })),
    },
  },
  profile: fallbackRetentionProfile,
  expectedSlots: 1,
  calculateRoomEfficiency: ({
    operatorIds,
    fallbackSlotCount,
    fallbackPercent,
  }) => {
    const scoreByOperatorId = {
      high: 180,
      medium: 170,
      low: 160,
    };
    const charId = operatorIds[0];
    if (!charId) {
      return {
        valid: true,
        totalPercent: 100 + fallbackSlotCount * fallbackPercent,
        bonusPercent: fallbackSlotCount * fallbackPercent,
        validation: { unscoredOperatorIds: [] },
        appliedRules: [{ kind: "fallback", coverage: "complete" }],
      };
    }

    return {
      valid: true,
      totalPercent: scoreByOperatorId[charId],
      bonusPercent: scoreByOperatorId[charId] - 100,
      validation: { unscoredOperatorIds: [] },
      appliedRules: [{ kind: "direct", coverage: "complete" }],
    };
  },
});
assert.equal(fallbackRetentionCandidates.candidates.length, 4);
assert.equal(
  fallbackRetentionCandidates.candidates.some(
    (candidate) => candidate.operatorIds.length === 0,
  ),
  true,
);
assert.equal(fallbackRetentionCandidates.summary.omittedCandidateCount, 0);

const fallbackImprovementProfile = {
  id: "fallback-improvement",
  roomType: "trading",
  product: "all",
  allowedSlots: [3],
  fallback: {
    percent: 30,
    label: "基础补位",
  },
};
const fallbackImprovementCandidates = generateRiicRoomGroupCandidates({
  resolvedSkills: {
    ownedOperatorIds: ["plus-five", "plus-ten", "equal-fallback"],
    ownedOperators: [
      { charId: "plus-five", name: "Plus five" },
      { charId: "plus-ten", name: "Plus ten" },
      { charId: "equal-fallback", name: "Equal fallback" },
    ],
    candidatesByRoom: {
      trading: [
        {
          charId: "plus-five",
          name: "Plus five",
          effects: [
            {
              effect: {
                product: "all",
                percent: 35,
                coverage: "complete",
              },
            },
          ],
          sameRoomRules: [],
        },
        {
          charId: "plus-ten",
          name: "Plus ten",
          effects: [
            {
              effect: {
                product: "all",
                percent: 40,
                coverage: "complete",
              },
            },
          ],
          sameRoomRules: [],
        },
        {
          charId: "equal-fallback",
          name: "Equal fallback",
          effects: [
            {
              effect: {
                product: "all",
                percent: 30,
                coverage: "complete",
              },
            },
          ],
          sameRoomRules: [],
        },
      ],
    },
  },
  profile: fallbackImprovementProfile,
  expectedSlots: 3,
  calculateRoomEfficiency: ({
    operatorIds,
    fallbackSlotCount,
    fallbackPercent,
  }) => {
    const percentByOperatorId = {
      "plus-five": 35,
      "plus-ten": 40,
      "equal-fallback": 30,
    };
    const bonusPercent =
      operatorIds.reduce(
        (total, charId) => total + percentByOperatorId[charId],
        0,
      ) +
      fallbackSlotCount * fallbackPercent;
    return {
      valid: true,
      totalPercent: 100 + bonusPercent,
      bonusPercent,
      validation: { unscoredOperatorIds: [] },
      appliedRules: operatorIds.map((charId) => ({
        kind: "direct",
        coverage: "complete",
        ownerCharId: charId,
      })),
    };
  },
});
assert.equal(
  fallbackImprovementCandidates.candidates.some(
    (candidate) =>
      candidate.operatorIds.join("|") === "plus-five" &&
      candidate.fallback.count === 2 &&
      candidate.totalPercent === 195,
  ),
  true,
);
assert.equal(
  fallbackImprovementCandidates.candidates.some((candidate) =>
    candidate.operatorIds.includes("equal-fallback"),
  ),
  false,
);

console.log("RIIC room candidate generator checks passed.");
