import assert from "node:assert/strict";
import {
  calculateRiicStableDailyYield,
  normalizeMaaRiicSchedule,
} from "../src/utils/riicYield/index.js";

function room(product, operators = []) {
  return {
    product,
    operators,
  };
}

function createFixtureOperatorName(planName, facility, roomIndex) {
  return `fixture:${planName}:${facility}:${roomIndex}`;
}

function createFull243Plan({
  name,
  period,
  duration,
  manufactureProducts = [
    "Battle Record",
    "Pure Gold",
    "Pure Gold",
    "Pure Gold",
  ],
} = {}) {
  return {
    name,
    ...(period ? { period } : {}),
    ...(duration ? { duration } : {}),
    rooms: {
      trading: ["LMD", "LMD"].map((product, roomIndex) =>
        room(product, [createFixtureOperatorName(name, "trading", roomIndex)]),
      ),
      manufacture: manufactureProducts.map((product, roomIndex) =>
        room(product, [
          createFixtureOperatorName(name, "manufacture", roomIndex),
        ]),
      ),
      power: [{ operators: [] }, { operators: [] }, { operators: [] }],
    },
  };
}

const fixedSchedule = {
  title: "fixed 243",
  plans: [
    createFull243Plan({
      name: "day",
      period: [["00:00", "12:00"]],
    }),
    createFull243Plan({
      name: "night",
      period: [["12:00", "23:59"]],
    }),
  ],
};

const normalized = normalizeMaaRiicSchedule(fixedSchedule);
assert.ok(normalized.schedule);
assert.equal(normalized.schedule.timeline.kind, "period");
assert.equal(normalized.schedule.timeline.cycleMinutes, 1440);

const result = calculateRiicStableDailyYield(fixedSchedule);
assert.equal(result.schemaVersion, 2);
assert.equal(result.status, "partial");
assert.equal(result.daily.cycleMinutes, 1440);
assert.deepEqual(
  result.daily.resources.map((resource) => [resource.key, resource.gross]),
  [
    ["lmd", 20735.3],
    ["exp", 8080],
    ["gold", 30300],
  ],
);
assert.equal(
  result.daily.resources.find((resource) => resource.key === "lmd").sustained,
  null,
);
assert.deepEqual(
  result.daily.resources.find((resource) => resource.key === "gold"),
  {
    key: "gold",
    label: "Pure Gold",
    unit: "/day",
    gross: 30300,
    consumed: null,
    net: null,
    sustained: null,
    produced: true,
  },
);
assert.ok(
  result.support.issues.some(
    (issue) => issue.code === "operator.skill_effects_excluded",
  ),
);

const fullStaffSchedule = structuredClone(fixedSchedule);
for (const plan of fullStaffSchedule.plans) {
  for (const rooms of Object.values(plan.rooms)) {
    for (const currentRoom of rooms) {
      if (currentRoom.product) {
        const [operator] = currentRoom.operators;
        currentRoom.operators = [1, 2, 3].map(
          (staffIndex) => `${operator}:${staffIndex}`,
        );
      }
    }
  }
}
const fullStaffResult = calculateRiicStableDailyYield(fullStaffSchedule);
assert.ok(
  fullStaffResult.daily.resources.find((resource) => resource.key === "exp")
    .gross > result.daily.resources.find((resource) => resource.key === "exp")
      .gross,
);

const specialOrderSchedule = structuredClone(fullStaffSchedule);
for (const plan of specialOrderSchedule.plans) {
  plan.rooms.trading[0].operators = ["但书", "龙舌兰", "Operator C"];
}
const specialOrderResult = calculateRiicStableDailyYield(specialOrderSchedule);
assert.ok(
  specialOrderResult.daily.resources.find((resource) => resource.key === "lmd")
    .gross > fullStaffResult.daily.resources.find(
      (resource) => resource.key === "lmd",
    ).gross,
);
assert.ok(
  specialOrderResult.explanation.assumptions.some((assumption) =>
    assumption.includes("Butan and Tequila"),
  ),
);
assert.ok(
  specialOrderResult.support.issues.some(
    (issue) =>
      issue.code === "operator.skill_effects_excluded" &&
      issue.message.includes("Butan and Tequila"),
  ),
);

const midnightSchedule = structuredClone(fixedSchedule);
midnightSchedule.plans[1].period = [
  ["12:00", "23:59"],
  ["00:00", "00:00"],
];
const midnightResult = calculateRiicStableDailyYield(midnightSchedule);
assert.equal(midnightResult.status, "partial");
assert.ok(
  midnightResult.support.issues.some(
    (issue) => issue.code === "timeline.midnight_marker_ignored",
  ),
);

const singlePlanMidnightSchedule = {
  plans: [
    createFull243Plan({
      name: "single-day",
      period: [
        ["00:00", "23:59"],
        ["00:00", "00:00"],
      ],
    }),
  ],
};
const singlePlanMidnightResult = calculateRiicStableDailyYield(
  singlePlanMidnightSchedule,
);
assert.equal(singlePlanMidnightResult.status, "partial");
assert.equal(singlePlanMidnightResult.daily.cycleMinutes, 1440);
assert.ok(
  singlePlanMidnightResult.support.issues.some(
    (issue) => issue.code === "timeline.midnight_marker_ignored",
  ),
);

const offsetFullDaySchedule = {
  plans: [
    createFull243Plan({
      name: "offset-day",
      period: [
        ["08:00", "23:59"],
        ["00:00", "08:00"],
      ],
    }),
  ],
};
const offsetFullDayResult = calculateRiicStableDailyYield(
  offsetFullDaySchedule,
);
assert.equal(offsetFullDayResult.status, "partial");
assert.equal(offsetFullDayResult.daily.cycleMinutes, 1440);
assert.equal(
  offsetFullDayResult.daily.resources.find(
    (resource) => resource.key === "exp",
  ).gross,
  8080,
);
assert.equal(
  offsetFullDayResult.support.issues.some(
    (issue) => issue.code === "timeline.midnight_marker_ignored",
  ),
  false,
);

const dynamicSchedule = structuredClone(fixedSchedule);
dynamicSchedule.plans[0].rooms.manufacture[0].autofill = true;
const dynamicResult = calculateRiicStableDailyYield(dynamicSchedule);
assert.equal(dynamicResult.status, "unsupported");
assert.ok(
  dynamicResult.support.issues.some(
    (issue) => issue.code === "room.dynamic_staffing",
  ),
);

const invalidAutofillSchedule = structuredClone(fixedSchedule);
invalidAutofillSchedule.plans[0].rooms.manufacture[0].autofill = "true";
const invalidAutofillResult = calculateRiicStableDailyYield(
  invalidAutofillSchedule,
);
assert.equal(invalidAutofillResult.status, "unsupported");
assert.ok(
  invalidAutofillResult.support.issues.some(
    (issue) => issue.code === "room.autofill_invalid",
  ),
);

const fiammettaSchedule = structuredClone(fixedSchedule);
fiammettaSchedule.plans[0].Fiammetta = { enable: true };
const fiammettaResult = calculateRiicStableDailyYield(fiammettaSchedule);
assert.equal(fiammettaResult.status, "partial");
assert.ok(
  fiammettaResult.support.issues.some(
    (issue) => issue.code === "mechanic.fiammetta_excluded",
  ),
);

const invalidFiammettaSchedule = structuredClone(fixedSchedule);
invalidFiammettaSchedule.plans[0].Fiammetta = { enable: "true" };
const invalidFiammettaResult = calculateRiicStableDailyYield(
  invalidFiammettaSchedule,
);
assert.equal(invalidFiammettaResult.status, "unsupported");
assert.ok(
  invalidFiammettaResult.support.issues.some(
    (issue) => issue.code === "mechanic.fiammetta_enable_invalid",
  ),
);

const invalidFiammettaConfigurationSchedule = structuredClone(fixedSchedule);
invalidFiammettaConfigurationSchedule.plans[0].Fiammetta = true;
const invalidFiammettaConfigurationResult = calculateRiicStableDailyYield(
  invalidFiammettaConfigurationSchedule,
);
assert.equal(invalidFiammettaConfigurationResult.status, "unsupported");
assert.ok(
  invalidFiammettaConfigurationResult.support.issues.some(
    (issue) => issue.code === "mechanic.fiammetta_invalid",
  ),
);

const invalidDronesSchedule = structuredClone(fixedSchedule);
invalidDronesSchedule.plans[0].drones = { enable: "true" };
const invalidDronesResult = calculateRiicStableDailyYield(invalidDronesSchedule);
assert.equal(invalidDronesResult.status, "unsupported");
assert.ok(
  invalidDronesResult.support.issues.some(
    (issue) => issue.code === "mechanic.drones_enable_invalid",
  ),
);

const invalidDronesConfigurationSchedule = structuredClone(fixedSchedule);
invalidDronesConfigurationSchedule.plans[0].drones = true;
const invalidDronesConfigurationResult = calculateRiicStableDailyYield(
  invalidDronesConfigurationSchedule,
);
assert.equal(invalidDronesConfigurationResult.status, "unsupported");
assert.ok(
  invalidDronesConfigurationResult.support.issues.some(
    (issue) => issue.code === "mechanic.drones_invalid",
  ),
);

const skippedSchedule = structuredClone(fixedSchedule);
skippedSchedule.plans[0].rooms.trading[0].skip = true;
const skippedResult = calculateRiicStableDailyYield(skippedSchedule);
assert.equal(skippedResult.status, "unsupported");
assert.ok(
  skippedResult.support.issues.some(
    (issue) => issue.code === "room.skip_state_unknown",
  ),
);

const invalidSkipSchedule = structuredClone(fixedSchedule);
invalidSkipSchedule.plans[0].rooms.trading[0].skip = "true";
const invalidSkipResult = calculateRiicStableDailyYield(invalidSkipSchedule);
assert.equal(invalidSkipResult.status, "unsupported");
assert.ok(
  invalidSkipResult.support.issues.some(
    (issue) => issue.code === "room.skip_invalid",
  ),
);

const capacityExceededSchedule = structuredClone(fixedSchedule);
capacityExceededSchedule.plans[0].rooms.manufacture[0].operators = [
  "Capacity A",
  "Capacity B",
  "Capacity C",
  "Capacity D",
];
const capacityExceededResult = calculateRiicStableDailyYield(
  capacityExceededSchedule,
);
assert.equal(capacityExceededResult.status, "unsupported");
assert.ok(
  capacityExceededResult.support.issues.some(
    (issue) => issue.code === "room.operator_capacity_exceeded",
  ),
);

const duplicateOperatorSchedule = structuredClone(fixedSchedule);
duplicateOperatorSchedule.plans[0].rooms.trading[0].operators = [
  "Duplicate",
  "Duplicate",
];
const duplicateOperatorResult = calculateRiicStableDailyYield(
  duplicateOperatorSchedule,
);
assert.equal(duplicateOperatorResult.status, "unsupported");
assert.ok(
  duplicateOperatorResult.support.issues.some(
    (issue) => issue.code === "room.operator_duplicate",
  ),
);

const reusedOperatorSchedule = structuredClone(fixedSchedule);
reusedOperatorSchedule.plans[0].rooms.trading[0].operators = ["Shared"];
reusedOperatorSchedule.plans[0].rooms.trading[1].operators = ["Shared"];
const reusedOperatorResult = calculateRiicStableDailyYield(
  reusedOperatorSchedule,
);
assert.equal(reusedOperatorResult.status, "unsupported");
assert.ok(
  reusedOperatorResult.support.issues.some(
    (issue) => issue.code === "plan.operator_reused",
  ),
);

const invalidOperatorSchedule = structuredClone(fixedSchedule);
invalidOperatorSchedule.plans[0].rooms.trading[0].operators = [123];
const invalidOperatorResult = calculateRiicStableDailyYield(
  invalidOperatorSchedule,
);
assert.equal(invalidOperatorResult.status, "unsupported");
assert.ok(
  invalidOperatorResult.support.issues.some(
    (issue) => issue.code === "room.operator_invalid",
  ),
);

const unknownProductSchedule = structuredClone(fixedSchedule);
unknownProductSchedule.plans[0].rooms.manufacture[0].product = "Unknown";
const unknownProductResult = calculateRiicStableDailyYield(
  unknownProductSchedule,
);
assert.equal(unknownProductResult.status, "unsupported");
assert.ok(
  unknownProductResult.support.issues.some(
    (issue) => issue.code === "product.unknown",
  ),
);

const orundumSchedule = structuredClone(fixedSchedule);
orundumSchedule.plans[0].rooms.manufacture[0].product =
  "Originium Shard";
const orundumResult = calculateRiicStableDailyYield(orundumSchedule);
assert.equal(orundumResult.status, "unsupported");
assert.ok(
  orundumResult.support.issues.some(
    (issue) => issue.code === "product.rate_unsupported",
  ),
);

const durationOnlySchedule = {
  plans: [
    createFull243Plan({ name: "first", duration: 720 }),
    createFull243Plan({ name: "second", duration: 720 }),
  ],
};
assert.equal(
  calculateRiicStableDailyYield(durationOnlySchedule).status,
  "unsupported",
);
assert.equal(
  calculateRiicStableDailyYield(durationOnlySchedule, {
    executionPolicy: "sequentialDuration",
  }).status,
  "partial",
);
assert.ok(
  calculateRiicStableDailyYield(durationOnlySchedule, {
    executionPolicy: "sequentialDuration",
  }).support.issues.some(
    (issue) => issue.code === "timeline.sequential_duration_assumed",
  ),
);

const invalidDurationSchedule = {
  plans: [
    createFull243Plan({ name: "invalid-first", duration: true }),
    createFull243Plan({ name: "invalid-second", duration: "720" }),
  ],
};
const invalidDurationResult = calculateRiicStableDailyYield(
  invalidDurationSchedule,
  { executionPolicy: "sequentialDuration" },
);
assert.equal(invalidDurationResult.status, "unsupported");
assert.ok(
  invalidDurationResult.support.issues.some(
    (issue) => issue.code === "timeline.duration_invalid",
  ),
);

const emptyFixedSchedule = structuredClone(fixedSchedule);
for (const plan of emptyFixedSchedule.plans) {
  for (const rooms of Object.values(plan.rooms)) {
    for (const currentRoom of rooms) {
      if (currentRoom.product) {
        currentRoom.operators = [];
      }
    }
  }
}
const emptyFixedResult = calculateRiicStableDailyYield(emptyFixedSchedule);
assert.equal(emptyFixedResult.status, "partial");
assert.deepEqual(
  emptyFixedResult.daily.resources.map((resource) => [
    resource.key,
    resource.gross,
    resource.produced,
  ]),
  [
    ["lmd", 0, false],
    ["exp", 0, false],
    ["gold", 0, false],
  ],
);

console.log("RIIC yield core checks passed.");
