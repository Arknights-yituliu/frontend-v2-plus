import assert from "node:assert/strict";
import { calculateRiicTrading as calculateRiicTradingP01 } from "../src/utils/riic/P01-riic-trading.js";
import {
  resolveRiicTradingExternalOrderBonuses,
} from "../src/utils/riic/riic-trading-context.js";

const facility = (level, product = "lmd", context = null) => ({
  type: "trading",
  product,
  level,
  ...(context ? { context } : {}),
});
const operator = (charId, elite = 0, level = 1) => ({
  charId,
  elite,
  level,
});
const calculateRiicTrading = (legacyFacility, operators, legacyBonus = {}) => {
  const result = calculateRiicTradingP01({
    // Existing fixtures assert the former steady-state order probabilities.
    durationHours: 1_000_000_000,
    operators,
    tradingFactors: {
      product: String(legacyFacility?.product || "").trim(),
      stationLevel: Number(legacyFacility?.level),
      roomBonus: Number(legacyBonus?.room || 0),
      operatorBonusesById: legacyBonus?.operators || {},
      orderAdjustment: {
        ...(Object.hasOwn(legacyBonus || {}, "localOrderBonusOverride")
          ? {
              localOrderBonusOverride:
                legacyBonus.localOrderBonusOverride,
            }
          : {}),
        ignoredUnsupportedOperatorIds:
          legacyBonus?.ignoredUnsupportedOperatorIds || [],
      },
      crossRoomFactors: legacyFacility?.context || {},
    },
  });
  const { durationHours, segment, ...legacyResult } = result;
  return legacyResult;
};

function assertClose(actual, expected, epsilon = 0.0001) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function resolvedContext({
  operatorIds = [],
  dormitoryLevels = [],
  meetingLevel = null,
  manufactureProductKindCount = 0,
} = {}) {
  const rooms = [
    {
      facility: "trading",
      operators: operatorIds.map((charId) => ({ charId })),
    },
    ...dormitoryLevels.map((stationLevel) => ({
      facility: "dormitory",
      stationLevel,
      operators: [],
    })),
    ...(Number.isInteger(meetingLevel)
      ? [{ facility: "meeting", stationLevel: meetingLevel, operators: [] }]
      : []),
    ...Array.from({ length: manufactureProductKindCount }, (_, index) => ({
      facility: "manufacture",
      product: `test-${index}`,
      operators: [],
    })),
  ];

  return {
    resolvedExternalOrderBonuses:
      resolveRiicTradingExternalOrderBonuses(rooms),
  };
}

const normalLevel1 = calculateRiicTrading(
  facility(1),
  [operator("char_502_nblade", 0, 30)],
);
assert.equal(normalLevel1.ok, true);
assert.equal(normalLevel1.type, "normal");
assert.equal(normalLevel1.product, "lmd");
assertClose(normalLevel1.rate, 131);
assertClose(normalLevel1.lmd, 545.833333);
assertClose(normalLevel1.gold, -1.091667);
assert.equal(normalLevel1.virtualGold, 0);
assert.equal(normalLevel1.orundumCapacity, 0);

const normalLevel2 = calculateRiicTrading(
  facility(2),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(normalLevel2.ok, true);
assert.equal(normalLevel2.type, "normal");
assert.equal(normalLevel2.product, "lmd");
assertClose(normalLevel2.rate, 162);
assertClose(normalLevel2.lmd, 684.507042);
assertClose(normalLevel2.gold, -1.369014);
assert.equal(normalLevel2.virtualGold, 0);
assert.equal(normalLevel2.orundumCapacity, 0);

const normal = calculateRiicTrading(
  facility(3),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
    operator("char_282_catap", 0, 1),
  ],
);
assert.equal(normal.ok, true);
assert.equal(normal.type, "normal");
assert.equal(normal.product, "lmd");
assertClose(normal.rate, 193);
assertClose(normal.lmd, 825.516224);
assertClose(normal.gold, -1.651032);
assert.equal(normal.virtualGold, 0);
assert.equal(normal.orundumCapacity, 0);

const partialNormal = calculateRiicTrading(
  facility(3),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(partialNormal.ok, true);
assert.equal(partialNormal.type, "normal");

const lemuenNewExusiai = calculateRiicTrading(
  facility(2),
  [
    operator("char_4193_lemuen", 2, 1),
    operator("char_1041_angel2", 2, 1),
  ],
);
assert.equal(lemuenNewExusiai.ok, true);
assert.equal(lemuenNewExusiai.type, "normal");
assertClose(lemuenNewExusiai.rate, 162);

const ebenholzContextMissing = calculateRiicTrading(
  facility(3),
  [
    operator("char_4046_ebnhlz", 0, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(ebenholzContextMissing.ok, true);
assert.equal(ebenholzContextMissing.warning, true);

const ebenholzE0 = calculateRiicTrading(
  {
    ...facility(3),
    context: {
      silentResonance: 0,
    },
  },
  [
    operator("char_4046_ebnhlz", 0, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(ebenholzE0.ok, true);
assert.equal(ebenholzE0.type, "normal");
assertClose(ebenholzE0.rate, 163);
assertClose(ebenholzE0.lmd, 697.19764);
assertClose(ebenholzE0.gold, -1.394395);

const ebenholzE2 = calculateRiicTrading(
  {
    ...facility(3),
    context: {
      silentResonance: 15,
    },
  },
  [
    operator("char_4046_ebnhlz", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(ebenholzE2.ok, true);
assert.equal(ebenholzE2.type, "normal");
assertClose(ebenholzE2.rate, 170);
assertClose(ebenholzE2.lmd, 727.138643);
assertClose(ebenholzE2.gold, -1.454277);

const kichiE0 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4203_kichi", 0, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(kichiE0.ok, true);
assert.equal(kichiE0.type, "normal");
assertClose(kichiE0.rate, 183);
assertClose(kichiE0.lmd, 782.743363);
assertClose(kichiE0.gold, -1.565487);

const kichiE2 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4203_kichi", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(kichiE2.ok, true);
assert.equal(kichiE2.type, "normal");
assertClose(kichiE2.rate, 203);
assertClose(kichiE2.lmd, 868.289086);
assertClose(kichiE2.gold, -1.736578);

const jacintaAlpha = calculateRiicTrading(
  facility(3),
  [
    operator("char_4237_jcinta", 0, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
const tailorAlpha = calculateRiicTrading(
  facility(3),
  [
    operator("char_252_bibeak", 0, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(jacintaAlpha.ok, true);
assert.equal(jacintaAlpha.type, "normal");
assertClose(jacintaAlpha.rate, tailorAlpha.rate);
assertClose(jacintaAlpha.lmd, tailorAlpha.lmd);
assertClose(jacintaAlpha.gold, tailorAlpha.gold);

const calculateTailorAlphaForHours = (durationHours) =>
  calculateRiicTradingP01({
    durationHours,
    operators: [
      operator("char_252_bibeak", 0, 1),
      operator("char_502_nblade", 0, 30),
      operator("char_123_fang", 1, 1),
    ],
    tradingFactors: {
      product: "lmd",
      stationLevel: 3,
      roomBonus: 0,
      operatorBonusesById: {},
    },
  });
const tailorAlphaOneHour = calculateTailorAlphaForHours(1);
const tailorAlphaThreeHours = calculateTailorAlphaForHours(3);
const tailorAlphaSixHours = calculateTailorAlphaForHours(6);
assert.equal(tailorAlphaOneHour.ok, true);
assertClose(tailorAlphaOneHour.segment.lmdOutput, 698.348492);
assertClose(tailorAlphaThreeHours.segment.lmdOutput, 2101.432469);
assertClose(tailorAlphaSixHours.segment.lmdOutput, 4211.637081);
assert.ok(tailorAlphaOneHour.rate < tailorAlphaThreeHours.rate);
assert.ok(tailorAlphaThreeHours.rate < tailorAlphaSixHours.rate);

const calculateTailorBetaForHours = (durationHours) =>
  calculateRiicTradingP01({
    durationHours,
    operators: [
      operator("char_252_bibeak", 2, 1),
      operator("char_502_nblade", 0, 30),
      operator("char_123_fang", 1, 1),
    ],
    tradingFactors: {
      product: "lmd",
      stationLevel: 3,
      roomBonus: 0,
      operatorBonusesById: {},
    },
  });
const tailorBetaOneHour = calculateTailorBetaForHours(1);
const tailorBetaFiveHours = calculateTailorBetaForHours(5);
const tailorBetaTenHours = calculateTailorBetaForHours(10);
assert.equal(tailorBetaOneHour.ok, true);
assertClose(tailorBetaOneHour.segment.lmdOutput, 698.437948);
assertClose(tailorBetaFiveHours.segment.lmdOutput, 3513.835264);
assertClose(tailorBetaTenHours.segment.lmdOutput, 7050.514217);
assert.ok(tailorBetaOneHour.rate < tailorBetaFiveHours.rate);
assert.ok(tailorBetaFiveHours.rate < tailorBetaTenHours.rate);

const butshuE0 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 0, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(butshuE0.ok, true);
assert.equal(butshuE0.type, "butshu");
assert.equal(butshuE0.product, "lmd");
assertClose(butshuE0.rate, 207.965517);
assertClose(butshuE0.lmd, 889.528024);
assertClose(butshuE0.gold, -1.779056);
assert.equal(butshuE0.virtualGold, 0);
assert.equal(butshuE0.orundumCapacity, 0);

const butshuE2 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(butshuE2.ok, true);
assert.equal(butshuE2.type, "butshu");
assert.equal(butshuE2.product, "lmd");
assertClose(butshuE2.rate, 252.931034);
assertClose(butshuE2.lmd, 1081.858407);
assertClose(butshuE2.gold, -2.163717);
assert.equal(butshuE2.virtualGold, 0);
assert.equal(butshuE2.orundumCapacity, 0);

const tequilaE0 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 0, 1),
    operator("char_486_takila", 0, 1),
    operator("char_502_nblade", 0, 30),
  ],
);
assert.equal(tequilaE0.ok, true);
assert.equal(tequilaE0.type, "butshu");
assert.equal(tequilaE0.product, "lmd");
assertClose(tequilaE0.rate, 174.275862);
assertClose(tequilaE0.lmd, 725.811209);
assertClose(tequilaE0.gold, -1.451622);
assertClose(tequilaE0.virtualGold, 0.039233);
assert.equal(tequilaE0.orundumCapacity, 0);

const tequilaE2 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_486_takila", 2, 1),
    operator("char_502_nblade", 0, 30),
  ],
);
assert.equal(tequilaE2.ok, true);
assert.equal(tequilaE2.type, "butshu");
assert.equal(tequilaE2.product, "lmd");
assertClose(tequilaE2.rate, 215.551724);
assertClose(tequilaE2.lmd, 882.743363);
assertClose(tequilaE2.gold, -1.765487);
assertClose(tequilaE2.virtualGold, 0.078466);
assert.equal(tequilaE2.orundumCapacity, 0);

const shamareButshu = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_254_vodfox", 2, 1),
    operator("char_486_takila", 2, 1),
  ],
);
assert.equal(shamareButshu.ok, true);
assert.equal(shamareButshu.type, "butshu");
assert.equal(shamareButshu.product, "lmd");
assertClose(shamareButshu.rate, 277.718318);
assert.ok(shamareButshu.virtualGold > 0);
assert.equal(shamareButshu.orundumCapacity, 0);

const shamareOverride = calculateRiicTrading(
  facility(3),
  [
    operator("char_254_vodfox", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(shamareOverride.ok, true);
assert.equal(shamareOverride.type, "normal");
assert.equal(shamareOverride.product, "lmd");
assertClose(shamareOverride.rate, 194.68913);
assert.equal(shamareOverride.orundumCapacity, 0);

const shamareButshuArchet = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_254_vodfox", 2, 1),
    operator("char_332_archet", 2, 1),
  ],
);
assert.equal(shamareButshuArchet.ok, true);
assert.equal(shamareButshuArchet.type, "butshu");
assert.equal(shamareButshuArchet.product, "lmd");
assertClose(shamareButshuArchet.rate, 246.224488);

const archetDormitoryBonus = calculateRiicTrading(
  facility(3, "lmd", resolvedContext({ dormitoryLevels: [5, 5, 5, 5] })),
  [
    operator("char_332_archet", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(archetDormitoryBonus.ok, true);
assert.equal(archetDormitoryBonus.type, "normal");
assertClose(archetDormitoryBonus.rate, 203);

const archetDormitoryContextMissing = calculateRiicTrading(
  facility(3),
  [
    operator("char_332_archet", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(archetDormitoryContextMissing.ok, true);
assert.equal(archetDormitoryContextMissing.warning, true);

const quartzManufactureBonus = calculateRiicTrading(
  facility(3, "orundum", resolvedContext({ manufactureProductKindCount: 3 })),
  [
    operator("char_4193_lemuen", 2, 1),
    operator("char_103_angel", 2, 1),
    operator("char_4063_quartz", 2, 1),
  ],
);
assert.equal(quartzManufactureBonus.ok, true);
assert.equal(quartzManufactureBonus.product, "orundum");
assertClose(quartzManufactureBonus.rate, 219);
assertClose(quartzManufactureBonus.orundumCapacity, 21.9);

const quartzManufactureContextMissing = calculateRiicTrading(
  facility(3, "orundum"),
  [
    operator("char_4193_lemuen", 2, 1),
    operator("char_103_angel", 2, 1),
    operator("char_4063_quartz", 2, 1),
  ],
);
assert.equal(quartzManufactureContextMissing.ok, true);
assert.equal(quartzManufactureContextMissing.warning, true);

const closure = calculateRiicTrading(
  facility(3),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(closure.ok, true);
assert.equal(closure.type, "closure");
assert.equal(closure.product, "lmd");
assertClose(closure.gold, -1.441667);
assertClose(closure.virtualGold, 0.288333);
assertClose(closure.lmd, 720.833333);
assert.ok(closure.virtualGold > 0);
assert.ok(closure.gold < 0);
assert.equal(closure.orundumCapacity, 0);

for (const closureSpecialOrderConflict of [
  operator("char_4032_provs", 2, 1),
  operator("char_486_takila", 2, 1),
  operator("char_252_bibeak", 2, 1),
]) {
  const result = calculateRiicTrading(
    facility(3),
    [operator("char_4228_closur", 2, 1), closureSpecialOrderConflict],
  );
  assert.equal(result.ok, true);
  assert.equal(result.type, "closure");
  assertClose(result.lmd, 466.666667);
  assertClose(result.gold, -0.933333);
  assertClose(result.virtualGold, 0.186667);
}

const closure70 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_103_angel", 2, 1),
  ],
);
assert.equal(closure70.ok, true);
assert.equal(closure70.type, "closure");
assert.equal(closure70.product, "lmd");
assertClose(closure70.lmd, 741.666667);
assertClose(closure70.gold, -1.483333);
assertClose(closure70.virtualGold, 0.296667);
assert.equal(closure70.orundumCapacity, 0);

const closure80 = calculateRiicTrading(
  facility(3),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_103_angel", 2, 1),
    operator("char_1049_catap2", 2, 1),
  ],
);
assert.equal(closure80.ok, true);
assert.equal(closure80.type, "closure");
assert.equal(closure80.product, "lmd");
assertClose(closure80.lmd, 762.5);
assertClose(closure80.gold, -1.525);
assertClose(closure80.virtualGold, 0.305);
assert.equal(closure80.orundumCapacity, 0);

const externalBonus = calculateRiicTrading(
  facility(3),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
    operator("char_282_catap", 0, 1),
  ],
  {
    room: 7,
    operators: {
      char_502_nblade: 3,
    },
  },
);
assert.equal(externalBonus.ok, true);
assert.equal(externalBonus.product, "lmd");
assertClose(externalBonus.rate, 203);
assertClose(externalBonus.lmd, 868.289086);
assertClose(externalBonus.gold, -1.736578);
assert.equal(externalBonus.orundumCapacity, 0);

const orundum = calculateRiicTrading(
  facility(3, "orundum"),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
    operator("char_282_catap", 0, 1),
  ],
);
assert.equal(orundum.ok, true);
assert.equal(orundum.type, "normal");
assert.equal(orundum.product, "orundum");
assertClose(orundum.rate, 193);
assert.equal(orundum.lmd, 0);
assert.equal(orundum.gold, 0);
assert.equal(orundum.virtualGold, 0);
assertClose(orundum.orundumCapacity, 19.3);
assertClose(orundum.shardConsumption, 1.93);
assert.equal("lmdConsumption" in orundum, false);
assert.equal("craftMaterial" in orundum, false);

const orundumDevice = calculateRiicTrading(
  {
    ...facility(3, "orundum"),
    orundumCraftMaterial: "device",
  },
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
    operator("char_282_catap", 0, 1),
  ],
);
assert.equal(orundumDevice.ok, true);
assertClose(orundumDevice.orundumCapacity, orundum.orundumCapacity);
assertClose(orundumDevice.shardConsumption, orundum.shardConsumption);
assert.equal("lmdConsumption" in orundumDevice, false);
assert.equal("craftMaterial" in orundumDevice, false);

const orundumExternalBonus = calculateRiicTrading(
  facility(3, "orundum"),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
    operator("char_282_catap", 0, 1),
  ],
  {
    room: 7,
    operators: {
      char_502_nblade: 3,
    },
  },
);
assert.equal(orundumExternalBonus.ok, true);
assertClose(orundumExternalBonus.rate, 203);
assertClose(orundumExternalBonus.orundumCapacity, 20.3);
assertClose(orundumExternalBonus.shardConsumption, 2.03);

const orundumClosure = calculateRiicTrading(
  facility(3, "orundum"),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(orundumClosure.ok, true);
assert.equal(orundumClosure.type, "normal");
assert.equal(orundumClosure.product, "orundum");
assertClose(orundumClosure.rate, 163);
assertClose(orundumClosure.orundumCapacity, 16.3);
assertClose(orundumClosure.shardConsumption, 1.63);

const orundumShamare = calculateRiicTrading(
  facility(3, "orundum"),
  [
    operator("char_254_vodfox", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(orundumShamare.ok, true);
assertClose(orundumShamare.rate, 193);
assertClose(orundumShamare.orundumCapacity, 19.3);
assertClose(orundumShamare.shardConsumption, 1.93);

const butshuShamareAlpha = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_254_vodfox", 0, 1),
    operator("char_486_takila", 2, 1),
  ],
);
assert.equal(butshuShamareAlpha.ok, true);
assert.equal(butshuShamareAlpha.type, "butshu");
assert.equal(butshuShamareAlpha.product, "lmd");
assertClose(butshuShamareAlpha.rate, 148.212367);
assertClose(butshuShamareAlpha.lmd, 562.055838);
assertClose(butshuShamareAlpha.gold, -1.124112);
assertClose(butshuShamareAlpha.virtualGold, 0.143782);

const shamareTequilaTailor = calculateRiicTrading(
  facility(3),
  [
    operator("char_254_vodfox", 2, 1),
    operator("char_486_takila", 2, 1),
    operator("char_252_bibeak", 2, 1),
  ],
);
assert.equal(shamareTequilaTailor.ok, true);
assert.equal(shamareTequilaTailor.type, "butshu");
assert.equal(shamareTequilaTailor.product, "lmd");
assertClose(shamareTequilaTailor.rate, 239.517832);
assertClose(shamareTequilaTailor.lmd, 837.214612);
assertClose(shamareTequilaTailor.gold, -1.674429);
assertClose(shamareTequilaTailor.virtualGold, 0.374543);

const shamareTequilaTailorAlpha = calculateRiicTrading(
  facility(3),
  [
    operator("char_254_vodfox", 2, 1),
    operator("char_486_takila", 2, 1),
    operator("char_252_bibeak", 0, 1),
  ],
);
assert.equal(shamareTequilaTailorAlpha.ok, true);
assert.equal(shamareTequilaTailorAlpha.type, "butshu");
assert.equal(shamareTequilaTailorAlpha.product, "lmd");
assertClose(shamareTequilaTailorAlpha.rate, 231.040063);
assertClose(shamareTequilaTailorAlpha.lmd, 834.184676);
assertClose(shamareTequilaTailorAlpha.gold, -1.668369);
assertClose(shamareTequilaTailorAlpha.virtualGold, 0.30808);

const butshuTequilaTailorAlpha = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_486_takila", 2, 1),
    operator("char_252_bibeak", 0, 1),
  ],
);
assert.equal(butshuTequilaTailorAlpha.ok, true);
assert.equal(butshuTequilaTailorAlpha.type, "butshu");
assert.equal(butshuTequilaTailorAlpha.product, "lmd");
assertClose(butshuTequilaTailorAlpha.rate, 148.212367);
assertClose(butshuTequilaTailorAlpha.lmd, 562.055838);
assertClose(butshuTequilaTailorAlpha.gold, -1.124112);
assertClose(butshuTequilaTailorAlpha.virtualGold, 0.143782);

const butshuTequilaTailorBeta = calculateRiicTrading(
  facility(3),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_486_takila", 2, 1),
    operator("char_252_bibeak", 2, 1),
  ],
);
assert.equal(butshuTequilaTailorBeta.ok, true);
assert.equal(butshuTequilaTailorBeta.type, "butshu");
assert.equal(butshuTequilaTailorBeta.product, "lmd");
assertClose(butshuTequilaTailorBeta.rate, 136.07239);
assertClose(butshuTequilaTailorBeta.lmd, 482.077626);
assertClose(butshuTequilaTailorBeta.gold, -0.964155);
assertClose(butshuTequilaTailorBeta.virtualGold, 0.199886);

const closureLemuenAngel = calculateRiicTrading(
  facility(3),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_4193_lemuen", 2, 1),
    operator("char_103_angel", 2, 1),
  ],
);
assert.equal(closureLemuenAngel.ok, true);
assert.equal(closureLemuenAngel.type, "closure");
assert.equal(closureLemuenAngel.product, "lmd");
assertClose(closureLemuenAngel.lmd, 804.166667);
assertClose(closureLemuenAngel.gold, -1.608333);
assertClose(closureLemuenAngel.virtualGold, 0.321667);

const butshuDeep = calculateRiicTrading(
  facility(2, "lmd", resolvedContext({ operatorIds: ["char_4145_ulpia"] })),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_4137_udflow", 2, 1),
  ],
);
assert.equal(butshuDeep.ok, true);
assert.equal(butshuDeep.type, "butshu");
assert.equal(butshuDeep.product, "lmd");
assertClose(butshuDeep.lmd, 1100);
assertClose(butshuDeep.gold, -2.2);

const butshuVigil = calculateRiicTrading(
  facility(2, "lmd", resolvedContext({ meetingLevel: 3 })),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_427_vigil", 2, 1),
  ],
);
assert.equal(butshuVigil.ok, true);
assert.equal(butshuVigil.type, "butshu");
assert.equal(butshuVigil.product, "lmd");
assertClose(butshuVigil.lmd, 1100);
assertClose(butshuVigil.gold, -2.2);

const closureBelloneWithoutVigilOnDuty = calculateRiicTrading(
  facility(3, "lmd", resolvedContext({ meetingLevel: 3 })),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_427_vigil", 2, 1),
    operator("char_4037_demetr", 2, 1),
  ],
);
assert.equal(closureBelloneWithoutVigilOnDuty.ok, true);
assertClose(closureBelloneWithoutVigilOnDuty.lmd, 762.5);

const closureVigilBellone = calculateRiicTrading(
  facility(
    3,
    "lmd",
    resolvedContext({
      operatorIds: ["char_427_vigil"],
      meetingLevel: 3,
    }),
  ),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_427_vigil", 2, 1),
    operator("char_4037_demetr", 2, 1),
  ],
);
assert.equal(closureVigilBellone.ok, true);
assert.equal(closureVigilBellone.type, "closure");
assert.equal(closureVigilBellone.product, "lmd");
assertClose(closureVigilBellone.lmd, 804.166667);
assertClose(
  closureVigilBellone.lmd - closureBelloneWithoutVigilOnDuty.lmd,
  41.666667,
);

const vignaWithoutGlasgow = calculateRiicTrading(
  facility(3),
  [
    operator("char_282_catap", 1, 55),
    operator("char_185_frncat", 1, 55),
    operator("char_1019_siege2", 2, 1),
  ],
);
assert.equal(vignaWithoutGlasgow.ok, true);
assertClose(vignaWithoutGlasgow.rate, 193);

const hodrerWithoutContext = calculateRiicTrading(
  facility(3),
  [
    operator("char_4088_hodrer", 2, 1),
    operator("char_282_catap", 1, 55),
    operator("char_185_frncat", 1, 55),
  ],
  {
    context: {},
  },
);
assert.equal(hodrerWithoutContext.ok, true);
assert.equal(hodrerWithoutContext.warning, true);

const hodrerWithoutPartners = calculateRiicTrading(
  facility(3, "lmd", resolvedContext()),
  [
    operator("char_4088_hodrer", 2, 1),
    operator("char_282_catap", 1, 55),
    operator("char_185_frncat", 1, 55),
  ],
);
assert.equal(hodrerWithoutPartners.ok, true);
assertClose(hodrerWithoutPartners.rate, 193);

const hodrerWithPartners = calculateRiicTrading(
  facility(
    3,
    "lmd",
    resolvedContext({
      operatorIds: ["char_4087_ines", "char_113_cqbw"],
    }),
  ),
  [
    operator("char_4088_hodrer", 2, 1),
    operator("char_282_catap", 1, 55),
    operator("char_185_frncat", 1, 55),
  ],
);
assert.equal(hodrerWithPartners.ok, true);
assertClose(hodrerWithPartners.rate, 203);

const closureVignaHodrer = calculateRiicTrading(
  facility(3, "lmd", resolvedContext()),
  [
    operator("char_4228_closur", 2, 1),
    operator("char_1019_siege2", 2, 1),
    operator("char_4088_hodrer", 2, 1),
  ],
);
assert.equal(closureVignaHodrer.ok, true);
assert.equal(closureVignaHodrer.type, "closure");

const vignaWithGlasgow = calculateRiicTrading(
  facility(3),
  [
    operator("char_282_catap", 1, 55),
    operator("char_1019_siege2", 2, 1),
    operator("char_112_siege", 2, 1),
  ],
);
assert.equal(vignaWithGlasgow.ok, true);
assertClose(vignaWithGlasgow.rate, 173);

const glasgowControlBonus = calculateRiicTradingP01({
  durationHours: 12,
  operators: [
    operator("char_1019_siege2", 2, 1),
    operator("char_154_morgan", 2, 1),
  ],
  tradingFactors: {
    product: "lmd",
    stationLevel: 3,
    roomBonus: 0,
    operatorBonusesById: {
      char_1019_siege2: 10,
      char_154_morgan: 10,
    },
  },
});
assert.equal(glasgowControlBonus.ok, true);
assertClose(glasgowControlBonus.rate, 182);
assertClose(glasgowControlBonus.segment.lmdOutput, 9341.59292);

const degenbrecherWithOrderLimitOperators = calculateRiicTrading(
  facility(3),
  [
    operator("char_4116_blkkgt", 2, 1),
    operator("char_208_melan", 1, 55),
    operator("char_109_fmout", 1, 55),
  ],
);
assert.equal(degenbrecherWithOrderLimitOperators.ok, true);
assertClose(degenbrecherWithOrderLimitOperators.rate, 178);

const unresolvedDeep = calculateRiicTrading(
  facility(2),
  [
    operator("char_4032_provs", 2, 1),
    operator("char_4137_udflow", 2, 1),
  ],
);
assert.equal(unresolvedDeep.ok, true);
assert.equal(unresolvedDeep.warning, true);
assert.equal(unresolvedDeep.type, "butshu");
assert.equal(unresolvedDeep.product, "lmd");
assertClose(unresolvedDeep.rate, 242);
assertClose(unresolvedDeep.lmd, 1022.535211);
assertClose(unresolvedDeep.gold, -2.04507);
assert.ok(
  unresolvedDeep.warnings.some(
    (warning) => warning.code === "missingExternalOrderBonus",
  ),
);

const unsupported = calculateRiicTrading(
  facility(3),
  [
    operator("char_1033_swire2", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(unsupported.ok, true);
assert.equal(unsupported.warning, true);
assert.equal(unsupported.type, "normal");
assert.equal(unsupported.product, "lmd");
assertClose(unsupported.rate, 183);
assertClose(unsupported.lmd, 782.743363);
assertClose(unsupported.gold, -1.565487);
assert.ok(
  unsupported.warnings.some(
    (warning) => warning.code === "unsupportedExclusion",
  ),
);

const unsupportedOrundum = calculateRiicTrading(
  facility(3, "orundum"),
  [
    operator("char_1033_swire2", 2, 1),
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(unsupportedOrundum.ok, true);
assert.equal(unsupportedOrundum.warning, true);
assert.equal(unsupportedOrundum.type, "normal");
assert.equal(unsupportedOrundum.product, "orundum");
assertClose(unsupportedOrundum.rate, 183);
assertClose(unsupportedOrundum.orundumCapacity, 18.3);
assertClose(unsupportedOrundum.shardConsumption, 1.83);
assert.ok(
  unsupportedOrundum.warnings.some(
    (warning) => warning.code === "unsupportedExclusion",
  ),
);

const level2Orundum = calculateRiicTrading(
  facility(2, "orundum"),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
  ],
);
assert.equal(level2Orundum.ok, true);
assert.equal(level2Orundum.product, "orundum");
assertClose(level2Orundum.orundumCapacity, 16.2);
assertClose(level2Orundum.shardConsumption, 1.62);

const invalidTradingFactors = calculateRiicTrading(
  {
    product: "lmd",
    level: 4,
  },
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
    operator("char_282_catap", 0, 1),
  ],
);
assert.equal(invalidTradingFactors.ok, true);
assert.equal(invalidTradingFactors.warning, true);

const invalidOperators = calculateRiicTrading(
  facility(3),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_502_nblade", 0, 30),
    operator("char_282_catap", 0, 1),
  ],
);
assert.equal(invalidOperators.ok, true);
assert.equal(invalidOperators.warning, true);

const invalidBonus = calculateRiicTrading(
  facility(3),
  [
    operator("char_502_nblade", 0, 30),
    operator("char_123_fang", 1, 1),
    operator("char_282_catap", 0, 1),
  ],
  {
    operators: {
      char_1019_siege2: 7,
    },
  },
);
assert.equal(invalidBonus.ok, true);
assert.equal(invalidBonus.warning, true);

console.log("RIIC P01 trading formula checks passed.");
