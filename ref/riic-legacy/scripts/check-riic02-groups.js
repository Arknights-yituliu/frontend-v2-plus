import assert from "node:assert/strict";
import fs from "node:fs";
import operatorTable from "../src/static/json/operator/character_table_simple.v2.json" with {
  type: "json",
};
import { matchRiicStaticRoomCandidates } from "../src/utils/riic/l20-groups.js";
import {
  assertRiicRuntimeCandidateCatalog,
  assertRiicRuntimeFallbackCatalog,
  assertRiicRuntimeRuleTargetsForCatalog,
  createRiicRuntimePackageContext,
  createRiicRuntimeRuleContext,
  getRiicRuntimeCandidateContributionBreakdown,
} from "../src/utils/riic/l60-candidate-ranking.js";

const CANDIDATE_ROOT = "src/static/json/tools/riic-candidates";
const EMPTY_RUNTIME_RULE_CONTEXT = {
  rulesByCandidateId: new Map(),
  fallbackPostProcessRulesByOperatorName: new Map(),
};
const FORBIDDEN_RUNTIME_FIELDS = [
  "virtualGoldPerHour",
  "scheduleEffect",
  "downstreamBonusPercentByRoom",
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(relativePath, "utf8"));
}

function createRuntimePackageMetadata(index) {
  const candidateSchemaVersion = Number(index?.schemaVersion);

  return {
    releaseId: String(index?.releaseId || ""),
    runtime: {
      candidateSchemaVersion,
    },
    contract: {
      id: "riic-runtime-consumer-contract",
      version: candidateSchemaVersion >= 6 ? "3.0.0" : "2.1.0",
    },
  };
}

function hasObjectKey(value, key) {
  if (Array.isArray(value)) {
    return value.some((item) => hasObjectKey(item, key));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    Object.hasOwn(value, key) ||
    Object.values(value).some((item) => hasObjectKey(item, key))
  );
}

function createFixtureCatalog({ slotCount = 1, poolKey = "fixture-fallback" } = {}) {
  return {
    schemaVersion: 5,
    scope: {
      roomType: "trading",
      product: "all",
      stationLevel: 1,
      slotCount,
    },
    fallback: {
      percent: 30,
      label: "Fixture fallback",
      poolKey,
    },
    candidates: [],
  };
}

function createFixtureFallbackCatalog({ poolKey, operators }) {
  return {
    schemaVersion: 1,
    pools: [
      {
        key: poolKey,
        defaultPercent: 30,
        operators,
      },
    ],
  };
}

function matchFixture({
  catalog,
  fallbackCatalog,
  ownedOperators,
  operatorNameToCharId = new Map(),
  runtimeRuleContext = EMPTY_RUNTIME_RULE_CONTEXT,
  layoutFacts = {},
}) {
  return matchRiicStaticRoomCandidates({
    catalog,
    fallbackCatalog,
    operatorNameToCharId,
    ownedOperators,
    roomType: catalog.scope.roomType,
    product: catalog.scope.product,
    stationLevel: catalog.scope.stationLevel,
    slotCount: catalog.scope.slotCount,
    runtimeRuleContext,
    ...layoutFacts,
  });
}

function getIndexEntryScope(entry) {
  if (entry?.scope) {
    return entry.scope;
  }

  const [roomType, product, stationLevel, slotCount] = String(
    entry?.key || "",
  ).split(":");
  return {
    roomType,
    product,
    stationLevel: Number(stationLevel),
    slotCount: Number(slotCount),
  };
}

const index = readJson(`${CANDIDATE_ROOT}/index.json`);
const runtimeMetadata = createRuntimePackageMetadata(index);
const candidateSchemaVersion = Number(index?.schemaVersion);
const runtimeRules =
  candidateSchemaVersion === 5
    ? readJson(`${CANDIDATE_ROOT}/runtime-rules.json`)
    : null;
const runtimeRuleContext = createRiicRuntimePackageContext({
  manifest: runtimeMetadata,
  index,
  runtimeRules,
});

assert.ok([5, 6].includes(candidateSchemaVersion));
if (candidateSchemaVersion === 5) {
  assert.ok(runtimeRules);
} else {
  assert.equal(runtimeRules, null);
}

const candidateIds = new Set();
for (const entry of index.files) {
  const catalog = readJson(`${CANDIDATE_ROOT}/${entry.file}`);
  const fallback = readJson(`${CANDIDATE_ROOT}/${entry.fallbackFile}`);
  const catalogPath = `/src/static/json/tools/riic-candidates/${entry.file}`;
  const fallbackPath =
    `/src/static/json/tools/riic-candidates/${entry.fallbackFile}`;

  assertRiicRuntimeCandidateCatalog({
    context: runtimeRuleContext,
    catalog,
    expectedScope: getIndexEntryScope(entry),
    filePath: catalogPath,
  });
  assertRiicRuntimeFallbackCatalog({
    context: runtimeRuleContext,
    fallback,
    expectedScope: getIndexEntryScope(entry),
    filePath: fallbackPath,
  });
  assertRiicRuntimeRuleTargetsForCatalog({
    context: runtimeRuleContext,
    catalog,
  });

  for (const candidate of catalog.candidates) {
    assert.equal(
      candidateIds.has(candidate.id),
      false,
      `Duplicate RIIC candidate ID: ${candidate.id}`,
    );
    candidateIds.add(candidate.id);
  }
  for (const forbiddenField of FORBIDDEN_RUNTIME_FIELDS) {
    assert.equal(
      hasObjectKey(catalog, forbiddenField),
      false,
      `${entry.file} exposes ${forbiddenField}`,
    );
  }
  assert.equal(
    hasObjectKey(catalog, "charId"),
    false,
    `${entry.file} exposes a charId field`,
  );
}

const fallbackEligibilityCatalog = createFixtureCatalog();
const fallbackEligibilityPool = createFixtureFallbackCatalog({
  poolKey: "fixture-fallback",
  operators: [
    {
      name: "bravo-locked",
      rates: [{ elite: 1, level: 1, percent: 30 }],
    },
    {
      name: "zulu-eligible",
      rates: [{ elite: 1, level: 1, percent: 30 }],
    },
  ],
});
const fallbackEligibilityResult = matchFixture({
  catalog: fallbackEligibilityCatalog,
  fallbackCatalog: fallbackEligibilityPool,
  ownedOperators: [
    {
      charId: "fallback-alpha-unlisted",
      name: "alpha-unlisted",
      elite: 2,
      level: 90,
    },
    {
      charId: "fallback-bravo-locked",
      name: "bravo-locked",
      elite: 0,
      level: 1,
    },
    {
      charId: "fallback-zulu-eligible",
      name: "zulu-eligible",
      elite: 1,
      level: 1,
    },
  ],
});
assert.deepEqual(
  fallbackEligibilityResult.fallbackCandidate.fallback.candidateOperators.map(
    (operator) => operator.charId,
  ),
  ["fallback-zulu-eligible"],
);
assert.equal(fallbackEligibilityResult.fallbackCandidate.totalPercent, 130);

const rankedFallbackRates = [40, 35, 30, 25, 20, 15];

function matchFallbackEstimateFixture({
  fallbackCount,
  availableFallbackRates = rankedFallbackRates,
}) {
  const slotCount = 3;
  const coreCount = slotCount - fallbackCount;
  const poolKey = `fixture-offset-fallback-${fallbackCount}-${availableFallbackRates.length}`;
  const coreOperators = Array.from({ length: coreCount }, (_, index) => ({
    charId: `fixture-core-${fallbackCount}-${index}`,
    name: `fixture-core-${fallbackCount}-${index}`,
    elite: 0,
    level: 1,
    percent: 100 - index,
  }));
  const fallbackOperators = availableFallbackRates.map((percent, index) => ({
    charId: `fixture-rank-${index + 1}`,
    name: `fixture-rank-${index + 1}`,
    elite: 0,
    level: 1,
    percent,
  }));
  const catalog = {
    ...createFixtureCatalog({ slotCount, poolKey }),
    candidates: [
      {
        id: `fixture-offset-candidate-${fallbackCount}`,
        name: `Fixture offset candidate ${fallbackCount}`,
        members: coreOperators.map((operator) => ({
          name: operator.name,
        })),
        tradingPercent: 0,
        manufacturePercent: 0,
        meetingPercent: 0,
        officePercent: 0,
        powerPercent: 0,
        sortScore: 0,
      },
    ],
  };
  const allOperators = [...coreOperators, ...fallbackOperators];
  const result = matchFixture({
    catalog,
    fallbackCatalog: createFixtureFallbackCatalog({
      poolKey,
      operators: allOperators.map((operator) => ({
        name: operator.name,
        rates: [{ percent: operator.percent }],
      })),
    }),
    operatorNameToCharId: new Map(
      allOperators.map((operator) => [operator.name, operator.charId]),
    ),
    ownedOperators: allOperators,
  });

  return result.candidates.find(
    (candidate) => candidate.key === `fixture-offset-candidate-${fallbackCount}`,
  );
}

for (const [fallbackCount, expectedFallbackPercent] of [
  [1, 25],
  [2, 45],
  [3, 60],
]) {
  const candidate = matchFallbackEstimateFixture({ fallbackCount });
  assert.ok(candidate);
  assert.equal(candidate.fallback.count, fallbackCount);
  assert.equal(candidate.fallback.totalPercent, expectedFallbackPercent);
  assert.equal(candidate.totalPercent, 100 + expectedFallbackPercent);
}

const missingFallbackRankCandidate = matchFallbackEstimateFixture({
  fallbackCount: 2,
  availableFallbackRates: [40, 35, 30, 25],
});
assert.ok(missingFallbackRankCandidate);
assert.equal(missingFallbackRankCandidate.fallback.totalPercent, 55);
assert.equal(missingFallbackRankCandidate.totalPercent, 155);

if (candidateSchemaVersion === 5) {
  const actualTradingFallback = readJson(
    `${CANDIDATE_ROOT}/trading/lmd/3.fallback.json`,
  );
  const actualTradingCatalog = readJson(
    `${CANDIDATE_ROOT}/trading/lmd/3.json`,
  );
  const actualFallbackPoolKey = "actual-trading-lmd-fallback";
  const unlistedTradingFallbackResult = matchFixture({
    catalog: {
      ...actualTradingCatalog,
      fallback: {
        ...actualTradingCatalog.fallback,
        poolKey: actualFallbackPoolKey,
      },
      candidates: [],
    },
    fallbackCatalog: createFixtureFallbackCatalog({
      poolKey: actualFallbackPoolKey,
      operators: actualTradingFallback.operators,
    }),
    ownedOperators: [1, 2, 3].map((indexValue) => ({
      charId: `not-in-trading-fallback-${indexValue}`,
      name: `not-in-trading-fallback-${indexValue}`,
      elite: 2,
      level: 90,
    })),
  });
  assert.equal(unlistedTradingFallbackResult.fallbackCandidate, null);

  const butshuCandidateId =
    "manual-trading-lmd-butshu-alpha-shamare-tequila-d0aa459dc065";
  const butshuSourceCandidate = actualTradingCatalog.candidates.find(
    (candidate) => candidate.id === butshuCandidateId,
  );
  assert.ok(butshuSourceCandidate);

  const nameToCharId = new Map(
    Object.entries(operatorTable).map(([charId, operator]) => [
      operator.name,
      charId,
    ]),
  );
  const butshuRoster = butshuSourceCandidate.members.map((member) => {
    const charId = nameToCharId.get(member.name);
    assert.ok(charId, `Unknown operator name: ${member.name}`);
    return {
      charId,
      name: member.name,
      elite: Number(member.maxElite ?? member.elite ?? 0),
      level: Number(member.level || 90),
    };
  });
  const butshuMatch = matchFixture({
    catalog: {
      ...actualTradingCatalog,
      fallback: {
        ...actualTradingCatalog.fallback,
        poolKey: "unused",
      },
      candidates: [butshuSourceCandidate],
    },
    fallbackCatalog: {
      schemaVersion: 1,
      pools: [],
    },
    ownedOperators: butshuRoster,
    operatorNameToCharId: nameToCharId,
    runtimeRuleContext,
  });
  const matchedButshuCandidate = butshuMatch.candidates.find(
    (candidate) => candidate.key === butshuCandidateId,
  );
  assert.ok(matchedButshuCandidate);
  const butshuContribution =
    getRiicRuntimeCandidateContributionBreakdown(matchedButshuCandidate);
  assert.equal(butshuContribution.directBonusPercent, 155.52);
  assert.equal(butshuContribution.additionalByFacility.manufacture, 13.45);
  assert.equal(butshuContribution.totalContributionPercent, 168.97);
  assert.equal(butshuContribution.rankingValue, 68.97);
}

const schema2ContributionContext = createRiicRuntimeRuleContext({
  schemaVersion: 2,
  rules: [
    {
      id: "fixture-schema2-trading-contribution",
      when: {
        candidateId: "fixture-schema2-trading-candidate",
        room: {
          roomType: "trading",
          product: "all",
          stationLevel: 1,
          slotCount: 1,
        },
      },
      then: {
        addContributionPercent: {
          manufacture: 8.5,
        },
      },
    },
  ],
});
const schema2ContributionResult = matchFixture({
  catalog: {
    ...createFixtureCatalog(),
    candidates: [
      {
        id: "fixture-schema2-trading-candidate",
        name: "Fixture Schema 2 Trading Candidate",
        members: [],
        selectionMode: "individual",
        roomType: "trading",
        product: "all",
        stationLevel: 1,
        slotCount: 1,
        tradingPercent: 50,
        sortScore: 2,
      },
    ],
  },
  fallbackCatalog: {
    schemaVersion: 1,
    pools: [],
  },
  ownedOperators: [],
  runtimeRuleContext: schema2ContributionContext,
});
const schema2ContributionCandidate =
  schema2ContributionResult.candidates.find(
    (candidate) => candidate.key === "fixture-schema2-trading-candidate",
  );
assert.ok(schema2ContributionCandidate);
const schema2Contribution =
  getRiicRuntimeCandidateContributionBreakdown(schema2ContributionCandidate);
assert.equal(schema2Contribution.directByFacility.trading, 50);
assert.equal(schema2Contribution.additionalByFacility.manufacture, 8.5);
assert.equal(schema2Contribution.totalContributionPercent, 58.5);
assert.equal(schema2Contribution.rankingValue, 60.5);

const fallbackPostProcessContext = createRiicRuntimeRuleContext({
  schemaVersion: 2,
  rules: [
    {
      id: "fixture-fallback-post-process:thorn2",
      when: {
        operator: "fixture-thorn2",
        eliteAtLeast: 2,
        room: {
          roomType: "manufacture",
          product: "gold",
        },
      },
      then: {
        addFallbackPercentPerLayoutRoom: {
          roomType: "trading",
          percent: 3,
        },
      },
    },
  ],
});
const fallbackPostProcessCatalog = {
  ...createFixtureCatalog({
    poolKey: "fixture-fallback-post-process",
  }),
  scope: {
    roomType: "manufacture",
    product: "gold",
    stationLevel: 3,
    slotCount: 1,
  },
};
const fallbackPostProcessPool = createFixtureFallbackCatalog({
  poolKey: "fixture-fallback-post-process",
  operators: [
    {
      name: "fixture-thorn2",
      rates: [
        {
          percent: 30,
        },
        {
          elite: 2,
          percent: 30,
        },
      ],
    },
    {
      name: "fixture-ordinary",
      rates: [
        {
          percent: 34,
        },
      ],
    },
  ],
});
const fallbackPostProcessResult = matchFixture({
  catalog: fallbackPostProcessCatalog,
  fallbackCatalog: fallbackPostProcessPool,
  ownedOperators: [
    {
      charId: "fixture-thorn2",
      name: "fixture-thorn2",
      elite: 2,
      level: 1,
    },
    {
      charId: "fixture-ordinary",
      name: "fixture-ordinary",
      elite: 0,
      level: 1,
    },
  ],
  runtimeRuleContext: fallbackPostProcessContext,
  layoutFacts: {
    tradingStationCount: 2,
  },
});
assert.equal(
  fallbackPostProcessResult.fallbackCandidate.fallback.candidateOperators[0]
    .charId,
  "fixture-thorn2",
);
assert.equal(
  fallbackPostProcessResult.fallbackCandidate.fallback.candidateOperators[0]
    .percent,
  36,
);
assert.deepEqual(
  fallbackPostProcessResult.fallbackCandidate.fallback.candidateOperators[0]
    .runtimeRuleIds,
  ["fixture-fallback-post-process:thorn2"],
);

const individualMeetingCatalog = {
  schemaVersion: 5,
  scope: {
    roomType: "meeting",
    product: "all",
    stationLevel: 3,
    slotCount: 2,
  },
  fallback: {
    percent: 0,
    label: "Meeting fallback",
    poolKey: "fixture-meeting-fallback",
  },
  candidates: [
    {
      id: "fixture-meeting-individual",
      variantGroupId: "fixture-meeting-individual",
      name: "Fixture meeting specialist",
      members: [{ name: "fixture-meeting-specialist" }],
      roomType: "meeting",
      product: "all",
      stationLevel: 3,
      slotCount: 2,
      tradingPercent: 0,
      manufacturePercent: 0,
      meetingPercent: 77,
      officePercent: 0,
      powerPercent: 0,
      sortScore: 0,
      selectionMode: "individual",
      calculationStatus: "calculated",
    },
  ],
};
const individualMeetingFallback = {
  schemaVersion: 1,
  pools: [
    {
      key: "fixture-meeting-fallback",
      defaultPercent: 0,
      operators: [
        {
          name: "fixture-meeting-specialist",
          rates: [{ percent: 77 }],
        },
        {
          name: "fixture-meeting-fill",
          rates: [{ percent: 25 }],
        },
      ],
    },
  ],
};
const individualMeetingResult = matchFixture({
  catalog: individualMeetingCatalog,
  fallbackCatalog: individualMeetingFallback,
  operatorNameToCharId: new Map([
    ["fixture-meeting-specialist", "fixture-meeting-specialist"],
  ]),
  ownedOperators: [
    {
      charId: "fixture-meeting-specialist",
      name: "fixture-meeting-specialist",
      elite: 0,
      level: 1,
    },
    {
      charId: "fixture-meeting-fill",
      name: "fixture-meeting-fill",
      elite: 0,
      level: 1,
    },
  ],
});
assert.equal(individualMeetingResult.candidates[0].fallback.count, 0);
assert.equal(individualMeetingResult.candidates[0].totalPercent, 177);
assert.equal(individualMeetingResult.fallbackCandidate.fallback.count, 1);
assert.equal(individualMeetingResult.fallbackCandidate.totalPercent, 100);

const compactReleaseId = "fixture-compact-v6";
const compactScope = {
  roomType: "trading",
  product: "lmd",
  stationLevel: 3,
  slotCount: 2,
};
const compactContext = createRiicRuntimePackageContext({
  manifest: {
    manifestSchemaVersion: 1,
    schemaVersion: 1,
    kind: "riic-runtime-catalog-preview",
    releaseId: compactReleaseId,
    contract: {
      id: "riic-runtime-consumer-contract",
      version: "3.0.0",
    },
    runtime: {
      candidateSchemaVersion: 6,
      fallbackSchemaVersion: 1,
    },
    outputFiles: [
      { file: "index.json", kind: "index" },
      { file: "trading/lmd/3.json", kind: "candidate" },
      { file: "trading/lmd/3.fallback.json", kind: "fallback" },
    ],
  },
  index: {
    schemaVersion: 6,
    releaseId: compactReleaseId,
    files: [
      {
        scope: {
          roomType: compactScope.roomType,
          product: compactScope.product,
          stationLevel: compactScope.stationLevel,
        },
        file: "trading/lmd/3.json",
        fallbackFile: "trading/lmd/3.fallback.json",
      },
    ],
  },
});
const compactCatalog = {
  schemaVersion: 6,
  releaseId: compactReleaseId,
  candidates: [
    {
      id: "fixture-compact-gold-equivalent",
      variantGroupId: "fixture-compact-gold-equivalent",
      name: "Fixture compact candidate",
      members: [{ name: "fixture-compact-core" }],
      efficiency: 70,
      gold: 13.45,
      sortScore: 2,
      calculationStatus: "calculated",
    },
  ],
};
const compactFallback = {
  schemaVersion: 1,
  releaseId: compactReleaseId,
  defaultPercent: 30,
  operators: [
    {
      name: "fixture-compact-fill",
      rates: [{ percent: 30 }],
    },
  ],
};
assertRiicRuntimeCandidateCatalog({
  context: compactContext,
  catalog: compactCatalog,
  expectedScope: compactScope,
  filePath: "/src/static/json/tools/riic-candidates/trading/lmd/3.json",
});
assertRiicRuntimeFallbackCatalog({
  context: compactContext,
  fallback: compactFallback,
  expectedScope: compactScope,
  filePath:
    "/src/static/json/tools/riic-candidates/trading/lmd/3.fallback.json",
});
assertRiicRuntimeRuleTargetsForCatalog({
  context: compactContext,
  catalog: compactCatalog,
});

const compactPackageIndex = readJson(`${CANDIDATE_ROOT}/index.json`);
const compactPackageMetadata = createRuntimePackageMetadata(
  compactPackageIndex,
);
const compactPackageContext = createRiicRuntimePackageContext({
  manifest: compactPackageMetadata,
  index: compactPackageIndex,
});

assert.equal(
  compactPackageContext.releaseId,
  compactPackageIndex.releaseId,
);
assert.equal(
  compactPackageContext.candidateSchemaVersion,
  compactPackageIndex.schemaVersion,
);

for (const entry of compactPackageIndex.files) {
  const catalog = readJson(`${CANDIDATE_ROOT}/${entry.file}`);
  const fallback = readJson(`${CANDIDATE_ROOT}/${entry.fallbackFile}`);
  const scope = getIndexEntryScope(entry);
  assertRiicRuntimeCandidateCatalog({
    context: compactPackageContext,
    catalog,
    expectedScope: scope,
    filePath: `/src/static/json/tools/riic-candidates/${entry.file}`,
  });
  assertRiicRuntimeFallbackCatalog({
    context: compactPackageContext,
    fallback,
    expectedScope: scope,
    filePath: `/src/static/json/tools/riic-candidates/${entry.fallbackFile}`,
  });
  assertRiicRuntimeRuleTargetsForCatalog({
    context: compactPackageContext,
    catalog,
  });
}
const compactMatch = matchRiicStaticRoomCandidates({
  catalog: {
    schemaVersion: 6,
    scope: compactScope,
    fallback: {
      percent: 30,
      label: "Fixture fallback",
      poolKey: "fixture-compact-fallback",
    },
    candidates: compactCatalog.candidates,
  },
  fallbackCatalog: {
    schemaVersion: 1,
    pools: [
      {
        key: "fixture-compact-fallback",
        defaultPercent: 30,
        operators: compactFallback.operators,
      },
    ],
  },
  operatorNameToCharId: new Map([
    ["fixture-compact-core", "fixture-compact-core"],
    ["fixture-compact-fill", "fixture-compact-fill"],
  ]),
  ownedOperators: [
    {
      charId: "fixture-compact-core",
      name: "fixture-compact-core",
      elite: 0,
      level: 1,
    },
    {
      charId: "fixture-compact-fill",
      name: "fixture-compact-fill",
      elite: 0,
      level: 1,
    },
  ],
  roomType: compactScope.roomType,
  product: compactScope.product,
  stationLevel: compactScope.stationLevel,
  slotCount: compactScope.slotCount,
});
const compactCandidate = compactMatch.candidates.find(
  (candidate) => candidate.key === "fixture-compact-gold-equivalent",
);
assert.ok(compactCandidate);
const compactContribution =
  getRiicRuntimeCandidateContributionBreakdown(compactCandidate);
assert.equal(compactContribution.directByFacility.trading, 100);
assert.equal(compactContribution.additionalByFacility.manufacture, 13.45);
assert.equal(compactContribution.totalContributionPercent, 113.45);
assert.equal(compactContribution.rankingValue, 115.45);

console.log("RIIC static room candidate matcher checks passed.");
