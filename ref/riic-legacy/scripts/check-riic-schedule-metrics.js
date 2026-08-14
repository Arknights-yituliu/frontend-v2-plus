import assert from "node:assert/strict";
import { calculateRiicAssembledScheduleMetrics } from "../src/utils/riicScheduleMetrics.js";

function createStation(totalPercent, extra = {}) {
  return {
    candidate: {
      totalPercent,
      ...extra,
    },
  };
}

const metrics = calculateRiicAssembledScheduleMetrics({
  groups: [
    {
      groupId: "control",
      facility: "control",
      candidate: {
        segments: [
          {
            durationHours: 12,
            stationAssignments: [
              createStation(100, {
                appliedRules: [
                  { targetRoomType: "trading", percent: 70 },
                  { targetRoomType: "manufacture", percent: 20 },
                ],
              }),
            ],
          },
          {
            durationHours: 12,
            stationAssignments: [
              createStation(100, {
                appliedRules: [
                  { targetRoomType: "trading", percent: 30 },
                ],
              }),
            ],
          },
        ],
      },
    },
    {
      groupId: "trading",
      facility: "trading",
      candidate: {
        segments: [
          {
            durationHours: 12,
            stationAssignments: [
              createStation(180, { manufacturePercent: 50 }),
            ],
          },
          {
            durationHours: 12,
            stationAssignments: [
              createStation(200, { manufacturePercent: 50 }),
            ],
          },
          {
            durationHours: 12,
            stationAssignments: [
              createStation(190, { manufacturePercent: 50 }),
            ],
          },
        ],
      },
    },
    {
      groupId: "manufacture",
      facility: "manufacture",
      candidate: {
        segments: [
          { durationHours: 12, stationAssignments: [createStation(150)] },
          { durationHours: 12, stationAssignments: [createStation(170)] },
        ],
      },
    },
  ],
});

assert.equal(metrics.cycleHours, 72);
assert.deepEqual(metrics.groups.trading, {
  facility: "trading",
  baseAveragePercent: 190,
});
assert.deepEqual(metrics.groups.manufacture, {
  facility: "manufacture",
  baseAveragePercent: 160,
});
assert.deepEqual(metrics.groups.control, {
  facility: "control",
  baseAveragePercent: 100,
});

console.log("RIIC schedule metrics checks passed.");
