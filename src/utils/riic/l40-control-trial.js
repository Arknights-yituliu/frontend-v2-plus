import { getRiicLayer3ControlCenterEffects } from "./l30-rules.js";
import { isRiicIdealTrainingEnabledForOperator } from "./l00-training-policy.js";

const FACILITY_WEIGHT_BY_ROOM_TYPE = Object.freeze({
  manufacture: 1,
  trading: 1,
  meeting: 8,
  hire: 8,
});
const CONTROL_CENTER_FUNCTION_TAGS = new Set([
  "trading-station",
  "trading-operator",
  "manufacture-station",
  "manufacture-operator",
  "office",
]);
const ROOM_LABEL_BY_TYPE = Object.freeze({
  manufacture: "制造站",
  trading: "贸易站",
  meeting: "会客室",
  hire: "办公室",
});
const PRODUCT_LABEL_BY_ID = Object.freeze({
  lmd: "龙门币",
  gold: "赤金",
  experience: "经验书",
});
const FLAMETAIL_OPERATOR_ID = "char_420_flamtl";
const VIVIANA_OPERATOR_ID = "char_4098_vvana";
const GRAVEL_OPERATOR_ID = "char_237_gravel";
const DELPHINE_OPERATOR_ID = "char_4110_delphn";
const SIEGE_OPERATOR_ID = "char_112_siege";
const MORGAN_OPERATOR_ID = "char_154_morgan";
const TOMORI_OPERATOR_ID = "char_4186_tmoris";
const VIGIL_OPERATOR_ID = "char_427_vigil";
const DEMETR_OPERATOR_ID = "char_4037_demetr";
const HOSHIGUMA_OPERATOR_ID = "char_1044_hsgma2";
const SWIRE_OPERATOR_ID = "char_308_swire";

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function getRosterById(ownedOperators) {
  const rosterById = new Map();

  for (const operator of ownedOperators || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const current = rosterById.get(charId);
    if (
      !current ||
      toNonNegativeInteger(operator?.elite) >
        toNonNegativeInteger(current?.elite) ||
      (toNonNegativeInteger(operator?.elite) ===
        toNonNegativeInteger(current?.elite) &&
        toNonNegativeInteger(operator?.level, 1) >
          toNonNegativeInteger(current?.level, 1))
    ) {
      rosterById.set(charId, operator);
    }
  }

  return rosterById;
}

function isSkillUnlocked(operator, skill) {
  const operatorElite = toNonNegativeInteger(operator?.elite);
  const requiredElite = toNonNegativeInteger(skill?.elite);
  if (operatorElite !== requiredElite) {
    return operatorElite > requiredElite;
  }

  return (
    toNonNegativeInteger(operator?.level, 1) >=
    toNonNegativeInteger(skill?.level, 1)
  );
}

function isSkillAvailable(
  operator,
  skill,
  trainingMode,
  idealTrainingRaritySelection,
) {
  return (
    (trainingMode === "ideal" &&
      isRiicIdealTrainingEnabledForOperator(
        operator,
        idealTrainingRaritySelection,
      )) ||
    isSkillUnlocked(operator, skill)
  );
}

function getEffectRequiredControlOperatorIds(effect) {
  return [
    ...new Set(
      (effect?.conditions?.controlCoassignedOperatorIds || [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function isSupportedTrialEffect(effect) {
  const target = effect?.target || {};
  return Boolean(
    String(target?.scope || "").trim() === "allRooms" &&
      Object.prototype.hasOwnProperty.call(
        FACILITY_WEIGHT_BY_ROOM_TYPE,
        String(target?.roomType || "").trim(),
      ) &&
      Number.isFinite(Number(effect?.bonusPercent)),
  );
}

function isDeferredTrialEffect(effect) {
  const target = effect?.target || {};
  return Boolean(
    String(target?.scope || "").trim() === "operators" &&
      ["manufacture", "trading", "meeting", "hire"].includes(
        String(target?.roomType || "").trim(),
      ) &&
      Number.isFinite(Number(effect?.bonusPercent)),
  );
}

function getEffectKey(effect) {
  const target = effect?.target || {};
  return [
    String(target?.scope || "").trim(),
    String(target?.roomType || "").trim(),
    String(target?.product || "").trim(),
    (target?.operatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean)
      .sort()
      .join(","),
    String(effect?.metric || "").trim(),
    Number(effect?.bonusPercent),
    getEffectRequiredControlOperatorIds(effect).join(","),
  ].join("|");
}

function getScenarioEffects({
  sourceOperatorId,
  skills,
  rosterById,
  ownedOperators,
  layoutFacts,
  trainingMode,
  idealTrainingRaritySelection,
}) {
  const sourceOperator = rosterById.get(sourceOperatorId);
  if (!sourceOperator) {
    return [];
  }

  const effectsByKey = new Map();
  const collect = (effect) => {
    if (!isSupportedTrialEffect(effect) && !isDeferredTrialEffect(effect)) {
      return;
    }

    if (
      getEffectRequiredControlOperatorIds(effect).some(
        (operatorId) => !rosterById.has(operatorId),
      )
    ) {
      return;
    }

    effectsByKey.set(getEffectKey(effect), effect);
  };

  for (const skill of skills || []) {
    if (
      String(skill?.operatorId || "").trim() !== sourceOperatorId ||
      !isSkillAvailable(
        sourceOperator,
        skill,
        trainingMode,
        idealTrainingRaritySelection,
      )
    ) {
      continue;
    }

    for (const effect of skill?.resolvedEffects || []) {
      collect(effect);
    }
  }

  for (const effect of getRiicLayer3ControlCenterEffects({
    operatorId: sourceOperatorId,
    ownedOperators,
    layoutFacts,
  })) {
    collect(effect);
  }

  return [...effectsByKey.values()];
}

function hasActiveFunctionTag(
  sourceOperatorId,
  skills,
  sourceOperator,
  trainingMode,
  idealTrainingRaritySelection,
) {
  return (skills || []).some(
    (skill) =>
      String(skill?.operatorId || "").trim() === sourceOperatorId &&
      isSkillAvailable(
        sourceOperator,
        skill,
        trainingMode,
        idealTrainingRaritySelection,
      ) &&
      (skill?.bufftag || []).some((tag) =>
        CONTROL_CENTER_FUNCTION_TAGS.has(tag),
      ),
  );
}

function getScenarioDefinitions({
  skills,
  ownedOperators,
  layoutFacts,
  trainingMode,
  idealTrainingRaritySelection,
}) {
  const rosterById = getRosterById(ownedOperators);
  const scenarios = [
    {
      id: "baseline",
      label: "普通中枢",
      controlOperatorIds: [],
      effects: [],
    },
  ];

  for (const [operatorId, operator] of rosterById.entries()) {
    if (
      !hasActiveFunctionTag(
        operatorId,
        skills,
        operator,
        trainingMode,
        idealTrainingRaritySelection,
      )
    ) {
      continue;
    }

    const effects = getScenarioEffects({
      sourceOperatorId: operatorId,
      skills,
      rosterById,
      ownedOperators,
      layoutFacts,
      trainingMode,
      idealTrainingRaritySelection,
    });
    if (effects.length === 0) {
      continue;
    }

    const requiredControlOperatorIds = [
      ...new Set(
        effects.flatMap((effect) =>
          getEffectRequiredControlOperatorIds(effect),
        ),
      ),
    ];
    const controlOperatorIds = [operatorId, ...requiredControlOperatorIds];
    const operatorNames = controlOperatorIds.map(
      (charId) => rosterById.get(charId)?.name || charId,
    );

    scenarios.push({
      id: `control:${controlOperatorIds.join("+")}`,
      label: operatorNames.join(" + "),
      sourceOperatorId: operatorId,
      controlOperatorIds,
      effects,
    });
  }

  return scenarios.filter(
    (scenario, index, list) =>
      list.findIndex((item) => item.id === scenario.id) === index,
  );
}

function getEffectFacilityCount(effect, layoutFacts) {
  const target = effect?.target || {};
  const targetRoomType = String(target?.roomType || "").trim();
  const targetProduct = String(target?.product || "").trim();

  return (Array.isArray(layoutFacts?.facilities) ? layoutFacts.facilities : [])
    .filter(
      (facility) =>
        String(facility?.facilityType || "").trim() === targetRoomType &&
        (!targetProduct ||
          targetProduct === "all" ||
          String(facility?.product || "").trim() === targetProduct),
    )
    .length;
}

function formatEffectLabel(effect) {
  const target = effect?.target || {};
  const roomType = String(target?.roomType || "").trim();
  const product = String(target?.product || "").trim();
  const roomLabel = ROOM_LABEL_BY_TYPE[roomType] || roomType;
  const productLabel =
    product && product !== "all"
      ? product === "orundum"
        ? roomType === "trading"
          ? "合成玉"
          : "源石碎片"
        : PRODUCT_LABEL_BY_ID[product] || product
      : "";
  const bonusPercent = Number(effect?.bonusPercent);

  if (!roomLabel || !Number.isFinite(bonusPercent)) {
    return "";
  }

  return `${roomLabel}${productLabel ? `/${productLabel}` : ""} ${
    bonusPercent >= 0 ? "+" : ""
  }${bonusPercent}%`;
}

function createTrialEntry(effect, layoutFacts) {
  const target = effect?.target || {};
  const roomType = String(target?.roomType || "").trim();
  const bonusPercent = Number(effect?.bonusPercent);
  const facilityCount = getEffectFacilityCount(effect, layoutFacts);
  const roomWeight = Number(FACILITY_WEIGHT_BY_ROOM_TYPE[roomType] || 0);

  return {
    effectLabel: formatEffectLabel(effect),
    bonusPercent,
    facilityCount,
    roomWeight,
    score: bonusPercent * facilityCount * roomWeight,
  };
}

function getRedPineKnightOperatorIds(skills) {
  const flametailSkill = (skills || []).find((skill) =>
    String(skill?.operatorId || "").trim() === FLAMETAIL_OPERATOR_ID &&
    (skill?.resolvedEffects || []).some((effect) => {
      const target = effect?.target || {};
      return (
        String(target?.scope || "").trim() === "operators" &&
        String(target?.roomType || "").trim() === "manufacture" &&
        String(target?.product || "").trim() === "experience" &&
        Number(effect?.bonusPercent) === 10
      );
    }),
  );
  const redPineEffect = (flametailSkill?.resolvedEffects || []).find(
    (effect) => {
      const target = effect?.target || {};
      return (
        String(target?.scope || "").trim() === "operators" &&
        String(target?.roomType || "").trim() === "manufacture" &&
        String(target?.product || "").trim() === "experience" &&
        Number(effect?.bonusPercent) === 10
      );
    },
  );

  return [
    ...new Set(
      (redPineEffect?.target?.operatorIds || [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function createRosterTrialEntry({ sourceOperatorId, rosterById, skills }) {
  const redPineKnightCount = getRedPineKnightOperatorIds(skills).filter(
    (operatorId) => rosterById.has(operatorId),
  ).length;

  if (sourceOperatorId === FLAMETAIL_OPERATOR_ID) {
    return {
      kind: "roster",
      effectLabel: "红松骑士持有试算",
      baseScore: -15,
      terms: [
        {
          label: "红松骑士",
          count: redPineKnightCount,
          scorePerOperator: 10,
        },
      ],
      score: -15 + redPineKnightCount * 10,
    };
  }

  if (sourceOperatorId === VIVIANA_OPERATOR_ID) {
    const flametailVivianaPairCount =
      Number(rosterById.has(FLAMETAIL_OPERATOR_ID)) +
      Number(rosterById.has(VIVIANA_OPERATOR_ID));
    const redPineKnightScorePerOperator =
      flametailVivianaPairCount === 2 ? 10 : 7;
    const gravelCount = rosterById.has(GRAVEL_OPERATOR_ID) ? 1 : 0;
    return {
      kind: "roster",
      effectLabel: "红松骑士、焰尾与砾持有试算",
      baseScore: -14,
      terms: [
        {
          label:
            flametailVivianaPairCount === 2
              ? "红松骑士（焰尾与薇薇安娜同时持有）"
              : "红松骑士",
          count: redPineKnightCount,
          scorePerOperator: redPineKnightScorePerOperator,
        },
        {
          label: "砾",
          count: gravelCount,
          scorePerOperator: 7,
        },
      ],
      score:
        -14 +
        redPineKnightCount * redPineKnightScorePerOperator +
        gravelCount * 7,
    };
  }

  if (sourceOperatorId === DELPHINE_OPERATOR_ID) {
    const glasgowPairCount =
      Number(rosterById.has(SIEGE_OPERATOR_ID)) +
      Number(rosterById.has(MORGAN_OPERATOR_ID));
    return {
      kind: "roster",
      effectLabel: "格拉斯哥帮持有试算",
      baseScore: 0,
      terms: [
        {
          label: "推进之王 + 摩根",
          count: glasgowPairCount === 2 ? 1 : 0,
          scorePerOperator: 20,
        },
      ],
      score: glasgowPairCount === 2 ? 20 : 0,
    };
  }

  if (sourceOperatorId === TOMORI_OPERATOR_ID) {
    const vigilBellonePairCount =
      Number(rosterById.has(VIGIL_OPERATOR_ID)) +
      Number(rosterById.has(DEMETR_OPERATOR_ID));
    return {
      kind: "roster",
      effectLabel: "伺夜与贝洛内持有试算",
      baseScore: 0,
      terms: [
        {
          label: "伺夜 + 贝洛内",
          count: vigilBellonePairCount === 2 ? 1 : 0,
          scorePerOperator: 10,
        },
      ],
      score: vigilBellonePairCount === 2 ? 10 : 0,
    };
  }

  if (
    [HOSHIGUMA_OPERATOR_ID, SWIRE_OPERATOR_ID].includes(sourceOperatorId)
  ) {
    const hoshigumaSwirePairCount =
      Number(rosterById.has(HOSHIGUMA_OPERATOR_ID)) +
      Number(rosterById.has(SWIRE_OPERATOR_ID));
    return {
      kind: "roster",
      effectLabel: "斩业星熊与诗怀雅持有试算",
      baseScore: 0,
      terms: [
        {
          label: "斩业星熊 + 诗怀雅",
          count: hoshigumaSwirePairCount === 2 ? 1 : 0,
          scorePerOperator: 5,
        },
      ],
      score: hoshigumaSwirePairCount === 2 ? 5 : 0,
    };
  }

  return null;
}

function evaluateScenario(scenario, layoutFacts, rosterById, skills) {
  const entries = scenario.effects
    .filter(isSupportedTrialEffect)
    .map((effect) => createTrialEntry(effect, layoutFacts));
  const rosterEntry = createRosterTrialEntry({
    sourceOperatorId: scenario.sourceOperatorId,
    rosterById,
    skills,
  });
  if (rosterEntry) {
    entries.push(rosterEntry);
  }
  const deferredEffectLabels = scenario.effects
    .filter(isDeferredTrialEffect)
    .map(formatEffectLabel)
    .filter(Boolean);

  return {
    contributionScore: entries.reduce((total, entry) => total + entry.score, 0),
    entries,
    deferredEffectLabels,
  };
}

export function evaluateRiicControlCenterScenarios({
  skills,
  ownedOperators,
  layoutFacts,
  trainingMode = "current",
  idealTrainingRaritySelection,
}) {
  const scenarios = getScenarioDefinitions({
    skills,
    ownedOperators,
    layoutFacts,
    trainingMode,
    idealTrainingRaritySelection,
  });
  const rosterById = getRosterById(ownedOperators);

  return scenarios
    .map((scenario) => ({
      ...scenario,
      ...evaluateScenario(scenario, layoutFacts, rosterById, skills),
    }))
    .sort(
      (left, right) =>
        right.contributionScore - left.contributionScore ||
        left.label.localeCompare(right.label, "zh-CN"),
    )
    .map((scenario) => ({
      ...scenario,
      deltaScore: scenario.contributionScore,
    }));
}
