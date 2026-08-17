<script setup>
import { computed, ref, watch } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const props = defineProps({
  roomGroup: {
    type: Object,
    required: true,
  },
  controlState: {
    type: Object,
    default: () => ({}),
  },
  lateFillState: {
    type: Object,
    default: () => ({}),
  },
  manualOverrides: {
    type: Object,
    default: () => ({}),
  },
  lateFillExcludedOperatorIdsByTeamIndex: {
    type: Object,
    default: () => ({}),
  },
  operators: {
    type: Array,
    default: () => [],
  },
  idleFillOperators: {
    type: Array,
    default: () => [],
  },
  scenarioTrials: {
    type: Array,
    default: () => [],
  },
  operatorTable: {
    type: Object,
    default: () => ({}),
  },
  fiammettaRecovery: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["save-adjustment", "save-error"]);

const CONTROL_CENTER_CANDIDATE_SECTIONS = Object.freeze([
  {
    id: "room",
    label: "房间产能加成",
  },
  {
    id: "operator",
    label: "干员加成",
  },
  {
    id: "filler",
    label: "补位",
  },
]);

function normalizeOperatorIds(value) {
  return [
    ...new Set(
      (value || [])
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeOperatorIdsByTeamIndex(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([teamIndex, operatorIds]) => {
      const normalizedTeamIndex = String(teamIndex || "").trim();
      const normalizedOperatorIds = normalizeOperatorIds(operatorIds);
      return /^\d+$/.test(normalizedTeamIndex) &&
        normalizedOperatorIds.length > 0
        ? [[normalizedTeamIndex, normalizedOperatorIds]]
        : [];
    }),
  );
}

function normalizeManualOverrides(value) {
  return {
    removedOperatorIds: normalizeOperatorIds(value?.removedOperatorIds),
    removedOperatorIdsByTeamIndex: normalizeOperatorIdsByTeamIndex(
      value?.removedOperatorIdsByTeamIndex,
    ),
    addedOperatorIdsByTeamIndex: normalizeOperatorIdsByTeamIndex(
      value?.addedOperatorIdsByTeamIndex,
    ),
  };
}

function cloneManualOverrides(value) {
  return structuredClone(normalizeManualOverrides(value));
}

function getTeamOperatorIds(team) {
  return [
    ...(team?.roomEffectOperators || []),
    ...(team?.operatorEffectOperators || []),
    ...(team?.fillerOperators || []),
  ]
    .map((operator) => String(operator?.charId || "").trim())
    .filter(Boolean);
}

const activeTeamIndex = ref(0);
const operatorSearch = ref("");
const draftManualOverrides = ref(normalizeManualOverrides());
const draftLateFillExcludedOperatorIdsByTeamIndex = ref({});

const externalDraftSignature = computed(() =>
  JSON.stringify([
    normalizeManualOverrides(props.manualOverrides),
    normalizeOperatorIdsByTeamIndex(
      props.lateFillExcludedOperatorIdsByTeamIndex,
    ),
  ]),
);

function resetDraft() {
  draftManualOverrides.value = cloneManualOverrides(props.manualOverrides);
  draftLateFillExcludedOperatorIdsByTeamIndex.value =
    normalizeOperatorIdsByTeamIndex(
      props.lateFillExcludedOperatorIdsByTeamIndex,
    );
}

watch(externalDraftSignature, resetDraft, { immediate: true });
watch(
  () => props.controlState?.teams?.length || 0,
  (teamCount) => {
    if (activeTeamIndex.value >= teamCount) {
      activeTeamIndex.value = Math.max(0, teamCount - 1);
    }
  },
  { immediate: true },
);

const teams = computed(() => props.controlState?.teams || []);
const activeTeam = computed(
  () => teams.value[activeTeamIndex.value] || null,
);
const lateFillByTeamIndex = computed(
  () =>
    new Map(
      (props.lateFillState?.teamEntries || []).map((entry) => [
        Number(entry?.teamIndex),
        entry,
      ]),
    ),
);
const activeLateFill = computed(
  () => lateFillByTeamIndex.value.get(activeTeamIndex.value) || null,
);
const scenarioTrialByOperatorId = computed(
  () =>
    new Map(
      (props.scenarioTrials || []).flatMap((trial) => {
        const charId = String(trial?.sourceOperatorId || "").trim();
        return charId ? [[charId, trial]] : [];
      }),
    ),
);
const normalizedSearch = computed(() =>
  operatorSearch.value.trim().toLowerCase(),
);
const priorityFillOperators = computed(() =>
  (props.idleFillOperators || []).filter((operator) =>
    Number.isFinite(Number(operator?.idleFillNamedPriority)),
  ),
);
const priorityFillOperatorIds = computed(
  () =>
    new Set(
      priorityFillOperators.value
        .map((operator) => String(operator?.charId || "").trim())
        .filter(Boolean),
    ),
);
const filteredOperatorSections = computed(() => {
  const search = normalizedSearch.value;
  const matchedOperators = search
    ? props.operators.filter((operator) =>
        `${operator.name} ${operator.charId}`.toLowerCase().includes(search),
      )
    : props.operators;

  return CONTROL_CENTER_CANDIDATE_SECTIONS.map((section) => ({
    ...section,
    operators: matchedOperators.filter((operator) =>
      isOperatorInControlCenterCandidateSection(operator, section.id),
    ),
  }));
});
const draftSignature = computed(() =>
  JSON.stringify([
    normalizeManualOverrides(draftManualOverrides.value),
    normalizeOperatorIdsByTeamIndex(
      draftLateFillExcludedOperatorIdsByTeamIndex.value,
    ),
  ]),
);
const hasPendingChanges = computed(
  () => draftSignature.value !== externalDraftSignature.value,
);

function getTeamKey(teamIndex = activeTeamIndex.value) {
  return String(Math.max(0, Number(teamIndex) || 0));
}

function getTeamRemovedOperatorIds(teamIndex = activeTeamIndex.value) {
  const teamKey = getTeamKey(teamIndex);
  return new Set(
    [
      ...draftManualOverrides.value.removedOperatorIds,
      ...(draftManualOverrides.value.removedOperatorIdsByTeamIndex[teamKey] ||
        []),
    ],
  );
}

function getTeamLateFillExcludedOperatorIds(
  teamIndex = activeTeamIndex.value,
) {
  return new Set(
    draftLateFillExcludedOperatorIdsByTeamIndex.value[getTeamKey(teamIndex)] ||
      [],
  );
}

function isOperatorRemovedFromCurrentTeam(charId) {
  const normalizedCharId = String(charId || "").trim();
  return getTeamRemovedOperatorIds().has(normalizedCharId);
}

function isOperatorLateFillExcludedFromCurrentTeam(charId) {
  return getTeamLateFillExcludedOperatorIds().has(
    String(charId || "").trim(),
  );
}

function getActiveCoreOperatorIds() {
  return [
    ...new Set([
      ...getTeamOperatorIds(activeTeam.value).filter(
        (charId) => !isOperatorRemovedFromCurrentTeam(charId),
      ),
      ...getActiveTeamManualAddedOperatorIds(),
    ]),
  ];
}

function getActiveLateFillOperators() {
  const operators = (activeLateFill.value?.operators || []).filter(
    (operator) =>
      !isOperatorLateFillExcludedFromCurrentTeam(operator?.charId),
  );
  const remainingSlotCount = Math.max(
    0,
    Number(activeTeam.value?.slotCount || 0) -
      getActiveCoreOperatorIds().length,
  );
  return operators.slice(0, remainingSlotCount);
}

function getActiveTeamManualAddedOperatorIds() {
  return new Set(
    draftManualOverrides.value.addedOperatorIdsByTeamIndex[getTeamKey()] || [],
  );
}

function getActiveTeamDisplayedOperatorIds() {
  return new Set([
    ...getActiveCoreOperatorIds(),
    ...getActiveLateFillOperators()
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  ]);
}

function getTeamDisplayedOperatorIds(teamIndex) {
  const team = teams.value.find(
    (item) => Number(item?.teamIndex) === Number(teamIndex),
  );
  if (!team) {
    return new Set();
  }

  const teamKey = getTeamKey(teamIndex);
  const removedOperatorIds = getTeamRemovedOperatorIds(teamIndex);
  const coreOperatorIds = new Set(
    getTeamOperatorIds(team).filter(
      (charId) => !removedOperatorIds.has(charId),
    ),
  );
  for (const charId of
    draftManualOverrides.value.addedOperatorIdsByTeamIndex[teamKey] || []) {
    coreOperatorIds.add(charId);
  }

  const lateFillEntry = lateFillByTeamIndex.value.get(Number(teamIndex));
  const lateFillExcludedOperatorIds =
    getTeamLateFillExcludedOperatorIds(teamIndex);
  const remainingSlotCount = Math.max(
    0,
    Number(team.slotCount || 0) - coreOperatorIds.size,
  );
  const lateFillOperatorIds = (lateFillEntry?.operators || [])
    .filter(
      (operator) =>
        !lateFillExcludedOperatorIds.has(
          String(operator?.charId || "").trim(),
        ),
    )
    .slice(0, remainingSlotCount)
    .map((operator) => String(operator?.charId || "").trim())
    .filter(Boolean);

  return new Set([...coreOperatorIds, ...lateFillOperatorIds]);
}

function getTeamCoreOperatorIds(teamIndex) {
  const team = teams.value.find(
    (item) => Number(item?.teamIndex) === Number(teamIndex),
  );
  if (!team) {
    return new Set();
  }

  const teamKey = getTeamKey(teamIndex);
  const removedOperatorIds = getTeamRemovedOperatorIds(teamIndex);
  const coreOperatorIds = new Set(
    getTeamOperatorIds(team).filter(
      (charId) => !removedOperatorIds.has(charId),
    ),
  );
  for (const charId of
    draftManualOverrides.value.addedOperatorIdsByTeamIndex[teamKey] || []) {
    coreOperatorIds.add(charId);
  }
  return coreOperatorIds;
}

function canReuseOperatorAcrossTeams(operatorIds) {
  const targetOperatorId = String(
    props.fiammettaRecovery?.targetOperatorId || "",
  ).trim();
  return (
    props.fiammettaRecovery?.enabled === true &&
    targetOperatorId &&
    operatorIds.length === 1 &&
    operatorIds[0] === targetOperatorId
  );
}

function getOperatorUsageLimit(operatorIds) {
  if (canReuseOperatorAcrossTeams(operatorIds)) {
    return Math.max(1, teams.value.length);
  }
  return teams.value.length === 3 ? 2 : 1;
}

function getOperatorSameTeamIds(charId) {
  const normalizedCharId = String(charId || "").trim();
  const operatorsById = new Map(
    props.operators
      .map((operator) => [String(operator?.charId || "").trim(), operator])
      .filter(([operatorId]) => operatorId),
  );
  if (!normalizedCharId || !operatorsById.has(normalizedCharId)) {
    return normalizedCharId ? [normalizedCharId] : [];
  }

  const operatorIds = new Set();
  const pendingOperatorIds = [normalizedCharId];
  while (pendingOperatorIds.length > 0) {
    const currentOperatorId = pendingOperatorIds.pop();
    if (!currentOperatorId || operatorIds.has(currentOperatorId)) {
      continue;
    }

    operatorIds.add(currentOperatorId);
    const current = operatorsById.get(currentOperatorId);
    const partnerIds = new Set(
      current?.controlCenterSameTeamWithOperatorIds || [],
    );
    for (const [candidateId, candidate] of operatorsById) {
      if (
        (candidate?.controlCenterSameTeamWithOperatorIds || []).includes(
          currentOperatorId,
        )
      ) {
        partnerIds.add(candidateId);
      }
    }
    for (const partnerId of partnerIds) {
      const normalizedPartnerId = String(partnerId || "").trim();
      if (operatorsById.has(normalizedPartnerId)) {
        pendingOperatorIds.push(normalizedPartnerId);
      }
    }
  }

  return [...operatorIds];
}

function updateIdsByTeamIndex(target, teamIndex, operatorIds, action) {
  const teamKey = getTeamKey(teamIndex);
  const nextOperatorIds =
    action === "add"
      ? normalizeOperatorIds([...(target[teamKey] || []), ...operatorIds])
      : (target[teamKey] || []).filter(
          (operatorId) => !operatorIds.includes(operatorId),
        );
  if (nextOperatorIds.length > 0) {
    target[teamKey] = nextOperatorIds;
  } else {
    delete target[teamKey];
  }
}

function addOperatorToActiveTeam(charId) {
  const operator = props.operators.find(
    (item) => String(item?.charId || "").trim() === String(charId || "").trim(),
  );
  if (!operator || getCandidateStatus(operator).disabled) {
    return;
  }

  const sameTeamOperatorIds = getOperatorSameTeamIds(charId);
  if (sameTeamOperatorIds.length === 0 || !activeTeam.value) {
    return;
  }

  const activeCoreOperatorIds = new Set(getActiveCoreOperatorIds());
  const missingOperatorIds = sameTeamOperatorIds.filter(
    (operatorId) => !activeCoreOperatorIds.has(operatorId),
  );
  const projectedCoreCount =
    activeCoreOperatorIds.size + missingOperatorIds.length;
  if (projectedCoreCount > Number(activeTeam.value.slotCount || 0)) {
    return;
  }

  const nextOverrides = cloneManualOverrides(draftManualOverrides.value);
  nextOverrides.removedOperatorIds = nextOverrides.removedOperatorIds.filter(
    (operatorId) => !sameTeamOperatorIds.includes(operatorId),
  );
  updateIdsByTeamIndex(
    nextOverrides.removedOperatorIdsByTeamIndex,
    activeTeamIndex.value,
    sameTeamOperatorIds,
    "remove",
  );
  if (missingOperatorIds.length > 0) {
    updateIdsByTeamIndex(
      nextOverrides.addedOperatorIdsByTeamIndex,
      activeTeamIndex.value,
      missingOperatorIds,
      "add",
    );
  }

  const nextLateFillExclusions = normalizeOperatorIdsByTeamIndex(
    draftLateFillExcludedOperatorIdsByTeamIndex.value,
  );
  updateIdsByTeamIndex(
    nextLateFillExclusions,
    activeTeamIndex.value,
    sameTeamOperatorIds,
    "remove",
  );

  draftManualOverrides.value = nextOverrides;
  draftLateFillExcludedOperatorIdsByTeamIndex.value = nextLateFillExclusions;
}

function removeOperatorFromActiveTeam({ charId, source }) {
  const sameTeamOperatorIds = getOperatorSameTeamIds(charId);
  if (sameTeamOperatorIds.length === 0) {
    return;
  }

  const nextOverrides = cloneManualOverrides(draftManualOverrides.value);
  const nextLateFillExclusions = normalizeOperatorIdsByTeamIndex(
    draftLateFillExcludedOperatorIdsByTeamIndex.value,
  );

  if (source === "lateFill") {
    updateIdsByTeamIndex(
      nextLateFillExclusions,
      activeTeamIndex.value,
      sameTeamOperatorIds,
      "add",
    );
  } else {
    const manuallyAddedOperatorIds = getActiveTeamManualAddedOperatorIds();
    const manuallyAddedIdsToRemove = sameTeamOperatorIds.filter((operatorId) =>
      manuallyAddedOperatorIds.has(operatorId),
    );
    if (manuallyAddedIdsToRemove.length > 0) {
      updateIdsByTeamIndex(
        nextOverrides.addedOperatorIdsByTeamIndex,
        activeTeamIndex.value,
        manuallyAddedIdsToRemove,
        "remove",
      );
    }

    const automaticIdsToRemove = sameTeamOperatorIds.filter(
      (operatorId) => !manuallyAddedOperatorIds.has(operatorId),
    );
    if (automaticIdsToRemove.length > 0) {
      updateIdsByTeamIndex(
        nextOverrides.removedOperatorIdsByTeamIndex,
        activeTeamIndex.value,
        automaticIdsToRemove,
        "add",
      );
    }
  }

  draftManualOverrides.value = nextOverrides;
  draftLateFillExcludedOperatorIdsByTeamIndex.value = nextLateFillExclusions;
}

function getCandidateStatus(operator) {
  const charId = String(operator?.charId || "").trim();
  const sameTeamOperatorIds = getOperatorSameTeamIds(charId);
  const activeOperatorIds = getActiveTeamDisplayedOperatorIds();
  if (sameTeamOperatorIds.every((operatorId) => activeOperatorIds.has(operatorId))) {
    return {
      text: "当前班已安排",
      disabled: true,
    };
  }

  const usedByOtherTeamIndexes = teams.value
    .filter((team) => Number(team?.teamIndex) !== activeTeamIndex.value)
    .filter((team) => {
      const displayedOperatorIds = getTeamDisplayedOperatorIds(
        team.teamIndex,
      );
      return sameTeamOperatorIds.some((operatorId) =>
        displayedOperatorIds.has(operatorId),
      );
    })
    .map((team) => Number(team.teamIndex) + 1);
  const reusableAcrossTeams = canReuseOperatorAcrossTeams(
    sameTeamOperatorIds,
  );
  if (usedByOtherTeamIndexes.length > 0) {
    const usageLimit = getOperatorUsageLimit(sameTeamOperatorIds);
    return {
      text: reusableAcrossTeams
        ? `\u83f2\u4e9a\u6885\u5854\u590d\u7528\uff1a\u5df2\u5728\u7b2c ${usedByOtherTeamIndexes.join("\u3001")} \u73ed`
        : `\u5df2\u5728\u7b2c ${usedByOtherTeamIndexes.join("\u3001")} \u73ed`,
      disabled: usedByOtherTeamIndexes.length >= usageLimit,
    };
  }

  const activeCoreOperatorIds = new Set(getActiveCoreOperatorIds());
  const missingCount = sameTeamOperatorIds.filter(
    (operatorId) => !activeCoreOperatorIds.has(operatorId),
  ).length;
  if (
    activeCoreOperatorIds.size + missingCount >
    Number(activeTeam.value?.slotCount || 0)
  ) {
    return {
      text: "当前班无空位",
      disabled: true,
    };
  }

  return {
    text: "加入当前班",
    disabled: false,
  };
}

function getTrialLabel(operator) {
  const trial = scenarioTrialByOperatorId.value.get(
    String(operator?.charId || "").trim(),
  );
  const roomValue = Number(trial?.roomEffectValue || 0);
  const operatorValue = Number(trial?.operatorTrialValue || 0);
  const parts = [];
  if (roomValue !== 0) {
    parts.push(`房间 ${roomValue >= 0 ? "+" : ""}${roomValue}`);
  }
  if (operatorValue !== 0) {
    parts.push(`干员 ${operatorValue >= 0 ? "+" : ""}${operatorValue}`);
  }
  return parts.join(" / ");
}

function getControlCenterCandidateSectionId(operator) {
  const tags = operator?.controlCenterBuffTags || [];
  if (
    tags.includes("office") ||
    tags.includes("trading-station") ||
    tags.includes("manufacture-station")
  ) {
    return "room";
  }
  if (
    tags.includes("trading-operator") ||
    tags.includes("manufacture-operator")
  ) {
    return "operator";
  }
  if (
    priorityFillOperatorIds.value.has(
      String(operator?.charId || "").trim(),
    )
  ) {
    return "filler";
  }
  return "";
}

function isOperatorInControlCenterCandidateSection(operator, sectionId) {
  const tags = operator?.controlCenterBuffTags || [];
  if (sectionId === "room") {
    return (
      tags.includes("office") ||
      tags.includes("trading-station") ||
      tags.includes("manufacture-station")
    );
  }
  if (sectionId === "operator") {
    return (
      tags.includes("trading-operator") ||
      tags.includes("manufacture-operator")
    );
  }
  return (
    sectionId === "filler" &&
    priorityFillOperatorIds.value.has(
      String(operator?.charId || "").trim(),
    )
  );
}

function appendRowOperators(row, operators, source) {
  const knownIds = new Set(
    row.operators.map((operator) => String(operator?.charId || "").trim()),
  );
  for (const operator of operators || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId || knownIds.has(charId)) {
      continue;
    }
    knownIds.add(charId);
    row.operators.push({
      ...operator,
      source,
    });
  }
}

function getActiveTeamRows() {
  const team = activeTeam.value;
  if (!team) {
    return [];
  }
  const lateFillOperators = getActiveLateFillOperators();
  const operatorsById = new Map(
    props.operators.map((operator) => [
      String(operator?.charId || "").trim(),
      operator,
    ]),
  );
  const rowsById = new Map(
    [
      {
        id: "room",
        label: "房间产能加成",
        operators: [],
      },
      {
        id: "operator",
        label: "干员加成",
        operators: [],
      },
      {
        id: "filler",
        label: "补位",
        operators: [],
      },
    ].map((row) => [row.id, row]),
  );
  const appendToRow = (rowId, operators, source) =>
    appendRowOperators(rowsById.get(rowId), operators, source);

  appendToRow(
    "room",
    (team.roomEffectOperators || []).filter(
      (operator) => !isOperatorRemovedFromCurrentTeam(operator.charId),
    ),
    "automatic",
  );
  appendToRow(
    "operator",
    (team.operatorEffectOperators || []).filter(
      (operator) => !isOperatorRemovedFromCurrentTeam(operator.charId),
    ),
    "automatic",
  );
  appendToRow("filler", lateFillOperators, "lateFill");

  for (const operator of (team.fillerOperators || []).filter(
    (item) => !isOperatorRemovedFromCurrentTeam(item.charId),
  )) {
    appendToRow("filler", [operator], "automatic");
  }
  for (const operatorId of getActiveTeamManualAddedOperatorIds()) {
    const operator = operatorsById.get(operatorId);
    if (operator) {
      appendToRow(
        getControlCenterCandidateSectionId(operator) || "filler",
        [operator],
        "manual",
      );
    }
  }

  return [
    rowsById.get("room"),
    rowsById.get("operator"),
    rowsById.get("filler"),
  ];
}

function cancelDraft() {
  resetDraft();
}

function saveDraft() {
  const operatorTeamIndexes = new Map();
  for (const team of teams.value) {
    const teamIndex = Number(team.teamIndex);
    const coreOperatorIds = getTeamCoreOperatorIds(teamIndex);
    if (coreOperatorIds.size > Number(team.slotCount || 0)) {
      emit("save-error", {
        message: `\u4e2d\u67a2\u7b2c ${teamIndex + 1} \u73ed\u8d85\u8fc7 ${
          team.slotCount || 0
        } \u4eba\uff0c\u65e0\u6cd5\u4fdd\u5b58`,
      });
      return;
    }

    for (const operatorId of coreOperatorIds) {
      const teamIndexes = operatorTeamIndexes.get(operatorId) || new Set();
      teamIndexes.add(teamIndex);
      operatorTeamIndexes.set(operatorId, teamIndexes);
      if (teamIndexes.size > getOperatorUsageLimit([operatorId])) {
        emit("save-error", {
          message: `\u5e72\u5458\u5df2\u8d85\u8fc7\u53ef\u53c2\u4e0e\u7684\u73ed\u6b21\u4e0a\u9650\uff08\u6700\u591a ${
            getOperatorUsageLimit([operatorId])
          } \u73ed\uff09\uff0c\u65e0\u6cd5\u4fdd\u5b58`,
        });
        return;
      }
    }
  }

  emit("save-adjustment", {
    manualOverrides: normalizeManualOverrides(draftManualOverrides.value),
    lateFillExcludedOperatorIdsByTeamIndex: normalizeOperatorIdsByTeamIndex(
      draftLateFillExcludedOperatorIdsByTeamIndex.value,
    ),
  });
}
</script>

<template>
  <section class="control-center-staffing-panel">
    <div
      v-if="controlState.status === 'requiresOperators'"
      class="control-center-empty"
    >
      请先同步干员数据，再安排控制中枢。
    </div>
    <div
      v-else-if="controlState.status === 'missingCapacity'"
      class="control-center-empty"
    >
      当前布局缺少控制中枢容量信息。
    </div>
    <template v-else>
      <header class="control-center-summary">
        <div>
          <strong>控制中枢</strong>
          <span>保存前仅编辑当前班，保存后才会影响后续排班。</span>
        </div>
        <small v-if="hasPendingChanges" class="pending">有未保存修改</small>
        <small v-else>已保存</small>
      </header>

      <nav class="control-center-team-tabs" aria-label="控制中枢班次">
        <button
          v-for="team in teams"
          :key="`control-team-tab-${team.teamIndex}`"
          type="button"
          :class="{ active: activeTeamIndex === team.teamIndex }"
          @click="activeTeamIndex = team.teamIndex"
        >
          <span>中枢班 {{ team.teamIndex + 1 }}</span>
          <small>
            {{ getTeamDisplayedOperatorIds(team.teamIndex).size }} /
            {{ team.slotCount || 0 }}
          </small>
        </button>
      </nav>

      <section v-if="activeTeam" class="control-center-editor">
        <header class="control-center-editor-heading">
          <div>
            <strong>中枢班 {{ activeTeam.teamIndex + 1 }}</strong>
            <small>
              当前显示 {{ getActiveTeamDisplayedOperatorIds().size }} /
              {{ activeTeam.slotCount || 0 }} 人
            </small>
          </div>
          <small v-if="activeLateFill">
            补位为普通房间排完后的预览结果
          </small>
        </header>

        <div class="control-center-team-rows">
          <section
            v-for="row in getActiveTeamRows()"
            :key="row.id"
            class="control-center-team-row"
          >
            <header>
              <strong>{{ row.label }}</strong>
              <small>{{ row.operators.length }} 人</small>
            </header>
            <div class="control-center-team-operators">
              <button
                v-for="operator in row.operators"
                :key="`${row.id}:${operator.source}:${operator.charId}`"
                type="button"
                class="control-center-team-operator"
                :title="`从中枢班 ${activeTeam.teamIndex + 1} 撤下${operator.name}`"
                @click="
                  removeOperatorFromActiveTeam({
                    charId: operator.charId,
                    source: operator.source,
                  })
                "
              >
                <OperatorAvatar
                  :char-id="operator.charId"
                  :rarity="operatorTable?.[operator.charId]?.rarity || 1"
                  :size="34"
                  :mobile-size="32"
                  border
                ></OperatorAvatar>
                <span>
                  <strong>{{ operator.name }}</strong>
                  <small>
                    {{
                      operator.source === "lateFill"
                        ? "自动补位"
                        : operator.source === "manual"
                          ? "待保存"
                          : "自动安排"
                    }}
                  </small>
                </span>
                <v-icon icon="mdi-close" size="15"></v-icon>
              </button>
              <span
                v-for="index in Math.max(
                  0,
                  row.id === 'filler'
                    ? (activeTeam.slotCount || 0) -
                        getActiveTeamDisplayedOperatorIds().size
                    : 0,
                )"
                :key="`empty-slot-${row.id}-${index}`"
                class="control-center-empty-slot"
              >
                <v-icon icon="mdi-account-outline" size="17"></v-icon>
                空位
              </span>
              <span
                v-if="row.operators.length === 0 && row.id !== 'filler'"
                class="control-center-row-empty"
              >
                暂无
              </span>
            </div>
          </section>
        </div>
      </section>

      <section class="control-center-candidates">
        <header>
          <div>
            <strong>可用中枢干员</strong>
            <small>点击后加入中枢班 {{ activeTeamIndex + 1 }}</small>
          </div>
          <input
            v-model="operatorSearch"
            type="search"
            placeholder="搜索干员"
            aria-label="搜索控制中枢干员"
          />
        </header>

        <section
          v-for="section in filteredOperatorSections"
          :key="section.id"
          class="control-center-candidate-section"
        >
          <header>
            <strong>{{ section.label }}</strong>
            <span>{{ section.operators.length }}</span>
          </header>
          <div
            v-if="section.operators.length"
            class="control-center-candidate-list"
          >
            <article
              v-for="operator in section.operators"
              :key="`${section.id}:${operator.charId}`"
              class="control-center-candidate"
              :class="{
                selected: getCandidateStatus(operator).text === '当前班已安排',
              }"
            >
              <button
                type="button"
                class="control-center-candidate-button"
                :disabled="getCandidateStatus(operator).disabled"
                :title="getCandidateStatus(operator).text"
                @click="addOperatorToActiveTeam(operator.charId)"
              >
                <OperatorAvatar
                  :char-id="operator.charId"
                  :rarity="operatorTable?.[operator.charId]?.rarity || 1"
                  :size="34"
                  :mobile-size="32"
                  border
                ></OperatorAvatar>
                <span class="control-center-candidate-copy">
                  <strong>{{ operator.name }}</strong>
                  <small v-if="operator.controlCenterRoomEffectLabel">
                    {{ operator.controlCenterRoomEffectLabel }}
                  </small>
                  <small v-else-if="getTrialLabel(operator)">
                    {{ getTrialLabel(operator) }}
                  </small>
                  <em>{{ getCandidateStatus(operator).text }}</em>
                </span>
              </button>
            </article>
          </div>
          <p v-else class="control-center-candidate-empty">暂无可用干员</p>
        </section>
      </section>

      <footer class="control-center-actions">
        <button
          type="button"
          class="control-center-cancel"
          :disabled="!hasPendingChanges"
          @click="cancelDraft"
        >
          取消修改
        </button>
        <button
          type="button"
          class="control-center-save"
          :disabled="!hasPendingChanges"
          @click="saveDraft"
        >
          保存中枢调整
        </button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.control-center-staffing-panel {
  display: grid;
  gap: 14px;
  margin-top: 12px;
}

.control-center-empty,
.control-center-summary,
.control-center-summary span,
.control-center-editor-heading small,
.control-center-candidates header small,
.control-center-row-empty,
.control-center-candidate-empty {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.control-center-summary,
.control-center-editor-heading,
.control-center-candidates > header,
.control-center-candidate-section > header,
.control-center-team-row > header,
.control-center-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.control-center-summary > div,
.control-center-editor-heading > div,
.control-center-candidates > header > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.control-center-summary strong,
.control-center-editor-heading strong,
.control-center-candidates strong,
.control-center-team-row strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.3;
}

.control-center-summary > small {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 11px;
}

.control-center-summary > small.pending {
  color: var(--riic-orange);
}

.control-center-team-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.control-center-team-tabs button {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 104px;
  padding: 7px 9px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
}

.control-center-team-tabs button small {
  color: var(--riic-muted);
  font-size: 11px;
}

.control-center-team-tabs button.active {
  border-color: var(--riic-blue);
  background: color-mix(
    in srgb,
    var(--riic-blue) 10%,
    var(--c-page-background-color)
  );
}

.control-center-editor {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--c-border-color);
  border-top: 3px solid var(--riic-blue);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.control-center-editor-heading > small {
  max-width: 230px;
  text-align: right;
}

.control-center-team-rows {
  display: grid;
  gap: 8px;
}

.control-center-team-row {
  display: grid;
  gap: 5px;
  padding-top: 8px;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 74%, transparent);
}

.control-center-team-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.control-center-team-row > header small {
  color: var(--riic-muted);
  font-size: 11px;
}

.control-center-team-operators {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.control-center-team-operator,
.control-center-empty-slot {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 5px;
  padding: 4px 6px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--c-text-color);
  font-size: 11px;
  line-height: 1.2;
}

.control-center-team-operator {
  max-width: 152px;
  cursor: pointer;
  text-align: left;
}

.control-center-team-operator > span {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.control-center-team-operator strong,
.control-center-team-operator small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-center-team-operator strong {
  color: var(--c-text-color);
  font-size: 11px;
}

.control-center-team-operator small {
  color: var(--riic-blue);
  font-size: 10px;
}

.control-center-empty-slot {
  border-style: dashed;
  color: var(--riic-muted);
}

.control-center-row-empty {
  padding: 5px 0;
}

.control-center-candidates {
  display: grid;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 74%, transparent);
}

.control-center-candidates input {
  width: min(220px, 48vw);
  min-width: 0;
  padding: 5px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  outline: none;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
}

.control-center-candidates input:focus {
  border-color: var(--riic-blue);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--riic-blue) 16%, transparent);
}

.control-center-candidate-section {
  display: grid;
  gap: 8px;
}

.control-center-candidate-section > header span {
  color: var(--riic-muted);
  font-size: 12px;
}

.control-center-candidate-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 7px;
}

.control-center-candidate {
  min-width: 0;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.control-center-candidate.selected {
  border-color: var(--riic-blue);
  background: color-mix(
    in srgb,
    var(--riic-blue) 10%,
    var(--c-page-background-color)
  );
}

.control-center-candidate-button {
  display: flex;
  width: 100%;
  align-items: center;
  min-width: 0;
  gap: 7px;
  padding: 6px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.control-center-candidate-button:disabled {
  cursor: default;
  opacity: 0.68;
}

.control-center-candidate-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.control-center-candidate-copy strong,
.control-center-candidate-copy small,
.control-center-candidate-copy em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-center-candidate-copy strong {
  color: var(--c-text-color);
  font-size: 11px;
  line-height: 1.2;
}

.control-center-candidate-copy small {
  color: var(--riic-blue);
  font-size: 10px;
  line-height: 1.2;
}

.control-center-candidate-copy em {
  color: var(--riic-muted);
  font-size: 10px;
  font-style: normal;
  line-height: 1.2;
}

.control-center-candidate-empty {
  margin: 0;
}

.control-center-actions {
  position: sticky;
  bottom: 10px;
  z-index: 1;
  justify-content: flex-end;
  padding: 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--c-page-background-color) 92%,
    transparent
  );
  backdrop-filter: blur(8px);
}

.control-center-actions button {
  padding: 6px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.control-center-actions .control-center-save {
  border-color: var(--riic-blue);
  background: var(--riic-blue);
  color: #fff;
}

.control-center-actions button:disabled {
  cursor: default;
  opacity: 0.52;
}

@media (max-width: 640px) {
  .control-center-summary,
  .control-center-editor-heading,
  .control-center-candidates > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .control-center-editor-heading > small {
    max-width: none;
    text-align: left;
  }

  .control-center-candidates input {
    width: 100%;
  }

  .control-center-candidate-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
