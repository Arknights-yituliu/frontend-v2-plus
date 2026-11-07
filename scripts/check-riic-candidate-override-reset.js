import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createServer } from "vite";

const source = readFileSync(new URL("../src/pages/tools/riic-schedule-generator.vue", import.meta.url), "utf8");
const start = source.indexOf("function toggleRoomGroupTeamCandidate(");
const end = source.indexOf("\nfunction createAutomaticRoomGroupFallbackQueueStates(", start);
assert.ok(start >= 0 && end > start, "候选班组切换函数不存在");

function createScenario({ selected = [], canAdd = true } = {}) {
  const context = {
    selectedRoomGroupTeamCandidateKeys: { value: { power: { first: selected } } },
    automaticScheduleRoomOperatorOverrides: { value: {
      "0:power:0": [{ charId: "old" }],
      "1:power:1": [{ charId: "old2" }],
      "0:power-extra:0": [{ charId: "keep" }],
      "0:trading:0": [{ charId: "keep2" }],
    } },
    getSelectedTeamCandidateKeys: () => selected,
    getSelectedRoomCandidateCount: (_group, _cohort, key) => selected.filter((item) => item === key).length,
    canAddRoomGroupTeamCandidate: () => canAdd,
    isFiammettaReusableTeamCandidate: () => false,
    clearRoomGroupFallbackQueue: () => {},
  };
  const toggle = runInNewContext(`(${source.slice(start, end)})`, context);
  return { context, toggle: () => toggle({ group: { id: "power" }, cohort: { id: "first" }, candidate: { key: "team" } }) };
}

for (const selected of [[], ["team"]]) {
  const scenario = createScenario({ selected });
  scenario.toggle();
  assert.deepEqual(Object.keys(scenario.context.automaticScheduleRoomOperatorOverrides.value).sort(),
    ["0:power-extra:0", "0:trading:0"], "修改候选时仅清除当前房间组的自动优化覆盖");
}

const blocked = createScenario({ canAdd: false });
blocked.toggle();
assert.equal(Object.keys(blocked.context.automaticScheduleRoomOperatorOverrides.value).length, 4,
  "未改变候选时保留自动优化覆盖");

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { buildRiicSchedulePreview } = await vite.ssrLoadModule("/src/utils/riicSchedulePreview.js");
  const { buildRiicMaaScheduleFromPreview } = await vite.ssrLoadModule("/src/utils/riicScheduleExport.js");
  const group = { id: "power", facility: "power", candidateProduct: "all", count: 1 };
  const operator = { charId: "char_253_greyy", name: "格雷伊" };
  const candidate = { groups: [{ groupId: "power", candidate: { segments: [{ durationHours: 24,
    stationAssignments: [{ stationIndex: 0, stationLevel: 3, expectedSlots: 1,
      candidate: { operators: [operator], operatorIds: [operator.charId] } }],
  }] } }] };
  const scenario = createScenario();
  const makePreview = () => buildRiicSchedulePreview({ scheduleCandidate: candidate, roomGroups: [group],
    automaticRoomOperatorOverrides: scenario.context.automaticScheduleRoomOperatorOverrides.value });
  assert.equal(makePreview().states[0].rooms[0].operators[0].charId, "old");
  scenario.toggle();
  const preview = makePreview();
  assert.equal(preview.states[0].rooms[0].operators[0].charId, operator.charId);
  const schedule = buildRiicMaaScheduleFromPreview({ preview, durationSource: "preview" }).schedule;
  assert.deepEqual(schedule.plans[0].rooms.power[0].operators, [operator.name]);
} finally {
  await vite.close();
}
console.log("RIIC candidate override reset checks passed.");
