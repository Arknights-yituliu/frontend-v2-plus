import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { searchRiicCombinedShiftSwaps } = await vite.ssrLoadModule("/src/utils/riic/l75-general-shift-optimization.js");
  const swaps = Array.from({ length: 96 }, (_, index) => [
    { stateIndex: 0, roomKey: `room-${index}`, operatorIndex: 0 },
    { stateIndex: 1, roomKey: `room-${index}`, operatorIndex: 0 },
  ]);
  let best = [swaps[5]];
  let evaluations = 0;
  await searchRiicCombinedShiftSwaps({
    orderedSwaps: swaps,
    getBestSelection: () => best,
    evaluate: async (selection) => {
      evaluations += 1;
      if (selection.length === 2 && selection.includes(swaps[5]) && selection.includes(swaps[91])) best = selection;
    },
  });
  assert.ok(best.includes(swaps[91]), "应尝试将较晚的互补换班加入已选方案");
  assert.ok(evaluations <= 288, "联合搜索不得超过预算");
  best = [];
  evaluations = 0;
  await searchRiicCombinedShiftSwaps({
    orderedSwaps: swaps,
    getBestSelection: () => best,
    evaluate: async (selection) => {
      evaluations += 1;
      if (selection.length === 2 && selection.includes(swaps[0]) && selection.includes(swaps[1])) best = selection;
    },
  });
  assert.equal(best.length, 2, "没有单项改进时仍应尝试联合换班");
  assert.ok(evaluations <= 192, "没有单项改进时联合搜索不得超过原有预算");
  console.log("RIIC combined shift search checks passed.");
} finally {
  await vite.close();
}
