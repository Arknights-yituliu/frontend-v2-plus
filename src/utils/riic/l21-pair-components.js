function getCandidateMemberCount(skeleton) {
  return Array.isArray(skeleton?.candidate?.members)
    ? skeleton.candidate.members.length
    : 0;
}

function getOperatorIdSignature(skeleton) {
  return [...(skeleton?.operatorIds || [])]
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("|");
}

function getCombinedOperatorIdSignature(left, right) {
  return [...(left?.operatorIds || []), ...(right?.operatorIds || [])]
    .sort((first, second) => first.localeCompare(second, "en"))
    .join("|");
}

function hasOverlappingOperatorIds(left, right) {
  const leftIds = new Set(left?.operatorIds || []);
  return (right?.operatorIds || []).some((operatorId) =>
    leftIds.has(operatorId),
  );
}

function hasTaggedMembers(skeleton) {
  return (skeleton?.taggedMemberRequirements || []).length > 0;
}

function hasTeamCalculation(skeleton) {
  return Boolean(skeleton?.candidate?.teamCalculation);
}

function isClosureSpecialOrderSingleSkeleton(skeleton) {
  if (
    getCandidateMemberCount(skeleton) !== 1 ||
    String(skeleton?.candidate?.teamCalculation?.type || "").trim() !==
      "closureSpecialOrder"
  ) {
    return false;
  }

  const memberName = String(
    skeleton?.candidate?.members?.[0]?.name || "",
  ).trim();
  const sourceMember = String(
    skeleton?.candidate?.teamCalculation?.sourceMember || "",
  ).trim();
  return Boolean(memberName && sourceMember && memberName === sourceMember);
}

function isButshuCandidate(skeleton) {
  return String(skeleton?.candidate?.variantGroupId || "").startsWith(
    "family-butshu:",
  );
}

function getDisplayName(candidate) {
  const name = String(candidate?.name || "").trim();
  const memberCount = Array.isArray(candidate?.members)
    ? candidate.members.length
    : 0;
  const parts = name
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > memberCount && memberCount > 0
    ? parts.slice(0, memberCount).join(" + ")
    : name;
}

function getSourceFile(candidate) {
  return String(candidate?.sourceFile || "").trim();
}

function isPairComponentSkeleton(skeleton) {
  return (
    skeleton?.candidate?.lv3PairComponent === true &&
    getCandidateMemberCount(skeleton) === 2 &&
    !hasTaggedMembers(skeleton) &&
    !hasTeamCalculation(skeleton) &&
    !isButshuCandidate(skeleton)
  );
}

function isSingleComponentPartnerSkeleton(skeleton) {
  return (
    getCandidateMemberCount(skeleton) === 1 &&
    !hasTaggedMembers(skeleton) &&
    !isButshuCandidate(skeleton) &&
    (!hasTeamCalculation(skeleton) ||
      isClosureSpecialOrderSingleSkeleton(skeleton))
  );
}

/**
 * Builds ordinary fixed 2+1 room candidates for three-slot facilities.
 *
 * Dynamic team calculators deliberately stay out of this path, except for
 * Closure's single-member special-order candidate. Its calculation remains
 * attached to the generated candidate and is resolved later by L62.
 * Butshu has its own composition because its third member changes the order
 * calculation.
 */
export function createRiicPairComponentCandidateSkeletons({
  candidateSkeletons = [],
  scope,
} = {}) {
  if (
    Number(scope?.stationLevel) !== 3 ||
    Number(scope?.slotCount) !== 3
  ) {
    return [];
  }

  const explicitTeamSignatures = new Set(
    candidateSkeletons
      .filter((skeleton) => getCandidateMemberCount(skeleton) === 3)
      .map(getOperatorIdSignature),
  );
  const generatedCandidateIds = new Set();
  const pairComponents = candidateSkeletons.filter(isPairComponentSkeleton);
  const singlePartners = candidateSkeletons.filter(
    isSingleComponentPartnerSkeleton,
  );

  return pairComponents.flatMap((pairSkeleton) => {
    const pairCandidate = pairSkeleton.candidate;

    return singlePartners.flatMap((singleSkeleton) => {
      if (hasOverlappingOperatorIds(pairSkeleton, singleSkeleton)) {
        return [];
      }

      const singleCandidate = singleSkeleton.candidate;
      const operatorIds = [
        ...(pairSkeleton.operatorIds || []),
        ...(singleSkeleton.operatorIds || []),
      ];
      const operatorIdSignature = getCombinedOperatorIdSignature(
        pairSkeleton,
        singleSkeleton,
      );
      const generatedCandidateId = `${String(pairCandidate?.id || "")}:${String(
        singleCandidate?.id || "",
      )}`;
      if (
        explicitTeamSignatures.has(operatorIdSignature) ||
        generatedCandidateIds.has(generatedCandidateId)
      ) {
        return [];
      }
      generatedCandidateIds.add(generatedCandidateId);

      const sourceFiles = [getSourceFile(pairCandidate), getSourceFile(singleCandidate)]
        .filter(Boolean)
        .join(" + ");

      return [
        {
          candidate: {
            id: `pair-component:${String(pairCandidate?.id || "")}:${String(
              singleCandidate?.id || "",
            )}`,
            name: [getDisplayName(pairCandidate), getDisplayName(singleCandidate)]
              .filter(Boolean)
              .join(" + "),
            members: [
              ...(pairCandidate?.members || []),
              ...(singleCandidate?.members || []),
            ],
            ...(isClosureSpecialOrderSingleSkeleton(singleSkeleton)
              ? {
                  teamCalculation: {
                    ...singleCandidate.teamCalculation,
                  },
                }
              : {}),
            efficiency:
              Number(pairCandidate?.efficiency || 0) +
              Number(singleCandidate?.efficiency || 0),
            sourceFile: sourceFiles,
            quality:
              pairCandidate?.quality === "baseOnly" ||
              singleCandidate?.quality === "baseOnly"
                ? "baseOnly"
                : "complete",
            calculationStatus:
              pairCandidate?.calculationStatus === "estimated" ||
              singleCandidate?.calculationStatus === "estimated"
                ? "estimated"
                : "calculated",
            variantGroupId: `pair-component:${String(
              pairCandidate?.variantGroupId || pairCandidate?.id || "",
            )}:${String(
              singleCandidate?.variantGroupId || singleCandidate?.id || "",
            )}`,
            composition: {
              kind: "pair-component",
              pairCandidateId: String(pairCandidate?.id || ""),
              pairCandidateName: String(pairCandidate?.name || ""),
              singleCandidateId: String(singleCandidate?.id || ""),
              singleCandidateName: String(singleCandidate?.name || ""),
            },
          },
          operatorIds,
          coreUpgradeRequirements: [
            ...(pairSkeleton.coreUpgradeRequirements || []),
            ...(singleSkeleton.coreUpgradeRequirements || []),
          ],
          taggedMemberRequirements: [],
        },
      ];
    });
  });
}
