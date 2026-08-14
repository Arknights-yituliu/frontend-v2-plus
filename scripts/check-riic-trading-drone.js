import assert from "node:assert/strict";
import { calculateRiicTradingDrone } from "../src/utils/riic/P02-riic-trading-drone.js";

const facility = (level, product = "lmd") => ({
  type: "trading",
  product,
  level,
});
const operator = (charId, elite = 0, level = 1) => ({
  charId,
  elite,
  level,
});

function assertClose(actual, expected, epsilon = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

const normal = calculateRiicTradingDrone(facility(3), []);
assert.equal(normal.ok, true);
assertClose(normal.lmdOutput, 21.386431);
assertClose(normal.goldConsumption, 0.042773);
assert.equal(normal.orundumOutput, 0);
assert.equal(normal.shardConsumption, 0);

const partialTeam = calculateRiicTradingDrone(
  facility(3),
  [operator("char_502_nblade", 0, 30)],
);
assert.equal(partialTeam.ok, true);
assertClose(partialTeam.lmdOutput, normal.lmdOutput);
assertClose(partialTeam.goldConsumption, normal.goldConsumption);

const butshuE0 = calculateRiicTradingDrone(
  facility(3),
  [operator("char_4032_provs", 0, 1)],
);
const butshuE2 = calculateRiicTradingDrone(
  facility(3),
  [operator("char_4032_provs", 2, 1)],
);
assert.equal(butshuE0.ok, true);
assert.equal(butshuE2.ok, true);
assert.ok(butshuE2.lmdOutput > butshuE0.lmdOutput);
assert.ok(butshuE2.goldConsumption > butshuE0.goldConsumption);

const tequilaE0 = calculateRiicTradingDrone(
  facility(3),
  [operator("char_486_takila", 0, 1)],
);
const tequilaE2 = calculateRiicTradingDrone(
  facility(3),
  [operator("char_486_takila", 2, 1)],
);
assert.equal(tequilaE0.ok, true);
assert.equal(tequilaE2.ok, true);
assert.ok(tequilaE0.lmdOutput > normal.lmdOutput);
assert.ok(tequilaE2.lmdOutput > tequilaE0.lmdOutput);
assertClose(tequilaE2.goldConsumption, normal.goldConsumption);

const butshuTequila = calculateRiicTradingDrone(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_486_takila", 2, 1),
  ],
);
assert.equal(butshuTequila.ok, true);
assertClose(butshuTequila.lmdOutput, 34.660767);
assertClose(butshuTequila.goldConsumption, 0.066372);

const tailorAlpha = calculateRiicTradingDrone(
  facility(3),
  [operator("char_252_bibeak", 0, 1)],
);
const tailorBeta = calculateRiicTradingDrone(
  facility(3),
  [operator("char_252_bibeak", 2, 1)],
);
assert.equal(tailorAlpha.ok, true);
assert.equal(tailorBeta.ok, true);
assert.ok(tailorBeta.lmdOutput > tailorAlpha.lmdOutput);

for (const [charId, elite, expected] of [
  ["char_214_kafka", 0, tailorAlpha],
  ["char_499_kaitou", 0, tailorAlpha],
  ["char_214_kafka", 2, tailorBeta],
  ["char_499_kaitou", 2, tailorBeta],
]) {
  const result = calculateRiicTradingDrone(
    facility(3),
    [operator(charId, elite, 1)],
  );
  assert.equal(result.ok, true);
  assertClose(result.lmdOutput, expected.lmdOutput);
  assertClose(result.goldConsumption, expected.goldConsumption);
}

const closure = calculateRiicTradingDrone(
  facility(3),
  [operator("char_4228_closur", 2, 1)],
);
assert.equal(closure.ok, true);
assertClose(closure.lmdOutput, 27.5);
assertClose(closure.goldConsumption, 0.045833);

for (const closureSpecialOrderConflict of [
  operator("char_4032_provs", 2, 1),
  operator("char_486_takila", 2, 1),
  operator("char_252_bibeak", 2, 1),
]) {
  const result = calculateRiicTradingDrone(
    facility(3),
    [operator("char_4228_closur", 2, 1), closureSpecialOrderConflict],
  );
  assert.equal(result.ok, true);
  assertClose(result.lmdOutput, 27.5);
  assertClose(result.goldConsumption, 0.045833);
}

const orundum = calculateRiicTradingDrone(facility(3, "orundum"), []);
assert.equal(orundum.ok, true);
assertClose(orundum.orundumOutput, 0.5);
assertClose(orundum.shardConsumption, 0.05);
assert.equal(orundum.lmdOutput, 0);
assert.equal(orundum.goldConsumption, 0);

const invalidOperators = calculateRiicTradingDrone(
  facility(3),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_502_nblade", 0, 30),
  ],
);
assert.equal(invalidOperators.ok, false);
assert.equal(invalidOperators.error, "invalidOperators");

const unsupportedTailorLevel = calculateRiicTradingDrone(
  facility(2),
  [operator("char_252_bibeak", 2, 1)],
);
assert.equal(unsupportedTailorLevel.ok, false);
assert.equal(unsupportedTailorLevel.error, "notSupported");

console.log("RIIC P02 trading-drone checks passed.");
