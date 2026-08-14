import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createRiicIdealTrainingRoster,
  resolveRiicBaselineSkills,
} from "../src/utils/riicBaselineSkillResolver.js";
import { normalizeRiicTemplateCatalog } from "../src/utils/riicTemplateCatalog.js";
import { matchRiicRoomTemplates } from "../src/utils/riicTemplateMatcher.js";

const [ruleData, catalogData, operatorTable] = await Promise.all([
  fs
    .readFile(
      "src/static/json/tools/riic_baseline_skill_rules.json",
      "utf8",
    )
    .then(JSON.parse),
  fs
    .readFile("src/static/json/tools/riic_template_catalog.json", "utf8")
    .then(JSON.parse),
  fs
    .readFile(
      "src/static/json/operator/character_table_simple.v2.json",
      "utf8",
    )
    .then(JSON.parse),
]);

const catalog = normalizeRiicTemplateCatalog({ catalogData, operatorTable });
const roster = [
  { charId: "char_102_texas", name: "Texas", elite: 0, level: 1 },
  { charId: "char_140_whitew", name: "Lappland", elite: 0, level: 1 },
  { charId: "char_103_angel", name: "Exusiai", elite: 0, level: 1 },
  { charId: "char_4193_lemuen", name: "Lemuen", elite: 0, level: 1 },
  {
    charId: "char_4198_christ",
    name: "Miss. Christine",
    elite: 0,
    level: 1,
  },
  { charId: "char_1042_phatm2", name: "Phantom", elite: 0, level: 1 },
];

const currentResolvedSkills = resolveRiicBaselineSkills(roster, ruleData);
const currentTradingMatches = matchRiicRoomTemplates({
  templateCatalog: catalog,
  resolvedSkills: currentResolvedSkills,
  roomType: "trading",
  expectedSlots: 2,
});
assert.deepEqual(
  currentTradingMatches.candidates.map((candidate) => candidate.templateId),
  ["trading-dela"],
);
assert.equal(
  currentTradingMatches.unavailableTemplates.find(
    (template) => template.templateId === "trading-laden",
  ).status,
  "slotMismatch",
);

const idealRoster = createRiicIdealTrainingRoster(roster, ruleData);
assert.equal(
  idealRoster.upgradeRequirements.some(
    (requirement) =>
      requirement.charId === "char_4198_christ" &&
      requirement.required.elite === 2,
  ),
  true,
);

const idealResolvedSkills = resolveRiicBaselineSkills(roster, ruleData, {
  trainingMode: "ideal",
});
const idealManufactureMatches = matchRiicRoomTemplates({
  templateCatalog: catalog,
  resolvedSkills: idealResolvedSkills,
  currentResolvedSkills,
  roomType: "manufacture",
  product: "experience",
  expectedSlots: 2,
  trainingMode: "ideal",
});
const christAndPhantom = idealManufactureMatches.candidates.find(
  (candidate) => candidate.templateId === "manufacture-christine-phatm2",
);
assert.ok(christAndPhantom);
assert.deepEqual(
  christAndPhantom.upgradeRequirements.map(
    (requirement) => requirement.charId,
  ),
  ["char_1042_phatm2", "char_4198_christ"],
);

const idealTradingMatches = matchRiicRoomTemplates({
  templateCatalog: catalog,
  resolvedSkills: idealResolvedSkills,
  currentResolvedSkills,
  roomType: "trading",
  expectedSlots: 3,
  trainingMode: "ideal",
});
const laden = idealTradingMatches.candidates.find(
  (candidate) => candidate.templateId === "trading-laden",
);
assert.ok(laden);
assert.equal(laden.candidateTier, "room");
assert.equal(laden.estimate.status, "estimatePending");
assert.equal(laden.estimate.canAutoOutrankComplete, false);
assert.deepEqual(
  laden.fallbackChain.map((template) => template.id),
  ["trading-laden", "trading-dela"],
);

assert.throws(
  () =>
    matchRiicRoomTemplates({
      templateCatalog: catalog,
      resolvedSkills: idealResolvedSkills,
      roomType: "trading",
      expectedSlots: 2,
      trainingMode: "ideal",
    }),
  /requires currentResolvedSkills/,
);

console.log("RIIC template matcher checks passed.");
