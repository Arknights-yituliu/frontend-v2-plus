const ROOM_TYPES = new Set([
  "manufacture",
  "trading",
  "power",
  "control",
  "meeting",
  "hire",
]);

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function toNonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function isProductCompatible(effect, product) {
  return effect?.product === "all" || effect?.product === product;
}

function getScopeSpecificity(scope = {}) {
  return ["layoutIds", "cardKeys", "roomKeys"].reduce(
    (count, key) => count + (Array.isArray(scope[key]) ? scope[key].length : 0),
    0,
  );
}

function matchesScope(scope = {}, context) {
  return ["layoutIds", "cardKeys", "roomKeys"].every((key) => {
    const expectedValues = scope[key];
    if (!Array.isArray(expectedValues) || expectedValues.length === 0) {
      return true;
    }

    const contextKey =
      key === "layoutIds"
        ? "layoutId"
        : key === "cardKeys"
          ? "cardKey"
          : "roomKey";
    return expectedValues.includes(context?.[contextKey]);
  });
}

function normalizeProfile(profile, defaults) {
  const stations = Array.isArray(profile?.stations)
    ? profile.stations
    : (profile?.allowedSlots || []).map((slotCount) => ({
        stationLevel: slotCount,
        slotCount,
      }));
  if (
    !profile?.id ||
    !ROOM_TYPES.has(profile.roomType) ||
    !profile.product ||
    stations.length === 0
  ) {
    return null;
  }

  const allowedSlots = [
    ...new Set(
      stations
        .map((station) => toPositiveInteger(station?.slotCount, null))
        .filter(Boolean),
    ),
  ].sort((left, right) => left - right);
  if (allowedSlots.length === 0) {
    return null;
  }

  return {
    ...profile,
    stations: stations
      .map((station) => ({
        stationLevel: toPositiveInteger(
          station?.stationLevel,
          toPositiveInteger(station?.slotCount, null),
        ),
        slotCount: toPositiveInteger(station?.slotCount, null),
      }))
      .filter((station) => station.stationLevel && station.slotCount),
    allowedSlots,
    scope: profile.scope || {},
    fallback: {
      percent: toNonNegativeNumber(profile.fallback?.percent, 0),
      label: String(profile.fallback?.label || "基础补位").trim() || "基础补位",
    },
  };
}

export function findRiicRoomCandidateProfile({
  profileData,
  layoutId,
  cardKey,
  roomKey,
  roomType,
  product,
  expectedSlots,
}) {
  const context = { layoutId, cardKey, roomKey };
  const profiles = (profileData?.profiles || [])
    .map((profile) => normalizeProfile(profile))
    .filter(
      (profile) =>
        profile &&
        profile.roomType === roomType &&
        profile.product === product &&
        profile.allowedSlots.includes(expectedSlots) &&
        matchesScope(profile.scope, context),
    )
    .sort((left, right) => {
      const layerRank = left.layer === "layout" ? 0 : 1;
      const rightLayerRank = right.layer === "layout" ? 0 : 1;
      if (layerRank !== rightLayerRank) {
        return layerRank - rightLayerRank;
      }

      const specificityDifference =
        getScopeSpecificity(right.scope) - getScopeSpecificity(left.scope);
      if (specificityDifference !== 0) {
        return specificityDifference;
      }

      return left.id.localeCompare(right.id, "en");
    });

  return profiles[0] || null;
}

function collectOwnedOperatorNames(resolvedSkills) {
  const names = new Map();

  for (const operator of resolvedSkills?.ownedOperators || []) {
    names.set(operator.charId, operator.name);
  }
  for (const operator of resolvedSkills?.operators || []) {
    names.set(operator.charId, operator.name);
  }

  return names;
}

function collectFallbackOperatorIds({
  resolvedSkills,
  roomCandidates,
  product,
  minimumPercent,
}) {
  const ownedOperatorIds = new Set(resolvedSkills?.ownedOperatorIds || []);
  const normalizedMinimumPercent = Number(minimumPercent || 0);

  if (normalizedMinimumPercent <= 0) {
    return [...ownedOperatorIds].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
  }

  return roomCandidates
    .filter((candidate) =>
      (candidate.effects || []).some(
        (rule) =>
          rule.effect?.coverage !== "baseOnly" &&
          isProductCompatible(rule.effect, product) &&
          Number(rule.effect.percent || 0) >= normalizedMinimumPercent,
      ),
    )
    .map((candidate) => candidate.charId)
    .sort((left, right) => left.localeCompare(right, "en"));
}

function getCandidateSeed(candidate, product) {
  const completePercent = (candidate.effects || [])
    .filter(
      (rule) =>
        rule.effect?.coverage !== "baseOnly" &&
        isProductCompatible(rule.effect, product),
    )
    .reduce((total, rule) => total + Number(rule.effect.percent || 0), 0);
  const baseOnlyPercent = (candidate.effects || [])
    .filter(
      (rule) =>
        rule.effect?.coverage === "baseOnly" &&
        isProductCompatible(rule.effect, product),
    )
    .reduce((total, rule) => total + Number(rule.effect.percent || 0), 0);
  const sameRoomPercent = (candidate.sameRoomRules || [])
    .filter((rule) => isProductCompatible(rule.effect, product))
    .reduce(
      (total, rule) => total + Number(rule.effect.percent || 0),
      0,
    );
  const hasCompatibleSameRoomRule = (candidate.sameRoomRules || []).some(
    (rule) => isProductCompatible(rule.effect, product),
  );

  return {
    charId: candidate.charId,
    completePercent,
    baseOnlyPercent,
    sameRoomPercent,
    completeScore: completePercent + sameRoomPercent,
    hasCompatibleSameRoomRule,
  };
}

function chooseCombinations(operatorIds, size) {
  const combinations = [];
  const choose = (startIndex, selected) => {
    if (selected.length === size) {
      combinations.push(selected);
      return;
    }

    const remaining = size - selected.length;
    for (
      let index = startIndex;
      index <= operatorIds.length - remaining;
      index += 1
    ) {
      choose(index + 1, [...selected, operatorIds[index]]);
    }
  };

  choose(0, []);
  return combinations;
}

function getCandidateQuality(appliedRules) {
  return appliedRules.some(
    (rule) => rule.kind === "direct" && rule.coverage === "baseOnly",
  )
    ? "baseOnly"
    : "complete";
}

function compareRoomCandidates(left, right) {
  const qualityRank = {
    complete: 0,
    baseOnly: 1,
  };
  if (left.totalPercent !== right.totalPercent) {
    return right.totalPercent - left.totalPercent;
  }
  if (left.bonusPercent !== right.bonusPercent) {
    return right.bonusPercent - left.bonusPercent;
  }
  if (qualityRank[left.quality] !== qualityRank[right.quality]) {
    return qualityRank[left.quality] - qualityRank[right.quality];
  }
  if (left.operatorIds.length !== right.operatorIds.length) {
    return left.operatorIds.length - right.operatorIds.length;
  }
  return left.key.localeCompare(right.key, "en");
}

function normalizeRequiredOperatorIds(requiredOperatorIds, ownedOperatorIds) {
  if (!Array.isArray(requiredOperatorIds)) {
    throw new Error("requiredOperatorIds must be an array");
  }

  const normalized = requiredOperatorIds
    .map((charId) => String(charId || "").trim())
    .filter(Boolean);
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("requiredOperatorIds contains duplicates");
  }

  const missing = normalized.filter((charId) => !ownedOperatorIds.has(charId));
  if (missing.length > 0) {
    throw new Error("requiredOperatorIds must be owned");
  }

  return normalized.sort((left, right) => left.localeCompare(right, "en"));
}

export function generateRiicRoomGroupCandidates({
  resolvedSkills,
  profile,
  expectedSlots,
  calculateRoomEfficiency,
  requiredOperatorIds = [],
  retainRequiredCandidates = false,
}) {
  if (!profile) {
    throw new Error("A room candidate profile is required");
  }
  if (typeof calculateRoomEfficiency !== "function") {
    throw new Error("calculateRoomEfficiency must be a function");
  }
  if (!profile.allowedSlots?.includes(expectedSlots)) {
    throw new Error("expectedSlots is not supported by this candidate profile");
  }

  const roomCandidates =
    resolvedSkills?.candidatesByRoom?.[profile.roomType] || [];
  const ownedOperatorIds = new Set(resolvedSkills?.ownedOperatorIds || []);
  const requiredIds = normalizeRequiredOperatorIds(
    requiredOperatorIds,
    ownedOperatorIds,
  );
  if (requiredIds.length > expectedSlots) {
    throw new Error("requiredOperatorIds exceed expectedSlots");
  }
  const fallback = profile.fallback || {
    percent: 0,
    label: "基础补位",
  };
  const fallbackOperatorIds = collectFallbackOperatorIds({
    resolvedSkills,
    roomCandidates,
    product: profile.product,
    minimumPercent: fallback.percent,
  });
  const seeds = roomCandidates
    .map((candidate) => ({
      candidate,
      ...getCandidateSeed(candidate, profile.product),
    }))
    .filter(
      (seed) =>
        seed.completeScore > 0 ||
        seed.baseOnlyPercent > 0 ||
        seed.sameRoomPercent > 0,
    );
  const supportOperatorIds = new Set();

  for (const seed of seeds) {
    if (!seed.hasCompatibleSameRoomRule) {
      continue;
    }

    for (const rule of seed.candidate.sameRoomRules || []) {
      if (!isProductCompatible(rule.effect, profile.product)) {
        continue;
      }
      for (const charId of rule.condition?.charIds || []) {
        if (ownedOperatorIds.has(charId)) {
          supportOperatorIds.add(charId);
        }
      }
    }
  }

  const completeSeedIds = seeds
    .filter(
      (seed) =>
        seed.completePercent > fallback.percent ||
        seed.hasCompatibleSameRoomRule,
    )
    .map((seed) => seed.charId);
  const baseOnlySeedIds = seeds
    .filter(
      (seed) =>
        seed.baseOnlyPercent > fallback.percent &&
        !completeSeedIds.includes(seed.charId),
    )
    .map((seed) => seed.charId);
  const operatorIds = [
    ...new Set([
      ...completeSeedIds,
      ...baseOnlySeedIds,
      ...supportOperatorIds,
      ...requiredIds,
    ]),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const operatorNames = collectOwnedOperatorNames(resolvedSkills);
  const candidateMap = new Map(
    roomCandidates.map((candidate) => [candidate.charId, candidate]),
  );
  const candidates = [];
  const evaluatedKeys = new Set();

  const availableOperatorIds = operatorIds.filter(
    (charId) => !requiredIds.includes(charId),
  );
  for (
    let additionalOperatorCount = 0;
    additionalOperatorCount <= expectedSlots - requiredIds.length;
    additionalOperatorCount += 1
  ) {
    for (const combination of chooseCombinations(
      availableOperatorIds,
      additionalOperatorCount,
    )) {
      const sortedOperatorIds = [...requiredIds, ...combination].sort((left, right) =>
        left.localeCompare(right, "en"),
      );
      const fallbackSlotCount = expectedSlots - sortedOperatorIds.length;
      const key = [
        sortedOperatorIds.join("|"),
        `fallback:${fallbackSlotCount}`,
      ]
        .filter(Boolean)
        .join("|");
      if (evaluatedKeys.has(key)) {
        continue;
      }
      evaluatedKeys.add(key);

      const score = calculateRoomEfficiency({
        resolvedSkills,
        roomType: profile.roomType,
        product: profile.product,
        operatorIds: sortedOperatorIds,
        expectedSlots,
        fallbackSlotCount,
        fallbackPercent: fallback.percent,
      });
      const fallbackBaselineBonus = expectedSlots * fallback.percent;
      const hasNamedOperatorBenefit =
        score.bonusPercent > fallbackBaselineBonus;

      if (
        !score.valid ||
        (sortedOperatorIds.length > 0 &&
          !hasNamedOperatorBenefit &&
          !retainRequiredCandidates)
      ) {
        continue;
      }

      candidates.push({
        key,
        operatorIds: sortedOperatorIds,
        operators: sortedOperatorIds.map((charId) => ({
          charId,
          name:
            operatorNames.get(charId) ||
            candidateMap.get(charId)?.name ||
            charId,
          scored: candidateMap.has(charId),
        })),
        fallback: {
          count: fallbackSlotCount,
          percent: fallback.percent,
          label: fallback.label,
        },
        fallbackOperatorIds,
        totalPercent: score.totalPercent,
        bonusPercent: score.bonusPercent,
        appliedRules: score.appliedRules,
        unscoredOperatorIds: score.validation.unscoredOperatorIds,
        quality: getCandidateQuality(score.appliedRules),
        requiredOperatorIds: requiredIds,
      });
    }
  }

  const sortedCandidates = candidates.sort(compareRoomCandidates);
  return {
    profileId: profile.id,
    roomType: profile.roomType,
    product: profile.product,
    expectedSlots,
    fallback,
    candidates: sortedCandidates,
    summary: {
      completeSeedCount: completeSeedIds.length,
      baseOnlySeedCount: baseOnlySeedIds.length,
      supportOperatorCount: supportOperatorIds.size,
      requiredOperatorCount: requiredIds.length,
      evaluatedCombinationCount: evaluatedKeys.size,
      candidateCount: sortedCandidates.length,
      omittedCandidateCount: 0,
    },
  };
}
