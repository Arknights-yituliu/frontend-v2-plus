import { createRiicYieldIssue } from "./contract.js";

const FACILITIES = new Set([
  "control",
  "manufacture",
  "trading",
  "power",
  "meeting",
  "hire",
  "dormitory",
  "processing",
  "training",
]);

const PRODUCT_BY_FACILITY = Object.freeze({
  manufacture: Object.freeze({
    "Battle Record": "exp",
    "Pure Gold": "gold",
    "Originium Shard": "originiumShard",
  }),
  trading: Object.freeze({
    LMD: "lmd",
    Orundum: "orundum",
    "Originium Shard": "orundum",
  }),
});

function toText(value) {
  return String(value ?? "").trim();
}

function parseClock(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(toText(value));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function getPositiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function normalizeDuration(value, jsonPath, issues) {
  if (value === undefined) {
    return null;
  }

  const duration = getPositiveInteger(value);
  if (duration === null) {
    issues.push(
      createRiicYieldIssue({
        code: "timeline.duration_invalid",
        jsonPath,
        message: "Plan duration must be a positive integer number of minutes",
      }),
    );
  }
  return duration;
}

function hasConfiguredEntries(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return Boolean(toText(value));
}

function normalizeOptionalBoolean(value, jsonPath, code, message, issues) {
  if (value === undefined) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }

  issues.push(
    createRiicYieldIssue({
      code,
      jsonPath,
      message,
    }),
  );
  return false;
}

function normalizeFeatureEnabled(value, jsonPath, featureName, issues) {
  if (value === undefined) {
    return false;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(
      createRiicYieldIssue({
        code: `mechanic.${featureName}_invalid`,
        jsonPath,
        message: `${featureName} configuration must be an object when provided`,
      }),
    );
    return false;
  }

  return normalizeOptionalBoolean(
    value.enable,
    `${jsonPath}.enable`,
    `mechanic.${featureName}_enable_invalid`,
    `${featureName} enable must be a boolean when provided`,
    issues,
  );
}

function normalizeOperators(value, jsonPath, issues) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(
      createRiicYieldIssue({
        code: "room.operators_invalid",
        jsonPath,
        message: "Room operators must be an array",
      }),
    );
    return [];
  }

  return value
    .map((operator, index) => {
      if (typeof operator !== "string") {
        issues.push(
          createRiicYieldIssue({
            code: "room.operator_invalid",
            jsonPath: `${jsonPath}[${index}]`,
            message: "Room operator names must be non-empty strings",
          }),
        );
        return "";
      }

      const name = operator.trim();
      if (!name) {
        issues.push(
          createRiicYieldIssue({
            code: "room.operator_invalid",
            jsonPath: `${jsonPath}[${index}]`,
            message: "Room operator names must be non-empty strings",
          }),
        );
      }
      return name;
    })
    .filter(Boolean);
}

function normalizeRoom({
  sourceRoom,
  facility,
  roomIndex,
  planIndex,
  issues,
}) {
  const jsonPath = `plans[${planIndex}].rooms.${facility}[${roomIndex}]`;
  if (!sourceRoom || typeof sourceRoom !== "object" || Array.isArray(sourceRoom)) {
    issues.push(
      createRiicYieldIssue({
        code: "room.invalid",
        jsonPath,
        message: "Room entries must be objects",
      }),
    );
    return null;
  }

  const hasCandidates = hasConfiguredEntries(sourceRoom.candidates);
  const hasGroups = hasConfiguredEntries(sourceRoom.groups);
  const autofill = normalizeOptionalBoolean(
    sourceRoom.autofill,
    `${jsonPath}.autofill`,
    "room.autofill_invalid",
    "Room autofill must be a boolean when provided",
    issues,
  );
  const skipped = normalizeOptionalBoolean(
    sourceRoom.skip,
    `${jsonPath}.skip`,
    "room.skip_invalid",
    "Room skip must be a boolean when provided",
    issues,
  );
  const productText = toText(sourceRoom.product);
  const product =
    PRODUCT_BY_FACILITY[facility]?.[productText] ||
    (productText ? "unknown" : "");

  return {
    jsonPath,
    facility,
    index: roomIndex,
    mode: skipped ? "skipped" : autofill || hasCandidates || hasGroups ? "dynamic" : "fixed",
    product,
    sourceProduct: productText,
    operators: normalizeOperators(
      sourceRoom.operators,
      `${jsonPath}.operators`,
      issues,
    ),
    hasCandidates,
    hasGroups,
    autofill,
  };
}

function normalizeRooms(sourceRooms, planIndex, issues) {
  const rooms = [];
  if (!sourceRooms || typeof sourceRooms !== "object" || Array.isArray(sourceRooms)) {
    issues.push(
      createRiicYieldIssue({
        code: "plan.rooms_missing",
        jsonPath: `plans[${planIndex}].rooms`,
        message: "Each plan must provide a rooms object",
      }),
    );
    return rooms;
  }

  for (const [sourceFacility, entries] of Object.entries(sourceRooms)) {
    const facility = sourceFacility === "office" ? "hire" : sourceFacility;
    if (!FACILITIES.has(facility)) {
      issues.push(
        createRiicYieldIssue({
          code: "room.facility_unknown",
          jsonPath: `plans[${planIndex}].rooms.${sourceFacility}`,
          message: "The schedule contains an unknown facility",
          details: { facility: sourceFacility },
        }),
      );
      continue;
    }
    if (!Array.isArray(entries)) {
      issues.push(
        createRiicYieldIssue({
          code: "room.list_invalid",
          jsonPath: `plans[${planIndex}].rooms.${sourceFacility}`,
          message: "Facility room entries must be an array",
        }),
      );
      continue;
    }

    entries.forEach((sourceRoom, roomIndex) => {
      const room = normalizeRoom({
        sourceRoom,
        facility,
        roomIndex,
        planIndex,
        issues,
      });
      if (room) {
        rooms.push(room);
      }
    });
  }

  return rooms;
}

function normalizePeriods(period, planIndex, issues) {
  if (period === undefined) {
    return null;
  }
  if (!Array.isArray(period) || period.length === 0) {
    issues.push(
      createRiicYieldIssue({
        code: "timeline.period_invalid",
        jsonPath: `plans[${planIndex}].period`,
        message: "Plan period must be a non-empty array of clock intervals",
      }),
    );
    return null;
  }

  const parsedIntervals = [];
  for (const [intervalIndex, interval] of period.entries()) {
    const path = `plans[${planIndex}].period[${intervalIndex}]`;
    if (!Array.isArray(interval) || interval.length !== 2) {
      issues.push(
        createRiicYieldIssue({
          code: "timeline.period_invalid",
          jsonPath: path,
          message: "Period intervals must contain a start and end clock",
        }),
      );
      return null;
    }

    const start = parseClock(interval[0]);
    const end = parseClock(interval[1]);
    if (start === null || end === null) {
      issues.push(
        createRiicYieldIssue({
          code: "timeline.period_invalid",
          jsonPath: path,
          message: "Period intervals must be increasing HH:mm values",
        }),
      );
      return null;
    }
    parsedIntervals.push({ start, end, path });
  }

  const hasExporterMidnightInterval = parsedIntervals.some(
    (interval) => interval.end === 24 * 60 - 1,
  );
  const intervals = [];
  for (const interval of parsedIntervals) {
    if (
      interval.start === 0 &&
      interval.end === 0 &&
      hasExporterMidnightInterval
    ) {
      issues.push(
        createRiicYieldIssue({
          code: "timeline.midnight_marker_ignored",
          severity: "info",
          jsonPath: interval.path,
          message: "Ignored the zero-length midnight marker emitted by the schedule exporter",
        }),
      );
      continue;
    }
    if (interval.end <= interval.start) {
      issues.push(
        createRiicYieldIssue({
          code: "timeline.period_invalid",
          jsonPath: interval.path,
          message: "Period intervals must be increasing HH:mm values",
        }),
      );
      return null;
    }
    intervals.push(interval);
  }

  if (intervals.length === 0) {
    issues.push(
      createRiicYieldIssue({
        code: "timeline.period_invalid",
        jsonPath: `plans[${planIndex}].period`,
        message: "Plan period must include at least one non-empty interval",
      }),
    );
    return null;
  }

  return intervals;
}

function resolveTimeline(plans, issues, allowSequentialDuration) {
  if (plans.length === 1 && plans[0].periods === null) {
    return {
      kind: "singlePlan",
      cycleMinutes: 24 * 60,
      durationsByPlan: [24 * 60],
      confidence: "assumed",
    };
  }

  if (plans.every((plan) => Array.isArray(plan.periods))) {
    const entries = plans.flatMap((plan) =>
      plan.periods.map((interval) => ({
        ...interval,
        planIndex: plan.index,
      })),
    );
    const sorted = [...entries].sort(
      (left, right) => left.start - right.start || left.end - right.end,
    );
    const coverage = sorted.reduce((total, interval) => total + interval.end - interval.start, 0);
    const hasOverlap = sorted.some(
      (interval, index) =>
        index > 0 && interval.start < sorted[index - 1].end,
    );
    const needsTerminalMinute =
      !hasOverlap &&
      sorted[0]?.start === 0 &&
      sorted.at(-1)?.end === 24 * 60 - 1 &&
      coverage === 24 * 60 - 1;
    const isFullDay =
      !hasOverlap &&
      sorted[0]?.start === 0 &&
      (coverage === 24 * 60 || needsTerminalMinute) &&
      (sorted.at(-1)?.end === 24 * 60 || needsTerminalMinute);

    if (isFullDay) {
      const terminalPlanIndex = needsTerminalMinute
        ? sorted.at(-1)?.planIndex
        : null;
      return {
        kind: "period",
        cycleMinutes: 24 * 60,
        durationsByPlan: plans.map((plan) => {
          const duration = plan.periods.reduce(
            (total, interval) => total + interval.end - interval.start,
            0,
          );
          return duration + (plan.index === terminalPlanIndex ? 1 : 0);
        }),
        confidence: "assumed",
      };
    }

    issues.push(
      createRiicYieldIssue({
        code: "timeline.period_not_partitioned",
        jsonPath: "plans",
        message: "Plan periods must form one non-overlapping full-day partition",
      }),
    );
    return null;
  }

  if (allowSequentialDuration) {
    const durations = plans.map((plan) => plan.durationMinutes);
    if (durations.every(Boolean)) {
      issues.push(
        createRiicYieldIssue({
          code: "timeline.sequential_duration_assumed",
          severity: "warning",
          jsonPath: "plans",
          message: "Plan duration is treated as an engine-specific sequential rotation",
        }),
      );
      return {
        kind: "sequentialDuration",
        cycleMinutes: durations.reduce((total, duration) => total + duration, 0),
        durationsByPlan: durations,
        confidence: "estimated",
      };
    }
  }

  issues.push(
    createRiicYieldIssue({
      code: "timeline.unresolved",
      jsonPath: "plans",
      message: "MAA JSON does not provide a verifiable recurring execution timeline",
    }),
  );
  return null;
}

export function normalizeMaaRiicSchedule(
  maaSchedule,
  { allowSequentialDuration = false } = {},
) {
  const issues = [];
  if (!maaSchedule || typeof maaSchedule !== "object" || Array.isArray(maaSchedule)) {
    return {
      schedule: null,
      issues: [
        createRiicYieldIssue({
          code: "schedule.invalid",
          jsonPath: "$",
          message: "MAA schedule must be an object",
        }),
      ],
    };
  }

  if (!Array.isArray(maaSchedule.plans) || maaSchedule.plans.length === 0) {
    return {
      schedule: null,
      issues: [
        createRiicYieldIssue({
          code: "schedule.plans_missing",
          jsonPath: "plans",
          message: "MAA schedule must contain at least one plan",
        }),
      ],
    };
  }

  const plans = maaSchedule.plans.map((sourcePlan, planIndex) => {
    const jsonPath = `plans[${planIndex}]`;
    if (!sourcePlan || typeof sourcePlan !== "object" || Array.isArray(sourcePlan)) {
      issues.push(
        createRiicYieldIssue({
          code: "plan.invalid",
          jsonPath,
          message: "Plan entries must be objects",
        }),
      );
      return {
        index: planIndex,
        jsonPath,
        name: `Plan ${planIndex + 1}`,
        periods: null,
        durationMinutes: null,
        rooms: [],
        dronesEnabled: false,
        fiammettaEnabled: false,
      };
    }

    return {
      index: planIndex,
      jsonPath,
      name: toText(sourcePlan.name) || `Plan ${planIndex + 1}`,
      periods: normalizePeriods(sourcePlan.period, planIndex, issues),
      durationMinutes: normalizeDuration(
        sourcePlan.duration,
        `${jsonPath}.duration`,
        issues,
      ),
      rooms: normalizeRooms(sourcePlan.rooms, planIndex, issues),
      dronesEnabled: normalizeFeatureEnabled(
        sourcePlan.drones,
        `${jsonPath}.drones`,
        "drones",
        issues,
      ),
      fiammettaEnabled: normalizeFeatureEnabled(
        sourcePlan.Fiammetta,
        `${jsonPath}.Fiammetta`,
        "fiammetta",
        issues,
      ),
    };
  });

  const timeline = resolveTimeline(plans, issues, allowSequentialDuration);
  if (!timeline) {
    return { schedule: null, issues };
  }

  const normalizedPlans = plans.map((plan, index) => ({
    ...plan,
    durationMinutes: timeline.durationsByPlan[index],
  }));

  return {
    schedule: {
      title: toText(maaSchedule.title),
      plans: normalizedPlans,
      timeline,
    },
    issues,
  };
}
