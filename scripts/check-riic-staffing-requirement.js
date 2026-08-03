import assert from "node:assert/strict";
import {
  getRiicRoomGroupStaffingRequirement,
} from "../src/utils/riicStaffingRequirement.js";

const twoTradingStations = getRiicRoomGroupStaffingRequirement({
  stations: [
    { stationLevel: 3, slotCount: 3 },
    { stationLevel: 3, slotCount: 3 },
  ],
  shiftMode: "twice",
});
assert.equal(twoTradingStations.status, "ready");
assert.equal(twoTradingStations.cohorts.length, 1);
assert.equal(twoTradingStations.cohorts[0].id, "level-3-slot-3");
assert.equal(twoTradingStations.cohorts[0].teamCount, 3);
assert.equal(twoTradingStations.cohorts[0].operatorCount, 9);

const mixedLevelStations = getRiicRoomGroupStaffingRequirement({
  stations: [
    { stationLevel: 3, slotCount: 3 },
    { stationLevel: 2, slotCount: 2 },
  ],
  shiftMode: "twice",
});
assert.equal(mixedLevelStations.status, "ready");
assert.deepEqual(
  mixedLevelStations.cohorts.map((cohort) => ({
    id: cohort.id,
    stationLevel: cohort.stationLevel,
    slotCount: cohort.slotCount,
    stationCount: cohort.stationCount,
    teamCount: cohort.teamCount,
  })),
  [
    {
      id: "level-3-slot-3",
      stationLevel: 3,
      slotCount: 3,
      stationCount: 1,
      teamCount: 2,
    },
    {
      id: "level-2-slot-2",
      stationLevel: 2,
      slotCount: 2,
      stationCount: 1,
      teamCount: 2,
    },
  ],
);

const sameCapacityDifferentLevel = getRiicRoomGroupStaffingRequirement({
  stations: [
    { stationLevel: 3, slotCount: 2 },
    { stationLevel: 2, slotCount: 2 },
  ],
  shiftMode: "threeTimes",
});
assert.equal(sameCapacityDifferentLevel.cohorts.length, 2);
assert.deepEqual(
  sameCapacityDifferentLevel.cohorts.map((cohort) => cohort.id),
  ["level-3-slot-2", "level-2-slot-2"],
);

const dailyRequirement = getRiicRoomGroupStaffingRequirement({
  stations: [
    { stationLevel: 3, slotCount: 3 },
    { stationLevel: 3, slotCount: 3 },
  ],
  shiftMode: "once",
});
assert.equal(dailyRequirement.cohorts[0].teamCount, 4);
assert.equal(dailyRequirement.cohorts[0].operatorCount, 12);

const twoTeamThreeSegmentRequirement = getRiicRoomGroupStaffingRequirement({
  stations: [{ stationLevel: 3, slotCount: 3 }],
  shiftMode: "twice",
});
assert.deepEqual(
  twoTeamThreeSegmentRequirement.cohorts[0].rotationSegments.map(
    (segment) => segment.activeTeamIndexes,
  ),
  [[0], [0], [1]],
);

const maaTwoTradingStations = getRiicRoomGroupStaffingRequirement({
  stations: [
    { stationLevel: 3, slotCount: 3 },
    { stationLevel: 3, slotCount: 3 },
  ],
  shiftMode: "twice",
  twoShiftRotationMode: "maa",
});
assert.equal(maaTwoTradingStations.cohorts[0].teamCount, 4);
assert.equal(maaTwoTradingStations.cohorts[0].operatorCount, 12);
assert.deepEqual(
  maaTwoTradingStations.cohorts[0].rotationSegments.map(
    (segment) => segment.assignments.map((assignment) => assignment.teamIndex),
  ),
  [
    [0, 1],
    [2, 3],
  ],
);

const maaThreeTradingStations = getRiicRoomGroupStaffingRequirement({
  stations: [
    { stationLevel: 3, slotCount: 3 },
    { stationLevel: 3, slotCount: 3 },
    { stationLevel: 3, slotCount: 3 },
  ],
  shiftMode: "twice",
  twoShiftRotationMode: "maa",
});
assert.equal(maaThreeTradingStations.cohorts[0].teamCount, 6);

const dailyMeetingRequirement = getRiicRoomGroupStaffingRequirement({
  roomType: "meeting",
  stations: [{ stationLevel: 3, slotCount: 2 }],
  shiftMode: "once",
});
assert.equal(dailyMeetingRequirement.cohorts[0].selectionMode, "individual");
assert.equal(dailyMeetingRequirement.cohorts[0].teamCount, 4);
assert.equal(dailyMeetingRequirement.cohorts[0].operatorCount, 4);
assert.deepEqual(
  dailyMeetingRequirement.cohorts[0].rotationSegments.map(
    (segment) => segment.assignments[0].candidateIndexes,
  ),
  [
    [0, 1],
    [2, 3],
  ],
);

const rotatingMeetingRequirement = getRiicRoomGroupStaffingRequirement({
  roomType: "meeting",
  stations: [{ stationLevel: 3, slotCount: 2 }],
  shiftMode: "threeTimes",
});
assert.equal(rotatingMeetingRequirement.cohorts[0].selectionMode, "individual");
assert.equal(rotatingMeetingRequirement.cohorts[0].teamCount, 3);
assert.equal(rotatingMeetingRequirement.cohorts[0].operatorCount, 3);
assert.deepEqual(
  rotatingMeetingRequirement.cohorts[0].rotationSegments.map(
    (segment) => segment.assignments[0].candidateIndexes,
  ),
  [
    [0, 1],
    [1, 2],
    [2, 0],
  ],
);

const maaMeetingRequirement = getRiicRoomGroupStaffingRequirement({
  roomType: "meeting",
  stations: [{ stationLevel: 3, slotCount: 2 }],
  shiftMode: "twice",
  twoShiftRotationMode: "maa",
});
assert.equal(maaMeetingRequirement.cohorts[0].selectionMode, "individual");
assert.equal(maaMeetingRequirement.cohorts[0].teamCount, 4);
assert.equal(maaMeetingRequirement.cohorts[0].operatorCount, 4);
assert.deepEqual(
  maaMeetingRequirement.cohorts[0].rotationSegments.map(
    (segment) => segment.assignments[0].candidateIndexes,
  ),
  [
    [0, 1],
    [2, 3],
  ],
);

console.log("RIIC staffing requirement checks passed.");
