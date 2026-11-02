import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { reconcileRiicControlCenterAfterRoomSelection } = await vite.ssrLoadModule("/src/utils/riic/l73-control-center-reconciliation.js");
  const { buildRiicControlCenterCandidateOperators } = await vite.ssrLoadModule("/src/utils/riic/l50-control-candidates.js");
  const { evaluateRiicSelectedRoomTeams, compareRiicSelectedRoomTeamResults, getRiicWorkPattern } = await vite.ssrLoadModule("/src/utils/riic/l72-fallback-shift-optimization.js");
  const skills = (await vite.ssrLoadModule("/src/static/json/tools/riic-candidates/R50-control.json")).default.skills;
  const roster = [
    ["char_1048_orchd2", "焰狐龙梓兰", 2],
    ["char_4186_tmoris", "八幡海铃", 2],
    ["char_427_vigil", "伺夜", 2],
    ["char_4037_demetr", "贝洛内", 2],
  ].map(([charId, name, elite]) => ({ charId, name, elite, level: 50 }));
  const candidates = buildRiicControlCenterCandidateOperators({ roster, skills });
  const byId = new Map(candidates.map((operator) => [operator.charId, operator]));
  const orchid = byId.get("char_1048_orchd2");
  const tomori = byId.get("char_4186_tmoris");
  const teams = [orchid, orchid, tomori].map((operator, teamIndex) => ({
    teamIndex,
    slotCount: 1,
    roomEffectOperators: [operator],
    operatorEffectOperators: [],
    fillerOperators: [],
  }));
  const state = {
    status: "ready",
    teamCount: 3,
    slotCount: 1,
    teams,
    roles: [{ id: "room", candidates, buffTags: ["office"] }],
    segments: teams.map((team, index) => ({
      index,
      teamIndex: index,
      durationHours: [12, 6, 6][index],
      operatorIds: [team.roomEffectOperators[0].charId],
      operators: team.roomEffectOperators,
    })),
  };
  const selectedRoomTeams = [
    { facility: "trading", product: "lmd", stationLevel: 3, activeStateIndexes: [0, 1], operatorIds: ["char_427_vigil", "char_4037_demetr"] },
  ];
  const result = reconcileRiicControlCenterAfterRoomSelection({ controlState: state, selectedRoomTeams, ownedOperators: roster });
  for (const operatorId of ["char_1048_orchd2", "char_4186_tmoris"]) {
    const pattern = (controlState) => getRiicWorkPattern({
      activeStateIndexes: controlState.segments.flatMap((segment, index) => segment.operatorIds.includes(operatorId) ? [index] : []),
    }, controlState.segments);
    const before = pattern(state);
    const after = pattern(result.controlState);
    assert.equal(after[0], before[0], "整套换班不得改变干员工作总时长");
    assert.ok(after[1] <= before[1], "整套换班不得增加干员连续工作时长");
  }
  assert.deepEqual(
    result.controlState.segments.map((segment) => segment.operatorIds),
    [["char_1048_orchd2"], ["char_4186_tmoris"], ["char_1048_orchd2"]],
    "应保留工作时长并交换等时长班段，提高八幡海铃的覆盖"
  );
  const equalState = {
    ...state,
    teamCount: 2,
    teams: [teams[0], { ...teams[2], teamIndex: 1 }],
    segments: [state.segments[0], { ...state.segments[2], index: 1, teamIndex: 1, durationHours: 12 }],
  };
  const equalResult = reconcileRiicControlCenterAfterRoomSelection({
    controlState: equalState,
    selectedRoomTeams: [{ ...selectedRoomTeams[0], activeStateIndexes: [0] }],
    ownedOperators: roster,
  });
  assert.deepEqual(
    equalResult.controlState.segments.map((segment) => segment.operatorIds),
    [["char_4186_tmoris"], ["char_1048_orchd2"]],
    "工作模式不变时仍应允许整套换班"
  );
  const excluded = reconcileRiicControlCenterAfterRoomSelection({
    controlState: state,
    selectedRoomTeams,
    ownedOperators: roster,
    excludedOperatorIdsByTeamIndex: { 0: ["char_4186_tmoris"] },
  });
  assert.deepEqual(
    excluded.controlState.segments.map((segment) => segment.operatorIds),
    [["char_1048_orchd2"], ["char_4186_tmoris"], ["char_1048_orchd2"]],
    "整套轮班交换必须尊重每班排除名单"
  );
  const conflict = reconcileRiicControlCenterAfterRoomSelection({
    controlState: state,
    selectedRoomTeams: [
      ...selectedRoomTeams,
      { facility: "power", product: "all", stationLevel: 3, activeStateIndexes: [0], operatorIds: ["char_4186_tmoris"] },
    ],
    ownedOperators: roster,
  });
  assert.ok(!conflict.controlState.segments[0].operatorIds.includes("char_4186_tmoris"), "中枢重排不能造成跨设施冲突");
  const locked = reconcileRiicControlCenterAfterRoomSelection({
    controlState: state,
    selectedRoomTeams,
    ownedOperators: roster,
    manualOperatorIdsByTeamIndex: { 2: ["char_4186_tmoris"] },
  });
  assert.deepEqual(
    locked.controlState.segments.map((segment) => segment.operatorIds),
    [["char_1048_orchd2"], ["char_1048_orchd2"], ["char_4186_tmoris"]]
  );
  const fullRoster = [...roster, ...[
    ["char_308_swire", "诗怀雅"], ["char_1044_hsgma2", "斩业星熊"],
    ["char_4098_vvana", "薇薇安娜"], ["char_420_flamtl", "焰尾"],
    ["char_4179_monstr", "Mon3tr"], ["char_1029_yato2", "麒麟R夜刀"],
    ["char_1030_noirc2", "火龙S黑角"], ["char_4110_delphn", "戴菲恩"],
    ["char_4032_provs", "但书"], ["char_112_siege", "推进之王"], ["char_154_morgan", "摩根"],
  ].map(([charId, name]) => ({ charId, name, elite: 2, level: 50 }))];
  const fullCandidates = buildRiicControlCenterCandidateOperators({ roster: fullRoster, skills });
  const fullById = new Map(fullCandidates.map((operator) => [operator.charId, operator]));
  const fullTeams = [0, 1, 2].map((teamIndex) => ({
    teamIndex,
    slotCount: 5,
    roomEffectOperators: (teamIndex < 2
      ? ["char_1048_orchd2", "char_308_swire", "char_1044_hsgma2"]
      : ["char_4186_tmoris", "char_4179_monstr", "char_1029_yato2"]
    ).map((id) => fullById.get(id)),
    operatorEffectOperators: (teamIndex < 2
      ? ["char_4098_vvana", "char_420_flamtl"]
      : ["char_1030_noirc2", "char_4110_delphn"]
    ).map((id) => fullById.get(id)),
    fillerOperators: [],
  }));
  const fullState = {
    ...state,
    slotCount: 5,
    teams: fullTeams,
    roles: [{ id: "room", candidates: fullCandidates, buffTags: ["office"] }, { id: "operator", candidates: fullCandidates }],
    segments: fullTeams.map((team, index) => {
      const operators = [...team.roomEffectOperators, ...team.operatorEffectOperators];
      return { index, teamIndex: index, durationHours: [12, 6, 6][index], operators, operatorIds: operators.map((operator) => operator.charId) };
    }),
  };
  const fullRoomTeams = [
    { ...selectedRoomTeams[0], operatorIds: ["char_4032_provs", "char_427_vigil", "char_4037_demetr"] },
    { ...selectedRoomTeams[0], activeStateIndexes: [2], operatorIds: ["char_4032_provs", "char_112_siege", "char_154_morgan"] },
  ];
  const fullResult = reconcileRiicControlCenterAfterRoomSelection({ controlState: fullState, ownedOperators: fullRoster, selectedRoomTeams: fullRoomTeams });
  assert.ok(!fullResult.controlState.segments[0].operatorIds.includes("char_4186_tmoris"));
  assert.ok(fullResult.controlState.segments[1].operatorIds.includes("char_4186_tmoris"));
  assert.ok(fullResult.controlState.segments[2].operatorIds.includes("char_4110_delphn"));
  assert.ok(compareRiicSelectedRoomTeamResults(
    evaluateRiicSelectedRoomTeams({ teams: fullRoomTeams, controlState: fullState, ownedOperators: fullRoster }),
    evaluateRiicSelectedRoomTeams({ teams: fullRoomTeams, controlState: fullResult.controlState, ownedOperators: fullRoster }),
  ), "交换完整轮班后应提高结算收益且不降低其他设施收益");
  const splitTeams = [orchid, tomori, orchid, null].map((operator, teamIndex) => ({
    teamIndex,
    slotCount: 1,
    roomEffectOperators: operator ? [operator] : [],
    operatorEffectOperators: [],
    fillerOperators: [],
  }));
  const splitState = {
    ...state,
    teamCount: 4,
    teams: splitTeams,
    segments: splitTeams.map((team, index) => ({
      index,
      teamIndex: index,
      durationHours: 6,
      operatorIds: team.roomEffectOperators.map((operator) => operator.charId),
      operators: team.roomEffectOperators,
    })),
  };
  const split = reconcileRiicControlCenterAfterRoomSelection({
    controlState: splitState,
    ownedOperators: roster,
    selectedRoomTeams: [{ ...selectedRoomTeams[0], activeStateIndexes: [2] }],
  });
  assert.deepEqual(
    split.controlState.segments.map((segment) => segment.operatorIds),
    [["char_1048_orchd2"], ["char_4186_tmoris"], ["char_1048_orchd2"], []],
    "不得增加中枢干员的连续工作时间"
  );
  console.log("RIIC control shift swap checks passed.");
} finally {
  await vite.close();
}
