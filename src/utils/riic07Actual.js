const EPSILON = 1e-9;

function toPositiveHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function toFinitePercent(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const percent = Number(value);
  return Number.isFinite(percent) ? percent : null;
}

function roundPercent(value) {
  return Math.round(value * 10) / 10;
}

function createRoomSummary(room) {
  return {
    key: String(room?.key || "").trim(),
    label: String(room?.label || room?.key || "").trim(),
    facility: String(room?.facility || "").trim(),
    product: String(room?.product || "").trim(),
    products: new Set(),
    durationHours: 0,
    calculatedDurationHours: 0,
    efficiencyPercentHours: 0,
    controlCenterBonusPercentHours: 0,
    manuallyEdited: false,
    segments: [],
  };
}

function createSegment({ room, state, durationHours }) {
  const efficiency = toFinitePercent(room?.efficiency);
  const manuallyEdited = room?.manuallyEdited === true;
  const calculated = efficiency !== null && !manuallyEdited;
  const controlCenterFacilityBonusPercent = toFinitePercent(
    room?.controlCenterFacilityBonusPercent,
  );
  const controlCenterOperatorBonusPercent = toFinitePercent(
    room?.controlCenterOperatorBonusPercent,
  );
  const controlCenterBonusPercent =
    (controlCenterFacilityBonusPercent || 0) +
    (controlCenterOperatorBonusPercent || 0);

  return {
    startHour: Number.isFinite(Number(state?.startHour))
      ? Number(state.startHour)
      : 0,
    durationHours,
    efficiency: calculated ? efficiency : null,
    controlCenterBonusPercent: calculated
      ? controlCenterBonusPercent || 0
      : null,
    sameShiftBindingStatus: String(
      room?.sameShiftBindingStatus || "notApplicable",
    ),
    manuallyEdited,
    calculated,
  };
}

function finalizeRoomSummary(summary) {
  const calculated =
    summary.durationHours > 0 &&
    Math.abs(summary.calculatedDurationHours - summary.durationHours) <=
      EPSILON;

  return {
    key: summary.key,
    label: summary.label,
    facility: summary.facility,
    product: summary.products.size === 1 ? [...summary.products][0] : "",
    products: [...summary.products],
    durationHours: summary.durationHours,
    calculatedDurationHours: summary.calculatedDurationHours,
    isCalculated: calculated,
    calculationStatus: calculated
      ? "calculated"
      : summary.manuallyEdited
        ? "manuallyEdited"
        : "unavailable",
    averageEfficiency: calculated
      ? roundPercent(
          summary.efficiencyPercentHours / summary.calculatedDurationHours,
        )
      : null,
    averageControlCenterBonusPercent: calculated
      ? roundPercent(
          summary.controlCenterBonusPercentHours /
            summary.calculatedDurationHours,
        )
      : null,
    segments: summary.segments,
  };
}

function buildFacilitySummaries(rooms) {
  const facilityMap = new Map();

  for (const room of rooms) {
    const facility = room.facility || "unknown";
    const summary = facilityMap.get(facility) || {
      facility,
      roomCount: 0,
      calculatedRoomCount: 0,
      calculatedDurationHours: 0,
      efficiencyPercentHours: 0,
      controlCenterBonusPercentHours: 0,
    };

    summary.roomCount += 1;
    if (room.isCalculated) {
      summary.calculatedRoomCount += 1;
      summary.calculatedDurationHours += room.durationHours;
      summary.efficiencyPercentHours +=
        Number(room.averageEfficiency || 0) * room.durationHours;
      summary.controlCenterBonusPercentHours +=
        Number(room.averageControlCenterBonusPercent || 0) *
        room.durationHours;
    }
    facilityMap.set(facility, summary);
  }

  return [...facilityMap.values()].map((summary) => ({
    facility: summary.facility,
    roomCount: summary.roomCount,
    calculatedRoomCount: summary.calculatedRoomCount,
    averageEfficiency:
      summary.calculatedDurationHours > 0
        ? roundPercent(
            summary.efficiencyPercentHours / summary.calculatedDurationHours,
          )
        : null,
    averageControlCenterBonusPercent:
      summary.calculatedDurationHours > 0
        ? roundPercent(
            summary.controlCenterBonusPercentHours /
              summary.calculatedDurationHours,
          )
        : null,
  }));
}

/**
 * Summarizes the already assembled schedule. This is deliberately read-only:
 * it never changes candidates, fallback assignments, or control-center picks.
 */
export function summarizeRiicActualSchedule({ preview } = {}) {
  const states = Array.isArray(preview?.states) ? preview.states : [];
  const roomSummaries = new Map();
  let cycleHours = 0;

  for (const state of states) {
    const durationHours = toPositiveHours(state?.durationHours);
    if (durationHours <= 0) {
      continue;
    }

    cycleHours += durationHours;
    for (const room of state?.rooms || []) {
      const key = String(room?.key || "").trim();
      if (!key) {
        continue;
      }

      const summary = roomSummaries.get(key) || createRoomSummary(room);
      const segment = createSegment({ room, state, durationHours });

      summary.durationHours += durationHours;
      summary.manuallyEdited ||= segment.manuallyEdited;
      if (room?.product) {
        summary.products.add(String(room.product));
      }
      if (segment.calculated) {
        summary.calculatedDurationHours += durationHours;
        summary.efficiencyPercentHours +=
          Number(segment.efficiency) * durationHours;
        summary.controlCenterBonusPercentHours +=
          Number(segment.controlCenterBonusPercent) * durationHours;
      }
      summary.segments.push(segment);
      roomSummaries.set(key, summary);
    }
  }

  const rooms = [...roomSummaries.values()].map(finalizeRoomSummary);
  const calculatedRoomCount = rooms.filter((room) => room.isCalculated).length;

  return {
    cycleHours: cycleHours || toPositiveHours(preview?.cycleHours),
    roomCount: rooms.length,
    calculatedRoomCount,
    rooms,
    facilities: buildFacilitySummaries(rooms),
  };
}
