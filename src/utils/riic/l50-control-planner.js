const ROOM_ROLE_ID = "room";
const OPERATOR_ROLE_ID = "operator";
const FILLER_ROLE_ID = "other";
const MON3TR_OPERATOR_ID = "char_4179_monstr";

function normalizeOperatorId(value) {
  return String(value || "").trim();
}

function getEmptyControlCenterRoleState(status) {
  return {
    status,
    roles: [],
    teams: [],
    operatorIds: [],
    segments: [],
    emptySlotCount: 0,
    usageByOperatorId: {},
  };
}

function getTeamUsageLimit(teamCount, operatorId, reusableOperatorId) {
  if (
    reusableOperatorId &&
    normalizeOperatorId(operatorId) === reusableOperatorId
  ) {
    return Math.max(1, teamCount);
  }

  if (teamCount === 3) {
    return 2;
  }

  return 1;
}

function isRoleCandidate(operator, role) {
  const tags = operator?.controlCenterBuffTags || [];
  return (role?.buffTags || []).some((tag) => tags.includes(tag));
}

function getScenarioTrial(operator, scenarioTrials) {
  const operatorId = normalizeOperatorId(operator?.charId);
  return (scenarioTrials || []).find(
    (item) => normalizeOperatorId(item?.sourceOperatorId) === operatorId,
  );
}

function getRoleScore(operator, role, scenarioTrials) {
  const scenario = getScenarioTrial(operator, scenarioTrials);
  if (role?.id === ROOM_ROLE_ID) {
    return Number(
      scenario?.roomEffectValue ??
        scenario?.roomContributionScore ??
        scenario?.contributionScore ??
        0,
    );
  }

  return Number(
    scenario?.operatorTrialValue ??
      scenario?.operatorTrialScore ??
      0,
  );
}

function isRoomTrialEffect(effect) {
  const target = effect?.target || {};
  return (
    String(target?.scope || "").trim() === "allRooms" &&
    ["manufacture", "trading", "meeting", "hire"].includes(
      String(target?.roomType || "").trim(),
    ) &&
    Number.isFinite(Number(effect?.bonusPercent))
  );
}

function getRoomEffectKey(effect) {
  const target = effect?.target || {};
  return [
    String(target?.scope || "").trim(),
    String(target?.roomType || "").trim(),
    String(target?.product || "").trim(),
    String(effect?.metric || "").trim(),
    JSON.stringify(effect?.conditions || null),
  ].join("|");
}

function getScenarioRoomEffectEntries(operator, scenarioTrials) {
  const scenario = getScenarioTrial(operator, scenarioTrials);
  const effects = scenario?.effects || [];
  const entries = scenario?.entries || [];
  let entryIndex = 0;

  return effects.flatMap((effect) => {
    if (!isRoomTrialEffect(effect)) {
      return [];
    }

    const entry = entries[entryIndex];
    entryIndex += 1;
    const score = Number(entry?.score);
    return Number.isFinite(score)
      ? [{ key: getRoomEffectKey(effect), score }]
      : [];
  });
}

function getTeamRoomEffectBestScores(team, scenarioTrials) {
  const bestScores = new Map();
  for (const operator of team?.roomEffectOperators || []) {
    for (const effectEntry of getScenarioRoomEffectEntries(
      operator,
      scenarioTrials,
    )) {
      const current = bestScores.get(effectEntry.key);
      if (current === undefined || effectEntry.score > current) {
        bestScores.set(effectEntry.key, effectEntry.score);
      }
    }
  }
  return bestScores;
}

function getRoleCandidates(operator, roles) {
  return (roles || []).filter((role) => isRoleCandidate(operator, role));
}

function createOperatorSameTeamGroupResolver(operators) {
  const operatorsById = new Map(
    (operators || [])
      .map((operator) => [
        normalizeOperatorId(operator?.charId),
        operator,
      ])
      .filter(([operatorId]) => operatorId),
  );
  const partnersByOperatorId = new Map(
    [...operatorsById.keys()].map((operatorId) => [
      operatorId,
      new Set(),
    ]),
  );

  for (const operator of operators || []) {
    const operatorId = normalizeOperatorId(operator?.charId);
    if (!operatorId) {
      continue;
    }

    for (const partnerId of operator
      ?.controlCenterSameTeamWithOperatorIds || []) {
      const normalizedPartnerId = normalizeOperatorId(partnerId);
      if (
        !normalizedPartnerId ||
        normalizedPartnerId === operatorId
      ) {
        continue;
      }

      partnersByOperatorId.get(operatorId)?.add(normalizedPartnerId);
      if (operatorsById.has(normalizedPartnerId)) {
        partnersByOperatorId.get(normalizedPartnerId)?.add(operatorId);
      }
    }
  }

  const groups = [];
  const groupByOperatorId = new Map();
  const visitedOperatorIds = new Set();
  for (const operatorId of operatorsById.keys()) {
    if (visitedOperatorIds.has(operatorId)) {
      continue;
    }

    const groupOperatorIds = new Set([operatorId]);
    const pendingOperatorIds = [operatorId];
    while (pendingOperatorIds.length > 0) {
      const pendingOperatorId = pendingOperatorIds.pop();
      if (
        !pendingOperatorId ||
        visitedOperatorIds.has(pendingOperatorId)
      ) {
        continue;
      }

      visitedOperatorIds.add(pendingOperatorId);
      groupOperatorIds.add(pendingOperatorId);
      for (const partnerId of partnersByOperatorId.get(
        pendingOperatorId,
      ) || []) {
        groupOperatorIds.add(partnerId);
        if (
          operatorsById.has(partnerId) &&
          !visitedOperatorIds.has(partnerId)
        ) {
          pendingOperatorIds.push(partnerId);
        }
      }
    }

    const group = {
      operatorIds: [...groupOperatorIds],
      operators: [...groupOperatorIds]
        .map((id) => operatorsById.get(id))
        .filter(Boolean),
      complete: [...groupOperatorIds].every((id) =>
        operatorsById.has(id),
      ),
    };
    groups.push(group);
    group.operatorIds.forEach((id) =>
      groupByOperatorId.set(id, group),
    );
  }

  return { groups, groupByOperatorId };
}

function getSameTeamGroup(groupByOperatorId, operatorId) {
  const normalizedOperatorId = normalizeOperatorId(operatorId);
  return (
    groupByOperatorId.get(normalizedOperatorId) || {
      operatorIds: normalizedOperatorId ? [normalizedOperatorId] : [],
      operators: [],
      complete: true,
    }
  );
}

function getUniqueGroups(operatorIds, groupByOperatorId, requireComplete = false) {
  const groups = [];
  const seen = new Set();

  for (const operatorId of operatorIds || []) {
    const group = getSameTeamGroup(groupByOperatorId, operatorId);
    if (
      group.operatorIds.length === 0 ||
      (requireComplete &&
        (!group.complete ||
          group.operators.length !== group.operatorIds.length))
    ) {
      continue;
    }

    const key = [...group.operatorIds].sort().join(":");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    groups.push(group);
  }

  return groups;
}

function createEmptyTeam(teamIndex, slotCount) {
  return {
    teamIndex,
    slotCount,
    roomEffectOperators: [],
    operatorEffectOperators: [],
    fillerOperators: [],
  };
}

function cloneControlTeams(teams) {
  return (teams || []).map((team) => ({
    ...team,
    roomEffectOperators: [...(team.roomEffectOperators || [])],
    operatorEffectOperators: [...(team.operatorEffectOperators || [])],
    fillerOperators: [...(team.fillerOperators || [])],
  }));
}

function getTeamOperators(team) {
  return [
    ...(team?.roomEffectOperators || []),
    ...(team?.operatorEffectOperators || []),
    ...(team?.fillerOperators || []),
  ];
}

function getTeamOperatorIds(team) {
  return new Set(
    getTeamOperators(team)
      .map((operator) => normalizeOperatorId(operator?.charId))
      .filter(Boolean),
  );
}

function getTeamRoleOperators(team, roleId) {
  if (roleId === ROOM_ROLE_ID) {
    return team?.roomEffectOperators || [];
  }
  if (roleId === OPERATOR_ROLE_ID) {
    return team?.operatorEffectOperators || [];
  }
  return team?.fillerOperators || [];
}

function getTeamRoleCount(team, roleId) {
  return getTeamRoleOperators(team, roleId).length;
}

function getTeamTotalCount(team) {
  return getTeamOperators(team).length;
}

function getRoleCapacity(role, fallback) {
  const value = Number(role?.maxPerTeam);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function isManufactureStationCandidate(operator) {
  return (operator?.controlCenterBuffTags || []).includes(
    "manufacture-station",
  );
}

function hasMon3trManufactureStationCandidate(group) {
  return (group?.operators || []).some(
    (operator) =>
      normalizeOperatorId(operator?.charId) === MON3TR_OPERATOR_ID &&
      isManufactureStationCandidate(operator),
  );
}

function compareManufactureStationMon3trPriority(leftGroup, rightGroup) {
  if (
    !leftGroup?.operators?.some(isManufactureStationCandidate) ||
    !rightGroup?.operators?.some(isManufactureStationCandidate)
  ) {
    return 0;
  }

  return (
    Number(hasMon3trManufactureStationCandidate(rightGroup)) -
    Number(hasMon3trManufactureStationCandidate(leftGroup))
  );
}

function getAvailableRoleOptions(operator, roles, scenarioTrials) {
  return getRoleCandidates(operator, roles).sort(
    (left, right) =>
      getRoleScore(operator, right, scenarioTrials) -
        getRoleScore(operator, left, scenarioTrials) ||
      String(left?.id || "").localeCompare(
        String(right?.id || ""),
        "en",
      ),
  );
}

function getGroupRoleAssignments({
  group,
  team,
  roles,
  primaryRoleId,
  scenarioTrials,
  preferPrimaryRole = true,
}) {
  if (!group?.complete || !group.operators?.length) {
    return null;
  }

  const plannedCounts = new Map();
  const assignments = [];
  const groupOperators = [...group.operators].sort((left, right) => {
    const leftHasPrimary = getRoleCandidates(left, roles).some(
      (role) => role.id === primaryRoleId,
    );
    const rightHasPrimary = getRoleCandidates(right, roles).some(
      (role) => role.id === primaryRoleId,
    );
    return Number(rightHasPrimary) - Number(leftHasPrimary);
  });

  for (const operator of groupOperators) {
    const options = getAvailableRoleOptions(
      operator,
      roles,
      scenarioTrials,
    ).sort((left, right) => {
      const leftPrimary = left.id === primaryRoleId;
      const rightPrimary = right.id === primaryRoleId;
      return (
        (preferPrimaryRole
          ? Number(rightPrimary) - Number(leftPrimary)
          : 0) ||
        getRoleScore(operator, right, scenarioTrials) -
          getRoleScore(operator, left, scenarioTrials) ||
        String(left.id).localeCompare(String(right.id), "en")
      );
    });

    const selectedRole = options.find((role) => {
      const currentCount =
        getTeamRoleCount(team, role.id) +
        Number(plannedCounts.get(role.id) || 0);
      const roleCapacity = getRoleCapacity(
        role,
        role.id === ROOM_ROLE_ID ? 3 : 5,
      );
      const totalCount =
        getTeamTotalCount(team) + assignments.length;
      return (
        currentCount < roleCapacity &&
        totalCount < Number(team?.slotCount || 0)
      );
    });

    if (!selectedRole) {
      return null;
    }

    plannedCounts.set(
      selectedRole.id,
      Number(plannedCounts.get(selectedRole.id) || 0) + 1,
    );
    assignments.push({
      operator,
      roleId: selectedRole.id,
    });
  }

  return assignments;
}

function getPlacementScore({
  assignments,
  team,
  primaryRoleId,
  scenarioTrials,
}) {
  if (primaryRoleId === ROOM_ROLE_ID) {
    const bestScores = getTeamRoomEffectBestScores(team, scenarioTrials);
    let score = 0;

    for (const assignment of assignments || []) {
      if (assignment.roleId !== ROOM_ROLE_ID) {
        continue;
      }

      for (const effectEntry of getScenarioRoomEffectEntries(
        assignment.operator,
        scenarioTrials,
      )) {
        const current = bestScores.get(effectEntry.key);
        if (current === undefined) {
          score += effectEntry.score;
          bestScores.set(effectEntry.key, effectEntry.score);
        } else if (effectEntry.score > current) {
          score += effectEntry.score - current;
          bestScores.set(effectEntry.key, effectEntry.score);
        }
      }
    }

    return score;
  }

  return assignments.reduce(
    (total, assignment) =>
      total +
      (assignment.roleId === primaryRoleId
        ? getRoleScore(assignment.operator, { id: assignment.roleId }, scenarioTrials)
        : 0),
    0,
  );
}

function getManualFillerAssignments(group, team) {
  if (
    !group?.complete ||
    getTeamTotalCount(team) + (group?.operators?.length || 0) >
      Number(team?.slotCount || 0)
  ) {
    return null;
  }

  return (group.operators || []).map((operator) => ({
    operator,
    roleId: FILLER_ROLE_ID,
  }));
}

function canUseGroupInTeams({
  group,
  teams,
  usageByOperatorId,
  reusableOperatorId,
  teamIndex,
}) {
  const team = teams[teamIndex];
  if (!team || !group?.complete) {
    return false;
  }

  const teamOperatorIds = getTeamOperatorIds(team);
  for (const operator of group.operators || []) {
    const operatorId = normalizeOperatorId(operator?.charId);
    if (!operatorId || teamOperatorIds.has(operatorId)) {
      return false;
    }

    const usage = Number(usageByOperatorId.get(operatorId) || 0);
    if (
      usage >=
      getTeamUsageLimit(teams.length, operatorId, reusableOperatorId)
    ) {
      return false;
    }
  }

  return true;
}

function applyAssignmentsToTeam(team, assignments) {
  for (const { operator, roleId } of assignments || []) {
    const key =
      roleId === ROOM_ROLE_ID
        ? "roomEffectOperators"
        : roleId === OPERATOR_ROLE_ID
          ? "operatorEffectOperators"
          : "fillerOperators";
    team[key].push(operator);
  }
}

function getCandidateGroups(candidates) {
  const { groups, groupByOperatorId } =
    createOperatorSameTeamGroupResolver(candidates);
  return {
    groups,
    groupByOperatorId,
  };
}

function getPhasePlacements({
  teams,
  groups,
  roles,
  primaryRoleId,
  scenarioTrials,
  usageByOperatorId,
  reusableOperatorId,
}) {
  const placements = [];
  for (const group of groups || []) {
    for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
      if (
        !canUseGroupInTeams({
          group,
          teams,
          usageByOperatorId,
          reusableOperatorId,
          teamIndex,
        })
      ) {
        continue;
      }

      const assignments = getGroupRoleAssignments({
        group,
        team: teams[teamIndex],
        roles,
        primaryRoleId,
        scenarioTrials,
      });
      if (!assignments) {
        continue;
      }

      const primaryAssignments = assignments.filter(
        (assignment) => assignment.roleId === primaryRoleId,
      );
      if (primaryAssignments.length === 0) {
        continue;
      }

      const score = getPlacementScore(
        {
          assignments,
          team: teams[teamIndex],
          primaryRoleId,
          scenarioTrials,
        },
      );
      if (!(score > 0)) {
        continue;
      }

      placements.push({
        group,
        teamIndex,
        assignments,
        score,
        primaryCount: primaryAssignments.length,
      });
    }
  }

  return placements.sort(
    (left, right) =>
      right.score - left.score ||
      (primaryRoleId === ROOM_ROLE_ID
        ? compareManufactureStationMon3trPriority(left.group, right.group)
        : 0) ||
      left.primaryCount - right.primaryCount ||
      getTeamTotalCount(teams[left.teamIndex]) -
        getTeamTotalCount(teams[right.teamIndex]) ||
      left.teamIndex - right.teamIndex ||
      [...left.group.operatorIds]
        .sort()
        .join(":")
        .localeCompare([...right.group.operatorIds].sort().join(":"), "en"),
  );
}

function selectControlEffectPlacements({
  teams,
  groups,
  roles,
  primaryRoleId,
  scenarioTrials,
  usageByOperatorId,
  reusableOperatorId,
}) {
  while (true) {
    const placements = getPhasePlacements({
      teams,
      groups,
      roles,
      primaryRoleId,
      scenarioTrials,
      usageByOperatorId,
      reusableOperatorId,
    });
    const placement = placements[0];
    if (!placement) {
      break;
    }

    applyAssignmentsToTeam(teams[placement.teamIndex], placement.assignments);
    for (const operator of placement.group.operators || []) {
      const operatorId = normalizeOperatorId(operator?.charId);
      usageByOperatorId.set(
        operatorId,
        Number(usageByOperatorId.get(operatorId) || 0) + 1,
      );
    }
  }
}

function getTeamSegmentIndex(staffingRequirement, index, teamCount) {
  const rotationSegment =
    staffingRequirement?.cohorts?.[0]?.rotationSegments?.[index];
  return Number.isInteger(rotationSegment?.activeTeamIndexes?.[0])
    ? rotationSegment.activeTeamIndexes[0]
    : index % teamCount;
}

function buildSegmentsFromTeams({
  teams,
  staffingRequirement,
  slotCount,
}) {
  const segmentHours = staffingRequirement?.segmentHours || [];
  return segmentHours.map((durationHours, index) => {
    const teamIndex = getTeamSegmentIndex(
      staffingRequirement,
      index,
      teams.length,
    );
    const team = teams[teamIndex] || createEmptyTeam(teamIndex, slotCount);
    const operators = getTeamOperators(team);

    return {
      id: `control-segment-${index + 1}`,
      index,
      durationHours,
      slotCount,
      teamIndex,
      operatorIds: operators.map((operator) => operator.charId),
      operators,
    };
  });
}

function buildControlStateFromTeams({
  teams,
  roleDefinitions,
  candidates,
  staffingRequirement,
  slotCount,
  status = "ready",
}) {
  const roles = (roleDefinitions || []).map((role) => {
    const roleKey =
      role.id === ROOM_ROLE_ID
        ? "roomEffectOperators"
        : role.id === OPERATOR_ROLE_ID
          ? "operatorEffectOperators"
          : "fillerOperators";
    const operatorsByTeamIndex = teams.map((team) => [
      ...(team?.[roleKey] || []),
    ]);
    const operators = operatorsByTeamIndex
      .flat()
      .filter(
        (operator, index, list) =>
          list.findIndex(
            (item) => item.charId === operator.charId,
          ) === index,
      );

    return {
      ...role,
      enabled: true,
      candidates:
        role.id === FILLER_ROLE_ID
          ? candidates
          : candidates.filter((operator) =>
              isRoleCandidate(operator, role),
            ),
      operators,
      operatorsByTeamIndex,
      operator: operators[0] || null,
    };
  });

  const fillerOperators = teams
    .flatMap((team) => team.fillerOperators || [])
    .filter(
      (operator, index, list) =>
        list.findIndex((item) => item.charId === operator.charId) === index,
    );
  roles.push({
    id: FILLER_ROLE_ID,
    label: "中枢补位",
    targetRoomType: "",
    buffTags: [],
    enabled: true,
    candidates,
    operators: fillerOperators,
    operatorsByTeamIndex: teams.map((team) => [
      ...(team.fillerOperators || []),
    ]),
    operator: fillerOperators[0] || null,
  });

  const segments = buildSegmentsFromTeams({
    teams,
    staffingRequirement,
    slotCount,
  });
  const usageByOperatorId = new Map();
  for (const team of teams) {
    for (const operator of getTeamOperators(team)) {
      const operatorId = normalizeOperatorId(operator?.charId);
      if (operatorId) {
        usageByOperatorId.set(
          operatorId,
          Number(usageByOperatorId.get(operatorId) || 0) + 1,
        );
      }
    }
  }

  const maxSegmentOperatorCount = Math.max(
    0,
    ...segments.map((segment) => segment.operatorIds.length),
  );

  return {
    status,
    roles,
    teams,
    teamCount: teams.length,
    slotCount,
    operatorIds: [...usageByOperatorId.keys()],
    segments,
    emptySlotCount: Math.max(0, slotCount - maxSegmentOperatorCount),
    usageByOperatorId: Object.fromEntries(usageByOperatorId),
  };
}

function getStateTeams(state) {
  if (Array.isArray(state?.teams) && state.teams.length > 0) {
    return cloneControlTeams(state.teams);
  }

  return [];
}

export function buildRiicControlCenterAutomaticRoleState({
  staffingRequirement,
  roomGroup,
  hasRoster = false,
  candidates = [],
  roleDefinitions = [],
  scenarioTrials = [],
  fiammettaRecovery = null,
} = {}) {
  if (staffingRequirement?.status !== "ready" || !roomGroup) {
    return getEmptyControlCenterRoleState("missingCapacity");
  }
  if (!hasRoster) {
    return getEmptyControlCenterRoleState("requiresOperators");
  }

  const station = (roomGroup?.stations || []).find(Boolean);
  const slotCount = Number.isInteger(station?.slotCount)
    ? station.slotCount
    : 5;
  const teamCount = Math.max(
    1,
    Number(staffingRequirement?.cohorts?.[0]?.teamCount) || 1,
  );
  const reusableOperatorId =
    fiammettaRecovery?.enabled === true
      ? normalizeOperatorId(fiammettaRecovery?.targetOperatorId)
      : "";
  const teams = Array.from({ length: teamCount }, (_, teamIndex) =>
    createEmptyTeam(teamIndex, slotCount),
  );
  const usageByOperatorId = new Map();
  const { groups } = getCandidateGroups(candidates);
  const effectRoles = (roleDefinitions || []).filter(
    (role) =>
      role?.id === ROOM_ROLE_ID ||
      role?.id === OPERATOR_ROLE_ID,
  );

  selectControlEffectPlacements({
    teams,
    groups,
    roles: effectRoles,
    primaryRoleId: ROOM_ROLE_ID,
    scenarioTrials,
    usageByOperatorId,
    reusableOperatorId,
  });
  selectControlEffectPlacements({
    teams,
    groups,
    roles: effectRoles,
    primaryRoleId: OPERATOR_ROLE_ID,
    scenarioTrials,
    usageByOperatorId,
    reusableOperatorId,
  });

  return buildControlStateFromTeams({
    teams,
    roleDefinitions,
    candidates,
    staffingRequirement,
    slotCount,
  });
}

export function applyRiicControlCenterManualOverrides({
  automaticState,
  manualOverrides,
  candidates = [],
  roleDefinitions = automaticState?.roles || [],
  scenarioTrials = [],
  fiammettaRecovery = null,
} = {}) {
  if (automaticState?.status !== "ready") {
    return automaticState || getEmptyControlCenterRoleState("missingCapacity");
  }

  const teams = getStateTeams(automaticState);
  const { groupByOperatorId } = getCandidateGroups(candidates);
  const removedGroups = getUniqueGroups(
    manualOverrides?.removedOperatorIds || [],
    groupByOperatorId,
  );
  const removedOperatorIds = new Set(
    removedGroups.flatMap((group) => group.operatorIds),
  );
  const removedOperatorIdsByTeamIndex = new Map(
    Object.entries(
      manualOverrides?.removedOperatorIdsByTeamIndex || {},
    ).map(([teamIndex, operatorIds]) => [
      Number(teamIndex),
      new Set(
        getUniqueGroups(operatorIds, groupByOperatorId).flatMap(
          (group) => group.operatorIds,
        ),
      ),
    ]),
  );
  for (const team of teams) {
    const removedFromTeam =
      removedOperatorIdsByTeamIndex.get(Number(team.teamIndex)) ||
      new Set();
    for (const key of [
      "roomEffectOperators",
      "operatorEffectOperators",
      "fillerOperators",
    ]) {
      team[key] = team[key].filter(
        (operator) =>
          !removedOperatorIds.has(normalizeOperatorId(operator?.charId)) &&
          !removedFromTeam.has(normalizeOperatorId(operator?.charId)),
      );
    }
  }

  const reusableOperatorId =
    fiammettaRecovery?.enabled === true
      ? normalizeOperatorId(fiammettaRecovery?.targetOperatorId)
      : "";
  const usageByOperatorId = new Map();
  for (const team of teams) {
    for (const operator of getTeamOperators(team)) {
      const operatorId = normalizeOperatorId(operator?.charId);
      if (operatorId) {
        usageByOperatorId.set(
          operatorId,
          Number(usageByOperatorId.get(operatorId) || 0) + 1,
        );
      }
    }
  }

  for (const [teamIndexValue, operatorIds] of Object.entries(
    manualOverrides?.addedOperatorIdsByTeamIndex || {},
  )) {
    const teamIndex = Number(teamIndexValue);
    const team = teams[teamIndex];
    if (!team) {
      continue;
    }

    for (const group of getUniqueGroups(
      operatorIds,
      groupByOperatorId,
      true,
    )) {
      if (
        !canUseGroupInTeams({
          group,
          teams,
          usageByOperatorId,
          reusableOperatorId,
          teamIndex,
        })
      ) {
        continue;
      }

      const assignments =
        getGroupRoleAssignments({
          group,
          team,
          roles: roleDefinitions.filter(
            (role) =>
              role?.id === ROOM_ROLE_ID ||
              role?.id === OPERATOR_ROLE_ID,
          ),
          primaryRoleId: ROOM_ROLE_ID,
          scenarioTrials,
          preferPrimaryRole: false,
        }) || getManualFillerAssignments(group, team);
      if (!assignments) {
        continue;
      }

      applyAssignmentsToTeam(team, assignments);
      for (const operator of group.operators) {
        const operatorId = normalizeOperatorId(operator?.charId);
        usageByOperatorId.set(
          operatorId,
          Number(usageByOperatorId.get(operatorId) || 0) + 1,
        );
      }
    }
  }

  return buildControlStateFromTeams({
    teams,
    roleDefinitions,
    candidates,
    staffingRequirement: {
      ...automaticState,
      segmentHours: automaticState.segments.map(
        (segment) => segment.durationHours,
      ),
      cohorts: [
        {
          teamCount: automaticState.teamCount,
          rotationSegments: automaticState.segments.map((segment) => ({
            activeTeamIndexes: [segment.teamIndex],
          })),
        },
      ],
    },
    slotCount: automaticState.slotCount,
  });
}

function createLateFillQueue({
  idleFillOperators = [],
  excludedIds,
}) {
  return (idleFillOperators || [])
    .filter((operator) => {
      const charId = normalizeOperatorId(operator?.charId);
      return charId && !excludedIds.has(charId);
    })
    .map((operator) => {
      const isPriorityCandidate = Number.isFinite(
        Number(operator?.idleFillNamedPriority),
      );

      return {
        ...operator,
        controlCenterBuffTags: [],
        controlCenterResolvedEffects: [],
        controlCenterRoomEffectLabel: "",
        lateFillSource: isPriorityCandidate ? "priority" : "idle",
      };
    });
}

export function buildRiicControlCenterLateFillState({
  baseState,
  fallbackPlans = {},
  excludedOperatorIds = [],
  excludedOperatorIdsByTeamIndex = {},
  idleFillOperators = [],
  fiammettaRecovery = null,
} = {}) {
  if (baseState?.status !== "ready") {
    return {
      status: baseState?.status || "missingCapacity",
      teamEntries: [],
      operatorIds: [],
    };
  }

  const teams = getStateTeams(baseState);
  const teamCount = teams.length;
  const reusableOperatorId =
    fiammettaRecovery?.enabled === true
      ? normalizeOperatorId(fiammettaRecovery?.targetOperatorId)
      : "";
  const excludedIds = new Set(
    (excludedOperatorIds || []).map(normalizeOperatorId),
  );
  const excludedIdsByTeamIndex = new Map(
    Object.entries(excludedOperatorIdsByTeamIndex || {}).map(
      ([teamIndex, operatorIds]) => [
        Number(teamIndex),
        new Set((operatorIds || []).map(normalizeOperatorId)),
      ],
    ),
  );
  const occupiedByRooms = new Set();
  const fallbackUsage = new Map();
  for (const plan of Object.values(fallbackPlans || {})) {
    for (const charId of [
      ...(plan?.coreOperatorIds || []),
      ...(plan?.selectedOperatorIds || []),
    ]) {
      occupiedByRooms.add(normalizeOperatorId(charId));
    }
  }
  for (const team of teams) {
    for (const operator of getTeamOperators(team)) {
      const charId = normalizeOperatorId(operator?.charId);
      fallbackUsage.set(
        charId,
        Number(fallbackUsage.get(charId) || 0) + 1,
      );
    }
  }

  const teamEntries = [];

  for (const team of teams) {
    const excludedIdsForTeam = new Set([
      ...excludedIds,
      ...(excludedIdsByTeamIndex.get(Number(team.teamIndex)) || []),
    ]);
    const queue = createLateFillQueue({
      idleFillOperators,
      excludedIds: excludedIdsForTeam,
    });
    const fillers = [];
    for (const operator of queue) {
      const charId = normalizeOperatorId(operator?.charId);
      if (
        !charId ||
        occupiedByRooms.has(charId) ||
        getTeamOperatorIds(team).has(charId)
      ) {
        continue;
      }

      const usage = Number(fallbackUsage.get(charId) || 0);
      if (usage >= getTeamUsageLimit(teamCount, charId, reusableOperatorId)) {
        continue;
      }

      if (
        getTeamTotalCount(team) + fillers.length >=
        Number(team.slotCount || 0)
      ) {
        break;
      }

      fillers.push(operator);
      fallbackUsage.set(charId, usage + 1);
    }

    const priorityOperators = fillers.filter(
      (operator) => operator?.lateFillSource === "priority",
    );
    const idleOperators = fillers.filter(
      (operator) => operator?.lateFillSource === "idle",
    );

    teamEntries.push({
      teamIndex: team.teamIndex,
      slotCount: team.slotCount,
      operators: fillers,
      operatorIds: fillers.map((operator) => operator.charId),
      priorityOperators,
      idleOperators,
      emptySlotCount: Math.max(
        0,
        Number(team.slotCount || 0) -
          getTeamTotalCount(team) -
          fillers.length,
      ),
    });
  }

  return {
    status: "ready",
    teamEntries,
    operatorIds: teamEntries.flatMap((entry) => entry.operatorIds),
  };
}

export function mergeRiicControlCenterLateFillState({
  baseState,
  lateFillState,
} = {}) {
  if (
    baseState?.status !== "ready" ||
    lateFillState?.status !== "ready"
  ) {
    return baseState || getEmptyControlCenterRoleState("missingCapacity");
  }

  const teams = getStateTeams(baseState);
  const lateFillByTeamIndex = new Map(
    (lateFillState.teamEntries || []).map((entry) => [
      Number(entry.teamIndex),
      entry,
    ]),
  );
  for (const team of teams) {
    const lateFill = lateFillByTeamIndex.get(Number(team.teamIndex));
    const remaining = Math.max(
      0,
      Number(team.slotCount || 0) - getTeamTotalCount(team),
    );
    team.fillerOperators.push(
      ...(lateFill?.operators || []).slice(0, remaining),
    );
  }

  return buildControlStateFromTeams({
    teams,
    roleDefinitions: (baseState.roles || []).filter(
      (role) => role.id !== FILLER_ROLE_ID,
    ),
    candidates: (baseState.roles || []).flatMap(
      (role) => role.candidates || [],
    ),
    staffingRequirement: {
      ...baseState,
      segmentHours: (baseState.segments || []).map(
        (segment) => segment.durationHours,
      ),
      cohorts: [
        {
          teamCount: baseState.teamCount,
          rotationSegments: (baseState.segments || []).map((segment) => ({
            activeTeamIndexes: [segment.teamIndex],
          })),
        },
      ],
    },
    slotCount: baseState.slotCount,
  });
}
