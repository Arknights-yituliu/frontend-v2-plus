const FACILITY_REQUIREMENTS = Object.freeze({
  rightFull: {
    id: "rightFull",
    productionSlots: 17,
  },
  fullBlood: {
    id: "fullBlood",
    productionSlots: 20,
  },
});

function station(stationLevel, slotCount = stationLevel) {
  return Object.freeze({ stationLevel, slotCount });
}

const PROFILE_ROOM_STATIONS = Object.freeze({
  rightFull: {
    "lmd-trading": [station(3), station(2)],
    "experience-manufacture": {
      "252-2-gold": [station(3), station(2), station(2)],
      "252-3-gold": [station(3), station(2)],
    },
    "gold-manufacture": {
      "252-2-gold": [station(3), station(2)],
      "252-3-gold": [station(3), station(2), station(2)],
    },
    power: [station(1), station(1)],
  },
  fullBlood: {
    "lmd-trading": [station(3), station(2)],
    "experience-manufacture": {
      "252-2-gold": [station(3), station(3), station(3)],
      "252-3-gold": [station(3), station(3)],
    },
    "gold-manufacture": {
      "252-2-gold": [station(3), station(3)],
      "252-3-gold": [station(3), station(3), station(3)],
    },
    power: [station(1), station(1)],
  },
});

const FIXED_LAYOUT_ROOM_STATIONS = Object.freeze({
  153: {
    "lmd-trading": [station(3)],
    "experience-manufacture": [station(3), station(3), station(3), station(3)],
    "gold-manufacture": [station(3)],
    power: [station(1), station(1), station(1)],
  },
  243: {
    "lmd-trading": [station(3), station(3)],
    "experience-manufacture": [station(3), station(3)],
    "gold-manufacture": [station(3), station(3)],
    power: [station(1), station(1), station(1)],
  },
  "243-orundum": {
    "lmd-trading": [station(3)],
    "orundum-trading": [station(3)],
    "experience-manufacture": [station(3)],
    "orundum-manufacture": [station(3)],
    "gold-manufacture": [station(3), station(3)],
    power: [station(1), station(1), station(1)],
  },
  "342-orundum": {
    "lmd-trading": [station(3), station(1)],
    "orundum-trading": [station(3)],
    "orundum-manufacture": [station(3)],
    "experience-manufacture": [station(3)],
    "gold-manufacture": [station(2), station(2)],
    power: [station(1), station(1)],
  },
});

const STATIC_ROOM_STATIONS = Object.freeze({
  control: [station(1, 5)],
  office: [station(1, 1)],
});

const SHIFT_SEGMENT_HOURS = Object.freeze({
  once: [24],
  twice: [12],
  threeTimes: [12, 6, 6],
});

const ROTATION_MACRO_SEGMENT_COUNTS = Object.freeze({
  once: [2],
  twice: [2, 3],
  threeTimes: [3],
});

function copyStations(stations) {
  return (stations || []).map((value) => ({
    stationLevel: Number(value?.stationLevel),
    slotCount: Number(value?.slotCount),
  }));
}

export const RIIC_FACILITY_REQUIREMENTS = FACILITY_REQUIREMENTS;
export const RIIC_SHIFT_SEGMENT_HOURS = SHIFT_SEGMENT_HOURS;

export function normalizeRiicFacilityRequirement(layoutId, value) {
  if (layoutId !== "252") {
    return null;
  }

  return value === "fullBlood" ? "fullBlood" : "rightFull";
}

export function getRiicFacilityProfile({
  layoutId,
  cardKey,
  facilityRequirement,
}) {
  const requirement = normalizeRiicFacilityRequirement(
    layoutId,
    facilityRequirement,
  );

  if (requirement) {
    return {
      ...FACILITY_REQUIREMENTS[requirement],
      roomStations: PROFILE_ROOM_STATIONS[requirement],
      cardKey,
    };
  }

  const roomStations = FIXED_LAYOUT_ROOM_STATIONS[cardKey];
  if (!roomStations) {
    return null;
  }

  return {
    id: cardKey,
    productionSlots: Object.entries(roomStations)
      .filter(([roomKey]) => roomKey !== "power")
      .reduce(
        (total, [, stations]) =>
          total +
          stations.reduce(
            (stationTotal, currentStation) =>
              stationTotal + currentStation.slotCount,
            0,
          ),
        0,
      ),
    roomStations,
    cardKey,
  };
}

export function getRiicRoomStations({
  facilityProfile,
  roomKey,
  roomCount,
}) {
  const normalizedRoomKey = roomKey === "hire" ? "office" : roomKey;

  if (normalizedRoomKey === "meeting" && roomCount === 1) {
    return [
      {
        stationLevel: facilityProfile?.id === "fullBlood" ? 1 : 3,
        slotCount: 2,
      },
    ];
  }

  const staticStations = STATIC_ROOM_STATIONS[normalizedRoomKey];
  if (Array.isArray(staticStations) && staticStations.length === roomCount) {
    return copyStations(staticStations);
  }

  const configuredStations =
    facilityProfile?.roomStations?.[normalizedRoomKey];
  const stations = Array.isArray(configuredStations)
    ? configuredStations
    : configuredStations?.[facilityProfile?.cardKey];

  if (Array.isArray(stations) && stations.length === roomCount) {
    return copyStations(stations);
  }

  return Array.from({ length: roomCount }, () => null);
}

export function getRiicRotationSegmentHours(shiftMode) {
  const segmentHours = SHIFT_SEGMENT_HOURS[shiftMode];
  return segmentHours ? [...segmentHours] : null;
}

/**
 * Returns the staff-rotation periods available for a chosen switch cadence.
 *
 * A daily switch cadence does not require a one-day staff cycle. For example,
 * a two-slot room can rotate three individual operators through three
 * twelve-hour segments: AB -> BC -> AC -> repeat.
 */
export function getRiicRotationCycles(shiftMode) {
  const cadenceHours = getRiicRotationSegmentHours(shiftMode);
  const macroSegmentCounts = ROTATION_MACRO_SEGMENT_COUNTS[shiftMode];
  if (!cadenceHours || !macroSegmentCounts) {
    return [];
  }

  return macroSegmentCounts.map((segmentCount) => {
    const segments = Array.from({ length: segmentCount }, (_, index) => ({
      index,
      phase: index % cadenceHours.length,
      durationHours: cadenceHours[index % cadenceHours.length],
    }));

    return {
      id: `${shiftMode}:${segmentCount}`,
      shiftMode,
      cycleHours: segments.reduce(
        (total, segment) => total + segment.durationHours,
        0,
      ),
      segments,
    };
  });
}

export function getRiicRotationCycle(shiftMode) {
  return getRiicRotationCycles(shiftMode)[0] || null;
}
