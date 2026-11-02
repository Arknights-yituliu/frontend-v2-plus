import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { optimizeRiicFallbackSameShift, compareRiicSelectedRoomTeamResults, evaluateRiicSelectedRoomTeams } = await vite.ssrLoadModule(
    "/src/utils/riic/l72-fallback-shift-optimization.js"
  );
  const { buildRiicFinalSelectedRoomTeams } = await vite.ssrLoadModule("/src/utils/riic/l70-scheduler-core.js");
  const { buildRiicControlCenterCandidateOperators } = await vite.ssrLoadModule("/src/utils/riic/l50-control-candidates.js");
  const skills = (await vite.ssrLoadModule("/src/static/json/tools/riic-candidates/R50-control.json")).default.skills;
  const roster = [
    ["char_4098_vvana", "薇薇安娜", 2],
    ["char_420_flamtl", "焰尾", 2],
    ["char_430_fartth", "远牙", 2],
    ["char_431_ashlok", "灰毫", 2],
    ["char_496_wildmn", "野鬃", 2],
    ["char_159_peacok", "断罪者", 1],
    ["char_243_waaifu", "槐琥", 2],
    ["char_4054_malist", "至简", 2],
    ["char_4217_makoto", "结城理", 2],
    ["char_4218_aigis", "埃癸斯", 0],
    ["char_4219_yukari", "岳羽由加莉", 0],
  ].map(([charId, name, elite]) => ({ charId, name, elite, level: 50 }));
  const byId = new Map(roster.map((operator) => [operator.charId, operator]));
  const controls = buildRiicControlCenterCandidateOperators({ roster, skills });
  const controlIds = ["char_4098_vvana", "char_420_flamtl"];
  const controlState = {
    status: "ready",
    segments: [12, 6, 6].map((durationHours, index) => ({
      index,
      teamIndex: index,
      durationHours,
      operatorIds: index < 2 ? controlIds : [],
      operators: index < 2 ? controls : [],
    })),
  };
  const farIds = ["char_430_fartth", "char_243_waaifu", "char_4054_malist"];
  const pineIds = ["char_431_ashlok", "char_496_wildmn", "char_159_peacok"];
  const fallback = (ids) => ids.map((id) => ({ ...byId.get(id), percent: id === "char_159_peacok" ? 35 : 25 }));
  const pool = fallback([...farIds, ...pineIds]);
  const candidates = ["far", "pine"].map((key) => ({
    key,
    isManualFallbackTeam: true,
    operatorIds: [],
    fallback: { candidateOperators: pool },
  }));
  const group = { id: "factory", facility: "manufacture", candidateProduct: "experience" };
  const cohort = {
    id: "manufacture",
    stationLevel: 3,
    candidates,
    rotationSegments: [
      {
        index: 0,
        activeTeamIndexes: [0, 1],
        assignments: [
          { teamIndex: 0, stationIndex: 0 },
          { teamIndex: 1, stationIndex: 1 },
        ],
      },
      { index: 1, activeTeamIndexes: [1], assignments: [{ teamIndex: 1, stationIndex: 1 }] },
      { index: 2, activeTeamIndexes: [0], assignments: [{ teamIndex: 0, stationIndex: 1 }] },
    ],
  };
  const teams = [farIds, pineIds].map((operatorIds, index) => ({
    groupId: group.id,
    cohortId: cohort.id,
    selectionKey: `${cohort.id}:${index}`,
    teamIndex: index,
    facility: "manufacture",
    product: "experience",
    stationLevel: 3,
    operatorIds,
    activeStateIndexes: index === 0 ? [0, 2] : [0, 1],
    stationIndexByStateIndex: index === 0 ? { 0: 0, 2: 1 } : { 0: 1, 1: 1 },
  }));
  const slots = Object.fromEntries(teams.flatMap((team, index) => team.operatorIds.map((id, slot) => [`${team.selectionKey}:fallback:${slot}`, id])));
  const tailFillResult = {
    selections: { factory: { manufacture: ["far", "pine"] } },
    fallbackOperatorIdBySlotKeyByGroup: { factory: slots },
    fallbackOperatorsBySelectionKeyByGroup: {
      factory: {
        "manufacture:0": fallback(farIds),
        "manufacture:1": fallback(pineIds),
      },
    },
  };
  const input = {
    groups: [group],
    candidateStatesByGroupId: { factory: { status: "ready", cohorts: [cohort] } },
    tailFillResult,
    selectedRoomTeams: teams,
    controlState,
    ownedOperators: roster,
  };
  assert.deepEqual(
    buildRiicFinalSelectedRoomTeams({
      groups: input.groups,
      candidateStatesByGroupId: input.candidateStatesByGroupId,
      tailFillResult,
    }),
    teams,
    "自动生成应保留每个班组的实际班段和站点"
  );
  const result = optimizeRiicFallbackSameShift(input);
  assert.ok(result.fallbackOperatorsBySelectionKeyByGroup.factory["manufacture:1"].some((operator) => operator.charId === "char_430_fartth"));
  assert.ok(result.fallbackOperatorsBySelectionKeyByGroup.factory["manufacture:0"].some((operator) => operator.charId === "char_159_peacok"));
  assert.equal(result.fallbackOperatorIdBySlotKeyByGroup.factory["manufacture:0:fallback:0"], "char_159_peacok");
  assert.equal(result.fallbackOperatorIdBySlotKeyByGroup.factory["manufacture:1:fallback:2"], "char_430_fartth");
  const protectedResult = optimizeRiicFallbackSameShift({
    ...input,
    fiammettaRecovery: { enabled: true, targetOperatorId: "char_430_fartth" },
  });
  assert.equal(protectedResult, tailFillResult);
  const before = {
    values: new Map([
      ["experience", 100],
      ["gold", 100],
    ]),
    issues: new Set(),
  };
  assert.equal(
    compareRiicSelectedRoomTeamResults(before, {
      values: new Map([
        ["experience", 120],
        ["gold", 99],
      ]),
      issues: new Set(),
    }),
    false,
    "不能以其他产物收益下降换取经验书收益提升"
  );
  assert.equal(
    compareRiicSelectedRoomTeamResults(before, {
      values: new Map([
        ["experience", 120],
        ["gold", 100],
      ]),
      issues: new Set(["new-issue"]),
    }),
    false,
    "新增结算问题时不能接受交换"
  );
  const meetingTeams = ["char_430_fartth", "char_159_peacok"].map((id) => ({
    groupId: "meeting",
    facility: "meeting",
    product: "all",
    stationLevel: 3,
    activeStateIndexes: [0],
    stationIndexByStateIndex: { 0: 0 },
    operatorIds: [id],
  }));
  const meetingCohort = {
    id: "meeting",
    stationLevel: 3,
    candidates: meetingTeams.map((team, index) => ({ key: `meeting-${index}`, operatorIds: team.operatorIds })),
    rotationSegments: [{ index: 0, activeTeamIndexes: [0, 1], assignments: [{ stationIndex: 0, candidateIndexes: [0, 1] }] }],
  };
  const assembledMeeting = buildRiicFinalSelectedRoomTeams({
    groups: [{ id: "meeting", facility: "meeting", candidateProduct: "all" }],
    candidateStatesByGroupId: { meeting: { status: "ready", cohorts: [meetingCohort] } },
    tailFillResult: { selections: { meeting: { meeting: ["meeting-0", "meeting-1"] } } },
  });
  assert.deepEqual(
    assembledMeeting.map((team) => team.stationIndexByStateIndex),
    [{ 0: 0 }, { 0: 0 }]
  );
  const meetingControl = { status: "ready", segments: [{ durationHours: 24, operatorIds: [], operators: [] }] };
  const separate = evaluateRiicSelectedRoomTeams({ teams: meetingTeams, controlState: meetingControl, ownedOperators: roster });
  const merged = evaluateRiicSelectedRoomTeams({
    teams: [{ ...meetingTeams[0], operatorIds: meetingTeams.flatMap((team) => team.operatorIds) }],
    controlState: meetingControl,
    ownedOperators: roster,
  });
  assert.deepEqual(separate.values, merged.values, "单人候补应按实际站点合并后结算");
  const linkedRooms = [
    { groupId: "experience", facility: "manufacture", product: "experience", stationLevel: 3, activeStateIndexes: [0], operatorIds: ["char_4217_makoto"] },
    { groupId: "power", facility: "power", product: "all", stationLevel: 3, activeStateIndexes: [0], operatorIds: ["char_4218_aigis"] },
  ];
  const withoutRecycle = evaluateRiicSelectedRoomTeams({ teams: linkedRooms, controlState: meetingControl, ownedOperators: roster });
  const withRecycle = evaluateRiicSelectedRoomTeams({
    teams: [
      ...linkedRooms,
      { groupId: "recycle", facility: "recycle", product: "all", stationLevel: 3, activeStateIndexes: [0], operatorIds: ["char_4219_yukari"] },
    ],
    controlState: meetingControl,
    ownedOperators: roster,
  });
  assert.ok(
    withRecycle.values.get("manufacture:experience:3") > withoutRecycle.values.get("manufacture:experience:3"),
    "结算时应保留回收站对制造站的活跃名单联动"
  );
  console.log("RIIC fallback shift swap checks passed.");
} finally {
  await vite.close();
}
