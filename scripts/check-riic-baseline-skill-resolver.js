import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  calculateRiicRoomEfficiency,
  resolveRiicBaselineSkills,
} from "../src/utils/riic/l00-baseline-resolver.js";

const ruleData = JSON.parse(
  await fs.readFile(
    "src/static/json/tools/R00-baseline.json",
    "utf8",
  ),
);

function getOperator(result, charId) {
  return result.operators.find((operator) => operator.charId === charId);
}

function getRulesForOperator(ruleData, charId) {
  return ruleData.rules.filter((rule) => rule.charId === charId);
}

assert.equal(getRulesForOperator(ruleData, "char_4138_narant").length, 0);
assert.equal(getRulesForOperator(ruleData, "char_1027_greyy2").length, 0);
assert.equal(getRulesForOperator(ruleData, "char_254_vodfox").length, 0);
assert.equal(
  ruleData.exclusions.some(
    (rule) =>
      rule.charId === "char_254_vodfox" &&
      rule.reason === "sameRoomOverride",
  ),
  true,
);
assert.equal(
  getRulesForOperator(ruleData, "char_249_mlyss").some(
    (rule) => rule.effect.coverage === "baseOnly",
  ),
  true,
);

const exusiaiAtEliteTwo = resolveRiicBaselineSkills(
  [
    { charId: "char_103_angel", name: "Exusiai", elite: 2, level: 1 },
    { charId: "char_103_angel", name: "Exusiai", elite: 0, level: 1 },
  ],
  ruleData,
);
const exusiaiRules = getOperator(
  exusiaiAtEliteTwo,
  "char_103_angel",
).activeRules;
assert.equal(exusiaiRules.length, 1);
assert.equal(exusiaiRules[0].effect.percent, 35);
assert.equal(
  exusiaiRules.some((rule) => rule.effect.percent === 20),
  false,
);
assert.equal(exusiaiAtEliteTwo.summary.duplicateOwnedOperatorCount, 1);

const chestnut = resolveRiicBaselineSkills(
  [{ charId: "char_4041_chnut", name: "Chestnut", elite: 1, level: 1 }],
  ruleData,
);
const chestnutCandidate = chestnut.candidatesByRoom.manufacture[0];
assert.deepEqual(
  chestnutCandidate.effects.map((rule) => rule.effect.product).sort(),
  ["all", "orundum"],
);
assert.equal(
  chestnut.pools.find((pool) => pool.key === "manufacture:all:15")
    .operatorIds[0],
  "char_4041_chnut",
);

const castleBelowLevelThirty = resolveRiicBaselineSkills(
  [{ charId: "char_286_cast3", name: "Castle-3", elite: 0, level: 29 }],
  ruleData,
);
assert.equal(
  castleBelowLevelThirty.candidatesByRoom.manufacture.some(
    (operator) => operator.charId === "char_286_cast3",
  ),
  false,
);
assert.equal(
  castleBelowLevelThirty.candidatesByRoom.power[0].charId,
  "char_286_cast3",
);

const castleAtLevelThirty = resolveRiicBaselineSkills(
  [{ charId: "char_286_cast3", name: "Castle-3", elite: 0, level: 30 }],
  ruleData,
);
assert.equal(
  castleAtLevelThirty.candidatesByRoom.manufacture[0].effects[0].effect
    .percent,
  30,
);

const fixedRotationManufactureSkills = resolveRiicBaselineSkills(
  [
    { charId: "char_123_fang", name: "Fang", elite: 0, level: 1 },
    { charId: "char_124_kroos", name: "Kroos", elite: 0, level: 1 },
    { charId: "char_2013_cerber", name: "Ceobe", elite: 2, level: 1 },
    { charId: "char_336_folivo", name: "Scene", elite: 2, level: 1 },
    { charId: "char_446_aroma", name: "Aroma", elite: 2, level: 1 },
    {
      charId: "char_4230_mcnist",
      name: "Mechanist",
      elite: 2,
      level: 1,
    },
  ],
  ruleData,
);
function getSingleOperatorManufactureBonus({ charId, product = "all" }) {
  return calculateRiicRoomEfficiency({
    resolvedSkills: fixedRotationManufactureSkills,
    roomType: "manufacture",
    product,
    operatorIds: [charId],
    expectedSlots: 1,
  }).bonusPercent;
}

assert.equal(
  getSingleOperatorManufactureBonus({ charId: "char_123_fang" }),
  23.75,
);
assert.equal(
  getSingleOperatorManufactureBonus({ charId: "char_124_kroos" }),
  22.5,
);
assert.equal(
  getSingleOperatorManufactureBonus({ charId: "char_2013_cerber" }),
  23.75,
);
assert.equal(
  getSingleOperatorManufactureBonus({ charId: "char_336_folivo" }),
  22.5,
);
assert.equal(
  Number(
    getSingleOperatorManufactureBonus({
      charId: "char_446_aroma",
      product: "gold",
    }).toFixed(4),
  ),
  36.6667,
);
assert.equal(
  getSingleOperatorManufactureBonus({
    charId: "char_446_aroma",
    product: "experience",
  }),
  35 / 3,
);
assert.equal(
  getSingleOperatorManufactureBonus({
    charId: "char_4230_mcnist",
    product: "experience",
  }),
  30,
);

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
const christAndPhantomScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: ["char_4198_christ", "char_1042_phatm2"],
  expectedSlots: 2,
});
assert.equal(christAndPhantomScore.bonusPercent, 65);
assert.equal(
  christAndPhantomScore.appliedRules.some(
    (rule) => rule.kind === "sameRoom" && rule.percent === 30,
  ),
  true,
);

const lemuenAndExusiai = resolveRiicBaselineSkills(
  [
    { charId: "char_4193_lemuen", name: "Lemuen", elite: 2, level: 1 },
    { charId: "char_103_angel", name: "Exusiai", elite: 2, level: 1 },
  ],
  ruleData,
);
const lemuenAndExusiaiScore = calculateRiicRoomEfficiency({
  resolvedSkills: lemuenAndExusiai,
  roomType: "trading",
  operatorIds: ["char_4193_lemuen", "char_103_angel"],
  expectedSlots: 2,
});
assert.equal(lemuenAndExusiaiScore.bonusPercent, 80);

const lemuenAndNewExusiai = resolveRiicBaselineSkills(
  [
    { charId: "char_4193_lemuen", name: "Lemuen", elite: 2, level: 1 },
    {
      charId: "char_1041_angel2",
      name: "New Exusiai",
      elite: 2,
      level: 1,
    },
  ],
  ruleData,
);
const lemuenAndNewExusiaiScore = calculateRiicRoomEfficiency({
  resolvedSkills: lemuenAndNewExusiai,
  roomType: "trading",
  operatorIds: ["char_4193_lemuen", "char_1041_angel2"],
  expectedSlots: 2,
});
assert.equal(lemuenAndNewExusiaiScore.bonusPercent, 60);

const supportRooms = resolveRiicBaselineSkills(
  [
    { charId: "char_4132_ascln", name: "Ascalon", elite: 2, level: 1 },
    { charId: "char_002_amiya", name: "Amiya", elite: 0, level: 1 },
    { charId: "char_003_kalts", name: "Kal'tsit", elite: 2, level: 1 },
    {
      charId: "char_4194_rmixer",
      name: "Faith Mixer",
      elite: 2,
      level: 1,
    },
    { charId: "char_4202_haruka", name: "Haruka", elite: 2, level: 1 },
  ],
  ruleData,
);
assert.equal(
  supportRooms.candidatesByRoom.control.some(
    (operator) => operator.charId === "char_4132_ascln",
  ),
  true,
);
assert.equal(
  supportRooms.candidatesByRoom.meeting.some(
    (operator) => operator.charId === "char_4194_rmixer",
  ),
  true,
);
assert.equal(
  supportRooms.candidatesByRoom.hire.some(
    (operator) => operator.charId === "char_4202_haruka",
  ),
  true,
);
const controlScore = calculateRiicRoomEfficiency({
  resolvedSkills: supportRooms,
  roomType: "control",
  operatorIds: ["char_4132_ascln", "char_002_amiya", "char_003_kalts"],
  expectedSlots: 5,
  fallbackSlotCount: 2,
});
assert.equal(controlScore.bonusPercent, 9);
assert.equal(controlScore.localBonusPercent, 0);
assert.equal(controlScore.localTotalPercent, 100);
assert.deepEqual(controlScore.downstreamBonusPercentByRoom, {
  manufacture: 2,
  trading: 7,
});
assert.equal(
  controlScore.appliedRules.filter(
    (rule) => rule.targetRoomType === "trading",
  ).length,
  1,
);
assert.equal(
  controlScore.appliedRules.some(
    (rule) =>
      rule.targetRoomType === "manufacture" && rule.percent === 2,
  ),
  true,
);
const meetingScore = calculateRiicRoomEfficiency({
  resolvedSkills: supportRooms,
  roomType: "meeting",
  operatorIds: ["char_4194_rmixer"],
  expectedSlots: 2,
  fallbackSlotCount: 1,
});
assert.equal(meetingScore.bonusPercent, 20);
const hireScore = calculateRiicRoomEfficiency({
  resolvedSkills: supportRooms,
  roomType: "hire",
  operatorIds: ["char_4202_haruka"],
  expectedSlots: 1,
});
assert.equal(hireScore.bonusPercent, 45);

const fallbackOnlyScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: [],
  expectedSlots: 2,
  fallbackSlotCount: 2,
  fallbackPercent: 25,
});
assert.equal(fallbackOnlyScore.valid, true);
assert.equal(fallbackOnlyScore.totalPercent, 150);
assert.equal(fallbackOnlyScore.validation.realOperatorSlotCount, 0);
assert.equal(fallbackOnlyScore.validation.fallbackSlotCount, 2);
assert.equal(fallbackOnlyScore.validation.totalAssignedSlotCount, 2);
assert.equal(fallbackOnlyScore.fallbackBonusPercent, 50);

const phantomWithFallbackScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: ["char_1042_phatm2"],
  expectedSlots: 2,
  fallbackSlotCount: 1,
  fallbackPercent: 25,
});
assert.equal(phantomWithFallbackScore.bonusPercent, 60);
assert.equal(phantomWithFallbackScore.totalPercent, 160);
assert.equal(
  phantomWithFallbackScore.appliedRules.some(
    (rule) => rule.kind === "fallback" && rule.percent === 25,
  ),
  true,
);

const christAndPhantomWithFallbackScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: ["char_4198_christ", "char_1042_phatm2"],
  expectedSlots: 3,
  fallbackSlotCount: 1,
  fallbackPercent: 25,
});
assert.equal(christAndPhantomWithFallbackScore.bonusPercent, 90);
assert.equal(christAndPhantomWithFallbackScore.totalPercent, 190);

const texasAtEliteZero = resolveRiicBaselineSkills(
  [
    { charId: "char_102_texas", name: "Texas", elite: 0, level: 1 },
    { charId: "char_140_whitew", name: "Whitew", elite: 0, level: 1 },
  ],
  ruleData,
);
const texasAtEliteZeroScore = calculateRiicRoomEfficiency({
  resolvedSkills: texasAtEliteZero,
  roomType: "trading",
  operatorIds: ["char_102_texas", "char_140_whitew"],
  expectedSlots: 2,
});
assert.equal(texasAtEliteZeroScore.bonusPercent, 65);
assert.deepEqual(texasAtEliteZeroScore.validation.unscoredOperatorIds, [
  "char_140_whitew",
]);

const texasAtEliteTwo = resolveRiicBaselineSkills(
  [
    { charId: "char_102_texas", name: "Texas", elite: 2, level: 1 },
    { charId: "char_140_whitew", name: "Whitew", elite: 0, level: 1 },
  ],
  ruleData,
);
const texasAtEliteTwoScore = calculateRiicRoomEfficiency({
  resolvedSkills: texasAtEliteTwo,
  roomType: "trading",
  operatorIds: ["char_102_texas", "char_140_whitew"],
  expectedSlots: 2,
});
assert.equal(texasAtEliteTwoScore.bonusPercent, 65);

const morgan = resolveRiicBaselineSkills(
  [
    { charId: "char_154_morgan", name: "Morgan", elite: 2, level: 1 },
    { charId: "char_112_siege", name: "Siege", elite: 0, level: 1 },
    { charId: "char_157_dagda", name: "Dagda", elite: 0, level: 1 },
  ],
  ruleData,
);
const morganScore = calculateRiicRoomEfficiency({
  resolvedSkills: morgan,
  roomType: "trading",
  operatorIds: ["char_154_morgan", "char_112_siege", "char_157_dagda"],
  expectedSlots: 3,
});
assert.equal(morganScore.bonusPercent, 95);

const productiveRoomStaffingScore = calculateRiicRoomEfficiency({
  resolvedSkills: supportRooms,
  roomType: "trading",
  operatorIds: ["char_002_amiya"],
  expectedSlots: 1,
});
assert.equal(productiveRoomStaffingScore.basePercent, 100);
assert.equal(productiveRoomStaffingScore.totalPercent, 100);

const invalidRosterScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: ["char_4198_christ", "char_4198_christ"],
  expectedSlots: 2,
});
assert.equal(invalidRosterScore.valid, false);
assert.deepEqual(invalidRosterScore.validation.duplicateOperatorIds, [
  "char_4198_christ",
]);
assert.equal(invalidRosterScore.totalPercent, null);

const incompleteRosterScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: ["char_4198_christ"],
  expectedSlots: 2,
});
assert.equal(incompleteRosterScore.valid, false);
assert.equal(incompleteRosterScore.validation.assignedSlotCount, 1);

const overfilledFallbackRosterScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: ["char_4198_christ"],
  expectedSlots: 2,
  fallbackSlotCount: 2,
  fallbackPercent: 25,
});
assert.equal(overfilledFallbackRosterScore.valid, false);
assert.equal(
  overfilledFallbackRosterScore.validation.totalAssignedSlotCount,
  3,
);

const unownedRosterScore = calculateRiicRoomEfficiency({
  resolvedSkills: christAndPhantom,
  roomType: "manufacture",
  product: "experience",
  operatorIds: ["char_4198_christ", "char_unknown"],
  expectedSlots: 2,
});
assert.equal(unownedRosterScore.valid, false);
assert.deepEqual(unownedRosterScore.validation.missingOperatorIds, [
  "char_unknown",
]);

console.log("RIIC baseline skill resolver checks passed.");
