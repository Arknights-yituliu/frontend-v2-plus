const RESULT_STATUSES = new Set([
  "running",
  "success",
  "unsupported",
  "failed",
]);

const MESSAGE_LEVELS = new Set(["info", "warning", "error"]);
const MAX_METRICS = 48;
const MAX_SECTIONS = 16;
const MAX_MESSAGES = 24;
const MAX_TRACE_LINES = 480;

function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeMetric(metric, index) {
  const value = Number(metric?.value);
  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    key: toText(metric?.key, `custom.metric-${index + 1}`),
    label: toText(metric?.label, "未命名指标"),
    value,
    unit: toText(metric?.unit),
    primary: metric?.primary === true,
  };
}

function normalizeMetrics(metrics) {
  const usedKeys = new Set();

  return (Array.isArray(metrics) ? metrics : [])
    .map(normalizeMetric)
    .filter((metric) => {
      if (!metric || usedKeys.has(metric.key)) {
        return false;
      }

      usedKeys.add(metric.key);
      return true;
    })
    .slice(0, MAX_METRICS);
}

function normalizeSections(sections) {
  return (Array.isArray(sections) ? sections : [])
    .map((section, index) => ({
      key: toText(section?.key, `section-${index + 1}`),
      label: toText(section?.label, "详情"),
      metrics: normalizeMetrics(section?.metrics),
    }))
    .filter((section) => section.metrics.length > 0)
    .slice(0, MAX_SECTIONS);
}

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const text = toText(
        typeof message === "string" ? message : message?.text,
      );
      if (!text) {
        return null;
      }

      const level = toText(
        typeof message === "string" ? "info" : message?.level,
        "info",
      );
      return {
        level: MESSAGE_LEVELS.has(level) ? level : "info",
        text,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_MESSAGES);
}

function normalizeTrace(trace) {
  return (Array.isArray(trace) ? trace : [])
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .slice(0, MAX_TRACE_LINES);
}

function getEngineIdentity(descriptor) {
  return {
    id: toText(descriptor?.id, "unknown"),
    name: toText(descriptor?.name, "未命名计算引擎"),
    version: toText(descriptor?.version, "0.0.0"),
  };
}

export function createRiicYieldEngineRunningResult(descriptor) {
  return {
    schemaVersion: 1,
    engine: getEngineIdentity(descriptor),
    status: "running",
    metrics: [],
    sections: [],
    messages: [],
    trace: [],
  };
}

export function createRiicYieldEngineFailureResult(descriptor, message) {
  return {
    schemaVersion: 1,
    engine: getEngineIdentity(descriptor),
    status: "failed",
    metrics: [],
    sections: [],
    messages: [
      {
        level: "error",
        text: toText(message, "计算引擎未返回结果"),
      },
    ],
    trace: [],
  };
}

export function normalizeRiicYieldEngineResult(descriptor, sourceResult) {
  const status = RESULT_STATUSES.has(sourceResult?.status)
    ? sourceResult.status
    : "failed";
  const normalized = {
    schemaVersion: 1,
    engine: getEngineIdentity(descriptor),
    status,
    metrics: normalizeMetrics(sourceResult?.metrics),
    sections: normalizeSections(sourceResult?.sections),
    messages: normalizeMessages(sourceResult?.messages),
    trace: normalizeTrace(sourceResult?.trace),
  };

  if (status === "failed" && normalized.messages.length === 0) {
    normalized.messages.push({
      level: "error",
      text: "计算引擎返回了无效结果",
    });
  }

  return normalized;
}
