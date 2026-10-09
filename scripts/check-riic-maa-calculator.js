import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const vendorRoot = path.join(projectRoot, "src", "vendor", "riic-efficiency");

const INFERENCE_EXPORTS = [
  "inferScheduleLayout",
  "completeInferredRooms",
  "dormitoryLevels",
  "importPowerSummary",
  "resizeImportedRooms",
];

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

function assignment(operators, product) {
  return {
    operators,
    ...(product ? { product } : {}),
    operatorStates: Object.fromEntries(
      operators.map((name) => [name, { elite: 2, level: 1, mood: 24 }]),
    ),
  };
}

// 243 布局的 MAA 排班：2 贸易 / 4 制造 / 3 发电，宿舍故意留空由推测补齐。
function createPlans() {
  return [
    {
      name: "A班",
      duration: 1440,
      rooms: {
        control: [assignment(["阿米娅", "巫恋"])],
        trading: [
          assignment(["巫恋", "但书", "温蒂"], "龙门币"),
          assignment(["帕拉斯", "霜叶"], "龙门币"),
        ],
        manufacture: [
          assignment(["巫恋", "但书", "温蒂"], "中级作战记录"),
          assignment(["帕拉斯", "霜叶", "Lancet-2"], "中级作战记录"),
          assignment(["巫恋", "帕拉斯", "霜叶"], "中级作战记录"),
          assignment(["但书", "温蒂"], "中级作战记录"),
        ],
        power: [
          assignment(["Lancet-2"]),
          assignment(["Lancet-2"]),
          assignment(["Lancet-2"]),
        ],
        meeting: [assignment(["但书"])],
        processing: [assignment(["温蒂"])],
        hire: [assignment(["帕拉斯"])],
      },
    },
  ];
}

function levelsOf(layout, type) {
  return layout
    .filter((entry) => entry.type === type)
    .map((entry) => entry.level);
}

const { engine, catalog, ruleset } = await loadRuntime();

for (const name of INFERENCE_EXPORTS) {
  assert.equal(
    typeof engine[name],
    "function",
    `运行时包未导出设施等级推测所需的 ${name}`,
  );
}

const plans = createPlans();
const layout = engine.inferScheduleLayout(plans);

assert.deepEqual(levelsOf(layout, "trading"), [3, 2], "贸易站等级应等于房间在岗人数");
assert.deepEqual(
  levelsOf(layout, "manufacture"),
  [3, 3, 3, 2],
  "制造站等级应等于房间在岗人数",
);
assert.deepEqual(levelsOf(layout, "power"), [3, 3, 3], "发电站等级恒为 3");
assert.deepEqual(levelsOf(layout, "control"), [5], "控制中枢恒为 5 级");
assert.deepEqual(
  levelsOf(layout, "dormitory"),
  [5, 5, 5, 5],
  "3 电 243 的剩余电量应把 4 间宿舍升满",
);

const completedPlans = engine.completeInferredRooms(plans, layout);
assert.equal(
  completedPlans[0].rooms.dormitory?.length,
  levelsOf(layout, "dormitory").length,
  "completeInferredRooms 应按布局补齐缺失的宿舍房间",
);

const settings = {
  clueExchanging: true,
  dormFullTreat: true,
  preferMaxJieEfficiency: true,
  overflowMode: "continue",
  droneOverflowMode: "zero",
  fiammettaMode: "queue",
  tradeOrderCount: {},
};

const withLayout = engine.calculateEfficiency(
  { layout, settings, plans: completedPlans },
  { catalog, ruleset },
);
assert.equal(withLayout.layoutSource, "document", "显式 layout 应直接使用");
assert.equal(withLayout.dailyHours, 24, "1440 分钟班次应结算为 24 小时周期");
assert.ok(withLayout.dailyFacilities.length > 0, "结算结果应包含设施效率");

const withoutLayout = engine.calculateEfficiency(
  { settings, plans },
  { catalog, ruleset },
);
assert.equal(
  withoutLayout.layoutSource,
  "inferred",
  "缺少 layout 时运行时包应回退到推测布局",
);
assert.equal(withoutLayout.dailyHours, 24, "推测布局不应改变班次周期");

// 无人机开启时仍要走通展示模型：MAA 无人机结果不能直接当作 droneAcceleration 传入。
const dronePlans = completedPlans.map((plan, planIndex) => ({
  ...plan,
  ...(planIndex === 0
    ? { drones: { enable: true, room: "trading", index: 0, rule: "all", order: "pre" } }
    : {}),
}));
const droneResult = engine.calculateEfficiency(
  { layout, settings, plans: dronePlans },
  { catalog, ruleset },
);
assert.equal(droneResult.maaDroneAcceleration?.enabled, true, "无人机排班应产出加速结果");

const droneDisplay = engine.buildResultDisplay(droneResult, {
  sanityValues: engine.calculateSanityValues(engine.DEFAULT_SANITY_SETTINGS),
});
assert.ok(
  droneDisplay.calculationSteps.maaDrone,
  "无人机开启时应能构建 MAA 无人机展示分区",
);

const scheduleDocument = { layout, settings, plans: completedPlans };
const droneAcceleration = engine.calculateDroneAcceleration(
  scheduleDocument,
  catalog,
  engine.buildDailySanityAmounts(withLayout),
  { efficiencyResult: withLayout },
);
assert.ok(
  droneAcceleration.scenarios.some((scenario) => scenario.key === "龙门币策略"),
  "没有启用 MAA 无人机时应能生成龙门币策略场景",
);
const strategyDisplay = engine.buildResultDisplay(withLayout, {
  sanityValues: engine.calculateSanityValues(engine.DEFAULT_SANITY_SETTINGS),
  resourceAmountDisplayMode: "both",
  droneAcceleration,
});
assert.ok(
  strategyDisplay.droneScenarios.length > 0,
  "通用无人机策略应能生成场景展示数据",
);
assert.ok(
  strategyDisplay.calculationSteps.dailyOutput,
  "展示模型应包含队列计算明细",
);
assert.ok(
  strategyDisplay.droneScenarios.some((scenario) => scenario.baseRateLines?.length),
  "二者都显示时赤金或作战记录加速项应包含数量和点数基础产出",
);

console.log(
  "check-riic-maa-calculator: 布局推测、房间补齐、MAA/通用无人机与结果展示契约一致",
);
