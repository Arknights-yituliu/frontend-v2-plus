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
  createRiicRecommendation,
} from "/src/utils/riicScheduleRecommendation.js";

const SKLAND_ACCOUNT_SESSION_STORAGE_KEY = "skland_account_data";
const RIIC_SCHEDULE_DRAFT_STORAGE_KEY =
  "riic_schedule_generator_draft_v1";
const RIIC_SCHEDULE_DRAFT_VERSION = 1;
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

const steps = [
  {
    key: "resourceGoal",
    label: "资源目标",
    title: "你现在更缺什么？",
    options: [
      {
        value: "experience",
        label: "缺经验",
        description: "优先提高作战记录产量",
        icon: "mdi-book-open-page-variant-outline",
        tone: "blue",
      },
      {
        value: "lmd",
        label: "缺龙门币",
        description: "优先提高贸易站订单产出",
        icon: "mdi-cash-multiple",
        tone: "green",
      },
      {
        value: "both",
        label: "两者都缺",
        description: "在经验和龙门币之间保持均衡",
        icon: "mdi-scale-balance",
        tone: "orange",
      },
      {
        value: "unknown",
        label: "不确定",
        description: "先采用更稳妥的均衡布局",
        icon: "mdi-help-circle-outline",
        tone: "gray",
      },
    ],
  },
  {
    key: "goldStock",
    label: "赤金库存",
    title: "你的赤金库存怎么样？",
    options: [
      {
        value: "low",
        label: "经常不够用",
        description: "贸易站偶尔会因为缺赤金停下来",
        icon: "mdi-alert-circle-outline",
        tone: "red",
      },
      {
        value: "balanced",
        label: "基本平衡",
        description: "生产与订单消耗大致相当",
        icon: "mdi-swap-horizontal-circle-outline",
        tone: "green",
      },
      {
        value: "plenty",
        label: "库存很多",
        description: "可以放心把无人机投向其他产出",
        icon: "mdi-gold",
        tone: "gold",
      },
      {
        value: "unknown",
        label: "不清楚",
        description: "先按不依赖库存的方案推荐",
        icon: "mdi-database-question-outline",
        tone: "gray",
      },
    ],
  },
  {
    key: "shiftMode",
    label: "换班频率",
    title: "你每天能操作几次基建？",
    options: [
      {
        value: "twice",
        label: "每天 2 次",
        description: "每 12 小时一次，三组队列按 12 / 12 / 12 循环",
        icon: "mdi-weather-sunset-up",
        tone: "blue",
      },
      {
        value: "threeTimes",
        label: "每天 3 次",
        description: "通常按 12 / 6 / 6 安排，推荐结果保留原表时长",
        icon: "mdi-clock-fast",
        tone: "orange",
      },
    ],
  },
  {
    key: "dronePreference",
    label: "无人机",
    title: "无人机优先投到哪里？",
    options: [
      {
        value: "auto",
        label: "自动推荐",
        description: "根据资源目标和赤金库存决定",
        icon: "mdi-auto-fix",
        tone: "blue",
      },
      {
        value: "experience",
        label: "作战记录",
        description: "全部投入经验制造站",
        icon: "mdi-book-open-page-variant-outline",
        tone: "blue",
      },
      {
        value: "gold",
        label: "赤金",
        description: "全部投入赤金制造站",
        icon: "mdi-gold",
        tone: "gold",
      },
      {
        value: "trading",
        label: "贸易订单",
        description: "全部投入贸易站",
        icon: "mdi-cash-clock",
        tone: "green",
      },
    ],
  },
];

const DEFAULT_ANSWERS = Object.freeze({
  resourceGoal: null,
  goldStock: null,
  shiftMode: null,
  dronePreference: "auto",
});

const answers = reactive({ ...DEFAULT_ANSWERS });
const currentStep = ref(0);
const contentPanel = ref(null);
const scheduleCapturePanel = ref(null);
const resultStepIndex = steps.length;
const ownedOperators = ref([]);
const ownedOperatorSource = ref("");
const ownedOperatorMessage = ref("");
const ownedOperatorError = ref("");
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

const activeStep = computed(() => steps[currentStep.value]);
const isDeveloperMode = computed(() => route.query.mode === "dev");
const selectedValue = computed(() =>
  activeStep.value ? answers[activeStep.value.key] : null,
);
const isResult = computed(() => currentStep.value === resultStepIndex);
const canContinue = computed(() => Boolean(selectedValue.value));
const recommendation = computed(() => {
  if (!isResult.value) {
    return null;
  }

  return createRiicRecommendation(answers, {
    ownedOperators: ownedOperators.value,
    useOwnedOperators: useOwnedOperators.value,
  });
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
  if (!recommendation.value?.selectedSchedule) {
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
    steps.map((step) => {
      const savedValue = savedAnswers?.[step.key];
      const isAllowed = step.options.some(
        (option) => option.value === savedValue,
      );

      return [
        step.key,
        isAllowed ? savedValue : DEFAULT_ANSWERS[step.key],
      ];
    }),
  );
}

function getMaxAvailableStep(candidateAnswers) {
  let stepIndex = 0;

  while (
    stepIndex < steps.length &&
    Boolean(candidateAnswers[steps[stepIndex].key])
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
    if (!savedDraft) {
      return false;
    }

    const parsedDraft = JSON.parse(savedDraft);
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
      maxAvailableStep,
    );
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
        answers: {
          resourceGoal: answers.resourceGoal,
          goldStock: answers.goldStock,
          shiftMode: answers.shiftMode,
          dronePreference: answers.dronePreference,
        },
        currentStep: currentStep.value,
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
    return Object.values(answers).every(Boolean);
  }

  return steps.slice(0, index).every((step) => Boolean(answers[step.key]));
}

function selectOption(value) {
  answers[activeStep.value.key] = value;
}

function goToStep(index) {
  if (isStepAvailable(index)) {
    currentStep.value = index;
    focusCurrentPanel();
  }
}

function nextStep() {
  if (!canContinue.value) {
    return;
  }

  currentStep.value += 1;
  focusCurrentPanel();
}

function previousStep() {
  currentStep.value = Math.max(0, currentStep.value - 1);
  focusCurrentPanel();
}

function resetWizard() {
  currentStep.value = 0;
  focusCurrentPanel();
}

async function clearSavedWizardState() {
  storageReady.value = false;
  let cleared = true;

  try {
    localStorage.removeItem(RIIC_SCHEDULE_DRAFT_STORAGE_KEY);
  } catch {
    cleared = false;
  }

  Object.assign(answers, DEFAULT_ANSWERS);
  currentStep.value = 0;
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

function readSklandOperatorsFromSession() {
  try {
    const savedAccountData = sessionStorage.getItem(
      SKLAND_ACCOUNT_SESSION_STORAGE_KEY,
    );
    if (!savedAccountData) {
      return [];
    }

    const parsedAccountData = JSON.parse(savedAccountData);
    return normalizeOwnedOperators(parsedAccountData?.operatorDataList || []);
  } catch (error) {
    console.error("readSklandOperatorsFromSession failed", error);
    return [];
  }
}

async function loadOwnedOperators({ notify = false } = {}) {
  loadingOwnedOperators.value = true;
  ownedOperatorError.value = "";

  try {
    const sklandOperators = readSklandOperatorsFromSession();

    if (sklandOperators.length > 0) {
      ownedOperators.value = sklandOperators;
      ownedOperatorSource.value = "森空岛导入缓存";
      ownedOperatorMessage.value = `已读取 ${sklandOperators.length} 名持有干员`;
      if (notify) {
        cMessage(ownedOperatorMessage.value);
      }
      return;
    }

    const userToken = localStorage.getItem("USER_TOKEN");
    if (userToken && userToken !== "null") {
      const response = await operatorDataAPI.getOperatorData();
      const surveyOperators = normalizeOwnedOperators(
        response?.data || [],
        true,
      );

      if (surveyOperators.length > 0) {
        ownedOperators.value = surveyOperators;
        ownedOperatorSource.value = "练度调查";
        ownedOperatorMessage.value = `已读取 ${surveyOperators.length} 名持有干员`;
        if (notify) {
          cMessage(ownedOperatorMessage.value);
        }
        return;
      }
    }

    ownedOperators.value = [];
    ownedOperatorSource.value = "";
    ownedOperatorMessage.value = "尚未读取到本站可用的持有干员数据";
  } catch (error) {
    console.error("loadOwnedOperators failed", error);
    ownedOperatorError.value = "持有干员数据读取失败，请稍后重试";
  } finally {
    loadingOwnedOperators.value = false;
  }
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
    () => answers.resourceGoal,
    () => answers.goldStock,
    () => answers.shiftMode,
    () => answers.dronePreference,
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
        <h1>{{ isDeveloperMode ? "基建组合效率" : "基建排班方案" }}</h1>
        <p class="page-subtitle">
          {{
            isDeveloperMode
              ? "按布局与换班频率浏览原排班文档中的干员组合"
              : "先确定布局、生产方向与换班节奏"
          }}
        </p>
      </div>
      <div class="phase-mark">
        <v-icon
          :icon="
            isDeveloperMode
              ? 'mdi-flask-outline'
              : 'mdi-calendar-export'
          "
        ></v-icon>
        {{ isDeveloperMode ? "开发模式" : "推荐、匹配与导出" }}
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

    <div v-else class="wizard-layout">
      <nav class="step-navigation" aria-label="生成步骤">
        <button
          v-for="(step, index) in resultSteps"
          :key="step.key"
          type="button"
          class="step-button"
          :class="{
            active: currentStep === index,
            complete: currentStep > index,
          }"
          :disabled="!isStepAvailable(index)"
          @click="goToStep(index)"
        >
          <span class="step-index">
            <v-icon
              v-if="currentStep > index"
              icon="mdi-check"
              size="16"
            ></v-icon>
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span>{{ step.label }}</span>
        </button>
        <button
          v-if="hasSavedWizardState"
          type="button"
          class="clear-draft-action"
          title="清除本页保存的选择"
          @click="clearSavedWizardState"
        >
          <v-icon icon="mdi-history-remove" size="17"></v-icon>
          清除记录
        </button>
      </nav>

      <section v-if="!isResult" ref="contentPanel" class="question-panel">
        <div class="question-heading">
          <span>步骤 {{ currentStep + 1 }} / {{ steps.length }}</span>
          <h2>{{ activeStep.title }}</h2>
        </div>

        <div
          class="option-grid"
          :class="{ compact: activeStep.options.length <= 2 }"
          role="radiogroup"
          :aria-label="activeStep.title"
        >
          <button
            v-for="option in activeStep.options"
            :key="option.value"
            type="button"
            class="option-button"
            :class="[
              `tone-${option.tone}`,
              { selected: selectedValue === option.value },
            ]"
            role="radio"
            :aria-checked="selectedValue === option.value"
            @click="selectOption(option.value)"
          >
            <span class="option-icon">
              <v-icon :icon="option.icon" size="28"></v-icon>
            </span>
            <span class="option-content">
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
            <v-icon
              class="option-check"
              icon="mdi-check-circle"
              size="22"
            ></v-icon>
          </button>
        </div>

        <footer class="question-actions">
          <button
            v-if="currentStep > 0"
            type="button"
            class="icon-action"
            title="上一步"
            aria-label="上一步"
            @click="previousStep"
          >
            <v-icon icon="mdi-arrow-left"></v-icon>
          </button>
          <span v-else></span>

          <button
            type="button"
            class="primary-action"
            :disabled="!canContinue"
            @click="nextStep"
          >
            {{ currentStep === steps.length - 1 ? "生成方案" : "下一步" }}
            <v-icon icon="mdi-arrow-right" size="19"></v-icon>
          </button>
        </footer>
      </section>

      <section v-else ref="contentPanel" class="result-panel">
        <div class="result-heading">
          <div>
            <span class="result-label">推荐方案</span>
            <h2>{{ recommendation.layout.name }}</h2>
            <p>{{ recommendation.layoutReason }}</p>
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

        <section class="ownership-panel">
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
          v-if="useOwnedOperators && !selectedSchedule"
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
          </section>
        </div>

        <section v-if="selectedSchedule" class="result-section reference-section">
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
          v-if="selectedSchedule"
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
            <h3>其他高产方案</h3>
          </div>
          <div class="alternative-list">
            <div
              v-for="alternative in recommendation.alternatives"
              :key="alternative.candidate.id"
              class="alternative-row"
            >
              <div>
                <strong>
                  {{ alternative.candidate.title.replace(/\s+/g, " ") }}
                </strong>
                <span>
                  {{ formatSourceDate(alternative.candidate.sourceUpdatedAt) }}
                  · {{ alternative.candidate.variant === "simplified" ? "简化版" : "标准版" }}
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
          v-if="maaExportPreview?.warnings.length"
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

        <details class="assumption-panel">
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
            type="button"
            class="primary-action"
            @click="copySummary"
          >
            <v-icon icon="mdi-content-copy" size="19"></v-icon>
            复制方案摘要
          </button>
          <button
            type="button"
            class="secondary-action"
            :disabled="!selectedSchedule || exportingImage"
            @click="exportScheduleImage"
          >
            <v-icon icon="mdi-image-outline" size="19"></v-icon>
            {{ exportingImage ? "正在生成" : "导出图片" }}
          </button>
          <button
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
  border-bottom: 1px solid var(--c-border-color);
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

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
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
