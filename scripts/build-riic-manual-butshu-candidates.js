import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PATH =
  "src/static/json/tools/riic_manual_room_candidates.json";

const ORDER_SECONDS = [8640, 12600, 16560];
const ORDER_DISTRIBUTIONS = Object.freeze({
  default: [0.3, 0.5, 0.2],
  alpha: [0.15, 0.3, 0.55],
  alphaPair: [0.13, 0.22, 0.65],
  beta: [0.05, 0.1, 0.85],
});
const STATION_LEVEL_DEFAULT_ORDER_DISTRIBUTIONS = Object.freeze({
  1: [1, 0, 0],
  2: [0.6, 0.4, 0],
  3: ORDER_DISTRIBUTIONS.default,
});
const BUTSHU_PAYOUTS = Object.freeze({
  "0:false": [1500, 2000, 2000],
  "0:true": [1500, 2000, 2500],
  "2:false": [2000, 2500, 2000],
  "2:true": [2000, 2500, 2500],
});
const DEFAULT_ORDER_PAYOUTS = [1000, 1500, 2000];
const TEQUILA_ORDER_PAYOUTS = [1000, 1500, 2500];

const BUTSHU_NAME = "但书";
const SHAMARE_NAME = "巫恋";
const TEQUILA_NAME = "龙舌兰";
const GENERATED_ID_PREFIX = "manual-trading-lmd-butshu-tailor-";
const GENERATED_SOLO_ID_PREFIX = "manual-trading-lmd-butshu-solo-";
const GENERATED_ID_PREFIXES = [
  GENERATED_ID_PREFIX,
  GENERATED_SOLO_ID_PREFIX,
];

const TAILOR_STATES = Object.freeze([
  {
    key: "bibeak-alpha",
    state: "alpha",
    name: "柏喙",
    member: { name: "柏喙", maxElite: 0 },
  },
  {
    key: "kafka-alpha",
    state: "alpha",
    name: "卡夫卡",
    member: { name: "卡夫卡", maxElite: 0 },
  },
  {
    key: "paprika-alpha",
    state: "alpha",
    name: "明椒",
    member: { name: "明椒", maxElite: 0 },
  },
  {
    key: "kaitou-alpha",
    state: "alpha",
    name: "折光",
    member: { name: "折光", maxElite: 0 },
  },
  {
    key: "mitm-alpha",
    state: "alpha",
    name: "渡桥",
    member: { name: "渡桥", maxElite: 0 },
  },
  {
    key: "bena-alpha",
    state: "alpha",
    name: "贝娜",
    member: { name: "贝娜", elite: 2 },
  },
  {
    key: "bibeak-beta",
    state: "beta",
    name: "柏喙",
    member: { name: "柏喙", elite: 2 },
  },
  {
    key: "kafka-beta",
    state: "beta",
    name: "卡夫卡",
    member: { name: "卡夫卡", elite: 2 },
  },
  {
    key: "paprika-beta",
    state: "beta",
    name: "明椒",
    member: { name: "明椒", elite: 2 },
  },
  {
    key: "kaitou-beta",
    state: "beta",
    name: "折光",
    member: { name: "折光", elite: 2 },
  },
]);

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(absolute(relativePath), "utf8"));
}

async function writeJson(relativePath, value) {
  await fs.writeFile(
    absolute(relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function roundPercent(value) {
  return Number(value.toFixed(2));
}

function expectedRate(distribution, payouts) {
  const expectedSeconds = distribution.reduce(
    (total, probability, index) =>
      total + probability * ORDER_SECONDS[index],
    0,
  );
  const expectedPayout = distribution.reduce(
    (total, probability, index) => total + probability * payouts[index],
    0,
  );
  return expectedPayout / expectedSeconds;
}

function getOrderDistribution(distribution, stationLevel = 3) {
  if (distribution === "default") {
    const levelDistribution =
      STATION_LEVEL_DEFAULT_ORDER_DISTRIBUTIONS[stationLevel];
    if (levelDistribution) {
      return levelDistribution;
    }
  }

  if (stationLevel !== 3) {
    throw new Error(
      `Unsupported station-level order distribution: ${distribution}:${stationLevel}`,
    );
  }

  return ORDER_DISTRIBUTIONS[distribution];
}

function getButshuMultiplier({
  elite,
  tequila,
  distribution,
  stationLevel = 3,
}) {
  const payouts = BUTSHU_PAYOUTS[`${elite}:${tequila}`];
  const probabilities = getOrderDistribution(distribution, stationLevel);
  const referenceProbabilities = getOrderDistribution(
    "default",
    stationLevel,
  );
  if (!payouts || !probabilities) {
    throw new Error(
      `Unsupported butshu calculation: ${elite}:${tequila}:${distribution}:${stationLevel}`,
    );
  }

  return (
    expectedRate(probabilities, payouts) /
    expectedRate(referenceProbabilities, DEFAULT_ORDER_PAYOUTS)
  );
}

function calculateTradingPercent({ rawOrderEfficiency, multiplier }) {
  return roundPercent(
    ((1 + Number(rawOrderEfficiency) / 100) * multiplier - 1) * 100,
  );
}

function calculateTradingPercentByOrders({
  rawOrderEfficiency,
  distribution,
  payouts,
  stationLevel = 3,
}) {
  const probabilities = getOrderDistribution(distribution, stationLevel);
  const referenceProbabilities = getOrderDistribution(
    "default",
    stationLevel,
  );
  if (!probabilities) {
    throw new Error(`Unsupported order distribution: ${distribution}`);
  }

  return roundPercent(
    ((1 + Number(rawOrderEfficiency) / 100) *
      (expectedRate(probabilities, payouts) /
        expectedRate(referenceProbabilities, DEFAULT_ORDER_PAYOUTS)) -
      1) *
      100,
  );
}

function calculateTequilaVirtualGoldMetrics({
  rawOrderEfficiency,
  distribution,
  stationLevel = 3,
}) {
  const probabilities = getOrderDistribution(distribution, stationLevel);
  if (!probabilities) {
    throw new Error(`Unsupported tequila order distribution: ${distribution}`);
  }

  const averageOrderHours =
    probabilities.reduce(
      (total, probability, index) =>
        total + probability * ORDER_SECONDS[index],
      0,
    ) / 3600;
  const virtualGoldPerHour =
    (probabilities[2] * (1 + Number(rawOrderEfficiency) / 100)) /
    averageOrderHours;

  return {
    manufacturePercent: roundPercent(virtualGoldPerHour * 1.2 * 100),
    virtualGoldPerHour: Number(virtualGoldPerHour.toFixed(6)),
  };
}

function createHashSuffix(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 12);
}

function cloneMember(member) {
  return {
    name: member.name,
    ...(member.elite ? { elite: Number(member.elite) } : {}),
    ...(member.level && Number(member.level) > 1
      ? { level: Number(member.level) }
      : {}),
    ...(Object.hasOwn(member, "maxElite")
      ? { maxElite: Number(member.maxElite) }
      : {}),
  };
}

function getButshuMember(elite) {
  return elite === 0
    ? { name: BUTSHU_NAME, maxElite: 0 }
    : { name: BUTSHU_NAME, elite: 2 };
}

function getButshuLabel(elite) {
  return elite === 0 ? "但书 α" : "但书 β";
}

function hasMember(candidate, name) {
  return (candidate.members || []).some((member) => member.name === name);
}

function getMember(candidate, name) {
  return (candidate.members || []).find((member) => member.name === name);
}

function getButshuElite(candidate) {
  const butshu = getMember(candidate, BUTSHU_NAME);
  if (!butshu) {
    return null;
  }
  return Number(butshu.elite || 0);
}

function getButshuVariantGroup(candidate) {
  const hasShamare = hasMember(candidate, SHAMARE_NAME);
  const hasTequila = hasMember(candidate, TEQUILA_NAME);
  if (hasShamare && hasTequila) {
    return "family-butshu:shamare-tequila";
  }
  if (hasShamare) {
    return "family-butshu:shamare-plain";
  }
  if (hasTequila) {
    return "family-butshu:tequila-plain";
  }
  return "family-butshu:plain-pair";
}

function getPartnerMembers(candidate) {
  return (candidate.members || []).filter(
    (member) =>
      ![BUTSHU_NAME, SHAMARE_NAME, TEQUILA_NAME].includes(member.name),
  );
}

function getCandidateTailors(candidate) {
  return TAILOR_STATES.filter((state) => {
    const member = getMember(candidate, state.name);
    return (
      member &&
      JSON.stringify(member) === JSON.stringify(state.member)
    );
  });
}

function normalizeRawOrderEfficiency(value) {
  const nearestInteger = Math.round(value);
  return Math.abs(value - nearestInteger) < 0.01
    ? nearestInteger
    : Number(value.toFixed(2));
}

function createButshuCandidate({
  idContext,
  variantGroupId,
  elite,
  members,
  name,
  rawOrderEfficiency,
  distribution,
  tequila = false,
  stationLevel = 3,
  slotCount = stationLevel,
  idPrefix = GENERATED_ID_PREFIX,
}) {
  const identity = {
    idContext,
    elite,
    members: members.map((member) => ({
      name: member.name,
      elite: member.elite || 0,
      level: member.level || 1,
      maxElite: Object.hasOwn(member, "maxElite")
        ? member.maxElite
        : null,
    })),
  };
  const tradingPercent = calculateTradingPercent({
    rawOrderEfficiency,
    multiplier: getButshuMultiplier({
      elite,
      tequila,
      distribution,
      stationLevel,
    }),
  });
  const tequilaMetrics = tequila
    ? calculateTequilaVirtualGoldMetrics({
        rawOrderEfficiency,
        distribution,
        stationLevel,
      })
    : null;

  return {
    id: `${idPrefix}${idContext}-${createHashSuffix(identity)}`,
    variantGroupId,
    name,
    roomType: "trading",
    product: "lmd",
    stationLevel,
    slotCount,
    members: [getButshuMember(elite), ...members.map(cloneMember)],
    calculationStatus: "estimated",
    tradingPercent,
    manufacturePercent: tequilaMetrics?.manufacturePercent || 0,
    meetingPercent: 0,
    officePercent: 0,
    powerPercent: 0,
    sortScore: 0,
    ...(tequilaMetrics
      ? { virtualGoldPerHour: tequilaMetrics.virtualGoldPerHour }
      : {}),
  };
}

function getTailorDistribution({ tailors, hasShamare = false }) {
  if (tailors.some((tailor) => tailor.state === "beta")) {
    return "beta";
  }

  return hasShamare || tailors.length > 1 ? "alphaPair" : "alpha";
}

function getTailorGroupSuffix({ tailors, pair = false }) {
  const hasBeta = tailors.some((tailor) => tailor.state === "beta");
  return `tailor-${hasBeta ? "beta" : "alpha"}-${pair ? "pair" : "plain"}`;
}

function createGeneratedButshuCandidates(partners) {
  const generated = [];

  for (const elite of [0, 2]) {
    for (const tailor of TAILOR_STATES) {
      for (const partner of partners) {
        generated.push(
          createButshuCandidate({
            idContext: `${elite === 0 ? "alpha" : "beta"}-${tailor.key}-partner`,
            variantGroupId: `family-butshu:${getTailorGroupSuffix({
              tailors: [tailor],
            })}`,
            elite,
            members: [tailor.member, partner.member],
            name: `${getButshuLabel(elite)} + 裁缝 ${tailor.state === "alpha" ? "α" : "β"}（${tailor.name}） + ${partner.member.name}`,
            rawOrderEfficiency: partner.rawOrderEfficiency,
            distribution: getTailorDistribution({ tailors: [tailor] }),
          }),
        );
      }

      generated.push(
        createButshuCandidate({
          idContext: `${elite === 0 ? "alpha" : "beta"}-shamare-${tailor.key}`,
          variantGroupId: `family-butshu:shamare-tailor-${tailor.state}`,
          elite,
          members: [{ name: SHAMARE_NAME, elite: 2 }, tailor.member],
          name: `${getButshuLabel(elite)} + 巫恋 + 裁缝 ${tailor.state === "alpha" ? "α" : "β"}（${tailor.name}）`,
          rawOrderEfficiency: 90,
          distribution: getTailorDistribution({
            tailors: [tailor],
            hasShamare: true,
          }),
        }),
      );

      generated.push(
        createButshuCandidate({
          idContext: `${elite === 0 ? "alpha" : "beta"}-tequila-${tailor.key}`,
          variantGroupId: `family-butshu:tequila-tailor-${tailor.state}`,
          elite,
          members: [{ name: TEQUILA_NAME, elite: 2 }, tailor.member],
          name: `${getButshuLabel(elite)} + 龙舌兰 + 裁缝 ${tailor.state === "alpha" ? "α" : "β"}（${tailor.name}）`,
          rawOrderEfficiency: 0,
          distribution: getTailorDistribution({ tailors: [tailor] }),
          tequila: true,
        }),
      );
    }

    for (let leftIndex = 0; leftIndex < TAILOR_STATES.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < TAILOR_STATES.length;
        rightIndex += 1
      ) {
        const left = TAILOR_STATES[leftIndex];
        const right = TAILOR_STATES[rightIndex];
        if (left.name === right.name) {
          continue;
        }
        const tailors = [left, right];
        const hasBeta = tailors.some((tailor) => tailor.state === "beta");
        generated.push(
          createButshuCandidate({
            idContext: `${elite === 0 ? "alpha" : "beta"}-${left.key}-${right.key}`,
            variantGroupId: `family-butshu:${getTailorGroupSuffix({
              tailors,
              pair: true,
            })}`,
            elite,
            members: tailors.map((tailor) => tailor.member),
            name: `${getButshuLabel(elite)} + 裁缝 ${left.state === "alpha" ? "α" : "β"}（${left.name}） + 裁缝 ${right.state === "alpha" ? "α" : "β"}（${right.name}）`,
            rawOrderEfficiency: 0,
            distribution: getTailorDistribution({ tailors }),
          }),
        );
        if (!hasBeta && getTailorDistribution({ tailors }) !== "alphaPair") {
          throw new Error("Alpha tailor pairs must use the double-alpha distribution");
        }
      }
    }
  }

  return generated;
}

function createGeneratedButshuSoloCandidates() {
  return [0, 2].flatMap((elite) =>
    [1, 2, 3].map((stationLevel) => {
      const fallbackCount = stationLevel - 1;
      const fallbackLabel =
        fallbackCount > 0 ? ` + ${fallbackCount}位任意补位` : "";

      return createButshuCandidate({
        idContext: `${elite === 0 ? "alpha" : "beta"}-solo-l${stationLevel}`,
        variantGroupId: `family-butshu:solo-${elite === 0 ? "alpha" : "beta"}`,
        elite,
        members: [],
        name: `${getButshuLabel(elite)}${fallbackLabel}`,
        rawOrderEfficiency: 0,
        distribution: "default",
        stationLevel,
        slotCount: stationLevel,
        idPrefix: GENERATED_SOLO_ID_PREFIX,
      });
    }),
  );
}

function getPartnerSourceCandidates(candidates) {
  return candidates.filter(
    (candidate) =>
      getButshuElite(candidate) === 0 &&
      hasMember(candidate, TEQUILA_NAME) &&
      !hasMember(candidate, SHAMARE_NAME) &&
      getPartnerMembers(candidate).length === 1,
  );
}

function getPartners(candidates) {
  const sourceCandidates = getPartnerSourceCandidates(candidates);
  if (sourceCandidates.length !== 36) {
    throw new Error(
      `Expected 36 butshu + tequila partner candidates, found ${sourceCandidates.length}`,
    );
  }

  const multiplier = getButshuMultiplier({
    elite: 0,
    tequila: true,
    distribution: "default",
  });
  const partners = sourceCandidates.map((candidate) => {
    const member = getPartnerMembers(candidate)[0];
    const rawOrderEfficiency = normalizeRawOrderEfficiency(
      ((1 + Number(candidate.tradingPercent) / 100) / multiplier - 1) * 100,
    );
    return {
      member: cloneMember(member),
      rawOrderEfficiency,
    };
  });

  const names = new Set(partners.map((partner) => partner.member.name));
  if (names.size !== partners.length) {
    throw new Error("Butshu partner source candidates contain duplicate names");
  }
  return partners.sort((left, right) =>
    left.member.name.localeCompare(right.member.name, "zh-CN"),
  );
}

function updateExistingButshuCandidates(candidates) {
  for (const candidate of candidates) {
    if (!hasMember(candidate, BUTSHU_NAME)) {
      continue;
    }

    candidate.variantGroupId = getButshuVariantGroup(candidate);
    const elite = getButshuElite(candidate);
    const hasShamare = hasMember(candidate, SHAMARE_NAME);
    const hasTequila = hasMember(candidate, TEQUILA_NAME);
    const tailors = getCandidateTailors(candidate);
    if (!hasShamare || elite === null) {
      continue;
    }

    candidate.tradingPercent = calculateTradingPercent({
      rawOrderEfficiency: 90,
      multiplier: getButshuMultiplier({
        elite,
        tequila: hasTequila,
        distribution:
          tailors.length > 0
            ? getTailorDistribution({
                tailors,
                hasShamare: true,
              })
            : "default",
      }),
    });
  }
}

function updateShamareTequilaTailorCandidates(candidates) {
  for (const candidate of candidates) {
    if (candidate.variantGroupId !== "family-shamare-tequila-tailor") {
      continue;
    }

    const tailor = TAILOR_STATES.find(
      (state) =>
        hasMember(candidate, state.name) &&
        JSON.stringify(getMember(candidate, state.name)) ===
          JSON.stringify(state.member),
    );
    if (!tailor) {
      throw new Error(
        `Unable to classify shamare + tequila tailor candidate: ${candidate.id}`,
      );
    }

    candidate.tradingPercent = calculateTradingPercentByOrders({
      rawOrderEfficiency: 90,
      distribution: tailor.state === "alpha" ? "alphaPair" : "beta",
      payouts: TEQUILA_ORDER_PAYOUTS,
    });
  }
}

function updateTequilaVirtualMetrics(candidates, partnersByName) {
  for (const candidate of candidates) {
    if (!hasMember(candidate, TEQUILA_NAME)) {
      continue;
    }

    const elite = getButshuElite(candidate);
    let rawOrderEfficiency;
    let distribution;

    if (elite !== null) {
      if (hasMember(candidate, SHAMARE_NAME)) {
        rawOrderEfficiency = 90;
        const tailors = getCandidateTailors(candidate);
        distribution =
          tailors.length > 0
            ? getTailorDistribution({
                tailors,
                hasShamare: true,
              })
            : "default";
      } else {
        const tailors = getCandidateTailors(candidate);
        if (tailors.length > 0) {
          rawOrderEfficiency = 0;
          distribution = getTailorDistribution({ tailors });
        } else {
          const partners = getPartnerMembers(candidate);
          if (partners.length !== 1) {
            throw new Error(
              `Unable to classify butshu + tequila candidate: ${candidate.id}`,
            );
          }

          rawOrderEfficiency = partnersByName.get(partners[0].name);
          distribution = "default";
          if (!Number.isFinite(rawOrderEfficiency)) {
            throw new Error(
              `Missing butshu + tequila partner efficiency: ${partners[0].name}`,
            );
          }
        }
      }
    } else {
      const tailors = getCandidateTailors(candidate);
      if (!hasMember(candidate, SHAMARE_NAME) || tailors.length !== 1) {
        throw new Error(
          `Unable to classify shamare + tequila candidate: ${candidate.id}`,
        );
      }

      rawOrderEfficiency = 90;
      distribution =
        tailors[0].state === "alpha" ? "alphaPair" : "beta";
    }

    Object.assign(
      candidate,
      calculateTequilaVirtualGoldMetrics({
        rawOrderEfficiency,
        distribution,
      }),
    );
  }
}

const data = await readJson(SOURCE_PATH);
if (Number(data?.schemaVersion) !== 2 || !Array.isArray(data?.candidates)) {
  throw new Error("Invalid manual RIIC room candidate source");
}

const existingCandidates = data.candidates.filter(
  (candidate) =>
    !GENERATED_ID_PREFIXES.some((prefix) =>
      String(candidate?.id || "").startsWith(prefix),
    ),
);
const existingButshuCount = existingCandidates.filter((candidate) =>
  hasMember(candidate, BUTSHU_NAME),
).length;
if (existingButshuCount !== 1252) {
  throw new Error(
    `Expected 1252 pre-generated butshu candidates, found ${existingButshuCount}`,
  );
}

const partners = getPartners(existingCandidates);
updateExistingButshuCandidates(existingCandidates);
updateShamareTequilaTailorCandidates(existingCandidates);
updateTequilaVirtualMetrics(
  existingCandidates,
  new Map(
    partners.map((partner) => [
      partner.member.name,
      partner.rawOrderEfficiency,
    ]),
  ),
);

const generatedCandidates = [
  ...createGeneratedButshuCandidates(partners),
  ...createGeneratedButshuSoloCandidates(),
];
if (generatedCandidates.length !== 848) {
  throw new Error(
    `Expected 848 generated butshu candidates, found ${generatedCandidates.length}`,
  );
}

await writeJson(SOURCE_PATH, {
  ...data,
  candidates: [...existingCandidates, ...generatedCandidates],
});

console.log(
  `Updated ${existingButshuCount} butshu candidates and generated ${generatedCandidates.length} butshu candidates.`,
);
