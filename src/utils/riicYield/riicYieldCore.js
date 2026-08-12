import {
  createRiicYieldIssue,
  createRiicYieldResult,
} from "./contract.js";
import { normalizeMaaRiicSchedule } from "./maaScheduleNormalizer.js";

const ENGINE = Object.freeze({
  id: "riic-yield-core",
  version: "0.1.0",
});

export const RIIC_REFERENCE_DAILY_RATES = Object.freeze({
  manufacture: Object.freeze({
    exp: 8000,
    gold: 10000,
  }),
  trading: Object.freeze({
    lmd: 10265,
  }),
});

const PRODUCTIVE_FACILITIES = new Set(["manufacture", "trading"]);
const PRIMARY_RESOURCE_KEYS = new Set(["lmd", "exp", "gold"]);
const SPECIAL_TRADING_ORDER_BASES = Object.freeze({
  default: 10265,
  dan: 15929,
  tequila: 10973,
  danAndTequila: 16637,
});

function createResource(key, label) {
  return {
    key,
    label,
    unit: "/day",
    gross: 0,
    consumed: 0,
    net: 0,
    sustained: 0,
  };
}

function createResources() {
  return new Map([
    ["lmd", createResource("lmd", "LMD")],
    ["exp", createResource("exp", "EXP")],
    ["gold", createResource("gold", "Pure Gold")],
    ["orundum", createResource("orundum", "Orundum")],
    [
      "originiumShard",
      createResource("originiumShard", "Originium Shard"),
    ],
  ]);
}

function hasError(issues) {
  return issues.some((issue) => issue.severity === "error");
}

function getFacilityCounts(plan) {
  return plan.rooms.reduce((counts, room) => {
    counts[room.facility] = (counts[room.facility] || 0) + 1;
    return counts;
  }, {});
}

function isFull243(schedule) {
  return schedule.plans.every((plan) => {
    const counts = getFacilityCounts(plan);
    return (
      counts.trading === 2 &&
      counts.manufacture === 4 &&
      counts.power === 3
    );
  });
}

function inspectScheduleSupport(schedule, issues) {
  const full243 = isFull243(schedule);

  for (const plan of schedule.plans) {
    const assignedRoomByOperator = new Map();
    for (const room of plan.rooms) {
      if (room.mode === "fixed") {
        const seenInRoom = new Set();
        for (const operator of room.operators) {
          if (seenInRoom.has(operator)) {
            issues.push(
              createRiicYieldIssue({
                code: "room.operator_duplicate",
                jsonPath: `${room.jsonPath}.operators`,
                message: "A fixed room cannot assign the same operator more than once",
                details: { operator },
              }),
            );
            continue;
          }
          seenInRoom.add(operator);

          const firstRoomPath = assignedRoomByOperator.get(operator);
          if (firstRoomPath) {
            issues.push(
              createRiicYieldIssue({
                code: "plan.operator_reused",
                jsonPath: `${room.jsonPath}.operators`,
                message: "A fixed plan cannot assign one operator to multiple rooms",
                details: { operator, firstRoomPath },
              }),
            );
            continue;
          }
          assignedRoomByOperator.set(operator, room.jsonPath);
        }
      }

      if (!PRODUCTIVE_FACILITIES.has(room.facility)) {
        continue;
      }

      if (room.mode === "skipped") {
        issues.push(
          createRiicYieldIssue({
            code: "room.skip_state_unknown",
            jsonPath: room.jsonPath,
            message: "Skipped productive rooms preserve an unknown runtime state",
          }),
        );
        continue;
      }
      if (room.mode === "dynamic") {
        issues.push(
          createRiicYieldIssue({
            code: "room.dynamic_staffing",
            jsonPath: room.jsonPath,
            message: "Autofill, candidates, or groups do not identify a fixed roster",
          }),
        );
      }
      if (full243 && room.operators.length > 3) {
        issues.push(
          createRiicYieldIssue({
            code: "room.operator_capacity_exceeded",
            jsonPath: `${room.jsonPath}.operators`,
            message: "A full 243 manufacture or trading station supports at most three operators",
            details: { assignedCount: room.operators.length, capacity: 3 },
          }),
        );
      }
      if (!room.product) {
        issues.push(
          createRiicYieldIssue({
            code: "product.missing",
            jsonPath: `${room.jsonPath}.product`,
            message: "Productive rooms must provide a product",
          }),
        );
      } else if (room.product === "unknown") {
        issues.push(
          createRiicYieldIssue({
            code: "product.unknown",
            jsonPath: `${room.jsonPath}.product`,
            message: "The productive room product is not recognized",
            details: { product: room.sourceProduct },
          }),
        );
      } else if (!Number.isFinite(getReferenceRate(room))) {
        issues.push(
          createRiicYieldIssue({
            code: "product.rate_unsupported",
            jsonPath: `${room.jsonPath}.product`,
            message: "The product does not have a supported reference rate",
            details: { product: room.sourceProduct },
          }),
        );
      }
    }
  }

  if (!full243) {
    issues.push(
      createRiicYieldIssue({
        code: "facility.profile_unresolved",
        jsonPath: "plans",
        message: "Raw MAA JSON cannot resolve station levels outside the full 243 profile",
      }),
    );
  } else {
    issues.push(
      createRiicYieldIssue({
        code: "facility.full_243_assumed",
        severity: "warning",
        jsonPath: "plans",
        message: "The full level 243 facility profile is inferred from room counts",
      }),
    );
  }

  if (schedule.plans.some((plan) => plan.dronesEnabled)) {
    issues.push(
      createRiicYieldIssue({
        code: "mechanic.drones_excluded",
        severity: "warning",
        jsonPath: "plans[].drones",
        message: "Drone acceleration is excluded because MAA JSON has no daily drone budget",
      }),
    );
  }

  if (schedule.plans.some((plan) => plan.fiammettaEnabled)) {
    issues.push(
      createRiicYieldIssue({
        code: "mechanic.fiammetta_excluded",
        severity: "warning",
        jsonPath: "plans[].Fiammetta",
        message: "Fiammetta recovery scheduling is excluded from this baseline calculation",
      }),
    );
  }

  const hasFixedOperators = schedule.plans.some((plan) =>
    plan.rooms.some(
      (room) =>
        PRODUCTIVE_FACILITIES.has(room.facility) &&
        room.operators.length > 0,
    ),
  );
  if (hasFixedOperators) {
    issues.push(
      createRiicYieldIssue({
        code: "operator.skill_effects_excluded",
        severity: "warning",
        jsonPath: "plans",
        message:
          "Most operator skill states are excluded; only Butan and Tequila trading order bases are recognized from names",
      }),
    );
  }
}

function getReferenceRate(room) {
  if (room.facility !== "trading") {
    return RIIC_REFERENCE_DAILY_RATES[room.facility]?.[room.product] || null;
  }

  if (room.product !== "lmd") {
    return null;
  }

  const hasDan = room.operators.some((operator) => operator.includes("但书"));
  const hasTequila = room.operators.some((operator) =>
    operator.includes("龙舌兰"),
  );
  if (hasDan && hasTequila) {
    return SPECIAL_TRADING_ORDER_BASES.danAndTequila;
  }
  if (hasDan) {
    return SPECIAL_TRADING_ORDER_BASES.dan;
  }
  if (hasTequila) {
    return SPECIAL_TRADING_ORDER_BASES.tequila;
  }
  return SPECIAL_TRADING_ORDER_BASES.default;
}

function getBaseEfficiencyPercent(room) {
  return 100 + room.operators.length;
}

function getTradingOrderBaseKind(room) {
  const hasDan = room.operators.some((operator) => operator.includes("但书"));
  const hasTequila = room.operators.some((operator) =>
    operator.includes("龙舌兰"),
  );
  if (hasDan && hasTequila) {
    return "danAndTequila";
  }
  if (hasDan) {
    return "dan";
  }
  if (hasTequila) {
    return "tequila";
  }
  return "default";
}

function calculateRoomOutput({
  room,
  plan,
  cycleMinutes,
  resources,
  rooms,
  steps,
}) {
  if (
    !PRODUCTIVE_FACILITIES.has(room.facility) ||
    room.operators.length === 0
  ) {
    return;
  }

  const rate = getReferenceRate(room);
  if (!Number.isFinite(rate)) {
    return;
  }

  const fraction = plan.durationMinutes / cycleMinutes;
  const baseEfficiencyPercent = getBaseEfficiencyPercent(room);
  const gross = rate * (baseEfficiencyPercent / 100) * fraction;
  const resource = resources.get(room.product);
  resource.gross += gross;
  resource.net += gross;
  resource.sustained += gross;
  rooms.push({
    jsonPath: room.jsonPath,
    facility: room.facility,
    index: room.index,
    product: room.product,
    operators: room.operators,
    durationMinutes: plan.durationMinutes,
    referenceDailyRate: rate,
    baseEfficiencyPercent,
    ...(room.facility === "trading"
      ? { tradingOrderBase: getTradingOrderBaseKind(room) }
      : {}),
    dailyGross: gross,
  });
  steps.push({
    kind: "roomReferenceRate",
    jsonPath: room.jsonPath,
    resource: room.product,
    formula:
      "referenceDailyRate * baseEfficiencyPercent / 100 * planDuration / cycleDuration",
    inputs: {
      referenceDailyRate: rate,
      baseEfficiencyPercent,
      planDurationMinutes: plan.durationMinutes,
      cycleMinutes,
    },
    output: gross,
  });
}

function roundResource(resource) {
  const round = (value) =>
    Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  return {
    ...resource,
    produced: resource.gross > 0,
    gross: round(resource.gross),
    consumed: round(resource.consumed),
    net: round(resource.net),
    sustained: round(resource.sustained),
  };
}

export function calculateRiicStableDailyYield(
  maaSchedule,
  { executionPolicy = "strict" } = {},
) {
  try {
    const normalized = normalizeMaaRiicSchedule(maaSchedule, {
      allowSequentialDuration: executionPolicy === "sequentialDuration",
    });
    const issues = [...normalized.issues];
    if (!normalized.schedule) {
      return createRiicYieldResult({
        status: "unsupported",
        issues,
        engine: ENGINE,
      });
    }

    const schedule = normalized.schedule;
    inspectScheduleSupport(schedule, issues);
    if (hasError(issues)) {
      return createRiicYieldResult({
        status: "unsupported",
        confidence: "none",
        cycleMinutes: schedule.timeline.cycleMinutes,
        issues,
        assumptions: [
          "No resource amounts are emitted when productive room state or facility profile is unresolved.",
        ],
        engine: ENGINE,
      });
    }

    const resources = createResources();
    const rooms = [];
    const steps = [];
    const segments = schedule.plans.map((plan) => ({
      index: plan.index,
      name: plan.name,
      durationMinutes: plan.durationMinutes,
      timelineKind: schedule.timeline.kind,
    }));

    for (const plan of schedule.plans) {
      for (const room of plan.rooms) {
        calculateRoomOutput({
          room,
          plan,
          cycleMinutes: schedule.timeline.cycleMinutes,
          resources,
          rooms,
          steps,
        });
      }
    }

    const lmd = resources.get("lmd");
    if (lmd.gross > 0) {
      lmd.sustained = null;
      lmd.net = null;
      const gold = resources.get("gold");
      gold.consumed = null;
      gold.net = null;
      gold.sustained = null;
      issues.push(
        createRiicYieldIssue({
          code: "conversion.gold_balance_unmodeled",
          severity: "warning",
          jsonPath: "plans",
          message: "LMD is gross trading capacity; the stable gold conversion balance is not modeled yet",
        }),
      );
    }

    return createRiicYieldResult({
      status: "partial",
      confidence: schedule.timeline.confidence,
      cycleMinutes: schedule.timeline.cycleMinutes,
      resources: [...resources.values()]
        .filter(
          (resource) =>
            PRIMARY_RESOURCE_KEYS.has(resource.key) || resource.gross > 0,
        )
        .map(roundResource),
      rooms,
      segments,
      issues,
      steps,
      assumptions: [
        "The full level 243 facility profile is inferred from room counts.",
        "Reference daily rates omit most operator skills, morale, capacity, order limits, and drone acceleration; Butan and Tequila trading order bases are the only name-resolved exception.",
        ...(schedule.timeline.kind === "sequentialDuration"
          ? [
              "Plan duration is an engine-specific sequential rotation assumption.",
            ]
          : []),
      ],
      engine: ENGINE,
    });
  } catch (error) {
    return createRiicYieldResult({
      status: "failed",
      issues: [
        createRiicYieldIssue({
          code: "engine.exception",
          jsonPath: "$",
          message:
            error instanceof Error
              ? error.message
              : "RIIC yield engine failed unexpectedly",
        }),
      ],
      engine: ENGINE,
    });
  }
}
