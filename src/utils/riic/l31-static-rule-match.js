import {
  getRiicLayer3CandidateEquivalentByProduct,
  getRiicLayer3CandidateLocalBonus,
  getRiicLayer3CandidateOperatorBonusExclusions,
  getRiicLayer3CandidateRoomPriority,
  getRiicLayer3OperatorLocalBonus,
} from "./l30-rules.js";

/**
 * L31: collect all static-rule contributions for one candidate context.
 * This step only describes matched contributions and does not mutate a
 * runtime candidate.
 */
export function matchRiicStaticCandidateRules({
  candidate,
  operatorIds = [],
  ownedOperators,
  scope,
  layoutData,
} = {}) {
  const operatorBonusExclusionIds = new Set(
    getRiicLayer3CandidateOperatorBonusExclusions({
      candidate,
      ownedOperators,
      scope,
      layoutData,
    }),
  );
  const operatorBonusPercent = operatorIds.reduce(
    (total, operatorId) =>
      operatorBonusExclusionIds.has(operatorId)
        ? total
        : total +
          getRiicLayer3OperatorLocalBonus({
            operatorId,
            ownedOperators,
            scope,
            layoutData,
          }),
    0,
  );

  return {
    roomPriority: getRiicLayer3CandidateRoomPriority({
      candidate,
      operatorIds,
      ownedOperators,
      scope,
      layoutData,
    }),
    equivalentByProduct: getRiicLayer3CandidateEquivalentByProduct({
      candidate,
      ownedOperators,
      scope,
      layoutData,
    }),
    operatorBonusExclusionIds: [...operatorBonusExclusionIds],
    operatorBonusPercent,
    candidateLocalBonusPercent: getRiicLayer3CandidateLocalBonus({
      candidate,
      ownedOperators,
      scope,
      layoutData,
    }),
  };
}

export function getRiicStaticFallbackOperatorBonus({
  operatorId,
  ownedOperators,
  scope,
  layoutData,
  excludeFacilityCountBonuses = false,
} = {}) {
  return getRiicLayer3OperatorLocalBonus({
    operatorId,
    ownedOperators,
    scope,
    layoutData,
    excludeFacilityCountBonuses,
  });
}
