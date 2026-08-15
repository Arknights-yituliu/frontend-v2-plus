import {
  getRiicAutomationOperatorLayer3Bonus,
  recalculateRiicAutomationManufacture,
} from "./l62-automation-calculation.js";
import {
  getRiicLayer3OperatorLocalBonus,
} from "./l30-rules.js";
import {
  recalculateRiicClosureSpecialOrder,
} from "./l62-closure-calculation.js";
import {
  applyRiicActiveRosterPreviewEffects,
} from "./l65-active-roster-effects.js";
import {
  settleRiicPerceptionSchedule,
} from "./l42-perception-settlement.js";
import {
  calculateRiicRoomEfficiency,
} from "./l00-baseline-resolver.js";

const GENERIC_ROOM_TYPES = new Set([
  "manufacture",
  "trading",
  "power",
  "control",
  "meeting",
  "hire",
]);
const PRODUCTIVE_ROOM_TYPES = new Set(["manufacture", "trading"]);
const AUTOMATION_POWER_SUPPORT_OPERATOR_ID = "char_1027_greyy2";

function toFinitePercent(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const percent = Number(value);
  return Number.isFinite(percent) ? percent : null;
}

function getOperatorBonusById(operatorBonuses) {
  return (operatorBonuses || []).reduce((bonusesById, bonus) => {
    const operatorId = String(bonus?.operatorId || "").trim();
    if (!operatorId) {
      return bonusesById;
    }

    const bonusPercent = toFinitePercent(bonus?.bonusPercent);
    return {
      ...bonusesById,
      [operatorId]:
        Number(bonusesById[operatorId] || 0) +
        Number(bonusPercent || 0),
    };
  }, {});
}

function normalizeRoomType(facility) {
  const roomType = String(facility || "").trim();
  return roomType === "office" ? "hire" : roomType;
}

function getStaffingBonusPercent({ facility, operators = [] } = {}) {
  return PRODUCTIVE_ROOM_TYPES.has(normalizeRoomType(facility))
    ? (operators || []).length
    : 0;
}

function isAutomationCandidate(candidate) {
  const candidateOperators = [
    ...(candidate?.operators || []),
    ...(candidate?.fallback?.operators || []),
  ];
  return Boolean(
    candidate?.automationCalculation ||
      String(candidate?.variantGroupId || "").includes("automation") ||
      candidateOperators.some((operator) =>
        (operator?.tags || []).some(
          (tag) => String(tag || "").trim() === "automation",
        ),
      ),
  );
}

function getAutomationSupportState({
  state,
  layoutFacts,
  ownedOperators,
} = {}) {
  const powerPlantCount = Number(layoutFacts?.powerPlantCount);
  if (!Number.isFinite(powerPlantCount)) {
    return null;
  }

  const supportOperatorUnlocked = (ownedOperators || []).some(
    (operator) =>
      String(operator?.charId || "").trim() ===
        AUTOMATION_POWER_SUPPORT_OPERATOR_ID &&
      Number(operator?.elite ?? operator?.evolvePhase ?? 0) >= 2,
  );
  const supportOperatorActive =
    supportOperatorUnlocked &&
    (state?.rooms || []).some(
      (room) =>
        room?.facility === "power" &&
        (room?.operators || []).some(
          (operator) =>
            String(operator?.charId || "").trim() ===
            AUTOMATION_POWER_SUPPORT_OPERATOR_ID,
        ),
    );

  return {
    layoutFacts: layoutFacts || {},
    ownedOperators,
    powerPlantCount,
    effectivePowerPlantCount:
      powerPlantCount + (supportOperatorActive ? 1 : 0),
    supportOperatorId: supportOperatorActive
      ? AUTOMATION_POWER_SUPPORT_OPERATOR_ID
      : "",
  };
}

function recalculateRiicPreviewAutomationCandidate({
  candidate,
  automationRuntimeContext,
} = {}) {
  if (!isAutomationCandidate(candidate)) {
    return null;
  }
  if (
    !automationRuntimeContext?.layoutFacts ||
    !Array.isArray(automationRuntimeContext?.ownedOperators) ||
    !Number.isFinite(
      Number(automationRuntimeContext?.effectivePowerPlantCount),
    )
  ) {
    return null;
  }

  const scope = candidate?.candidateScope;
  const fallbackOperatorIds = new Set(
    [
      ...(candidate?.fallback?.fallbackOperatorIds || []),
      ...(candidate?.fallback?.operators || []).map(
        (operator) => operator?.charId,
      ),
    ]
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean),
  );
  const dynamicCoreLayer3BonusPercent = (
    candidate?.operatorIds || []
  )
    .filter(
      (operatorId) =>
        !fallbackOperatorIds.has(String(operatorId || "").trim()),
    )
    .reduce(
      (total, operatorId) =>
        total +
        Number(
          getRiicAutomationOperatorLayer3Bonus({
            operatorId,
            scope,
            ownedOperators: automationRuntimeContext?.ownedOperators,
            layoutFacts: automationRuntimeContext?.layoutFacts,
            effectivePowerPlantCount:
              automationRuntimeContext?.effectivePowerPlantCount,
            getLayer3OperatorLocalBonus: getRiicLayer3OperatorLocalBonus,
          }) ?? 0,
        ),
      Number(candidate?.layer3CandidateLocalBonusPercent || 0),
    );
  const dynamicFallbackOperators = (
    candidate?.fallback?.operators || []
  ).map((operator) => {
    const layer3Bonus = getRiicAutomationOperatorLayer3Bonus({
      operatorId: operator?.charId,
      scope,
      ownedOperators: automationRuntimeContext?.ownedOperators,
      layoutFacts: automationRuntimeContext?.layoutFacts,
      effectivePowerPlantCount:
        automationRuntimeContext?.effectivePowerPlantCount,
      getLayer3OperatorLocalBonus: getRiicLayer3OperatorLocalBonus,
    });
    return layer3Bonus === null
      ? operator
      : {
          ...operator,
          layer3Bonus,
        };
  });

  return recalculateRiicAutomationManufacture({
    scope,
    coreBaseBonusPercent: candidate?.coreBaseBonusPercent,
    coreLayer3BonusPercent: dynamicCoreLayer3BonusPercent,
    fallbackOperators: dynamicFallbackOperators,
    runtimeContext: automationRuntimeContext,
  });
}

function getCandidateSpecificCalculationReason(candidate) {
  const variantGroupId = String(candidate?.variantGroupId || "").trim();
  const teamCalculationType = String(
    candidate?.teamCalculation?.type || "",
  ).trim();
  const candidateOperators = [
    ...(candidate?.operators || []),
    ...(candidate?.fallback?.operators || []),
  ];

  if (
    candidate?.closureCalculation ||
    teamCalculationType === "closureSpecialOrder"
  ) {
    return "closure";
  }
  if (
    candidate?.composition?.kind === "butshu-fixed-partner" ||
    variantGroupId.startsWith("family-butshu:")
  ) {
    return "butshu";
  }
  if (variantGroupId === "family-shamare:idle-pair") {
    return "shamare";
  }
  if (
    candidate?.automationCalculation ||
    variantGroupId.includes("automation") ||
    candidateOperators.some((operator) =>
      (operator?.tags || []).some(
        (tag) => String(tag || "").trim() === "automation",
      ),
    )
  ) {
    return "automation";
  }
  if (teamCalculationType) {
    return "teamCalculation";
  }

  return "";
}

/**
 * Recalculates a manually edited ordinary room from its final roster. Special
 * candidate formulas remain on their L62 path until they have an equivalent
 * final-roster calculator.
 */
export function calculateRiicFinalRoomRosterEfficiency({
  facility,
  product = "all",
  expectedSlots,
  operators = [],
  candidate,
  resolvedSkills,
  actualControlCenterFacilityBonusPercent = 0,
  actualControlCenterOperatorBonusPercent = 0,
} = {}) {
  const roomType = normalizeRoomType(facility);
  if (!GENERIC_ROOM_TYPES.has(roomType)) {
    return {
      status: "unavailable",
      reason: "unsupportedRoomType",
    };
  }

  const specialCalculationReason =
    getCandidateSpecificCalculationReason(candidate);
  if (specialCalculationReason) {
    return {
      status: "requiresCandidateSpecificCalculation",
      reason: specialCalculationReason,
    };
  }

  const normalizedExpectedSlots = Number(expectedSlots);
  if (
    !Number.isInteger(normalizedExpectedSlots) ||
    normalizedExpectedSlots < 1
  ) {
    return {
      status: "unavailable",
      reason: "missingExpectedSlots",
    };
  }

  const calculation = calculateRiicRoomEfficiency({
    resolvedSkills,
    roomType,
    product: String(product || "").trim() || "all",
    operatorIds: (operators || []).map((operator) =>
      String(operator?.charId || "").trim(),
    ),
    expectedSlots: normalizedExpectedSlots,
  });
  if (!calculation.valid) {
    return {
      status: "incomplete",
      reason: "invalidRoster",
      calculation,
    };
  }

  const controlCenterFacilityBonus =
    toFinitePercent(actualControlCenterFacilityBonusPercent) || 0;
  const controlCenterOperatorBonus =
    toFinitePercent(actualControlCenterOperatorBonusPercent) || 0;
  const staffingBonusPercent = getStaffingBonusPercent({ facility, operators });
  const roomPercent =
    Number(calculation.localTotalPercent || 0) +
    staffingBonusPercent +
    controlCenterFacilityBonus +
    controlCenterOperatorBonus;

  return {
    status: "calculated",
    value: roomPercent,
    calculation,
    staffingBonusPercent,
    controlCenterFacilityBonus,
    controlCenterOperatorBonus,
  };
}

/**
 * L79: settles a preview-only room efficiency from the assembled assignment.
 * It never feeds a calculated value back into room selection or scheduling.
 */
export function settleRiicPreviewRoomEfficiency({
  facility,
  operators = [],
  candidate,
  candidateTotalPercent,
  estimatedControlCenterOperatorBonusPercent = 0,
  actualControlCenterFacilityBonusPercent = 0,
  actualControlCenterOperatorBonusPercent = 0,
  actualControlCenterOperatorBonuses = [],
  manuallyEdited = false,
  expectedSlots,
  product,
  resolvedSkills,
  automationRuntimeContext,
} = {}) {
  const candidateTotal = toFinitePercent(candidateTotalPercent);
  const estimatedControlCenterOperatorBonus = toFinitePercent(
    estimatedControlCenterOperatorBonusPercent,
  );
  const actualControlCenterFacilityBonus = toFinitePercent(
    actualControlCenterFacilityBonusPercent,
  );
  const actualControlCenterOperatorBonus = toFinitePercent(
    actualControlCenterOperatorBonusPercent,
  );
  const staffingBonusPercent = getStaffingBonusPercent({
    facility,
    operators,
  });
  const finalRosterCalculation =
    manuallyEdited && resolvedSkills
      ? calculateRiicFinalRoomRosterEfficiency({
          facility,
          product,
          expectedSlots,
          operators,
          candidate,
          resolvedSkills,
          actualControlCenterFacilityBonusPercent:
            actualControlCenterFacilityBonus,
          actualControlCenterOperatorBonusPercent:
            actualControlCenterOperatorBonus,
        })
      : null;
  const usesFinalRosterCalculation =
    finalRosterCalculation?.status === "calculated";
  const status = usesFinalRosterCalculation
    ? "calculated"
    : manuallyEdited
      ? "manuallyEdited"
      : candidateTotal === null
        ? "unavailable"
        : "calculated";
  const closureCalculation =
    status === "calculated" && !usesFinalRosterCalculation
      ? recalculateRiicClosureSpecialOrder({
          candidate,
          scope: candidate?.candidateScope,
          fallbackOperators: candidate?.fallback?.operators || [],
          operatorBonusById: getOperatorBonusById(
            actualControlCenterOperatorBonuses,
          ),
          staffingBonusPercent,
        })
      : null;
  const automationCalculation =
    status === "calculated" && !usesFinalRosterCalculation
      ? recalculateRiicPreviewAutomationCandidate({
          candidate,
          automationRuntimeContext,
        })
      : null;
  const actualValue =
    status === "calculated"
      ? usesFinalRosterCalculation
        ? finalRosterCalculation.value
        : closureCalculation
        ? Number(closureCalculation.tradeEquivalentTotalPercent || 0) +
          (actualControlCenterFacilityBonus || 0)
        : automationCalculation
        ? Number(automationCalculation.totalPercent || 0) +
          staffingBonusPercent +
          (actualControlCenterFacilityBonus || 0) +
          (actualControlCenterOperatorBonus || 0)
        : candidateTotal -
          (estimatedControlCenterOperatorBonus || 0) +
          staffingBonusPercent +
          (actualControlCenterFacilityBonus || 0) +
          (actualControlCenterOperatorBonus || 0)
      : null;

  return {
    selectedVariant: "actual",
    actual: {
      value: actualValue,
      status,
      breakdown: {
        candidateTotalPercent: candidateTotal,
        estimatedControlCenterOperatorBonusPercent:
          estimatedControlCenterOperatorBonus || 0,
        staffingBonusPercent,
        actualControlCenterFacilityBonusPercent:
          actualControlCenterFacilityBonus || 0,
        actualControlCenterOperatorBonusPercent:
          actualControlCenterOperatorBonus || 0,
        ...(finalRosterCalculation
          ? {
              finalRosterCalculation,
            }
          : {}),
        ...(closureCalculation
          ? {
              closureCalculation,
            }
          : {}),
        ...(automationCalculation
          ? {
              automationCalculation,
            }
          : {}),
      },
    },
  };
}

function applyRiicPreviewBaseRoomEfficiency(
  preview,
  resolvedSkills,
  { layoutFacts, ownedOperators } = {},
) {
  if (!preview) {
    return preview;
  }

  return {
    ...preview,
    states: (preview.states || []).map((state) => ({
      ...state,
      rooms: (state?.rooms || []).map((room) => {
        const source = room?.efficiencySource;
        if (!source) {
          if (!room?.isStatic || !resolvedSkills) {
            return room;
          }

          const finalRosterCalculation = calculateRiicFinalRoomRosterEfficiency({
            facility: room.facility,
            product: room.product,
            expectedSlots: room.expectedSlots,
            operators: room.operators || [],
            resolvedSkills,
            actualControlCenterFacilityBonusPercent:
              room.controlCenterFacilityBonusPercent,
            actualControlCenterOperatorBonusPercent:
              room.controlCenterOperatorBonusPercent,
          });

          return {
            ...room,
            efficiency:
              finalRosterCalculation.status === "calculated"
                ? finalRosterCalculation.value
                : null,
            efficiencyMetrics: {
              selectedVariant: "actual",
              actual: {
                value:
                  finalRosterCalculation.status === "calculated"
                    ? finalRosterCalculation.value
                    : null,
                status: finalRosterCalculation.status,
                breakdown: {
                  finalRosterCalculation,
                },
              },
            },
          };
        }

        const efficiencyMetrics = settleRiicPreviewRoomEfficiency({
          facility: room.facility,
          operators: room.operators || [],
          candidate: source.candidate,
          candidateTotalPercent: source.candidateTotalPercent,
          estimatedControlCenterOperatorBonusPercent:
            source.estimatedControlCenterOperatorBonusPercent,
          actualControlCenterFacilityBonusPercent:
            room.controlCenterFacilityBonusPercent,
          actualControlCenterOperatorBonusPercent:
            room.controlCenterOperatorBonusPercent,
          actualControlCenterOperatorBonuses:
            room.controlCenterOperatorBonuses || [],
          manuallyEdited: room.manuallyEdited === true,
          expectedSlots: room.expectedSlots,
          product: room.product,
          resolvedSkills,
          automationRuntimeContext: getAutomationSupportState({
            state,
            layoutFacts,
            ownedOperators,
          }),
        });

        return {
          ...room,
          efficiency: efficiencyMetrics.actual.value,
          efficiencyMetrics,
        };
      }),
    })),
  };
}

/**
 * Applies already-settled cross-room resource bonuses to a completed preview.
 * This remains downstream of selection and preserves manual-edit semantics.
 */
export function applyRiicPreviewResourceChainSettlement({
  preview,
  settlement,
} = {}) {
  const bonusesByStateAndRoomKey = new Map(
    (settlement?.states || []).flatMap((state) =>
      (state?.results || []).map((result) => [
        `${Number(state?.index || 0)}:${String(result?.roomKey || "")}`,
        {
          bonusPercent: Number(result?.bonusPercent || 0),
          baselineBonusPercent: Number(result?.baselineBonusPercent || 0),
          additionalBonusPercent: Number(
            result?.additionalBonusPercent ?? result?.bonusPercent ?? 0,
          ),
        },
      ]),
    ),
  );

  return {
    ...(preview || {}),
    states: (preview?.states || []).map((state) => ({
      ...state,
      rooms: (state?.rooms || []).map((room) => {
        const resourceChainResult =
          bonusesByStateAndRoomKey.get(
            `${Number(state?.index || 0)}:${String(room?.key || "")}`,
          ) || {};
        const resourceChainBonusPercent = Number(
          resourceChainResult.bonusPercent || 0,
        );
        const resourceChainBaselineBonusPercent = Number(
          resourceChainResult.baselineBonusPercent || 0,
        );
        const resourceChainAdditionalBonusPercent = Number(
          resourceChainResult.additionalBonusPercent || 0,
        );
        if (
          resourceChainAdditionalBonusPercent === 0 ||
          !Number.isFinite(Number(room?.efficiency))
        ) {
          return {
            ...room,
            resourceChainBonusPercent,
            resourceChainBaselineBonusPercent,
            resourceChainAdditionalBonusPercent,
          };
        }

        return {
          ...room,
          efficiency:
            Number(room.efficiency) + resourceChainAdditionalBonusPercent,
          resourceChainBonusPercent,
          resourceChainBaselineBonusPercent,
          resourceChainAdditionalBonusPercent,
          efficiencyMetrics: {
            ...(room.efficiencyMetrics || {}),
            actual: {
              ...(room.efficiencyMetrics?.actual || {}),
              value:
                Number(room.efficiencyMetrics?.actual?.value || 0) +
                resourceChainAdditionalBonusPercent,
              breakdown: {
                ...(room.efficiencyMetrics?.actual?.breakdown || {}),
                resourceChainBonusPercent,
                resourceChainBaselineBonusPercent,
                resourceChainAdditionalBonusPercent,
              },
            },
          },
        };
      }),
    })),
  };
}

/**
 * L79: calculates final display-only efficiency from an assembled schedule.
 * It never feeds values back into candidate selection, fallback planning, or
 * schedule assembly.
 */
export function settleRiicScheduleEfficiency({
  preview,
  ownedOperators = [],
  resourceFacts = {},
  layoutFacts,
  resolvedSkills,
} = {}) {
  const previewWithBaseEfficiency = applyRiicPreviewBaseRoomEfficiency(
    preview,
    resolvedSkills,
    {
      layoutFacts,
      ownedOperators,
    },
  );
  const previewWithActiveRosterEffects = applyRiicActiveRosterPreviewEffects({
    preview: previewWithBaseEfficiency,
    ownedOperators,
  });
  const perceptionSettlement = settleRiicPerceptionSchedule({
    preview: previewWithActiveRosterEffects,
    ownedOperators,
    resourceFacts,
  });

  const settledPreview = applyRiicPreviewResourceChainSettlement({
    preview: previewWithActiveRosterEffects,
    settlement: perceptionSettlement,
  });

  return {
    ...settledPreview,
    perceptionSettlement,
  };
}
