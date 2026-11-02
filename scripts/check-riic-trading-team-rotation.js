import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const optimization = await vite.ssrLoadModule("/src/utils/riic/l72-fallback-shift-optimization.js");
  const { buildRiicFinalSelectedRoomTeams } = await vite.ssrLoadModule("/src/utils/riic/l70-scheduler-core.js");
  const { buildRiicControlCenterCandidateOperators } = await vite.ssrLoadModule("/src/utils/riic/l50-control-candidates.js");
  const skills = (await vite.ssrLoadModule("/src/static/json/tools/riic-candidates/R50-control.json")).default.skills;
  const roster = [
    ["char_4186_tmoris", "八幡海铃"], ["char_1048_orchd2", "焰狐龙梓兰"],
    ["char_308_swire", "诗怀雅"], ["char_002_amiya", "阿米娅"], ["char_4110_delphn", "戴菲恩"],
    ["char_4032_provs", "但书"], ["char_4193_lemuen", "蕾缪安"], ["char_103_angel", "能天使"],
    ["char_427_vigil", "伺夜"], ["char_4037_demetr", "贝洛内"],
    ["char_254_vodfox", "巫恋"], ["char_486_takila", "龙舌兰"], ["char_4071_peper", "明椒"],
    ["char_112_siege", "推进之王"], ["char_154_morgan", "摩根"], ["char_4228_closur", "可露希尔"],
  ].map(([charId, name]) => ({ charId, name, elite: 2, level: 50 }));
  const byId = new Map(roster.map((operator) => [operator.charId, operator]));
  const controlCandidates = buildRiicControlCenterCandidateOperators({ roster, skills });
  const controlById = new Map(controlCandidates.map((operator) => [operator.charId, operator]));
  const controlState = {
    status: "ready",
    segments: [
      ["char_4186_tmoris", "char_308_swire"],
      ["char_1048_orchd2", "char_308_swire"],
      ["char_4186_tmoris", "char_002_amiya", "char_4110_delphn"],
    ].map((operatorIds, index) => ({
      index, teamIndex: index, durationHours: [12, 6, 6][index], operatorIds,
      operators: operatorIds.map((id) => controlById.get(id)),
    })),
  };
  const candidate = (key, operatorIds) => ({ key, operatorIds, candidateScope: { roomType: "trading", product: "lmd" } });
  const longTeam = candidate("long", ["char_4032_provs"]);
  const shortTeam = candidate("short", ["char_4032_provs", "char_427_vigil", "char_4037_demetr"]);
  const otherLong = candidate("other-long", ["char_254_vodfox", "char_486_takila", "char_4071_peper"]);
  const otherShort = candidate("other-short", ["char_112_siege", "char_154_morgan", "char_4228_closur"]);
  const cohort = (id, stationIndex, candidates) => ({
    id, stationLevel: 3, candidates,
    rotationSegments: [0, 1, 2].map((index) => ({
      index, activeTeamIndexes: [index < 2 ? 0 : 1],
      assignments: [{ teamIndex: index < 2 ? 0 : 1, stationIndex }],
    })),
  });
  const groups = [{ id: "trade", facility: "trading", candidateProduct: "lmd" }, { id: "meeting", facility: "meeting", candidateProduct: "all" }];
  const candidateStatesByGroupId = {
    trade: { status: "ready", cohorts: [cohort("station-1", 0, [longTeam, shortTeam]), cohort("station-2", 1, [otherLong, otherShort])] },
    meeting: { status: "ready", cohorts: [{ id: "meeting", stationLevel: 3, candidates: [{ key: "meeting", operatorIds: [] }], rotationSegments: [0, 1, 2].map((index) => ({ index, activeTeamIndexes: [0], assignments: [{ teamIndex: 0, stationIndex: 0 }] })) }] },
  };
  const tailFillResult = {
    selections: { trade: { "station-1": ["long", "short"], "station-2": ["other-long", "other-short"] }, meeting: { meeting: ["meeting"] } },
    fallbackOperatorIdBySlotKeyByGroup: { trade: { "station-1:0:tagged-member:0": "char_4193_lemuen", "station-1:0:fallback:0": "char_103_angel" } },
    fallbackOperatorsBySelectionKeyByGroup: { trade: { "station-1:0": [byId.get("char_4193_lemuen"), byId.get("char_103_angel")], "station-1:1": [] } },
    fiammettaTargetUsage: { targetOperatorId: "char_4032_provs", selectionKeys: ["trade:station-1:0", "trade:station-1:1"], stateIndexes: [0, 1, 2], selectionCount: 2 },
  };
  const selectedRoomTeams = buildRiicFinalSelectedRoomTeams({ groups, candidateStatesByGroupId, tailFillResult });
  const input = {
    groups, candidateStatesByGroupId, tailFillResult, selectedRoomTeams, controlState, ownedOperators: roster,
    fiammettaRecovery: { enabled: true, targetOperatorId: "char_4032_provs" },
  };
  const result = optimization.optimizeRiicTradingTeamRotations(input);
  assert.deepEqual(result.selections.trade["station-1"], ["short", "long"], "伺夜和贝洛内应覆盖八幡海铃所在的长班");
  assert.deepEqual(result.selections.trade["station-2"], ["other-long", "other-short"], "不得改变另一贸易站的戴菲恩联动");
  assert.equal(result.fallbackOperatorIdBySlotKeyByGroup.trade["station-1:1:fallback:0"], "char_103_angel");
  assert.equal(result.fallbackOperatorIdBySlotKeyByGroup.trade["station-1:1:tagged-member:0"], "char_4193_lemuen");
  assert.deepEqual(result.fallbackOperatorsBySelectionKeyByGroup.trade["station-1:1"].map((operator) => operator.charId), ["char_4193_lemuen", "char_103_angel"]);
  assert.deepEqual(result.fiammettaTargetUsage, tailFillResult.fiammettaTargetUsage);
  const after = buildRiicFinalSelectedRoomTeams({ groups, candidateStatesByGroupId, tailFillResult: result });
  assert.ok(optimization.compareRiicSelectedRoomTeamResults(
    optimization.evaluateRiicSelectedRoomTeams({ teams: selectedRoomTeams, controlState, ownedOperators: roster }),
    optimization.evaluateRiicSelectedRoomTeams({ teams: after, controlState, ownedOperators: roster }),
  ));
  const { buildRiicEfficiencySchedule, calculateRiicEfficiency } = await vite.ssrLoadModule("/src/utils/riic/riic-efficiency-adapter.js");
  const buildSchedule = (teams) => buildRiicEfficiencySchedule({
    plans: controlState.segments.map((segment, index) => {
      const rooms = { control: [{ level: 5, operators: segment.operatorIds.map((id) => byId.get(id).name) }] };
      for (const team of teams.filter((item) => item.activeStateIndexes.includes(index))) {
        (rooms[team.facility] ||= [])[team.stationIndexByStateIndex[index]] = {
          level: team.stationLevel,
          operators: team.operatorIds.map((id) => byId.get(id).name),
          ...(team.facility === "trading" ? { product: "龙门币" } : {}),
        };
      }
      return { name: `班${index + 1}`, duration: segment.durationHours * 60, rooms };
    }),
  }, { operatorProfiles: roster, operatorTable: Object.fromEntries(roster.map((operator) => [operator.charId, operator])) });
  const actualBefore = await calculateRiicEfficiency(buildSchedule(selectedRoomTeams));
  const actualAfter = await calculateRiicEfficiency(buildSchedule(after));
  const lmdOutput = (value) => value.dailyOutputs.find((item) => item.product === "龙门币" && item.kind === "production")?.amountPerDay;
  assert.ok(lmdOutput(actualAfter) > lmdOutput(actualBefore), "收益计算器应确认龙门币实际产出增加");
  assert.equal(optimization.optimizeRiicTradingTeamRotations({
    ...input,
    fiammettaRecovery: { enabled: true, targetOperatorId: "char_427_vigil" },
  }), tailFillResult, "不可改变菲亚梅塔目标的工作时段");
  const withoutTomori = {
    ...controlState,
    segments: controlState.segments.map((segment) => ({
      ...segment,
      operatorIds: segment.operatorIds.map((id) => id === "char_4186_tmoris" ? "char_1048_orchd2" : id),
    })),
  };
  assert.equal(optimization.optimizeRiicTradingTeamRotations({
    ...input,
    controlState: withoutTomori,
  }), tailFillResult, "没有收益提升时不应更换班次");
  assert.equal(optimization.optimizeRiicTradingTeamRotations({
    ...input,
    selectedRoomTeams: [...selectedRoomTeams, {
      groupId: "other", cohortId: "other", selectionKey: "other:0", teamIndex: 0,
      facility: "manufacture", product: "gold", stationLevel: 3, activeStateIndexes: [0],
      stationIndexByStateIndex: { 0: 0 }, operatorIds: ["char_427_vigil"],
    }],
  }), tailFillResult, "不得造成其他设施的同班冲突");

  const { alignRiicScheduleSameShiftBindings } = await vite.ssrLoadModule("/src/utils/riic/l74-same-shift-bindings.js");
  const { getRiicFiammettaScheduleUsage } = await vite.ssrLoadModule("/src/utils/riic/l65-fiammetta-recovery.js");
  const { buildRiicSchedulePreview } = await vite.ssrLoadModule("/src/utils/riicSchedulePreview.js");
  const { buildRiicMaaScheduleFromPreview } = await vite.ssrLoadModule("/src/utils/riicScheduleExport.js");
  const { buildRiicControlCenterRuntimeContext, getRiicControlCenterRoomAdjustment } = await vite.ssrLoadModule("/src/utils/riic/l51-control-effects.js");
  const context = buildRiicControlCenterRuntimeContext({ controlState });
  const roomGroups = [
    { id: "control", facility: "control", label: "中枢", count: 1 },
    { ...groups[0], label: "贸易站", count: 2 },
  ];
  const assembledEntries = [
    { group: roomGroups[0], candidate: { key: "control", segments: controlState.segments.map((segment) => ({
      durationHours: segment.durationHours,
      stationAssignments: [{ stationIndex: 0, stationLevel: 5, candidate: {
        controlCenterTeamIndex: segment.teamIndex, operatorIds: segment.operatorIds, operators: segment.operatorIds.map((id) => byId.get(id)),
      } }],
    })) } },
    { group: roomGroups[1], candidate: { key: "trade", segments: controlState.segments.map((segment, index) => ({
      durationHours: segment.durationHours,
      stationAssignments: after.filter((team) => team.facility === "trading" && team.activeStateIndexes.includes(index)).map((team) => ({
        stationIndex: team.stationIndexByStateIndex[index], stationLevel: team.stationLevel, expectedSlots: 3,
        candidate: {
          key: team.selectionKey, fallbackSelectionKey: team.selectionKey, operatorIds: team.operatorIds,
          operators: team.operatorIds.map((id) => byId.get(id)), candidateScope: { roomType: "trading", product: "lmd" },
          sameShiftBindings: getRiicControlCenterRoomAdjustment({ context, scope: { roomType: "trading", product: "lmd" }, operatorIds: team.operatorIds }).sameShiftBindings,
        },
      })),
    })) } },
  ];
  const alignment = alignRiicScheduleSameShiftBindings({ groupEntries: assembledEntries, ownedOperators: roster });
  const options = { alignment, ownedOperators: roster, fiammettaRecovery: input.fiammettaRecovery };
  const final = optimization.optimizeRiicAssembledTradingShifts(options);
  const finalTrade = final.groupEntries[1].candidate;
  const station = (segments, index, stationIndex) => segments[index].stationAssignments.find((assignment) => assignment.stationIndex === stationIndex);
  const idsAt = (index, stationIndex) => station(finalTrade.segments, index, stationIndex).candidate.operatorIds;
  assert.ok(idsAt(0, 0).includes("char_427_vigil") && idsAt(2, 0).includes("char_427_vigil"), "C、B 班均应对齐八幡海铃与伺夜");
  assert.ok(idsAt(0, 0).includes("char_4037_demetr") && idsAt(2, 0).includes("char_4037_demetr"), "C、B 班均应对齐贝洛内");
  assert.ok(!idsAt(1, 0).includes("char_427_vigil"), "A 班应使用另一贸易队");
  for (let index = 0; index < 3; index += 1) {
    assert.deepEqual(station(finalTrade.segments, index, 1), station(alignment.groupEntries[1].candidate.segments, index, 1), "另一贸易站应保持不变");
  }
  assert.equal(station(finalTrade.segments, 1, 0).candidate.fallbackSelectionKey, "station-1:1", "补位选择键应跟随队伍");
  const asScheduleCandidate = (value) => ({ groups: value.groupEntries.map(({ group, candidate: item }) => ({ groupId: group.id, candidate: item })) });
  assert.deepEqual(
    getRiicFiammettaScheduleUsage({ scheduleCandidate: asScheduleCandidate(final), targetOperatorId: "char_4032_provs" }).stateIndexes,
    getRiicFiammettaScheduleUsage({ scheduleCandidate: asScheduleCandidate(alignment), targetOperatorId: "char_4032_provs" }).stateIndexes,
    "菲亚梅塔目标的工作班次应保持不变",
  );
  const preview = buildRiicSchedulePreview({ scheduleCandidate: asScheduleCandidate(final), roomGroups });
  const exported = buildRiicMaaScheduleFromPreview({ preview, durationSource: "preview" }).schedule;
  const exportedTrading = exported.plans.map((plan) => plan.rooms.trading[0].operators);
  assert.ok(exportedTrading[0].includes("伺夜") && exportedTrading[2].includes("伺夜") && !exportedTrading[1].includes("伺夜"), "预览和 MAA 导出应使用最终班次");
  const calculateExport = async (schedule) => calculateRiicEfficiency(buildRiicEfficiencySchedule(schedule, {
    operatorProfiles: roster, operatorTable: Object.fromEntries(roster.map((operator) => [operator.charId, operator])),
  }));
  const beforePreview = buildRiicSchedulePreview({ scheduleCandidate: asScheduleCandidate(alignment), roomGroups });
  const beforeExport = buildRiicMaaScheduleFromPreview({ preview: beforePreview, durationSource: "preview" }).schedule;
  assert.ok(lmdOutput(await calculateExport(exported)) > lmdOutput(await calculateExport(beforeExport)), "收益计算器应确认最终班表产出提升");
  assert.equal(optimization.optimizeRiicAssembledTradingShifts({ ...options, fiammettaRecovery: { enabled: true, targetOperatorId: "char_427_vigil" } }), alignment, "不能移动菲亚梅塔目标");
  assert.equal(optimization.optimizeRiicAssembledTradingShifts({ ...options, lockedOperatorIds: ["char_427_vigil"] }), alignment, "不能移动锁定干员");
  assert.equal(optimization.optimizeRiicAssembledTradingShifts({ ...options, hasManualOverrides: true }), alignment, "存在手动编辑时不调整最终班表");
  const conflict = { group: { id: "conflict", facility: "manufacture", candidateProduct: "gold" }, candidate: { segments: controlState.segments.map((segment, index) => ({
    durationHours: segment.durationHours, stationAssignments: [{ stationIndex: 0, stationLevel: 3, candidate: { operatorIds: index === 2 ? ["char_427_vigil"] : [] } }],
  })) } };
  const conflictAlignment = { ...alignment, groupEntries: [...alignment.groupEntries, conflict] };
  assert.equal(optimization.optimizeRiicAssembledTradingShifts({ ...options, alignment: conflictAlignment }), conflictAlignment, "不能引入其他设施的同班冲突");
  console.log("RIIC trading team rotation checks passed.");
} finally {
  await vite.close();
}
