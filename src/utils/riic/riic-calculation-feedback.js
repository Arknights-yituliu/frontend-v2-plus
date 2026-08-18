function toText(value) {
  return String(value || "").trim();
}

function formatShiftLabel(shifts, index) {
  const name = toText(shifts?.[index]?.name);
  return name || `班段 ${Number(index) + 1}`;
}

function getReasonDescription(code) {
  return {
      notSupported: "当前公式未支持这组在岗干员或缺少必要上下文。",
      tradingCalculationUnavailable: "贸易站计算未返回可用结果。",
      timeDependentOrderProbability: "当前订单概率缺少所需的时间相关信息。",
      invalidBonus: "当前房间加成数据无效。",
      efficiencyUnavailable: "房间最终效率尚未完成核算。",
      unsupportedProduct: "当前产物暂不支持产能核算。",
      unsupportedStationLevel: "当前设施等级暂不支持产能核算。",
      droneUnavailable: "无人机数量尚未完成计算。",
      targetMissing: "无人机目标房间未匹配到当前排班。",
      unsupportedDroneTarget: "当前设施不能作为无人机目标。",
    }[code] || "该段未完成计算，请携带以下信息反馈。";
}

function getRoomByKey(preview, stateIndex, roomKey) {
  return (preview?.states?.[stateIndex]?.rooms || []).find(
    (room) => toText(room?.key) === toText(roomKey),
  );
}

function findRoomByKey(preview, roomKey) {
  for (const state of preview?.states || []) {
    const room = (state?.rooms || []).find(
      (item) => toText(item?.key) === toText(roomKey),
    );
    if (room) {
      return room;
    }
  }

  return null;
}

function getOperatorNames(room, operatorTable) {
  const names = (room?.operators || [])
    .map((operator) => {
      const charId = toText(operator?.charId);
      return toText(operator?.name) || toText(operatorTable?.[charId]?.name);
    })
    .filter(Boolean);

  return [...new Set(names)];
}

function createFeedbackEntry({
  category,
  room,
  roomKey,
  roomLabel,
  product,
  errorCode,
  stateIndex,
  durationHours,
  preview,
  shifts,
  operatorTable,
}) {
  const resolvedRoom = room || getRoomByKey(preview, stateIndex, roomKey);
  const resolvedRoomKey = toText(roomKey || resolvedRoom?.key);
  const resolvedRoomLabel =
    toText(roomLabel) || toText(resolvedRoom?.label) || resolvedRoomKey;
  const resolvedProduct = toText(product || resolvedRoom?.product);
  const code = toText(errorCode) || "calculationUnavailable";
  const prefix = category === "drone" ? "无人机核算" : "产能核算";

  return {
    key: `${category}:${resolvedRoomKey}:${code}`,
    category,
    title: `${prefix}｜${resolvedRoomLabel}`,
    errorCode: category === "trade" ? `P01:${code}` : code,
    description: getReasonDescription(code),
    segments: [
      {
        key: `${stateIndex}:${resolvedRoomKey}:${code}`,
        shiftLabel: formatShiftLabel(shifts, stateIndex),
        durationHours: Number(durationHours) || 0,
        product: resolvedProduct,
        operators: getOperatorNames(resolvedRoom, operatorTable),
      },
    ],
  };
}

function addFeedbackEntry(entriesByKey, entry) {
  const previous = entriesByKey.get(entry.key);
  if (!previous) {
    entriesByKey.set(entry.key, entry);
    return;
  }

  previous.segments.push(...entry.segments);
}

function buildTradeFeedback({
  entriesByKey,
  actualScheduleMetrics,
  preview,
  shifts,
  operatorTable,
}) {
  for (const settlement of actualScheduleMetrics?.yield?.tradingSettlements ||
    []) {
    for (const [stateIndex, segment] of (settlement?.segments || []).entries()) {
      const errorCode = toText(segment?.error || segment?.unavailableReason);
      if (!errorCode) {
        continue;
      }

      const room = getRoomByKey(preview, stateIndex, settlement?.key);
      addFeedbackEntry(
        entriesByKey,
        createFeedbackEntry({
          category: "trade",
          room,
          roomKey: settlement?.key,
          roomLabel: settlement?.label,
          product: settlement?.product,
          errorCode,
          stateIndex,
          durationHours: segment?.durationHours,
          preview,
          shifts,
          operatorTable,
        }),
      );
    }
  }
}

function buildDirectRoomFeedback({
  entriesByKey,
  actualScheduleMetrics,
  preview,
  shifts,
  operatorTable,
}) {
  for (const roomSummary of actualScheduleMetrics?.yield?.rooms || []) {
    const representativeRoom = findRoomByKey(preview, roomSummary?.key);
    if (toText(representativeRoom?.facility) === "trading") {
      continue;
    }

    for (const [stateIndex, segment] of (roomSummary?.segments || []).entries()) {
      const errorCode = toText(segment?.unavailableReason);
      if (!errorCode) {
        continue;
      }

      addFeedbackEntry(
        entriesByKey,
        createFeedbackEntry({
          category: "room",
          roomKey: roomSummary?.key,
          roomLabel: roomSummary?.label,
          product: roomSummary?.product,
          errorCode,
          stateIndex,
          durationHours: segment?.durationHours,
          preview,
          shifts,
          operatorTable,
        }),
      );
    }
  }
}

function buildDroneFeedback({
  entriesByKey,
  actualScheduleMetrics,
  preview,
  shifts,
  operatorTable,
}) {
  const settlement = actualScheduleMetrics?.yield?.droneTargetSettlement;
  for (const [stateIndex, segment] of (settlement?.segments || []).entries()) {
    const targetKey = toText(segment?.targetKey);
    const errorCode = toText(segment?.unavailableReason);
    if (!targetKey || !errorCode) {
      continue;
    }

    addFeedbackEntry(
      entriesByKey,
      createFeedbackEntry({
        category: "drone",
        roomKey: targetKey,
        roomLabel: segment?.targetLabel,
        errorCode,
        stateIndex,
        durationHours: segment?.durationHours,
        preview,
        shifts,
        operatorTable,
      }),
    );
  }
}

export function buildRiicCalculationFeedback({
  actualScheduleMetrics,
  preview,
  shifts,
  operatorTable,
} = {}) {
  const entriesByKey = new Map();

  buildTradeFeedback({
    entriesByKey,
    actualScheduleMetrics,
    preview,
    shifts,
    operatorTable,
  });
  buildDirectRoomFeedback({
    entriesByKey,
    actualScheduleMetrics,
    preview,
    shifts,
    operatorTable,
  });
  buildDroneFeedback({
    entriesByKey,
    actualScheduleMetrics,
    preview,
    shifts,
    operatorTable,
  });

  return [...entriesByKey.values()].map((entry) => ({
    ...entry,
    segments: entry.segments.map((segment) => ({
      ...segment,
      durationLabel: segment.durationHours > 0 ? `${segment.durationHours}h` : "",
      operatorLabel: segment.operators.length
        ? segment.operators.join("、")
        : "未识别到在岗干员",
    })),
  }));
}

export function formatRiicCalculationFeedback({
  sourceLabel,
  layoutLabel,
  feedback,
} = {}) {
  const lines = [
    "RIIC 排班计算反馈",
    `数据源：${toText(sourceLabel) || "未标记"}`,
    `布局：${toText(layoutLabel) || "未标记"}`,
  ];

  for (const entry of feedback || []) {
    lines.push("");
    lines.push(`${entry.title}｜${entry.errorCode}`);
    lines.push(entry.description);
    for (const segment of entry.segments || []) {
      lines.push(
        `- ${segment.shiftLabel}${segment.durationLabel ? `（${segment.durationLabel}）` : ""}｜${segment.product || "未标记产物"}｜在岗：${segment.operatorLabel}`,
      );
    }
  }

  return lines.join("\n");
}
