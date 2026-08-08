<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { saveAs } from "file-saver";
import { useRoute, useRouter } from "vue-router";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import RiicAdditionalInfoPanel from "/src/components/tools/RiicAdditionalInfoPanel.vue";
import RiicControlCenterStaffingPanel from "/src/components/tools/RiicControlCenterStaffingPanel.vue";
import RiicDeveloperWorkbench from "/src/components/tools/RiicDeveloperWorkbench.vue";
import RiicOperatorSourcePanel from "/src/components/tools/RiicOperatorSourcePanel.vue";
import RiicRoomGroupNavigator from "/src/components/tools/RiicRoomGroupNavigator.vue";
import RiicScheduleExportActions from "/src/components/tools/RiicScheduleExportActions.vue";
import RiicLayoutChoicePanel from "/src/components/tools/RiicLayoutChoicePanel.vue";
import RiicSchedulePreview from "/src/components/tools/RiicSchedulePreview.vue";
import RiicScheduleRoomEditorPanel from "/src/components/tools/RiicScheduleRoomEditorPanel.vue";
import RiicRoomGroupStaffingPanel from "/src/components/tools/RiicRoomGroupStaffingPanel.vue";
import RiicScheduleSettingsPanel from "/src/components/tools/RiicScheduleSettingsPanel.vue";
import { cMessage } from "/src/utils/message.js";
import {
  OPERATOR_SOURCE_KEYS,
  RIIC_MAX_CUSTOM_OPERATOR_SOURCES,
} from "/src/utils/riicOperatorSources.js";
import { useRiicOperatorSources } from "/src/utils/riicOperatorSources.js";
import { operatorTableV2 } from "/src/utils/gameData.js";
import RIIC_BASELINE_SKILL_RULES from "/src/static/json/tools/riic_baseline_skill_rules.json";
import RIIC_CONTROL_CENTER_SKILLS from "/src/static/json/tools/riic-candidates/riic-04-control.json";
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
import {
  getRiicLayer3ControlCenterEffects,
  getRiicLayer3RuleConditionChecks,
  getRiicLayer3SupportRoomPlacements,
} from "/src/utils/riic03Rules.js";
import {
  createRiicRoomGroupFallbackPlan,
} from "/src/utils/riicDynamicFallback.js";
import {
  recalculateRiicAutomationManufacture,
} from "/src/utils/riicAutomationDynamicFallback.js";
import { getRiicRoomGroupStaffingRequirement } from "/src/utils/riicStaffingRequirement.js";
import {
  resolveRiicRoomCandidateSkeletons,
} from "/src/utils/riic02Groups.js";
import {
  materializeRiicRoomCandidateSkeletons,
} from "/src/utils/riic03aCandidates.js";
import {
  getRiicStaticRoomCandidateCatalogKey,
  loadRiicStaticRoomCandidateCatalog,
} from "/src/utils/riic01Catalog.js";
import {
  normalizeRiicIdealTrainingRaritySelection,
  isRiicIdealTrainingEnabledForOperator,
} from "/src/utils/riicTrainingPolicy.js";
import {
  getRiicRuntimeCandidateContributionBreakdown,
  getRiicRuntimeCandidateRankingValue,
} from "/src/utils/riicRuntimeContribution.js";
import { evaluateRiicControlCenterScenarios } from "/src/utils/riic04Trial.js";
import { evaluateRiicPerceptionResourceTrials } from "/src/utils/riic05PerceptionTrial.js";
import { buildRiicSchedulePreview } from "/src/utils/riicSchedulePreview.js";
import { summarizeRiicActualSchedule } from "/src/utils/riic07Actual.js";
import { buildRiicMaaScheduleFromPreview } from "/src/utils/riicScheduleExport.js";
import {
  createRiicYieldEngineRunningResult,
} from "/src/utils/riicYieldEngines/contract.js";
import {
  buildRiicControlCenterRuntimeContext,
  getRiicControlCenterRoomAdjustment,
} from "/src/utils/riicControlCenterRuntime.js";
import { alignRiicScheduleSameShiftBindings } from "/src/utils/riicSameShiftBindings.js";
import {
  RIIC_YIELD_ENGINE_REGISTRY,
} from "/src/utils/riicYieldEngines/engineRegistry.js";
import {
  runRiicYieldEngines,
} from "/src/utils/riicYieldEngines/engineRunner.js";

const RIIC_OPERATOR_WORKSPACES_STORAGE_KEY =
  "riic_schedule_generator_workspaces_v1";
const RIIC_SCHEDULE_DRAFT_STORAGE_KEY =
  "riic_schedule_generator_draft_v2";
const LEGACY_RIIC_SCHEDULE_DRAFT_STORAGE_KEY =
  "riic_schedule_generator_draft_v1";
const RIIC_LEGACY_EDITOR_TRANSFER_STORAGE_KEY =
  "riic_schedule_generator_to_legacy_editor_v1";
const RIIC_SCHEDULE_DRAFT_VERSION = 23;
const RIIC_SCHEDULE_DRAFT_PREVIOUS_VERSION = 22;
const RIIC_SCHEDULE_DRAFT_LEGACY_VERSION = 21;
const ROOM_STAFFING_CANDIDATE_PAGE_SIZE = 24;
const RIIC_AUTOMATIC_SELECTION_STRATEGY_VERSION = "7";
const CONTROL_CENTER_FUNCTION_ROLE_DEFINITIONS = Object.freeze([
  {
    id: "trading",
    label: "贸易站功能位",
    targetRoomType: "trading",
    buffTags: ["trading-station"],
  },
  {
    id: "manufacture",
    label: "制造站功能位",
    targetRoomType: "manufacture",
    buffTags: ["manufacture-station"],
  },
  {
    id: "office",
    label: "办公室功能位",
    targetRoomType: "hire",
    buffTags: ["office"],
  },
]);
function toRiicControlCenterUnlockNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function isRiicControlCenterSkillUnlocked(
  operator,
  skill,
  { trainingMode = "current", idealTrainingRaritySelection } = {},
) {
  if (
    trainingMode === "ideal" &&
    isRiicIdealTrainingEnabledForOperator(
      operator,
      idealTrainingRaritySelection,
    )
  ) {
    return true;
  }

  const operatorElite = toRiicControlCenterUnlockNumber(operator?.elite);
  const requiredElite = toRiicControlCenterUnlockNumber(skill?.elite);
  if (operatorElite !== requiredElite) {
    return operatorElite > requiredElite;
  }

  return (
    toRiicControlCenterUnlockNumber(operator?.level, 1) >=
    toRiicControlCenterUnlockNumber(skill?.level, 1)
  );
}

function isRiicControlCenterRoomEffect(effect) {
  const target = effect?.target || {};
  const scope = String(target?.scope || "").trim();
  return Boolean(
    ["allRooms", "operators"].includes(scope) &&
      ["trading", "manufacture", "hire"].includes(
        String(target?.roomType || "").trim(),
      ) &&
      (scope !== "operators" ||
        (target?.operatorIds || []).some(
          (operatorId) => String(operatorId || "").trim(),
        )) &&
      Number.isFinite(Number(effect?.bonusPercent)),
  );
}

function getRiicControlCenterRoomEffectKey(effect) {
  const target = effect?.target || {};
  return [
    String(target?.scope || "").trim(),
    String(target?.roomType || "").trim(),
    String(target?.product || "").trim(),
    String(effect?.metric || "").trim(),
    Number(effect?.bonusPercent),
    (target?.operatorIds || [])
      .map((operatorId) => String(operatorId || "").trim())
      .filter(Boolean)
      .sort()
      .join(","),
    JSON.stringify(effect?.conditions || null),
  ].join(":");
}

function formatRiicControlCenterRoomEffect(effect) {
  const roomLabel =
    {
      trading: "贸易站",
      manufacture: "制造站",
      hire: "办公室",
    }[String(effect?.target?.roomType || "").trim()] || "";
  const bonusPercent = Number(effect?.bonusPercent);
  if (!roomLabel || !Number.isFinite(bonusPercent)) {
    return "";
  }

  const targetLabel =
    String(effect?.target?.scope || "").trim() === "operators"
      ? "\u6307\u5b9a\u5e72\u5458 "
      : "";
  return `${roomLabel} ${targetLabel}${bonusPercent >= 0 ? "+" : ""}${bonusPercent}%`;
}

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
    width: 1,
    rotationRequired: true,
    manualControl: true,
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
    fallbackOnly: true,
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
    fallbackOnly: true,
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
    label: "342（搓玉）",
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
const DEFAULT_LAYOUT_SELECTION = Object.freeze({
  cardKey: "243",
  layoutId: "243",
  shiftMode: "twice",
});
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

function getLayoutFacilitySummary(card) {
  return [
    ["trading", "贸易站"],
    ["manufacture", "制造站"],
    ["power", "发电站"],
  ]
    .map(([facility, label]) => {
      const count = (card?.rooms || []).reduce(
        (total, room) =>
          getLayoutRoomFacility(room) === facility
            ? total + Number(room?.count || 0)
            : total,
        0,
      );

      return count > 0 ? `${count}${label}` : "";
    })
    .filter(Boolean)
    .join(" · ");
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

const answers = reactive({ ...DEFAULT_ANSWERS });
const currentStep = ref(0);
const contentPanel = ref(null);
const scheduleCapturePanel = ref(null);
const schedulePreviewCapturePanel = ref(null);
const useOwnedOperators = ref(false);
const treatUnderleveledOperatorsAsQualified = ref(false);
const idealTrainingRaritySelection = ref(
  normalizeRiicIdealTrainingRaritySelection(),
);
const showCandidateDebugValues = ref(false);
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
const layoutEntry = ref(DEFAULT_LAYOUT_SELECTION.cardKey);
const planningMode = ref("manual");
const selectedLayoutId = ref(DEFAULT_LAYOUT_SELECTION.layoutId);
const confirmedLayoutPlan = ref(createDefaultConfirmedLayoutPlan());
const recommendationPanelOpen = ref(false);
const twoShiftRotationMode = ref("maa");
const autoGeneratingSchedule = ref(false);
let automaticGenerationQueued = false;
const recommendedScheduleSnapshot = ref(null);
const activeScheduleRoomGroupKey = ref("");
const selectedRoomGroupTeamCandidateKeys = ref({});
const roomGroupFallbackQueueStates = ref({});
const controlCenterRoleSettings = ref({
  officeEnabled: false,
});
const controlCenterManualOverrides = ref({
  removedOperatorIds: [],
  addedOperatorIdsByTeamIndex: {},
});
const controlCenterLateFillExcludedOperatorIds = ref([]);
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
const {
  yituliuTokenInput,
  yituliuSourceLabelInput,
  customSourceImportPanelOpen,
  customSourceImportType,
  customSourceImporting,
  customOperatorSources,
  ownedOperators,
  ownedOperatorSource,
  ownedOperatorMessage,
  ownedOperatorError,
  ownedOperatorLastSyncedAt,
  loadingOwnedOperators,
  activeOperatorSource,
  operatorSourceSwitching,
  operatorSourceStates,
  getOperatorSourceStatus,
  loadOperatorSources,
  loadOwnedOperators,
  setActiveOperatorSource,
  clearActiveOperatorSource,
  openSklandImport,
  handleMaaFileChange,
  openCustomSourceImportPanel,
  importYituliuOperatorSource,
  deleteCustomOperatorSource,
  resetOperatorSources,
} = useRiicOperatorSources({
  router,
  storageReady,
  createInitialWorkspaceFromCurrent,
  readOperatorSourceWorkspaces,
  saveWizardState,
  loadSavedWizardState,
  applySavedWizardState,
  removeOperatorSourceWorkspace,
  generateAutomaticSchedule,
  getIsUserLoggedIn: () => isUserLoggedIn.value,
  getAutomaticGenerationTriggerKey: () => automaticGenerationTriggerKey.value,
});

function normalizeTwoShiftRotationMode(value) {
  return value === "manual" ? "manual" : "maa";
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

function getDefaultSchedulePreviewStateIndex(
  shiftMode = confirmedLayoutPlan.value?.shiftMode,
) {
  if (shiftMode === "threeTimes") {
    return 2;
  }

  return shiftMode ? 1 : 0;
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
  activeSchedulePreviewStateIndex.value =
    getDefaultSchedulePreviewStateIndex();
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
const selectedLayoutShiftMode = computed(
  () => confirmedLayoutPlan.value?.shiftMode || answers.shiftMode || "",
);
const visibleLayoutScheduleOptions = computed(() => {
  const shiftMode = selectedLayoutShiftMode.value;

  if (!shiftMode) {
    return [];
  }

  return LAYOUT_CARD_META.filter((card) =>
    isLayoutCardCompatible(card, shiftMode),
  ).map((card) => ({
    ...card,
    ...RIIC_LAYOUT_RECOMMENDATION_LAYOUTS[card.layoutId],
    id: card.layoutId,
    displayShiftMode: shiftMode,
    value: `${shiftMode}:${card.key}`,
    facilitySummary: getLayoutFacilitySummary(card),
  }));
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
  const facilityEntries = [
    ...(card?.rooms || []).map((room) => ({
      roomKey: room.key,
      roomCount: room.count,
      facilityType: getLayoutRoomFacility(room),
      product: ROOM_CANDIDATE_PRODUCTS[room.key] || "all",
    })),
    ...STATIC_SCHEDULE_ROOM_GROUPS.map((group) => ({
      roomKey: group.key,
      roomCount: group.count,
      facilityType: group.key === "office" ? "hire" : group.key,
      product: ROOM_CANDIDATE_PRODUCTS[group.key] || "all",
    })),
  ];
  const facilities = facilityEntries.flatMap((entry) => {
    const stationCount = Math.max(0, Number(entry.roomCount || 0));
    const stations = getRiicRoomStations({
      facilityProfile: activeFacilityProfile.value,
      roomKey: entry.roomKey,
      roomCount: stationCount,
    });

    return Array.from({ length: stationCount }, (_, index) => ({
      facilityType: entry.facilityType,
      product: entry.product,
      stationLevel: Number(stations[index]?.stationLevel) || null,
    }));
  });

  return {
    facilities,
    powerPlantCount: countFacility("power"),
    tradingStationCount: countFacility("trading"),
    goldManufactureStationCount: (card?.rooms || []).reduce(
      (total, room) =>
        room?.key === "gold-manufacture"
          ? total + Number(room?.count || 0)
          : total,
      0,
    ),
    manufactureProductKindCount: new Set(
      (card?.rooms || []).flatMap((room) =>
        getLayoutRoomFacility(room) === "manufacture" &&
        ROOM_CANDIDATE_PRODUCTS[room.key] &&
        ROOM_CANDIDATE_PRODUCTS[room.key] !== "all"
          ? [ROOM_CANDIDATE_PRODUCTS[room.key]]
          : [],
      ),
    ).size,
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
      manualControl: Boolean(group.manualControl),
      fallbackOnly: Boolean(group.fallbackOnly),
      candidateGenerationAvailable:
        Boolean(candidateProduct) && !group.manualControl,
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
      id: "control",
      groups: ["control"].map((key) => groupsByKey.get(key)).filter(Boolean),
    },
    {
      id: "production",
      groups: scheduleRoomGroups.value,
    },
    {
      id: "support",
      groups: ["meeting", "office", "dormitory", "processing", "training"]
        .map((key) => groupsByKey.get(key))
        .filter(Boolean),
    },
  ];
});
const navigableScheduleRoomGroups = computed(() =>
  roomGroupSelectionRows.value.flatMap((row) => row.groups),
);
const selectableScheduleRoomGroups = computed(() =>
  navigableScheduleRoomGroups.value.filter(
    (group) =>
      group.manualControl ||
      group.candidateGenerationAvailable ||
      group.fallbackOnly,
  ),
);
const activeScheduleRoomGroup = computed(
  () =>
    navigableScheduleRoomGroups.value.find(
      (group) => group.id === activeScheduleRoomGroupKey.value,
    ) || null,
);
const controlScheduleRoomGroup = computed(
  () =>
    selectableScheduleRoomGroups.value.find(
      (group) => group.manualControl,
    ) || null,
);
const riicMatchingRoster = computed(() => {
  if (ownedOperators.value.length === 0) {
    return null;
  }

  return ownedOperators.value;
});
const riicLayer3RuleChecks = computed(() => {
  if (!confirmedLayoutPlan.value || !riicMatchingRoster.value) {
    return [];
  }

  return getRiicLayer3RuleConditionChecks({
    ownedOperators: riicMatchingRoster.value,
    layoutFacts: activeLayoutFacilityCounts.value,
  });
});
const riicLayer3MatchedRuleCount = computed(
  () => riicLayer3RuleChecks.value.filter((rule) => rule.matched).length,
);
const riicTrainingMode = computed(() =>
  treatUnderleveledOperatorsAsQualified.value ? "ideal" : "current",
);

const controlCenterStaffingRequirement = computed(() => {
  const group = controlScheduleRoomGroup.value;
  if (!group) {
    return { status: "missingCapacity", segmentHours: [] };
  }

  return getRiicRoomGroupStaffingRequirement({
    stations: group.stations,
    shiftMode: confirmedLayoutPlan.value?.shiftMode,
    roomType: "control",
    twoShiftRotationMode: twoShiftRotationMode.value,
  });
});
const controlCenterCandidateOperators = computed(() => {
  const rosterById = new Map();

  for (const operator of riicMatchingRoster.value || []) {
    const charId = String(operator?.charId || "").trim();
    if (!charId) {
      continue;
    }

    const current = rosterById.get(charId);
    if (
      !current ||
      toRiicControlCenterUnlockNumber(operator?.elite) >
        toRiicControlCenterUnlockNumber(current?.elite) ||
      (toRiicControlCenterUnlockNumber(operator?.elite) ===
        toRiicControlCenterUnlockNumber(current?.elite) &&
        toRiicControlCenterUnlockNumber(operator?.level, 1) >
          toRiicControlCenterUnlockNumber(current?.level, 1))
    ) {
      rosterById.set(charId, operator);
    }
  }

  const activeTagsByOperatorId = new Map();
  const activeEffectsByOperatorId = new Map();
  for (const skill of RIIC_CONTROL_CENTER_SKILLS.skills || []) {
    const charId = String(skill?.operatorId || "").trim();
    const operator = rosterById.get(charId);
    const tags = [...new Set(skill?.bufftag || [])].filter(Boolean);
    if (
      !operator ||
      tags.length === 0 ||
      !isRiicControlCenterSkillUnlocked(operator, skill, {
        trainingMode: riicTrainingMode.value,
        idealTrainingRaritySelection: idealTrainingRaritySelection.value,
      })
    ) {
      continue;
    }

    const activeTags = activeTagsByOperatorId.get(charId) || new Set();
    tags.forEach((tag) => activeTags.add(tag));
    activeTagsByOperatorId.set(charId, activeTags);

    const activeEffects = activeEffectsByOperatorId.get(charId) || new Map();
    for (const effect of skill?.resolvedEffects || []) {
      if (isRiicControlCenterRoomEffect(effect)) {
        activeEffects.set(getRiicControlCenterRoomEffectKey(effect), effect);
      }
    }
    activeEffectsByOperatorId.set(charId, activeEffects);
  }

  return [...activeTagsByOperatorId.entries()]
    .map(([charId, tags]) => {
      const resolvedEffects = new Map(
        activeEffectsByOperatorId.get(charId) || [],
      );
      for (const effect of getRiicLayer3ControlCenterEffects({
        operatorId: charId,
        ownedOperators: riicMatchingRoster.value,
        layoutFacts: activeLayoutFacilityCounts.value,
      })) {
        if (isRiicControlCenterRoomEffect(effect)) {
          resolvedEffects.set(getRiicControlCenterRoomEffectKey(effect), effect);
        }
      }

      return {
        ...rosterById.get(charId),
        controlCenterBuffTags: [...tags],
        controlCenterResolvedEffects: [...resolvedEffects.values()],
        controlCenterRoomEffectLabel: [...resolvedEffects.values()]
          .map(formatRiicControlCenterRoomEffect)
          .filter(Boolean)
          .join(" / "),
      };
    })
    .sort(
      (left, right) =>
        String(left?.name || "").localeCompare(
          String(right?.name || ""),
          "zh-CN",
        ) ||
        String(left?.charId || "").localeCompare(
          String(right?.charId || ""),
          "en",
        ),
    );
});
function operatorMatchesControlCenterFunctionRole(operator, role) {
  const tags = operator?.controlCenterBuffTags || [];
  return role.buffTags.some((tag) => tags.includes(tag));
}

function getControlCenterFunctionRoleScore(operator, role) {
  return Math.max(
    0,
    ...(operator?.controlCenterResolvedEffects || [])
      .filter(
        (effect) =>
          !effect?.conditions &&
          String(effect?.target?.roomType || "").trim() ===
          role.targetRoomType,
      )
      .map((effect) => Number(effect?.bonusPercent || 0))
      .filter(Number.isFinite),
  );
}

function getControlCenterScenarioTrialScore(operator) {
  const operatorId = String(operator?.charId || "").trim();
  const scenario = (
    riicControlCenterScenarioTrialState.value?.scenarios || []
  ).find((item) => String(item?.sourceOperatorId || "").trim() === operatorId);
  const score = Number(scenario?.deltaScore ?? scenario?.contributionScore);
  return Number.isFinite(score) ? score : 0;
}

const controlCenterAutomaticRoleState = computed(() => {
  const requirement = controlCenterStaffingRequirement.value;
  const group = controlScheduleRoomGroup.value;
  if (requirement.status !== "ready" || !group) {
    return {
      status: "missingCapacity",
      roles: [],
      operatorIds: [],
      segments: [],
      emptySlotCount: 0,
    };
  }

  if (!riicMatchingRoster.value) {
    return {
      status: "requiresOperators",
      roles: [],
      operatorIds: [],
      segments: [],
      emptySlotCount: 0,
    };
  }

  const station = group.stations.find(Boolean);
  const slotCount = Number.isInteger(station?.slotCount)
    ? station.slotCount
    : 5;
  const roleTeamCount = Math.max(
    1,
    Number(requirement?.cohorts?.[0]?.teamCount) || 1,
  );
  const roleCapacity = Math.min(2, roleTeamCount);
  const roles = CONTROL_CENTER_FUNCTION_ROLE_DEFINITIONS.map((definition) => ({
    ...definition,
    enabled: true,
    candidates: controlCenterCandidateOperators.value.filter((operator) =>
      operatorMatchesControlCenterFunctionRole(operator, definition),
    ),
  }));
  const claimedOperatorIds = new Set();
  const selectedOperatorsByRoleId = new Map(
    roles.map((role) => [role.id, []]),
  );
  const candidateRolePairs = roles
    .filter((role) => role.enabled)
    .flatMap((role) =>
      role.candidates.map((operator) => ({
        role,
        operator,
      })),
    )
    .sort(
      (left, right) =>
        getControlCenterScenarioTrialScore(right.operator) -
          getControlCenterScenarioTrialScore(left.operator) ||
        getControlCenterFunctionRoleScore(right.operator, right.role) -
          getControlCenterFunctionRoleScore(left.operator, left.role) ||
        left.role.candidates.length - right.role.candidates.length ||
        String(left.operator?.name || "").localeCompare(
          String(right.operator?.name || ""),
          "zh-CN",
        ) ||
        String(left.operator?.charId || "").localeCompare(
          String(right.operator?.charId || ""),
          "en",
        ) ||
        left.role.id.localeCompare(right.role.id, "en"),
    );

  for (const { role, operator } of candidateRolePairs) {
    const selectedOperators = selectedOperatorsByRoleId.get(role.id) || [];
    if (
      claimedOperatorIds.has(operator.charId) ||
      selectedOperators.length >= roleCapacity
    ) {
      continue;
    }

    selectedOperators.push(operator);
    selectedOperatorsByRoleId.set(role.id, selectedOperators);
    claimedOperatorIds.add(operator.charId);
  }

  const resolvedRoles = roles.map((role) => ({
    ...role,
    operators: selectedOperatorsByRoleId.get(role.id) || [],
    operator: (selectedOperatorsByRoleId.get(role.id) || [])[0] || null,
  }));
  const allRoles = [
    ...resolvedRoles,
    {
      id: "other",
      label: "其他中枢干员",
      targetRoomType: "",
      buffTags: [],
      enabled: true,
      candidates: controlCenterCandidateOperators.value,
      operators: [],
      operator: null,
    },
  ];
  const operatorIds = [
    ...new Set(
      allRoles.flatMap((role) =>
        role.operators.map((operator) => operator.charId),
      ),
    ),
  ];
  const controlCohort = requirement?.cohorts?.[0];
  const segments = requirement.segmentHours.map((durationHours, index) => {
    const rotationSegment = controlCohort?.rotationSegments?.[index];
    const teamIndex = Number.isInteger(rotationSegment?.activeTeamIndexes?.[0])
      ? rotationSegment.activeTeamIndexes[0]
      : index % roleTeamCount;
    const operators = [
      ...resolvedRoles.map((role) => role.operators[teamIndex]),
    ].filter(Boolean);

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
  const maxSegmentOperatorCount = Math.max(
    0,
    ...segments.map((segment) => segment.operatorIds.length),
  );

  return {
    status: "ready",
    roles: allRoles,
    operatorIds,
    segments,
    emptySlotCount: Math.max(0, slotCount - maxSegmentOperatorCount),
  };
});
function getControlCenterManualAddedOperatorIds(overrides) {
  return [
    ...new Set(
      Object.values(overrides?.addedOperatorIdsByTeamIndex || {})
        .flat()
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function getControlCenterManualOperatorById(charId) {
  return (
    controlCenterCandidateOperators.value.find(
      (operator) => operator.charId === charId,
    ) || null
  );
}

const controlCenterRoleState = computed(() => {
  const automaticState = controlCenterAutomaticRoleState.value;
  if (automaticState.status !== "ready") {
    return automaticState;
  }

  const removedOperatorIds = new Set(
    controlCenterManualOverrides.value.removedOperatorIds || [],
  );
  const addedOperatorIds = new Set(
    getControlCenterManualAddedOperatorIds(controlCenterManualOverrides.value),
  );
  const manuallyAddedOperators = [...addedOperatorIds]
    .map(getControlCenterManualOperatorById)
    .filter(Boolean);

  const roles = automaticState.roles.map((role) => {
    const operators = role.operators.filter(
      (operator) =>
        !removedOperatorIds.has(operator.charId) &&
        !addedOperatorIds.has(operator.charId),
    );
    if (role.id === "other") {
      operators.push(...manuallyAddedOperators);
    }

    return {
      ...role,
      operators,
      operator: operators[0] || null,
    };
  });
  const segments = automaticState.segments.map((segment) => {
    const operators = segment.operators.filter(
      (operator) =>
        !removedOperatorIds.has(operator.charId) &&
        !addedOperatorIds.has(operator.charId),
    );
    const manuallyAddedOperatorsForTeam = (
      controlCenterManualOverrides.value.addedOperatorIdsByTeamIndex?.[
        String(segment.teamIndex)
      ] || []
    )
      .map((charId) => getControlCenterManualOperatorById(charId))
      .filter(Boolean);
    const nextOperators = [
      ...operators,
      ...manuallyAddedOperatorsForTeam,
    ].filter(
      (operator, index, list) =>
        list.findIndex((item) => item.charId === operator.charId) === index,
    );
    const finalOperators = nextOperators.slice(0, segment.slotCount);

    return {
      ...segment,
      operatorIds: finalOperators.map((operator) => operator.charId),
      operators: finalOperators,
    };
  });
  const operatorIds = [
    ...new Set(segments.flatMap((segment) => segment.operatorIds)),
  ];
  const maxSegmentOperatorCount = Math.max(
    0,
    ...segments.map((segment) => segment.operatorIds.length),
  );

  return {
    ...automaticState,
    roles,
    segments,
    operatorIds,
    emptySlotCount: Math.max(
      0,
      (automaticState.segments[0]?.slotCount || 0) - maxSegmentOperatorCount,
    ),
  };
});

function clearScheduleSelectionsAfterControlCenterChange() {
  clearSelectedRoomGroupTeamCandidates();
  recommendedScheduleSnapshot.value = null;
}

function getControlCenterManualTeamIndexWithCapacity() {
  const segments = controlCenterRoleState.value.segments || [];
  const teamIndexes = [
    ...new Set(
      segments
        .map((segment) => Number(segment?.teamIndex))
        .filter((teamIndex) => Number.isInteger(teamIndex) && teamIndex >= 0),
    ),
  ];

  return (
    teamIndexes.find((teamIndex) => {
      const teamSegments = segments.filter(
        (segment) => Number(segment?.teamIndex) === teamIndex,
      );
      return (
        teamSegments.length > 0 &&
        teamSegments.every(
          (segment) =>
            (segment.operatorIds || []).length <
            Number(segment.slotCount || 0),
        )
      );
    }) ?? null
  );
}

function addControlCenterOperator(charId) {
  const normalizedCharId = String(charId || "").trim();
  if (
    !normalizedCharId ||
    controlCenterRoleState.value.status !== "ready" ||
    !getControlCenterManualOperatorById(normalizedCharId)
  ) {
    return;
  }

  if (controlCenterSelectedOperatorIds.value.has(normalizedCharId)) {
    return;
  }

  const nextOverrides = normalizeControlCenterManualOverrides(
    controlCenterManualOverrides.value,
  );
  const automaticOperatorIds = new Set(
    controlCenterAutomaticRoleState.value.operatorIds || [],
  );
  nextOverrides.removedOperatorIds = nextOverrides.removedOperatorIds.filter(
    (operatorId) => operatorId !== normalizedCharId,
  );

  if (automaticOperatorIds.has(normalizedCharId)) {
    controlCenterManualOverrides.value = nextOverrides;
    clearScheduleSelectionsAfterControlCenterChange();
    return;
  }

  const teamIndex = getControlCenterManualTeamIndexWithCapacity();
  if (teamIndex === null) {
    cMessage("控制中枢没有可用空位", "warn");
    return;
  }

  const teamKey = String(teamIndex);
  const teamOperatorIds =
    nextOverrides.addedOperatorIdsByTeamIndex[teamKey] || [];
  if (!teamOperatorIds.includes(normalizedCharId)) {
    nextOverrides.addedOperatorIdsByTeamIndex[teamKey] = [
      ...teamOperatorIds,
      normalizedCharId,
    ];
  }
  controlCenterManualOverrides.value = nextOverrides;
  clearScheduleSelectionsAfterControlCenterChange();
}

function removeControlCenterOperator(charId) {
  const normalizedCharId = String(charId || "").trim();
  if (!normalizedCharId) {
    return;
  }

  const lateFillOperatorIds = new Set(
    controlCenterLateFillState.value.operatorIds || [],
  );
  const nextOverrides = normalizeControlCenterManualOverrides(
    controlCenterManualOverrides.value,
  );
  let wasManuallyAdded = false;
  for (const [teamIndex, operatorIds] of Object.entries(
    nextOverrides.addedOperatorIdsByTeamIndex,
  )) {
    const nextOperatorIds = operatorIds.filter(
      (operatorId) => operatorId !== normalizedCharId,
    );
    wasManuallyAdded =
      wasManuallyAdded || nextOperatorIds.length !== operatorIds.length;
    if (nextOperatorIds.length > 0) {
      nextOverrides.addedOperatorIdsByTeamIndex[teamIndex] = nextOperatorIds;
    } else {
      delete nextOverrides.addedOperatorIdsByTeamIndex[teamIndex];
    }
  }

  if (
    !wasManuallyAdded &&
    (controlCenterAutomaticRoleState.value.operatorIds || []).includes(
      normalizedCharId,
    ) &&
    !nextOverrides.removedOperatorIds.includes(normalizedCharId)
  ) {
    nextOverrides.removedOperatorIds.push(normalizedCharId);
  }

  if (
    !wasManuallyAdded &&
    !(controlCenterAutomaticRoleState.value.operatorIds || []).includes(
      normalizedCharId,
    ) &&
    lateFillOperatorIds.has(normalizedCharId)
  ) {
    controlCenterLateFillExcludedOperatorIds.value = [
      ...new Set([
        ...controlCenterLateFillExcludedOperatorIds.value,
        normalizedCharId,
      ]),
    ];
    return;
  }

  controlCenterManualOverrides.value = nextOverrides;
  clearScheduleSelectionsAfterControlCenterChange();
}

const controlCenterSelectedOperatorIds = computed(
  () => new Set(controlCenterRoleState.value.operatorIds),
);
const controlCenterRuntimeContext = computed(() =>
  buildRiicControlCenterRuntimeContext({
    controlState: controlCenterRoleState.value,
  }),
);

function formatRiicControlCenterSignedPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) {
    return "--";
  }

  return `${percent >= 0 ? "+" : ""}${
    Number.isInteger(percent) ? percent : percent.toFixed(1)
  }%`;
}

const riicControlCenterOperatorEffectDebugState = computed(() => {
  if (!riicMatchingRoster.value) {
    return {
      status: "requiresOperators",
      effects: [],
    };
  }

  const context = controlCenterRuntimeContext.value;
  if (context.status !== "ready") {
    return {
      status: context.status,
      effects: [],
    };
  }

  const ownedOperatorIds = new Set(
    riicMatchingRoster.value
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );
  const calculationsByKey = new Map();

  for (const [teamIndex, teamEffects] of Object.entries(
    context.effectsByTeamIndex || {},
  )) {
    for (const [effectIndex, effect] of (teamEffects || []).entries()) {
      if (effect?.scope !== "operators") {
        continue;
      }

      const sourceOperatorIds = (effect?.sourceOperatorIds || [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter(Boolean);
      for (const operatorId of (effect?.targetOperatorIds || [])
        .map((operatorId) => String(operatorId || "").trim())
        .filter((operatorId) => ownedOperatorIds.has(operatorId))
      ) {
        const roomType = String(effect?.roomType || "").trim();
        const product = String(effect?.product || "").trim();
        const metric = String(effect?.metric || "").trim();
        const key = [
          teamIndex,
          operatorId,
          roomType,
          product,
          metric,
        ].join(":");
        const calculation = calculationsByKey.get(key) || {
          key,
          teamIndex: Number(teamIndex),
          targetOperatorId: operatorId,
          roomType,
          product,
          metric,
          contributions: [],
        };

        calculation.contributions.push({
          key: [
            key,
            effectIndex,
            ...sourceOperatorIds,
          ].join(":"),
          sourceOperatorIds,
          bonusPercent: Number(effect?.bonusPercent || 0),
          sourceOrder: effectIndex,
        });
        calculationsByKey.set(key, calculation);
      }
    }
  }

  const effects = [...calculationsByKey.values()].map((calculation) => {
    let totalBonusPercent = 0;
    const contributions = calculation.contributions
      .sort(
        (left, right) =>
          left.sourceOrder - right.sourceOrder ||
          left.key.localeCompare(right.key, "en"),
      )
      .map((contribution, index) => {
        const beforeBonusPercent = totalBonusPercent;
        totalBonusPercent += contribution.bonusPercent;
        return {
          ...contribution,
          step: index + 1,
          beforeBonusPercent,
          totalAfterBonusPercent: totalBonusPercent,
        };
      });

    return {
      ...calculation,
      contributions,
      totalBonusPercent,
      formula: contributions
        .map((contribution) =>
          formatRiicControlCenterSignedPercent(contribution.bonusPercent),
        )
        .join(" + "),
    };
  });

  return {
    status: "ready",
    effects: effects.sort(
      (left, right) =>
        left.teamIndex - right.teamIndex ||
        left.targetOperatorId.localeCompare(right.targetOperatorId, "en") ||
        left.key.localeCompare(right.key, "en"),
    ),
  };
});
const controlCenterAssignmentSignature = computed(() => {
  const roleSignature = controlCenterRoleState.value.roles
    .map(
      (role) =>
        `${role.id}:${role.operators
          .map((operator) => operator.charId)
          .join(",")}`,
    )
    .join("|");
  const segmentSignature = controlCenterRoleState.value.segments
    .map(
      (segment) =>
        `${segment.teamIndex}:${segment.operatorIds.join(",")}`,
    )
    .join("|");

  return `${roleSignature}::${segmentSignature}`;
});

const riicResolvedSkills = computed(() =>
  resolveRiicBaselineSkills(
    riicMatchingRoster.value || [],
    RIIC_BASELINE_SKILL_RULES,
    {
      trainingMode: riicTrainingMode.value,
      idealTrainingRaritySelection: idealTrainingRaritySelection.value,
    },
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
const riicStaticCatalogLoadingPromisesByKey = new Map();

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

  if (
    requests.some(
      (request) =>
        riicStaticCatalogLoadStatesByKey.value[request.key] === "loading" ||
        riicStaticCatalogLoadingPromisesByKey.has(request.key),
    )
  ) {
    return "loading";
  }

  return "idle";
}

function getRoomGroupCandidateSortBonus(candidate) {
  return getRiicRuntimeCandidateRankingValue(candidate);
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
  if (!group?.candidateGenerationAvailable) {
    return;
  }

  const requests = getRoomGroupCatalogRequests(group).filter(
    (request) => request.key,
  );
  if (requests.length === 0) {
    return;
  }

  await Promise.all(
    requests.map(({ station, key }) => {
      if (riicStaticCatalogsByKey.value[key]) {
        return Promise.resolve();
      }

      const loadingPromise = riicStaticCatalogLoadingPromisesByKey.get(key);
      if (loadingPromise) {
        return loadingPromise;
      }

      riicStaticCatalogLoadStatesByKey.value = {
        ...riicStaticCatalogLoadStatesByKey.value,
        [key]: "loading",
      };

      const nextLoadingPromise = loadRiicStaticRoomCandidateCatalog({
        roomType: getStaticRoomCandidateCatalogFacility(group),
        product: group.candidateProduct,
        stationLevel: station.stationLevel,
        slotCount: station.slotCount,
      })
        .then((library) => {
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
        })
        .catch((error) => {
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
        })
        .finally(() => {
          riicStaticCatalogLoadingPromisesByKey.delete(key);
        });

      riicStaticCatalogLoadingPromisesByKey.set(key, nextLoadingPromise);
      return nextLoadingPromise;
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

function createFallbackOnlyRoomGroupCohort(cohort, fallbackCandidate) {
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

function createRoomGroupCandidateState(group) {
  if (!group) {
    return { status: "idle", cohorts: [] };
  }

  if (group.manualControl) {
    return { status: "manualControl", cohorts: [] };
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
    const catalogLoadState = getRoomGroupCatalogLoadState(group);

    return {
      status:
        catalogLoadState === "failed"
          ? "catalogLoadFailed"
          : catalogLoadState === "idle"
            ? "catalogNotLoaded"
            : "catalogLoading",
      catalogErrors: getRoomGroupCatalogErrors(group),
      cohorts: [],
    };
  }

  const cohorts = staffingRequirement.cohorts.map((cohort) => {
    const library = catalogsByCohortId.get(cohort.id);
    const candidateSkeletons = resolveRiicRoomCandidateSkeletons({
      catalog: group.fallbackOnly
        ? {
            ...library.catalog,
            candidates: [],
          }
        : library.catalog,
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
      manufactureProductKindCount:
        activeLayoutFacilityCounts.value.manufactureProductKindCount,
      facilities: activeLayoutFacilityCounts.value.facilities,
      trainingMode: riicTrainingMode.value,
      idealTrainingRaritySelection: idealTrainingRaritySelection.value,
    });
    const matchedCandidates = materializeRiicRoomCandidateSkeletons({
      resolution: candidateSkeletons,
      controlCenterRuntimeContext: controlCenterRuntimeContext.value,
    });

    const candidates = matchedCandidates.candidates
      .map(enrichRoomGroupCandidateFallback)
      .sort(compareRoomGroupCandidates);
    const fallbackCandidate = enrichRoomGroupCandidateFallback(
      matchedCandidates.fallbackCandidate,
    );
    if (group.fallbackOnly) {
      return createFallbackOnlyRoomGroupCohort(cohort, fallbackCandidate);
    }
    const manualFallbackCandidates = fallbackCandidate
      ? Array.from(
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
        )
      : [];

    return {
      ...cohort,
      candidates: [
        ...candidates,
        ...manualFallbackCandidates,
      ],
      fallbackCandidate,
      manualFallbackCandidates,
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
const roomGroupCandidateStates = computed(() =>
  Object.fromEntries(
    selectableScheduleRoomGroups.value.map((group) => [
      group.id,
      createRoomGroupCandidateState(group),
    ]),
  ),
);
const riicControlCenterScenarioTrialState = computed(() => {
  if (!confirmedLayoutPlan.value) {
    return {
      status: "requiresLayout",
      scenarios: [],
    };
  }
  if (!riicMatchingRoster.value) {
    return {
      status: "requiresOperators",
      scenarios: [],
    };
  }

  return {
    status: "ready",
    scenarios: evaluateRiicControlCenterScenarios({
      skills: RIIC_CONTROL_CENTER_SKILLS.skills,
      ownedOperators: riicMatchingRoster.value,
      layoutFacts: activeLayoutFacilityCounts.value,
      trainingMode: riicTrainingMode.value,
      idealTrainingRaritySelection: idealTrainingRaritySelection.value,
    }),
  };
});
const riicPerceptionResourceTrialState = computed(() => {
  if (!confirmedLayoutPlan.value) {
    return {
      status: "requiresLayout",
      scenarios: [],
    };
  }
  if (!riicMatchingRoster.value) {
    return {
      status: "requiresOperators",
      scenarios: [],
    };
  }

  return evaluateRiicPerceptionResourceTrials({
    ownedOperators: riicMatchingRoster.value,
    layoutFacts: activeLayoutFacilityCounts.value,
    controlState: controlCenterRoleState.value,
  });
});
const activeRoomGroupCandidateState = computed(() => {
  const group = activeScheduleRoomGroup.value;

  if (!group) {
    return { status: "idle", cohorts: [] };
  }

  if (!group.manualControl && !group.candidateGenerationAvailable) {
    return { status: "outOfScope", cohorts: [] };
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
    const group = activeScheduleRoomGroup.value;
    if (group?.candidateGenerationAvailable) {
      ensureRoomGroupCatalogLoaded(group);
    }
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
    const selectionComplete =
      selectedCandidates.length >= Number(cohort.teamCount || 0);
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
    const fallbackCandidateCount = cohort.teamCount;
    const selectableCandidates = [
      ...selectedCandidates,
      ...selectableNamedCandidates,
      ...selectableFallbackCandidates.slice(0, fallbackCandidateCount),
    ];
    const displayCount = getVisibleRoomGroupCandidateCount(group, cohort);
    const displayNamedCandidates = selectableNamedCandidates.slice(
      0,
      Math.max(0, displayCount - selectedCandidates.length),
    );
    const displayFallbackCandidates = selectableFallbackCandidates.slice(
      0,
      fallbackCandidateCount,
    );
    const displayCandidates = selectionComplete
      ? selectedCandidates
      : [
          ...selectedCandidates,
          ...displayNamedCandidates,
          ...displayFallbackCandidates,
        ];

    return {
      ...cohort,
      fallbackCandidate,
      displayCandidates,
      availableCandidateCount: selectableCandidates.length,
      selectionComplete,
      hasMoreCandidates:
        !selectionComplete &&
        displayNamedCandidates.length < selectableNamedCandidates.length,
    };
  });
});

function getRoomGroupTeamCandidateKeys(groupId) {
  const state = roomGroupCandidateStates.value[groupId];
  if (state?.fallbackOnly) {
    return Object.fromEntries(
      (state.cohorts || []).map((cohort) => [
        cohort.id,
        (cohort.candidates || [])
          .slice(0, Number(cohort.teamCount || 0))
          .map((candidate) => candidate.key),
      ]),
    );
  }
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

function getSavedTeamCandidateCount(groupId, cohort) {
  const savedKeys =
    selectedRoomGroupTeamCandidateKeys.value[groupId]?.[cohort?.id] || [];

  return Math.min(
    new Set(
      savedKeys
        .map((key) => String(key || "").trim())
        .filter(Boolean),
    ).size,
    Number(cohort?.teamCount || 0),
  );
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

function getClaimedNamedOperatorIds({ includeControlCenter = true } = {}) {
  const claimedOperatorIds = new Set(
    includeControlCenter ? controlCenterSelectedOperatorIds.value : [],
  );

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
  if (group?.fallbackOnly) {
    const staffingRequirement = getRiicRoomGroupStaffingRequirement({
      stations: group?.stations || [],
      shiftMode: confirmedLayoutPlan.value?.shiftMode,
      roomType: group?.facility,
      twoShiftRotationMode: twoShiftRotationMode.value,
    });
    const fallbackPlan = getRoomGroupFallbackPlan(group);
    const requiredTeamCount =
      Number(fallbackPlan?.pendingCount) ||
      Number(staffingRequirement?.operatorCount) ||
      0;
    const selectedTeamCount = Math.min(
      requiredTeamCount,
      Number(fallbackPlan?.selectedCount || 0),
    );

    return {
      selectedTeamCount,
      requiredTeamCount,
      complete:
        state?.status === "ready" &&
        fallbackPlan?.status === "ready" &&
        requiredTeamCount > 0,
    };
  }
  const matchedCohorts = state?.cohorts || [];
  const staffingRequirement = getRiicRoomGroupStaffingRequirement({
    stations: group?.stations || [],
    shiftMode: confirmedLayoutPlan.value?.shiftMode,
    roomType: group?.facility,
    twoShiftRotationMode: twoShiftRotationMode.value,
  });
  const cohorts =
    matchedCohorts.length > 0
      ? matchedCohorts
      : staffingRequirement.status === "ready"
        ? staffingRequirement.cohorts
        : [];
  const canValidateSavedKeys = matchedCohorts.length > 0;
  const selectedTeamCount = cohorts.reduce(
    (total, cohort) =>
      total +
      (canValidateSavedKeys
        ? getSelectedTeamCandidateCount(group, cohort)
        : getSavedTeamCandidateCount(group?.id, cohort)),
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
      (state?.status === "ready" ||
        state?.status === "catalogNotLoaded") &&
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
    clearRoomGroupFallbackQueue(group.id);
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
  clearRoomGroupFallbackQueue(group.id);
}

function getAutomaticRoomGroupPriority(group) {
  return ["meeting", "office"].includes(group?.facility) ? 1 : 0;
}

function getRoomGroupFallbackPlanningGroups() {
  const groups = [...candidateEnabledScheduleRoomGroups.value];
  const orderById = new Map(
    groups.map((group, index) => [group.id, index]),
  );

  return groups.sort(
    (left, right) =>
      getAutomaticRoomGroupPriority(left) -
        getAutomaticRoomGroupPriority(right) ||
      Number(orderById.get(left.id) || 0) - Number(orderById.get(right.id) || 0),
  );
}

function buildAutomaticRoomGroupSelectionsForGroups({
  groups,
  claimedOperatorIds,
  reservedOperatorIds = new Set(),
  initialSelections = {},
}) {
  const unavailableGroups = [];
  const pendingCohorts = [];

  for (const group of groups) {
    if (group.fallbackOnly) {
      continue;
    }

    const state = roomGroupCandidateStates.value[group.id];
    if (state?.status !== "ready") {
      unavailableGroups.push(group.label);
      continue;
    }

    for (const cohort of state.cohorts || []) {
      const initialKeys = [
        ...new Set(initialSelections[group.id]?.[cohort.id] || []),
      ];
      const availableKeys = new Set(
        (cohort.candidates || []).map((candidate) => candidate.key),
      );
      if (
        initialKeys.length > cohort.teamCount ||
        initialKeys.some((candidateKey) => !availableKeys.has(candidateKey))
      ) {
        unavailableGroups.push(group.label);
        continue;
      }

      pendingCohorts.push({
        group,
        cohort,
        selectedKeys: initialKeys,
      });
    }
  }

  while (true) {
    const availableStates = pendingCohorts
      .filter(
        ({ selectedKeys, cohort }) =>
          selectedKeys.length < cohort.teamCount,
      )
      .map((selection) => {
        const availableCandidates = (selection.cohort.candidates || []).filter(
          (candidate) =>
            candidate &&
            !selection.selectedKeys.includes(candidate.key) &&
            !(candidate.operatorIds || []).some(
              (charId) =>
                claimedOperatorIds.has(charId) ||
                reservedOperatorIds.has(charId),
            ),
        );

        return {
          ...selection,
          availableCandidates,
          remainingCount:
            selection.cohort.teamCount - selection.selectedKeys.length,
        };
      });

    if (availableStates.length === 0) {
      break;
    }

    for (const state of availableStates) {
      if (state.availableCandidates.length === 0) {
        unavailableGroups.push(state.group.label);
      }
    }
    const selectableStates = availableStates.filter(
      ({ availableCandidates }) => availableCandidates.length > 0,
    );
    if (selectableStates.length === 0) {
      break;
    }

    const nextSelection = selectableStates.sort((left, right) => {
      const rankingDifference =
        getRoomGroupCandidateSortBonus(right.availableCandidates[0]) -
        getRoomGroupCandidateSortBonus(left.availableCandidates[0]);
      if (rankingDifference !== 0) {
        return rankingDifference;
      }

      return `${left.group.id}:${left.cohort.id}`.localeCompare(
        `${right.group.id}:${right.cohort.id}`,
        "en",
      );
    })[0];
    const candidate = nextSelection.availableCandidates[0];

    nextSelection.selectedKeys.push(candidate.key);
    for (const charId of candidate.operatorIds || []) {
      claimedOperatorIds.add(charId);
    }
  }

  for (const { group, cohort, selectedKeys } of pendingCohorts) {
    if (selectedKeys.length < cohort.teamCount) {
      unavailableGroups.push(group.label);
    }
  }

  const selectionGroups = {};
  for (const { group, cohort, selectedKeys } of pendingCohorts) {
    selectionGroups[group.id] = {
      ...selectionGroups[group.id],
      [cohort.id]: selectedKeys,
    };
  }

  return {
    selections: selectionGroups,
    unavailableGroups: [...new Set(unavailableGroups)],
  };
}

function reserveAutomaticRoomGroupFallbackOperators({
  groups,
  selections,
  claimedOperatorIds,
  reservedOperatorIds = new Set(),
}) {
  const unavailableGroups = [];

  for (const group of groups) {
    const state = roomGroupCandidateStates.value[group.id];
    const selected = getRoomGroupCandidateEntriesForKeys(
      group,
      state,
      selections[group.id],
      { allowPartial: true },
    );
    if (!selected) {
      unavailableGroups.push(group.label);
      continue;
    }

    const plan = createRiicRoomGroupFallbackPlan({
      selectedEntries: selected.selectedEntries,
      occupiedOperatorIds: new Set([
        ...claimedOperatorIds,
        ...reservedOperatorIds,
      ]),
    });
    if (plan.status !== "ready") {
      unavailableGroups.push(group.label);
    }

    for (const charId of plan.selectedOperatorIds) {
      claimedOperatorIds.add(charId);
    }
  }

  return {
    unavailableGroups: [...new Set(unavailableGroups)],
  };
}

function buildAutomaticRoomGroupSelections() {
  const groups = getRoomGroupFallbackPlanningGroups();
  const primaryGroups = groups.filter(
    (group) => getAutomaticRoomGroupPriority(group) === 0,
  );
  const supportGroups = groups.filter(
    (group) => getAutomaticRoomGroupPriority(group) > 0,
  );
  const claimedOperatorIds = new Set(controlCenterSelectedOperatorIds.value);
  const primarySelection = buildAutomaticRoomGroupSelectionsForGroups({
    groups: primaryGroups,
    claimedOperatorIds,
  });

  const primaryFallbackReservation = reserveAutomaticRoomGroupFallbackOperators({
    groups: primaryGroups,
    selections: primarySelection.selections,
    claimedOperatorIds,
  });

  const supportSelection = buildAutomaticRoomGroupSelectionsForGroups({
    groups: supportGroups,
    claimedOperatorIds,
  });

  const supportFallbackReservation = reserveAutomaticRoomGroupFallbackOperators({
    groups: supportGroups,
    selections: supportSelection.selections,
    claimedOperatorIds,
  });

  return {
    selections: {
      ...primarySelection.selections,
      ...supportSelection.selections,
    },
    unavailableGroups: [
      ...primarySelection.unavailableGroups,
      ...primaryFallbackReservation.unavailableGroups,
      ...supportSelection.unavailableGroups,
      ...supportFallbackReservation.unavailableGroups,
    ].filter(
      (groupLabel, index, labels) => labels.indexOf(groupLabel) === index,
    ),
  };
}

function createAutomaticRoomGroupFallbackQueueStates() {
  return Object.fromEntries(
    getRoomGroupFallbackPlanningGroups().flatMap((group) => {
      const plan = roomGroupFallbackPlanStates.value[group.id];
      if (!plan?.fallbackQueueSignature || plan.pendingCount <= 0) {
        return [];
      }

      return [
        [
          group.id,
          {
            signature: plan.fallbackQueueSignature,
            operatorIdBySlotKey: plan.operatorIdBySlotKey,
          },
        ],
      ];
    }),
  );
}

async function generateAutomaticSchedule({ silentSuccess = false } = {}) {
  if (autoGeneratingSchedule.value) {
    automaticGenerationQueued = true;
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

  const generationTriggerKey = automaticGenerationTriggerKey.value;
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
    }

    selectedRoomGroupTeamCandidateKeys.value = selections;
    roomGroupFallbackQueueStates.value = {};
    resetScheduleExecutionSettings();
    activeScheduleRoomGroupKey.value =
      controlScheduleRoomGroup.value?.id ||
      candidateEnabledScheduleRoomGroups.value[0]?.id ||
      "";
    await nextTick();
    roomGroupFallbackQueueStates.value =
      createAutomaticRoomGroupFallbackQueueStates();
    await nextTick();
    recommendedScheduleSnapshot.value = createRecommendedScheduleSnapshot(
      generationTriggerKey,
    );
    if (!silentSuccess) {
      cMessage("已自动生成排班表", "success");
    }
  } catch (error) {
    console.error(error);
    cMessage("自动生成失败，请稍后重试", "error");
  } finally {
    autoGeneratingSchedule.value = false;
    if (automaticGenerationQueued) {
      automaticGenerationQueued = false;
      if (automaticGenerationTriggerKey.value) {
        void generateAutomaticSchedule({ silentSuccess: true });
      }
    }
  }
}

function restoreRecommendedSchedule() {
  void generateAutomaticSchedule();
}

const candidateEnabledScheduleRoomGroups = computed(() =>
  selectableScheduleRoomGroups.value.filter(
    (group) => group.candidateGenerationAvailable,
  ),
);
const completedRoomGroupCatalogLoadKey = computed(() => {
  const groups = candidateEnabledScheduleRoomGroups.value;

  if (
    groups.length === 0 ||
    !groups.every((group) => getRoomGroupSelectionProgress(group).complete)
  ) {
    return "";
  }

  return groups
    .map(
      (group) =>
        `${group.id}:${roomGroupCandidateStates.value[group.id]?.status || ""}`,
    )
    .join("|");
});

watch(
  completedRoomGroupCatalogLoadKey,
  (catalogLoadKey) => {
    if (!catalogLoadKey) {
      return;
    }

    void Promise.all(
      candidateEnabledScheduleRoomGroups.value.map((group) =>
        ensureRoomGroupCatalogLoaded(group),
      ),
    );
  },
  { immediate: true },
);
const automaticGenerationTriggerKey = computed(() => {
  if (
    !confirmedLayoutPlan.value ||
    !riicMatchingRoster.value
  ) {
    return "";
  }

  const rosterSignature = (riicMatchingRoster.value || [])
    .map((operator) => JSON.stringify(operator))
    .sort()
    .join("|");

  return [
    RIIC_AUTOMATIC_SELECTION_STRATEGY_VERSION,
    confirmedLayoutPlan.value.cardKey,
    confirmedLayoutPlan.value.shiftMode,
    confirmedLayoutPlan.value.facilityRequirement || "",
    twoShiftRotationMode.value,
    treatUnderleveledOperatorsAsQualified.value ? "ideal" : "current",
    JSON.stringify(idealTrainingRaritySelection.value),
    controlCenterAssignmentSignature.value,
    rosterSignature,
  ].join("::");
});
const candidateRoomGroupCatalogRequestKey = computed(() =>
  candidateEnabledScheduleRoomGroups.value
    .map((group) => {
      const requestKeys = getRoomGroupCatalogRequests(group)
        .map((request) => request.key)
        .join(",");
      return `${group.id}:${requestKeys}`;
    })
    .join("|"),
);
const staffingSelectionSummary = computed(() => {
  let selectedTeamCount = 0;
  let requiredTeamCount = 0;

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const progress = getRoomGroupSelectionProgress(group);
    requiredTeamCount += progress.requiredTeamCount;
    selectedTeamCount += progress.selectedTeamCount;
  }

  return {
    selectedTeamCount,
    requiredTeamCount,
  };
});
watch(
  [candidateRoomGroupCatalogRequestKey, automaticGenerationTriggerKey],
  ([catalogRequestKey, triggerKey]) => {
    if (!catalogRequestKey) {
      return;
    }

    void Promise.all(
      candidateEnabledScheduleRoomGroups.value.map((group) =>
        ensureRoomGroupCatalogLoaded(group),
      ),
    );
  },
  { immediate: true },
);
watch(
  automaticGenerationTriggerKey,
  (triggerKey, previousTriggerKey) => {
    if (
      !triggerKey ||
      triggerKey === previousTriggerKey ||
      operatorSourceSwitching.value
    ) {
      return;
    }

    if (recommendedScheduleSnapshot.value?.triggerKey === triggerKey) {
      return;
    }

    void generateAutomaticSchedule({ silentSuccess: true });
  },
  { immediate: true },
);
watch(operatorSourceSwitching, (isSwitching, wasSwitching) => {
  if (
    isSwitching ||
    wasSwitching !== true ||
    !automaticGenerationTriggerKey.value
  ) {
    return;
  }

  if (
    recommendedScheduleSnapshot.value?.triggerKey ===
    automaticGenerationTriggerKey.value
  ) {
    return;
  }

  void generateAutomaticSchedule({ silentSuccess: true });
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
function getRoomGroupCandidateEntriesForKeys(
  group,
  state,
  selectedCandidateKeysByCohort,
  { allowPartial = false } = {},
) {
  if (state?.status !== "ready") {
    return null;
  }

  const normalizedSelectedCandidateKeysByCohort = group?.fallbackOnly
    ? getRoomGroupTeamCandidateKeys(group.id)
    : selectedCandidateKeysByCohort || {};
  const selectedCandidatesByCohort = new Map();
  const selectedEntries = [];

  for (const cohort of state.cohorts || []) {
    const selectedCandidates = (
      normalizedSelectedCandidateKeysByCohort[cohort.id] || []
    )
      .map((candidateKey) =>
        cohort.candidates.find((candidate) => candidate.key === candidateKey),
      )
      .filter(Boolean);
    if (!allowPartial && selectedCandidates.length !== cohort.teamCount) {
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
    selectedCandidateKeysByCohort: normalizedSelectedCandidateKeysByCohort,
    selectedCandidatesByCohort,
    selectedEntries,
  };
}

function getSelectedRoomGroupCandidateEntries(group, state, options) {
  return getRoomGroupCandidateEntriesForKeys(
    group,
    state,
    getRoomGroupTeamCandidateKeys(group.id),
    options,
  );
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

function materializeRoomGroupCandidate(
  candidate,
  fallbackOperators,
  { controlCenterRuntimeContext: runtimeContext } = {},
) {
  const operators = fallbackOperators || [];
  const ordinaryFallbackOperators = operators.filter(
    (operator) => !operator?.taggedMember,
  );
  const fallbackPercent = ordinaryFallbackOperators.reduce(
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
  const automationResult = recalculateRiicAutomationManufacture({
    scope: candidate?.candidateScope,
    coreBaseBonusPercent: candidate?.coreBaseBonusPercent,
    coreLayer3BonusPercent: candidate?.coreLayer3BonusPercent,
    fallbackOperators: operators,
  });
  const expectedControlCenterOperatorBonusPercent = Number(
    candidate?.controlCenterOperatorBonusPercent || 0,
  );
  const controlCenterAdjustment = runtimeContext
    ? getRiicControlCenterRoomAdjustment({
        context: runtimeContext,
        scope: candidate?.candidateScope,
        operatorIds,
      })
    : null;
  const controlCenterOperatorBonusPercent = controlCenterAdjustment
    ? Number(controlCenterAdjustment.operatorBonusPercent || 0)
    : expectedControlCenterOperatorBonusPercent;
  const controlCenterFacilityBonusPercent = controlCenterAdjustment
    ? Number(controlCenterAdjustment.facilityBonusPercent || 0)
    : Number(candidate?.controlCenterFacilityBonusPercent || 0);
  const corePercentBeforeControl =
    Number(candidate?.corePercent || 100) -
    expectedControlCenterOperatorBonusPercent;
  const corePercent =
    corePercentBeforeControl + controlCenterOperatorBonusPercent;
  const totalPercent = automationResult
    ? automationResult.totalPercent + controlCenterOperatorBonusPercent
    : corePercent + fallbackPercent;
  const bonusPercent = totalPercent - 100;
  const localBonusPercent =
    Number(candidate?.localBonusPercent || 0) -
    expectedControlCenterOperatorBonusPercent +
    controlCenterOperatorBonusPercent;
  const localPercentField =
    {
      trading: "tradingPercent",
      manufacture: "manufacturePercent",
      meeting: "meetingPercent",
      hire: "officePercent",
      power: "powerPercent",
    }[String(candidate?.sourceRoomType || "").trim()] || "";

  return {
    ...candidate,
    operatorIds,
    operators: [
      ...(candidate?.operators || []),
      ...operators.map((operator) => ({
        charId: operator.charId,
        name: operator.name,
        scored: true,
        fallback: !operator.taggedMember,
        taggedMember: Boolean(operator.taggedMember),
        upgradeRequirement: operator.upgradeRequirement || null,
      })),
    ],
    upgradeRequirements,
    fallback: {
      ...candidate.fallback,
      count: Math.max(
        0,
        Number(candidate.fallback?.count || 0) - ordinaryFallbackOperators.length,
      ),
      operators,
      fallbackOperatorIds: operators.map((operator) => operator.charId),
      totalPercent: fallbackPercent,
      materialized: operators.length > 0,
    },
    corePercent,
    totalPercent,
    bonusPercent,
    bestAvailableTotalPercent: totalPercent,
    localBonusPercent,
    ...(localPercentField
      ? {
          [localPercentField]: localBonusPercent,
        }
      : {}),
    controlCenterFacilityBonusPercent,
    controlCenterOperatorBonusPercent,
    controlCenterOperatorBonusById: controlCenterAdjustment
      ? { ...(controlCenterAdjustment.operatorBonusById || {}) }
      : { ...(candidate?.controlCenterOperatorBonusById || {}) },
    controlCenterExpectedBonusPercent:
      controlCenterFacilityBonusPercent + controlCenterOperatorBonusPercent,
    controlCenterFacilityCalculation:
      controlCenterAdjustment?.facilityCalculation ||
      candidate?.controlCenterFacilityCalculation,
    controlCenterOperatorCalculation:
      controlCenterAdjustment?.operatorCalculation ||
      candidate?.controlCenterOperatorCalculation,
    sameShiftBindings:
      controlCenterAdjustment?.sameShiftBindings ||
      candidate?.sameShiftBindings ||
      [],
    ...(automationResult
      ? {
          localBonusPercent: bonusPercent,
          manufacturePercent: bonusPercent,
          automationCalculation: automationResult,
        }
      : {}),
  };
}

function createEmptyRoomCandidate({
  key,
  roomType = "",
  slotCount = 0,
} = {}) {
  const expectedSlots = Math.max(0, Number(slotCount) || 0);

  return {
    key: `empty:${key || roomType || "room"}`,
    name: "空位",
    operatorIds: [],
    operators: [],
    sourceRoomType: roomType,
    corePercent: 0,
    totalPercent: 0,
    bonusPercent: -100,
    bestAvailableTotalPercent: 0,
    fallback: {
      count: expectedSlots,
      operators: [],
      materialized: false,
    },
    incomplete: true,
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
  {
    controlCenterRuntimeContext: runtimeContext = controlCenterRuntimeContext.value,
  } = {},
) {
  const selected = getSelectedRoomGroupCandidateEntries(group, state, {
    allowPartial: true,
  });
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
          const selectionKeys = candidateIndexes.map(
            (candidateIndex) => `${cohort.id}:${candidateIndex}`,
          );
          const sourceCandidates = candidateIndexes.map(
            (candidateIndex) => selectedCandidates[candidateIndex] || null,
          );
          const materializedCandidates = sourceCandidates.map(
            (sourceCandidate, index) => {
              if (!sourceCandidate) {
                return createEmptyRoomCandidate({
                  key: selectionKeys[index],
                  roomType: group.facility,
                  slotCount: cohort.slotCount,
                });
              }

              if (
                cohort.selectionMode === "individual" &&
                !sourceCandidate.isManualFallbackTeam
              ) {
                return sourceCandidate;
              }

              return materializeRoomGroupCandidate(
                sourceCandidate,
                fallbackPlan?.assignmentsBySelectionKey?.[selectionKeys[index]] ||
                  [],
                {
                  controlCenterRuntimeContext: runtimeContext,
                },
              );
            },
          );
          const candidate =
            cohort.selectionMode === "individual"
              ? mergeIndividualRoomCandidates(materializedCandidates)
              : {
                  ...materializedCandidates[0],
                  fallbackSelectionKey: selectionKeys[0],
                };
          stationAssignments.push({
            stationIndex: assignment.stationIndex,
            stationLevel: cohort.stationLevel,
            expectedSlots: cohort.slotCount,
            activeTeamIndexes: candidateIndexes,
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

function buildControlCenterRoleCandidate(group, controlState) {
  if (!group || controlState?.status !== "ready") {
    return null;
  }

  const station = group.stations?.[0] || {};
  const stationLevel = Number.isInteger(station.stationLevel)
    ? station.stationLevel
    : 3;
  const expectedSlots = Number.isInteger(station.slotCount)
    ? station.slotCount
    : 5;
  const segments = controlState.segments.map((segment) => ({
    index: segment.index,
    durationHours: segment.durationHours,
    stationAssignments: [
      {
        stationIndex: 0,
        stationLevel,
        expectedSlots,
        candidate: {
          key: `${group.id}:segment-${segment.index + 1}:${segment.operatorIds.join(",")}`,
          name: `中枢时段 ${segment.index + 1}`,
          controlCenterTeamIndex: segment.teamIndex,
          operatorIds: segment.operatorIds,
          operators: segment.operators,
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
  }));

  return {
    key: `${group.id}:${controlState.segments
      .map(
        (segment) =>
          `${segment.teamIndex}:${(segment.operatorIds || []).join(",")}`,
      )
      .join("|")}`,
    segments,
  };
}

const manualControlRoomGroupCandidate = computed(() => {
  const group = controlScheduleRoomGroup.value;
  const candidate = buildControlCenterRoleCandidate(
    group,
    controlCenterFinalRoleState.value,
  );

  return {
    group,
    candidate,
    reason:
      controlCenterFinalRoleState.value.status === "ready"
        ? null
        : controlCenterFinalRoleState.value.status,
  };
});

const roomGroupFallbackPlanStates = computed(() => {
  const occupiedOperatorIds = new Set(controlCenterSelectedOperatorIds.value);
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
    const selected = getSelectedRoomGroupCandidateEntries(group, state, {
      allowPartial: true,
    });
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
    const occupiedIds = new Set([
      ...selectedCoreOperatorIds,
      ...occupiedOperatorIds,
      ...coreOperatorIds,
    ]);
    const fallbackQueueSignature = getRoomGroupFallbackQueueSignature(
      selected.selectedEntries,
    );
    const savedQueue = roomGroupFallbackQueueStates.value[group.id];
    const hasManualFallbackQueue =
      savedQueue?.signature === fallbackQueueSignature;
    const automaticPlan = createRiicRoomGroupFallbackPlan({
      selectedEntries: selected.selectedEntries,
      occupiedOperatorIds: occupiedIds,
    });
    const plan = hasManualFallbackQueue
      ? createRiicRoomGroupFallbackPlan({
          selectedEntries: selected.selectedEntries,
          occupiedOperatorIds: occupiedIds,
          preferredOperatorIdBySlotKey: savedQueue?.operatorIdBySlotKey,
          preferredOperatorIds: savedQueue?.operatorIds,
          allowAutomaticFill: false,
        })
      : automaticPlan;

    plans[group.id] = {
      ...plan,
      groupId: group.id,
      facility: group.facility,
      coreOperatorIds,
      occupiedOperatorIds: [...occupiedOperatorIds],
      fallbackQueueSignature,
      fallbackQueueOperatorIds: plan.selectedOperatorIds,
      fallbackQueueOperatorIdBySlotKey: plan.operatorIdBySlotKey,
      hasManualFallbackQueue,
    };

    for (const charId of [...coreOperatorIds, ...plan.selectedOperatorIds]) {
      occupiedOperatorIds.add(charId);
    }
  }

  return plans;
});

const controlCenterLateFillState = computed(() => {
  const baseState = controlCenterRoleState.value;
  if (baseState.status !== "ready") {
    return {
      status: baseState.status,
      teamEntries: [],
      operatorIds: [],
    };
  }

  const excludedOperatorIds = new Set(
    controlCenterLateFillExcludedOperatorIds.value,
  );
  const occupiedOperatorIds = new Set(baseState.operatorIds || []);
  for (const plan of Object.values(roomGroupFallbackPlanStates.value)) {
    for (const charId of [
      ...(plan?.coreOperatorIds || []),
      ...(plan?.selectedOperatorIds || []),
    ]) {
      occupiedOperatorIds.add(charId);
    }
  }

  const controlCandidates = controlCenterCandidateOperators.value
    .filter((operator) => {
      const charId = String(operator?.charId || "").trim();
      return charId && !excludedOperatorIds.has(charId);
    })
    .map((operator) => ({
      ...operator,
      lateFillSource: "effect",
    }));
  const controlCandidateIds = new Set(
    controlCandidates.map((operator) => operator.charId),
  );
  const rosterById = new Map();
  for (const operator of riicMatchingRoster.value || []) {
    const charId = String(operator?.charId || "").trim();
    if (
      !charId ||
      excludedOperatorIds.has(charId) ||
      controlCandidateIds.has(charId) ||
      rosterById.has(charId)
    ) {
      continue;
    }

    rosterById.set(charId, {
      ...operator,
      controlCenterBuffTags: [],
      controlCenterResolvedEffects: [],
      controlCenterRoomEffectLabel: "",
      lateFillSource: "idle",
    });
  }
  const candidateQueue = [
    ...controlCandidates,
    ...rosterById.values(),
  ];
  const teamEntries = [];
  const teamIndexes = [
    ...new Set(
      (baseState.segments || [])
        .map((segment) => Number(segment?.teamIndex))
        .filter((teamIndex) => Number.isInteger(teamIndex) && teamIndex >= 0),
    ),
  ].sort((left, right) => left - right);

  for (const teamIndex of teamIndexes) {
    const sourceSegment = (baseState.segments || []).find(
      (segment) => Number(segment?.teamIndex) === teamIndex,
    );
    const slotCount = Math.max(0, Number(sourceSegment?.slotCount || 0));
    const operators = [...(sourceSegment?.operators || [])];
    const fillers = [];

    for (const operator of candidateQueue) {
      if (operators.length + fillers.length >= slotCount) {
        break;
      }

      const charId = String(operator?.charId || "").trim();
      if (!charId || occupiedOperatorIds.has(charId)) {
        continue;
      }

      fillers.push(operator);
      occupiedOperatorIds.add(charId);
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
});

const controlCenterFinalRoleState = computed(() => {
  const baseState = controlCenterRoleState.value;
  const lateFillState = controlCenterLateFillState.value;
  if (baseState.status !== "ready" || lateFillState.status !== "ready") {
    return baseState;
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
});

const controlCenterFinalRuntimeContext = computed(() =>
  buildRiicControlCenterRuntimeContext({
    controlState: controlCenterFinalRoleState.value,
  }),
);

watch(
  roomGroupFallbackPlanStates,
  (plans) => {
    const nextQueues = { ...roomGroupFallbackQueueStates.value };
    let changed = false;

    for (const [groupId, plan] of Object.entries(plans || {})) {
      if (
        !plan?.fallbackQueueSignature ||
        plan.pendingCount <= 0 ||
        (nextQueues[groupId]?.signature === plan.fallbackQueueSignature &&
          nextQueues[groupId]?.operatorIdBySlotKey)
      ) {
        continue;
      }

      nextQueues[groupId] = {
        signature: plan.fallbackQueueSignature,
        operatorIdBySlotKey: plan.operatorIdBySlotKey,
      };
      changed = true;
    }

    if (changed) {
      roomGroupFallbackQueueStates.value = nextQueues;
    }
  },
  { immediate: true },
);

const roomGroupOperatorDestinations = computed(() => {
  const destinations = {};

  for (const group of getRoomGroupFallbackPlanningGroups()) {
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

function getRoomGroupFallbackQueueSignature(selectedEntries) {
  return (selectedEntries || [])
    .map(
      (entry) =>
        `${entry?.selectionKey || ""}:${entry?.candidate?.key || ""}:${
          entry?.candidate?.fallback?.count || 0
        }`,
    )
    .join("|");
}

function getRoomGroupFallbackQueueOperators(plan) {
  const operatorById = new Map(
    (plan?.operators || []).map((operator) => [operator.charId, operator]),
  );

  return (plan?.fallbackQueueOperatorIds || [])
    .map((charId) => operatorById.get(charId))
    .filter(Boolean);
}

function getRoomGroupFallbackSections(plan) {
  const operatorById = new Map(
    (plan?.operators || []).map((operator) => [operator.charId, operator]),
  );
  const selectedOperatorIds = new Set(plan?.selectedOperatorIds || []);
  const rankByOperatorId = new Map(
    (plan?.operators || []).map((operator, index) => [
      operator.charId,
      index,
    ]),
  );
  const sectionsByKey = new Map();

  for (const slot of plan?.slots || []) {
    const sectionKey = String(slot?.sectionKey || slot?.kind || "ordinary");
    const section = sectionsByKey.get(sectionKey) || {
      key: sectionKey,
      title: String(slot?.sectionTitle || "补位").trim() || "补位",
      slots: [],
      candidateById: new Map(),
    };
    const assignedOperator = operatorById.get(slot.assignedOperatorId) || null;
    section.slots.push({
      ...slot,
      assignedOperator,
    });

    if (!assignedOperator) {
      for (const operator of slot.operators || []) {
        if (!selectedOperatorIds.has(operator.charId)) {
          section.candidateById.set(operator.charId, operator);
        }
      }
    }

    sectionsByKey.set(sectionKey, section);
  }

  return [...sectionsByKey.values()].map((section) => ({
    key: section.key,
    title: section.title,
    slots: section.slots,
    selectedCount: section.slots.filter((slot) => slot.assignedOperator).length,
    pendingCount: section.slots.length,
    candidates: [...section.candidateById.values()].sort(
      (left, right) =>
        Number(rankByOperatorId.get(left.charId) ?? Infinity) -
          Number(rankByOperatorId.get(right.charId) ?? Infinity) ||
        left.name.localeCompare(right.name, "zh-CN") ||
        left.charId.localeCompare(right.charId, "en"),
    ),
  }));
}

function setRoomGroupFallbackQueue(group, plan, operatorIdBySlotKey) {
  if (!group?.id || !plan?.fallbackQueueSignature) {
    return;
  }

  const slotsByKey = new Map(
    (plan?.slots || []).map((slot) => [slot.key, slot]),
  );
  const nextOperatorIdBySlotKey = {};
  const selectedOperatorIds = new Set();

  for (const [slotKey, value] of Object.entries(operatorIdBySlotKey || {})) {
    const normalizedSlotKey = String(slotKey || "").trim();
    const charId = String(value || "").trim();
    const slot = slotsByKey.get(normalizedSlotKey);
    if (
      !slot ||
      !charId ||
      selectedOperatorIds.has(charId) ||
      !(slot.operators || []).some(
        (operator) => operator.charId === charId,
      )
    ) {
      continue;
    }

    selectedOperatorIds.add(charId);
    nextOperatorIdBySlotKey[normalizedSlotKey] = charId;
  }

  roomGroupFallbackQueueStates.value = {
    ...roomGroupFallbackQueueStates.value,
    [group.id]: {
      signature: plan.fallbackQueueSignature,
      operatorIdBySlotKey: nextOperatorIdBySlotKey,
    },
  };
}

function clearRoomGroupFallbackQueue(groupId) {
  if (!roomGroupFallbackQueueStates.value[groupId]) {
    return;
  }

  const nextQueues = { ...roomGroupFallbackQueueStates.value };
  delete nextQueues[groupId];
  roomGroupFallbackQueueStates.value = nextQueues;
}

function getFallbackSectionOpenSlot(section, operator) {
  const charId = String(operator?.charId || "").trim();
  return (section?.slots || []).find(
    (slot) =>
      !slot.assignedOperator &&
      (slot?.operators || []).some(
        (candidateOperator) => candidateOperator.charId === charId,
      ),
  );
}

function canAppendRoomGroupFallbackQueueOperator(
  group,
  plan,
  section,
  operator,
) {
  const charId = String(operator?.charId || "").trim();
  if (
    !group ||
    !plan ||
    !section ||
    !charId ||
    (plan?.selectedOperatorIds || []).includes(charId) ||
    !getFallbackSectionOpenSlot(section, operator)
  ) {
    return false;
  }

  return !getFallbackOperatorDestination(charId);
}

function appendRoomGroupFallbackQueueOperator(group, plan, section, operator) {
  if (
    !canAppendRoomGroupFallbackQueueOperator(group, plan, section, operator)
  ) {
    return;
  }

  const slot = getFallbackSectionOpenSlot(section, operator);
  setRoomGroupFallbackQueue(group, plan, {
    ...(plan.operatorIdBySlotKey || {}),
    [slot.key]: operator.charId,
  });
}

function removeRoomGroupFallbackQueueOperator(group, plan, slot) {
  if (!group || !plan || !slot?.key) {
    return;
  }

  const nextOperatorIdBySlotKey = {
    ...(plan.operatorIdBySlotKey || {}),
  };
  delete nextOperatorIdBySlotKey[slot.key];
  setRoomGroupFallbackQueue(group, plan, nextOperatorIdBySlotKey);
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

function formatRoomFallbackOperatorPercent(value) {
  const percent = Math.max(0, Number(value || 0));
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

function getRoomFallbackOperatorDebugValues(operator) {
  const basePercent = Number.isFinite(Number(operator?.basePercent))
    ? Number(operator.basePercent)
    : Number(operator?.percent || 0);
  const layoutRuleBonus = Number(operator?.layer3Bonus || 0);
  const controlCenterOperatorBonusPercent = Number(
    operator?.controlCenterOperatorBonusPercent || 0,
  );

  return {
    basePercent,
    layoutRuleBonus,
    controlCenterOperatorBonusPercent,
    totalPercent: Number(
      operator?.effectivePercent ??
        Number(operator?.percent || 0) + controlCenterOperatorBonusPercent,
    ),
  };
}

const activeRoomGroupFallbackPlan = computed(() =>
  getRoomGroupFallbackPlan(activeScheduleRoomGroup.value),
);

const activeRoomGroupFallbackSections = computed(() =>
  getRoomGroupFallbackSections(activeRoomGroupFallbackPlan.value),
);

function getRoomGroupCandidateFallbackQueueOperators(
  group,
  cohort,
  candidate,
) {
  const selectedKeys = getSelectedTeamCandidateKeys(group?.id, cohort);
  const candidateIndex = selectedKeys.indexOf(candidate?.key);
  if (candidateIndex < 0) {
    return [];
  }

  const selectionKey = `${cohort.id}:${candidateIndex}`;
  return (
    getRoomGroupFallbackPlan(group)?.assignmentsBySelectionKey?.[
      selectionKey
    ] || []
  );
}

function getRoomGroupCandidateFallbackPlaceholderCount(
  group,
  cohort,
  candidate,
) {
  return Math.max(
    0,
    Number(candidate?.fallback?.count || 0) +
      Number(candidate?.fallback?.taggedMemberRequirements?.length || 0) -
      getRoomGroupCandidateFallbackQueueOperators(group, cohort, candidate)
        .length,
  );
}

const manualRoomGroupCandidates = computed(() =>
  candidateEnabledScheduleRoomGroups.value.map((group) => {
    const state = roomGroupCandidateStates.value[group.id];
    const fallbackPlan = roomGroupFallbackPlanStates.value[group.id];
    const sourceCandidate = buildManualRoomGroupRotationCandidate(
      group,
      state,
      fallbackPlan,
      {
        controlCenterRuntimeContext: controlCenterFinalRuntimeContext.value,
      },
    );
    if (!sourceCandidate) {
      return {
        group,
        candidate: null,
        reason: "manualSelection",
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
  manualControlRoomGroupCandidate.value,
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

  const sameShiftAlignment = alignRiicScheduleSameShiftBindings({
    groupEntries: selectedGroups,
  });
  const alignedGroups = sameShiftAlignment.groupEntries;

  return {
    status: "ready",
    candidates: [
      {
        key: alignedGroups
          .map(
            ({ group, candidate }) =>
              `${group.id}:${candidate.key}:${candidate.sameShiftBindingOffset || 0}`,
          )
          .join("|"),
        groups: alignedGroups.map(({ group, candidate }) => ({
          groupId: group.id,
          groupLabel: group.label,
          facility: group.facility,
          candidateKey: candidate.key,
          candidate,
          claimedOperatorIds: getManualRoomGroupCandidateOperatorIds(candidate),
        })),
        sameShiftBindingSummary: sameShiftAlignment.summary,
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
    ...manualRoomGroupCandidates.value.flatMap(({ candidate }) =>
      (candidate?.segments || []).flatMap((segment) =>
        (segment?.stationAssignments || []).flatMap(
          (assignment) => assignment?.candidate?.upgradeRequirements || [],
        ),
      ),
    ),
  ]);
});
const riicSupportRoomPlacements = computed(() =>
  getRiicLayer3SupportRoomPlacements({
    roomAssignments: candidateEnabledScheduleRoomGroups.value.map((group) => ({
      roomType: group.facility,
      operatorIds: [
        ...getSelectedRoomGroupCoreOperatorIds(
          group,
          roomGroupCandidateStates.value[group.id],
        ),
        ...(roomGroupFallbackPlanStates.value[group.id]?.selectedOperatorIds ||
          []),
      ],
    })),
    ownedOperators: riicMatchingRoster.value || [],
    claimedOperatorIds: getClaimedNamedOperatorIds(),
    layoutFacts: activeLayoutFacilityCounts.value,
  }),
);

const schedulePreviewStaticRooms = computed(() => {
  const placementOffsetByFacility = new Map();

  return scheduleRoomRows.value
    .flatMap((row) => row.groups)
    .filter(
      (group) =>
        !group.candidateGenerationAvailable && !group.manualControl,
    )
    .flatMap((group) =>
      Array.from({ length: group.count }, (_, index) => {
        const expectedSlots =
          group.facility === "dormitory"
            ? 5
            : group.facility === "training"
              ? 2
              : 1;
        const offset = placementOffsetByFacility.get(group.facility) || 0;
        const operators = (riicSupportRoomPlacements.value[group.facility] || [])
          .slice(offset, offset + expectedSlots);
        placementOffsetByFacility.set(group.facility, offset + expectedSlots);

        return {
          key: `${group.id}:${index}`,
          label:
            group.count > 1
              ? `${group.facilityLabel} ${index + 1}`
              : group.facilityLabel,
          facility: group.facility,
          expectedSlots,
          operators,
        };
      }),
    );
});
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
function createSchedulePreviewPlaceholderRoom(group, station, stationIndex) {
  const facilityLabel = String(group?.facilityLabel || group?.label || "");
  const shortLabel = String(group?.shortLabel || "").trim();
  const prefix =
    shortLabel && shortLabel !== facilityLabel ? shortLabel : "";
  const suffix = Number(group?.count || 0) > 1 ? ` ${stationIndex + 1}` : "";

  return {
    key: `${group.id}:${stationIndex}`,
    groupId: group.id,
    groupLabel: group.label,
    label: `${prefix}${facilityLabel}${suffix}`,
    facility: group.facility,
    tone: group.tone,
    product: group.candidateProduct || "",
    stationIndex,
    stationLevel: station?.stationLevel || null,
    expectedSlots: station?.slotCount || null,
    operators: [],
    efficiency: null,
  };
}
const riicSchedulePreviewPlaceholder = computed(() => {
  if (!isLayoutPlanningReady.value) {
    return null;
  }

  const rooms = [
    ...selectableScheduleRoomGroups.value.flatMap((group) =>
      (group.stations || [])
        .filter(Boolean)
        .map((station, stationIndex) =>
          createSchedulePreviewPlaceholderRoom(
            group,
            station,
            stationIndex,
          ),
        ),
    ),
    ...schedulePreviewStaticRooms.value.map((room) => ({
      ...room,
      operators: [],
      efficiency: null,
    })),
  ];
  const stateCount = Math.max(
    getSchedulePreviewStateCount(
      confirmedLayoutPlan.value?.shiftMode,
      twoShiftRotationMode.value,
    ),
    1,
  );

  return {
    sourceKey: `placeholder:${confirmedLayoutPlan.value?.cardKey || ""}:${stateCount}`,
    key: `placeholder:${confirmedLayoutPlan.value?.cardKey || ""}:${stateCount}`,
    cycleHours: 0,
    preferredDroneRoomKey: "",
    states: Array.from({ length: stateCount }, (_, index) => ({
      id: `placeholder-state-${index + 1}`,
      index,
      startHour: 0,
      durationHours: 0,
      rooms,
    })),
  };
});
const displayedRiicSchedulePreview = computed(
  () => riicSchedulePreview.value || riicSchedulePreviewPlaceholder.value,
);
const riicActualScheduleMetrics = computed(() =>
  riicSchedulePreview.value
    ? summarizeRiicActualSchedule({
        preview: riicSchedulePreview.value,
      })
    : null,
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
const riicYieldEngineResults = ref([]);
let riicYieldEngineAbortController = null;
let riicYieldEngineRunId = 0;
const generatedMaaScheduleFingerprint = computed(() => {
  const schedule = generatedMaaExportPreview.value?.schedule;
  if (!schedule) {
    return "";
  }

  try {
    return JSON.stringify(schedule);
  } catch (error) {
    console.error(error);
    return "";
  }
});

function getRiicYieldEngineStatusMeta(status) {
  const statusMap = {
    running: {
      label: "计算中",
      tone: "running",
      icon: "mdi-progress-clock",
    },
    success: {
      label: "已完成",
      tone: "success",
      icon: "mdi-check-circle",
    },
    unsupported: {
      label: "暂不支持",
      tone: "unsupported",
      icon: "mdi-minus-circle-outline",
    },
    failed: {
      label: "计算失败",
      tone: "failed",
      icon: "mdi-alert-circle-outline",
    },
  };

  return statusMap[status] || statusMap.failed;
}

function formatRiicYieldMetric(metric) {
  const value = Number(metric?.value);
  if (!Number.isFinite(value)) {
    return "-";
  }

  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
}

function applyRiicYieldEngineResult(result) {
  const index = riicYieldEngineResults.value.findIndex(
    (item) => item.engine?.id === result?.engine?.id,
  );
  if (index < 0) {
    riicYieldEngineResults.value.push(result);
    return;
  }

  riicYieldEngineResults.value.splice(index, 1, result);
}

watch(
  generatedMaaScheduleFingerprint,
  (fingerprint) => {
    riicYieldEngineAbortController?.abort();
    riicYieldEngineAbortController = null;

    const runId = ++riicYieldEngineRunId;
    if (!fingerprint) {
      riicYieldEngineResults.value = [];
      return;
    }

    let maaSchedule;
    try {
      maaSchedule = JSON.parse(fingerprint);
    } catch (error) {
      console.error(error);
      riicYieldEngineResults.value = [];
      return;
    }

    const controller = new AbortController();
    riicYieldEngineAbortController = controller;
    riicYieldEngineResults.value = RIIC_YIELD_ENGINE_REGISTRY.map((engine) =>
      createRiicYieldEngineRunningResult(engine),
    );

    void runRiicYieldEngines({
      maaSchedule,
      signal: controller.signal,
      onResult(result) {
        if (
          runId !== riicYieldEngineRunId ||
          controller.signal.aborted
        ) {
          return;
        }

        applyRiicYieldEngineResult(result);
      },
    }).catch((error) => {
      if (
        runId === riicYieldEngineRunId &&
        !controller.signal.aborted
      ) {
        console.error(error);
      }
    });
  },
  { immediate: true },
);
const layoutWorkflowCardState = computed(() =>
  isLayoutPlanningReady.value ? "complete" : "pending",
);
const scheduleGenerationWorkflowCardState = computed(() =>
  assembledScheduleCandidateState.value.status === "ready" &&
  Boolean(riicSchedulePreview.value)
    ? "complete"
    : "pending",
);
const hasAnyImportedOperatorData = computed(() =>
  Object.values(operatorSourceStates).some(
    (state) => Array.isArray(state?.operators) && state.operators.length > 0,
  ),
);
const scheduleOutputWorkflowCardState = computed(() =>
  generatedMaaExportPreview.value ? "complete" : "pending",
);
const riicYieldWorkflowCardState = computed(() => {
  if (!generatedMaaExportPreview.value) {
    return "pending";
  }

  return riicYieldEngineResults.value.length > 0 &&
    riicYieldEngineResults.value.every(
      (result) => result.status !== "running",
    )
    ? "complete"
    : "pending";
});
const scheduleDroneTargetOptions = computed(() => {
  const optionsByKey = new Map();

  for (const state of displayedRiicSchedulePreview.value?.states || []) {
    for (const room of state.rooms || []) {
      if (
        !["trading", "manufacture", "power"].includes(room.facility) ||
        optionsByKey.has(room.key)
      ) {
        continue;
      }

      const product =
        ROOM_PRODUCT_OPTIONS[room.facility]?.find(
          (option) => option.value === room.product,
        )?.label || "";
      const facilityLabel =
        SCHEDULE_ROOM_GROUP_META[room.facility]?.facilityLabel || room.label;
      const stationNumber = Math.max(Number(room.stationIndex || 0) + 1, 1);
      optionsByKey.set(room.key, {
        value: room.key,
        label:
          room.facility === "power"
            ? `${facilityLabel}${stationNumber}`
            : `${product}${facilityLabel}${stationNumber}`,
        facility: room.facility,
        disabled: room.facility === "power",
      });
    }
  }

  return [...optionsByKey.values()];
});
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
    activeSchedulePreviewStateIndex.value =
      getDefaultSchedulePreviewStateIndex();
    selectedSchedulePreviewRoomKey.value = "";
  },
);

watch(
  [
    () => displayedRiicSchedulePreview.value?.key,
    () => displayedRiicSchedulePreview.value?.preferredDroneRoomKey,
    () =>
      scheduleDroneTargetOptions.value
        .filter((option) => !option.disabled)
        .map((option) => option.value)
        .join("|"),
  ],
  () => {
    const availableTargets = new Set(
      scheduleDroneTargetOptions.value
        .filter((option) => !option.disabled)
        .map((option) => option.value),
    );

    if (
      scheduleExecutionSettings.droneTargetPinned &&
      availableTargets.has(scheduleExecutionSettings.droneTarget)
    ) {
      return;
    }

    scheduleExecutionSettings.droneTargetPinned = false;
    scheduleExecutionSettings.droneTarget =
      displayedRiicSchedulePreview.value?.preferredDroneRoomKey ||
      scheduleDroneTargetOptions.value.find((option) => !option.disabled)
        ?.value ||
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
  if (
    !scheduleDroneTargetOptions.value.some(
      (option) => option.value === value && !option.disabled,
    )
  ) {
    return;
  }

  scheduleExecutionSettings.droneTarget = value;
  scheduleExecutionSettings.droneTargetPinned = true;
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
  const contribution = getRiicRuntimeCandidateContributionBreakdown(candidate);

  return ROOM_CANDIDATE_EFFECT_META.flatMap((effect) => {
    const bonus = Number(
      contribution.totalByFacility?.[effect.facility] || 0,
    );

    return bonus > 0 ? [{ ...effect, bonus, kind: "contribution" }] : [];
  });
}

function getRoomGroupCandidateDebugValues(candidate) {
  const contribution = getRiicRuntimeCandidateContributionBreakdown(candidate);
  const controlCenterOperatorBonusPercent = Number(
    candidate?.controlCenterOperatorBonusPercent || 0,
  );
  const candidateCoreBonusPercent =
    Number(candidate?.localBonusPercent || 0) -
    controlCenterOperatorBonusPercent;
  const fallbackBonusPercent = Number(candidate?.fallback?.totalPercent || 0);
  const controlCenterFacilityBonusPercent = Number(
    candidate?.controlCenterFacilityBonusPercent || 0,
  );
  const controlCenterFacilityCalculation =
    candidate?.controlCenterFacilityCalculation || {
      totalHours: 0,
      weightedBonusPercent: 0,
      segments: [],
    };
  const controlCenterOperatorCalculation =
    candidate?.controlCenterOperatorCalculation || {
      totalHours: 0,
      weightedBonusPercent: 0,
      segments: [],
    };

  return {
    sourceFile: String(
      candidate?.sourceFile || candidate?.fallback?.sourceFile || "",
    ).trim(),
    directMetrics: ROOM_CANDIDATE_EFFECT_META.flatMap((effect) => {
      const bonus = Number(
        contribution.directByFacility?.[effect.facility] || 0,
      );
      return bonus > 0 ? [{ ...effect, bonus }] : [];
    }),
    additionalMetrics: ROOM_CANDIDATE_EFFECT_META.flatMap((effect) => {
      const bonus = Number(
        contribution.additionalByFacility?.[effect.facility] || 0,
      );
      return bonus > 0 ? [{ ...effect, bonus }] : [];
    }),
    fallbackBonusPercent,
    fallbackCount: Number(candidate?.fallback?.count || 0),
    candidateCoreBonusPercent,
    controlCenterOperatorBonusPercent,
    controlCenterOperatorCalculation,
    controlCenterFacilityBonusPercent,
    controlCenterFacilityCalculation,
    directBonusPercent: contribution.directBonusPercent,
    additionalBonusPercent: contribution.additionalBonusPercent,
    totalContributionPercent: contribution.totalContributionPercent,
    sortScore: contribution.sortScore,
    rankingValue: contribution.rankingValue,
    qualityLabel: candidate?.quality === "baseOnly" ? "基础" : "完整",
    calculationStatusLabel:
      {
        calculated: "已计算",
        estimated: "估算",
        estimatePending: "待估算",
      }[candidate?.calculationStatus] || "已计算",
  };
}

function formatRoomGroupCandidateDebugValue(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? number : number.toFixed(1);
}

function getRiicLayer3OperatorName(charId) {
  const operatorId = String(charId || "").trim();
  return operatorTableV2?.[operatorId]?.name || operatorId || "未知干员";
}

function formatRiicLayer3OperatorCondition(condition) {
  const name = getRiicLayer3OperatorName(condition?.operatorId);
  const requiredElite = Number(condition?.eliteAtLeast);
  const actualElite = condition?.actualElite;
  const requiredText = Number.isInteger(requiredElite)
    ? `精英 ${requiredElite}+`
    : "练度条件无效";
  const actualText =
    actualElite === null || actualElite === undefined
      ? "未持有"
      : `当前精英 ${actualElite}`;

  return `${name} ${requiredText}（${actualText}）`;
}

function formatRiicLayer3FacilityCondition(condition) {
  const expectedCount = Number(condition?.count);
  const expectedProductKindCount = Number(condition?.productKindCount);
  const actualValue = Number(condition?.actualValue);
  const actualText = Number.isFinite(actualValue) ? actualValue : "?";

  if (condition?.kind === "powerCount") {
    return `发电站 ${expectedCount} 座（当前 ${actualText}）`;
  }
  if (condition?.kind === "tradingCount") {
    return `贸易站 ${expectedCount} 座（当前 ${actualText}）`;
  }
  if (condition?.kind === "goldManufactureCount") {
    return `赤金制造站 ${expectedCount} 座（当前 ${actualText}）`;
  }
  if (condition?.kind === "manufactureProductKindCount") {
    return `制造产物 ${expectedProductKindCount} 类（当前 ${actualText}）`;
  }
  if (condition?.kind === "facilityCount") {
    const facilityLabel =
      {
        power: "发电站",
        trading: "贸易站",
        manufacture: "制造站",
        meeting: "会客室",
        hire: "办公室",
        control: "控制中枢",
      }[condition?.facilityType] || condition?.facilityType || "设施";
    const productLabel =
      {
        lmd: "龙门币",
        gold: "赤金",
        experience: "经验书",
        orundum: "源石碎片",
      }[condition?.product] || "";
    const stationLevel = Number(condition?.stationLevel);
    const stationLevelLabel =
      Number.isInteger(stationLevel) && stationLevel >= 1
        ? ` Lv.${stationLevel}`
        : "";

    return `${productLabel}${facilityLabel}${stationLevelLabel} ${expectedCount} 座（当前 ${actualText}）`;
  }

  return "未支持的设施条件";
}

function formatRiicLayer3SignedValue(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }

  const formatted = Number.isInteger(number) ? number : number.toFixed(1);
  return `${number > 0 ? "+" : ""}${formatted}${suffix}`;
}

function formatRiicLayer3RuleEffect(effect) {
  const variantGroupId = String(effect?.variantGroupId || "").trim();
  const stationLevel = Number(effect?.stationLevel);
  const hasScopedRoomPriority = Boolean(
    effect?.operatorId &&
      effect?.roomType &&
      effect?.product &&
      Number.isInteger(stationLevel) &&
      stationLevel >= 1,
  );
  const operatorName = effect?.operatorId
    ? getRiicLayer3OperatorName(effect.operatorId)
    : "全局";
  const roomLabel =
    {
      trading: "贸易站",
      manufacture: "制造站",
      meeting: "会客室",
      hire: "办公室",
      power: "发电站",
      control: "控制中枢",
      dormitory: "宿舍",
    }[effect?.roomType] || "";
  const productLabel =
    {
      lmd: "龙门币",
      gold: "赤金",
      experience: "经验书",
      orundum: "源石碎片",
    }[effect?.product] || "";
  const target = [
    variantGroupId ? `候选组 ${variantGroupId}` : operatorName,
    roomLabel,
    productLabel,
    hasScopedRoomPriority ? `Lv.${stationLevel}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const bonusPercent = Number(effect?.bonusPercent);
  const details = [];

  if (
    Number.isFinite(bonusPercent) &&
    effect?.operatorId &&
    effect?.roomType
  ) {
    details.push(formatRiicLayer3SignedValue(bonusPercent, "%"));
  }

  const roomPriority = Number(effect?.roomPriority);
  if (
    Number.isFinite(roomPriority) &&
    (variantGroupId || hasScopedRoomPriority)
  ) {
    details.push(`房间优先级 ${formatRiicLayer3SignedValue(roomPriority)}`);
  }

  return details.length
    ? [target || operatorName, ...details].filter(Boolean).join(" · ")
    : "未支持的效果";
}

function getRoomGroupCandidateStatus(group) {
  if (group?.manualControl) {
    const controlState = controlCenterRoleState.value;
    if (controlState.status === "requiresOperators") {
      return {
        icon: "mdi-account-alert-outline",
        tone: "waiting",
        title: "等待干员数据",
      };
    }

    if (controlState.status !== "ready") {
      return {
        icon: "mdi-alert-circle-outline",
        tone: "blocked",
        title: "缺少控制中枢容量信息",
      };
    }

    return {
      icon: "mdi-check-circle",
      tone: "ready",
      title: `自动安排 ${controlState.operatorIds.length} 个功能位，留空 ${controlState.emptySlotCount} 格`,
    };
  }

  const status = roomGroupCandidateStates.value[group?.id]?.status;

  if (status === "ready") {
    const progress = getRoomGroupSelectionProgress(group);
    if (group?.fallbackOnly) {
      return progress.complete
        ? {
            icon: "mdi-check-circle",
            tone: "ready",
            title: "补位已填入",
          }
        : {
            icon: "mdi-progress-clock",
            tone: "selectionPending",
            title: `补位 ${progress.selectedTeamCount}/${progress.requiredTeamCount}`,
          };
    }
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
      title: group?.fallbackOnly
        ? "正在载入补位干员列表"
        : "正在载入固定候选列表",
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
      title: group?.fallbackOnly ? "补位数据不完整" : "固定候选数据不完整",
    };
  }

  return null;
}

function getRoomGroupProgressStatus(group) {
  if (group?.manualControl) {
    const controlState = controlCenterRoleState.value;
    if (controlState.status === "requiresOperators") {
      return {
        tone: "pending",
        label: "待同步数据",
      };
    }

    return controlState.status === "ready"
      ? {
          tone: "complete",
          label: `自动安排 ${controlState.operatorIds.length} 人`,
        }
      : {
          tone: "error",
          label: "容量异常",
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
      label: group?.fallbackOnly ? "补位异常" : "候选异常",
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

  if (group?.fallbackOnly) {
    return getRoomGroupSelectionProgress(group).complete
      ? {
          tone: "complete",
          label: "已填入",
        }
      : {
          tone: "pending",
          label: "待补位",
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

function getRoomGroupDisplayStatus(group) {
  const progress = getRoomGroupProgressStatus(group);
  const candidateStatus = getRoomGroupCandidateStatus(group);

  if (progress.tone === "notRequired") {
    return {
      tone: "complete",
      icon: "mdi-check-circle",
      title: "无需操作",
    };
  }

  if (progress.tone === "complete") {
    return {
      tone: "complete",
      icon: candidateStatus?.icon || "mdi-check-circle",
      title: candidateStatus?.title || progress.label,
    };
  }

  if (progress.tone === "error") {
    return {
      tone: "error",
      icon: candidateStatus?.icon || "mdi-alert-circle-outline",
      title: candidateStatus?.title || progress.label,
    };
  }

  return {
    tone: "pending",
    icon: candidateStatus?.icon || "mdi-alert-circle-outline",
    title: candidateStatus?.title || progress.label,
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
const customOperatorSourceStatuses = computed(() =>
  customOperatorSources.value.map((source) => ({
    source,
    status: getOperatorSourceStatus(source.id),
  })),
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
  navigableScheduleRoomGroups,
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

function createDefaultConfirmedLayoutPlan() {
  return {
    ...DEFAULT_LAYOUT_SELECTION,
    facilityRequirement: normalizeRiicFacilityRequirement(
      DEFAULT_LAYOUT_SELECTION.layoutId,
    ),
  };
}

function applyDefaultLayoutSelection() {
  layoutEntry.value = DEFAULT_LAYOUT_SELECTION.cardKey;
  planningMode.value = "manual";
  selectedLayoutId.value = DEFAULT_LAYOUT_SELECTION.layoutId;
  confirmedLayoutPlan.value = createDefaultConfirmedLayoutPlan();
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
    return key.startsWith("preset:") ? "" : key;
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

function normalizeControlCenterRoleSettings(value) {
  return {
    officeEnabled: value?.officeEnabled === true,
  };
}

function normalizeControlCenterManualOverrides(value) {
  const removedOperatorIds = [
    ...new Set(
      (value?.removedOperatorIds || [])
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ];
  const addedOperatorIdsByTeamIndex = Object.fromEntries(
    Object.entries(value?.addedOperatorIdsByTeamIndex || {}).flatMap(
      ([teamIndex, operatorIds]) => {
        const normalizedTeamIndex = String(teamIndex || "").trim();
        if (
          !/^\d+$/.test(normalizedTeamIndex) ||
          !Array.isArray(operatorIds)
        ) {
          return [];
        }

        const normalizedOperatorIds = [
          ...new Set(
            operatorIds
              .map((charId) => String(charId || "").trim())
              .filter(Boolean),
          ),
        ];
        return normalizedOperatorIds.length > 0
          ? [[normalizedTeamIndex, normalizedOperatorIds]]
          : [];
      },
    ),
  );

  return {
    removedOperatorIds,
    addedOperatorIdsByTeamIndex,
  };
}

function normalizeSavedRoomGroupFallbackQueueStates(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([roomGroupId, queueState]) => {
      const signature = String(queueState?.signature || "").trim();
      if (
        typeof roomGroupId !== "string" ||
        !roomGroupId ||
        !signature
      ) {
        return [];
      }

      const operatorIdBySlotKey = Object.fromEntries(
        Object.entries(queueState?.operatorIdBySlotKey || {}).flatMap(
          ([slotKey, charId]) => {
            const normalizedSlotKey = String(slotKey || "").trim();
            const normalizedCharId = String(charId || "").trim();
            return normalizedSlotKey && normalizedCharId
              ? [[normalizedSlotKey, normalizedCharId]]
              : [];
          },
        ),
      );
      const operatorIds = [
        ...new Set(
          (queueState?.operatorIds || [])
            .map((charId) => String(charId || "").trim())
            .filter(Boolean),
        ),
      ];
      if (
        Object.keys(operatorIdBySlotKey).length === 0 &&
        operatorIds.length === 0
      ) {
        return [];
      }

      return [
        [
          roomGroupId,
          {
            signature,
            operatorIdBySlotKey,
            ...(operatorIds.length > 0 ? { operatorIds } : {}),
          },
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

function normalizeRecommendedScheduleSnapshot(value) {
  const triggerKey = String(value?.triggerKey || "").trim();
  if (!triggerKey) {
    return null;
  }

  return {
    triggerKey,
    controlCenterRoleSettings: normalizeControlCenterRoleSettings(
      value?.controlCenterRoleSettings,
    ),
    controlCenterManualOverrides: normalizeControlCenterManualOverrides(
      value?.controlCenterManualOverrides,
    ),
    selectedRoomGroupTeamCandidateKeys:
      normalizeSavedRoomGroupTeamCandidateKeys(
        value?.selectedRoomGroupTeamCandidateKeys,
      ),
    roomGroupFallbackQueueStates: normalizeSavedRoomGroupFallbackQueueStates(
      value?.roomGroupFallbackQueueStates,
    ),
    scheduleExecutionSettings: normalizeScheduleExecutionSettings(
      value?.scheduleExecutionSettings,
      confirmedLayoutPlan.value?.shiftMode,
      twoShiftRotationMode.value,
    ),
  };
}

function createRecommendedScheduleSnapshot(triggerKey) {
  return normalizeRecommendedScheduleSnapshot({
    triggerKey,
    controlCenterRoleSettings: controlCenterRoleSettings.value,
    controlCenterManualOverrides: controlCenterManualOverrides.value,
    selectedRoomGroupTeamCandidateKeys:
      selectedRoomGroupTeamCandidateKeys.value,
    roomGroupFallbackQueueStates: roomGroupFallbackQueueStates.value,
    scheduleExecutionSettings: {
      shifts: scheduleExecutionSettings.shifts,
      droneTarget: scheduleExecutionSettings.droneTarget,
      droneTargetPinned: scheduleExecutionSettings.droneTargetPinned,
    },
  });
}

function createWizardStateSnapshot() {
  return {
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
    treatUnderleveledOperatorsAsQualified:
      treatUnderleveledOperatorsAsQualified.value,
    idealTrainingRaritySelection: idealTrainingRaritySelection.value,
    controlCenterRoleSettings: controlCenterRoleSettings.value,
    controlCenterManualOverrides: controlCenterManualOverrides.value,
    selectedRoomGroupTeamCandidateKeys:
      selectedRoomGroupTeamCandidateKeys.value,
    roomGroupFallbackQueueStates: roomGroupFallbackQueueStates.value,
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
    recommendedScheduleSnapshot: recommendedScheduleSnapshot.value,
    useOwnedOperators: ownedOperatorPreferenceReady.value
      ? useOwnedOperators.value
      : pendingOwnedOperatorPreference.value,
    updatedAt: new Date().toISOString(),
  };
}

function createInitialWorkspaceFromCurrent() {
  const snapshot = createWizardStateSnapshot();
  return {
    ...snapshot,
    selectedRoomGroupTeamCandidateKeys: {},
    roomGroupFallbackQueueStates: {},
    scheduleExecutionSettings: {
      shifts: [],
      droneTarget: "",
      droneTargetPinned: false,
    },
    scheduleRoomOperatorOverrides: {},
    scheduleRoomProductOverrides: {},
    invalidatedScheduleRoomKeys: {},
    recommendedScheduleSnapshot: null,
  };
}

function readOperatorSourceWorkspaces() {
  try {
    const raw = localStorage.getItem(RIIC_OPERATOR_WORKSPACES_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed?.version === 1 && parsed?.workspaces
      ? parsed.workspaces
      : {};
  } catch {
    return {};
  }
}

function saveOperatorSourceWorkspaces(workspaces) {
  try {
    localStorage.setItem(
      RIIC_OPERATOR_WORKSPACES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        workspaces,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // The generator remains usable when local storage is unavailable.
  }
}

function removeOperatorSourceWorkspace(sourceId) {
  const workspaces = readOperatorSourceWorkspaces();
  if (!Object.prototype.hasOwnProperty.call(workspaces, sourceId)) {
    return;
  }

  delete workspaces[sourceId];
  saveOperatorSourceWorkspaces(workspaces);
}

function applySavedWizardState(parsedDraft) {
  if (
    parsedDraft?.version === 1 &&
    ["twice", "threeTimes"].includes(parsedDraft.answers?.shiftMode)
  ) {
    Object.assign(answers, DEFAULT_ANSWERS, {
      shiftMode: parsedDraft.answers.shiftMode,
    });
    currentStep.value = 0;
    idealTrainingRaritySelection.value =
      normalizeRiicIdealTrainingRaritySelection();
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
      16,
      17,
      19,
      21,
      RIIC_SCHEDULE_DRAFT_PREVIOUS_VERSION,
      RIIC_SCHEDULE_DRAFT_VERSION,
    ].includes(parsedDraft?.version) ||
    !parsedDraft.answers
  ) {
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
  idealTrainingRaritySelection.value =
    normalizeRiicIdealTrainingRaritySelection(
      parsedDraft.idealTrainingRaritySelection,
    );
  selectedRoomGroupTeamCandidateKeys.value =
    parsedDraft.version >= RIIC_SCHEDULE_DRAFT_LEGACY_VERSION
      ? normalizeSavedRoomGroupTeamCandidateKeys(
          parsedDraft.selectedRoomGroupTeamCandidateKeys,
        )
      : {};
  controlCenterRoleSettings.value =
    parsedDraft.version >= RIIC_SCHEDULE_DRAFT_LEGACY_VERSION
      ? normalizeControlCenterRoleSettings(
          parsedDraft.controlCenterRoleSettings,
        )
      : { officeEnabled: false };
  controlCenterManualOverrides.value =
    parsedDraft.version >= RIIC_SCHEDULE_DRAFT_VERSION
      ? normalizeControlCenterManualOverrides(
          parsedDraft.controlCenterManualOverrides,
        )
      : normalizeControlCenterManualOverrides();
  roomGroupFallbackQueueStates.value =
    parsedDraft.version >= RIIC_SCHEDULE_DRAFT_LEGACY_VERSION
      ? normalizeSavedRoomGroupFallbackQueueStates(
          parsedDraft.roomGroupFallbackQueueStates,
        )
      : {};
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
  recommendedScheduleSnapshot.value =
    parsedDraft.version >= RIIC_SCHEDULE_DRAFT_LEGACY_VERSION
      ? normalizeRecommendedScheduleSnapshot(
          parsedDraft.recommendedScheduleSnapshot,
        )
      : null;
  pendingOwnedOperatorPreference.value =
    parsedDraft.useOwnedOperators === true;
  hasSavedWizardState.value = true;
  return true;
}

function loadSavedWizardState({
  sourceId = activeOperatorSource.value || OPERATOR_SOURCE_KEYS.skland,
  initialWorkspace = null,
} = {}) {
  try {
    const workspaces = readOperatorSourceWorkspaces();
    if (workspaces[sourceId]) {
      return applySavedWizardState(workspaces[sourceId]);
    }

    if (initialWorkspace) {
      return applySavedWizardState(initialWorkspace);
    }

    if (sourceId !== OPERATOR_SOURCE_KEYS.skland) {
      return false;
    }

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
    const restored = applySavedWizardState(parsedDraft);
    if (restored) {
      const nextWorkspaces = readOperatorSourceWorkspaces();
      nextWorkspaces[sourceId] = createWizardStateSnapshot();
      saveOperatorSourceWorkspaces(nextWorkspaces);
    }
    return restored;
  } catch {
    return false;
  }
}

function saveWizardState() {
  if (!storageReady.value || !activeOperatorSource.value) {
    return;
  }

  try {
    const workspaces = readOperatorSourceWorkspaces();
    workspaces[activeOperatorSource.value] = createWizardStateSnapshot();
    saveOperatorSourceWorkspaces(workspaces);
    hasSavedWizardState.value = true;
  } catch {
    // The generator remains usable when local storage is unavailable.
  }
}

function selectOption(key, value) {
  if (key === "shiftMode") {
    selectLayoutShift(value);
    return;
  }

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

  if (value === "recommend") {
    openRecommendationPanel();
    return;
  }

  recommendationPanelOpen.value = false;
  focusCurrentPanel();
}

function selectLayoutShift(value) {
  if (!LAYOUT_SHIFT_OPTIONS.some((option) => option.value === value)) {
    return;
  }

  answers.shiftMode = value;

  const currentCard = getLayoutCardByKey(
    confirmedLayoutPlan.value?.cardKey,
  );

  if (!confirmedLayoutPlan.value || !currentCard) {
    return;
  }

  if (!isLayoutCardCompatible(currentCard, value)) {
    selectedLayoutId.value = "";
    confirmedLayoutPlan.value = null;
    clearSelectedRoomGroupTeamCandidates();
    return;
  }

  if (confirmedLayoutPlan.value.shiftMode !== value) {
    confirmedLayoutPlan.value = {
      ...confirmedLayoutPlan.value,
      shiftMode: value,
    };
    clearSelectedRoomGroupTeamCandidates();
  }
}

function selectLayoutChoice(layoutId) {
  selectLayoutEntry(layoutId);
}

function clearSelectedRoomGroupTeamCandidates() {
  selectedRoomGroupTeamCandidateKeys.value = {};
  roomGroupFallbackQueueStates.value = {};
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

function setIdealTrainingRaritySelection(value) {
  const nextSelection = normalizeRiicIdealTrainingRaritySelection(value);
  if (
    JSON.stringify(idealTrainingRaritySelection.value) ===
    JSON.stringify(nextSelection)
  ) {
    return;
  }

  idealTrainingRaritySelection.value = nextSelection;
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
  applyDefaultLayoutSelection();
  treatUnderleveledOperatorsAsQualified.value = false;
  idealTrainingRaritySelection.value =
    normalizeRiicIdealTrainingRaritySelection();
  controlCenterRoleSettings.value = { officeEnabled: false };
  controlCenterManualOverrides.value = normalizeControlCenterManualOverrides();
  controlCenterLateFillExcludedOperatorIds.value = [];
  recommendedScheduleSnapshot.value = null;
  clearSelectedRoomGroupTeamCandidates();
  recommendationPanelOpen.value = false;
  if (automaticGenerationTriggerKey.value) {
    void generateAutomaticSchedule({ silentSuccess: true });
  }
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
    localStorage.removeItem(RIIC_OPERATOR_WORKSPACES_STORAGE_KEY);
  } catch {
    cleared = false;
  }

  Object.assign(answers, DEFAULT_ANSWERS);
  currentStep.value = 0;
  applyDefaultLayoutSelection();
  twoShiftRotationMode.value = "maa";
  treatUnderleveledOperatorsAsQualified.value = false;
  idealTrainingRaritySelection.value =
    normalizeRiicIdealTrainingRaritySelection();
  controlCenterRoleSettings.value = { officeEnabled: false };
  controlCenterManualOverrides.value = normalizeControlCenterManualOverrides();
  controlCenterLateFillExcludedOperatorIds.value = [];
  recommendedScheduleSnapshot.value = null;
  clearSelectedRoomGroupTeamCandidates();
  recommendationPanelOpen.value = false;
  useOwnedOperators.value = false;
  pendingOwnedOperatorPreference.value = false;
  resetOperatorSources({ clearStorage: true });
  hasSavedWizardState.value = false;

  await nextTick();
  storageReady.value = true;
  await loadOwnedOperators();
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
  const panelElement = contentPanel.value?.$el || contentPanel.value;
  panelElement?.scrollIntoView({
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
          clonedPanel.style.setProperty(
            "--riic-export-surface",
            isDark ? "#17191d" : "#ffffff",
          );
          clonedPanel.style.setProperty(
            "--riic-export-active-surface",
            isDark ? "#1f2a35" : "#eaf3fc",
          );
          clonedPanel.style.setProperty(
            "--riic-export-edited-surface",
            isDark ? "#20242a" : "#f4f6f8",
          );
          clonedPanel
            .querySelector(".riic-schedule-preview")
            ?.classList.add("export-capture");
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

function openGeneratedScheduleInLegacyEditor() {
  const schedule = generatedMaaExportPreview.value?.schedule;
  if (!schedule) {
    cMessage("当前没有可转交到旧版编辑器的排班", "warn");
    return;
  }

  try {
    sessionStorage.setItem(
      RIIC_LEGACY_EDITOR_TRANSFER_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        source: "riic-schedule-generator",
        schedule,
      }),
    );
  } catch (error) {
    console.error(error);
    cMessage("排班转交失败，请稍后重试", "error");
    return;
  }

  router.push({ name: "ScheduleV2" });
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
    currentStep,
    useOwnedOperators,
    twoShiftRotationMode,
    treatUnderleveledOperatorsAsQualified,
    controlCenterRoleSettings,
    controlCenterManualOverrides,
    recommendedScheduleSnapshot,
    selectedRoomGroupTeamCandidateKeys,
    roomGroupFallbackQueueStates,
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
  loadOperatorSources();
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

onBeforeUnmount(() => {
  riicYieldEngineAbortController?.abort();
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

    <RiicDeveloperWorkbench
      v-if="isDeveloperMode"
      :developer-source-url="developerSourceUrl"
      :developer-layout-options="developerLayoutOptions"
      :developer-shift-options="developerShiftOptions"
      :developer-layout-id="developerLayoutId"
      :developer-shift-mode="developerShiftMode"
      :developer-candidates="developerCandidates"
      :developer-combination-groups="developerCombinationGroups"
      :developer-combination-count="developerCombinationCount"
      :manual-queue-index="manualQueueIndex"
      :manual-queue-count="manualQueueCount"
      :manual-assignment-count="manualAssignmentCount"
      :manual-rooms="manualRooms"
      :manual-blueprint-rows="manualBlueprintRows"
      :selected-manual-room-id="selectedManualRoomId"
      :selected-manual-room="selectedManualRoom"
      :manual-selected-assignment="manualSelectedAssignment"
      :manual-group-options="manualGroupOptions"
      :get-manual-room-assignment="getManualRoomAssignment"
      :get-manual-room-assignment-label="getManualRoomAssignmentLabel"
      :get-manual-room-conflict-names="getManualRoomConflictNames"
      :is-manual-option-selected="isManualOptionSelected"
      :get-manual-option-conflict-names="getManualOptionConflictNames"
      :get-operator-avatar="getOperatorAvatar"
      :get-candidate-source-url="getCandidateSourceUrl"
      :format-source-date="formatSourceDate"
      @update:developer-layout-id="developerLayoutId = $event"
      @update:developer-shift-mode="developerShiftMode = $event"
      @update:manual-queue-index="manualQueueIndex = $event"
      @select-manual-room="selectManualRoom"
      @clear-manual-room-assignment="clearManualRoomAssignment"
      @assign-manual-group="assignManualGroup"
    ></RiicDeveloperWorkbench>

    <div v-else class="workflow-shell">
      <section
        class="workflow-stage workflow-card layout-workflow-stage"
        :class="`workflow-card-${layoutWorkflowCardState}`"
      >
        <header class="workflow-card-heading" data-step="STEP 1 OF 3">
          <div class="workflow-card-heading-copy">
            <h2>布局规划</h2>
            <span
              class="workflow-card-status"
              :class="`tone-${layoutWorkflowCardState}`"
            >
              <v-icon
                :icon="
                  layoutWorkflowCardState === 'complete'
                    ? 'mdi-check-circle'
                    : 'mdi-progress-clock'
                "
                size="15"
              ></v-icon>
              {{ layoutWorkflowCardState === "complete" ? "已完成" : "进行中" }}
            </span>
          </div>
        </header>

        <RiicLayoutChoicePanel
          ref="contentPanel"
          :recommendation-panel-open="recommendationPanelOpen"
          :steps="steps"
          :current-step="currentStep"
          :active-step="activeStep"
          :answers="answers"
          :recommendation="recommendation"
          :recommendation-card="recommendationCard"
          :layout-entry="layoutEntry"
          :selected-layout-shift-mode="selectedLayoutShiftMode"
          :selected-manual-schedule-value="selectedManualScheduleValue"
          :layout-shift-options="LAYOUT_SHIFT_OPTIONS"
          :visible-layout-schedule-options="visibleLayoutScheduleOptions"
          :is-step-complete="isStepComplete"
          :is-layout-recommended="isLayoutRecommended"
          @toggle-recommendation-panel="toggleRecommendationPanel"
          @select-recommendation-step="selectRecommendationStep"
          @update-answer="selectOption($event.key, $event.value)"
          @reset-recommendation-answers="resetRecommendationAnswers"
          @select-layout-shift="selectLayoutShift"
          @select-manual-schedule-option="selectManualScheduleOption"
        ></RiicLayoutChoicePanel>

        <section
          v-if="showLegacyScheduleReference"
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

      <section
        class="workflow-stage workflow-card schedule-generation-stage"
        :class="`workflow-card-${scheduleGenerationWorkflowCardState}`"
      >
        <div class="workflow-card-heading" data-step="STEP 2 OF 3">
          <div class="workflow-card-heading-copy">
            <h2>导入干员与生成排班表</h2>
            <span
              class="workflow-card-status"
              :class="`tone-${scheduleGenerationWorkflowCardState}`"
            >
              <v-icon
                :icon="
                  scheduleGenerationWorkflowCardState === 'complete'
                    ? 'mdi-check-circle'
                    : 'mdi-progress-clock'
                "
                size="15"
              ></v-icon>
              {{
                scheduleGenerationWorkflowCardState === "complete"
                  ? "已完成"
                  : "进行中"
              }}
            </span>
            <span
              v-if="
                scheduleGenerationWorkflowCardState !== 'complete' &&
                !hasAnyImportedOperatorData
              "
              class="workflow-card-status-note"
            >
              请导入至少一份干员数据
            </span>
          </div>
        </div>
        <RiicOperatorSourcePanel
          :skland-operator-source-status="sklandOperatorSourceStatus"
          :custom-operator-source-statuses="customOperatorSourceStatuses"
          :operator-source-states="operatorSourceStates"
          :custom-source-import-panel-open="customSourceImportPanelOpen"
          :custom-source-import-type="customSourceImportType"
          :custom-source-importing="customSourceImporting"
          :yituliu-token="yituliuTokenInput"
          :yituliu-source-label="yituliuSourceLabelInput"
          :max-custom-sources="RIIC_MAX_CUSTOM_OPERATOR_SOURCES"
          @open-skland="openSklandImport"
          @select-source="
            setActiveOperatorSource($event, { notify: true })
          "
          @open-import-panel="openCustomSourceImportPanel"
          @select-import-type="customSourceImportType = $event"
          @import-maa="handleMaaFileChange"
          @import-yituliu="importYituliuOperatorSource"
          @delete-source="deleteCustomOperatorSource"
          @update:yituliu-token="yituliuTokenInput = $event"
          @update:yituliu-source-label="yituliuSourceLabelInput = $event"
        />

        <RiicScheduleSettingsPanel
          v-if="isLayoutPlanningReady"
          :shift-mode="confirmedLayoutPlan?.shiftMode"
          :two-shift-rotation-mode="twoShiftRotationMode"
          :is252-layout-plan="is252LayoutPlan"
          :active-facility-requirement="activeFacilityRequirement"
          :facility-requirements="RIIC_FACILITY_REQUIREMENTS"
          :owned-operator-count="ownedOperators.length"
          :treat-underleveled-operators-as-qualified="
            treatUnderleveledOperatorsAsQualified
          "
          :ideal-training-rarity-selection="idealTrainingRaritySelection"
          @select-two-shift-rotation="selectTwoShiftRotationMode"
          @select-facility-requirement="selectFacilityRequirement"
          @set-training-mode="setTreatUnderleveledOperatorsAsQualified"
          @set-training-rarity-selection="setIdealTrainingRaritySelection"
        ></RiicScheduleSettingsPanel>

        <section v-if="isLayoutPlanningReady" class="room-workbench">
          <RiicRoomGroupNavigator
            :selection-rows="roomGroupSelectionRows"
            :active-group-id="activeScheduleRoomGroup?.id || ''"
            :layout-plan-summary="layoutPlanSummary"
            :get-group-status="getRoomGroupDisplayStatus"
            @select-group="activeScheduleRoomGroupKey = $event"
          />

          <div
            v-if="activeScheduleRoomGroup"
            ref="roomEditorPanel"
          >
            <RiicControlCenterStaffingPanel
              v-if="activeScheduleRoomGroup.manualControl"
              :room-group="activeScheduleRoomGroup"
              :control-state="controlCenterRoleState"
              :late-fill-state="controlCenterLateFillState"
              :operators="controlCenterCandidateOperators"
              :operator-table="operatorTableV2"
              @add-operator="addControlCenterOperator"
              @remove-operator="removeControlCenterOperator"
            />
            <RiicRoomGroupStaffingPanel
              v-else
              :room-group="activeScheduleRoomGroup"
              :operator-table="operatorTableV2"
              :candidate-state="activeRoomGroupCandidateState"
              :visible-cohorts="visibleActiveRoomGroupStaffingCohorts"
              :show-debug="showCandidateDebugValues"
              :format-room-group-bonus-percent="formatRoomGroupBonusPercent"
              :get-selected-team-candidate-count="
                getSelectedTeamCandidateCount
              "
              :get-selected-room-candidate-count="
                getSelectedRoomCandidateCount
              "
              :can-toggle-room-group-team-candidate="
                canToggleRoomGroupTeamCandidate
              "
              :get-room-group-candidate-tooltip="getRoomGroupCandidateTooltip"
              :get-room-group-candidate-fallback-queue-operators="
                getRoomGroupCandidateFallbackQueueOperators
              "
              :get-room-group-candidate-fallback-placeholder-count="
                getRoomGroupCandidateFallbackPlaceholderCount
              "
              :get-room-group-candidate-metrics="getRoomGroupCandidateMetrics"
              :get-room-group-candidate-debug-values="
                getRoomGroupCandidateDebugValues
              "
              :format-room-group-candidate-debug-value="
                formatRoomGroupCandidateDebugValue
              "
              :get-room-group-selection-progress="
                getRoomGroupSelectionProgress
              "
              :fallback-plan="activeRoomGroupFallbackPlan"
              :fallback-sections="activeRoomGroupFallbackSections"
              :get-room-fallback-operator-classes="
                getRoomFallbackOperatorClasses
              "
              :format-room-fallback-operator-percent="
                formatRoomFallbackOperatorPercent
              "
              :get-room-fallback-operator-debug-values="
                getRoomFallbackOperatorDebugValues
              "
              :can-append-fallback-operator="
                canAppendRoomGroupFallbackQueueOperator
              "
              @retry-catalog-load="retryActiveRoomGroupCatalogLoad"
              @show-more-candidates="
                showMoreRoomGroupCandidates(activeScheduleRoomGroup, $event)
              "
              @toggle-team-candidate="
                toggleRoomGroupTeamCandidate({
                  group: activeScheduleRoomGroup,
                  cohort: $event.cohort,
                  candidate: $event.candidate,
                })
              "
              @remove-fallback-operator="
                removeRoomGroupFallbackQueueOperator(
                  activeScheduleRoomGroup,
                  activeRoomGroupFallbackPlan,
                  $event,
                )
              "
              @append-fallback-operator="
                appendRoomGroupFallbackQueueOperator(
                  activeScheduleRoomGroup,
                  activeRoomGroupFallbackPlan,
                  $event.section,
                  $event.operator,
                )
              "
            ></RiicRoomGroupStaffingPanel>
          </div>

          <button
            type="button"
            class="room-workbench-restore"
            @click="restoreRecommendedSchedule"
          >
            <v-icon icon="mdi-restore" size="16"></v-icon>
            <span>恢复推荐方案</span>
          </button>

        </section>

        <p v-else class="schedule-generation-empty-state">
          选择布局后即可生成排班表
        </p>
      </section>

      <section
        class="workflow-stage workflow-card schedule-output-stage"
        :class="`workflow-card-${scheduleOutputWorkflowCardState}`"
      >
        <div class="workflow-card-heading" data-step="STEP 3 OF 3">
          <div class="workflow-card-heading-copy">
            <h2>排班表调整与导出</h2>
            <span
              class="workflow-card-status"
              :class="`tone-${scheduleOutputWorkflowCardState}`"
            >
              <v-icon
                :icon="
                  scheduleOutputWorkflowCardState === 'complete'
                    ? 'mdi-check-circle'
                    : 'mdi-progress-clock'
                "
                size="15"
              ></v-icon>
              {{
                scheduleOutputWorkflowCardState === "complete"
                  ? "可调整"
                  : "待生成"
              }}
            </span>
          </div>
        </div>

        <section
          class="assembled-schedule-panel"
          :class="`state-${assembledScheduleCandidateState.status}`"
        >
          <div
            v-if="displayedRiicSchedulePreview"
            class="assembled-schedule-content"
          >
            <div
              ref="schedulePreviewCapturePanel"
              class="schedule-preview-capture"
              data-riic-preview-capture
            >
              <RiicSchedulePreview
                :preview="displayedRiicSchedulePreview"
                :placeholder="!riicSchedulePreview"
                :active-state-index="activeSchedulePreviewStateIndex"
                :operator-table="operatorTableV2"
                :selected-room-key="selectedSchedulePreviewRoomKey"
                :shifts="schedulePreviewShifts"
                :drone-target-options="scheduleDroneTargetOptions"
                :drone-target="scheduleExecutionSettings.droneTarget"
                @update:active-state-index="
                  activeSchedulePreviewStateIndex = $event
                "
                @update:shift="updateSchedulePreviewShift"
                @edit-room="selectSchedulePreviewRoom"
                @select-drone-target="selectScheduleDroneTarget"
              ></RiicSchedulePreview>
            </div>
            <div
              ref="roomEditorPanel"
              v-if="riicSchedulePreview && activeSchedulePreviewRoom"
            >
              <RiicScheduleRoomEditorPanel
                :room="activeSchedulePreviewRoom"
                :shift-name="
                  schedulePreviewShifts[activeSchedulePreviewStateIndex]
                    ?.name || '当前班次'
                "
                :operators="scheduleRoomEditorOperators"
                :operator-options="scheduleRoomEditorOperatorOptions"
                :product-options="scheduleRoomEditorProductOptions"
                :operator-input="scheduleRoomEditorOperatorInput"
                :input-unmatched="scheduleRoomEditorInputUnmatched"
                @reset="resetSchedulePreviewRoom"
                @change-product="changeScheduleRoomProduct"
                @update:operator-input="
                  scheduleRoomEditorOperatorInput = $event
                "
                @add-operator="addScheduleRoomEditorOperator"
                @remove-operator="removeScheduleRoomEditorOperator"
              ></RiicScheduleRoomEditorPanel>
            </div>

          </div>

          <p v-else class="assembled-schedule-empty">
            {{
              isLayoutPlanningReady
                ? getAssembledCandidateBlockedMessage(
                    assembledScheduleCandidateState,
                  )
                : "选择布局并完成班组配置后即可调整排班表"
            }}
          </p>
        </section>

        <RiicScheduleExportActions
          v-if="
            assembledScheduleCandidateState.status === 'ready' &&
            riicSchedulePreview &&
            generatedMaaExportPreview
          "
          :exporting-image="exportingImage"
          :exporting-maa="exportingMaa"
          @export-image="exportGeneratedScheduleImage"
          @export-maa="exportGeneratedMaaSchedule"
          @open-legacy-editor="openGeneratedScheduleInLegacyEditor"
        ></RiicScheduleExportActions>
        <p v-else class="schedule-output-empty">
          选择并生成全部房间组后即可导出结果
        </p>
      </section>

      <section
        class="workflow-stage workflow-card riic-yield-workflow-stage"
        :class="`workflow-card-${riicYieldWorkflowCardState}`"
      >
        <div class="workflow-card-heading">
          <div class="workflow-card-heading-copy">
            <h2>附加信息</h2>
            <span
              class="workflow-card-status"
              :class="`tone-${riicYieldWorkflowCardState}`"
            >
              <v-icon
                :icon="
                  riicYieldWorkflowCardState === 'complete'
                    ? 'mdi-check-circle'
                    : 'mdi-progress-clock'
                "
                size="15"
              ></v-icon>
              {{
                riicYieldWorkflowCardState === "complete"
                  ? "已就绪"
                  : generatedMaaExportPreview
                    ? "正在整理"
                    : "待生成"
              }}
            </span>
          </div>
        </div>

        <RiicAdditionalInfoPanel
          :schedule-training-requirements="scheduleTrainingRequirements"
          :operator-table="operatorTableV2"
          :riic-yield-engine-results="riicYieldEngineResults"
          :riic-actual-schedule-metrics="riicActualScheduleMetrics"
          :confirmed-layout-plan="confirmedLayoutPlan"
          :riic-matching-roster="riicMatchingRoster"
          :riic-layer3-matched-rule-count="riicLayer3MatchedRuleCount"
          :riic-layer3-rule-checks="riicLayer3RuleChecks"
          :riic-control-center-scenario-trial-state="
            riicControlCenterScenarioTrialState
          "
          :riic-perception-resource-trial-state="
            riicPerceptionResourceTrialState
          "
          :riic-control-center-operator-effect-debug-state="
            riicControlCenterOperatorEffectDebugState
          "
          :show-candidate-debug-values="showCandidateDebugValues"
          :format-training-requirement="formatTrainingRequirement"
          :get-riic-yield-engine-status-meta="getRiicYieldEngineStatusMeta"
          :format-riic-yield-metric="formatRiicYieldMetric"
          :format-riic-layer3-operator-condition="
            formatRiicLayer3OperatorCondition
          "
          :format-riic-layer3-facility-condition="
            formatRiicLayer3FacilityCondition
          "
          :format-riic-layer3-rule-effect="formatRiicLayer3RuleEffect"
        />
      </section>

      <div class="page-cache-reset">
        <button type="button" @click="clearSavedWizardState">
          清空本页缓存
        </button>
        <button
          type="button"
          class="candidate-debug-toggle"
          :class="{ active: showCandidateDebugValues }"
          :aria-pressed="showCandidateDebugValues"
          @click="showCandidateDebugValues = !showCandidateDebugValues"
        >
          <v-icon
            :icon="
              showCandidateDebugValues
                ? 'mdi-bug-check-outline'
                : 'mdi-bug-outline'
            "
            size="16"
          ></v-icon>
          <span>
            {{
              showCandidateDebugValues
                ? "隐藏调试信息"
                : "显示调试信息"
            }}
          </span>
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

.schedule-output-empty {
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.55;
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
  align-items: center;
  gap: 8px;
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
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, var(--c-border-color) 82%, transparent);
  border-radius: 6px;
  background: var(--c-page-background-color);
  box-shadow: 0 8px 22px rgb(20 34 48 / 9%);
}

.wizard-layout.manual-selection {
  grid-template-columns: minmax(0, 1fr);
  max-width: 880px;
}

.workflow-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  isolation: isolate;
  min-width: 0;
  min-height: 54px;
  margin: -22px -22px 20px;
  overflow: hidden;
  padding: 12px 18px;
  background: var(--riic-orange);
  color: #fff;
}

.workflow-card-complete .workflow-card-heading {
  background: var(--riic-green);
}

.workflow-card-heading[data-step]::before {
  position: absolute;
  z-index: 0;
  top: 50%;
  right: 16px;
  color: rgb(255 255 255 / 18%);
  content: attr(data-step);
  font-family: "Arial Narrow", Arial, sans-serif;
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  transform: translateY(-50%);
  white-space: nowrap;
  pointer-events: none;
}

.workflow-card-heading > * {
  position: relative;
  z-index: 1;
}

.workflow-card-heading-copy {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 10px;
}

.workflow-stage .workflow-card-heading h2 {
  margin: 0;
  color: #fff;
  font-size: 18px;
  line-height: 1.35;
}

.workflow-card-heading span {
  overflow: hidden;
  color: color-mix(in srgb, #fff 82%, transparent);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-card-status {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 4px;
  overflow: visible;
  padding: 3px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, #fff 18%, transparent);
  color: #fff !important;
  font-size: 12px;
  font-weight: 700;
  text-overflow: clip;
}

.workflow-card-status.tone-complete {
  color: #fff;
}

.workflow-card-status.tone-pending {
  color: #fff;
}

.workflow-card-status > .v-icon {
  flex: 0 0 auto;
}

.workflow-card-heading .workflow-card-status-note {
  flex: 0 1 auto;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 600;
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

.schedule-generation-section-label {
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.candidate-debug-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  padding: 3px 0;
  border: 0;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}

.candidate-debug-toggle:hover,
.candidate-debug-toggle.active {
  color: var(--riic-blue);
}

.page-cache-reset .candidate-debug-toggle:hover,
.page-cache-reset .candidate-debug-toggle.active {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 54%,
    var(--c-border-color)
  );
  color: var(--riic-blue);
}

.room-workbench {
  margin-top: 14px;
}

.room-workbench-restore {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  gap: 5px;
  margin-top: 12px;
  padding: 4px 8px;
  border: 1px solid
    color-mix(in srgb, var(--riic-blue) 48%, var(--c-border-color));
  border-radius: 4px;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  cursor: pointer;
}

.room-workbench-restore:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--riic-blue) 9%,
    var(--c-page-background-color-secondary)
  );
}

.room-workbench-restore:disabled {
  cursor: default;
  opacity: 0.55;
}

.assembled-schedule-panel {
  margin-top: 18px;
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
  .schedule-settings-control-grid {
    grid-template-columns: 1fr;
  }

  .layout-entry-grid {
    grid-template-columns: 1fr;
    column-gap: 0;
  }

  .recommendation-field-list .option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .workflow-card-heading {
    margin: -18px -18px 18px;
  }

  .workflow-card-heading[data-step]::before {
    right: 14px;
    font-size: 34px;
  }

  .layout-entry-panel {
    gap: 16px;
  }

  .layout-schedule-group {
    gap: 8px;
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
