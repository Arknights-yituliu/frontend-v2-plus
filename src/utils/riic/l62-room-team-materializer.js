import {
  getRiicAutomationOperatorLayer3Bonus,
  recalculateRiicAutomationManufacture,
} from "./l62-automation-calculation.js";
import {
  recalculateRiicButshuCandidate,
} from "./l62-butshu-calculation.js";
import {
  recalculateRiicShamareIdleCandidate,
} from "./l62-shamare-calculation.js";
import {
  recalculateRiicRoomTeamCandidate,
} from "./l62-team-calculation.js";
import {
  recalculateRiicClosureSpecialOrder,
} from "./l62-closure-calculation.js";
import {
  getRiicControlCenterRoomAdjustment,
} from "./l51-control-effects.js";
import {
  getRiicLayer3OperatorLocalBonus,
} from "./l30-rules.js";
import {
  mergeRiicUpgradeRequirements,
} from "./P00-upgrade-requirements.js";

const PERCENT_FIELD_BY_ROOM_TYPE = Object.freeze({
  trading: "tradingPercent",
  manufacture: "manufacturePercent",
  meeting: "meetingPercent",
  hire: "officePercent",
  power: "powerPercent",
});

/**
 * L62: materialize a complete room team after fallback identities are known.
 * The returned value is runtime-only and never written back to candidate JSON.
 */
export function materializeRiicRoomTeamCandidate(
  candidate,
  fallbackOperators,
  {
    controlCenterRuntimeContext: runtimeContext,
    automationRuntimeContext,
  } = {},
) {
  const operators = fallbackOperators || [];
  const ordinaryFallbackOperators = operators.filter(
    (operator) => !operator?.taggedMember,
  );
  const fallbackPercent = ordinaryFallbackOperators.reduce(
    (total, operator) => total + Number(operator.percent || 0),
    0,
  );
  const operatorIds = [
    ...new Set([
      ...(candidate?.operatorIds || []),
      ...operators.map((operator) => operator.charId),
    ]),
  ];
  const upgradeRequirements = mergeRiicUpgradeRequirements([
    ...(candidate?.coreUpgradeRequirements ||
      candidate?.upgradeRequirements ||
      []),
    ...operators.map((operator) => operator?.upgradeRequirement),
  ]);
  const dynamicAutomationCoreLayer3BonusPercent = automationRuntimeContext
    ? (candidate?.operatorIds || []).reduce((total, operatorId) => {
        const bonus = getRiicAutomationOperatorLayer3Bonus({
          operatorId,
          scope: candidate?.candidateScope,
          ownedOperators: automationRuntimeContext.ownedOperators,
          layoutFacts: automationRuntimeContext.layoutFacts,
          effectivePowerPlantCount:
            automationRuntimeContext.effectivePowerPlantCount,
          getLayer3OperatorLocalBonus: getRiicLayer3OperatorLocalBonus,
        });
        return total + Number(bonus ?? 0);
      }, Number(candidate?.layer3CandidateLocalBonusPercent || 0))
    : Number(candidate?.coreLayer3BonusPercent || 0);
  const dynamicAutomationFallbackOperators = automationRuntimeContext
    ? operators.map((operator) => {
        const layer3Bonus = getRiicAutomationOperatorLayer3Bonus({
          operatorId: operator?.charId,
          scope: candidate?.candidateScope,
          ownedOperators: automationRuntimeContext.ownedOperators,
          layoutFacts: automationRuntimeContext.layoutFacts,
          effectivePowerPlantCount:
            automationRuntimeContext.effectivePowerPlantCount,
          getLayer3OperatorLocalBonus: getRiicLayer3OperatorLocalBonus,
        });
        return layer3Bonus === null
          ? operator
          : {
              ...operator,
              layer3Bonus,
            };
      })
    : operators;
  const automationResult = recalculateRiicAutomationManufacture({
    scope: candidate?.candidateScope,
    coreBaseBonusPercent: candidate?.coreBaseBonusPercent,
    coreLayer3BonusPercent: dynamicAutomationCoreLayer3BonusPercent,
    fallbackOperators: dynamicAutomationFallbackOperators,
    runtimeContext: automationRuntimeContext,
  });
  const butshuResult = recalculateRiicButshuCandidate({
    candidate,
    scope: candidate?.candidateScope,
    fallbackOperators: operators,
  });
  const shamareResult = recalculateRiicShamareIdleCandidate({
    candidate,
    scope: candidate?.candidateScope,
    fallbackOperators: operators,
  });
  const teamCalculationResult = recalculateRiicRoomTeamCandidate({
    candidate,
    scope: candidate?.candidateScope,
    fallbackOperators: operators,
  });
  const expectedControlCenterOperatorBonusPercent = Number(
    candidate?.controlCenterOperatorBonusPercent || 0,
  );
  const controlCenterAdjustment = runtimeContext
    ? getRiicControlCenterRoomAdjustment({
        context: runtimeContext,
        scope: candidate?.candidateScope,
        operatorIds,
      })
    : null;
  const controlCenterOperatorBonusPercent = controlCenterAdjustment
    ? Number(controlCenterAdjustment.operatorBonusPercent || 0)
    : expectedControlCenterOperatorBonusPercent;
  const controlCenterFacilityBonusPercent = controlCenterAdjustment
    ? Number(controlCenterAdjustment.facilityBonusPercent || 0)
    : Number(candidate?.controlCenterFacilityBonusPercent || 0);
  const closureCalculation = recalculateRiicClosureSpecialOrder({
    candidate,
    scope: candidate?.candidateScope,
    normalCoreBonusPercent:
      candidate?.closureCalculation?.normalCoreBonusPercent,
    fallbackOperators: operators,
    operatorBonusById:
      controlCenterAdjustment?.operatorBonusById ||
      candidate?.controlCenterOperatorBonusById ||
      {},
  });
  const corePercentBeforeControl = teamCalculationResult
    ? Number(
        candidate?.teamCalculationBaseCorePercent ?? candidate?.corePercent ?? 100,
      ) + Number(teamCalculationResult.coreBonusAdjustmentPercent || 0)
    : closureCalculation
      ? 100 +
        Number(closureCalculation.tradeEquivalentBonusPercent || 0) -
        fallbackPercent
    : butshuResult
      ? 100 +
        Number(butshuResult.tradingPercent || 0) -
        Number(butshuResult.fallbackPercent || 0)
      : shamareResult
        ? 100 + Number(shamareResult.tradingPercent || 0)
      : Number(candidate?.corePercent || 100) -
        expectedControlCenterOperatorBonusPercent;
  const corePercent = closureCalculation
    ? corePercentBeforeControl
    : corePercentBeforeControl + controlCenterOperatorBonusPercent;
  const totalPercent = closureCalculation
    ? Number(closureCalculation.tradeEquivalentTotalPercent || 0)
    : teamCalculationResult
      ? corePercent + fallbackPercent
      : butshuResult
        ? 100 +
          Number(butshuResult.tradingPercent || 0) +
          controlCenterOperatorBonusPercent
        : shamareResult
          ? 100 +
            Number(shamareResult.tradingPercent || 0) +
            controlCenterOperatorBonusPercent
        : automationResult
          ? automationResult.totalPercent + controlCenterOperatorBonusPercent
          : corePercent + fallbackPercent;
  const bonusPercent = totalPercent - 100;
  const localBonusPercent = closureCalculation
    ? Number(closureCalculation.tradeEquivalentBonusPercent || 0) -
      fallbackPercent
    : teamCalculationResult
      ? Number(
          candidate?.teamCalculationBaseLocalBonusPercent ??
            candidate?.localBonusPercent ??
            0,
        ) +
        Number(teamCalculationResult.coreBonusAdjustmentPercent || 0) +
        controlCenterOperatorBonusPercent
      : butshuResult
        ? Number(butshuResult.tradingPercent || 0) -
          Number(butshuResult.fallbackPercent || 0) +
          controlCenterOperatorBonusPercent
        : shamareResult
          ? Number(shamareResult.tradingPercent || 0) +
            controlCenterOperatorBonusPercent
        : Number(candidate?.localBonusPercent || 0) -
          expectedControlCenterOperatorBonusPercent +
          controlCenterOperatorBonusPercent;
  const localPercentField =
    PERCENT_FIELD_BY_ROOM_TYPE[
      String(candidate?.sourceRoomType || "").trim()
    ] || "";

  return {
    ...candidate,
    operatorIds,
    operators: [
      ...(candidate?.operators || []),
      ...operators.map((operator) => ({
        charId: operator.charId,
        name: operator.name,
        scored: true,
        fallback: !operator.taggedMember,
        taggedMember: Boolean(operator.taggedMember),
        idleFill: Boolean(operator.idleFill),
        idleFillTier: String(operator.idleFillTier || "").trim(),
        upgradeRequirement: operator.upgradeRequirement || null,
      })),
    ],
    upgradeRequirements,
    fallback: {
      ...candidate.fallback,
      count: Math.max(
        0,
        Number(candidate.fallback?.count || 0) - ordinaryFallbackOperators.length,
      ),
      operators,
      fallbackOperatorIds: operators.map((operator) => operator.charId),
      totalPercent: butshuResult
        ? Number(butshuResult.fallbackPercent || 0)
        : fallbackPercent,
      materialized: operators.length > 0,
    },
    corePercent,
    totalPercent,
    bonusPercent,
    bestAvailableTotalPercent: totalPercent,
    localBonusPercent,
    ...(localPercentField
      ? {
          [localPercentField]: localBonusPercent,
        }
      : {}),
    controlCenterFacilityBonusPercent,
    controlCenterOperatorBonusPercent,
    controlCenterOperatorBonusById: controlCenterAdjustment
      ? { ...(controlCenterAdjustment.operatorBonusById || {}) }
      : { ...(candidate?.controlCenterOperatorBonusById || {}) },
    controlCenterExpectedBonusPercent:
      controlCenterFacilityBonusPercent + controlCenterOperatorBonusPercent,
    controlCenterFacilityCalculation:
      controlCenterAdjustment?.facilityCalculation ||
      candidate?.controlCenterFacilityCalculation,
    controlCenterOperatorCalculation:
      controlCenterAdjustment?.operatorCalculation ||
      candidate?.controlCenterOperatorCalculation,
    sameShiftBindings:
      controlCenterAdjustment?.sameShiftBindings ||
      candidate?.sameShiftBindings ||
      [],
    ...(closureCalculation
      ? {
          closureCalculation,
        }
      : {}),
    ...(candidate?.teamCalculation
      ? {
          teamCalculation: {
            ...candidate.teamCalculation,
            result: teamCalculationResult,
          },
        }
      : {}),
    ...(automationResult
      ? {
          localBonusPercent: bonusPercent,
          manufacturePercent: bonusPercent,
          automationCalculation: automationResult,
        }
      : {}),
    ...(shamareResult
      ? {
          shamareCalculation: shamareResult,
        }
      : {}),
    ...(closureCalculation || butshuResult
      ? {
          publishedEquivalentByProduct: {
            ...(candidate?.publishedEquivalentByProduct || {}),
            ...(closureCalculation
              ? { gold: closureCalculation.goldEquivalentProductionPercent }
              : Object.hasOwn(butshuResult, "gold")
              ? { gold: butshuResult.gold }
              : {}),
          },
        }
      : {}),
  };
}

export function createRiicEmptyRoomTeamCandidate({
  key,
  roomType = "",
  slotCount = 0,
} = {}) {
  const expectedSlots = Math.max(0, Number(slotCount) || 0);

  return {
    key: `empty:${key || roomType || "room"}`,
    name: "空位",
    operatorIds: [],
    operators: [],
    sourceRoomType: roomType,
    corePercent: 0,
    totalPercent: 0,
    bonusPercent: -100,
    bestAvailableTotalPercent: 0,
    fallback: {
      count: expectedSlots,
      operators: [],
      materialized: false,
    },
    incomplete: true,
  };
}

export function mergeRiicIndividualRoomTeamCandidates(candidates) {
  const operatorIds = [
    ...new Set(
      candidates.flatMap((candidate) => candidate?.operatorIds || []),
    ),
  ];
  const totalPercent =
    candidates.reduce(
      (total, candidate) => total + Number(candidate?.totalPercent || 0),
      0,
    ) / Math.max(candidates.length, 1);

  return {
    key: `individual:${candidates.map((candidate) => candidate.key).join("+")}`,
    name: candidates.map((candidate) => candidate.name).join(" + "),
    members: candidates.flatMap((candidate) => candidate?.members || []),
    operatorIds,
    operators: candidates.flatMap((candidate) => candidate?.operators || []),
    coreUpgradeRequirements: mergeRiicUpgradeRequirements(
      candidates.flatMap(
        (candidate) => candidate?.coreUpgradeRequirements || [],
      ),
    ),
    upgradeRequirements: mergeRiicUpgradeRequirements(
      candidates.flatMap((candidate) => candidate?.upgradeRequirements || []),
    ),
    sourceRoomType: "meeting",
    corePercent: totalPercent,
    totalPercent,
    bonusPercent: totalPercent - 100,
    fallback: {
      count: 0,
      operators: [],
      materialized: true,
    },
    selectionMode: "individual",
  };
}
