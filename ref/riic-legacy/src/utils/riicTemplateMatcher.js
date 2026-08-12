const TRAINING_MODES = new Set(["current", "ideal"]);

function isProductCompatible(effect, product) {
  return (
    product === "all" ||
    effect?.product === "all" ||
    effect?.product === product
  );
}

function isTemplateProductCompatible(template, product) {
  return (
    product === "all" ||
    template.product === "all" ||
    template.product === product
  );
}

function getTemplateVariants(template) {
  if (!template.oneOf?.length) {
    return [
      {
        members: template.members,
        selectedOneOf: null,
      },
    ];
  }

  return template.oneOf.map((member) => ({
    members: [...template.members, member],
    selectedOneOf: member,
  }));
}

function getCandidateMap(resolvedSkills, roomType) {
  return new Map(
    (resolvedSkills?.candidatesByRoom?.[roomType] || []).map((candidate) => [
      candidate.charId,
      candidate,
    ]),
  );
}

function isSameRoomRuleActive(rule, occupantIds, ownerCharId, product) {
  if (!isProductCompatible(rule.effect, product)) {
    return false;
  }

  const relatedOperatorIds = (rule.condition?.charIds || []).filter(
    (charId) =>
      occupantIds.has(charId) &&
      (!rule.condition.excludeOwner || charId !== ownerCharId),
  );
  if (rule.condition?.type === "sameRoomHasAny") {
    return relatedOperatorIds.length > 0;
  }
  if (rule.condition?.type === "sameRoomMemberCount") {
    return relatedOperatorIds.length >= 2;
  }
  return false;
}

function getApplicableMechanics({
  resolvedSkills,
  roomType,
  product,
  members,
}) {
  const candidateMap = getCandidateMap(resolvedSkills, roomType);
  const occupantIds = new Set(members.map((member) => member.charId));
  const mechanics = [];

  for (const member of members) {
    const candidate = candidateMap.get(member.charId);
    if (!candidate) {
      continue;
    }

    for (const rule of candidate.effects || []) {
      if (!isProductCompatible(rule.effect, product)) {
        continue;
      }
      mechanics.push({
        id: rule.id,
        ownerCharId: member.charId,
        ownerName: member.name,
        kind: "direct",
        unlock: rule.unlock,
      });
    }

    for (const rule of candidate.sameRoomRules || []) {
      if (
        !isSameRoomRuleActive(
          rule,
          occupantIds,
          member.charId,
          product,
        )
      ) {
        continue;
      }
      mechanics.push({
        id: rule.id,
        ownerCharId: member.charId,
        ownerName: member.name,
        kind: "sameRoom",
        unlock: rule.unlock,
      });
    }
  }

  return mechanics.sort((left, right) => left.id.localeCompare(right.id, "en"));
}

function getFallbackChain(template, templatesById) {
  const chain = [];
  let current = template;
  while (current) {
    chain.push({
      id: current.id,
      name: current.name,
      candidateTier: current.candidateTier,
    });
    current = current.fallbackId
      ? templatesById.get(current.fallbackId) || null
      : null;
  }
  return chain;
}

function getTemplateAvailability({
  template,
  members,
  ownedOperatorIds,
  roomType,
  product,
  expectedSlots,
  resolvedSkills,
}) {
  const missingMembers = members.filter(
    (member) => !ownedOperatorIds.has(member.charId),
  );
  if (missingMembers.length > 0) {
    return {
      status: "missingMembers",
      missingMembers,
      mechanics: [],
    };
  }

  if (!isTemplateProductCompatible(template, product)) {
    return {
      status: "productMismatch",
      missingMembers: [],
      mechanics: [],
    };
  }

  if (template.candidateTier === "room" && members.length !== expectedSlots) {
    return {
      status: "slotMismatch",
      missingMembers: [],
      mechanics: [],
    };
  }
  if (template.candidateTier === "core" && members.length > expectedSlots) {
    return {
      status: "slotMismatch",
      missingMembers: [],
      mechanics: [],
    };
  }

  const mechanics = getApplicableMechanics({
    resolvedSkills,
    roomType,
    product,
    members,
  });
  if (
    template.calculationCoverage !== "manualVerified" &&
    !mechanics.some((mechanic) => mechanic.kind === "sameRoom")
  ) {
    return {
      status: "inactiveMechanics",
      missingMembers: [],
      mechanics,
    };
  }

  return {
    status: "ready",
    missingMembers: [],
    mechanics,
  };
}

function getUpgradeRequirements({
  mechanics,
  currentResolvedSkills,
}) {
  if (!currentResolvedSkills) {
    return [];
  }

  const currentOperators = new Map(
    (currentResolvedSkills.currentOwnedOperators ||
      currentResolvedSkills.ownedOperators ||
      []).map((operator) => [operator.charId, operator]),
  );
  const currentMechanicIds = new Set();
  for (const roomCandidates of Object.values(
    currentResolvedSkills.candidatesByRoom || {},
  )) {
    for (const candidate of roomCandidates || []) {
      for (const rule of candidate.effects || []) {
        currentMechanicIds.add(rule.id);
      }
      for (const rule of candidate.sameRoomRules || []) {
        currentMechanicIds.add(rule.id);
      }
    }
  }

  const requirements = new Map();
  for (const mechanic of mechanics) {
    if (currentMechanicIds.has(mechanic.id)) {
      continue;
    }

    const operator = currentOperators.get(mechanic.ownerCharId);
    if (!operator) {
      continue;
    }
    const existing = requirements.get(mechanic.ownerCharId);
    const required = mechanic.unlock;
    if (
      existing &&
      (existing.required.elite > required.phase ||
        (existing.required.elite === required.phase &&
          existing.required.level >= required.level))
    ) {
      existing.ruleIds.push(mechanic.id);
      continue;
    }

    requirements.set(mechanic.ownerCharId, {
      charId: mechanic.ownerCharId,
      name: mechanic.ownerName,
      current: {
        elite: operator.elite,
        level: operator.level,
      },
      required: {
        elite: required.phase,
        level: required.level,
      },
      ruleIds: [mechanic.id],
    });
  }

  return [...requirements.values()]
    .map((requirement) => ({
      ...requirement,
      ruleIds: [...new Set(requirement.ruleIds)].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    }))
    .sort((left, right) => left.charId.localeCompare(right.charId, "en"));
}

function getEstimateStatus(template) {
  if (template.calculationCoverage !== "manualVerified") {
    return {
      status: "calculated",
      canAutoOutrankComplete: true,
    };
  }

  return template.estimateRange
    ? {
        status: "estimated",
        estimateRange: template.estimateRange,
        canAutoOutrankComplete: true,
      }
    : {
        status: "estimatePending",
        estimateRange: null,
        canAutoOutrankComplete: false,
      };
}

function compareTemplateCandidates(left, right) {
  const tierRank = { room: 0, core: 1 };
  if (tierRank[left.candidateTier] !== tierRank[right.candidateTier]) {
    return tierRank[left.candidateTier] - tierRank[right.candidateTier];
  }
  return left.templateId.localeCompare(right.templateId, "en");
}

/**
 * Finds user-owned hard room templates before the generic candidate generator
 * is used. The output is intentionally not ranked by yield.
 */
export function matchRiicRoomTemplates({
  templateCatalog,
  resolvedSkills,
  currentResolvedSkills = null,
  roomType,
  product = "all",
  expectedSlots,
  trainingMode = "current",
}) {
  if (!templateCatalog?.templatesById || !Array.isArray(templateCatalog.templates)) {
    throw new Error("A normalized RIIC template catalog is required");
  }
  if (!TRAINING_MODES.has(trainingMode)) {
    throw new Error("trainingMode must be current or ideal");
  }
  if (
    !Number.isInteger(expectedSlots) ||
    expectedSlots < 1 ||
    !String(roomType || "").trim()
  ) {
    throw new Error("A valid room type and expected slot count are required");
  }
  if (trainingMode === "ideal" && !currentResolvedSkills) {
    throw new Error("Ideal matching requires currentResolvedSkills");
  }

  const ownedOperatorIds = new Set(resolvedSkills?.ownedOperatorIds || []);
  const candidates = [];
  const unavailableTemplates = [];

  for (const template of templateCatalog.templates) {
    if (template.roomType !== roomType) {
      continue;
    }

    for (const variant of getTemplateVariants(template)) {
      const availability = getTemplateAvailability({
        template,
        members: variant.members,
        ownedOperatorIds,
        roomType,
        product,
        expectedSlots,
        resolvedSkills,
      });
      const common = {
        templateId: template.id,
        templateName: template.name,
        roomType: template.roomType,
        product: template.product,
        candidateTier: template.candidateTier,
        lock: template.lock,
        operatorIds: variant.members.map((member) => member.charId),
        members: variant.members,
        selectedOneOf: variant.selectedOneOf,
        fallbackChain: getFallbackChain(
          template,
          templateCatalog.templatesById,
        ),
      };

      if (availability.status !== "ready") {
        unavailableTemplates.push({
          ...common,
          status: availability.status,
          missingMembers: availability.missingMembers,
          mechanics: availability.mechanics,
        });
        continue;
      }

      candidates.push({
        ...common,
        mechanics: availability.mechanics,
        estimate: getEstimateStatus(template),
        upgradeRequirements:
          trainingMode === "ideal"
            ? getUpgradeRequirements({
                mechanics: availability.mechanics,
                currentResolvedSkills,
              })
            : [],
      });
    }
  }

  candidates.sort(compareTemplateCandidates);
  unavailableTemplates.sort((left, right) =>
    left.templateId.localeCompare(right.templateId, "en"),
  );

  return {
    roomType,
    product,
    expectedSlots,
    trainingMode,
    candidates,
    unavailableTemplates,
    summary: {
      candidateCount: candidates.length,
      roomTemplateCount: candidates.filter(
        (candidate) => candidate.candidateTier === "room",
      ).length,
      coreTemplateCount: candidates.filter(
        (candidate) => candidate.candidateTier === "core",
      ).length,
      unavailableTemplateCount: unavailableTemplates.length,
      estimatedCandidateCount: candidates.filter(
        (candidate) => candidate.estimate.status !== "calculated",
      ).length,
    },
  };
}
