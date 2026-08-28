import { operatorTableV2 } from "/src/utils/gameData.js";
import {
  RIIC_MANUAL_OPERATOR_SOURCE_KEY,
  readRiicManualOperatorSnapshot,
} from "/src/utils/riicManualOperatorData.js";
import {
  LAYOUT_CARD_META,
  ROOM_CANDIDATE_PRODUCTS,
  STATIC_SCHEDULE_ROOM_GROUPS,
  getLayoutRoomFacility,
} from "/src/utils/riicScheduleConfiguration.js";
import {
  getRiicFacilityProfile,
  getRiicRoomStations,
  normalizeRiicFacilityRequirement,
} from "/src/utils/riic/l10-facility-model.js";

export const RIIC_SET_ASSESSMENT_STORAGE_KEYS = Object.freeze({
  activeSource: "riic_operator_source_v1",
  customSources: "riic_operator_sources_v2",
  workspaces: "riic_schedule_generator_workspaces_v1",
  sklandSession: "skland_account_data",
  sklandSnapshot: "riic_skland_operator_snapshot_v1",
});

function readJson(storage, key, fallback = null) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeOperators(list, { requireOwn = false } = {}) {
  const byId = new Map();

  for (const operator of list || []) {
    if (requireOwn && !operator?.own) {
      continue;
    }

    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const tableOperator = operatorTableV2?.[charId];
    const normalized = {
      charId,
      name: String(tableOperator?.name || operator?.name || charId).trim(),
      rarity: Number.isInteger(Number(operator?.rarity))
        ? Number(operator.rarity)
        : Number(tableOperator?.rarity || 1),
      elite: Number.isInteger(Number(operator?.elite))
        ? Number(operator.elite)
        : 0,
      level: Number.isInteger(Number(operator?.level))
        ? Number(operator.level)
        : 1,
    };
    const current = byId.get(charId);
    if (
      !current ||
      normalized.elite > current.elite ||
      (normalized.elite === current.elite &&
        normalized.level > current.level)
    ) {
      byId.set(charId, normalized);
    }
  }

  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "zh-CN"),
  );
}

function readSklandSource() {
  const account = readJson(
    typeof sessionStorage === "undefined" ? null : sessionStorage,
    RIIC_SET_ASSESSMENT_STORAGE_KEYS.sklandSession,
  );
  const operators = normalizeOperators(account?.operatorDataList, {
    requireOwn: true,
  });

  if (operators.length > 0) {
    return {
      id: "skland",
      type: "skland",
      label: "森空岛",
      importedAt: account?.updatedAt || "",
      operators,
    };
  }

  const snapshot = readJson(
    typeof localStorage === "undefined" ? null : localStorage,
    RIIC_SET_ASSESSMENT_STORAGE_KEYS.sklandSnapshot,
  );
  const cachedOperators = normalizeOperators(snapshot?.operators);

  return cachedOperators.length > 0
    ? {
        id: "skland",
        type: "skland",
        label: "森空岛",
        importedAt: String(snapshot?.importedAt || ""),
        operators: cachedOperators,
      }
    : null;
}

function readCustomSources() {
  const parsed = readJson(
    typeof localStorage === "undefined" ? null : localStorage,
    RIIC_SET_ASSESSMENT_STORAGE_KEYS.customSources,
    {},
  );

  return (Array.isArray(parsed?.sources) ? parsed.sources : []).flatMap(
    (source) => {
      if (
        !source?.id ||
        !["maa", "yituliu"].includes(source.type) ||
        !Array.isArray(source.operators)
      ) {
        return [];
      }

      const operators = normalizeOperators(source.operators);
      return operators.length > 0
        ? [
            {
              id: String(source.id),
              type: source.type,
              label: String(source.label || source.fileName || source.id),
              fileName: String(source.fileName || ""),
              importedAt: String(source.importedAt || ""),
              operators,
            },
          ]
        : [];
    },
  );
}

function readWorkspaces() {
  const parsed = readJson(
    typeof localStorage === "undefined" ? null : localStorage,
    RIIC_SET_ASSESSMENT_STORAGE_KEYS.workspaces,
    {},
  );

  return parsed?.version === 1 && parsed?.workspaces
    ? parsed.workspaces
    : {};
}

function getLayoutCard(plan) {
  return LAYOUT_CARD_META.find((card) => card.key === plan?.cardKey) || null;
}

function getRoomProduct(room) {
  return String(
    room?.product || ROOM_CANDIDATE_PRODUCTS[room?.key] || "all",
  );
}

function normalizeStationLevel(value) {
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 ? level : null;
}

function addFacility(facilities, facilityType, product, station) {
  const normalizedFacilityType = String(facilityType || "").trim();
  if (!normalizedFacilityType) {
    return;
  }

  facilities.push({
    facilityType: normalizedFacilityType,
    product: String(product || "all").trim(),
    stationLevel: normalizeStationLevel(station?.stationLevel),
    slotCount: Number(station?.slotCount) || null,
  });
}

function normalizeAssessmentSchedule(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.states)) {
    return null;
  }

  const states = value.states.flatMap((state, stateIndex) => {
    const index = Number(state?.index);
    if (!Number.isInteger(index) || index < 0) {
      return [];
    }

    return [
      {
        index,
        name:
          String(state?.name || "").trim() || `班段 ${stateIndex + 1}`,
        startHour: Number.isFinite(Number(state?.startHour))
          ? Number(state.startHour)
          : 0,
        durationHours:
          Number.isFinite(Number(state?.durationHours)) &&
          Number(state.durationHours) > 0
            ? Number(state.durationHours)
            : 0,
        rooms: (Array.isArray(state?.rooms) ? state.rooms : []).flatMap(
          (room) => {
            const key = String(room?.key || "").trim();
            const facility = String(room?.facility || "").trim();
            if (!key || !facility) {
              return [];
            }

            return [
              {
                key,
                label: String(room?.label || key).trim() || key,
                facility: facility === "office" ? "hire" : facility,
                product: String(room?.product || "").trim(),
                stationLevel: normalizeStationLevel(room?.stationLevel),
                expectedSlots: Number.isInteger(Number(room?.expectedSlots))
                  ? Number(room.expectedSlots)
                  : null,
                isStatic: room?.isStatic === true,
                operators: (
                  Array.isArray(room?.operators) ? room.operators : []
                ).flatMap((operator) => {
                  const charId = String(operator?.charId || "").trim();
                  return charId
                    ? [
                        {
                          charId,
                          name:
                            String(
                              operatorTableV2?.[charId]?.name ||
                                operator?.name ||
                                charId,
                            ).trim() || charId,
                        },
                      ]
                    : [];
                }),
              },
            ];
          },
        ),
      },
    ];
  });

  return states.length > 0
    ? {
        capturedAt: String(value?.capturedAt || "").trim(),
        states,
      }
    : null;
}

function buildLayoutData(plan) {
  if (!plan) {
    return null;
  }

  const card = getLayoutCard(plan);
  if (!card) {
    return null;
  }

  const facilityRequirement = normalizeRiicFacilityRequirement(
    plan.layoutId,
    plan.facilityRequirement,
  );
  const facilityProfile = getRiicFacilityProfile({
    layoutId: plan.layoutId,
    cardKey: plan.cardKey,
    facilityRequirement,
  });
  const facilities = [];
  const customStations = Array.isArray(plan.customLayout?.stations)
    ? plan.customLayout.stations
    : [];
  const customStaticStations = Array.isArray(
    plan.customLayout?.staticStations,
  )
    ? plan.customLayout.staticStations
    : [];

  if (customStations.length > 0) {
    customStations.forEach((station) =>
      addFacility(
        facilities,
        station.facility,
        station.facility === "power" ? "all" : station.product,
        station,
      ),
    );
  } else {
    for (const room of card.rooms || []) {
      const facilityType = getLayoutRoomFacility(room);
      const stations = getRiicRoomStations({
        facilityProfile,
        roomKey: room.key,
        roomCount: room.count,
      });
      stations.forEach((station) =>
        addFacility(facilities, facilityType, getRoomProduct(room), station),
      );
    }
  }

  for (const group of STATIC_SCHEDULE_ROOM_GROUPS) {
    const matchingStaticStations = customStaticStations.filter(
      (station) => station.facility === group.key,
    );
    const stations =
      matchingStaticStations.length === group.count
        ? matchingStaticStations
        : getRiicRoomStations({
            facilityProfile,
            roomKey: group.key,
            roomCount: group.count,
          });
    const facilityType = group.key === "office" ? "hire" : group.key;
    stations.forEach((station) =>
      addFacility(facilities, facilityType, "all", station),
    );
  }

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
        .filter(
          (facility) =>
            facility.facilityType === "manufacture" &&
            facility.product !== "all",
        )
        .map((facility) => facility.product),
    ).size,
  };
}

export function readRiicSetAssessmentWorkspace() {
  const activeSourceId =
    typeof localStorage === "undefined"
      ? "skland"
      : String(
          localStorage.getItem(
            RIIC_SET_ASSESSMENT_STORAGE_KEYS.activeSource,
          ) || "skland",
        );
  const sources = [readSklandSource(), ...readCustomSources()].filter(Boolean);
  const workspaces = readWorkspaces();

  return {
    activeSourceId: sources.some((source) => source.id === activeSourceId)
      ? activeSourceId
      : sources[0]?.id || "",
    sources,
    workspaces,
  };
}

export function getRiicSetAssessmentSource(snapshot, sourceId) {
  return (
    snapshot?.sources?.find((source) => source.id === sourceId) || null
  );
}

export function getRiicSetAssessmentLayout(snapshot, sourceId) {
  const workspace = snapshot?.workspaces?.[sourceId] || null;
  const plan = workspace?.confirmedLayoutPlan || null;

  return {
    workspace,
    plan,
    layoutData: buildLayoutData(plan),
  };
}

export function getRiicSetAssessmentSchedule(snapshot, sourceId) {
  const workspace = snapshot?.workspaces?.[sourceId] || null;
  return normalizeAssessmentSchedule(workspace?.assessmentSchedule);
}

export function getRiicSetAssessmentOperatorNameMap(source) {
  return Object.fromEntries(
    (source?.operators || []).map((operator) => [
      operator.name,
      operator.charId,
    ]),
  );
}

export function getRiicSetAssessmentManualSource() {
  if (!import.meta.env?.DEV) {
    return null;
  }

  const snapshot = readRiicManualOperatorSnapshot();
  return snapshot?.operators?.length
    ? {
        id: RIIC_MANUAL_OPERATOR_SOURCE_KEY,
        type: "manual",
        label: "手动编辑",
        importedAt: snapshot.updatedAt || "",
        operators: normalizeOperators(snapshot.operators),
      }
    : null;
}
