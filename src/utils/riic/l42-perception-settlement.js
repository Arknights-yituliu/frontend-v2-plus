import {
  getRiicPerceptionCoreBaseline,
} from "./l28-perception-baseline.js";

const OPERATOR_ID = Object.freeze({
  rosmontis: "char_391_rosmon",
  ebenholz: "char_4046_ebnhlz",
  whisperain: "char_436_whispr",
  bassline: "char_4109_baslin",
  alice: "char_338_iris",
  czerny: "char_4047_pianst",
  virtuosa: "char_245_cello",
  dusk: "char_2015_dusk",
  ling: "char_2023_ling",
});

export const RIIC_PERCEPTION_RESOURCE_CORES = Object.freeze([
  Object.freeze({
    operatorId: OPERATOR_ID.rosmontis,
    name: "迷迭香",
    facility: "manufacture",
  }),
  Object.freeze({
    operatorId: OPERATOR_ID.ebenholz,
    name: "黑键",
    facility: "trading",
  }),
]);

const SUPPORT_BONUS_BY_OFFICE_SLOT = Object.freeze({
  [OPERATOR_ID.whisperain]: {
    resource: "perceptionInformation",
    value: 10,
  },
  [OPERATOR_ID.bassline]: {
    resource: "silentResonance",
    value: 15,
  },
});
const DEFAULT_DORMITORY_CAPACITY_PER_ROOM = 5;

function toNonNegativeNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeFacility(value) {
  const facility = String(value || "").trim();
  return facility === "office" ? "hire" : facility;
}

function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function getRosterEliteById(ownedOperators) {
  const eliteById = new Map();

  for (const operator of ownedOperators || []) {
    const charId = normalizeOperatorId(operator?.charId);
    const elite = toNonNegativeNumber(operator?.elite);
    if (!charId || elite === null) {
      continue;
    }

    const current = eliteById.get(charId);
    if (current === undefined || elite > current) {
      eliteById.set(charId, elite);
    }
  }

  return eliteById;
}

function getRoomsByFacility(rooms) {
  const roomsByFacility = new Map();

  for (const room of rooms || []) {
    const facility = normalizeFacility(room?.facility);
    if (!facility) {
      continue;
    }

    const facilityRooms = roomsByFacility.get(facility) || [];
    facilityRooms.push(room);
    roomsByFacility.set(facility, facilityRooms);
  }

  return roomsByFacility;
}

function getOperatorPlacements(rooms) {
  const placementsByOperatorId = new Map();

  for (const room of rooms || []) {
    const facility = normalizeFacility(room?.facility);
    for (const operator of room?.operators || []) {
      const charId = normalizeOperatorId(operator?.charId);
      if (!charId) {
        continue;
      }

      const placements = placementsByOperatorId.get(charId) || [];
      placements.push({
        roomKey: String(room?.key || "").trim(),
        facility,
        stationLevel: toNonNegativeNumber(room?.stationLevel),
        operatorCount: (room?.operators || []).length,
      });
      placementsByOperatorId.set(charId, placements);
    }
  }

  return placementsByOperatorId;
}

function findPlacement(placementsByOperatorId, operatorId, facility) {
  return (placementsByOperatorId.get(operatorId) || []).find(
    (placement) => placement.facility === facility,
  );
}

function getDormitoryOccupantCount(roomsByFacility) {
  return (roomsByFacility.get("dormitory") || []).reduce(
    (total, room) => total + (room?.operators || []).length,
    0,
  );
}

function getOfficeExtraRecruitmentSlots(value) {
  return toNonNegativeNumber(value, null);
}

function getEliteStatus(eliteById, operatorId, eliteAtLeast) {
  const elite = eliteById.get(operatorId);
  if (elite === undefined) {
    return "missingOperatorElite";
  }

  return elite >= eliteAtLeast ? "ready" : "skillNotUnlocked";
}

function getHighestDormitoryLevel(roomsByFacility) {
  const levels = (roomsByFacility.get("dormitory") || [])
    .map((room) => toNonNegativeNumber(room?.stationLevel))
    .filter((level) => level !== null);

  return levels.length > 0 ? Math.max(...levels) : null;
}

function createSource({
  operatorId,
  resource,
  value,
  roomKey = "",
  status = "calculated",
  reason = "",
} = {}) {
  return {
    operatorId,
    resource,
    value,
    roomKey,
    status,
    reason,
  };
}

function addSource(resources, source) {
  resources[source.resource] =
    Number(resources[source.resource] || 0) + Number(source.value || 0);
}

function createExpectedPlacementChecks(expectedPlacements, placementsByOperatorId) {
  return (expectedPlacements || []).map((expected) => {
    const operatorId = normalizeOperatorId(expected?.operatorId);
    const facility = normalizeFacility(expected?.roomType);
    const placement = operatorId
      ? findPlacement(placementsByOperatorId, operatorId, facility)
      : null;

    return {
      operatorId,
      roomType: facility,
      roomKey: placement?.roomKey || "",
      satisfied: Boolean(placement),
      condition: String(expected?.condition || "").trim(),
    };
  });
}

function createStateSettlement({
  state,
  eliteById,
  ownedOperators,
  expectedPlacements,
  officeExtraRecruitmentSlots,
  controlConditionStates,
  resourceFacts = {},
}) {
  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const roomsByFacility = getRoomsByFacility(rooms);
  const placementsByOperatorId = getOperatorPlacements(rooms);
  const placementChecks = createExpectedPlacementChecks(
    expectedPlacements,
    placementsByOperatorId,
  );
  const sources = [];
  const unavailableSources = [];
  const resources = {
    perceptionInformation: 0,
    silentResonance: 0,
    humanFireworks: 0,
  };

  const rosmontisPlacement = findPlacement(
    placementsByOperatorId,
    OPERATOR_ID.rosmontis,
    "manufacture",
  );
  const ebenholzPlacement = findPlacement(
    placementsByOperatorId,
    OPERATOR_ID.ebenholz,
    "trading",
  );
  const fixedDormitoryOccupantCount = toNonNegativeNumber(
    resourceFacts?.dormitoryOccupantCount,
  );
  const fixedDormitoryLevel = toNonNegativeNumber(
    resourceFacts?.dormitoryLevel,
  );
  const dormitoryOccupantCount =
    fixedDormitoryOccupantCount ?? getDormitoryOccupantCount(roomsByFacility);
  const highestDormitoryLevel =
    fixedDormitoryLevel ?? getHighestDormitoryLevel(roomsByFacility);
  const assumeDormitorySupport =
    resourceFacts?.assumeDormitorySupport === true;
  const dormitorySupportOccupantCount =
    toNonNegativeNumber(resourceFacts?.dormitorySupportOccupantCount) ??
    DEFAULT_DORMITORY_CAPACITY_PER_ROOM;

  if (rosmontisPlacement) {
    const source = createSource({
      operatorId: OPERATOR_ID.rosmontis,
      resource: "perceptionInformation",
      value: dormitoryOccupantCount,
      roomKey: rosmontisPlacement.roomKey,
    });
    sources.push(source);
    addSource(resources, source);
  }
  if (ebenholzPlacement) {
    const source = createSource({
      operatorId: OPERATOR_ID.ebenholz,
      resource: "perceptionInformation",
      value: dormitoryOccupantCount,
      roomKey: ebenholzPlacement.roomKey,
    });
    sources.push(source);
    addSource(resources, source);
  }

  for (const [operatorId, definition] of Object.entries(
    SUPPORT_BONUS_BY_OFFICE_SLOT,
  )) {
    const placement = findPlacement(placementsByOperatorId, operatorId, "hire");
    if (!placement) {
      continue;
    }
    const eliteStatus = getEliteStatus(eliteById, operatorId, 2);
    if (eliteStatus !== "ready") {
      unavailableSources.push(
        createSource({
          operatorId,
          resource: definition.resource,
          roomKey: placement.roomKey,
          status: "unavailable",
          reason: eliteStatus,
        }),
      );
      continue;
    }
    if (officeExtraRecruitmentSlots === null) {
      unavailableSources.push(
        createSource({
          operatorId,
          resource: definition.resource,
          roomKey: placement.roomKey,
          status: "unavailable",
          reason: "missingOfficeExtraRecruitmentSlots",
        }),
      );
      continue;
    }

    const source = createSource({
      operatorId,
      resource: definition.resource,
      value: definition.value * officeExtraRecruitmentSlots,
      roomKey: placement.roomKey,
    });
    sources.push(source);
    addSource(resources, source);
  }

  for (const operatorId of [OPERATOR_ID.alice, OPERATOR_ID.czerny]) {
    const placement = findPlacement(
      placementsByOperatorId,
      operatorId,
      "dormitory",
    );
    if (!placement && !assumeDormitorySupport) {
      continue;
    }
    if (!eliteById.has(operatorId)) {
      unavailableSources.push(
        createSource({
          operatorId,
          resource: "perceptionInformation",
          roomKey: placement?.roomKey || "dormitory:assumed",
          status: "unavailable",
          reason: "missingOperatorElite",
        }),
      );
      continue;
    }
    if (
      highestDormitoryLevel === null ||
      (!assumeDormitorySupport && placement?.stationLevel === null)
    ) {
      unavailableSources.push(
        createSource({
          operatorId,
          resource: "perceptionInformation",
          roomKey: placement?.roomKey || "dormitory:assumed",
          status: "unavailable",
          reason: "missingDormitoryLevel",
        }),
      );
      continue;
    }
    if (
      !assumeDormitorySupport &&
      placement.stationLevel !== highestDormitoryLevel
    ) {
      continue;
    }

    const source = createSource({
      operatorId,
      resource: "perceptionInformation",
      value: highestDormitoryLevel,
      roomKey: placement?.roomKey || "dormitory:assumed",
    });
    sources.push(source);
    addSource(resources, source);
  }

  const virtuosaPlacement = findPlacement(
    placementsByOperatorId,
    OPERATOR_ID.virtuosa,
    "dormitory",
  );
  if (virtuosaPlacement || assumeDormitorySupport) {
    const eliteStatus = getEliteStatus(eliteById, OPERATOR_ID.virtuosa, 0);
    if (eliteStatus !== "ready") {
      unavailableSources.push(
        createSource({
          operatorId: OPERATOR_ID.virtuosa,
          resource: "silentResonance",
          roomKey: virtuosaPlacement?.roomKey || "dormitory:assumed",
          status: "unavailable",
          reason: eliteStatus,
        }),
      );
    } else {
      const source = createSource({
        operatorId: OPERATOR_ID.virtuosa,
        resource: "silentResonance",
        value:
          assumeDormitorySupport
            ? dormitorySupportOccupantCount
            : virtuosaPlacement?.operatorCount ??
              dormitorySupportOccupantCount,
        roomKey: virtuosaPlacement?.roomKey || "dormitory:assumed",
      });
      sources.push(source);
      addSource(resources, source);
    }
  }

  const duskPlacement = findPlacement(
    placementsByOperatorId,
    OPERATOR_ID.dusk,
    "control",
  );
  if (duskPlacement) {
    const eliteStatus = getEliteStatus(eliteById, OPERATOR_ID.dusk, 0);
    if (eliteStatus !== "ready") {
      unavailableSources.push(
        createSource({
          operatorId: OPERATOR_ID.dusk,
          resource: "perceptionInformation",
          roomKey: duskPlacement.roomKey,
          status: "unavailable",
          reason: eliteStatus,
        }),
      );
    } else if (controlConditionStates?.duskMoodAbove12 !== true) {
      unavailableSources.push(
        createSource({
          operatorId: OPERATOR_ID.dusk,
          resource: "perceptionInformation",
          roomKey: duskPlacement.roomKey,
          status: "unavailable",
          reason:
            controlConditionStates?.duskMoodAbove12 === false
              ? "conditionNotMet"
              : "conditionNotProvided",
        }),
      );
    } else {
      const source = createSource({
        operatorId: OPERATOR_ID.dusk,
        resource: "perceptionInformation",
        value: 10,
        roomKey: duskPlacement.roomKey,
      });
      sources.push(source);
      addSource(resources, source);
    }
  }

  const lingPlacement = findPlacement(
    placementsByOperatorId,
    OPERATOR_ID.ling,
    "control",
  );
  if (lingPlacement) {
    const eliteStatus = getEliteStatus(eliteById, OPERATOR_ID.ling, 2);
    if (eliteStatus !== "ready") {
      unavailableSources.push(
        createSource({
          operatorId: OPERATOR_ID.ling,
          resource: "humanFireworks",
          roomKey: lingPlacement.roomKey,
          status: "unavailable",
          reason: eliteStatus,
        }),
      );
    } else if (controlConditionStates?.lingMoodAbove12 !== true) {
      unavailableSources.push(
        createSource({
          operatorId: OPERATOR_ID.ling,
          resource: "humanFireworks",
          roomKey: lingPlacement.roomKey,
          status: "unavailable",
          reason:
            controlConditionStates?.lingMoodAbove12 === false
              ? "conditionNotMet"
              : "conditionNotProvided",
        }),
      );
    } else {
      const source = createSource({
        operatorId: OPERATOR_ID.ling,
        resource: "humanFireworks",
        value: 15,
        roomKey: lingPlacement.roomKey,
      });
      sources.push(source);
      addSource(resources, source);
    }
  }

  if (ebenholzPlacement) {
    const source = createSource({
      operatorId: OPERATOR_ID.ebenholz,
      resource: "silentResonance",
      value: resources.perceptionInformation,
      roomKey: ebenholzPlacement.roomKey,
    });
    sources.push(source);
    addSource(resources, source);
  }

  const results = [];
  const rosmontisElite = eliteById.get(OPERATOR_ID.rosmontis);
  if (rosmontisPlacement) {
    if (rosmontisElite === undefined) {
      unavailableSources.push(
        createSource({
          operatorId: OPERATOR_ID.rosmontis,
          roomKey: rosmontisPlacement.roomKey,
          status: "unavailable",
          reason: "missingOperatorElite",
        }),
      );
    } else {
      const baseline = getRiicPerceptionCoreBaseline({
        operatorId: OPERATOR_ID.rosmontis,
        elite: rosmontisElite,
        ownedOperators,
        dormitoryOccupantCount,
        dormitoryLevel: highestDormitoryLevel,
      });
      const bonusPercent =
        rosmontisElite >= 2
          ? resources.perceptionInformation
          : Math.floor(resources.perceptionInformation / 2);
      results.push({
        operatorId: OPERATOR_ID.rosmontis,
        roomKey: rosmontisPlacement.roomKey,
        facility: "manufacture",
        resource: "perceptionInformation",
        resourceValue: resources.perceptionInformation,
        bonusPercent,
        baselineBonusPercent: baseline.bonusPercent,
        additionalBonusPercent: bonusPercent - baseline.bonusPercent,
      });
    }
  }

  const ebenholzElite = eliteById.get(OPERATOR_ID.ebenholz);
  if (ebenholzPlacement) {
    if (ebenholzElite === undefined) {
      unavailableSources.push(
        createSource({
          operatorId: OPERATOR_ID.ebenholz,
          roomKey: ebenholzPlacement.roomKey,
          status: "unavailable",
          reason: "missingOperatorElite",
        }),
      );
    } else {
      const baseline = getRiicPerceptionCoreBaseline({
        operatorId: OPERATOR_ID.ebenholz,
        elite: ebenholzElite,
        ownedOperators,
        dormitoryOccupantCount,
        dormitoryLevel: highestDormitoryLevel,
      });
      const bonusPercent =
        ebenholzElite >= 2
          ? Math.floor(resources.silentResonance / 2)
          : Math.floor(resources.silentResonance / 4);
      results.push({
        operatorId: OPERATOR_ID.ebenholz,
        roomKey: ebenholzPlacement.roomKey,
        facility: "trading",
        resource: "silentResonance",
        resourceValue: resources.silentResonance,
        bonusPercent,
        baselineBonusPercent: baseline.bonusPercent,
        additionalBonusPercent: bonusPercent - baseline.bonusPercent,
      });
    }
  }

  return {
    index: Number.isInteger(state?.index) ? state.index : 0,
    startHour: toNonNegativeNumber(state?.startHour, 0),
    durationHours: toNonNegativeNumber(state?.durationHours, 0),
    status:
      results.length > 0
        ? unavailableSources.length > 0
          ? "partial"
          : "calculated"
        : "notApplicable",
    dormitoryOccupantCount,
    highestDormitoryLevel,
    placementChecks,
    expectedPlacementsSatisfied: placementChecks.every(
      (check) => check.satisfied,
    ),
    sources,
    unavailableSources,
    resources,
    results,
  };
}

function summarizeRooms(states) {
  const summaries = new Map();

  for (const state of states) {
    for (const result of state.results) {
      const summary = summaries.get(result.roomKey) || {
        roomKey: result.roomKey,
        facility: result.facility,
        durationHours: 0,
        bonusPercentHours: 0,
        additionalBonusPercentHours: 0,
      };
      summary.durationHours += state.durationHours;
      summary.bonusPercentHours += result.bonusPercent * state.durationHours;
      summary.additionalBonusPercentHours +=
        Number(result.additionalBonusPercent || 0) * state.durationHours;
      summaries.set(result.roomKey, summary);
    }
  }

  return [...summaries.values()].map((summary) => ({
    ...summary,
    averageBonusPercent:
      summary.durationHours > 0
        ? summary.bonusPercentHours / summary.durationHours
        : 0,
    averageAdditionalBonusPercent:
      summary.durationHours > 0
        ? summary.additionalBonusPercentHours / summary.durationHours
        : 0,
  }));
}

/**
 * L42: read-only settlement for perception-resource chains in an assembled
 * schedule. It is intentionally separate from candidate ranking and only
 * reports bonuses that are actually supported by each preview state.
 */
export function settleRiicPerceptionSchedule({
  preview,
  ownedOperators = [],
  expectedPlacements = [],
  officeExtraRecruitmentSlots,
  controlConditionStates = {},
  resourceFacts = {},
} = {}) {
  const states = Array.isArray(preview?.states) ? preview.states : [];
  const eliteById = getRosterEliteById(ownedOperators);
  const normalizedOfficeExtraRecruitmentSlots =
    getOfficeExtraRecruitmentSlots(officeExtraRecruitmentSlots);
  const settledStates = states.map((state) =>
    createStateSettlement({
      state,
      eliteById,
      ownedOperators,
      expectedPlacements,
      officeExtraRecruitmentSlots:
        toNonNegativeNumber(resourceFacts?.officeExtraRecruitmentSlots) ??
        normalizedOfficeExtraRecruitmentSlots,
      controlConditionStates: {
        ...controlConditionStates,
        duskMoodAbove12:
          resourceFacts?.duskMoodAbove12 ??
          controlConditionStates?.duskMoodAbove12,
        lingMoodAbove12:
          resourceFacts?.lingMoodAbove12 ??
          controlConditionStates?.lingMoodAbove12,
      },
      resourceFacts,
    }),
  );
  const cycleHours = settledStates.reduce(
    (total, state) => total + state.durationHours,
    0,
  );
  const expectedPlacementsSatisfied = settledStates.every(
    (state) => state.expectedPlacementsSatisfied,
  );
  const hasResults = settledStates.some((state) => state.results.length > 0);
  const hasUnavailableSource = settledStates.some(
    (state) => state.unavailableSources.length > 0,
  );

  return {
    status:
      hasResults
        ? hasUnavailableSource || !expectedPlacementsSatisfied
          ? "partial"
          : "calculated"
        : expectedPlacementsSatisfied
          ? "notApplicable"
          : "incomplete",
    cycleHours,
    expectedPlacementsSatisfied,
    states: settledStates,
    rooms: summarizeRooms(settledStates),
  };
}
