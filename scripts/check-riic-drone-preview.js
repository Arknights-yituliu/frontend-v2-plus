import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const vendorRoot = path.join(projectRoot, "src", "vendor", "riic-efficiency");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadRuntime() {
  const engine = await import(
    pathToFileURL(path.join(vendorRoot, "dist", "index.js")).href
  );
  const operatorFiles = await readdir(path.join(vendorRoot, "data", "operators"));
  const skillFiles = await Promise.all(
    operatorFiles
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) =>
        readJson(path.join(vendorRoot, "data", "operators", fileName)),
      ),
  );
  const termsData = await readJson(path.join(vendorRoot, "data", "terms.json"));
  const ruleset = await readJson(path.join(vendorRoot, "data", "ruleset.json"));
  const catalog = {
    ...engine.createEfficiencyCatalog(skillFiles, termsData.terms),
    ruleset,
  };

  return { engine, catalog, ruleset };
}

function assignment(operators, product, extra = {}) {
  return {
    operators,
    ...(product ? { product } : {}),
    ...extra,
    operatorStates: Object.fromEntries(
      operators.map((name) => [name, { elite: 2, level: 1, mood: 24 }]),
    ),
  };
}

function createDocument() {
  return {
    layout: [
      { type: "power", level: 3 },
      { type: "trading", level: 3 },
      { type: "trading", level: 3 },
      { type: "manufacture", level: 3 },
      { type: "manufacture", level: 3 },
      { type: "manufacture", level: 3 },
    ],
    settings: {
      clueExchanging: true,
      dormFullTreat: true,
      preferMaxJieEfficiency: true,
      overflowMode: "continue",
      droneOverflowMode: "zero",
      fiammettaMode: "queue",
      tradeOrderCount: {},
    },
    plans: [
      {
        name: "A班",
        duration: 720,
        drones: {
          enable: true,
          room: "trading",
          index: 0,
          rule: "all",
          order: "post",
        },
        rooms: {
          power: [assignment(["Lancet-2"])],
          trading: [
            assignment(["巫恋"], "龙门币"),
            assignment(["但书"], "龙门币"),
          ],
          manufacture: [
            assignment(["温蒂"], "源石碎片", { sourceMaterial: "固源岩" }),
            assignment(["帕拉斯"], "源石碎片", { sourceMaterial: "装置" }),
            assignment(["霜叶"], "中级作战记录"),
          ],
        },
      },
      {
        name: "B班",
        duration: 720,
        drones: {
          enable: true,
          room: "manufacture",
          index: 1,
          rule: "all",
          order: "pre",
        },
        rooms: {
          power: [assignment(["Lancet-2"])],
          trading: [
            assignment(["但书"], "龙门币"),
            assignment(["巫恋"], "龙门币"),
          ],
          manufacture: [
            assignment(["帕拉斯"], "源石碎片", { sourceMaterial: "装置" }),
            assignment(["温蒂"], "源石碎片", { sourceMaterial: "固源岩" }),
            assignment(["霜叶"], "中级作战记录"),
          ],
        },
      },
    ],
  };
}

// Rebuilds the pre-refactor "one full efficiency run per candidate room" path,
// so the package's candidates can be proven value-identical to it.
function droneScenarioDocument(document, candidate) {
  return {
    ...document,
    plans: document.plans.map((plan, planIndex) =>
      planIndex === candidate.planIndex
        ? {
            ...plan,
            drones: {
              enable: true,
              room: candidate.room,
              index: candidate.facilityIndex,
              rule: "all",
              order: candidate.order,
            },
          }
        : plan,
    ),
  };
}

async function main() {
  const { engine, catalog, ruleset } = await loadRuntime();
  const document = createDocument();
  const result = engine.calculateEfficiency(document, { catalog, ruleset });
  const candidates = result.maaDroneAcceleration?.candidates ?? [];

  assert.equal(result.maaDroneAcceleration?.enabled, true);
  assert.equal(candidates.length, 10);
  assert.equal(
    candidates.filter((candidate) => candidate.accelerated).length,
    2,
  );
  assert.deepEqual(
    candidates
      .filter((candidate) => candidate.planIndex === 0)
      .map((candidate) => candidate.facilityId),
    [
      "trading-1",
      "trading-2",
      "manufacture-1",
      "manufacture-2",
      "manufacture-3",
    ],
  );
  const shardCandidates = candidates.filter(
    (candidate) => candidate.product === "源石碎片",
  );
  assert.equal(shardCandidates.length, 4);
  assert.notDeepEqual(
    shardCandidates[0]?.extraMaterial,
    shardCandidates[1]?.extraMaterial,
  );
  const experienceCandidates = candidates.filter(
    (candidate) => candidate.product === "中级作战记录",
  );
  assert.equal(experienceCandidates.length, 2);

  for (const candidate of candidates) {
    const scenario = engine.calculateEfficiency(
      droneScenarioDocument(document, candidate),
      { catalog, ruleset },
    );
    const detail = scenario.maaDroneAcceleration?.details?.find(
      (item) =>
        item.planIndex === candidate.planIndex &&
        item.facilityId === candidate.facilityId,
    );
    const label = `${candidate.planIndex}:${candidate.facilityId}`;

    assert.ok(detail, `${label} 的旧路径未返回无人机明细`);
    assert.equal(candidate.extraAmount, detail.extraAmount, `${label} extraAmount`);
    assert.deepEqual(
      candidate.extraMaterial,
      detail.extraMaterial,
      `${label} extraMaterial`,
    );
    assert.equal(candidate.product, detail.product, `${label} product`);
    assert.equal(
      candidate.baseAmountPerHour,
      detail.baseAmountPerHour,
      `${label} baseAmountPerHour`,
    );
    assert.equal(candidate.droneAmount, detail.droneAmount, `${label} droneAmount`);
    assert.equal(
      candidate.acceleratedHours,
      detail.acceleratedHours,
      `${label} acceleratedHours`,
    );
    const configured = document.plans[candidate.planIndex]?.drones;
    assert.equal(
      candidate.accelerated,
      configured?.enable !== false &&
        configured?.room === candidate.room &&
        configured?.index === candidate.facilityIndex,
      `${label} accelerated`,
    );
  }

  // The drone-usage row ("本班可用于所选无人机加速队列") must keep the same amount.
  for (const detail of result.maaDroneAcceleration?.details ?? []) {
    const scenario = engine.calculateEfficiency(
      droneScenarioDocument(
        document,
        candidates.find(
          (candidate) =>
            candidate.planIndex === detail.planIndex &&
            candidate.facilityId === detail.facilityId,
        ),
      ),
      { catalog, ruleset },
    );
    const scenarioDetail = scenario.maaDroneAcceleration?.details?.find(
      (item) => item.planIndex === detail.planIndex,
    );
    assert.equal(
      detail.droneAmount,
      scenarioDetail?.droneAmount,
      `班段 ${detail.planIndex + 1} 可用无人机数量`,
    );
    assert.equal(detail.overflowed, scenarioDetail?.overflowed === true);
  }

  for (const candidate of candidates) {
    console.log(
      [
        `班段 ${candidate.planIndex + 1}`,
        candidate.room === "trading" ? "贸易站" : "制造站",
        candidate.facilityId,
        candidate.product,
        `基础 ${candidate.baseAmountPerHour}/小时`,
        `额外 ${candidate.extraAmount}`,
        candidate.accelerated ? "（当前投向）" : "",
      ].join(" | "),
    );
  }

  console.log(
    "check-riic-drone-preview: candidates 与逐房间整套计算逐值一致（" +
      `${candidates.length} 项）`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
