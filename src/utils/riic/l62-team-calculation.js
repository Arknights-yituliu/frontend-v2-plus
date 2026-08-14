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

/**
 * L62: resolves a declared effect that depends on the completed room team.
 * JSON states the rule; the selected fallback members provide its inputs.
 */
export function recalculateRiicRoomTeamCandidate({
  candidate,
  scope,
  fallbackOperators = [],
} = {}) {
  const calculation = candidate?.teamCalculation;
  if (
    String(calculation?.type || "").trim() !==
      "copyOtherManufactureProduction" ||
    String(scope?.roomType || "").trim() !== "manufacture"
  ) {
    return null;
  }

  const members = [
    ...(candidate?.teamMemberProductionProfiles || []),
    ...(fallbackOperators || []),
  ];
  const sourceMember = getSourceMember(candidate, members);
  if (!sourceMember) {
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
