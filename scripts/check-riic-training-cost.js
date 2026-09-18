import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});

function assertClose(actual, expected, label) {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) < 0.000001,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

try {
  // Load the same operator data and JSON imports as the recommendation panel.
  const { calculateRiicTrainingCost } = await vite.ssrLoadModule(
    "/src/utils/riic/riic-training-cost.js",
  );
  const { operatorTableV2 } = await vite.ssrLoadModule("/src/utils/gameData.js");
  const { default: items } = await vite.ssrLoadModule(
    "/src/static/json/material/item_info.json",
  );
  const values = new Map(
    items.map((item) => [String(item.itemId), item.itemValueAp ?? item.itemValue]),
  );
  const ptilopsisE1 = { "3261": 4, "30012": 8, "30022": 2 };
  const ptilopsisE2 = { "3263": 3, "30014": 9, "30093": 10 };
  // Resource quantities are explicit fixtures; valuations use the site's data.
  const cases = [
    {
      label: "Ptilopsis E0 Lv.50 -> E1 Lv.1",
      charId: "char_128_plosis", current: [0, 50], required: [1, 1],
      exp: 0, lmd: 20000, materials: ptilopsisE1,
    },
    {
      label: "Ptilopsis E1 Lv.70 -> E2 Lv.1",
      charId: "char_128_plosis", current: [1, 70], required: [2, 1],
      exp: 0, lmd: 120000, materials: ptilopsisE2,
    },
    {
      label: "Ptilopsis E0 Lv.1 -> E2 Lv.1",
      charId: "char_128_plosis", current: [0, 1], required: [2, 1],
      exp: 239400, lmd: 371947, materials: { ...ptilopsisE1, ...ptilopsisE2 },
    },
    {
      label: "Beagle E0 Lv.40 -> E1 Lv.1 (no promotion materials)",
      charId: "char_122_beagle", current: [0, 40], required: [1, 1],
      exp: 0, lmd: 10000, materials: {},
    },
    {
      label: "Haze E0 Lv.45 -> E1 Lv.1",
      charId: "char_141_nights", current: [0, 45], required: [1, 1],
      exp: 0, lmd: 15000, materials: { "3251": 3, "30012": 1, "30032": 1 },
    },
    {
      label: "Exusiai E1 Lv.80 -> E2 Lv.1",
      charId: "char_103_angel", current: [1, 80], required: [2, 1],
      exp: 0, lmd: 180000, materials: { "3243": 4, "30024": 5, "30115": 4 },
    },
    {
      label: "Ptilopsis E0 Lv.1 -> E0 Lv.50 (levels only)",
      charId: "char_128_plosis", current: [0, 1], required: [0, 50],
      exp: 24400, lmd: 26719, materials: {},
    },
    {
      label: "Ptilopsis E1 Lv.1 -> E1 Lv.70 (levels only)",
      charId: "char_128_plosis", current: [1, 1], required: [1, 70],
      exp: 215000, lmd: 205228, materials: {},
    },
    {
      label: "Ptilopsis E1 Lv.1 -> E1 Lv.1 (already at target)",
      charId: "char_128_plosis", current: [1, 1], required: [1, 1],
      exp: 0, lmd: 0, materials: {},
    },
    {
      label: "Ptilopsis E2 Lv.1 -> E1 Lv.1 (above target)",
      charId: "char_128_plosis", current: [2, 1], required: [1, 1],
      exp: 0, lmd: 0, materials: {},
    },
  ];
  const failures = [];
  for (const fixture of cases) {
    const requirement = {
      charId: fixture.charId,
      current: { elite: fixture.current[0], level: fixture.current[1] },
      required: { elite: fixture.required[0], level: fixture.required[1] },
    };
    const cost = calculateRiicTrainingCost({
      requirement,
      operator: operatorTableV2[fixture.charId],
    });
    const materialSanity = Object.entries(fixture.materials).reduce(
      (sum, [itemId, amount]) => sum + amount * values.get(itemId),
      0,
    );
    const totalSanity = fixture.lmd * values.get("4001")
      + fixture.exp / 1000 * values.get("2003") + materialSanity;
    try {
      assert.equal(cost.status, "ready");
      assert.deepEqual(cost.missing, []);
      assert.equal(cost.exp, fixture.exp);
      assert.equal(cost.lmd, fixture.lmd);
      assert.deepEqual(
        Object.fromEntries(cost.materials.map(({ itemId, amount }) => [itemId, amount])),
        fixture.materials,
      );
      assertClose(cost.materialSanity, materialSanity, "materialSanity");
      assertClose(cost.totalSanity, totalSanity, "totalSanity");
      console.log(`PASS ${fixture.label}`);
    } catch (error) {
      failures.push(`${fixture.label}: ${error.message}`);
    }
  }
  assert.equal(failures.length, 0, failures.join("\n"));
  console.log(`RIIC training cost checks passed (${cases.length} real-data cases).`);
} finally {
  await vite.close();
}
