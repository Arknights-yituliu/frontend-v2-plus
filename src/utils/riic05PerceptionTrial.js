const OPERATOR = Object.freeze({
  rosmontis: {
    id: "char_391_rosmon",
    name: "迷迭香",
  },
  ebenholz: {
    id: "char_4046_ebnhlz",
    name: "黑键",
  },
  whisperain: {
    id: "char_436_whispr",
    name: "絮雨",
  },
  bassline: {
    id: "char_4109_baslin",
    name: "深律",
  },
  dusk: {
    id: "char_2015_dusk",
    name: "夕",
  },
  ling: {
    id: "char_2023_ling",
    name: "令",
  },
});

const DORMITORY_CAPACITY_PER_ROOM = 5;
const PERCEPTION_PER_EXTRA_RECRUITMENT_SLOT = 10;
const SILENT_RESONANCE_PER_EXTRA_RECRUITMENT_SLOT = 15;

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

function getOperatorElite(rosterById, operatorId) {
  const operator = rosterById.get(operatorId);
  return operator ? toNonNegativeInteger(operator?.elite) : null;
}

function hasOperatorAtElite(rosterById, operatorId, eliteAtLeast) {
  const elite = getOperatorElite(rosterById, operatorId);
  return elite !== null && elite >= eliteAtLeast;
}

function getFacilityCount(layoutFacts, facilityType) {
  return (layoutFacts?.facilities || []).filter(
    (facility) =>
      String(facility?.facilityType || "").trim() === facilityType,
  ).length;
}

function getOfficeExtraRecruitmentSlots(layoutFacts) {
  const officeLevel = Math.max(
    0,
    ...(layoutFacts?.facilities || [])
      .filter(
        (facility) =>
          String(facility?.facilityType || "").trim() === "hire",
      )
      .map((facility) => toNonNegativeInteger(facility?.stationLevel)),
  );

  return Math.min(3, officeLevel);
}

function getControlConditionalSources(controlState, rosterById) {
  const activeOperatorIds = new Set(
    (controlState?.segments || []).flatMap((segment) =>
      (segment?.operatorIds || [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    ),
  );
  const sources = [];

  if (
    activeOperatorIds.has(OPERATOR.dusk.id) &&
    hasOperatorAtElite(rosterById, OPERATOR.dusk.id, 0)
  ) {
    sources.push({
      operatorId: OPERATOR.dusk.id,
      operatorName: OPERATOR.dusk.name,
      bonusPercent: 10,
      condition: "夕心情大于 12",
    });
  }
  if (
    activeOperatorIds.has(OPERATOR.ling.id) &&
    hasOperatorAtElite(rosterById, OPERATOR.ling.id, 2)
  ) {
    sources.push({
      operatorId: OPERATOR.ling.id,
      operatorName: OPERATOR.ling.name,
      bonusPercent: 10,
      condition: "令心情低于 12",
    });
  }

  return sources;
}

function getCoreOperatorResult(rosterById, operator) {
  const elite = getOperatorElite(rosterById, operator.id);
  if (elite === null) {
    return null;
  }

  return {
    ...operator,
    elite,
  };
}

function createOfficePlans(rosterById, officeExtraRecruitmentSlots) {
  const plans = [
    {
      id: "office-none",
      label: "不占用办公室资源位",
      supportOperatorIds: [],
      perceptionBonus: 0,
      silentResonanceBonus: 0,
      source: null,
    },
  ];

  if (hasOperatorAtElite(rosterById, OPERATOR.whisperain.id, 2)) {
    plans.push({
      id: "office-whisperain",
      label: "絮雨进办公室",
      supportOperatorIds: [OPERATOR.whisperain.id],
      perceptionBonus:
        officeExtraRecruitmentSlots *
        PERCEPTION_PER_EXTRA_RECRUITMENT_SLOT,
      silentResonanceBonus: 0,
      source: {
        operatorId: OPERATOR.whisperain.id,
        operatorName: OPERATOR.whisperain.name,
        resource: "感知信息",
        valuePerSlot: PERCEPTION_PER_EXTRA_RECRUITMENT_SLOT,
      },
    });
  }

  if (hasOperatorAtElite(rosterById, OPERATOR.bassline.id, 2)) {
    plans.push({
      id: "office-bassline",
      label: "深律进办公室",
      supportOperatorIds: [OPERATOR.bassline.id],
      perceptionBonus: 0,
      silentResonanceBonus:
        officeExtraRecruitmentSlots *
        SILENT_RESONANCE_PER_EXTRA_RECRUITMENT_SLOT,
      source: {
        operatorId: OPERATOR.bassline.id,
        operatorName: OPERATOR.bassline.name,
        resource: "无声共鸣",
        valuePerSlot: SILENT_RESONANCE_PER_EXTRA_RECRUITMENT_SLOT,
      },
    });
  }

  return plans;
}

function calculateRosmontisBonus(perceptionInformation, elite) {
  return elite >= 2
    ? perceptionInformation
    : Math.floor(perceptionInformation / 2);
}

function calculateEbenholzBonus(silentResonance, elite) {
  return elite >= 2
    ? Math.floor(silentResonance / 2)
    : Math.floor(silentResonance / 4);
}

function createResourceSource({
  label,
  resource,
  value,
  formula,
  requiredOperatorId = "",
}) {
  return {
    label,
    resource,
    value,
    formula,
    requiredOperatorId,
  };
}

function createPlan({
  scenario,
  officePlan,
  dormitoryOccupantCount,
  rosterById,
}) {
  const perceptionSources = [];

  if (scenario.rosmontis) {
    perceptionSources.push(
      createResourceSource({
        label: "迷迭香进驻制造站",
        resource: "感知信息",
        value: dormitoryOccupantCount,
        formula: `${dormitoryOccupantCount} 名宿舍干员 x 1`,
        requiredOperatorId: OPERATOR.rosmontis.id,
      }),
    );
  }
  if (scenario.ebenholz) {
    perceptionSources.push(
      createResourceSource({
        label: "黑键进驻贸易站",
        resource: "感知信息",
        value: dormitoryOccupantCount,
        formula: `${dormitoryOccupantCount} 名宿舍干员 x 1`,
        requiredOperatorId: OPERATOR.ebenholz.id,
      }),
    );
  }
  if (officePlan.perceptionBonus > 0) {
    perceptionSources.push(
      createResourceSource({
        label: `${officePlan.source.operatorName}进驻办公室`,
        resource: "感知信息",
        value: officePlan.perceptionBonus,
        formula: `${officePlan.source.valuePerSlot} x ${officePlan.extraRecruitmentSlots} 个额外招募位`,
        requiredOperatorId: officePlan.source.operatorId,
      }),
    );
  }

  const perceptionInformation = perceptionSources.reduce(
    (total, source) => total + source.value,
    0,
  );
  const silentResonanceSources = [];
  if (scenario.ebenholz) {
    silentResonanceSources.push(
      createResourceSource({
        label: "感知信息转换",
        resource: "无声共鸣",
        value: perceptionInformation,
        formula: `${perceptionInformation} 点感知信息 x 1`,
        requiredOperatorId: OPERATOR.ebenholz.id,
      }),
    );
  }
  if (officePlan.silentResonanceBonus > 0) {
    silentResonanceSources.push(
      createResourceSource({
        label: `${officePlan.source.operatorName}进驻办公室`,
        resource: "无声共鸣",
        value: officePlan.silentResonanceBonus,
        formula: `${officePlan.source.valuePerSlot} x ${officePlan.extraRecruitmentSlots} 个额外招募位`,
        requiredOperatorId: officePlan.source.operatorId,
      }),
    );
  }
  const silentResonance = silentResonanceSources.reduce(
    (total, source) => total + source.value,
    0,
  );

  const results = [];
  if (scenario.rosmontis) {
    const rosmontis = getCoreOperatorResult(rosterById, OPERATOR.rosmontis);
    results.push({
      operatorId: rosmontis.id,
      operatorName: rosmontis.name,
      roomType: "manufacture",
      resource: "思维链环",
      resourceValue: perceptionInformation,
      bonusPercent: calculateRosmontisBonus(
        perceptionInformation,
        rosmontis.elite,
      ),
      formula:
        rosmontis.elite >= 2
          ? `${perceptionInformation} 点思维链环 x 1%`
          : `floor(${perceptionInformation} / 2) x 1%`,
    });
  }
  if (scenario.ebenholz) {
    const ebenholz = getCoreOperatorResult(rosterById, OPERATOR.ebenholz);
    results.push({
      operatorId: ebenholz.id,
      operatorName: ebenholz.name,
      roomType: "trading",
      resource: "无声共鸣",
      resourceValue: silentResonance,
      bonusPercent: calculateEbenholzBonus(silentResonance, ebenholz.elite),
      formula:
        ebenholz.elite >= 2
          ? `floor(${silentResonance} / 2) x 1%`
          : `floor(${silentResonance} / 4) x 1%`,
    });
  }

  return {
    id: `${scenario.id}:${officePlan.id}`,
    label: officePlan.label,
    requiredOperatorIds: [
      ...scenario.requiredOperatorIds,
      ...officePlan.supportOperatorIds,
    ],
    perceptionSources,
    perceptionInformation,
    silentResonanceSources,
    silentResonance,
    results,
    contributionScore: results.reduce(
      (total, result) => total + result.bonusPercent,
      0,
    ),
  };
}

function createScenario({ id, label, rosmontis, ebenholz }, rosterById) {
  const requiredOperatorIds = [
    rosmontis ? OPERATOR.rosmontis.id : "",
    ebenholz ? OPERATOR.ebenholz.id : "",
  ].filter(Boolean);

  if (
    (rosmontis && !getCoreOperatorResult(rosterById, OPERATOR.rosmontis)) ||
    (ebenholz && !getCoreOperatorResult(rosterById, OPERATOR.ebenholz))
  ) {
    return null;
  }

  return {
    id,
    label,
    rosmontis,
    ebenholz,
    requiredOperatorIds,
  };
}

export function evaluateRiicPerceptionResourceTrials({
  ownedOperators,
  layoutFacts,
  controlState,
} = {}) {
  const rosterById = getRosterById(ownedOperators);
  const rosmontis = getCoreOperatorResult(rosterById, OPERATOR.rosmontis);
  const ebenholz = getCoreOperatorResult(rosterById, OPERATOR.ebenholz);
  const dormitoryOccupantCount =
    getFacilityCount(layoutFacts, "dormitory") *
    DORMITORY_CAPACITY_PER_ROOM;
  const officeExtraRecruitmentSlots =
    getOfficeExtraRecruitmentSlots(layoutFacts);
  const officePlans = createOfficePlans(
    rosterById,
    officeExtraRecruitmentSlots,
  ).map((plan) => ({
    ...plan,
    extraRecruitmentSlots: officeExtraRecruitmentSlots,
  }));
  const scenarios = [
    createScenario(
      {
        id: "rosmontis",
        label: "迷迭香",
        rosmontis: true,
        ebenholz: false,
      },
      rosterById,
    ),
    createScenario(
      {
        id: "ebenholz",
        label: "黑键",
        rosmontis: false,
        ebenholz: true,
      },
      rosterById,
    ),
    createScenario(
      {
        id: "rosmontis-ebenholz",
        label: "迷迭香 + 黑键",
        rosmontis: true,
        ebenholz: true,
      },
      rosterById,
    ),
  ]
    .filter(Boolean)
    .map((scenario) => ({
      ...scenario,
      plans: officePlans
        .map((officePlan) =>
          createPlan({
            scenario,
            officePlan,
            dormitoryOccupantCount,
            rosterById,
          }),
        )
        .sort(
          (left, right) =>
            right.contributionScore - left.contributionScore ||
            left.label.localeCompare(right.label, "zh-CN"),
        ),
    }));

  return {
    status: "ready",
    availableCoreOperatorCount: Number(Boolean(rosmontis)) + Number(Boolean(ebenholz)),
    dormitoryOccupantCount,
    officeExtraRecruitmentSlots,
    scenarios,
    controlConditionalSources: getControlConditionalSources(
      controlState,
      rosterById,
    ),
    omittedMechanics: [
      "夕、令的心情阈值资源不计入试算。",
      "未根据实际班表验证宿舍、办公室和核心干员是否同班。",
      "本结果不修改候选排序、抓人或最终产能。",
    ],
  };
}
