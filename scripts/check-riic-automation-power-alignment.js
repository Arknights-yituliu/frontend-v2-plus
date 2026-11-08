import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { optimizeRiicPreviewShifts } = await vite.ssrLoadModule("/src/utils/riic/l75-general-shift-optimization.js");
  const { buildRiicSchedulePreview, getRiicSchedulePreviewOperatorSignature } = await vite.ssrLoadModule("/src/utils/riicSchedulePreview.js");
  const { buildRiicMaaScheduleFromPreview } = await vite.ssrLoadModule("/src/utils/riicScheduleExport.js");
  const { createRiicWorkspaceSnapshot, normalizeRiicWorkspaceSnapshot } = await vite.ssrLoadModule("/src/utils/riic/riic-schedule-workspace.js");
  const roster = [
    ["char_1027_greyy2", "承曦格雷伊"], ["char_1040_blaze2", "烛煌"], ["char_107_liskam", "雷蛇"],
    ["char_253_greyy", "格雷伊"], ["char_385_finlpp", "清流"], ["char_400_weedy", "温蒂"],
    ["char_416_zumama", "森蚺"], ["char_285_medic2", "Lancet-2"], ["char_286_cast3", "Castle-3"],
  ].map(([charId, name]) => ({ charId, name, elite: 2, level: 50 }));
  const byId = new Map(roster.map((operator) => [operator.charId, operator]));
  const room = (ids, index = 0, slots = 1) => ({ stationIndex: index, stationLevel: 3, expectedSlots: slots,
    candidate: { key: ids.join(","), operatorIds: ids, operators: ids.map((id) => byId.get(id)) } });
  const groups = [
    { id: "control", facility: "control", count: 1 },
    { id: "factory", facility: "manufacture", candidateProduct: "gold", count: 1 },
    { id: "power", facility: "power", candidateProduct: "all", count: 3 },
  ];
  const entries = [
    { groupId: "control", candidate: { segments: [0, 1].map((index) => ({ durationHours: 12,
      stationAssignments: [{ ...room([]), stationLevel: 5, candidate: { controlCenterTeamIndex: index, operatorIds: [], operators: [] } }] })) } },
    { groupId: "factory", candidate: { segments: [[], ["char_385_finlpp", "char_400_weedy", "char_416_zumama"]]
      .map((ids) => ({ durationHours: 12, stationAssignments: [room(ids, 0, 3)] })) } },
    { groupId: "power", candidate: { segments: [
      ["char_1040_blaze2", "char_107_liskam", "char_253_greyy"],
      ["char_1027_greyy2", "char_285_medic2", "char_286_cast3"],
    ].map((ids) => ({ durationHours: 12, stationAssignments: ids.map((id, index) => room([id], index)) })) } },
  ];
  const candidate = { groups: entries };
  const preview = buildRiicSchedulePreview({ scheduleCandidate: candidate, roomGroups: groups });
  const options = { preview, ownedOperators: roster, eligibleGroupIds: ["power"] };
  const result = await optimizeRiicPreviewShifts(options);
  const after = buildRiicSchedulePreview({ scheduleCandidate: candidate, roomGroups: groups, automaticRoomOperatorOverrides: result.overrides });
  assert.equal(getRiicSchedulePreviewOperatorSignature(after), result.expectedSignature);
  const supported = after.states[1].rooms.filter((room) => room.facility === "power")
    .flatMap((room) => room.operators.map((operator) => operator.charId));
  assert.ok(supported.includes("char_1027_greyy2"));
  assert.ok(!supported.includes("char_285_medic2") && !supported.includes("char_286_cast3"), "应联合交换两个作业平台");
  assert.ok(after.states.flatMap((state) => state.rooms).every((room) => !room.manuallyEdited));
  const locked = await optimizeRiicPreviewShifts({ ...options, lockedOperatorIds: ["char_285_medic2", "char_286_cast3", "char_1027_greyy2"] });
  assert.deepEqual(locked.overrides, {}, "锁定干员不得被移动");
  const changedKey = Object.keys(result.overrides)[0];
  const edited = buildRiicSchedulePreview({ scheduleCandidate: candidate, roomGroups: groups,
    automaticRoomOperatorOverrides: result.overrides, roomOperatorOverrides: { [changedKey]: [] } });
  const [stateIndex, ...roomParts] = changedKey.split(":");
  assert.deepEqual(edited.states[Number(stateIndex)].rooms.find((item) => item.key === roomParts.join(":")).operators, []);
  const saved = createRiicWorkspaceSnapshot({ generatedState: { automaticScheduleRoomOperatorOverrides: result.overrides } });
  assert.deepEqual(normalizeRiicWorkspaceSnapshot(JSON.parse(JSON.stringify(saved))).generatedState.automaticScheduleRoomOperatorOverrides, result.overrides);
  const previousSelf = globalThis.self;
  const messages = [];
  try {
    globalThis.self = { postMessage: (message) => messages.push(message) };
    await vite.ssrLoadModule("/src/utils/riic/l70-scheduler.worker.js");
    await globalThis.self.onmessage({ data: { requestId: "preview-test", input: { ...options, task: "optimize-preview" } } });
  } finally {
    globalThis.self = previousSelf;
  }
  assert.equal(messages[0]?.requestId, "preview-test");
  assert.deepEqual(messages[0]?.result?.overrides, result.overrides, "后台结果应与直接计算一致");
  const exported = buildRiicMaaScheduleFromPreview({ preview: after, durationSource: "preview" }).schedule;
  assert.ok(exported.plans.some((plan) => plan.rooms.power.some((item) => item.operators.includes("承曦格雷伊")) && plan.rooms.manufacture[0].operators.includes("温蒂")));
  console.log("RIIC generic power alignment checks passed.");
} finally {
  await vite.close();
}
