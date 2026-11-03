import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { evaluateRiicSelectedRoomTeams, optimizeRiicAutomationPowerShifts } = await vite.ssrLoadModule("/src/utils/riic/l72-fallback-shift-optimization.js");
  const { buildRiicSchedulePreview } = await vite.ssrLoadModule("/src/utils/riicSchedulePreview.js");
  const { buildRiicMaaScheduleFromPreview } = await vite.ssrLoadModule("/src/utils/riicScheduleExport.js");
  const { buildRiicEfficiencySchedule, calculateRiicEfficiency } = await vite.ssrLoadModule("/src/utils/riic/riic-efficiency-adapter.js");
  const roster = [
    ["char_1027_greyy2", "承曦格雷伊"], ["char_1040_blaze2", "烛煌"], ["char_107_liskam", "雷蛇"],
    ["char_4218_aigis", "埃癸斯"], ["char_253_greyy", "格雷伊"], ["char_377_gdglow", "澄闪"],
    ["char_385_finlpp", "清流"], ["char_400_weedy", "温蒂"], ["char_416_zumama", "森蚺"],
    ["char_4217_makoto", "结城理"], ["char_285_medic2", "Lancet-2"], ["char_286_cast3", "Castle-3"],
  ].map(([charId, name]) => ({ charId, name, elite: 2, level: 50 }));
  const byId = new Map(roster.map((operator) => [operator.charId, operator]));
  const room = (id, index = 0) => ({ stationIndex: index, stationLevel: 3, expectedSlots: 1,
    candidate: { key: id, operatorIds: id ? [id] : [], operators: id ? [byId.get(id)] : [], fallback: { operators: id ? [byId.get(id)] : [] } } });
  const powerIds = [
    ["char_1027_greyy2", "char_1040_blaze2", "char_107_liskam"],
    ["char_4218_aigis", "char_253_greyy", "char_377_gdglow"],
  ];
  const groups = [
    { id: "control", facility: "control", count: 1 },
    { id: "factory", facility: "manufacture", candidateProduct: "gold", count: 1 },
    { id: "power", facility: "power", candidateProduct: "all", count: 3 },
  ];
  const makeAlignment = (power = powerIds) => ({ groupEntries: [
    { group: groups[0], candidate: { segments: [0, 1].map((index) => ({ durationHours: 12, stationAssignments: [{ ...room("", 0), stationLevel: 5, candidate: { controlCenterTeamIndex: index, operatorIds: [], operators: [] } }] })) } },
    { group: groups[1], candidate: { segments: [[], ["char_385_finlpp", "char_400_weedy", "char_416_zumama"]].map((ids) => ({ durationHours: 12,
      stationAssignments: [{ ...room("", 0), expectedSlots: 3, candidate: { operatorIds: ids, operators: ids.map((id) => byId.get(id)) } }] })) } },
    { group: groups[2], candidate: { segments: power.map((ids) => ({ durationHours: 12, stationAssignments: ids.map((id, index) => room(id, index)) })) } },
  ], summary: [], debug: { groups: [] } });
  const options = { alignment: makeAlignment(), ownedOperators: roster };
  const result = optimizeRiicAutomationPowerShifts(options);
  const power = result.groupEntries[2].candidate.segments;
  assert.ok(power[1].stationAssignments.some((assignment) => assignment.candidate.operatorIds.includes("char_1027_greyy2")), "承曦格雷伊应与自动化队同班");
  assert.ok(!power[0].stationAssignments.some((assignment) => assignment.candidate.operatorIds.includes("char_1027_greyy2")));
  const preview = buildRiicSchedulePreview({ scheduleCandidate: { groups: result.groupEntries.map(({ group, candidate }) => ({ groupId: group.id, candidate })) }, roomGroups: groups });
  const exported = buildRiicMaaScheduleFromPreview({ preview, durationSource: "preview" }).schedule;
  assert.ok(exported.plans.some((plan) => plan.rooms.power.some((room) => room.operators.includes("承曦格雷伊")) && plan.rooms.manufacture[0].operators.includes("温蒂")), "预览和 MAA 导出须反映交换");
  assert.equal(optimizeRiicAutomationPowerShifts({ ...options, hasManualOverrides: true }), options.alignment);
  assert.equal(optimizeRiicAutomationPowerShifts({ ...options, lockedOperatorIds: ["char_1027_greyy2"] }), options.alignment);
  assert.equal(optimizeRiicAutomationPowerShifts({ ...options, fiammettaRecovery: { enabled: true, targetOperatorId: "char_1027_greyy2" } }), options.alignment);

  const platformAlignment = makeAlignment([
    ["char_1040_blaze2", "char_107_liskam", "char_253_greyy"],
    ["char_1027_greyy2", "char_285_medic2", "char_286_cast3"],
  ]);
  const platformsResult = optimizeRiicAutomationPowerShifts({ alignment: platformAlignment, ownedOperators: roster });
  const platformShift = platformsResult.groupEntries[2].candidate.segments[1].stationAssignments.flatMap((assignment) => assignment.candidate.operatorIds);
  assert.ok(platformShift.includes("char_1027_greyy2"));
  assert.ok(!platformShift.includes("char_285_medic2") && !platformShift.includes("char_286_cast3"), "应尝试同时错开多个作业平台");
  const withoutAutomation = { ...platformAlignment, groupEntries: platformAlignment.groupEntries.map((entry) => entry.group.id !== "factory" ? entry : {
    ...entry, candidate: { ...entry.candidate, segments: entry.candidate.segments.map((segment) => ({ ...segment,
      stationAssignments: segment.stationAssignments.map((assignment) => ({ ...assignment, candidate: { operatorIds: [], operators: [] } })) })) },
  }) };
  const separatedWithoutAutomation = optimizeRiicAutomationPowerShifts({ alignment: withoutAutomation, ownedOperators: roster });
  const unblockedShift = separatedWithoutAutomation.groupEntries[2].candidate.segments.map((segment) => segment.stationAssignments.flatMap((assignment) => assignment.candidate.operatorIds)).find((ids) => ids.includes("char_1027_greyy2"));
  assert.ok(unblockedShift.includes("char_1027_greyy2") && !unblockedShift.includes("char_285_medic2") && !unblockedShift.includes("char_286_cast3"), "没有自动化队时也应在收益不降低的前提下错开作业平台");
  const lockedPlatformsResult = optimizeRiicAutomationPowerShifts({ alignment: platformAlignment, ownedOperators: roster,
    lockedOperatorIds: ["char_1027_greyy2", "char_285_medic2", "char_286_cast3"] });
  assert.equal(lockedPlatformsResult, platformAlignment, "不可移动锁定的承曦格雷伊或作业平台");
  const conflict = { group: { id: "conflict", facility: "meeting", candidateProduct: "all" }, candidate: { segments: [
    { durationHours: 12, stationAssignments: [room("", 0)] },
    { durationHours: 12, stationAssignments: [room("char_1027_greyy2", 0)] },
  ] } };
  const conflictAlignment = { ...options.alignment, groupEntries: [...options.alignment.groupEntries, conflict] };
  assert.equal(optimizeRiicAutomationPowerShifts({ ...options, alignment: conflictAlignment }), conflictAlignment, "不可引入跨设施干员冲突");

  const controlState = { status: "ready", segments: [{ durationHours: 24, operatorIds: [] }] };
  const evaluate = (powerOperators, profile = roster) => evaluateRiicSelectedRoomTeams({ controlState, ownedOperators: profile, teams: [
    { groupId: "factory", facility: "manufacture", product: "gold", stationLevel: 3, activeStateIndexes: [0], operatorIds: ["char_400_weedy", "char_416_zumama"] },
    ...powerOperators.map((ids, index) => ({ groupId: "power", facility: "power", stationLevel: 3, activeStateIndexes: [0], stationIndexByStateIndex: { 0: index }, operatorIds: ids })),
  ] });
  const clean = evaluate([["char_1027_greyy2"], [], []]);
  const blocked = evaluate([["char_1027_greyy2"], ["char_285_medic2"], []]);
  const sameRoom = evaluate([["char_1027_greyy2", "char_285_medic2"], [], []]);
  const lowElite = evaluate([["char_1027_greyy2"], [], []], roster.map((operator) => operator.charId === "char_1027_greyy2" ? { ...operator, elite: 1 } : operator));
  assert.equal(clean.values.get("manufacture:gold:3") - blocked.values.get("manufacture:gold:3"), 25 * 24, "其他发电站存在作业平台时不应生效");
  assert.equal(sameRoom.values.get("manufacture:gold:3"), clean.values.get("manufacture:gold:3"), "同一发电站的作业平台不满足其他发电站条件");
  assert.equal(lowElite.values.get("manufacture:gold:3"), blocked.values.get("manufacture:gold:3"), "未解锁晨曦时不应生效");

  const calc = async (alignment) => {
    const plans = alignment.groupEntries[2].candidate.segments.map((segment, index) => ({ duration: 720, rooms: {
      control: [{ level: 5, operators: [] }],
      manufacture: [{ level: 3, product: "赤金", operators: index ? ["清流", "温蒂", "森蚺"] : [] }],
      power: segment.stationAssignments.map((assignment) => ({ level: 3, operators: assignment.candidate.operatorIds.map((id) => byId.get(id).name) })),
    } }));
    return calculateRiicEfficiency(buildRiicEfficiencySchedule({ plans }, { operatorProfiles: roster, operatorTable: Object.fromEntries(roster.map((operator) => [operator.charId, operator])) }));
  };
  const before = await calc(options.alignment);
  const after = await calc(result);
  const gold = (value) => value.dailyOutputs.find((item) => item.product === "赤金" && item.kind === "production")?.amountPerDay;
  assert.ok(gold(after) > gold(before), "实际收益计算器应确认赤金产出提高");
  assert.ok(gold(await calc(platformsResult)) > gold(await calc(platformAlignment)), "实际收益计算器应确认错开作业平台后晨曦生效");
  console.log("RIIC automation power alignment checks passed.");
} finally {
  await vite.close();
}
