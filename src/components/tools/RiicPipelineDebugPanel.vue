<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  groups: {
    type: Array,
    default: () => [],
  },
  candidateStatesByGroupId: {
    type: Object,
    default: () => ({}),
  },
  layer3RuleChecks: {
    type: Array,
    default: () => [],
  },
  controlState: {
    type: Object,
    default: () => ({}),
  },
  controlFinalState: {
    type: Object,
    default: () => ({}),
  },
  controlScenarioTrialState: {
    type: Object,
    default: () => ({}),
  },
  perceptionResourceTrialState: {
    type: Object,
    default: () => ({}),
  },
  controlOperatorEffectDebugState: {
    type: Object,
    default: () => ({}),
  },
  fallbackPlansByGroupId: {
    type: Object,
    default: () => ({}),
  },
  preAssemblyGroupCandidates: {
    type: Array,
    default: () => [],
  },
  assembledScheduleCandidate: {
    type: Object,
    default: null,
  },
  sameShiftBindingDebug: {
    type: Object,
    default: () => ({}),
  },
  fiammettaRecovery: {
    type: Object,
    default: () => ({}),
  },
  fiammettaControlUsage: {
    type: Object,
    default: () => ({}),
  },
  automaticGenerationDebugState: {
    type: Object,
    default: null,
  },
  operatorTable: {
    type: Object,
    default: () => ({}),
  },
  roster: {
    type: Array,
    default: () => [],
  },
  operatorSourceLabel: {
    type: String,
    default: "",
  },
  trainingMode: {
    type: String,
    default: "current",
  },
  idealTrainingRaritySelection: {
    type: Object,
    default: () => ({}),
  },
  actualScheduleMetrics: {
    type: Object,
    default: null,
  },
  schedulePreview: {
    type: Object,
    default: null,
  },
  l79Input: {
    type: Object,
    default: null,
  },
  l79Settlement: {
    type: Object,
    default: null,
  },
  scheduleShifts: {
    type: Array,
    default: () => [],
  },
  duplicateOperatorChecks: {
    type: Array,
    default: () => [],
  },
  formatLayer3OperatorCondition: {
    type: Function,
    required: true,
  },
  formatLayer3FacilityCondition: {
    type: Function,
    required: true,
  },
  formatLayer3RuleEffect: {
    type: Function,
    required: true,
  },
});

const groupRows = computed(() =>
  props.groups.map((group) => ({
    group,
    state: props.candidateStatesByGroupId[group.id] || { status: "idle" },
  })),
);

const matchedLayer3Rules = computed(() =>
  props.layer3RuleChecks.filter((rule) => rule.matched),
);
const rosterRows = computed(() =>
  (props.roster || [])
    .map((operator) => {
      const charId = String(operator?.charId || "").trim();
      return {
        charId,
        name: String(
          operator?.name || props.operatorTable?.[charId]?.name || charId,
        ).trim(),
        rarity: Number(operator?.rarity),
        elite: Number(operator?.elite),
        level: Number(operator?.level),
      };
    })
    .filter((operator) => operator.charId && operator.name)
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, "zh-CN") ||
        left.charId.localeCompare(right.charId, "en"),
    ),
);

const l79SettlementRoomRows = computed(() =>
  (props.l79Settlement?.states || []).flatMap((state, stateIndex) =>
    (state?.rooms || []).map((room) => ({
      ...room,
      stateIndex,
    })),
  ),
);

function getOperatorName(charId) {
  const operatorId = String(charId || "").trim();
  return props.operatorTable?.[operatorId]?.name || operatorId || "--";
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${Number.isInteger(number) ? number : number.toFixed(1)}%`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatL79Flow(flow) {
  const labels = {
    lmd: "龙门币",
    exp: "经验",
    gold: "赤金",
    vgold: "虚拟赤金",
    orundum: "合成玉",
    shard: "源石碎片",
    orirock: "固源岩",
    device: "装置",
    recruitmentRefresh: "公招刷新",
  };
  return (
    Object.entries(flow || {})
      .filter(
        ([, value]) =>
          Number.isFinite(Number(value)) && Number(value) !== 0,
      )
      .map(
        ([key, value]) =>
          `${labels[key] || key} ${formatNumber(value)}`,
      )
      .join("；") || "无"
  );
}

function formatJson(value) {
  return JSON.stringify(value || {}, null, 2);
}

const copyStatus = ref("");

function formatDebugOperatorIds(operatorIds) {
  const ids = [
    ...new Set(
      (operatorIds || [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    ),
  ];
  return ids.length
    ? ids.map((operatorId) => `${getOperatorName(operatorId)}(${operatorId})`).join("、")
    : "--";
}

function formatDebugNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "--";
}

function getL73StatusLabel(status) {
  return (
    {
      ready: "已完成",
      waitingForRoomSelection: "等待房间组选择完成",
      unavailable: "不可用",
      missingCapacity: "中枢容量不足",
    }[status] || status || "未执行"
  );
}

function getL73ActionLabel(action) {
  return (
    {
      kept: "保留",
      removed: "撤下",
    }[action] || action || "未判断"
  );
}

function getL73ReasonLabel(reason) {
  return (
    {
      manual: "手动加入中枢，强制保留",
      notApplicable: "不属于本次可撤换的指定干员效果",
      targetRealized: "已抓到关联干员",
      targetMissing: "未抓到关联干员",
    }[reason] || reason || "未记录原因"
  );
}

function getL70RuntimeStatusLabel(status) {
  return (
    {
      starting: "准备中",
      running: "运行中",
      completed: "已完成",
      error: "异常结束",
    }[status] || status || "--"
  );
}

function getSameShiftDebugReasonLabel(reason) {
  return (
    {
      baseline: "基准偏移",
      moreCoreTeamSynergy: "核心组合直接收益更高",
      lessCoreTeamSynergy: "核心组合直接收益更低",
      moreBindingHours: "有效绑定时长更长",
      sameHoursMoreBonus: "有效时长相同但加成更高",
      sameHoursNotMoreBonus: "有效时长相同且加成未提高",
      lessBindingHours: "有效绑定时长更短",
      missingCandidate: "没有房间候选",
      controlCenter: "控制中枢本身不参与旋转",
      singleSegment: "只有一个班段，无法旋转",
      lockedOperator: "包含资源链锁定干员，禁止旋转",
      noCandidateBinding: "L61/L62 未携带同班绑定",
    }[reason] || reason || "--"
  );
}

function appendControlState(lines, label, state) {
  lines.push(`${label}: ${state?.status || "--"}`);
  for (const team of state?.teams || []) {
    lines.push(
      `  中枢班${Number(team?.teamIndex || 0) + 1}: 房间效果=[${formatDebugOperatorIds(
        (team?.roomEffectOperators || []).map((operator) => operator?.charId),
      )}] 干员效果=[${formatDebugOperatorIds(
        (team?.operatorEffectOperators || []).map((operator) => operator?.charId),
      )}] 补位=[${formatDebugOperatorIds(
        (team?.fillerOperators || []).map((operator) => operator?.charId),
      )}]`,
    );
  }
}

function appendRotationLines(lines, label, entry) {
  lines.push(`${label}: ${entry?.groupLabel || entry?.groupId || "--"}`);
  if (!entry?.candidate) {
    lines.push("  无候选");
    return;
  }
  for (const segment of entry.candidate.segments || []) {
    for (const assignment of segment.stationAssignments || []) {
      const candidate = assignment?.candidate || {};
      lines.push(
        `  班段${Number(segment?.index || 0) + 1}(${formatDebugNumber(
          segment?.durationHours,
        )}h) 站点${Number(assignment?.stationIndex || 0) + 1}: ${
          candidate.name || candidate.key || "--"
        } 干员=[${formatDebugOperatorIds(candidate.operatorIds)}] 同班绑定=${
          (candidate.sameShiftBindings || []).length
        }`,
      );
    }
  }
}

function appendSameShiftTrace(lines, trace, prefix = "    ") {
  for (const item of trace || []) {
    lines.push(
      `${prefix}时段${formatDebugNumber(item.startHour)}-${formatDebugNumber(
        Number(item.startHour || 0) + Number(item.durationHours || 0),
      )}h 目标=[${formatDebugOperatorIds(item.operatorIds)}] ` +
        `控制班=${item.controlTeamIndex === null ? "--" : Number(item.controlTeamIndex) + 1} ` +
        `控制干员=[${formatDebugOperatorIds(item.controlOperatorIds)}] ` +
        `绑定=${item.realizedBindingCount}/${item.candidateBindingCount} ` +
        `状态=${item.status} 加成=${formatDebugNumber(
          item.realizedBonusPercent,
        )}%`,
    );
  }
}

const pipelineDebugText = computed(() => {
  const lines = [
    "RIIC 排班计算链路调试信息",
    `数据源: ${props.operatorSourceLabel || "--"}`,
    `练度模式: ${props.trainingMode || "--"}`,
    "",
    "[L50] 初始控制中枢",
  ];
  appendControlState(lines, "L50 初始中枢", props.controlState);
  appendControlState(lines, "L50 补位后中枢", props.controlFinalState);

  lines.push("", "[L51] 中枢效果");
  const controlEffects = props.controlOperatorEffectDebugState?.effects || [];
  if (controlEffects.length === 0) {
    lines.push("无已计算的中枢定向效果");
  } else {
    for (const effect of controlEffects) {
      lines.push(
        `中枢班${Number(effect?.teamIndex || 0) + 1} -> ${
          getOperatorName(effect?.targetOperatorId)
        } 总加成=${formatDebugNumber(effect?.totalBonusPercent)}%`,
      );
      for (const contribution of effect.contributions || []) {
        lines.push(
          `  步骤${contribution.step}: 来源=[${formatDebugOperatorIds(
            contribution.sourceOperatorIds,
          )}] 加成=${formatDebugNumber(contribution.bonusPercent)}%`,
        );
      }
    }
  }

  lines.push("", "[L61] 候选绑定");
  for (const group of props.groups || []) {
    const state = props.candidateStatesByGroupId?.[group.id] || {};
    lines.push(`房间组 ${group.label || group.id}: ${state.status || "--"}`);
    for (const cohort of state.cohorts || []) {
      const candidates = cohort.debug?.l61?.candidates || cohort.candidates || [];
      lines.push(`  班组 ${cohort.id}: 候选数=${candidates.length}`);
      for (const candidate of candidates) {
        lines.push(
          `    ${candidate.name || candidate.key || "--"} 干员=[${formatDebugOperatorIds(
            candidate.operatorIds,
          )}] 总值=${formatDebugNumber(
            candidate.totalPercent ?? candidate.corePercent,
          )}%`,
        );
      }
    }
  }

  lines.push("", "[L62/L63] 班组物化与补位");
  for (const entry of props.preAssemblyGroupCandidates || []) {
    appendRotationLines(lines, "房间组", entry);
  }
  for (const [groupId, plan] of Object.entries(props.fallbackPlansByGroupId || {})) {
    lines.push(
      `补位 ${groupId}: 已选=[${formatDebugOperatorIds(
        plan?.selectedOperatorIds,
      )}]`,
    );
    for (const assignment of getFallbackAssignments(plan)) {
      lines.push(`  ${assignment.slotKey} -> ${getOperatorName(assignment.charId)}`);
    }
  }

  lines.push("", "[L70/L71/L72/L73] 自动组装");
  const automatic = props.automaticGenerationDebugState;
  if (!automatic) {
    lines.push("尚未执行自动组装");
  } else {
    lines.push(
      `L70 策略=${automatic.strategy || "--"} 最佳评分=${formatDebugNumber(
        automatic.l70?.bestPlan?.rankingValue,
      )}`,
    );
    const sameShiftPriority =
      automatic.l70?.bestPlan?.sameShiftPriority || null;
    if (sameShiftPriority) {
      lines.push(
        `  中枢同班引导: 有效绑定=${formatDebugNumber(
          sameShiftPriority.realizedBindingHours,
        )}/${formatDebugNumber(
          sameShiftPriority.expectedBindingHours,
        )}h 评分修正=${formatDebugNumber(
          sameShiftPriority.rankingCorrection,
        )}%`,
      );
      for (const summary of sameShiftPriority.summaries || []) {
        lines.push(
          `    ${summary.groupId}/${summary.cohortId}/班${Number(
            summary.teamIndex || 0,
          ) + 1} ${summary.candidateName || "--"}：实际=${formatDebugNumber(
            summary.realizedBonusPercent,
          )}% 预估=${formatDebugNumber(
            summary.expectedBonusPercent,
          )}% 修正=${formatDebugNumber(
            summary.rankingCorrection,
          )}% 绑定=${formatDebugNumber(
            summary.realizedBindingHours,
          )}/${formatDebugNumber(summary.expectedBindingHours)}h`,
        );
      }
    }
    for (const selection of automatic.l70?.bestPlan?.selections || []) {
      lines.push(
        `  ${selection.groupId}/${selection.cohortId}/${selection.candidateKey} 干员=[${formatDebugOperatorIds(
          selection.operatorIds,
        )}]`,
      );
    }
    lines.push(
      `L72 decision=${automatic.l72?.decision || "--"} 原核心=[${formatDebugOperatorIds(
        automatic.l72?.selectedCoreOperatorIds,
      )}] 最终核心=[${formatDebugOperatorIds(
        automatic.l72?.adoptedCoreOperatorIds,
      )}]`,
    );
    lines.push("", "[L73] 中枢撤换与补位");
    const reconciliation = automatic.l73;
    if (!reconciliation) {
      lines.push("尚未执行 L73");
    } else {
      lines.push(`状态=${getL73StatusLabel(reconciliation.status)}`);
      if (reconciliation.decisions?.length) {
        lines.push("判断结果：");
        for (const decision of reconciliation.decisions) {
          lines.push(
            `  班${Number(decision.teamIndex || 0) + 1} ${getOperatorName(
              decision.operatorId,
            )}(${decision.operatorId || "--"})：${getL73ActionLabel(
              decision.action,
            )}，${getL73ReasonLabel(decision.reason)}`,
          );
        }
      } else {
        lines.push("没有可记录的中枢干员判断");
      }
      const removedEntries = Object.entries(
        reconciliation.removedOperatorIdsByTeamIndex || {},
      );
      if (removedEntries.length) {
        lines.push("各班撤下：");
        for (const [teamIndex, operatorIds] of removedEntries) {
          lines.push(
            `  班${Number(teamIndex) + 1}=[${formatDebugOperatorIds(
              operatorIds,
            )}]`,
          );
        }
      } else {
        lines.push("各班撤下：无");
      }
      const lateFillEntries = reconciliation.lateFillState?.teamEntries || [];
      if (lateFillEntries.length) {
        lines.push("撤换后补位：");
        for (const entry of lateFillEntries) {
          lines.push(
            `  班${Number(entry.teamIndex || 0) + 1} 补位=[${formatDebugOperatorIds(
              entry.operatorIds,
            )}] 空位=${formatDebugNumber(entry.emptySlotCount)}`,
          );
        }
      } else {
        lines.push("撤换后补位：无");
      }
    }
  }

  lines.push("", "[L74] 同班绑定对齐");
  const sameShift = props.sameShiftBindingDebug || {};
  lines.push(`状态=${sameShift.status || "--"}`);
  lines.push(
    `控制中枢班段: ${
      (sameShift.control?.segments || [])
        .map(
          (segment) =>
            `班${Number(segment?.teamIndex || 0) + 1}(${formatDebugNumber(
              segment?.durationHours,
            )}h)=[${formatDebugOperatorIds(segment?.operatorIds)}]`,
        )
        .join("；") || "--"
    }`,
  );
  for (const group of sameShift.groups || []) {
    lines.push(
      `房间组 ${group.groupLabel || group.groupId}: 候选=${group.candidateKey || "--"} ` +
        `跳过=${group.skipReason || "否"} 最终偏移=${formatDebugNumber(
          group.selectedOffset,
        )}`,
    );
    for (const attempt of group.attempts || []) {
      lines.push(
        `  尝试偏移${attempt.offset}: 核心组合=${formatDebugNumber(
          attempt.coreTeamSynergyWeightedBonus,
        )}%·h 有效时长=${formatDebugNumber(
          attempt.realizedBindingHours,
        )}/${formatDebugNumber(
          attempt.expectedBindingHours,
        )}h 加成=${formatDebugNumber(
          attempt.realizedWeightedBonus,
        )}% 比较=${attempt.acceptedAtComparison ? "临时采用" : "放弃"} ` +
          `最终=${attempt.selected ? "采用" : "未采用"} 原因=${getSameShiftDebugReasonLabel(
            attempt.reason,
          )}`,
      );
      appendSameShiftTrace(lines, attempt.trace);
    }
    if (group.selected) {
      lines.push(
        `  最终: 核心组合=${formatDebugNumber(
          group.selected.coreTeamSynergyWeightedBonus,
        )}%·h 有效时长=${formatDebugNumber(
          group.selected.realizedBindingHours,
        )}/${formatDebugNumber(
          group.selected.expectedBindingHours,
        )}h 加成=${formatDebugNumber(group.selected.realizedWeightedBonus)}%`,
      );
      appendSameShiftTrace(lines, group.selected.trace);
    }
  }
  for (const pair of sameShift.preferredSameShift || []) {
    lines.push(
      `同班偏好 ${pair.leftLabel || "--"} + ${pair.rightLabel || "--"}: ` +
        `状态=${pair.status || "--"} 初始同班=${formatDebugNumber(
          pair.initialSameShiftHours,
        )}h 最终同班=${formatDebugNumber(
          pair.finalSameShiftHours,
        )}h 迷迭香偏移=${formatDebugNumber(
          pair.leftOffset,
        )} 黑键偏移=${formatDebugNumber(pair.rightOffset)}`,
    );
  }

  lines.push("", "[最终排班]");
  for (const entry of props.assembledScheduleCandidate?.groups || []) {
    appendRotationLines(lines, "房间组", {
      groupId: entry.groupId,
      groupLabel: entry.groupLabel,
      candidate: entry.candidate,
    });
  }
  for (const [stateIndex, state] of (props.schedulePreview?.states || []).entries()) {
    lines.push(
      `班次${stateIndex + 1} ${state?.startHour || 0}h 起 ${state?.durationHours || 0}h`,
    );
    for (const room of state.rooms || []) {
      lines.push(
        `  ${room.label || room.groupId || room.key}: [${formatDebugOperatorIds(
          getCandidateOperatorIds({ operators: room.operators }),
        )}]`,
      );
    }
  }

  return lines.join("\n");
});

async function copyPipelineDebugText() {
  const text = pipelineDebugText.value;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    copyStatus.value = "已复制";
  } catch {
    copyStatus.value = "复制失败，请手动全选文本";
  }
}

function formatYield(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function getYieldAssumptionText(value) {
  return (
    {
      level3ProductionRoomsOnly: "制造站和贸易站仅结算三级设施。",
      l79EfficiencyAndShiftDuration: "按 L79 最终效率与班次时长换算。",
      officeNetRefreshAboveBaseContactSpeed:
        "公招净刷新只计办公室相对基础速度增加的部分。",
      goldNetAfterLmdTradeConsumption:
        "净赤金为制造产出减去龙门币贸易订单消耗。",
      lmdGrossNoCollectionOrDrones:
        "龙门币为毛产能，未结算库存、收菜频率与无人机。",
      tradingSpecialOrderResourceStreams:
        "贸易站已拆分普通订单、但书/龙舌兰订单与可露希尔特别订单的龙门币、赤金消耗和虚拟赤金。",
      droneChargeFromFinalPowerRoster:
        "无人机按最终发电站在岗干员的每人 +5% 与 L79 后勤技能加成计算；基础充能为每 6 分钟 1 架，未分配至具体设施。",
    }[value] || ""
  );
}

function getYieldResourceDetail(resource) {
  return resource?.detail || `${resource?.calculatedRoomCount || 0} / ${
    resource?.roomCount || 0
  } 间已计算`;
}

function getStatusLabel(status) {
  return (
    {
      ready: "就绪",
      idle: "未开始",
      requiresOperators: "缺少干员",
      missingCapacity: "缺少设施容量",
      catalogNotLoaded: "候选库未加载",
      catalogLoading: "候选库加载中",
      catalogLoadFailed: "候选库加载失败",
      outOfScope: "不在候选范围",
      manualControl: "手动控制",
    }[status] || status || "未知"
  );
}

function getCandidateNames(operatorIds) {
  return (operatorIds || []).map(getOperatorName).join("、") || "无固定成员";
}

function getCandidateOperatorIds(candidate) {
  return [
    ...new Set(
      [
        ...(candidate?.operatorIds || []),
        ...(candidate?.operators || []).map((operator) => operator?.charId),
      ]
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function getCandidateOperatorNames(candidate) {
  return getCandidateNames(getCandidateOperatorIds(candidate));
}

function getRotationAssignments(candidate) {
  return (candidate?.segments || []).flatMap((segment) =>
    (segment?.stationAssignments || []).map((assignment) => ({
      segmentIndex: Number(segment?.index || 0),
      durationHours: Number(segment?.durationHours || 0),
      stationIndex: Number(assignment?.stationIndex || 0),
      stationLevel: assignment?.stationLevel || null,
      activeTeamIndexes: assignment?.activeTeamIndexes || [],
      operatorIds: getCandidateOperatorIds(assignment?.candidate),
    })),
  );
}

function getFallbackAssignments(plan) {
  return Object.entries(plan?.operatorIdBySlotKey || {}).map(
    ([slotKey, charId]) => ({
      slotKey,
      charId,
    }),
  );
}

function getL72DecisionLabel(decision) {
  return (
    {
      alreadyComplete: "两名核心均已进入常规排班",
      noEligibleCandidate: "没有可替换的核心候选位",
      improved: "试算收益更高，已采用",
      notImproved: "最佳试算未超过原方案，未采用",
    }[decision] || "未执行"
  );
}

function getL72ReplacementLabel(replacement) {
  const group = props.groups.find(
    (item) => item.id === replacement?.groupId,
  );
  const cohort = props.candidateStatesByGroupId?.[
    replacement?.groupId
  ]?.cohorts?.find((item) => item.id === replacement?.cohortId);
  const candidate = (cohort?.candidates || []).find(
    (item) => item.key === replacement?.candidateKey,
  );

  return [
    group?.label || replacement?.groupId || "--",
    cohort?.id || replacement?.cohortId || "--",
    `班组 ${Number(replacement?.teamIndex || 0) + 1}`,
    candidate?.name || replacement?.candidateKey || "--",
  ].join(" / ");
}

function formatActualSchedulePercent(value) {
  return formatPercent(value);
}

function getActualScheduleFacilityLabel(facility) {
  return (
    {
      trading: "贸易站",
      manufacture: "制造站",
      meeting: "会客室",
      hire: "办公室",
      office: "办公室",
      power: "发电站",
      dormitory: "宿舍",
      training: "训练室",
    }[facility] || facility
  );
}

function getActualScheduleCalculationLabel(status) {
  return (
    {
      calculated: "已计算",
      manuallyEdited: "手动调整后待重算",
      unavailable: "暂无效率值",
    }[status] || "暂无效率值"
  );
}

function getSameShiftBindingStatusLabel(status) {
  return (
    {
      realized: "中枢同班已生效",
      unrealized: "中枢同班未生效",
      unavailable: "中枢队伍不可用",
      notApplicable: "无同班条件",
      manualReviewRequired: "手动调整后待复核",
    }[status] || "无同班条件"
  );
}

const tradingRotationTraceRows = computed(() => {
  const automaticSelections =
    props.automaticGenerationDebugState?.l70?.bestPlan?.selections || [];
  const previewStates = props.schedulePreview?.states || [];

  return (props.groups || [])
    .filter((group) => group?.facility === "trading")
    .map((group) => {
      const assemblyEntry = (props.preAssemblyGroupCandidates || []).find(
        (entry) => entry?.group?.id === group.id,
      );
      const postAlignmentEntry = (
        props.assembledScheduleCandidate?.groups || []
      ).find((entry) => entry?.groupId === group.id);
      const automatic = automaticSelections
        .filter((selection) => selection?.groupId === group.id)
        .map((selection) => ({
          cohortId: selection.cohortId,
          candidateName: selection.candidateName || selection.candidateKey,
          operatorIds: selection.operatorIds || [],
          fallbackOperatorIds: selection.fallbackOperatorIds || [],
        }));
      const assembly = getRotationAssignments(assemblyEntry?.candidate);
      const postAlignment = getRotationAssignments(postAlignmentEntry?.candidate);
      const finalSchedule = previewStates.flatMap((state, stateIndex) =>
        (state?.rooms || [])
          .filter((room) => room?.groupId === group.id)
          .map((room) => ({
            stateIndex,
            startHour: Number(state?.startHour || 0),
            durationHours: Number(state?.durationHours || 0),
            label: room?.label || room?.key || group.label,
            stationIndex: Number(room?.stationIndex || 0),
            stationLevel: room?.stationLevel || null,
            operatorIds: getCandidateOperatorIds({ operators: room?.operators }),
            manuallyEdited: room?.manuallyEdited === true,
          })),
      );

      return {
        group,
        automatic,
        assembly,
        postAlignment,
        finalSchedule,
      };
    });
});

function getControlCenterEffectScopeLabel(effect) {
  const roomType = effect?.roomType;
  const roomLabel =
    {
      trading: "贸易站",
      manufacture: "制造站",
      hire: "办公室",
    }[roomType] || roomType;
  const productLabel =
    effect?.product === "orundum"
      ? roomType === "trading"
        ? "合成玉"
        : "源石碎片"
      : {
          lmd: "龙门币",
          gold: "赤金",
          experience: "经验书",
          all: "",
        }[effect?.product] || "";

  return [roomLabel, productLabel].filter(Boolean).join(" ");
}

function formatSignedPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) {
    return "--";
  }

  return `${percent >= 0 ? "+" : ""}${
    Number.isInteger(percent) ? percent : percent.toFixed(1)
  }%`;
}

function getRoomTraceOperatorNames(room) {
  return (room?.operators || [])
    .map((operator) => {
      const charId = String(operator?.charId || "").trim();
      return String(
        operator?.name || props.operatorTable?.[charId]?.name || charId,
      ).trim();
    })
    .filter(Boolean)
    .join("、");
}

function getOperatorNames(operatorIds) {
  return (operatorIds || [])
    .map((charId) => getOperatorName(charId))
    .filter(Boolean)
    .join("、");
}

function getFinalEfficiencyTraceMode(row) {
  if (row?.breakdown?.closureCalculation) {
    return "closure";
  }
  if (row?.breakdown?.finalRosterCalculation) {
    return "finalRoster";
  }
  if (row?.breakdown?.automationCalculation) {
    return "automation";
  }
  if (Number.isFinite(Number(row?.breakdown?.candidateTotalPercent))) {
    return "candidate";
  }
  return "unavailable";
}

function getFinalEfficiencyTraceModeLabel(row) {
  return (
    {
      closure: "特别订单换算",
      finalRoster: "最终名单重算",
      automation: "自动化复核",
      candidate: "候选值回算",
      unavailable: "无可用公式",
    }[getFinalEfficiencyTraceMode(row)] || "无可用公式"
  );
}

function getFinalEfficiencyTraceReason(row) {
  const reason = String(
    row?.breakdown?.finalRosterCalculation?.reason || "",
  ).trim();
  return (
    {
      unsupportedRoomType: "该房间类型尚无最终名单计算器",
      missingExpectedSlots: "缺少房间容量",
      invalidRoster: "最终名单不完整或存在重复成员",
      closure: "特别订单需要候选专用计算",
      butshu: "但书组合需要候选专用计算",
      shamare: "巫恋组合需要候选专用计算",
      automation: "自动化组合需要候选专用计算",
      teamCalculation: "该组合需要候选专用计算",
    }[reason] || reason
  );
}

function getRuleOwnerName(rule) {
  return getOperatorName(rule?.ownerCharId) || rule?.ownerCharId || "--";
}

const finalEfficiencyTraceRows = computed(() =>
  (props.schedulePreview?.states || []).flatMap((state, stateIndex) =>
    (state?.rooms || []).map((room) => {
      const actual = room?.efficiencyMetrics?.actual || {};
      const breakdown = actual?.breakdown || {};
      const closureCalculation = breakdown?.closureCalculation || null;
      const finalRosterCalculation =
        breakdown?.finalRosterCalculation || null;

      return {
        key: `${stateIndex}:${String(room?.key || "").trim()}`,
        stateIndex,
        startHour: Number(state?.startHour || 0),
        durationHours: Number(state?.durationHours || 0),
        label: String(room?.label || room?.key || "").trim(),
        facility: String(room?.facility || "").trim(),
        product: String(room?.product || "").trim(),
        stationLevel: Number(room?.stationLevel) || null,
        operators: getRoomTraceOperatorNames(room),
        efficiency: room?.efficiency,
        status: String(actual?.status || "").trim(),
        candidateName: String(
          room?.efficiencySource?.candidate?.name || "",
        ).trim(),
        breakdown,
        closureCalculation,
        finalRosterCalculation,
        controlCenterOperatorBonuses: room?.controlCenterOperatorBonuses || [],
      };
    }),
  ),
);

const l79InputRoomRows = computed(() =>
  (props.l79Input?.schedule?.plans || []).flatMap((plan, planIndex) =>
    Object.entries(plan?.rooms || {}).flatMap(([roomType, rooms]) =>
      (Array.isArray(rooms) ? rooms : []).map((room, roomIndex) => ({
        key: `${planIndex}:${roomType}:${roomIndex}`,
        planIndex,
        planName: String(plan?.name || "").trim(),
        durationMinutes: Number(plan?.duration || 0),
        roomType,
        roomIndex,
        level: room?.level,
        product: String(room?.product || "").trim(),
        operators: Array.isArray(room?.operators) ? room.operators : [],
      })),
    ),
  ),
);
const l79InputOperatorProfileRows = computed(() =>
  (props.l79Input?.operatorProfiles || []).map((profile) => ({
    charId: String(profile?.charId || "").trim(),
    elite: profile?.elite,
    level: profile?.level,
  })),
);

function getDroneTableRoomLabel(room, key) {
  const label = String(room?.label || "").trim();
  if (label) {
    return label;
  }

  return String(key || "").trim() || "--";
}

function getDroneTableShiftLabel(shift, index) {
  const name = String(
    shift?.name || `${String.fromCharCode(65 + index)}班`,
  ).trim();
  const time = String(shift?.time || "").trim();
  return time ? `${name} ${time}` : name;
}

function getDroneTableOrderLabel(shift) {
  if (shift?.drone?.order === "retain") {
    return "留给下一班";
  }

  return shift?.drone?.order === "post" ? "换班后" : "换班前";
}

const droneTableDebug = computed(() => {
  const yieldSummary = props.actualScheduleMetrics?.yield;
  const previewStates = props.schedulePreview?.states || [];
  const droneUsageByState = new Map(
    (yieldSummary?.droneUsage?.segments || []).map((segment) => [
      Number(segment?.stateIndex),
      segment,
    ]),
  );
  const roomsByKey = new Map(
    (yieldSummary?.rooms || []).map((room, index) => [
      String(room?.key || "").trim(),
      { ...room, order: index },
    ]),
  );
  const settlementsByKey = new Map(
    (yieldSummary?.droneTargetSettlements || []).map((settlement) => [
      String(settlement?.key || "").trim(),
      settlement,
    ]),
  );
  const columns = [...settlementsByKey.entries()]
    .map(([key, settlement]) => {
      const room = roomsByKey.get(key) || {};
      return {
        key,
        label: getDroneTableRoomLabel(room, key),
        facility: String(room?.facility || "").trim(),
        product: String(room?.product || "").trim(),
        order: Number(room?.order || 0),
        settlement,
      };
    })
    .filter(
      (column) =>
        column.key &&
        ["trading", "manufacture"].includes(column.facility),
    )
    .sort((left, right) => left.order - right.order);
  const stateCount = Math.max(
    previewStates.length,
    props.scheduleShifts.length,
    ...columns.map(
      (column) =>
        Math.max(
          column.settlement?.segments?.length || 0,
          column.settlement?.resourceEffectsBySegment?.length || 0,
        ),
    ),
  );

  return {
    columns,
    rows: Array.from({ length: stateCount }, (_, stateIndex) => {
      const shift = props.scheduleShifts[stateIndex] || {};
      const state = previewStates[stateIndex] || {};
      const drone = shift?.drone || {};
      const droneUsage = droneUsageByState.get(stateIndex);
      const selectedTarget = drone?.disabled === true
        ? ""
        : String(drone?.target || "").trim();

      return {
        key: `${stateIndex}:${selectedTarget}`,
        label: getDroneTableShiftLabel(shift, stateIndex),
        durationHours: Number(state?.durationHours || 0),
        droneOrder: getDroneTableOrderLabel(shift),
        droneCapacityReached: droneUsage?.capacityReached === true,
        droneStoredOutput: droneUsage?.storedDroneOutput ?? null,
        selectedTarget,
        disabled: drone?.disabled === true,
        cells: columns.map((column) => {
          const segment = column.settlement?.segments?.[stateIndex] || {};
          const resourceEffect =
            column.settlement?.resourceEffectsBySegment?.[stateIndex] || {};
          const room = (state?.rooms || []).find(
            (item) => String(item?.key || "").trim() === column.key,
          );
          const isCalculated =
            segment?.calculated === true &&
            resourceEffect?.isCalculated === true;

          return {
            key: `${stateIndex}:${column.key}`,
            label: column.label,
            operators: getRoomTraceOperatorNames(room) || "--",
            selected: selectedTarget === column.key,
            isCalculated,
            primaryResource: String(
              resourceEffect?.primaryResource || segment?.resource || "",
            ).trim(),
            displayedOutput: resourceEffect?.primaryOutput ?? null,
            rawOutput: segment?.output ?? null,
            droneOutput: segment?.droneOutput ?? null,
            acceleratedHours: segment?.acceleratedHours ?? null,
            goldConsumption: resourceEffect?.goldConsumption ?? null,
            shardConsumption: resourceEffect?.shardConsumption ?? null,
            lmdConsumption: resourceEffect?.lmdConsumption ?? null,
            craftMaterial: resourceEffect?.craftMaterial ?? "",
            craftMaterialLabel: resourceEffect?.craftMaterialLabel ?? "",
            craftMaterialConsumption:
              resourceEffect?.craftMaterialConsumption ?? null,
            netGold: resourceEffect?.netGold ?? null,
            unavailableReason:
              String(segment?.unavailableReason || "").trim() ||
              (resourceEffect?.isCalculated === false
                ? "resourceSettlementUnavailable"
                : ""),
          };
        }),
      };
    }),
  };
});
</script>

<template>
  <section class="pipeline-debug">
    <header class="pipeline-debug-heading">
      <div>
        <h3>排班计算链路</h3>
        <p>L20-L73 组装前计算；L74 同班对齐；L79-L80 组装后核算</p>
      </div>
      <span>开发模式</span>
    </header>

    <details class="pipeline-stage pipeline-copy-debug" open>
      <summary><code>复制调试信息</code> 同班绑定全链路</summary>
      <div class="pipeline-stage-content">
        <div class="pipeline-copy-debug-actions">
          <button type="button" @click="copyPipelineDebugText">
            复制全部调试信息
          </button>
          <small v-if="copyStatus">{{ copyStatus }}</small>
        </div>
        <textarea
          class="pipeline-copy-debug-text"
          :value="pipelineDebugText"
          readonly
          spellcheck="false"
          @focus="$event.target.select()"
        ></textarea>
      </div>
    </details>

    <div class="pipeline-section-label">输入</div>

    <details class="pipeline-stage">
      <summary>
        <code>数据源</code> 当前干员列表（{{ rosterRows.length }}）
      </summary>
      <div class="pipeline-stage-content">
        <p>
          {{ operatorSourceLabel || "当前数据源" }} /
          {{
            trainingMode === "ideal"
              ? "基建技能视为已解锁"
              : "使用当前练度"
          }}
        </p>
        <p v-if="trainingMode === 'ideal'">
          解锁范围：6 星
          {{ idealTrainingRaritySelection?.six ? "开启" : "关闭" }} / 5 星
          {{ idealTrainingRaritySelection?.five ? "开启" : "关闭" }} / 4 星及以下
          {{ idealTrainingRaritySelection?.fourOrBelow ? "开启" : "关闭" }}
        </p>
        <ul class="pipeline-roster">
          <li v-for="operator in rosterRows" :key="operator.charId">
            <strong>{{ operator.name }}</strong>
            <span>
              {{
                Number.isInteger(operator.rarity)
                  ? `${operator.rarity} 星`
                  : "星级未知"
              }}
              / 精 {{ Number.isInteger(operator.elite) ? operator.elite : "?" }}
              / Lv.{{ Number.isInteger(operator.level) ? operator.level : "?" }}
            </span>
            <code>{{ operator.charId }}</code>
          </li>
        </ul>
      </div>
    </details>

    <div class="pipeline-section-label">组装前计算</div>

    <details class="pipeline-stage">
      <summary><code>L20</code> 候选核心解析</summary>
      <div class="pipeline-stage-content">
        <article
          v-for="{ group, state } in groupRows"
          :key="group.id"
          class="pipeline-group"
        >
          <header>
            <strong>{{ group.label }}</strong>
            <span>{{ getStatusLabel(state.status) }}</span>
          </header>
          <p v-if="state.staffingRequirement">
            班组数 {{ state.staffingRequirement.totalTeamCount }}，轮班段
            {{ state.staffingRequirement.segmentHours.join(" / ") }}h
          </p>
          <div v-for="cohort in state.cohorts || []" :key="cohort.id">
            <p>
              {{ cohort.id }}：{{ cohort.stationLevel }} 级 /
              {{ cohort.slotCount }} 位，{{ cohort.teamCount }} 组
            </p>
            <ul class="pipeline-list">
              <li
                v-for="skeleton in cohort.debug?.l20?.candidateSkeletons || []"
                :key="skeleton.candidate.id"
              >
                {{ skeleton.candidate.name }}：
                {{ getCandidateNames(skeleton.operatorIds) }}
              </li>
              <li
                v-for="skeleton in cohort.debug?.l61
                  ?.resourceCoreCandidateSkeletons || []"
                :key="skeleton.candidate.id"
              >
                {{ skeleton.candidate.name }}：运行时资源核心候选
              </li>
            </ul>
          </div>
        </article>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L28</code> 感知资源基础值</summary>
      <div class="pipeline-stage-content">
        <article
          v-for="{ group, state } in groupRows"
          :key="`${group.id}:l28`"
          class="pipeline-group"
        >
          <strong>{{ group.label }}</strong>
          <ul class="pipeline-list">
            <li
              v-for="cohort in state.cohorts || []"
              :key="`${cohort.id}:l28`"
            >
              {{ cohort.id }}
              <span
                v-for="(baseline, operatorId) in cohort.debug?.l20
                  ?.perceptionCoreBaselinesByOperatorId || {}"
                :key="operatorId"
              >
                {{ getOperatorName(operatorId) }}：
                宿舍 {{ formatNumber(baseline.dormitoryOccupantCount) }} 人，
                基础 {{ formatPercent(baseline.bonusPercent) }}
                <span v-for="source in baseline.sources || []" :key="source.operatorId">
                  {{ getOperatorName(source.operatorId) }} +{{ formatNumber(source.value) }}
                </span>
              </span>
            </li>
          </ul>
        </article>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L30</code> 静态规则匹配与应用</summary>
      <div class="pipeline-stage-content">
        <p>
          命中 {{ matchedLayer3Rules.length }} /
          {{ layer3RuleChecks.length }} 条规则。
        </p>
        <ul class="pipeline-list">
          <li v-for="rule in matchedLayer3Rules" :key="rule.id">
            <code>{{ rule.id }}</code>
            <span v-for="(effect, index) in rule.effects" :key="index">
              {{ effect.operatorName || effect.candidateName || "规则效果" }}
              {{ effect.bonusPercent ? `${formatPercent(effect.bonusPercent)}` : "" }}
            </span>
          </li>
        </ul>
        <details class="pipeline-nested">
          <summary>全部规则检查</summary>
          <p v-if="layer3RuleChecks.length === 0">
            当前没有可检查的静态规则。
          </p>
          <div v-else class="pipeline-rule-list">
            <article
              v-for="rule in layer3RuleChecks"
              :key="rule.id"
              class="pipeline-rule-row"
              :class="{ matched: rule.matched }"
            >
              <div class="pipeline-rule-status">
                <v-icon
                  :icon="
                    rule.matched
                      ? 'mdi-check-circle-outline'
                      : 'mdi-close-circle-outline'
                  "
                  size="17"
                ></v-icon>
                <code>{{ rule.id }}</code>
              </div>
              <div class="pipeline-rule-conditions">
                <span
                  v-for="condition in rule.operatorConditions"
                  :key="`${rule.id}:operator:${condition.operatorId}:${condition.eliteAtLeast}`"
                  :class="{ matched: condition.matched }"
                >
                  {{ formatLayer3OperatorCondition(condition) }}
                </span>
                <span
                  v-for="condition in rule.facilityConditions"
                  :key="`${rule.id}:facility:${condition.kind}:${condition.count}:${condition.productKindCount}`"
                  :class="{ matched: condition.matched }"
                >
                  {{ formatLayer3FacilityCondition(condition) }}
                </span>
                <span
                  v-if="!rule.facilityConditions.length"
                  class="neutral"
                >
                  无额外布局条件
                </span>
              </div>
              <div class="pipeline-rule-effects">
                <span
                  v-for="(effect, effectIndex) in rule.effects"
                  :key="`${rule.id}:effect:${effectIndex}`"
                >
                  {{ formatLayer3RuleEffect(effect) }}
                </span>
              </div>
            </article>
          </div>
        </details>
        <details class="pipeline-nested">
          <summary>L31 / L32 候选结果</summary>
          <article
            v-for="{ group, state } in groupRows"
            :key="`${group.id}:static-candidate-rules`"
            class="pipeline-group"
          >
            <strong>{{ group.label }}</strong>
            <ul class="pipeline-list">
              <template v-for="cohort in state.cohorts || []" :key="cohort.id">
                <li
                  v-for="candidate in cohort.debug?.l61?.candidates || []"
                  :key="candidate.key"
                >
                  <strong>{{ candidate.name }}</strong>
                  L28：{{ formatPercent(candidate.resourceChainBaseline?.bonusPercent) }}；
                  L31：干员 {{ formatPercent(candidate.debug?.l31?.operatorBonusPercent) }}，
                  候选 {{ formatPercent(candidate.debug?.l31?.candidateLocalBonusPercent) }}，
                  优先级 {{ formatNumber(candidate.debug?.l31?.roomPriority) }}；
                  L32：候选已有 {{ formatPercent(candidate.coreBaseBonusPercent) }} +
                  静态 {{ formatPercent(candidate.debug?.l32?.coreLayer3BonusPercent) }} =
                  {{ formatPercent(candidate.debug?.l32?.coreBonusPercent) }}
                </li>
              </template>
            </ul>
          </article>
        </details>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L40</code> 中枢方案独立试算，不写入主链</summary>
      <div class="pipeline-stage-content">
        <p
          v-if="controlScenarioTrialState.status === 'requiresLayout'"
        >
          请选择布局后开始试算。
        </p>
        <p
          v-else-if="
            controlScenarioTrialState.status === 'requiresOperators'
          "
        >
          请同步干员数据后开始试算。
        </p>
        <div
          v-else-if="controlScenarioTrialState.scenarios?.length"
          class="pipeline-trial-list"
        >
          <p class="pipeline-trial-formula">
            试算分 = 中枢效果加成 x 对应设施数量 x 设施权重；制造站、贸易站权重为 1，会客室、办公室权重为 8。只计算布局确定后即可生效的全站效果；依赖实际入驻干员的效果留到后处理结算。
          </p>
          <article
            v-for="scenario in controlScenarioTrialState.scenarios"
            :key="scenario.id"
            class="pipeline-trial-scenario"
            :class="{
              baseline: scenario.id === 'baseline',
              recommended:
                scenario.id !== 'baseline' && scenario.deltaScore > 0,
            }"
          >
            <header>
              <strong>{{ scenario.label }}</strong>
              <span>
                {{
                  scenario.deltaScore > 0
                    ? `+${formatNumber(scenario.deltaScore)}`
                    : formatNumber(scenario.deltaScore)
                }}
              </span>
            </header>
            <p>试算分 {{ formatNumber(scenario.contributionScore) }}</p>
            <ul
              v-if="scenario.entries?.length"
              class="pipeline-trial-items"
            >
              <li
                v-for="entry in scenario.entries"
                :key="`${scenario.id}:${entry.effectLabel}`"
              >
                <strong>{{ entry.effectLabel }}</strong>
                <span v-if="entry.kind !== 'roster'">
                  计分：{{ formatNumber(entry.bonusPercent) }} x
                  {{ entry.facilityCount }} x {{ entry.roomWeight }} =
                  {{ formatNumber(entry.score) }}
                </span>
                <span v-else>
                  计分：{{ formatNumber(entry.baseScore) }}
                  <template v-for="term in entry.terms" :key="term.label">
                    + {{ term.count }} x
                    {{ formatNumber(term.scorePerOperator) }}
                  </template>
                  = {{ formatNumber(entry.score) }}
                </span>
              </li>
            </ul>
            <small v-if="scenario.deferredEffectLabels?.length">
              实际排班后结算：{{ scenario.deferredEffectLabels.join(" / ") }}
            </small>
          </article>
        </div>
        <p v-else>当前没有可试算的中枢候选方案。</p>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L41</code> 感知资源独立试算，不写入主链</summary>
      <div class="pipeline-stage-content">
        <p
          v-if="perceptionResourceTrialState.status === 'requiresLayout'"
        >
          请选择布局后开始试算。
        </p>
        <p
          v-else-if="
            perceptionResourceTrialState.status === 'requiresOperators'
          "
        >
          请同步干员数据后开始试算。
        </p>
        <template v-else>
          <p class="pipeline-trial-formula">
            假定宿舍满员：{{
              perceptionResourceTrialState.dormitoryOccupantCount
            }} 人，最高宿舍等级：{{
              perceptionResourceTrialState.highestDormitoryLevel
            }}；按满级办公室计算，额外招募位：{{
              perceptionResourceTrialState.officeExtraRecruitmentSlots
            }}。试算分 = 制造站加成 + 贸易站加成，仅用于比较方案。
          </p>
          <p
            v-if="perceptionResourceTrialState.bestPlan"
            class="pipeline-trial-note"
          >
            理论最大方案：{{
              perceptionResourceTrialState.bestPlan.scenarioLabel
            }} / {{ perceptionResourceTrialState.bestPlan.label }}，试算分
            {{
              formatNumber(
                perceptionResourceTrialState.bestPlan.contributionScore,
              )
            }}。
          </p>
          <ul
            v-if="perceptionResourceTrialState.bestPlan"
            class="pipeline-trial-note-list"
          >
            <li
              v-for="placement in perceptionResourceTrialState.bestPlan
                .requiredPlacements"
              :key="`${placement.operatorId}:${placement.roomType}`"
            >
              {{ getOperatorName(placement.operatorId) }} -> {{
                placement.roomLabel
              }}
              <template v-if="placement.condition">
                （{{ placement.condition }}）
              </template>
            </li>
          </ul>
          <div
            v-if="perceptionResourceTrialState.scenarios?.length"
            class="pipeline-perception-scenario-list"
          >
            <article
              v-for="scenario in perceptionResourceTrialState.scenarios"
              :key="scenario.id"
              class="pipeline-perception-scenario"
            >
              <header>
                <strong>{{ scenario.label }}</strong>
              </header>
              <div class="pipeline-perception-plan-list">
                <article
                  v-for="plan in scenario.plans"
                  :key="plan.id"
                  class="pipeline-perception-plan"
                >
                  <header>
                    <strong>{{ plan.label }}</strong>
                    <span>试算分 {{ formatNumber(plan.contributionScore) }}</span>
                  </header>
                  <p>
                    感知信息 {{ plan.perceptionInformation }}；无声共鸣
                    {{ plan.silentResonance }}
                  </p>
                  <ul>
                    <li
                      v-for="source in plan.perceptionSources"
                      :key="`${plan.id}:perception:${source.label}`"
                    >
                      {{ source.label }}：{{ source.formula }} =
                      {{ source.value }} 点{{ source.resource }}
                    </li>
                    <li
                      v-for="source in plan.silentResonanceSources"
                      :key="`${plan.id}:resonance:${source.label}`"
                    >
                      {{ source.label }}：{{ source.formula }} =
                      {{ source.value }} 点{{ source.resource }}
                    </li>
                    <li
                      v-for="result in plan.results"
                      :key="`${plan.id}:result:${result.operatorId}`"
                    >
                      {{ result.operatorName }}：{{ result.formula }} =
                      +{{ result.bonusPercent }}%{{
                        result.roomType === "manufacture" ? "制造" : "贸易"
                      }}
                    </li>
                  </ul>
                </article>
              </div>
            </article>
          </div>
          <p v-else>当前未持有迷迭香或黑键，暂无可试算方案。</p>
          <p
            v-if="
              perceptionResourceTrialState.controlConditionalSources?.length
            "
            class="pipeline-trial-note"
          >
            本次已按条件成立计入的中枢资源：
            <span
              v-for="source in perceptionResourceTrialState.controlConditionalSources"
              :key="source.operatorId"
            >
              {{ source.operatorName }} {{ source.condition }} 时 +{{
                source.bonusPercent
              }} 点感知信息
            </span>
          </p>
          <ul class="pipeline-trial-note-list">
            <li
              v-for="note in perceptionResourceTrialState.omittedMechanics"
              :key="note"
            >
              {{ note }}
            </li>
          </ul>
        </template>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L50</code> 中枢角色编制</summary>
      <div class="pipeline-stage-content">
        <p>初始中枢：{{ getStatusLabel(controlState.status) }}</p>
        <ul
          v-if="controlState.teams?.length"
          class="pipeline-list"
        >
          <li
            v-for="team in controlState.teams"
            :key="`control-team-${team.teamIndex}`"
          >
            <strong>中枢班 {{ team.teamIndex + 1 }}</strong>
            ：房间加成
            {{
              getCandidateNames(
                team.roomEffectOperators?.map((operator) => operator.charId),
              )
            }}
            ；干员加成
            {{
              getCandidateNames(
                team.operatorEffectOperators?.map(
                  (operator) => operator.charId,
                ),
              )
            }}
            ；补位
            {{
              getCandidateNames(
                team.fillerOperators?.map((operator) => operator.charId),
              )
            }}
          </li>
          <li
            v-for="[operatorId, count] in Object.entries(
              controlState.usageByOperatorId || {},
            ).filter(([, count]) => Number(count) > 1)"
            :key="`control-usage-${operatorId}`"
          >
            {{ getOperatorName(operatorId) }}：参与 {{ count }} 班
          </li>
        </ul>
        <ul class="pipeline-list">
          <li v-for="role in controlState.roles || []" :key="role.id">
            {{ role.label || role.id }}：
            {{ getCandidateNames(role.operators?.map((operator) => operator.charId)) }}
          </li>
        </ul>
        <p>补位后中枢：{{ getStatusLabel(controlFinalState.status) }}</p>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L51</code> 中枢定向加成执行结果</summary>
      <div class="pipeline-stage-content">
        <p
          v-if="
            controlOperatorEffectDebugState.status === 'requiresOperators'
          "
        >
          请同步干员数据后查看中枢定向加成。
        </p>
        <div
          v-else-if="controlOperatorEffectDebugState.effects?.length"
          class="pipeline-control-effect-list"
        >
          <article
            v-for="effect in controlOperatorEffectDebugState.effects"
            :key="effect.key"
            class="pipeline-control-effect"
          >
            <header>
              <span class="pipeline-control-effect-team">
                中枢班组 {{ effect.teamIndex + 1 }}
              </span>
              <span>{{ getControlCenterEffectScopeLabel(effect) }}</span>
            </header>
            <p class="pipeline-control-effect-target">
              {{ getOperatorName(effect.targetOperatorId) }}
              <small>初始中枢定向加成：0%</small>
            </p>
            <ol class="pipeline-control-effect-steps">
              <li
                v-for="contribution in effect.contributions"
                :key="contribution.key"
              >
                <span>
                  步骤 {{ contribution.step }}：
                  <strong>
                    {{
                      contribution.sourceOperatorIds
                        .map(getOperatorName)
                        .join("、")
                    }}
                  </strong>
                  命中 {{ getOperatorName(effect.targetOperatorId) }}，加成
                  {{ formatSignedPercent(contribution.bonusPercent) }}
                </span>
                <small>
                  {{
                    `${formatSignedPercent(
                      contribution.beforeBonusPercent,
                    )} + ${formatSignedPercent(
                      contribution.bonusPercent,
                    )} = ${formatSignedPercent(
                      contribution.totalAfterBonusPercent,
                    )}`
                  }}
                </small>
              </li>
            </ol>
            <p class="pipeline-control-effect-total">
              合计：{{ effect.formula }} =
              {{ formatSignedPercent(effect.totalBonusPercent) }}
            </p>
          </article>
        </div>
        <p v-else>当前中枢没有对已持有干员生效的定向加成。</p>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L60 / L61</code> 编制需求与运行时候选</summary>
      <div class="pipeline-stage-content">
        <article
          v-for="{ group, state } in groupRows"
          :key="`${group.id}:candidates`"
          class="pipeline-group"
        >
          <header>
            <strong>{{ group.label }}</strong>
            <span>{{ getStatusLabel(state.status) }}</span>
          </header>
          <div v-for="cohort in state.cohorts || []" :key="cohort.id">
            <p>
              {{ cohort.id }}：{{ cohort.candidates?.length || 0 }} 个候选，
              补位 {{ cohort.fallbackCandidate?.fallback?.count ?? "--" }} 位
            </p>
            <ul class="pipeline-list">
              <li v-for="candidate in cohort.debug?.l61?.candidates || []" :key="candidate.key">
                <strong>{{ candidate.name }}</strong>
                固定 {{ getCandidateNames(candidate.operatorIds) }}；
                本体 {{ formatPercent(candidate.corePercent) }}；
                补位 {{ formatPercent(candidate.fallback?.totalPercent) }}；
                总计 {{ formatPercent(candidate.totalPercent) }}
              </li>
            </ul>
          </div>
        </article>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L62 / L63</code> 班组物化与补位分配</summary>
      <div class="pipeline-stage-content">
        <article
          v-for="entry in preAssemblyGroupCandidates"
          :key="entry.group?.id"
          class="pipeline-group"
        >
          <header>
            <strong>{{ entry.group?.label || entry.group?.id }}</strong>
            <span>{{ entry.candidate ? "已物化" : entry.reason || "未完成" }}</span>
          </header>
          <ul v-if="entry.candidate" class="pipeline-list">
            <li
              v-for="segment in entry.candidate.segments || []"
              :key="`${entry.group?.id}:${segment.index}`"
            >
              第 {{ segment.index + 1 }} 段 / {{ segment.durationHours }}h：
              <span
                v-for="assignment in segment.stationAssignments || []"
                :key="assignment.stationIndex"
              >
                {{ assignment.candidate?.name }}
                {{ formatPercent(assignment.candidate?.totalPercent) }}
              </span>
            </li>
          </ul>
        </article>
        <article
          v-for="(plan, groupId) in fallbackPlansByGroupId"
          :key="`${groupId}:fallback`"
          class="pipeline-group"
        >
          <header>
            <strong>{{ plan?.groupId || groupId }}</strong>
            <span v-if="plan">补位分配</span>
          </header>
          <p v-if="plan">
            评分 {{ formatNumber(plan.score) }}，已选
            {{ getCandidateNames(plan.selectedOperatorIds) }}
          </p>
          <ul v-if="plan" class="pipeline-list">
            <li v-for="assignment in getFallbackAssignments(plan)" :key="assignment.slotKey">
              {{ assignment.slotKey }}：{{ getOperatorName(assignment.charId) }}
            </li>
          </ul>
        </article>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L65</code> 菲亚梅塔复用约束</summary>
      <div class="pipeline-stage-content">
        <p v-if="fiammettaRecovery.enabled">
          目标 {{ getOperatorName(fiammettaRecovery.targetOperatorId) }}；
          中枢已占班段
          {{ fiammettaControlUsage.stateIndexes?.join("、") || "无" }}。
        </p>
        <p v-else>未启用。</p>
      </div>
    </details>

    <details class="pipeline-stage">
      <summary><code>L70 / L71 / L72 / L73</code> 自动搜索、尾部填充、组合试算与中枢撤换</summary>
      <div class="pipeline-stage-content">
        <p v-if="!automaticGenerationDebugState">
          尚未执行自动生成。
        </p>
        <template v-else>
          <p>
            {{ automaticGenerationDebugState.strategy }} 搜索：
            评分 {{ formatNumber(automaticGenerationDebugState.l70?.bestPlan?.rankingValue) }}。
          </p>
          <details
            v-if="automaticGenerationDebugState.l70?.runtime"
            class="pipeline-nested"
          >
            <summary>L70 运行统计</summary>
            <p>
              状态：{{
                getL70RuntimeStatusLabel(
                  automaticGenerationDebugState.l70.runtime.status,
                )
              }}；
              阶段：{{ automaticGenerationDebugState.l70.runtime.phase || "--" }}；
              耗时：{{
                formatNumber(
                  Number(automaticGenerationDebugState.l70.runtime.elapsedMs || 0) /
                    1000,
                )
              }} 秒
            </p>
            <p>
              房间组
              {{
                automaticGenerationDebugState.l70.runtime.currentGroupIndex || "--"
              }}/{{
                automaticGenerationDebugState.l70.runtime.groupCount || "--"
              }}
              {{
                automaticGenerationDebugState.l70.runtime.currentGroupLabel || "--"
              }}；
              班组：{{
                automaticGenerationDebugState.l70.runtime.currentCohortId || "--"
              }}
            </p>
            <p>
              候选：
              {{
                automaticGenerationDebugState.l70.runtime.processedCandidateCount ||
                  0
              }}/{{
                automaticGenerationDebugState.l70.runtime.totalCandidateCount ||
                  0
              }}；
              补位计算：
              {{
                automaticGenerationDebugState.l70.runtime
                  .fallbackInvocationCount || 0
              }} 次；
              返回方案：
              {{
                automaticGenerationDebugState.l70.runtime.fallbackPlanCount || 0
              }} 条
            </p>
            <p>
              当前候选：
              {{
                automaticGenerationDebugState.l70.runtime.currentCandidateIndex ||
                  0
              }}/{{
                automaticGenerationDebugState.l70.runtime.currentCandidateCount ||
                  0
              }}
              {{
                automaticGenerationDebugState.l70.runtime.currentCandidateName ||
                  automaticGenerationDebugState.l70.runtime.currentCandidateKey ||
                  "--"
              }}；
              选择键：{{
                automaticGenerationDebugState.l70.runtime.currentSelectionKey ||
                  "--"
              }}
            </p>
          </details>
           <ul class="pipeline-list">
             <li
               v-for="selection in automaticGenerationDebugState.l70?.bestPlan?.selections || []"
              :key="`${selection.groupId}:${selection.cohortId}:${selection.candidateKey}`"
            >
              {{ selection.groupId }} / {{ selection.cohortId }}：
              {{ selection.candidateName }}，
               {{ getCandidateNames(selection.operatorIds) }}
             </li>
           </ul>
            <details
             v-if="automaticGenerationDebugState.l70?.selectionDiagnostics?.length"
            class="pipeline-nested"
          >
            <summary>L70 选中位置候选对照</summary>
            <article
              v-for="diagnostic in automaticGenerationDebugState.l70
                ?.selectionDiagnostics || []"
              :key="`${diagnostic.groupId}:${diagnostic.selectionKey}`"
              class="pipeline-actual-room"
            >
              <header>
                <strong>
                  {{ diagnostic.groupId }} / {{ diagnostic.cohortId }} /
                  {{ diagnostic.selectionKey }}
                </strong>
                <span>
                  实选：{{ diagnostic.selected.candidateName }}（本地第
                  {{ diagnostic.selectedRank }} / {{ diagnostic.availableOptionCount }}）
                </span>
              </header>
              <small v-if="!diagnostic.traceFound">
                未找到实际搜索分支记录。
              </small>
              <small>
                实选成员：{{ getCandidateNames(diagnostic.selected.operatorIds) }}；
                候选排序值 {{ formatNumber(diagnostic.selected.rankingValue) }}；
                补位方案分 {{ formatNumber(diagnostic.selected.fallbackPlanScore) }}
              </small>
              <ul class="pipeline-list">
                <li
                  v-for="alternative in diagnostic.alternatives"
                  :key="alternative.key"
                >
                  <strong>
                    {{
                      alternative.key === diagnostic.selected.key
                        ? "已选"
                        : "备选"
                    }}
                  </strong>
                  {{ alternative.candidateName }}
                  <span>
                    {{ getCandidateNames(alternative.operatorIds) }}
                  </span>
                  <span>
                    候选排序值 {{ formatNumber(alternative.rankingValue) }}
                  </span>
                  <span>
                    补位方案分 {{ formatNumber(alternative.fallbackPlanScore) }}
                  </span>
                  <span v-if="alternative.planRank">
                    实际子分支：全局第 {{ alternative.planRank }}，
                    总分 {{ formatNumber(alternative.planRankingValue) }}，
                    基础 {{ formatNumber(alternative.planBaseRankingValue) }}，
                    {{ alternative.planRetained ? "保留" : "截断" }}
                  </span>
                  <span
                    v-else-if="alternative.rejectionReason === 'duplicateCandidate'"
                  >
                    未生成：同一候选已被本房间组使用
                  </span>
                  <span
                    v-else-if="alternative.rejectionReason === 'claimedOperator'"
                  >
                    未生成：{{ getOperatorName(alternative.claimedOperatorId) }}
                    已被前序班组抓取
                  </span>
                  <span
                    v-else-if="alternative.rejectionReason === 'fiammettaState'"
                  >
                    未生成：菲亚梅塔班段 {{ alternative.fiammettaStateIndex + 1 }}
                    已被占用
                  </span>
                  <span v-else>该候选未生成实际子分支</span>
                </li>
              </ul>
            </article>
          </details>
          <details
            v-if="automaticGenerationDebugState.l70?.batchDiagnostics?.length"
            class="pipeline-nested"
          >
            <summary>L70 两步搜索批次对照</summary>
            <article
              v-for="batch in automaticGenerationDebugState.l70
                ?.batchDiagnostics || []"
              :key="`l70-batch:${batch.batchIndex}`"
              class="pipeline-actual-room"
            >
              <header>
                <strong>批次 {{ batch.batchIndex + 1 }}</strong>
                <span>
                  连选 {{ batch.selectionCount }} 次，保留
                  {{ batch.retainedPlans?.length || 0 }} 条路线
                </span>
              </header>
              <p>
                <span
                  v-for="stage in batch.stages || []"
                  :key="`l70-stage:${stage.roundIndex}`"
                >
                  第 {{ stage.roundIndex + 1 }} 次：产生
                  {{ stage.generatedPlanCount }}，去重后
                  {{ stage.uniquePlanCount }}，保留
                  {{ stage.retainedPlanCount }}
                </span>
              </p>
              <ul class="pipeline-list">
                <li
                  v-for="plan in batch.retainedPlans || []"
                  :key="plan.key"
                >
                  <strong>路线 {{ plan.rank }}</strong>
                  <span>
                    总评分 {{ formatNumber(plan.rankingValue) }}，
                    基础 {{ formatNumber(plan.baseRankingValue) }}
                  </span>
                  <span
                    v-if="plan.priorSelections?.length"
                    class="pipeline-selection-history"
                  >
                    前序：
                    <span
                      v-for="selection in plan.priorSelections"
                      :key="`${plan.key}:prior:${selection.selectionKey}:${selection.candidateKey}`"
                    >
                      {{ selection.groupId }} / {{ selection.cohortId }}：
                      {{ selection.candidateName || selection.candidateKey }}
                      （{{ getCandidateNames(selection.operatorIds) }}，
                      补位 {{ formatNumber(selection.fallbackPlanScore) }}）
                      <span
                        v-if="selection.automationEffectivePowerPlantCount"
                      >
                        ，自动化等效发电站
                        {{ selection.automationEffectivePowerPlantCount }}
                      </span>
                    </span>
                  </span>
                  <span>本批：</span>
                  <span
                    v-for="selection in plan.selections || []"
                    :key="`${plan.key}:${selection.selectionKey}:${selection.candidateKey}`"
                  >
                    {{ selection.groupId }} / {{ selection.cohortId }}：
                    {{ selection.candidateName || selection.candidateKey }}
                    （{{ getCandidateNames(selection.operatorIds) }}，
                    补位 {{ formatNumber(selection.fallbackPlanScore) }}）
                    <span
                      v-if="selection.automationEffectivePowerPlantCount"
                    >
                      ，自动化等效发电站
                      {{ selection.automationEffectivePowerPlantCount }}
                    </span>
                  </span>
                </li>
              </ul>
            </article>
          </details>
          <details
            v-if="automaticGenerationDebugState.l70?.bestPlan?.activeRosterEffects?.summaries?.length"
            class="pipeline-nested"
          >
            <summary>
              L65 在岗关系试算（L70 内部数据）：
              +{{
                formatPercent(
                  automaticGenerationDebugState.l70?.bestPlan?.activeRosterEffects
                    ?.rankingBonus,
                )
              }}
            </summary>
            <ul class="pipeline-list">
              <li
                v-for="effect in automaticGenerationDebugState.l70?.bestPlan
                  ?.activeRosterEffects?.summaries || []"
                :key="`${effect.targetKey}:${effect.ruleId}`"
              >
                {{ effect.candidateName }} / {{ effect.ownerName }}：
                +{{ formatPercent(effect.expectedBonusPercent) }}
                <span v-for="state in effect.states" :key="state.stateIndex">
                  班次 {{ state.stateIndex + 1 }}：
                  {{ state.matchingOperatorNames.join("、") || "无" }}
                  +{{ formatPercent(state.bonusPercent) }}
                </span>
              </li>
            </ul>
          </details>
          <details class="pipeline-nested">
            <summary>L71 尾部填充结果</summary>
            <pre>{{
              formatJson(
                automaticGenerationDebugState.l71
                  ?.fallbackOperatorIdBySlotKeyByGroup,
              )
            }}</pre>
          </details>
          <details class="pipeline-nested">
            <summary>L72 迷迭香 / 黑键组合试算</summary>
            <template v-if="automaticGenerationDebugState.l72">
              <p>
                {{ getL72DecisionLabel(automaticGenerationDebugState.l72.decision) }}
              </p>
              <p>
                基准 {{ formatNumber(automaticGenerationDebugState.l72.baselineScore) }}，
                试算 {{ automaticGenerationDebugState.l72.trialCount || 0 }} 次，
                最佳 {{
                  automaticGenerationDebugState.l72.bestTrial
                    ? formatNumber(automaticGenerationDebugState.l72.bestTrial.score)
                    : "--"
                }}，
                最终 {{ formatNumber(automaticGenerationDebugState.l72.adoptedScore) }}
              </p>
              <p>
                原核心：
                {{ getCandidateNames(automaticGenerationDebugState.l72.selectedCoreOperatorIds) }}
                ；最终核心：
                {{ getCandidateNames(automaticGenerationDebugState.l72.adoptedCoreOperatorIds) }}
              </p>
              <ul
                v-if="automaticGenerationDebugState.l72.replacements?.length"
                class="pipeline-list"
              >
                <li
                  v-for="replacement in automaticGenerationDebugState.l72.replacements"
                  :key="`${replacement.groupId}:${replacement.cohortId}:${replacement.teamIndex}`"
                >
                  {{ getL72ReplacementLabel(replacement) }}
                </li>
              </ul>
              <details
                v-if="automaticGenerationDebugState.l72.trials?.length"
                class="pipeline-nested"
              >
                <summary>全部 L72 试算</summary>
                <ul class="pipeline-list">
                  <li
                    v-for="(trial, index) in automaticGenerationDebugState.l72.trials"
                    :key="index"
                  >
                    {{ formatNumber(trial.score) }}：
                    {{ getCandidateNames(trial.selectedCoreOperatorIds) }}
                    <span
                      v-for="replacement in trial.replacements"
                      :key="`${replacement.groupId}:${replacement.cohortId}:${replacement.teamIndex}`"
                    >
                      {{ getL72ReplacementLabel(replacement) }}
                    </span>
                  </li>
                </ul>
              </details>
            </template>
            <p v-else>尚未执行 L72。</p>
          </details>
          <details class="pipeline-nested">
            <summary>L73 中枢撤换与补位</summary>
            <template v-if="automaticGenerationDebugState.l73">
              <p>
                状态：
                {{
                  getL73StatusLabel(
                    automaticGenerationDebugState.l73.status,
                  )
                }}
              </p>
              <p>判断结果：</p>
              <ul
                v-if="automaticGenerationDebugState.l73.decisions?.length"
                class="pipeline-list"
              >
                <li
                  v-for="decision in automaticGenerationDebugState.l73.decisions"
                  :key="`${decision.teamIndex}:${decision.operatorId}`"
                >
                  班{{ Number(decision.teamIndex || 0) + 1 }}
                  {{ getOperatorName(decision.operatorId) }}
                  （{{ decision.operatorId }}）：
                  {{ getL73ActionLabel(decision.action) }}；
                  {{ getL73ReasonLabel(decision.reason) }}
                </li>
              </ul>
              <p v-else>没有可记录的中枢干员判断。</p>
              <p>各班撤下：</p>
              <ul
                v-if="
                  Object.keys(
                    automaticGenerationDebugState.l73
                      .removedOperatorIdsByTeamIndex || {},
                  ).length
                "
                class="pipeline-list"
              >
                <li
                  v-for="(operatorIds, teamIndex) in automaticGenerationDebugState
                    .l73.removedOperatorIdsByTeamIndex"
                  :key="`l73-removed:${teamIndex}`"
                >
                  班{{ Number(teamIndex) + 1 }}：
                  {{ getCandidateNames(operatorIds) }}
                </li>
              </ul>
              <p v-else>无。</p>
              <p>撤换后补位：</p>
              <ul
                v-if="automaticGenerationDebugState.l73.lateFillState?.teamEntries?.length"
                class="pipeline-list"
              >
                <li
                  v-for="entry in automaticGenerationDebugState.l73.lateFillState
                    .teamEntries"
                  :key="`l73-fill:${entry.teamIndex}`"
                >
                  班{{ Number(entry.teamIndex || 0) + 1 }}：
                  {{ getCandidateNames(entry.operatorIds) }}；
                  空位 {{ entry.emptySlotCount }}
                </li>
              </ul>
              <p v-else>无。</p>
            </template>
            <p v-else>尚未执行 L73。</p>
          </details>
        </template>
      </div>
    </details>

    <div class="pipeline-section-label">组装后计算</div>

    <details class="pipeline-stage">
      <summary>
        <code>L74</code> 同班联动与排班冲突检查
        <span>{{ duplicateOperatorChecks.length }} 项重复</span>
      </summary>
      <div class="pipeline-stage-content">
        <p v-if="!actualScheduleMetrics">
          排班尚未完整生成，暂不能检查同班冲突。
        </p>
        <template v-else>
          <p>
            各房间的同班联动结果已列在 L79 的班段计算中。
          </p>
          <p v-if="duplicateOperatorChecks.length === 0">
            当前排班没有检测到同班跨房间重复干员。
          </p>
          <ul v-else class="pipeline-list">
            <li
              v-for="item in duplicateOperatorChecks"
              :key="`${item.stateIndex}:${item.operatorKey}`"
            >
              {{ item.shiftName }}：{{ item.operatorName }} 同时位于
              {{ item.rooms.join("、") }}
            </li>
          </ul>
        </template>
      </div>
    </details>

    <details
      v-if="actualScheduleMetrics || l79Input?.schedule?.plans"
      class="pipeline-stage"
    >
      <summary>
        <code>L79</code> 排班实际效率
        <span v-if="actualScheduleMetrics">
          {{ actualScheduleMetrics.cycleHours }}h 周期，
          {{ actualScheduleMetrics.calculatedRoomCount }} /
          {{ actualScheduleMetrics.roomCount }} 间已计算
        </span>
        <span v-else>已生成入参，等待实际效率结算</span>
      </summary>
      <div class="pipeline-stage-content">
        <details v-if="l79Input?.schedule?.plans" class="pipeline-nested">
          <summary>L79 实际入参</summary>
          <div class="pipeline-actual-room-list">
            <article
              v-for="room in l79InputRoomRows"
              :key="room.key"
              class="pipeline-actual-room"
            >
              <header>
                <strong>
                  班段 {{ room.planIndex + 1 }} / {{ room.roomType }} #{{
                    room.roomIndex + 1
                  }}
                </strong>
                <span>{{ room.durationMinutes }} 分钟</span>
              </header>
              <small>
                {{ room.planName || "--" }} / Lv.{{ room.level ?? "--" }}
                <template v-if="room.product"> / {{ room.product }}</template>
              </small>
              <small>
                进驻：
                <template v-if="room.operators.length">
                  <span
                    v-for="operator in room.operators"
                    :key="`${room.key}:${operator}`"
                  >
                    {{ operator }}
                  </span>
                </template>
                <template v-else>无人</template>
              </small>
            </article>
          </div>
          <details class="pipeline-nested">
            <summary>
              operatorProfiles（{{ l79InputOperatorProfileRows.length }} 名）
            </summary>
            <ul class="pipeline-roster">
              <li
                v-for="profile in l79InputOperatorProfileRows"
                :key="profile.charId"
              >
                <strong>{{ profile.charId || "--" }}</strong>
                <span>
                  精 {{ profile.elite ?? "--" }} / Lv.{{
                    profile.level ?? "--"
                  }}
                </span>
              </li>
            </ul>
          </details>
          <details class="pipeline-nested">
            <summary>完整 L79 入参 JSON</summary>
            <pre>{{ formatJson(l79Input) }}</pre>
          </details>
        </details>

        <details
          v-if="l79Settlement?.states?.length"
          class="pipeline-nested"
        >
          <summary>
            L79 统一资源流与无人机系数
            <span>状态：{{ l79Settlement.calculationStatus || "--" }}</span>
          </summary>
          <div class="pipeline-actual-room-list">
            <article
              v-for="room in l79SettlementRoomRows"
              :key="`${room.stateIndex}:${room.roomId}`"
              class="pipeline-actual-room"
              :class="{ unavailable: room.calculationStatus !== 'calculated' }"
            >
              <header>
                <strong>
                  班段 {{ room.stateIndex + 1 }} /
                  {{ room.type || "--" }} / {{ room.productionId || "all" }}
                </strong>
                <span>{{ room.calculationStatus }}</span>
              </header>
              <small>
                效率：
                {{
                  Object.entries(room.efficiency || {})
                    .filter(([, value]) => value !== null)
                    .map(([key, value]) => `${key} ${formatPercent(value)}`)
                    .join("；") || "无"
                }}
              </small>
              <small>
                每小时：{{ formatL79Flow(room.hourly) }}
              </small>
              <small>
                每架无人机：{{ formatL79Flow(room.perDrone) }}
              </small>
              <small v-if="room.operatorIds?.length">
                在岗：{{ formatDebugOperatorIds(room.operatorIds) }}
              </small>
              <small v-for="(message, index) in room.message || []" :key="index">
                {{ message.level }}：{{ message.text }}
              </small>
            </article>
          </div>
          <details
            v-if="l79Settlement?.crossFacilityResourceFlow?.length"
            class="pipeline-nested"
          >
            <summary>跨设施资源流</summary>
            <div class="pipeline-actual-room-list">
              <article
                v-for="flow in l79Settlement.crossFacilityResourceFlow"
                :key="flow.shift"
                class="pipeline-actual-room"
              >
                <header>
                  <strong>班段 {{ flow.shift }}</strong>
                </header>
                <small>
                  感知信息 {{ formatNumber(flow.perceptionInformation) }}；
                  无声共鸣 {{ formatNumber(flow.silentResonance) }}；
                  人间烟火 {{ formatNumber(flow.humanFireworks) }}
                </small>
              </article>
            </div>
            <details class="pipeline-nested">
              <summary>跨设施资源流 JSON</summary>
              <pre>{{ formatJson(l79Settlement.crossFacilityResourceFlow) }}</pre>
            </details>
          </details>
        </details>

        <template v-if="actualScheduleMetrics">
        <div class="pipeline-actual-facilities">
          <article
            v-for="facility in actualScheduleMetrics.facilities.filter(
              (item) => item.calculatedRoomCount,
            )"
            :key="facility.facility"
            class="pipeline-actual-facility"
          >
            <span>{{ getActualScheduleFacilityLabel(facility.facility) }}</span>
            <strong>{{
              formatActualSchedulePercent(facility.averageEfficiency)
            }}</strong>
            <small>
              {{ facility.calculatedRoomCount }} / {{ facility.roomCount }} 间
              <template v-if="facility.averageControlCenterBonusPercent">
                ，中枢实际
                {{
                  formatActualSchedulePercent(
                    facility.averageControlCenterBonusPercent,
                  )
                }}
              </template>
            </small>
          </article>
        </div>

        <div class="pipeline-actual-room-list">
          <article
            v-for="room in actualScheduleMetrics.rooms"
            :key="room.key"
            class="pipeline-actual-room"
            :class="{ unavailable: !room.isCalculated }"
          >
            <header>
              <strong>{{ room.label }}</strong>
              <span v-if="room.isCalculated">
                {{ formatActualSchedulePercent(room.averageEfficiency) }}
              </span>
              <span v-else>
                {{ getActualScheduleCalculationLabel(room.calculationStatus) }}
              </span>
            </header>
            <small v-if="room.isCalculated">
              <template v-if="room.product">
                {{ room.product }}，
              </template>
              中枢实际
              {{
                formatActualSchedulePercent(
                  room.averageControlCenterBonusPercent,
                )
              }}
            </small>
            <small v-else>
              {{ room.calculatedDurationHours }} / {{ room.durationHours }}h 可计算
            </small>

            <details class="pipeline-actual-room-details">
              <summary>查看班段计算</summary>
              <div>
                <span
                  v-for="segment in room.segments"
                  :key="`${room.key}:${segment.startHour}:${segment.durationHours}`"
                >
                  {{ segment.startHour }}h 起 {{ segment.durationHours }}h，
                  {{ formatActualSchedulePercent(segment.efficiency) }}，
                  {{ getSameShiftBindingStatusLabel(segment.sameShiftBindingStatus) }}
                  <template v-if="segment.calculated">
                    ，中枢
                    {{
                      formatActualSchedulePercent(
                        segment.controlCenterBonusPercent,
                      )
                    }}
                  </template>
                </span>
              </div>
            </details>
          </article>
        </div>

        <div class="pipeline-final-efficiency-trace">
          <h4>排班表显示值明细</h4>
          <p>
            直接读取排班预览的 <code>room.efficiency</code>，与排班表卡片使用同一数值。
          </p>
          <details
            v-for="row in finalEfficiencyTraceRows"
            :key="row.key"
            class="pipeline-actual-room-details pipeline-final-efficiency-trace-row"
          >
            <summary>
              班段 {{ row.stateIndex + 1 }}（{{ row.startHour }}h 起，{{
                row.durationHours
              }}h）/ {{ row.label }}：{{ formatPercent(row.efficiency) }}
              <span>{{ getFinalEfficiencyTraceModeLabel(row) }}</span>
            </summary>
            <div>
              <span>
                成员：{{ row.operators || "无人" }}
                <template v-if="row.product">；产物 {{ row.product }}</template>
                <template v-if="row.stationLevel">
                  ；Lv.{{ row.stationLevel }}
                </template>
                <template v-if="row.candidateName">
                  ；候选 {{ row.candidateName }}
                </template>
              </span>
              <template v-if="row.status === 'calculated'">
                <span v-if="getFinalEfficiencyTraceMode(row) === 'automation'">
                  自动化技能复核
                  {{ formatPercent(row.breakdown.automationCalculation.totalPercent) }}
                  （真实发电站
                  {{ row.breakdown.automationCalculation.powerPlantCount }}
                  <template
                    v-if="
                      row.breakdown.automationCalculation.supportOperatorId
                    "
                  >
                    + 承曦格雷伊触发的设施条件
                    {{
                      formatSignedPercent(
                        Number(
                          row.breakdown.automationCalculation
                            .effectivePowerPlantCount,
                        ) -
                          Number(
                            row.breakdown.automationCalculation.powerPlantCount,
                          ),
                      )
                    }}
                  </template>
                  ，有效设施数
                  {{ row.breakdown.automationCalculation.effectivePowerPlantCount }}）
                  + 在岗基础
                  {{ formatSignedPercent(row.breakdown.staffingBonusPercent) }}
                  + 实际中枢房间
                  {{
                    formatSignedPercent(
                      row.breakdown.actualControlCenterFacilityBonusPercent,
                    )
                  }}
                  + 实际中枢指定干员
                  {{
                    formatSignedPercent(
                      row.breakdown.actualControlCenterOperatorBonusPercent,
                    )
                  }}
                  + L65 当前班组
                  {{
                    formatSignedPercent(
                      row.breakdown.activeRosterBonusPercent || 0,
                    )
                  }}
                  + 资源链额外
                  {{
                    formatSignedPercent(
                      row.breakdown.resourceChainAdditionalBonusPercent || 0,
                    )
                  }}
                  = {{ formatPercent(row.efficiency) }}
                </span>
                <span v-else-if="getFinalEfficiencyTraceMode(row) === 'candidate'">
                  候选原始
                  {{ formatPercent(row.breakdown.candidateTotalPercent) }}
                  - 候选期中枢指定干员预估
                  {{
                    formatPercent(
                      row.breakdown.estimatedControlCenterOperatorBonusPercent,
                    )
                  }}
                  + 在岗基础
                  {{ formatSignedPercent(row.breakdown.staffingBonusPercent) }}
                  + 实际中枢房间
                  {{
                    formatSignedPercent(
                      row.breakdown.actualControlCenterFacilityBonusPercent,
                    )
                  }}
                  + 实际中枢指定干员
                  {{
                    formatSignedPercent(
                      row.breakdown.actualControlCenterOperatorBonusPercent,
                    )
                  }}
                  + L65 当前班组
                  {{
                    formatSignedPercent(
                      row.breakdown.activeRosterBonusPercent || 0,
                    )
                  }}
                  + 资源链额外
                  {{
                    formatSignedPercent(
                      row.breakdown.resourceChainAdditionalBonusPercent || 0,
                    )
                  }}
                  = {{ formatPercent(row.efficiency) }}
                </span>

                <template v-else-if="getFinalEfficiencyTraceMode(row) === 'finalRoster'">
                  <span>
                    基础
                    {{
                      formatPercent(
                        row.finalRosterCalculation.calculation?.basePercent,
                      )
                    }}
                    + 本地规则
                    {{
                      formatSignedPercent(
                        row.finalRosterCalculation.calculation?.localBonusPercent,
                      )
                    }}
                    + 在岗基础
                    {{
                      formatSignedPercent(
                        row.finalRosterCalculation.staffingBonusPercent,
                      )
                    }}
                    + 实际中枢房间
                    {{
                      formatSignedPercent(
                        row.finalRosterCalculation.controlCenterFacilityBonus,
                      )
                    }}
                    + 实际中枢指定干员
                    {{
                      formatSignedPercent(
                        row.finalRosterCalculation.controlCenterOperatorBonus,
                      )
                    }}
                    = 最终名单小计
                    {{ formatPercent(row.finalRosterCalculation.value) }}
                  </span>
                  <span
                    v-for="rule in row.finalRosterCalculation.calculation
                      ?.appliedRules || []"
                    :key="`${row.key}:${rule.id}:${rule.ownerCharId || ''}`"
                  >
                    规则 {{ rule.id }}：{{ getRuleOwnerName(rule) }}
                    {{ formatSignedPercent(rule.percent) }}
                    <template v-if="rule.multiplier">
                      （同室 x{{ rule.multiplier }}）
                    </template>
                  </span>
                  <span>
                    最终名单小计
                    {{ formatPercent(row.finalRosterCalculation.value) }}
                    + L65 当前班组
                    {{
                      formatSignedPercent(
                        row.breakdown.activeRosterBonusPercent || 0,
                      )
                    }}
                    + 资源链额外
                    {{
                      formatSignedPercent(
                        row.breakdown.resourceChainAdditionalBonusPercent || 0,
                      )
                    }}
                    = {{ formatPercent(row.efficiency) }}
                  </span>
                </template>

                <template v-else-if="getFinalEfficiencyTraceMode(row) === 'closure'">
                  <span>
                    队友普通订单：
                    {{
                      formatPercent(
                        row.closureCalculation.normalCoreBonusPercent,
                      )
                    }}
                    + 补位
                    {{
                      formatPercent(
                        row.closureCalculation.fallbackOrderBonusPercent,
                      )
                    }}
                    + 中枢指定干员
                    {{
                      formatPercent(
                        row.closureCalculation.controlCenterOrderBonusPercent,
                      )
                    }}
                    + 在岗基础
                    {{
                      formatPercent(row.closureCalculation.staffingBonusPercent)
                    }}
                    = {{ formatPercent(row.closureCalculation.teammateOrderBonusPercent) }}
                  </span>
                  <span
                    v-for="bonus in row.closureCalculation
                      .controlCenterBonusByOperator || []"
                    :key="`${row.key}:closure:${bonus.operatorId}`"
                  >
                    中枢指定 {{ bonus.name }}：{{
                      formatSignedPercent(bonus.bonusPercent)
                    }}
                  </span>
                  <span>
                    特别订单等效
                    {{
                      formatPercent(
                        row.closureCalculation.tradeEquivalentTotalPercent,
                      )
                    }}
                    + 实际中枢房间
                    {{
                      formatSignedPercent(
                        row.breakdown.actualControlCenterFacilityBonusPercent,
                      )
                    }}
                    + L65 当前班组
                    {{
                      formatSignedPercent(
                        row.breakdown.activeRosterBonusPercent || 0,
                      )
                    }}
                    + 资源链额外
                    {{
                      formatSignedPercent(
                        row.breakdown.resourceChainAdditionalBonusPercent || 0,
                      )
                    }}
                    = {{ formatPercent(row.efficiency) }}
                  </span>
                  <span>
                    实际赤金卖出 {{ formatNumber(row.closureCalculation.actualGoldSalePerHour) }} / h；
                    虚拟赤金 {{ formatNumber(row.closureCalculation.virtualGoldProductionPerHour) }} / h；
                    等效赤金卖出
                    {{ formatNumber(row.closureCalculation.equivalentGoldSalePerHour) }} / h
                  </span>
                </template>

                <span
                  v-for="bonus in row.controlCenterOperatorBonuses"
                  :key="`${row.key}:control:${bonus.operatorId}`"
                >
                  实际中枢指定 {{ getOperatorName(bonus.operatorId) }}：{{
                    formatSignedPercent(bonus.bonusPercent)
                  }}
                </span>
                <span
                  v-for="effect in row.breakdown.activeRosterEffects || []"
                  :key="`${row.key}:active:${effect.ruleId}:${effect.ownerId}`"
                >
                  L65 {{ effect.ruleId }}：{{ effect.ownerName }}
                  {{ formatSignedPercent(effect.bonusPercent) }}（{{
                    effect.matchingOperatorNames.join("、")
                  }}）
                </span>
              </template>
              <span v-else>
                未生成可显示的最终效率：
                {{ getActualScheduleCalculationLabel(row.status) }}
                <template v-if="getFinalEfficiencyTraceReason(row)">
                  （{{ getFinalEfficiencyTraceReason(row) }}）
                </template>
              </span>
            </div>
          </details>
        </div>
        </template>
      </div>
    </details>

    <details v-if="actualScheduleMetrics?.yield" class="pipeline-stage">
      <summary>
        <code>L80</code> 排班实际日产出
        <span>
          {{ actualScheduleMetrics.yield.calculatedRoomCount }} /
          {{ actualScheduleMetrics.yield.roomCount }} 间已纳入核算
        </span>
      </summary>
      <div class="pipeline-stage-content">
        <div class="pipeline-yield-resources">
          <article
            v-for="resource in actualScheduleMetrics.yield.resources"
            :key="resource.resource"
            class="pipeline-yield-resource"
            :class="{ unavailable: !resource.isCalculated }"
          >
            <span>{{ resource.label }}</span>
            <strong>{{ formatYield(resource.outputPerDay) }}</strong>
            <small>{{ resource.unit }}；{{ getYieldResourceDetail(resource) }}</small>
          </article>
        </div>
        <p>
          {{
            actualScheduleMetrics.yield.assumptions
              .map(getYieldAssumptionText)
              .filter(Boolean)
              .join(" ")
          }}
        </p>
        <p
          v-if="
            actualScheduleMetrics.yield.resourceFlows?.orundum
              ?.lmdConsumptionPerDay !== null
          "
        >
          搓玉制造总账：{{
            actualScheduleMetrics.yield.resourceFlows.orundum
              .craftMaterialLabel || "--"
          }} {{
            formatYield(
              actualScheduleMetrics.yield.resourceFlows.orundum
                .craftMaterialConsumptionPerDay,
            )
          }} / 天；龙门币消耗 {{
            formatYield(
              actualScheduleMetrics.yield.resourceFlows.orundum
                .lmdConsumptionPerDay,
            )
          }} / 天；源石碎片消耗 {{
            formatYield(
              actualScheduleMetrics.yield.resourceFlows.orundum
                .shardConsumptionPerDay,
            )
          }} / 天
        </p>
        <div
          v-if="actualScheduleMetrics.yield.tradingSettlements?.length"
          class="pipeline-actual-room-list"
        >
          <article
            v-for="settlement in actualScheduleMetrics.yield.tradingSettlements"
            :key="settlement.key"
            class="pipeline-actual-room"
            :class="{ unavailable: !settlement.isCalculated }"
          >
            <header>
              <strong>{{ settlement.label }}</strong>
              <span>{{ settlement.typeLabel }}</span>
            </header>
            <p
              v-if="
                settlement.isCalculated && settlement.product === 'orundum'
              "
            >
              合成玉 {{ formatYield(settlement.orundumOutputPerDay) }} / 天；
              源石碎片消耗 {{ formatYield(settlement.shardConsumptionPerDay) }} / 天
            </p>
            <p v-else-if="settlement.isCalculated">
              龙门币 {{ formatYield(settlement.lmdOutputPerDay) }} / 天；
              赤金消耗 {{ formatYield(settlement.goldConsumptionPerDay) }} / 天；
              虚拟赤金 {{ formatYield(settlement.virtualGoldOutputPerDay) }} / 天
            </p>
            <p v-else>贸易资源流未完整计算。</p>
            <small v-for="(segment, index) in settlement.segments" :key="index">
              班段 {{ index + 1 }}（{{ formatYield(segment.durationHours) }}h）：
              {{ segment.typeLabel }}，
              <template v-if="settlement.product === 'orundum'">
                合成玉 {{ formatYield(segment.orundumOutput) }}，
                源石碎片消耗 {{ formatYield(segment.shardConsumption) }}
              </template>
              <template v-else>
                龙门币 {{ formatYield(segment.lmdOutput) }}，
                赤金消耗 {{ formatYield(segment.goldConsumption) }}，
                虚拟赤金 {{ formatYield(segment.virtualGoldOutput) }}
              </template>
              <template v-if="segment.operatorIds?.length">
                ，在岗 {{ getOperatorNames(segment.operatorIds) }}
              </template>
              <code v-if="segment.error">，P01：{{ segment.error }}</code>
            </small>
          </article>
        </div>
        <div
          v-if="actualScheduleMetrics.yield.droneTargetSettlements?.length"
          class="pipeline-actual-room-list"
        >
          <article
            v-for="settlement in actualScheduleMetrics.yield.droneTargetSettlements"
            :key="settlement.key"
            class="pipeline-actual-room"
            :class="{
              unavailable:
                !settlement.isCalculated,
            }"
          >
            <header>
              <strong>无人机资源差额（全投此站）</strong>
              <span>{{
                settlement.label
              }}</span>
            </header>
            <p
              v-if="
                settlement.isCalculated
              "
            >
              {{
                settlement.resourceEffects?.primaryResource === "orundum"
                  ? "合成玉"
                  : settlement.resourceLabel
              }}
              +{{
                formatYield(
                  settlement.resourceEffects?.primaryOutput,
                )
              }}
              / 轮换
              <template v-if="settlement.resourceEffects?.netGold !== null">
                ；净赤金
                {{
                  formatYield(
                    settlement.resourceEffects?.netGold,
                  )
                }}
                / 轮换
              </template>
              <template
                v-if="settlement.resourceEffects?.shardConsumption !== null"
              >
                ；源石碎片消耗
                {{
                  formatYield(
                    settlement.resourceEffects?.shardConsumption,
                  )
                }}
                / 轮换
              </template>
              <template
                v-if="settlement.resourceEffects?.lmdConsumption !== null"
              >
                ；龙门币消耗
                {{
                  formatYield(
                    settlement.resourceEffects?.lmdConsumption,
                  )
                }}
                / 轮换
              </template>
            </p>
            <p v-else>目标房间存在未完成效率核算的班段。</p>
            <small
              v-for="(segment, index) in settlement.segments"
              :key="index"
            >
              班段 {{ index + 1 }}：{{ formatYield(segment.droneOutput) }} 架，
              加速 {{ formatYield(segment.acceleratedHours) }}h，
              房间裸加速 {{ segment.resourceLabel }} +{{ formatYield(segment.output) }}
              <template v-if="segment.tradingFlow">
                （{{ segment.tradingFlow.typeLabel }}；赤金消耗
                {{ formatYield(segment.tradingFlow.goldConsumption) }}，
                虚拟赤金
                {{ formatYield(segment.tradingFlow.virtualGoldOutput) }}，
                源石碎片消耗
                {{ formatYield(segment.tradingFlow.shardConsumption) }}，
                ）
              </template>
              <template v-if="segment.orundumManufactureFlow">
                （龙门币消耗
                {{ formatYield(segment.orundumManufactureFlow.lmdConsumption) }}，
                {{ segment.orundumManufactureFlow.craftMaterialLabel }}消耗
                {{ formatYield(segment.orundumManufactureFlow.craftMaterialConsumption) }}）
              </template>
            </small>
          </article>
        </div>
        <section
          v-if="droneTableDebug.columns.length"
          class="pipeline-drone-table-debug"
        >
          <header>
            <strong>无人机表格原始数据</strong>
            <span>与页面无人机表逐格对应</span>
          </header>
          <div class="pipeline-drone-table-debug-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">班次</th>
                  <th
                    v-for="column in droneTableDebug.columns"
                    :key="column.key"
                    scope="col"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in droneTableDebug.rows" :key="row.key">
                  <th scope="row">
                    <strong>{{ row.label }}</strong>
                    <span>{{ formatYield(row.durationHours) }}h</span>
                    <small>{{ row.disabled ? "不使用无人机" : row.droneOrder }}</small>
                    <small v-if="row.droneCapacityReached">
                      已超出无人机上限
                    </small>
                    <small
                      v-else-if="
                        row.droneOrder === '留给下一班' &&
                        row.droneStoredOutput !== null
                      "
                    >
                      留给下一班 {{ formatYield(row.droneStoredOutput) }} 架
                    </small>
                  </th>
                  <td
                    v-for="cell in row.cells"
                    :key="cell.key"
                    :class="{
                      selected: cell.selected,
                      unavailable: !cell.isCalculated,
                    }"
                  >
                    <strong>
                      主表：
                      {{
                        cell.isCalculated
                          ? formatYield(cell.displayedOutput)
                          : "--"
                      }}
                    </strong>
                    <span>在岗：{{ cell.operators }}</span>
                    <span>无人机：{{ formatYield(cell.droneOutput) }} 架</span>
                    <span>加速：{{ formatYield(cell.acceleratedHours) }}h</span>
                    <span>房间原始：{{ formatYield(cell.rawOutput) }}</span>
                    <span>
                      资源：{{ cell.primaryResource || "--" }}
                    </span>
                    <span v-if="cell.goldConsumption !== null">
                      订单消耗赤金：{{ formatYield(cell.goldConsumption) }}
                    </span>
                    <span v-if="cell.shardConsumption !== null">
                      订单消耗源石碎片：{{
                        formatYield(cell.shardConsumption)
                      }}
                    </span>
                    <span v-if="cell.lmdConsumption !== null">
                      源石碎片制造消耗龙门币：{{
                        formatYield(cell.lmdConsumption)
                      }}
                    </span>
                    <span v-if="cell.craftMaterialConsumption !== null">
                      {{ cell.craftMaterialLabel || cell.craftMaterial }}消耗：{{
                        formatYield(cell.craftMaterialConsumption)
                      }}
                    </span>
                    <span v-if="cell.netGold !== null">
                      净赤金：{{ formatYield(cell.netGold) }}
                    </span>
                    <code v-if="cell.unavailableReason">
                      {{ cell.unavailableReason }}
                    </code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div
          v-if="actualScheduleMetrics.yield.droneCharge"
          class="pipeline-actual-room-list"
        >
          <article
            class="pipeline-actual-room"
            :class="{
              unavailable: !actualScheduleMetrics.yield.droneCharge.isCalculated,
            }"
          >
            <header>
              <strong>无人机充能</strong>
              <span>发电站最终在岗状态</span>
            </header>
            <p v-if="actualScheduleMetrics.yield.droneCharge.isCalculated">
              {{ formatYield(actualScheduleMetrics.yield.droneCharge.droneOutputPerDay) }}
              架 / 天
            </p>
            <p v-else>发电站存在未完成效率核算的班段。</p>
            <small
              v-for="(segment, index) in actualScheduleMetrics.yield.droneCharge.segments"
              :key="index"
            >
              班段 {{ index + 1 }}（{{ formatYield(segment.durationHours) }}h）：
              在岗 +{{ formatYield(segment.operatorBonusPercent) }}%，
              技能 +{{ formatYield(segment.skillBonusPercent) }}%，
              合计 +{{ formatYield(segment.chargeBonusPercent) }}%；
              无人机 {{ formatYield(segment.droneOutput) }} 架
            </small>
            <small
              v-for="segment in actualScheduleMetrics.yield.droneCharge.segments"
              :key="`power:${segment.durationHours}:${segment.rooms.map((room) => room.key).join('|')}`"
            >
              <template v-for="(room, roomIndex) in segment.rooms" :key="room.key">
                <template v-if="roomIndex">；</template>
                {{ room.label }}：{{ room.operatorCount }} 人在岗 +{{
                  formatYield(room.operatorBonusPercent)
                }}%，技能 +{{ formatYield(room.skillBonusPercent) }}%
              </template>
            </small>
          </article>
        </div>
      </div>
    </details>

    <div class="pipeline-section-label">排班追踪</div>

    <details class="pipeline-stage">
      <summary><code>排班追踪</code> 贸易站轮换</summary>
      <div class="pipeline-stage-content">
        <p v-if="tradingRotationTraceRows.length === 0">
          当前布局没有进入排班的贸易站。
        </p>
        <article
          v-for="row in tradingRotationTraceRows"
          :key="row.group.id"
          class="pipeline-actual-room"
        >
          <header>
            <strong>{{ row.group.label }}</strong>
            <span>{{ row.group.stations?.length || 0 }} 间</span>
          </header>

          <details class="pipeline-actual-room-details">
            <summary>自动抓取结果（L70）</summary>
            <div v-if="row.automatic.length">
              <span
                v-for="(selection, index) in row.automatic"
                :key="`${selection.cohortId}:${index}`"
              >
                {{ selection.cohortId }}：{{ selection.candidateName }} /
                {{ getCandidateNames(selection.operatorIds) }}
                <template v-if="selection.fallbackOperatorIds.length">
                  / 补位 {{ getCandidateNames(selection.fallbackOperatorIds) }}
                </template>
              </span>
            </div>
            <div v-else><span>本轮未记录自动抓取结果。</span></div>
          </details>

          <details class="pipeline-actual-room-details">
            <summary>最终组装输入（L62 / L63）</summary>
            <div v-if="row.assembly.length">
              <span
                v-for="(assignment, index) in row.assembly"
                :key="`${assignment.segmentIndex}:${assignment.stationIndex}:${index}`"
              >
                班段 {{ assignment.segmentIndex + 1 }}（{{
                  assignment.durationHours
                }}h）/ 站点 {{ assignment.stationIndex + 1 }} /
                Lv.{{ assignment.stationLevel || "--" }} / 队伍
                {{
                  assignment.activeTeamIndexes
                    .map((teamIndex) => teamIndex + 1)
                    .join("、") || "--"
                }}：{{ getCandidateNames(assignment.operatorIds) }}
              </span>
            </div>
            <div v-else><span>该贸易站尚未形成组装输入。</span></div>
          </details>

          <details class="pipeline-actual-room-details">
            <summary>进入预览前的实际输入（L74 后）</summary>
            <div v-if="row.postAlignment.length">
              <span
                v-for="(assignment, index) in row.postAlignment"
                :key="`${assignment.segmentIndex}:${assignment.stationIndex}:${index}`"
              >
                班段 {{ assignment.segmentIndex + 1 }}（{{
                  assignment.durationHours
                }}h）/ 站点 {{ assignment.stationIndex + 1 }} /
                Lv.{{ assignment.stationLevel || "--" }} / 队伍
                {{
                  assignment.activeTeamIndexes
                    .map((teamIndex) => teamIndex + 1)
                    .join("、") || "--"
                }}：{{ getCandidateNames(assignment.operatorIds) }}
              </span>
            </div>
            <div v-else><span>尚未形成可供预览的排班输入。</span></div>
          </details>

          <details class="pipeline-actual-room-details">
            <summary>最终预览班次</summary>
            <div v-if="row.finalSchedule.length">
              <span
                v-for="assignment in row.finalSchedule"
                :key="`${assignment.stateIndex}:${assignment.label}`"
              >
                班次 {{ assignment.stateIndex + 1 }}（{{
                  assignment.startHour
                }}-{{ assignment.startHour + assignment.durationHours }}h）/
                {{ assignment.label }} / Lv.{{
                  assignment.stationLevel || "--"
                }}：{{ getCandidateNames(assignment.operatorIds) }}
                <template v-if="assignment.manuallyEdited">
                  （手动覆盖）
                </template>
              </span>
            </div>
            <div v-else><span>最终预览尚未生成。</span></div>
          </details>
        </article>
      </div>
    </details>
  </section>
</template>

<style scoped>
.pipeline-debug {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.pipeline-debug-heading,
.pipeline-group > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.pipeline-debug-heading h3,
.pipeline-group strong,
.pipeline-stage p {
  margin: 0;
}

.pipeline-debug-heading h3 {
  font-size: 15px;
}

.pipeline-debug-heading p,
.pipeline-debug-heading > span,
.pipeline-group > header > span,
.pipeline-stage p,
.pipeline-list,
.pipeline-settlement-state {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pipeline-debug-heading > span {
  color: var(--riic-blue);
}

.pipeline-section-label {
  padding-top: 4px;
  color: var(--riic-blue);
  font-size: 12px;
  font-weight: 600;
}

.pipeline-stage {
  border-top: 1px solid var(--c-border-color);
}

.pipeline-stage > summary,
.pipeline-nested > summary {
  padding: 10px 0;
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.pipeline-stage code {
  margin-right: 6px;
  color: var(--riic-blue);
}

.pipeline-stage-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 0 10px;
}

.pipeline-copy-debug-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pipeline-copy-debug-actions button {
  padding: 5px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  color: var(--c-text-color-primary);
  background: var(--c-page-background-color);
  cursor: pointer;
}

.pipeline-copy-debug-actions button:hover {
  border-color: var(--c-primary-color);
  color: var(--c-primary-color);
}

.pipeline-copy-debug-actions small {
  color: var(--c-text-color-secondary);
}

.pipeline-copy-debug-text {
  box-sizing: border-box;
  width: 100%;
  min-height: 320px;
  resize: vertical;
  padding: 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  color: var(--c-text-color-primary);
  background: var(--c-page-background-color-secondary);
  font: 12px/1.5 Consolas, "Microsoft YaHei", monospace;
  white-space: pre;
}

.pipeline-group,
.pipeline-settlement-state {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 9px 10px;
  border-left: 3px solid var(--riic-blue);
  background: var(--c-page-background-color-secondary);
}

.pipeline-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding-left: 18px;
}

.pipeline-roster {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pipeline-roster li {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 6px;
  padding: 5px 7px;
  background: var(--c-page-background-color-secondary);
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.pipeline-roster strong,
.pipeline-roster span,
.pipeline-roster code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pipeline-roster strong {
  flex: 0 0 auto;
  color: var(--c-text-color);
}

.pipeline-roster span {
  flex: 1 1 auto;
}

.pipeline-roster code {
  flex: 0 1 auto;
  color: var(--riic-blue);
  font-size: 10px;
}

.pipeline-list span,
.pipeline-settlement-state span {
  margin-left: 6px;
}

.pipeline-nested {
  padding-left: 10px;
  border-left: 1px solid var(--c-border-color);
}

.pipeline-nested pre {
  overflow: auto;
  margin: 0;
  padding: 8px;
  background: var(--c-page-background-color-secondary);
  color: var(--riic-muted);
  font-size: 11px;
}

.pipeline-yield-resources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pipeline-yield-resource {
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 126px;
  padding: 7px 9px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
}

.pipeline-yield-resource > span,
.pipeline-yield-resource > small {
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.pipeline-yield-resource > strong {
  color: var(--riic-green);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.pipeline-yield-resource > small {
  grid-column: 1 / -1;
}

.pipeline-yield-resource.unavailable > strong {
  color: var(--riic-muted);
}

.pipeline-rule-list,
.pipeline-trial-list,
.pipeline-perception-scenario-list,
.pipeline-control-effect-list,
.pipeline-actual-room-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pipeline-rule-row {
  display: grid;
  grid-template-columns: minmax(175px, 0.7fr) minmax(240px, 1.2fr) minmax(
      200px,
      1fr
    );
  align-items: start;
  gap: 8px 16px;
  min-width: 0;
  padding: 8px 0 8px 10px;
  border-left: 3px solid var(--riic-orange);
  background: color-mix(
    in srgb,
    var(--riic-orange) 4%,
    var(--c-page-background-color)
  );
}

.pipeline-rule-row.matched {
  border-left-color: var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 4%,
    var(--c-page-background-color)
  );
}

.pipeline-rule-status,
.pipeline-rule-conditions,
.pipeline-rule-effects {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px 9px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.pipeline-rule-status {
  flex-wrap: nowrap;
  color: var(--riic-orange);
}

.pipeline-rule-row.matched .pipeline-rule-status {
  color: var(--riic-green);
}

.pipeline-rule-status code {
  overflow: hidden;
  color: var(--c-text-color);
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pipeline-rule-conditions span:not(.neutral) {
  color: var(--riic-orange);
}

.pipeline-rule-conditions span.matched {
  color: var(--riic-green);
}

.pipeline-rule-effects {
  color: var(--c-text-color);
}

.pipeline-trial-formula,
.pipeline-trial-note,
.pipeline-trial-note-list,
.pipeline-perception-plan p,
.pipeline-perception-plan li {
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.5;
}

.pipeline-trial-formula,
.pipeline-trial-note,
.pipeline-perception-plan p {
  margin: 0;
}

.pipeline-trial-note-list,
.pipeline-perception-plan ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding-left: 16px;
}

.pipeline-trial-note span + span::before {
  margin: 0 5px;
  color: var(--riic-muted);
  content: "/";
}

.pipeline-trial-scenario,
.pipeline-perception-scenario,
.pipeline-control-effect,
.pipeline-actual-room {
  padding: 8px 9px;
  border-left: 3px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
}

.pipeline-trial-scenario.baseline {
  border-left-color: var(--riic-muted);
}

.pipeline-trial-scenario.recommended,
.pipeline-control-effect,
.pipeline-actual-room {
  border-left-color: var(--riic-green);
}

.pipeline-trial-scenario.recommended,
.pipeline-control-effect,
.pipeline-actual-room {
  background: color-mix(
    in srgb,
    var(--riic-green) 4%,
    var(--c-page-background-color)
  );
}

.pipeline-perception-scenario {
  border-left-color: var(--riic-blue);
  background: color-mix(
    in srgb,
    var(--riic-blue) 4%,
    var(--c-page-background-color)
  );
}

.pipeline-trial-scenario > header,
.pipeline-perception-plan > header,
.pipeline-control-effect > header,
.pipeline-actual-room > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.pipeline-trial-scenario > header strong,
.pipeline-perception-scenario > header strong,
.pipeline-perception-plan > header strong,
.pipeline-control-effect-team,
.pipeline-actual-room > header strong {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.pipeline-trial-scenario > header span,
.pipeline-perception-plan > header span,
.pipeline-actual-room > header span {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.pipeline-trial-scenario.recommended > header span,
.pipeline-actual-room > header span {
  color: var(--riic-green);
}

.pipeline-trial-scenario > p,
.pipeline-trial-scenario > small {
  display: block;
  margin: 4px 0 0;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.pipeline-trial-items {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 7px 0 0;
  padding: 0;
  list-style: none;
}

.pipeline-trial-items li,
.pipeline-control-effect-steps li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 10px;
  min-width: 0;
  padding: 5px 7px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
  color: var(--c-text-color-secondary);
  font-size: 11px;
  line-height: 1.45;
}

.pipeline-trial-items li {
  display: grid;
}

.pipeline-trial-items strong,
.pipeline-control-effect-steps strong {
  color: var(--c-text-color);
}

.pipeline-perception-plan-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.pipeline-perception-plan {
  padding: 7px 8px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.pipeline-control-effect-target {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px 8px;
  margin: 5px 0 0;
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.pipeline-control-effect-target small {
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 400;
}

.pipeline-control-effect-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 7px 0 0;
  padding: 0;
  list-style: none;
}

.pipeline-control-effect-steps li > span,
.pipeline-control-effect-steps li > small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pipeline-control-effect-steps small {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.pipeline-control-effect-total {
  margin: 7px 0 0;
  color: var(--riic-green);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
}

.pipeline-actual-facilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pipeline-actual-facility {
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 126px;
  padding: 7px 9px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
}

.pipeline-actual-facility > span,
.pipeline-actual-facility > small,
.pipeline-actual-room > small {
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.pipeline-actual-facility > strong {
  color: var(--riic-blue);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.pipeline-actual-facility > small {
  grid-column: 1 / -1;
}

.pipeline-actual-room.unavailable {
  border-left-color: var(--c-border-color);
  background: var(--c-page-background-color);
}

.pipeline-actual-room.unavailable > header span {
  color: var(--riic-muted);
  font-size: 11px;
}

.pipeline-actual-room > small {
  display: block;
  margin-top: 3px;
}

.pipeline-drone-table-debug {
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
}

.pipeline-drone-table-debug > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 9px;
  border-bottom: 1px solid var(--c-border-color);
}

.pipeline-drone-table-debug > header strong {
  color: var(--c-text-color);
  font-size: 12px;
}

.pipeline-drone-table-debug > header span {
  color: var(--riic-muted);
  font-size: 11px;
}

.pipeline-drone-table-debug-scroll {
  overflow-x: auto;
}

.pipeline-drone-table-debug table {
  width: 100%;
  min-width: 820px;
  border-spacing: 0;
  border-collapse: collapse;
  table-layout: fixed;
}

.pipeline-drone-table-debug th,
.pipeline-drone-table-debug td {
  min-width: 0;
  padding: 7px 8px;
  border-right: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
  text-align: left;
  vertical-align: top;
}

.pipeline-drone-table-debug tr > :last-child {
  border-right: 0;
}

.pipeline-drone-table-debug tbody tr:last-child > * {
  border-bottom: 0;
}

.pipeline-drone-table-debug thead th {
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font-size: 11px;
  font-weight: 600;
}

.pipeline-drone-table-debug tbody th {
  width: 110px;
  background: var(--c-page-background-color);
}

.pipeline-drone-table-debug tbody th > strong,
.pipeline-drone-table-debug tbody th > span,
.pipeline-drone-table-debug tbody th > small,
.pipeline-drone-table-debug td > strong,
.pipeline-drone-table-debug td > span,
.pipeline-drone-table-debug td > code {
  display: block;
}

.pipeline-drone-table-debug tbody th > strong {
  color: var(--c-text-color);
  font-size: 12px;
}

.pipeline-drone-table-debug tbody th > span,
.pipeline-drone-table-debug tbody th > small,
.pipeline-drone-table-debug td > span {
  margin-top: 2px;
  color: var(--riic-muted);
  font-size: 10px;
  line-height: 1.35;
}

.pipeline-drone-table-debug td {
  background: var(--c-page-background-color);
}

.pipeline-drone-table-debug td.selected {
  box-shadow: inset 3px 0 0 var(--riic-blue);
}

.pipeline-drone-table-debug td.unavailable {
  background: color-mix(
    in srgb,
    var(--riic-orange) 5%,
    var(--c-page-background-color)
  );
}

.pipeline-drone-table-debug td > strong {
  color: var(--riic-blue);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.pipeline-drone-table-debug td > code {
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--riic-orange);
  font-size: 10px;
  line-height: 1.3;
}

.pipeline-actual-room-details {
  margin-top: 6px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.5;
}

.pipeline-actual-room-details summary {
  width: fit-content;
  cursor: pointer;
}

.pipeline-actual-room-details > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 5px;
}

.pipeline-final-efficiency-trace {
  margin-top: 12px;
}

.pipeline-final-efficiency-trace > h4 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.pipeline-final-efficiency-trace > p {
  margin: 3px 0 0;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.5;
}

.pipeline-final-efficiency-trace-row {
  margin-top: 7px;
  padding: 6px 8px;
  border-left: 2px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.pipeline-final-efficiency-trace-row[open] {
  border-left-color: var(--riic-green);
}

.pipeline-final-efficiency-trace-row summary {
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.pipeline-final-efficiency-trace-row summary > span {
  color: var(--riic-muted);
  font-size: 11px;
}

@media (max-width: 760px) {
  .pipeline-rule-row {
    grid-template-columns: 1fr;
  }
}
</style>
