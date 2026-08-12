/**
 * L32: apply the matched static-rule contributions to runtime candidate
 * values. The source candidate and JSON data remain untouched.
 */
export function applyRiicStaticCandidateRules({
  publishedCoreBonusPercent = 0,
  publishedEquivalentByProduct = {},
  ruleMatch,
} = {}) {
  const operatorBonusPercent = Number(
    ruleMatch?.operatorBonusPercent || 0,
  );
  const candidateLocalBonusPercent = Number(
    ruleMatch?.candidateLocalBonusPercent || 0,
  );
  const coreLayer3BonusPercent =
    operatorBonusPercent + candidateLocalBonusPercent;

  return {
    roomPriority: Number(ruleMatch?.roomPriority || 0),
    operatorBonusExclusionIds: [
      ...(ruleMatch?.operatorBonusExclusionIds || []),
    ],
    operatorBonusPercent,
    candidateLocalBonusPercent,
    coreLayer3BonusPercent,
    coreBonusPercent:
      Number(publishedCoreBonusPercent || 0) + coreLayer3BonusPercent,
    equivalentByProduct: {
      ...(publishedEquivalentByProduct || {}),
      ...(ruleMatch?.equivalentByProduct || {}),
    },
  };
}
