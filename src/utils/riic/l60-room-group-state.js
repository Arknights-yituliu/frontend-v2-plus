import {
  getRiicStaticRoomCandidateCatalogKey,
} from "./l10-catalog.js";
import {
  resolveRiicRoomCandidateSkeletons,
} from "./l20-groups.js";
import {
  materializeRiicRoomCandidateSkeletons,
} from "./l61-candidate-preview.js";
import {
  getRiicRuntimeCandidateRankingValue,
} from "./l60-candidate-ranking.js";
import {
  getRiicRoomGroupStaffingRequirement,
} from "./l60-staffing.js";
import {
  RIIC_PERCEPTION_RESOURCE_CORES,
} from "./l42-perception-settlement.js";

export function getRiicStaticRoomCandidateCatalogFacility(group) {
  return group?.facility === "office" ? "hire" : group?.facility;
}

export function getRiicRoomGroupCatalogKey(group, station) {
  if (!group?.candidateGenerationAvailable) {
    return null;
  }

  return getRiicStaticRoomCandidateCatalogKey({
    roomType: getRiicStaticRoomCandidateCatalogFacility(group),
    product: group.candidateProduct,
    stationLevel: station?.stationLevel,
    slotCount: station?.slotCount,
  });
}

export function getRiicRoomGroupCatalogRequests(group) {
  if (!group?.candidateGenerationAvailable) {
    return [];
  }

  return [
    ...new Map(
      (group.stations || [])
        .filter(
          (station) =>
            Number.isInteger(station?.stationLevel) &&
            station.stationLevel > 0 &&
            Number.isInteger(station?.slotCount) &&
            station.slotCount > 0,
        )
        .map((station) => {
          const key = getRiicRoomGroupCatalogKey(group, station);
          return [
            key || `${station.stationLevel}:${station.slotCount}`,
            {
              station,
              key,
            },
          ];
        }),
    ).values(),
  ];
}

function getRiicRoomGroupCatalogErrors({
  group,
  catalogErrorsByKey = {},
} = {}) {
  return getRiicRoomGroupCatalogRequests(group)
    .map((request) =>
      request.key
        ? catalogErrorsByKey[request.key]
        : `Invalid RIIC catalog request: ${group?.label || ""}`,
    )
    .filter(Boolean);
}

function getRiicRoomGroupCatalogLoadState({
  group,
  catalogsByKey = {},
  catalogLoadStatesByKey = {},
  loadingCatalogKeys,
} = {}) {
  const requests = getRiicRoomGroupCatalogRequests(group);
  if (requests.length === 0) {
    return "unsupported";
  }
  if (requests.some((request) => !request.key)) {
    return "failed";
  }
  if (requests.every((request) => catalogsByKey[request.key])) {
    return "ready";
  }
  if (
    requests.some(
      (request) => catalogLoadStatesByKey[request.key] === "failed",
    )
  ) {
    return "failed";
  }
  if (
    requests.some(
      (request) =>
        catalogLoadStatesByKey[request.key] === "loading" ||
        loadingCatalogKeys?.has?.(request.key),
    )
  ) {
    return "loading";
  }

  return "idle";
}

function compareRiicRoomGroupCandidates(left, right) {
  const rankingDifference =
    getRiicRuntimeCandidateRankingValue(right) -
    getRiicRuntimeCandidateRankingValue(left);
  if (rankingDifference !== 0) {
    return rankingDifference;
  }

  const fallbackCountDifference =
    Number(left?.fallback?.count || 0) - Number(right?.fallback?.count || 0);
  if (fallbackCountDifference !== 0) {
    return fallbackCountDifference;
  }

  if (left?.quality !== right?.quality) {
    return left?.quality === "complete" ? -1 : 1;
  }

  if (left?.calculationStatus !== right?.calculationStatus) {
    return String(left?.calculationStatus || "").localeCompare(
      String(right?.calculationStatus || ""),
      "en",
    );
  }

  return String(left?.key || "").localeCompare(String(right?.key || ""), "en");
}

function enrichRiicRoomGroupCandidateFallback(
  candidate,
  publicSkillOperatorIds = new Set(),
) {
  if (!candidate) {
    return candidate;
  }

  const candidateOperators = (
    candidate.fallback?.candidateOperators ||
    candidate.fallback?.operators ||
    []
  ).map((operator) => ({
    ...operator,
    publicSkill: publicSkillOperatorIds.has(operator.charId),
  }));

  return {
    ...candidate,
    fallback: {
      ...candidate.fallback,
      candidateOperators,
      operators: candidate.fallback?.operators || [],
    },
  };
}

function createRiicFallbackOnlyRoomGroupCohort(cohort, fallbackCandidate) {
  if (!fallbackCandidate) {
    return {
      ...cohort,
      candidates: [],
      fallbackCandidate: null,
      manualFallbackCandidates: [],
    };
  }

  const fallbackCount =
    cohort.selectionMode === "individual"
      ? 1
      : Math.max(1, Number(cohort.slotCount || 1));
  const candidates = Array.from(
    { length: Math.max(0, Number(cohort.teamCount || 0)) },
    (_, index) => ({
      ...fallbackCandidate,
      key: `${fallbackCandidate.key}:fallback-only-${index + 1}`,
      name: `补位 ${index + 1}`,
      isManualFallbackTeam: true,
      fallback: {
        ...fallbackCandidate.fallback,
        count: fallbackCount,
        operators: [],
        materialized: false,
      },
    }),
  );

  return {
    ...cohort,
    candidates,
    fallbackCandidate,
    manualFallbackCandidates: candidates,
  };
}

function createRiicManualFallbackCandidates(cohort, fallbackCandidate) {
  if (!fallbackCandidate) {
    return [];
  }

  return Array.from(
    {
      length: cohort.teamCount,
    },
    (_, index) => ({
      ...fallbackCandidate,
      key: `${fallbackCandidate.key}:manual-${index + 1}`,
      name:
        cohort.selectionMode === "individual"
          ? `纯补位干员 ${index + 1}`
          : `纯补位班组 ${index + 1}`,
      isManualFallbackTeam: true,
      fallback: {
        ...fallbackCandidate.fallback,
        operators: [],
        materialized: false,
      },
    }),
  );
}

function createRiicPerceptionResourceCoreCandidateSkeletons({
  candidateSkeletons = [],
  rosterById,
  roomType,
  perceptionCoreBaselinesByOperatorId = {},
}) {
  return [
    ...candidateSkeletons,
    ...RIIC_PERCEPTION_RESOURCE_CORES.flatMap((core) => {
      if (
        core.facility !== roomType ||
        !rosterById?.has?.(core.operatorId)
      ) {
        return [];
      }
      const baseline = {
        operatorId: core.operatorId,
        bonusPercent: 0,
        dormitoryOccupantCount: 0,
        ...(perceptionCoreBaselinesByOperatorId[core.operatorId] || {}),
      };

      return [
        {
          candidate: {
            id: `runtime:perception-resource:${core.facility}:${core.operatorId}`,
            name: core.name,
            members: [{ name: core.name }],
            efficiency: baseline.bonusPercent,
            sortScore: 0,
            resourceChainBaseline: baseline,
          },
          operatorIds: [core.operatorId],
          coreUpgradeRequirements: [],
          taggedMemberRequirements: [],
        },
      ];
    }),
  ];
}

export function createRiicRoomGroupCandidateState({
  group,
  roster,
  currentOwnedOperators = [],
  shiftMode,
  twoShiftRotationMode,
  catalogsByKey = {},
  catalogLoadStatesByKey = {},
  catalogErrorsByKey = {},
  loadingCatalogKeys,
  operatorNameToCharId,
  publicSkillOperatorIds = new Set(),
  layoutFacts = {},
  trainingMode,
  idealTrainingRaritySelection,
  controlCenterRuntimeContext,
  idleFillOperators = [],
} = {}) {
  if (!group) {
    return { status: "idle", cohorts: [] };
  }

  if (group.manualControl) {
    return { status: "manualControl", cohorts: [] };
  }

  if (!group.candidateGenerationAvailable) {
    return { status: "outOfScope", cohorts: [] };
  }

  if (!roster) {
    return { status: "requiresOperators", cohorts: [] };
  }

  if (
    group.stations.some(
      (station) =>
        !Number.isInteger(station?.stationLevel) ||
        !Number.isInteger(station?.slotCount),
    )
  ) {
    return { status: "missingCapacity", cohorts: [] };
  }

  const staffingRequirement = getRiicRoomGroupStaffingRequirement({
    stations: group.stations,
    shiftMode,
    roomType: group.facility,
    twoShiftRotationMode,
  });
  if (staffingRequirement.status !== "ready") {
    return {
      status: "missingCapacity",
      staffingRequirement,
      cohorts: [],
    };
  }

  const catalogsByCohortId = new Map(
    staffingRequirement.cohorts.map((cohort) => {
      const key = getRiicRoomGroupCatalogKey(group, cohort);
      return [cohort.id, key ? catalogsByKey[key] : null];
    }),
  );
  if ([...catalogsByCohortId.values()].some((catalog) => !catalog)) {
    const catalogLoadState = getRiicRoomGroupCatalogLoadState({
      group,
      catalogsByKey,
      catalogLoadStatesByKey,
      loadingCatalogKeys,
    });

    return {
      status:
        catalogLoadState === "failed"
          ? "catalogLoadFailed"
          : catalogLoadState === "idle"
            ? "catalogNotLoaded"
            : "catalogLoading",
      catalogErrors: getRiicRoomGroupCatalogErrors({
        group,
        catalogErrorsByKey,
      }),
      cohorts: [],
    };
  }

  const cohorts = staffingRequirement.cohorts.map((cohort) => {
    const library = catalogsByCohortId.get(cohort.id);
    const candidateResolution = resolveRiicRoomCandidateSkeletons({
      catalog: group.fallbackOnly
        ? {
            ...library.catalog,
            candidates: [],
          }
        : library.catalog,
      fallbackCatalog: library.fallbackCatalog,
      operatorNameToCharId,
      ownedOperators: roster,
      currentOwnedOperators,
      roomType: getRiicStaticRoomCandidateCatalogFacility(group),
      product: group.candidateProduct,
      stationLevel: cohort.stationLevel,
      slotCount: cohort.slotCount,
      powerPlantCount: layoutFacts.powerPlantCount,
      tradingStationCount: layoutFacts.tradingStationCount,
      goldManufactureStationCount: layoutFacts.goldManufactureStationCount,
      manufactureProductKindCount: layoutFacts.manufactureProductKindCount,
      facilities: layoutFacts.facilities,
      trainingMode,
      idealTrainingRaritySelection,
    });
    const candidateSkeletonsWithResourceCores =
      createRiicPerceptionResourceCoreCandidateSkeletons({
        candidateSkeletons: candidateResolution.candidateSkeletons,
        rosterById: candidateResolution.rosterById,
        roomType: candidateResolution.scope.roomType,
        perceptionCoreBaselinesByOperatorId:
          candidateResolution.perceptionCoreBaselinesByOperatorId,
      });
    const resourceCoreCandidateSkeletons =
      candidateSkeletonsWithResourceCores.slice(
        candidateResolution.candidateSkeletons.length,
      );
    const matchedCandidates = materializeRiicRoomCandidateSkeletons({
      resolution: {
        ...candidateResolution,
        candidateSkeletons: candidateSkeletonsWithResourceCores,
      },
      controlCenterRuntimeContext,
      currentOwnedOperators,
      idleFillOperators,
    });
    const candidates = matchedCandidates.candidates
      .map((candidate) =>
        enrichRiicRoomGroupCandidateFallback(
          candidate,
          publicSkillOperatorIds,
        ),
      )
      .sort(compareRiicRoomGroupCandidates);
    const fallbackCandidate = enrichRiicRoomGroupCandidateFallback(
      matchedCandidates.fallbackCandidate,
      publicSkillOperatorIds,
    );
    if (group.fallbackOnly) {
      return createRiicFallbackOnlyRoomGroupCohort(
        {
          ...cohort,
          debug: {
            l20: {
              scope: candidateResolution.scope,
              candidateSkeletons: candidateResolution.candidateSkeletons,
              perceptionCoreBaselinesByOperatorId:
                candidateResolution.perceptionCoreBaselinesByOperatorId,
            },
            l61: {
              resourceCoreCandidateSkeletons,
              candidates,
              fallbackCandidate,
            },
          },
        },
        fallbackCandidate,
      );
    }

    const manualFallbackCandidates = createRiicManualFallbackCandidates(
      cohort,
      fallbackCandidate,
    );
    return {
      ...cohort,
      candidates: [...candidates, ...manualFallbackCandidates],
      fallbackCandidate,
      manualFallbackCandidates,
      debug: {
        l20: {
          scope: candidateResolution.scope,
          candidateSkeletons: candidateResolution.candidateSkeletons,
          perceptionCoreBaselinesByOperatorId:
            candidateResolution.perceptionCoreBaselinesByOperatorId,
        },
        l61: {
          resourceCoreCandidateSkeletons,
          candidates,
          fallbackCandidate,
        },
      },
    };
  });
  const hasMissingFallbackPreset =
    group.fallbackOnly &&
    cohorts.some((cohort) => !cohort.fallbackCandidate);

  return {
    status: hasMissingFallbackPreset ? "missingFallbackPreset" : "ready",
    staffingRequirement,
    cohorts,
    fallbackOnly: Boolean(group.fallbackOnly),
  };
}
