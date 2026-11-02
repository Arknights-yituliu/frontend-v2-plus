import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  const { alignRiicScheduleSameShiftBindings } = await vite.ssrLoadModule("/src/utils/riic/l74-same-shift-bindings.js");
  const { materializeRiicRoomTeamCandidate, mergeRiicIndividualRoomTeamCandidates } = await vite.ssrLoadModule("/src/utils/riic/l62-room-team-materializer.js");
  const segment = (durationHours, candidate) => ({
    durationHours,
    stationAssignments: [{ stationIndex: 0, candidate }],
  });
  const control = (index, operators) => ({
    controlCenterTeamIndex: index,
    operatorIds: operators,
  });
  const binding = (sourceTeamIndex) => ({
    sourceTeamIndex,
    roomType: "trading",
    product: "all",
    effects: [],
    bonusPercent: 20,
  });
  const target = {
    key: "delphine-trading",
    operatorIds: ["char_112_siege", "char_154_morgan"],
    sameShiftBindings: [binding(0), binding(1)],
  };
  const blackKey = { key: "ebenholz", operatorIds: ["char_4046_ebnhlz"] };
  const rosmontis = { key: "rosmontis", operatorIds: ["char_391_rosmon"] };
  const empty = { key: "empty", operatorIds: [] };
  const entries = [
    {
      group: { id: "control", facility: "control" },
      candidate: { segments: [segment(12, control(0, ["char_4110_delphn"])), segment(6, control(1, ["char_4110_delphn"])), segment(6, control(2, []))] },
    },
    {
      group: { id: "trade", facility: "trading", candidateProduct: "lmd" },
      candidate: { segments: [segment(12, target), segment(6, target), segment(6, blackKey)] },
    },
    {
      group: { id: "factory", facility: "manufacture", candidateProduct: "gold" },
      candidate: { segments: [segment(12, rosmontis), segment(6, empty), segment(6, empty)] },
    },
  ];
  const result = alignRiicScheduleSameShiftBindings({ groupEntries: entries });
  const trade = result.groupEntries[1].candidate;
  assert.deepEqual(
    trade.segments.map((item) => item.stationAssignments[0].candidate.key),
    ["delphine-trading", "delphine-trading", "ebenholz"],
    "迷迭香与黑键对齐不得牺牲戴菲恩的已有加成"
  );
  assert.equal(result.summary.find((item) => item.groupId === "trade").realizedWeightedBonus, 360);
  assert.equal(result.debug.preferredSameShift[0].finalSameShiftHours, 6);
  const tradeSummary = result.summary.find((item) => item.groupId === "trade");
  const tradeDebug = result.debug.groups.find((item) => item.groupId === "trade");
  assert.deepEqual(trade.sameShiftBindingSummary, tradeSummary);
  assert.deepEqual(tradeDebug.selected.trace, tradeSummary.trace);
  assert.equal(tradeDebug.selectedOffset, tradeSummary.rotationOffset);

  const noBindingEntries = entries.map((entry) =>
    entry.group.id === "trade"
      ? {
          ...entry,
          candidate: {
            segments: entry.candidate.segments.map((item) => ({
              ...item,
              stationAssignments: item.stationAssignments.map((assignment) => ({
                ...assignment,
                candidate: { ...assignment.candidate, sameShiftBindings: [] },
              })),
            })),
          },
        }
      : entry
  );
  const noBindingResult = alignRiicScheduleSameShiftBindings({ groupEntries: noBindingEntries });
  assert.equal(noBindingResult.debug.preferredSameShift[0].finalSameShiftHours, 12);

  const makoto = "char_4217_makoto";
  const aigis = "char_4218_aigis";
  const yukari = "char_4219_yukari";
  const durin = "char_501_durin";
  const idle = (charId, extra = {}) => ({ charId, idleFill: true, ...extra });
  const recycleTeam = (key, operator) => ({
    key,
    operatorIds: [operator.charId],
    operators: [operator],
    fallback: { operators: [operator], fallbackOperatorIds: [operator.charId] },
  });
  const rosterEntries = [
    entries[0],
    {
      group: { id: "manufacture", facility: "manufacture", candidateProduct: "gold" },
      candidate: {
        segments: [segment(12, { ...rosmontis, operatorIds: ["char_391_rosmon", makoto] }), segment(6, { operatorIds: [makoto] }), segment(6, empty)],
      },
    },
    {
      group: { id: "power", facility: "power", candidateProduct: "all" },
      candidate: { segments: [segment(12, empty), segment(6, { operatorIds: [aigis] }), segment(6, { operatorIds: [aigis] })] },
    },
    {
      group: { id: "recycle", facility: "recycle", candidateProduct: "all" },
      candidate: {
        segments: [
          segment(12, recycleTeam("recycle-a", idle(durin))),
          segment(6, recycleTeam("recycle-a", idle(durin))),
          segment(6, recycleTeam("recycle-b", idle(yukari, { hangerPriority: 5 }))),
        ],
      },
    },
  ];
  const ownedOperators = [
    { charId: makoto, elite: 2 },
    { charId: aigis, elite: 0 },
  ];
  const rosterResult = alignRiicScheduleSameShiftBindings({
    groupEntries: rosterEntries,
    ownedOperators,
  });
  const powerSegments = rosterResult.groupEntries.find((item) => item.group.id === "power").candidate.segments;
  assert.deepEqual(
    powerSegments.map((item) => item.stationAssignments[0].candidate.operatorIds.includes(aigis)),
    [true, true, false]
  );
  const recycleSegments = rosterResult.groupEntries.find((item) => item.group.id === "recycle").candidate.segments;
  assert.equal(recycleSegments[0].stationAssignments[0].candidate.operatorIds[0], yukari);
  assert.equal(recycleSegments[2].stationAssignments[0].candidate.operatorIds[0], durin);

  const makeIndividual = (key, operator) => materializeRiicRoomTeamCandidate({
    key, sourceRoomType: "recycle", candidateScope: { roomType: "recycle" },
    fallback: { count: 1 },
  }, [operator]);
  const individualTeams = [
    makeIndividual("hanger", idle(yukari, { hangerPriority: 5 })),
    makeIndividual("idle-a", idle(durin)),
    makeIndividual("idle-b", idle("char_009_12fce")),
  ];
  const individualRecycle = {
    group: { id: "recycle", facility: "recycle", candidateProduct: "all" },
    candidate: { segments: [[0, 1], [1, 2], [2, 0]].map((indexes) =>
      segment(8, mergeRiicIndividualRoomTeamCandidates(indexes.map((index) => individualTeams[index]))),
    ) },
  };
  const individualOwner = {
    group: { id: "manufacture", facility: "manufacture", candidateProduct: "gold" },
    candidate: { segments: [segment(8, empty), segment(8, { operatorIds: [makoto] }), segment(8, empty)] },
  };
  const individualResult = alignRiicScheduleSameShiftBindings({
    groupEntries: [entries[0], individualOwner, individualRecycle], ownedOperators,
  });
  const individualSegments = individualResult.groupEntries[2].candidate.segments;
  const individualIds = individualSegments.map((item) => item.stationAssignments[0].candidate.operatorIds);
  assert.ok(individualIds[1].includes(yukari), "单人轮换挂件应与触发干员同班");
  assert.ok(individualIds.every((ids) => ids.length === 2 && new Set(ids).size === 2));
  for (const id of [yukari, durin, "char_009_12fce"]) {
    assert.equal(individualIds.filter((ids) => ids.includes(id)).length, 2);
  }
  const lockedIndividualResult = alignRiicScheduleSameShiftBindings({
    groupEntries: [entries[0], individualOwner, individualRecycle], ownedOperators,
    lockedOperatorIds: [yukari],
  });
  assert.ok(!lockedIndividualResult.groupEntries[2].candidate.segments[1].stationAssignments[0].candidate.operatorIds.includes(yukari));
  const conflictEntry = {
    group: { id: "meeting", facility: "meeting" },
    candidate: { segments: [segment(8, empty), segment(8, { operatorIds: [yukari] }), segment(8, empty)] },
  };
  const conflictResult = alignRiicScheduleSameShiftBindings({
    groupEntries: [entries[0], individualOwner, individualRecycle, conflictEntry], ownedOperators,
  });
  assert.ok(!conflictResult.groupEntries[2].candidate.segments[1].stationAssignments[0].candidate.operatorIds.includes(yukari));

  const protectedRoster = alignRiicScheduleSameShiftBindings({
    groupEntries: [
      entries[0],
      entries[1],
      rosterEntries[1],
      {
        ...rosterEntries[2],
        candidate: { segments: [segment(12, { operatorIds: [aigis] }), segment(6, { operatorIds: [aigis] }), segment(6, empty)] },
      },
    ],
    ownedOperators,
  });
  assert.equal(protectedRoster.debug.preferredSameShift[0].finalSameShiftHours, 0);
  assert.equal(protectedRoster.debug.activeRosterAlignment[0].finalBonusPercentHours, 18 * 15);
  assert.deepEqual(
    protectedRoster.groupEntries
      .find((item) => item.group.id === "manufacture")
      .candidate.segments.map((item) => item.stationAssignments[0].candidate.operatorIds.includes(makoto)),
    [true, true, false]
  );

  const negativeEntries = entries.map((entry) =>
    entry.group.id === "trade"
      ? {
          ...entry,
          candidate: {
            segments: entry.candidate.segments.map((item) => ({
              ...item,
              stationAssignments: item.stationAssignments.map((assignment) => ({
                ...assignment,
                candidate: {
                  ...assignment.candidate,
                  sameShiftBindings: (assignment.candidate.sameShiftBindings || []).map((item) => ({ ...item, bonusPercent: -20 })),
                },
              })),
            })),
          },
        }
      : entry
  );
  const negativeResult = alignRiicScheduleSameShiftBindings({ groupEntries: negativeEntries });
  assert.equal(negativeResult.summary.find((item) => item.groupId === "trade").realizedWeightedBonus, -360);
  assert.equal(negativeResult.debug.preferredSameShift[0].finalSameShiftHours, 6);

  assert.equal(alignRiicScheduleSameShiftBindings({ groupEntries: [] }).debug.status, "missingControlCandidate");
  console.log("RIIC shift alignment checks passed.");
} finally {
  await vite.close();
}
