const PERCENT_FIELD_BY_ROOM_TYPE = Object.freeze({
  trading: "tradingPercent",
  manufacture: "manufacturePercent",
  meeting: "meetingPercent",
  hire: "officePercent",
  power: "powerPercent",
});
const PRODUCT_EQUIVALENT_FACILITY_BY_FIELD = Object.freeze({
  gold: "manufacture",
});
const EPSILON = 1e-9;

export function getRiicRuntimeCandidateContributionBreakdown(candidate) {
  const sourceRoomType = String(candidate?.sourceRoomType || "").trim();
  const localPercentField = PERCENT_FIELD_BY_ROOM_TYPE[sourceRoomType];
  const localBonusPercent = Number(
    candidate?.localBonusPercent ??
      (localPercentField ? candidate?.[localPercentField] : 0) ??
      0,
  );
  const fallbackBonusPercent = Number(candidate?.fallback?.totalPercent || 0);
  const directByFacility = {};
  const directFacility = localPercentField
    ? localPercentField.replace("Percent", "")
    : "";
  const directBonusPercent =
    (Number.isFinite(localBonusPercent) ? localBonusPercent : 0) +
    (Number.isFinite(fallbackBonusPercent) ? fallbackBonusPercent : 0);
  if (directFacility && Math.abs(directBonusPercent) > EPSILON) {
    directByFacility[directFacility] = directBonusPercent;
  }

  const additionalByFacility = {};
  for (const [productField, facility] of Object.entries(
    PRODUCT_EQUIVALENT_FACILITY_BY_FIELD,
  )) {
    const value = Number(
      candidate?.publishedEquivalentByProduct?.[productField] ?? 0,
    );
    if (!Number.isFinite(value) || Math.abs(value) <= EPSILON) {
      continue;
    }
    additionalByFacility[facility] =
      Number(additionalByFacility[facility] || 0) + value;
  }

  const totalByFacility = { ...directByFacility };
  for (const [facility, bonus] of Object.entries(additionalByFacility)) {
    totalByFacility[facility] =
      Number(totalByFacility[facility] || 0) + Number(bonus || 0);
  }

  const additionalBonusPercent = Object.values(additionalByFacility).reduce(
    (total, bonus) => total + Number(bonus || 0),
    0,
  );
  const totalContributionPercent =
    directBonusPercent + additionalBonusPercent;
  const sortScore = Number(candidate?.sortScore || 0);
  const layer3RoomPriority = Number(candidate?.layer3RoomPriority || 0);
  const normalizedSortScore = Number.isFinite(sortScore) ? sortScore : 0;
  const normalizedLayer3RoomPriority = Number.isFinite(layer3RoomPriority)
    ? layer3RoomPriority
    : 0;

  return {
    directByFacility,
    additionalByFacility,
    totalByFacility,
    directBonusPercent,
    additionalBonusPercent,
    totalContributionPercent,
    sortScore: normalizedSortScore,
    layer3RoomPriority: normalizedLayer3RoomPriority,
    rankingValue:
      totalContributionPercent + normalizedSortScore + normalizedLayer3RoomPriority,
  };
}

export function getRiicRuntimeCandidateRankingValue(candidate) {
  return getRiicRuntimeCandidateContributionBreakdown(candidate).rankingValue;
}
