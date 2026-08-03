import assert from "node:assert/strict";
import {
  getRiicFacilityProfile,
  getRiicRoomStations,
  getRiicRotationCycle,
  getRiicRotationCycles,
  getRiicRotationSegmentHours,
} from "../src/utils/riicScheduleModel.js";

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
      { stationLevel: 2, slotCount: 2 },
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
  [{ stationLevel: 1, slotCount: 5 }],
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
  [{ stationLevel: 1, slotCount: 2 }],
);
assert.equal(
  getRiicFacilityProfile({ layoutId: "342", cardKey: "342" }),
  null,
);

console.log("RIIC schedule model checks passed.");
