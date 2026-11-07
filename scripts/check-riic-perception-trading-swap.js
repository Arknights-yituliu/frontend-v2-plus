import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { optimizeRiicPreviewShifts, validateRiicPreviewShiftOptimization } = await vite.ssrLoadModule("/src/utils/riic/l75-general-shift-optimization.js");
  const { buildRiicSchedulePreview, getRiicSchedulePreviewOperatorSignature } = await vite.ssrLoadModule("/src/utils/riicSchedulePreview.js");
  const { buildRiicMaaScheduleFromPreview } = await vite.ssrLoadModule("/src/utils/riicScheduleExport.js");
  const { buildRiicEfficiencySchedule, calculateRiicEfficiency } = await vite.ssrLoadModule("/src/utils/riic/riic-efficiency-adapter.js");
  const roster = [
    ["char_4046_ebnhlz", "黑键"], ["char_4203_kichi", "吉星"], ["char_332_archet", "空弦"],
    ["char_112_siege", "推进之王"], ["char_154_morgan", "摩根"], ["char_4244_tocka", "冻河"],
    ["char_391_rosmon", "迷迭香"], ["char_446_aroma", "阿罗玛"], ["char_284_spot", "斑点"],
    ["char_4110_delphn", "戴菲恩"], ["char_338_iris", "爱丽丝"], ["char_4047_pianst", "车尔尼"],
  ].map(([charId, name]) => ({ charId, name, elite: 2, level: 50 }));
  const byId = new Map(roster.map((operator) => [operator.charId, operator]));
  const room = (ids, slots = 3) => ({ stationIndex: 0, stationLevel: 3, expectedSlots: slots,
    candidate: { key: ids.join(","), operatorIds: ids, operators: ids.map((id) => byId.get(id)) } });
  const groups = [
    { id: "control", facility: "control", count: 1 },
    { id: "trade", facility: "trading", candidateProduct: "orundum", count: 1 },
    { id: "factory", facility: "manufacture", candidateProduct: "gold", count: 1 },
  ];
  const entries = [
    { groupId: "control", candidate: { segments: [[], ["char_4110_delphn"]].map((ids, index) => ({ durationHours: 12,
      stationAssignments: [{ ...room(ids, 5), stationLevel: 5, candidate: { ...room(ids).candidate, controlCenterTeamIndex: index } }] })) } },
    { groupId: "trade", candidate: { segments: [
      ["char_4046_ebnhlz", "char_4203_kichi", "char_332_archet"],
      ["char_112_siege", "char_154_morgan", "char_4244_tocka"],
    ].map((ids) => ({ durationHours: 12, stationAssignments: [room(ids)] })) } },
    { groupId: "factory", candidate: { segments: [[], ["char_391_rosmon", "char_446_aroma", "char_284_spot"]]
      .map((ids) => ({ durationHours: 12, stationAssignments: [room(ids)] })) } },
  ];
  const staticRooms = Array.from({ length: 4 }, (_, index) => ({ key: `dorm:${index}`, facility: "dormitory", stationLevel: 5, expectedSlots: 5,
    operatorsByStateIndex: index === 0 ? { 0: [byId.get("char_338_iris"), byId.get("char_4047_pianst")],
      1: [byId.get("char_338_iris"), byId.get("char_4047_pianst")] } : {} }));
  const candidate = { groups: entries };
  const preview = buildRiicSchedulePreview({ scheduleCandidate: candidate, roomGroups: groups, staticRooms });
  const options = { preview, ownedOperators: roster, eligibleGroupIds: ["trade", "factory"] };
  const result = await optimizeRiicPreviewShifts(options);
  const after = buildRiicSchedulePreview({ scheduleCandidate: candidate, roomGroups: groups, staticRooms,
    automaticRoomOperatorOverrides: result.overrides });
  assert.equal(getRiicSchedulePreviewOperatorSignature(after), result.expectedSignature);
  assert.ok(after.states.some((state) =>
    state.rooms.find((room) => room.facility === "trading").operators.some((operator) => operator.charId === "char_4046_ebnhlz") &&
    state.rooms.find((room) => room.facility === "manufacture").operators.some((operator) => operator.charId === "char_391_rosmon")),
  "总产出不下降时应尝试使黑键与迷迭香同班");
  const finalized = structuredClone(after);
  finalized.states[0].rooms.find((room) => room.key === "dorm:0").operators = [];
  assert.notEqual(getRiicSchedulePreviewOperatorSignature(finalized), result.expectedSignature,
    "换班后支援房间可能重新安排");
  assert.equal(await validateRiicPreviewShiftOptimization({ ...options, finalizedPreview: finalized }), true,
    "支援房间变化后，总产出不下降的换班仍应通过校验");
  assert.equal(await validateRiicPreviewShiftOptimization({ ...options, preview: finalized, finalizedPreview: preview }), false,
    "重新组装后的总产出下降时不得应用换班");
  const calculate = (value) => calculateRiicEfficiency(buildRiicEfficiencySchedule(
    buildRiicMaaScheduleFromPreview({ preview: value, durationSource: "preview", includeRiicRoomLevels: true, forceSkipFalse: true }).schedule,
    { operatorProfiles: roster, operatorTable: Object.fromEntries(roster.map((operator) => [operator.charId, operator])) },
  ));
  const beforeResult = await calculate(preview);
  const afterResult = await calculate(after);
  const outputMap = (value) => new Map(value.dailyOutputs.filter((item) => item.kind === "production")
    .map((item) => [`${item.product}:${item.kind}`, item.amountPerDay]));
  const before = outputMap(beforeResult);
  const final = outputMap(afterResult);
  for (const [key, value] of before) assert.ok(Number(final.get(key) || 0) + 1e-6 >= value, `${key} 不得降低`);
  const protectedResult = await optimizeRiicPreviewShifts({ ...options, eligibleGroupIds: [] });
  assert.deepEqual(protectedResult.overrides, {}, "不能修改未开放自动调整的房间");
  console.log("RIIC generic perception alignment checks passed.");
} finally {
  await vite.close();
}
