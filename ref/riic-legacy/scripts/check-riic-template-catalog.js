import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { normalizeRiicTemplateCatalog } from "../src/utils/riicTemplateCatalog.js";

const [catalogData, operatorTable] = await Promise.all([
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

const normalized = normalizeRiicTemplateCatalog({
  catalogData,
  operatorTable,
});

assert.equal(normalized.summary.templateCount, 6);
assert.equal(normalized.summary.roomTemplateCount, 1);
assert.equal(normalized.summary.manualVerifiedTemplateCount, 1);

const dela = normalized.templatesById.get("trading-dela");
assert.deepEqual(
  dela.members.map((member) => member.charId),
  ["char_102_texas", "char_140_whitew"],
);
assert.equal(dela.lock, "atomicCore");
assert.equal(dela.calculationCoverage, "complete");

const lemuen = normalized.templatesById.get("trading-lemuen-angel");
assert.deepEqual(
  lemuen.oneOf.map((member) => member.charId),
  ["char_103_angel", "char_1041_angel2"],
);

const christineAndPhatm2 = normalized.templatesById.get(
  "manufacture-christine-phatm2",
);
assert.equal(christineAndPhatm2.sortScore, 2);

const laden = normalized.templatesById.get("trading-laden");
assert.equal(laden.lock, "atomicRoom");
assert.equal(laden.candidateTier, "room");
assert.equal(laden.calculationCoverage, "manualVerified");
assert.equal(laden.fallbackId, "trading-dela");

assert.throws(
  () =>
    normalizeRiicTemplateCatalog({
      catalogData: {
        schemaVersion: 1,
        templates: [
          {
            id: "invalid",
            name: "Invalid",
            room: "贸易站",
            members: ["不存在的干员"],
            lock: "核心",
          },
        ],
      },
      operatorTable,
    }),
  /unknown operator/,
);

console.log("RIIC template catalog checks passed.");
