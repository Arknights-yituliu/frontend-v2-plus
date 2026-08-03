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
import { useRoute, useRouter } from "vue-router";
import operatorDataAPI from "/src/api/operatorData.js";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import RiicSchedulePreview from "/src/components/tools/RiicSchedulePreview.vue";
import { cMessage } from "/src/utils/message.js";
import { operatorTableV2 } from "/src/utils/gameData.js";
import RIIC_BASELINE_SKILL_RULES from "/src/static/json/tools/riic_baseline_skill_rules.json";
import RIIC_CONTROL_ROTATION_RULES from "/src/static/json/tools/riic_control_rotation_rules.json";
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
import {
  getRiicFacilityProfile,
  getRiicRoomStations,
  normalizeRiicFacilityRequirement,
  RIIC_FACILITY_REQUIREMENTS,
} from "/src/utils/riicScheduleModel.js";
import { resolveRiicBaselineSkills } from "/src/utils/riicBaselineSkillResolver.js";
import { buildRiicControlRotation } from "/src/utils/riicControlRotation.js";
import {
  createRiicRoomGroupFallbackPlan,
} from "/src/utils/riicDynamicFallback.js";
import { getRiicRoomGroupStaffingRequirement } from "/src/utils/riicStaffingRequirement.js";
import {
  matchRiicStaticRoomCandidates,
} from "/src/utils/riicStaticRoomCandidateMatcher.js";
import {
  getRiicStaticRoomCandidateCatalogKey,
  loadRiicStaticRoomCandidateCatalog,
} from "/src/utils/riicStaticRoomCandidateCatalog.js";
import { parseRiicMaaOperatorBox } from "/src/utils/riicMaaOperatorData.js";
import { buildRiicSchedulePreview } from "/src/utils/riicSchedulePreview.js";
import { buildRiicMaaScheduleFromPreview } from "/src/utils/riicScheduleExport.js";

const SKLAND_ACCOUNT_SESSION_STORAGE_KEY = "skland_account_data";
const RIIC_MAA_OPERATOR_STORAGE_KEY = "riic_maa_operator_data_v1";
const RIIC_OPERATOR_SOURCE_STORAGE_KEY = "riic_operator_source_v1";
const RIIC_SCHEDULE_DRAFT_STORAGE_KEY =
  "riic_schedule_generator_draft_v2";
const LEGACY_RIIC_SCHEDULE_DRAFT_STORAGE_KEY =
  "riic_schedule_generator_draft_v1";
const RIIC_SCHEDULE_DRAFT_VERSION = 16;
const ROOM_STAFFING_CANDIDATE_PAGE_SIZE = 24;
const ROOM_PRODUCT_OPTIONS = Object.freeze({
  trading: [
    { value: "lmd", label: "龙门币" },
    { value: "orundum", label: "源石碎片" },
  ],
  manufacture: [
    { value: "experience", label: "作战记录" },
    { value: "gold", label: "赤金" },
    { value: "orundum", label: "源石碎片" },
  ],
});
const operatorAvatarMap = new Map(
  Object.entries(operatorTableV2).map(([charId, operator]) => [
    operator.name,
    {
      charId,
      rarity: operator.rarity,
    },
  ]),
);
const operatorNameToCharId = new Map(
  Object.entries(operatorTableV2).map(([charId, operator]) => [
    operator.name,
    charId,
  ]),
);
const route = useRoute();
const router = useRouter();
const OPERATOR_SOURCE_KEYS = Object.freeze({
  skland: "skland",
  maa: "maa",
});

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
  office: {
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
const SCHEDULE_ROOM_GROUP_META = {
  control: {
    facilityLabel: "控制中枢",
    icon: "mdi-home-variant-outline",
    tone: "control",
  },
  meeting: {
    facilityLabel: "会客室",
    icon: "mdi-account-group-outline",
    tone: "meeting",
  },
  trading: {
    facilityLabel: "贸易站",
    icon: "mdi-handshake-outline",
    tone: "trading",
  },
  manufacture: {
    facilityLabel: "制造站",
    icon: "mdi-factory",
    tone: "manufacture",
  },
  power: {
    facilityLabel: "发电站",
    icon: "mdi-lightning-bolt",
    tone: "power",
  },
  dormitory: {
    facilityLabel: "宿舍",
    icon: "mdi-bed-outline",
    tone: "dormitory",
  },
  processing: {
    facilityLabel: "加工站",
    icon: "mdi-hammer-wrench",
    tone: "processing",
  },
  office: {
    facilityLabel: "办公室",
    icon: "mdi-briefcase-outline",
    tone: "office",
  },
  training: {
    facilityLabel: "训练室",
    icon: "mdi-school-outline",
    tone: "training",
  },
};
const SCHEDULE_ROOM_GROUP_ICONS = {
  "lmd-trading": "mdi-cash-multiple",
  "experience-manufacture": "mdi-book-open-page-variant-outline",
  "gold-manufacture": "mdi-gold",
  "orundum-trading": "mdi-star-four-points-outline",
  "orundum-manufacture": "mdi-star-four-points-outline",
  power: "mdi-lightning-bolt",
};
const ROOM_CANDIDATE_PRODUCTS = Object.freeze({
  "lmd-trading": "lmd",
  "experience-manufacture": "experience",
  "gold-manufacture": "gold",
  "orundum-trading": "orundum",
  "orundum-manufacture": "orundum",
  power: "all",
  control: "all",
  meeting: "all",
  office: "all",
});
const ROOM_CANDIDATE_EFFECT_META = Object.freeze([
  {
    facility: "trading",
    field: "tradingPercent",
    label: "贸易",
  },
  {
    facility: "manufacture",
    field: "manufacturePercent",
    label: "制造",
  },
  {
    facility: "power",
    field: "powerPercent",
    label: "发电",
  },
  {
    facility: "meeting",
    field: "meetingPercent",
    label: "会客",
  },
  {
    facility: "office",
    field: "officePercent",
    label: "办公室",
  },
]);
const STATIC_SCHEDULE_ROOM_GROUPS = Object.freeze([
  {
    id: "support:control",
    key: "control",
    label: "控制中枢",
    facilityLabel: "控制中枢",
    icon: "mdi-home-variant-outline",
    tone: "control",
    count: 1,
    row: "core",
    width: 2,
    rotationRequired: true,
    automaticScheduling: true,
  },
  {
    id: "support:meeting",
    key: "meeting",
    label: "会客室",
    facilityLabel: "会客室",
    icon: "mdi-account-group-outline",
    tone: "meeting",
    count: 1,
    row: "core",
    width: 1,
    rotationRequired: true,
  },
  {
    id: "support:dormitory",
    key: "dormitory",
    label: "宿舍组",
    facilityLabel: "宿舍",
    icon: "mdi-bed-outline",
    tone: "dormitory",
    count: 4,
    row: "support",
    width: 1,
    rotationRequired: false,
  },
  {
    id: "support:processing",
    key: "processing",
    label: "加工站",
    facilityLabel: "加工站",
    icon: "mdi-hammer-wrench",
    tone: "processing",
    count: 1,
    row: "support",
    width: 1,
    rotationRequired: false,
  },
  {
    id: "support:office",
    key: "office",
    label: "办公室",
    facilityLabel: "办公室",
    icon: "mdi-briefcase-outline",
    tone: "office",
    count: 1,
    row: "support",
    width: 1,
    rotationRequired: true,
  },
  {
    id: "support:training",
    key: "training",
    label: "训练室",
    facilityLabel: "训练室",
    icon: "mdi-school-outline",
    tone: "training",
    count: 1,
    row: "support",
    width: 1,
    rotationRequired: false,
  },
]);

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
    label: "养成需求",
    fields: [
      {
        key: "lmdNeed",
        layout: "need",
        label: "在养成干员时，你有多缺龙门币？",
        options: NEED_OPTIONS,
      },
      {
        key: "experienceNeed",
        layout: "need",
        label: "在养成干员时，你有多缺经验书？",
        options: NEED_OPTIONS,
      },
      {
        key: "farmingHabit",
        layout: "farming",
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
            label: "每天 100 理智以上",
            icon: "mdi-battery-90",
            tone: "orange",
          },
        ],
      },
    ],
  },
  {
    key: "operation",
    label: "换班频率",
    fields: [
      {
        key: "shiftMode",
        layout: "frequency",
        label: "你每天通常能安排几次换班？",
        options: [
          {
            value: "threeTimes",
            label: "一天三换",
            icon: "mdi-clock-fast",
            tone: "orange",
          },
          {
            value: "twice",
            label: "一天两换",
            icon: "mdi-weather-sunset-up",
            tone: "blue",
          },
          {
            value: "once",
            label: "一天一换",
            icon: "mdi-calendar-clock",
            tone: "gray",
          },
        ],
      },
      {
        key: "executionReliability",
        layout: "reliability",
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
    label: "长期选择",
    fields: [
      {
        key: "orundumPreference",
        layout: "binary",
        label: "愿意以约 30% 养成产出换取每月约 10 抽吗？",
        options: [
          {
            value: "decline",
            label: "不愿意",
            icon: "mdi-factory",
            tone: "blue",
          },
          {
            value: "accept",
            label: "愿意",
            icon: "mdi-star-four-points-outline",
            tone: "purple",
          },
        ],
      },
      {
        key: "carbonNeed",
        layout: "binary",
        label: "你是否缺升级基建所用的碳？",
        options: [
          {
            value: "notNeeded",
            label: "暂时不缺",
            icon: "mdi-check-circle-outline",
            tone: "green",
          },
          {
            value: "needed",
            label: "缺",
            icon: "mdi-cube-outline",
            tone: "orange",
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
const LAYOUT_CARD_META = [
  {
    key: "153",
    layoutId: "153",
    label: "153",
    description: "经验书优先",
    icon: "mdi-book-open-page-variant-outline",
    tone: "blue",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 1,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 4,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 1,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "243",
    layoutId: "243",
    label: "243",
    description: "钱书均衡/龙门币优先",
    icon: "mdi-scale-balance",
    secondaryIcon: "mdi-cash-multiple",
    tone: "green",
    compatibleShiftModes: ["once", "twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 2,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "243-orundum",
    layoutId: "243",
    label: "243（搓玉）",
    description: "合成玉",
    icon: "mdi-star-four-points-outline",
    tone: "red",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 1,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "orundum-trading",
        count: 1,
        label: "源石碎片",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 1,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "orundum-manufacture",
        count: 1,
        label: "源石碎片",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "252-2-gold",
    layoutId: "252",
    label: "252（2 赤金）",
    description: "钱书均衡",
    icon: "mdi-scale-balance",
    tone: "green",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 3,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 2, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "252-3-gold",
    layoutId: "252",
    label: "252（3 赤金）",
    description: "龙门币优先",
    icon: "mdi-cash-multiple",
    tone: "blue",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 2,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 3,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 2, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "342-orundum",
    layoutId: "342",
    label: "342",
    description: "合成玉",
    icon: "mdi-star-four-points-outline",
    tone: "red",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "orundum-trading",
        count: 1,
        label: "源石碎片",
        facility: "trading",
      },
      {
        key: "orundum-manufacture",
        count: 1,
        label: "源石碎片",
        facility: "manufacture",
      },
      {
        key: "experience-manufacture",
        count: 1,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 2, label: "发电站", facility: "power" },
    ],
  },
];
const LAYOUT_SHIFT_OPTIONS = [
  {
    value: "threeTimes",
    label: "一天三换",
    icon: "mdi-clock-fast",
    tone: "orange",
  },
  {
    value: "twice",
    label: "一天两换",
    icon: "mdi-weather-sunset-up",
    tone: "blue",
  },
  {
    value: "once",
    label: "一天一换",
    icon: "mdi-calendar-clock",
    tone: "gray",
  },
];
const LEGACY_LAYOUT_CARD_KEYS = Object.freeze({
  "243-simplified": "243",
  "252-right-full-2-gold": "252-2-gold",
  "252-full-blood-2-gold": "252-2-gold",
  "252-right-full-3-gold": "252-3-gold",
});

function isLayoutCardCompatible(card, shiftMode) {
  return Boolean(
    card &&
      (!shiftMode || card.compatibleShiftModes.includes(shiftMode)),
  );
}

function getLayoutRoomFacility(room) {
  if (room.facility) {
    return room.facility;
  }

  if (room.key === "lmd-trading") {
    return "trading";
  }

  if (room.key === "power") {
    return "power";
  }

  return "manufacture";
}

function getLayoutCardKeyForSchedule(layoutId, variant) {
  if (layoutId === "252") {
    if (String(variant).endsWith("2Gold")) {
      return "252-2-gold";
    }

    if (String(variant).endsWith("3Gold")) {
      return "252-3-gold";
    }
  }

  if (layoutId === "243") {
    if (variant === "orundum") {
      return "243-orundum";
    }
  }

  if (layoutId === "342") {
    return "342-orundum";
  }

  return LAYOUT_CARD_META.find((card) => card.key === layoutId)?.key || null;
}

const LAYOUT_SCHEDULE_GROUPS = LAYOUT_SHIFT_OPTIONS.map((shift) => ({
  ...shift,
  options: LAYOUT_CARD_META.filter((card) =>
    isLayoutCardCompatible(card, shift.value),
  ).map((card) => ({
    ...card,
    ...RIIC_LAYOUT_RECOMMENDATION_LAYOUTS[card.layoutId],
    id: card.layoutId,
    displayShiftMode: shift.value,
    value: `${shift.value}:${card.key}`,
  })),
}));

const answers = reactive({ ...DEFAULT_ANSWERS });
const currentStep = ref(0);
const contentPanel = ref(null);
const scheduleCapturePanel = ref(null);
const schedulePreviewCapturePanel = ref(null);
const maaFileInput = ref(null);
const ownedOperators = ref([]);
const ownedOperatorSource = ref("");
const ownedOperatorMessage = ref("");
const ownedOperatorError = ref("");
const ownedOperatorLastSyncedAt = ref("");
const loadingOwnedOperators = ref(false);
const useOwnedOperators = ref(false);
const treatUnderleveledOperatorsAsQualified = ref(false);
const activeOperatorSource = ref("");
const operatorSourceStates = reactive({
  skland: {
    operators: [],
    importedAt: "",
    loading: false,
    error: "",
  },
  maa: {
    operators: [],
    importedAt: "",
    fileName: "",
    warnings: [],
    loading: false,
    error: "",
  },
});
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
const recommendationPanelOpen = ref(false);
const twoShiftRotationMode = ref("maa");
const scheduleGenerationMode = ref("auto");
const autoGeneratingSchedule = ref(false);
const activeScheduleRoomGroupKey = ref("");
const selectedRoomGroupTeamCandidateKeys = ref({});
const scheduleExecutionSettings = reactive({
  shifts: [],
  droneTarget: "",
  droneTargetPinned: false,
});
const visibleRoomGroupCandidateCounts = ref({});
const activeSchedulePreviewStateIndex = ref(0);
const roomEditorPanel = ref(null);
const selectedSchedulePreviewRoomKey = ref("");
const scheduleRoomOperatorOverrides = ref({});
const scheduleRoomProductOverrides = ref({});
const invalidatedScheduleRoomKeys = ref({});
const scheduleRoomEditorOperatorInput = ref("");

function normalizeTwoShiftRotationMode(value) {
  return value === "manual" ? "manual" : "maa";
}

function normalizeScheduleGenerationMode(value) {
  return value === "guided" ? "guided" : "auto";
}

function isMaaTwoShiftRotation(shiftMode, rotationMode) {
  return (
    shiftMode === "twice" &&
    normalizeTwoShiftRotationMode(rotationMode) === "maa"
  );
}

function getSchedulePreviewStateCount(
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  return {
    once: 2,
    twice: isMaaTwoShiftRotation(shiftMode, rotationMode) ? 2 : 3,
    threeTimes: 3,
  }[shiftMode] || 0;
}

function getSchedulePreviewStateOrder(
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  return {
    once: [1, 0],
    twice: isMaaTwoShiftRotation(shiftMode, rotationMode)
      ? [1, 0]
      : [2, 0, 1],
    threeTimes: [1, 2, 0],
  }[shiftMode] || [];
}

function createDefaultScheduleShifts(
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  if (isMaaTwoShiftRotation(shiftMode, rotationMode)) {
    return [
      { id: "shift-1", name: "B\u73ed", time: "09:00" },
      { id: "shift-2", name: "A\u73ed", time: "21:00" },
    ];
  }

  const defaults = {
    once: [
      { name: "B班", time: "09:00" },
      { name: "A班", time: "09:00" },
    ],
    twice: [
      { name: "C班", time: "09:00" },
      { name: "A班", time: "21:00" },
      { name: "B班", time: "09:00" },
    ],
    threeTimes: [
      { name: "B班", time: "09:00" },
      { name: "C班", time: "15:00" },
      { name: "A班", time: "21:00" },
    ],
  }[shiftMode] || [];

  return defaults.map((shift, index) => ({
    id: `shift-${index + 1}`,
    ...shift,
  }));
}

function createEmptyScheduleExecutionSettings(
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  return {
    shifts: createDefaultScheduleShifts(shiftMode, rotationMode),
    droneTarget: "",
    droneTargetPinned: false,
  };
}

function normalizeScheduleExecutionSettings(
  value,
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  const emptySettings = createEmptyScheduleExecutionSettings(
    shiftMode,
    rotationMode,
  );
  const sourceShifts = Array.isArray(value?.shifts) ? value.shifts : [];
  const legacyTimes = Array.isArray(value?.changeTimes)
    ? value.changeTimes
    : [];
  const droneTarget = String(value?.droneTarget || "").trim();

  return {
    shifts: emptySettings.shifts.map((defaultShift, index) => {
      const sourceShift = sourceShifts[index] || {};
      const fallbackTime =
        legacyTimes.length > 0
          ? String(legacyTimes[index % legacyTimes.length] || "").trim()
          : "";
      const time = String(sourceShift?.time || fallbackTime).trim();
      const name = String(sourceShift?.name || "").trim();

      return {
        id: defaultShift.id,
        name: name || defaultShift.name,
        time: /^\d{2}:\d{2}$/.test(time) ? time : defaultShift.time,
      };
    }),
    droneTarget,
    droneTargetPinned: value?.droneTargetPinned === true,
  };
}

function resetScheduleExecutionSettings() {
  const nextSettings = createEmptyScheduleExecutionSettings(
    confirmedLayoutPlan.value?.shiftMode,
    twoShiftRotationMode.value,
  );
  scheduleExecutionSettings.shifts = nextSettings.shifts;
  scheduleExecutionSettings.droneTarget = nextSettings.droneTarget;
  scheduleExecutionSettings.droneTargetPinned =
    nextSettings.droneTargetPinned;
  selectedSchedulePreviewRoomKey.value = "";
  scheduleRoomOperatorOverrides.value = {};
  scheduleRoomProductOverrides.value = {};
  invalidatedScheduleRoomKeys.value = {};
  scheduleRoomEditorOperatorInput.value = "";
  activeSchedulePreviewStateIndex.value = 0;
}

const activeStep = computed(() => steps[currentStep.value]);
const isDeveloperMode = computed(() => route.query.mode === "dev");
const showLegacyScheduleReference = false;
const isUserLoggedIn = computed(() => {
  const token = localStorage.getItem("USER_TOKEN");
  return Boolean(token && token !== "null" && token !== "undefined");
});
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

  return `${confirmedLayoutPlan.value.shiftMode}:${confirmedLayoutPlan.value.cardKey}`;
});
const availableLayoutChoices = computed(() => {
  return LAYOUT_CARD_META.map((choice) => ({
    ...choice,
    layout: RIIC_LAYOUT_RECOMMENDATION_LAYOUTS[choice.layoutId],
  }));
});
const activeLayoutChoice = computed(
  () =>
    availableLayoutChoices.value.find(
      (choice) => choice.layoutId === activeLayoutId.value,
    ) || null,
);
const isLayoutRecommended = computed(
  () => (option) => {
    const requestedShiftMode =
      recommendation.value?.requestedShiftMode?.id;

    return Boolean(
      recommendation.value &&
        option.displayShiftMode === requestedShiftMode &&
        option.key === recommendation.value.cardKey,
    );
  },
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
const is252LayoutPlan = computed(
  () => confirmedLayoutPlan.value?.layoutId === "252",
);
const activeFacilityRequirement = computed(() =>
  normalizeRiicFacilityRequirement(
    confirmedLayoutPlan.value?.layoutId,
    confirmedLayoutPlan.value?.facilityRequirement,
  ),
);
const activeFacilityProfile = computed(() =>
  getRiicFacilityProfile({
    layoutId: confirmedLayoutPlan.value?.layoutId,
    cardKey: confirmedLayoutPlan.value?.cardKey,
    facilityRequirement: activeFacilityRequirement.value,
  }),
);
const activeLayoutFacilityCounts = computed(() => {
  const card = getLayoutCardByKey(confirmedLayoutPlan.value?.cardKey);
  const countFacility = (facility) =>
    (card?.rooms || []).reduce(
      (total, room) =>
        getLayoutRoomFacility(room) === facility
          ? total + Number(room?.count || 0)
          : total,
      0,
    );

  return {
    powerPlantCount: countFacility("power"),
    tradingStationCount: countFacility("trading"),
    goldManufactureStationCount: (card?.rooms || []).reduce(
      (total, room) =>
        room?.key === "gold-manufacture"
          ? total + Number(room?.count || 0)
          : total,
      0,
    ),
  };
});
const layoutPlanSummary = computed(() => {
  if (!confirmedLayoutPlan.value) {
    return "";
  }

  const card = LAYOUT_CARD_META.find(
    (item) => item.key === confirmedLayoutPlan.value.cardKey,
  );
  const shift = LAYOUT_SHIFT_OPTIONS.find(
    (option) => option.value === confirmedLayoutPlan.value.shiftMode,
  );

  return [card?.label, card?.description, shift?.label]
    .filter(Boolean)
    .join(" · ");
});
const layoutPlanSummaryLines = computed(() => {
  if (!confirmedLayoutPlan.value) {
    return [];
  }

  const card = getLayoutCardByKey(confirmedLayoutPlan.value.cardKey);
  const facilityCounts = ["trading", "manufacture", "power"]
    .map((facility) => {
      const count = (card?.rooms || []).reduce(
        (total, room) =>
          getLayoutRoomFacility(room) === facility
            ? total + Number(room?.count || 0)
            : total,
        0,
      );
      const label = {
        trading: "贸易站",
        manufacture: "制造站",
        power: "发电站",
      }[facility];

      return count > 0 ? `${count}${label}` : "";
    })
    .filter(Boolean)
    .join(" ");
  const shift = LAYOUT_SHIFT_OPTIONS.find(
    (option) => option.value === confirmedLayoutPlan.value.shiftMode,
  );
  const shiftSummary = {
    threeTimes: "一天换班三次",
    twice: "一天换班两次",
    once: "一天换班一次",
  }[confirmedLayoutPlan.value.shiftMode] || shift?.label;

  return [facilityCounts, card?.description, shiftSummary].filter(Boolean);
});
function formatStationLevelSummary(stations) {
  if (!stations.some((station) => station !== null)) {
    return "";
  }

  return stations
    .map((station) =>
      Number.isInteger(station?.stationLevel)
        ? `Lv.${station.stationLevel}`
        : "?",
    )
    .join(" ");
}
const scheduleRoomGroups = computed(() => {
  const card = getLayoutCardByKey(confirmedLayoutPlan.value?.cardKey);

  if (!card) {
    return [];
  }

  return (card.rooms || []).map((room) => {
    const facility = getLayoutRoomFacility(room);
    const meta =
      SCHEDULE_ROOM_GROUP_META[facility] ||
      SCHEDULE_ROOM_GROUP_META.manufacture;
    const stations = getRiicRoomStations({
      facilityProfile: activeFacilityProfile.value,
      roomKey: room.key,
      roomCount: room.count,
    });

    return {
      id: `${card.key}:${room.key}`,
      key: room.key,
      label:
        room.key === "power"
          ? "发电站组"
          : `${room.label}${meta.facilityLabel}组`,
      shortLabel: room.label,
      facility,
      facilityLabel: meta.facilityLabel,
      icon: SCHEDULE_ROOM_GROUP_ICONS[room.key] || meta.icon,
      tone: meta.tone,
      count: room.count,
      stations,
      stationLevelSummary: formatStationLevelSummary(stations),
      stationSlotSummary: stations.some((station) => station !== null)
        ? stations
            .map((station) =>
              station
                ? `Lv.${station.stationLevel} / ${station.slotCount}人`
                : "?",
            )
            .join(" / ")
        : "",
      candidateProduct: ROOM_CANDIDATE_PRODUCTS[room.key] || null,
      candidateGenerationAvailable: Boolean(
        ROOM_CANDIDATE_PRODUCTS[room.key],
      ),
      rotationRequired: true,
      row: "production",
      width: 1,
    };
  });
});
const scheduleRoomRows = computed(() => {
  const createStaticGroup = (group) => {
    const stations = getRiicRoomStations({
      facilityProfile: activeFacilityProfile.value,
      roomKey: group.key,
      roomCount: group.count,
    });
    const candidateProduct = ROOM_CANDIDATE_PRODUCTS[group.key] || null;

    return {
      ...group,
      facility: group.key,
      stations,
      stationLevelSummary: formatStationLevelSummary(stations),
      stationSlotSummary: stations.some((station) => station !== null)
        ? stations
            .map((station) =>
              station
                ? `Lv.${station.stationLevel} / ${station.slotCount}人`
                : "?",
            )
            .join(" / ")
        : "",
      candidateProduct,
      automaticScheduling: Boolean(group.automaticScheduling),
      candidateGenerationAvailable:
        Boolean(candidateProduct) && !group.automaticScheduling,
      rotationRequired: group.rotationRequired,
    };
  };

  return [
    {
      id: "core",
      label: "核心设施",
      groups: STATIC_SCHEDULE_ROOM_GROUPS.filter(
        (group) => group.row === "core",
      ).map(createStaticGroup),
    },
    {
      id: "production",
      label: "生产设施",
      groups: scheduleRoomGroups.value,
    },
    {
      id: "support",
      label: "辅助设施",
      groups: STATIC_SCHEDULE_ROOM_GROUPS.filter(
        (group) => group.row === "support",
      ).map(createStaticGroup),
    },
  ];
});
const roomGroupSelectionRows = computed(() => {
  const groupsByKey = new Map(
    scheduleRoomRows.value
      .flatMap((row) => row.groups)
      .map((group) => [group.key, group]),
  );

  return [
    {
      id: "production",
      groups: scheduleRoomGroups.value,
    },
    {
      id: "core",
      groups: ["meeting", "office", "control"]
        .map((key) => groupsByKey.get(key))
        .filter(Boolean),
    },
  ];
});
const selectableScheduleRoomGroups = computed(() =>
  roomGroupSelectionRows.value.flatMap((row) => row.groups),
);
const roomGroupProgressItems = computed(() =>
  selectableScheduleRoomGroups.value.map((group) => ({
    group,
    ...getRoomGroupProgressStatus(group),
  })),
);
const activeScheduleRoomGroup = computed(
  () =>
    selectableScheduleRoomGroups.value.find(
      (group) => group.id === activeScheduleRoomGroupKey.value,
    ) || null,
);
const controlScheduleRoomGroup = computed(
  () =>
    selectableScheduleRoomGroups.value.find(
      (group) => group.automaticScheduling,
    ) || null,
);
const riicMatchingRoster = computed(() => {
  if (ownedOperators.value.length === 0) {
    return null;
  }

  return ownedOperators.value;
});
const riicTrainingMode = computed(() =>
  treatUnderleveledOperatorsAsQualified.value ? "ideal" : "current",
);
const controlAutoRotationPlan = computed(() =>
  buildRiicControlRotation({
    ownedOperators: riicMatchingRoster.value,
    rules: RIIC_CONTROL_ROTATION_RULES,
    trainingMode: riicTrainingMode.value,
  }),
);
const riicResolvedSkills = computed(() =>
  resolveRiicBaselineSkills(
    riicMatchingRoster.value || [],
    RIIC_BASELINE_SKILL_RULES,
    { trainingMode: riicTrainingMode.value },
  ),
);
const riicPublicSkillOperatorIds = computed(() => {
  const resolvedSkills = riicResolvedSkills.value;

  return new Set(
    resolvedSkills.operators
      .filter((operator) =>
        (operator.activeRules || []).some(
          (rule) => rule?.effect?.product === "all",
        ),
      )
      .map((operator) => operator.charId),
  );
});
const riicStaticCatalogsByKey = ref({});
const riicStaticCatalogLoadStatesByKey = ref({});
const riicStaticCatalogErrorsByKey = ref({});

function getStaticRoomCandidateCatalogFacility(group) {
  return group?.facility === "office" ? "hire" : group?.facility;
}

function getRoomGroupCatalogKey(group, station) {
  if (!group?.candidateGenerationAvailable) {
    return null;
  }

  return getRiicStaticRoomCandidateCatalogKey({
    roomType: getStaticRoomCandidateCatalogFacility(group),
    product: group.candidateProduct,
    stationLevel: station?.stationLevel,
    slotCount: station?.slotCount,
  });
}

function getRoomGroupCatalogRequests(group) {
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
          const key = getRoomGroupCatalogKey(group, station);
          return [key || `${station.stationLevel}:${station.slotCount}`, {
            station,
            key,
          }];
        }),
    ).values(),
  ];
}

function getRoomGroupCatalogErrors(group) {
  return getRoomGroupCatalogRequests(group)
    .map((request) =>
      request.key
        ? riicStaticCatalogErrorsByKey.value[request.key]
        : `Invalid RIIC catalog request: ${group?.label || ""}`,
    )
    .filter(Boolean);
}

function getRoomGroupCatalogLoadState(group) {
  const requests = getRoomGroupCatalogRequests(group);
  if (requests.length === 0) {
    return "unsupported";
  }
  if (requests.some((request) => !request.key)) {
    return "failed";
  }
  if (
    requests.every(
      (request) => riicStaticCatalogsByKey.value[request.key],
    )
  ) {
    return "ready";
  }
  if (
    requests.some(
      (request) =>
        riicStaticCatalogLoadStatesByKey.value[request.key] === "failed",
    )
  ) {
    return "failed";
  }

  return "loading";
}

function getRoomGroupCandidateSortBonus(candidate) {
  const facilityBonus = ROOM_CANDIDATE_EFFECT_META.reduce(
    (total, effect) => total + Number(candidate?.[effect.field] || 0),
    0,
  );
  const fallbackBonus = Number(candidate?.fallback?.totalPercent || 0);

  return facilityBonus + fallbackBonus + Number(candidate?.sortScore || 0);
}

function compareRoomGroupCandidates(left, right) {
  const bonusDifference =
    getRoomGroupCandidateSortBonus(right) -
    getRoomGroupCandidateSortBonus(left);
  if (bonusDifference !== 0) {
    return bonusDifference;
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

async function ensureRoomGroupCatalogLoaded(group) {
  const requests = getRoomGroupCatalogRequests(group).filter(
    (request) => request.key,
  );
  if (requests.length === 0) {
    return;
  }

  await Promise.all(
    requests.map(async ({ station, key }) => {
      if (
        riicStaticCatalogsByKey.value[key] ||
        riicStaticCatalogLoadStatesByKey.value[key] === "loading"
      ) {
        return;
      }

      riicStaticCatalogLoadStatesByKey.value = {
        ...riicStaticCatalogLoadStatesByKey.value,
        [key]: "loading",
      };

      try {
        const library = await loadRiicStaticRoomCandidateCatalog({
          roomType: getStaticRoomCandidateCatalogFacility(group),
          product: group.candidateProduct,
          stationLevel: station.stationLevel,
          slotCount: station.slotCount,
        });
        if (!library?.catalog || !library?.fallbackCatalog) {
          throw new Error(`Unknown RIIC room candidate catalog: ${key}`);
        }

        riicStaticCatalogsByKey.value = {
          ...riicStaticCatalogsByKey.value,
          [key]: library,
        };
        riicStaticCatalogLoadStatesByKey.value = {
          ...riicStaticCatalogLoadStatesByKey.value,
          [key]: "ready",
        };
        const nextErrors = { ...riicStaticCatalogErrorsByKey.value };
        delete nextErrors[key];
        riicStaticCatalogErrorsByKey.value = nextErrors;
      } catch (error) {
        riicStaticCatalogLoadStatesByKey.value = {
          ...riicStaticCatalogLoadStatesByKey.value,
          [key]: "failed",
        };
        riicStaticCatalogErrorsByKey.value = {
          ...riicStaticCatalogErrorsByKey.value,
          [key]:
            String(error?.message || "").trim() ||
            `Failed to load RIIC catalog: ${key}`,
        };
      }
    }),
  );
}

function retryActiveRoomGroupCatalogLoad() {
  const group = activeScheduleRoomGroup.value;
  const requests = getRoomGroupCatalogRequests(group).filter(
    (request) => request.key,
  );
  if (!group || requests.length === 0) {
    return;
  }

  const nextLoadStates = { ...riicStaticCatalogLoadStatesByKey.value };
  const nextErrors = { ...riicStaticCatalogErrorsByKey.value };
  for (const { key } of requests) {
    delete nextLoadStates[key];
    delete nextErrors[key];
  }
  riicStaticCatalogLoadStatesByKey.value = nextLoadStates;
  riicStaticCatalogErrorsByKey.value = nextErrors;
  ensureRoomGroupCatalogLoaded(group);
}

function enrichRoomGroupCandidateFallback(candidate) {
  if (!candidate) {
    return candidate;
  }

  const candidateOperators = (
    candidate.fallback?.candidateOperators ||
    candidate.fallback?.operators ||
    []
  ).map((operator) => ({
    ...operator,
    publicSkill: riicPublicSkillOperatorIds.value.has(operator.charId),
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

function createRoomGroupCandidateState(group) {
  if (!group) {
    return { status: "idle", cohorts: [] };
  }

  if (group.automaticScheduling) {
    return { status: "automaticControl", cohorts: [] };
  }

  if (!group.candidateGenerationAvailable) {
    return { status: "outOfScope", cohorts: [] };
  }

  if (!riicMatchingRoster.value) {
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
    shiftMode: confirmedLayoutPlan.value?.shiftMode,
    roomType: group.facility,
    twoShiftRotationMode: twoShiftRotationMode.value,
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
      const key = getRoomGroupCatalogKey(group, cohort);
      return [cohort.id, key ? riicStaticCatalogsByKey.value[key] : null];
    }),
  );
  if ([...catalogsByCohortId.values()].some((catalog) => !catalog)) {
    return {
      status:
        getRoomGroupCatalogLoadState(group) === "failed"
          ? "catalogLoadFailed"
          : "catalogLoading",
      catalogErrors: getRoomGroupCatalogErrors(group),
      cohorts: [],
    };
  }

  const cohorts = staffingRequirement.cohorts.map((cohort) => {
    const library = catalogsByCohortId.get(cohort.id);
    const matchedCandidates = matchRiicStaticRoomCandidates({
      catalog: library.catalog,
      fallbackCatalog: library.fallbackCatalog,
      operatorNameToCharId,
      ownedOperators: riicMatchingRoster.value,
      roomType: getStaticRoomCandidateCatalogFacility(group),
      product: group.candidateProduct,
      stationLevel: cohort.stationLevel,
      slotCount: cohort.slotCount,
      powerPlantCount: activeLayoutFacilityCounts.value.powerPlantCount,
      tradingStationCount:
        activeLayoutFacilityCounts.value.tradingStationCount,
      goldManufactureStationCount:
        activeLayoutFacilityCounts.value.goldManufactureStationCount,
      trainingMode: riicTrainingMode.value,
    });

    const candidates = matchedCandidates.candidates
      .map(enrichRoomGroupCandidateFallback)
      .sort(compareRoomGroupCandidates);
    const fallbackCandidate = enrichRoomGroupCandidateFallback(
      matchedCandidates.fallbackCandidate,
    );
    const manualFallbackCandidates = fallbackCandidate
      ? Array.from(
          {
            length: cohort.selectionMode === "individual" ? 0 : cohort.teamCount,
          },
          (_, index) => ({
            ...fallbackCandidate,
            key: `${fallbackCandidate.key}:manual-${index + 1}`,
            name: `纯补位班组 ${index + 1}`,
            isManualFallbackTeam: true,
            fallback: {
              ...fallbackCandidate.fallback,
              operators: [],
              materialized: false,
            },
          }),
        )
      : [];

    return {
      ...cohort,
      candidates: [...candidates, ...manualFallbackCandidates],
      fallbackCandidate,
      manualFallbackCandidates,
    };
  });
  const hasMissingFallbackPreset = cohorts.some(
    (cohort) =>
      cohort.selectionMode !== "individual" && !cohort.fallbackCandidate,
  );

  return {
    status: hasMissingFallbackPreset ? "missingFallbackPreset" : "ready",
    staffingRequirement,
    cohorts,
  };
}
const roomGroupCandidateStates = computed(() =>
  Object.fromEntries(
    selectableScheduleRoomGroups.value.map((group) => [
      group.id,
      createRoomGroupCandidateState(group),
    ]),
  ),
);
const activeRoomGroupCandidateState = computed(() => {
  const group = activeScheduleRoomGroup.value;

  if (!group) {
    return { status: "idle", cohorts: [] };
  }

  return (
    roomGroupCandidateStates.value[group.id] || {
      status: "idle",
      cohorts: [],
    }
  );
});
const activeRoomGroupStaffingCohorts = computed(
  () => activeRoomGroupCandidateState.value.cohorts || [],
);

watch(
  () => {
    const group = activeScheduleRoomGroup.value;
    return [
      group?.facility || "",
      group?.candidateProduct || "",
      group?.candidateGenerationAvailable === true,
      (group?.stations || [])
        .map(
          (station) =>
            `${station?.stationLevel || ""}:${station?.slotCount || ""}`,
        )
        .join(","),
    ];
  },
  () => {
    ensureRoomGroupCatalogLoaded(activeScheduleRoomGroup.value);
  },
  { immediate: true },
);

function getRoomGroupCohortDisplayKey(group, cohort) {
  return `${group?.id || "room"}:${cohort?.id || "cohort"}`;
}

function getVisibleRoomGroupCandidateCount(group, cohort) {
  return (
    visibleRoomGroupCandidateCounts.value[
      getRoomGroupCohortDisplayKey(group, cohort)
    ] || ROOM_STAFFING_CANDIDATE_PAGE_SIZE
  );
}

function showMoreRoomGroupCandidates(group, cohort) {
  const key = getRoomGroupCohortDisplayKey(group, cohort);
  visibleRoomGroupCandidateCounts.value = {
    ...visibleRoomGroupCandidateCounts.value,
    [key]:
      getVisibleRoomGroupCandidateCount(group, cohort) +
      ROOM_STAFFING_CANDIDATE_PAGE_SIZE,
  };
}

const visibleActiveRoomGroupStaffingCohorts = computed(() => {
  const group = activeScheduleRoomGroup.value;

  return activeRoomGroupStaffingCohorts.value.map((cohort) => {
    const selectedCandidateKeys = new Set(
      getSelectedTeamCandidateKeys(group?.id, cohort),
    );
    const fallbackCandidate = cohort.fallbackCandidate || null;
    const selectedCandidates = cohort.candidates.filter((candidate) =>
      selectedCandidateKeys.has(candidate.key),
    );
    const selectableNamedCandidates = cohort.candidates.filter(
      (candidate) =>
        (candidate.operatorIds || []).length > 0 &&
        !selectedCandidateKeys.has(candidate.key) &&
        canToggleRoomGroupTeamCandidate(group, cohort, candidate),
    );
    const selectableFallbackCandidates = cohort.candidates.filter(
      (candidate) =>
        candidate.isManualFallbackTeam &&
        !selectedCandidateKeys.has(candidate.key),
    );
    const fallbackCandidateCount =
      cohort.selectionMode === "individual" ? 0 : cohort.teamCount;
    const selectableCandidates = [
      ...selectedCandidates,
      ...selectableNamedCandidates,
      ...selectableFallbackCandidates.slice(0, fallbackCandidateCount),
    ];
    const unselectedCandidates = selectableCandidates.filter(
      (candidate) => !selectedCandidateKeys.has(candidate.key),
    );
    const displayCount = getVisibleRoomGroupCandidateCount(group, cohort);
    const displayNamedCandidates = unselectedCandidates.slice(
      0,
      Math.max(0, displayCount - selectedCandidates.length),
    );
    const displayFallbackCandidates = selectableFallbackCandidates.slice(
      0,
      fallbackCandidateCount,
    );
    const displayCandidates = [
      ...selectedCandidates,
      ...displayNamedCandidates,
      ...displayFallbackCandidates,
    ];

    return {
      ...cohort,
      fallbackCandidate,
      displayCandidates,
      availableCandidateCount: selectableCandidates.length,
      hasMoreCandidates:
        displayNamedCandidates.length < unselectedCandidates.length,
    };
  });
});

function getRoomGroupTeamCandidateKeys(groupId) {
  const state = roomGroupCandidateStates.value[groupId];
  const groupSelections =
    selectedRoomGroupTeamCandidateKeys.value[groupId] || {};

  return Object.fromEntries(
    (state?.cohorts || []).map((cohort) => {
      const candidateByKey = new Map(
        cohort.candidates.map((candidate) => [candidate.key, candidate]),
      );
      const selectedKeys = [];

      for (const candidateKey of groupSelections[cohort.id] || []) {
        const candidate = candidateByKey.get(candidateKey);
        if (!candidate || selectedKeys.length >= cohort.teamCount) {
          continue;
        }

        if (selectedKeys.includes(candidate.key)) {
          continue;
        }

        selectedKeys.push(candidate.key);
      }

      return [cohort.id, selectedKeys];
    }),
  );
}

function getSelectedTeamCandidateKeys(groupId, cohort) {
  const candidateKeys = new Set(
    (cohort?.candidates || []).map((candidate) => candidate.key),
  );
  const selectedKeys = getRoomGroupTeamCandidateKeys(groupId)[cohort.id] || [];

  return selectedKeys.filter((key) => candidateKeys.has(key));
}

function getSelectedTeamCandidateCount(group, cohort) {
  return getSelectedTeamCandidateKeys(group.id, cohort).length;
}

function getSelectedRoomCandidateCount(group, cohort, candidateKey) {
  return getSelectedTeamCandidateKeys(group.id, cohort).filter(
    (selectedKey) => selectedKey === candidateKey,
  ).length;
}

function getSelectedRoomGroupCoreOperatorIds(group, state) {
  const operatorIds = new Set();

  for (const cohort of state?.cohorts || []) {
    for (const candidateKey of getSelectedTeamCandidateKeys(
      group.id,
      cohort,
    )) {
      const candidate = cohort.candidates.find(
        (item) => item.key === candidateKey,
      );
      for (const charId of candidate?.operatorIds || []) {
        operatorIds.add(charId);
      }
    }
  }

  return operatorIds;
}

function getClaimedNamedOperatorIds() {
  const claimedOperatorIds = new Set();

  for (const charId of controlAutoRotationPlan.value.claimedOperatorIds || []) {
    claimedOperatorIds.add(charId);
  }

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const state = roomGroupCandidateStates.value[group.id];
    for (const cohort of state?.cohorts || []) {
      for (const candidateKey of getSelectedTeamCandidateKeys(
        group.id,
        cohort,
      )) {
        const candidate =
          cohort.candidates.find((item) => item.key === candidateKey) || null;
        for (const charId of candidate?.operatorIds || []) {
          claimedOperatorIds.add(charId);
        }
      }
    }
  }

  for (const plan of Object.values(roomGroupFallbackPlanStates.value)) {
    for (const charId of plan?.selectedOperatorIds || []) {
      claimedOperatorIds.add(charId);
    }
  }

  return claimedOperatorIds;
}

function isRoomGroupCohortComplete(group, cohort) {
  return getSelectedTeamCandidateCount(group, cohort) === cohort.teamCount;
}

function getRoomGroupSelectionProgress(group) {
  const state = roomGroupCandidateStates.value[group?.id];
  const cohorts = state?.cohorts || [];
  const selectedTeamCount = cohorts.reduce(
    (total, cohort) =>
      total + getSelectedTeamCandidateCount(group, cohort),
    0,
  );
  const requiredTeamCount = cohorts.reduce(
    (total, cohort) => total + cohort.teamCount,
    0,
  );

  return {
    selectedTeamCount,
    requiredTeamCount,
    complete:
      state?.status === "ready" &&
      requiredTeamCount > 0 &&
      selectedTeamCount === requiredTeamCount,
  };
}

function canAddRoomGroupTeamCandidate(group, cohort, candidate) {
  if (
    !candidate ||
    getSelectedTeamCandidateCount(group, cohort) >= cohort.teamCount
  ) {
    return false;
  }

  if (getSelectedRoomCandidateCount(group, cohort, candidate.key) > 0) {
    return false;
  }

  const candidateOperatorIds = candidate.operatorIds || [];
  if (candidateOperatorIds.length === 0) {
    return true;
  }

  const claimedOperatorIds = getClaimedNamedOperatorIds();
  return !candidateOperatorIds.some((charId) =>
    claimedOperatorIds.has(charId),
  );
}

function getRoomGroupCandidateAvailabilityMessage(group, cohort, candidate) {
  if (getSelectedRoomCandidateCount(group, cohort, candidate?.key) > 0) {
    return "取消选择";
  }

  if (canAddRoomGroupTeamCandidate(group, cohort, candidate)) {
    return (candidate?.operatorIds || []).length === 0
      ? "使用基础补位补满剩余班组"
      : "选择班组";
  }

  if (getSelectedTeamCandidateCount(group, cohort) >= cohort.teamCount) {
    return "该班组数量已选满";
  }

  if ((candidate?.operatorIds || []).length === 0) {
    return "无法继续加入";
  }

  if (getSelectedRoomCandidateCount(group, cohort, candidate?.key) > 0) {
    return "具名干员班组不能重复选择";
  }

  return "包含已在其他房间组使用的干员";
}

function getRoomGroupCandidateTooltip(group, cohort, candidate) {
  const members = [String(candidate?.name || "").trim()].filter(Boolean);
  const metricSummary = getRoomGroupCandidateMetrics(candidate)
    .map(
      (metric) =>
        `${metric.label}${formatRoomGroupBonusPercent(metric.bonus)}`,
    )
    .join(" ");

  return [
    members.join(" + ") || "基础补位",
    metricSummary,
    getRoomGroupCandidateAvailabilityMessage(group, cohort, candidate),
  ]
    .filter(Boolean)
    .join(" · ");
}

function canToggleRoomGroupTeamCandidate(group, cohort, candidate) {
  return (
    getSelectedRoomCandidateCount(group, cohort, candidate?.key) > 0 ||
    canAddRoomGroupTeamCandidate(group, cohort, candidate)
  );
}

function toggleRoomGroupTeamCandidate({ group, cohort, candidate }) {
  const currentGroupSelections =
    selectedRoomGroupTeamCandidateKeys.value[group.id] || {};
  const selectedKeys = getSelectedTeamCandidateKeys(group.id, cohort);
  const selectedCount = getSelectedRoomCandidateCount(
    group,
    cohort,
    candidate?.key,
  );

  if (selectedCount > 0) {
    selectedRoomGroupTeamCandidateKeys.value = {
      ...selectedRoomGroupTeamCandidateKeys.value,
      [group.id]: {
        ...currentGroupSelections,
        [cohort.id]: selectedKeys.filter((key) => key !== candidate.key),
      },
    };
    return;
  }

  if (!canAddRoomGroupTeamCandidate(group, cohort, candidate)) {
    return;
  }

  const nextCandidateKeys = [
    ...selectedKeys,
    candidate.key,
  ];

  selectedRoomGroupTeamCandidateKeys.value = {
    ...selectedRoomGroupTeamCandidateKeys.value,
    [group.id]: {
      ...currentGroupSelections,
      [cohort.id]: nextCandidateKeys,
    },
  };
}

function buildAutomaticRoomGroupSelections() {
  const nextSelections = {};
  const claimedOperatorIds = new Set(
    controlAutoRotationPlan.value.claimedOperatorIds || [],
  );
  const unavailableGroups = [];

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const state = roomGroupCandidateStates.value[group.id];
    if (state?.status !== "ready") {
      unavailableGroups.push(group.label);
      continue;
    }

    const cohortSelections = {};
    for (const cohort of state.cohorts || []) {
      const selectedKeys = [];

      for (let index = 0; index < cohort.teamCount; index += 1) {
        const candidate = (cohort.candidates || []).find((item) => {
          if (!item || selectedKeys.includes(item.key)) {
            return false;
          }

          return !(item.operatorIds || []).some((charId) =>
            claimedOperatorIds.has(charId),
          );
        });

        if (!candidate) {
          unavailableGroups.push(group.label);
          break;
        }

        selectedKeys.push(candidate.key);
        for (const charId of candidate.operatorIds || []) {
          claimedOperatorIds.add(charId);
        }
      }

      if (selectedKeys.length !== cohort.teamCount) {
        break;
      }

      cohortSelections[cohort.id] = selectedKeys;
    }

    if (
      Object.values(cohortSelections).reduce(
        (total, keys) => total + keys.length,
        0,
      ) !==
      (state.cohorts || []).reduce(
        (total, cohort) => total + cohort.teamCount,
        0,
      )
    ) {
      unavailableGroups.push(group.label);
      continue;
    }

    nextSelections[group.id] = cohortSelections;
  }

  return {
    selections: nextSelections,
    unavailableGroups: [...new Set(unavailableGroups)],
  };
}

async function generateAutomaticSchedule() {
  if (autoGeneratingSchedule.value) {
    return;
  }

  if (!confirmedLayoutPlan.value) {
    cMessage("请先选择布局", "warn");
    return;
  }

  if (!riicMatchingRoster.value) {
    cMessage("请先同步干员数据", "warn");
    return;
  }

  autoGeneratingSchedule.value = true;
  try {
    await Promise.all(
      candidateEnabledScheduleRoomGroups.value.map((group) =>
        ensureRoomGroupCatalogLoaded(group),
      ),
    );
    await nextTick();

    const { selections, unavailableGroups } =
      buildAutomaticRoomGroupSelections();
    if (unavailableGroups.length > 0) {
      cMessage(
        `无法自动填满：${unavailableGroups.join("、")}`,
        "warn",
      );
      return;
    }

    selectedRoomGroupTeamCandidateKeys.value = selections;
    resetScheduleExecutionSettings();
    activeScheduleRoomGroupKey.value =
      candidateEnabledScheduleRoomGroups.value[0]?.id || "";
    cMessage("已自动生成排班表", "success");
  } catch (error) {
    console.error(error);
    cMessage("自动生成失败，请稍后重试", "error");
  } finally {
    autoGeneratingSchedule.value = false;
  }
}

function selectScheduleGenerationMode(value) {
  scheduleGenerationMode.value = normalizeScheduleGenerationMode(value);
}

const candidateEnabledScheduleRoomGroups = computed(() =>
  selectableScheduleRoomGroups.value.filter(
    (group) =>
      group.candidateGenerationAvailable && !group.automaticScheduling,
  ),
);
const staffingSelectionSummary = computed(() => {
  let selectedTeamCount = 0;
  let requiredTeamCount = 0;

  if (controlScheduleRoomGroup.value) {
    requiredTeamCount += 2;
    if (controlAutoRotationPlan.value.status === "ready") {
      selectedTeamCount += 2;
    }
  }

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const state = roomGroupCandidateStates.value[group.id];
    for (const cohort of state?.cohorts || []) {
      requiredTeamCount += cohort.teamCount;
      selectedTeamCount += getSelectedTeamCandidateCount(group, cohort);
    }
  }

  return {
    selectedTeamCount,
    requiredTeamCount,
  };
});
const scheduleExecutionSettingsComplete = computed(() => {
  const expectedShiftCount = getSchedulePreviewStateCount(
    confirmedLayoutPlan.value?.shiftMode,
    twoShiftRotationMode.value,
  );
  const shifts = scheduleExecutionSettings.shifts;

  return (
    expectedShiftCount > 0 &&
    shifts.length === expectedShiftCount &&
    shifts.every(
      (shift) =>
        /^\d{2}:\d{2}$/.test(String(shift?.time || "")) &&
        Boolean(String(shift?.name || "").trim()),
    )
  );
});
const schedulePreviewShifts = computed(() =>
  scheduleExecutionSettingsComplete.value
    ? scheduleExecutionSettings.shifts.map((shift) => ({ ...shift }))
    : [],
);
function getSelectedRoomGroupCandidateEntries(group, state) {
  if (state?.status !== "ready") {
    return null;
  }

  const selectedCandidateKeysByCohort = getRoomGroupTeamCandidateKeys(group.id);
  const selectedCandidatesByCohort = new Map();
  const selectedEntries = [];

  for (const cohort of state.cohorts || []) {
    const selectedCandidates = (selectedCandidateKeysByCohort[cohort.id] || [])
      .map((candidateKey) =>
        cohort.candidates.find((candidate) => candidate.key === candidateKey),
      )
      .filter(Boolean);
    if (selectedCandidates.length !== cohort.teamCount) {
      return null;
    }

    selectedCandidatesByCohort.set(cohort.id, selectedCandidates);
    for (const [teamIndex, candidate] of selectedCandidates.entries()) {
      selectedEntries.push({
        selectionKey: `${cohort.id}:${teamIndex}`,
        candidate,
      });
    }
  }

  return {
    selectedCandidateKeysByCohort,
    selectedCandidatesByCohort,
    selectedEntries,
  };
}

function mergeCandidateUpgradeRequirements(requirements) {
  const byCharId = new Map();

  for (const requirement of requirements || []) {
    const charId = String(requirement?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const current = byCharId.get(charId);
    const requiredElite = Number(requirement?.required?.elite || 0);
    const requiredLevel = Number(requirement?.required?.level || 1);
    const currentElite = Number(current?.required?.elite || 0);
    const currentLevel = Number(current?.required?.level || 1);
    if (
      !current ||
      requiredElite > currentElite ||
      (requiredElite === currentElite && requiredLevel > currentLevel)
    ) {
      byCharId.set(charId, requirement);
    }
  }

  return [...byCharId.values()].sort(
    (left, right) =>
      String(left?.name || "").localeCompare(String(right?.name || ""), "zh-CN") ||
      String(left?.charId || "").localeCompare(
        String(right?.charId || ""),
        "en",
      ),
  );
}

function materializeRoomGroupCandidate(candidate, fallbackOperators) {
  const operators = fallbackOperators || [];
  const fallbackPercent = operators.reduce(
    (total, operator) => total + Number(operator.percent || 0),
    0,
  );
  const operatorIds = [
    ...new Set([
      ...(candidate?.operatorIds || []),
      ...operators.map((operator) => operator.charId),
    ]),
  ];
  const upgradeRequirements = mergeCandidateUpgradeRequirements([
    ...(candidate?.coreUpgradeRequirements ||
      candidate?.upgradeRequirements ||
      []),
    ...operators.map((operator) => operator?.upgradeRequirement),
  ]);

  return {
    ...candidate,
    operatorIds,
    operators: [
      ...(candidate?.operators || []),
      ...operators.map((operator) => ({
        charId: operator.charId,
        name: operator.name,
        scored: true,
        fallback: true,
        upgradeRequirement: operator.upgradeRequirement || null,
      })),
    ],
    upgradeRequirements,
    fallback: {
      ...candidate.fallback,
      count: operators.length > 0 ? 0 : candidate.fallback?.count || 0,
      operators,
      fallbackOperatorIds: operators.map((operator) => operator.charId),
      totalPercent: fallbackPercent,
      materialized: operators.length > 0,
    },
    totalPercent: Number(candidate?.corePercent || 100) + fallbackPercent,
    bonusPercent:
      Number(candidate?.corePercent || 100) + fallbackPercent - 100,
  };
}

function mergeIndividualRoomCandidates(candidates) {
  const operatorIds = [
    ...new Set(
      candidates.flatMap((candidate) => candidate?.operatorIds || []),
    ),
  ];
  const totalPercent =
    candidates.reduce(
      (total, candidate) => total + Number(candidate?.totalPercent || 0),
      0,
    ) / Math.max(candidates.length, 1);

  return {
    key: `individual:${candidates.map((candidate) => candidate.key).join("+")}`,
    name: candidates.map((candidate) => candidate.name).join(" + "),
    operatorIds,
    operators: candidates.flatMap((candidate) => candidate?.operators || []),
    coreUpgradeRequirements: mergeCandidateUpgradeRequirements(
      candidates.flatMap(
        (candidate) => candidate?.coreUpgradeRequirements || [],
      ),
    ),
    upgradeRequirements: mergeCandidateUpgradeRequirements(
      candidates.flatMap((candidate) => candidate?.upgradeRequirements || []),
    ),
    sourceRoomType: "meeting",
    corePercent: totalPercent,
    totalPercent,
    bonusPercent: totalPercent - 100,
    fallback: {
      count: 0,
      operators: [],
      materialized: true,
    },
    selectionMode: "individual",
  };
}

function buildManualRoomGroupRotationCandidate(
  group,
  state,
  fallbackPlan = null,
) {
  const selected = getSelectedRoomGroupCandidateEntries(group, state);
  if (!selected) {
    return null;
  }

  const segments = (state.staffingRequirement?.segmentHours || []).map(
    (durationHours, segmentIndex) => {
      const stationAssignments = [];

      for (const cohort of state.cohorts || []) {
        const selectedCandidates =
          selected.selectedCandidatesByCohort.get(cohort.id) || [];
        const rotationSegment = cohort.rotationSegments[segmentIndex];
        for (const assignment of rotationSegment?.assignments || []) {
          const candidateIndexes = Array.isArray(assignment.candidateIndexes)
            ? assignment.candidateIndexes
            : [assignment.teamIndex];
          const sourceCandidates = candidateIndexes
            .map((candidateIndex) => selectedCandidates[candidateIndex])
            .filter(Boolean);
          if (sourceCandidates.length !== candidateIndexes.length) {
            return null;
          }

          const selectionKeys = candidateIndexes.map(
            (candidateIndex) => `${cohort.id}:${candidateIndex}`,
          );
          const candidate =
            cohort.selectionMode === "individual"
              ? mergeIndividualRoomCandidates(sourceCandidates)
              : {
                  ...materializeRoomGroupCandidate(
                    sourceCandidates[0],
                    fallbackPlan?.assignmentsBySelectionKey?.[selectionKeys[0]] ||
                      [],
                  ),
                  fallbackSelectionKey: selectionKeys[0],
                };
          stationAssignments.push({
            stationIndex: assignment.stationIndex,
            stationLevel: cohort.stationLevel,
            expectedSlots: cohort.slotCount,
            candidate,
          });
        }
      }

      const operatorIds = stationAssignments.flatMap(
        (assignment) => assignment.candidate.operatorIds || [],
      );
      if (operatorIds.length !== new Set(operatorIds).size) {
        return null;
      }

      return {
        index: segmentIndex,
        durationHours,
        stationAssignments: stationAssignments.sort(
          (left, right) => left.stationIndex - right.stationIndex,
        ),
      };
    },
  );
  if (segments.some((segment) => !segment)) {
    return null;
  }

  return {
    key: `${group.id}:${Object.entries(
      selected.selectedCandidateKeysByCohort,
    )
      .map(([cohortId, candidateKeys]) => `${cohortId}:${candidateKeys.join(",")}`)
      .join("|")}:${fallbackPlan?.selectedOperatorIds?.join(",") || ""}`,
    segments,
  };
}

function getControlRotationSegmentHours(shiftMode, rotationMode) {
  if (shiftMode === "threeTimes") {
    return [12, 6, 6];
  }

  if (shiftMode === "once") {
    return [24, 24];
  }

  if (isMaaTwoShiftRotation(shiftMode, rotationMode)) {
    return [12, 12];
  }

  return [12, 12, 12];
}

function buildAutomaticControlRotationCandidate(group, plan) {
  if (!group || plan?.status !== "ready" || plan.shifts?.length !== 2) {
    return null;
  }

  const station = group.stations?.[0] || {};
  const stationLevel = Number.isInteger(station.stationLevel)
    ? station.stationLevel
    : 3;
  const expectedSlots = Number.isInteger(station.slotCount)
    ? station.slotCount
    : 5;
  const shiftMode = confirmedLayoutPlan.value?.shiftMode;
  const usesMaaTwoShiftRotation = isMaaTwoShiftRotation(
    shiftMode,
    twoShiftRotationMode.value,
  );
  const shiftIndexes =
    shiftMode === "once"
      ? [0, 1]
      : usesMaaTwoShiftRotation
        ? [0, 1]
      : [0, 0, 1];

  const segments = getControlRotationSegmentHours(
    shiftMode,
    twoShiftRotationMode.value,
  ).map(
    (durationHours, segmentIndex) => {
    const shift = plan.shifts[shiftIndexes[segmentIndex]];
    const operatorIds = shift.operators.map((operator) => operator.charId);

    return {
      index: segmentIndex,
      durationHours,
      stationAssignments: [
        {
          stationIndex: 0,
          stationLevel,
          expectedSlots,
          candidate: {
            key: `${group.id}:${shift.id}`,
            name: shift.label,
            operatorIds,
            operators: shift.operators,
            effectMetrics: shift.effectMetrics || [],
            upgradeRequirements: plan.upgradeRequirements || [],
            corePercent: 100,
            totalPercent: 100,
            bonusPercent: 0,
            fallback: {
              count: 0,
              operators: [],
              materialized: true,
            },
          },
        },
      ],
    };
    },
  );

  return {
    key: `${group.id}:${plan.claimedOperatorIds.join(",")}:${confirmedLayoutPlan.value?.shiftMode || ""}:${twoShiftRotationMode.value}`,
    segments,
  };
}

const automaticControlRoomGroupCandidate = computed(() => {
  const group = controlScheduleRoomGroup.value;
  const candidate = buildAutomaticControlRotationCandidate(
    group,
    controlAutoRotationPlan.value,
  );

  return {
    group,
    candidate,
    reason:
      controlAutoRotationPlan.value.status === "ready"
        ? null
        : controlAutoRotationPlan.value.status,
  };
});

const roomGroupFallbackPlanStates = computed(() => {
  const occupiedOperatorIds = new Set(
    controlAutoRotationPlan.value.claimedOperatorIds || [],
  );
  const plans = {};
  const selectedCoreOperatorIds = new Set(
    candidateEnabledScheduleRoomGroups.value.flatMap((group) => [
      ...getSelectedRoomGroupCoreOperatorIds(
        group,
        roomGroupCandidateStates.value[group.id],
      ),
    ]),
  );

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const state = roomGroupCandidateStates.value[group.id];
    const selected = getSelectedRoomGroupCandidateEntries(group, state);
    if (!selected) {
      plans[group.id] = null;
      continue;
    }

    const coreCandidate = buildManualRoomGroupRotationCandidate(
      group,
      state,
    );
    const coreOperatorIds = getManualRoomGroupCandidateOperatorIds(
      coreCandidate,
    );
    const plan = createRiicRoomGroupFallbackPlan({
      selectedEntries: selected.selectedEntries,
      occupiedOperatorIds: new Set([
        ...selectedCoreOperatorIds,
        ...occupiedOperatorIds,
        ...coreOperatorIds,
      ]),
    });
    plans[group.id] = {
      ...plan,
      groupId: group.id,
      facility: group.facility,
      coreOperatorIds,
      occupiedOperatorIds: [...occupiedOperatorIds],
    };

    for (const charId of [...coreOperatorIds, ...plan.selectedOperatorIds]) {
      occupiedOperatorIds.add(charId);
    }
  }

  return plans;
});

const roomGroupOperatorDestinations = computed(() => {
  const destinations = {};

  for (const charId of controlAutoRotationPlan.value.claimedOperatorIds || []) {
    destinations[charId] = "control";
  }

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const state = roomGroupCandidateStates.value[group.id];
    for (const charId of getSelectedRoomGroupCoreOperatorIds(group, state)) {
      if (!destinations[charId]) {
        destinations[charId] = group.facility;
      }
    }
  }

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const plan = roomGroupFallbackPlanStates.value[group.id];
    if (!plan) {
      continue;
    }

    for (const charId of [
      ...plan.coreOperatorIds,
      ...plan.selectedOperatorIds,
    ]) {
      if (!destinations[charId]) {
        destinations[charId] = group.facility;
      }
    }
  }

  return destinations;
});

function getRoomGroupFallbackPlan(group) {
  return roomGroupFallbackPlanStates.value[group?.id] || null;
}

function getFallbackOperatorDestination(charId) {
  return roomGroupOperatorDestinations.value[charId] || "";
}

function getRoomFallbackOperatorClasses(operator) {
  const destination = getFallbackOperatorDestination(operator?.charId);
  const selected = Boolean(
    activeRoomGroupFallbackPlan.value?.selectedOperatorIds?.includes(
      operator?.charId,
    ),
  );

  return {
    occupied: Boolean(destination),
    selected,
    [`destination-${destination}`]: Boolean(destination),
  };
}

function getRoomFallbackOperatorTitle(operator) {
  const percent = Number(operator?.percent || 0);
  return `${operator?.name || ""} ${
    Number.isInteger(percent) ? percent : percent.toFixed(1)
  }%`;
}

const activeRoomGroupFallbackPlan = computed(() =>
  getRoomGroupFallbackPlan(activeScheduleRoomGroup.value),
);

const manualRoomGroupCandidates = computed(() =>
  candidateEnabledScheduleRoomGroups.value.map((group) => {
    const state = roomGroupCandidateStates.value[group.id];
    const fallbackPlan = roomGroupFallbackPlanStates.value[group.id];
    const sourceCandidate = buildManualRoomGroupRotationCandidate(
      group,
      state,
      fallbackPlan,
    );
    if (!sourceCandidate || fallbackPlan?.status !== "ready") {
      return {
        group,
        candidate: null,
        reason: sourceCandidate ? "fallbackSelection" : "manualSelection",
      };
    }

    return {
      group,
      candidate: sourceCandidate,
      reason: null,
    };
  }),
);
const assembledRoomGroupCandidates = computed(() => [
  automaticControlRoomGroupCandidate.value,
  ...manualRoomGroupCandidates.value,
]);

function getManualRoomGroupCandidateOperatorIds(candidate) {
  return [
    ...new Set(
      (candidate?.segments || [])
        .flatMap((segment) => segment?.stationAssignments || [])
        .flatMap((assignment) => assignment?.candidate?.operatorIds || [])
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function getManualRoomGroupConflictGroups(candidates) {
  const groupIdsByOperator = new Map();
  const conflictGroupIds = new Set();

  for (const { group, candidate } of candidates) {
    for (const charId of getManualRoomGroupCandidateOperatorIds(candidate)) {
      const existingGroupIds = groupIdsByOperator.get(charId) || new Set();
      for (const existingGroupId of existingGroupIds) {
        conflictGroupIds.add(existingGroupId);
        conflictGroupIds.add(group.id);
      }
      existingGroupIds.add(group.id);
      groupIdsByOperator.set(charId, existingGroupIds);
    }
  }

  return [...conflictGroupIds].map((id) => {
    const entry = candidates.find(({ group }) => group.id === id);
    return {
      id,
      label: entry?.group?.label || id,
      reason: "operatorConflict",
    };
  });
}

const assembledScheduleCandidateState = computed(() => {
  const candidateGroups = candidateEnabledScheduleRoomGroups.value;

  if (!isLayoutPlanningReady.value || candidateGroups.length === 0) {
    return {
      status: "idle",
      candidates: [],
      blockedGroups: [],
      summary: null,
    };
  }

  const pendingGroups = candidateGroups
    .map((group) => ({
      group,
      state: roomGroupCandidateStates.value[group.id],
    }))
    .filter(({ state }) => state?.status !== "ready");
  if (pendingGroups.length > 0) {
    return {
      status: pendingGroups.some(
        ({ state }) => state?.status === "requiresOperators",
      )
        ? "requiresOperators"
        : pendingGroups.some(
              ({ state }) =>
                state?.status === "catalogLoading" ||
                state?.status === "catalogLoadFailed",
            )
          ? "catalogLoading"
          : "waiting",
      candidates: [],
      blockedGroups: pendingGroups.map(({ group, state }) => ({
        id: group.id,
        label: group.label,
        reason: state?.status || "candidateData",
      })),
      summary: null,
    };
  }

  if (controlScheduleRoomGroup.value && controlAutoRotationPlan.value.status !== "ready") {
    return {
      status:
        controlAutoRotationPlan.value.status === "requiresOperators"
          ? "requiresOperators"
          : "waiting",
      candidates: [],
      blockedGroups: [
        {
          id: controlScheduleRoomGroup.value.id,
          label: controlScheduleRoomGroup.value.label,
          reason: controlAutoRotationPlan.value.status,
        },
      ],
      summary: staffingSelectionSummary.value,
    };
  }

  const incompleteGroups = candidateGroups
    .filter((group) => !getRoomGroupSelectionProgress(group).complete)
    .map((group) => ({
      id: group.id,
      label: group.label,
      reason: "manualSelection",
    }));
  if (incompleteGroups.length > 0) {
    return {
      status: "waiting",
      candidates: [],
      blockedGroups: incompleteGroups,
      summary: staffingSelectionSummary.value,
    };
  }

  const unresolvedGroups = assembledRoomGroupCandidates.value
    .filter(({ candidate }) => !candidate)
    .map(({ group, reason }) => ({
      id: group.id,
      label: group.label,
      reason,
    }));
  if (unresolvedGroups.length > 0) {
    return {
      status: "waiting",
      candidates: [],
      blockedGroups: unresolvedGroups,
      summary: staffingSelectionSummary.value,
    };
  }

  const selectedGroups = assembledRoomGroupCandidates.value;
  const conflictGroups = getManualRoomGroupConflictGroups(selectedGroups);
  if (conflictGroups.length > 0) {
    return {
      status: "blocked",
      candidates: [],
      blockedGroups: conflictGroups,
      summary: staffingSelectionSummary.value,
    };
  }

  return {
    status: "ready",
    candidates: [
      {
        key: selectedGroups
          .map(({ group, candidate }) => `${group.id}:${candidate.key}`)
          .join("|"),
        groups: selectedGroups.map(({ group, candidate }) => ({
          groupId: group.id,
          groupLabel: group.label,
          facility: group.facility,
          candidateKey: candidate.key,
          candidate,
          claimedOperatorIds: getManualRoomGroupCandidateOperatorIds(candidate),
        })),
      },
    ],
    blockedGroups: [],
    summary: staffingSelectionSummary.value,
  };
});
const assembledScheduleCandidates = computed(
  () => assembledScheduleCandidateState.value.candidates || [],
);
const activeAssembledScheduleCandidate = computed(() => {
  const candidates = assembledScheduleCandidates.value;
  if (candidates.length === 0) {
    return null;
  }

  return candidates[0];
});
const scheduleTrainingRequirements = computed(() => {
  if (
    !treatUnderleveledOperatorsAsQualified.value ||
    assembledScheduleCandidateState.value.status !== "ready"
  ) {
    return [];
  }

  return mergeCandidateUpgradeRequirements([
    ...(controlAutoRotationPlan.value.upgradeRequirements || []),
    ...manualRoomGroupCandidates.value.flatMap(({ candidate }) =>
      (candidate?.segments || []).flatMap((segment) =>
        (segment?.stationAssignments || []).flatMap(
          (assignment) => assignment?.candidate?.upgradeRequirements || [],
        ),
      ),
    ),
  ]);
});
const schedulePreviewStaticRooms = computed(() =>
  scheduleRoomRows.value
    .flatMap((row) => row.groups)
    .filter(
      (group) =>
        !group.candidateGenerationAvailable && !group.automaticScheduling,
    )
    .flatMap((group) =>
      Array.from({ length: group.count }, (_, index) => ({
        key: `${group.id}:${index}`,
        label:
          group.count > 1
            ? `${group.facilityLabel} ${index + 1}`
            : group.facilityLabel,
        facility: group.facility,
        expectedSlots: group.facility === "dormitory" ? 5 : 1,
      })),
    ),
);
const riicSchedulePreview = computed(() =>
  buildRiicSchedulePreview({
    scheduleCandidate: activeAssembledScheduleCandidate.value,
    roomGroups: selectableScheduleRoomGroups.value,
    staticRooms: schedulePreviewStaticRooms.value,
    stateOrder: getSchedulePreviewStateOrder(
      confirmedLayoutPlan.value?.shiftMode,
      twoShiftRotationMode.value,
    ),
    roomOperatorOverrides: scheduleRoomOperatorOverrides.value,
    productOverrides: scheduleRoomProductOverrides.value,
    invalidatedRoomKeys: invalidatedScheduleRoomKeys.value,
    stickyOperatorIds: [
      operatorNameToCharId.get("但书"),
      operatorNameToCharId.get("龙舌兰"),
    ].filter(Boolean),
  }),
);
const generatedMaaExportPreview = computed(() => {
  if (!riicSchedulePreview.value || !scheduleExecutionSettingsComplete.value) {
    return null;
  }

  try {
    return buildRiicMaaScheduleFromPreview({
      preview: riicSchedulePreview.value,
      shifts: schedulePreviewShifts.value,
      droneTarget: scheduleExecutionSettings.droneTarget,
      shiftMode: confirmedLayoutPlan.value?.shiftMode,
      title: `一图流 ${confirmedLayoutPlan.value?.cardKey || "基建"} 排班表`,
    });
  } catch (error) {
    console.error(error);
    return null;
  }
});
const scheduleDroneTargetOptions = computed(() => {
  const optionsByKey = new Map();

  for (const state of riicSchedulePreview.value?.states || []) {
    for (const room of state.rooms || []) {
      if (
        !["trading", "manufacture"].includes(room.facility) ||
        optionsByKey.has(room.key)
      ) {
        continue;
      }

      const product =
        ROOM_PRODUCT_OPTIONS[room.facility]?.find(
          (option) => option.value === room.product,
        )?.label || "";
      optionsByKey.set(room.key, {
        value: room.key,
        label: product ? `${room.label} · ${product}` : room.label,
      });
    }
  }

  return [...optionsByKey.values()];
});
const scheduleExecutionDroneLabel = computed(
  () =>
    scheduleDroneTargetOptions.value.find(
      (option) => option.value === scheduleExecutionSettings.droneTarget,
    )?.label || "",
);
const activeSchedulePreviewRoom = computed(() => {
  const state =
    riicSchedulePreview.value?.states?.[activeSchedulePreviewStateIndex.value];
  return (
    state?.rooms?.find(
      (room) => room.key === selectedSchedulePreviewRoomKey.value,
    ) || null
  );
});
const scheduleRoomEditorOperators = computed(() => {
  const room = activeSchedulePreviewRoom.value;
  if (!room) {
    return [];
  }

  return (room.operators || [])
    .map((operator) => {
      const charId = String(operator?.charId || "").trim();
      const metadata = operatorTableV2?.[charId] || {};
      const name = String(metadata.name || operator?.name || charId).trim();
      if (!name) {
        return null;
      }
      return {
        charId,
        name,
        rarity: metadata.rarity || 1,
        known: Boolean(charId && metadata.name),
      };
    })
    .filter(Boolean);
});
const scheduleRoomEditorOperatorOptions = computed(() => {
  const selectedOperatorKeys = new Set(
    scheduleRoomEditorOperators.value.map((operator) =>
      getScheduleRoomEditorOperatorKey(operator),
    ),
  );

  return (riicMatchingRoster.value || [])
    .filter(
      (operator) =>
        !selectedOperatorKeys.has(
          getScheduleRoomEditorOperatorKey(operator),
        ),
    )
    .map((operator) => ({
      charId: operator.charId,
      name: operator.name || operatorTableV2?.[operator.charId]?.name || operator.charId,
      rarity: operatorTableV2?.[operator.charId]?.rarity || 1,
    }));
});
const scheduleRoomEditorInputName = computed(() =>
  String(scheduleRoomEditorOperatorInput.value || "").trim(),
);
const scheduleRoomEditorInputCharId = computed(
  () => operatorNameToCharId.get(scheduleRoomEditorInputName.value) || "",
);
const scheduleRoomEditorInputUnmatched = computed(
  () =>
    Boolean(scheduleRoomEditorInputName.value) &&
    !scheduleRoomEditorInputCharId.value,
);
const scheduleRoomEditorProductOptions = computed(() =>
  ROOM_PRODUCT_OPTIONS[activeSchedulePreviewRoom.value?.facility] || [],
);

watch(
  () => riicSchedulePreview.value?.sourceKey,
  () => {
    activeSchedulePreviewStateIndex.value = 0;
    selectedSchedulePreviewRoomKey.value = "";
  },
);

watch(
  [
    () => riicSchedulePreview.value?.key,
    () => riicSchedulePreview.value?.preferredDroneRoomKey,
    () => scheduleDroneTargetOptions.value.map((option) => option.value).join("|"),
  ],
  () => {
    const availableTargets = new Set(
      scheduleDroneTargetOptions.value.map((option) => option.value),
    );

    if (
      scheduleExecutionSettings.droneTargetPinned &&
      availableTargets.has(scheduleExecutionSettings.droneTarget)
    ) {
      return;
    }

    scheduleExecutionSettings.droneTargetPinned = false;
    scheduleExecutionSettings.droneTarget =
      riicSchedulePreview.value?.preferredDroneRoomKey ||
      scheduleDroneTargetOptions.value[0]?.value ||
      "";
  },
  { immediate: true },
);

function getScheduleRoomOverrideKey(stateIndex, roomKey) {
  return `${stateIndex}:${roomKey}`;
}

function getScheduleRoomOriginalProduct(room) {
  const group = selectableScheduleRoomGroups.value.find(
    (item) => item.id === room?.groupId,
  );
  return group?.candidateProduct || room?.product || "";
}

function setScheduleRoomOperatorOverride(roomKey, stateIndex, operators) {
  const key = getScheduleRoomOverrideKey(stateIndex, roomKey);
  scheduleRoomOperatorOverrides.value = {
    ...scheduleRoomOperatorOverrides.value,
    [key]: operators,
  };
}

function selectSchedulePreviewRoom({ roomKey, stateIndex }) {
  if (!roomKey) {
    return;
  }

  activeSchedulePreviewStateIndex.value = stateIndex;
  selectedSchedulePreviewRoomKey.value = roomKey;
  scheduleRoomEditorOperatorInput.value = "";
  nextTick(() => {
    roomEditorPanel.value?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function getScheduleRoomEditorOperatorKey(operator) {
  const charId = String(operator?.charId || "").trim();
  if (charId) {
    return `id:${charId}`;
  }

  return `name:${String(operator?.name || "").trim()}`;
}

function addScheduleRoomEditorOperator() {
  const room = activeSchedulePreviewRoom.value;
  const name = scheduleRoomEditorInputName.value;
  if (!room || !name) {
    return;
  }

  const charId = scheduleRoomEditorInputCharId.value;
  const nextOperator = {
    charId,
    name,
  };
  const operators = [...scheduleRoomEditorOperators.value];
  if (
    operators.some(
      (operator) =>
        getScheduleRoomEditorOperatorKey(operator) ===
        getScheduleRoomEditorOperatorKey(nextOperator),
    ) ||
    (Number(room.expectedSlots) > 0 &&
      operators.length >= Number(room.expectedSlots))
  ) {
    return;
  }

  setScheduleRoomOperatorOverride(room.key, activeSchedulePreviewStateIndex.value, [
    ...operators,
    nextOperator,
  ]);
  scheduleRoomEditorOperatorInput.value = "";
}

function removeScheduleRoomEditorOperator(operatorToRemove) {
  const room = activeSchedulePreviewRoom.value;
  const operatorKey = getScheduleRoomEditorOperatorKey(operatorToRemove);
  if (!room || !operatorKey) {
    return;
  }

  setScheduleRoomOperatorOverride(
    room.key,
    activeSchedulePreviewStateIndex.value,
    scheduleRoomEditorOperators.value.filter(
      (operator) => getScheduleRoomEditorOperatorKey(operator) !== operatorKey,
    ),
  );
}

function changeScheduleRoomProduct(product) {
  const room = activeSchedulePreviewRoom.value;
  if (!room || !product) {
    return;
  }

  const originalProduct = getScheduleRoomOriginalProduct(room);
  const nextProductOverrides = { ...scheduleRoomProductOverrides.value };
  const nextInvalidatedRoomKeys = { ...invalidatedScheduleRoomKeys.value };
  const nextOperatorOverrides = { ...scheduleRoomOperatorOverrides.value };

  for (const key of Object.keys(nextOperatorOverrides)) {
    if (key.endsWith(`:${room.key}`)) {
      delete nextOperatorOverrides[key];
    }
  }

  if (product === originalProduct) {
    delete nextProductOverrides[room.key];
    delete nextInvalidatedRoomKeys[room.key];
  } else {
    nextProductOverrides[room.key] = product;
    nextInvalidatedRoomKeys[room.key] = true;
  }

  scheduleRoomProductOverrides.value = nextProductOverrides;
  invalidatedScheduleRoomKeys.value = nextInvalidatedRoomKeys;
  scheduleRoomOperatorOverrides.value = nextOperatorOverrides;
}

function resetSchedulePreviewRoom() {
  const room = activeSchedulePreviewRoom.value;
  if (!room) {
    return;
  }

  const nextProductOverrides = { ...scheduleRoomProductOverrides.value };
  const nextInvalidatedRoomKeys = { ...invalidatedScheduleRoomKeys.value };
  const nextOperatorOverrides = { ...scheduleRoomOperatorOverrides.value };
  delete nextProductOverrides[room.key];
  delete nextInvalidatedRoomKeys[room.key];
  for (const key of Object.keys(nextOperatorOverrides)) {
    if (key.endsWith(`:${room.key}`)) {
      delete nextOperatorOverrides[key];
    }
  }

  scheduleRoomProductOverrides.value = nextProductOverrides;
  invalidatedScheduleRoomKeys.value = nextInvalidatedRoomKeys;
  scheduleRoomOperatorOverrides.value = nextOperatorOverrides;
}

function selectScheduleDroneTarget(value) {
  scheduleExecutionSettings.droneTarget = value;
  scheduleExecutionSettings.droneTargetPinned = true;
}

function restoreAutomaticScheduleDroneTarget() {
  scheduleExecutionSettings.droneTargetPinned = false;
  scheduleExecutionSettings.droneTarget =
    riicSchedulePreview.value?.preferredDroneRoomKey ||
    scheduleDroneTargetOptions.value[0]?.value ||
    "";
}

function updateSchedulePreviewShift({ index, time, name }) {
  if (
    !Number.isInteger(index) ||
    !scheduleExecutionSettings.shifts[index]
  ) {
    return;
  }

  const currentShift = scheduleExecutionSettings.shifts[index];
  scheduleExecutionSettings.shifts.splice(index, 1, {
    ...currentShift,
    ...(typeof time === "string" ? { time } : {}),
    ...(typeof name === "string" ? { name } : {}),
  });
}

function formatRoomGroupBonusPercent(value) {
  const bonus = Math.max(0, Number(value || 0));
  return `+${Number.isInteger(bonus) ? bonus : bonus.toFixed(1)}%`;
}

function getRoomGroupCandidateMetrics(candidate) {
  return ROOM_CANDIDATE_EFFECT_META.flatMap((effect) => {
    const bonus = Number(candidate?.[effect.field] || 0);
    return bonus > 0 ? [{ ...effect, bonus }] : [];
  });
}

function getControlShiftEffectMetrics(shift) {
  return (shift?.effectMetrics || []).flatMap((metric) => {
    const effect = ROOM_CANDIDATE_EFFECT_META.find(
      (item) => item.facility === metric.facility,
    );
    const bonus = Number(metric?.percent || 0);

    return effect && bonus > 0
      ? [
          {
            ...effect,
            bonus,
          },
        ]
      : [];
  });
}

function getRoomGroupCandidateStatus(group) {
  if (group?.automaticScheduling) {
    if (controlAutoRotationPlan.value.status === "ready") {
      return {
        icon: "mdi-check-circle",
        tone: "ready",
        title: "已自动排好两班",
      };
    }

    if (controlAutoRotationPlan.value.status === "requiresOperators") {
      return {
        icon: "mdi-account-alert-outline",
        tone: "waiting",
        title: "等待干员数据",
      };
    }

    return {
      icon: "mdi-alert-circle-outline",
      tone: "blocked",
      title: `还缺 ${controlAutoRotationPlan.value.missingSlotCount || 0} 名干员`,
    };
  }

  const status = roomGroupCandidateStates.value[group?.id]?.status;

  if (status === "ready") {
    const progress = getRoomGroupSelectionProgress(group);
    if (!progress.complete) {
      return {
        icon: "mdi-progress-clock",
        tone: "selectionPending",
        title: `已选择 ${progress.selectedTeamCount}/${progress.requiredTeamCount} 组班组`,
      };
    }

    return {
      icon: "mdi-check-circle",
      tone: "ready",
      title: "所需班组已选齐",
    };
  }
  if (status === "requiresOperators") {
    return {
      icon: "mdi-account-alert-outline",
      tone: "waiting",
      title: "等待干员数据",
    };
  }
  if (
    status === "catalogLoading" &&
    group?.id === activeScheduleRoomGroupKey.value
  ) {
    return {
      icon: "mdi-loading",
      tone: "waiting",
      title: "正在载入固定候选列表",
    };
  }
  if (
    [
      "missingCapacity",
      "missingFallbackPreset",
      "catalogLoadFailed",
    ].includes(status)
  ) {
    return {
      icon: "mdi-alert-circle-outline",
      tone: "blocked",
      title: "固定候选数据不完整",
    };
  }

  return null;
}

function getRoomGroupProgressStatus(group) {
  if (group?.automaticScheduling) {
    if (controlAutoRotationPlan.value.status === "ready") {
      return {
        tone: "complete",
        label: "自动生成",
      };
    }

    return controlAutoRotationPlan.value.status === "requiresOperators"
      ? {
          tone: "pending",
          label: "待同步数据",
        }
      : {
          tone: "error",
          label: "人手不足",
        };
  }

  if (["dormitory", "processing", "training"].includes(group?.facility)) {
    return {
      tone: "notRequired",
      label: "无需操作",
    };
  }

  const status = roomGroupCandidateStates.value[group?.id]?.status;
  if (
    ["catalogLoadFailed", "missingCapacity", "missingFallbackPreset"].includes(
      status,
    )
  ) {
    return {
      tone: "error",
      label: "候选异常",
    };
  }

  if (status === "requiresOperators") {
    return {
      tone: "pending",
      label: "待同步数据",
    };
  }

  if (status === "catalogLoading") {
    return {
      tone: "pending",
      label: "载入中",
    };
  }

  return getRoomGroupSelectionProgress(group).complete
    ? {
        tone: "complete",
        label: "已填入",
      }
    : {
        tone: "pending",
        label: "待填入",
      };
}

function getAssembledCandidateBlockedMessage(state) {
  const labels = (state?.blockedGroups || [])
    .map((group) => group.label)
    .filter(Boolean)
    .join("、");

  if (state?.status === "requiresOperators") {
    return "同步干员数据后，即可组装完整候选排班。";
  }
  if (state?.status === "catalogLoading") {
    return "正在载入所选设施组的固定候选列表。";
  }
  if (state?.status === "waiting") {
    if (
      (state?.blockedGroups || []).some(
        (group) => group.reason === "insufficient",
      )
    ) {
      return "当前干员数量不足以补满控制中枢两班。";
    }
    return labels
      ? `请先完成以下房间组的人手组选择：${labels}`
      : "请先完成房间组的人手组选择。";
  }
  if (state?.status === "blocked") {
    if (
      (state?.blockedGroups || []).some(
        (group) => group.reason === "missingFallbackPreset",
      )
    ) {
      return labels
        ? `以下房间组缺少基础补位预设：${labels}`
        : "基础补位预设不完整。";
    }
    return labels
      ? `这些房间组存在干员冲突：${labels}`
      : "当前候选无法组成一套不重复占用干员的排班。";
  }

  return "选择布局并准备房间组候选后，即可生成完整排班。";
}

const recommendationCard = computed(() => {
  return getLayoutCardByKey(recommendation.value?.cardKey);
});
const sklandOperatorSourceStatus = computed(() =>
  getOperatorSourceStatus(OPERATOR_SOURCE_KEYS.skland),
);
const maaOperatorSourceStatus = computed(() =>
  getOperatorSourceStatus(OPERATOR_SOURCE_KEYS.maa),
);
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

watch(
  selectableScheduleRoomGroups,
  (groups) => {
    if (
      !groups.some(
        (group) => group.id === activeScheduleRoomGroupKey.value,
      )
    ) {
      activeScheduleRoomGroupKey.value =
        groups.find(
          (group) =>
            group.candidateGenerationAvailable &&
            group.facility === "trading",
        )?.id ||
        groups.find((group) => group.candidateGenerationAvailable)?.id ||
        groups[0]?.id ||
        "";
    }
  },
  { immediate: true },
);

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

function getLayoutCardByKey(value) {
  const normalizedKey = LEGACY_LAYOUT_CARD_KEYS[value] || value;
  return LAYOUT_CARD_META.find((card) => card.key === normalizedKey) || null;
}

function getDefaultLayoutCard(layoutId, shiftMode) {
  return (
    LAYOUT_CARD_META.find(
      (card) =>
        card.layoutId === layoutId &&
        isLayoutCardCompatible(card, shiftMode) &&
        card.key === layoutId,
    ) ||
    LAYOUT_CARD_META.find(
      (card) =>
        card.layoutId === layoutId &&
        isLayoutCardCompatible(card, shiftMode),
    ) ||
    null
  );
}

function normalizeLayoutEntry(
  value,
  savedPlanningMode,
  savedLayoutId,
  savedAnswers,
) {
  const savedCard = getLayoutCardByKey(value);
  if (savedCard) {
    return savedCard.key;
  }

  const legacyCard = getDefaultLayoutCard(value, savedAnswers?.shiftMode);
  if (legacyCard) {
    return legacyCard.key;
  }

  if (value === "recommend") {
    return ANSWER_FIELDS.some((field) => Boolean(savedAnswers?.[field.key]))
      ? "recommend"
      : null;
  }

  if (
    normalizePlanningMode(savedPlanningMode) === "manual" &&
    getDefaultLayoutCard(savedLayoutId, savedAnswers?.shiftMode)
  ) {
    return getDefaultLayoutCard(savedLayoutId, savedAnswers?.shiftMode).key;
  }

  return null;
}

function normalizeConfirmedLayoutPlan(value) {
  const card =
    getLayoutCardByKey(value?.cardKey) ||
    getLayoutCardByKey(
      getLayoutCardKeyForSchedule(value?.layoutId, value?.variant),
    ) ||
    getDefaultLayoutCard(value?.layoutId, value?.shiftMode);

  if (
    !value ||
    !card ||
    !LAYOUT_SHIFT_OPTIONS.some((option) => option.value === value.shiftMode) ||
    !isLayoutCardCompatible(card, value.shiftMode)
  ) {
    return null;
  }

  return {
    cardKey: card.key,
    layoutId: card.layoutId,
    shiftMode: value.shiftMode,
    facilityRequirement: normalizeRiicFacilityRequirement(
      card.layoutId,
      value.facilityRequirement,
    ),
  };
}

function isStepComplete(step, candidateAnswers = answers) {
  return Boolean(
    step?.fields?.every((field) => Boolean(candidateAnswers[field.key])),
  );
}

function isLayoutChoiceAvailable(cardKey, shiftMode = answers.shiftMode) {
  const card = getLayoutCardByKey(cardKey);
  return isLayoutCardCompatible(card, shiftMode);
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

function normalizeSavedStaticCandidateKey(value) {
  const key = String(value || "").trim();
  const parts = key.split(":");
  if (
    parts.length !== 4 ||
    parts[0] !== "raw-maa" ||
    !parts[1] ||
    !parts[2] ||
    !parts[3]
  ) {
    return key;
  }

  const memberSetKey = parts[3]
    .split("|")
    .map((charId) => charId.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("|");

  return memberSetKey
    ? `${parts[0]}:${parts[1]}:${parts[2]}:${memberSetKey}`
    : key;
}

function normalizeSavedRoomGroupTeamCandidateKeys(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([roomGroupId, cohorts]) => {
      if (
        typeof roomGroupId !== "string" ||
        !roomGroupId ||
        !cohorts ||
        typeof cohorts !== "object" ||
        Array.isArray(cohorts)
      ) {
        return [];
      }

      return [
        [
          roomGroupId,
          Object.fromEntries(
            Object.entries(cohorts).flatMap(([cohortId, candidateKeys]) => {
              if (
                typeof cohortId !== "string" ||
                !cohortId ||
                !Array.isArray(candidateKeys)
              ) {
                return [];
              }

              return [
                [
                  cohortId,
                  candidateKeys
                    .map(normalizeSavedStaticCandidateKey)
                    .filter(Boolean),
                ],
              ];
            }),
          ),
        ],
      ];
    }),
  );
}

function normalizeSavedScheduleRoomOperatorOverrides(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([key, operators]) => {
      if (
        typeof key !== "string" ||
        !key ||
        !Array.isArray(operators)
      ) {
        return [];
      }

      const normalizedOperators = operators
        .map((operator) => {
          const charId = String(operator?.charId || operator || "").trim();
          const name = String(
            operator?.name || operatorTableV2?.[charId]?.name || charId,
          ).trim();
          if (!name) {
            return null;
          }

          return {
            charId,
            name,
          };
        })
        .filter(Boolean);
      return [[key, normalizedOperators]];
    }),
  );
}

function normalizeSavedScheduleRoomProductOverrides(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([roomKey, product]) => {
      const normalizedProduct = String(product || "").trim();
      if (
        typeof roomKey !== "string" ||
        !roomKey ||
        !["lmd", "experience", "gold", "orundum"].includes(
          normalizedProduct,
        )
      ) {
        return [];
      }

      return [[roomKey, normalizedProduct]];
    }),
  );
}

function normalizeSavedInvalidatedScheduleRoomKeys(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([roomKey, isInvalidated]) =>
      typeof roomKey === "string" && roomKey && isInvalidated === true
        ? [[roomKey, true]]
        : [],
    ),
  );
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
      ![
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        10,
        11,
        12,
        15,
        RIIC_SCHEDULE_DRAFT_VERSION,
      ].includes(
        parsedDraft?.version,
      ) ||
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
    selectedLayoutId.value = LAYOUT_CARD_META.some(
      (card) => card.layoutId === parsedDraft.selectedLayoutId,
    )
      ? parsedDraft.selectedLayoutId
      : "";
    if (layoutEntry.value !== "recommend") {
      selectedLayoutId.value =
        getLayoutCardByKey(layoutEntry.value)?.layoutId || "";
    }
    confirmedLayoutPlan.value = normalizeConfirmedLayoutPlan(
      parsedDraft.confirmedLayoutPlan,
    );
    twoShiftRotationMode.value =
      parsedDraft.version >= 14
        ? normalizeTwoShiftRotationMode(parsedDraft.twoShiftRotationMode)
        : "manual";
    treatUnderleveledOperatorsAsQualified.value =
      parsedDraft.version >= 15 &&
      parsedDraft.treatUnderleveledOperatorsAsQualified === true;
    selectedRoomGroupTeamCandidateKeys.value =
      parsedDraft.version >= 10
        ? normalizeSavedRoomGroupTeamCandidateKeys(
            parsedDraft.selectedRoomGroupTeamCandidateKeys,
          )
        : {};
    scheduleGenerationMode.value =
      parsedDraft.version >= RIIC_SCHEDULE_DRAFT_VERSION
        ? normalizeScheduleGenerationMode(parsedDraft.scheduleGenerationMode)
        : Object.values(selectedRoomGroupTeamCandidateKeys.value).some(
              (cohorts) =>
                Object.values(cohorts || {}).some(
                  (candidateKeys) => Array.isArray(candidateKeys) && candidateKeys.length,
                ),
            )
          ? "guided"
          : "auto";
    const savedExecutionSettings = normalizeScheduleExecutionSettings(
      parsedDraft.scheduleExecutionSettings,
      confirmedLayoutPlan.value?.shiftMode,
      twoShiftRotationMode.value,
    );
    scheduleExecutionSettings.shifts = savedExecutionSettings.shifts;
    scheduleExecutionSettings.droneTarget = savedExecutionSettings.droneTarget;
    scheduleExecutionSettings.droneTargetPinned =
      savedExecutionSettings.droneTargetPinned;
    scheduleRoomOperatorOverrides.value =
      parsedDraft.version >= 13
        ? normalizeSavedScheduleRoomOperatorOverrides(
            parsedDraft.scheduleRoomOperatorOverrides,
          )
        : {};
    scheduleRoomProductOverrides.value =
      parsedDraft.version >= 13
        ? normalizeSavedScheduleRoomProductOverrides(
            parsedDraft.scheduleRoomProductOverrides,
          )
        : {};
    invalidatedScheduleRoomKeys.value =
      parsedDraft.version >= 13
        ? normalizeSavedInvalidatedScheduleRoomKeys(
            parsedDraft.invalidatedScheduleRoomKeys,
          )
        : {};
    layoutStageCollapsed.value = Boolean(confirmedLayoutPlan.value);
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
        twoShiftRotationMode: twoShiftRotationMode.value,
        scheduleGenerationMode: scheduleGenerationMode.value,
        treatUnderleveledOperatorsAsQualified:
          treatUnderleveledOperatorsAsQualified.value,
        selectedRoomGroupTeamCandidateKeys:
          selectedRoomGroupTeamCandidateKeys.value,
        scheduleExecutionSettings: {
          shifts: scheduleExecutionSettings.shifts.map((shift) => ({
            id: shift.id,
            name: shift.name,
            time: shift.time,
          })),
          droneTarget: scheduleExecutionSettings.droneTarget,
          droneTargetPinned: scheduleExecutionSettings.droneTargetPinned,
        },
        scheduleRoomOperatorOverrides: scheduleRoomOperatorOverrides.value,
        scheduleRoomProductOverrides: scheduleRoomProductOverrides.value,
        invalidatedScheduleRoomKeys: invalidatedScheduleRoomKeys.value,
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

function selectOption(key, value) {
  answers[key] = value;
}

function selectLayoutEntry(value) {
  const card =
    getLayoutCardByKey(value) ||
    getDefaultLayoutCard(value, answers.shiftMode);

  if (
    value !== "recommend" &&
    !card
  ) {
    return;
  }

  layoutEntry.value = value === "recommend" ? value : card.key;
  planningMode.value = value === "recommend" ? "recommend" : "manual";
  if (value !== "recommend") {
    selectedLayoutId.value = card.layoutId;
    confirmedLayoutPlan.value = null;
    clearSelectedRoomGroupTeamCandidates();
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

function clearSelectedRoomGroupTeamCandidates() {
  selectedRoomGroupTeamCandidateKeys.value = {};
  resetScheduleExecutionSettings();
}

function selectTwoShiftRotationMode(value) {
  if (confirmedLayoutPlan.value?.shiftMode !== "twice") {
    return;
  }

  const nextMode = normalizeTwoShiftRotationMode(value);
  if (twoShiftRotationMode.value === nextMode) {
    return;
  }

  twoShiftRotationMode.value = nextMode;
  clearSelectedRoomGroupTeamCandidates();
}

function setTreatUnderleveledOperatorsAsQualified(value) {
  const nextValue = value === true;
  if (treatUnderleveledOperatorsAsQualified.value === nextValue) {
    return;
  }

  treatUnderleveledOperatorsAsQualified.value = nextValue;
  clearSelectedRoomGroupTeamCandidates();
}

function selectManualScheduleOption(value) {
  const [shiftMode, cardKey] = String(value).split(":");
  const card = getLayoutCardByKey(cardKey);

  if (
    !LAYOUT_SHIFT_OPTIONS.some((option) => option.value === shiftMode) ||
    !card ||
    !isLayoutChoiceAvailable(cardKey, shiftMode)
  ) {
    return;
  }

  if (
    confirmedLayoutPlan.value?.cardKey === cardKey &&
    confirmedLayoutPlan.value?.shiftMode === shiftMode
  ) {
    selectedLayoutId.value = "";
    confirmedLayoutPlan.value = null;
    clearSelectedRoomGroupTeamCandidates();
    layoutEntry.value = recommendation.value ? "recommend" : null;
    planningMode.value = recommendation.value ? "recommend" : null;
    recommendationPanelOpen.value = false;
    setLayoutPlanExpanded(true);
    return;
  }

  layoutEntry.value = card.key;
  planningMode.value = "manual";
  selectedLayoutId.value = card.layoutId;
  answers.shiftMode = shiftMode;
  confirmedLayoutPlan.value = {
    cardKey: card.key,
    layoutId: card.layoutId,
    shiftMode,
    facilityRequirement: normalizeRiicFacilityRequirement(card.layoutId),
  };
  clearSelectedRoomGroupTeamCandidates();
  recommendationPanelOpen.value = false;
  setLayoutPlanExpanded(false);
}

function expandLayoutStage() {
  setLayoutPlanExpanded(true);
  focusCurrentPanel();
}

function setLayoutPlanExpanded(expanded) {
  layoutStageCollapsed.value = !expanded;
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

function toggleRecommendationPanel() {
  if (recommendationPanelOpen.value) {
    closeRecommendationPanel();
    return;
  }

  openRecommendationPanel();
}

function selectRecommendationStep(index) {
  if (!Number.isInteger(index) || !steps[index]) {
    return;
  }

  layoutEntry.value = "recommend";
  planningMode.value = "recommend";
  currentStep.value = index;
  recommendationPanelOpen.value = true;
}

function closeRecommendationPanel() {
  recommendationPanelOpen.value = false;
}

function resetRecommendationAnswers() {
  Object.assign(answers, DEFAULT_ANSWERS);
  currentStep.value = 0;
  layoutEntry.value = "recommend";
  planningMode.value = "recommend";
}

function resetWizard() {
  currentStep.value = 0;
  layoutEntry.value = null;
  planningMode.value = null;
  selectedLayoutId.value = "";
  confirmedLayoutPlan.value = null;
  scheduleGenerationMode.value = "auto";
  treatUnderleveledOperatorsAsQualified.value = false;
  clearSelectedRoomGroupTeamCandidates();
  recommendationPanelOpen.value = false;
  setLayoutPlanExpanded(true);
  focusCurrentPanel();
}

function selectFacilityRequirement(value) {
  if (!is252LayoutPlan.value || !confirmedLayoutPlan.value) {
    return;
  }

  const facilityRequirement = normalizeRiicFacilityRequirement("252", value);

  if (
    confirmedLayoutPlan.value.facilityRequirement === facilityRequirement
  ) {
    return;
  }

  confirmedLayoutPlan.value = {
    ...confirmedLayoutPlan.value,
    facilityRequirement,
  };
  activeScheduleRoomGroupKey.value = "";
  clearSelectedRoomGroupTeamCandidates();
}

async function clearSavedWizardState() {
  storageReady.value = false;
  let cleared = true;

  try {
    localStorage.removeItem(RIIC_SCHEDULE_DRAFT_STORAGE_KEY);
    localStorage.removeItem(LEGACY_RIIC_SCHEDULE_DRAFT_STORAGE_KEY);
    localStorage.removeItem(RIIC_MAA_OPERATOR_STORAGE_KEY);
    localStorage.removeItem(RIIC_OPERATOR_SOURCE_STORAGE_KEY);
  } catch {
    cleared = false;
  }

  Object.assign(answers, DEFAULT_ANSWERS);
  currentStep.value = 0;
  layoutEntry.value = null;
  planningMode.value = null;
  selectedLayoutId.value = "";
  confirmedLayoutPlan.value = null;
  twoShiftRotationMode.value = "maa";
  scheduleGenerationMode.value = "auto";
  treatUnderleveledOperatorsAsQualified.value = false;
  clearSelectedRoomGroupTeamCandidates();
  recommendationPanelOpen.value = false;
  setLayoutPlanExpanded(true);
  useOwnedOperators.value = false;
  pendingOwnedOperatorPreference.value = false;
  clearActiveOperatorSource();
  Object.assign(operatorSourceStates.maa, {
    loading: false,
    operators: [],
    importedAt: "",
    fileName: "",
    warnings: [],
    error: "",
  });
  hasSavedWizardState.value = false;

  await nextTick();
  storageReady.value = true;
  await focusCurrentPanel();

  cMessage(
    cleared
      ? "本页缓存已清空"
      : "页面已重置，但缓存清除失败",
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

function formatTrainingRequirement(requirement) {
  const currentElite = Number(requirement?.current?.elite || 0);
  const currentLevel = Number(requirement?.current?.level || 1);
  const requiredElite = Number(requirement?.required?.elite || 0);
  const requiredLevel = Number(requirement?.required?.level || 1);

  return `精${currentElite} ${currentLevel} → 精${requiredElite} ${requiredLevel}`;
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
    const level = Number.isFinite(Number(operator?.level))
      ? Number(operator.level)
      : null;
    const identity = charId || name;
    const current = operatorMap.get(identity);

    if (
      !current ||
      elite > current.elite ||
      (elite === current.elite && (level || 0) > (current.level || 0))
    ) {
      operatorMap.set(identity, {
        charId: charId || null,
        name,
        elite,
        level,
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

function getOperatorSourceLabel(source) {
  return source === OPERATOR_SOURCE_KEYS.maa ? "maa" : "森空岛";
}

function getOperatorSourceStatus(source) {
  const state = operatorSourceStates[source];
  const available = Boolean(state?.operators?.length);
  const isMaa = source === OPERATOR_SOURCE_KEYS.maa;

  let detail = isMaa ? "点击上传 MAA JSON 文件" : "点击打开森空岛同步流程";
  if (state?.loading) {
    detail = isMaa ? "正在读取 MAA JSON 文件" : "正在读取森空岛数据";
  } else if (state?.error) {
    detail = state.error;
  } else if (available) {
    const count = state.operators.length;
    const time = state.importedAt
      ? ` · ${formatOperatorSyncTime(state.importedAt)}`
      : "";
    detail = `${count} 名持有干员${time}`;
  }

  return {
    available,
    active: activeOperatorSource.value === source,
    title: isMaa
      ? available
        ? "maa数据已上传"
        : "未上传maa数据"
      : available
        ? "森空岛数据已同步"
        : "未同步森空岛数据",
    detail,
    tone: available ? "success" : "warning",
  };
}

function readSavedOperatorSource() {
  try {
    const source = localStorage.getItem(RIIC_OPERATOR_SOURCE_STORAGE_KEY);
    return Object.values(OPERATOR_SOURCE_KEYS).includes(source) ? source : "";
  } catch {
    return "";
  }
}

function saveActiveOperatorSource(source) {
  try {
    localStorage.setItem(RIIC_OPERATOR_SOURCE_STORAGE_KEY, source);
  } catch {
    // The current page remains usable when local storage is unavailable.
  }
}

function readStoredMaaOperatorSnapshot() {
  try {
    const stored = localStorage.getItem(RIIC_MAA_OPERATOR_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const snapshot = JSON.parse(stored);
    if (
      snapshot?.schemaVersion !== 1 ||
      !Array.isArray(snapshot.operators)
    ) {
      return null;
    }

    return snapshot;
  } catch (error) {
    console.error("readStoredMaaOperatorSnapshot failed", error);
    return null;
  }
}

function loadStoredMaaOperatorSource() {
  const snapshot = readStoredMaaOperatorSnapshot();
  const state = operatorSourceStates.maa;

  state.operators = snapshot?.operators || [];
  state.importedAt = snapshot?.importedAt || "";
  state.fileName = snapshot?.fileName || "";
  state.warnings = Array.isArray(snapshot?.warnings)
    ? snapshot.warnings
    : [];
  state.error = "";
}

function setActiveOperatorSource(source, { notify = false } = {}) {
  const state = operatorSourceStates[source];
  if (!state || state.operators.length === 0) {
    return false;
  }

  activeOperatorSource.value = source;
  saveActiveOperatorSource(source);
  ownedOperators.value = normalizeOwnedOperators(state.operators);
  ownedOperatorSource.value = getOperatorSourceLabel(source);
  ownedOperatorMessage.value = `已读取 ${ownedOperators.value.length} 名持有干员`;
  ownedOperatorLastSyncedAt.value = state.importedAt || "";
  ownedOperatorError.value = state.error || "";

  if (notify) {
    cMessage(
      `${getOperatorSourceLabel(source)}数据已切换，共 ${ownedOperators.value.length} 名持有干员`,
    );
  }

  return true;
}

function clearActiveOperatorSource() {
  activeOperatorSource.value = "";
  ownedOperators.value = [];
  ownedOperatorSource.value = "";
  ownedOperatorMessage.value = "尚未读取到本站可用的持有干员数据";
  ownedOperatorLastSyncedAt.value = "";
}

function readSklandOperatorsFromSession() {
  const accountData = readSklandAccountFromSession();
  return normalizeOwnedOperators(accountData?.operatorDataList || [], true);
}

async function loadSklandOperatorSource() {
  const state = operatorSourceStates.skland;
  state.loading = true;
  state.error = "";

  try {
    const sklandAccountData = readSklandAccountFromSession();
    const sklandOperators = readSklandOperatorsFromSession();

    if (sklandOperators.length > 0) {
      state.operators = sklandOperators;
      state.importedAt = sklandAccountData?.importedAt || "";
      return;
    }

    if (isUserLoggedIn.value) {
      const response = await operatorDataAPI.getOperatorData();
      const surveyOperators = normalizeOwnedOperators(
        response?.data || [],
        true,
      );

      if (surveyOperators.length > 0) {
        state.operators = surveyOperators;
        state.importedAt = "";
        return;
      }
    }

    state.operators = [];
    state.importedAt = "";
  } catch (error) {
    console.error("loadSklandOperatorSource failed", error);
    state.error = "森空岛数据读取失败";
  } finally {
    state.loading = false;
  }
}

async function loadOwnedOperators({ notify = false } = {}) {
  loadingOwnedOperators.value = true;
  ownedOperatorError.value = "";

  try {
    const previousSource = activeOperatorSource.value;
    await loadSklandOperatorSource();
    loadStoredMaaOperatorSource();

    const savedSource = readSavedOperatorSource();
    const preferredSources = [
      savedSource,
      previousSource,
      OPERATOR_SOURCE_KEYS.skland,
      OPERATOR_SOURCE_KEYS.maa,
    ];
    const nextSource = preferredSources.find(
      (source, index) =>
        source &&
        preferredSources.indexOf(source) === index &&
        operatorSourceStates[source]?.operators?.length > 0,
    );

    if (nextSource) {
      setActiveOperatorSource(nextSource);
      if (notify) {
        cMessage(ownedOperatorMessage.value);
      }
    } else {
      clearActiveOperatorSource();
    }
  } catch (error) {
    console.error("loadOwnedOperators failed", error);
    ownedOperators.value = [];
    ownedOperatorLastSyncedAt.value = "";
    ownedOperatorError.value = "持有干员数据读取失败，请稍后重试";
  } finally {
    loadingOwnedOperators.value = false;
  }
}

function openSklandImport() {
  router.push({
    name: "OperatorSurvey",
    query: {
      openImport: "1",
    },
  });
}

function openMaaUpload() {
  maaFileInput.value?.click();
}

function handleOperatorSourceButton(source) {
  const state = operatorSourceStates[source];
  if (state?.operators?.length > 0) {
    setActiveOperatorSource(source, { notify: true });
    return;
  }

  if (source === OPERATOR_SOURCE_KEYS.maa) {
    openMaaUpload();
    return;
  }

  openSklandImport();
}

async function handleMaaFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  const state = operatorSourceStates.maa;
  state.loading = true;
  state.error = "";

  try {
    const payload = JSON.parse(await file.text());
    const parsed = parseRiicMaaOperatorBox(payload, operatorTableV2);

    if (parsed.operators.length === 0) {
      throw new Error("MAA JSON 中没有找到已持有干员");
    }

    const snapshot = {
      schemaVersion: 1,
      importedAt: new Date().toISOString(),
      fileName: file.name,
      operators: parsed.operators,
      warnings: parsed.warnings,
    };

    localStorage.setItem(
      RIIC_MAA_OPERATOR_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
    state.operators = snapshot.operators;
    state.importedAt = snapshot.importedAt;
    state.fileName = snapshot.fileName;
    state.warnings = snapshot.warnings;
    setActiveOperatorSource(OPERATOR_SOURCE_KEYS.maa);

    const warningSuffix = parsed.warnings.length
      ? `，另有 ${parsed.warnings.length} 条提示`
      : "";
    cMessage(
      `maa数据已上传，共 ${parsed.operators.length} 名持有干员${warningSuffix}`,
      parsed.warnings.length ? "warn" : "success",
    );
  } catch (error) {
    console.error("handleMaaFileChange failed", error);
    state.error = error?.message || "MAA JSON 读取失败";
    cMessage(state.error, "error");
  } finally {
    state.loading = false;
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

function getGeneratedScheduleExportFileBase() {
  const layout = confirmedLayoutPlan.value?.cardKey || "基建";
  const shift =
    {
      once: "一天一换",
      twice: "一天两换",
      threeTimes: "一天三换",
    }[confirmedLayoutPlan.value?.shiftMode] || "排班";
  return `一图流-${layout}-${shift}`;
}

async function exportGeneratedScheduleImage() {
  if (!schedulePreviewCapturePanel.value || !riicSchedulePreview.value) {
    cMessage("当前没有可导出的排班表", "warn");
    return;
  }

  exportingImage.value = true;

  try {
    await document.fonts?.ready;
    const { default: html2canvas } = await import("html2canvas");
    const isDark = document.documentElement.classList.contains("dark");
    const captureWidth = Math.max(
      schedulePreviewCapturePanel.value.scrollWidth,
      720,
    );
    const canvas = await html2canvas(schedulePreviewCapturePanel.value, {
      backgroundColor: isDark ? "#17191d" : "#ffffff",
      scale: 2,
      useCORS: true,
      width: captureWidth,
      windowWidth: captureWidth,
      onclone(clonedDocument) {
        const clonedPanel = clonedDocument.querySelector(
          "[data-riic-preview-capture]",
        );
        if (clonedPanel) {
          clonedPanel.style.width = `${captureWidth}px`;
          clonedPanel.style.maxWidth = "none";
        }
      },
    });
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    if (!blob) {
      throw new Error("Failed to create schedule image");
    }

    saveAs(blob, `${getGeneratedScheduleExportFileBase()}.png`);
    cMessage("排班表图片已导出");
  } catch (error) {
    console.error(error);
    cMessage("图片导出失败，请稍后重试", "error");
  } finally {
    exportingImage.value = false;
  }
}

function exportGeneratedMaaSchedule() {
  if (!generatedMaaExportPreview.value) {
    cMessage("当前没有可导出的 MAA 排班", "warn");
    return;
  }

  exportingMaa.value = true;

  try {
    const blob = new Blob(
      [JSON.stringify(generatedMaaExportPreview.value.schedule, null, 2)],
      { type: "application/json;charset=utf-8" },
    );
    saveAs(blob, `${getGeneratedScheduleExportFileBase()}-MAA.json`);
    cMessage(
      generatedMaaExportPreview.value.warnings.length
        ? "MAA 排班已导出，请查看转换提示"
        : "MAA 排班已导出",
      generatedMaaExportPreview.value.warnings.length ? "warn" : "success",
    );
  } catch (error) {
    console.error(error);
    cMessage("MAA 排班导出失败，请稍后重试", "error");
  } finally {
    exportingMaa.value = false;
  }
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
    twoShiftRotationMode,
    scheduleGenerationMode,
    treatUnderleveledOperatorsAsQualified,
    selectedRoomGroupTeamCandidateKeys,
    () =>
      scheduleExecutionSettings.shifts
        .map((shift) => `${shift.name}|${shift.time}`)
        .join("||"),
    () => scheduleExecutionSettings.droneTarget,
    () => scheduleExecutionSettings.droneTargetPinned,
    scheduleRoomOperatorOverrides,
    scheduleRoomProductOverrides,
    invalidatedScheduleRoomKeys,
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
      <section
        class="workflow-stage workflow-card layout-workflow-stage"
        :class="{ collapsed: layoutStageCollapsed }"
      >
        <header class="workflow-card-heading">
          <div class="workflow-card-heading-copy">
            <h2>布局规划</h2>
            <span>
              {{
                layoutStageCollapsed
                  ? layoutPlanSummary
                  : "选择适合自己的布局与换班方式"
              }}
            </span>
          </div>
          <button
            v-if="layoutStageCollapsed"
            type="button"
            class="layout-stage-expand"
            @click="expandLayoutStage"
          >
            调整布局
          </button>
        </header>

        <section
          v-if="!layoutStageCollapsed"
          ref="contentPanel"
          class="layout-choice-panel"
        >
          <section
            class="recommendation-entry-panel"
            :class="{ expanded: recommendationPanelOpen }"
          >
              <button
                type="button"
                class="recommendation-entry-action"
                :aria-expanded="recommendationPanelOpen"
                @click="toggleRecommendationPanel"
              >
                <span>不知道选什么，帮我推荐</span>
                <v-icon
                  :icon="
                    recommendationPanelOpen
                      ? 'mdi-chevron-up'
                      : 'mdi-chevron-down'
                  "
                  size="18"
                ></v-icon>
              </button>

              <div
                v-if="recommendationPanelOpen"
                class="recommendation-step-tabs"
              >
                <div
                  class="recommendation-step-tab-list"
                  role="tablist"
                  aria-label="布局推荐问卷"
                >
                  <button
                    v-for="(step, index) in steps"
                    :key="step.key"
                    type="button"
                    class="recommendation-step-tab"
                    :class="{
                      active: currentStep === index,
                      complete: isStepComplete(step),
                    }"
                    role="tab"
                    :aria-selected="currentStep === index"
                    @click="selectRecommendationStep(index)"
                  >
                    <v-icon
                      :icon="
                        isStepComplete(step)
                          ? 'mdi-check-circle'
                          : 'mdi-alert-circle-outline'
                      "
                      size="16"
                    ></v-icon>
                    <span>{{ step.label }}</span>
                  </button>
                </div>
              </div>

              <transition name="recommendation-panel">
                <section
                  v-if="recommendationPanelOpen && activeStep"
                  class="recommendation-question-panel"
                >
                  <div
                    class="recommendation-question-fields"
                    :class="`question-fields-${activeStep.key}`"
                  >
                    <fieldset
                      v-for="field in activeStep.fields"
                      :key="field.key"
                      class="recommendation-field"
                      :class="`field-${field.layout}`"
                    >
                      <legend>{{ field.label }}</legend>
                      <el-radio-group
                        v-model="answers[field.key]"
                        class="recommendation-answer-group"
                        :class="[
                          `answer-group-${field.layout}`,
                          { compact: field.options.length <= 2 },
                        ]"
                        :aria-label="field.label"
                      >
                        <el-radio
                          v-for="option in field.options"
                          :key="option.value"
                          :label="option.value"
                          class="recommendation-answer"
                          :class="`tone-${option.tone}`"
                        >
                          <span class="recommendation-answer-content">
                            <v-icon :icon="option.icon" size="18"></v-icon>
                            <span class="recommendation-answer-copy">
                              <strong>{{ option.label }}</strong>
                              <small v-if="option.description">
                                {{ option.description }}
                              </small>
                            </span>
                          </span>
                        </el-radio>
                      </el-radio-group>
                    </fieldset>
                  </div>

                </section>
              </transition>

              <section
                v-if="
                  layoutEntry === 'recommend' &&
                  recommendation
                "
                class="recommendation-result-panel"
              >
                <div class="recommendation-result-head">
                  <span class="recommendation-result-label">推荐布局</span>
                  <div class="recommendation-result-summary">
                    <strong>
                      {{ recommendationCard?.label || recommendation.layout.shortName }}
                    </strong>
                    <small>
                      {{ recommendationCard?.description || "" }}
                      · {{ recommendation.requestedShiftMode.shortName }}
                    </small>
                  </div>
                  <button
                    type="button"
                    class="recommendation-result-reset"
                    title="重置问卷"
                    aria-label="重置问卷并清除所有已填写选项"
                    @click="resetRecommendationAnswers"
                  >
                    <v-icon icon="mdi-restart" size="16"></v-icon>
                    <span>重置</span>
                  </button>
                </div>
                <p class="recommendation-result-reason">
                  {{ recommendation.layoutReason }}
                </p>
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
                        `layout-${option.key}`,
                        {
                          selected: selectedManualScheduleValue === option.value,
                          recommended:
                            layoutEntry === 'recommend' &&
                            isLayoutRecommended(option),
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
                        <span class="layout-choice-icons">
                          <v-icon :icon="option.icon" size="19"></v-icon>
                          <v-icon
                            v-if="option.secondaryIcon"
                            :icon="option.secondaryIcon"
                            size="19"
                          ></v-icon>
                        </span>
                      </span>
                      <span class="layout-choice-rooms">
                        <template
                          v-for="room in option.rooms"
                          :key="room.key"
                        >
                          <span
                            v-if="room.count"
                            class="layout-choice-resource"
                            :class="
                              `facility-${getLayoutRoomFacility(room)}`
                            "
                          >
                            {{ room.count }} {{ room.label }}
                          </span>
                        </template>
                      </span>
                    </button>
                  </div>
                </section>
              </div>

        </section>

        <section
          v-if="showLegacyScheduleReference"
          ref="contentPanel"
          class="result-panel"
        >
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
        <div class="workflow-card-heading">
          <h2>排班表生成</h2>
          <span>按房间组准备排班候选</span>
        </div>
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
              <span
                v-if="isLayoutPlanningReady"
                class="schedule-status-detail-lines"
              >
                <span
                  v-for="line in layoutPlanSummaryLines"
                  :key="line"
                >
                  {{ line }}
                </span>
              </span>
              <span v-else>{{ layoutSelectionStatus.detail }}</span>
            </div>
          </section>

          <input
            ref="maaFileInput"
            class="operator-source-file-input"
            type="file"
            accept=".json,application/json"
            @change="handleMaaFileChange"
          />

          <div class="operator-source-choice-grid">
            <div class="operator-source-choice">
              <button
                type="button"
                class="sync-source-action"
                :class="{ active: sklandOperatorSourceStatus.active }"
                :aria-pressed="sklandOperatorSourceStatus.active"
                :disabled="operatorSourceStates.skland.loading"
                @click="
                  handleOperatorSourceButton(OPERATOR_SOURCE_KEYS.skland)
                "
              >
                <span class="operator-source-action-head">
                  <v-icon icon="mdi-cloud-sync-outline" size="22"></v-icon>
                  <v-icon
                    v-if="sklandOperatorSourceStatus.active"
                    class="operator-source-selected-mark"
                    icon="mdi-check-circle"
                    size="18"
                  ></v-icon>
                </span>
                <span>{{ sklandOperatorSourceStatus.title }}</span>
                <small>{{ sklandOperatorSourceStatus.detail }}</small>
              </button>
              <button
                v-if="sklandOperatorSourceStatus.available"
                type="button"
                class="operator-source-text-action"
                :disabled="operatorSourceStates.skland.loading"
                @click="openSklandImport"
              >
                重新同步
              </button>
            </div>

            <div class="operator-source-choice">
              <button
                type="button"
                class="sync-source-action"
                :class="{ active: maaOperatorSourceStatus.active }"
                :aria-pressed="maaOperatorSourceStatus.active"
                :disabled="operatorSourceStates.maa.loading"
                @click="
                  handleOperatorSourceButton(OPERATOR_SOURCE_KEYS.maa)
                "
              >
                <span class="operator-source-action-head">
                  <v-icon icon="mdi-robot-outline" size="22"></v-icon>
                  <v-icon
                    v-if="maaOperatorSourceStatus.active"
                    class="operator-source-selected-mark"
                    icon="mdi-check-circle"
                    size="18"
                  ></v-icon>
                </span>
                <span>{{ maaOperatorSourceStatus.title }}</span>
                <small>{{ maaOperatorSourceStatus.detail }}</small>
              </button>
              <button
                v-if="maaOperatorSourceStatus.available"
                type="button"
                class="operator-source-text-action"
                :disabled="operatorSourceStates.maa.loading"
                @click="openMaaUpload"
              >
                {{ maaOperatorSourceStatus.available ? "重新上传" : "上传" }}
              </button>
            </div>
          </div>

          <label class="operator-training-mode">
            <span>练度不达标的干员视为达标</span>
            <el-switch
              :model-value="treatUnderleveledOperatorsAsQualified"
              :disabled="ownedOperators.length === 0"
              @update:model-value="setTreatUnderleveledOperatorsAsQualified"
            ></el-switch>
          </label>

          <section class="schedule-generation-mode" aria-label="排班生成方式">
            <span>生成方式</span>
            <div>
              <button
                type="button"
                :class="{ active: scheduleGenerationMode === 'auto' }"
                :aria-pressed="scheduleGenerationMode === 'auto'"
                @click="selectScheduleGenerationMode('auto')"
              >
                全自动生成
              </button>
              <button
                type="button"
                :class="{ active: scheduleGenerationMode === 'guided' }"
                :aria-pressed="scheduleGenerationMode === 'guided'"
                @click="selectScheduleGenerationMode('guided')"
              >
                半自动引导式生成
              </button>
            </div>
          </section>
        </div>

        <section v-if="isLayoutPlanningReady" class="room-workbench">
          <section
            v-if="confirmedLayoutPlan?.shiftMode === 'twice'"
            class="facility-profile-switch two-shift-rotation-switch"
            aria-label="一天两换模式"
          >
            <span class="facility-profile-label">一天两换</span>
            <div class="facility-profile-options">
              <button
                type="button"
                class="facility-profile-option"
                :class="{ active: twoShiftRotationMode === 'maa' }"
                :aria-pressed="twoShiftRotationMode === 'maa'"
                @click="selectTwoShiftRotationMode('maa')"
              >
                MAA 两班轮换
              </button>
              <button
                type="button"
                class="facility-profile-option"
                :class="{ active: twoShiftRotationMode === 'manual' }"
                :aria-pressed="twoShiftRotationMode === 'manual'"
                @click="selectTwoShiftRotationMode('manual')"
              >
                手动三班轮换
              </button>
            </div>
            <span class="facility-profile-note">
              {{
                twoShiftRotationMode === "maa"
                  ? "每座生产站需两套完整班组"
                  : "可用三班交错轮换"
              }}
            </span>
          </section>

          <section
            v-if="is252LayoutPlan"
            class="facility-profile-switch"
            aria-label="252 设施状态"
          >
            <span class="facility-profile-label">252 设施状态</span>
            <div class="facility-profile-options">
              <button
                type="button"
                class="facility-profile-option"
                :class="{ active: activeFacilityRequirement === 'rightFull' }"
                :aria-pressed="activeFacilityRequirement === 'rightFull'"
                @click="selectFacilityRequirement('rightFull')"
              >
                右满 · {{ RIIC_FACILITY_REQUIREMENTS.rightFull.productionSlots }} 位
              </button>
              <button
                type="button"
                class="facility-profile-option"
                :class="{ active: activeFacilityRequirement === 'fullBlood' }"
                :aria-pressed="activeFacilityRequirement === 'fullBlood'"
                @click="selectFacilityRequirement('fullBlood')"
              >
                满血 · {{ RIIC_FACILITY_REQUIREMENTS.fullBlood.productionSlots }} 位
              </button>
            </div>
            <span class="facility-profile-note">影响下方房间可进驻人数</span>
          </section>

          <section
            v-if="scheduleGenerationMode === 'auto'"
            class="automatic-schedule-generation"
          >
            <button
              type="button"
              :disabled="!riicMatchingRoster || autoGeneratingSchedule"
              @click="generateAutomaticSchedule"
            >
              {{ autoGeneratingSchedule ? "生成中" : "自动生成排班表" }}
            </button>
          </section>

          <div
            v-if="scheduleGenerationMode === 'guided'"
            class="room-group-selection-layout"
          >
            <aside class="room-group-progress" aria-label="房间组填写进度">
              <strong class="room-group-progress-heading">填写进度</strong>
              <button
                v-for="item in roomGroupProgressItems"
                :key="item.group.id"
                type="button"
                class="room-group-progress-item"
                :class="[
                  `tone-${item.tone}`,
                  {
                    active:
                      activeScheduleRoomGroup?.id === item.group.id,
                  },
                ]"
                :aria-pressed="
                  activeScheduleRoomGroup?.id === item.group.id
                "
                @click="activeScheduleRoomGroupKey = item.group.id"
              >
                <span class="room-group-progress-label">
                  <v-icon :icon="item.group.icon" size="16"></v-icon>
                  <span>{{ item.group.label }}</span>
                </span>
                <small>{{ item.label }}</small>
              </button>
            </aside>

            <div class="room-group-schematic">
              <header class="room-workbench-heading">
                <div>
                  <strong>房间组</strong>
                </div>
                <span class="room-layout-summary">
                  {{ layoutPlanSummary }}
                </span>
              </header>

              <div class="room-group-rows" aria-label="房间组列表">
                <div
                  v-for="row in roomGroupSelectionRows"
                  :key="row.id"
                  class="room-group-row"
                  :class="`room-group-row-${row.id}`"
                >
                  <button
                    v-for="group in row.groups"
                    :key="group.id"
                    type="button"
                    class="room-group-tile"
                    :class="[
                      `tone-${group.tone}`,
                      { active: activeScheduleRoomGroup?.id === group.id },
                      { 'width-double': group.width === 2 },
                    ]"
                    :aria-pressed="activeScheduleRoomGroup?.id === group.id"
                    @click="activeScheduleRoomGroupKey = group.id"
                  >
                    <span class="room-group-tile-title">
                      <v-icon :icon="group.icon" size="20"></v-icon>
                      <strong>{{ group.label }}</strong>
                      <v-icon
                        v-if="getRoomGroupCandidateStatus(group)"
                        class="room-group-status-icon"
                        :class="`tone-${getRoomGroupCandidateStatus(group).tone}`"
                        :icon="getRoomGroupCandidateStatus(group).icon"
                        :title="getRoomGroupCandidateStatus(group).title"
                        size="15"
                      ></v-icon>
                    </span>
                    <span class="room-group-count">
                      <i
                        v-for="index in group.count"
                        :key="index"
                        aria-hidden="true"
                      ></i>
                      <small>
                        <template v-if="group.stationLevelSummary">
                          {{ group.stationLevelSummary }}
                        </template>
                      </small>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <section
            v-if="
              scheduleGenerationMode === 'guided' &&
              activeScheduleRoomGroup
            "
            ref="roomEditorPanel"
            class="room-editor-panel"
          >
            <header class="room-editor-panel-heading">
              <div>
                <v-icon
                  :icon="activeScheduleRoomGroup.icon"
                  size="20"
                ></v-icon>
                <div>
                  <strong>{{ activeScheduleRoomGroup.label }}</strong>
                  <span>
                    {{ activeScheduleRoomGroup.count }} 座{{
                      activeScheduleRoomGroup.facilityLabel
                    }}
                  </span>
                </div>
              </div>
              <span>
                {{
                  activeScheduleRoomGroup.rotationRequired
                    ? "按选定频率自动轮换"
                    : "暂不参与轮换"
                }}
              </span>
            </header>
            <div
              v-if="activeScheduleRoomGroup.automaticScheduling"
              class="control-rotation-panel"
            >
              <div
                v-if="controlAutoRotationPlan.status === 'requiresOperators'"
                class="room-editor-empty"
              >
                <span>同步干员数据后即可自动安排控制中枢两班。</span>
              </div>
              <div
                v-else-if="controlAutoRotationPlan.status === 'insufficient'"
                class="room-editor-empty"
              >
                <span>
                  已使用所有可用的优先干员与普通值班干员，仍缺
                  {{ controlAutoRotationPlan.missingSlotCount }} 人。
                </span>
              </div>
              <template v-else>
                <div class="control-rotation-summary">
                  <span>控制中枢排班自动生成，可于导出阶段手动调整</span>
                </div>
                <div class="control-rotation-shifts">
                  <section
                    v-for="shift in controlAutoRotationPlan.shifts"
                    :key="shift.id"
                    class="control-rotation-shift"
                  >
                    <div class="room-staffing-candidate-main">
                      <div class="room-staffing-candidate-team">
                        <span class="room-staffing-candidate-name">
                          {{ shift.label }}
                        </span>
                        <div class="room-staffing-candidate-avatars">
                          <div
                            v-for="operator in shift.operators"
                            :key="operator.charId"
                            class="control-rotation-operator"
                            :title="`${operator.name}：${operator.reason}`"
                          >
                            <OperatorAvatar
                              :char-id="operator.charId"
                              :rarity="
                                operatorTableV2?.[operator.charId]?.rarity || 1
                              "
                              :size="32"
                              :mobile-size="30"
                              border
                            ></OperatorAvatar>
                          </div>
                        </div>
                      </div>
                      <div class="room-staffing-candidate-details">
                        <strong
                          v-for="metric in getControlShiftEffectMetrics(shift)"
                          :key="metric.facility"
                          class="room-staffing-candidate-metric"
                          :class="`facility-${metric.facility}`"
                        >
                          {{ formatRoomGroupBonusPercent(metric.bonus) }}
                        </strong>
                      </div>
                    </div>
                  </section>
                </div>
              </template>
            </div>

            <div
              v-else-if="activeRoomGroupCandidateState.status === 'outOfScope'"
              class="room-editor-empty"
            >
              <span v-if="activeScheduleRoomGroup.stationSlotSummary">
                每站可进驻：{{ activeScheduleRoomGroup.stationSlotSummary }} 位
              </span>
              <span>该设施不参与排班表生成，可在导出阶段手动调整</span>
            </div>

            <div
              v-else-if="
                activeRoomGroupCandidateState.status === 'requiresOperators'
              "
              class="room-editor-empty"
            >
              <span>同步干员数据后，即可按已拥有干员生成候选班组</span>
            </div>

            <div
              v-else-if="
                activeRoomGroupCandidateState.status === 'catalogLoading'
              "
              class="room-editor-empty"
            >
              <span>正在载入该设施组的固定候选列表</span>
            </div>

            <div
              v-else-if="
                activeRoomGroupCandidateState.status === 'catalogLoadFailed'
              "
              class="room-editor-empty"
            >
              <span>
                固定候选列表载入失败{{
                  activeRoomGroupCandidateState.catalogErrors?.length
                    ? `：${activeRoomGroupCandidateState.catalogErrors.join("；")}`
                    : ""
                }}
              </span>
              <button
                type="button"
                class="room-staffing-load-more"
                @click="retryActiveRoomGroupCatalogLoad"
              >
                重新载入
              </button>
            </div>

            <div
              v-else-if="
                activeRoomGroupCandidateState.status === 'missingCapacity' ||
                activeRoomGroupCandidateState.status === 'missingFallbackPreset'
              "
              class="room-editor-empty"
            >
              <span>当前房间组的容量或固定候选数据尚未配置</span>
            </div>

            <div
              v-else-if="activeRoomGroupCandidateState.status === 'ready'"
              class="room-staffing-results"
            >
              <section
                v-for="cohort in visibleActiveRoomGroupStaffingCohorts"
                :key="cohort.id"
                class="room-staffing-cohort"
              >
                <header class="room-staffing-cohort-heading">
                  <strong>
                    Lv.{{ cohort.stationLevel }} ·
                    {{
                      cohort.selectionMode === "individual"
                        ? "单人候选"
                        : `${cohort.slotCount} 人班组`
                    }}
                  </strong>
                  <span
                    class="room-staffing-progress"
                    :class="{
                      complete: isRoomGroupCohortComplete(
                        activeScheduleRoomGroup,
                        cohort,
                      ),
                    }"
                  >
                    {{
                      getSelectedTeamCandidateCount(
                        activeScheduleRoomGroup,
                        cohort,
                      )
                    }}/{{ cohort.teamCount }}
                  </span>
                </header>

                <div class="room-staffing-candidate-list">
                  <button
                    v-for="candidate in cohort.displayCandidates"
                    :key="candidate.key"
                    type="button"
                    class="room-staffing-candidate"
                    :class="{
                      selected:
                        getSelectedRoomCandidateCount(
                          activeScheduleRoomGroup,
                          cohort,
                          candidate.key,
                        ) > 0,
                      unavailable:
                        !canToggleRoomGroupTeamCandidate(
                          activeScheduleRoomGroup,
                          cohort,
                          candidate,
                        ) &&
                        getSelectedRoomCandidateCount(
                          activeScheduleRoomGroup,
                          cohort,
                          candidate.key,
                        ) === 0,
                    }"
                    :aria-pressed="
                      getSelectedRoomCandidateCount(
                        activeScheduleRoomGroup,
                        cohort,
                        candidate.key,
                      ) > 0
                    "
                    :title="
                      getRoomGroupCandidateTooltip(
                        activeScheduleRoomGroup,
                        cohort,
                        candidate,
                      )
                    "
                    :disabled="
                      !canToggleRoomGroupTeamCandidate(
                        activeScheduleRoomGroup,
                        cohort,
                        candidate,
                      )
                    "
                    @click="
                      toggleRoomGroupTeamCandidate({
                        group: activeScheduleRoomGroup,
                        cohort,
                        candidate,
                      })
                    "
                  >
                    <div class="room-staffing-candidate-main">
                      <div class="room-staffing-candidate-team">
                        <strong
                          class="room-staffing-candidate-name"
                          :title="candidate.name"
                        >
                          {{ candidate.name }}
                        </strong>
                        <div class="room-staffing-candidate-avatars">
                          <OperatorAvatar
                            v-for="charId in candidate.operatorIds"
                            :key="charId"
                            :char-id="charId"
                            :rarity="
                              operatorTableV2?.[charId]?.rarity || 1
                            "
                            :size="32"
                            :mobile-size="30"
                            border
                          ></OperatorAvatar>
                          <span
                            v-for="index in candidate.fallback.count"
                            :key="`fallback-${index}`"
                            class="room-staffing-candidate-placeholder"
                          >
                            <v-icon
                              icon="mdi-account-outline"
                              size="22"
                            ></v-icon>
                          </span>
                        </div>
                      </div>
                      <div class="room-staffing-candidate-details">
                        <div
                          v-for="metric in getRoomGroupCandidateMetrics(
                            candidate,
                          )"
                          :key="metric.facility"
                          class="room-staffing-candidate-detail"
                        >
                          <strong
                            class="room-staffing-candidate-metric"
                            :class="`facility-${metric.facility}`"
                          >
                            {{
                              `${metric.label} ${formatRoomGroupBonusPercent(
                                metric.bonus,
                              )}`
                            }}
                          </strong>
                        </div>
                        <div
                          v-if="candidate.fallback.count > 0"
                          class="room-staffing-candidate-detail fallback"
                        >
                          <strong>补位 ×{{ candidate.fallback.count }}</strong>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
                <div
                  v-if="cohort.hasMoreCandidates"
                  class="room-staffing-candidate-actions"
                >
                  <button
                    type="button"
                    class="room-staffing-load-more"
                    @click="
                      showMoreRoomGroupCandidates(
                        activeScheduleRoomGroup,
                        cohort,
                      )
                    "
                  >
                    加载更多（剩余
                    {{
                      cohort.availableCandidateCount -
                      cohort.displayCandidates.length
                    }}
                    组）
                  </button>
                </div>
              </section>

              <section
                v-if="
                  getRoomGroupSelectionProgress(activeScheduleRoomGroup)
                    .complete &&
                  activeRoomGroupFallbackPlan &&
                  activeRoomGroupFallbackPlan.pendingCount > 0
                "
                class="room-fallback-stage"
              >
                <header class="room-fallback-heading">
                  <strong>补位</strong>
                  <span>
                    {{ activeRoomGroupFallbackPlan.selectedCount }}/{{
                      activeRoomGroupFallbackPlan.pendingCount
                    }}
                  </span>
                </header>
                <div class="room-fallback-operator-list">
                  <div
                    v-for="operator in activeRoomGroupFallbackPlan.highEfficiencyOperators"
                    :key="`high-${operator.charId}`"
                    class="room-fallback-operator"
                    :class="getRoomFallbackOperatorClasses(operator)"
                    :title="getRoomFallbackOperatorTitle(operator)"
                  >
                    <OperatorAvatar
                      :char-id="operator.charId"
                      :rarity="operatorTableV2?.[operator.charId]?.rarity || 1"
                      :size="34"
                      :mobile-size="32"
                      border
                    ></OperatorAvatar>
                    <span>{{ operator.percent }}%</span>
                  </div>
                </div>
                <div
                  v-if="activeRoomGroupFallbackPlan.selectedBasicOperators.length"
                  class="room-fallback-basic-list"
                >
                  <span>基础</span>
                  <div class="room-fallback-operator-list">
                    <div
                      v-for="operator in activeRoomGroupFallbackPlan.selectedBasicOperators"
                      :key="`basic-${operator.charId}`"
                      class="room-fallback-operator basic"
                      :class="getRoomFallbackOperatorClasses(operator)"
                      :title="getRoomFallbackOperatorTitle(operator)"
                    >
                      <OperatorAvatar
                        :char-id="operator.charId"
                        :rarity="
                          operatorTableV2?.[operator.charId]?.rarity || 1
                        "
                        :size="34"
                        :mobile-size="32"
                        border
                      ></OperatorAvatar>
                      <span>{{ operator.percent }}%</span>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            <div v-else class="room-editor-empty">
              <span>选择生产设施房间组后，即可查看候选班组</span>
            </div>
          </section>

          <section
            class="assembled-schedule-panel"
            :class="`state-${assembledScheduleCandidateState.status}`"
          >
            <div
              v-if="
                assembledScheduleCandidateState.status === 'ready' &&
                riicSchedulePreview
              "
              class="assembled-schedule-content"
            >
              <div
                ref="schedulePreviewCapturePanel"
                class="schedule-preview-capture"
                data-riic-preview-capture
              >
                <RiicSchedulePreview
                  :preview="riicSchedulePreview"
                  :active-state-index="activeSchedulePreviewStateIndex"
                  :operator-table="operatorTableV2"
                  :selected-room-key="selectedSchedulePreviewRoomKey"
                  :shifts="schedulePreviewShifts"
                  @update:active-state-index="
                    activeSchedulePreviewStateIndex = $event
                  "
                  @update:shift="updateSchedulePreviewShift"
                  @edit-room="selectSchedulePreviewRoom"
                ></RiicSchedulePreview>
              </div>
              <section
                v-if="scheduleTrainingRequirements.length"
                class="schedule-training-requirements"
              >
                <strong>需培养干员</strong>
                <div>
                  <span
                    v-for="requirement in scheduleTrainingRequirements"
                    :key="requirement.charId"
                  >
                    <OperatorAvatar
                      :char-id="requirement.charId"
                      :rarity="
                        operatorTableV2?.[requirement.charId]?.rarity || 1
                      "
                      :size="26"
                      :mobile-size="24"
                      border
                    ></OperatorAvatar>
                    <small>{{ requirement.name }}</small>
                    <em>{{ formatTrainingRequirement(requirement) }}</em>
                  </span>
                </div>
              </section>
              <section
                v-if="activeSchedulePreviewRoom"
                class="schedule-room-editor-panel"
              >
                <header>
                  <div>
                    <strong>{{ activeSchedulePreviewRoom.label }}</strong>
                    <span>
                      {{
                        schedulePreviewShifts[
                          activeSchedulePreviewStateIndex
                        ]?.name || "当前班次"
                      }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="schedule-room-editor-reset"
                    @click="resetSchedulePreviewRoom"
                  >
                    恢复自动安排
                  </button>
                </header>

                <label
                  v-if="scheduleRoomEditorProductOptions.length"
                  class="schedule-room-product-field"
                >
                  <span>产物</span>
                  <select
                    :value="activeSchedulePreviewRoom.product"
                    @change="changeScheduleRoomProduct($event.target.value)"
                  >
                    <option
                      v-for="option in scheduleRoomEditorProductOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <div class="schedule-room-editor-operators">
                  <span v-if="scheduleRoomEditorOperators.length === 0">
                    暂未指定干员
                  </span>
                  <button
                    v-for="operator in scheduleRoomEditorOperators"
                    :key="getScheduleRoomEditorOperatorKey(operator)"
                    type="button"
                    class="schedule-room-editor-operator"
                    :title="`移除 ${operator.name}`"
                    @click="removeScheduleRoomEditorOperator(operator)"
                  >
                    <OperatorAvatar
                      v-if="operator.known"
                      :char-id="operator.charId"
                      :rarity="operator.rarity"
                      :size="34"
                      :mobile-size="32"
                      border
                    ></OperatorAvatar>
                    <span v-else class="schedule-room-editor-manual-name">
                      {{ operator.name }}
                    </span>
                    <v-icon icon="mdi-close" size="13"></v-icon>
                  </button>
                </div>

                <div class="schedule-room-editor-add">
                  <input
                    v-model="scheduleRoomEditorOperatorInput"
                    list="riic-schedule-room-operator-options"
                    placeholder="输入干员名"
                    @keydown.enter.prevent="addScheduleRoomEditorOperator"
                  />
                  <datalist id="riic-schedule-room-operator-options">
                    <option
                      v-for="operator in scheduleRoomEditorOperatorOptions"
                      :key="operator.charId"
                      :value="operator.name"
                    ></option>
                  </datalist>
                  <button
                    type="button"
                    :disabled="!scheduleRoomEditorInputName"
                    @click="addScheduleRoomEditorOperator"
                  >
                    添加
                  </button>
                </div>
                <p
                  v-if="scheduleRoomEditorInputUnmatched"
                  class="schedule-room-editor-input-warning"
                >
                  未在当前干员数据库中匹配到，可能是数据库尚未更新；仍可按输入名称加入。
                </p>
              </section>

              <section class="schedule-drone-setting">
                <div>
                  <strong>无人机投向</strong>
                  <span v-if="scheduleExecutionDroneLabel">
                    {{ scheduleExecutionDroneLabel }}
                  </span>
                </div>
                <div class="schedule-drone-setting-actions">
                  <select
                    :value="scheduleExecutionSettings.droneTarget"
                    @change="selectScheduleDroneTarget($event.target.value)"
                  >
                    <option
                      v-for="option in scheduleDroneTargetOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <span
                    v-if="scheduleExecutionSettings.droneTargetPinned"
                    class="schedule-drone-manual-state"
                  >
                    已手动指定
                  </span>
                  <button
                    v-if="scheduleExecutionSettings.droneTargetPinned"
                    type="button"
                    @click="restoreAutomaticScheduleDroneTarget"
                  >
                    自动选择
                  </button>
                </div>
              </section>
            </div>

            <p v-else class="assembled-schedule-empty">
              {{ getAssembledCandidateBlockedMessage(assembledScheduleCandidateState) }}
            </p>
          </section>
        </section>

        <p v-else class="schedule-generation-empty-state">
          选择布局后即可生成排班表
        </p>
      </section>

      <section class="workflow-stage workflow-card schedule-output-stage">
        <div class="workflow-card-heading">
          <h2>排班表输出</h2>
          <span>导出当前排班表</span>
        </div>
        <div
          v-if="
            assembledScheduleCandidateState.status === 'ready' &&
            riicSchedulePreview &&
            generatedMaaExportPreview
          "
          class="schedule-output-ready"
        >
          <div class="schedule-output-summary">
            <strong>排班表已生成</strong>
            <span>
              {{ schedulePreviewShifts.length }} 个班次
              <template v-if="scheduleExecutionDroneLabel">
                · 无人机投向 {{ scheduleExecutionDroneLabel }}
              </template>
            </span>
          </div>
          <div class="schedule-output-actions">
            <button
              type="button"
              class="secondary-action"
              :disabled="exportingImage"
              @click="exportGeneratedScheduleImage"
            >
              <v-icon icon="mdi-image-outline" size="18"></v-icon>
              {{ exportingImage ? "正在生成" : "导出图片" }}
            </button>
            <button
              type="button"
              class="primary-action"
              :disabled="exportingMaa"
              @click="exportGeneratedMaaSchedule"
            >
              <v-icon icon="mdi-code-json" size="18"></v-icon>
              {{ exportingMaa ? "正在导出" : "导出 MAA" }}
            </button>
          </div>
          <p
            v-for="warning in generatedMaaExportPreview.warnings"
            :key="warning"
            class="schedule-output-warning"
          >
            {{ warning }}
          </p>
        </div>
        <p v-else class="schedule-output-empty">
          选择并生成全部房间组后即可导出结果
        </p>
      </section>

      <div class="page-cache-reset">
        <button type="button" @click="clearSavedWizardState">
          清空本页缓存
        </button>
      </div>
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

.schedule-preview-capture {
  min-width: 0;
  background: var(--c-page-background-color);
}

.schedule-output-stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.schedule-output-ready {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 18px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--c-border-color);
  border-left: 4px solid var(--riic-green);
  background: var(--c-page-background-color);
}

.schedule-output-summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.schedule-output-summary strong {
  color: var(--c-text-color);
  font-size: 14px;
}

.schedule-output-summary span,
.schedule-output-empty,
.schedule-output-warning {
  margin: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.55;
}

.schedule-output-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.schedule-output-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.schedule-output-warning {
  flex-basis: 100%;
  padding-top: 2px;
  color: var(--riic-orange);
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

.page-cache-reset {
  display: flex;
  justify-content: center;
  padding: 4px 0 0;
}

.page-cache-reset button {
  padding: 6px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}

.page-cache-reset button:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-orange) 54%,
    var(--c-border-color)
  );
  color: var(--riic-orange);
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

.workflow-card-heading-copy {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 10px;
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
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 58px;
  margin: 0;
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.recommendation-entry-action > .v-icon {
  margin-left: auto;
}

.recommendation-step-tabs {
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 0 14px 14px;
}

.recommendation-step-tab-list {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
  gap: 6px;
}

.recommendation-step-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 34px;
  gap: 5px;
  padding: 5px 7px;
  border: 1px solid color-mix(
    in srgb,
    var(--riic-gold) 45%,
    var(--c-border-color)
  );
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-gold) 8%,
    var(--c-page-background-color)
  );
  color: var(--riic-gold);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  cursor: pointer;
}

.recommendation-step-tab:hover,
.recommendation-step-tab.active {
  border-color: color-mix(
    in srgb,
    var(--riic-gold) 70%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-gold) 14%,
    var(--c-page-background-color)
  );
  color: var(--riic-gold);
}

.recommendation-step-tab.active {
  border-color: var(--riic-gold);
  background: color-mix(
    in srgb,
    var(--riic-gold) 22%,
    var(--c-page-background-color)
  );
  box-shadow: inset 0 -3px 0 var(--riic-gold);
}

.recommendation-step-tab.complete {
  border-color: color-mix(
    in srgb,
    var(--riic-green) 55%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-green) 9%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
}

.recommendation-step-tab.complete.active {
  border-color: var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 22%,
    var(--c-page-background-color)
  );
  box-shadow: inset 0 -3px 0 var(--riic-green);
}

.recommendation-step-tab span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-workflow-stage.collapsed {
  padding-top: 16px;
  padding-bottom: 16px;
}

.layout-stage-expand {
  flex: 0 0 auto;
  min-height: 30px;
  padding: 4px 9px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  cursor: pointer;
}

.layout-stage-expand:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 48%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-blue) 7%,
    var(--c-page-background-color-secondary)
  );
}

.recommendation-question-panel {
  padding: 14px;
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

.recommendation-result-panel {
  padding: 14px;
}

.recommendation-result-head {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.recommendation-result-label {
  color: var(--riic-muted);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.recommendation-result-summary {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recommendation-result-summary strong {
  overflow: hidden;
  color: var(--riic-green);
  font-size: 18px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-result-summary small {
  overflow: hidden;
  margin-top: 3px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-result-reason {
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.recommendation-result-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 32px;
  padding: 5px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.recommendation-result-reset:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-orange) 48%,
    var(--c-border-color)
  );
  color: var(--riic-orange);
}

.recommendation-question-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
}

.recommendation-question-fields.question-fields-resources {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.recommendation-question-fields .field-farming {
  grid-column: 1 / -1;
}

.recommendation-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.recommendation-field legend {
  padding: 0;
  color: var(--c-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.recommendation-answer-group {
  --recommendation-answer-height: 46px;
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
  display: block;
  width: 100%;
  height: var(--recommendation-answer-height);
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
  box-sizing: border-box;
  width: 100%;
  height: var(--recommendation-answer-height);
  min-width: 0;
  min-height: 0;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.35;
  text-align: center;
  cursor: pointer;
}

.recommendation-answer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: 7px;
}

.recommendation-answer-content > .v-icon {
  flex: 0 0 auto;
  color: var(--option-color, var(--riic-blue));
}

.recommendation-answer-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recommendation-answer-copy strong {
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.recommendation-answer-copy small {
  margin-top: 2px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.25;
}

.answer-group-frequency {
  --recommendation-answer-height: 72px;
}

.answer-group-frequency .recommendation-answer-content,
.answer-group-farming .recommendation-answer-content {
  flex-direction: column;
  gap: 3px;
  text-align: center;
}

.answer-group-frequency .recommendation-answer-copy {
  align-items: center;
}

.answer-group-reliability {
  --recommendation-answer-height: 54px;
}

.answer-group-reliability :deep(.el-radio__label) {
  justify-content: flex-start;
  text-align: left;
}

.answer-group-reliability .recommendation-answer-content {
  justify-content: flex-start;
}

.answer-group-reliability .recommendation-answer-copy {
  align-items: flex-start;
}

.answer-group-binary {
  --recommendation-answer-height: 50px;
}

.answer-group-binary :deep(.el-radio__label) {
  justify-content: flex-start;
  padding: 8px 12px;
  text-align: left;
}

.answer-group-binary .recommendation-answer-content {
  justify-content: flex-start;
}

.recommendation-answer-group :deep(.el-radio__label) {
  justify-content: flex-start;
  text-align: left;
}

.recommendation-answer-group .recommendation-answer-content {
  justify-content: flex-start;
  text-align: left;
}

.recommendation-answer-group .recommendation-answer-copy {
  align-items: flex-start;
}

.answer-group-frequency .recommendation-answer-content,
.answer-group-farming .recommendation-answer-content {
  align-items: flex-start;
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

@media (min-width: 901px) {
  .recommendation-question-fields.question-fields-resources {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .recommendation-question-fields.question-fields-operation,
  .recommendation-question-fields.question-fields-tradeoffs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recommendation-question-fields .field-farming {
    grid-column: auto;
  }

  .recommendation-question-fields .recommendation-answer-group,
  .recommendation-question-fields .recommendation-answer-group.compact {
    --recommendation-answer-height: 50px;
    grid-template-columns: minmax(0, 1fr);
    width: 288px;
    max-width: 100%;
  }

  .recommendation-question-fields
    .recommendation-answer-content,
  .recommendation-question-fields .answer-group-frequency .recommendation-answer-content,
  .recommendation-question-fields .answer-group-farming .recommendation-answer-content {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }

  .recommendation-question-fields .recommendation-answer-copy,
  .recommendation-question-fields .answer-group-frequency .recommendation-answer-copy {
    align-items: flex-start;
  }

  .recommendation-question-fields .answer-group-frequency {
    --recommendation-answer-height: 58px;
  }
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
  min-height: 92px;
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

.layout-choice.layout-252-3-gold {
  --layout-color: #3c83bd;
}

.layout-choice.layout-243,
.layout-choice.layout-252-2-gold {
  --layout-color: #4f9b72;
}

.layout-choice.layout-243-orundum,
.layout-choice.layout-342-orundum {
  --layout-color: #d96b6b;
}

.layout-choice:hover,
.layout-choice.selected {
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
  position: relative;
}

.layout-choice.recommended::after {
  position: absolute;
  inset: -4px;
  border-radius: 6px;
  content: "";
  pointer-events: none;
  animation: riic-recommendation-breathe 2.4s ease-in-out infinite;
}

@keyframes riic-recommendation-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 0
      color-mix(in srgb, var(--layout-color) 0%, transparent);
  }

  50% {
    box-shadow: 0 0 0 4px
      color-mix(in srgb, var(--layout-color) 36%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .layout-choice.recommended::after {
    animation: none;
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--layout-color) 30%, transparent);
  }
}

.layout-choice-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--layout-color);
}

.layout-choice-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.layout-choice-code {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.layout-choice > strong {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.35;
}

.layout-choice-rooms {
  display: flex;
  flex-wrap: nowrap;
  gap: 3px 4px;
  margin-top: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  font-size: 9px;
}

.layout-choice-rooms::-webkit-scrollbar {
  display: none;
}

.layout-choice-resource {
  --resource-color: var(--riic-blue);
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-height: 17px;
  padding: 0 4px;
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--resource-color) 12%,
    var(--c-page-background-color)
  );
  color: var(--resource-color);
  font-weight: 600;
  line-height: 1.2;
}

.layout-choice-resource.facility-trading {
  --resource-color: #3c83bd;
}

.layout-choice-resource.facility-manufacture {
  --resource-color: #d5aa36;
}

.layout-choice-resource.facility-power {
  --resource-color: #4f9b72;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.operator-source-choice-grid {
  display: contents;
}

.operator-training-mode {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 7px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
}

.operator-training-mode:has(.is-disabled) {
  color: var(--riic-muted);
  cursor: default;
}

.schedule-generation-mode {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 38px;
  padding: 7px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.schedule-generation-mode > div {
  display: inline-flex;
  min-width: 0;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  overflow: hidden;
}

.schedule-generation-mode button {
  min-height: 26px;
  padding: 3px 8px;
  border: 0;
  border-left: 1px solid var(--c-border-color);
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
  cursor: pointer;
}

.schedule-generation-mode button:first-child {
  border-left: 0;
}

.schedule-generation-mode button.active {
  background: color-mix(
    in srgb,
    var(--riic-blue) 11%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  font-weight: 700;
}

.operator-source-choice {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.operator-source-file-input {
  display: none;
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

.schedule-status-detail-lines {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.schedule-status-detail-lines > span {
  display: block;
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

.sync-source-action {
  width: 100%;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.operator-source-action-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sync-source-action > .operator-source-action-head > .v-icon:first-child {
  color: var(--riic-blue);
}

.sync-source-action span {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.sync-source-action small {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.sync-source-action.active {
  border: 2px solid var(--riic-blue);
  background: color-mix(
    in srgb,
    var(--riic-blue) 14%,
    var(--c-page-background-color-secondary)
  );
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--riic-blue) 18%, transparent);
}

.sync-source-action.active
  > .operator-source-action-head
  > .operator-source-selected-mark {
  color: var(--riic-blue);
}

.sync-source-action:disabled {
  cursor: wait;
  opacity: 0.65;
}

.operator-source-text-action {
  align-self: center;
  min-height: 24px;
  padding: 2px 6px;
  border: 0;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.operator-source-text-action:hover {
  text-decoration: underline;
}

.operator-source-text-action:disabled {
  cursor: wait;
  opacity: 0.65;
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

.room-workbench {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--c-border-color);
}

.facility-profile-switch {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-bottom: 16px;
  padding: 9px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
}

.facility-profile-label {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.facility-profile-options {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
}

.facility-profile-option {
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-left: 1px solid var(--c-border-color);
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
  cursor: pointer;
}

.facility-profile-option:first-child {
  border-left: 0;
}

.facility-profile-option:hover {
  background: color-mix(
    in srgb,
    var(--riic-green) 7%,
    var(--c-page-background-color-secondary)
  );
}

.facility-profile-option.active {
  background: color-mix(
    in srgb,
    var(--riic-green) 16%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font-weight: 700;
}

.facility-profile-note {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.room-group-selection-layout {
  display: grid;
  grid-template-columns: 164px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
}

.automatic-schedule-generation {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.automatic-schedule-generation button {
  min-height: 34px;
  padding: 5px 13px;
  border: 1px solid var(--riic-green);
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-green) 9%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  cursor: pointer;
}

.automatic-schedule-generation button:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--riic-green) 16%,
    var(--c-page-background-color)
  );
}

.automatic-schedule-generation button:disabled {
  cursor: default;
  opacity: 0.48;
}

.room-group-progress {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 2px 0;
}

.room-group-progress-heading {
  margin: 0 0 5px 8px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.room-group-progress-item {
  --room-group-progress-color: var(--riic-orange);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  min-height: 32px;
  gap: 8px;
  padding: 5px 7px 5px 8px;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.room-group-progress-item:hover {
  background: color-mix(
    in srgb,
    var(--room-group-progress-color) 6%,
    transparent
  );
}

.room-group-progress-item.active {
  border-left-color: var(--room-group-progress-color);
  background: color-mix(
    in srgb,
    var(--room-group-progress-color) 10%,
    transparent
  );
}

.room-group-progress-item.tone-complete {
  --room-group-progress-color: var(--riic-green);
}

.room-group-progress-item.tone-pending {
  --room-group-progress-color: var(--riic-orange);
}

.room-group-progress-item.tone-error {
  --room-group-progress-color: var(--riic-red);
}

.room-group-progress-item.tone-notRequired {
  --room-group-progress-color: var(--riic-muted);
}

.room-group-progress-label {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}

.room-group-progress-label > .v-icon {
  flex: 0 0 auto;
  color: var(--room-group-progress-color);
}

.room-group-progress-label > span {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-group-progress-item small {
  flex: 0 0 auto;
  color: var(--room-group-progress-color);
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
}

.room-group-schematic {
  min-width: 0;
}

.room-workbench-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.room-workbench-heading > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.room-workbench-heading strong {
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.4;
}

.room-workbench-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.room-layout-summary {
  overflow: hidden;
  max-width: 48%;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-group-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-group-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.room-group-tile {
  --room-group-color: var(--riic-blue);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  flex: 0 0 180px;
  justify-content: space-between;
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  min-height: 82px;
  padding: 10px;
  border: 0;
  border-left: 3px solid
    color-mix(in srgb, var(--room-group-color) 70%, var(--c-border-color));
  border-radius: 0;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
  box-shadow 0.18s ease;
}

.room-group-tile.width-double {
  flex-basis: 360px;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
}

.room-group-tile.tone-trading {
  --room-group-color: var(--riic-blue);
}

.room-group-tile.tone-manufacture {
  --room-group-color: var(--riic-gold);
}

.room-group-tile.tone-power {
  --room-group-color: var(--riic-green);
}

.room-group-tile.tone-control {
  --room-group-color: #6a629e;
}

.room-group-tile.tone-meeting {
  --room-group-color: #b95c7a;
}

.room-group-tile.tone-dormitory {
  --room-group-color: #3d8586;
}

.room-group-tile.tone-processing {
  --room-group-color: #ad762c;
}

.room-group-tile.tone-hire,
.room-group-tile.tone-office {
  --room-group-color: #84699c;
}

.room-group-tile.tone-training {
  --room-group-color: #bf6252;
}

.room-group-tile:hover {
  background: color-mix(
    in srgb,
    var(--room-group-color) 6%,
    var(--c-page-background-color-secondary)
  );
}

.room-group-tile.active {
  border: 1px solid var(--room-group-color);
  border-left-width: 3px;
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--room-group-color) 11%,
    var(--c-page-background-color)
  );
  box-shadow: none;
}

.room-group-tile-title {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.room-group-tile-title > .v-icon {
  flex: 0 0 auto;
  color: var(--room-group-color);
}

.room-group-tile-title > .room-group-status-icon {
  margin-left: auto;
}

.room-group-status-icon.tone-ready {
  color: var(--riic-green);
}

.room-group-status-icon.tone-waiting {
  color: var(--riic-orange);
}

.room-group-status-icon.tone-selectionPending {
  color: var(--riic-orange);
}

.room-group-status-icon.tone-blocked {
  color: var(--riic-red);
}

.room-group-tile strong {
  overflow: hidden;
  max-width: 100%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-group-count {
  display: flex;
  align-items: center;
  min-height: 18px;
  gap: 4px;
  margin-top: 9px;
}

.room-group-count i {
  display: block;
  width: 14px;
  height: 11px;
  border: 1px solid
    color-mix(in srgb, var(--room-group-color) 58%, var(--c-border-color));
  border-radius: 2px;
  background: color-mix(
    in srgb,
    var(--room-group-color) 14%,
    var(--c-page-background-color)
  );
}

.room-group-count small {
  margin-left: 2px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.room-editor-panel {
  display: contents;
}

.room-editor-panel-heading {
  display: none;
}

.room-editor-panel-heading > div {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.room-editor-panel-heading > div > .v-icon {
  flex: 0 0 auto;
  color: var(--riic-blue);
}

.room-editor-panel-heading > div > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.room-editor-panel-heading strong {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-editor-panel-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.room-editor-empty {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 12px;
  padding: 10px 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.room-editor-empty span {
  white-space: nowrap;
}

.control-rotation-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.control-rotation-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.control-rotation-shifts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.control-rotation-shift {
  min-width: 0;
  min-height: 72px;
  padding: 8px 10px;
  border: 1px solid var(--c-border-color);
  border-left: 3px solid var(--riic-green);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.control-rotation-operator {
  flex: 0 0 auto;
}

.assembled-schedule-panel {
  margin-top: 18px;
}

.schedule-room-editor-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 10px;
  padding: 14px;
  border: 1px solid
    color-mix(in srgb, var(--riic-blue) 38%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-blue) 4%,
    var(--c-page-background-color)
  );
}

.schedule-room-editor-panel > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 5px 16px;
}

.schedule-room-editor-panel > header > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.schedule-room-editor-panel strong {
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.4;
}

.schedule-room-editor-panel span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.schedule-room-editor-reset,
.schedule-room-editor-add button,
.schedule-drone-setting button {
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
  cursor: pointer;
}

.schedule-room-editor-reset:hover,
.schedule-room-editor-add button:hover:not(:disabled),
.schedule-drone-setting button:hover {
  border-color: color-mix(in srgb, var(--riic-blue) 48%, var(--c-border-color));
  color: var(--riic-blue);
}

.schedule-room-editor-add button:disabled {
  cursor: default;
  opacity: 0.45;
}

.schedule-room-product-field,
.schedule-room-editor-add {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.schedule-room-product-field > span {
  flex: 0 0 auto;
  color: var(--c-text-color);
  font-weight: 700;
  white-space: nowrap;
}

.schedule-room-product-field select,
.schedule-room-editor-add input,
.schedule-drone-setting select {
  min-width: 0;
  min-height: 30px;
  padding: 4px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
}

.schedule-room-editor-add input {
  flex: 1 1 150px;
}

.schedule-drone-setting {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 0 10px 10px;
  padding: 10px 14px;
  border: 1px solid
    color-mix(in srgb, var(--riic-green) 38%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-green) 4%,
    var(--c-page-background-color)
  );
}

.schedule-drone-setting > div:first-child {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
}

.schedule-drone-setting strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.schedule-drone-setting span,
.schedule-drone-manual-state {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.schedule-drone-setting-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-room-editor-operators {
  display: flex;
  align-items: center;
  min-height: 36px;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-room-editor-operator {
  position: relative;
  display: inline-flex;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
}

.schedule-room-editor-manual-name {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 80px;
  min-width: 34px;
  min-height: 34px;
  padding: 0 5px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  color: var(--riic-blue);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-room-editor-operator > .v-icon {
  position: absolute;
  top: -3px;
  right: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--riic-red);
  color: #fff;
}

.schedule-room-editor-input-warning {
  margin: -4px 0 0;
  color: var(--riic-orange);
  font-size: 12px;
  line-height: 1.45;
}

.assembled-schedule-panel.state-requiresOperators,
.assembled-schedule-panel.state-waiting {
  border-color: color-mix(
    in srgb,
    var(--riic-orange) 42%,
    var(--c-border-color)
  );
}

.assembled-schedule-panel.state-blocked {
  border-color: color-mix(
    in srgb,
    var(--riic-red) 42%,
    var(--c-border-color)
  );
}

.assembled-schedule-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--c-border-color);
}

.assembled-schedule-heading > div:first-child {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
}

.assembled-schedule-heading strong {
  flex: 0 0 auto;
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.4;
}

.assembled-schedule-heading > div:first-child span {
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assembled-schedule-navigation {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 5px;
}

.assembled-schedule-navigation button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  background: transparent;
  color: var(--riic-blue);
  cursor: pointer;
}

.assembled-schedule-navigation button:hover:not(:disabled) {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 54%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-blue) 7%,
    var(--c-page-background-color-secondary)
  );
}

.assembled-schedule-navigation button:disabled {
  cursor: default;
  opacity: 0.35;
}

.assembled-schedule-navigation span {
  min-width: 38px;
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.assembled-schedule-content {
  padding: 0;
}

.schedule-training-requirements {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-border-color);
  background: color-mix(
    in srgb,
    var(--riic-orange) 6%,
    var(--c-page-background-color)
  );
}

.schedule-training-requirements > strong {
  flex: 0 0 auto;
  color: var(--riic-orange);
  font-size: 13px;
  line-height: 28px;
}

.schedule-training-requirements > div {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
}

.schedule-training-requirements > div > span {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 4px;
}

.schedule-training-requirements small {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.schedule-training-requirements em {
  color: var(--riic-muted);
  font-size: 11px;
  font-style: normal;
  line-height: 1.4;
}

.assembled-schedule-summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px 8px;
}

.assembled-schedule-summary strong {
  color: var(--riic-green);
  font-size: 13px;
  line-height: 1.4;
}

.assembled-schedule-summary span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.assembled-schedule-template-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}

.assembled-schedule-template-list span {
  padding: 3px 6px;
  border: 1px solid color-mix(in srgb, var(--riic-blue) 34%, transparent);
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--riic-blue) 7%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}

.assembled-schedule-group-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 7px 12px;
  margin: 11px 0 0;
  padding: 0;
  list-style: none;
}

.assembled-schedule-group-list li {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 7px;
  padding-left: 8px;
  border-left: 3px solid
    color-mix(in srgb, var(--riic-green) 52%, var(--c-border-color));
}

.assembled-schedule-group-list strong {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assembled-schedule-group-list span {
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assembled-schedule-fallbacks {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin: 11px 0 0;
  padding-top: 10px;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 72%, transparent);
  color: var(--riic-orange);
  font-size: 11px;
  line-height: 1.4;
}

.assembled-schedule-fallbacks > .v-icon {
  flex: 0 0 auto;
}

.assembled-schedule-fallbacks strong {
  color: var(--riic-orange);
  font-size: inherit;
  font-weight: 700;
}

.assembled-schedule-empty {
  margin: 0;
  padding: 13px 12px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.assembled-schedule-panel.state-requiresOperators .assembled-schedule-empty,
.assembled-schedule-panel.state-waiting .assembled-schedule-empty {
  color: var(--riic-orange);
}

.assembled-schedule-panel.state-blocked .assembled-schedule-empty {
  color: var(--riic-red);
}

.room-staffing-results {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
}

.room-staffing-results-note {
  display: none;
}

.room-fallback-stage {
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 72%, transparent);
}

.room-fallback-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.room-fallback-heading strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.room-fallback-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.room-fallback-operator-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
}

.room-fallback-operator {
  --fallback-destination: transparent;
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 42px;
  padding: 0 3px 5px;
  color: var(--riic-blue);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  transition:
    filter 0.16s ease,
    opacity 0.16s ease;
}

.room-fallback-operator::after {
  position: absolute;
  right: 3px;
  bottom: 0;
  left: 3px;
  height: 3px;
  border-radius: 2px;
  background: var(--fallback-destination);
  content: "";
}

.room-fallback-operator.occupied > div:first-child {
  filter: grayscale(0.78);
  opacity: 0.38;
}

.room-fallback-operator.occupied > span {
  color: var(--riic-muted);
  opacity: 0.68;
}

.room-fallback-operator.destination-trading {
  --fallback-destination: var(--riic-blue);
}

.room-fallback-operator.destination-power {
  --fallback-destination: var(--riic-green);
}

.room-fallback-operator.destination-manufacture {
  --fallback-destination: var(--riic-gold);
}

.room-fallback-operator.destination-control {
  --fallback-destination: #145c50;
}

.room-fallback-operator.destination-meeting,
.room-fallback-operator.destination-hire,
.room-fallback-operator.destination-office,
.room-fallback-operator.destination-processing,
.room-fallback-operator.destination-dormitory,
.room-fallback-operator.destination-training {
  --fallback-destination: #7b8088;
}

.room-fallback-basic-list {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
}

.room-fallback-basic-list > span {
  flex: 0 0 auto;
  padding-top: 6px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.3;
}

.room-staffing-cohort + .room-staffing-cohort {
  margin-top: 2px;
}

.room-staffing-cohort-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 0 7px;
}

.room-staffing-cohort-heading strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.room-staffing-cohort-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.room-staffing-progress {
  flex: 0 0 auto;
  color: var(--riic-orange);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.room-staffing-progress.complete {
  color: var(--riic-green);
}

.room-staffing-candidate-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 8px;
}

.room-staffing-candidate {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 72px;
  padding: 8px 10px;
  border: 1px solid var(--c-border-color);
  border-left: 3px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease;
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.room-staffing-candidate.selected {
  border-color: color-mix(
    in srgb,
    var(--riic-green) 72%,
    var(--c-border-color)
  );
  border-left-color: var(--riic-green);
  border-left-width: 6px;
  background: color-mix(
    in srgb,
    var(--riic-green) 11%,
    var(--c-page-background-color)
  );
}

.room-staffing-candidate.unavailable {
  opacity: 0.52;
}

.room-staffing-candidate:hover:not(:disabled) {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 54%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-blue) 5%,
    var(--c-page-background-color)
  );
}

.room-staffing-candidate.selected:hover:not(:disabled) {
  border-color: var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 16%,
    var(--c-page-background-color)
  );
}

.room-staffing-candidate:disabled {
  cursor: default;
}

.room-staffing-candidate-main {
  display: flex;
  align-items: stretch;
  min-width: 0;
  gap: 12px;
}

.room-staffing-candidate-team {
  display: flex;
  align-items: flex-start;
  flex: 0 1 auto;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.room-staffing-candidate-name {
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-staffing-candidate-avatars {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  min-width: 0;
}

.room-staffing-candidate-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 1px solid
    color-mix(in srgb, var(--c-border-color) 78%, transparent);
  border-radius: 50%;
  background: color-mix(
    in srgb,
    var(--riic-muted) 8%,
    var(--c-page-background-color)
  );
  color: var(--riic-muted);
}

.room-staffing-candidate-details {
  display: flex;
  flex: 0 0 124px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  width: 124px;
  min-width: 124px;
  margin-left: auto;
  text-align: left;
}

.room-staffing-candidate-detail {
  display: flex;
  align-items: baseline;
  min-width: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.3;
}

.room-staffing-candidate-metric {
  display: inline-flex;
  align-items: center;
  color: var(--riic-blue);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
  white-space: nowrap;
}

.room-staffing-candidate-detail.fallback strong {
  color: var(--riic-muted);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.room-staffing-candidate-metric.facility-trading {
  color: #2475bd;
}

.room-staffing-candidate-metric.facility-manufacture {
  color: #b78106;
}

.room-staffing-candidate-metric.facility-power {
  color: #25835a;
}

.room-staffing-candidate-metric.facility-meeting {
  color: #d6771a;
}

.room-staffing-candidate-metric.facility-hire,
.room-staffing-candidate-metric.facility-office {
  color: #be3f61;
}

.room-staffing-candidate-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}

.room-staffing-fallback-action,
.room-staffing-load-more {
  min-height: 28px;
  padding: 3px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  cursor: pointer;
}

.room-staffing-fallback-action:hover:not(:disabled),
.room-staffing-load-more:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 52%,
    var(--c-border-color)
  );
  color: var(--riic-blue);
}

.room-staffing-fallback-action.selected {
  border-color: color-mix(
    in srgb,
    var(--riic-green) 56%,
    var(--c-border-color)
  );
  color: var(--riic-green);
}

.room-staffing-fallback-action:disabled {
  cursor: default;
  opacity: 0.5;
}

.room-staffing-fallback-metric {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  color: var(--riic-green);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  white-space: nowrap;
}

.room-candidate-assembly {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 2px;
}

.room-candidate-assembly span {
  color: var(--riic-green);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.room-candidate-assembly button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--riic-green);
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--riic-green) 10%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.room-candidate-assembly button:hover {
  background: color-mix(
    in srgb,
    var(--riic-green) 17%,
    var(--c-page-background-color)
  );
}

.room-candidate-assembly-error {
  margin: 0;
  padding-top: 2px;
  color: var(--riic-red);
  font-size: 12px;
  line-height: 1.5;
}

.room-candidate-results {
  display: flex;
  flex-direction: column;
}

.room-candidate-results-note {
  margin: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-border-color);
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.room-group-rotation-candidate + .room-group-rotation-candidate {
  border-top: 1px solid var(--c-border-color);
}

.room-group-rotation-candidate.is-selected {
  background: color-mix(
    in srgb,
    var(--riic-green) 6%,
    var(--c-page-background-color-secondary)
  );
  box-shadow: inset 3px 0 0 var(--riic-green);
}

.room-group-rotation-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 8px;
}

.room-group-rotation-heading > div {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
}

.room-group-rotation-heading > div:first-child {
  flex: 1 1 auto;
  flex-wrap: wrap;
}

.room-group-rotation-heading strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.room-group-rotation-heading span,
.room-group-rotation-heading small {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.room-group-rotation-heading small {
  flex: 0 0 auto;
  white-space: nowrap;
}

.room-group-rotation-metrics {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.room-group-rotation-select {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  gap: 3px;
  padding: 3px 6px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}

.room-group-rotation-select:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-green) 52%,
    var(--c-border-color)
  );
  color: var(--riic-green);
}

.room-group-rotation-select.selected {
  border-color: color-mix(
    in srgb,
    var(--riic-green) 58%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--riic-green) 12%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
}

.room-group-rotation-details {
  padding: 0 12px 10px;
}

.room-group-rotation-details > summary {
  color: var(--riic-blue);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  cursor: pointer;
}

.room-group-rotation-segments {
  display: flex;
  flex-direction: column;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.room-group-rotation-segment {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 9px 0;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 72%, transparent);
}

.room-group-rotation-segment > header,
.room-group-station-assignment > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.room-group-rotation-segment > header strong,
.room-group-station-assignment > header span {
  color: var(--c-text-color);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.room-group-rotation-segment > header span,
.room-group-station-assignment > header small {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
  white-space: nowrap;
}

.room-group-station-assignments {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 7px;
}

.room-group-station-assignment {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 6px;
  padding-left: 8px;
  border-left: 3px solid
    color-mix(in srgb, var(--riic-blue) 44%, var(--c-border-color));
}

.room-group-station-assignment .room-candidate-operators {
  flex-wrap: wrap;
}

.room-candidate-bucket + .room-candidate-bucket {
  border-top: 1px solid var(--c-border-color);
}

.room-candidate-bucket-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 8px;
}

.room-candidate-bucket-heading > div {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
}

.room-candidate-bucket-heading strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.room-candidate-bucket-heading span,
.room-candidate-bucket-heading small {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.room-candidate-bucket-heading small {
  flex: 0 0 auto;
  white-space: nowrap;
}

.room-candidate-listing {
  padding: 0 12px 10px;
}

.room-candidate-listing > summary {
  color: var(--riic-blue);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  cursor: pointer;
}

.room-candidate-list {
  display: flex;
  flex-direction: column;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.room-candidate-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) max-content max-content;
  align-items: center;
  min-height: 50px;
  gap: 8px;
  padding: 7px 0;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 72%, transparent);
}

.room-candidate-rank {
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.room-candidate-operators {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.room-candidate-operator {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 4px;
}

.room-candidate-operator small {
  overflow: hidden;
  max-width: 68px;
  color: var(--c-text-color);
  font-size: 11px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-candidate-fallback {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 3px;
  color: var(--riic-muted);
}

.room-candidate-fallback small {
  overflow: hidden;
  color: inherit;
  font-size: 11px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-candidate-efficiency {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 44px;
}

.room-candidate-efficiency strong {
  color: var(--riic-green);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.room-candidate-efficiency small {
  margin-top: 2px;
  color: var(--riic-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.room-candidate-quality {
  padding: 2px 4px;
  border: 1px solid color-mix(in srgb, var(--riic-orange) 42%, transparent);
  border-radius: 3px;
  color: var(--riic-orange);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.room-candidate-calculation {
  padding: 2px 4px;
  border: 1px solid color-mix(in srgb, var(--riic-blue) 42%, transparent);
  border-radius: 3px;
  color: var(--riic-blue);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.schedule-generation-empty-state {
  margin: 18px 0 0;
  padding: 12px;
  border: 1px dashed var(--c-border-color);
  border-radius: 4px;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.5;
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
    grid-template-columns: 1fr;
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

  .operator-training-mode {
    grid-column: auto;
  }

  .schedule-training-requirements {
    flex-direction: column;
    gap: 4px;
  }

  .schedule-training-requirements > strong {
    line-height: 1.4;
  }

  .schedule-training-requirements > div > span {
    max-width: 100%;
  }

  .schedule-training-requirements em {
    overflow-wrap: anywhere;
  }

  .room-group-selection-layout {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .room-group-progress {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px 10px;
  }

  .room-group-progress-heading {
    grid-column: 1 / -1;
  }

  .room-workbench-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .room-layout-summary {
    max-width: 100%;
    text-align: left;
  }

  .room-group-tile {
    flex: 1 1 calc(50% - 4px);
    width: auto;
    min-width: 0;
    max-width: none;
  }

  .room-group-tile.width-double {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
    max-width: none;
  }

  .layout-entry-panel {
    gap: 16px;
  }

  .layout-choice-panel {
    padding: 0;
  }

  .recommendation-question-fields.question-fields-resources {
    grid-template-columns: minmax(0, 1fr);
  }

  .answer-group-reliability {
    grid-template-columns: minmax(0, 1fr);
  }

  .answer-group-reliability {
    --recommendation-answer-height: 46px;
  }

  .layout-schedule-group {
    gap: 8px;
  }

  .recommendation-question-panel {
    padding: 12px;
  }

  .recommendation-step-tabs {
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
    min-height: 92px;
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
