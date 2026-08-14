function getEmptyControlCenterRoleState(status) {
  return {
    status,
    roles: [],
    operatorIds: [],
    segments: [],
    emptySlotCount: 0,
  };
}

function operatorMatchesRole(operator, role) {
  const tags = operator?.controlCenterBuffTags || [];
  return (role?.buffTags || []).some((tag) => tags.includes(tag));
}

function getFunctionRoleScore(operator, role) {
  return Math.max(
    0,
    ...(operator?.controlCenterResolvedEffects || [])
      .filter(
        (effect) =>
          !effect?.conditions &&
          String(effect?.target?.roomType || "").trim() ===
            role?.targetRoomType,
      )
      .map((effect) => Number(effect?.bonusPercent || 0))
      .filter(Number.isFinite),
  );
}

function getScenarioTrialScore(operator, scenarioTrials) {
  const operatorId = String(operator?.charId || "").trim();
  const scenario = (scenarioTrials || []).find(
    (item) => String(item?.sourceOperatorId || "").trim() === operatorId,
  );
  const score = Number(scenario?.deltaScore ?? scenario?.contributionScore);
  return Number.isFinite(score) ? score : 0;
}

function getRoleCapacityById({ roles, slotCount, teamCount }) {
  const roleTeamCapacityById = getRoleTeamCapacityById({
    roles,
    slotCount,
  });

  return new Map(
    roles.map((role) => [
      role.id,
      (roleTeamCapacityById.get(role.id) || 0) * teamCount,
    ]),
  );
}

function getRoleTeamCapacityById({ roles, slotCount }) {
  const roomFunctionRoleCount = roles.filter(
    (role) => role.targetRoomType,
  ).length;
  const operatorRoleTeamCapacity = Math.max(
    0,
    slotCount - roomFunctionRoleCount,
  );

  return new Map(
    roles.map((role) => [
      role.id,
      role.id === "operator" ? operatorRoleTeamCapacity : 1,
    ]),
  );
}

function createOperatorSameTeamGroupResolver(operators) {
  const operatorsById = new Map(
    (operators || [])
      .map((operator) => [
        String(operator?.charId || "").trim(),
        operator,
      ])
      .filter(([operatorId]) => operatorId),
  );
  const partnersByOperatorId = new Map(
    [...operatorsById.keys()].map((operatorId) => [operatorId, new Set()]),
  );

  for (const operator of operators || []) {
    const operatorId = String(operator?.charId || "").trim();
    if (!operatorId) {
      continue;
    }

    for (const partnerId of operator?.controlCenterSameTeamWithOperatorIds ||
      []) {
      const normalizedPartnerId = String(partnerId || "").trim();
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

  const visitedOperatorIds = new Set();
  const groups = [];
  const groupByOperatorId = new Map();
  for (const operator of operators || []) {
    const operatorId = String(operator?.charId || "").trim();
    if (!operatorId || visitedOperatorIds.has(operatorId)) {
      continue;
    }

    const groupOperatorIds = new Set([operatorId]);
    const pendingOperatorIds = [operatorId];
    while (pendingOperatorIds.length > 0) {
      const pendingOperatorId = pendingOperatorIds.pop();
      if (!pendingOperatorId || visitedOperatorIds.has(pendingOperatorId)) {
        continue;
      }

      visitedOperatorIds.add(pendingOperatorId);
      groupOperatorIds.add(pendingOperatorId);
      for (const partnerId of partnersByOperatorId.get(pendingOperatorId) ||
        []) {
        groupOperatorIds.add(partnerId);
        if (!visitedOperatorIds.has(partnerId)) {
          if (operatorsById.has(partnerId)) {
            pendingOperatorIds.push(partnerId);
          }
        }
      }
    }

    const group = {
      operatorIds: [...groupOperatorIds],
      operators: [...operatorsById.values()].filter((item) =>
        groupOperatorIds.has(String(item?.charId || "").trim()),
      ),
      complete: [...groupOperatorIds].every((id) => operatorsById.has(id)),
    };
    groups.push(group);
    group.operators.forEach((item) => {
      groupByOperatorId.set(String(item?.charId || "").trim(), group);
    });
  }

  return {
    groups,
    groupByOperatorId,
  };
}

function getSameTeamGroupForOperatorId(groupByOperatorId, operatorId) {
  const normalizedOperatorId = String(operatorId || "").trim();
  return (
    groupByOperatorId.get(normalizedOperatorId) || {
      operatorIds: normalizedOperatorId ? [normalizedOperatorId] : [],
      operators: [],
      complete: true,
    }
  );
}

function getSameTeamGroupsForOperatorIds(
  operatorIds,
  groupByOperatorId,
  { requireComplete = false } = {},
) {
  const seenGroupKeys = new Set();
  const groups = [];

  for (const operatorId of operatorIds || []) {
    const group = getSameTeamGroupForOperatorId(
      groupByOperatorId,
      operatorId,
    );
    if (
      group.operatorIds.length === 0 ||
      (requireComplete &&
        (!group.complete ||
          group.operators.length !== group.operatorIds.length))
    ) {
      continue;
    }

    const key = [...group.operatorIds].sort().join(":");
    if (seenGroupKeys.has(key)) {
      continue;
    }
    seenGroupKeys.add(key);
    groups.push(group);
  }

  return groups;
}

function getRoleOptionSortValue(operator, role) {
  return [
    -getFunctionRoleScore(operator, role),
    (role?.candidates || []).length,
    String(role?.id || ""),
  ];
}

function getSortedMatchingRoles(operator, roles, preferredRole = null) {
  const operatorId = String(operator?.charId || "").trim();
  const matchingRoles = (roles || []).filter((role) =>
    (role?.candidates || []).some(
      (candidate) =>
        String(candidate?.charId || "").trim() === operatorId,
    ),
  );

  return [
    ...(preferredRole ? [preferredRole] : []),
    ...matchingRoles.filter((role) => role.id !== preferredRole?.id),
  ].sort((left, right) => {
    const [leftScore, leftCandidateCount, leftId] = getRoleOptionSortValue(
      operator,
      left,
    );
    const [rightScore, rightCandidateCount, rightId] = getRoleOptionSortValue(
      operator,
      right,
    );
    return (
      leftScore - rightScore ||
      leftCandidateCount - rightCandidateCount ||
      leftId.localeCompare(rightId, "en")
    );
  });
}

function getSameTeamGroupRoleAssignments({
  operator,
  role,
  roles,
  sameTeamGroupByOperatorId,
  selectedOperatorsByRoleId,
  roleCapacityById,
  roleTeamCapacityById,
}) {
  const operatorId = String(operator?.charId || "").trim();
  const group = sameTeamGroupByOperatorId.get(operatorId) || {
    operatorIds: [operatorId],
    operators: [operator],
    complete: true,
  };
  if (group.operatorIds.length <= 1) {
    return null;
  }
  if (!group.complete || group.operators.length !== group.operatorIds.length) {
    return [];
  }

  const plannedCountByRoleId = new Map();
  const assignments = [];
  const groupOperators = [
    operator,
    ...group.operators.filter(
      (item) =>
        String(item?.charId || "").trim() !== operatorId,
    ),
  ];

  for (const groupOperator of groupOperators) {
    const roleOptions = getSortedMatchingRoles(
      groupOperator,
      roles,
      String(groupOperator?.charId || "").trim() === operatorId
        ? role
        : null,
    );
    const nextRole = roleOptions.find((roleOption) => {
      const selectedCount =
        (selectedOperatorsByRoleId.get(roleOption.id) || []).length;
      const plannedCount = plannedCountByRoleId.get(roleOption.id) || 0;
      return (
        selectedCount + plannedCount <
          (roleCapacityById.get(roleOption.id) || 0) &&
        plannedCount + 1 <=
          (roleTeamCapacityById.get(roleOption.id) || 0)
      );
    });
    if (!nextRole) {
      return [];
    }

    plannedCountByRoleId.set(
      nextRole.id,
      (plannedCountByRoleId.get(nextRole.id) || 0) + 1,
    );
    assignments.push({
      operator: groupOperator,
      role: nextRole,
    });
  }

  return assignments;
}

function getLeastCompatibleTeamIndex(
  teamOperatorsByRoleId,
  roleTeamCapacityById,
  assignments,
) {
  const assignmentCountByRoleId = new Map();
  assignments.forEach(({ role }) => {
    assignmentCountByRoleId.set(
      role.id,
      (assignmentCountByRoleId.get(role.id) || 0) + 1,
    );
  });

  const teamCount = [...teamOperatorsByRoleId.values()][0]?.length || 0;
  return Array.from({ length: teamCount }, (_, teamIndex) => ({
      teamIndex,
      operatorCount: [...teamOperatorsByRoleId.values()].reduce(
        (total, operatorsByTeamIndex) =>
          total + (operatorsByTeamIndex[teamIndex]?.length || 0),
        0,
      ),
    }))
    .filter(
      (team) => {
        return [...assignmentCountByRoleId.entries()].every(
          ([roleId, assignmentCount]) =>
            (teamOperatorsByRoleId.get(roleId)?.[team.teamIndex]?.length ||
              0) +
              assignmentCount <=
            (roleTeamCapacityById.get(roleId) || 0),
        );
      },
    )
    .sort(
      (left, right) =>
        left.operatorCount - right.operatorCount ||
        left.teamIndex - right.teamIndex,
    )[0]?.teamIndex;
}

function distributeSelectedRoleOperators(
  roles,
  selectedOperatorsByRoleId,
  teamCount,
  slotCount,
  reusableOperatorId = "",
  sameTeamGroupByOperatorId = new Map(),
) {
  const teamOperatorsByRoleId = new Map(
    (roles || []).map((role) => [
      role.id,
      Array.from({ length: teamCount }, () => []),
    ]),
  );
  const roleTeamCapacityById = getRoleTeamCapacityById({
    roles,
    slotCount,
  });
  const normalizedReusableOperatorId = String(reusableOperatorId || "").trim();
  const selectedEntryByOperatorId = new Map();
  const reusableEntries = [];

  for (const role of roles || []) {
    for (const operator of selectedOperatorsByRoleId.get(role.id) || []) {
      const operatorId = String(operator?.charId || "").trim();
      if (!operatorId) {
        continue;
      }

      const entry = { operator, role };
      if (
        normalizedReusableOperatorId &&
        operatorId === normalizedReusableOperatorId
      ) {
        reusableEntries.push(entry);
        continue;
      }

      if (!selectedEntryByOperatorId.has(operatorId)) {
        selectedEntryByOperatorId.set(operatorId, entry);
      }
    }
  }

  const assignedOperatorIds = new Set();
  const placeAssignments = (assignments) => {
    const teamIndex = getLeastCompatibleTeamIndex(
      teamOperatorsByRoleId,
      roleTeamCapacityById,
      assignments,
    );
    if (teamIndex === undefined) {
      return false;
    }

    assignments.forEach(({ operator, role }) => {
      teamOperatorsByRoleId.get(role.id)?.[teamIndex].push(operator);
      assignedOperatorIds.add(String(operator?.charId || "").trim());
    });
    return true;
  };

  for (const [operatorId, entry] of selectedEntryByOperatorId) {
    if (assignedOperatorIds.has(operatorId)) {
      continue;
    }

    const group = sameTeamGroupByOperatorId.get(operatorId) || {
      operatorIds: [operatorId],
      operators: [entry.operator],
      complete: true,
    };
    const groupEntries = group.operators
      .map((operator) =>
        selectedEntryByOperatorId.get(String(operator?.charId || "").trim()),
      )
      .filter(Boolean);
    const isCompleteGroup =
      group.complete &&
      groupEntries.length === group.operatorIds.length;
    if (!isCompleteGroup) {
      group.operators.forEach((operator) =>
        assignedOperatorIds.add(String(operator?.charId || "").trim()),
      );
      continue;
    }

    placeAssignments(groupEntries);
  }

  for (const entry of reusableEntries) {
    placeAssignments([entry]);
  }

  return teamOperatorsByRoleId;
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
      ? String(fiammettaRecovery?.targetOperatorId || "").trim()
      : "";
  const isReusableOperator = (operator) =>
    Boolean(reusableOperatorId) &&
    String(operator?.charId || "").trim() === reusableOperatorId;
  const roles = (roleDefinitions || []).map((definition) => ({
    ...definition,
    enabled: true,
    candidates: (candidates || []).filter((operator) =>
      operatorMatchesRole(operator, definition),
    ),
  }));
  const roleCapacityById = getRoleCapacityById({
    roles,
    slotCount,
    teamCount,
  });
  const roleTeamCapacityById = getRoleTeamCapacityById({
    roles,
    slotCount,
  });
  const { groupByOperatorId: sameTeamGroupByOperatorId } =
    createOperatorSameTeamGroupResolver(candidates);
  const selectedOperatorsByRoleId = new Map(
    roles.map((role) => [role.id, []]),
  );
  const claimedOperatorIds = new Set();
  const reusableOperatorRoleIds = new Map();
  const candidateRolePairs = roles
    .filter((role) => role.enabled)
    .flatMap((role) =>
      role.candidates.flatMap((operator) => {
        const repeatCount = isReusableOperator(operator)
          ? Math.min(
              teamCount,
              Math.max(0, roleCapacityById.get(role.id) || 0),
            )
          : 1;

        return Array.from({ length: repeatCount }, (_, repeatIndex) => ({
          role,
          operator,
          repeatIndex,
        }));
      }),
    )
    .sort(
      (left, right) =>
        getScenarioTrialScore(right.operator, scenarioTrials) -
          getScenarioTrialScore(left.operator, scenarioTrials) ||
        getFunctionRoleScore(right.operator, right.role) -
          getFunctionRoleScore(left.operator, left.role) ||
        left.role.candidates.length - right.role.candidates.length ||
        String(left.operator?.name || "").localeCompare(
          String(right.operator?.name || ""),
          "zh-CN",
        ) ||
        String(left.operator?.charId || "").localeCompare(
          String(right.operator?.charId || ""),
          "en",
        ) ||
        left.role.id.localeCompare(right.role.id, "en") ||
        left.repeatIndex - right.repeatIndex,
    );

  for (const { role, operator } of candidateRolePairs) {
    const selectedOperators = selectedOperatorsByRoleId.get(role.id) || [];
    const operatorId = String(operator?.charId || "").trim();
    const isReusable = isReusableOperator(operator);
    const reusableOperatorRoleId = reusableOperatorRoleIds.get(operatorId);
    const sameTeamGroup = sameTeamGroupByOperatorId.get(operatorId);
    const isHardSameTeamGroup =
      (sameTeamGroup?.operatorIds?.length || 0) > 1;
    if (
      (!isReusable && claimedOperatorIds.has(operator.charId)) ||
      (isReusable &&
        reusableOperatorRoleId &&
        reusableOperatorRoleId !== role.id) ||
      (isReusable &&
        selectedOperators.filter(
          (selectedOperator) => selectedOperator.charId === operator.charId,
        ).length >= teamCount) ||
      selectedOperators.length >= (roleCapacityById.get(role.id) || 0)
    ) {
      continue;
    }

    if (isHardSameTeamGroup) {
      if (
        sameTeamGroup.operatorIds.some((memberId) =>
          claimedOperatorIds.has(memberId),
        )
      ) {
        continue;
      }

      const assignments = getSameTeamGroupRoleAssignments({
        operator,
        role,
        roles,
        sameTeamGroupByOperatorId,
        selectedOperatorsByRoleId,
        roleCapacityById,
        roleTeamCapacityById,
      });
      if (assignments.length === 0) {
        continue;
      }

      assignments.forEach(({ operator: groupOperator, role: groupRole }) => {
        const groupSelectedOperators =
          selectedOperatorsByRoleId.get(groupRole.id) || [];
        groupSelectedOperators.push(groupOperator);
        selectedOperatorsByRoleId.set(groupRole.id, groupSelectedOperators);
        claimedOperatorIds.add(String(groupOperator?.charId || "").trim());
      });
      continue;
    }

    selectedOperators.push(operator);
    selectedOperatorsByRoleId.set(role.id, selectedOperators);
    if (isReusable) {
      reusableOperatorRoleIds.set(operatorId, role.id);
    } else {
      claimedOperatorIds.add(operator.charId);
    }
  }

  const operatorsByTeamIndexByRoleId = distributeSelectedRoleOperators(
    roles,
    selectedOperatorsByRoleId,
    teamCount,
    slotCount,
    reusableOperatorId,
    sameTeamGroupByOperatorId,
  );
  const resolvedRoles = roles.map((role) => {
    const operatorsByTeamIndex =
      operatorsByTeamIndexByRoleId.get(role.id) ||
      Array.from({ length: teamCount }, () => []);
    const uniqueOperators = operatorsByTeamIndex
      .flat()
      .filter(
      (operator, index, list) =>
        list.findIndex((item) => item.charId === operator.charId) === index,
      );

    return {
      ...role,
      operators: uniqueOperators,
      operatorsByTeamIndex,
      operator: uniqueOperators[0] || null,
    };
  });
  const allRoles = [
    ...resolvedRoles,
    {
      id: "other",
      label: "其他中枢干员",
      targetRoomType: "",
      buffTags: [],
      enabled: true,
      candidates,
      operators: [],
      operator: null,
    },
  ];
  const controlCohort = staffingRequirement?.cohorts?.[0];
  const segments = (staffingRequirement?.segmentHours || []).map(
    (durationHours, index) => {
      const rotationSegment = controlCohort?.rotationSegments?.[index];
      const teamIndex = Number.isInteger(
        rotationSegment?.activeTeamIndexes?.[0],
      )
        ? rotationSegment.activeTeamIndexes[0]
        : index % teamCount;
      const operators = resolvedRoles.flatMap(
        (role) => role.operatorsByTeamIndex[teamIndex] || [],
      );

      return {
        id: `control-segment-${index + 1}`,
        index,
        durationHours,
        slotCount,
        teamIndex,
        operatorIds: operators.map((operator) => operator.charId),
        operators,
      };
    },
  );
  const maxSegmentOperatorCount = Math.max(
    0,
    ...segments.map((segment) => segment.operatorIds.length),
  );

  return {
    status: "ready",
    roles: allRoles,
    operatorIds: [
      ...new Set(
        allRoles.flatMap((role) =>
          role.operators.map((operator) => operator.charId),
        ),
      ),
    ],
    segments,
    emptySlotCount: Math.max(0, slotCount - maxSegmentOperatorCount),
  };
}

function getOperatorById(candidates, charId) {
  return (
    (candidates || []).find(
      (operator) => String(operator?.charId || "").trim() === charId,
    ) || null
  );
}

export function applyRiicControlCenterManualOverrides({
  automaticState,
  manualOverrides,
  candidates = [],
} = {}) {
  if (automaticState?.status !== "ready") {
    return automaticState || getEmptyControlCenterRoleState("missingCapacity");
  }

  const { groupByOperatorId: sameTeamGroupByOperatorId } =
    createOperatorSameTeamGroupResolver(candidates);
  const removedOperatorIds = new Set(
    getSameTeamGroupsForOperatorIds(
      manualOverrides?.removedOperatorIds || [],
      sameTeamGroupByOperatorId,
    ).flatMap((group) => group.operatorIds),
  );
  const manuallyAddedGroupsByTeamIndex = new Map(
    Object.entries(
      manualOverrides?.addedOperatorIdsByTeamIndex || {},
    ).map(([teamIndex, operatorIds]) => [
      String(teamIndex),
      getSameTeamGroupsForOperatorIds(
        operatorIds,
        sameTeamGroupByOperatorId,
        { requireComplete: true },
      ),
    ]),
  );
  const manuallyAddedOperatorIds = new Set(
    [...manuallyAddedGroupsByTeamIndex.values()].flatMap((groups) =>
      groups.flatMap((group) => group.operatorIds),
    ),
  );
  const automaticRoles = automaticState.roles.map((role) => {
    const operators = role.operators.filter(
      (operator) =>
        !removedOperatorIds.has(operator.charId) &&
        !manuallyAddedOperatorIds.has(operator.charId),
    );

    return {
      ...role,
      operators,
      operator: operators[0] || null,
    };
  });
  const actualManuallyAddedOperatorIds = new Set();
  const segments = automaticState.segments.map((segment) => {
    const operators = segment.operators.filter(
      (operator) =>
        !removedOperatorIds.has(operator.charId) &&
        !manuallyAddedOperatorIds.has(operator.charId),
    );
    const finalOperators = [...operators].filter(
      (operator, index, list) =>
        list.findIndex((item) => item.charId === operator.charId) === index,
    );

    for (const group of manuallyAddedGroupsByTeamIndex.get(
      String(segment.teamIndex),
    ) || []) {
      const missingOperators = group.operators.filter(
        (operator) =>
          !finalOperators.some(
            (item) => item.charId === operator.charId,
          ),
      );
      if (
        finalOperators.length + missingOperators.length >
        Number(segment.slotCount || 0)
      ) {
        continue;
      }

      finalOperators.push(...missingOperators);
      missingOperators.forEach((operator) =>
        actualManuallyAddedOperatorIds.add(operator.charId),
      );
    }

    return {
      ...segment,
      operatorIds: finalOperators.map((operator) => operator.charId),
      operators: finalOperators,
    };
  });
  const manuallyAddedOperators = [...actualManuallyAddedOperatorIds]
    .map((charId) => getOperatorById(candidates, charId))
    .filter(Boolean);
  const roles = automaticRoles.map((role) => {
    if (role.id !== "other") {
      return role;
    }

    const operators = [...role.operators, ...manuallyAddedOperators].filter(
      (operator, index, list) =>
        list.findIndex((item) => item.charId === operator.charId) === index,
    );
    return {
      ...role,
      operators,
      operator: operators[0] || null,
    };
  });
  const maxSegmentOperatorCount = Math.max(
    0,
    ...segments.map((segment) => segment.operatorIds.length),
  );

  return {
    ...automaticState,
    roles,
    segments,
    operatorIds: [
      ...new Set(segments.flatMap((segment) => segment.operatorIds)),
    ],
    emptySlotCount: Math.max(
      0,
      (automaticState.segments[0]?.slotCount || 0) - maxSegmentOperatorCount,
    ),
  };
}

export function buildRiicControlCenterLateFillState({
  baseState,
  fallbackPlans = {},
  excludedOperatorIds = [],
  controlCandidates = [],
  roster = [],
} = {}) {
  if (baseState?.status !== "ready") {
    return {
      status: baseState?.status || "missingCapacity",
      teamEntries: [],
      operatorIds: [],
    };
  }

  const excludedIds = new Set(excludedOperatorIds);
  const occupiedOperatorIds = new Set(baseState.operatorIds || []);
  for (const plan of Object.values(fallbackPlans || {})) {
    for (const charId of [
      ...(plan?.coreOperatorIds || []),
      ...(plan?.selectedOperatorIds || []),
    ]) {
      occupiedOperatorIds.add(charId);
    }
  }

  const effectCandidates = controlCandidates
    .filter((operator) => {
      const charId = String(operator?.charId || "").trim();
      return charId && !excludedIds.has(charId);
    })
    .map((operator) => ({
      ...operator,
      lateFillSource: "effect",
    }));
  const effectCandidateIds = new Set(
    effectCandidates.map((operator) => operator.charId),
  );
  const idleCandidatesById = new Map();
  for (const operator of roster || []) {
    const charId = String(operator?.charId || "").trim();
    if (
      !charId ||
      excludedIds.has(charId) ||
      effectCandidateIds.has(charId) ||
      idleCandidatesById.has(charId)
    ) {
      continue;
    }

    idleCandidatesById.set(charId, {
      ...operator,
      controlCenterBuffTags: [],
      controlCenterResolvedEffects: [],
      controlCenterRoomEffectLabel: "",
      lateFillSource: "idle",
    });
  }
  const candidateQueue = [...effectCandidates, ...idleCandidatesById.values()];
  const candidateQueueByOperatorId = new Map(
    candidateQueue.map((operator) => [
      String(operator?.charId || "").trim(),
      operator,
    ]),
  );
  const { groupByOperatorId: sameTeamGroupByOperatorId } =
    createOperatorSameTeamGroupResolver(controlCandidates);
  const teamIndexes = [
    ...new Set(
      (baseState.segments || [])
        .map((segment) => Number(segment?.teamIndex))
        .filter((teamIndex) => Number.isInteger(teamIndex) && teamIndex >= 0),
    ),
  ].sort((left, right) => left - right);
  const teamEntries = [];

  for (const teamIndex of teamIndexes) {
    const sourceSegment = (baseState.segments || []).find(
      (segment) => Number(segment?.teamIndex) === teamIndex,
    );
    const slotCount = Math.max(0, Number(sourceSegment?.slotCount || 0));
    const operators = [...(sourceSegment?.operators || [])];
    const fillers = [];
    const attemptedGroupKeys = new Set();

    for (const operator of candidateQueue) {
      if (operators.length + fillers.length >= slotCount) {
        break;
      }

      const charId = String(operator?.charId || "").trim();
      if (!charId || occupiedOperatorIds.has(charId)) {
        continue;
      }

      const group = getSameTeamGroupForOperatorId(
        sameTeamGroupByOperatorId,
        charId,
      );
      const groupKey = [...group.operatorIds].sort().join(":");
      if (attemptedGroupKeys.has(groupKey)) {
        continue;
      }
      attemptedGroupKeys.add(groupKey);

      const groupOperators =
        group.operators.length > 0
          ? group.operatorIds
              .map((operatorId) =>
                candidateQueueByOperatorId.get(operatorId),
              )
              .filter(Boolean)
          : [operator];
      const isCompleteGroup =
        group.complete &&
        groupOperators.length === group.operatorIds.length;
      if (
        !isCompleteGroup ||
        groupOperators.some((item) =>
          occupiedOperatorIds.has(String(item?.charId || "").trim()),
        ) ||
        operators.length + fillers.length + groupOperators.length > slotCount
      ) {
        continue;
      }

      fillers.push(...groupOperators);
      groupOperators.forEach((item) =>
        occupiedOperatorIds.add(String(item?.charId || "").trim()),
      );
    }

    teamEntries.push({
      teamIndex,
      slotCount,
      operators: fillers,
      operatorIds: fillers.map((operator) => operator.charId),
      emptySlotCount: Math.max(
        0,
        slotCount - operators.length - fillers.length,
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

  const lateFillByTeamIndex = new Map(
    lateFillState.teamEntries.map((entry) => [entry.teamIndex, entry]),
  );
  const segments = (baseState.segments || []).map((segment) => {
    const lateFill = lateFillByTeamIndex.get(segment.teamIndex);
    const operators = [
      ...(segment.operators || []),
      ...(lateFill?.operators || []),
    ].slice(0, segment.slotCount);

    return {
      ...segment,
      operators,
      operatorIds: operators.map((operator) => operator.charId),
    };
  });
  const maxSegmentOperatorCount = Math.max(
    0,
    ...segments.map((segment) => segment.operatorIds.length),
  );

  return {
    ...baseState,
    segments,
    operatorIds: [
      ...new Set(segments.flatMap((segment) => segment.operatorIds || [])),
    ],
    emptySlotCount: Math.max(
      0,
      (segments[0]?.slotCount || 0) - maxSegmentOperatorCount,
    ),
  };
}
