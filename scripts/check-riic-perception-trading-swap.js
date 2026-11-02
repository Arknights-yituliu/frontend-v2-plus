import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { optimizeRiicPerceptionTradingSwap } = await vite.ssrLoadModule("/src/utils/riic/l72-fallback-shift-optimization.js");
  const { buildRiicControlCenterCandidateOperators } = await vite.ssrLoadModule("/src/utils/riic/l50-control-candidates.js");
  const { buildRiicSchedulePreview } = await vite.ssrLoadModule("/src/utils/riicSchedulePreview.js");
  const { buildRiicMaaScheduleFromPreview } = await vite.ssrLoadModule("/src/utils/riicScheduleExport.js");
  const skills = (await vite.ssrLoadModule("/src/static/json/tools/riic-candidates/R50-control.json")).default.skills;
  const roster = [
    ["char_4046_ebnhlz", "黑键"], ["char_4203_kichi", "吉星"], ["char_332_archet", "空弦"],
    ["char_112_siege", "推进之王"], ["char_154_morgan", "摩根"], ["char_4244_tocka", "冻河"],
    ["char_391_rosmon", "迷迭香"], ["char_446_aroma", "阿罗玛"], ["char_284_spot", "斑点"],
    ["char_338_iris", "爱丽丝"], ["char_4047_pianst", "车尔尼"], ["char_4110_delphn", "戴菲恩"],
  ].map(([charId, name]) => ({ charId, name, elite: 2, level: 50 }));
  const byId = new Map(roster.map((operator) => [operator.charId, operator]));
  const controls = buildRiicControlCenterCandidateOperators({ roster, skills });
  const team = (key, ids, fallback = []) => ({ key, sourceFile: `${key}.json`, sourceRoomType: "trading",
    candidateScope: { roomType: "trading", product: "orundum" }, operatorIds: ids,
    members: ids.filter((id) => !fallback.includes(id)).map((id) => ({ name: byId.get(id).name })),
    operators: ids.map((id) => ({ ...byId.get(id), fallback: fallback.includes(id) })),
    fallback: { operators: fallback.map((id) => ({ ...byId.get(id), percent: 20 })) } });
  const room = (candidate) => ({ stationIndex: 0, stationLevel: 3, expectedSlots: 3, candidate });
  const segment = (candidate) => ({ durationHours: 12, stationAssignments: [room(candidate)] });
  const black = team("black", ["char_4046_ebnhlz", "char_4203_kichi", "char_332_archet"], ["char_4203_kichi", "char_332_archet"]);
  const morgan = team("morgan", ["char_112_siege", "char_154_morgan", "char_4244_tocka"], ["char_4244_tocka"]);
  black.coreUpgradeRequirements = [{ charId: "char_4046_ebnhlz", name: "黑键", required: { elite: 2, level: 1 } }];
  black.totalPercent = 999;
  morgan.totalPercent = 999;
  const factoryA = team("factory-a", []);
  const factoryB = team("factory-b", ["char_391_rosmon", "char_446_aroma", "char_284_spot"]);
  const groups = [
    { id: "control", facility: "control", count: 1 },
    { id: "trade", facility: "trading", candidateProduct: "orundum", count: 1 },
    { id: "factory", facility: "manufacture", candidateProduct: "gold", count: 1 },
  ];
  const alignment = { summary: [], groupEntries: [
    { group: groups[0], candidate: { segments: [0, 1].map((index) => segment({ controlCenterTeamIndex: index,
      operatorIds: index ? ["char_4110_delphn"] : [], operators: index ? controls : [] })) } },
    { group: groups[1], candidate: { segments: [segment(black), segment(morgan)] } },
    { group: groups[2], candidate: { segments: [segment(factoryA), segment(factoryB)] } },
  ] };
  const options = { alignment, ownedOperators: roster, layoutData: { facilities: Array.from({ length: 4 }, () => ({ facilityType: "dormitory", stationLevel: 5 })) } };
  const result = optimizeRiicPerceptionTradingSwap(options);
  const trade = result.groupEntries[1].candidate.segments.map((item) => item.stationAssignments[0].candidate.operatorIds);
  assert.ok(trade[0].includes("char_4244_tocka") && trade[1].includes("char_4046_ebnhlz"), "黑键应与冻河换班");
  assert.ok(trade[1].includes("char_112_siege") && trade[1].includes("char_154_morgan"), "推进之王与摩根仍与戴菲恩同班");
  const swapped = result.groupEntries[1].candidate.segments.map((item) => item.stationAssignments[0].candidate);
  assert.equal(swapped[0].sourceFile, "black.json", "换班应保留候选来源");
  assert.deepEqual(swapped[0].members, [], "黑键离开后原班不应保留原核心");
  assert.deepEqual(swapped[1].members.map((member) => member.name), ["推进之王", "摩根", "黑键"]);
  assert.deepEqual(swapped[0].fallback.operators.map((operator) => operator.charId).sort(), trade[0].slice().sort());
  assert.equal(swapped[0].fallback.totalPercent, 60);
  assert.equal(swapped[1].fallback.totalPercent, 0);
  assert.deepEqual(swapped[1].fallback.operators, []);
  assert.deepEqual(swapped[0].coreUpgradeRequirements, []);
  assert.deepEqual(swapped[1].coreUpgradeRequirements.map((item) => item.charId), ["char_4046_ebnhlz"]);
  assert.ok(swapped[0].operators.find((operator) => operator.charId === "char_4244_tocka").fallback);
  assert.equal(swapped[1].operators.find((operator) => operator.charId === "char_4046_ebnhlz").fallback, false);
  assert.ok(swapped[1].sameShiftBindings.length > 0, "换班后应按实际人员重新计算中枢绑定");
  assert.ok(swapped.every((candidate) => candidate.totalPercent === undefined), "不能沿用换班前的候选效率");
  const preview = buildRiicSchedulePreview({ scheduleCandidate: { groups: result.groupEntries.map(({ group, candidate }) => ({ groupId: group.id, candidate })) }, roomGroups: groups });
  const schedule = buildRiicMaaScheduleFromPreview({ preview, durationSource: "preview" }).schedule;
  const { settleRiicMaaScheduleEfficiency } = await vite.ssrLoadModule("/src/utils/riic/l79-preview-efficiency-settlement.js");
  const settled = settleRiicMaaScheduleEfficiency({
    schedule: { plans: swapped.map((candidate, index) => ({ duration: 720, rooms: {
      control: [{ level: 5, operators: index ? ["戴菲恩"] : [] }],
      trading: [{ level: 3, product: "orundum", operators: candidate.operatorIds.map((id) => byId.get(id).name) }],
      manufacture: [{ level: 3, product: "gold", operators: index ? ["迷迭香", "阿罗玛", "斑点"] : [] }],
      dormitory: Array.from({ length: 4 }, () => ({ level: 5, operators: [] })),
    } })) },
    operatorProfiles: roster,
  });
  for (const [index, candidate] of swapped.entries()) {
    const room = settled.states[index].rooms.find((item) => item.facility === "trading" && item.index === 0);
    assert.ok(room.efficiency > 0, "完整排班应重新结算换班效率");
    assert.deepEqual(room.operators.map((operator) => operator.charId), candidate.operatorIds, "实际结算应使用换班后的人员");
    assert.ok(room.efficiencyMetrics.actual.breakdown.calculation, "实际结算应重新生成技能明细");
    assert.equal(preview.states[index].rooms.find((item) => item.facility === "trading").efficiencySource.candidateTotalPercent, undefined);
    assert.equal(preview.states[index].rooms.find((item) => item.facility === "trading").fallbackCount, index === 0 ? 3 : 0);
  }
  const blackPlan = schedule.plans.find((plan) => plan.rooms.trading?.[0]?.operators?.includes("黑键"));
  assert.ok(blackPlan?.rooms.manufacture?.[0]?.operators?.includes("迷迭香"), "导出的黑键与迷迭香应同班");
  assert.ok(blackPlan.rooms.trading[0].operators.includes("摩根"));
  const { buildRiicEfficiencySchedule, calculateRiicEfficiency } = await vite.ssrLoadModule("/src/utils/riic/riic-efficiency-adapter.js");
  const calculate = async (candidate) => {
    const plans = candidate.groupEntries[1].candidate.segments.map((item, index) => ({
      duration: 720,
      rooms: {
        control: [{ level: 5, operators: index ? ["戴菲恩"] : [] }],
        trading: [{ level: 3, product: "合成玉", operators: item.stationAssignments[0].candidate.operatorIds.map((id) => byId.get(id).name) }],
        manufacture: [{ level: 3, product: "赤金", operators: index ? ["迷迭香", "阿罗玛", "斑点"] : [] }],
        dormitory: Array.from({ length: 4 }, () => ({ level: 5, operators: [] })),
      },
    }));
    return calculateRiicEfficiency(buildRiicEfficiencySchedule({ plans }, { operatorProfiles: roster, operatorTable: Object.fromEntries(roster.map((operator) => [operator.charId, operator])) }));
  };
  const beforeOutput = await calculate(alignment);
  const afterOutput = await calculate(result);
  const output = (value, product) => value.dailyOutputs.find((item) => item.product === product && item.kind === "production")?.amountPerDay;
  assert.ok(output(afterOutput, "合成玉") > output(beforeOutput, "合成玉"), "实际收益计算器应确认合成玉产出提高");
  assert.ok(output(afterOutput, "赤金") > output(beforeOutput, "赤金"), "实际收益计算器应确认迷迭香产出提高");
  assert.equal(optimizeRiicPerceptionTradingSwap({ ...options, hasManualOverrides: true }), alignment);
  assert.equal(optimizeRiicPerceptionTradingSwap({ ...options, lockedOperatorIds: ["char_4244_tocka"] }), alignment);
  assert.equal(optimizeRiicPerceptionTradingSwap({ ...options, fiammettaRecovery: { enabled: true, targetOperatorId: "char_4046_ebnhlz" } }), alignment);
  assert.equal(optimizeRiicPerceptionTradingSwap({ ...options, layoutData: {} }), alignment);
  const conflict = { group: { id: "conflict", facility: "power" }, candidate: { segments: [segment(team("empty", [])), segment(team("conflict", ["char_4046_ebnhlz"]))] } };
  assert.equal(optimizeRiicPerceptionTradingSwap({ ...options, alignment: { ...alignment, groupEntries: [...alignment.groupEntries, conflict] } }).groupEntries[1].candidate.segments[0].stationAssignments[0].candidate, black, "不可引入跨设施冲突");
  console.log("RIIC perception trading swap checks passed.");
} finally {
  await vite.close();
}
