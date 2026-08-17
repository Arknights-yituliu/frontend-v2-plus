const POWER_SUPPLY_BY_LEVEL = Object.freeze([0, 60, 130, 270]);
const STANDARD_POWER_COST_BY_LEVEL = Object.freeze([0, 10, 30, 60]);
const PROCESSING_POWER_COST_BY_LEVEL = Object.freeze([0, 10, 10, 10]);
const DORMITORY_POWER_COST_BY_LEVEL = Object.freeze([0, 10, 20, 30, 45, 65]);

const STANDARD_FACILITIES = new Set([
  "trading",
  "manufacture",
  "meeting",
  "office",
  "training",
]);

function toStationLevel(value, maximumLevel) {
  const level = Number(value);
  return Number.isInteger(level)
    ? Math.min(Math.max(level, 0), maximumLevel)
    : 0;
}

export function getRiicFacilityPowerSupply(station = {}) {
  return String(station?.facility || "").trim() === "power"
    ? POWER_SUPPLY_BY_LEVEL[toStationLevel(station.stationLevel, 3)]
    : 0;
}

export function getRiicFacilityPowerConsumption(station = {}) {
  const facility = String(station?.facility || "").trim();
  const maximumLevel = facility === "dormitory" ? 5 : 3;
  const level = toStationLevel(station.stationLevel, maximumLevel);

  if (facility === "dormitory") {
    return DORMITORY_POWER_COST_BY_LEVEL[level];
  }

  if (facility === "processing") {
    return PROCESSING_POWER_COST_BY_LEVEL[level];
  }

  return STANDARD_FACILITIES.has(facility)
    ? STANDARD_POWER_COST_BY_LEVEL[level]
    : 0;
}

export function summarizeRiicFacilityPower(stations = []) {
  const details = (stations || []).map((station) => {
    const supply = getRiicFacilityPowerSupply(station);
    const consumption = getRiicFacilityPowerConsumption(station);

    return {
      id: String(station?.id || ""),
      facility: String(station?.facility || ""),
      stationLevel: Number(station?.stationLevel || 0),
      supply,
      consumption,
    };
  });
  const supply = details.reduce((total, item) => total + item.supply, 0);
  const consumption = details.reduce(
    (total, item) => total + item.consumption,
    0,
  );

  return {
    supply,
    consumption,
    remaining: supply - consumption,
    overloaded: consumption > supply,
    details,
  };
}
