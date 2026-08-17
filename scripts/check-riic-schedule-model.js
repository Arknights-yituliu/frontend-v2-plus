import assert from "node:assert/strict";
import {
  getRiicFacilityProfile,
  getRiicRoomStations,
  getRiicRotationCycle,
  getRiicRotationCycles,
  getRiicRotationSegmentHours,
} from "../src/utils/riic/l10-facility-model.js";
import {
  resolveRiicRoomCandidateSkeletons,
} from "../src/utils/riic/l20-groups.js";
import {
  planRiicAutomaticRoomSelections,
} from "../src/utils/riic/l70-selection-planner.js";
import {
  recalculateRiicRoomTeamCandidate,
} from "../src/utils/riic/l62-team-calculation.js";
import { buildRiicSchedulePreview } from "../src/utils/riicSchedulePreview.js";
import {
  buildRiicMaaScheduleFromPreview,
} from "../src/utils/riicScheduleExport.js";
import {
  summarizeRiicActualSchedule,
} from "../src/utils/riic/l80-actual-settlement.js";
import {
  summarizeRiicFacilityPower,
} from "../src/utils/riic/riic-facility-power-model.js";
import {
  applyRiicControlCenterManualOverrides,
  buildRiicControlCenterAutomaticRoleState,
  buildRiicControlCenterLateFillState,
} from "../src/utils/riic/l50-control-planner.js";
import {
  buildRiicControlCenterRuntimeContext,
  getRiicControlCenterRoomAdjustment,
} from "../src/utils/riic/l51-control-effects.js";

const normalTradingOperators = Object.freeze([
  { charId: "char_502_nblade", elite: 0, level: 30 },
  { charId: "char_123_fang", elite: 1, level: 1 },
  { charId: "char_282_catap", elite: 0, level: 1 },
]);

function createNormalTradingRoomOperators() {
  return normalTradingOperators.map(({ charId }) => ({ charId }));
}

assert.deepEqual(getRiicRotationSegmentHours("once"), [24]);
assert.deepEqual(getRiicRotationSegmentHours("twice"), [12]);
assert.deepEqual(getRiicRotationSegmentHours("threeTimes"), [12, 6, 6]);
assert.equal(getRiicRotationSegmentHours("unknown"), null);

assert.deepEqual(
  getRiicRotationCycles("twice").map((cycle) => cycle.cycleHours),
  [24, 36],
);
assert.deepEqual(
  getRiicRotationCycles("once")[0].segments.map(
    (segment) => segment.durationHours,
  ),
  [24, 24],
);
assert.deepEqual(
  getRiicRotationCycles("threeTimes")[0].segments.map(
    (segment) => segment.durationHours,
  ),
  [12, 6, 6],
);
assert.equal(getRiicRotationCycle("twice")?.cycleHours, 24);
assert.equal(getRiicRotationCycle("unknown"), null);

const roundTripSchedulePreview = buildRiicSchedulePreview({
  scheduleCandidate: {
    key: "round-trip",
    groups: [
      {
        groupId: "trading",
        candidate: {
          segments: [
            {
              durationHours: 24,
              stationAssignments: [
                {
                  stationIndex: 0,
                  stationLevel: 3,
                  expectedSlots: 3,
                  candidate: {
                    operators: [
                      { charId: "operator-a", name: "A" },
                      { charId: "operator-b", name: "B" },
                      { charId: "operator-c", name: "C" },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  roomGroups: [
    {
      id: "trading",
      label: "贸易站",
      facilityLabel: "贸易站",
      facility: "trading",
      candidateProduct: "lmd",
      count: 1,
      tone: "trading",
    },
  ],
  roomOperatorOverrides: {
    "0:trading:0": [
      { charId: "operator-a", name: "A" },
      { charId: "operator-b", name: "B" },
      { charId: "operator-c", name: "C" },
    ],
  },
});
assert.equal(
  roundTripSchedulePreview.states[0].rooms[0].manuallyEdited,
  false,
);
assert.deepEqual(
  roundTripSchedulePreview.states[0].rooms[0].operators.map(
    (operator) => operator.charId,
  ),
  ["operator-a", "operator-b", "operator-c"],
);

const maaRoomIndexExport = buildRiicMaaScheduleFromPreview({
  preview: {
    states: [
      {
        durationHours: 12,
        rooms: [
          {
            key: "trading:lmd:0",
            facility: "trading",
            product: "lmd",
            stationIndex: 0,
            operators: [{ name: "LMD Operator" }],
          },
          {
            key: "trading:orundum:0",
            facility: "trading",
            product: "orundum",
            stationIndex: 0,
            operators: [{ name: "Orundum Operator" }],
          },
        ],
      },
    ],
  },
  shifts: [
    {
      name: "A",
      time: "08:00",
      drone: {
        target: "trading:orundum:0",
        order: "pre",
      },
    },
  ],
  roomIndexAssignments: {
    "trading:lmd:0": 2,
    "trading:orundum:0": 1,
  },
});
assert.deepEqual(
  maaRoomIndexExport.schedule.plans[0].rooms.trading.map(
    (room) => room.product,
  ),
  ["Originium Shard", "LMD"],
);
assert.equal(maaRoomIndexExport.schedule.plans[0].drones.index, 1);

const facilityCases = [
  {
    input: { layoutId: "153", cardKey: "153" },
    roomKey: "experience-manufacture",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
    ],
  },
  {
    input: { layoutId: "243", cardKey: "243" },
    roomKey: "lmd-trading",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
    ],
  },
  {
    input: {
      layoutId: "252",
      cardKey: "252-2-gold",
      facilityRequirement: "rightFull",
    },
    roomKey: "experience-manufacture",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 2, slotCount: 2 },
    ],
  },
  {
    input: { layoutId: "342", cardKey: "342-orundum" },
    roomKey: "lmd-trading",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 1, slotCount: 1 },
    ],
  },
  {
    input: { layoutId: "342", cardKey: "342-orundum" },
    roomKey: "orundum-trading",
    expected: [{ stationLevel: 3, slotCount: 3 }],
  },
  {
    input: { layoutId: "342", cardKey: "342" },
    roomKey: "lmd-trading",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 1, slotCount: 1 },
    ],
  },
  {
    input: { layoutId: "342", cardKey: "342" },
    roomKey: "gold-manufacture",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 2, slotCount: 2 },
      { stationLevel: 2, slotCount: 2 },
    ],
  },
  {
    input: { layoutId: "333", cardKey: "333" },
    roomKey: "lmd-trading",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
    ],
  },
  {
    input: { layoutId: "243", cardKey: "243" },
    roomKey: "power",
    expected: [
      { stationLevel: 3, slotCount: 1 },
      { stationLevel: 3, slotCount: 1 },
      { stationLevel: 3, slotCount: 1 },
    ],
  },
  {
    input: { layoutId: "243", cardKey: "243" },
    roomKey: "dormitory",
    expected: [
      { stationLevel: 5, slotCount: 5 },
      { stationLevel: 5, slotCount: 5 },
      { stationLevel: 5, slotCount: 5 },
      { stationLevel: 5, slotCount: 5 },
    ],
  },
  {
    input: { layoutId: "342", cardKey: "342" },
    roomKey: "dormitory",
    expected: [
      { stationLevel: 1, slotCount: 5 },
      { stationLevel: 1, slotCount: 5 },
      { stationLevel: 1, slotCount: 5 },
      { stationLevel: 1, slotCount: 5 },
    ],
  },
  {
    input: { layoutId: "342", cardKey: "342" },
    roomKey: "processing",
    expected: [{ stationLevel: 3, slotCount: 1 }],
  },
  {
    input: { layoutId: "333", cardKey: "333" },
    roomKey: "gold-manufacture",
    expected: [
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
      { stationLevel: 3, slotCount: 3 },
    ],
  },
];

for (const { input, roomKey, expected } of facilityCases) {
  const profile = getRiicFacilityProfile(input);
  assert.ok(profile, `Missing profile for ${input.cardKey}`);
  assert.deepEqual(
    getRiicRoomStations({
      facilityProfile: profile,
      roomKey,
      roomCount: expected.length,
    }),
    expected,
  );
}

assert.deepEqual(
  getRiicRoomStations({ roomKey: "control", roomCount: 1 }),
  [{ stationLevel: 5, slotCount: 5 }],
);
assert.deepEqual(
  getRiicRoomStations({ roomKey: "meeting", roomCount: 1 }),
  [{ stationLevel: 3, slotCount: 2 }],
);
assert.deepEqual(
  getRiicRoomStations({
    facilityProfile: getRiicFacilityProfile({
      layoutId: "252",
      cardKey: "252-2-gold",
      facilityRequirement: "rightFull",
    }),
    roomKey: "meeting",
    roomCount: 1,
  }),
  [{ stationLevel: 3, slotCount: 2 }],
);
assert.deepEqual(
  getRiicRoomStations({
    facilityProfile: getRiicFacilityProfile({
      layoutId: "252",
      cardKey: "252-2-gold",
      facilityRequirement: "fullBlood",
    }),
    roomKey: "meeting",
    roomCount: 1,
  }),
  [{ stationLevel: 3, slotCount: 2 }],
);
assert.deepEqual(
  summarizeRiicFacilityPower([
    { facility: "power", stationLevel: 3 },
    { facility: "manufacture", stationLevel: 3 },
    { facility: "dormitory", stationLevel: 5 },
    { facility: "processing", stationLevel: 3 },
  ]),
  {
    supply: 270,
    consumption: 135,
    remaining: 135,
    overloaded: false,
    details: [
      {
        id: "",
        facility: "power",
        stationLevel: 3,
        supply: 270,
        consumption: 0,
      },
      {
        id: "",
        facility: "manufacture",
        stationLevel: 3,
        supply: 0,
        consumption: 60,
      },
      {
        id: "",
        facility: "dormitory",
        stationLevel: 5,
        supply: 0,
        consumption: 65,
      },
      {
        id: "",
        facility: "processing",
        stationLevel: 3,
        supply: 0,
        consumption: 10,
      },
    ],
  },
);
const trainingPreferenceCatalog = {
  scope: {
    roomType: "hire",
    product: "all",
    stationLevel: 1,
    slotCount: 1,
  },
  fallback: {
    percent: 0,
    poolKey: "ordinary",
  },
  candidates: [
    {
      id: "test:eyjafjalla",
      name: "艾雅法拉",
      members: [{ name: "艾雅法拉", elite: 2 }],
      efficiency: 45,
    },
    {
      id: "test:provence",
      name: "普罗旺斯",
      members: [{ name: "普罗旺斯", elite: 2 }],
      efficiency: 45,
    },
  ],
};
const trainingPreferenceFallbackCatalog = {
  pools: [
    {
      key: "ordinary",
      operators: [
        {
          name: "艾雅法拉",
          rates: [{ elite: 2, percent: 45 }],
        },
        {
          name: "普罗旺斯",
          rates: [{ elite: 2, percent: 45 }],
        },
      ],
    },
  ],
};
const matchingTrainingRoster = [
  {
    charId: "char_180_amgoat",
    name: "艾雅法拉",
    rarity: 6,
    elite: 2,
    level: 1,
  },
  {
    charId: "char_145_prove",
    name: "普罗旺斯",
    rarity: 5,
    elite: 2,
    level: 1,
  },
];
const currentTrainingRoster = [
  matchingTrainingRoster[0],
  {
    ...matchingTrainingRoster[1],
    elite: 0,
  },
];
const trainingPreferenceResolution = resolveRiicRoomCandidateSkeletons({
  catalog: trainingPreferenceCatalog,
  fallbackCatalog: trainingPreferenceFallbackCatalog,
  operatorNameToCharId: new Map([
    ["艾雅法拉", "char_180_amgoat"],
    ["普罗旺斯", "char_145_prove"],
  ]),
  ownedOperators: matchingTrainingRoster,
  currentOwnedOperators: currentTrainingRoster,
  roomType: "hire",
  product: "all",
  stationLevel: 1,
  slotCount: 1,
  trainingMode: "ideal",
});
const coreRequirementsByCandidateId = new Map(
  trainingPreferenceResolution.candidateSkeletons.map((skeleton) => [
    skeleton.candidate.id,
    skeleton.coreUpgradeRequirements,
  ]),
);
assert.deepEqual(coreRequirementsByCandidateId.get("test:eyjafjalla"), []);
assert.equal(
  coreRequirementsByCandidateId.get("test:provence")?.[0]?.charId,
  "char_145_prove",
);
const trainingPreferencePlan = planRiicAutomaticRoomSelections({
  selectionCohorts: [
    {
      key: "hire:1",
      cohortId: "hire:1",
      cohortKey: "hire:1",
      teamCount: 1,
    },
  ],
  resolveTeamOptions: () => [
    {
      key: "provence",
      candidateKey: "test:provence",
      claimedOperatorIds: ["char_145_prove"],
      baseRankingValue: 45,
      rankingValue: 45,
      unmetUpgradeRequirementCount: 1,
    },
    {
      key: "eyjafjalla",
      candidateKey: "test:eyjafjalla",
      claimedOperatorIds: ["char_180_amgoat"],
      baseRankingValue: 45,
      rankingValue: 45,
      unmetUpgradeRequirementCount: 0,
    },
  ],
});
assert.equal(
  trainingPreferencePlan.bestPlan?.selections?.[0]?.option?.candidateKey,
  "test:eyjafjalla",
);

const droneSettlementPreview = {
  states: [
    {
      durationHours: 12,
      rooms: [
        {
          key: "power:1",
          label: "发电站 1",
          facility: "power",
          efficiency: 100,
          efficiencyMetrics: {
            actual: { status: "calculated" },
          },
          operators: [{ charId: "power-operator" }],
        },
        {
          key: "manufacture:experience:1",
          label: "经验书制造站 1",
          facility: "manufacture",
          product: "experience",
          stationLevel: 3,
          efficiency: 130,
          efficiencyMetrics: {
            actual: { status: "calculated" },
          },
        },
        {
          key: "manufacture:experience:2",
          label: "经验书制造站 2",
          facility: "manufacture",
          product: "experience",
          stationLevel: 3,
          efficiency: 250,
          efficiencyMetrics: {
            actual: { status: "calculated" },
          },
        },
        {
          key: "trading:lmd:1",
          label: "龙门币贸易站 1",
          facility: "trading",
          product: "lmd",
          stationLevel: 3,
          efficiency: 120,
          efficiencyMetrics: {
            actual: { status: "calculated" },
          },
          controlCenterFacilityBonusPercent: 17,
          activeRosterBonusPercent: 23,
          resourceChainAdditionalBonusPercent: 31,
          controlCenterOperatorBonuses: [
            {
              operatorId: "char_502_nblade",
              bonusPercent: 29,
            },
          ],
          operators: createNormalTradingRoomOperators(),
        },
        {
          key: "trading:lmd:2",
          label: "龙门币贸易站 2",
          facility: "trading",
          product: "lmd",
          stationLevel: 3,
          efficiency: 260,
          efficiencyMetrics: {
            actual: { status: "calculated" },
          },
          operators: createNormalTradingRoomOperators(),
        },
      ],
    },
  ],
};
const droneSettlement = summarizeRiicActualSchedule({
  preview: droneSettlementPreview,
  droneTargetKeysByState: ["manufacture:experience:1"],
  tradingOperators: normalTradingOperators,
});
const retainedDronePreview = {
  states: Array.from({ length: 3 }, () => ({
    ...structuredClone(droneSettlementPreview.states[0]),
    durationHours: 6,
  })),
};
const retainedDroneSettlement = summarizeRiicActualSchedule({
  preview: retainedDronePreview,
  droneTargetKeysByState: Array(3).fill("manufacture:experience:1"),
  droneOrdersByState: ["retain", "pre", "pre"],
  tradingOperators: normalTradingOperators,
});
assert.deepEqual(
  retainedDroneSettlement.yield.droneUsage.segments.map(
    (segment) => segment.usedDroneOutput,
  ),
  [0, 126, 63],
);
assert.deepEqual(
  retainedDroneSettlement.yield.droneTargetSettlement.segments.map(
    (segment) => segment.output,
  ),
  [0, 2100, 1050],
);

const wraparoundRetainedDroneSettlement = summarizeRiicActualSchedule({
  preview: retainedDronePreview,
  droneTargetKeysByState: Array(3).fill("manufacture:experience:1"),
  droneOrdersByState: ["pre", "pre", "retain"],
  tradingOperators: normalTradingOperators,
});
assert.deepEqual(
  wraparoundRetainedDroneSettlement.yield.droneUsage.segments.map(
    (segment) => segment.usedDroneOutput,
  ),
  [126, 63, 0],
);
assert.deepEqual(
  wraparoundRetainedDroneSettlement.yield.droneTargetSettlement.segments.map(
    (segment) => segment.output,
  ),
  [2100, 1050, 0],
);

const cappedRetainedDroneSettlement = summarizeRiicActualSchedule({
  preview: {
    states: Array.from({ length: 3 }, () =>
      structuredClone(droneSettlementPreview.states[0]),
    ),
  },
  droneTargetKeysByState: Array(3).fill("manufacture:experience:1"),
  droneOrdersByState: ["retain", "retain", "pre"],
  tradingOperators: normalTradingOperators,
});
assert.equal(
  cappedRetainedDroneSettlement.yield.droneUsage.segments[2].usedDroneOutput,
  235,
);
assert.equal(
  cappedRetainedDroneSettlement.yield.droneUsage.segments[1].capacityReached,
  true,
);
assert.equal(
  cappedRetainedDroneSettlement.yield.droneUsage.capacityReached,
  true,
);

const allRetainedDroneSettlement = summarizeRiicActualSchedule({
  preview: retainedDronePreview,
  droneTargetKeysByState: Array(3).fill("manufacture:experience:1"),
  droneOrdersByState: ["retain", "retain", "retain"],
  tradingOperators: normalTradingOperators,
});
assert.deepEqual(
  allRetainedDroneSettlement.yield.droneUsage.segments.map(
    (segment) => segment.usedDroneOutput,
  ),
  [0, 0, 0],
);
assert.equal(
  allRetainedDroneSettlement.yield.droneUsage.capacityReached,
  true,
);
const experienceDroneSettlements = droneSettlement.yield.droneTargetSettlements
  .filter((settlement) => settlement.key.startsWith("manufacture:experience:"))
  .map((settlement) => settlement.segments[0]?.output);
assert.deepEqual(experienceDroneSettlements, [2100, 2100]);
assert.equal(
  droneSettlement.yield.droneTargetSettlement.segments[0]?.output,
  2100,
);
const lmdDroneSettlements = droneSettlement.yield.droneTargetSettlements
  .filter((settlement) => settlement.key.startsWith("trading:lmd:"))
  .map((settlement) => ({
    output: settlement.segments[0]?.output,
    goldConsumption: settlement.segments[0]?.tradingFlow?.goldConsumption,
  }));
assert.equal(lmdDroneSettlements[0]?.output, lmdDroneSettlements[1]?.output);
for (const settlement of lmdDroneSettlements) {
  assert.ok(Number.isFinite(settlement.goldConsumption));
  assert.equal(
    settlement.goldConsumption,
    Math.round((settlement.output / 500) * 100) / 100,
  );
}
const lmdDroneResourceEffect =
  droneSettlement.yield.droneTargetSettlements.find(
    (settlement) => settlement.key === "trading:lmd:1",
  )?.resourceEffectsBySegment[0];
assert.equal(
  lmdDroneResourceEffect?.netGold,
  -lmdDroneResourceEffect?.goldConsumption,
);

const unrelatedUnavailableTradePreview = structuredClone(droneSettlementPreview);
unrelatedUnavailableTradePreview.states[0].rooms.push(
  createSettlementRoom({
    key: "trading:lmd:unavailable",
    facility: "trading",
    product: "lmd",
    efficiencyMetrics: {
      actual: { status: "unavailable" },
    },
  }),
);
const unrelatedUnavailableTradeSettlement = summarizeRiicActualSchedule({
  preview: unrelatedUnavailableTradePreview,
  tradingOperators: normalTradingOperators,
});
const experienceEffectWithUnavailableTrade =
  unrelatedUnavailableTradeSettlement.yield.droneTargetSettlements.find(
    (settlement) => settlement.key === "manufacture:experience:1",
  )?.resourceEffectsBySegment[0];
assert.equal(experienceEffectWithUnavailableTrade?.isCalculated, true);
assert.equal(experienceEffectWithUnavailableTrade?.primaryOutput, 2100);
assert.equal(experienceEffectWithUnavailableTrade?.goldConsumption, null);
const lmdEffectWithUnavailableTrade =
  unrelatedUnavailableTradeSettlement.yield.droneTargetSettlements.find(
    (settlement) => settlement.key === "trading:lmd:1",
  )?.resourceEffectsBySegment[0];
const lmdDroneSegmentWithUnavailableTrade =
  unrelatedUnavailableTradeSettlement.yield.droneTargetSettlements.find(
    (settlement) => settlement.key === "trading:lmd:1",
  )?.segments[0];
assert.equal(lmdDroneSegmentWithUnavailableTrade?.calculated, true);
assert.equal(lmdEffectWithUnavailableTrade?.isCalculated, true);
assert.equal(
  lmdEffectWithUnavailableTrade?.primaryOutput,
  lmdDroneSegmentWithUnavailableTrade?.output,
);
assert.equal(
  lmdEffectWithUnavailableTrade?.goldConsumption,
  lmdDroneSegmentWithUnavailableTrade?.tradingFlow?.goldConsumption,
);

function createSettlementRoom({
  key,
  facility,
  product = "",
  efficiency = 100,
  stationLevel = 3,
  operators = [],
  efficiencyMetrics,
}) {
  return {
    key,
    label: key,
    facility,
    product,
    stationLevel,
    efficiency,
    efficiencyMetrics:
      efficiencyMetrics || {
        actual: { status: "calculated" },
      },
    operators,
  };
}

function getYieldResource(yieldResult, resource) {
  return yieldResult.resources.find((item) => item.resource === resource);
}

const orundumSettlementPreview = {
  states: [
    {
      durationHours: 24,
      rooms: [
        createSettlementRoom({
          key: "power:1",
          facility: "power",
          stationLevel: 1,
          operators: [{ charId: "power-operator" }],
        }),
        createSettlementRoom({
          key: "manufacture:orundum:1",
          facility: "manufacture",
          product: "orundum",
        }),
        createSettlementRoom({
          key: "trading:orundum:1",
          facility: "trading",
          product: "orundum",
          efficiency: 193,
          operators: createNormalTradingRoomOperators(),
        }),
      ],
    },
  ],
};
const orundumSettlement = summarizeRiicActualSchedule({
  preview: orundumSettlementPreview,
  droneTargetKeysByState: [""],
  tradingOperators: normalTradingOperators,
});
assert.equal(
  getYieldResource(orundumSettlement.yield, "originiumShard").outputPerDay,
  -22.32,
);
assert.equal(
  getYieldResource(orundumSettlement.yield, "orundum").outputPerDay,
  463.2,
);
assert.equal(
  getYieldResource(orundumSettlement.yield, "lmd").outputPerDay,
  -38400,
);
assert.equal(
  orundumSettlement.yield.resourceFlows.orundum.lmdConsumptionPerDay,
  38400,
);
assert.equal(
  orundumSettlement.yield.resourceFlows.orundum.craftMaterial,
  "orirock",
);
assert.equal(
  orundumSettlement.yield.resourceFlows.orundum.craftMaterialConsumptionPerDay,
  48,
);
const orundumTradeDroneSettlement = orundumSettlement.yield.droneTargetSettlements.find(
  (settlement) => settlement.key === "trading:orundum:1",
);
assert.equal(
  orundumTradeDroneSettlement.resourceEffectsBySegment[0].primaryOutput,
  orundumTradeDroneSettlement.segments[0]?.output,
);
assert.ok(Number(orundumTradeDroneSettlement.segments[0]?.output) > 0);
assert.equal(
  orundumTradeDroneSettlement.resourceEffectsBySegment[0].primaryResource,
  "orundum",
);
assert.equal(
  orundumTradeDroneSettlement.resourceEffectsBySegment[0].shardConsumption,
  Math.round(
    (orundumTradeDroneSettlement.segments[0]?.output / 10) * 100,
  ) / 100,
);
assert.equal(
  orundumTradeDroneSettlement.resourceEffectsBySegment[0].lmdConsumption,
  null,
);

const orundumManufactureDroneSettlement = orundumSettlement.yield.droneTargetSettlements.find(
  (settlement) => settlement.key === "manufacture:orundum:1",
);
assert.equal(
  orundumManufactureDroneSettlement.resourceEffectsBySegment[0].primaryOutput,
  orundumManufactureDroneSettlement.segments[0]?.output,
);
assert.equal(
  orundumManufactureDroneSettlement.resourceEffectsBySegment[0].primaryResource,
  "originiumShard",
);
assert.equal(
  orundumManufactureDroneSettlement.resourceEffectsBySegment[0].shardConsumption,
  null,
);
assert.equal(
  orundumManufactureDroneSettlement.resourceEffectsBySegment[0].lmdConsumption,
  Math.round(
    (orundumManufactureDroneSettlement.segments[0]?.output * 1600) * 100,
  ) / 100,
);

const orundumDroneSelectedSettlement = summarizeRiicActualSchedule({
  preview: orundumSettlementPreview,
  droneTargetKeysByState: ["trading:orundum:1"],
  tradingOperators: normalTradingOperators,
});
const orundumDroneIncrement =
  orundumDroneSelectedSettlement.yield.droneTargetSettlement.segments[0]
    ?.output;
assert.ok(Number(orundumDroneIncrement) > 0);
assert.equal(
  getYieldResource(orundumDroneSelectedSettlement.yield, "orundum")
    .outputPerDay,
  Math.round((463.2 + orundumDroneIncrement) * 100) / 100,
);
assert.equal(
  getYieldResource(orundumDroneSelectedSettlement.yield, "originiumShard")
    .outputPerDay,
  Math.round((-22.32 - orundumDroneIncrement / 10) * 100) / 100,
);
assert.equal(
  getYieldResource(orundumDroneSelectedSettlement.yield, "lmd").outputPerDay,
  -38400,
);

const orundumManufactureDroneSelectedSettlement = summarizeRiicActualSchedule({
  preview: orundumSettlementPreview,
  droneTargetKeysByState: ["manufacture:orundum:1"],
  tradingOperators: normalTradingOperators,
});
const orundumManufactureDroneIncrement =
  orundumManufactureDroneSelectedSettlement.yield.droneTargetSettlement
    .segments[0]?.output;
assert.ok(Number(orundumManufactureDroneIncrement) > 0);
assert.equal(
  getYieldResource(orundumManufactureDroneSelectedSettlement.yield, "lmd")
    .outputPerDay,
  Math.round(
    (-38400 - orundumManufactureDroneIncrement * 1600) * 100,
  ) / 100,
);

const deviceOrundumSettlement = summarizeRiicActualSchedule({
  preview: orundumSettlementPreview,
  droneTargetKeysByState: [""],
  tradingOperators: normalTradingOperators,
  orundumCraftMaterial: "device",
});
assert.equal(
  getYieldResource(deviceOrundumSettlement.yield, "orundum").outputPerDay,
  463.2,
);
assert.equal(
  getYieldResource(deviceOrundumSettlement.yield, "lmd").outputPerDay,
  -24000,
);
assert.equal(
  deviceOrundumSettlement.yield.resourceFlows.orundum.craftMaterial,
  "device",
);
assert.equal(
  deviceOrundumSettlement.yield.resourceFlows.orundum
    .craftMaterialConsumptionPerDay,
  24,
);

const closureSettlementPreview = {
  states: [
    {
      durationHours: 24,
      rooms: [
        createSettlementRoom({
          key: "manufacture:gold:1",
          facility: "manufacture",
          product: "gold",
        }),
        createSettlementRoom({
          key: "trading:lmd:closure",
          facility: "trading",
          product: "lmd",
          operators: [
            { charId: "char_4228_closur" },
            { charId: "char_502_nblade" },
            { charId: "char_123_fang" },
          ],
        }),
      ],
    },
  ],
};
const closureSettlement = summarizeRiicActualSchedule({
  preview: closureSettlementPreview,
  tradingOperators: [
    { charId: "char_4228_closur", elite: 2, level: 1 },
    ...normalTradingOperators.slice(0, 2),
  ],
});
const closureGold = getYieldResource(closureSettlement.yield, "gold");
assert.equal(closureGold.grossOutputPerDay, 26.92);
assert.equal(closureGold.tradeConsumptionPerDay, 34.6);
assert.equal(closureGold.outputPerDay, -7.68);

const unsupportedP01TradePreview = {
  states: [
    {
      durationHours: 24,
      rooms: [
        createSettlementRoom({
          key: "trading:lmd:unsupported",
          facility: "trading",
          product: "lmd",
          operators: [
            { charId: "char_1033_swire2" },
            { charId: "char_502_nblade" },
            { charId: "char_123_fang" },
          ],
        }),
      ],
    },
  ],
};
const unsupportedP01TradeSettlement = summarizeRiicActualSchedule({
  preview: unsupportedP01TradePreview,
  tradingOperators: [
    { charId: "char_1033_swire2", elite: 2, level: 1 },
    ...normalTradingOperators.slice(0, 2),
  ],
});
assert.equal(
  unsupportedP01TradeSettlement.yield.rooms[0]?.unavailableReason,
  "notSupported",
);

const lowerLevelOrundumPreview = {
  states: [
    {
      durationHours: 24,
      rooms: [
        createSettlementRoom({
          key: "trading:orundum:level-1",
          facility: "trading",
          product: "orundum",
          stationLevel: 1,
          efficiency: 200,
          operators: [
            { charId: "char_1033_swire2" },
            { charId: "char_502_nblade" },
            { charId: "char_123_fang" },
          ],
        }),
      ],
    },
  ],
};
const lowerLevelOrundumSettlement = summarizeRiicActualSchedule({
  preview: lowerLevelOrundumPreview,
  tradingOperators: [
    { charId: "char_1033_swire2", elite: 2, level: 1 },
    ...normalTradingOperators.slice(0, 2),
  ],
});
assert.equal(
  getYieldResource(lowerLevelOrundumSettlement.yield, "orundum")
    .outputPerDay,
  480,
);
assert.equal(
  getYieldResource(lowerLevelOrundumSettlement.yield, "originiumShard")
    .outputPerDay,
  -48,
);
assert.equal(
  lowerLevelOrundumSettlement.yield.tradingSettlements[0]?.isCalculated,
  true,
);

const jacintaRotationPreview = {
  states: [
    {
      durationHours: 6,
      rooms: [
        createSettlementRoom({
          key: "trading:lmd:jacinta-1",
          facility: "trading",
          product: "lmd",
          operators: [
            { charId: "char_4237_jcinta" },
            { charId: "char_502_nblade" },
            { charId: "char_123_fang" },
          ],
        }),
        createSettlementRoom({
          key: "trading:lmd:jacinta-2",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
      ],
    },
    {
      durationHours: 6,
      rooms: [
        createSettlementRoom({
          key: "trading:lmd:jacinta-1",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
        createSettlementRoom({
          key: "trading:lmd:jacinta-2",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
      ],
    },
    {
      durationHours: 12,
      rooms: [
        createSettlementRoom({
          key: "trading:lmd:jacinta-1",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
        createSettlementRoom({
          key: "trading:lmd:jacinta-2",
          facility: "trading",
          product: "lmd",
          operators: [
            { charId: "char_4237_jcinta" },
            { charId: "char_502_nblade" },
            { charId: "char_123_fang" },
          ],
        }),
      ],
    },
  ],
};
const jacintaRotationSettlement = summarizeRiicActualSchedule({
  preview: jacintaRotationPreview,
  tradingOperators: [
    { charId: "char_4237_jcinta", elite: 0, level: 1 },
    ...normalTradingOperators,
  ],
});
for (const room of jacintaRotationSettlement.yield.rooms) {
  assert.equal(room.isCalculated, true);
  assert.equal(room.unavailableReason, "");
  assert.equal(room.segments.every((segment) => segment.calculated), true);
}

const closureVigilBelloneRotationPreview = {
  states: [
    {
      durationHours: 6,
      rooms: [
        createSettlementRoom({
          key: "meeting:1",
          facility: "meeting",
          stationLevel: 3,
        }),
        createSettlementRoom({
          key: "trading:lmd:1",
          facility: "trading",
          product: "lmd",
          operators: [
            { charId: "char_4228_closur" },
            { charId: "char_427_vigil" },
            { charId: "char_4037_demetr" },
          ],
        }),
        createSettlementRoom({
          key: "trading:lmd:2",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
      ],
    },
    {
      durationHours: 6,
      rooms: [
        createSettlementRoom({
          key: "meeting:1",
          facility: "meeting",
          stationLevel: 3,
        }),
        createSettlementRoom({
          key: "trading:lmd:1",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
        createSettlementRoom({
          key: "trading:lmd:2",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
      ],
    },
    {
      durationHours: 12,
      rooms: [
        createSettlementRoom({
          key: "meeting:1",
          facility: "meeting",
          stationLevel: 3,
        }),
        createSettlementRoom({
          key: "trading:lmd:1",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
        createSettlementRoom({
          key: "trading:lmd:2",
          facility: "trading",
          product: "lmd",
          operators: [
            { charId: "char_4228_closur" },
            { charId: "char_427_vigil" },
            { charId: "char_4037_demetr" },
          ],
        }),
      ],
    },
  ],
};
const closureVigilBelloneRotationSettlement = summarizeRiicActualSchedule({
  preview: closureVigilBelloneRotationPreview,
  tradingOperators: [
    { charId: "char_4228_closur", elite: 2, level: 1 },
    { charId: "char_427_vigil", elite: 2, level: 1 },
    { charId: "char_4037_demetr", elite: 2, level: 1 },
    ...normalTradingOperators,
  ],
});
for (const room of closureVigilBelloneRotationSettlement.yield.rooms.filter(
  (item) => item.facility === "trading",
)) {
  assert.equal(room.isCalculated, true);
  assert.equal(room.unavailableReason, "");
  assert.equal(room.segments.every((segment) => segment.calculated), true);
}
const closureVigilBelloneFirstSegment =
  closureVigilBelloneRotationSettlement.yield.rooms.find(
    (item) => item.key === "trading:lmd:1",
  )?.segments[0];
const closureVigilBelloneThirdSegment =
  closureVigilBelloneRotationSettlement.yield.rooms.find(
    (item) => item.key === "trading:lmd:2",
  )?.segments[2];
assert.ok(
  Math.abs(Number(closureVigilBelloneFirstSegment?.output) - 4825) < 0.01,
);
assert.ok(
  Math.abs(Number(closureVigilBelloneThirdSegment?.output) - 9650) < 0.01,
);

const belloneRosterOnlyPreview = {
  states: [
    {
      durationHours: 24,
      rooms: [
        createSettlementRoom({
          key: "meeting:1",
          facility: "meeting",
          stationLevel: 3,
        }),
        createSettlementRoom({
          key: "trading:lmd:bellone-roster-only",
          facility: "trading",
          product: "lmd",
          operators: [
            { charId: "char_4228_closur" },
            { charId: "char_4037_demetr" },
            { charId: "char_123_fang" },
          ],
        }),
      ],
    },
  ],
};
const belloneRosterOnlySettlement = summarizeRiicActualSchedule({
  preview: belloneRosterOnlyPreview,
  tradingOperators: [
    { charId: "char_4228_closur", elite: 2, level: 1 },
    { charId: "char_4037_demetr", elite: 2, level: 1 },
    { charId: "char_427_vigil", elite: 2, level: 1 },
    ...normalTradingOperators.slice(0, 2),
  ],
});
assert.ok(
  Math.abs(
    Number(belloneRosterOnlySettlement.yield.rooms[0]?.segments[0]?.output) -
      17300,
  ) < 0.01,
);

const tradingBonusPreview = {
  states: [
    {
      durationHours: 24,
      rooms: [
        createSettlementRoom({
          key: "trading:lmd:bonus",
          facility: "trading",
          product: "lmd",
          operators: createNormalTradingRoomOperators(),
        }),
      ],
    },
  ],
};
tradingBonusPreview.states[0].rooms[0].controlCenterFacilityBonusPercent = 7;
tradingBonusPreview.states[0].rooms[0].controlCenterOperatorBonuses = [
  {
    operatorId: "char_502_nblade",
    bonusPercent: 3,
  },
];
const tradingBonusSettlement = summarizeRiicActualSchedule({
  preview: tradingBonusPreview,
  tradingOperators: normalTradingOperators,
});
assert.equal(
  getYieldResource(tradingBonusSettlement.yield, "lmd").outputPerDay,
  20838.94,
);

const jayeStaticCandidate = {
  teamCalculation: {
    type: "jayeOrderLimit",
    sourceMember: "孑",
  },
  teamCalculationBaseLocalBonusPercent: 43.28,
  teamMemberProductionProfiles: [
    {
      charId: "char_272_strong",
      name: "孑",
      elite: 1,
      level: 1,
      basePercent: 0,
    },
    {
      charId: "char_172_svrash",
      name: "银灰",
      elite: 2,
      level: 1,
      basePercent: 20,
    },
    {
      charId: "char_148_aguard",
      name: "崖心",
      elite: 2,
      level: 1,
      basePercent: 0,
    },
  ],
};
const jayeStaticTeamCalculation = recalculateRiicRoomTeamCandidate({
  candidate: jayeStaticCandidate,
  scope: {
    roomType: "trading",
    stationLevel: 3,
  },
  controlCenterAdjustment: {
    operatorEffects: [],
  },
});
assert.deepEqual(jayeStaticTeamCalculation, {
  type: "jayeOrderLimit",
  sourceMemberId: "char_272_strong",
  sourceMemberName: "孑",
  stationLevel: 3,
  coreBonusPercentBeforeControl: 43.28,
  coreBonusAdjustmentPercent: 0,
  teammateDetails: [],
  usesStaticEstimate: true,
});

const jayeStaticPreview = {
  states: [
    {
      durationHours: 12,
      rooms: [
        {
          ...createSettlementRoom({
            key: "trading:lmd:jaye-static",
            facility: "trading",
            product: "lmd",
            operators: [
              { charId: "char_272_strong" },
              { charId: "char_172_svrash" },
              { charId: "char_148_aguard" },
            ],
          }),
          efficiencyMetrics: {
            actual: {
              status: "calculated",
              breakdown: {
                teamCalculation: jayeStaticTeamCalculation,
              },
            },
          },
        },
      ],
    },
  ],
};
const jayeStaticSettlement = summarizeRiicActualSchedule({
  preview: jayeStaticPreview,
  tradingOperators: [
    { charId: "char_272_strong", elite: 1, level: 1 },
    { charId: "char_172_svrash", elite: 2, level: 1 },
    { charId: "char_148_aguard", elite: 2, level: 1 },
  ],
});
const jayeStaticSegment =
  jayeStaticSettlement.yield.rooms[0]?.segments[0];
assert.equal(jayeStaticSegment?.calculated, true);
assert.equal(jayeStaticSegment?.unavailableReason, "");
assert.equal(jayeStaticSegment?.tradingCalculation?.rate, 146.28);

const controlCenterRoleDefinitions = [
  {
    id: "room",
    label: "房间产能加成",
    maxPerTeam: 3,
    buffTags: [
      "trading-station",
      "manufacture-station",
      "office",
    ],
  },
  {
    id: "operator",
    label: "干员加成",
    maxPerTeam: 5,
    buffTags: ["trading-operator", "manufacture-operator"],
  },
];
const createControlCenterCandidate = (
  charId,
  buffTag,
  sameTeamWithOperatorIds = [],
) => ({
  charId,
  name: charId,
  controlCenterBuffTags: [buffTag],
  controlCenterSameTeamWithOperatorIds: sameTeamWithOperatorIds,
});
const controlCenterCandidates = [
  createControlCenterCandidate("room-a", "trading-station"),
  createControlCenterCandidate("room-b", "manufacture-station"),
  createControlCenterCandidate("room-c", "office"),
  createControlCenterCandidate(
    "room-pair-a",
    "manufacture-station",
    ["room-pair-b"],
  ),
  createControlCenterCandidate(
    "room-pair-b",
    "trading-station",
    ["room-pair-a"],
  ),
  createControlCenterCandidate("operator-a", "manufacture-operator"),
  createControlCenterCandidate("operator-b", "trading-operator"),
];
const controlCenterScenarioTrials = [
  {
    sourceOperatorId: "room-a",
    roomEffectValue: 30,
    operatorTrialValue: 0,
  },
  {
    sourceOperatorId: "room-b",
    roomEffectValue: 20,
    operatorTrialValue: 0,
  },
  {
    sourceOperatorId: "room-c",
    roomEffectValue: 10,
    operatorTrialValue: 0,
  },
  {
    sourceOperatorId: "room-pair-a",
    roomEffectValue: 25,
    operatorTrialValue: 0,
  },
  {
    sourceOperatorId: "room-pair-b",
    roomEffectValue: 25,
    operatorTrialValue: 0,
  },
  {
    sourceOperatorId: "operator-a",
    roomEffectValue: 0,
    operatorTrialValue: 50,
  },
  {
    sourceOperatorId: "operator-b",
    roomEffectValue: 0,
    operatorTrialValue: 40,
  },
];
function createControlCenterStaffingRequirement(teamCount) {
  const teamIndexes =
    teamCount === 3 ? [0, 1, 2] : [0, 1];
  return {
    status: "ready",
    segmentHours: teamCount === 3 ? [12, 6, 6] : [12, 12],
    cohorts: [
      {
        teamCount,
        rotationSegments: teamIndexes.map((teamIndex) => ({
          activeTeamIndexes: [teamIndex],
        })),
      },
    ],
  };
}
for (const teamCount of [2, 3]) {
  const controlState = buildRiicControlCenterAutomaticRoleState({
    staffingRequirement:
      createControlCenterStaffingRequirement(teamCount),
    roomGroup: { stations: [{ slotCount: 5 }] },
    hasRoster: true,
    candidates: controlCenterCandidates,
    roleDefinitions: controlCenterRoleDefinitions,
    scenarioTrials: controlCenterScenarioTrials,
  });
  assert.equal(controlState.teams.length, teamCount);
  for (const team of controlState.teams) {
    const operatorIds = [
      ...team.roomEffectOperators,
      ...team.operatorEffectOperators,
      ...team.fillerOperators,
    ].map((operator) => operator.charId);
    assert.ok(team.roomEffectOperators.length <= 3);
    assert.ok(operatorIds.length <= 5);
    assert.equal(
      operatorIds.includes("room-pair-a"),
      operatorIds.includes("room-pair-b"),
    );
  }
  const maxUsage = teamCount === 3 ? 2 : 1;
  for (const usage of Object.values(
    controlState.usageByOperatorId,
  )) {
    assert.ok(usage <= maxUsage);
  }
}
const reusableControlState = buildRiicControlCenterAutomaticRoleState({
  staffingRequirement: createControlCenterStaffingRequirement(3),
  roomGroup: { stations: [{ slotCount: 5 }] },
  hasRoster: true,
  candidates: [
    createControlCenterCandidate(
      "fiammetta-target",
      "manufacture-operator",
    ),
  ],
  roleDefinitions: controlCenterRoleDefinitions,
  scenarioTrials: [
    {
      sourceOperatorId: "fiammetta-target",
      roomEffectValue: 0,
      operatorTrialValue: 20,
    },
  ],
  fiammettaRecovery: {
    enabled: true,
    targetOperatorId: "fiammetta-target",
  },
});
assert.equal(
  reusableControlState.usageByOperatorId["fiammetta-target"],
  3,
);
const perTeamRemovedControlState = applyRiicControlCenterManualOverrides({
  automaticState: reusableControlState,
  manualOverrides: {
    removedOperatorIdsByTeamIndex: {
      1: ["fiammetta-target"],
    },
  },
  candidates: [
    createControlCenterCandidate(
      "fiammetta-target",
      "manufacture-operator",
    ),
  ],
  roleDefinitions: controlCenterRoleDefinitions,
  scenarioTrials: [
    {
      sourceOperatorId: "fiammetta-target",
      roomEffectValue: 0,
      operatorTrialValue: 20,
    },
  ],
  fiammettaRecovery: {
    enabled: true,
    targetOperatorId: "fiammetta-target",
  },
});
assert.ok(
  perTeamRemovedControlState.teams[0].operatorEffectOperators.some(
    (operator) => operator.charId === "fiammetta-target",
  ),
);
assert.ok(
  !perTeamRemovedControlState.teams[1].operatorEffectOperators.some(
    (operator) => operator.charId === "fiammetta-target",
  ),
);
assert.ok(
  perTeamRemovedControlState.teams[2].operatorEffectOperators.some(
    (operator) => operator.charId === "fiammetta-target",
  ),
);

const emptyTwoTeamControlState = buildRiicControlCenterAutomaticRoleState({
  staffingRequirement: createControlCenterStaffingRequirement(2),
  roomGroup: { stations: [{ slotCount: 1 }] },
  hasRoster: true,
  candidates: [],
  roleDefinitions: controlCenterRoleDefinitions,
});
const perTeamLateFillState = buildRiicControlCenterLateFillState({
  baseState: emptyTwoTeamControlState,
  excludedOperatorIdsByTeamIndex: {
    0: ["idle-a"],
  },
  roster: [
    { charId: "idle-a", name: "Idle A" },
    { charId: "idle-b", name: "Idle B" },
  ],
});
assert.deepEqual(
  perTeamLateFillState.teamEntries.map((entry) => entry.operatorIds),
  [["idle-b"], ["idle-a"]],
);

const controlTargetOperatorId = "control-target";
const createControlTargetEffect = (bonusPercent) => ({
  target: {
    scope: "operators",
    roomType: "manufacture",
    product: "experience",
    operatorIds: [controlTargetOperatorId],
  },
  metric: "production",
  bonusPercent,
});
const controlRuntimeContext = buildRiicControlCenterRuntimeContext({
  controlState: {
    status: "ready",
    segments: [
      {
        teamIndex: 0,
        operatorIds: ["control-source-a"],
        operators: [
          {
            charId: "control-source-a",
            controlCenterResolvedEffects: [
              createControlTargetEffect(10),
            ],
          },
        ],
      },
      {
        teamIndex: 1,
        operatorIds: ["control-source-b"],
        operators: [
          {
            charId: "control-source-b",
            controlCenterResolvedEffects: [
              createControlTargetEffect(7),
            ],
          },
        ],
      },
      {
        teamIndex: 2,
        operatorIds: ["control-source-c"],
        operators: [
          {
            charId: "control-source-c",
            controlCenterResolvedEffects: [
              createControlTargetEffect(-15),
            ],
          },
        ],
      },
    ],
  },
});
const controlTargetAdjustment = getRiicControlCenterRoomAdjustment({
  context: controlRuntimeContext,
  scope: {
    roomType: "manufacture",
    product: "experience",
  },
  operatorIds: [controlTargetOperatorId],
});
assert.equal(
  controlTargetAdjustment.operatorBonusByTeamIndex["0"][
    controlTargetOperatorId
  ],
  10,
);
assert.equal(
  controlTargetAdjustment.operatorBonusByTeamIndex["1"][
    controlTargetOperatorId
  ],
  7,
);
assert.equal(
  controlTargetAdjustment.operatorBonusByTeamIndex["2"][
    controlTargetOperatorId
  ],
  -15,
);
assert.equal(
  controlTargetAdjustment.operatorBonusById[controlTargetOperatorId],
  10,
);

console.log("RIIC schedule model checks passed.");
