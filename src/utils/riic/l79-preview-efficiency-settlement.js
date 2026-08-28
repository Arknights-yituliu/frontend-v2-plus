import RIIC_BASELINE_SKILL_RULES from "../../static/json/tools/R00-baseline.json" with {
  type: "json",
};
import RIIC_CONTROL_CENTER_SKILLS from "../../static/json/tools/riic-candidates/R50-control.json" with {
  type: "json",
};
import {
  calculateRiicRoomEfficiency,
  resolveRiicBaselineSkills,
} from "./P05-baseline-skill.js";
import {
  getRiicLayer3ControlCenterEffects,
} from "./P09-control-center.js";
import * as RiicLayer3Rules from "./P06-condition-match.js";
import {
  settleRiicPerceptionSchedule,
} from "./P10-perception-chain.js";
import {
  getRiicSameShiftBindingBonusBreakdown,
} from "./P09-control-center.js";
import {
  applyRiicActiveRosterPreviewEffects,
} from "./P12-active-roster.js";
import { calculateRiicManufactureRoomState } from "./P13-room-state.js";
import { calculateRiicMiddleData } from "./P14-middle-data.js";
import { sumRiicRoomEfficiency } from "./P08-room-efficiency.js";
import { getRiicEffectivePowerPlantCount } from "./P11-automation-skill.js";
import { createRiicScheduleContext } from "./P50-schedule-context.js";
import { resolveRiicOperatorIdByName } from "./riic-operator-identity.js";
import { getRiicOperatorTags } from "./riic-operator-tags.js";
import {
  calculateRiicTradingRoom,
  createRiicOperatorRosterById,
  createRiicTradingFacilityContext,
} from "./P01-riic-trading.js";
import { calculateRiicTradingDrone } from "./P02-riic-trading-drone.js";
import { calculateRiicDirectProductionOutput, getRiicRoomYieldMeta } from "./P03-riic-production.js";

const BASELINE_ROOM_TYPES = new Set([
  "manufacture",
  "trading",
  "power",
  "control",
  "meeting",
  "hire",
]);
const PRODUCTIVE_ROOM_TYPES = new Set(["manufacture", "trading"]);
const AUTOMATION_POWER_SUPPORT_OPERATOR_ID = "char_1027_greyy2";
const L79_ORUNDUM_RECIPES = Object.freeze({
  orirock: Object.freeze({ material: "orirock", materialPerShard: 2, lmdPerShard: 1600 }),
  device: Object.freeze({ material: "device", materialPerShard: 1, lmdPerShard: 1000 }),
});
const L79_AUTOMATION_MANUFACTURE_SKILLS = Object.freeze({
  char_400_weedy: Object.freeze([
    Object.freeze({ eliteAtLeast: 2, percentPerPowerPlant: 15 }),
    Object.freeze({ eliteAtLeast: 0, percentPerPowerPlant: 10 }),
  ]),
  char_416_zumama: Object.freeze([
    Object.freeze({ eliteAtLeast: 2, percentPerPowerPlant: 10 }),
    Object.freeze({ eliteAtLeast: 0, percentPerPowerPlant: 5 }),
  ]),
  char_433_windft: Object.freeze([
    Object.freeze({ eliteAtLeast: 2, percentPerPowerPlant: 5 }),
  ]),
  char_472_pasngr: Object.freeze([
    Object.freeze({ eliteAtLeast: 2, percentPerPowerPlant: 5 }),
  ]),
});

function isEmptyProductiveRoom(room) {
  return (
    PRODUCTIVE_ROOM_TYPES.has(String(room?.facility || "").trim()) &&
    !(room?.operators || []).some((operator) =>
      String(operator?.charId || operator?.name || "").trim(),
    )
  );
}

function toNonNegativeInteger(value, fallback = null) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function toPositiveNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeFacility(value) {
  const facility = String(value || "").trim();
  return facility === "office" ? "hire" : facility;
}

function normalizeMaaProduct(facility, value) {
  const product = String(value || "").trim().toLowerCase();
  if (facility === "trading") {
    if (product === "orundum") {
      return "orundum";
    }
    return product === "lmd" ? "lmd" : "";
  }
  if (facility !== "manufacture") {
    return "all";
  }

  return {
    "battle record": "experience",
    experience: "experience",
    "pure gold": "gold",
    gold: "gold",
    "originium shard": "orundum",
    orundum: "orundum",
  }[product] || "";
}

function getExpectedSlots(facility, level) {
  if (facility === "control") {
    return level === 5 ? 5 : null;
  }
  if (["manufacture", "trading"].includes(facility)) {
    return level >= 1 && level <= 3 ? level : null;
  }
  if (facility === "power" || facility === "hire") {
    return level >= 1 && level <= 3 ? 1 : null;
  }
  if (facility === "meeting") {
    return level >= 1 && level <= 3 ? (level >= 3 ? 2 : 1) : null;
  }
  return null;
}

function createIssue({
  code,
  message,
  planIndex,
  facility,
  index,
  operatorName,
  operatorId,
} = {}) {
  return {
    code: String(code || "unknown"),
    message: String(message || ""),
    ...(Number.isInteger(planIndex) ? { planIndex } : {}),
    ...(facility ? { facility } : {}),
    ...(Number.isInteger(index) ? { index } : {}),
    ...(operatorName ? { operatorName } : {}),
    ...(operatorId ? { operatorId } : {}),
  };
}

function createRoomKey(facility, index) {
  return `${normalizeFacility(facility)}:${Number(index || 0)}`;
}

function normalizeProfiles(operatorProfiles) {
  const profilesById = new Map();
  const issues = [];

  for (const source of operatorProfiles || []) {
    const charId = String(source?.charId || "").trim();
    if (!charId) {
      issues.push(
        createIssue({
          code: "invalidOperatorProfile",
          message: "operatorProfiles contains an entry without charId.",
        }),
      );
      continue;
    }

    const elite = toNonNegativeInteger(source?.elite);
    const level = toPositiveNumber(source?.level);
    const current = profilesById.get(charId);
    const currentRank =
      Number(current?.elite ?? -1) * 10000 + Number(current?.level ?? -1);
    const nextRank = Number(elite ?? -1) * 10000 + Number(level ?? -1);

    if (current && nextRank <= currentRank) {
      continue;
    }
    profilesById.set(charId, {
      charId,
      elite,
      level,
      tags: [
        ...new Set([
          ...(Array.isArray(source?.tags) ? source.tags : []),
          ...getRiicOperatorTags(charId),
        ]),
      ].filter(Boolean),
    });
  }

  return {
    profiles: [...profilesById.values()],
    profilesById,
    issues,
  };
}

function resolveRoomOperators({
  names,
  profilesById,
  planIndex,
  facility,
  index,
} = {}) {
  const issues = [];
  const operators = (Array.isArray(names) ? names : []).map((value) => {
    const name = String(value || "").trim();
    const charId = resolveRiicOperatorIdByName(name);
    const profile = profilesById.get(charId);
    const operatorIssues = [];

    if (!name) {
      operatorIssues.push(
        createIssue({
          code: "invalidOperatorName",
          message: "The room contains an empty operator name.",
          planIndex,
          facility,
          index,
        }),
      );
    } else if (!charId) {
      operatorIssues.push(
        createIssue({
          code: "unknownOperatorName",
          message: "The operator name is not available in the local table.",
          planIndex,
          facility,
          index,
          operatorName: name,
        }),
      );
    } else if (!profile) {
      operatorIssues.push(
        createIssue({
          code: "missingOperatorProfile",
          message: "The operator has no elite and level profile.",
          planIndex,
          facility,
          index,
          operatorName: name,
          operatorId: charId,
        }),
      );
    } else if (profile.elite === null || profile.level === null) {
      operatorIssues.push(
        createIssue({
          code: "incompleteOperatorProfile",
          message: "The operator profile has no valid elite or level.",
          planIndex,
          facility,
          index,
          operatorName: name,
          operatorId: charId,
        }),
      );
    }
    issues.push(...operatorIssues);

    return {
      name,
      charId,
      elite: profile?.elite ?? null,
      level: profile?.level ?? null,
      tags: profile?.tags || getRiicOperatorTags(charId),
      hasUsableProfile: Boolean(
        charId &&
          profile &&
          profile.elite !== null &&
          profile.level !== null,
      ),
      issues: operatorIssues,
    };
  });

  return { operators, issues };
}

function normalizePlan({
  sourcePlan,
  planIndex,
  profilesById,
} = {}) {
  const planIssues = [];
  const durationMinutes = toPositiveNumber(sourcePlan?.duration, 0);
  if (durationMinutes <= 0) {
    planIssues.push(
      createIssue({
        code: "invalidPlanDuration",
        message: "The plan duration is invalid; its yield weight is zero.",
        planIndex,
      }),
    );
  }

  const rooms = Object.entries(sourcePlan?.rooms || {}).flatMap(
    ([sourceFacility, sourceRooms]) =>
      (Array.isArray(sourceRooms) ? sourceRooms : []).map(
        (sourceRoom, index) => {
          const facility = normalizeFacility(sourceFacility);
          const level = toNonNegativeInteger(sourceRoom?.level);
          const product = normalizeMaaProduct(facility, sourceRoom?.product);
          const { operators, issues } = resolveRoomOperators({
            names: sourceRoom?.operators,
            profilesById,
            planIndex,
            facility,
            index,
          });
          const roomIssues = [...issues];

          if (!facility) {
            roomIssues.push(
              createIssue({
                code: "invalidFacility",
                message: "The room facility is invalid.",
                planIndex,
                index,
              }),
            );
          }
          if (BASELINE_ROOM_TYPES.has(facility) && level === null) {
            roomIssues.push(
              createIssue({
                code: "missingRoomLevel",
                message: "The room level is missing or invalid.",
                planIndex,
                facility,
                index,
              }),
            );
          }
          if (
            ["manufacture", "trading"].includes(facility) &&
            !product
          ) {
            roomIssues.push(
              createIssue({
                code: "unsupportedProduct",
                message: "The production product is missing or unsupported.",
                planIndex,
                facility,
                index,
              }),
            );
          }

          return {
            key: createRoomKey(facility, index),
            facility,
            index,
            stationIndex: index,
            stationLevel: level,
            product,
            sourceProduct: String(sourceRoom?.product || "").trim(),
            operators,
            skip: sourceRoom?.skip === true,
            issues: roomIssues,
          };
        },
      ),
  );

  return {
    index: planIndex,
    name: String(sourcePlan?.name || "").trim(),
    durationMinutes,
    durationHours: durationMinutes / 60,
    rooms,
    issues: planIssues,
  };
}

function isControlCenterSkillUnlocked(profile, skill) {
  const elite = toNonNegativeInteger(profile?.elite);
  const level = toPositiveNumber(profile?.level);
  const requiredElite = toNonNegativeInteger(skill?.elite, 0);
  const requiredLevel = toPositiveNumber(skill?.level, 1);

  return Boolean(
    elite !== null &&
      level !== null &&
      (elite > requiredElite ||
        (elite === requiredElite && level >= requiredLevel)),
  );
}

function isControlRoomEffect(effect) {
  const target = effect?.target || {};
  const scope = String(target?.scope || "").trim();
  const roomType = normalizeFacility(target?.roomType);
  return Boolean(
    ["allRooms", "operators"].includes(scope) &&
      ["trading", "manufacture", "meeting", "hire"].includes(roomType) &&
      Number.isFinite(Number(effect?.bonusPercent)),
  );
}

function isFacilityStateEffect(effect) {
  const target = effect?.target || {};
  return Boolean(
    String(target?.scope || "").trim() === "facilityState" &&
      normalizeFacility(target?.roomType) === "power" &&
      String(effect?.metric || "").trim() === "facilityCount" &&
      Number.isFinite(Number(effect?.bonusCount)),
  );
}

function hasControlConditions(effect, controlOperatorIds) {
  const requiredIds = (effect?.conditions?.controlCoassignedOperatorIds || [])
    .map((operatorId) => String(operatorId || "").trim())
    .filter(Boolean);

  return requiredIds.every((operatorId) => controlOperatorIds.has(operatorId));
}

function hasRoomOperatorRequirements(effect, rooms) {
  const requirements = Array.isArray(
    effect?.conditions?.roomOperatorRequirements,
  )
    ? effect.conditions.roomOperatorRequirements
    : [];

  return requirements.every((requirement) => {
    const facility = normalizeFacility(requirement?.facility);
    const operatorIds = new Set(
      (requirement?.operatorIds || [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean),
    );
    const minCount = Number(requirement?.minCount ?? 1);
    if (!facility || operatorIds.size === 0 || !Number.isFinite(minCount)) {
      return false;
    }

    const matchedCount = (rooms || [])
      .filter((room) => normalizeFacility(room?.facility) === facility)
      .flatMap((room) => room?.operators || [])
      .filter((operator) =>
        operatorIds.has(String(operator?.charId || "").trim()),
      ).length;
    return matchedCount >= minCount;
  });
}

function getControlEffectKey(effect) {
  const target = effect?.target || {};
  return [
    String(target?.scope || "").trim(),
    normalizeFacility(target?.roomType),
    String(target?.product || "").trim(),
    String(effect?.metric || "").trim(),
    Number(effect?.bonusPercent || 0),
    (target?.operatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean)
      .sort()
      .join(","),
    JSON.stringify(effect?.conditions || null),
  ].join(":");
}

function collectControlCenterEffects({
  rooms,
  profilesById,
  ownedOperators,
  layoutData,
  staffingData,
  planIndex,
} = {}) {
  const controlRoom = (rooms || []).find(
    (room) => room.facility === "control" && room.index === 0,
  );
  const controlOperatorIds = new Set(
    (controlRoom?.operators || [])
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );
  const effectsByKey = new Map();
  const issues = [];

  for (const operatorId of controlOperatorIds) {
    const profile = profilesById.get(operatorId);
    if (!profile || profile.elite === null || profile.level === null) {
      continue;
    }

    for (const skill of RIIC_CONTROL_CENTER_SKILLS.skills || []) {
      if (
        String(skill?.operatorId || "").trim() !== operatorId ||
        !isControlCenterSkillUnlocked(profile, skill)
      ) {
        continue;
      }

      for (const sourceEffect of skill?.resolvedEffects || []) {
        if (
          !isControlRoomEffect(sourceEffect) ||
          !hasControlConditions(sourceEffect, controlOperatorIds)
        ) {
          continue;
        }
        const key = getControlEffectKey(sourceEffect);
        effectsByKey.set(key, {
          scope: String(sourceEffect?.target?.scope || "").trim(),
          roomType: normalizeFacility(sourceEffect?.target?.roomType),
          product: String(sourceEffect?.target?.product || "").trim() || "all",
          metric: String(sourceEffect?.metric || "").trim(),
          bonusPercent: Number(sourceEffect?.bonusPercent || 0),
          affectedOperatorIds: (sourceEffect?.target?.operatorIds || [])
            .map((targetId) => String(targetId || "").trim())
            .filter(Boolean),
          sourceOperatorIds: [operatorId],
          conditions: sourceEffect?.conditions || null,
        });
      }
    }

    for (const sourceEffect of getRiicLayer3ControlCenterEffects({
      operatorId,
      ownedOperators,
      layoutData,
      staffingData,
    })) {
      if (
        !isControlRoomEffect(sourceEffect) ||
        !hasControlConditions(sourceEffect, controlOperatorIds)
      ) {
        continue;
      }
      const key = getControlEffectKey(sourceEffect);
      effectsByKey.set(key, {
        scope: String(sourceEffect?.target?.scope || "").trim(),
        roomType: normalizeFacility(sourceEffect?.target?.roomType),
        product: String(sourceEffect?.target?.product || "").trim() || "all",
        metric: String(sourceEffect?.metric || "").trim(),
        bonusPercent: Number(sourceEffect?.bonusPercent || 0),
        affectedOperatorIds: (sourceEffect?.target?.operatorIds || [])
          .map((targetId) => String(targetId || "").trim())
          .filter(Boolean),
        sourceOperatorIds: [operatorId],
        conditions: sourceEffect?.conditions || null,
      });
    }
  }

  if (!controlRoom) {
    issues.push(
      createIssue({
        code: "missingControlRoom",
        message: "No control room was supplied; control-center bonuses are zero.",
        planIndex,
      }),
    );
  }

  return {
    controlOperatorIds,
    effects: [...effectsByKey.values()],
    issues,
  };
}

function getControlCenterBonusForRoom({
  room,
  effects,
} = {}) {
  const operatorIds = new Set(
    (room?.operators || [])
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );
  const matchingEffects = (effects || []).flatMap((effect) => {
    if (
      effect.roomType !== room.facility ||
      (effect.product !== "all" && effect.product !== room.product)
    ) {
      return [];
    }

    if (effect.scope === "allRooms") {
      return [effect];
    }

    if (effect.scope !== "operators") {
      return [];
    }

    const affectedOperatorIds = (effect.affectedOperatorIds || []).filter(
      (operatorId) => operatorIds.has(operatorId),
    );
    return affectedOperatorIds.length > 0
      ? [{ ...effect, affectedOperatorIds }]
      : [];
  });
  const breakdown = getRiicSameShiftBindingBonusBreakdown({
    roomType: room?.facility,
    effects: matchingEffects,
  });

  return {
    facilityBonusPercent: Number(breakdown.facilityBonusPercent || 0),
    operatorBonusPercent: Number(breakdown.operatorBonusPercent || 0),
    operatorBonuses: breakdown.operatorBonuses || [],
    effects: matchingEffects,
  };
}

function createLayoutData(rooms) {
  const facilities = (rooms || [])
    .filter((room) => room.facility)
    .map((room) => ({
      facilityType: room.facility,
      product: room.product || "all",
      stationLevel: room.stationLevel,
    }));

  return {
    facilities,
    powerPlantCount: facilities.filter(
      (facility) => facility.facilityType === "power",
    ).length,
    tradingStationCount: facilities.filter(
      (facility) => facility.facilityType === "trading",
    ).length,
    goldManufactureStationCount: facilities.filter(
      (facility) =>
        facility.facilityType === "manufacture" &&
        facility.product === "gold",
    ).length,
    manufactureProductKindCount: new Set(
      facilities
        .filter((facility) => facility.facilityType === "manufacture")
        .map((facility) => facility.product)
        .filter((product) => product && product !== "all"),
    ).size,
  };
}

function createStaffingData(rooms) {
  return {
    staffedEliteCount: (rooms || []).filter(
      (room) =>
        String(room?.facility || "").trim() &&
        (room?.operators || []).some(
          (operator) => Number(operator?.elite) >= 1,
        ),
    ).length,
  };
}

function collectFacilityStateEffects({ rooms, profilesById } = {}) {
  const controlRoom = (rooms || []).find(
    (room) => room.facility === "control" && room.index === 0,
  );
  const controlOperatorIds = new Set(
    (controlRoom?.operators || [])
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );
  const effects = [];

  for (const operatorId of controlOperatorIds) {
    const profile = profilesById.get(operatorId);
    if (!profile || profile.elite === null || profile.level === null) {
      continue;
    }

    for (const skill of RIIC_CONTROL_CENTER_SKILLS.skills || []) {
      if (
        String(skill?.operatorId || "").trim() !== operatorId ||
        !isControlCenterSkillUnlocked(profile, skill)
      ) {
        continue;
      }

      for (const sourceEffect of skill?.resolvedEffects || []) {
        if (
          !isFacilityStateEffect(sourceEffect) ||
          !hasRoomOperatorRequirements(sourceEffect, rooms)
        ) {
          continue;
        }
        effects.push({
          facilityType: normalizeFacility(sourceEffect?.target?.roomType),
          bonusCount: Number(sourceEffect?.bonusCount || 0),
          sourceOperatorId: operatorId,
          sourceOperatorName: skill?.name || operatorId,
        });
      }
    }
  }

  return effects;
}

function getAutomationSupportState({ rooms, profilesById } = {}) {
  const powerPlantCount = (rooms || []).filter(
    (room) => room.facility === "power",
  ).length;
  const supportOperatorActive = (rooms || []).some(
    (room) =>
      room.facility === "power" &&
      room.operators.some(
        (operator) =>
          operator.charId === AUTOMATION_POWER_SUPPORT_OPERATOR_ID &&
          Number(profilesById.get(operator.charId)?.elite) >= 2,
      ),
  );
  const facilityCountAdjustments = [
    ...(supportOperatorActive
      ? [
          {
            facilityType: "power",
            bonusCount: 1,
            sourceOperatorId: AUTOMATION_POWER_SUPPORT_OPERATOR_ID,
            sourceOperatorName: "承曦格雷伊",
          },
        ]
      : []),
    ...collectFacilityStateEffects({ rooms, profilesById }),
  ];

  return {
    powerPlantCount,
    effectivePowerPlantCount: getRiicEffectivePowerPlantCount({
      powerPlantCount,
      countAdjustments: facilityCountAdjustments,
    }),
    supportOperatorActive,
    facilityCountAdjustments,
  };
}

function getL79AutomationManufactureSkill(operator) {
  const operatorId = String(operator?.charId || "").trim();
  const elite = toNonNegativeInteger(operator?.elite);
  if (!operatorId || elite === null) {
    return null;
  }

  return (
    (L79_AUTOMATION_MANUFACTURE_SKILLS[operatorId] || []).find(
      (skill) => elite >= skill.eliteAtLeast,
    ) || null
  );
}

function getL79AutomationManufactureState({ room, automationData } = {}) {
  if (room?.facility !== "manufacture") {
    return null;
  }

  const operators = (room?.operators || []).flatMap((operator) => {
    const skill = getL79AutomationManufactureSkill(operator);
    return skill
      ? [
          {
            operatorId: String(operator.charId || "").trim(),
            elite: Number(operator.elite),
            percentPerPowerPlant: skill.percentPerPowerPlant,
          },
        ]
      : [];
  });
  if (operators.length === 0) {
    return null;
  }

  const physicalPowerPlantCount = Number(
    automationData?.powerPlantCount || 0,
  );
  const effectivePowerPlantCount = Number(
    automationData?.effectivePowerPlantCount ||
      physicalPowerPlantCount,
  );

  return {
    physicalPowerPlantCount,
    effectivePowerPlantCount,
    supportOperatorActive:
      automationData?.supportOperatorActive === true,
    operators,
    operatorIds: new Set(operators.map((operator) => operator.operatorId)),
    suppressedOperatorIds: (room?.operators || [])
      .map((operator) => String(operator?.charId || "").trim())
      .filter(
        (operatorId) =>
          operatorId &&
          !operators.some((operator) => operator.operatorId === operatorId),
      ),
  };
}

function getLayer3LocalBonuses({
  room,
  ownedOperators,
  layoutData,
  staffingData,
  automationManufactureState,
} = {}) {
  const expectedSlots = getExpectedSlots(room?.facility, room?.stationLevel);
  if (!expectedSlots) {
    return [];
  }
  const scope = {
    roomType: room.facility,
    product: room.product || "all",
    stationLevel: room.stationLevel,
    slotCount: expectedSlots,
  };

  return (room?.operators || [])
    .filter((operator) => operator.charId && operator.elite !== null)
    .map((operator) => {
      const fullBonus = Number(
        RiicLayer3Rules.getRiicLayer3OperatorLocalBonus({
          operatorId: operator.charId,
          ownedOperators,
          scope,
          layoutData,
          staffingData,
        }) || 0,
      );
      const nonFacilityCountBonus = Number(
        RiicLayer3Rules.getRiicLayer3OperatorLocalBonus({
          operatorId: operator.charId,
          ownedOperators,
          scope,
          layoutData,
          staffingData,
          excludeFacilityCountBonuses: true,
        }) || 0,
      );
      const facilityCountBonus = fullBonus - nonFacilityCountBonus;
      const automationOperator = automationManufactureState?.operators.find(
        (entry) => entry.operatorId === operator.charId,
      );
      const suppressedByAutomation =
        Boolean(automationManufactureState) && !automationOperator;
      const automationVirtualPowerAdjustment = automationOperator
        ? automationOperator.percentPerPowerPlant *
          (automationManufactureState.effectivePowerPlantCount -
            automationManufactureState.physicalPowerPlantCount)
        : 0;
      const bonusPercent = suppressedByAutomation
        ? facilityCountBonus
        : fullBonus + automationVirtualPowerAdjustment;

      return {
        operatorId: operator.charId,
        bonusPercent,
        ...(automationManufactureState
          ? {
              fullBonusPercent: fullBonus,
              facilityCountBonusPercent: facilityCountBonus,
              nonFacilityCountBonusPercent: nonFacilityCountBonus,
              suppressedByAutomation,
              automationVirtualPowerAdjustment,
            }
          : {}),
      };
    })
    .filter((entry) => entry.bonusPercent !== 0);
}

function createR30Data({
  rooms,
  ownedOperators,
  layoutData,
  staffingData,
  automationData,
} = {}) {
  return {
    rooms: Object.fromEntries(
      (rooms || [])
        .filter((room) => String(room?.key || "").trim())
        .map((room) => {
          const automationManufactureState =
            getL79AutomationManufactureState({
              room,
              automationData,
            });
          return [
            room.key,
            {
              automationManufactureState,
              operatorBonuses: getLayer3LocalBonuses({
                room,
                ownedOperators,
                layoutData,
                staffingData,
                automationManufactureState,
              }),
            },
          ];
        }),
    ),
  };
}

function calculateL79Room({
  room,
  planIndex,
  resolvedSkills,
  ownedOperators,
  layoutData,
  staffingData,
  controlData,
  automationData,
  middleData,
  r30Data,
} = {}) {
  const issues = [...(room?.issues || [])];
  const expectedSlots = getExpectedSlots(room?.facility, room?.stationLevel);
  const isBaselineRoom = BASELINE_ROOM_TYPES.has(room?.facility);

  if (!isBaselineRoom) {
    return {
      ...room,
      expectedSlots: null,
      efficiency: null,
      efficiencyMetrics: {
        selectedVariant: "actual",
        actual: {
          value: null,
          status: "notApplicable",
          breakdown: {},
        },
      },
      issues,
    };
  }
  if (!expectedSlots || !room.product) {
    return {
      ...room,
      expectedSlots: expectedSlots || null,
      efficiency: 0,
      efficiencyMetrics: {
        selectedVariant: "actual",
        actual: {
          value: 0,
          status: "calculated",
          breakdown: {
            invalidRoom: true,
          },
        },
      },
      issues,
    };
  }
  if (isEmptyProductiveRoom(room)) {
    return {
      ...room,
      expectedSlots,
      efficiency: 0,
      controlCenterFacilityBonusPercent: 0,
      controlCenterOperatorBonusPercent: 0,
      controlCenterOperatorBonuses: [],
      efficiencyMetrics: {
        selectedVariant: "actual",
        actual: {
          value: 0,
          status: "calculated",
          breakdown: {
            emptyRoom: true,
            staffingBonusPercent: 0,
            layer3OperatorBonusPercent: 0,
            controlCenterFacilityBonusPercent: 0,
            controlCenterOperatorBonusPercent: 0,
          },
        },
      },
      issues,
    };
  }

  const uniqueKnownOperatorIds = [];
  const seenOperatorIds = new Set();
  for (const operator of room.operators || []) {
    if (!operator.charId || operator.elite === null || operator.level === null) {
      continue;
    }
    if (seenOperatorIds.has(operator.charId)) {
      issues.push(
        createIssue({
          code: "duplicateRoomOperator",
          message: "The repeated operator contributes zero after its first slot.",
          planIndex,
          facility: room.facility,
          index: room.index,
          operatorName: operator.name,
          operatorId: operator.charId,
        }),
      );
      continue;
    }
    seenOperatorIds.add(operator.charId);
    uniqueKnownOperatorIds.push(operator.charId);
  }

  let calculation;
  try {
    calculation = calculateRiicRoomEfficiency({
      resolvedSkills,
      roomType: room.facility,
      product: room.product,
      operatorIds: uniqueKnownOperatorIds,
      expectedSlots,
      allowPartialRoster: true,
    });
  } catch (error) {
    issues.push(
      createIssue({
        code: "roomCalculationError",
        message: String(error?.message || error),
        planIndex,
        facility: room.facility,
        index: room.index,
      }),
    );
    calculation = null;
  }

  if (!calculation?.valid) {
    return {
      ...room,
      expectedSlots,
      efficiency: 0,
      efficiencyMetrics: {
        selectedVariant: "actual",
        actual: {
          value: 0,
          status: "calculated",
          breakdown: { calculation },
        },
      },
      issues,
    };
  }

  const controlCenter = getControlCenterBonusForRoom({
    room,
    effects: controlData?.effects,
  });
  const r30RoomData = r30Data?.rooms?.[String(room?.key || "").trim()] || {};
  const automationManufactureState =
    r30RoomData.automationManufactureState ||
    getL79AutomationManufactureState({
      room,
      automationData,
    });
  let settledCalculation = calculation;

  if (automationManufactureState) {
    try {
      const automationCalculation = calculateRiicRoomEfficiency({
        resolvedSkills,
        roomType: room.facility,
        product: room.product,
        operatorIds: uniqueKnownOperatorIds.filter((operatorId) =>
          automationManufactureState.operatorIds.has(operatorId),
        ),
        expectedSlots,
        allowPartialRoster: true,
      });
      if (automationCalculation.valid) {
        settledCalculation = automationCalculation;
      } else {
        issues.push(
          createIssue({
            code: "automationRoomCalculationInvalid",
            message:
              "The automation room override could not be settled; ordinary production was retained.",
            planIndex,
            facility: room.facility,
            index: room.index,
          }),
        );
      }
    } catch (error) {
      issues.push(
        createIssue({
          code: "automationRoomCalculationError",
          message: String(error?.message || error),
          planIndex,
          facility: room.facility,
          index: room.index,
        }),
      );
    }
  }
  const layer3OperatorBonuses =
    r30RoomData.operatorBonuses ||
    getLayer3LocalBonuses({
      room,
      ownedOperators,
      layoutData,
      staffingData,
      automationManufactureState,
    });
  const layer3OperatorBonusPercent = layer3OperatorBonuses.reduce(
    (total, entry) => total + entry.bonusPercent,
    0,
  );
  const middleDataRoom =
    middleData?.rooms?.[String(room?.key || "").trim()] || {
      variables: {},
      operatorBonuses: [],
      storageContributions: [],
    };
  const middleDataOperatorBonuses = (
    middleDataRoom.operatorBonuses || []
  ).filter(
    (entry) =>
      !automationManufactureState ||
      automationManufactureState.operatorIds.has(entry.operatorId),
  );
  const middleDataBonusPercent = middleDataOperatorBonuses.reduce(
    (total, entry) => total + Number(entry.bonusPercent || 0),
    0,
  );
  const roomStateCalculation =
    room.facility === "manufacture"
      ? calculateRiicManufactureRoomState({
          roomOperators: room.operators.filter((operator) =>
            uniqueKnownOperatorIds.includes(operator.charId),
          ),
          product: room.product,
          ruleData: RIIC_BASELINE_SKILL_RULES,
          middleDataStorageContributions:
            middleDataRoom.storageContributions,
        })
      : null;
  const manufactureProductionOverride =
    roomStateCalculation?.productionOverride;
  if (manufactureProductionOverride?.clearTeammateProduction) {
    const localBonusPercent = Number(
      manufactureProductionOverride.localBonusPercent || 0,
    );
    settledCalculation = {
      ...settledCalculation,
      bonusPercent: localBonusPercent,
      totalPercent: 100 + localBonusPercent,
      localBonusPercent,
      localTotalPercent: 100 + localBonusPercent,
      downstreamEffects: [],
      downstreamBonusPercent: 0,
      downstreamBonusPercentByRoom: {},
      appliedRules: [
        {
          id: manufactureProductionOverride.formulaId,
          ownerCharId: manufactureProductionOverride.charId,
          kind: "roomStateOverride",
          percent: localBonusPercent,
          operatorCount: manufactureProductionOverride.operatorCount,
          percentPerOperator:
            manufactureProductionOverride.percentPerOperator,
          coverage: "complete",
        },
      ],
    };
  }
  const roomStateBonusPercent = Number(
    roomStateCalculation?.productionBonusPercent || 0,
  );
  const staffingBonusPercent = PRODUCTIVE_ROOM_TYPES.has(room.facility)
    ? (room.operators || []).length
    : 0;
  const value = sumRiicRoomEfficiency({
    localPercent: settledCalculation.localTotalPercent,
    staffingPercent: staffingBonusPercent,
    localBonusPercent:
      layer3OperatorBonusPercent +
      roomStateBonusPercent +
      middleDataBonusPercent,
    controlFacilityPercent: controlCenter.facilityBonusPercent,
    controlOperatorPercent: controlCenter.operatorBonusPercent,
  });

  return {
    ...room,
    expectedSlots,
    efficiency: value,
    controlCenterFacilityBonusPercent: controlCenter.facilityBonusPercent,
    controlCenterOperatorBonusPercent: controlCenter.operatorBonusPercent,
    controlCenterOperatorBonuses: controlCenter.operatorBonuses,
    efficiencyMetrics: {
      selectedVariant: "actual",
      actual: {
        value,
        status: "calculated",
        breakdown: {
          calculation: settledCalculation,
          ...(automationManufactureState
            ? {
                beforeAutomationCalculation: calculation,
                automationManufactureSettlement: {
                  physicalPowerPlantCount:
                    automationManufactureState.physicalPowerPlantCount,
                  effectivePowerPlantCount:
                    automationManufactureState.effectivePowerPlantCount,
                  supportOperatorActive:
                    automationManufactureState.supportOperatorActive,
                  operators: automationManufactureState.operators,
                  suppressedOperatorIds:
                    automationManufactureState.suppressedOperatorIds,
                },
              }
            : {}),
          staffingBonusPercent,
          layer3OperatorBonusPercent,
          layer3OperatorBonuses,
          middleDataBonusPercent,
          middleDataOperatorBonuses,
          middleDataRoom,
          middleData,
          roomStateBonusPercent,
          roomStateCalculation,
          controlCenterFacilityBonusPercent:
            controlCenter.facilityBonusPercent,
          controlCenterOperatorBonusPercent:
            controlCenter.operatorBonusPercent,
          controlCenterEffects: controlCenter.effects,
        },
      },
    },
    issues,
  };
}

function createPerceptionResourceData(rooms) {
  const dormitories = (rooms || []).filter(
    (room) => room.facility === "dormitory",
  );
  const dormitoryLevels = dormitories
    .map((room) => room.stationLevel)
    .filter((level) => Number.isInteger(level) && level >= 0);

  return {
    dormitoryOccupantCount: dormitories.length * 5,
    dormitoryLevel:
      dormitoryLevels.length > 0 ? Math.max(...dormitoryLevels) : null,
    assumeDormitorySupport: true,
    dormitorySupportOccupantCount: 5,
    duskMoodAbove12: true,
    lingMoodAbove12: true,
  };
}

function applyResourceChainSettlement({ preview, settlement } = {}) {
  const bonusesByPlanAndRoom = new Map(
    (settlement?.states || []).flatMap((state) =>
      (state?.results || []).map((result) => [
        `${Number(state?.index || 0)}:${String(result?.roomKey || "")}`,
        Number(result?.additionalBonusPercent || 0),
      ]),
    ),
  );

  return {
    ...(preview || {}),
    states: (preview?.states || []).map((state) => ({
      ...state,
      rooms: (state?.rooms || []).map((room) => {
        const resourceChainAdditionalBonusPercent = Number(
          bonusesByPlanAndRoom.get(
            `${Number(state?.index || 0)}:${String(room?.key || "")}`,
          ) || 0,
        );
        if (
          isEmptyProductiveRoom(room) ||
          resourceChainAdditionalBonusPercent === 0 ||
          !Number.isFinite(Number(room?.efficiency))
        ) {
          return {
            ...room,
            resourceChainAdditionalBonusPercent,
          };
        }

        return {
          ...room,
          efficiency:
            Number(room.efficiency) + resourceChainAdditionalBonusPercent,
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
                resourceChainAdditionalBonusPercent,
              },
            },
          },
        };
      }),
    })),
  };
}

function getPerceptionState(perceptionSettlement, state) {
  const stateIndex = Number(state?.index);
  if (!Number.isInteger(stateIndex)) {
    return null;
  }

  return (
    (perceptionSettlement?.states || []).find(
      (candidate) => Number(candidate?.index) === stateIndex,
    ) || null
  );
}

function applyTradingSettlement({
  preview,
  operatorProfiles,
  perceptionSettlement,
} = {}) {
  const rosterById = createRiicOperatorRosterById(operatorProfiles);

  return {
    ...(preview || {}),
    states: (preview?.states || []).map((state) => {
      const durationHours = Number(state?.durationHours || 0);
      const tradingContext = createRiicTradingFacilityContext({
        stateRooms: state?.rooms || [],
        perceptionState: getPerceptionState(perceptionSettlement, state),
      });

      return {
        ...state,
        rooms: (state?.rooms || []).map((room) => {
          if (String(room?.facility || "").trim() !== "trading") {
            return room;
          }

          const calculation = calculateRiicTradingRoom({
            room,
            rosterById,
            tradingContext,
            durationHours,
          });
          const calculationWarnings = [
            ...(calculation?.warnings || []),
            ...(calculation?.error
              ? [{ code: calculation.error }]
              : []),
          ];
          const tradingSettlement = {
            status: "calculated",
            error: calculation?.error || "",
            warnings: calculationWarnings,
            calculation,
          };

          const value = Number.isFinite(Number(calculation?.rate))
            ? Number(calculation.rate)
            : 0;
          return {
            ...room,
            efficiency: value,
            tradingSettlement,
            efficiencyMetrics: {
              ...(room.efficiencyMetrics || {}),
              selectedVariant: "actual",
              actual: {
                ...(room.efficiencyMetrics?.actual || {}),
                value,
                status: "calculated",
                breakdown: {
                  ...(room.efficiencyMetrics?.actual?.breakdown || {}),
                  tradingSettlement,
                },
              },
            },
          };
        }),
      };
    }),
  };
}

function createL79FlowValues() {
  return {
    lmd: 0,
    exp: 0,
    gold: 0,
    vgold: 0,
    orundum: 0,
    shard: 0,
    orirock: 0,
    device: 0,
    recruitmentRefresh: 0,
  };
}

function normalizeL79CraftMaterial(value) {
  return L79_ORUNDUM_RECIPES[String(value || "").trim()] ? String(value).trim() : "orirock";
}

function getL79EfficiencyTypes(facility, value) {
  const efficiency = Number(value);
  const types = {
    trading: null,
    manufacture: null,
    power: null,
    office: null,
    meeting: null,
  };
  if (!Number.isFinite(efficiency)) {
    return types;
  }
  if (facility === "hire") {
    types.office = efficiency;
  } else if (Object.prototype.hasOwnProperty.call(types, facility)) {
    types[facility] = efficiency;
  }
  return types;
}

function createL79RoomSettlement({
  room,
  orundumCraftMaterial = "orirock",
} = {}) {
  const facility = String(room?.facility || "").trim();
  const product = String(room?.product || "").trim();
  const efficiencyStatus = String(
    room?.efficiencyMetrics?.actual?.status || "",
  ).trim();
  const efficiency = Number(room?.efficiency);
  const hourly = createL79FlowValues();
  const perDrone = createL79FlowValues();
  const meta = getRiicRoomYieldMeta(room);
  const messages = [];
  let calculationStatus = "calculated";

  const addMessage = (level, text) => {
    if (text) {
      messages.push({ level, text });
    }
  };

  if (facility === "trading") {
    const calculation = room?.tradingSettlement?.calculation;
    if (calculation?.warning || calculation?.error) {
      addMessage(
        "warning",
        `贸易站部分规则按0处理：${(calculation.warnings || [])
          .map((warning) => warning.code)
          .filter(Boolean)
          .join(", ") || calculation.error}`,
      );
    }
    if (!calculation?.ok) {
      addMessage(
        "warning",
        `贸易站资源流按0处理：${calculation?.error || "unknown"}`,
      );
    } else if (product === "lmd") {
      hourly.lmd = Number(calculation.lmd || 0);
      hourly.gold = Number(calculation.gold || 0);
      hourly.vgold = Number(calculation.virtualGold || 0);
    } else if (product === "orundum") {
      hourly.orundum = Number(calculation.orundumCapacity || 0);
      hourly.shard = -Number(calculation.shardConsumption || 0);
    } else {
      addMessage("warning", "贸易站产品不在统一资源流支持范围内。");
    }

    const p01Operators =
      calculation?.inputDiagnostics?.p01Operators ||
      (room?.operators || []).map((operator) => ({
        charId: operator?.charId,
        elite: operator?.elite,
        level: operator?.level,
      }));
    const drone = calculateRiicTradingDrone(
      { type: "trading", product, level: Number(room?.stationLevel) },
      p01Operators,
    );
    if (drone?.ok) {
      if (product === "lmd") {
        perDrone.lmd = Number(drone.lmdOutput || 0);
        perDrone.gold = -Number(drone.goldConsumption || 0);
      } else if (product === "orundum") {
        perDrone.orundum = Number(drone.orundumOutput || 0);
        perDrone.shard = -Number(drone.shardConsumption || 0);
      }
    } else {
      addMessage("warning", `贸易站无人机系数不可用：${drone?.error || "unknown"}`);
    }
  } else if (facility === "manufacture") {
    if (efficiencyStatus !== "calculated") {
      addMessage("warning", "制造站效率异常，产出按0处理。");
    }
    const output = calculateRiicDirectProductionOutput({
      room,
      efficiency,
      durationHours: 1,
      meta,
    });
    if (Number.isFinite(Number(output))) {
      if (product === "experience") {
        hourly.exp = Number(output);
        perDrone.exp = 1000 / 60;
      } else if (product === "gold") {
        hourly.gold = Number(output);
        perDrone.gold = 1 / 24;
      } else if (product === "orundum") {
        const material = normalizeL79CraftMaterial(orundumCraftMaterial);
        const recipe = L79_ORUNDUM_RECIPES[material];
        hourly.shard = Number(output);
        hourly.lmd = -hourly.shard * recipe.lmdPerShard;
        hourly[material] = -hourly.shard * recipe.materialPerShard;
        perDrone.shard = 1 / 20;
        perDrone.lmd = -perDrone.shard * recipe.lmdPerShard;
        perDrone[material] = -perDrone.shard * recipe.materialPerShard;
      } else {
        addMessage("warning", "制造站产品不在统一资源流支持范围内。");
      }
    } else {
      addMessage("warning", "制造站产出无法根据当前效率计算。");
    }
  } else if (facility === "hire") {
    if (efficiencyStatus !== "calculated") {
      addMessage("warning", "办公室效率异常，产出按0处理。");
    }
    const output = calculateRiicDirectProductionOutput({
      room,
      efficiency,
      durationHours: 1,
      meta,
    });
    if (Number.isFinite(Number(output))) {
      hourly.recruitmentRefresh = Number(output);
    } else {
      addMessage("warning", "办公室产出无法根据当前效率计算。");
    }
  }

  return {
    roomId: String(room?.key || "").trim(),
    type: facility,
    level: Number(room?.stationLevel) || null,
    productionId: product || "all",
    operatorIds: (room?.operators || [])
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
    calculationStatus,
    efficiency: getL79EfficiencyTypes(facility, efficiency),
    hourly,
    perDrone,
    message: messages,
  };
}

function createL79CalculationTrace(room) {
  const breakdown = room?.efficiencyMetrics?.actual?.breakdown || {};
  const numberOrNull = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const steps = [];
  const addStep = ({
    key,
    label,
    kind = "detail",
    value,
    details = null,
  }) => {
    const normalizedValue = numberOrNull(value);
    if (normalizedValue === null && !details) {
      return;
    }
    steps.push({
      key,
      label,
      kind,
      ...(normalizedValue === null ? {} : { value: normalizedValue }),
      ...(details ? { details } : {}),
    });
  };

  const tradingCalculation = breakdown.tradingSettlement?.calculation;
  const finalRosterCalculation = breakdown.finalRosterCalculation;
  const closureCalculation = breakdown.closureCalculation;
  const calculation = breakdown.calculation || {};
  const mode = tradingCalculation
    ? "trading"
    : closureCalculation
      ? "closure"
      : finalRosterCalculation
        ? "finalRoster"
        : breakdown.automationManufactureSettlement
          ? "automation"
          : "additive";

  addStep({
    key: "core",
    label:
      mode === "trading"
        ? "贸易站订单计算"
        : mode === "closure"
          ? "特别订单等效计算"
          : mode === "finalRoster"
            ? "最终名单计算"
            : mode === "automation"
              ? "自动化技能计算"
              : "房间核心计算",
    kind: "base",
    value:
      tradingCalculation?.rate ??
      finalRosterCalculation?.value ??
      closureCalculation?.tradeEquivalentTotalPercent ??
      calculation.localTotalPercent ??
      calculation.totalPercent,
    details:
      tradingCalculation ||
      finalRosterCalculation ||
      closureCalculation ||
      calculation,
  });
  addStep({
    key: "staffing",
    label: "在岗基础",
    kind: "add",
    value: breakdown.staffingBonusPercent,
  });
  addStep({
    key: "roomState",
    label: "房间状态",
    kind: "add",
    value: breakdown.roomStateBonusPercent,
    details: breakdown.roomStateCalculation,
  });
  addStep({
    key: "middleData",
    label: "中间变量",
    kind: "add",
    value: breakdown.middleDataBonusPercent,
    details: {
      variables: breakdown.middleDataRoom?.variables || {},
      operatorBonuses: breakdown.middleDataOperatorBonuses || [],
      storageContributions:
        breakdown.middleDataRoom?.storageContributions || [],
    },
  });
  addStep({
    key: "layer3",
    label: "L3 当前班组",
    kind: "add",
    value: breakdown.layer3OperatorBonusPercent,
    details: breakdown.layer3OperatorBonuses,
  });
  addStep({
    key: "controlFacility",
    label: "中枢房间加成",
    kind: "add",
    value: breakdown.controlCenterFacilityBonusPercent,
  });
  addStep({
    key: "controlOperator",
    label: "中枢指定干员加成",
    kind: "add",
    value: breakdown.controlCenterOperatorBonusPercent,
    details: breakdown.controlCenterEffects,
  });
  addStep({
    key: "activeRoster",
    label: "当前班组联动",
    kind: "add",
    value: breakdown.activeRosterBonusPercent,
    details: breakdown.activeRosterEffects,
  });
  addStep({
    key: "resourceChain",
    label: "资源链额外加成",
    kind: "add",
    value: breakdown.resourceChainAdditionalBonusPercent,
  });
  addStep({
    key: "final",
    label: "最终效率",
    kind: "result",
    value: room?.efficiency,
  });

  return {
    version: 1,
    mode,
    finalValue: numberOrNull(room?.efficiency),
    steps,
  };
}

function attachL79RoomSettlements({
  preview,
  orundumCraftMaterial,
} = {}) {
  const states = (preview?.states || []).map((state) => ({
    ...state,
    rooms: (state?.rooms || []).map((room) => {
      const calculationTrace = createL79CalculationTrace(room);
      return {
        ...room,
        efficiencyMetrics: {
          ...(room.efficiencyMetrics || {}),
          actual: {
            ...(room.efficiencyMetrics?.actual || {}),
            breakdown: {
              ...(room.efficiencyMetrics?.actual?.breakdown || {}),
              calculationTrace,
            },
          },
        },
        l79Settlement: createL79RoomSettlement({
          room,
          orundumCraftMaterial,
        }),
      };
    }),
  }));
  const roomSettlements = states.flatMap((state) =>
    (state.rooms || []).map((room) => room.l79Settlement),
  );
  return {
    ...preview,
    calculationStatus: "calculated",
    states,
  };
}

function summarizeRooms(states) {
  const summaries = new Map();

  for (const state of states || []) {
    const durationHours = Number(state?.durationHours || 0);
    for (const room of state?.rooms || []) {
      const summary = summaries.get(room.key) || {
        key: room.key,
        facility: room.facility,
        index: room.index,
        product: room.product,
        durationHours: 0,
        efficiencyPercentHours: 0,
        calculatedDurationHours: 0,
        issues: [],
      };
      summary.durationHours += durationHours;
      summary.issues.push(...(room.issues || []));
      if (durationHours > 0) {
        summary.calculatedDurationHours += durationHours;
        summary.efficiencyPercentHours += Number(room.efficiency || 0) * durationHours;
      }
      summaries.set(room.key, summary);
    }
  }

  return [...summaries.values()].map((summary) => ({
    ...summary,
    averageEfficiencyPercent:
      summary.calculatedDurationHours > 0
        ? summary.efficiencyPercentHours / summary.calculatedDurationHours
        : 0,
    isCalculated: true,
  }));
}

/**
 * L79 final settlement. It receives only MAA-style plans plus the approved
 * operator profiles, then rebuilds all calculation state from that input.
 */
export function settleRiicMaaScheduleEfficiency({
  schedule,
  operatorProfiles = [],
  orundumCraftMaterial = "orirock",
} = {}) {
  const scheduleContext = createRiicScheduleContext({
    schedule,
    operatorProfiles,
  });
  const profileState = normalizeProfiles(operatorProfiles);
  const normalizedPlans = (scheduleContext.schedule?.plans || []).map(
    (plan, planIndex) =>
      normalizePlan({
        sourcePlan: plan,
        planIndex,
        profilesById: profileState.profilesById,
      }),
  );
  const resolvedSkills = resolveRiicBaselineSkills(
    profileState.profiles,
    RIIC_BASELINE_SKILL_RULES,
  );
  const preliminaryPreview = {
    states: normalizedPlans.map((plan) => ({
      index: plan.index,
      name: plan.name,
      durationMinutes: plan.durationMinutes,
      durationHours: plan.durationHours,
      rooms: plan.rooms,
    })),
  };
  const layoutData = createLayoutData(normalizedPlans[0]?.rooms || []);
  const preliminaryPerceptionSettlement = settleRiicPerceptionSchedule({
    preview: preliminaryPreview,
    ownedOperators: profileState.profiles,
    resourceData: createPerceptionResourceData(
      normalizedPlans[0]?.rooms || [],
    ),
  });
  const states = normalizedPlans.map((plan) => {
    const staffingData = createStaffingData(plan.rooms);
    const automationData = getAutomationSupportState({
      rooms: plan.rooms,
      profilesById: profileState.profilesById,
    });
    const controlData = collectControlCenterEffects({
      rooms: plan.rooms,
      profilesById: profileState.profilesById,
      ownedOperators: profileState.profiles,
      layoutData,
      staffingData,
      planIndex: plan.index,
    });
    const r30Data = createR30Data({
      rooms: plan.rooms,
      ownedOperators: profileState.profiles,
      layoutData,
      staffingData,
      automationData,
    });
    const middleData = calculateRiicMiddleData({
      rooms: plan.rooms,
      ruleData: RIIC_BASELINE_SKILL_RULES,
      resolvedSkills,
      resourceValues:
        getPerceptionState(preliminaryPerceptionSettlement, plan)?.resources ||
        {},
    });
    const rooms = plan.rooms.map((room) =>
      calculateL79Room({
        room,
        planIndex: plan.index,
        resolvedSkills,
        ownedOperators: profileState.profiles,
        layoutData,
        staffingData,
        controlData,
        automationData,
        middleData,
        r30Data,
      }),
    );

    return {
      index: plan.index,
      name: plan.name,
      durationMinutes: plan.durationMinutes,
      durationHours: plan.durationHours,
      rooms,
      middleData,
      issues: [...plan.issues, ...controlData.issues],
      assumptions: {
        effectivePowerPlantCount: automationData.effectivePowerPlantCount,
        powerPlantCount: automationData.powerPlantCount,
        automationPowerSupportActive:
          automationData.supportOperatorActive,
        facilityCountAdjustments:
          automationData.facilityCountAdjustments,
        ...createPerceptionResourceData(plan.rooms),
      },
    };
  });
  const basePreview = {
    cycleHours: states.reduce(
      (total, state) => total + Number(state.durationHours || 0),
      0,
    ),
    states,
  };
  const previewWithActiveRosterEffects = applyRiicActiveRosterPreviewEffects({
    preview: basePreview,
    ownedOperators: profileState.profiles,
  });
  const perceptionSettlement = settleRiicPerceptionSchedule({
    preview: previewWithActiveRosterEffects,
    ownedOperators: profileState.profiles,
    resourceData: createPerceptionResourceData(
      states[0]?.rooms || [],
    ),
  });
  const preview = applyResourceChainSettlement({
    preview: previewWithActiveRosterEffects,
    settlement: perceptionSettlement,
  });
  const settledPreview = applyTradingSettlement({
    preview,
    operatorProfiles: profileState.profiles,
    perceptionSettlement,
  });
  const settledPreviewWithResources = attachL79RoomSettlements({
    preview: settledPreview,
    orundumCraftMaterial,
  });
  const issues = [
    ...profileState.issues,
    ...settledPreviewWithResources.states.flatMap((state) => [
      ...(state.issues || []),
      ...(state.rooms || []).flatMap((room) => room.issues || []),
    ]),
    ...(perceptionSettlement?.states || []).flatMap((state) =>
      (state?.unavailableSources || []).map((source) =>
        createIssue({
          code: String(source?.reason || "perceptionSourceUnavailable"),
          message: "A perception source could not be applied.",
          planIndex: Number(state?.index || 0),
          operatorId: String(source?.operatorId || "").trim(),
        }),
      ),
    ),
  ];

  return {
    cycleHours: settledPreviewWithResources.cycleHours,
    status: "calculated",
    calculationStatus: settledPreviewWithResources.calculationStatus,
    plans: settledPreviewWithResources.states.map((state) => ({
      durationMinutes: state.durationMinutes,
      rooms: state.rooms,
      issues: state.issues,
    })),
    states: settledPreviewWithResources.states,
    rooms: summarizeRooms(settledPreviewWithResources.states),
    issues,
    perceptionSettlement,
    crossFacilityResourceFlow: (perceptionSettlement?.states || []).map(
      (state, index) => ({
        shift: index + 1,
        perceptionInformation: Number(
          state?.resources?.perceptionInformation || 0,
        ),
        silentResonance: Number(state?.resources?.silentResonance || 0),
        humanFireworks: Number(state?.resources?.humanFireworks || 0),
      }),
    ),
    preview: settledPreviewWithResources,
  };
}
