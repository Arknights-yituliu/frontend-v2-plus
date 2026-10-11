import assert from "node:assert/strict";
import { createServer } from "vite";

/**
 * 回收站补位优先级验收：
 * ① 房间自带补位（旅骨，真实技能倍率）优先；
 * ② 其次活跃名单挂件（结城理→S.E.E.S. 5 / 娜斯提→莱茵生命 3），按 roomPriority 降序；
 * ③ 挂件占用后（加工站/训练室先停靠）再按 R71 闲置档位兜底；
 * ④ 保存的 1% 兜底偏好不能压过前两档。
 */

const vite = await createServer({
  server: {
    middlewareMode: true,
  },
  appType: "custom",
});

try {
  globalThis.window = { innerWidth: 1024, addEventListener() {} };
  const { default: BuildingFactory } = await vite.ssrLoadModule(
    "/src/components/tools/BuildingFactory.vue",
  );
  const { createSSRApp, h } = await import("vue");
  const { renderToString } = await import("vue/server-renderer");
  const recycleRoomHtml = await renderToString(
    createSSRApp({
      render: () =>
        h(BuildingFactory, {
          roomType: "recycle",
          roomIndex: 0,
          operators: ["旅骨"],
        }),
    }),
  );
  assert.match(
    recycleRoomHtml,
    /bg-char_4232_hbound/,
    "V1 回收站应显示旅骨头像",
  );

  const { createRiicRoomGroupFallbackPlan } = await vite.ssrLoadModule(
    "/src/utils/riic/l63-fallback.js",
  );
  const { buildRiicTailFillResult, getRiicIdleFillOperators } = await vite.ssrLoadModule(
    "/src/utils/riic/l71-idle-fill.js",
  );
  const { buildRiicAutomaticRoomGroupSelections } = await vite.ssrLoadModule(
    "/src/utils/riic/l70-automatic-room-selection.js",
  );
  const { alignRiicScheduleSameShiftBindings } = await vite.ssrLoadModule(
    "/src/utils/riic/l74-same-shift-bindings.js",
  );
  const { getRiicActiveRosterHangerOrder, buildRiicActiveOperatorIdsBySelectionKey } =
    await vite.ssrLoadModule("/src/utils/riic/l65-active-roster-effects.js");

  const RECYCLE_FILL_ID = "char_4232_hbound"; // 旅骨，E1 → 拾荒者 +20%
  const MAKOTO_ID = "char_4217_makoto"; // 结城理（S.E.E.S. 挂件触发者）
  const AIGIS_ID = "char_4218_aigis"; // 埃癸斯（S.E.E.S.，roomPriority 5）
  const YUKARI_ID = "char_4219_yukari"; // 岳羽由加莉
  const KORMR_ID = "char_4220_kormr"; // 虎狼丸
  const NASTI_ID = "char_4212_nasti"; // 娜斯提（莱茵生命挂件触发者）
  const SILENT_ID = "char_108_silent"; // 赫默（莱茵生命，roomPriority 3）
  const ALANNA_ID = "char_4178_alanna"; // 阿兰娜（制造站技能，非挂件）
  const TWELVE_F_ID = "char_009_12fce"; // 12F（加工站/会客室技能，非挂件）
  const DURIN_ID = "char_501_durin"; // 杜林（纯宿舍技能 → R71 第一档）
  const BOB_ID = "char_487_bobb"; // 波卜（普通回收站补位）

  const roster = [
    { charId: MAKOTO_ID, name: "结城理", elite: 2, level: 60 },
    { charId: AIGIS_ID, name: "埃癸斯", elite: 0, level: 1 },
    { charId: YUKARI_ID, name: "岳羽由加莉", elite: 0, level: 1 },
    { charId: KORMR_ID, name: "虎狼丸", elite: 0, level: 30 },
    { charId: NASTI_ID, name: "娜斯提", elite: 2, level: 60 },
    { charId: SILENT_ID, name: "赫默", elite: 0, level: 1 },
    { charId: RECYCLE_FILL_ID, name: "旅骨", elite: 1, level: 70 },
    { charId: TWELVE_F_ID, name: "12F", elite: 0, level: 30 },
    { charId: ALANNA_ID, name: "阿兰娜", elite: 0, level: 1 },
    { charId: DURIN_ID, name: "杜林", elite: 0, level: 30 },
  ];
  const idleFillOperators = getRiicIdleFillOperators({ roster });
  const rosterById = new Map(roster.map((operator) => [operator.charId, operator]));

  // 与 l61 生成的回收站候选池一致：旅骨带真实技能倍率，其余每名持有干员
  // 都有一条 1% 的兜底条目（isDefaultFill 标记）。
  const recyclePoolOperators = roster.map((operator) =>
    operator.charId === RECYCLE_FILL_ID
      ? {
          charId: operator.charId,
          name: operator.name,
          percent: 20,
          basePercent: 20,
          effectivePercent: 20,
          fillPriority: 0,
          tags: [],
        }
      : {
          charId: operator.charId,
          name: operator.name,
          percent: 1,
          basePercent: 1,
          effectivePercent: 1,
          fillPriority: 0,
          tags: [],
          isDefaultFill: true,
        },
  );
  const recycleCandidate = {
    key: "recycle:all:3:2:fallback-only-1",
    candidateScope: { roomType: "recycle", product: "all" },
    operatorIds: [],
    fallback: {
      count: 2,
      percent: 1,
      poolKey: "recycle:all:3:2:fallback",
      candidateOperators: recyclePoolOperators,
      idleCandidateOperators: idleFillOperators,
      taggedMemberRequirements: [],
    },
  };

  function createRecyclePlan({
    activeOperatorIds = [],
    occupiedOperatorIds = null,
    excludedOperatorIds = [],
    preferredOperatorIdBySlotKey = undefined,
  } = {}) {
    const occupied = new Set(
      occupiedOperatorIds || activeOperatorIds,
    );
    const plan = createRiicRoomGroupFallbackPlan({
      selectedEntries: [
        { selectionKey: "level-3-slot-2:0", candidate: recycleCandidate },
      ],
      occupiedOperatorIds: occupied,
      excludedOperatorIds: new Set(excludedOperatorIds),
      ownedOperators: roster,
      activeOperatorIds,
      preferredOperatorIdBySlotKey,
    });
    return {
      plan,
      assignedOperatorIds: plan.slots.map((slot) => slot.assignedOperatorId),
    };
  }

  // ① 结城理当班 + 旅骨空闲 → 旅骨 + S.E.E.S. 挂件（埃癸斯优先于 12F/阿兰娜）。
  const caseA = createRecyclePlan({ activeOperatorIds: [MAKOTO_ID] });
  assert.deepEqual(
    caseA.assignedOperatorIds,
    [RECYCLE_FILL_ID, AIGIS_ID],
    "回收站应为 旅骨 + 埃癸斯，而不是按中文名抓人",
  );
  const caseAFill = caseA.plan.operators.find(
    (operator) => operator.charId === RECYCLE_FILL_ID,
  );
  assert.equal(caseAFill.percent, 20, "旅骨应保留真实回收站倍率");

  // ② 娜斯提当班 → 莱茵生命挂件；两人同时当班时 S.E.E.S.(5) 先于 莱茵生命(3)。
  const caseB = createRecyclePlan({ activeOperatorIds: [NASTI_ID] });
  assert.deepEqual(
    caseB.assignedOperatorIds,
    [RECYCLE_FILL_ID, SILENT_ID],
    "娜斯提当班时应停靠莱茵生命挂件",
  );
  const caseC = createRecyclePlan({
    activeOperatorIds: [MAKOTO_ID, NASTI_ID, SILENT_ID],
  });
  assert.deepEqual(
    caseC.assignedOperatorIds,
    [RECYCLE_FILL_ID, AIGIS_ID],
    "S.E.E.S.(5) 应排在莱茵生命(3) 之前",
  );
  const hangerOrder = getRiicActiveRosterHangerOrder({
    idleFillOperators,
    activeOperatorIds: [MAKOTO_ID, NASTI_ID],
  });
  const hangerPriorities = hangerOrder.map((candidate) => candidate.roomPriority);
  assert.deepEqual(
    hangerPriorities,
    [...hangerPriorities].sort((left, right) => right - left),
    "挂件顺序应按 roomPriority 降序",
  );
  assert.ok(
    hangerOrder.findIndex((candidate) => candidate.charId === AIGIS_ID) <
      hangerOrder.findIndex((candidate) => candidate.charId === SILENT_ID),
    "S.E.E.S.(5) 应排在莱茵生命(3) 之前",
  );
  const hangerOrderAfterTwoShifts = getRiicActiveRosterHangerOrder({
    idleFillOperators,
    activeOperatorIds: [MAKOTO_ID],
    stateUseCountByOperatorId: new Map([[AIGIS_ID, 2]]),
    maxStateUseCount: 2,
  });
  assert.equal(
    hangerOrderAfterTwoShifts.some((candidate) => candidate.charId === AIGIS_ID),
    false,
    "埃癸斯已占两班时应保留第三班空班，不再作为挂件停靠",
  );

  // ③ 挂件已经停靠在加工站/训练室（由页面通过 excludedOperatorIds 传入）→ 换下一个挂件。
  const caseD = createRecyclePlan({
    activeOperatorIds: [MAKOTO_ID],
    excludedOperatorIds: [AIGIS_ID],
  });
  assert.deepEqual(
    caseD.assignedOperatorIds,
    [RECYCLE_FILL_ID, KORMR_ID],
    "已停靠加工站的挂件不应再被回收站占用",
  );

  // ④ 主人不当班 → 没有挂件，落到 R71 最低档（纯宿舍技能）而不是名字靠前的干员。
  const caseE = createRecyclePlan({ activeOperatorIds: [] });
  assert.deepEqual(
    caseE.assignedOperatorIds,
    [RECYCLE_FILL_ID, DURIN_ID],
    "无挂件时应先取 R71 纯宿舍档，而不是 12F/阿兰娜",
  );
  const emptyShiftRosterPlan = createRiicRoomGroupFallbackPlan({
    selectedEntries: [
      {
        groupId: "recycle",
        selectionKey: "recycle-shift:0",
        candidate: recycleCandidate,
      },
    ],
    occupiedOperatorIds: new Set(),
    excludedOperatorIds: new Set(),
    ownedOperators: roster,
    activeOperatorIds: [MAKOTO_ID],
    activeOperatorIdsBySelectionKey: {
      "recycle:recycle-shift:0": [],
    },
  });
  assert.deepEqual(
    emptyShiftRosterPlan.slots.map((slot) => slot.assignedOperatorId),
    [RECYCLE_FILL_ID, DURIN_ID],
    "明确的空班名单不能退回整份排班的全局名单",
  );

  // ⑤ 保存的补位队列是 1% 兜底干员时，不能压过房间自带补位和挂件。
  const caseF = createRecyclePlan({
    activeOperatorIds: [MAKOTO_ID],
    preferredOperatorIdBySlotKey: {
      "level-3-slot-2:0:fallback:0": TWELVE_F_ID,
      "level-3-slot-2:0:fallback:1": ALANNA_ID,
    },
  });
  assert.deepEqual(
    caseF.assignedOperatorIds,
    [RECYCLE_FILL_ID, AIGIS_ID],
    "保存的 1% 偏好不应压过 旅骨/挂件",
  );

  // ⑥ 旅骨被别处占用 → 两个槽位都交给挂件（挂件不足才回落兜底）。
  const caseG = createRecyclePlan({
    activeOperatorIds: [MAKOTO_ID],
    occupiedOperatorIds: [MAKOTO_ID, RECYCLE_FILL_ID],
  });
  assert.deepEqual(
    caseG.assignedOperatorIds,
    [AIGIS_ID, KORMR_ID],
    "旅骨不可用时应填满两个挂件槽位",
  );

  // ⑦ 分班在岗：挂件只出现在它的主人当班的那一班。
  const shiftCohort = {
    id: "shift-cohort",
    rotationSegments: [
      { index: 0, activeTeamIndexes: [0], restingTeamIndexes: [1] },
      { index: 1, activeTeamIndexes: [1], restingTeamIndexes: [0] },
    ],
  };
  const recycleShiftCohort = {
    id: "level-3-slot-2",
    rotationSegments: [
      { index: 0, activeTeamIndexes: [0], restingTeamIndexes: [1] },
      { index: 1, activeTeamIndexes: [1], restingTeamIndexes: [0] },
    ],
  };
  const shiftEntry = (selectionKey, cohort, teamIndex, operatorIds = []) => ({
    selectionKey,
    cohort,
    teamIndex,
    candidate: {
      ...recycleCandidate,
      operatorIds,
    },
  });
  const activeOperatorIdsBySelectionKey =
    buildRiicActiveOperatorIdsBySelectionKey({
      selectedEntries: [
        shiftEntry("shift-cohort:0", shiftCohort, 0, [MAKOTO_ID]),
        shiftEntry("shift-cohort:1", shiftCohort, 1, [NASTI_ID]),
      ],
    });
  assert.deepEqual(
    activeOperatorIdsBySelectionKey["shift-cohort:0"],
    [MAKOTO_ID],
    "A 班在岗名单只应包含 A 班的干员",
  );
  assert.deepEqual(
    activeOperatorIdsBySelectionKey["shift-cohort:1"],
    [NASTI_ID],
    "B 班在岗名单只应包含 B 班的干员",
  );

  const shiftPlan = createRiicRoomGroupFallbackPlan({
    selectedEntries: [
      shiftEntry("level-3-slot-2:0", recycleShiftCohort, 0),
      shiftEntry("level-3-slot-2:1", recycleShiftCohort, 1),
    ],
    occupiedOperatorIds: new Set([MAKOTO_ID, NASTI_ID]),
    excludedOperatorIds: new Set(),
    ownedOperators: roster,
    activeOperatorIds: [MAKOTO_ID, NASTI_ID],
    activeOperatorIdsBySelectionKey: {
      "level-3-slot-2:0": [MAKOTO_ID],
      "level-3-slot-2:1": [NASTI_ID],
    },
  });
  assert.deepEqual(
    shiftPlan.slots.map((slot) => slot.assignedOperatorId),
    [RECYCLE_FILL_ID, AIGIS_ID, SILENT_ID, DURIN_ID],
    "结城理班只停 S.E.E.S.、娜斯提班只停莱茵生命，且不留空位",
  );

  // ⑧ 保存的补位队列只覆盖部分槽位（或队列里的人不可用）时，回收站仍要补满。
  const partialQueuePlan = createRiicRoomGroupFallbackPlan({
    selectedEntries: [shiftEntry("level-3-slot-2:0", recycleShiftCohort, 0)],
    occupiedOperatorIds: new Set([MAKOTO_ID]),
    excludedOperatorIds: new Set(),
    ownedOperators: roster,
    activeOperatorIds: [MAKOTO_ID],
    activeOperatorIdsBySelectionKey: { "level-3-slot-2:0": [MAKOTO_ID] },
    preferredOperatorIdBySlotKey: {
      "level-3-slot-2:0:fallback:0": TWELVE_F_ID,
    },
    allowAutomaticFill: true,
  });
  assert.ok(
    partialQueuePlan.slots.every((slot) => slot.assignedOperatorId),
    "队列只覆盖部分槽位时回收站仍应补满",
  );

  // ⑨ 其他房间不受影响：真实倍率仍然优先于闲置补位。
  const manufacturePlan = createRiicRoomGroupFallbackPlan({
    selectedEntries: [
      {
        selectionKey: "level-3-slot-3:0",
        candidate: {
          key: "manufacture:experience:3:3:fallback-only-1",
          candidateScope: { roomType: "manufacture", product: "experience" },
          operatorIds: [],
          fallback: {
            count: 2,
            percent: 0,
            poolKey: "manufacture:experience:3:3:fallback",
            candidateOperators: [
              { charId: TWELVE_F_ID, name: "12F", percent: 25 },
              { charId: ALANNA_ID, name: "阿兰娜", percent: 10 },
            ],
            idleCandidateOperators: idleFillOperators,
            taggedMemberRequirements: [],
          },
        },
      },
    ],
    occupiedOperatorIds: new Set(),
    excludedOperatorIds: new Set(),
    ownedOperators: roster,
    activeOperatorIds: [],
  });
  assert.deepEqual(
    manufacturePlan.slots.map((slot) => slot.assignedOperatorId),
    [TWELVE_F_ID, ALANNA_ID],
    "非回收站房间仍按倍率取补位",
  );

  const shiftSegments = [
    { index: 0, durationHours: 6, activeTeamIndexes: [0] },
    { index: 1, durationHours: 6, activeTeamIndexes: [] },
    { index: 2, durationHours: 12, activeTeamIndexes: [0] },
  ];
  const misalignedPowerSegments = [
    { index: 0, durationHours: 6, activeTeamIndexes: [1] },
    { index: 1, durationHours: 6, activeTeamIndexes: [0] },
    { index: 2, durationHours: 12, activeTeamIndexes: [1] },
  ];
  const alignedSchedule = buildRiicAutomaticRoomGroupSelections({
    groups: [
      { id: "manufacture", facility: "manufacture", candidateProduct: "experience" },
      { id: "power", facility: "power", candidateProduct: "all" },
    ],
    candidateStatesByGroupId: {
      manufacture: {
        status: "ready",
        cohorts: [
          {
            id: "manufacture-shift",
            teamCount: 1,
            rotationSegments: shiftSegments,
            candidates: [
              {
                key: "makoto-manufacture",
                candidateScope: { roomType: "manufacture", product: "experience" },
                sourceRoomType: "manufacture",
                operatorIds: [MAKOTO_ID],
              },
            ],
          },
        ],
      },
      power: {
        status: "ready",
        cohorts: [
          {
            id: "power-shift",
            teamCount: 2,
            rotationSegments: misalignedPowerSegments,
            candidates: [
              {
                key: "power-aigis",
                candidateScope: { roomType: "power", product: "all" },
                sourceRoomType: "power",
                operatorIds: [AIGIS_ID],
              },
              {
                key: "power-other",
                candidateScope: { roomType: "power", product: "all" },
                sourceRoomType: "power",
                operatorIds: ["ordinary-power"],
              },
            ],
          },
        ],
      },
    },
    selectionBeamLimit: 16,
    selectionOptionLimit: 16,
    selectionRepresentativeLimit: 16,
    selectionBatchSize: 1,
    fallbackPlanLimit: 1,
    // Isolate L70 selection priority from the later runtime-settlement score.
    ownedOperators: [],
  });
  const selectedAigisPowerTeam = alignedSchedule.selectedRoomTeams.find(
    (team) =>
      team.groupId === "power" && team.operatorIds.includes(AIGIS_ID),
  );
  assert.equal(
    selectedAigisPowerTeam?.selectionKey,
    "power-shift:1",
    "埃癸斯应跟结城理一起进 A/C 班发电站，而不是排在 B 班",
  );

  const meetingCandidate = {
    key: "meeting-kormr",
    candidateScope: { roomType: "meeting", product: "all" },
    operatorIds: [KORMR_ID],
  };
  const recycleShiftCandidate = {
    ...recycleCandidate,
    key: "recycle-shift-core",
    operatorIds: [RECYCLE_FILL_ID],
    fallback: {
      ...recycleCandidate.fallback,
      count: 1,
    },
  };
  const tailFillGroups = [
    { id: "manufacture", facility: "manufacture", candidateProduct: "experience" },
    { id: "power", facility: "power", candidateProduct: "all" },
    { id: "meeting", facility: "meeting", candidateProduct: "all" },
    { id: "recycle", facility: "recycle", candidateProduct: "all" },
  ];
  const tailFillStates = {
    manufacture: {
      status: "ready",
      cohorts: [
        {
          id: "manufacture-shift",
          teamCount: 1,
          rotationSegments: shiftSegments,
          candidates: [
            {
              key: "makoto-manufacture",
              candidateScope: { roomType: "manufacture", product: "experience" },
              operatorIds: [MAKOTO_ID],
            },
          ],
        },
      ],
    },
    power: {
      status: "ready",
      cohorts: [
        {
          id: "power-shift",
          teamCount: 2,
          rotationSegments: misalignedPowerSegments,
          candidates: [
            {
              key: "power-aigis",
              candidateScope: { roomType: "power", product: "all" },
              operatorIds: [AIGIS_ID],
            },
            {
              key: "power-other",
              candidateScope: { roomType: "power", product: "all" },
              operatorIds: ["ordinary-power"],
            },
          ],
        },
      ],
    },
    meeting: {
      status: "ready",
      cohorts: [
        {
          id: "meeting-shift",
          teamCount: 1,
          rotationSegments: shiftSegments,
          candidates: [meetingCandidate],
        },
      ],
    },
    recycle: {
      status: "ready",
      cohorts: [
        {
          id: "recycle-shift",
          teamCount: 2,
          rotationSegments: [
            { index: 0, activeTeamIndexes: [1] },
            { index: 1, activeTeamIndexes: [0] },
            { index: 2, activeTeamIndexes: [1] },
          ],
          candidates: [recycleShiftCandidate],
        },
      ],
    },
  };
  const tailFillResult = buildRiicTailFillResult({
    groups: tailFillGroups,
    candidateStatesByGroupId: tailFillStates,
    selections: {
      manufacture: { "manufacture-shift": ["makoto-manufacture"] },
      power: { "power-shift": alignedSchedule.selections.power["power-shift"] },
      meeting: { "meeting-shift": ["meeting-kormr"] },
      recycle: { "recycle-shift": ["recycle-shift-core", "recycle-shift-core"] },
    },
    ownedOperators: roster,
    idleFillOperators,
  });
  const recycleAssignments =
    tailFillResult.fallbackOperatorsBySelectionKeyByGroup.recycle;
  assert.deepEqual(
    recycleAssignments["recycle-shift:1"].map((operator) => operator.charId),
    [YUKARI_ID],
    "岳羽由加莉应留在结城理同班的 A/C 回收站",
  );
  assert.deepEqual(
    recycleAssignments["recycle-shift:0"].map((operator) => operator.charId),
    [DURIN_ID],
    "B 班没有结城理时，回收站应使用普通闲置干员而非跨房挂件",
  );

  const scheduleSegment = (durationHours, operatorIds = []) => ({
    durationHours,
    stationAssignments: [
      {
        candidate: { operatorIds },
      },
    ],
  });
  const alignedShiftSchedule = alignRiicScheduleSameShiftBindings({
    ownedOperators: [
      { charId: MAKOTO_ID, elite: 2 },
      { charId: AIGIS_ID, elite: 0 },
    ],
    groupEntries: [
      {
        group: { id: "control", facility: "control" },
        candidate: {
          segments: [
            scheduleSegment(12),
            scheduleSegment(6),
            scheduleSegment(6),
          ],
        },
      },
      {
        group: {
          id: "makoto-manufacture",
          facility: "manufacture",
          candidateProduct: "experience",
        },
        candidate: {
          key: "makoto-team",
          candidateScope: { roomType: "manufacture", product: "experience" },
          segments: [
            scheduleSegment(12, [MAKOTO_ID]),
            scheduleSegment(6, [MAKOTO_ID]),
            scheduleSegment(6),
          ],
        },
      },
      {
        group: {
          id: "aigis-power",
          facility: "power",
          candidateProduct: "all",
        },
        candidate: {
          key: "aigis-team",
          candidateScope: { roomType: "power", product: "all" },
          segments: [
            scheduleSegment(12),
            scheduleSegment(6, [AIGIS_ID]),
            scheduleSegment(6, [AIGIS_ID]),
          ],
        },
      },
      {
        group: { id: "recycle", facility: "recycle", candidateProduct: "all" },
        candidate: {
          key: "recycle-team-schedule",
          candidateScope: { roomType: "recycle", product: "all" },
          segments: [
            scheduleSegment(12, []),
            scheduleSegment(6, []),
            scheduleSegment(6, []),
          ].map((segment, index) => ({
            ...segment,
            stationAssignments: [
              {
                stationIndex: 0,
                candidate:
                  index === 2
                    ? {
                        key: "recycle-team-b",
                        operatorIds: [YUKARI_ID, BOB_ID],
                        operators: [
                          { charId: YUKARI_ID, name: "岳羽由加莉", idleFill: true },
                          { charId: BOB_ID, name: "波卜", idleFill: true },
                        ],
                        fallback: {
                          operators: [
                            {
                              charId: YUKARI_ID,
                              name: "岳羽由加莉",
                              idleFill: true,
                              hangerPriority: 5,
                            },
                            { charId: BOB_ID, name: "波卜", idleFill: true },
                          ],
                          fallbackOperatorIds: [YUKARI_ID, BOB_ID],
                        },
                      }
                    : {
                        key: "recycle-team-a",
                        operatorIds: [RECYCLE_FILL_ID, DURIN_ID],
                        operators: [
                          { charId: RECYCLE_FILL_ID, name: "旅骨" },
                          { charId: DURIN_ID, name: "杜林", idleFill: true },
                        ],
                        fallback: {
                          operators: [
                            { charId: RECYCLE_FILL_ID, name: "旅骨" },
                            { charId: DURIN_ID, name: "杜林", idleFill: true },
                          ],
                          fallbackOperatorIds: [RECYCLE_FILL_ID, DURIN_ID],
                        },
                      },
              },
            ],
          })),
        },
      },
    ],
  });
  const alignedAigisSegments = alignedShiftSchedule.groupEntries
    .find((entry) => entry.group.id === "aigis-power")
    .candidate.segments;
  assert.deepEqual(
    alignedAigisSegments.map((segment, index) =>
      segment.stationAssignments[0].candidate.operatorIds.includes(AIGIS_ID)
        ? index
        : -1,
    ).filter((index) => index >= 0),
    [0, 1],
    "L74 应把埃癸斯轮转对齐到结城理同班的 A/C，而不是 A/B",
  );
  const recycleTeamCandidates = alignedShiftSchedule.groupEntries
    .find((entry) => entry.group.id === "recycle")
    .candidate.segments.flatMap((segment) =>
      (segment.stationAssignments || []).map((assignment) => assignment.candidate),
    );
  const recycleTeamA = recycleTeamCandidates.find(
    (candidate) => candidate.key === "recycle-team-a",
  );
  const recycleTeamB = recycleTeamCandidates.find(
    (candidate) => candidate.key === "recycle-team-b",
  );
  assert.ok(
    recycleTeamA.fallback.operators.some(
      (operator) => operator.charId === YUKARI_ID,
    ),
    "A/C 回收站应把岳羽由加莉安排到结城理当班的班组",
  );
  assert.equal(
    recycleTeamB.fallback.operators.some(
      (operator) => operator.charId === YUKARI_ID,
    ),
    false,
    "B 班回收站不应继续安排岳羽由加莉挂件",
  );

  console.log("回收站补位优先级与 V1 旅骨头像检查通过");
  console.log(
    `旅骨=${rosterById.get(RECYCLE_FILL_ID)?.name} 挂件档位示例：${hangerOrder
      .map((candidate) => `${candidate.operator.name}:${candidate.roomPriority}`)
      .join(" > ")}`,
  );
} finally {
  delete globalThis.window;
  await vite.close();
}
