import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import operatorTable from "../src/static/json/operator/character_table_simple.v2.json" with {
  type: "json",
};
import { matchRiicStaticRoomCandidates } from "../src/utils/riicStaticRoomCandidateMatcher.js";
import { buildRiicSchedulePreview } from "../src/utils/riicSchedulePreview.js";

const CANDIDATE_ROOT = "src/static/json/tools/riic-candidates";
const PERCENT_FIELDS = [
  "tradingPercent",
  "manufacturePercent",
  "meetingPercent",
  "officePercent",
  "powerPercent",
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(relativePath, "utf8"));
}

function listPublicJsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listPublicJsonFiles(entryPath);
    }
    return entry.name.endsWith(".json") ? [entryPath] : [];
  });
}

function getMemberSignature(candidate) {
  return (candidate?.members || [])
    .map(
      (member) =>
        `${member?.name || ""}:${Number(member?.elite || 0)}:${Number(
          member?.level || 1,
        )}:${member?.maxElite === undefined ? "" : Number(member.maxElite)}`,
    )
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("|");
}

function getRoomPercentField(roomType) {
  return {
    trading: "tradingPercent",
    manufacture: "manufacturePercent",
    meeting: "meetingPercent",
    hire: "officePercent",
    power: "powerPercent",
  }[roomType];
}

function getFallbackRate(fallback, name, elite = 0) {
  return fallback.operators
    .find((operator) => operator.name === name)
    ?.rates.find((rate) => Number(rate.elite || 0) === elite)?.percent;
}

const index = readJson(`${CANDIDATE_ROOT}/index.json`);
const tradingCatalog = readJson(`${CANDIDATE_ROOT}/trading/3.json`);
const tradingFallback = readJson(`${CANDIDATE_ROOT}/trading/3.fallback.json`);
const tradingLmdFallback = readJson(
  `${CANDIDATE_ROOT}/trading/lmd/3.fallback.json`,
);
const tradingLmdLevelOneCatalog = readJson(
  `${CANDIDATE_ROOT}/trading/lmd/1.json`,
);
const tradingLmdLevelTwoCatalog = readJson(
  `${CANDIDATE_ROOT}/trading/lmd/2.json`,
);
const tradingLmdCatalog = readJson(`${CANDIDATE_ROOT}/trading/lmd/3.json`);
const manufactureGoldLevelTwoCatalog = readJson(
  `${CANDIDATE_ROOT}/manufacture/gold/2.json`,
);
const manufactureGoldLevelThreeCatalog = readJson(
  `${CANDIDATE_ROOT}/manufacture/gold/3.json`,
);
const manufactureExperienceLevelTwoCatalog = readJson(
  `${CANDIDATE_ROOT}/manufacture/experience/2.json`,
);
const manufactureFallback = readJson(
  `${CANDIDATE_ROOT}/manufacture/3.fallback.json`,
);
const manufactureGoldFallback = readJson(
  `${CANDIDATE_ROOT}/manufacture/gold/3.fallback.json`,
);
const manufactureExperienceLevelThreeCatalog = readJson(
  `${CANDIDATE_ROOT}/manufacture/experience/3.json`,
);
const meetingLevelThreeCatalog = readJson(
  `${CANDIDATE_ROOT}/meeting/3.json`,
);

assert.equal(index.schemaVersion, 5);
assert.equal(index.files.length, 26);
assert.equal(
  fs.existsSync("src/static/json/tools/riic-fallback-operators.json"),
  false,
);

for (const entry of index.files) {
  const catalog = readJson(`${CANDIDATE_ROOT}/${entry.file}`);
  const fallback = readJson(`${CANDIDATE_ROOT}/${entry.fallbackFile}`);
  assert.equal(catalog.schemaVersion, 5);
  assert.equal(fallback.schemaVersion, 1);
  assert.deepEqual(fallback.scope, catalog.scope);
  assert.equal(catalog.candidates.length, entry.candidateCount);

  for (const candidate of catalog.candidates) {
    assert.equal(Object.hasOwn(candidate, "corePercent"), false);
    assert.ok(Number.isFinite(Number(candidate.sortScore)));
    for (const field of PERCENT_FIELDS) {
      assert.ok(
        Number.isFinite(Number(candidate[field])),
        `${candidate.id} is missing ${field}`,
      );
    }

    const localField = getRoomPercentField(catalog.scope.roomType);
    if (localField) {
      assert.ok(Number(candidate[localField]) >= 0);
      if (catalog.scope.roomType === "manufacture") {
        assert.ok(
          Number(candidate.manufacturePercent) >= 31,
          `${candidate.id} is below the manufacture candidate threshold`,
        );
      }
      if (
        catalog.scope.roomType === "trading" &&
        !candidate.id.startsWith("manual-")
      ) {
        assert.ok(
          Number(candidate.tradingPercent) >= 31,
          `${candidate.id} is below the trading candidate threshold`,
        );
      }
      const hasVirtualGoldManufactureContribution =
        catalog.scope.roomType === "trading" &&
        Number(candidate.virtualGoldPerHour) > 0;
      for (const field of PERCENT_FIELDS) {
        if (field !== localField) {
          assert.ok(
            Number(candidate[field]) === 0 ||
              (hasVirtualGoldManufactureContribution &&
                field === "manufacturePercent"),
            `${candidate.id} exposes an unsupported nonlocal ${field}`,
          );
        }
      }
    }
  }
}

assert.equal(getFallbackRate(manufactureFallback, "芬"), 23.75);
assert.equal(getFallbackRate(manufactureFallback, "克洛丝"), 22.5);
assert.equal(getFallbackRate(manufactureFallback, "刻俄柏", 2), 23.75);
assert.equal(getFallbackRate(manufactureFallback, "稀音"), 22.5);
assert.equal(getFallbackRate(manufactureGoldFallback, "阿罗玛"), 25);
assert.equal(getFallbackRate(manufactureGoldFallback, "阿罗玛", 2), 36.67);

for (const file of listPublicJsonFiles(CANDIDATE_ROOT)) {
  const content = fs.readFileSync(file, "utf8");
  assert.equal(content.includes("charId"), false, `${file} exposes charId`);
  assert.equal(content.includes("char_"), false, `${file} exposes charId`);
}

assert.deepEqual(meetingLevelThreeCatalog.scope, {
  roomType: "meeting",
  product: "all",
  stationLevel: 3,
  slotCount: 2,
});
assert.ok(meetingLevelThreeCatalog.candidates.length > 0);
assert.ok(
  meetingLevelThreeCatalog.candidates.every(
    (candidate) =>
      candidate.selectionMode === "individual" &&
      candidate.members.length === 1,
  ),
);
assert.equal(
  meetingLevelThreeCatalog.candidates.some(
    (candidate) => candidate.members.length > 1,
  ),
  false,
);

for (const roomType of ["manufacture", "trading"]) {
  const roomDirectory = path.join(CANDIDATE_ROOT, roomType);
  for (const entry of fs.readdirSync(roomDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    for (const level of [1, 2, 3]) {
      const genericCatalog = readJson(
        path.join(roomDirectory, `${level}.json`),
      );
      const productCatalog = readJson(
        path.join(roomDirectory, entry.name, `${level}.json`),
      );
      const genericCandidatesBySignature = new Map(
        genericCatalog.candidates.map((candidate) => [
          getMemberSignature(candidate),
          candidate,
        ]),
      );
      for (const candidate of productCatalog.candidates) {
        const genericCandidate = genericCandidatesBySignature.get(
          getMemberSignature(candidate),
        );
        if (genericCandidate) {
          assert.equal(
            candidate.variantGroupId,
            genericCandidate.variantGroupId,
            `${roomType}/${entry.name}/${level}.json has an ambiguous generic override`,
          );
        }
      }
    }
  }
}

const nameToCharId = new Map(
  Object.entries(operatorTable).map(([charId, operator]) => [
    operator.name,
    charId,
  ]),
);

function toRosterEntry(member) {
  const charId = nameToCharId.get(member.name);
  assert.ok(charId, `Unknown operator name: ${member.name}`);
  return {
    charId,
    name: member.name,
    elite: Number(member.elite || 0),
    level: Number(member.level || 1),
  };
}

function getFallbackRoster({ count, excludedNames = new Set() }) {
  const selected = [];
  const selectedNames = new Set(excludedNames);
  const rankedOperators = tradingFallback.operators
    .map((operator) => ({
      operator,
      rate: operator.rates.reduce(
        (best, current) =>
          Number(current.percent) > Number(best?.percent || -Infinity)
            ? current
            : best,
        null,
      ),
    }))
    .filter(({ operator, rate }) => rate && nameToCharId.has(operator.name))
    .sort(
      (left, right) =>
        Number(right.rate.percent) - Number(left.rate.percent) ||
        left.operator.name.localeCompare(right.operator.name, "zh-CN"),
    );

  for (const { operator, rate } of rankedOperators) {
    if (selected.length >= count || selectedNames.has(operator.name)) {
      continue;
    }
    selected.push(
      toRosterEntry({
        name: operator.name,
        elite: rate.elite,
        level: rate.level,
      }),
    );
    selectedNames.add(operator.name);
  }
  assert.equal(selected.length, count);
  return selected;
}

const tradingFallbackCatalog = {
  schemaVersion: 1,
  pools: [
    {
      key: tradingCatalog.fallback.poolKey,
      defaultPercent: tradingFallback.defaultPercent,
      operators: tradingFallback.operators,
    },
  ],
};
const tradingLmdFallbackCatalog = {
  schemaVersion: 1,
  pools: [
    {
      key: tradingLmdCatalog.fallback.poolKey,
      defaultPercent: tradingLmdFallback.defaultPercent,
      operators: tradingLmdFallback.operators,
    },
  ],
};
const meetingFallbackCatalog = {
  schemaVersion: 1,
  pools: [],
};
const emptyFallbackCatalog = {
  schemaVersion: 1,
  pools: [],
};

const baselineTradingCandidate = tradingCatalog.candidates.find(
  (candidate) => candidate.members.length === 1,
);
assert.ok(baselineTradingCandidate);
const tradingResult = matchRiicStaticRoomCandidates({
  catalog: tradingCatalog,
  fallbackCatalog: tradingFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: [
    ...baselineTradingCandidate.members.map(toRosterEntry),
    ...getFallbackRoster({
      count: 3,
      excludedNames: new Set(
        baselineTradingCandidate.members.map((member) => member.name),
      ),
    }),
  ],
  roomType: "trading",
  product: "all",
  stationLevel: 3,
  slotCount: 3,
});
const matchedTradingCandidate = tradingResult.candidates.find(
  (candidate) => candidate.key === baselineTradingCandidate.id,
);
assert.ok(matchedTradingCandidate);
assert.equal(
  matchedTradingCandidate.corePercent,
  baselineTradingCandidate.tradingPercent + 100,
);
assert.equal(
  matchedTradingCandidate.totalPercent,
  baselineTradingCandidate.tradingPercent +
    100 +
    matchedTradingCandidate.fallback.candidateOperators
      .slice(0, matchedTradingCandidate.fallback.count)
      .reduce((total, operator) => total + operator.percent, 0),
);
assert.deepEqual(
  matchedTradingCandidate.operators.map((operator) => operator.charId),
  matchedTradingCandidate.operatorIds,
);
assert.deepEqual(
  matchedTradingCandidate.operators.map((operator) => operator.name),
  baselineTradingCandidate.members.map((member) => member.name),
);
const tradingPreview = buildRiicSchedulePreview({
  roomGroups: [
    {
      id: "trading-preview",
      label: "贸易站组",
      facility: "trading",
      facilityLabel: "贸易站",
      count: 1,
    },
  ],
  scheduleCandidate: {
    key: "trading-preview",
    groups: [
      {
        groupId: "trading-preview",
        candidate: {
          segments: [
            {
              durationHours: 12,
              stationAssignments: [
                {
                  stationIndex: 0,
                  candidate: matchedTradingCandidate,
                },
              ],
            },
          ],
        },
      },
    ],
  },
});
assert.deepEqual(
  tradingPreview.states[0].rooms[0].operators.map(
    (operator) => operator.charId,
  ),
  matchedTradingCandidate.operatorIds,
);

const meetingCandidate = meetingLevelThreeCatalog.candidates[0];
const meetingResult = matchRiicStaticRoomCandidates({
  catalog: meetingLevelThreeCatalog,
  fallbackCatalog: meetingFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: meetingCandidate.members.map(toRosterEntry),
  roomType: "meeting",
  product: "all",
  stationLevel: 3,
  slotCount: 2,
});
assert.equal(meetingResult.candidates.length, 1);
assert.equal(meetingResult.candidates[0].selectionMode, "individual");
assert.equal(meetingResult.candidates[0].fallback.count, 0);
assert.equal(
  meetingResult.candidates[0].totalPercent,
  meetingCandidate.meetingPercent + 100,
);
assert.deepEqual(
  meetingResult.candidates[0].operators.map((operator) => operator.charId),
  meetingResult.candidates[0].operatorIds,
);

const automationLevelThreeCandidate =
  manufactureGoldLevelThreeCatalog.candidates.find(
    (candidate) =>
      candidate.id ===
      "manual-manufacture-gold-automation-qing-weedy-eunectes-p3-t2",
  );
assert.ok(automationLevelThreeCandidate);
assert.equal(automationLevelThreeCandidate.manufacturePercent, 115);
const automationLevelThreeRoster = automationLevelThreeCandidate.members.map(
  toRosterEntry,
);
const automationLevelThreeResult = matchRiicStaticRoomCandidates({
  catalog: manufactureGoldLevelThreeCatalog,
  fallbackCatalog: emptyFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: automationLevelThreeRoster,
  roomType: "manufacture",
  product: "gold",
  stationLevel: 3,
  slotCount: 3,
  powerPlantCount: 3,
  tradingStationCount: 2,
});
assert.equal(
  automationLevelThreeResult.candidates.some(
    (candidate) => candidate.key === automationLevelThreeCandidate.id,
  ),
  true,
);
assert.equal(
  automationLevelThreeResult.candidates.find(
    (candidate) => candidate.key === automationLevelThreeCandidate.id,
  )?.totalPercent,
  215,
);
const automationLevelThreeMismatch = matchRiicStaticRoomCandidates({
  catalog: manufactureGoldLevelThreeCatalog,
  fallbackCatalog: emptyFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: automationLevelThreeRoster,
  roomType: "manufacture",
  product: "gold",
  stationLevel: 3,
  slotCount: 3,
  powerPlantCount: 3,
  tradingStationCount: 1,
});
assert.equal(
  automationLevelThreeMismatch.candidates.some(
    (candidate) => candidate.key === automationLevelThreeCandidate.id,
  ),
  false,
);

const automationLevelTwoCandidate =
  manufactureGoldLevelTwoCatalog.candidates.find(
    (candidate) =>
      candidate.id ===
      "manual-manufacture-gold-automation-qing-weedy-p2-t3",
  );
assert.ok(automationLevelTwoCandidate);
assert.equal(automationLevelTwoCandidate.manufacturePercent, 90);
const automationLevelTwoResult = matchRiicStaticRoomCandidates({
  catalog: manufactureGoldLevelTwoCatalog,
  fallbackCatalog: emptyFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: automationLevelTwoCandidate.members.map(toRosterEntry),
  roomType: "manufacture",
  product: "gold",
  stationLevel: 2,
  slotCount: 2,
  powerPlantCount: 2,
  tradingStationCount: 3,
});
assert.equal(
  automationLevelTwoResult.candidates.find(
    (candidate) => candidate.key === automationLevelTwoCandidate.id,
  )?.totalPercent,
  190,
);

const tailoredTradingCandidate = tradingLmdCatalog.candidates.find(
  (candidate) =>
    candidate.variantGroupId === "family-shamare-tequila-tailor",
);
assert.ok(tailoredTradingCandidate);
assert.equal(tailoredTradingCandidate.tradingPercent, 135.79);
assert.equal(tailoredTradingCandidate.manufacturePercent, 44.25);
assert.equal(tailoredTradingCandidate.virtualGoldPerHour, 0.368721);
const alphaTailoredTradingCandidate = tradingLmdCatalog.candidates.find(
  (candidate) =>
    candidate.id ===
    "manual-trading-lmd-shamare-tequila-tailor-alpha-bena",
);
assert.ok(alphaTailoredTradingCandidate);
assert.equal(alphaTailoredTradingCandidate.tradingPercent, 127.45);
assert.equal(alphaTailoredTradingCandidate.manufacturePercent, 36.39);
assert.equal(alphaTailoredTradingCandidate.virtualGoldPerHour, 0.303291);

const butshuAlphaTequilaCandidate = tradingLmdCatalog.candidates.find(
  (candidate) =>
    candidate.id ===
    "manual-trading-lmd-butshu-alpha-tequila-partner-2a5715d352e7",
);
assert.ok(butshuAlphaTequilaCandidate);
assert.equal(butshuAlphaTequilaCandidate.manufacturePercent, 9.2);
assert.ok(butshuAlphaTequilaCandidate.virtualGoldPerHour > 0);
const butshuBetaShamareTequilaCandidate = tradingLmdCatalog.candidates.find(
  (candidate) =>
    candidate.id ===
    "manual-trading-lmd-butshu-beta-shamare-tequila-ab0ada61707a",
);
assert.ok(butshuBetaShamareTequilaCandidate);
assert.equal(butshuBetaShamareTequilaCandidate.manufacturePercent, 13.45);
assert.equal(butshuBetaShamareTequilaCandidate.virtualGoldPerHour, 0.112094);
assert.equal(butshuBetaShamareTequilaCandidate.tradingPercent, 207.93);

const butshuAlphaShamarePartnerCandidate =
  tradingLmdCatalog.candidates.find(
    (candidate) => candidate.name === "但书 α + 巫恋 + 安比尔",
  );
assert.ok(butshuAlphaShamarePartnerCandidate);
assert.equal(butshuAlphaShamarePartnerCandidate.tradingPercent, 142.41);

const butshuBetaShamarePartnerCandidate = tradingLmdCatalog.candidates.find(
  (candidate) => candidate.name === "但书 β + 巫恋 + 安比尔",
);
assert.ok(butshuBetaShamarePartnerCandidate);
assert.equal(butshuBetaShamarePartnerCandidate.tradingPercent, 194.83);

const butshuAlphaShamareTequilaCandidate =
  tradingLmdCatalog.candidates.find(
    (candidate) => candidate.name === "但书 α + 巫恋 + 龙舌兰",
  );
assert.ok(butshuAlphaShamareTequilaCandidate);
assert.equal(butshuAlphaShamareTequilaCandidate.tradingPercent, 155.52);

const butshuSoloCandidates = tradingLmdCatalog.candidates.filter(
  (candidate) =>
    candidate.variantGroupId.startsWith("family-butshu:solo-"),
);
assert.equal(butshuSoloCandidates.length, 2);
assert.deepEqual(
  butshuSoloCandidates
    .map((candidate) => ({
      variantGroupId: candidate.variantGroupId,
      stationLevel: candidate.stationLevel,
      members: candidate.members.length,
      tradingPercent: candidate.tradingPercent,
    }))
    .sort((left, right) =>
      left.variantGroupId.localeCompare(right.variantGroupId, "en"),
    ),
  [
    {
      variantGroupId: "family-butshu:solo-alpha",
      stationLevel: 3,
      members: 1,
      tradingPercent: 27.59,
    },
    {
      variantGroupId: "family-butshu:solo-beta",
      stationLevel: 3,
      members: 1,
      tradingPercent: 55.17,
    },
  ],
);

for (const [catalog, expected] of [
  [
    tradingLmdLevelOneCatalog,
    {
      alpha: 50,
      beta: 100,
    },
  ],
  [
    tradingLmdLevelTwoCatalog,
    {
      alpha: 41.67,
      beta: 83.33,
    },
  ],
]) {
  const solo = catalog.candidates.filter((candidate) =>
    candidate.variantGroupId.startsWith("family-butshu:solo-"),
  );
  assert.equal(solo.length, 2);
  assert.deepEqual(
    Object.fromEntries(
      solo.map((candidate) => [
        candidate.variantGroupId.split("-").at(-1),
        candidate.tradingPercent,
      ]),
    ),
    expected,
  );
}

const butshuTailorCandidates = tradingLmdCatalog.candidates.filter(
  (candidate) =>
    candidate.id.startsWith("manual-trading-lmd-butshu-tailor-"),
);
assert.equal(butshuTailorCandidates.length, 842);
assert.ok(
  butshuTailorCandidates.every(
    (candidate) =>
      candidate.calculationStatus === "estimated" &&
      candidate.meetingPercent === 0 &&
      candidate.officePercent === 0 &&
      candidate.powerPercent === 0,
  ),
);
const butshuTequilaTailorCandidates = butshuTailorCandidates.filter(
  (candidate) => candidate.members.some((member) => member.name === "龙舌兰"),
);
assert.equal(butshuTequilaTailorCandidates.length, 20);
assert.ok(
  butshuTequilaTailorCandidates.every(
    (candidate) =>
      candidate.manufacturePercent > 0 && candidate.virtualGoldPerHour > 0,
  ),
);

const expectedButshuVariantGroups = [
  "family-butshu:plain-pair",
  "family-butshu:shamare-plain",
  "family-butshu:shamare-tailor-alpha",
  "family-butshu:shamare-tailor-beta",
  "family-butshu:shamare-tequila",
  "family-butshu:solo-alpha",
  "family-butshu:solo-beta",
  "family-butshu:tailor-alpha-pair",
  "family-butshu:tailor-alpha-plain",
  "family-butshu:tailor-beta-pair",
  "family-butshu:tailor-beta-plain",
  "family-butshu:tequila-plain",
  "family-butshu:tequila-tailor-alpha",
  "family-butshu:tequila-tailor-beta",
];
const expectedFullTeamButshuVariantGroups =
  expectedButshuVariantGroups.filter(
    (variantGroupId) => !variantGroupId.startsWith("family-butshu:solo-"),
  );
const butshuCandidates = tradingLmdCatalog.candidates.filter((candidate) =>
  candidate.members.some((member) => member.name === "但书"),
);
assert.deepEqual(
  [...new Set(butshuCandidates.map((candidate) => candidate.variantGroupId))]
    .sort((left, right) => left.localeCompare(right, "en")),
  expectedButshuVariantGroups,
);

const butshuFormulaResult = matchRiicStaticRoomCandidates({
  catalog: tradingLmdCatalog,
  fallbackCatalog: emptyFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: butshuCandidates.flatMap((candidate) =>
    candidate.members.map(toRosterEntry),
  ),
  roomType: "trading",
  product: "lmd",
  stationLevel: 3,
  slotCount: 3,
});
assert.deepEqual(
  [
    ...new Set(
      butshuFormulaResult.candidates
        .filter((candidate) =>
          candidate.variantGroupId.startsWith("family-butshu:"),
        )
        .map((candidate) => candidate.variantGroupId),
    ),
  ].sort((left, right) => left.localeCompare(right, "en")),
  expectedFullTeamButshuVariantGroups,
);

for (const sourceCandidate of butshuSoloCandidates) {
  const result = matchRiicStaticRoomCandidates({
    catalog: tradingLmdCatalog,
    fallbackCatalog: tradingLmdFallbackCatalog,
    operatorNameToCharId: nameToCharId,
    ownedOperators: [
      ...sourceCandidate.members.map(toRosterEntry),
      ...getFallbackRoster({
        count: 2,
        excludedNames: new Set(
          sourceCandidate.members.map((member) => member.name),
        ),
      }),
    ],
    roomType: "trading",
    product: "lmd",
    stationLevel: 3,
    slotCount: 3,
  });
  const candidate = result.candidates.find(
    (entry) => entry.variantGroupId === sourceCandidate.variantGroupId,
  );
  assert.ok(candidate);
  assert.equal(candidate.fallback.count, 2);
  assert.equal(candidate.fallback.candidateOperators.length >= 2, true);
  assert.equal(
    candidate.totalPercent,
    100 + candidate.tradingPercent + candidate.fallback.totalPercent,
  );
}

const hongxueCandidate = tradingCatalog.candidates.find(
  (candidate) =>
    candidate.id === "manual-trading-all-hongxue-e0-gold-2-l3",
);
assert.ok(hongxueCandidate);
assert.equal(hongxueCandidate.tradingPercent, 10);
const hongxueResult = matchRiicStaticRoomCandidates({
  catalog: tradingCatalog,
  fallbackCatalog: tradingFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: [
    ...hongxueCandidate.members.map(toRosterEntry),
    ...getFallbackRoster({
      count: 2,
      excludedNames: new Set(
        hongxueCandidate.members.map((member) => member.name),
      ),
    }),
  ],
  roomType: "trading",
  product: "all",
  stationLevel: 3,
  slotCount: 3,
  goldManufactureStationCount: 2,
});
assert.equal(
  hongxueResult.candidates.some(
    (candidate) => candidate.key === hongxueCandidate.id,
  ),
  true,
);
const hongxueMismatch = matchRiicStaticRoomCandidates({
  catalog: tradingCatalog,
  fallbackCatalog: tradingFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: [
    ...hongxueCandidate.members.map(toRosterEntry),
    ...getFallbackRoster({
      count: 2,
      excludedNames: new Set(
        hongxueCandidate.members.map((member) => member.name),
      ),
    }),
  ],
  roomType: "trading",
  product: "all",
  stationLevel: 3,
  slotCount: 3,
  goldManufactureStationCount: 1,
});
assert.equal(
  hongxueMismatch.candidates.some(
    (candidate) => candidate.key === hongxueCandidate.id,
  ),
  false,
);

const warehouseCandidate = manufactureExperienceLevelThreeCatalog.candidates.find(
  (candidate) =>
    candidate.id ===
    "manual-manufacture-experience-redcloud-pallas-scene-12h",
);
assert.ok(warehouseCandidate);
assert.equal(warehouseCandidate.manufacturePercent, 103.5);

const christineAndPhatm2Candidate =
  manufactureExperienceLevelTwoCatalog.candidates.find(
    (candidate) =>
      candidate.members.some((member) => member.name === "Miss.Christine") &&
      candidate.members.some((member) => member.name === "酒神"),
  );
assert.ok(christineAndPhatm2Candidate);
assert.equal(christineAndPhatm2Candidate.manufacturePercent, 65);
assert.equal(christineAndPhatm2Candidate.sortScore, 2);

const trainingTestOperatorName = baselineTradingCandidate.members[0].name;
const trainingTestOperatorId = nameToCharId.get(trainingTestOperatorName);
assert.ok(trainingTestOperatorId);
const trainingTestRoster = [
  {
    charId: trainingTestOperatorId,
    name: trainingTestOperatorName,
    elite: 0,
    level: 1,
  },
];
const trainingCoreCatalog = {
  schemaVersion: 5,
  scope: {
    roomType: "trading",
    product: "all",
    stationLevel: 1,
    slotCount: 1,
  },
  fallback: {
    percent: 0,
    label: "基础补位",
    poolKey: "training-test",
  },
  candidates: [
    {
      id: "training-core",
      name: "训练核心",
      members: [
        {
          name: trainingTestOperatorName,
          elite: 2,
          level: 1,
        },
      ],
      tradingPercent: 20,
      manufacturePercent: 0,
      meetingPercent: 0,
      officePercent: 0,
      powerPercent: 0,
      sortScore: 0,
    },
  ],
};
const currentTrainingCoreResult = matchRiicStaticRoomCandidates({
  catalog: trainingCoreCatalog,
  fallbackCatalog: emptyFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: trainingTestRoster,
  roomType: "trading",
  product: "all",
  stationLevel: 1,
  slotCount: 1,
});
assert.equal(currentTrainingCoreResult.candidates.length, 0);

const idealTrainingCoreResult = matchRiicStaticRoomCandidates({
  catalog: trainingCoreCatalog,
  fallbackCatalog: emptyFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: trainingTestRoster,
  roomType: "trading",
  product: "all",
  stationLevel: 1,
  slotCount: 1,
  trainingMode: "ideal",
});
assert.equal(idealTrainingCoreResult.candidates.length, 1);
assert.deepEqual(
  idealTrainingCoreResult.candidates[0].upgradeRequirements,
  [
    {
      charId: trainingTestOperatorId,
      name: trainingTestOperatorName,
      current: { elite: 0, level: 1 },
      required: { elite: 2, level: 1 },
    },
  ],
);

const trainingFallbackCatalog = {
  schemaVersion: 1,
  pools: [
    {
      key: "training-test",
      defaultPercent: 10,
      operators: [
        {
          name: trainingTestOperatorName,
          rates: [
            { elite: 0, level: 1, percent: 10 },
            { elite: 2, level: 1, percent: 35 },
          ],
        },
      ],
    },
  ],
};
const currentTrainingFallbackResult = matchRiicStaticRoomCandidates({
  catalog: {
    ...trainingCoreCatalog,
    candidates: [],
  },
  fallbackCatalog: trainingFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: trainingTestRoster,
  roomType: "trading",
  product: "all",
  stationLevel: 1,
  slotCount: 1,
});
assert.equal(currentTrainingFallbackResult.fallbackCandidate.totalPercent, 110);

const idealTrainingFallbackResult = matchRiicStaticRoomCandidates({
  catalog: {
    ...trainingCoreCatalog,
    candidates: [],
  },
  fallbackCatalog: trainingFallbackCatalog,
  operatorNameToCharId: nameToCharId,
  ownedOperators: trainingTestRoster,
  roomType: "trading",
  product: "all",
  stationLevel: 1,
  slotCount: 1,
  trainingMode: "ideal",
});
assert.equal(idealTrainingFallbackResult.fallbackCandidate.totalPercent, 135);
assert.deepEqual(
  idealTrainingFallbackResult.fallbackCandidate.upgradeRequirements,
  idealTrainingCoreResult.candidates[0].upgradeRequirements,
);

console.log("RIIC static room candidate matcher checks passed.");
