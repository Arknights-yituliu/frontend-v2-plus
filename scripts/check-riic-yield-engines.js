import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createServer } from "vite";
import { normalizeMaaRiicSchedule } from "../src/utils/riicYield/maaScheduleNormalizer.js";

const vendorPath =
  "src/utils/riicYieldEngines/vendors/income-calc-web/income_calc_web.js";
const dataPath =
  "src/utils/riicYieldEngines/vendors/income-calc-web/ark_building_full.json";
const context = { console };
context.self = context;
vm.runInNewContext(readFileSync(vendorPath, "utf8"), context, {
  filename: vendorPath,
});

const calculator = context.IncomeCalcWeb;
assert.equal(typeof calculator?.planIncome, "function");
calculator.setData(JSON.parse(readFileSync(dataPath, "utf8")).skills);

function productiveRoom(product, operators) {
  return { product, operators };
}

function createFull243Plan({ name, period, controlOperators = [] }) {
  return {
    name,
    period,
    rooms: {
      control: [{ operators: controlOperators }],
      trading: [
        productiveRoom("LMD", ["德克萨斯", "拉普兰德", "古米"]),
        productiveRoom("LMD", ["赫德雷", "空爆", "慕斯"]),
      ],
      manufacture: [
        productiveRoom("Battle Record", ["弑君者", "红豆", "怒潮凛冬"]),
        productiveRoom("Pure Gold", ["苍苔", "杏仁", "阿罗玛"]),
        productiveRoom("Battle Record", ["圣约送葬人", "霜叶", "淬羽赫默"]),
        productiveRoom("Pure Gold", ["玛露西尔", "梅尔", "夜烟"]),
      ],
      power: [{ operators: [] }, { operators: [] }, { operators: [] }],
      dormitory: [{ operators: [] }],
    },
  };
}

const schedule = {
  plans: [
    createFull243Plan({
      name: "day",
      period: [["00:00", "12:00"]],
    }),
    createFull243Plan({
      name: "night",
      period: [
        ["12:00", "23:59"],
        ["00:00", "00:00"],
      ],
    }),
  ],
};

const normalized = normalizeMaaRiicSchedule(schedule);
assert.ok(normalized.schedule);
assert.equal(normalized.schedule.timeline.cycleMinutes, 1440);
assert.deepEqual(
  normalized.schedule.plans.map((plan) => plan.durationMinutes),
  [720, 720],
);

const income = calculator.planIncome(schedule.plans[0], false);
assert.ok(income.lmd > 0);
assert.ok(income.exp > 0);
assert.ok(income.gold > 0);

const fireworksSchedule = structuredClone(schedule);
fireworksSchedule.plans[0].rooms.control[0].operators = ["重岳"];
fireworksSchedule.plans[0].rooms.power[0].operators = ["令"];
fireworksSchedule.plans[0].rooms.power[1].operators = ["夕"];
fireworksSchedule.plans[0].rooms.power[2].operators = ["黍"];
fireworksSchedule.plans[0].rooms.manufacture[0].operators = [
  "余",
  "红豆",
  "怒潮凛冬",
];
const fireworksIncome = calculator.planIncome(fireworksSchedule.plans[0], false);
assert.ok(
  fireworksIncome.steps.some(
    (step) => step.includes("烟火=25") && step.includes("+令0重岳25"),
  ),
);

globalThis.self = globalThis;
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: adapter } = await vite.ssrLoadModule(
    "/src/utils/riicYieldEngines/adapters/incomeCalcWebAdapter.js",
  );
  const adapterResult = await adapter.calculate(schedule);
  assert.equal(adapterResult.status, "success");
  assert.equal(adapterResult.sections[0]?.metrics.length, 6);
  assert.ok(
    adapterResult.messages.some((message) =>
      message.text.includes("长期供需平衡"),
    ),
  );

  const dynamicRoomSchedule = structuredClone(schedule);
  dynamicRoomSchedule.plans[0].rooms.manufacture[0].autofill = true;
  assert.equal(
    (await adapter.calculate(dynamicRoomSchedule)).status,
    "unsupported",
  );

  const duplicateControlSchedule = structuredClone(schedule);
  duplicateControlSchedule.plans[0].rooms.control[0].operators = [
    "诗怀雅",
    "诗怀雅",
  ];
  assert.equal(
    (await adapter.calculate(duplicateControlSchedule)).status,
    "unsupported",
  );

  const unknownOperatorSchedule = structuredClone(schedule);
  unknownOperatorSchedule.plans[0].rooms.manufacture[0].operators[0] =
    "Not In Building Data";
  assert.equal(
    (await adapter.calculate(unknownOperatorSchedule)).status,
    "unsupported",
  );
} finally {
  await vite.close();
}

console.log("RIIC yield engine checks passed.");
