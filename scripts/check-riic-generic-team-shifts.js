import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { optimizeRiicPreviewShifts } = await vite.ssrLoadModule("/src/utils/riic/l75-general-shift-optimization.js");
  const roster = [
    ["char_4088_hodrer", "赫德雷"], ["char_4087_ines", "伊内丝"], ["char_4037_demetr", "贝洛内"],
    ["char_4217_makoto", "结城理"], ["char_4218_aigis", "埃癸斯"], ["char_253_greyy", "格雷伊"],
    ["char_4098_vvana", "薇薇安娜"], ["char_420_flamtl", "焰尾"], ["char_430_fartth", "远牙"],
    ["char_431_ashlok", "灰毫"], ["char_496_wildmn", "野鬃"], ["char_121_lava", "炎熔"],
    ["char_141_nights", "夜烟"], ["char_159_peacok", "断罪者"],
    ["char_427_vigil", "伺夜"],
  ].map(([charId, name]) => ({ charId, name, elite: 2, level: 50 }));
  const byId = new Map(roster.map((operator) => [operator.charId, operator]));
  const room = (groupId, facility, ids, product = "all", expectedSlots = 3) => ({
    key: `${groupId}:0`, groupId, facility, product, expectedSlots,
    stationLevel: facility === "control" ? 5 : 3, stationIndex: 0,
    operators: ids.map((id) => byId.get(id)),
  });
  const makePreview = (first, second) => ({ states: [first, second].map((rooms, index) => ({
    index, durationHours: 12, rooms,
  })) });
  const control = (ids = []) => room("control", "control", ids, "all", 5);
  const tradePreview = makePreview(
    [control(), room("trade", "trading", ["char_4088_hodrer"], "lmd"), room("meeting", "meeting", [])],
    [control(), room("trade", "trading", ["char_4037_demetr"], "lmd"), room("meeting", "meeting", ["char_4087_ines"])],
  );
  const trade = await optimizeRiicPreviewShifts({ preview: tradePreview, ownedOperators: roster, eligibleGroupIds: ["trade"] });
  assert.ok(trade.overrides["1:trade:0"]?.some((operator) => operator.charId === "char_4088_hodrer"),
    "总产出提高时不应因为净赤金下降而拒绝换班");
  const tradeoff = structuredClone(tradePreview);
  tradeoff.states[1].rooms.find((item) => item.facility === "meeting").operators.push(byId.get("char_427_vigil"));
  assert.deepEqual((await optimizeRiicPreviewShifts({ preview: tradeoff, ownedOperators: roster, eligibleGroupIds: ["trade"] })).overrides, {},
    "总产出下降时不得只为联动而换班");

  const powerPreview = makePreview(
    [control(), room("power", "power", ["char_4218_aigis"], "all", 1), room("factory", "manufacture", [], "gold")],
    [control(), room("power", "power", ["char_253_greyy"], "all", 1), room("factory", "manufacture", ["char_4217_makoto"], "gold")],
  );
  const powerOptions = { preview: powerPreview, ownedOperators: roster, eligibleGroupIds: ["power"] };
  const power = await optimizeRiicPreviewShifts(powerOptions);
  assert.ok(power.overrides["1:power:0"]?.some((operator) => operator.charId === "char_4218_aigis"), "埃癸斯应与结城理同班");
  assert.deepEqual((await optimizeRiicPreviewShifts({ ...powerOptions, lockedOperatorIds: ["char_4218_aigis"] })).overrides, {});
  const unequal = { ...powerPreview, states: powerPreview.states.map((state, index) => ({ ...state, durationHours: index ? 16 : 8 })) };
  assert.deepEqual((await optimizeRiicPreviewShifts({ ...powerOptions, preview: unequal })).overrides, {}, "不能改变工作时长");
  const conflict = makePreview(powerPreview.states[0].rooms, [...powerPreview.states[1].rooms,
    room("conflict", "meeting", ["char_4218_aigis"])]);
  assert.deepEqual((await optimizeRiicPreviewShifts({ ...powerOptions, preview: conflict })).overrides, {}, "已有重复干员时不调整");

  const knightPreview = makePreview(
    [control(), room("factory", "manufacture", ["char_430_fartth", "char_431_ashlok", "char_496_wildmn"], "experience")],
    [control(["char_4098_vvana", "char_420_flamtl"]), room("factory", "manufacture", ["char_121_lava", "char_141_nights", "char_159_peacok"], "experience")],
  );
  const knights = await optimizeRiicPreviewShifts({ preview: knightPreview, ownedOperators: roster, eligibleGroupIds: ["factory"] });
  assert.ok(knights.overrides["1:factory:0"]?.some((operator) => operator.charId === "char_430_fartth"), "应尝试骑士联动");
  console.log("RIIC generic team shift checks passed.");
} finally {
  await vite.close();
}
