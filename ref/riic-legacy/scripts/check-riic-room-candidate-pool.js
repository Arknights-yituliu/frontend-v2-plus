import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  calculateRiicRoomEfficiency,
  resolveRiicBaselineSkills,
} from "../src/utils/riicBaselineSkillResolver.js";
import { findRiicRoomCandidateProfile } from "../src/utils/riicRoomCandidateGenerator.js";
import { generateRiicRoomCandidatePool } from "../src/utils/riicRoomCandidatePool.js";
import { normalizeRiicTemplateCatalog } from "../src/utils/riicTemplateCatalog.js";

const [ruleData, profileData, catalogData, operatorTable] = await Promise.all([
  fs
    .readFile(
      "src/static/json/tools/riic_baseline_skill_rules.json",
      "utf8",
    )
    .then(JSON.parse),
  fs
    .readFile("src/static/json/tools/riic_room_candidate_profiles.json", "utf8")
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
const tradingProfile = findRiicRoomCandidateProfile({
  profileData,
  roomType: "trading",
  product: "all",
  expectedSlots: 3,
});
const fullTradingRoster = resolveRiicBaselineSkills(
  [
    { charId: "char_102_texas", name: "Texas", elite: 2, level: 1 },
    { charId: "char_140_whitew", name: "Lappland", elite: 2, level: 1 },
    { charId: "char_103_angel", name: "Exusiai", elite: 2, level: 1 },
  ],
  ruleData,
);
const tradingPool = generateRiicRoomCandidatePool({
  templateCatalog: catalog,
  resolvedSkills: fullTradingRoster,
  profile: tradingProfile,
  expectedSlots: 3,
  calculateRoomEfficiency: calculateRiicRoomEfficiency,
});

assert.equal(tradingPool.templateCandidateSets.length, 2);
assert.deepEqual(
  tradingPool.templateCandidateSets.map(
    (candidateSet) => candidateSet.template.templateId,
  ),
  ["trading-laden", "trading-dela"],
);
assert.equal(
  tradingPool.estimatedTemplates.some(
    (template) => template.templateId === "trading-laden",
  ),
  true,
);
assert.equal(
  tradingPool.candidates.some(
    (candidate) =>
      candidate.retainForGlobalComparison &&
      candidate.sources.templates.some(
        (template) => template.templateId === "trading-dela",
      ) &&
      candidate.operatorIds.includes("char_102_texas") &&
      candidate.operatorIds.includes("char_140_whitew"),
  ),
  true,
);
const ladenCandidate = tradingPool.candidates.find((candidate) =>
  candidate.sources.templates.some(
    (template) => template.templateId === "trading-laden",
  ),
);
assert.ok(ladenCandidate);
assert.deepEqual(ladenCandidate.operatorIds, [
  "char_102_texas",
  "char_103_angel",
  "char_140_whitew",
]);
assert.equal(ladenCandidate.fallback.count, 0);
assert.equal(ladenCandidate.calculationStatus, "estimatePending");
assert.deepEqual(
  ladenCandidate.sources.templates.map((template) => template.templateId),
  ["trading-laden"],
);
assert.deepEqual(
  ladenCandidate.strategySources.map((strategy) => strategy.familyId),
  ["template:trading-laden"],
);
assert.equal(tradingPool.summary.protectedCandidateCount > 0, true);
assert.equal(tradingPool.summary.estimatedTemplateCount, 1);

const manufactureProfile = findRiicRoomCandidateProfile({
  profileData,
  roomType: "manufacture",
  product: "experience",
  expectedSlots: 2,
});
const manufactureRoster = resolveRiicBaselineSkills(
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
const manufacturePool = generateRiicRoomCandidatePool({
  templateCatalog: catalog,
  resolvedSkills: manufactureRoster,
  profile: manufactureProfile,
  expectedSlots: 2,
  calculateRoomEfficiency: calculateRiicRoomEfficiency,
  templateCandidateLimit: 1,
});
assert.equal(manufacturePool.templateCandidateSets.length, 1);
assert.equal(
  manufacturePool.candidates.some(
    (candidate) =>
      candidate.sources.templates.some(
        (template) =>
          template.templateId === "manufacture-christine-phatm2",
      ),
  ),
  true,
);

console.log("RIIC room candidate pool checks passed.");
