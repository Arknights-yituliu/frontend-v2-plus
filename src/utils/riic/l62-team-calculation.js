import BASELINE_RULES from "../../static/json/tools/R00-baseline.json" with {
  type: "json",
};

const JAYE_OPERATOR_ID = "char_272_strong";
const KJERAG_OPERATOR_IDS = new Set([
  "char_172_svrash",
  "char_173_slchan",
  "char_198_blackd",
  "char_199_yak",
  "char_4116_blkkgt",
]);
const ORDER_LIMIT_BY_STATION_LEVEL = Object.freeze({
  1: 4,
  2: 6,
  3: 10,
});

function toFinitePercent(value) {
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : 0;
}

function getTeamMemberManufacturePercent(member) {
  return toFinitePercent(
    member?.copyableManufacturePercent ??
      member?.teammateManufacturePercent ??
      (toFinitePercent(member?.basePercent) +
        toFinitePercent(member?.layer3Bonus)),
  );
}

function getSourceMember(candidate, members) {
  const sourceMemberName = String(
    candidate?.teamCalculation?.sourceMember || "",
  ).trim();
  if (!sourceMemberName) {
    return null;
  }

  return (
    members.find(
      (member) => String(member?.name || "").trim() === sourceMemberName,
    ) || null
  );
}

function getControlOperatorEffects(controlCenterAdjustment, operatorId) {
  return (controlCenterAdjustment?.operatorEffects || []).filter((effect) =>
    (effect?.affectedOperatorIds || []).includes(operatorId),
  );
}

function isRuleUnlockedForMember(rule, member) {
  const unlock = rule?.unlock || {};
  const memberElite = Number(member?.elite || 0);
  const memberLevel = Number(member?.level || 1);
  const requiredElite = Number(unlock.phase || 0);
  const requiredLevel = Number(unlock.level || 1);

  return (
    memberElite > requiredElite ||
    (memberElite === requiredElite && memberLevel >= requiredLevel)
  );
}

function getRuleUnlockRank(rule) {
  return Number(rule?.unlock?.phase || 0) * 1000 +
    Number(rule?.unlock?.level || 1);
}

function getActiveTradingRules(member) {
  const memberId = String(member?.charId || "").trim();
  const selectedByActivationKey = new Map();

  for (const rule of BASELINE_RULES.rules || []) {
    if (
      String(rule?.charId || "").trim() !== memberId ||
      String(rule?.roomType || "").trim() !== "trading" ||
      !isRuleUnlockedForMember(rule, member)
    ) {
      continue;
    }

    const activation = rule?.activation || {};
    const key =
      activation.mode === "replace" && activation.group
        ? String(activation.group)
        : String(rule.id || "");
    const current = selectedByActivationKey.get(key);
    if (!current || getRuleUnlockRank(rule) > getRuleUnlockRank(current)) {
      selectedByActivationKey.set(key, rule);
    }
  }

  return [...selectedByActivationKey.values()];
}

function getNativeOrderLimit(member) {
  return getActiveTradingRules(member).reduce((total, rule) => {
    const description = String(rule?.rawDescription || "");
    const matches = description.matchAll(/订单上限\s*([+-])\s*(\d+(?:\.\d+)?)/g);

    for (const match of matches) {
      total += (match[1] === "-" ? -1 : 1) * Number(match[2]);
    }

    return total;
  }, 0);
}

function getJayeStaticCoreBonusPercent(candidate) {
  const value = Number(
    candidate?.teamCalculationBaseLocalBonusPercent ??
      candidate?.localBonusPercent ??
      candidate?.efficiency,
  );
  return Number.isFinite(value) ? value : null;
}

function recalculateJayeOrderLimitCandidate({
  candidate,
  scope,
  members,
  sourceMember,
  controlCenterAdjustment,
} = {}) {
  if (
    String(scope?.roomType || "").trim() !== "trading" ||
    String(sourceMember?.charId || "").trim() !== JAYE_OPERATOR_ID ||
    Number(sourceMember?.elite || 0) < 1
  ) {
    return null;
  }

  const stationLevel = Number(scope?.stationLevel);
  const baseOrderLimit = Number(ORDER_LIMIT_BY_STATION_LEVEL[stationLevel] || 0);
  if (baseOrderLimit <= 0) {
    return null;
  }

  const teammates = members.filter(
    (member) =>
      String(member?.charId || "").trim() !==
      String(sourceMember?.charId || "").trim(),
  );
  const kjeragTeammates = teammates.filter((member) =>
    KJERAG_OPERATOR_IDS.has(String(member?.charId || "").trim()),
  );
  const controlOrderLimitEffects = kjeragTeammates.flatMap((member) =>
    getControlOperatorEffects(controlCenterAdjustment, member.charId).filter(
      (effect) => effect.metric === "orderLimit",
    ),
  );
  if (kjeragTeammates.length === 0) {
    return null;
  }
  if (controlOrderLimitEffects.length === 0) {
    const coreBonusPercentBeforeControl =
      getJayeStaticCoreBonusPercent(candidate);
    if (coreBonusPercentBeforeControl === null) {
      return null;
    }

    // The catalog supplies the verified base result. L62 only recomputes it
    // when an actual control-center order-limit effect changes the team.
    return {
      type: "jayeOrderLimit",
      sourceMemberId: String(sourceMember.charId || "").trim(),
      sourceMemberName: String(sourceMember.name || "").trim(),
      stationLevel,
      coreBonusPercentBeforeControl,
      coreBonusAdjustmentPercent: 0,
      teammateDetails: [],
      usesStaticEstimate: true,
    };
  }

  const teammateDetails = kjeragTeammates.map((member) => {
    const operatorId = String(member?.charId || "").trim();
    const nativeEfficiency = toFinitePercent(member?.basePercent);
    const controlEfficiency = getControlOperatorEffects(
      controlCenterAdjustment,
      operatorId,
    )
      .filter((effect) => effect.metric === "orderEfficiency")
      .reduce((total, effect) => total + Number(effect.bonusPercent || 0), 0);
    const nativeOrderLimit = getNativeOrderLimit(member);
    const controlOrderLimit = getControlOperatorEffects(
      controlCenterAdjustment,
      operatorId,
    )
      .filter((effect) => effect.metric === "orderLimit")
      .reduce((total, effect) => total + Number(effect.bonusPercent || 0), 0);

    return {
      charId: operatorId,
      name: String(member?.name || operatorId).trim(),
      nativeEfficiency,
      controlEfficiency,
      effectiveEfficiency: nativeEfficiency + controlEfficiency,
      nativeOrderLimit,
      controlOrderLimit,
      effectiveOrderLimit: nativeOrderLimit + controlOrderLimit,
    };
  });
  const totalOrderLimit =
    baseOrderLimit +
    teammateDetails.reduce(
      (total, member) => total + member.effectiveOrderLimit,
      0,
    );
  const jayePercent = totalOrderLimit * 4;
  const teammatePercent = teammateDetails.reduce(
    (total, member) => total + member.nativeEfficiency,
    0,
  );
  const coreBonusPercentBeforeControl = toFinitePercent(
    candidate?.teamCalculationBaseLocalBonusPercent ??
      candidate?.localBonusPercent ??
      candidate?.efficiency ??
      0,
  );
  const controlOrderLimitBonusPercent = teammateDetails.reduce(
    (total, member) => total + member.controlOrderLimit * 4,
    0,
  );

  return {
    type: "jayeOrderLimit",
    sourceMemberId: String(sourceMember.charId || "").trim(),
    sourceMemberName: String(sourceMember.name || "").trim(),
    stationLevel,
    baseOrderLimit,
    totalOrderLimit,
    jayePercent,
    teammatePercent,
    coreBonusPercentBeforeControl,
    controlOrderLimitBonusPercent,
    coreBonusAdjustmentPercent: controlOrderLimitBonusPercent,
    teammateDetails,
  };
}

/**
 * L62: resolves a declared effect that depends on the completed room team.
 * JSON states the rule; the selected fallback members provide its inputs.
 */
export function recalculateRiicRoomTeamCandidate({
  candidate,
  scope,
  fallbackOperators = [],
  controlCenterAdjustment = null,
} = {}) {
  const calculation = candidate?.teamCalculation;

  const members = [
    ...(candidate?.teamMemberProductionProfiles || []),
    ...(fallbackOperators || []),
  ];
  const sourceMember = getSourceMember(candidate, members);
  if (!sourceMember) {
    return null;
  }

  if (String(calculation?.type || "").trim() === "jayeOrderLimit") {
    return recalculateJayeOrderLimitCandidate({
      candidate,
      scope,
      members,
      sourceMember,
      controlCenterAdjustment,
    });
  }

  if (
    String(calculation?.type || "").trim() !==
      "copyOtherManufactureProduction" ||
    String(scope?.roomType || "").trim() !== "manufacture"
  ) {
    return null;
  }

  const maximumPercent = Math.max(
    0,
    toFinitePercent(calculation?.maximumPercent),
  );
  const teammates = members.filter(
    (member) => String(member?.charId || "").trim() !== sourceMember.charId,
  );
  const copiedPercent = Math.min(
    maximumPercent,
    teammates.reduce(
      (total, member) => total + getTeamMemberManufacturePercent(member),
      0,
    ),
  );

  return {
    type: "copyOtherManufactureProduction",
    sourceMemberId: String(sourceMember.charId || "").trim(),
    sourceMemberName: String(sourceMember.name || "").trim(),
    maximumPercent,
    copiedPercent,
    coreBonusAdjustmentPercent: copiedPercent,
    teammateContributions: teammates.map((member) => ({
      charId: String(member?.charId || "").trim(),
      name: String(member?.name || "").trim(),
      percent: getTeamMemberManufacturePercent(member),
    })),
  };
}

/**
 * Recalculates a team-dependent room candidate from the control-center
 * bindings that are active in one concrete schedule segment.
 */
export function recalculateRiicRoomTeamCandidateForActiveControlBindings({
  candidate,
  scope,
  fallbackOperators = [],
  controlBindings = [],
} = {}) {
  const operatorEffects = (controlBindings || []).flatMap((binding) =>
    (binding?.effects || []).filter(
      (effect) => String(effect?.scope || "").trim() === "operators",
    ),
  );

  return recalculateRiicRoomTeamCandidate({
    candidate,
    scope,
    fallbackOperators,
    controlCenterAdjustment: {
      operatorEffects,
    },
  });
}
