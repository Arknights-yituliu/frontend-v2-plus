import { calculateRiicStableDailyYield } from "../../riicYield/riicYieldCore.js";

const ENGINE_ID = "riic-yield-core";

const RESOURCE_LABELS = Object.freeze({
  lmd: "龙门币",
  exp: "经验",
  gold: "赤金",
  orundum: "合成玉",
  originiumShard: "源石碎片",
});

const FACILITY_LABELS = Object.freeze({
  trading: "贸易站",
  manufacture: "制造站",
});

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStatus(status) {
  if (status === "partial" || status === "success") {
    return "success";
  }
  if (status === "unsupported") {
    return "unsupported";
  }
  return "failed";
}

function getResourceMetrics(result) {
  return (result?.daily?.resources || [])
    .map((resource) => {
      const value = toFiniteNumber(resource?.gross);
      if (value === null) {
        return null;
      }

      const key = String(resource?.key || "").trim();
      return {
        key: `daily.${key || "resource"}.gross`,
        label: RESOURCE_LABELS[key] || resource?.label || "未命名资源",
        value,
        unit: String(resource?.unit || "/ 日").trim(),
        primary: ["lmd", "exp", "gold"].includes(key),
      };
    })
    .filter(Boolean);
}

function getRoomMetrics(result) {
  return (result?.breakdown?.rooms || [])
    .map((room, index) => {
      const value = toFiniteNumber(room?.dailyGross);
      if (value === null) {
        return null;
      }

      const facility = String(room?.facility || "").trim();
      const product = String(room?.product || "").trim();
      return {
        key: `room.${room?.jsonPath || index + 1}`,
        label: [
          FACILITY_LABELS[facility] || facility || "设施",
          Number.isFinite(Number(room?.index))
            ? `#${Number(room.index) + 1}`
            : "",
          RESOURCE_LABELS[product] || product,
        ]
          .filter(Boolean)
          .join(" "),
        value,
        unit: "/ 日",
      };
    })
    .filter(Boolean);
}

function getMessages(result) {
  const issues = (result?.support?.issues || []).map((issue) => ({
    level: ["info", "warning", "error"].includes(issue?.severity)
      ? issue.severity
      : "info",
    text: String(issue?.message || "").trim(),
  }));
  const assumptions = (result?.explanation?.assumptions || []).map(
    (assumption) => ({
      level: "info",
      text: String(assumption || "").trim(),
    }),
  );

  return [...issues, ...assumptions].filter((message) => message.text);
}

function getTrace(result) {
  return (result?.explanation?.steps || [])
    .map((step) => {
      const parts = [
        String(step?.jsonPath || "").trim(),
        String(step?.formula || "").trim(),
      ].filter(Boolean);
      const output = toFiniteNumber(step?.output);
      if (output !== null) {
        parts.push(`= ${output}`);
      }
      return parts.join(" ");
    })
    .filter(Boolean);
}

const engine = {
  id: ENGINE_ID,

  async calculate(maaSchedule) {
    const result = calculateRiicStableDailyYield(maaSchedule);
    const roomMetrics = getRoomMetrics(result);

    return {
      status: normalizeStatus(result?.status),
      metrics: getResourceMetrics(result),
      sections: roomMetrics.length
        ? [
            {
              key: "by-room",
              label: "按房间",
              metrics: roomMetrics,
            },
          ]
        : [],
      messages: getMessages(result),
      trace: getTrace(result),
    };
  },
};

export default engine;
