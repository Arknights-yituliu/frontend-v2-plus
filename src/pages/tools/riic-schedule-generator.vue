<script setup>
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { saveAs } from "file-saver";
import { useRoute } from "vue-router";
import operatorDataAPI from "/src/api/operatorData.js";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import { cMessage } from "/src/utils/message.js";
import { operatorTableV2 } from "/src/utils/gameData.js";
import {
  ESTIMATION_ASSUMPTIONS,
  RIIC_SCHEDULE_CANDIDATES,
  RIIC_SCHEDULE_SOURCE,
  buildMaaSchedule,
  buildRecommendationSummary,
} from "/src/utils/riicScheduleRecommendation.js";
import {
  createRiicLayoutRecommendation,
  RIIC_LAYOUTS as RIIC_LAYOUT_RECOMMENDATION_LAYOUTS,
} from "/src/utils/riicLayoutRecommendation.js";

const SKLAND_ACCOUNT_SESSION_STORAGE_KEY = "skland_account_data";
const RIIC_SCHEDULE_DRAFT_STORAGE_KEY =
  "riic_schedule_generator_draft_v2";
const LEGACY_RIIC_SCHEDULE_DRAFT_STORAGE_KEY =
  "riic_schedule_generator_draft_v1";
const RIIC_SCHEDULE_DRAFT_VERSION = 2;
const operatorAvatarMap = new Map(
  Object.entries(operatorTableV2).map(([charId, operator]) => [
    operator.name,
    {
      charId,
      rarity: operator.rarity,
    },
  ]),
);
const route = useRoute();

const developerLayoutOptions = [
  {
    value: "153",
    label: "153",
    description: "1 座贸易站、5 座制造站",
  },
  {
    value: "243",
    label: "243",
    description: "2 座贸易站、4 座制造站",
  },
];
const developerShiftOptions = [
  {
    value: "twice",
    label: "一天两换",
    description: "原表中的两次换班作业",
  },
  {
    value: "threeTimes",
    label: "一天三换",
    description: "原表中的三次换班作业",
  },
];
const MANUAL_ROOM_TYPE_META = {
  control: {
    label: "控制中枢",
    icon: "mdi-home-variant-outline",
  },
  manufacture: {
    label: "制造站",
    icon: "mdi-factory",
  },
  trading: {
    label: "贸易站",
    icon: "mdi-handshake-outline",
  },
  power: {
    label: "发电站",
    icon: "mdi-lightning-bolt",
  },
  meeting: {
    label: "会客室",
    icon: "mdi-account-group-outline",
  },
  hire: {
    label: "办公室",
    icon: "mdi-briefcase-outline",
  },
  processing: {
    label: "加工 / 训练",
    icon: "mdi-hammer-wrench",
  },
  dormitory: {
    label: "宿舍",
    icon: "mdi-bed-outline",
  },
};

const NEED_OPTIONS = [
  {
    value: "high",
    label: "非常缺",
    icon: "mdi-alert-circle-outline",
    tone: "red",
  },
  {
    value: "medium",
    label: "勉强够用",
    icon: "mdi-minus-circle-outline",
    tone: "orange",
  },
  {
    value: "low",
    label: "暂时不缺",
    icon: "mdi-check-circle-outline",
    tone: "green",
  },
];

const steps = [
  {
    key: "resources",
    label: "资源需求",
    title: "先看你现在的养成压力",
    fields: [
      {
        key: "lmdNeed",
        label: "在养成干员时，你有多缺龙门币？",
        options: NEED_OPTIONS,
      },
      {
        key: "experienceNeed",
        label: "在养成干员时，你有多缺经验书？",
        options: NEED_OPTIONS,
      },
      {
        key: "farmingHabit",
        label: "平时会额外刷取龙门币或经验书吗？",
        options: [
          {
            value: "rarely",
            label: "基本不刷",
            icon: "mdi-battery-10",
            tone: "gray",
          },
          {
            value: "sometimes",
            label: "偶尔会刷",
            icon: "mdi-battery-50",
            tone: "blue",
          },
          {
            value: "frequently",
            label: "每天接近或超过 100 理智",
            icon: "mdi-battery-90",
            tone: "orange",
          },
        ],
      },
    ],
  },
  {
    key: "operation",
    label: "操作习惯",
    title: "你通常怎样照看基建？",
    fields: [
      {
        key: "shiftMode",
        label: "你每天通常能安排几次换班？",
        options: [
          {
            value: "threeTimes",
            label: "一天三换",
            description: "按 12 / 6 / 6 执行",
            icon: "mdi-clock-fast",
            tone: "orange",
          },
          {
            value: "twice",
            label: "一天两换",
            description: "早晚各一次",
            icon: "mdi-weather-sunset-up",
            tone: "blue",
          },
          {
            value: "once",
            label: "一天一换",
            description: "每天只操作一次",
            icon: "mdi-calendar-clock",
            tone: "gray",
          },
        ],
      },
      {
        key: "executionReliability",
        label: "在这个频率下，你能否稳定收菜和换班？",
        options: [
          {
            value: "reliable",
            label: "基本能按时完成",
            icon: "mdi-check-circle-outline",
            tone: "green",
          },
          {
            value: "mostlyReliable",
            label: "偶尔延后，但通常能完成",
            icon: "mdi-clock-outline",
            tone: "blue",
          },
          {
            value: "unreliable",
            label: "经常无法按时完成",
            icon: "mdi-clock-alert-outline",
            tone: "orange",
          },
        ],
      },
    ],
  },
  {
    key: "tradeoffs",
    label: "长期取舍",
    title: "最后确认两个长期选择",
    fields: [
      {
        key: "orundumPreference",
        label: "愿意以约 30% 养成产出换取每月约 10 抽吗？",
        options: [
          {
            value: "accept",
            label: "愿意",
            icon: "mdi-star-four-points-outline",
            tone: "purple",
          },
          {
            value: "decline",
            label: "不愿意",
            icon: "mdi-factory",
            tone: "blue",
          },
        ],
      },
      {
        key: "carbonNeed",
        label: "你是否缺升级基建所用的碳？",
        options: [
          {
            value: "needed",
            label: "缺",
            icon: "mdi-cube-outline",
            tone: "orange",
          },
          {
            value: "notNeeded",
            label: "暂时不缺",
            icon: "mdi-check-circle-outline",
            tone: "green",
          },
        ],
      },
    ],
  },
];

const DEFAULT_ANSWERS = Object.freeze({
  lmdNeed: null,
  experienceNeed: null,
  farmingHabit: null,
  shiftMode: null,
  executionReliability: null,
  orundumPreference: null,
  carbonNeed: null,
});
const ANSWER_FIELDS = steps.flatMap((step) => step.fields);
const LAYOUT_CHOICE_META = [
  {
    id: "153",
    label: "153",
    description: "经验优先",
    icon: "mdi-book-open-page-variant-outline",
    tone: "blue",
  },
  {
    id: "243",
    label: "243",
    description: "龙门币优先/书钱均衡",
    icon: "mdi-scale-balance",
    tone: "green",
  },
  {
    id: "252",
    label: "252",
    description: "书钱均衡",
    icon: "mdi-factory",
    tone: "orange",
  },
  {
    id: "342",
    label: "342",
    description: "搓玉方向",
    icon: "mdi-star-four-points-outline",
    tone: "purple",
  },
];
const LAYOUTS_BY_SHIFT_MODE = {
  once: ["243"],
  twice: ["153", "243", "252", "342"],
  threeTimes: ["153", "243", "252", "342"],
};
const LAYOUT_SHIFT_OPTIONS = [
  {
    value: "threeTimes",
    label: "一天三换",
    description: "12 / 6 / 6",
    icon: "mdi-clock-fast",
    tone: "orange",
  },
  {
    value: "twice",
    label: "一天两换",
    description: "早晚各一次",
    icon: "mdi-weather-sunset-up",
    tone: "blue",
  },
  {
    value: "once",
    label: "一天一换",
    description: "每天一次",
    icon: "mdi-calendar-clock",
    tone: "gray",
  },
];
const LAYOUT_SCHEDULE_GROUPS = LAYOUT_SHIFT_OPTIONS.map((shift) => ({
  ...shift,
  options: LAYOUTS_BY_SHIFT_MODE[shift.value].map((layoutId) => {
    const layout = LAYOUT_CHOICE_META.find(
      (choice) => choice.id === layoutId,
    );

    return {
      ...layout,
      ...RIIC_LAYOUT_RECOMMENDATION_LAYOUTS[layoutId],
      value: `${shift.value}:${layoutId}`,
    };
  }),
}));

const answers = reactive({ ...DEFAULT_ANSWERS });
const currentStep = ref(0);
const contentPanel = ref(null);
const scheduleCapturePanel = ref(null);
const resultStepIndex = steps.length;
const ownedOperators = ref([]);
const ownedOperatorSource = ref("");
const ownedOperatorMessage = ref("");
const ownedOperatorError = ref("");
const ownedOperatorLastSyncedAt = ref("");
const loadingOwnedOperators = ref(false);
const useOwnedOperators = ref(false);
const pendingOwnedOperatorPreference = ref(false);
const ownedOperatorPreferenceReady = ref(false);
const hasSavedWizardState = ref(false);
const storageReady = ref(false);
const exportingImage = ref(false);
const exportingMaa = ref(false);
const developerLayoutId = ref("153");
const developerShiftMode = ref("twice");
const manualQueueIndex = ref(0);
const selectedManualRoomId = ref("control-0");
const manualAssignments = ref({});
const showScheduleGeneration = false;
const layoutEntry = ref(null);
const planningMode = ref(null);
const selectedLayoutId = ref("");
const confirmedLayoutPlan = ref(null);
const layoutStageCollapsed = ref(false);
const layoutPlanOpenItems = ref(["layout-planning"]);
const recommendationPanelOpen = ref(false);

const activeStep = computed(() => steps[currentStep.value]);
const isDeveloperMode = computed(() => route.query.mode === "dev");
const isUserLoggedIn = computed(() => {
  const token = localStorage.getItem("USER_TOKEN");
  return Boolean(token && token !== "null" && token !== "undefined");
});
const isResult = computed(() => currentStep.value === resultStepIndex);
const canContinue = computed(() => isStepComplete(activeStep.value));
const isRecommendationComplete = computed(() =>
  steps.every((step) => isStepComplete(step)),
);
const recommendation = computed(() => {
  if (!isRecommendationComplete.value) {
    return null;
  }

  return createRiicLayoutRecommendation(answers);
});
const activeLayoutId = computed(
  () => selectedLayoutId.value || recommendation.value?.layout.id || "",
);
const selectedManualScheduleValue = computed(() => {
  if (!confirmedLayoutPlan.value) {
    return "";
  }

  return `${confirmedLayoutPlan.value.shiftMode}:${confirmedLayoutPlan.value.layoutId}`;
});
const availableLayoutChoices = computed(() => {
  return LAYOUT_CHOICE_META.map((choice) => ({
    ...choice,
    layout: RIIC_LAYOUT_RECOMMENDATION_LAYOUTS[choice.id],
  }));
});
const activeLayoutChoice = computed(
  () =>
    availableLayoutChoices.value.find(
      (choice) => choice.id === activeLayoutId.value,
    ) || null,
);
const isLayoutRecommended = computed(
  () => (value) =>
    recommendation.value &&
    value ===
      `${recommendation.value.shiftMode.id}:${recommendation.value.layout.id}`,
);
const isLayoutPlanningReady = computed(
  () => Boolean(confirmedLayoutPlan.value),
);
const layoutSelectionStatus = computed(() =>
  isLayoutPlanningReady.value
    ? {
        tone: "success",
        title: "布局已选择",
        detail: layoutPlanSummary.value,
      }
    : {
        tone: "warning",
        title: "尚未选择布局",
        detail: "请先在布局规划中选择一张布局卡",
      },
);
const layoutPlanSummary = computed(() => {
  if (!confirmedLayoutPlan.value) {
    return "";
  }

  const layout = RIIC_LAYOUT_RECOMMENDATION_LAYOUTS[
    confirmedLayoutPlan.value.layoutId
  ];
  const shift = LAYOUT_SHIFT_OPTIONS.find(
    (option) => option.value === confirmedLayoutPlan.value.shiftMode,
  );

  return [layout?.shortName, shift?.label].filter(Boolean).join(" · ");
});
const operatorBoxStatus = computed(() => {
  if (loadingOwnedOperators.value) {
    return {
      tone: "warning",
      title: "正在同步干员数据",
      detail: "正在读取你的干员 box",
    };
  }

  if (isUserLoggedIn.value && ownedOperators.value.length > 0) {
    return {
      tone: "success",
      title: "干员数据已同步",
      detail: `上次同步：${formatOperatorSyncTime(
        ownedOperatorLastSyncedAt.value,
      )}`,
    };
  }

  return {
    tone: "warning",
    title: "尚未读取干员 box",
    detail: "请从森空岛或 MAA 同步干员数据",
  };
});
const selectedSchedule = computed(
  () => recommendation.value?.selectedSchedule || null,
);
const selectedCandidate = computed(
  () => selectedSchedule.value?.candidate || null,
);
const selectedStations = computed(
  () => selectedCandidate.value?.lines.flat() || [],
);
const selectedDescriptionLines = computed(() =>
  String(selectedCandidate.value?.description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean),
);
const candidateSourceUrl = computed(() => {
  if (!selectedCandidate.value) {
    return "";
  }

  return `${RIIC_SCHEDULE_SOURCE.repository}/blob/${RIIC_SCHEDULE_SOURCE.commit}/${selectedCandidate.value.sourcePath}`;
});
const maaExportPreview = computed(() => {
  if (
    !recommendation.value?.selectedSchedule ||
    recommendation.value.droneTarget.id === "flexible" ||
    recommendation.value.selectedSchedule.candidate.isOrundum
  ) {
    return null;
  }

  try {
    return buildMaaSchedule(recommendation.value);
  } catch (error) {
    console.error(error);
    return null;
  }
});
const developerCandidates = computed(() =>
  RIIC_SCHEDULE_CANDIDATES.filter(
    (candidate) =>
      candidate.layout === developerLayoutId.value &&
      candidate.shiftMode === developerShiftMode.value,
  ),
);
const manualRooms = computed(() => createManualRooms(developerLayoutId.value));
const manualBlueprintRows = computed(() => {
  const rows = [
    { id: "core", label: "中枢与供电", rooms: [] },
    { id: "production", label: "生产区", rooms: [] },
    { id: "support", label: "功能区", rooms: [] },
    { id: "dormitory", label: "宿舍区", rooms: [] },
  ];
  const rowMap = new Map(rows.map((row) => [row.id, row]));

  for (const room of manualRooms.value) {
    rowMap.get(room.blueprintRow)?.rooms.push(room);
  }

  return rows.filter((row) => row.rooms.length);
});
const manualQueueCount = computed(() =>
  Math.max(
    1,
    ...developerCandidates.value.map(
      (candidate) => candidate.queueDescriptions.length,
    ),
  ),
);
const selectedManualRoom = computed(
  () =>
    manualRooms.value.find((room) => room.id === selectedManualRoomId.value) ||
    null,
);
const manualSelectedAssignment = computed(() => {
  if (!selectedManualRoom.value) {
    return null;
  }

  return getManualRoomAssignment(
    selectedManualRoom.value.id,
    manualQueueIndex.value,
  );
});
const manualGroupOptions = computed(() => {
  const room = selectedManualRoom.value;

  if (!room) {
    return [];
  }

  const uniqueGroups = new Map();

  for (const candidate of developerCandidates.value) {
    for (const station of candidate.lines.flat()) {
      if (!stationMatchesManualRoom(station, room)) {
        continue;
      }

      const queue = station.queues[manualQueueIndex.value];
      if (!queue) {
        continue;
      }

      const duration =
        candidate.queueDescriptions[manualQueueIndex.value] || "时长未标注";
      const source = {
        title: candidate.title.replace(/\s+/g, " "),
        sourcePath: candidate.sourcePath,
        sourceUpdatedAt: candidate.sourceUpdatedAt,
        queueIndex: manualQueueIndex.value,
      };
      const groups =
        room.roomType === "power"
          ? queue.operators.map((operator, powerSlotIndex) => ({
              description: queue.description
                ? `原表三座发电站组合：${queue.description}`
                : "原表未标注发电效率",
              efficiency: null,
              operators: [operator],
              powerSlotIndex,
            }))
          : [
              {
                description:
                  queue.description || "原表没有为这组干员补充效率说明",
                efficiency: getQueueEfficiency(queue.description),
                operators: queue.operators || [],
                powerSlotIndex: null,
              },
            ];

      for (const group of groups) {
        const key = JSON.stringify({
          roomType: room.roomType,
          sourceKey: room.sourceKey,
          duration,
          description: group.description,
          operators: group.operators.map((operator) => [
            operator.displayName,
            operator.eliteLevel,
            operator.isTired,
          ]),
        });
        const existing = uniqueGroups.get(key);
        const groupSource = {
          ...source,
          powerSlotIndex: group.powerSlotIndex,
        };

        if (existing) {
          existing.sources.push(groupSource);
          continue;
        }

        uniqueGroups.set(key, {
          key,
          duration,
          description: group.description,
          efficiency: group.efficiency,
          operators: group.operators,
          sources: [groupSource],
        });
      }
    }
  }

  const options = [...uniqueGroups.values()].sort(compareDeveloperCombinations);

  if (options.length) {
    return options;
  }

  return [
    {
      key: `keep-current-${room.id}-${manualQueueIndex.value}`,
      duration: "本队列",
      description:
        "当前原表没有覆盖这个设施。本队列不换人，保留它原本的安排。",
      efficiency: null,
      fallback: true,
      operators: [],
      sources: [],
    },
  ];
});
const manualAssignmentCount = computed(
  () => Object.keys(manualAssignments.value).length,
);
const manualActiveQueueConflicts = computed(() => {
  const assignedOperators = new Map();

  for (const room of manualRooms.value) {
    const assignment = getManualRoomAssignment(
      room.id,
      manualQueueIndex.value,
    );

    for (const operator of assignment?.operators || []) {
      const roomIds = assignedOperators.get(operator.displayName) || [];
      roomIds.push(room.id);
      assignedOperators.set(operator.displayName, roomIds);
    }
  }

  return new Map(
    [...assignedOperators].filter(([, roomIds]) => roomIds.length > 1),
  );
});
const developerCombinationGroups = computed(() => {
  const uniqueCombinations = new Map();

  for (const candidate of developerCandidates.value) {
    for (const station of candidate.lines.flat()) {
      station.queues.forEach((queue, queueIndex) => {
        const duration =
          candidate.queueDescriptions[queueIndex] || "时长未标注";
        const efficiency = getQueueEfficiency(queue.description);
        const operators = queue.operators || [];
        const key = JSON.stringify({
          station: station.title,
          duration,
          description: queue.description || "",
          operators: operators.map((operator) => [
            operator.displayName,
            operator.eliteLevel,
            operator.isTired,
          ]),
        });
        const existing = uniqueCombinations.get(key);
        const source = {
          title: candidate.title.replace(/\s+/g, " "),
          sourcePath: candidate.sourcePath,
          sourceUpdatedAt: candidate.sourceUpdatedAt,
          queueIndex,
        };

        if (existing) {
          existing.sources.push(source);
          existing.queueIndexes.add(queueIndex);
          return;
        }

        uniqueCombinations.set(key, {
          key,
          station: station.title,
          stationType: station.stationType,
          duration,
          description: queue.description || "",
          efficiency,
          operators,
          sources: [source],
          queueIndexes: new Set([queueIndex]),
        });
      });
    }
  }

  const groups = new Map();

  for (const combination of uniqueCombinations.values()) {
    const group = groups.get(combination.station) || {
      title: combination.station,
      stationType: combination.stationType,
      combinations: [],
    };
    group.combinations.push({
      ...combination,
      queueIndexes: [...combination.queueIndexes].sort(
        (left, right) => left - right,
      ),
    });
    groups.set(combination.station, group);
  }

  return [...groups.values()]
    .sort(
      (left, right) =>
        getStationOrder(left.title) - getStationOrder(right.title),
    )
    .map((group) => ({
      ...group,
      combinations: group.combinations.sort(compareDeveloperCombinations),
    }));
});
const developerCombinationCount = computed(() =>
  developerCombinationGroups.value.reduce(
    (total, group) => total + group.combinations.length,
    0,
  ),
);
const developerSourceUrl = `${RIIC_SCHEDULE_SOURCE.repository}/tree/${RIIC_SCHEDULE_SOURCE.commit}/src/assets/texts/schedule`;

const resultSteps = computed(() => [
  ...steps,
  { key: "result", label: "推荐方案" },
]);

function normalizeSavedAnswers(savedAnswers) {
  return Object.fromEntries(
    ANSWER_FIELDS.map((field) => {
      const savedValue = savedAnswers?.[field.key];
      const isAllowed = field.options.some(
        (option) => option.value === savedValue,
      );

      return [
        field.key,
        isAllowed ? savedValue : DEFAULT_ANSWERS[field.key],
      ];
    }),
  );
}

function normalizePlanningMode(value) {
  if (value === "manual" || value === "recommend") {
    return value;
  }

  return null;
}

function normalizeLayoutEntry(
  value,
  savedPlanningMode,
  savedLayoutId,
  savedAnswers,
) {
  if (LAYOUT_CHOICE_META.some((choice) => choice.id === value)) {
    return value;
  }

  if (value === "recommend") {
    return ANSWER_FIELDS.some((field) => Boolean(savedAnswers?.[field.key]))
      ? "recommend"
      : null;
  }

  if (
    normalizePlanningMode(savedPlanningMode) === "manual" &&
    LAYOUT_CHOICE_META.some((choice) => choice.id === savedLayoutId)
  ) {
    return savedLayoutId;
  }

  return null;
}

function normalizeConfirmedLayoutPlan(value) {
  if (
    !value ||
    !LAYOUT_CHOICE_META.some((choice) => choice.id === value.layoutId) ||
    !LAYOUT_SHIFT_OPTIONS.some((option) => option.value === value.shiftMode)
  ) {
    return null;
  }

  return {
    layoutId: value.layoutId,
    shiftMode: value.shiftMode,
  };
}

function isStepComplete(step, candidateAnswers = answers) {
  return Boolean(
    step?.fields?.every((field) => Boolean(candidateAnswers[field.key])),
  );
}

function isLayoutChoiceAvailable(layoutId, shiftMode = answers.shiftMode) {
  return !shiftMode || LAYOUTS_BY_SHIFT_MODE[shiftMode]?.includes(layoutId);
}

function getMaxAvailableStep(candidateAnswers) {
  let stepIndex = 0;

  while (
    stepIndex < steps.length &&
    isStepComplete(steps[stepIndex], candidateAnswers)
  ) {
    stepIndex += 1;
  }

  return stepIndex;
}

function loadSavedWizardState() {
  try {
    const savedDraft = localStorage.getItem(
      RIIC_SCHEDULE_DRAFT_STORAGE_KEY,
    );
    const legacyDraft = savedDraft
      ? null
      : localStorage.getItem(LEGACY_RIIC_SCHEDULE_DRAFT_STORAGE_KEY);

    if (!savedDraft && !legacyDraft) {
      return false;
    }

    const parsedDraft = JSON.parse(savedDraft || legacyDraft);

    if (
      legacyDraft &&
      parsedDraft?.version === 1 &&
      ["twice", "threeTimes"].includes(parsedDraft.answers?.shiftMode)
    ) {
      answers.shiftMode = parsedDraft.answers.shiftMode;
      currentStep.value = 0;
      pendingOwnedOperatorPreference.value =
        parsedDraft.useOwnedOperators === true;
      hasSavedWizardState.value = true;
      return true;
    }

    if (
      parsedDraft?.version !== RIIC_SCHEDULE_DRAFT_VERSION ||
      !parsedDraft.answers
    ) {
      localStorage.removeItem(RIIC_SCHEDULE_DRAFT_STORAGE_KEY);
      return false;
    }

    const savedAnswers = normalizeSavedAnswers(parsedDraft.answers);
    const maxAvailableStep = getMaxAvailableStep(savedAnswers);
    const savedStep = Number.isInteger(parsedDraft.currentStep)
      ? parsedDraft.currentStep
      : 0;

    Object.assign(answers, savedAnswers);
    currentStep.value = Math.min(
      Math.max(savedStep, 0),
      Math.min(maxAvailableStep, steps.length - 1),
    );
    layoutEntry.value = normalizeLayoutEntry(
      parsedDraft.layoutEntry,
      parsedDraft.planningMode,
      parsedDraft.selectedLayoutId,
      savedAnswers,
    );
    planningMode.value =
      layoutEntry.value === "recommend"
        ? "recommend"
        : layoutEntry.value
        ? "manual"
        : null;
    selectedLayoutId.value = LAYOUT_CHOICE_META.some(
      (choice) => choice.id === parsedDraft.selectedLayoutId,
    )
      ? parsedDraft.selectedLayoutId
      : "";
    if (layoutEntry.value !== "recommend") {
      selectedLayoutId.value = layoutEntry.value;
    }
    confirmedLayoutPlan.value = normalizeConfirmedLayoutPlan(
      parsedDraft.confirmedLayoutPlan,
    );
    layoutStageCollapsed.value =
      parsedDraft.layoutStageCollapsed === true &&
      Boolean(confirmedLayoutPlan.value);
    layoutPlanOpenItems.value = layoutStageCollapsed.value
      ? []
      : ["layout-planning"];
    pendingOwnedOperatorPreference.value =
      parsedDraft.useOwnedOperators === true;
    hasSavedWizardState.value = true;
    return true;
  } catch {
    try {
      localStorage.removeItem(RIIC_SCHEDULE_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore unavailable local storage and continue with defaults.
    }
    return false;
  }
}

function saveWizardState() {
  if (!storageReady.value) {
    return;
  }

  try {
    localStorage.setItem(
      RIIC_SCHEDULE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: RIIC_SCHEDULE_DRAFT_VERSION,
        answers: Object.fromEntries(
          ANSWER_FIELDS.map((field) => [field.key, answers[field.key]]),
        ),
        currentStep: currentStep.value,
        layoutEntry: layoutEntry.value,
        planningMode: planningMode.value,
        selectedLayoutId: selectedLayoutId.value,
        confirmedLayoutPlan: confirmedLayoutPlan.value,
        layoutStageCollapsed: layoutStageCollapsed.value,
        useOwnedOperators: ownedOperatorPreferenceReady.value
          ? useOwnedOperators.value
          : pendingOwnedOperatorPreference.value,
        updatedAt: new Date().toISOString(),
      }),
    );
    hasSavedWizardState.value = true;
  } catch {
    // The generator remains usable when local storage is unavailable.
  }
}

function isStepAvailable(index) {
  if (index === resultStepIndex) {
    return steps.every((step) => isStepComplete(step));
  }

  return steps.slice(0, index).every((step) => isStepComplete(step));
}

function selectOption(key, value) {
  answers[key] = value;
}

function selectLayoutEntry(value) {
  if (
    value !== "recommend" &&
    !LAYOUT_CHOICE_META.some((choice) => choice.id === value)
  ) {
    return;
  }

  layoutEntry.value = value;
  planningMode.value = value === "recommend" ? "recommend" : "manual";
  if (value !== "recommend") {
    selectedLayoutId.value = value;
    confirmedLayoutPlan.value = null;
  }
  setLayoutPlanExpanded(true);

  if (value === "recommend") {
    openRecommendationPanel();
    return;
  }

  recommendationPanelOpen.value = false;
  focusCurrentPanel();
}

function selectLayoutShift(value) {
  answers.shiftMode = value;
}

function selectLayoutChoice(layoutId) {
  selectLayoutEntry(layoutId);
}

function selectManualScheduleOption(value) {
  const [shiftMode, layoutId] = String(value).split(":");

  if (
    !LAYOUT_SHIFT_OPTIONS.some((option) => option.value === shiftMode) ||
    !LAYOUT_CHOICE_META.some((choice) => choice.id === layoutId) ||
    !isLayoutChoiceAvailable(layoutId, shiftMode)
  ) {
    return;
  }

  if (
    confirmedLayoutPlan.value?.layoutId === layoutId &&
    confirmedLayoutPlan.value?.shiftMode === shiftMode
  ) {
    selectedLayoutId.value = "";
    confirmedLayoutPlan.value = null;
    layoutEntry.value = recommendation.value ? "recommend" : null;
    planningMode.value = recommendation.value ? "recommend" : null;
    recommendationPanelOpen.value = false;
    setLayoutPlanExpanded(true);
    return;
  }

  layoutEntry.value = layoutId;
  planningMode.value = "manual";
  selectedLayoutId.value = layoutId;
  answers.shiftMode = shiftMode;
  confirmedLayoutPlan.value = { layoutId, shiftMode };
  recommendationPanelOpen.value = false;
  setLayoutPlanExpanded(true);
}

function expandLayoutStage() {
  setLayoutPlanExpanded(true);
  focusCurrentPanel();
}

function setLayoutPlanExpanded(expanded) {
  layoutStageCollapsed.value = !expanded;
  layoutPlanOpenItems.value = expanded ? ["layout-planning"] : [];
}

function handleLayoutPlanCollapseChange(activeNames) {
  layoutStageCollapsed.value = !activeNames.includes("layout-planning");
}

function openRecommendationPanel() {
  layoutEntry.value = "recommend";
  planningMode.value = "recommend";
  currentStep.value = Math.min(
    getMaxAvailableStep(),
    steps.length - 1,
  );
  recommendationPanelOpen.value = true;
}

function closeRecommendationPanel() {
  recommendationPanelOpen.value = false;
}

function nextStep() {
  if (!canContinue.value) {
    return;
  }

  if (currentStep.value >= steps.length - 1) {
    recommendationPanelOpen.value = false;
    focusCurrentPanel();
    return;
  }

  currentStep.value += 1;
}

function previousStep() {
  currentStep.value = Math.max(0, currentStep.value - 1);
}

function resetWizard() {
  currentStep.value = 0;
  layoutEntry.value = null;
  planningMode.value = null;
  selectedLayoutId.value = "";
  confirmedLayoutPlan.value = null;
  recommendationPanelOpen.value = false;
  setLayoutPlanExpanded(true);
  focusCurrentPanel();
}

async function clearSavedWizardState() {
  storageReady.value = false;
  let cleared = true;

  try {
    localStorage.removeItem(RIIC_SCHEDULE_DRAFT_STORAGE_KEY);
    localStorage.removeItem(LEGACY_RIIC_SCHEDULE_DRAFT_STORAGE_KEY);
  } catch {
    cleared = false;
  }

  Object.assign(answers, DEFAULT_ANSWERS);
  currentStep.value = 0;
  layoutEntry.value = null;
  planningMode.value = null;
  selectedLayoutId.value = "";
  confirmedLayoutPlan.value = null;
  recommendationPanelOpen.value = false;
  setLayoutPlanExpanded(true);
  useOwnedOperators.value = false;
  pendingOwnedOperatorPreference.value = false;
  hasSavedWizardState.value = false;

  await nextTick();
  storageReady.value = true;
  await focusCurrentPanel();

  cMessage(
    cleared
      ? "已清除本页保存的选择"
      : "页面已重置，但保存记录清除失败",
    cleared ? "success" : "warn",
  );
}

async function focusCurrentPanel() {
  await nextTick();
  contentPanel.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatSigned(value) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value, 1)}`;
}

function formatSignedInteger(value) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatSourceDate(value) {
  if (!value) {
    return "日期未知";
  }

  return value.slice(0, 10);
}

function formatOperatorSyncTime(value) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(date);
}

function formatEliteLevel(value) {
  return value === null || value === undefined ? "未标注" : `精英 ${value}`;
}

function getOperatorAvatar(displayName) {
  return operatorAvatarMap.get(displayName) || null;
}

function getQueueEfficiency(description) {
  const match = String(description || "").match(/(\d+(?:\.\d+)?)%/);

  return match ? Number.parseFloat(match[1]) : null;
}

function getStationOrder(stationTitle) {
  if (stationTitle.startsWith("制造站")) {
    return 1;
  }
  if (stationTitle.startsWith("贸易站")) {
    return 2;
  }
  if (stationTitle === "发电站") {
    return 3;
  }
  if (stationTitle === "控制中枢") {
    return 4;
  }

  return 5;
}

function compareDeveloperCombinations(left, right) {
  if (left.efficiency !== null && right.efficiency !== null) {
    if (left.efficiency !== right.efficiency) {
      return right.efficiency - left.efficiency;
    }
  } else if (left.efficiency !== null) {
    return -1;
  } else if (right.efficiency !== null) {
    return 1;
  }

  if (left.duration !== right.duration) {
    return left.duration.localeCompare(right.duration, "zh-CN");
  }

  return left.operators
    .map((operator) => operator.displayName)
    .join("、")
    .localeCompare(
      right.operators.map((operator) => operator.displayName).join("、"),
      "zh-CN",
    );
}

function getCandidateSourceUrl(candidate) {
  return `${RIIC_SCHEDULE_SOURCE.repository}/blob/${RIIC_SCHEDULE_SOURCE.commit}/${candidate.sourcePath}`;
}

function createManualRooms(layoutId) {
  const manufactureProducts =
    layoutId === "153"
      ? [
          { product: "experience", label: "作战记录站 1" },
          { product: "experience", label: "作战记录站 2" },
          { product: "experience", label: "作战记录站 3" },
          { product: "experience", label: "作战记录站 4" },
          { product: "gold", label: "赤金站 1" },
        ]
      : [
          { product: "experience", label: "作战记录站 1" },
          { product: "experience", label: "作战记录站 2" },
          { product: "gold", label: "赤金站 1" },
          { product: "gold", label: "赤金站 2" },
        ];
  const tradingCount = layoutId === "153" ? 1 : 2;
  const rooms = [
    {
      id: "control-0",
      label: "控制中枢",
      roomType: "control",
      roomIndex: 0,
      sourceKey: "control",
      blueprintRow: "core",
    },
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `power-${index}`,
      label: `发电站 ${index + 1}`,
      roomType: "power",
      roomIndex: index,
      sourceKey: "power",
      blueprintRow: "core",
    })),
    ...manufactureProducts.map((room, index) => ({
      id: `manufacture-${room.product}-${index}`,
      label: room.label,
      roomType: "manufacture",
      roomIndex: index,
      sourceKey: room.product,
      blueprintRow: "production",
    })),
    ...Array.from({ length: tradingCount }, (_, index) => ({
      id: `trading-${index}`,
      label: `贸易站 ${index + 1}`,
      roomType: "trading",
      roomIndex: index,
      sourceKey: "trading",
      blueprintRow: "production",
    })),
    {
      id: "meeting-0",
      label: "会客室",
      roomType: "meeting",
      roomIndex: 0,
      sourceKey: "meeting",
      blueprintRow: "support",
    },
    {
      id: "hire-0",
      label: "办公室",
      roomType: "hire",
      roomIndex: 0,
      sourceKey: "hire",
      blueprintRow: "support",
    },
    {
      id: "processing-0",
      label: "加工站 / 训练室",
      roomType: "processing",
      roomIndex: 0,
      sourceKey: "processing",
      blueprintRow: "support",
    },
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `dormitory-${index}`,
      label: `宿舍 ${index + 1}`,
      roomType: "dormitory",
      roomIndex: index,
      sourceKey: "dormitory",
      blueprintRow: "dormitory",
    })),
  ];

  return rooms.map((room) => ({
    ...room,
    typeLabel: MANUAL_ROOM_TYPE_META[room.roomType].label,
    icon: MANUAL_ROOM_TYPE_META[room.roomType].icon,
  }));
}

function stationMatchesManualRoom(station, room) {
  if (room.sourceKey === "experience") {
    return station.title.includes("中级作战记录");
  }
  if (room.sourceKey === "gold") {
    return station.title.includes("赤金");
  }
  if (room.sourceKey === "trading") {
    return station.title.startsWith("贸易站");
  }
  if (room.sourceKey === "control") {
    return station.title === "控制中枢";
  }
  if (room.sourceKey === "power") {
    return station.title === "发电站";
  }
  if (room.sourceKey === "meeting") {
    return station.title === "会客室";
  }
  if (room.sourceKey === "hire") {
    return station.title === "办公室";
  }
  if (room.sourceKey === "processing") {
    return station.title.startsWith("加工站");
  }
  if (room.sourceKey === "dormitory") {
    return station.title === "宿舍";
  }

  return false;
}

function getManualAssignmentKey(roomId, queueIndex) {
  return `${roomId}-${queueIndex}`;
}

function getManualRoomAssignment(roomId, queueIndex) {
  return (
    manualAssignments.value[getManualAssignmentKey(roomId, queueIndex)] ||
    null
  );
}

function getManualRoomAssignmentLabel(roomId, queueIndex) {
  const assignment = getManualRoomAssignment(roomId, queueIndex);

  if (!assignment) {
    return "未选择干员组";
  }
  if (assignment.fallback) {
    return "保持原有安排";
  }

  return (
    assignment.operators
      .map((operator) => operator.displayName)
      .join("、") || "保持 / 不指定"
  );
}

function selectManualRoom(roomId) {
  selectedManualRoomId.value = roomId;
}

function assignManualGroup(option) {
  if (!selectedManualRoom.value) {
    return;
  }

  manualAssignments.value[
    getManualAssignmentKey(
      selectedManualRoom.value.id,
      manualQueueIndex.value,
    )
  ] = option;
}

function clearManualRoomAssignment() {
  if (!selectedManualRoom.value) {
    return;
  }

  delete manualAssignments.value[
    getManualAssignmentKey(
      selectedManualRoom.value.id,
      manualQueueIndex.value,
    )
  ];
}

function isManualOptionSelected(option) {
  return manualSelectedAssignment.value?.key === option.key;
}

function getManualRoomConflictNames(room) {
  const assignment = getManualRoomAssignment(
    room.id,
    manualQueueIndex.value,
  );

  return (assignment?.operators || [])
    .map((operator) => operator.displayName)
    .filter((name) => manualActiveQueueConflicts.value.has(name));
}

function getManualOptionConflictNames(option) {
  const selectedRoom = selectedManualRoom.value;
  const occupiedOperators = new Set();

  for (const room of manualRooms.value) {
    if (room.id === selectedRoom?.id) {
      continue;
    }

    for (const operator of getManualRoomAssignment(
      room.id,
      manualQueueIndex.value,
    )?.operators || []) {
      occupiedOperators.add(operator.displayName);
    }
  }

  return option.operators
    .map((operator) => operator.displayName)
    .filter((name) => occupiedOperators.has(name));
}

function resetManualSchedule() {
  manualQueueIndex.value = 0;
  manualAssignments.value = {};
  selectedManualRoomId.value = "control-0";
}

function normalizeOwnedOperators(list = [], requireOwn = false) {
  const operatorMap = new Map();

  for (const operator of list) {
    if (requireOwn && !operator?.own) {
      continue;
    }

    const charId = operator?.charId;
    const name = operatorTableV2?.[charId]?.name || operator?.name;
    if (!name) {
      continue;
    }

    const elite = Number.isFinite(Number(operator?.elite))
      ? Number(operator.elite)
      : 0;
    const current = operatorMap.get(name);

    if (!current || elite > current.elite) {
      operatorMap.set(name, {
        name,
        elite,
      });
    }
  }

  return [...operatorMap.values()];
}

function readSklandAccountFromSession() {
  try {
    const savedAccountData = sessionStorage.getItem(
      SKLAND_ACCOUNT_SESSION_STORAGE_KEY,
    );
    if (!savedAccountData) {
      return null;
    }

    return JSON.parse(savedAccountData);
  } catch (error) {
    console.error("readSklandAccountFromSession failed", error);
    return null;
  }
}

function readSklandOperatorsFromSession() {
  const accountData = readSklandAccountFromSession();
  return normalizeOwnedOperators(accountData?.operatorDataList || []);
}

async function loadOwnedOperators({ notify = false } = {}) {
  loadingOwnedOperators.value = true;
  ownedOperatorError.value = "";

  try {
    const sklandAccountData = readSklandAccountFromSession();
    const sklandOperators = readSklandOperatorsFromSession();

    if (sklandOperators.length > 0) {
      ownedOperators.value = sklandOperators;
      ownedOperatorSource.value = "森空岛导入缓存";
      ownedOperatorMessage.value = `已读取 ${sklandOperators.length} 名持有干员`;
      ownedOperatorLastSyncedAt.value =
        sklandAccountData?.importedAt || new Date().toISOString();
      if (notify) {
        cMessage(ownedOperatorMessage.value);
      }
      return;
    }

    if (isUserLoggedIn.value) {
      const response = await operatorDataAPI.getOperatorData();
      const surveyOperators = normalizeOwnedOperators(
        response?.data || [],
        true,
      );

      if (surveyOperators.length > 0) {
        ownedOperators.value = surveyOperators;
        ownedOperatorSource.value = "练度调查";
        ownedOperatorMessage.value = `已读取 ${surveyOperators.length} 名持有干员`;
        ownedOperatorLastSyncedAt.value = new Date().toISOString();
        if (notify) {
          cMessage(ownedOperatorMessage.value);
        }
        return;
      }
    }

    ownedOperators.value = [];
    ownedOperatorSource.value = "";
    ownedOperatorMessage.value = "尚未读取到本站可用的持有干员数据";
    ownedOperatorLastSyncedAt.value = "";
  } catch (error) {
    console.error("loadOwnedOperators failed", error);
    ownedOperators.value = [];
    ownedOperatorLastSyncedAt.value = "";
    ownedOperatorError.value = "持有干员数据读取失败，请稍后重试";
  } finally {
    loadingOwnedOperators.value = false;
  }
}

function notifyPendingOperatorSync(source) {
  cMessage(`${source}同步入口将在下一步接入`, "info");
}

function toggleOwnedRecommendation() {
  if (ownedOperators.value.length === 0) {
    loadOwnedOperators({ notify: true });
    return;
  }

  useOwnedOperators.value = !useOwnedOperators.value;
}

function disableOwnedRecommendation() {
  useOwnedOperators.value = false;
}

async function copySummary() {
  try {
    await navigator.clipboard.writeText(
      buildRecommendationSummary(recommendation.value),
    );
    cMessage("方案摘要已复制");
  } catch (error) {
    console.error(error);
    cMessage("复制失败，请稍后重试", "error");
  }
}

function getExportFileBase() {
  const layout = recommendation.value?.layout.shortName || "RIIC";
  const shift = recommendation.value?.shiftMode.shortName || "排班";
  const date = formatSourceDate(
    selectedCandidate.value?.sourceUpdatedAt,
  ).replaceAll("-", "");
  return `一图流-${layout}-${shift}-${date}`;
}

async function exportScheduleImage() {
  if (!scheduleCapturePanel.value || !selectedCandidate.value) {
    cMessage("当前没有可导出的完整排班", "warn");
    return;
  }

  exportingImage.value = true;

  try {
    await document.fonts?.ready;
    const { default: html2canvas } = await import("html2canvas");
    const isDark = document.documentElement.classList.contains("dark");
    const captureWidth = Math.max(
      scheduleCapturePanel.value.scrollWidth,
      1080,
    );
    const canvas = await html2canvas(scheduleCapturePanel.value, {
      backgroundColor: isDark ? "#17191d" : "#ffffff",
      scale: 2,
      useCORS: true,
      width: captureWidth,
      windowWidth: captureWidth,
      onclone(clonedDocument) {
        const clonedPanel = clonedDocument.querySelector(
          "[data-riic-capture]",
        );
        const scrollContainer = clonedPanel?.querySelector(
          ".schedule-board-scroll",
        );

        if (clonedPanel) {
          clonedPanel.style.width = `${captureWidth}px`;
          clonedPanel.style.maxWidth = "none";
        }
        if (scrollContainer) {
          scrollContainer.style.overflow = "visible";
        }
      },
    });
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    if (!blob) {
      throw new Error("Failed to create schedule image");
    }

    saveAs(blob, `${getExportFileBase()}.png`);
    cMessage("排班表图片已导出");
  } catch (error) {
    console.error(error);
    cMessage("图片导出失败，请稍后重试", "error");
  } finally {
    exportingImage.value = false;
  }
}

function exportMaaSchedule() {
  if (!maaExportPreview.value) {
    cMessage("当前没有可导出的 MAA 排班", "warn");
    return;
  }

  exportingMaa.value = true;

  try {
    const blob = new Blob(
      [JSON.stringify(maaExportPreview.value.schedule, null, 2)],
      { type: "application/json;charset=utf-8" },
    );
    saveAs(blob, `${getExportFileBase()}-MAA.json`);
    cMessage(
      maaExportPreview.value.warnings.length
        ? "MAA 排班已导出，请查看页面上的转换提示"
        : "MAA 排班已导出",
      maaExportPreview.value.warnings.length ? "warn" : "success",
    );
  } catch (error) {
    console.error(error);
    cMessage("MAA 排班导出失败，请稍后重试", "error");
  } finally {
    exportingMaa.value = false;
  }
}

watch(
  [
    () => answers.lmdNeed,
    () => answers.experienceNeed,
    () => answers.farmingHabit,
    () => answers.shiftMode,
    () => answers.executionReliability,
    () => answers.orundumPreference,
    () => answers.carbonNeed,
    layoutEntry,
    planningMode,
    selectedLayoutId,
    confirmedLayoutPlan,
    layoutStageCollapsed,
    currentStep,
    useOwnedOperators,
  ],
  saveWizardState,
);

watch(
  [developerLayoutId, developerShiftMode],
  resetManualSchedule,
);

onMounted(async () => {
  loadSavedWizardState();
  storageReady.value = true;
  await loadOwnedOperators();

  ownedOperatorPreferenceReady.value = true;
  useOwnedOperators.value =
    pendingOwnedOperatorPreference.value &&
    ownedOperators.value.length > 0;

  if (hasSavedWizardState.value) {
    saveWizardState();
  }
});
</script>

<template>
  <main class="riic-generator">
    <header class="page-heading">
      <div>
        <p class="page-eyebrow">RIIC SCHEDULE</p>
        <h1>{{ isDeveloperMode ? "基建组合效率" : "基建布局推荐" }}</h1>
        <p v-if="isDeveloperMode" class="page-subtitle">
          按布局与换班频率浏览原排班文档中的干员组合
        </p>
      </div>
      <div v-if="isDeveloperMode" class="phase-mark">
        <v-icon icon="mdi-flask-outline"></v-icon>
        开发模式
      </div>
    </header>

    <section v-if="isDeveloperMode" class="developer-workbench">
      <header class="developer-heading">
        <div>
          <span class="result-label">原表组合浏览</span>
          <h2>选择布局和换班频率</h2>
          <p>
            列表只读取一图流 TXT 作业中已有的队列组合。效率和时长保留原表口径，
            便于后续校验不同工作时长下的实际表现。
          </p>
        </div>
        <a
          class="source-link"
          :href="developerSourceUrl"
          target="_blank"
          rel="noreferrer"
        >
          查看原始作业
          <v-icon icon="mdi-open-in-new" size="16"></v-icon>
        </a>
      </header>

      <div class="developer-controls">
        <fieldset class="developer-choice-group">
          <legend>布局</legend>
          <div class="developer-choice-list">
            <button
              v-for="option in developerLayoutOptions"
              :key="option.value"
              type="button"
              class="developer-choice"
              :class="{ selected: developerLayoutId === option.value }"
              :aria-pressed="developerLayoutId === option.value"
              @click="developerLayoutId = option.value"
            >
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </button>
          </div>
        </fieldset>

        <fieldset class="developer-choice-group">
          <legend>换班频率</legend>
          <div class="developer-choice-list">
            <button
              v-for="option in developerShiftOptions"
              :key="option.value"
              type="button"
              class="developer-choice"
              :class="{ selected: developerShiftMode === option.value }"
              :aria-pressed="developerShiftMode === option.value"
              @click="developerShiftMode = option.value"
            >
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </button>
          </div>
        </fieldset>
      </div>

      <section class="manual-schedule-editor">
        <header class="manual-editor-heading">
          <div>
            <span class="result-label">手动编排</span>
            <h2>按房间选择原表干员组</h2>
            <p>
              简图中的房间位与 MAA 排班结构一致。先选择队列和房间，再从右侧应用该房间可用的原表组合。
            </p>
          </div>
          <div class="manual-editor-status">
            <strong>{{ manualAssignmentCount }}</strong>
            <span>/ {{ manualRooms.length * manualQueueCount }} 个房间队列已配置</span>
          </div>
        </header>

        <div class="manual-queue-tabs" role="tablist" aria-label="排班队列">
          <button
            v-for="queueIndex in manualQueueCount"
            :key="queueIndex"
            type="button"
            class="manual-queue-tab"
            :class="{ selected: manualQueueIndex === queueIndex - 1 }"
            :aria-selected="manualQueueIndex === queueIndex - 1"
            role="tab"
            @click="manualQueueIndex = queueIndex - 1"
          >
            队列 {{ queueIndex }}
          </button>
        </div>

        <div class="manual-editor-layout">
          <section class="manual-blueprint" aria-label="基建简图">
            <header class="manual-panel-heading">
              <div>
                <v-icon icon="mdi-home-city-outline" size="20"></v-icon>
                <h3>{{ developerLayoutId }} 基建简图</h3>
              </div>
              <span>点击房间开始编排</span>
            </header>

            <section
              v-for="row in manualBlueprintRows"
              :key="row.id"
              class="manual-blueprint-row"
            >
              <h4>{{ row.label }}</h4>
              <div class="manual-room-grid">
                <button
                  v-for="room in row.rooms"
                  :key="room.id"
                  type="button"
                  class="manual-room"
                  :class="[
                    `room-${room.roomType}`,
                    {
                      selected: selectedManualRoomId === room.id,
                      assigned: getManualRoomAssignment(
                        room.id,
                        manualQueueIndex,
                      ),
                      conflicted: getManualRoomConflictNames(room).length,
                    },
                  ]"
                  :aria-pressed="selectedManualRoomId === room.id"
                  @click="selectManualRoom(room.id)"
                >
                  <span class="manual-room-icon">
                    <v-icon :icon="room.icon" size="18"></v-icon>
                  </span>
                  <span class="manual-room-copy">
                    <strong>{{ room.label }}</strong>
                    <small>{{
                      getManualRoomAssignmentLabel(room.id, manualQueueIndex)
                    }}</small>
                  </span>
                  <v-icon
                    v-if="getManualRoomConflictNames(room).length"
                    class="manual-room-conflict"
                    icon="mdi-alert-outline"
                    size="17"
                  ></v-icon>
                </button>
              </div>
            </section>
          </section>

          <section class="manual-group-picker">
            <header class="manual-picker-heading">
              <div v-if="selectedManualRoom">
                <span>{{ selectedManualRoom.typeLabel }}</span>
                <h3>{{ selectedManualRoom.label }}</h3>
              </div>
              <button
                type="button"
                class="icon-action"
                title="清空当前房间队列"
                aria-label="清空当前房间队列"
                :disabled="!manualSelectedAssignment"
                @click="clearManualRoomAssignment"
              >
                <v-icon icon="mdi-close"></v-icon>
              </button>
            </header>

            <p class="manual-picker-note">
              队列 {{ manualQueueIndex + 1 }} 可选 {{ manualGroupOptions.length }} 组。
              组内效率与时长保留原始作业记录。
            </p>

            <div
              v-if="manualGroupOptions.length"
              class="manual-group-option-list"
            >
              <button
                v-for="option in manualGroupOptions"
                :key="option.key"
                type="button"
                class="manual-group-option"
                :class="{
                  selected: isManualOptionSelected(option),
                  conflicted: getManualOptionConflictNames(option).length,
                }"
                @click="assignManualGroup(option)"
              >
                <header>
                  <div>
                    <span>{{
                      option.fallback ? "原表未覆盖" : option.duration
                    }}</span>
                    <strong>
                      {{
                        option.fallback
                          ? "保持安排"
                          : option.efficiency === null
                          ? "原表组合说明"
                          : `${option.efficiency}%`
                      }}
                    </strong>
                  </div>
                  <v-icon
                    v-if="isManualOptionSelected(option)"
                    icon="mdi-check-circle"
                    size="20"
                  ></v-icon>
                </header>

                <div
                  v-if="option.operators.length"
                  class="operator-list"
                >
                  <div
                    v-for="operator in option.operators"
                    :key="`${operator.displayName}-${operator.eliteLevel}`"
                    class="operator-name"
                    :class="{ tired: operator.isTired }"
                  >
                    <OperatorAvatar
                      v-if="getOperatorAvatar(operator.displayName)"
                      :char-id="
                        getOperatorAvatar(operator.displayName).charId
                      "
                      :rarity="
                        getOperatorAvatar(operator.displayName).rarity
                      "
                      :size="34"
                      :mobile-size="32"
                      border
                      class="operator-avatar"
                    ></OperatorAvatar>
                    <span class="operator-label">
                      <span>{{ operator.displayName }}</span>
                      <small v-if="operator.eliteLevel !== null">
                        E{{ operator.eliteLevel }}
                      </small>
                    </span>
                  </div>
                </div>
                <p v-else class="developer-empty-operators">
                  {{ option.fallback ? "不换人" : "保持 / 不指定" }}
                </p>

                <p class="manual-option-description">{{ option.description }}</p>
                <p
                  v-if="getManualOptionConflictNames(option).length"
                  class="manual-option-conflict"
                >
                  与已编排房间重复：{{ getManualOptionConflictNames(option).join("、") }}
                </p>
                <small class="manual-option-source">
                  {{
                    option.fallback
                      ? "该设施由用户自行保留"
                      : `${option.sources.length} 个原表来源`
                  }}
                </small>
              </button>
            </div>

            <p v-else class="manual-empty-state">
              当前布局、换班频率和队列位置下没有可用于此房间的原表组合。
            </p>
          </section>
        </div>
      </section>

      <div class="developer-summary">
        <div>
          <strong>{{ developerCombinationCount }}</strong>
          <span>个唯一组合</span>
        </div>
        <p>
          来自 {{ developerCandidates.length }} 份作业；相同的站点、时长、干员顺序与说明已合并，
          但仍保留每个来源。
        </p>
      </div>

      <div class="developer-notice">
        <v-icon icon="mdi-information-outline" size="20"></v-icon>
        <p>
          百分比是原表作者标注的“平均”或“纸面”效率，不是当前页面重新模拟的结果。
          没有百分比说明的组合仍会展示为“原表未标注”。
        </p>
      </div>

      <section
        v-for="group in developerCombinationGroups"
        :key="group.title"
        class="developer-station"
      >
        <header class="developer-station-heading">
          <div>
            <h2>{{ group.title }}</h2>
            <span>{{ group.stationType }}</span>
          </div>
          <strong>{{ group.combinations.length }} 组</strong>
        </header>

        <div class="developer-combination-grid">
          <article
            v-for="combination in group.combinations"
            :key="combination.key"
            class="developer-combination"
          >
            <header class="developer-combination-heading">
              <div>
                <span>
                  队列
                  {{
                    combination.queueIndexes
                      .map((index) => index + 1)
                      .join(" / ")
                  }}
                </span>
                <strong>{{ combination.duration }}</strong>
              </div>
              <strong
                class="developer-efficiency"
                :class="{ unmarked: combination.efficiency === null }"
              >
                {{
                  combination.efficiency === null
                    ? "原表未标注"
                    : `${combination.efficiency}%`
                }}
              </strong>
            </header>

            <div v-if="combination.operators.length" class="operator-list">
              <div
                v-for="operator in combination.operators"
                :key="`${operator.displayName}-${operator.eliteLevel}`"
                class="operator-name"
                :class="{ tired: operator.isTired }"
              >
                <OperatorAvatar
                  v-if="getOperatorAvatar(operator.displayName)"
                  :char-id="
                    getOperatorAvatar(operator.displayName).charId
                  "
                  :rarity="
                    getOperatorAvatar(operator.displayName).rarity
                  "
                  :size="34"
                  :mobile-size="32"
                  border
                  class="operator-avatar"
                ></OperatorAvatar>
                <span class="operator-label">
                  <span>{{ operator.displayName }}</span>
                  <small v-if="operator.eliteLevel !== null">
                    E{{ operator.eliteLevel }}
                  </small>
                </span>
              </div>
            </div>
            <p v-else class="developer-empty-operators">保持 / 不指定</p>

            <p class="developer-description">
              {{
                combination.description ||
                "原表没有为这组干员补充效率说明"
              }}
            </p>

            <details class="developer-sources">
              <summary>{{ combination.sources.length }} 个来源作业</summary>
              <a
                v-for="source in combination.sources"
                :key="`${source.sourcePath}-${source.queueIndex}`"
                :href="getCandidateSourceUrl(source)"
                target="_blank"
                rel="noreferrer"
              >
                {{ formatSourceDate(source.sourceUpdatedAt) }}
                · {{ source.title }}
                · 队列 {{ source.queueIndex + 1 }}
              </a>
            </details>
          </article>
        </div>
      </section>
    </section>

    <div v-else class="workflow-shell">
      <section class="workflow-stage workflow-card layout-workflow-stage">
        <header class="workflow-card-heading">
          <h2>布局规划</h2>
          <span v-if="isLayoutPlanningReady">{{ layoutPlanSummary }}</span>
        </header>

        <section ref="contentPanel" class="layout-choice-panel">
          <section
            class="recommendation-entry-panel"
            :class="{ expanded: recommendationPanelOpen }"
          >
              <el-button
                class="recommendation-entry-action"
                type="primary"
                plain
                @click="openRecommendationPanel"
              >
                不知道选什么，帮我推荐
                <v-icon icon="mdi-chevron-down" size="18"></v-icon>
              </el-button>

              <transition name="recommendation-panel">
                <section
                  v-if="recommendationPanelOpen && activeStep"
                  class="recommendation-question-panel"
                >
                  <header class="recommendation-panel-heading">
                    <div>
                      <span>布局推荐 · {{ currentStep + 1 }}/{{ steps.length }}</span>
                      <h3>{{ activeStep.title }}</h3>
                    </div>
                    <el-button
                      text
                      circle
                      aria-label="收起推荐问卷"
                      @click="closeRecommendationPanel"
                    >
                      <v-icon icon="mdi-chevron-up" size="20"></v-icon>
                    </el-button>
                  </header>

                  <fieldset
                    v-for="field in activeStep.fields"
                    :key="field.key"
                    class="recommendation-field"
                  >
                    <legend>{{ field.label }}</legend>
                    <el-radio-group
                      v-model="answers[field.key]"
                      class="recommendation-answer-group"
                      :class="{ compact: field.options.length <= 2 }"
                      :aria-label="field.label"
                    >
                      <el-radio
                        v-for="option in field.options"
                        :key="option.value"
                        :label="option.value"
                        class="recommendation-answer"
                        :class="`tone-${option.tone}`"
                      >
                        {{ option.label }}
                      </el-radio>
                    </el-radio-group>
                  </fieldset>

                  <div class="recommendation-panel-actions">
                    <el-button
                      :disabled="currentStep === 0"
                      @click="previousStep"
                    >
                      上一步
                    </el-button>
                    <el-button
                      type="primary"
                      :disabled="!canContinue"
                      @click="nextStep"
                    >
                      {{ currentStep === steps.length - 1 ? "查看推荐" : "下一步" }}
                    </el-button>
                  </div>
                </section>
              </transition>

              <section
                v-if="
                  !recommendationPanelOpen &&
                  layoutEntry === 'recommend' &&
                  recommendation
                "
                class="recommendation-result-panel"
              >
                <div>
                  <span>推荐布局</span>
                  <strong>{{ recommendation.layout.shortName }}</strong>
                  <small>{{ recommendation.shiftMode.shortName }}</small>
                </div>
                <el-button link type="primary" @click="openRecommendationPanel">
                  调整回答
                </el-button>
              </section>
              <p
                v-if="
                  !recommendationPanelOpen &&
                  layoutEntry === 'recommend' &&
                  recommendation
                "
                class="recommendation-layout-reason"
              >
                {{ recommendation.layoutReason }}
              </p>

              <section
                v-if="
                  !recommendationPanelOpen &&
                  layoutEntry === 'recommend' &&
                  !recommendation
                "
                class="recommendation-resume-panel"
              >
                <span>推荐问卷尚未完成</span>
                <el-button type="primary" plain @click="openRecommendationPanel">
                  继续填写
                </el-button>
              </section>
          </section>

              <div class="layout-schedule-groups">
                <section
                  v-for="group in LAYOUT_SCHEDULE_GROUPS"
                  :key="group.value"
                  class="layout-schedule-group"
                >
                  <header class="layout-schedule-group-heading">
                    <h3>{{ group.label }}</h3>
                    <span>{{ group.description }}</span>
                  </header>

                  <div
                    class="layout-choice-grid layout-schedule-choice-grid"
                    role="radiogroup"
                    :aria-label="group.label"
                  >
                    <button
                      v-for="option in group.options"
                      :key="option.value"
                      type="button"
                      class="layout-choice"
                      :class="[
                        `layout-${option.id}`,
                        {
                          selected: selectedManualScheduleValue === option.value,
                          recommended:
                            layoutEntry === 'recommend' &&
                            isLayoutRecommended(option.value),
                        },
                      ]"
                      role="radio"
                      :aria-checked="
                        selectedManualScheduleValue === option.value
                      "
                      @click="selectManualScheduleOption(option.value)"
                    >
                      <span class="layout-choice-topline">
                        <span class="layout-choice-code">{{ option.label }}</span>
                        <v-icon :icon="option.icon" size="21"></v-icon>
                      </span>
                      <strong>{{ option.description }}</strong>
                      <span class="layout-choice-facilities">
                        <span class="layout-choice-facility facility-trading">
                          {{ option.tradingRooms }} 贸易
                        </span>
                        <span class="layout-choice-facility facility-manufacture">
                          {{ option.manufactureRooms }} 制造
                        </span>
                        <span class="layout-choice-facility facility-power">
                          {{ option.powerRooms }} 发电
                        </span>
                      </span>
                    </button>
                  </div>
                </section>
              </div>

              <el-alert
                v-if="
                  recommendation?.facilityNote &&
                  activeLayoutId === recommendation.layout.id
                "
                :title="recommendation.facilityNote"
                type="info"
                :closable="false"
                show-icon
                class="facility-requirement-alert"
              />

        </section>

        <section v-if="false" ref="contentPanel" class="result-panel">
        <div class="result-heading">
          <div>
            <span class="result-label">推荐方案</span>
            <h2>{{ recommendation.layout.name }}</h2>
            <p>{{ recommendation.layoutReason }}</p>
            <p
              v-if="recommendation.facilityNote"
              class="facility-requirement-note"
            >
              <v-icon icon="mdi-information-outline" size="16"></v-icon>
              {{ recommendation.facilityNote }}
            </p>
          </div>
          <div class="layout-code">{{ recommendation.layout.shortName }}</div>
        </div>

        <div class="facility-strip">
          <div class="facility-item trading">
            <v-icon icon="mdi-handshake-outline"></v-icon>
            <span>贸易站</span>
            <strong>{{ recommendation.layout.tradingRooms }}</strong>
          </div>
          <div class="facility-item manufacture">
            <v-icon icon="mdi-factory"></v-icon>
            <span>制造站</span>
            <strong>{{ recommendation.layout.manufactureRooms }}</strong>
          </div>
          <div class="facility-item power">
            <v-icon icon="mdi-lightning-bolt"></v-icon>
            <span>发电站</span>
            <strong>{{ recommendation.layout.powerRooms }}</strong>
          </div>
        </div>

        <section v-if="showScheduleGeneration" class="ownership-panel">
          <div class="ownership-copy">
            <div class="section-title">
              <v-icon icon="mdi-account-check-outline"></v-icon>
              <h3>按持有干员筛选</h3>
            </div>
            <strong v-if="loadingOwnedOperators">正在读取持有干员数据</strong>
            <template v-else-if="ownedOperators.length">
              <strong>
                {{ ownedOperatorMessage }}，来源：{{ ownedOperatorSource }}
              </strong>
              <span>
                {{
                  useOwnedOperators
                    ? "当前只会采用你能够完整执行的排班"
                    : "当前先按全干员范围寻找高产方案"
                }}
              </span>
            </template>
            <template v-else>
              <strong>{{ ownedOperatorError || ownedOperatorMessage }}</strong>
              <span>
                可先在练度调查中导入干员，再回到这里生成个人排班。
              </span>
            </template>
          </div>
          <div class="ownership-actions">
            <a
              v-if="!loadingOwnedOperators && ownedOperators.length === 0"
              class="text-link"
              href="/survey/operators"
            >
              导入干员
              <v-icon icon="mdi-open-in-new" size="16"></v-icon>
            </a>
            <button
              type="button"
              class="secondary-action"
              :disabled="loadingOwnedOperators"
              @click="toggleOwnedRecommendation"
            >
              <v-icon
                :icon="
                  useOwnedOperators
                    ? 'mdi-account-multiple'
                    : 'mdi-account-filter-outline'
                "
                size="19"
              ></v-icon>
              {{
                useOwnedOperators ? "查看全干员最优" : "使用我的干员"
              }}
            </button>
          </div>
        </section>

        <section
          v-if="showScheduleGeneration && useOwnedOperators && !selectedSchedule"
          class="compatibility-alert"
        >
          <v-icon icon="mdi-alert-circle-outline" size="24"></v-icon>
          <div>
            <strong>没有找到你能完整执行的现成排班</strong>
            <p v-if="recommendation.closestSchedule">
              最接近的方案还缺
              {{ recommendation.closestSchedule.ownership.unavailableCount }}
              名干员或练度条件，因此没有把它当成可导出结果。
            </p>
            <div
              v-if="recommendation.closestSchedule"
              class="missing-operator-list"
            >
              <span
                v-for="operator in recommendation.closestSchedule.ownership.missing.slice(0, 12)"
                :key="`missing-${operator.name}`"
              >
                {{ operator.name }} · {{ formatEliteLevel(operator.eliteLevel) }}
              </span>
              <span
                v-for="operator in recommendation.closestSchedule.ownership.underleveled.slice(0, 8)"
                :key="`underleveled-${operator.name}`"
              >
                {{ operator.name }} · 当前精英 {{ operator.currentElite }} /
                需要 {{ operator.eliteLevel }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="secondary-action"
            @click="disableOwnedRecommendation"
          >
            查看全干员方案
          </button>
        </section>

        <div class="result-section">
          <div class="section-title">
            <v-icon icon="mdi-factory"></v-icon>
            <h3>制造分配</h3>
          </div>
          <div class="production-allocation">
            <div class="allocation-row experience">
              <span>作战记录</span>
              <div class="allocation-track">
                <span
                  :style="{
                    width: `${recommendation.layout.experienceRooms / recommendation.layout.manufactureRooms * 100}%`,
                  }"
                ></span>
              </div>
              <strong>{{ recommendation.layout.experienceRooms }} 座</strong>
            </div>
            <div class="allocation-row gold">
              <span>赤金</span>
              <div class="allocation-track">
                <span
                  :style="{
                    width: `${recommendation.layout.goldRooms / recommendation.layout.manufactureRooms * 100}%`,
                  }"
                ></span>
              </div>
              <strong>{{ recommendation.layout.goldRooms }} 座</strong>
            </div>
            <div
              v-if="recommendation.layout.orundumRooms"
              class="allocation-row orundum"
            >
              <span>源石碎片</span>
              <div class="allocation-track">
                <span
                  :style="{
                    width: `${recommendation.layout.orundumRooms / recommendation.layout.manufactureRooms * 100}%`,
                  }"
                ></span>
              </div>
              <strong>{{ recommendation.layout.orundumRooms }} 座</strong>
            </div>
          </div>
        </div>

        <div class="result-grid">
          <section class="result-section">
            <div class="section-title">
              <v-icon icon="mdi-clock-outline"></v-icon>
              <h3>换班队列</h3>
            </div>
            <strong class="section-main">{{ recommendation.shiftMode.name }}</strong>
            <span class="section-secondary">{{ recommendation.shiftMode.description }}</span>
            <p
              v-if="recommendation.shiftMode.isCompatibleFallback"
              class="section-note"
            >
              你选择的一天三换可兼容这一套一天两换原表，无需强行增加换班次数。
            </p>
            <div class="queue-row">
              <div
                v-for="(hours, index) in recommendation.shiftMode.queueHours"
                :key="index"
                class="queue-item"
              >
                <span>队列 {{ index + 1 }}</span>
                <strong>{{ hours }}h</strong>
              </div>
            </div>
            <p class="section-note">换班和收取产物时，已有生产进度正常保留。</p>
          </section>

          <section class="result-section">
            <div class="section-title">
              <v-icon icon="mdi-quadcopter"></v-icon>
              <h3>无人机投向</h3>
            </div>
            <strong class="section-main">{{ recommendation.droneTarget.roomName }}</strong>
            <span class="section-secondary">每日约 {{ recommendation.production.drones }} 架全部投入</span>
            <p class="section-note">{{ recommendation.droneReason }}</p>
            <div
              v-if="recommendation.droneTarget.id === 'flexible'"
              class="drone-flex-options"
            >
              <span>
                投经验：{{ formatNumber(recommendation.productionAlternatives[0].production.experience) }} EXP
              </span>
              <span>
                投贸易：{{ formatNumber(recommendation.productionAlternatives[1].production.lmd) }} LMD
              </span>
            </div>
          </section>
        </div>

        <section
          v-if="showScheduleGeneration && selectedSchedule"
          class="result-section reference-section"
        >
          <div class="section-title">
            <v-icon icon="mdi-clipboard-text-search-outline"></v-icon>
            <h3>方案参考</h3>
          </div>

          <div class="reference-grid">
            <div class="reference-item">
              <span class="reference-label">推荐依据</span>
              <ul class="reference-basis">
                <li
                  v-for="basis in recommendation.reference.selectionBasis"
                  :key="basis"
                >
                  <v-icon icon="mdi-check" size="15"></v-icon>
                  <span>{{ basis }}</span>
                </li>
              </ul>
            </div>

            <div class="reference-item">
              <span class="reference-label">执行规模</span>
              <strong>
                {{ selectedSchedule.ownership.requiredCount }} 名干员
                <template v-if="recommendation.reference.fullRotationHours">
                  · {{ recommendation.reference.fullRotationHours }} 小时一轮
                </template>
              </strong>
              <p>
                {{
                  recommendation.useOwnedOperators
                    ? "已通过持有与精英化要求检查"
                    : "全干员范围推荐，尚未校验你的持有情况"
                }}
              </p>
            </div>

            <div class="reference-item">
              <span class="reference-label">产量口径</span>
              <strong>
                {{
                  recommendation.productionIsFallback
                    ? "基础布局估算"
                    : "文档完整产量"
                }}
              </strong>
              <p v-if="recommendation.productionIsFallback">
                当前原表缺少完整产量字段，结果改按普通补位 190% 估算，
                不再把缺失值显示为 0。
              </p>
              <p v-else>
                基础产量取自原排班文档，无人机增量按本次选择的投向计入。
              </p>
            </div>

            <div class="reference-item">
              <span class="reference-label">相对下一方案</span>
              <template v-if="recommendation.reference.comparison">
                <strong>
                  {{ formatSourceDate(recommendation.reference.comparison.sourceUpdatedAt) }}
                  ·
                  {{
                    recommendation.reference.comparison.variant === "simplified"
                      ? "简化版"
                      : "标准版"
                  }}
                </strong>
                <div class="comparison-metrics">
                  <span>
                    EXP
                    {{ formatSignedInteger(recommendation.reference.comparison.experience) }}
                  </span>
                  <span>
                    LMD
                    {{ formatSignedInteger(recommendation.reference.comparison.lmd) }}
                  </span>
                  <span>
                    赤金净
                    {{ formatSigned(recommendation.reference.comparison.goldNet) }}
                  </span>
                </div>
                <p>以上为当前方案减去下一可用高产方案的稳定日均差值。</p>
              </template>
              <p v-else>
                当前没有同布局、同换班频率且产量完整的第二方案可比较。
              </p>
            </div>
          </div>

          <div
            v-if="recommendation.reference.operationRisks.length"
            class="operation-reference"
          >
            <span class="reference-label">执行条件</span>
            <div class="operation-reference-list">
              <div
                v-for="risk in recommendation.reference.operationRisks"
                :key="risk.id"
                class="operation-reference-item"
                :class="`tone-${risk.tone}`"
              >
                <v-icon :icon="risk.icon" size="18"></v-icon>
                <div>
                  <strong>{{ risk.label }}</strong>
                  <span>{{ risk.detail }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="showScheduleGeneration && selectedSchedule"
          ref="scheduleCapturePanel"
          class="schedule-detail"
          data-riic-capture
        >
          <header class="schedule-detail-heading">
            <div>
              <span class="result-label">推荐完整排班</span>
              <h3>{{ selectedCandidate.title.replace(/\s+/g, " ") }}</h3>
              <p>
                来源版本 {{ formatSourceDate(selectedCandidate.sourceUpdatedAt) }}
                · 需要 {{ selectedSchedule.ownership.requiredCount }} 名不同干员
              </p>
            </div>
            <a
              class="source-link"
              :href="candidateSourceUrl"
              target="_blank"
              rel="noreferrer"
            >
              查看原表
              <v-icon icon="mdi-open-in-new" size="16"></v-icon>
            </a>
          </header>

          <div
            v-if="selectedDescriptionLines.length"
            class="schedule-notices"
          >
            <span
              v-for="line in selectedDescriptionLines"
              :key="line"
            >
              <v-icon
                :icon="
                  line.includes('严格') || line.includes('不建议')
                    ? 'mdi-alert-outline'
                    : 'mdi-information-outline'
                "
                size="17"
              ></v-icon>
              {{ line }}
            </span>
          </div>

          <div class="schedule-board-scroll">
            <div class="schedule-board">
              <div class="schedule-board-head">
                <strong>房间</strong>
                <strong
                  v-for="(description, index) in selectedCandidate.queueDescriptions"
                  :key="description"
                >
                  队列 {{ index + 1 }}
                  <small>{{ description }}</small>
                </strong>
              </div>
              <div
                v-for="(station, stationIndex) in selectedStations"
                :key="`${station.title}-${stationIndex}`"
                class="schedule-station-row"
              >
                <div class="station-name">
                  <span>{{ station.title }}</span>
                  <small>{{ station.stationType }}</small>
                </div>
                <div
                  v-for="(queue, queueIndex) in station.queues"
                  :key="queueIndex"
                  class="station-queue"
                >
                  <div
                    v-if="queue.operators.length"
                    class="operator-list"
                  >
                    <div
                      v-for="operator in queue.operators"
                      :key="`${operator.displayName}-${operator.eliteLevel}`"
                      class="operator-name"
                      :class="{ tired: operator.isTired }"
                    >
                      <OperatorAvatar
                        v-if="getOperatorAvatar(operator.displayName)"
                        :char-id="
                          getOperatorAvatar(operator.displayName).charId
                        "
                        :rarity="
                          getOperatorAvatar(operator.displayName).rarity
                        "
                        :size="34"
                        :mobile-size="32"
                        border
                        class="operator-avatar"
                      ></OperatorAvatar>
                      <span class="operator-label">
                        <span>{{ operator.displayName }}</span>
                        <small v-if="operator.eliteLevel !== null">
                          E{{ operator.eliteLevel }}
                        </small>
                      </span>
                    </div>
                  </div>
                  <span v-else class="empty-queue">保持 / 不指定</span>
                  <p v-if="queue.description">{{ queue.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <footer class="schedule-source-note">
            产量和干员组合来自一图流排班文档；本工具负责按目标、换班频率与持有情况筛选整套方案。
          </footer>
        </section>

        <div class="result-section output-section">
          <div class="section-title">
            <v-icon icon="mdi-chart-box-outline"></v-icon>
            <h3>
              {{
                recommendation.productionIsFallback
                  ? "基础布局兜底估算"
                  : "原排班稳定日均"
              }}
            </h3>
          </div>
          <p class="output-basis-note">
            {{
              recommendation.productionIsFallback
                ? "当前排班文档未提供完整产量，以下按 3 名 +30% 普通补位干员、房间总效率 190% 估算。"
                : "基础产量来自原排班文档，无人机增量按当前投向计算。"
            }}
          </p>
          <div class="metric-grid">
            <div class="metric-item experience">
              <span>经验</span>
              <strong>{{ formatNumber(recommendation.production.experience) }}</strong>
              <small>EXP / 日</small>
            </div>
            <div class="metric-item lmd">
              <span>龙门币</span>
              <strong>{{ formatNumber(recommendation.production.lmd) }}</strong>
              <small>LMD / 日</small>
            </div>
            <div class="metric-item gold">
              <span>赤金生产</span>
              <strong>{{ formatNumber(recommendation.production.goldProduced, 1) }}</strong>
              <small>
                消耗 {{ formatNumber(recommendation.production.goldConsumed, 1) }}，
                净 {{ formatSigned(recommendation.production.goldNet) }}
              </small>
            </div>
            <div class="metric-item drones">
              <span>无人机恢复</span>
              <strong>{{ recommendation.production.drones }}</strong>
              <small>架 / 日</small>
            </div>
          </div>
        </div>

        <section
          v-if="recommendation.alternatives.length"
          class="alternative-section"
        >
          <div class="section-title">
            <v-icon icon="mdi-format-list-numbered"></v-icon>
            <h3>备选方案</h3>
          </div>
          <div class="alternative-list">
            <div
              v-for="alternative in recommendation.alternatives"
              :key="alternative.candidate.id"
              class="alternative-row"
            >
              <div>
                <strong>
                  {{ alternative.label }} ·
                  {{ alternative.candidate.title.replace(/\s+/g, " ") }}
                </strong>
                <span>
                  {{ alternative.reason }}
                </span>
              </div>
              <div class="alternative-output">
                <span>{{ formatNumber(alternative.production.experience) }} EXP</span>
                <span>{{ formatNumber(alternative.production.lmd) }} LMD</span>
                <span>赤金净 {{ formatSigned(alternative.production.goldNet) }}</span>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="showScheduleGeneration && maaExportPreview?.warnings.length"
          class="export-warning"
        >
          <div class="section-title">
            <v-icon icon="mdi-alert-outline"></v-icon>
            <h3>MAA 转换提示</h3>
          </div>
          <p
            v-for="warning in maaExportPreview.warnings"
            :key="warning"
          >
            {{ warning }}
          </p>
        </section>

        <details v-if="showScheduleGeneration" class="assumption-panel">
          <summary>估算口径</summary>
          <div>
            <p>
              未匹配到文档排班时，制造站与贸易站按普通补位计算：3 名 +30% 干员，
              房间总效率为 {{ formatNumber(ESTIMATION_ASSUMPTIONS.roomEfficiency * 100) }}%。
            </p>
            <p>
              3 座普通发电站每日约恢复 {{ ESTIMATION_ASSUMPTIONS.dronesPerDay }} 架无人机；
              每架推进 3 分钟，无人机推进量不乘房间效率。
            </p>
            <p>假设及时收取产物，不计算仓库满仓停产。</p>
          </div>
        </details>

        <footer class="result-actions">
          <button
            type="button"
            class="secondary-action"
            @click="resetWizard"
          >
            <v-icon icon="mdi-refresh" size="19"></v-icon>
            重新选择
          </button>
          <button
            v-if="showScheduleGeneration"
            type="button"
            class="primary-action"
            @click="copySummary"
          >
            <v-icon icon="mdi-content-copy" size="19"></v-icon>
            复制方案摘要
          </button>
          <button
            v-if="showScheduleGeneration"
            type="button"
            class="secondary-action"
            :disabled="!selectedSchedule || exportingImage"
            @click="exportScheduleImage"
          >
            <v-icon icon="mdi-image-outline" size="19"></v-icon>
            {{ exportingImage ? "正在生成" : "导出图片" }}
          </button>
          <button
            v-if="showScheduleGeneration"
            type="button"
            class="primary-action"
            :disabled="!selectedSchedule || exportingMaa"
            @click="exportMaaSchedule"
          >
            <v-icon icon="mdi-code-json" size="19"></v-icon>
            {{ exportingMaa ? "正在导出" : "导出 MAA" }}
          </button>
        </footer>
      </section>
      </section>

      <section class="workflow-stage workflow-card schedule-generation-stage">
        <h2>排班表生成</h2>
        <div class="schedule-generation-status-grid">
          <section
            class="schedule-status-card"
            :class="`tone-${layoutSelectionStatus.tone}`"
          >
            <v-icon
              :icon="
                isLayoutPlanningReady
                  ? 'mdi-map-marker-check-outline'
                  : 'mdi-map-marker-question-outline'
              "
              size="22"
            ></v-icon>
            <div>
              <strong>{{ layoutSelectionStatus.title }}</strong>
              <span>{{ layoutSelectionStatus.detail }}</span>
            </div>
          </section>

          <section
            class="schedule-status-card operator-box-status"
            :class="`tone-${operatorBoxStatus.tone}`"
          >
            <v-icon
              :icon="
                operatorBoxStatus.tone === 'success'
                  ? 'mdi-account-check-outline'
                  : 'mdi-account-alert-outline'
              "
              size="22"
            ></v-icon>
            <div>
              <strong>{{ operatorBoxStatus.title }}</strong>
              <span>{{ operatorBoxStatus.detail }}</span>
            </div>
            <button
              v-if="isUserLoggedIn && ownedOperators.length"
              type="button"
              class="operator-box-refresh"
              :disabled="loadingOwnedOperators"
              @click="loadOwnedOperators({ notify: true })"
            >
              <v-icon icon="mdi-refresh" size="16"></v-icon>
              更新干员数据
            </button>
          </section>

          <button
            type="button"
            class="sync-source-action"
            @click="notifyPendingOperatorSync('森空岛')"
          >
            <v-icon icon="mdi-cloud-sync-outline" size="22"></v-icon>
            <span>同步森空岛数据</span>
          </button>

          <button
            type="button"
            class="sync-source-action"
            @click="notifyPendingOperatorSync('MAA')"
          >
            <v-icon icon="mdi-robot-outline" size="22"></v-icon>
            <span>同步 MAA 数据</span>
          </button>
        </div>
      </section>

      <section class="workflow-stage workflow-card future-workflow-stage pending">
        <h2>排班表输出</h2>
        <p>生成排班表后即可导出结果</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.riic-generator {
  --riic-blue: #2878c8;
  --riic-green: #23866c;
  --riic-orange: #d46d2b;
  --riic-gold: #b88616;
  --riic-red: #c94f4f;
  --riic-muted: var(--c-text-tip-color);
  width: min(1180px, 100%);
  margin: 0 auto;
  color: var(--c-text-color);
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 4px 24px;
}

.page-eyebrow {
  margin: 0 0 6px;
  color: var(--riic-blue);
  font-size: 12px;
  font-weight: 700;
}

.page-heading h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.25;
}

.page-subtitle {
  margin: 8px 0 0;
  color: var(--riic-muted);
  font-size: 15px;
}

.phase-mark {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
  padding: 7px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  color: var(--riic-muted);
  font-size: 13px;
  font-weight: 600;
}

.workflow-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 0 32px;
}

.workflow-stage {
  padding: 22px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.wizard-layout.manual-selection {
  grid-template-columns: minmax(0, 1fr);
  max-width: 880px;
}

.layout-choice-panel {
  margin-top: 20px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.workflow-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.workflow-card-heading h2 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 18px;
  line-height: 1.35;
}

.workflow-card-heading span {
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-entry-panel {
  margin-bottom: 22px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color-secondary);
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.recommendation-entry-panel.expanded {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 42%,
    var(--c-border-color)
  );
  background: var(--c-page-background-color);
}

.recommendation-entry-action {
  display: flex;
  justify-content: space-between;
  width: 100%;
  min-height: 58px;
  margin: 0;
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  font-weight: 700;
}

.recommendation-entry-action :deep(.v-icon) {
  margin-left: auto;
}

.recommendation-question-panel {
  padding: 0 14px 14px;
  border-top: 1px solid var(--c-border-color);
}

.recommendation-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 0 14px;
}

.recommendation-panel-heading span {
  color: var(--riic-blue);
  font-size: 12px;
  font-weight: 700;
}

.recommendation-panel-heading h3 {
  margin: 4px 0 0;
  color: var(--c-text-color);
  font-size: 16px;
  line-height: 1.45;
}

.recommendation-panel-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--c-border-color);
}

.recommendation-panel-enter-active,
.recommendation-panel-leave-active {
  overflow: hidden;
  transition:
    max-height 0.26s ease,
    opacity 0.18s ease;
}

.recommendation-panel-enter-from,
.recommendation-panel-leave-to {
  max-height: 0;
  opacity: 0;
}

.recommendation-panel-enter-to,
.recommendation-panel-leave-from {
  max-height: 640px;
  opacity: 1;
}

.layout-schedule-groups {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.layout-schedule-group {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.layout-schedule-group-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.layout-schedule-group-heading h3 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 15px;
  line-height: 1.35;
}

.layout-schedule-group-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.35;
}

.layout-schedule-choice-grid {
  margin-top: 0;
}

.layout-unavailable-alert,
.facility-requirement-alert {
  margin-top: 4px;
}

.recommendation-result-panel,
.recommendation-resume-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 14px 0;
}

.recommendation-result-panel > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.recommendation-result-panel span,
.recommendation-resume-panel > span {
  color: var(--riic-muted);
  font-size: 13px;
}

.recommendation-result-panel strong {
  color: var(--riic-green);
  font-size: 18px;
}

.recommendation-result-panel small {
  color: var(--riic-muted);
  font-size: 12px;
}

.recommendation-layout-reason {
  margin: 6px 14px 14px;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.recommendation-field {
  min-width: 0;
  margin: 0 0 20px;
  padding: 0;
  border: 0;
}

.recommendation-field:last-child {
  margin-bottom: 0;
}

.recommendation-field legend {
  padding: 0;
  color: var(--c-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.recommendation-answer-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}

.recommendation-answer-group.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.recommendation-answer-group :deep(.el-radio) {
  width: 100%;
  min-width: 0;
  margin: 0;
}

.recommendation-answer-group :deep(.el-radio__input) {
  display: none;
}

.recommendation-answer-group :deep(.el-radio__label) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.35;
  text-align: center;
  cursor: pointer;
}

.recommendation-answer-group
  :deep(.el-radio__input.is-checked + .el-radio__label) {
  background: color-mix(
    in srgb,
    var(--option-color, var(--riic-blue)) 11%,
    var(--c-page-background-color)
  );
  box-shadow: inset 3px 0 0 var(--option-color, var(--riic-blue));
}

.layout-entry-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.layout-entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.layout-entry {
  --option-color: var(--riic-blue);
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  align-items: center;
  gap: 4px 12px;
  min-width: 0;
  min-height: 76px;
  padding: 12px 14px;
  border: 0;
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.18s ease;
}

.layout-entry-recommend {
  min-height: 76px;
}

.layout-entry:hover {
  background: color-mix(
    in srgb,
    var(--option-color) 6%,
    var(--c-page-background-color-secondary)
  );
}

.layout-entry.selected {
  background: color-mix(
    in srgb,
    var(--option-color) 11%,
    var(--c-page-background-color)
  );
  box-shadow: inset 3px 0 0 var(--option-color);
}

.layout-entry:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.layout-entry.unavailable {
  border-style: dashed;
}

.layout-entry-topline {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  color: var(--option-color);
}

.layout-entry-code {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}

.layout-entry > strong {
  display: block;
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}

.layout-entry-recommend > strong {
  font-size: 14px;
}

.layout-entry-facilities {
  display: block;
  grid-column: 2;
  margin: 0;
  padding: 0;
  color: var(--riic-muted);
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}

.recommendation-question-panel,
.direct-layout-panel {
  padding-top: 12px;
}

.recommendation-step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 0;
}

.recommendation-step {
  padding-top: 12px;
}

.recommendation-step-heading > span {
  color: var(--riic-blue);
  font-size: 11px;
  font-weight: 700;
}

.recommendation-field-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.recommendation-field-list .question-group legend {
  font-size: 13px;
}

.recommendation-field-list .option-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 7px;
}

.recommendation-field-list .option-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.recommendation-field-list .option-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 6px 8px;
  border: 0;
  border-radius: 3px;
  background: var(--c-page-background-color-secondary);
  text-align: center;
}

.recommendation-field-list .option-button:hover {
  border: 0;
  background: color-mix(
    in srgb,
    var(--option-color, var(--riic-blue)) 7%,
    var(--c-page-background-color-secondary)
  );
  transform: none;
}

.recommendation-field-list .option-button.selected {
  border: 0;
}

.recommendation-field-list .option-content strong {
  font-size: 13px;
}

.recommendation-field-list .option-content {
  align-items: center;
}

.recommendation-preview {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 2px;
  padding: 6px 9px;
  border-left: 3px solid var(--riic-green);
  background: transparent;
}

.recommendation-preview span,
.recommendation-preview strong {
  display: block;
}

.recommendation-preview span {
  color: var(--riic-green);
  font-size: 11px;
  font-weight: 700;
}

.recommendation-preview strong {
  font-size: 15px;
}

.layout-unavailable-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 16px 0 0;
  color: var(--riic-orange);
  font-size: 12px;
  line-height: 1.5;
}

.layout-unavailable-note .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
}

.layout-choice-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.layout-choice-field legend {
  padding: 0;
  color: var(--c-text-color);
  font-size: 14px;
  font-weight: 700;
}

.layout-shift-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.layout-shift-choice {
  --option-color: var(--riic-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 40px;
  padding: 5px 8px;
  border: 0;
  border-radius: 3px;
  background: var(--c-page-background-color-secondary);
  color: var(--option-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.layout-shift-choice:hover,
.layout-shift-choice.selected {
  background: color-mix(
    in srgb,
    var(--option-color) 7%,
    var(--c-page-background-color-secondary)
  );
}

.layout-shift-choice.selected {
  background: color-mix(
    in srgb,
    var(--option-color) 10%,
    var(--c-page-background-color)
  );
  box-shadow: inset 3px 0 0 var(--option-color);
}

.layout-shift-choice > span {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  gap: 1px;
  text-align: center;
}

.layout-shift-choice strong {
  color: var(--c-text-color);
  font-size: 13px;
}

.layout-shift-choice small {
  color: var(--riic-muted);
  font-size: 11px;
}

.layout-choice-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.layout-choice {
  --option-color: var(--riic-blue);
  --layout-color: var(--riic-blue);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  min-height: 100px;
  padding: 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.layout-choice.layout-153 {
  --layout-color: #b48745;
}

.layout-choice.layout-243 {
  --layout-color: #3c83bd;
}

.layout-choice.layout-252 {
  --layout-color: #4f9b72;
}

.layout-choice.layout-342 {
  --layout-color: #d96b6b;
}

.layout-choice:hover,
.layout-choice.selected,
.layout-choice.recommended {
  border-color: var(--option-color);
}

.layout-choice.selected {
  background: color-mix(
    in srgb,
    var(--option-color) 10%,
    var(--c-page-background-color)
  );
  box-shadow: inset 3px 0 0 var(--option-color);
}

.layout-choice.recommended {
  background: color-mix(
    in srgb,
    var(--option-color) 10%,
    var(--c-page-background-color)
  );
  animation: riic-recommendation-breathe 2.4s ease-in-out infinite;
}

@keyframes riic-recommendation-breathe {
  0%,
  100% {
    box-shadow:
      inset 3px 0 0 var(--option-color),
      0 0 0 0
        color-mix(in srgb, var(--riic-blue) 0%, transparent);
  }

  50% {
    box-shadow:
      inset 3px 0 0 var(--option-color),
      0 0 0 4px
        color-mix(in srgb, var(--riic-blue) 20%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .layout-choice.recommended {
    animation: none;
    box-shadow:
      inset 3px 0 0 var(--option-color),
      0 0 0 2px
        color-mix(in srgb, var(--riic-blue) 18%, transparent);
  }
}

.layout-choice-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--layout-color);
}

.layout-choice-code {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.layout-choice > strong {
  display: block;
  margin-top: 7px;
  font-size: 12px;
  line-height: 1.35;
}

.layout-choice-facilities {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 6px;
  margin-top: 6px;
  font-size: 10px;
}

.layout-choice-facility {
  --facility-color: var(--riic-blue);
  display: inline-flex;
  align-items: center;
  min-height: 19px;
  padding: 0 5px;
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--facility-color) 12%,
    var(--c-page-background-color)
  );
  color: var(--facility-color);
  font-weight: 600;
  line-height: 1.2;
}

.layout-choice-facility.facility-trading {
  --facility-color: #3c83bd;
}

.layout-choice-facility.facility-manufacture {
  --facility-color: #d5aa36;
}

.layout-choice-facility.facility-power {
  --facility-color: #4f9b72;
}

.layout-choice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 21px;
  margin-top: auto;
  padding-top: 12px;
}

.layout-choice-tag {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 6px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  color: var(--riic-muted);
  font-size: 10px;
  font-weight: 600;
}

.layout-choice-tag.recommended {
  border-color: color-mix(
    in srgb,
    var(--option-color) 45%,
    var(--c-border-color)
  );
  color: var(--option-color);
}

.layout-choice-empty {
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 13px;
}

.layout-choice-panel > .facility-requirement-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: var(--riic-orange);
  font-size: 12px;
  line-height: 1.5;
}

.layout-choice-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 0;
}

.future-workflow-stage {
  min-height: 112px;
  color: var(--riic-muted);
}

.future-workflow-stage h2 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 17px;
  font-weight: 600;
}

.future-workflow-stage p {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.5;
}

.future-workflow-stage.pending {
  background: var(--c-page-background-color-secondary);
}

.schedule-generation-stage h2 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 17px;
  font-weight: 600;
}

.schedule-generation-status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.schedule-status-card,
.sync-source-action {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  min-height: 94px;
  padding: 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
}

.schedule-status-card {
  gap: 9px;
}

.schedule-status-card > .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
}

.schedule-status-card > div {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.schedule-status-card strong {
  font-size: 13px;
  line-height: 1.35;
}

.schedule-status-card span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.schedule-status-card.tone-success {
  border-color: color-mix(
    in srgb,
    var(--riic-green) 42%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-green) 8%,
    var(--c-page-background-color-secondary)
  );
}

.schedule-status-card.tone-success > .v-icon,
.schedule-status-card.tone-success strong {
  color: var(--riic-green);
}

.schedule-status-card.tone-warning {
  border-color: color-mix(
    in srgb,
    var(--riic-orange) 42%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-orange) 8%,
    var(--c-page-background-color-secondary)
  );
}

.schedule-status-card.tone-warning > .v-icon,
.schedule-status-card.tone-warning strong {
  color: var(--riic-orange);
}

.operator-box-status {
  flex-wrap: wrap;
}

.operator-box-refresh {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  margin: auto 0 0 31px;
  padding: 3px 6px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--riic-green);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.operator-box-refresh:hover {
  background: color-mix(
    in srgb,
    var(--riic-green) 10%,
    var(--c-page-background-color-secondary)
  );
}

.operator-box-refresh:disabled {
  cursor: wait;
  opacity: 0.65;
}

.sync-source-action {
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.sync-source-action > .v-icon {
  color: var(--riic-blue);
}

.sync-source-action span {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.sync-source-action:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 42%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-blue) 7%,
    var(--c-page-background-color-secondary)
  );
}

.wizard-layout {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 28px;
  padding: 28px 0 36px;
}

.developer-workbench {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 0 36px;
}

.developer-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--c-border-color);
}

.developer-heading h2 {
  margin: 8px 0 0;
  font-size: 24px;
  line-height: 1.35;
}

.developer-heading p {
  max-width: 720px;
  margin: 9px 0 0;
  color: var(--riic-muted);
  font-size: 14px;
  line-height: 1.6;
}

.developer-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.developer-choice-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.developer-choice-group legend {
  margin-bottom: 9px;
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 700;
}

.developer-choice-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.developer-choice {
  display: flex;
  flex-direction: column;
  min-height: 72px;
  padding: 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.developer-choice:hover,
.developer-choice.selected {
  border-color: var(--riic-blue);
}

.developer-choice.selected {
  background: color-mix(in srgb, var(--riic-blue) 10%, var(--c-page-background-color));
  box-shadow: inset 3px 0 0 var(--riic-blue);
}

.developer-choice strong {
  font-size: 16px;
}

.developer-choice small {
  margin-top: 5px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.developer-summary {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 13px 16px;
  border-left: 4px solid var(--riic-green);
  background: var(--c-page-background-color-secondary);
}

.developer-summary div {
  display: flex;
  align-items: baseline;
  flex: 0 0 auto;
  gap: 5px;
}

.developer-summary strong {
  color: var(--riic-green);
  font-size: 23px;
}

.developer-summary span,
.developer-summary p {
  color: var(--riic-muted);
  font-size: 13px;
}

.developer-summary p {
  margin: 0;
  line-height: 1.55;
}

.developer-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0 2px;
  color: var(--riic-muted);
}

.developer-notice .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--riic-orange);
}

.developer-notice p {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
}

.developer-station {
  padding-top: 20px;
  border-top: 1px solid var(--c-border-color);
}

.developer-station-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.developer-station-heading h2 {
  margin: 0;
  font-size: 18px;
}

.developer-station-heading span {
  display: block;
  margin-top: 4px;
  color: var(--riic-muted);
  font-size: 11px;
}

.developer-station-heading > strong {
  flex: 0 0 auto;
  color: var(--riic-blue);
  font-size: 13px;
}

.developer-combination-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.developer-combination {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.developer-combination-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.developer-combination-heading > div > span,
.developer-combination-heading > div > strong {
  display: block;
}

.developer-combination-heading > div > span {
  color: var(--riic-muted);
  font-size: 11px;
}

.developer-combination-heading > div > strong {
  margin-top: 3px;
  font-size: 15px;
}

.developer-efficiency {
  flex: 0 0 auto;
  color: var(--riic-green);
  font-size: 18px;
}

.developer-efficiency.unmarked {
  color: var(--riic-muted);
  font-size: 12px;
}

.developer-combination .operator-list {
  margin-top: 14px;
}

.developer-empty-operators {
  margin: 14px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
}

.developer-description {
  min-height: 20px;
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.developer-sources {
  margin-top: auto;
  padding-top: 12px;
}

.developer-sources summary {
  color: var(--riic-blue);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.developer-sources a {
  display: block;
  margin-top: 7px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
  text-decoration: none;
}

.developer-sources a:hover {
  color: var(--riic-blue);
  text-decoration: underline;
}

.manual-schedule-editor {
  padding: 22px 0;
  border-top: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}

.manual-editor-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.manual-editor-heading h2 {
  margin: 8px 0 0;
  font-size: 21px;
  line-height: 1.35;
}

.manual-editor-heading p {
  max-width: 680px;
  margin: 8px 0 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.manual-editor-status {
  display: flex;
  align-items: baseline;
  flex: 0 0 auto;
  gap: 4px;
  padding-top: 5px;
  color: var(--riic-muted);
  font-size: 12px;
}

.manual-editor-status strong {
  color: var(--riic-green);
  font-size: 23px;
}

.manual-queue-tabs {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-border-color);
}

.manual-queue-tab {
  min-width: 84px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.manual-queue-tab:hover,
.manual-queue-tab.selected {
  border-color: var(--riic-blue);
  color: var(--riic-blue);
}

.manual-queue-tab.selected {
  background: color-mix(in srgb, var(--riic-blue) 10%, var(--c-page-background-color));
}

.manual-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
  gap: 20px;
  margin-top: 18px;
}

.manual-blueprint,
.manual-group-picker {
  min-width: 0;
}

.manual-blueprint {
  padding: 16px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
}

.manual-panel-heading,
.manual-picker-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.manual-panel-heading > div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--riic-blue);
}

.manual-panel-heading h3,
.manual-picker-heading h3 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 15px;
}

.manual-panel-heading > span {
  color: var(--riic-muted);
  font-size: 11px;
}

.manual-blueprint-row {
  margin-top: 18px;
}

.manual-blueprint-row h4 {
  margin: 0 0 8px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 700;
}

.manual-room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 8px;
}

.manual-room {
  --room-color: var(--riic-blue);
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 62px;
  padding: 8px;
  border: 1px solid var(--c-border-color);
  border-left: 3px solid var(--room-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.manual-room:hover,
.manual-room.selected {
  border-color: var(--room-color);
}

.manual-room.selected {
  background: color-mix(in srgb, var(--room-color) 9%, var(--c-page-background-color));
  box-shadow: inset 0 0 0 1px var(--room-color);
}

.manual-room.assigned .manual-room-icon {
  background: color-mix(in srgb, var(--room-color) 17%, transparent);
}

.manual-room.conflicted {
  --room-color: var(--riic-red);
}

.room-control {
  --room-color: var(--riic-blue);
}

.room-manufacture {
  --room-color: var(--riic-orange);
}

.room-trading {
  --room-color: var(--riic-green);
}

.room-power {
  --room-color: var(--riic-gold);
}

.room-meeting,
.room-hire {
  --room-color: #3d8ca8;
}

.room-processing {
  --room-color: #7667a8;
}

.room-dormitory {
  --room-color: #6d7782;
}

.manual-room-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--room-color);
}

.manual-room-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.manual-room-copy strong {
  font-size: 12px;
}

.manual-room-copy small {
  display: -webkit-box;
  margin-top: 3px;
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 10px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.manual-room-conflict {
  flex: 0 0 auto;
  color: var(--riic-red);
}

.manual-group-picker {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.manual-picker-heading > div > span {
  display: block;
  margin-bottom: 4px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 700;
}

.manual-picker-heading .icon-action:disabled {
  color: var(--riic-muted);
  cursor: default;
  opacity: 0.55;
}

.manual-picker-note {
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.manual-group-option-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  max-height: 620px;
  margin-top: 14px;
  overflow-y: auto;
  padding-right: 2px;
}

.manual-group-option {
  width: 100%;
  padding: 11px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.manual-group-option:hover,
.manual-group-option.selected {
  border-color: var(--riic-blue);
}

.manual-group-option.selected {
  background: color-mix(in srgb, var(--riic-blue) 9%, var(--c-page-background-color));
  box-shadow: inset 3px 0 0 var(--riic-blue);
}

.manual-group-option.conflicted {
  border-color: color-mix(in srgb, var(--riic-red) 65%, var(--c-border-color));
}

.manual-group-option > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.manual-group-option > header > div > span,
.manual-group-option > header > div > strong {
  display: block;
}

.manual-group-option > header > div > span {
  color: var(--riic-muted);
  font-size: 10px;
}

.manual-group-option > header > div > strong {
  margin-top: 3px;
  color: var(--riic-green);
  font-size: 15px;
}

.manual-group-option.selected > header > .v-icon {
  color: var(--riic-blue);
}

.manual-group-option .operator-list {
  margin-top: 10px;
}

.manual-option-description,
.manual-option-conflict {
  margin: 9px 0 0;
  font-size: 11px;
  line-height: 1.45;
}

.manual-option-description {
  color: var(--riic-muted);
}

.manual-option-conflict {
  color: var(--riic-red);
}

.manual-option-source {
  display: block;
  margin-top: 8px;
  color: var(--riic-muted);
  font-size: 10px;
}

.manual-empty-state {
  margin: 22px 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.step-navigation {
  display: flex;
  flex-direction: column;
  align-self: start;
  position: sticky;
  top: 84px;
}

.step-button {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 48px;
  padding: 5px 8px;
  border: 0;
  border-left: 2px solid var(--c-border-color);
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.step-button:disabled {
  cursor: default;
  opacity: 0.5;
}

.step-button.active {
  border-left-color: var(--riic-blue);
  color: var(--c-text-color);
  font-weight: 700;
}

.step-button.complete {
  color: var(--riic-green);
}

.step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
}

.clear-draft-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  margin-top: 12px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.clear-draft-action:hover {
  color: var(--riic-red);
}

.question-panel,
.result-panel {
  min-width: 0;
  scroll-margin-top: 80px;
}

.question-panel {
  min-height: 500px;
  padding: 28px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.question-heading span,
.result-label {
  color: var(--riic-blue);
  font-size: 12px;
  font-weight: 700;
}

.question-heading h2,
.result-heading h2 {
  margin: 8px 0 0;
  font-size: 24px;
  line-height: 1.35;
}

.question-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 26px;
}

.question-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.question-group legend {
  padding: 0;
  color: var(--c-text-color);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.option-grid.compact {
  grid-template-columns: 1fr;
}

.option-button {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  min-height: 86px;
  padding: 14px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.option-button:hover {
  border-color: var(--option-color, var(--riic-blue));
  transform: translateY(-1px);
}

.option-button.selected {
  border-color: var(--option-color, var(--riic-blue));
  background: color-mix(in srgb, var(--option-color, var(--riic-blue)) 10%, var(--c-page-background-color));
  box-shadow: inset 3px 0 0 var(--option-color, var(--riic-blue));
}

.tone-blue {
  --option-color: var(--riic-blue);
}

.tone-green {
  --option-color: var(--riic-green);
}

.tone-orange {
  --option-color: var(--riic-orange);
}

.tone-gold {
  --option-color: var(--riic-gold);
}

.tone-red {
  --option-color: var(--riic-red);
}

.tone-purple {
  --option-color: #7b5bb8;
}

.tone-gray {
  --option-color: #6d7782;
}

.option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--option-color) 13%, transparent);
  color: var(--option-color);
}

.option-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.option-content strong {
  font-size: 16px;
}

.option-content small {
  margin-top: 5px;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.45;
}

.option-check {
  color: var(--option-color);
  opacity: 0;
}

.option-button.selected .option-check {
  opacity: 1;
}

.question-actions,
.result-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--c-border-color);
}

.icon-action,
.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  border-radius: 4px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.icon-action {
  width: 40px;
  border: 1px solid var(--c-border-color);
  background: transparent;
  color: var(--c-text-color);
}

.primary-action {
  padding: 0 18px;
  border: 1px solid var(--riic-blue);
  background: var(--riic-blue);
  color: #ffffff;
}

.primary-action:disabled {
  border-color: var(--c-border-color);
  background: var(--c-border-color);
  color: var(--riic-muted);
  cursor: default;
}

.secondary-action {
  padding: 0 16px;
  border: 1px solid var(--c-border-color);
  background: transparent;
  color: var(--c-text-color);
}

.secondary-action:disabled {
  color: var(--riic-muted);
  cursor: default;
  opacity: 0.6;
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.result-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 0 20px;
  border-bottom: 1px solid var(--c-border-color);
}

.result-heading p {
  max-width: 680px;
  margin: 9px 0 0;
  color: var(--riic-muted);
  font-size: 14px;
  line-height: 1.6;
}

.result-heading .facility-requirement-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--riic-orange);
}

.facility-requirement-note .v-icon {
  flex: 0 0 auto;
  margin-top: 3px;
}

.layout-code {
  flex: 0 0 auto;
  color: var(--riic-blue);
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
}

.facility-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.facility-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 66px;
  padding: 12px 16px;
  border-right: 1px solid var(--c-border-color);
}

.facility-item:last-child {
  border-right: 0;
}

.facility-item strong {
  font-size: 24px;
}

.facility-item.trading {
  color: var(--riic-green);
}

.facility-item.manufacture {
  color: var(--riic-orange);
}

.facility-item.power {
  color: var(--riic-gold);
}

.ownership-panel,
.compatibility-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  border: 1px solid var(--c-border-color);
  border-left: 4px solid var(--riic-blue);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.ownership-copy {
  min-width: 0;
}

.ownership-copy .section-title {
  margin-bottom: 7px;
}

.ownership-copy strong,
.ownership-copy span {
  display: block;
}

.ownership-copy strong {
  font-size: 14px;
}

.ownership-copy span {
  margin-top: 4px;
  color: var(--riic-muted);
  font-size: 12px;
}

.ownership-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 10px;
}

.text-link,
.source-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--riic-blue);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.compatibility-alert {
  align-items: flex-start;
  border-left-color: var(--riic-orange);
}

.compatibility-alert > .v-icon {
  flex: 0 0 auto;
  color: var(--riic-orange);
}

.compatibility-alert > div {
  flex: 1;
  min-width: 0;
}

.compatibility-alert p {
  margin: 5px 0 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.missing-operator-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.missing-operator-list span {
  padding: 4px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  color: var(--riic-muted);
  font-size: 11px;
}

.result-section {
  padding: 20px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--riic-blue);
}

.section-title h3 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 16px;
}

.production-allocation {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.allocation-row {
  display: grid;
  grid-template-columns: 88px minmax(100px, 1fr) 48px;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.allocation-track {
  height: 8px;
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  overflow: hidden;
}

.allocation-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.allocation-row.experience .allocation-track span {
  background: var(--riic-blue);
}

.allocation-row.gold .allocation-track span {
  background: var(--riic-gold);
}

.allocation-row.orundum .allocation-track span {
  background: #7b5bb8;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.section-main,
.section-secondary {
  display: block;
}

.section-main {
  font-size: 20px;
}

.section-secondary {
  margin-top: 5px;
  color: var(--riic-muted);
  font-size: 13px;
}

.drone-flex-options {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 12px;
  margin-top: 12px;
  color: var(--riic-muted);
  font-size: 12px;
}

.drone-flex-options span {
  padding-left: 9px;
  border-left: 2px solid var(--riic-blue);
}

.queue-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 18px;
}

.queue-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-left: 3px solid var(--riic-orange);
  background: var(--c-page-background-color-secondary);
}

.queue-item span {
  color: var(--riic-muted);
  font-size: 12px;
}

.queue-item strong {
  font-size: 18px;
}

.section-note {
  margin: 18px 0 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.schedule-detail {
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.reference-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.reference-section .section-title {
  margin-bottom: 0;
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--c-border-color);
  border-left: 1px solid var(--c-border-color);
}

.reference-item {
  min-width: 0;
  padding: 15px;
  border-right: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}

.reference-label {
  display: block;
  margin-bottom: 8px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 700;
}

.reference-item > strong {
  display: block;
  font-size: 14px;
  line-height: 1.45;
}

.reference-item p {
  margin: 7px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.55;
}

.reference-basis {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.reference-basis li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.reference-basis .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--riic-green);
}

.comparison-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 9px;
}

.comparison-metrics span {
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 600;
}

.operation-reference {
  padding-top: 1px;
}

.operation-reference-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.operation-reference-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
  padding: 9px 0;
  border-top: 1px solid var(--c-border-color);
}

.operation-reference-item .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--riic-blue);
}

.operation-reference-item.tone-warning .v-icon {
  color: var(--riic-orange);
}

.operation-reference-item.tone-danger .v-icon {
  color: var(--riic-red);
}

.operation-reference-item strong,
.operation-reference-item span {
  display: block;
}

.operation-reference-item strong {
  font-size: 12px;
}

.operation-reference-item span {
  margin-top: 3px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.schedule-detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--c-border-color);
}

.schedule-detail-heading h3 {
  margin: 7px 0 0;
  font-size: 21px;
  line-height: 1.35;
}

.schedule-detail-heading p {
  margin: 6px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
}

.schedule-notices {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 13px 0;
}

.schedule-notices span {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.schedule-notices .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--riic-orange);
}

.schedule-board-scroll {
  width: 100%;
  overflow-x: auto;
}

.schedule-board {
  min-width: 900px;
  border-top: 1px solid var(--c-border-color);
  border-left: 1px solid var(--c-border-color);
}

.schedule-board-head,
.schedule-station-row {
  display: grid;
  grid-template-columns: 180px repeat(3, minmax(220px, 1fr));
}

.schedule-board-head {
  background: var(--c-page-background-color-secondary);
}

.schedule-board-head > *,
.schedule-station-row > * {
  min-width: 0;
  padding: 10px;
  border-right: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}

.schedule-board-head strong {
  font-size: 13px;
}

.schedule-board-head small {
  display: block;
  margin-top: 3px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 500;
}

.station-name {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: 4px solid var(--riic-blue);
}

.station-name span {
  font-size: 13px;
  font-weight: 700;
}

.station-name small {
  margin-top: 4px;
  color: var(--riic-muted);
  font-size: 11px;
}

.station-queue {
  min-height: 70px;
}

.operator-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.operator-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 4px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  font-size: 12px;
  line-height: 1.2;
}

.operator-avatar {
  flex: 0 0 auto;
}

.operator-label {
  display: flex;
  align-items: baseline;
  gap: 3px;
  min-width: 0;
  padding-right: 3px;
}

.operator-label > span {
  overflow-wrap: anywhere;
}

.operator-label small {
  flex: 0 0 auto;
  color: var(--riic-blue);
  font-size: 9px;
  font-weight: 700;
}

.operator-name.tired {
  border-color: var(--riic-red);
  color: var(--riic-red);
}

.station-queue p,
.empty-queue {
  display: block;
  margin: 7px 0 0;
  color: var(--riic-muted);
  font-size: 10px;
  line-height: 1.4;
}

.empty-queue {
  margin: 0;
}

.schedule-source-note {
  padding-top: 12px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.5;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.output-basis-note {
  margin: -5px 0 14px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.55;
}

.metric-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 116px;
  padding: 14px;
  border-top: 3px solid var(--metric-color);
  background: var(--c-page-background-color-secondary);
}

.metric-item > span {
  color: var(--riic-muted);
  font-size: 13px;
}

.metric-item strong {
  margin-top: 13px;
  color: var(--metric-color);
  font-size: 25px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.metric-item small {
  margin-top: 7px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.metric-item.experience {
  --metric-color: var(--riic-blue);
}

.metric-item.lmd {
  --metric-color: var(--riic-green);
}

.metric-item.gold {
  --metric-color: var(--riic-gold);
}

.metric-item.drones {
  --metric-color: var(--riic-orange);
}

.alternative-section,
.export-warning {
  padding: 18px 20px;
  border-top: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}

.alternative-list {
  display: flex;
  flex-direction: column;
}

.alternative-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(300px, auto);
  align-items: center;
  gap: 18px;
  padding: 12px 0;
  border-top: 1px solid var(--c-border-color);
}

.alternative-row:first-child {
  border-top: 0;
}

.alternative-row strong,
.alternative-row span {
  display: block;
}

.alternative-row strong {
  font-size: 13px;
}

.alternative-row > div > span {
  margin-top: 4px;
  color: var(--riic-muted);
  font-size: 11px;
}

.alternative-output {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 14px;
  color: var(--riic-muted);
  font-size: 12px;
  text-align: right;
}

.export-warning {
  border-color: color-mix(in srgb, var(--riic-orange) 40%, var(--c-border-color));
}

.export-warning .section-title {
  color: var(--riic-orange);
}

.export-warning p {
  margin: 6px 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.55;
}

.assumption-panel {
  border-top: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}

.assumption-panel summary {
  padding: 13px 2px;
  color: var(--riic-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.assumption-panel div {
  padding: 0 2px 12px;
}

.assumption-panel p {
  margin: 6px 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.6;
}

.result-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 4px;
}

@media (max-width: 900px) {
  .schedule-generation-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout-entry-grid {
    grid-template-columns: 1fr;
    column-gap: 0;
  }

  .recommendation-field-list .option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout-choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .developer-combination-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .manual-editor-layout {
    grid-template-columns: 1fr;
  }

  .manual-room-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .manual-group-option-list {
    max-height: none;
  }

  .wizard-layout {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .step-navigation {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    position: static;
  }

  .step-button {
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    min-height: 66px;
    padding: 7px 4px;
    border-left: 0;
    border-bottom: 2px solid var(--c-border-color);
    font-size: 12px;
    text-align: center;
  }

  .step-button.active {
    border-bottom-color: var(--riic-blue);
  }

  .clear-draft-action {
    grid-column: 1 / -1;
    justify-content: center;
    margin-top: 6px;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reference-grid,
  .operation-reference-list {
    grid-template-columns: 1fr;
  }

  .ownership-panel,
  .compatibility-alert {
    align-items: stretch;
    flex-direction: column;
  }

  .ownership-actions {
    justify-content: flex-end;
  }

  .alternative-row {
    grid-template-columns: 1fr;
  }

  .alternative-output {
    justify-content: start;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .workflow-shell {
    gap: 16px;
    padding-top: 18px;
  }

  .workflow-stage {
    padding: 18px;
  }

  .schedule-generation-status-grid {
    grid-template-columns: 1fr;
  }

  .layout-entry-panel {
    gap: 16px;
  }

  .layout-choice-panel {
    padding: 0;
  }

  .recommendation-answer-group,
  .recommendation-answer-group.compact {
    grid-template-columns: 1fr;
  }

  .layout-schedule-group {
    gap: 8px;
  }

  .recommendation-question-panel {
    padding: 0 12px 12px;
  }

  .layout-entry-grid,
  .layout-shift-list {
    grid-template-columns: 1fr;
  }

  .layout-entry {
    grid-template-columns: 62px minmax(0, 1fr);
  }

  .layout-entry-facilities {
    grid-column: 2;
    text-align: left;
  }

  .recommendation-field-list .option-grid,
  .recommendation-field-list .option-grid.compact {
    grid-template-columns: 1fr;
  }

  .recommendation-preview {
    align-items: flex-start;
  }

  .layout-choice {
    min-height: 100px;
  }

  .layout-choice-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .layout-choice-actions .primary-action,
  .layout-choice-actions .secondary-action {
    width: 100%;
  }

  .layout-choice-actions :deep(.el-button) {
    width: 100%;
  }

  .page-heading {
    align-items: flex-start;
    padding-top: 8px;
  }

  .page-heading h1 {
    font-size: 25px;
  }

  .phase-mark {
    display: none;
  }

  .developer-workbench {
    gap: 18px;
    padding-top: 20px;
  }

  .developer-heading {
    flex-direction: column;
  }

  .developer-heading h2 {
    font-size: 21px;
  }

  .developer-controls,
  .developer-combination-grid {
    grid-template-columns: 1fr;
  }

  .developer-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .manual-editor-heading {
    flex-direction: column;
    gap: 4px;
  }

  .manual-editor-status {
    padding-top: 0;
  }

  .manual-queue-tabs {
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .manual-queue-tab {
    flex: 0 0 84px;
  }

  .manual-blueprint,
  .manual-group-picker {
    padding: 14px;
  }

  .manual-room-grid {
    grid-template-columns: 1fr;
  }

  .manual-room {
    min-height: 58px;
  }

  .wizard-layout {
    padding-top: 18px;
  }

  .step-button {
    min-height: 58px;
    font-size: 11px;
  }

  .step-index {
    flex-basis: 22px;
    width: 22px;
    height: 22px;
  }

  .question-panel {
    min-height: 0;
    padding: 18px 14px;
  }

  .question-heading h2,
  .result-heading h2 {
    font-size: 21px;
  }

  .option-grid {
    grid-template-columns: 1fr;
    margin-top: 20px;
  }

  .option-button {
    min-height: 78px;
  }

  .result-heading {
    align-items: flex-start;
  }

  .layout-code {
    font-size: 36px;
  }

  .facility-strip {
    grid-template-columns: 1fr;
  }

  .facility-item {
    border-right: 0;
    border-bottom: 1px solid var(--c-border-color);
  }

  .facility-item:last-child {
    border-bottom: 0;
  }

  .result-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .ownership-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .ownership-actions .secondary-action {
    width: 100%;
  }

  .result-section {
    padding: 16px 14px;
  }

  .schedule-detail {
    padding: 16px 12px;
  }

  .schedule-detail-heading {
    flex-direction: column;
  }

  .alternative-section,
  .export-warning {
    padding: 16px 2px;
  }

  .alternative-output {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .metric-item {
    min-height: 100px;
  }

  .result-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .primary-action,
  .secondary-action {
    width: 100%;
  }
}
</style>
