import assert from "node:assert/strict";
import {
  buildRiicCalculationFeedback,
  formatRiicCalculationFeedback,
} from "../src/utils/riic/riic-calculation-feedback.js";

const preview = {
  states: [
    {
      rooms: [
        {
          key: "trading:lmd:1",
          label: "龙门币贸易站 1",
          product: "lmd",
          operators: [
            { charId: "char_a", name: "可露希尔" },
            { charId: "char_b", name: "伺夜" },
          ],
        },
        {
          key: "manufacture:experience:1",
          label: "经验书制造站",
          product: "experience",
          operators: [{ charId: "char_c", name: "夜烟" }],
        },
      ],
    },
    {
      rooms: [
        {
          key: "trading:lmd:1",
          label: "龙门币贸易站 1",
          product: "lmd",
          operators: [
            { charId: "char_a", name: "可露希尔" },
            { charId: "char_b", name: "伺夜" },
          ],
        },
      ],
    },
  ],
};

const feedback = buildRiicCalculationFeedback({
  preview,
  shifts: [{ name: "A班" }, { name: "B班" }],
  actualScheduleMetrics: {
    yield: {
      tradingSettlements: [
        {
          key: "trading:lmd:1",
          label: "龙门币贸易站 1",
          product: "lmd",
          segments: [
            {
              durationHours: 12,
              error: "notSupported",
            },
            {
              durationHours: 12,
              error: "notSupported",
            },
          ],
        },
      ],
      rooms: [
        {
          key: "manufacture:experience:1",
          label: "经验书制造站",
          facility: "manufacture",
          product: "experience",
          segments: [
            {
              durationHours: 12,
              unavailableReason: "efficiencyUnavailable",
            },
          ],
        },
      ],
      droneTargetSettlement: {
        segments: [
          {
            durationHours: 12,
            targetKey: "trading:lmd:1",
            targetLabel: "龙门币贸易站 1",
            unavailableReason: "notSupported",
          },
        ],
      },
    },
  },
});

assert.equal(feedback.length, 3);
assert.equal(feedback[0].errorCode, "P01:notSupported");
assert.equal(feedback[0].segments.length, 2);
assert.deepEqual(feedback[0].segments[0].operators, ["可露希尔", "伺夜"]);
assert.equal(feedback[1].errorCode, "efficiencyUnavailable");
assert.equal(feedback[2].title, "无人机核算｜龙门币贸易站 1");

const text = formatRiicCalculationFeedback({
  sourceLabel: "森空岛",
  layoutLabel: "243 · 一天两换",
  feedback,
});
assert.match(text, /数据源：森空岛/);
assert.match(text, /布局：243 · 一天两换/);
assert.match(text, /P01:notSupported/);
assert.match(text, /A班（12h）｜lmd｜在岗：可露希尔、伺夜/);

assert.deepEqual(
  buildRiicCalculationFeedback({
    preview,
    actualScheduleMetrics: { yield: {} },
  }),
  [],
);

console.log("RIIC calculation feedback checks passed.");
