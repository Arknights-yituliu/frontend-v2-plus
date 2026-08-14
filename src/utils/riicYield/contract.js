export const RIIC_YIELD_SCHEMA_VERSION = 2;

export const RIIC_YIELD_STATUSES = Object.freeze([
  "success",
  "partial",
  "unsupported",
  "failed",
]);

const ISSUE_SEVERITIES = new Set(["info", "warning", "error"]);

function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function createRiicYieldIssue({
  code,
  severity = "error",
  jsonPath = "",
  message = "",
  details = null,
} = {}) {
  return {
    code: toText(code, "engine.unknown"),
    severity: ISSUE_SEVERITIES.has(severity) ? severity : "error",
    jsonPath: toText(jsonPath),
    message: toText(message, "RIIC yield calculation issue"),
    ...(details === null ? {} : { details }),
  };
}

export function createRiicYieldResult({
  status = "failed",
  confidence = "none",
  cycleMinutes = 0,
  resources = [],
  rooms = [],
  segments = [],
  conversions = [],
  issues = [],
  steps = [],
  assumptions = [],
  engine = {},
} = {}) {
  const normalizedStatus = RIIC_YIELD_STATUSES.includes(status)
    ? status
    : "failed";

  return {
    schemaVersion: RIIC_YIELD_SCHEMA_VERSION,
    engine: {
      id: toText(engine?.id, "riic-yield-core"),
      version: toText(engine?.version, "0.1.0"),
    },
    status: normalizedStatus,
    support: {
      confidence: toText(confidence, "none"),
      issues: Array.isArray(issues) ? issues : [],
    },
    daily: {
      cycleMinutes: Number.isFinite(Number(cycleMinutes))
        ? Number(cycleMinutes)
        : 0,
      resources: Array.isArray(resources) ? resources : [],
    },
    breakdown: {
      rooms: Array.isArray(rooms) ? rooms : [],
      segments: Array.isArray(segments) ? segments : [],
      conversions: Array.isArray(conversions) ? conversions : [],
    },
    explanation: {
      assumptions: Array.isArray(assumptions) ? assumptions : [],
      steps: Array.isArray(steps) ? steps : [],
    },
  };
}
