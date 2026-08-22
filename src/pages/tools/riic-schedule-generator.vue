<script setup>
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  toRaw,
  watch,
} from "vue";
import { saveAs } from "file-saver";
import { useRoute, useRouter } from "vue-router";
import RiicAdditionalInfoPanel from "/src/components/tools/RiicAdditionalInfoPanel.vue";
import RiicControlCenterStaffingPanel from "/src/components/tools/RiicControlCenterStaffingPanel.vue";
import RiicOperatorSourcePanel from "/src/components/tools/RiicOperatorSourcePanel.vue";
import RiicPipelineDebugPanel from "/src/components/tools/RiicPipelineDebugPanel.vue";
import RiicRoomGroupNavigator from "/src/components/tools/RiicRoomGroupNavigator.vue";
import RiicScheduleExportActions from "/src/components/tools/RiicScheduleExportActions.vue";
import RiicScheduleExportSettings from "/src/components/tools/RiicScheduleExportSettings.vue";
import RiicFiammettaRecoverySetting from "/src/components/tools/RiicFiammettaRecoverySetting.vue";
import RiicScheduleFiammettaSettings from "/src/components/tools/RiicScheduleFiammettaSettings.vue";
import RiicScheduleResourceSummary from "/src/components/tools/RiicScheduleResourceSummary.vue";
import RiicLayoutChoicePanel from "/src/components/tools/RiicLayoutChoicePanel.vue";
import RiicSchedulePreview from "/src/components/tools/RiicSchedulePreview.vue";
import RiicScheduleRoomEditorPanel from "/src/components/tools/RiicScheduleRoomEditorPanel.vue";
import RiicRoomGroupStaffingPanel from "/src/components/tools/RiicRoomGroupStaffingPanel.vue";
import RiicScheduleSettingsPanel from "/src/components/tools/RiicScheduleSettingsPanel.vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import { cMessage } from "/src/utils/message.js";
import battleRecordImage from "/src/assets/images/riic-schedule-preview/battle-record.png";
import goldImage from "/src/assets/images/riic-schedule-preview/gold.png";
import lmdImage from "/src/assets/images/riic-schedule-preview/lmd.png";
import originiumShardImage from "/src/assets/images/riic-schedule-preview/originium-shard.png";
import orundumImage from "/src/assets/images/riic-schedule-preview/orundum.png";
import {
  OPERATOR_SOURCE_KEYS,
  RIIC_MAX_CUSTOM_OPERATOR_SOURCES,
} from "/src/utils/riicOperatorSources.js";
import { useRiicOperatorSources } from "/src/utils/riicOperatorSources.js";
import { operatorTableV2 } from "/src/utils/gameData.js";
import { getRiicOperatorSkillTooltip } from "/src/utils/riic/riic-operator-skill-tooltip.js";
import {
  createRiicOperatorSearchEntries,
  findRiicOperatorSearchMatches,
} from "/src/utils/riicOperatorSearch.js";
import RIIC_BASELINE_SKILL_RULES from "/src/static/json/tools/R00-baseline.json";
import RIIC_CONTROL_CENTER_SKILLS from "/src/static/json/tools/riic-candidates/R50-control.json";
import RIIC_SCHEDULE_CHANGELOG from "/src/static/json/riic/schedule/changelog.json";
import {
  createRiicLayoutRecommendation,
  RIIC_LAYOUTS as RIIC_LAYOUT_RECOMMENDATION_LAYOUTS,
} from "/src/utils/riicLayoutRecommendation.js";
import {
  DEFAULT_ANSWERS,
  DEFAULT_LAYOUT_SELECTION,
  getLayoutFacilitySummary,
  getLayoutRoomFacility,
  isLayoutCardCompatible,
  LAYOUT_CARD_META,
  LAYOUT_SHIFT_OPTIONS,
  RIIC_SCHEDULE_ANSWER_FIELDS as ANSWER_FIELDS,
  RIIC_SCHEDULE_STEPS as steps,
  ROOM_CANDIDATE_EFFECT_META,
  ROOM_CANDIDATE_PRODUCTS,
  ROOM_PRODUCT_OPTIONS,
  SCHEDULE_ROOM_GROUP_ICONS,
  SCHEDULE_ROOM_GROUP_META,
  STATIC_SCHEDULE_ROOM_GROUPS,
} from "/src/utils/riicScheduleConfiguration.js";

import {
  getRiicFacilityProfile,
  getRiicRoomStations,
  normalizeRiicFacilityRequirement,
  RIIC_FACILITY_REQUIREMENTS,
} from "/src/utils/riic/l10-facility-model.js";
import { summarizeRiicFacilityPower } from "/src/utils/riic/riic-facility-power-model.js";
import {
  createRiicIdealTrainingRoster,
  resolveRiicBaselineSkills,
} from "/src/utils/riic/l00-baseline-resolver.js";
import {
  getRiicLayer3RuleConditionChecks,
  getRiicLayer3SupportRoomPlacements,
} from "/src/utils/riic/l30-rules.js";
import {
  createRiicRoomGroupFallbackPlan,
} from "/src/utils/riic/l63-fallback.js";
import {
  createRiicEmptyRoomTeamCandidate,
  materializeRiicRoomTeamCandidate,
  mergeRiicIndividualRoomTeamCandidates,
} from "/src/utils/riic/l62-room-team-materializer.js";
import {
  getRiicAutomaticRoomGroupPlanningOrder,
} from "/src/utils/riic/l70-automatic-room-selection.js";
import {
  getRiicIdleFillOperators,
  withRiicIdleFillOperators,
} from "/src/utils/riic/l71-idle-fill.js";
import {
  isRiicAutomaticScheduleAbortError,
  runRiicAutomaticScheduleInWorker,
  runRiicTrainingRecommendationInWorker,
  runRiicTrainingImpactInWorker,
} from "/src/utils/riic/l70-scheduler-runner.js";
import { getRiicRoomGroupStaffingRequirement } from "/src/utils/riic/l60-staffing.js";
import {
  getRiicFiammettaScheduleUsage,
  getRiicFiammettaTeamStateIndexes,
} from "/src/utils/riic/l65-fiammetta-recovery.js";
import {
  loadRiicStaticRoomCandidateCatalog,
} from "/src/utils/riic/l10-catalog.js";
import {
  createRiicRoomGroupCandidateState,
  getRiicRoomGroupCatalogKey as getRoomGroupCatalogKey,
  getRiicRoomGroupCatalogRequests as getRoomGroupCatalogRequests,
  getRiicStaticRoomCandidateCatalogFacility as getStaticRoomCandidateCatalogFacility,
} from "/src/utils/riic/l60-room-group-state.js";
import {
  normalizeRiicIdealTrainingRaritySelection,
} from "/src/utils/riic/l00-training-policy.js";
import {
  getRiicRuntimeCandidateContributionBreakdown,
} from "/src/utils/riic/l60-candidate-ranking.js";
import { evaluateRiicControlCenterScenarios } from "/src/utils/riic/l40-control-trial.js";
import { evaluateRiicPerceptionResourceTrials } from "/src/utils/riic/l41-perception-trial.js";
import { buildRiicSchedulePreview } from "/src/utils/riicSchedulePreview.js";
import { summarizeRiicActualSchedule } from "/src/utils/riic/l80-actual-settlement.js";
import {
  settleRiicMaaScheduleEfficiency,
} from "/src/utils/riic/l79-preview-efficiency-settlement.js";
import {
  buildRiicMaaScheduleFromPreview,
  getRiicMaaRoomType,
  prepareRiicMaaScheduleForExport,
} from "/src/utils/riicScheduleExport.js";
import {
  createRiicYieldEngineRunningResult,
} from "/src/utils/riicYieldEngines/contract.js";
import {
  buildRiicControlCenterRuntimeContext,
} from "/src/utils/riic/l51-control-effects.js";
import {
  applyRiicControlCenterManualOverrides,
  buildRiicControlCenterAutomaticRoleState,
  buildRiicControlCenterLateFillState,
  mergeRiicControlCenterLateFillState,
} from "/src/utils/riic/l50-control-planner.js";
import {
  buildRiicControlCenterCandidateOperators,
} from "/src/utils/riic/l50-control-candidates.js";
import { alignRiicScheduleSameShiftBindings } from "/src/utils/riic/l74-same-shift-bindings.js";
import {
  getRiicScheduleTrainingRecommendations,
} from "/src/utils/riic/l83-training-recommendations.js";
import {
  RIIC_YIELD_ENGINE_REGISTRY,
} from "/src/utils/riicYieldEngines/engineRegistry.js";
import {
  runRiicYieldEngines,
} from "/src/utils/riicYieldEngines/engineRunner.js";
import {
  createRiicWorkspaceSnapshot,
  normalizeRiicWorkspaceSnapshot,
} from "/src/utils/riic/riic-schedule-workspace.js";
import { createRiicScheduleResultSnapshot } from "/src/utils/riic/riic-schedule-result-snapshot.js";
import { createRiicScheduleGenerationWorkflow } from "/src/utils/riic/riic-schedule-generation-workflow.js";

const RIIC_OPERATOR_WORKSPACES_STORAGE_KEY =
  "riic_schedule_generator_workspaces_v1";
const RIIC_LEGACY_EDITOR_TRANSFER_STORAGE_KEY =
  "riic_schedule_generator_to_legacy_editor_v1";
const RIIC_WORKFLOW_CARD_COLLAPSE_STORAGE_KEY =
  "riic_schedule_generator_workflow_card_collapse_v1";
const RIIC_WORKFLOW_CARD_IDS = Object.freeze([
  "layout",
  "generation",
  "output",
  "additional",
  "changelog",
]);
const RIIC_SCHEDULE_DRAFT_VERSION = 25;
const ROOM_STAFFING_CANDIDATE_PAGE_SIZE = 24;
const RIIC_AUTOMATIC_SELECTION_STRATEGY_VERSION = "14";
const RIIC_SCHEDULING_EXCLUDED_OPERATOR_IDS = new Set([
  "char_1001_amiya2",
  "char_1037_amiya3",
]);
const RIIC_AUTOMATIC_SEARCH_CONFIGS = Object.freeze({
  fast: {
    selectionBeamLimit: 6,
    selectionOptionLimit: 6,
    selectionRepresentativeLimit: 6,
    selectionBatchSize: 2,
    fallbackPlanLimit: 12,
  },
  deep: {
    selectionBeamLimit: 12,
    selectionOptionLimit: 12,
    selectionRepresentativeLimit: 12,
    selectionBatchSize: 2,
    fallbackPlanLimit: 12,
  },
});
const RIIC_SCHEDULE_MODULE_VERSIONS =
  RIIC_SCHEDULE_CHANGELOG.moduleVersions || {};
const RIIC_SCHEDULE_CHANGELOG_ENTRIES = Array.isArray(
  RIIC_SCHEDULE_CHANGELOG.entries,
)
  ? RIIC_SCHEDULE_CHANGELOG.entries
  : [];
const riicScheduleFrameworkVersion = computed(() => {
  const versionPattern = /^v\d{8}\.\d{4}$/;
  const versions = [
    ...Object.values(RIIC_SCHEDULE_MODULE_VERSIONS).map((module) =>
      String(module?.version || "").trim(),
    ),
    ...RIIC_SCHEDULE_CHANGELOG_ENTRIES.map((entry) =>
      String(entry?.version || "").trim(),
    ),
  ].filter((version) => versionPattern.test(version));

  return versions.sort().pop() || "";
});
const FIAMMETTA_RECOVERY_TARGET_NAMES = Object.freeze([
  "但书",
  "可露希尔",
  "龙舌兰",
  "巫恋",
]);
const CONTROL_CENTER_FUNCTION_ROLE_DEFINITIONS = Object.freeze([
  {
    id: "room",
    label: "设施产能加成类",
    targetRoomType: "",
    maxPerTeam: 3,
    buffTags: [
      "trading-station",
      "manufacture-station",
      "office",
    ],
  },
  {
    id: "operator",
    label: "干员相关效果类",
    targetRoomType: "",
    maxPerTeam: 5,
    buffTags: ["trading-operator", "manufacture-operator", "operator-effect"],
  },
]);
function formatRiicControlCenterRoomEffect(effect) {
  const roomLabel =
    {
      trading: "贸易站",
      manufacture: "制造站",
      meeting: "会客室",
      hire: "办公室",
    }[String(effect?.target?.roomType || "").trim()] || "";
  const bonusPercent = Number(effect?.bonusPercent);
  if (!roomLabel || !Number.isFinite(bonusPercent)) {
    return "";
  }
  const metric = String(effect?.metric || "").trim();
  const metricLabel =
    metric === "orderLimit" ? " \u8ba2\u5355\u4e0a\u9650" : "";
  const valueSuffix = metric === "orderLimit" ? "" : "%";

  const targetOperatorIds = (effect?.target?.operatorIds || [])
    .map((operatorId) => String(operatorId || "").trim())
    .filter(Boolean);
  const targetOperatorName =
    targetOperatorIds.length === 1
      ? String(operatorTableV2?.[targetOperatorIds[0]]?.name || "").trim()
      : "";
  const targetLabel =
    String(effect?.target?.scope || "").trim() === "operators"
      ? `${targetOperatorName || "\u6307\u5b9a\u5e72\u5458"}\u5728`
      : "";
  return `${targetLabel}${roomLabel}${metricLabel}${
    targetLabel ? "\u65f6 " : " "
  }${
    bonusPercent >= 0 ? "+" : ""
  }${bonusPercent}${valueSuffix}`;
}

const operatorNameToCharId = new Map(
  Object.entries(operatorTableV2).map(([charId, operator]) => [
    operator.name,
    charId,
  ]),
);
const route = useRoute();
const router = useRouter();

const answers = reactive({ ...DEFAULT_ANSWERS });
const currentStep = ref(0);
const contentPanel = ref(null);
const schedulePreviewExportCapturePanel = ref(null);
const treatUnderleveledOperatorsAsQualified = ref(false);
const idealTrainingRaritySelection = ref(
  normalizeRiicIdealTrainingRaritySelection(),
);
const showCandidateDebugValues = computed(() => route.query.mode === "dev");
const isOutputPreviewMode = computed(() => route.query.mode === "output");
const hasSavedWizardState = ref(false);
const storageReady = ref(false);
const exportingImage = ref(false);
const exportingMaa = ref(false);
const layoutEntry = ref(DEFAULT_LAYOUT_SELECTION.cardKey);
const planningMode = ref("manual");
const selectedLayoutId = ref(DEFAULT_LAYOUT_SELECTION.layoutId);
const confirmedLayoutPlan = ref(createDefaultConfirmedLayoutPlan());
const recommendationPanelOpen = ref(false);
const customLayoutEditorOpen = ref(false);
const customLayoutDraft = ref(null);
const customLayoutResetSnapshot = ref(null);
const twoShiftRotationMode = ref("maa");
const autoGeneratingSchedule = ref(false);
const automaticGenerationPhase = ref("");
const automaticGenerationNoticeOperators = ref([]);
const automaticGenerationNoticeAvatarLoop = computed(() => [
  ...automaticGenerationNoticeOperators.value,
  ...automaticGenerationNoticeOperators.value,
]);
const scheduleGenerationLoading = computed(
  () =>
    loadingOwnedOperators.value ||
    operatorSourceSwitching.value ||
    autoGeneratingSchedule.value,
);
const scheduleGenerationLoadingTitle = computed(() =>
  autoGeneratingSchedule.value ? "正在后台排班" : "正在加载干员数据",
);
const scheduleGenerationLoadingPhase = computed(() => {
  if (autoGeneratingSchedule.value) {
    return automaticGenerationPhase.value || "正在计算候选与补位";
  }

  if (operatorSourceSwitching.value) {
    return "正在切换当前数据源";
  }

  return "正在读取当前数据源";
});
const automaticGenerationProgressLabels = {
  L70: "正在分析候选方案",
  L70_CANDIDATES: "正在读取候选班组",
  L70_COMBINING: "正在组合候选与补位方案",
  L70_FALLBACK: "正在计算候选补位",
  L71: "正在处理普通补位",
  L71_FILL: "正在分配普通闲置干员",
  L72: "正在整理资源组合",
  L73: "正在校准控制中枢",
};
const riicAutomaticGenerationDebugState = ref(null);
const automaticControlCenterReconciliationState = ref(null);
const trainingRecommendationState = ref({
  status: "idle",
  phase: "",
  requirements: [],
});
let restoredWizardTrainingRecommendationPending = false;
const trainingImpactState = ref({ status: "idle", results: [] });
const deepScheduleConfirmationOpen = ref(false);
let automaticGenerationAbortController = null;
let automaticGenerationQueuedOptions = null;
let automaticGenerationRequestId = 0;
let trainingRecommendationAbortController = null;
let trainingRecommendationRequestId = 0;
let trainingImpactAbortController = null;
let trainingImpactRequestId = 0;

function resetTrainingImpactState() {
  trainingImpactAbortController?.abort();
  trainingImpactAbortController = null;
  trainingImpactRequestId += 1;
  trainingImpactState.value = { status: "idle", results: [] };
}
const lastAutomaticGenerationTriggerKey = ref("");
const controlCenterPlanningRunId = ref(0);
const activeScheduleRoomGroupKey = ref("");
const selectedRoomGroupTeamCandidateKeys = ref({});
const roomGroupFallbackQueueStates = ref({});
const controlCenterRoleSettings = ref({
  officeEnabled: false,
});
const controlCenterManualOverrides = ref({
  removedOperatorIds: [],
  removedOperatorIdsByTeamIndex: {},
  addedOperatorIdsByTeamIndex: {},
});
const controlCenterLateFillExcludedOperatorIdsByTeamIndex = ref({});
const fiammettaRecoverySettings = ref({
  target: "但书",
  custom: false,
  customTarget: "",
});
const scheduleExecutionSettings = reactive({
  shifts: [],
  orundumCraftMaterial: "orirock",
  includeTrainingRoom: false,
  exportInfo: {
    title: "",
    author: "",
    description: "",
  },
});
const visibleRoomGroupCandidateCounts = ref({});
const activeSchedulePreviewStateIndex = ref(0);
const roomEditorPanel = ref(null);
const selectedSchedulePreviewRoomKey = ref("");
const scheduleRoomOperatorOverrides = ref({});
const scheduleRoomProductOverrides = ref({});
const invalidatedScheduleRoomKeys = ref({});
const scheduleRoomMaaSettingOverrides = ref({});
const scheduleRoomMaaIndexAssignments = ref({});
const copiedScheduleRoomOperators = ref(null);
const copiedScheduleShiftOperators = ref(null);
const scheduleRoomEditorOperatorInput = ref("");
const manualOperatorEditorEnabled = computed(
  () => import.meta.env.DEV && showCandidateDebugValues.value,
);
const RiicManualOperatorSourceChoice = import.meta.env.DEV
  ? defineAsyncComponent(
      () =>
        import(
          "/src/components/tools/RiicManualOperatorSourceChoice.vue"
        ),
    )
  : null;
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
  resetGeneratedScheduleState,
  generateAutomaticSchedule,
  getIsUserLoggedIn: () => isUserLoggedIn.value,
  getAutomaticGenerationTriggerKey: () => automaticGenerationTriggerKey.value,
  getAutomaticGenerationResultReady: () =>
    isAutomaticGenerationResultReady(),
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

function getScheduleClockMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatScheduleClockMinutes(value) {
  const minutes = ((Number(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function getScheduleForwardMinutes(from, to) {
  return (to - from + 1440) % 1440;
}

function getDefaultScheduleShiftPeriod(shifts, index) {
  const start = getScheduleClockMinutes(shifts[index]?.time);
  if (start === null) {
    return { periodStart: "", periodEnd: "" };
  }

  const previous = getScheduleClockMinutes(
    shifts[(index - 1 + shifts.length) % shifts.length]?.time,
  );
  const next = getScheduleClockMinutes(
    shifts[(index + 1) % shifts.length]?.time,
  );
  let startOffset = -60;
  let endOffset = 60;
  if (
    previous !== null &&
    getScheduleForwardMinutes(previous, start) < 120
  ) {
    startOffset = -Math.floor(getScheduleForwardMinutes(previous, start) / 2);
  }
  if (next !== null && getScheduleForwardMinutes(start, next) < 120) {
    endOffset = Math.ceil(getScheduleForwardMinutes(start, next) / 2);
  }

  return {
    periodStart: formatScheduleClockMinutes(start + startOffset),
    periodEnd: formatScheduleClockMinutes(start + endOffset),
  };
}

function withDefaultScheduleShiftPeriod(shift, shifts, index) {
  return {
    ...shift,
    ...getDefaultScheduleShiftPeriod(shifts, index),
    periodCustomized: false,
  };
}

function createDefaultScheduleShifts(
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  if (isMaaTwoShiftRotation(shiftMode, rotationMode)) {
    return [
      { id: "shift-1", name: "B\u73ed", time: "09:00" },
      { id: "shift-2", name: "A\u73ed", time: "21:00" },
    ].map((shift) => ({
      ...shift,
      description: "",
      descriptionPost: "",
      fiammetta: {
        enable: false,
        target: "",
        order: "pre",
      },
      drone: {
        target: "",
        pinned: false,
        disabled: false,
        order: "pre",
      },
    })).map((shift, index, shifts) =>
      withDefaultScheduleShiftPeriod(shift, shifts, index),
    );
  }

  const defaults = {
    once: [
      { name: "B班", time: "09:00" },
      { name: "A班", time: "09:00" },
    ],
    twice: [
      { name: "C班", time: "09:00" },
      { name: "A班", time: "17:00" },
      { name: "B班", time: "01:00" },
    ],
    threeTimes: [
      { name: "A班", time: "09:00" },
      { name: "B班", time: "15:00" },
      { name: "C班", time: "21:00" },
    ],
  }[shiftMode] || [];

  const shifts = defaults.map((shift, index) => ({
    id: `shift-${index + 1}`,
    ...shift,
    description: "",
    descriptionPost: "",
    fiammetta: {
      enable: false,
      target: "",
      order: "pre",
    },
    drone: {
      target: "",
      pinned: false,
      disabled: false,
      order: "pre",
    },
  }));
  return shifts.map((shift, index) =>
    withDefaultScheduleShiftPeriod(shift, shifts, index),
  );
}

function normalizeScheduleExportInfo(value) {
  return {
    title: String(value?.title || "").trim(),
    author: String(value?.author || "").trim(),
    description: String(value?.description || "").trim(),
  };
}

function normalizeOrundumCraftMaterial(value) {
  return value === "device" ? "device" : "orirock";
}

function normalizeScheduleFiammettaSettings(value) {
  return {
    enable: value?.enable === true,
    target: String(value?.target || "").trim(),
    order: value?.order === "post" ? "post" : "pre",
  };
}

function normalizeScheduleDroneSettings(value, fallback = {}) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackValue =
    fallback && typeof fallback === "object" ? fallback : {};
  const disabled = Object.hasOwn(source, "disabled")
    ? source.disabled === true
    : fallbackValue.disabled === true;
  const target = String(
    Object.hasOwn(source, "target") ? source.target : fallbackValue.target || "",
  ).trim();
  const order = Object.hasOwn(source, "order")
    ? source.order
    : fallbackValue.order;

  return {
    target: disabled ? "" : target,
    pinned: Object.hasOwn(source, "pinned")
      ? source.pinned === true
      : fallbackValue.pinned === true,
    disabled,
    order: ["post", "retain"].includes(order) ? order : "pre",
  };
}

function normalizeFiammettaRecoverySettings(value) {
  const hasTarget =
    value &&
    typeof value === "object" &&
    Object.hasOwn(value, "target");

  return {
    target: hasTarget ? String(value.target ?? "").trim() : "但书",
    custom: value?.custom === true,
    customTarget: String(value?.customTarget || "").trim(),
  };
}

function createEmptyScheduleExecutionSettings(
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  return {
    shifts: createDefaultScheduleShifts(shiftMode, rotationMode),
    orundumCraftMaterial: "orirock",
    includeTrainingRoom: false,
    exportInfo: normalizeScheduleExportInfo(),
  };
}

function getScheduleExecutionSettingsModeKey(
  shiftMode,
  rotationMode = twoShiftRotationMode.value,
) {
  return `${String(shiftMode || "").trim()}:${
    isMaaTwoShiftRotation(shiftMode, rotationMode)
      ? "maa"
      : normalizeTwoShiftRotationMode(rotationMode)
  }`;
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
  const modeMatches =
    String(value?.modeKey || "").trim() ===
    getScheduleExecutionSettingsModeKey(shiftMode, rotationMode);
  const sourceShifts =
    modeMatches && Array.isArray(value?.shifts) ? value.shifts : [];
  const legacyTimes = modeMatches && Array.isArray(value?.changeTimes)
    ? value.changeTimes
    : [];
  const legacyDrone = normalizeScheduleDroneSettings({
    target: value?.droneTarget,
    pinned: value?.droneTargetPinned,
    disabled: value?.droneTargetDisabled,
    order: value?.droneOrder,
  });
  const persistedTimes =
    sourceShifts.length > 0
      ? sourceShifts.map((shift) => String(shift?.time || "").trim())
      : legacyTimes.map((time) => String(time || "").trim());
  const usesLegacyManualTwiceTimes =
    shiftMode === "twice" &&
    normalizeTwoShiftRotationMode(rotationMode) === "manual" &&
    persistedTimes.length === 3 &&
    ["09:00", "21:00", "09:00"].every(
      (time, index) => persistedTimes[index] === time,
    );

  const shifts = emptySettings.shifts.map((defaultShift, index) => {
      const sourceShift = sourceShifts[index] || {};
      const fallbackTime =
        legacyTimes.length > 0
          ? String(legacyTimes[index % legacyTimes.length] || "").trim()
          : "";
      const time = usesLegacyManualTwiceTimes
        ? defaultShift.time
        : String(sourceShift?.time || fallbackTime).trim();
      const name = String(sourceShift?.name || "").trim();

      const periodStart = String(sourceShift?.periodStart || "").trim();
      const periodEnd = String(sourceShift?.periodEnd || "").trim();
      return {
        id: defaultShift.id,
        name: name || defaultShift.name,
        time: /^\d{2}:\d{2}$/.test(time) ? time : defaultShift.time,
        periodStart: /^\d{2}:\d{2}$/.test(periodStart)
          ? periodStart
          : defaultShift.periodStart,
        periodEnd: /^\d{2}:\d{2}$/.test(periodEnd)
          ? periodEnd
          : defaultShift.periodEnd,
        periodCustomized:
          sourceShift?.periodCustomized === true ||
          (/^\d{2}:\d{2}$/.test(periodStart) &&
            /^\d{2}:\d{2}$/.test(periodEnd)),
        description: String(sourceShift?.description || "").trim(),
        descriptionPost: String(sourceShift?.descriptionPost || "").trim(),
        fiammetta: normalizeScheduleFiammettaSettings(
          sourceShift?.fiammetta,
        ),
        drone: normalizeScheduleDroneSettings(sourceShift?.drone, legacyDrone),
      };
    });
  const normalizedShifts = shifts.map((shift, index) =>
    shift.periodCustomized
      ? shift
      : {
          ...shift,
          ...getDefaultScheduleShiftPeriod(shifts, index),
        },
  );

  return {
    shifts: normalizedShifts,
    orundumCraftMaterial: normalizeOrundumCraftMaterial(
      value?.orundumCraftMaterial,
    ),
    includeTrainingRoom: value?.includeTrainingRoom === true,
    exportInfo: normalizeScheduleExportInfo(value?.exportInfo),
  };
}

function createScheduleExecutionSettingsSnapshot() {
  return {
    modeKey: getScheduleExecutionSettingsModeKey(
      confirmedLayoutPlan.value?.shiftMode,
      twoShiftRotationMode.value,
    ),
    shifts: scheduleExecutionSettings.shifts.map((shift) => ({
      id: shift.id,
      name: shift.name,
      time: shift.time,
      periodStart: shift.periodStart,
      periodEnd: shift.periodEnd,
      periodCustomized: shift.periodCustomized === true,
      description: shift.description,
      descriptionPost: shift.descriptionPost,
      fiammetta: normalizeScheduleFiammettaSettings(shift.fiammetta),
      drone: normalizeScheduleDroneSettings(shift.drone),
    })),
    orundumCraftMaterial: normalizeOrundumCraftMaterial(
      scheduleExecutionSettings.orundumCraftMaterial,
    ),
    includeTrainingRoom: scheduleExecutionSettings.includeTrainingRoom === true,
    exportInfo: normalizeScheduleExportInfo(scheduleExecutionSettings.exportInfo),
  };
}

function clearSchedulePreviewRoomEdits() {
  selectedSchedulePreviewRoomKey.value = "";
  scheduleRoomOperatorOverrides.value = {};
  scheduleRoomProductOverrides.value = {};
  invalidatedScheduleRoomKeys.value = {};
  scheduleRoomMaaSettingOverrides.value = {};
  scheduleRoomMaaIndexAssignments.value = {};
  copiedScheduleRoomOperators.value = null;
  copiedScheduleShiftOperators.value = null;
  scheduleRoomEditorOperatorInput.value = "";
}

function resetScheduleExecutionSettings() {
  const nextSettings = createEmptyScheduleExecutionSettings(
    confirmedLayoutPlan.value?.shiftMode,
    twoShiftRotationMode.value,
  );
  scheduleExecutionSettings.shifts = nextSettings.shifts;
  scheduleExecutionSettings.orundumCraftMaterial =
    nextSettings.orundumCraftMaterial;
  scheduleExecutionSettings.includeTrainingRoom =
    nextSettings.includeTrainingRoom;
  scheduleExecutionSettings.exportInfo = nextSettings.exportInfo;
  clearSchedulePreviewRoomEdits();
  activeSchedulePreviewStateIndex.value =
    getDefaultSchedulePreviewStateIndex();
}

const activeStep = computed(() => steps[currentStep.value]);
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
  () =>
    confirmedLayoutPlan.value?.layoutId === "252" &&
    !confirmedLayoutPlan.value?.customLayout,
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
const customLayoutEditorStations = computed(() => {
  const draft = customLayoutDraft.value;
  return draft
    ? [...(draft.stations || []), ...(draft.staticStations || [])]
    : [];
});
const customLayoutPowerSummary = computed(() =>
  summarizeRiicFacilityPower(customLayoutEditorStations.value),
);
const activeLayoutFacilityCounts = computed(() => {
  const card = getActiveLayoutCard();
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
      product: getRoomProduct(room) || "all",
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
    const sourceRoom = (card?.rooms || []).find(
      (room) => room.key === entry.roomKey,
    );
    const stations = sourceRoom
      ? getActiveRoomStations(sourceRoom)
      : getActiveStaticRoomStations({
          roomKey: entry.roomKey,
          roomCount: stationCount,
        });

    return stations
      .filter((station) => Number(station?.stationLevel || 0) > 0)
      .map((station) => ({
        facilityType: entry.facilityType,
        product: entry.product,
        stationLevel: Number(station?.stationLevel) || null,
      }));
  });

  return {
    facilities,
    powerPlantCount: countFacility("power"),
    tradingStationCount: countFacility("trading"),
    goldManufactureStationCount: (card?.rooms || []).reduce(
      (total, room) =>
        getLayoutRoomFacility(room) === "manufacture" &&
        getRoomProduct(room) === "gold"
          ? total + Number(room?.count || 0)
          : total,
      0,
    ),
    manufactureProductKindCount: new Set(
      (card?.rooms || []).flatMap((room) =>
        getLayoutRoomFacility(room) === "manufacture" &&
        getRoomProduct(room) &&
        getRoomProduct(room) !== "all"
          ? [getRoomProduct(room)]
          : [],
      ),
    ).size,
  };
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
  const card = getActiveLayoutCard();

  if (!card) {
    return [];
  }

  return (card.rooms || []).map((room) => {
    const facility = getLayoutRoomFacility(room);
    const meta =
      SCHEDULE_ROOM_GROUP_META[facility] ||
      SCHEDULE_ROOM_GROUP_META.manufacture;
    const stations = getActiveRoomStations(room);
    const candidateProduct = getRoomProduct(room) || null;

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
      candidateProduct,
      candidateGenerationAvailable: Boolean(candidateProduct),
      rotationRequired: true,
      row: "production",
      width: 1,
    };
  });
});
const scheduleRoomRows = computed(() => {
  const createStaticGroup = (group) => {
    const stations = getActiveStaticRoomStations(group).filter(
      (station) => Number(station?.stationLevel || 0) > 0,
    );
    const candidateProduct = ROOM_CANDIDATE_PRODUCTS[group.key] || null;

    return {
      ...group,
      facility: group.key,
      count: stations.length,
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
const riicTrainingMode = computed(() =>
  treatUnderleveledOperatorsAsQualified.value ? "ideal" : "current",
);
const virtualOperators = computed(() => {
  const schedulingOperators = ownedOperators.value.filter(
    (operator) =>
      !RIIC_SCHEDULING_EXCLUDED_OPERATOR_IDS.has(
        String(operator?.charId || "").trim(),
      ),
  );

  if (schedulingOperators.length === 0) {
    return null;
  }

  if (riicTrainingMode.value === "ideal") {
    return createRiicIdealTrainingRoster(
      schedulingOperators,
      RIIC_BASELINE_SKILL_RULES,
      idealTrainingRaritySelection.value,
    ).operators;
  }

  return schedulingOperators;
});
const riicLayer3RuleChecks = computed(() => {
  if (!confirmedLayoutPlan.value || !virtualOperators.value) {
    return [];
  }

  return getRiicLayer3RuleConditionChecks({
    ownedOperators: virtualOperators.value,
    layoutFacts: activeLayoutFacilityCounts.value,
  });
});
const riicLayer3MatchedRuleCount = computed(
  () => riicLayer3RuleChecks.value.filter((rule) => rule.matched).length,
);
const riicIdleFillOperators = computed(() =>
  getRiicIdleFillOperators({
    roster: virtualOperators.value || [],
    unlockAllSkills: riicTrainingMode.value === "ideal",
  }),
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
const controlCenterCandidateOperators = computed(() =>
  buildRiicControlCenterCandidateOperators({
    roster: virtualOperators.value || [],
    skills: RIIC_CONTROL_CENTER_SKILLS.skills,
    layoutFacts: activeLayoutFacilityCounts.value,
    trainingMode: riicTrainingMode.value,
    idealTrainingRaritySelection: idealTrainingRaritySelection.value,
    idleFillOperators: riicIdleFillOperators.value,
  }).map((operator) => ({
    ...operator,
    controlCenterRoomEffectLabel: (
      operator.controlCenterResolvedEffects || []
    )
      .map(formatRiicControlCenterRoomEffect)
      .filter(Boolean)
      .join(" / "),
  })),
);
const hasFiammetta = computed(() =>
  (virtualOperators.value || []).some((operator) => {
    const charId = String(operator?.charId || "").trim();
    const name = String(
      operator?.name || operatorTableV2?.[charId]?.name || "",
    ).trim();
    return name === "菲亚梅塔";
  }),
);
const fiammettaTargetOptions = computed(() => {
  return FIAMMETTA_RECOVERY_TARGET_NAMES.map((name) => ({
    charId: operatorNameToCharId.get(name) || "",
    name,
  }));
});
const fiammettaTargetName = computed(() => {
  const settings = normalizeFiammettaRecoverySettings(
    fiammettaRecoverySettings.value,
  );
  return settings.custom ? settings.customTarget : settings.target;
});
const fiammettaCustomTargetOptions = computed(() =>
  createRiicOperatorSearchEntries(
    virtualOperators.value || [],
    operatorTableV2,
  ),
);
const fiammettaTargetResolution = computed(() => {
  const settings = normalizeFiammettaRecoverySettings(
    fiammettaRecoverySettings.value,
  );
  const targetName = fiammettaTargetName.value;
  if (!targetName) {
    return {
      operator: null,
      source: "disabled",
    };
  }

  const selectedOperator = fiammettaCustomTargetOptions.value.find(
    (operator) => operator.name === targetName,
  );
  if (selectedOperator) {
    return {
      operator: selectedOperator,
      source: "selected",
    };
  }

  if (settings.custom) {
    return {
      operator: null,
      source: "missing",
    };
  }

  for (const recommendedName of FIAMMETTA_RECOVERY_TARGET_NAMES) {
    const recommendedOperator = fiammettaCustomTargetOptions.value.find(
      (operator) => operator.name === recommendedName,
    );
    if (recommendedOperator) {
      return {
        operator: recommendedOperator,
        source: "recommended",
      };
    }
  }

  const fiammettaCharId = operatorNameToCharId.get("菲亚梅塔");
  const fallbackCandidates = (riicResolvedSkills.value?.operators || [])
    .filter((operator) => operator.charId !== fiammettaCharId)
    .map((operator) => ({
      operator,
      percent: Math.max(
        0,
        ...(operator.activeRules || [])
          .filter((rule) =>
            ["trading", "manufacture"].includes(rule?.roomType),
          )
          .map((rule) => Number(rule?.effect?.percent || 0)),
      ),
    }))
    .filter((candidate) => candidate.percent > 0)
    .sort(
      (left, right) =>
        right.percent - left.percent ||
        String(left.operator?.charId || "").localeCompare(
          String(right.operator?.charId || ""),
          "en",
        ),
    );

  return {
    operator: fallbackCandidates[0]?.operator || null,
    source: fallbackCandidates.length ? "efficiencyFallback" : "missing",
  };
});
const fiammettaTargetOperator = computed(
  () => fiammettaTargetResolution.value.operator,
);
const fiammettaTargetNameForSchedule = computed(
  () => fiammettaTargetOperator.value?.name || fiammettaTargetName.value,
);
const fiammettaRecoveryConfig = computed(() => {
  const targetOperatorId = String(
    fiammettaTargetOperator.value?.charId || "",
  ).trim();
  const targetIsOwned = fiammettaCustomTargetOptions.value.some(
    (operator) => operator.charId === targetOperatorId,
  );

  return {
    enabled:
      hasFiammetta.value &&
      Boolean(targetOperatorId) &&
      targetIsOwned &&
      targetOperatorId !== operatorNameToCharId.get("菲亚梅塔"),
    targetOperatorId,
  };
});
const fiammettaRecoveryStatus = computed(() => {
  const resolution = fiammettaTargetResolution.value;
  const targetName = fiammettaTargetNameForSchedule.value;
  const targetOperatorId = String(
    fiammettaRecoveryConfig.value.targetOperatorId || "",
  ).trim();

  if (!hasFiammetta.value) {
    return {
      tone: "muted",
      text: "未拥有菲亚梅塔",
    };
  }
  if (!targetName) {
    return {
      tone: "muted",
      text: "未选择恢复目标",
    };
  }
  if (!targetOperatorId) {
    return {
      tone: "warning",
      text: "未匹配到当前干员数据，无法参与自动组装",
    };
  }
  if (targetOperatorId === operatorNameToCharId.get("菲亚梅塔")) {
    return {
      tone: "warning",
      text: "菲亚梅塔不能选择自己作为恢复目标",
    };
  }
  if (!fiammettaRecoveryConfig.value.enabled) {
    return {
      tone: "warning",
      text: "当前数据源未包含该干员，无法参与自动组装",
    };
  }
  if (resolution.source === "recommended") {
    return {
      tone: "success",
      text: `自动改用：${targetName}`,
    };
  }
  if (resolution.source === "efficiencyFallback") {
    return {
      tone: "success",
      text: `自动选择：${targetName}`,
    };
  }
  return null;
});
const controlCenterAutomaticRoleState = computed(() => {
  // Explicit automatic generation must start from a freshly evaluated L50 plan.
  void controlCenterPlanningRunId.value;

  return buildRiicControlCenterAutomaticRoleState({
    staffingRequirement: controlCenterStaffingRequirement.value,
    roomGroup: controlScheduleRoomGroup.value,
    hasRoster: Boolean(virtualOperators.value),
    candidates: controlCenterCandidateOperators.value,
    roleDefinitions: CONTROL_CENTER_FUNCTION_ROLE_DEFINITIONS,
    scenarioTrials: riicControlCenterScenarioTrialState.value?.scenarios || [],
    fiammettaRecovery: fiammettaRecoveryConfig.value,
  });
});
const controlCenterRoleState = computed(() => {
  return applyRiicControlCenterManualOverrides({
    automaticState: controlCenterAutomaticRoleState.value,
    manualOverrides: controlCenterManualOverrides.value,
    candidates: controlCenterCandidateOperators.value,
    roleDefinitions: CONTROL_CENTER_FUNCTION_ROLE_DEFINITIONS,
    scenarioTrials:
      riicControlCenterScenarioTrialState.value?.scenarios || [],
    fiammettaRecovery: fiammettaRecoveryConfig.value,
  });
});
const controlCenterFiammettaTargetUsage = computed(() => {
  const recovery = fiammettaRecoveryConfig.value;
  const stateIndexes = new Set();
  const teamIndexes = new Set();
  if (!recovery.enabled) {
    return {
      selectionCount: 0,
      stateIndexes: [],
    };
  }

  for (const segment of controlCenterRoleState.value.segments || []) {
    if (!(segment?.operatorIds || []).includes(recovery.targetOperatorId)) {
      continue;
    }

    const stateIndex = Number(segment?.index);
    if (Number.isInteger(stateIndex) && stateIndex >= 0) {
      stateIndexes.add(stateIndex);
    }

    const teamIndex = Number(segment?.teamIndex);
    if (Number.isInteger(teamIndex) && teamIndex >= 0) {
      teamIndexes.add(teamIndex);
    }
  }

  return {
    selectionCount: teamIndexes.size,
    stateIndexes: [...stateIndexes].sort((left, right) => left - right),
  };
});

function clearScheduleSelectionsAfterControlCenterChange() {
  clearSelectedRoomGroupTeamCandidates({
    preserveExecutionSettings: true,
  });
  lastAutomaticGenerationTriggerKey.value = "";
}

function saveControlCenterAdjustment({
  manualOverrides,
  lateFillExcludedOperatorIdsByTeamIndex,
} = {}) {
  controlCenterManualOverrides.value = normalizeControlCenterManualOverrides(
    manualOverrides,
  );
  controlCenterLateFillExcludedOperatorIdsByTeamIndex.value =
    normalizeOperatorIdsByTeamIndex(lateFillExcludedOperatorIdsByTeamIndex);
  controlCenterPlanningRunId.value += 1;
  clearScheduleSelectionsAfterControlCenterChange();
  lastAutomaticGenerationTriggerKey.value =
    automaticGenerationTriggerKey.value;
  cMessage("中枢调整已保存，正在重新生成排班", "success");
  void generateAutomaticSchedule({ silentSuccess: true });
}

const controlCenterSelectedOperatorIds = computed(
  () => new Set(controlCenterRoleState.value.operatorIds),
);
const controlCenterRuntimeContext = computed(() =>
  buildRiicControlCenterRuntimeContext({
    controlState: controlCenterRoleState.value,
  }),
);
const riicPerceptionResourceFacts = computed(() => {
  const facilities = activeLayoutFacilityCounts.value?.facilities || [];

  return {
    officeExtraRecruitmentSlots: facilities.some(
      (facility) => facility?.facilityType === "hire",
    )
      ? 3
      : 0,
    duskMoodAbove12: true,
    lingMoodAbove12: true,
  };
});
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
  if (!virtualOperators.value) {
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
    virtualOperators.value
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
    virtualOperators.value || [],
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

const roomGroupCandidateStates = computed(() =>
  Object.fromEntries(
    selectableScheduleRoomGroups.value.map((group) => [
      group.id,
      createRiicRoomGroupCandidateState({
        group,
        roster: virtualOperators.value,
        currentOwnedOperators: ownedOperators.value,
        shiftMode: confirmedLayoutPlan.value?.shiftMode,
        twoShiftRotationMode: twoShiftRotationMode.value,
        catalogsByKey: riicStaticCatalogsByKey.value,
        catalogLoadStatesByKey: riicStaticCatalogLoadStatesByKey.value,
        catalogErrorsByKey: riicStaticCatalogErrorsByKey.value,
        loadingCatalogKeys: riicStaticCatalogLoadingPromisesByKey,
        operatorNameToCharId,
        publicSkillOperatorIds: riicPublicSkillOperatorIds.value,
        layoutFacts: activeLayoutFacilityCounts.value,
        trainingMode: riicTrainingMode.value,
        idealTrainingRaritySelection: idealTrainingRaritySelection.value,
        controlCenterRuntimeContext: controlCenterRuntimeContext.value,
        idleFillOperators: riicIdleFillOperators.value,
      }),
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
  if (!virtualOperators.value) {
    return {
      status: "requiresOperators",
      scenarios: [],
    };
  }

  return {
    status: "ready",
    scenarios: evaluateRiicControlCenterScenarios({
      skills: RIIC_CONTROL_CENTER_SKILLS.skills,
      ownedOperators: virtualOperators.value,
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
  if (!virtualOperators.value) {
    return {
      status: "requiresOperators",
      scenarios: [],
    };
  }

  return evaluateRiicPerceptionResourceTrials({
    ownedOperators: virtualOperators.value,
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

function getDisplayedRoomGroupTeamCandidate(
  group,
  cohort,
  candidate,
  selectionIndex,
) {
  const fallbackPlan = roomGroupFallbackPlanStates.value[group?.id];
  const fallbackOperators =
    fallbackPlan?.assignmentsBySelectionKey?.[
      `${cohort?.id}:${selectionIndex}`
    ];

  if (!candidate || !Array.isArray(fallbackOperators)) {
    return candidate;
  }

  const materializedCandidate = materializeRiicRoomTeamCandidate(
    candidate,
    fallbackOperators,
    {
      controlCenterRuntimeContext: controlCenterRuntimeContext.value,
    },
  );
  if (!materializedCandidate) {
    return candidate;
  }

  return {
    ...materializedCandidate,
    // Candidate selection continues to use only the fixed core members.
    operatorIds: candidate.operatorIds,
    operators: candidate.operators,
  };
}

const visibleActiveRoomGroupStaffingCohorts = computed(() => {
  const group = activeScheduleRoomGroup.value;

  return activeRoomGroupStaffingCohorts.value.map((cohort) => {
    const selectedCandidateKeys = getSelectedTeamCandidateKeys(
      group?.id,
      cohort,
    );
    const selectedCandidateKeySet = new Set(selectedCandidateKeys);
    const candidateByKey = new Map(
      (cohort.candidates || []).map((candidate) => [
        candidate.key,
        candidate,
      ]),
    );
    const fallbackCandidate = cohort.fallbackCandidate || null;
    const selectedCandidates = selectedCandidateKeys
      .map((candidateKey, selectionIndex) => {
        const candidate = candidateByKey.get(candidateKey);
        return candidate
          ? {
              ...getDisplayedRoomGroupTeamCandidate(
                group,
                cohort,
                candidate,
                selectionIndex,
              ),
              selectionIndex,
            }
          : null;
      })
      .filter(Boolean);
    const selectionComplete =
      selectedCandidates.length >= Number(cohort.teamCount || 0);
    const selectableNamedCandidates = cohort.candidates.filter(
      (candidate) =>
        (candidate.operatorIds || []).length > 0 &&
        !selectedCandidateKeySet.has(candidate.key) &&
        canToggleRoomGroupTeamCandidate(group, cohort, candidate),
    );
    const selectableFallbackCandidates = cohort.candidates.filter(
      (candidate) =>
        candidate.isManualFallbackTeam &&
        !selectedCandidateKeySet.has(candidate.key),
    );
    const repeatableTeamCandidates = selectedCandidates
      .filter(
        (candidate, index, candidates) =>
          candidates.findIndex((item) => item.key === candidate.key) ===
            index &&
          isFiammettaReusableTeamCandidate(candidate) &&
          getSelectedRoomCandidateCount(group, cohort, candidate.key) <
            Number(cohort.teamCount || 0) &&
          canAddRoomGroupTeamCandidate(group, cohort, candidate),
      )
      .map((candidate) => ({
        ...candidate,
        repeatableTeam: true,
        selectionIndex: selectedCandidates.length,
      }));
    const fallbackCandidateCount = cohort.teamCount;
    const selectableCandidates = [
      ...selectedCandidates,
      ...repeatableTeamCandidates,
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
          ...repeatableTeamCandidates,
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

function getActiveFiammettaRecovery() {
  return fiammettaRecoveryConfig.value;
}

function isFiammettaReusableTeamCandidate(candidate) {
  const recovery = getActiveFiammettaRecovery();

  return (
    recovery.enabled &&
    (candidate?.operatorIds || []).includes(recovery.targetOperatorId)
  );
}

function getSelectedFiammettaTargetStateIndexes(recovery) {
  const stateIndexes = new Set();
  if (!recovery?.enabled) {
    return stateIndexes;
  }

  for (const stateIndex of controlCenterFiammettaTargetUsage.value
    .stateIndexes || []) {
    stateIndexes.add(stateIndex);
  }

  for (const group of candidateEnabledScheduleRoomGroups.value) {
    const state = roomGroupCandidateStates.value[group.id];
    for (const stateIndex of getSelectedRoomGroupFiammettaStateIndexes(
      group,
      state,
      recovery,
    )) {
      stateIndexes.add(stateIndex);
    }
  }

  return stateIndexes;
}

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

        if (
          selectedKeys.includes(candidate.key) &&
          !isFiammettaReusableTeamCandidate(candidate)
        ) {
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
    savedKeys
      .map((key) => String(key || "").trim())
      .filter(Boolean).length,
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

function getSelectedRoomGroupFiammettaStateIndexes(
  group,
  state,
  recovery,
) {
  const stateIndexes = new Set();
  if (!recovery?.enabled) {
    return stateIndexes;
  }

  for (const cohort of state?.cohorts || []) {
    for (const [teamIndex, candidateKey] of getSelectedTeamCandidateKeys(
      group.id,
      cohort,
    ).entries()) {
      const candidate = cohort.candidates.find(
        (item) => item.key === candidateKey,
      );
      if (
        !(candidate?.operatorIds || []).includes(
          recovery.targetOperatorId,
        )
      ) {
        continue;
      }

      for (const stateIndex of getRiicFiammettaTeamStateIndexes(
        cohort,
        teamIndex,
      )) {
        stateIndexes.add(stateIndex);
      }
    }
  }

  return stateIndexes;
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

  const selectedCount = getSelectedRoomCandidateCount(
    group,
    cohort,
    candidate.key,
  );
  const recovery = getActiveFiammettaRecovery();
  const reusableTargetCandidate =
    recovery.enabled &&
    (candidate.operatorIds || []).includes(recovery.targetOperatorId);

  if (selectedCount > 0 && !reusableTargetCandidate) {
    return false;
  }

  const candidateOperatorIds = candidate.operatorIds || [];
  if (candidateOperatorIds.length === 0) {
    return true;
  }

  if (reusableTargetCandidate) {
    const nextStateIndexes = getRiicFiammettaTeamStateIndexes(
      cohort,
      getSelectedTeamCandidateCount(group, cohort),
    );
    const usedStateIndexes = getSelectedFiammettaTargetStateIndexes(recovery);
    if (
      nextStateIndexes.length === 0 ||
      nextStateIndexes.some((stateIndex) => usedStateIndexes.has(stateIndex))
    ) {
      return false;
    }
  }

  const claimedOperatorIds = getClaimedNamedOperatorIds();
  return !candidateOperatorIds.some(
    (charId) =>
      charId !== recovery.targetOperatorId && claimedOperatorIds.has(charId),
  );
}

function canToggleRoomGroupTeamCandidate(group, cohort, candidate) {
  if (candidate?.repeatableTeam) {
    return canAddRoomGroupTeamCandidate(group, cohort, candidate);
  }

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

  const canAddAnotherTeam =
    candidate?.repeatableTeam &&
    selectedCount > 0 &&
    isFiammettaReusableTeamCandidate(candidate) &&
    canAddRoomGroupTeamCandidate(group, cohort, candidate);

  if (selectedCount > 0 && !canAddAnotherTeam) {
    const removeIndex = selectedKeys.lastIndexOf(candidate.key);
    selectedRoomGroupTeamCandidateKeys.value = {
      ...selectedRoomGroupTeamCandidateKeys.value,
      [group.id]: {
        ...currentGroupSelections,
        [cohort.id]: selectedKeys.filter((_, index) => index !== removeIndex),
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

function createAutomaticRoomGroupFallbackQueueStates({
  selections,
  fallbackOperatorIdBySlotKeyByGroup,
}) {
  return Object.fromEntries(
    candidateEnabledScheduleRoomGroups.value.flatMap((group) => {
      const state = roomGroupCandidateStates.value[group.id];
      const selected = getRoomGroupCandidateEntriesForKeys(
        group,
        state,
        selections?.[group.id],
      );
      const operatorIdBySlotKey =
        fallbackOperatorIdBySlotKeyByGroup?.[group.id] || {};
      if (
        !selected ||
        Object.keys(operatorIdBySlotKey).length === 0
      ) {
        return [];
      }

      return [
        [
          group.id,
          {
            signature: getRoomGroupFallbackQueueSignature(
              selected.selectedEntries,
            ),
            operatorIdBySlotKey,
          },
        ],
      ];
    }),
  );
}

function cloneRiicAutomaticScheduleWorkerInput(value) {
  return JSON.parse(JSON.stringify(toRaw(value)));
}

function createRiicAutomaticScheduleWorkerInput(searchConfig) {
  const fiammettaRecovery = {
    ...fiammettaRecoveryConfig.value,
    usedStateIndexes:
      controlCenterFiammettaTargetUsage.value.stateIndexes,
  };

  return cloneRiicAutomaticScheduleWorkerInput({
    groups: candidateEnabledScheduleRoomGroups.value,
    candidateStatesByGroupId: roomGroupCandidateStates.value,
    controlCenterOperatorIds: [...controlCenterSelectedOperatorIds.value],
    controlCenterState: controlCenterRoleState.value,
    controlCenterRuntimeContext: controlCenterRuntimeContext.value,
    layoutFacts: activeLayoutFacilityCounts.value,
    selectionBeamLimit: searchConfig.selectionBeamLimit,
    selectionOptionLimit: searchConfig.selectionOptionLimit,
    selectionRepresentativeLimit: searchConfig.selectionRepresentativeLimit,
    selectionBatchSize: searchConfig.selectionBatchSize,
    fallbackPlanLimit: searchConfig.fallbackPlanLimit,
    ownedOperators: virtualOperators.value,
    controlCenterSegments: controlCenterRoleState.value.segments,
    manualControlCenterOperatorIdsByTeamIndex:
      controlCenterManualOverrides.value.addedOperatorIdsByTeamIndex,
    controlCenterLateFillExcludedOperatorIdsByTeamIndex:
      controlCenterLateFillExcludedOperatorIdsByTeamIndex.value,
    fiammettaRecovery,
    idleFillOperators: riicIdleFillOperators.value,
    fiammettaControlUsage: controlCenterFiammettaTargetUsage.value,
    collectPlanningDebug: showCandidateDebugValues.value,
  });
}

function getOperatorSkillTooltip(operator) {
  const charId = String(operator?.charId || "").trim();
  const rosterOperator =
    (virtualOperators.value || []).find(
      (item) => String(item?.charId || "").trim() === charId,
    ) ||
    (ownedOperators.value || []).find(
      (item) => String(item?.charId || "").trim() === charId,
    );

  return getRiicOperatorSkillTooltip(operator, rosterOperator);
}

function getRiicSchedulingOperators() {
  return (ownedOperators.value || []).filter(
    (operator) =>
      !RIIC_SCHEDULING_EXCLUDED_OPERATOR_IDS.has(
        String(operator?.charId || "").trim(),
      ),
  );
}

function createRiicTrainingRecommendationWorkerInput(searchConfig) {
  const catalogsByKey = Object.fromEntries(
    [
      ...new Set(
        candidateEnabledScheduleRoomGroups.value.flatMap((group) =>
          getRoomGroupCatalogRequests(group)
            .map((request) => request.key)
            .filter(Boolean),
        ),
      ),
    ].flatMap((key) =>
      riicStaticCatalogsByKey.value[key]
        ? [[key, riicStaticCatalogsByKey.value[key]]]
        : [],
    ),
  );

  return cloneRiicAutomaticScheduleWorkerInput({
    groups: candidateEnabledScheduleRoomGroups.value,
    catalogsByKey,
    schedulingOperators: getRiicSchedulingOperators(),
    currentOwnedOperators: ownedOperators.value,
    shiftMode: confirmedLayoutPlan.value?.shiftMode,
    twoShiftRotationMode: twoShiftRotationMode.value,
    operatorNameToCharId: Object.fromEntries(operatorNameToCharId),
    layoutFacts: activeLayoutFacilityCounts.value,
    idealTrainingRaritySelection: idealTrainingRaritySelection.value,
    controlRoomGroup: controlScheduleRoomGroup.value,
    controlCenterStaffingRequirement: controlCenterStaffingRequirement.value,
    controlCenterRoleDefinitions: CONTROL_CENTER_FUNCTION_ROLE_DEFINITIONS,
    manualControlCenterOverrides: controlCenterManualOverrides.value,
    manualControlCenterOperatorIdsByTeamIndex:
      controlCenterManualOverrides.value.addedOperatorIdsByTeamIndex,
    controlCenterLateFillExcludedOperatorIdsByTeamIndex:
      controlCenterLateFillExcludedOperatorIdsByTeamIndex.value,
    fiammettaRecovery: fiammettaRecoveryConfig.value,
    selectionBeamLimit: searchConfig.selectionBeamLimit,
    selectionOptionLimit: searchConfig.selectionOptionLimit,
    selectionRepresentativeLimit: searchConfig.selectionRepresentativeLimit,
    selectionBatchSize: searchConfig.selectionBatchSize,
    fallbackPlanLimit: searchConfig.fallbackPlanLimit,
  });
}

function cancelTrainingRecommendation() {
  trainingRecommendationRequestId += 1;
  trainingRecommendationAbortController?.abort();
  trainingRecommendationAbortController = null;
  trainingRecommendationState.value = {
    status: "idle",
    phase: "",
    requirements: [],
  };
}

function isAutomaticGenerationResultReady() {
  const groupsWithCandidates = candidateEnabledScheduleRoomGroups.value.filter(
    (group) =>
      (roomGroupCandidateStates.value[group.id]?.cohorts || []).some(
        (cohort) => (cohort.candidates || []).length > 0,
      ),
  );
  if (groupsWithCandidates.length === 0) {
    return false;
  }

  return groupsWithCandidates.every((group) => {
    const state = roomGroupCandidateStates.value[group.id];
    return (
      state?.status === "ready" &&
      getRoomGroupSelectionProgress(group).complete
    );
  });
}

async function generateTrainingRecommendation(searchConfig) {
  if (
    riicTrainingMode.value === "ideal" ||
    !confirmedLayoutPlan.value ||
    !virtualOperators.value
  ) {
    trainingRecommendationState.value = {
      status: "idle",
      phase: "",
      requirements: [],
    };
    return;
  }

  const requestId = ++trainingRecommendationRequestId;
  trainingRecommendationAbortController?.abort();
  const abortController = new AbortController();
  trainingRecommendationAbortController = abortController;
  trainingRecommendationState.value = {
    status: "running",
    phase: "正在准备培养建议",
    requirements: [],
  };

  try {
    trainingRecommendationState.value = {
      status: "running",
      phase: "正在后台分析候选干员",
      requirements: [],
    };
    const result = await runRiicTrainingRecommendationInWorker({
      input: createRiicTrainingRecommendationWorkerInput(searchConfig),
      signal: abortController.signal,
      onProgress: (phase) => {
        if (
          abortController.signal.aborted ||
          requestId !== trainingRecommendationRequestId
        ) {
          return;
        }

        trainingRecommendationState.value = {
          status: "running",
          phase,
          requirements: [],
        };
      },
    });
    if (
      abortController.signal.aborted ||
      requestId !== trainingRecommendationRequestId
    ) {
      return;
    }

    trainingRecommendationState.value = {
      status:
        result?.status === "ready"
          ? "ready"
          : result?.status || "unavailable",
      phase: result?.status === "ready" ? "正在整理培养建议" : "",
      requirements:
        result?.status === "ready" && Array.isArray(result?.requirements)
          ? result.requirements
          : [],
    };
  } catch (error) {
    if (!isRiicAutomaticScheduleAbortError(error)) {
      console.warn("RIIC training recommendation trial failed", error);
    }
    if (
      !abortController.signal.aborted &&
      requestId === trainingRecommendationRequestId
    ) {
      trainingRecommendationState.value = {
        status: "error",
        phase: "",
        requirements: [],
      };
    }
  } finally {
    if (trainingRecommendationAbortController === abortController) {
      trainingRecommendationAbortController = null;
    }
  }
}

function generateRestoredTrainingRecommendationIfReady() {
  if (
    !restoredWizardTrainingRecommendationPending ||
    assembledScheduleCandidateState.value.status !== "ready" ||
    riicTrainingMode.value === "ideal"
  ) {
    return;
  }

  restoredWizardTrainingRecommendationPending = false;
  void generateTrainingRecommendation(RIIC_AUTOMATIC_SEARCH_CONFIGS.fast);
}

function getRandomAutomaticGenerationNoticeOperators() {
  const operatorsById = new Map(
    (virtualOperators.value || []).flatMap((operator) => {
      const charId = String(operator?.charId || "").trim();
      return charId && operatorTableV2?.[charId]
        ? [[charId, { charId }]]
        : [];
    }),
  );
  const operators = [...operatorsById.values()];

  for (let index = operators.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [operators[index], operators[randomIndex]] = [
      operators[randomIndex],
      operators[index],
    ];
  }

  if (operators.length === 0) {
    return [];
  }

  return Array.from(
    { length: 12 },
    (_, index) => operators[index % operators.length],
  );
}

const automaticGenerationWorkflow = createRiicScheduleGenerationWorkflow({
  loadCatalogs: async ({ signal }) => {
    await waitForAutomaticScheduleStage(
      Promise.all(
        candidateEnabledScheduleRoomGroups.value.map((group) =>
          ensureRoomGroupCatalogLoaded(group),
        ),
      ),
      signal,
    );
    const failedCatalogs = candidateEnabledScheduleRoomGroups.value.flatMap(
      (group) =>
        getRoomGroupCatalogRequests(group)
          .map((request) => request.key)
          .filter(
            (key) => riicStaticCatalogLoadStatesByKey.value[key] === "failed",
          )
          .map(
            (key) =>
              `${group.label || group.id}: ${
                riicStaticCatalogErrorsByKey.value[key] || key
              }`,
          ),
    );
    if (failedCatalogs.length > 0) {
      throw new Error(`候选目录加载失败：${failedCatalogs.join("；")}`);
    }
    await nextTick();
    await waitForAutomaticScheduleStage(
      new Promise((resolve) => requestAnimationFrame(resolve)),
      signal,
    );
  },
  buildWorkerInput: (strategy) =>
    createRiicAutomaticScheduleWorkerInput(
      RIIC_AUTOMATIC_SEARCH_CONFIGS[strategy] ||
        RIIC_AUTOMATIC_SEARCH_CONFIGS.fast,
    ),
  runWorker: ({ input, signal, onProgress }) =>
    runRiicAutomaticScheduleInWorker({
      input,
      signal,
      onProgress,
    }),
  applyResult: (result) => result,
  getProgressLabel: (phase) => {
    if (phase === "catalogs") {
      return "正在载入候选班组";
    }
    if (phase === "worker") {
      return "正在分析候选与补位";
    }
    if (phase === "apply") {
      return "正在组装排班结果";
    }
    return automaticGenerationProgressLabels[phase] || phase;
  },
  onPhase: (phase, label) => {
    automaticGenerationPhase.value = showCandidateDebugValues.value
      ? `${label} · ${phase}`
      : label;
  },
});

async function generateAutomaticSchedule({
  silentSuccess = false,
  strategy = "fast",
} = {}) {
  const requestId = ++automaticGenerationRequestId;
  if (autoGeneratingSchedule.value) {
    automaticGenerationQueuedOptions = { silentSuccess, strategy };
    automaticGenerationAbortController?.abort();
    return;
  }

  if (!confirmedLayoutPlan.value) {
    cMessage("请先选择布局", "warn");
    return;
  }

  if (!virtualOperators.value) {
    cMessage("请先同步干员数据", "warn");
    return;
  }

  controlCenterPlanningRunId.value += 1;
  resetTrainingImpactState();
  automaticControlCenterReconciliationState.value = null;
  cancelTrainingRecommendation();
  await nextTick();

  const generationTriggerKey = automaticGenerationTriggerKey.value;
  const searchConfig =
    RIIC_AUTOMATIC_SEARCH_CONFIGS[strategy] ||
    RIIC_AUTOMATIC_SEARCH_CONFIGS.fast;
  const abortController = new AbortController();
  automaticGenerationAbortController = abortController;
  autoGeneratingSchedule.value = true;
  automaticGenerationPhase.value = "正在载入候选班组";
  automaticGenerationNoticeOperators.value =
    getRandomAutomaticGenerationNoticeOperators();
  try {
    const workerResult = await automaticGenerationWorkflow.run({
      strategy,
      signal: abortController.signal,
    });
    if (
      abortController.signal.aborted ||
      requestId !== automaticGenerationRequestId
    ) {
      return;
    }

    automaticGenerationPhase.value = "正在组装排班结果";
    if (!workerResult || typeof workerResult !== "object") {
      throw new Error("后台排班没有返回结果");
    }
    const {
      automaticSelection,
      controlCenterReconciliation,
      tailFillResult,
      resourceSuiteResult,
    } = workerResult;
    if (!automaticSelection || !tailFillResult) {
      throw new Error("后台排班结果缺少选人或补位结果");
    }
    if (!resourceSuiteResult?.tailFillResult) {
      throw new Error("后台排班结果缺少资源组合结果");
    }
    automaticGenerationPhase.value = "正在整理最终排班";
    const {
      selections,
      fallbackOperatorIdBySlotKeyByGroup,
    } = resourceSuiteResult.tailFillResult;
    riicAutomaticGenerationDebugState.value = {
      strategy,
      l70: automaticSelection.debug || null,
      l71: tailFillResult,
      l72: resourceSuiteResult.debug,
      l73: controlCenterReconciliation || null,
    };
    automaticControlCenterReconciliationState.value =
      controlCenterReconciliation?.status === "ready"
        ? controlCenterReconciliation.controlState
        : null;
    if (automaticSelection.unavailableGroups.length > 0) {
      cMessage(
        `无法自动填满：${automaticSelection.unavailableGroups.join("、")}`,
        "warn",
      );
    }

    const fallbackQueueStates = createAutomaticRoomGroupFallbackQueueStates({
      selections,
      fallbackOperatorIdBySlotKeyByGroup,
    });

    selectedRoomGroupTeamCandidateKeys.value = selections;
    roomGroupFallbackQueueStates.value = fallbackQueueStates;
    resetScheduleExecutionSettings();
    activeScheduleRoomGroupKey.value =
      controlScheduleRoomGroup.value?.id ||
      candidateEnabledScheduleRoomGroups.value[0]?.id ||
      "";
    await nextTick();
    syncFiammettaRecoveryUsage(
      fiammettaTargetName.value,
      fiammettaRecoveryConfig.value,
      assembledFiammettaTargetUsage.value,
    );
    lastAutomaticGenerationTriggerKey.value = generationTriggerKey;
    if (!silentSuccess) {
      cMessage("已自动生成排班表", "success");
    }
    void generateTrainingRecommendation(searchConfig);
  } catch (error) {
    if (isRiicAutomaticScheduleAbortError(error)) {
      return;
    }

    console.error("RIIC automatic schedule generation failed", error);
    const message = String(error?.message || "").trim();
    cMessage(
      message ? `自动生成失败：${message}` : "自动生成失败，请稍后重试",
      "error",
    );
  } finally {
    clearAutomaticScheduleRunState(abortController);
    if (automaticGenerationQueuedOptions) {
      const queuedOptions = automaticGenerationQueuedOptions;
      automaticGenerationQueuedOptions = null;
      if (automaticGenerationTriggerKey.value) {
        void generateAutomaticSchedule(queuedOptions);
      }
    }
  }
}

function regenerateSchedule() {
  resetGeneratedScheduleState({
    suppressCurrentAutomaticGeneration: true,
  });
  void generateAutomaticSchedule();
}

function requestTrainingImpactCalculation() {
  const baseline = riicL79InputDebugState.value;
  if (!baseline?.schedule || !scheduleTrainingRequirements.value.length) {
    trainingImpactState.value = { status: "error", results: [] };
    return;
  }

  trainingImpactAbortController?.abort();
  const abortController = new AbortController();
  trainingImpactAbortController = abortController;
  const requestId = ++trainingImpactRequestId;
  trainingImpactState.value = { status: "running", results: [] };

  const input = cloneRiicAutomaticScheduleWorkerInput({
    ...createRiicTrainingRecommendationWorkerInput({
      selectionBeamLimit: 0,
      selectionOptionLimit: 0,
      selectionRepresentativeLimit: 0,
      selectionBatchSize: 0,
      fallbackPlanLimit: 0,
    }),
    requirements: scheduleTrainingRequirements.value,
    baselineSchedule: baseline.schedule,
    baselineOperatorProfiles: riicL79OperatorProfiles.value,
    droneTargetKeysByState: scheduleDroneSettlementSettingsByState.value.map(
      (setting) => setting.targetKey,
    ),
    droneOrdersByState: scheduleDroneSettlementSettingsByState.value.map(
      (setting) => setting.order,
    ),
    orundumCraftMaterial: scheduleExecutionSettings.orundumCraftMaterial,
    staticRooms: schedulePreviewStaticRooms.value,
    stateOrder: getSchedulePreviewStateOrder(
      confirmedLayoutPlan.value?.shiftMode,
      twoShiftRotationMode.value,
    ),
    shifts: schedulePreviewShifts.value,
    roomOperatorOverrides: scheduleRoomOperatorOverrides.value,
    productOverrides: scheduleRoomProductOverrides.value,
    invalidatedRoomKeys: invalidatedScheduleRoomKeys.value,
    stickyOperatorIds: [
      operatorNameToCharId.get("但书"),
      operatorNameToCharId.get("龙舌兰"),
    ].filter(Boolean),
    roomSettingOverrides: scheduleRoomMaaSettingOverrides.value,
    roomIndexAssignments: resolvedScheduleRoomMaaIndexAssignments.value,
    hasFiammetta: schedulePreviewShifts.value.some(
      (shift) => shift?.fiammetta?.enable === true,
    ),
  });

  void runRiicTrainingImpactInWorker({ input, signal: abortController.signal })
    .then((results) => {
      if (abortController.signal.aborted || requestId !== trainingImpactRequestId) {
        return;
      }
      trainingImpactState.value = {
        status: "ready",
        results: Array.isArray(results) ? results : [],
      };
    })
    .catch((error) => {
      if (!abortController.signal.aborted && requestId === trainingImpactRequestId) {
        console.warn("RIIC training impact trial failed", error);
        trainingImpactState.value = { status: "error", results: [] };
      }
    })
    .finally(() => {
      if (trainingImpactAbortController === abortController) {
        trainingImpactAbortController = null;
      }
    });
}

function createAutomaticScheduleAbortError() {
  const error = new Error("自动排班已取消");
  error.name = "AbortError";
  return error;
}

function waitForAutomaticScheduleStage(promise, signal) {
  if (!signal) {
    return Promise.resolve(promise);
  }
  if (signal.aborted) {
    return Promise.reject(createAutomaticScheduleAbortError());
  }

  return new Promise((resolve, reject) => {
    const settle = (callback, value) => {
      signal.removeEventListener("abort", abort);
      callback(value);
    };
    const abort = () => settle(reject, createAutomaticScheduleAbortError());

    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (value) => settle(resolve, value),
      (error) => settle(reject, error),
    );
  });
}

function cancelAutomaticSchedule() {
  automaticGenerationQueuedOptions = null;
  automaticGenerationRequestId += 1;
  const abortController = automaticGenerationAbortController;
  clearAutomaticScheduleRunState(abortController);
  abortController?.abort();
}

function clearAutomaticScheduleRunState(abortController = null) {
  if (
    abortController &&
    automaticGenerationAbortController !== abortController
  ) {
    return false;
  }

  automaticGenerationAbortController = null;
  autoGeneratingSchedule.value = false;
  automaticGenerationPhase.value = "";
  automaticGenerationNoticeOperators.value = [];
  return true;
}

function openDeepScheduleConfirmation() {
  deepScheduleConfirmationOpen.value = true;
}

function confirmDeepSchedule() {
  deepScheduleConfirmationOpen.value = false;
  void generateAutomaticSchedule({ strategy: "deep" });
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
    !virtualOperators.value
  ) {
    return "";
  }

  const rosterSignature = (virtualOperators.value || [])
    .map((operator) => JSON.stringify(operator))
    .sort()
    .join("|");

  return [
    RIIC_AUTOMATIC_SELECTION_STRATEGY_VERSION,
    confirmedLayoutPlan.value.cardKey,
    confirmedLayoutPlan.value.shiftMode,
    confirmedLayoutPlan.value.facilityRequirement || "",
    JSON.stringify(confirmedLayoutPlan.value.customLayout || null),
    twoShiftRotationMode.value,
    treatUnderleveledOperatorsAsQualified.value ? "ideal" : "current",
    JSON.stringify(idealTrainingRaritySelection.value),
    controlCenterAssignmentSignature.value,
    JSON.stringify(
      controlCenterLateFillExcludedOperatorIdsByTeamIndex.value,
    ),
    JSON.stringify(fiammettaRecoverySettings.value),
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
      triggerKey === previousTriggerKey ||
      operatorSourceSwitching.value
    ) {
      return;
    }

    if (!triggerKey) {
      automaticGenerationQueuedOptions = null;
      automaticGenerationRequestId += 1;
      automaticGenerationAbortController?.abort();
      cancelTrainingRecommendation();
      return;
    }

    if (
      lastAutomaticGenerationTriggerKey.value === triggerKey &&
      isAutomaticGenerationResultReady()
    ) {
      return;
    }

    if (lastAutomaticGenerationTriggerKey.value === triggerKey) {
      lastAutomaticGenerationTriggerKey.value = "";
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
    lastAutomaticGenerationTriggerKey.value ===
      automaticGenerationTriggerKey.value &&
    isAutomaticGenerationResultReady()
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
const orderedSchedulePreviewStateIndexes = computed(() =>
  (riicSchedulePreview.value?.states || [])
    .map((_, index) => index)
    .sort((left, right) =>
      String(schedulePreviewShifts.value[left]?.name || "").localeCompare(
        String(schedulePreviewShifts.value[right]?.name || ""),
        "zh-CN",
      ),
    ),
);
const activeSchedulePreviewDrone = computed(() =>
  normalizeScheduleDroneSettings(
    scheduleExecutionSettings.shifts[activeSchedulePreviewStateIndex.value]
      ?.drone,
  ),
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
        cohort,
        teamIndex,
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
                return createRiicEmptyRoomTeamCandidate({
                  key: selectionKeys[index],
                  roomType: group.facility,
                  slotCount: cohort.slotCount,
                });
              }

              return materializeRiicRoomTeamCandidate(
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
              ? mergeRiicIndividualRoomTeamCandidates(materializedCandidates)
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
  const recovery = fiammettaRecoveryConfig.value;
  const planningGroups = getRiicAutomaticRoomGroupPlanningOrder(
    candidateEnabledScheduleRoomGroups.value,
  );
  const fiammettaTargetStateIndexes = new Set(
    controlCenterFiammettaTargetUsage.value.stateIndexes,
  );
  for (const group of planningGroups) {
    const state = roomGroupCandidateStates.value[group.id];
    for (const stateIndex of getSelectedRoomGroupFiammettaStateIndexes(
      group,
      state,
      recovery,
    )) {
      fiammettaTargetStateIndexes.add(stateIndex);
    }
  }
  const occupiedOperatorIds = new Set(
    [
      ...(
        automaticControlCenterReconciliationState.value?.operatorIds ||
        controlCenterSelectedOperatorIds.value
      ),
    ].filter(
      (charId) => charId !== recovery.targetOperatorId,
    ),
  );
  const plans = {};
  const selectedCoreOperatorIds = new Set(
    planningGroups.flatMap((group) => [
      ...[...getSelectedRoomGroupCoreOperatorIds(
        group,
        roomGroupCandidateStates.value[group.id],
      )].filter((charId) => charId !== recovery.targetOperatorId),
    ]),
  );

  for (const group of planningGroups) {
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
    ].filter((charId) => charId !== recovery.targetOperatorId));
    const fallbackQueueSignature = getRoomGroupFallbackQueueSignature(
      selected.selectedEntries,
    );
    const savedQueue = roomGroupFallbackQueueStates.value[group.id];
    const hasManualFallbackQueue =
      savedQueue?.signature === fallbackQueueSignature;
    const selectedEntries = withRiicIdleFillOperators(
      selected.selectedEntries,
      riicIdleFillOperators.value,
    );
    const automaticPlan = createRiicRoomGroupFallbackPlan({
      selectedEntries,
      occupiedOperatorIds: occupiedIds,
      excludedOperatorIds: coreOperatorIds,
      ownedOperators: virtualOperators.value,
      activeOperatorIds: occupiedIds,
      fiammettaRecovery: {
        ...recovery,
        usedStateIndexes: [...fiammettaTargetStateIndexes],
        stateIndexesBySelectionKey: Object.fromEntries(
          selected.selectedEntries.map((entry) => [
            entry.selectionKey,
            getRiicFiammettaTeamStateIndexes(
              entry.cohort,
              entry.teamIndex,
            ),
          ]),
        ),
      },
    });
    const plan = hasManualFallbackQueue
      ? createRiicRoomGroupFallbackPlan({
          selectedEntries,
          occupiedOperatorIds: occupiedIds,
          excludedOperatorIds: coreOperatorIds,
          ownedOperators: virtualOperators.value,
          activeOperatorIds: occupiedIds,
          fiammettaRecovery: {
            ...recovery,
            usedStateIndexes: [...fiammettaTargetStateIndexes],
            stateIndexesBySelectionKey: Object.fromEntries(
              selected.selectedEntries.map((entry) => [
                entry.selectionKey,
                getRiicFiammettaTeamStateIndexes(
                  entry.cohort,
                  entry.teamIndex,
                ),
              ]),
            ),
          },
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
      if (charId !== recovery.targetOperatorId) {
        occupiedOperatorIds.add(charId);
      }
    }
    for (const stateIndex of plan.fiammettaTargetStateIndexes || []) {
      fiammettaTargetStateIndexes.add(stateIndex);
    }
  }

  return plans;
});

const controlCenterLateFillState = computed(() => {
  return buildRiicControlCenterLateFillState({
    baseState: controlCenterRoleState.value,
    fallbackPlans: roomGroupFallbackPlanStates.value,
    excludedOperatorIdsByTeamIndex:
      controlCenterLateFillExcludedOperatorIdsByTeamIndex.value,
    idleFillOperators: riicIdleFillOperators.value,
    fiammettaRecovery: fiammettaRecoveryConfig.value,
  });
});

const controlCenterFinalRoleState = computed(() => {
  if (automaticControlCenterReconciliationState.value?.status === "ready") {
    return automaticControlCenterReconciliationState.value;
  }

  return mergeRiicControlCenterLateFillState({
    baseState: controlCenterRoleState.value,
    lateFillState: controlCenterLateFillState.value,
  });
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

  for (const group of getRiicAutomaticRoomGroupPlanningOrder(
    candidateEnabledScheduleRoomGroups.value,
  )) {
    const state = roomGroupCandidateStates.value[group.id];
    for (const charId of getSelectedRoomGroupCoreOperatorIds(group, state)) {
      if (!destinations[charId]) {
        destinations[charId] = group.facility;
      }
    }
  }

  for (const group of getRiicAutomaticRoomGroupPlanningOrder(
    candidateEnabledScheduleRoomGroups.value,
  )) {
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
    "idle-fill": Boolean(operator?.idleFill),
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
  const selectionIndex = Number(candidate?.selectionIndex);
  if (!Number.isInteger(selectionIndex) || selectionIndex < 0) {
    return [];
  }

  const selectionKey = `${cohort.id}:${selectionIndex}`;
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

function getManualRoomGroupConflictGroups(
  candidates,
  { ignoredOperatorIds = [] } = {},
) {
  const groupIdsByOperator = new Map();
  const conflictGroupIds = new Set();
  const ignoredIds = new Set(ignoredOperatorIds);

  for (const { group, candidate } of candidates) {
    for (const charId of getManualRoomGroupCandidateOperatorIds(candidate)) {
      if (ignoredIds.has(charId)) {
        continue;
      }
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
  const conflictGroups = getManualRoomGroupConflictGroups(selectedGroups, {
    ignoredOperatorIds: fiammettaRecoveryConfig.value.enabled
      ? [fiammettaRecoveryConfig.value.targetOperatorId]
      : [],
  });
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
    lockedOperatorIds: [
      "char_391_rosmon",
      "char_4046_ebnhlz",
      "char_436_whispr",
      "char_4109_baslin",
    ],
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
        sameShiftBindingDebug: sameShiftAlignment.debug,
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
const assembledFiammettaTargetUsage = computed(() =>
  getRiicFiammettaScheduleUsage({
    scheduleCandidate: activeAssembledScheduleCandidate.value,
    targetOperatorId: fiammettaRecoveryConfig.value.targetOperatorId,
  }),
);
const scheduleTrainingRequirements = computed(() => {
  if (riicTrainingMode.value !== "ideal") {
    return trainingRecommendationState.value.requirements;
  }

  if (assembledScheduleCandidateState.value.status !== "ready") {
    return [];
  }

  return getRiicScheduleTrainingRecommendations({
    scheduleCandidates: manualRoomGroupCandidates.value
      .filter(({ group }) => group?.facility !== "meeting")
      .map(({ candidate }) => candidate),
    ownedOperators: ownedOperators.value,
    matchingOperators: virtualOperators.value,
    operatorNameToCharId,
  });
});
const scheduleTrainingRecommendationStatus = computed(() =>
  riicTrainingMode.value === "ideal"
    ? assembledScheduleCandidateState.value.status === "ready"
      ? "ready"
      : "pending"
    : trainingRecommendationState.value.status === "idle"
      ? "pending"
      : trainingRecommendationState.value.status,
);
watch(
  () => assembledScheduleCandidateState.value.status,
  () => {
    generateRestoredTrainingRecommendationIfReady();
  },
);
const riicSchedulePreviewWithoutSupportRooms = computed(() =>
  buildRiicSchedulePreview({
    scheduleCandidate: activeAssembledScheduleCandidate.value,
    roomGroups: selectableScheduleRoomGroups.value,
    staticRooms: [],
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
const schedulePreviewStaticRoomKeys = computed(
  () =>
    new Set(
      scheduleRoomRows.value
        .flatMap((row) => row.groups)
        .filter(
          (group) =>
            !group.candidateGenerationAvailable && !group.manualControl,
        )
        .flatMap((group) =>
          Array.from(
            { length: Math.max(0, Number(group.count) || 0) },
            (_, index) => `${group.id}:${index}`,
          ),
        ),
    ),
);
const riicStaticRoomCapacityByType = computed(() =>
  scheduleRoomRows.value
    .flatMap((row) => row.groups)
    .filter(
      (group) =>
        !group.candidateGenerationAvailable && !group.manualControl,
    )
    .reduce((capacityByType, group) => {
      const roomType = String(group?.facility || "").trim();
      if (!roomType) {
        return capacityByType;
      }

      return {
        ...capacityByType,
        [roomType]:
          Number(capacityByType[roomType] || 0) +
          (group?.stations || []).reduce(
            (total, station) =>
              total + Math.max(0, Number(station?.slotCount) || 0),
            0,
          ),
      };
    }, {}),
);

function getSchedulePreviewManualStaticOperatorIds(stateIndex) {
  const prefix = `${stateIndex}:`;
  const staticRoomKeys = schedulePreviewStaticRoomKeys.value;

  return Object.entries(scheduleRoomOperatorOverrides.value).flatMap(
    ([overrideKey, operators]) => {
      const roomKey = String(overrideKey || "").slice(prefix.length);
      return overrideKey.startsWith(prefix) && staticRoomKeys.has(roomKey)
        ? (operators || [])
            .map((operator) => String(operator?.charId || "").trim())
            .filter(Boolean)
        : [];
    },
  );
}

const riicSupportRoomPlacementsBySourceStateIndex = computed(() =>
  Object.fromEntries(
    (riicSchedulePreviewWithoutSupportRooms.value?.states || []).map(
      (state) => {
        const roomAssignments = (state?.rooms || [])
          .filter((room) => !room?.isStatic)
          .map((room) => ({
            roomType: room.facility,
            operatorIds: (room?.operators || [])
              .map((operator) => operator?.charId)
              .filter(Boolean),
          }));
        const claimedOperatorIds = new Set(
          roomAssignments.flatMap((assignment) => assignment.operatorIds),
        );
        for (const operatorId of getSchedulePreviewManualStaticOperatorIds(
          state.index,
        )) {
          claimedOperatorIds.add(operatorId);
        }
        const sourceStateIndex = Number.isInteger(state?.sourceStateIndex)
          ? state.sourceStateIndex
          : state?.index;

        return [
          sourceStateIndex,
          getRiicLayer3SupportRoomPlacements({
            roomAssignments,
            ownedOperators: virtualOperators.value || [],
            claimedOperatorIds,
            layoutFacts: activeLayoutFacilityCounts.value,
            idleFillOperators: riicIdleFillOperators.value,
            roomCapacityByType: riicStaticRoomCapacityByType.value,
          }),
        ];
      },
    ),
  ),
);

function distributeRiicSupportRoomPlacements(
  placements = [],
  roomCount = 0,
  slotCount = 0,
) {
  const rooms = Array.from(
    { length: Math.max(0, Number(roomCount) || 0) },
    () => [],
  );
  const normalizedSlotCount = Math.max(0, Number(slotCount) || 0);
  if (rooms.length === 0 || normalizedSlotCount === 0) {
    return rooms;
  }

  const fillRooms = (operators, roomIndexes) => {
    let roomCursor = 0;
    for (const operator of operators) {
      while (
        roomCursor < roomIndexes.length &&
        rooms[roomIndexes[roomCursor]].length >= normalizedSlotCount
      ) {
        roomCursor += 1;
      }
      if (roomCursor >= roomIndexes.length) {
        return;
      }
      rooms[roomIndexes[roomCursor]].push(operator);
    }
  };

  fillRooms(
    placements.filter((placement) => placement?.roomOrder !== "last"),
    rooms.map((_, index) => index),
  );
  fillRooms(
    placements.filter((placement) => placement?.roomOrder === "last"),
    rooms.map((_, index) => rooms.length - 1 - index),
  );

  return rooms;
}

const schedulePreviewStaticRooms = computed(() => {
  return scheduleRoomRows.value
    .flatMap((row) => row.groups)
    .filter(
      (group) =>
        !group.candidateGenerationAvailable && !group.manualControl,
    )
    .flatMap((group) =>
      Array.from({ length: group.count }, (_, index) => {
        const station = group.stations?.[index] || null;
        const expectedSlots = Math.max(0, Number(station?.slotCount) || 0);
        const operatorsByStateIndex = Object.fromEntries(
          Object.entries(
            riicSupportRoomPlacementsBySourceStateIndex.value,
          ).map(([stateIndex, placements]) => [
            stateIndex,
            distributeRiicSupportRoomPlacements(
              placements?.[group.facility] || [],
              group.count,
              expectedSlots,
            )[index] || [],
          ]),
        );

        return {
          key: `${group.id}:${index}`,
          label:
            group.count > 1
              ? `${group.facilityLabel} ${index + 1}`
              : group.facilityLabel,
          facility: group.facility,
          stationLevel: station?.stationLevel || null,
          expectedSlots,
          operatorsByStateIndex,
        };
      }),
    );
});
const riicSchedulePreviewBase = computed(() =>
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
function getRiicL79RoomKeyForPreviewRoom(room) {
  const facility = getRiicMaaRoomType(room?.facility);
  if (!facility) {
    return "";
  }

  const assignedIndex = Number(
    resolvedScheduleRoomMaaIndexAssignments.value?.[
      String(room?.key || "").trim()
    ],
  );
  const stationIndex = Number(room?.stationIndex);
  const index =
    Number.isInteger(assignedIndex) && assignedIndex >= 1
      ? assignedIndex - 1
      : Number.isInteger(stationIndex) && stationIndex >= 0
        ? stationIndex
        : 0;
  return `${facility}:${index}`;
}

function applyRiicL79EfficiencyToPreview({ preview, settlement } = {}) {
  if (!preview || !settlement?.states?.length) {
    return preview;
  }

  return {
    ...preview,
    cycleHours: settlement.cycleHours,
    perceptionSettlement: settlement.perceptionSettlement,
    states: (preview.states || []).map((state, stateIndex) => {
      const l79State = settlement.states[stateIndex];
      const l79Rooms = new Map(
        (l79State?.rooms || []).map((room) => [room.key, room]),
      );
      return {
        ...state,
        rooms: (state.rooms || []).map((room) => {
          const l79Room = l79Rooms.get(
            getRiicL79RoomKeyForPreviewRoom(room),
          );
          if (!l79Room) {
            return room;
          }
          return {
            ...room,
            efficiency: l79Room.efficiency,
            expectedSlots: l79Room.expectedSlots ?? room.expectedSlots,
            controlCenterFacilityBonusPercent:
              l79Room.controlCenterFacilityBonusPercent || 0,
            controlCenterOperatorBonusPercent:
              l79Room.controlCenterOperatorBonusPercent || 0,
            controlCenterOperatorBonuses:
              l79Room.controlCenterOperatorBonuses || [],
            activeRosterBonusPercent:
              l79Room.activeRosterBonusPercent || 0,
            activeRosterEffects: l79Room.activeRosterEffects || [],
            resourceChainAdditionalBonusPercent:
              l79Room.resourceChainAdditionalBonusPercent || 0,
            efficiencyMetrics: l79Room.efficiencyMetrics,
            l79Issues: l79Room.issues || [],
          };
        }),
      };
    }),
  };
}

const riicL79Settlement = computed(() => {
  const input = riicL79InputDebugState.value;
  return input ? settleRiicMaaScheduleEfficiency(input) : null;
});
const riicSchedulePreview = computed(() =>
  applyRiicL79EfficiencyToPreview({
    preview: riicSchedulePreviewBase.value,
    settlement: riicL79Settlement.value,
  }),
);
const hasOrundumManufactureRoom = computed(() =>
  (riicSchedulePreview.value?.states || []).some((state) =>
    (state?.rooms || []).some(
      (room) =>
        String(room?.facility || "").trim() === "manufacture" &&
        String(room?.product || "").trim() === "orundum",
    ),
  ),
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
function hasScheduleDroneTargetOperators(room) {
  return (room?.operators || []).some((operator) =>
    String(operator?.charId || operator?.name || "").trim(),
  );
}

const scheduleDroneTargetPreviewKeysByState = computed(() =>
  (riicSchedulePreviewBase.value?.states || []).map((state) =>
    (state?.rooms || []).reduce((keysByL79RoomKey, room) => {
      if (
        !["trading", "manufacture"].includes(room?.facility) ||
        !hasScheduleDroneTargetOperators(room)
      ) {
        return keysByL79RoomKey;
      }

      const l79RoomKey = getRiicL79RoomKeyForPreviewRoom(room);
      if (l79RoomKey) {
        keysByL79RoomKey[l79RoomKey] = room.key;
      }
      return keysByL79RoomKey;
    }, {}),
  ),
);

const scheduleDroneSettlementSettingsByState = computed(() =>
  schedulePreviewShifts.value.map((shift, stateIndex) => {
    const drone = normalizeScheduleDroneSettings(shift?.drone);
    const targetKey = drone.disabled ? "" : String(drone.target || "").trim();
    const sourceRoom = (
      riicSchedulePreviewBase.value?.states?.[stateIndex]?.rooms || []
    ).find((room) => room.key === targetKey);

    if (
      !sourceRoom ||
      !["trading", "manufacture"].includes(sourceRoom.facility) ||
      !hasScheduleDroneTargetOperators(sourceRoom)
    ) {
      return {
        targetKey: "",
        order: "retain",
      };
    }

    return {
      targetKey: getRiicL79RoomKeyForPreviewRoom(sourceRoom),
      order: drone.order,
    };
  }),
);

const riicActualScheduleMetrics = computed(() => {
  const l79Settlement = riicL79Settlement.value;
  const preview = l79Settlement?.preview || null;
  const hasAssembledSchedule =
    Array.isArray(preview?.states) && preview.states.length > 0;

  return hasAssembledSchedule
    ? summarizeRiicActualSchedule({
        l79: l79Settlement,
        droneTargetKeysByState: scheduleDroneSettlementSettingsByState.value.map(
          (setting) => setting.targetKey,
        ),
        droneOrdersByState: scheduleDroneSettlementSettingsByState.value.map(
          (setting) => setting.order,
        ),
        orundumCraftMaterial:
          scheduleExecutionSettings.orundumCraftMaterial,
      })
    : null;
});
function applyRiicTradingSettlementToPreview({
  preview,
  tradingSettlements,
} = {}) {
  if (!preview || !Array.isArray(tradingSettlements)) {
    return preview;
  }

  const rateByStateAndRoomKey = new Map();
  for (const settlement of tradingSettlements) {
    const roomKey = String(settlement?.key || "").trim();
    if (!roomKey) {
      continue;
    }

    for (const segment of settlement?.segments || []) {
      const stateIndex = Number(segment?.stateIndex);
      const rate = Number(segment?.rate);
      if (
        !segment?.calculated ||
        !Number.isInteger(stateIndex) ||
        stateIndex < 0 ||
        !Number.isFinite(rate)
      ) {
        continue;
      }
      rateByStateAndRoomKey.set(`${stateIndex}:${roomKey}`, rate);
    }
  }

  if (rateByStateAndRoomKey.size === 0) {
    return preview;
  }

  return {
    ...preview,
    states: (preview.states || []).map((state, stateIndex) => ({
      ...state,
      rooms: (state.rooms || []).map((room) => {
        if (
          room?.facility !== "trading" ||
          String(room?.product || "").trim() !== "lmd"
        ) {
          return room;
        }

        const rate = rateByStateAndRoomKey.get(
          `${stateIndex}:${getRiicL79RoomKeyForPreviewRoom(room)}`,
        );
        return Number.isFinite(rate)
          ? {
              ...room,
              efficiency: rate,
            }
          : room;
      }),
    })),
  };
}
const riicScheduleDisplayPreview = computed(() =>
  applyRiicTradingSettlementToPreview({
    preview: riicSchedulePreview.value,
    tradingSettlements: riicActualScheduleMetrics.value?.yield
      ?.tradingSettlements,
  }),
);
const displayedRiicSchedulePreview = computed(
  () =>
    riicScheduleDisplayPreview.value || riicSchedulePreviewPlaceholder.value,
);
const outputPreviewTitle = computed(
  () =>
    scheduleExecutionSettings.exportInfo.title ||
    getDefaultGeneratedScheduleTitle(),
);
const outputPreviewScheduleMeta = computed(() => {
  const layoutFacts = activeLayoutFacilityCounts.value;
  const manufactureStationCount = (layoutFacts?.facilities || []).filter(
    (facility) => facility?.facilityType === "manufacture",
  ).length;
  const layoutSummary = confirmedLayoutPlan.value
    ? [
        `${layoutFacts?.tradingStationCount || 0}贸易站`,
        `${manufactureStationCount}制造站`,
        `${layoutFacts?.powerPlantCount || 0}发电站`,
      ].join(" ")
    : "";
  const shiftMode =
    {
      once: "一天一换",
      twice: "一天两换",
      threeTimes: "一天三换",
    }[confirmedLayoutPlan.value?.shiftMode] || "";

  return [layoutSummary, shiftMode]
    .filter(Boolean)
    .join(" · ");
});
const outputPreviewYieldItems = computed(() => {
  const resources = new Map(
    (riicActualScheduleMetrics.value?.yield?.resources || []).map(
      (item) => [String(item?.resource || ""), item],
    ),
  );

  return [
    { resource: "lmd", label: "龙门币", image: lmdImage },
    { resource: "exp", label: "经验书", image: battleRecordImage },
    { resource: "orundum", label: "搓玉", image: orundumImage },
  ]
    .map(({ resource, label, image }) => {
      const item = resources.get(resource);
      const value = Number(item?.outputPerDay);
      return {
        resource,
        label,
        image,
        value,
        isCalculated:
          item?.isCalculated === true && Number.isFinite(value) && value !== 0,
      };
    })
    .filter((item) => item.isCalculated);
});
const outputPreviewResourceNettingItems = computed(() => {
  const yieldSummary = riicActualScheduleMetrics.value?.yield || {};
  const resources = new Map(
    (yieldSummary.resources || []).map((item) => [
      String(item?.resource || ""),
      item,
    ]),
  );
  const orundumFlow = yieldSummary.resourceFlows?.orundum || {};
  const craftMaterial =
    orundumFlow.craftMaterial ||
    scheduleExecutionSettings.orundumCraftMaterial ||
    "orirock";
  const craftMaterialLabel =
    String(orundumFlow.craftMaterialLabel || "").trim() ||
    (craftMaterial === "device" ? "装置" : "固源岩");

  const items = [
    {
      key: "gold",
      label: "赤金",
      image: goldImage,
      value: Number(resources.get("gold")?.outputPerDay),
      unit: "根",
      isCalculated: resources.get("gold")?.isCalculated === true,
    },
    {
      key: "originiumShard",
      label: "源石碎片",
      image: originiumShardImage,
      value: Number(resources.get("originiumShard")?.outputPerDay),
      unit: "枚",
      isCalculated: resources.get("originiumShard")?.isCalculated === true,
    },
    {
      key: `craft:${craftMaterial}`,
      label: craftMaterialLabel,
      itemId: craftMaterial === "device" ? "30062" : "30012",
      value: -Number(orundumFlow.craftMaterialConsumptionPerDay),
      unit: "个",
      isCalculated:
        orundumFlow.isCalculated === true &&
        Number.isFinite(Number(orundumFlow.craftMaterialConsumptionPerDay)),
    },
  ];

  return items.filter((item) => {
    if (item.key.startsWith("craft:")) {
      return item.isCalculated && Math.abs(item.value) > 1e-9;
    }

    if (item.key === "originiumShard") {
      return (
        !item.isCalculated ||
        !Number.isFinite(item.value) ||
        Math.abs(item.value) > 1e-9
      );
    }

    return true;
  });
});
const outputPreviewGeneratedDate = computed(() => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
});
const outputPreviewDebugValues = computed(() => {
  const operators = ownedOperators.value || [];
  const eliteTwoCount = operators.filter(
    (operator) => Number(operator?.elite) >= 2,
  ).length;
  const idealTrainingEnabled =
    treatUnderleveledOperatorsAsQualified.value === true;
  const raritySelection = idealTrainingRaritySelection.value || {};
  const idealTrainingRarities = idealTrainingEnabled
    ? [
        raritySelection.fourOrBelow ? "4" : "",
        raritySelection.five ? "5" : "",
        raritySelection.six ? "6" : "",
      ].join("") || "0"
    : "0";
  const scheduleStateCount =
    getSchedulePreviewStateCount(
      confirmedLayoutPlan.value?.shiftMode,
      twoShiftRotationMode.value,
    ) || 0;

  return `${operators.length} ${eliteTwoCount} ${idealTrainingRarities} ${scheduleStateCount}`;
});
const outputPreviewHeaderTheme = computed(() => {
  const yields = new Map(
    outputPreviewYieldItems.value.map((item) => [item.resource, item.value]),
  );
  const lmd = Number(yields.get("lmd") || 0);
  const exp = Number(yields.get("exp") || 0);
  const orundum = Number(yields.get("orundum") || 0);

  if (orundum > 0) {
    return { tone: "orundum", images: [orundumImage] };
  }
  if (exp > lmd * 1.5) {
    return { tone: "experience", images: [battleRecordImage] };
  }
  if (exp > lmd * 0.7) {
    return { tone: "balanced", images: [battleRecordImage, lmdImage] };
  }
  return { tone: "lmd", images: [lmdImage] };
});

function formatOutputPreviewYield(value) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOutputPreviewResourceNetting(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }

  return `${number > 0 ? "+" : ""}${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
  }).format(number)}`;
}

function getRiicMaaScheduleBuildOptions(includeRiicRoomLevels = false) {
  return {
    preview: riicSchedulePreviewBase.value,
    shifts: schedulePreviewShifts.value,
    shiftMode: confirmedLayoutPlan.value?.shiftMode,
    title:
      scheduleExecutionSettings.exportInfo.title ||
      getDefaultGeneratedScheduleTitle(),
    author: scheduleExecutionSettings.exportInfo.author,
    description: scheduleExecutionSettings.exportInfo.description,
    roomSettingOverrides: scheduleRoomMaaSettingOverrides.value,
    roomIndexAssignments: resolvedScheduleRoomMaaIndexAssignments.value,
    hasFiammetta: schedulePreviewShifts.value.some(
      (shift) => shift?.fiammetta?.enable === true,
    ),
    includeRiicRoomLevels,
  };
}

function createRiicL79OperatorProfiles(operators = []) {
  return (operators || [])
    .map((operator) => {
      const charId = String(operator?.charId || "").trim();
      const elite = Number(operator?.elite);
      const level = Number(operator?.level);

      if (!charId) {
        return null;
      }

      return {
        charId,
        elite: Number.isInteger(elite) && elite >= 0 ? elite : null,
        level: Number.isInteger(level) && level >= 1 ? level : null,
      };
    })
    .filter(Boolean);
}

const riicL79OperatorProfiles = computed(() => {
  const allOwnedOperators = ownedOperators.value || [];
  const operators =
    riicTrainingMode.value === "ideal"
      ? createRiicIdealTrainingRoster(
          allOwnedOperators,
          RIIC_BASELINE_SKILL_RULES,
          idealTrainingRaritySelection.value,
        ).operators
      : allOwnedOperators;

  return createRiicL79OperatorProfiles(operators);
});

const generatedMaaExportPreview = computed(() => {
  if (
    !Array.isArray(riicSchedulePreview.value?.states) ||
    riicSchedulePreview.value.states.length === 0 ||
    !scheduleExecutionSettingsComplete.value
  ) {
    return null;
  }

  try {
    return buildRiicMaaScheduleFromPreview(
      getRiicMaaScheduleBuildOptions(),
    );
  } catch (error) {
    console.error(error);
    return null;
  }
});
const riicL79InputDebugState = computed(() => {
  if (
    !Array.isArray(riicSchedulePreviewBase.value?.states) ||
    riicSchedulePreviewBase.value.states.length === 0
  ) {
    return null;
  }

  try {
    const { schedule } = buildRiicMaaScheduleFromPreview({
      ...getRiicMaaScheduleBuildOptions(true),
      durationSource: "preview",
    });
    return {
      schedule,
      operatorProfiles: riicL79OperatorProfiles.value,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
});
const riicScheduleResultSnapshot = computed(() =>
  createRiicScheduleResultSnapshot({
    preview: riicSchedulePreview.value,
    l79: riicL79Settlement.value,
    actual: riicActualScheduleMetrics.value,
    displayPreview: riicScheduleDisplayPreview.value,
    exportPreview: generatedMaaExportPreview.value,
    l79Input: riicL79InputDebugState.value,
    diagnostics: riicAutomaticGenerationDebugState.value,
  }),
);
function getDefaultGeneratedScheduleTitle() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}`;
  const layoutKey = confirmedLayoutPlan.value?.cardKey || "基建";
  const layout =
    layoutKey === "243-orundum" ? "243搓玉" : layoutKey;
  const shift = {
    once: "一换",
    twice: "两换",
    threeTimes: "三换",
  }[confirmedLayoutPlan.value?.shiftMode] || "排班";
  const activeYituliuSource = customOperatorSources.value.find(
    (source) =>
      source.id === activeOperatorSource.value && source.type === "yituliu",
  );
  const sourceId = String(activeYituliuSource?.label || "").trim();

  return [
    "一图流排班表",
    date,
    `${layout}${shift}`,
    ...(sourceId ? [sourceId] : []),
  ].join("-");
}
const riicScheduleDuplicateOperatorChecks = computed(() => {
  const states = riicSchedulePreview.value?.states || [];

  return states.flatMap((state, stateIndex) => {
    const roomsByOperatorKey = new Map();
    for (const room of state?.rooms || []) {
      for (const operator of room?.operators || []) {
        const charId = String(operator?.charId || "").trim();
        const name = String(
          operator?.name || operatorTableV2?.[charId]?.name || "",
        ).trim();
        const key = charId || name;
        if (!key) {
          continue;
        }

        const rooms = roomsByOperatorKey.get(key) || [];
        rooms.push(room?.label || room?.key || "未命名房间");
        roomsByOperatorKey.set(key, rooms);
      }
    }

    return [...roomsByOperatorKey.entries()]
      .filter(([, rooms]) => rooms.length > 1)
      .map(([operatorKey, rooms]) => ({
        stateIndex,
        shiftName:
          schedulePreviewShifts.value[stateIndex]?.name ||
          `班次 ${stateIndex + 1}`,
        operatorKey,
        operatorName:
          operatorTableV2?.[operatorKey]?.name || operatorKey,
        rooms,
      }));
  });
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
const workflowCardCollapseStates = ref(
  Object.fromEntries(
    RIIC_WORKFLOW_CARD_IDS.map((cardId) => [cardId, false]),
  ),
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
const scheduleRoomMaaIndexEntries = computed(() =>
  getScheduleRoomMaaIndexEntries(),
);
const resolvedScheduleRoomMaaIndexAssignments = computed(() =>
  resolveScheduleRoomMaaIndexAssignments(
    scheduleRoomMaaIndexEntries.value,
  ),
);
const scheduleDroneTargetOptions = computed(() => {
  return getScheduleDroneTargetOptionsForState(
    activeSchedulePreviewStateIndex.value,
  );
});
const scheduleDroneTargetOptionKeysByState = computed(() =>
  (displayedRiicSchedulePreview.value?.states || [])
    .map((_, stateIndex) =>
      getScheduleDroneTargetOptionsForState(stateIndex)
        .filter((option) => !option.disabled)
        .map((option) => option.value)
        .join("|"),
    )
    .join("||"),
);

function getScheduleDroneTargetOptionsForState(stateIndex) {
  const optionsByKey = new Map();
  const activeState =
    displayedRiicSchedulePreview.value?.states?.[
      stateIndex
    ];

  for (const room of activeState?.rooms || []) {
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
    const assignedIndex = Number(
      resolvedScheduleRoomMaaIndexAssignments.value?.[
        String(room?.key || "").trim()
      ],
    );
    const stationNumber =
      Number.isInteger(assignedIndex) && assignedIndex >= 1
        ? assignedIndex
        : Math.max(Number(room.stationIndex || 0) + 1, 1);
    optionsByKey.set(room.key, {
      value: room.key,
      label:
        room.facility === "power"
          ? `${facilityLabel}${stationNumber}`
          : `${product}${facilityLabel}${stationNumber}`,
      facility: room.facility,
      disabled:
        room.facility === "power" || !hasScheduleDroneTargetOperators(room),
    });
  }

  return [...optionsByKey.values()];
}
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
const riicOperatorSearchEntries = createRiicOperatorSearchEntries(
  Object.entries(operatorTableV2).map(([charId, operator]) => ({
    charId,
    name: operator?.name || charId,
    rarity: operator?.rarity || 1,
  })),
  operatorTableV2,
);
const scheduleRoomEditorOperatorOptions = computed(() => {
  const selectedOperatorKeys = new Set(
    scheduleRoomEditorOperators.value.map((operator) =>
      getScheduleRoomEditorOperatorKey(operator),
    ),
  );

  return riicOperatorSearchEntries.filter(
    (operator) =>
      !selectedOperatorKeys.has(
        getScheduleRoomEditorOperatorKey(operator),
      ),
  );
});
const scheduleRoomEditorOperatorMatches = computed(() =>
  findRiicOperatorSearchMatches(
    scheduleRoomEditorOperatorOptions.value,
    scheduleRoomEditorOperatorInput.value,
  ),
);
const scheduleRoomEditorInputName = computed(() =>
  String(scheduleRoomEditorOperatorInput.value || "").trim(),
);
const scheduleRoomEditorInputCharId = computed(
  () =>
    operatorNameToCharId.get(scheduleRoomEditorInputName.value) ||
    (operatorTableV2?.[scheduleRoomEditorInputName.value]
      ? scheduleRoomEditorInputName.value
      : ""),
);
const scheduleRoomEditorInputUnmatched = computed(
  () =>
    Boolean(scheduleRoomEditorInputName.value) &&
    scheduleRoomEditorOperatorMatches.value.length === 0,
);
const scheduleRoomEditorProductOptions = computed(() =>
  ROOM_PRODUCT_OPTIONS[activeSchedulePreviewRoom.value?.facility] || [],
);

function syncFiammettaRecoveryUsage(
  targetName,
  recovery,
  usage,
) {
  const enabled =
    recovery?.enabled === true &&
    Number(usage?.selectionCount || 0) > 1;
  const targetOperatorId = String(recovery?.targetOperatorId || "").trim();

  scheduleExecutionSettings.shifts = scheduleExecutionSettings.shifts.map(
    (shift, index) => {
      const targetAppearsInShift = (
        riicSchedulePreview.value?.states?.[index]?.rooms || []
      ).some((room) =>
        (room?.operators || []).some(
          (operator) => String(operator?.charId || "").trim() === targetOperatorId,
        ),
      );
      const appliesToShift =
        enabled &&
        Boolean(targetOperatorId) &&
        targetAppearsInShift;

      return {
        ...shift,
        fiammetta: {
          enable: appliesToShift,
          target: appliesToShift ? targetName : "",
          order: "pre",
        },
      };
    },
  );
}

const fiammettaRecoverySyncKey = computed(() => {
  const targetOperatorId = String(
    fiammettaRecoveryConfig.value.targetOperatorId || "",
  ).trim();
  const targetStateIndexes = (riicSchedulePreview.value?.states || [])
    .flatMap((state, stateIndex) =>
      (state?.rooms || []).some((room) =>
        (room?.operators || []).some(
          (operator) =>
            String(operator?.charId || "").trim() === targetOperatorId,
        ),
      )
        ? [stateIndex]
        : [],
    )
    .join(",");

  return [
    targetOperatorId,
    fiammettaRecoveryConfig.value.enabled ? "enabled" : "disabled",
    fiammettaTargetName.value,
    Number(assembledFiammettaTargetUsage.value.selectionCount || 0),
    targetStateIndexes,
  ].join("|");
});

watch(
  fiammettaRecoverySyncKey,
  () => {
    syncFiammettaRecoveryUsage(
      fiammettaTargetName.value,
      fiammettaRecoveryConfig.value,
      assembledFiammettaTargetUsage.value,
    );
  },
  { flush: "post" },
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
    scheduleDroneTargetOptionKeysByState,
    () =>
      scheduleExecutionSettings.shifts.map(
        (shift) => JSON.stringify(shift?.drone || {}),
      ),
    () => scheduleExecutionSettings.shifts.length,
  ],
  () => {
    if (!riicSchedulePreview.value?.states?.length) {
      return;
    }

    for (
      let index = 0;
      index < scheduleExecutionSettings.shifts.length;
      index += 1
    ) {
      const shift = scheduleExecutionSettings.shifts[index];
      const drone = normalizeScheduleDroneSettings(shift?.drone);
      if (drone.disabled) {
        if (drone.target || drone.pinned || drone.order !== "retain") {
          updateSchedulePreviewShift({
            index,
            drone: {
              ...drone,
              target: "",
              pinned: false,
              order: "retain",
            },
          });
        }
        continue;
      }

      const availableTargetOptions = getScheduleDroneTargetOptionsForState(
        index,
      ).filter((option) => !option.disabled);
      const availableTargets = new Set(
        availableTargetOptions.map((option) => option.value),
      );
      if (availableTargetOptions.length === 0) {
        updateSchedulePreviewShift({
          index,
          drone: {
            ...drone,
            target: "",
            pinned: false,
            disabled: true,
            order: "retain",
          },
        });
        continue;
      }
      if (drone.target && !availableTargets.has(drone.target)) {
        updateSchedulePreviewShift({
          index,
          drone: {
            ...drone,
            target: "",
            pinned: false,
            disabled: true,
            order: "retain",
          },
        });
        continue;
      }
      if (drone.pinned && availableTargets.has(drone.target)) {
        continue;
      }

      const preferredTarget = String(
        displayedRiicSchedulePreview.value?.preferredDroneRoomKey || "",
      ).trim();
      const recommendedTarget = availableTargets.has(preferredTarget)
        ? preferredTarget
        : availableTargetOptions[0]?.value || "";
      if (drone.target === recommendedTarget && !drone.pinned) {
        continue;
      }

      updateSchedulePreviewShift({
        index,
        drone: {
          ...drone,
          target: recommendedTarget,
          pinned: false,
          disabled: false,
        },
      });
    }
  },
  { immediate: true },
);

function getScheduleRoomOverrideKey(stateIndex, roomKey) {
  return `${stateIndex}:${roomKey}`;
}

function getDefaultScheduleRoomMaaSettings(room) {
  const operatorCount = Array.isArray(room?.operators)
    ? room.operators.length
    : 0;
  const facility = String(room?.facility || "");

  return {
    sort: ["control", "manufacture", "trading"].includes(facility),
    autofill:
      facility === "dormitory" ||
      (facility === "meeting" && operatorCount < 2),
    skip: facility !== "dormitory" && operatorCount === 0,
  };
}

function getScheduleRoomMaaSettings(room, stateIndex) {
  if (!room) {
    return getDefaultScheduleRoomMaaSettings();
  }

  return {
    ...getDefaultScheduleRoomMaaSettings(room),
    ...(scheduleRoomMaaSettingOverrides.value[
      getScheduleRoomOverrideKey(stateIndex, room.key)
    ] || {}),
  };
}

const activeScheduleRoomMaaSettings = computed(() =>
  getScheduleRoomMaaSettings(
    activeSchedulePreviewRoom.value,
    activeSchedulePreviewStateIndex.value,
  ),
);

function getScheduleRoomMaaIndexEntries(preview = riicSchedulePreview.value) {
  const entriesByRoomType = new Map();
  const seenRoomKeys = new Set();
  let sequence = 0;

  for (const state of preview?.states || []) {
    for (const room of state?.rooms || []) {
      const key = String(room?.key || "").trim();
      const roomType = getRiicMaaRoomType(room?.facility);
      if (!key || !roomType || seenRoomKeys.has(key)) {
        continue;
      }

      seenRoomKeys.add(key);
      const entries = entriesByRoomType.get(roomType) || [];
      entries.push({
        key,
        stationIndex: Number.isInteger(Number(room?.stationIndex))
          ? Number(room.stationIndex)
          : Number.MAX_SAFE_INTEGER,
        sequence,
      });
      entriesByRoomType.set(roomType, entries);
      sequence += 1;
    }
  }

  for (const entries of entriesByRoomType.values()) {
    entries.sort(
      (left, right) =>
        left.stationIndex - right.stationIndex ||
        left.sequence - right.sequence,
    );
  }

  return entriesByRoomType;
}

function resolveScheduleRoomMaaIndexAssignments(
  entriesByRoomType = getScheduleRoomMaaIndexEntries(),
  savedAssignments = scheduleRoomMaaIndexAssignments.value,
) {
  const resolved = {};

  for (const entries of entriesByRoomType.values()) {
    const savedIndexes = entries.map((entry) =>
      Number(savedAssignments?.[entry.key]),
    );
    const hasCompletePermutation =
      savedIndexes.length === entries.length &&
      savedIndexes.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 1 &&
          index <= entries.length,
      ) &&
      new Set(savedIndexes).size === entries.length;

    entries.forEach((entry, index) => {
      resolved[entry.key] = hasCompletePermutation
        ? savedIndexes[index]
        : index + 1;
    });
  }

  return resolved;
}

const activeScheduleRoomMaaIndexOptions = computed(() => {
  const room = activeSchedulePreviewRoom.value;
  const roomType = getRiicMaaRoomType(room?.facility);
  const count = scheduleRoomMaaIndexEntries.value.get(roomType)?.length || 0;
  return Array.from({ length: count }, (_, index) => index + 1);
});
const activeScheduleRoomMaaIndex = computed(() => {
  const roomKey = String(activeSchedulePreviewRoom.value?.key || "").trim();
  return Number(
    resolvedScheduleRoomMaaIndexAssignments.value[roomKey] || 1,
  );
});
const activeScheduleRoomMaaLabel = computed(() => {
  const room = activeSchedulePreviewRoom.value;
  const label = String(room?.label || "").trim();
  const stationIndex = Number(room?.stationIndex);
  const localNumber =
    Number.isInteger(stationIndex) && stationIndex >= 0
      ? stationIndex + 1
      : null;
  const suffix = localNumber === null ? "" : ` ${localNumber}`;

  return suffix && label.endsWith(suffix)
    ? label.slice(0, -suffix.length)
    : label;
});

function updateScheduleRoomMaaIndex(value) {
  const room = activeSchedulePreviewRoom.value;
  const roomKey = String(room?.key || "").trim();
  const roomType = getRiicMaaRoomType(room?.facility);
  const nextIndex = Number(value);
  const entries = scheduleRoomMaaIndexEntries.value.get(roomType) || [];
  if (
    !roomKey ||
    !Number.isInteger(nextIndex) ||
    nextIndex < 1 ||
    nextIndex > entries.length
  ) {
    return;
  }

  const currentAssignments = resolvedScheduleRoomMaaIndexAssignments.value;
  const currentIndex = Number(currentAssignments[roomKey]);
  if (currentIndex === nextIndex) {
    return;
  }

  const swappedEntry = entries.find(
    (entry) => Number(currentAssignments[entry.key]) === nextIndex,
  );
  const nextAssignments = {
    ...currentAssignments,
    [roomKey]: nextIndex,
  };
  if (swappedEntry && swappedEntry.key !== roomKey) {
    nextAssignments[swappedEntry.key] = currentIndex;
  }

  scheduleRoomMaaIndexAssignments.value = nextAssignments;
}

function updateScheduleRoomMaaSettings(nextSettings) {
  const room = activeSchedulePreviewRoom.value;
  const stateIndex = activeSchedulePreviewStateIndex.value;
  if (!room || !Number.isInteger(stateIndex)) {
    return;
  }

  const defaults = getDefaultScheduleRoomMaaSettings(room);
  const normalized = Object.fromEntries(
    ["sort", "autofill", "skip"].flatMap((field) =>
      typeof nextSettings?.[field] === "boolean" &&
      nextSettings[field] !== defaults[field]
        ? [[field, nextSettings[field]]]
        : [],
    ),
  );
  const key = getScheduleRoomOverrideKey(stateIndex, room.key);
  const nextOverrides = { ...scheduleRoomMaaSettingOverrides.value };
  if (Object.keys(normalized).length > 0) {
    nextOverrides[key] = normalized;
  } else {
    delete nextOverrides[key];
  }
  scheduleRoomMaaSettingOverrides.value = nextOverrides;
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

function getSchedulePreviewRoomOperatorKey(operator) {
  return getScheduleRoomEditorOperatorKey(operator);
}

function hasDuplicateSchedulePreviewRoomOperators(operators) {
  const operatorKeys = new Set();
  for (const operator of operators || []) {
    const operatorKey = getSchedulePreviewRoomOperatorKey(operator);
    if (!operatorKey || operatorKeys.has(operatorKey)) {
      return true;
    }
    operatorKeys.add(operatorKey);
  }
  return false;
}

function canFitSchedulePreviewRoomOperators(room, operators) {
  const expectedSlots = Number(room?.expectedSlots);
  return (
    !Number.isInteger(expectedSlots) ||
    expectedSlots < 1 ||
    operators.length <= expectedSlots
  );
}

function moveSchedulePreviewOperator({
  stateIndex,
  sourceRoomKey,
  sourceOperatorKey,
  targetRoomKey,
  targetOperatorKey = "",
} = {}) {
  if (
    !Number.isInteger(stateIndex) ||
    !sourceRoomKey ||
    !sourceOperatorKey ||
    !targetRoomKey ||
    sourceRoomKey === targetRoomKey
  ) {
    return;
  }

  const state = riicSchedulePreview.value?.states?.[stateIndex];
  const sourceRoom = (state?.rooms || []).find(
    (room) => room.key === sourceRoomKey,
  );
  const targetRoom = (state?.rooms || []).find(
    (room) => room.key === targetRoomKey,
  );
  if (!sourceRoom || !targetRoom) {
    return;
  }

  const sourceOperators = [...(sourceRoom.operators || [])];
  const targetOperators = [...(targetRoom.operators || [])];
  const sourceIndex = sourceOperators.findIndex(
    (operator) =>
      getSchedulePreviewRoomOperatorKey(operator) === sourceOperatorKey,
  );
  if (sourceIndex < 0) {
    return;
  }

  const sourceOperator = sourceOperators[sourceIndex];
  let nextSourceOperators;
  let nextTargetOperators;

  if (targetOperatorKey) {
    const targetIndex = targetOperators.findIndex(
      (operator) =>
        getSchedulePreviewRoomOperatorKey(operator) === targetOperatorKey,
    );
    if (
      targetIndex < 0 ||
      targetOperatorKey === sourceOperatorKey ||
      targetOperators.some(
        (operator) =>
          getSchedulePreviewRoomOperatorKey(operator) === sourceOperatorKey,
      ) ||
      sourceOperators.some(
        (operator) =>
          getSchedulePreviewRoomOperatorKey(operator) === targetOperatorKey,
      )
    ) {
      return;
    }

    const targetOperator = targetOperators[targetIndex];
    nextSourceOperators = sourceOperators.map((operator, index) =>
      index === sourceIndex ? targetOperator : operator,
    );
    nextTargetOperators = targetOperators.map((operator, index) =>
      index === targetIndex ? sourceOperator : operator,
    );
  } else {
    if (
      targetOperators.some(
        (operator) =>
          getSchedulePreviewRoomOperatorKey(operator) === sourceOperatorKey,
      )
    ) {
      return;
    }

    nextSourceOperators = sourceOperators.filter(
      (_, index) => index !== sourceIndex,
    );
    nextTargetOperators = [...targetOperators, sourceOperator];
  }

  if (
    !canFitSchedulePreviewRoomOperators(sourceRoom, nextSourceOperators) ||
    !canFitSchedulePreviewRoomOperators(targetRoom, nextTargetOperators) ||
    hasDuplicateSchedulePreviewRoomOperators(nextSourceOperators) ||
    hasDuplicateSchedulePreviewRoomOperators(nextTargetOperators)
  ) {
    return;
  }

  scheduleRoomOperatorOverrides.value = {
    ...scheduleRoomOperatorOverrides.value,
    [getScheduleRoomOverrideKey(stateIndex, sourceRoom.key)]:
      nextSourceOperators,
    [getScheduleRoomOverrideKey(stateIndex, targetRoom.key)]:
      nextTargetOperators,
  };
}

function selectSchedulePreviewRoom({ roomKey, stateIndex }) {
  if (!roomKey) {
    return;
  }

  if (
    selectedSchedulePreviewRoomKey.value === roomKey &&
    activeSchedulePreviewStateIndex.value === stateIndex
  ) {
    selectedSchedulePreviewRoomKey.value = "";
    scheduleRoomEditorOperatorInput.value = "";
    return;
  }

  activeSchedulePreviewStateIndex.value = stateIndex;
  selectedSchedulePreviewRoomKey.value = roomKey;
  scheduleRoomEditorOperatorInput.value = "";
}

function getScheduleRoomEditorOperatorKey(operator) {
  const charId = String(operator?.charId || "").trim();
  if (charId) {
    return `id:${charId}`;
  }

  return `name:${String(operator?.name || "").trim()}`;
}

function addScheduleRoomEditorOperator(selectedOperator = null) {
  const room = activeSchedulePreviewRoom.value;
  const name = String(
    selectedOperator?.name || scheduleRoomEditorInputName.value,
  ).trim();
  if (!room || !name) {
    return;
  }

  const charId = String(
    selectedOperator?.charId || scheduleRoomEditorInputCharId.value,
  ).trim();
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

function reorderScheduleRoomEditorOperator({ fromIndex, toIndex } = {}) {
  const room = activeSchedulePreviewRoom.value;
  const operators = [...scheduleRoomEditorOperators.value];
  if (
    !room ||
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= operators.length ||
    toIndex >= operators.length ||
    fromIndex === toIndex
  ) {
    return;
  }

  const [operator] = operators.splice(fromIndex, 1);
  operators.splice(toIndex, 0, operator);
  setScheduleRoomOperatorOverride(
    room.key,
    activeSchedulePreviewStateIndex.value,
    operators,
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

  if (product === originalProduct) {
    delete nextProductOverrides[room.key];
    delete nextInvalidatedRoomKeys[room.key];
  } else {
    nextProductOverrides[room.key] = product;
    nextInvalidatedRoomKeys[room.key] = true;
  }

  scheduleRoomProductOverrides.value = nextProductOverrides;
  invalidatedScheduleRoomKeys.value = nextInvalidatedRoomKeys;
}

function resetSchedulePreviewRoom() {
  const room = activeSchedulePreviewRoom.value;
  if (!room) {
    return;
  }

  const nextProductOverrides = { ...scheduleRoomProductOverrides.value };
  const nextInvalidatedRoomKeys = { ...invalidatedScheduleRoomKeys.value };
  const nextOperatorOverrides = { ...scheduleRoomOperatorOverrides.value };
  const nextMaaSettingOverrides = {
    ...scheduleRoomMaaSettingOverrides.value,
  };
  delete nextProductOverrides[room.key];
  delete nextInvalidatedRoomKeys[room.key];
  for (const key of Object.keys(nextOperatorOverrides)) {
    if (key.endsWith(`:${room.key}`)) {
      delete nextOperatorOverrides[key];
    }
  }
  delete nextMaaSettingOverrides[
    getScheduleRoomOverrideKey(activeSchedulePreviewStateIndex.value, room.key)
  ];

  scheduleRoomProductOverrides.value = nextProductOverrides;
  invalidatedScheduleRoomKeys.value = nextInvalidatedRoomKeys;
  scheduleRoomOperatorOverrides.value = nextOperatorOverrides;
  scheduleRoomMaaSettingOverrides.value = nextMaaSettingOverrides;
}

function selectScheduleDroneTarget(payload) {
  const isPayloadObject = payload && typeof payload === "object";
  const index = Number.isInteger(Number(payload?.index))
    ? Number(payload.index)
    : activeSchedulePreviewStateIndex.value;
  const value = String(
    isPayloadObject ? payload.target || "" : payload || "",
  ).trim();

  if (
    !getScheduleDroneTargetOptionsForState(index).some(
      (option) => option.value === value && !option.disabled,
    )
  ) {
    return;
  }

  const drone = normalizeScheduleDroneSettings(
    scheduleExecutionSettings.shifts[index]?.drone,
  );
  if (drone.target === value && !drone.disabled) {
    updateSchedulePreviewShift({
      index,
      drone: {
        ...drone,
        target: "",
        pinned: false,
        disabled: true,
        order: "retain",
      },
    });
    return;
  }

  updateSchedulePreviewShift({
    index,
    drone: {
      ...drone,
      target: value,
      pinned: true,
      disabled: false,
      order: drone.order === "retain" ? "pre" : drone.order,
    },
  });
}

function updateScheduleDroneOrder({ index, order }) {
  const normalizedIndex = Number(index);
  if (
    !Number.isInteger(normalizedIndex) ||
    !scheduleExecutionSettings.shifts[normalizedIndex]
  ) {
    return;
  }

  const drone = normalizeScheduleDroneSettings(
    scheduleExecutionSettings.shifts[normalizedIndex]?.drone,
  );
  updateSchedulePreviewShift({
    index: normalizedIndex,
    drone: {
      ...drone,
      order: ["post", "retain"].includes(order) ? order : "pre",
    },
  });
}

function normalizeScheduleRoomOperatorClipboard(operators, expectedSlots) {
  const normalized = (operators || [])
    .map((operator) => {
      const charId = String(operator?.charId || "").trim();
      const name = String(
        operator?.name || operatorTableV2?.[charId]?.name || "",
      ).trim();
      return name ? { charId, name } : null;
    })
    .filter(Boolean);

  return Number.isInteger(Number(expectedSlots)) && Number(expectedSlots) > 0
    ? normalized.slice(0, Number(expectedSlots))
    : normalized;
}

function copyScheduleRoomEditorOperators() {
  copiedScheduleRoomOperators.value = normalizeScheduleRoomOperatorClipboard(
    scheduleRoomEditorOperators.value,
    activeSchedulePreviewRoom.value?.expectedSlots,
  );
}

function pasteScheduleRoomEditorOperators() {
  const room = activeSchedulePreviewRoom.value;
  if (!room || !Array.isArray(copiedScheduleRoomOperators.value)) {
    return;
  }

  setScheduleRoomOperatorOverride(
    room.key,
    activeSchedulePreviewStateIndex.value,
    normalizeScheduleRoomOperatorClipboard(
      copiedScheduleRoomOperators.value,
      room.expectedSlots,
    ),
  );
}

function copySchedulePreviewShift() {
  const state =
    riicSchedulePreview.value?.states?.[
      activeSchedulePreviewStateIndex.value
    ];
  if (!state) {
    return;
  }

  copiedScheduleShiftOperators.value = Object.fromEntries(
    (state.rooms || []).map((room) => [
      room.key,
      normalizeScheduleRoomOperatorClipboard(room.operators, room.expectedSlots),
    ]),
  );
}

function pasteSchedulePreviewShift() {
  const state =
    riicSchedulePreview.value?.states?.[
      activeSchedulePreviewStateIndex.value
    ];
  if (!state || !copiedScheduleShiftOperators.value) {
    return;
  }

  const stateIndex = activeSchedulePreviewStateIndex.value;
  const nextOverrides = { ...scheduleRoomOperatorOverrides.value };
  for (const room of state.rooms || []) {
    if (
      !Object.prototype.hasOwnProperty.call(
        copiedScheduleShiftOperators.value,
        room.key,
      )
    ) {
      continue;
    }

    nextOverrides[getScheduleRoomOverrideKey(stateIndex, room.key)] =
      normalizeScheduleRoomOperatorClipboard(
        copiedScheduleShiftOperators.value[room.key],
        room.expectedSlots,
      );
  }
  scheduleRoomOperatorOverrides.value = nextOverrides;
}

function updateSchedulePreviewShift({ index, ...patch }) {
  if (
    !Number.isInteger(index) ||
    !scheduleExecutionSettings.shifts[index]
  ) {
    return;
  }

  const currentShift = scheduleExecutionSettings.shifts[index];
  const nextShifts = scheduleExecutionSettings.shifts.map((shift) => ({ ...shift }));
  nextShifts[index] = {
    ...currentShift,
    ...(typeof patch.time === "string" ? { time: patch.time } : {}),
    ...(typeof patch.periodStart === "string"
      ? { periodStart: patch.periodStart, periodCustomized: true }
      : {}),
    ...(typeof patch.periodEnd === "string"
      ? { periodEnd: patch.periodEnd, periodCustomized: true }
      : {}),
    ...(patch.periodCustomized === true ? { periodCustomized: true } : {}),
    ...(typeof patch.name === "string" ? { name: patch.name } : {}),
    ...(typeof patch.description === "string"
      ? { description: patch.description }
      : {}),
    ...(typeof patch.descriptionPost === "string"
      ? { descriptionPost: patch.descriptionPost }
      : {}),
    ...(patch.fiammetta && typeof patch.fiammetta === "object"
      ? { fiammetta: normalizeScheduleFiammettaSettings(patch.fiammetta) }
      : {}),
    ...(patch.drone && typeof patch.drone === "object"
      ? { drone: normalizeScheduleDroneSettings(patch.drone) }
      : {}),
  };
  if (typeof patch.time === "string") {
    nextShifts.forEach((shift, shiftIndex) => {
      if (shift.periodCustomized === true) {
        return;
      }
      Object.assign(shift, getDefaultScheduleShiftPeriod(nextShifts, shiftIndex));
    });
  }
  scheduleExecutionSettings.shifts = nextShifts;
}

function updateScheduleExportInfo(nextExportInfo) {
  scheduleExecutionSettings.exportInfo =
    normalizeScheduleExportInfo(nextExportInfo);
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
  const closureCalculation =
    candidate?.closureCalculation &&
    candidate.closureCalculation.type === "closureSpecialOrder"
      ? candidate.closureCalculation
      : null;

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
    closureCalculation,
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

function getRiicLayer3ProductLabel(product, roomType) {
  if (product === "orundum") {
    return roomType === "trading" ? "合成玉" : "源石碎片";
  }

  return (
    {
      lmd: "龙门币",
      gold: "赤金",
      experience: "经验书",
    }[product] || ""
  );
}

function formatRiicLayer3FacilityCondition(condition) {
  const expectedCount = Number(condition?.count);
  const expectedProductKindCount = Number(condition?.productKindCount);
  const actualValue = Number(condition?.actualValue);
  const actualText = Number.isFinite(actualValue) ? actualValue : "?";

  if (condition?.kind === "powerCount") {
    return `发电站${expectedCount} 座（当前 ${actualText}）`;
  }
  if (condition?.kind === "tradingCount") {
    return `贸易站${expectedCount} 座（当前 ${actualText}）`;
  }
  if (condition?.kind === "goldManufactureCount") {
    return `赤金制造站 ${expectedCount} 座（当前 ${actualText}）`;
  }
  if (condition?.kind === "manufactureProductKindCount") {
    return `制造产物${expectedProductKindCount} 类（当前 ${actualText}）`;
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
    const productLabel = getRiicLayer3ProductLabel(
      condition?.product,
      condition?.facilityType,
    );
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
  const productLabel = getRiicLayer3ProductLabel(
    effect?.product,
    effect?.roomType,
  );
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
    details.push(`房间优先级${formatRiicLayer3SignedValue(roomPriority)}`);
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
      title: `自动安排 ${controlState.operatorIds.length} 个功能位，留空${controlState.emptySlotCount} 格`,
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
    return "同步干员数据后，即可组装完整候选排班表";
  }
  if (state?.status === "catalogLoading") {
    return "正在载入所选设施组的固定候选列表需要";
  }
  if (state?.status === "waiting") {
    if (
      (state?.blockedGroups || []).some(
        (group) => group.reason === "insufficient",
      )
    ) {
      return "当前干员数量不足以补满控制中枢两班需要";
    }
    return labels
      ? `请先完成以下房间组的人手组选择需要{labels}`
      : "请先完成房间组的人手组选择需要";
  }
  if (state?.status === "blocked") {
    if (
      (state?.blockedGroups || []).some(
        (group) => group.reason === "missingFallbackPreset",
      )
    ) {
      return labels
        ? `以下房间组缺少基础补位预设施{labels}`
        : "基础补位预设不完整需要";
    }
    return labels
      ? `这些房间组存在干员冲突：${labels}`
      : "当前候选无法组成一套不重复占用干员的排班表";
  }

  return "选择布局并准备房间组候选后，即可生成完整排班表";
}

const recommendationCard = computed(() => {
  return getLayoutCardByKey(recommendation.value?.cardKey);
});
const sklandOperatorSourceStatus = computed(() =>
  getOperatorSourceStatus(OPERATOR_SOURCE_KEYS.skland),
);
const manualOperatorSourceStatus = computed(() =>
  getOperatorSourceStatus(OPERATOR_SOURCE_KEYS.manual),
);
const customOperatorSourceStatuses = computed(() =>
  customOperatorSources.value.map((source) => ({
    source,
    status: getOperatorSourceStatus(source.id),
  })),
);

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

function getLayoutCardByKey(value) {
  return LAYOUT_CARD_META.find((card) => card.key === value) || null;
}

function getRoomProduct(room) {
  return room?.product || ROOM_CANDIDATE_PRODUCTS[room?.key] || "";
}

function getCustomLayoutRoomKey(facility, product) {
  if (facility === "trading") {
    return product === "orundum" ? "orundum-trading" : "lmd-trading";
  }

  if (facility === "manufacture") {
    if (product === "orundum") {
      return "orundum-manufacture";
    }

    return product === "gold" ? "gold-manufacture" : "experience-manufacture";
  }

  return "power";
}

function getCustomLayoutRoomLabel(facility, product) {
  const option = (ROOM_PRODUCT_OPTIONS[facility] || []).find(
    (item) => item.value === product,
  );
  return option?.label || SCHEDULE_ROOM_GROUP_META[facility]?.facilityLabel || "";
}

function getCustomStationMaxLevel(facility) {
  return facility === "dormitory" ? 5 : 3;
}

function normalizeCustomStationLevel(value, fallback = 1, facility) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return fallback;
  }

  return Math.min(
    getCustomStationMaxLevel(facility),
    Math.max(0, numeric),
  );
}

function getCustomStationSlotCount(facility, stationLevel) {
  if (Number(stationLevel) <= 0) {
    return 0;
  }

  if (facility === "power" || facility === "office" || facility === "processing") {
    return 1;
  }

  if (facility === "meeting" || facility === "training") {
    return 2;
  }

  if (facility === "dormitory") {
    return 5;
  }

  return stationLevel;
}

function createCustomStaticLayoutStations(facilityProfile) {
  const stationIndexesByFacility = {};

  return STATIC_SCHEDULE_ROOM_GROUPS.filter(
    (group) => group.key !== "control",
  ).flatMap((group) => {
    const stations = getRiicRoomStations({
      facilityProfile,
      roomKey: group.key,
      roomCount: group.count,
    });

    return Array.from(
      { length: Math.max(0, Number(group.count) || 0) },
      (_, index) => {
        const facility = group.key;
        const stationLevel = normalizeCustomStationLevel(
          stations[index]?.stationLevel,
          1,
          facility,
        );
        const stationIndex = (stationIndexesByFacility[facility] || 0) + 1;
        stationIndexesByFacility[facility] = stationIndex;

        return {
          id: `${facility}-${stationIndex}`,
          facility,
          stationIndex,
          product: ROOM_CANDIDATE_PRODUCTS[group.key] || "all",
          stationLevel,
          slotCount: getCustomStationSlotCount(facility, stationLevel),
        };
      },
      );
    });
}

function normalizeCustomLayoutStations(
  baseStations,
  storedStations,
) {
  const stationsById = new Map(
    (storedStations || [])
      .filter((station) => station?.id)
      .map((station) => [station.id, station]),
  );

  return (baseStations || []).map((baseStation, index) => {
    const storedStation =
      stationsById.get(baseStation.id) || storedStations?.[index] || {};
    const stationLevel = normalizeCustomStationLevel(
      storedStation.stationLevel,
      baseStation.stationLevel,
      baseStation.facility,
    );
    const isProductAllowed = (ROOM_PRODUCT_OPTIONS[baseStation.facility] || [])
      .some((option) => option.value === storedStation.product);

    return {
      ...baseStation,
      product: isProductAllowed ? storedStation.product : baseStation.product,
      stationLevel,
      slotCount: getCustomStationSlotCount(
        baseStation.facility,
        stationLevel,
      ),
    };
  });
}

function createCustomLayoutDraftFromPlan(plan) {
  const card = getLayoutCardByKey(plan?.cardKey);
  if (!card) {
    return {
      baseCardKey: "",
      stations: [],
    };
  }

  const facilityRequirement = normalizeRiicFacilityRequirement(
    card.layoutId,
    plan?.facilityRequirement,
  );
  const facilityProfile = getRiicFacilityProfile({
    layoutId: card.layoutId,
    cardKey: card.key,
    facilityRequirement,
  });
  const stationIndexesByFacility = {};

  return {
    baseCardKey: card.key,
    stations: (card.rooms || []).flatMap((room) => {
      const facility = getLayoutRoomFacility(room);
      const product = getRoomProduct(room) || "all";
      const roomStations = getRiicRoomStations({
        facilityProfile,
        roomKey: room.key,
        roomCount: room.count,
      });

      return Array.from(
        { length: Math.max(0, Number(room.count) || 0) },
        (_, index) => {
          const stationLevel = normalizeCustomStationLevel(
            roomStations[index]?.stationLevel,
            1,
            facility,
          );
          const stationIndex = (stationIndexesByFacility[facility] || 0) + 1;
          stationIndexesByFacility[facility] = stationIndex;

          return {
            id: `${facility}-${stationIndex}`,
            facility,
            stationIndex,
            product,
            stationLevel,
            slotCount: getCustomStationSlotCount(facility, stationLevel),
          };
        },
      );
    }),
    staticStations: createCustomStaticLayoutStations(facilityProfile),
  };
}

function normalizeCustomLayout(plan, value) {
  if (!Array.isArray(value?.stations)) {
    return null;
  }

  const baseLayout = createCustomLayoutDraftFromPlan(plan);

  return {
    baseCardKey: baseLayout.baseCardKey,
    stations: normalizeCustomLayoutStations(
      baseLayout.stations,
      value.stations,
    ),
    staticStations: normalizeCustomLayoutStations(
      baseLayout.staticStations,
      value.staticStations,
    ),
  };
}

function getCustomLayoutRooms(customLayout) {
  const rooms = new Map();

  for (const sourceStation of customLayout?.stations || []) {
    const facility = sourceStation?.facility;
    if (!["trading", "manufacture", "power"].includes(facility)) {
      continue;
    }
    const stationLevel = normalizeCustomStationLevel(
      sourceStation?.stationLevel,
      0,
      facility,
    );
    if (stationLevel <= 0) {
      continue;
    }

    const product =
      facility === "power" ? "all" : sourceStation?.product || "";
    const roomKey = getCustomLayoutRoomKey(facility, product);
    const currentRoom = rooms.get(roomKey) || {
      key: roomKey,
      label: getCustomLayoutRoomLabel(facility, product),
      facility,
      product,
      count: 0,
      stations: [],
    };
    currentRoom.count += 1;
    currentRoom.stations.push({
      stationLevel,
      slotCount: getCustomStationSlotCount(facility, stationLevel),
    });
    rooms.set(roomKey, currentRoom);
  }

  return [...rooms.values()];
}

function getActiveLayoutCard() {
  const card = getLayoutCardByKey(confirmedLayoutPlan.value?.cardKey);
  const customLayout = confirmedLayoutPlan.value?.customLayout;

  if (!card || !customLayout) {
    return card;
  }

  return {
    ...card,
    rooms: getCustomLayoutRooms(customLayout),
  };
}

function getActiveRoomStations(room) {
  if (Array.isArray(room?.stations)) {
    return room.stations.map((station) => {
      const stationLevel = normalizeCustomStationLevel(
        station?.stationLevel,
        1,
        room?.facility,
      );
      return {
        stationLevel,
        slotCount: getCustomStationSlotCount(room?.facility, stationLevel),
      };
    });
  }

  return getRiicRoomStations({
    facilityProfile: activeFacilityProfile.value,
    roomKey: room?.key,
    roomCount: room?.count,
  });
}

function getActiveStaticRoomStations({ roomKey, roomCount, key, count }) {
  const resolvedRoomKey = roomKey || key;
  const resolvedRoomCount = Number(roomCount ?? count) || 0;
  const staticStations = confirmedLayoutPlan.value?.customLayout?.staticStations;
  const matchingStations = (staticStations || []).filter(
    (station) => station.facility === resolvedRoomKey,
  );

  if (matchingStations.length === resolvedRoomCount) {
    return matchingStations.map((station) => {
      const stationLevel = normalizeCustomStationLevel(
        station.stationLevel,
        1,
        resolvedRoomKey,
      );
      return {
        stationLevel,
        slotCount: getCustomStationSlotCount(resolvedRoomKey, stationLevel),
      };
    });
  }

  return getRiicRoomStations({
    facilityProfile: activeFacilityProfile.value,
    roomKey: resolvedRoomKey,
    roomCount: resolvedRoomCount,
  });
}

function toggleCustomLayoutEditor() {
  if (customLayoutEditorOpen.value) {
    customLayoutEditorOpen.value = false;
    return;
  }

  const plan = confirmedLayoutPlan.value;
  if (!plan) {
    return;
  }

  customLayoutDraft.value =
    normalizeCustomLayout(plan, plan.customLayout) ||
    createCustomLayoutDraftFromPlan(plan);
  customLayoutResetSnapshot.value = normalizeCustomLayout(
    plan,
    customLayoutDraft.value,
  );
  customLayoutEditorOpen.value = true;
}

function updateCustomLayoutStationLevel({ id, level }) {
  const draft = customLayoutDraft.value;
  if (
    ![...(draft?.stations || []), ...(draft?.staticStations || [])].some(
      (station) => station.id === id,
    )
  ) {
    return;
  }

  const stationLevel = normalizeCustomStationLevel(
    level,
    1,
    draft.stations.find((station) => station.id === id)?.facility ||
      draft.staticStations?.find((station) => station.id === id)?.facility,
  );
  customLayoutDraft.value = {
    ...draft,
    stations: draft.stations.map((station) =>
      station.id === id
        ? {
            ...station,
            stationLevel,
            slotCount: getCustomStationSlotCount(
              station.facility,
              stationLevel,
            ),
          }
        : station,
    ),
    staticStations: (draft.staticStations || []).map((station) =>
      station.id === id
        ? {
            ...station,
            stationLevel,
            slotCount: getCustomStationSlotCount(
              station.facility,
              stationLevel,
            ),
          }
        : station,
    ),
  };
}

function updateCustomLayoutStationProduct({ id, product }) {
  const draft = customLayoutDraft.value;
  const currentStation = draft?.stations?.find((station) => station.id === id);
  const isProductAllowed = (ROOM_PRODUCT_OPTIONS[currentStation?.facility] || [])
    .some((option) => option.value === product);

  if (!currentStation || !isProductAllowed) {
    return;
  }

  customLayoutDraft.value = {
    ...draft,
    stations: draft.stations.map((station) =>
      station.id === id
        ? {
            ...station,
            product,
          }
        : station,
    ),
    staticStations: draft.staticStations || [],
  };
}

function applyCustomLayout() {
  const plan = confirmedLayoutPlan.value;
  const customLayout = normalizeCustomLayout(plan, customLayoutDraft.value);

  if (
    !plan ||
    !customLayout?.stations?.length ||
    customLayoutPowerSummary.value.overloaded
  ) {
    return;
  }

  confirmedLayoutPlan.value = {
    ...plan,
    customLayout,
  };
  customLayoutResetSnapshot.value = normalizeCustomLayout(plan, customLayout);
  activeScheduleRoomGroupKey.value = "";
  clearSelectedRoomGroupTeamCandidates();
  recommendationPanelOpen.value = false;
}

function resetCustomLayout() {
  const plan = confirmedLayoutPlan.value;
  if (!plan || !customLayoutResetSnapshot.value) {
    return;
  }

  customLayoutDraft.value = normalizeCustomLayout(
    plan,
    customLayoutResetSnapshot.value,
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
  customLayoutDraft.value = null;
  customLayoutResetSnapshot.value = null;
  customLayoutEditorOpen.value = false;
}

function normalizeLayoutEntry(value, savedAnswers) {
  const savedCard = getLayoutCardByKey(value);
  if (savedCard) {
    return savedCard.key;
  }

  if (value === "recommend") {
    return ANSWER_FIELDS.some((field) => Boolean(savedAnswers?.[field.key]))
      ? "recommend"
      : null;
  }

  return null;
}

function normalizeConfirmedLayoutPlan(value) {
  const card = getLayoutCardByKey(value?.cardKey);

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
    customLayout: normalizeCustomLayout(
      {
        cardKey: card.key,
        layoutId: card.layoutId,
        facilityRequirement: value.facilityRequirement,
      },
      value.customLayout,
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

function normalizeOperatorIdsByTeamIndex(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([teamIndex, operatorIds]) => {
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
    }),
  );
}

function normalizeControlCenterManualOverrides(value) {
  const removedOperatorIds = [
    ...new Set(
      (value?.removedOperatorIds || [])
        .map((charId) => String(charId || "").trim())
        .filter(Boolean),
    ),
  ];
  const removedOperatorIdsByTeamIndex = normalizeOperatorIdsByTeamIndex(
    value?.removedOperatorIdsByTeamIndex,
  );
  const addedOperatorIdsByTeamIndex = normalizeOperatorIdsByTeamIndex(
    value?.addedOperatorIdsByTeamIndex,
  );

  return {
    removedOperatorIds,
    removedOperatorIdsByTeamIndex,
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

function normalizeSavedScheduleRoomMaaSettingOverrides(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([key, settings]) => {
      if (typeof key !== "string" || !key || !settings) {
        return [];
      }

      const normalized = Object.fromEntries(
        ["sort", "autofill", "skip"].flatMap((field) =>
          typeof settings[field] === "boolean"
            ? [[field, settings[field]]]
            : [],
        ),
      );
      return Object.keys(normalized).length > 0 ? [[key, normalized]] : [];
    }),
  );
}

function normalizeSavedScheduleRoomMaaIndexAssignments(value) {
  return Object.fromEntries(
    Object.entries(value || {}).flatMap(([roomKey, roomIndex]) => {
      const normalizedRoomKey = String(roomKey || "").trim();
      const normalizedRoomIndex = Number(roomIndex);
      return normalizedRoomKey &&
        Number.isInteger(normalizedRoomIndex) &&
        normalizedRoomIndex >= 1
        ? [[normalizedRoomKey, normalizedRoomIndex]]
        : [];
    }),
  );
}

function createSetAssessmentScheduleSnapshot() {
  const preview = riicSchedulePreview.value;
  if (!Array.isArray(preview?.states) || preview.states.length === 0) {
    return null;
  }

  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    states: preview.states.map((state) => ({
      index: Number(state?.index || 0),
      name:
        String(schedulePreviewShifts.value?.[state?.index]?.name || "").trim() ||
        `班段 ${Number(state?.index || 0) + 1}`,
      startHour: Number(state?.startHour || 0),
      durationHours: Number(state?.durationHours || 0),
      rooms: (state?.rooms || []).map((room) => ({
        key: String(room?.key || ""),
        label: String(room?.label || room?.key || ""),
        facility: String(room?.facility || ""),
        product: String(room?.product || ""),
        stationLevel: Number.isInteger(Number(room?.stationLevel))
          ? Number(room.stationLevel)
          : null,
        expectedSlots: Number.isInteger(Number(room?.expectedSlots))
          ? Number(room.expectedSlots)
          : null,
        isStatic: room?.isStatic === true,
        operators: (room?.operators || []).flatMap((operator) => {
          const charId = String(operator?.charId || "").trim();
          return charId
            ? [
                {
                  charId,
                  name: String(operator?.name || charId).trim(),
                },
              ]
            : [];
        }),
      })),
    })),
  };
}

function createWizardStateSnapshot() {
  return createRiicWorkspaceSnapshot({
    operatorRosterSignature: getCurrentOperatorRosterSignature(),
    currentStep: currentStep.value,
    sourceConfig: {
      answers: Object.fromEntries(
        ANSWER_FIELDS.map((field) => [field.key, answers[field.key]]),
      ),
      twoShiftRotationMode: twoShiftRotationMode.value,
      treatUnderleveledOperatorsAsQualified:
        treatUnderleveledOperatorsAsQualified.value,
      idealTrainingRaritySelection: idealTrainingRaritySelection.value,
      fiammettaRecoverySettings: fiammettaRecoverySettings.value,
    },
    layoutConfig: {
      layoutEntry: layoutEntry.value,
      planningMode: planningMode.value,
      selectedLayoutId: selectedLayoutId.value,
      confirmedLayoutPlan: confirmedLayoutPlan.value,
      controlCenterRoleSettings: controlCenterRoleSettings.value,
      controlCenterManualOverrides: controlCenterManualOverrides.value,
      controlCenterLateFillExcludedOperatorIdsByTeamIndex:
        controlCenterLateFillExcludedOperatorIdsByTeamIndex.value,
    },
    generatedState: {
      selectedRoomGroupTeamCandidateKeys:
        selectedRoomGroupTeamCandidateKeys.value,
      roomGroupFallbackQueueStates: roomGroupFallbackQueueStates.value,
      lastAutomaticGenerationTriggerKey:
        lastAutomaticGenerationTriggerKey.value,
    },
    editState: {
      scheduleExecutionSettings: createScheduleExecutionSettingsSnapshot(),
      scheduleRoomOperatorOverrides: scheduleRoomOperatorOverrides.value,
      scheduleRoomProductOverrides: scheduleRoomProductOverrides.value,
      invalidatedScheduleRoomKeys: invalidatedScheduleRoomKeys.value,
      scheduleRoomMaaSettingOverrides: scheduleRoomMaaSettingOverrides.value,
      scheduleRoomMaaIndexAssignments: scheduleRoomMaaIndexAssignments.value,
    },
    assessmentSchedule: createSetAssessmentScheduleSnapshot(),
  });
}

function getCurrentOperatorRosterSignature() {
  return (ownedOperators.value || [])
    .map(
      (operator) =>
        `${operator?.charId || operator?.name || ""}:${
          operator?.elite ?? 0
        }:${operator?.level ?? ""}:${operator?.potential ?? 0}`,
    )
    .sort()
    .join("|");
}

function createInitialWorkspaceFromCurrent() {
  const defaultPlan = createDefaultConfirmedLayoutPlan();
  return createRiicWorkspaceSnapshot({
    sourceConfig: {
      answers: { ...DEFAULT_ANSWERS },
      twoShiftRotationMode: twoShiftRotationMode.value,
      treatUnderleveledOperatorsAsQualified:
        treatUnderleveledOperatorsAsQualified.value,
      fiammettaRecoverySettings: fiammettaRecoverySettings.value,
    },
    layoutConfig: {
      layoutEntry: DEFAULT_LAYOUT_SELECTION.cardKey,
      planningMode: "manual",
      selectedLayoutId: DEFAULT_LAYOUT_SELECTION.layoutId,
      confirmedLayoutPlan: defaultPlan,
      controlCenterRoleSettings: { officeEnabled: false },
      controlCenterManualOverrides: normalizeControlCenterManualOverrides(),
      controlCenterLateFillExcludedOperatorIdsByTeamIndex: {},
    },
    generatedState: {},
    editState: {
      scheduleExecutionSettings: {
        shifts: [],
        orundumCraftMaterial: "orirock",
        includeTrainingRoom: false,
        exportInfo: normalizeScheduleExportInfo(),
      },
    },
  });
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
  const workspace = normalizeRiicWorkspaceSnapshot(parsedDraft);
  if (!workspace) {
    return false;
  }

  const sourceConfig = workspace.sourceConfig || {};
  const layoutConfig = workspace.layoutConfig || {};
  const generatedState = workspace.generatedState || {};
  const editState = workspace.editState || {};
  const savedAnswersValue = sourceConfig.answers;
  if (!savedAnswersValue) {
    return false;
  }

  const savedAnswers = normalizeSavedAnswers(savedAnswersValue);
  const maxAvailableStep = getMaxAvailableStep(savedAnswers);
  const savedStep = Number.isInteger(workspace.currentStep)
    ? workspace.currentStep
    : 0;

  Object.assign(answers, savedAnswers);
  currentStep.value = Math.min(
    Math.max(savedStep, 0),
    Math.min(maxAvailableStep, steps.length - 1),
  );
  layoutEntry.value = normalizeLayoutEntry(
    layoutConfig.layoutEntry,
    savedAnswers,
  );
  planningMode.value =
    layoutEntry.value === "recommend"
      ? "recommend"
      : layoutEntry.value
      ? "manual"
      : null;
  selectedLayoutId.value = LAYOUT_CARD_META.some(
    (card) => card.layoutId === layoutConfig.selectedLayoutId,
  )
    ? layoutConfig.selectedLayoutId
    : "";
  if (layoutEntry.value !== "recommend") {
    selectedLayoutId.value =
      getLayoutCardByKey(layoutEntry.value)?.layoutId || "";
  }
  confirmedLayoutPlan.value = normalizeConfirmedLayoutPlan(
    layoutConfig.confirmedLayoutPlan,
  );
  twoShiftRotationMode.value =
    normalizeTwoShiftRotationMode(sourceConfig.twoShiftRotationMode);
  treatUnderleveledOperatorsAsQualified.value =
    sourceConfig.treatUnderleveledOperatorsAsQualified === true;
  idealTrainingRaritySelection.value =
    normalizeRiicIdealTrainingRaritySelection(
      sourceConfig.idealTrainingRaritySelection,
    );
  selectedRoomGroupTeamCandidateKeys.value =
    normalizeSavedRoomGroupTeamCandidateKeys(
      generatedState.selectedRoomGroupTeamCandidateKeys,
    );
  controlCenterRoleSettings.value =
    normalizeControlCenterRoleSettings(layoutConfig.controlCenterRoleSettings);
  controlCenterManualOverrides.value =
    normalizeControlCenterManualOverrides(
      layoutConfig.controlCenterManualOverrides,
    );
  controlCenterLateFillExcludedOperatorIdsByTeamIndex.value =
    normalizeOperatorIdsByTeamIndex(
      layoutConfig.controlCenterLateFillExcludedOperatorIdsByTeamIndex,
    );
  fiammettaRecoverySettings.value =
    normalizeFiammettaRecoverySettings(sourceConfig.fiammettaRecoverySettings);
  roomGroupFallbackQueueStates.value =
    normalizeSavedRoomGroupFallbackQueueStates(
      generatedState.roomGroupFallbackQueueStates,
    );
  const savedExecutionSettings = normalizeScheduleExecutionSettings(
    editState.scheduleExecutionSettings,
    confirmedLayoutPlan.value?.shiftMode,
    twoShiftRotationMode.value,
  );
  scheduleExecutionSettings.shifts = savedExecutionSettings.shifts;
  scheduleExecutionSettings.orundumCraftMaterial =
    savedExecutionSettings.orundumCraftMaterial;
  scheduleExecutionSettings.includeTrainingRoom =
    savedExecutionSettings.includeTrainingRoom;
  scheduleExecutionSettings.exportInfo = savedExecutionSettings.exportInfo;
  scheduleRoomOperatorOverrides.value =
    normalizeSavedScheduleRoomOperatorOverrides(
      editState.scheduleRoomOperatorOverrides,
    );
  scheduleRoomProductOverrides.value =
    normalizeSavedScheduleRoomProductOverrides(
      editState.scheduleRoomProductOverrides,
    );
  invalidatedScheduleRoomKeys.value =
    normalizeSavedInvalidatedScheduleRoomKeys(
      editState.invalidatedScheduleRoomKeys,
    );
  scheduleRoomMaaSettingOverrides.value =
    normalizeSavedScheduleRoomMaaSettingOverrides(
      editState.scheduleRoomMaaSettingOverrides,
    );
  scheduleRoomMaaIndexAssignments.value =
    normalizeSavedScheduleRoomMaaIndexAssignments(
      editState.scheduleRoomMaaIndexAssignments,
    );
  lastAutomaticGenerationTriggerKey.value = String(
    generatedState.lastAutomaticGenerationTriggerKey || "",
  ).trim();
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

    return false;
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
    const nextWorkspace = createWizardStateSnapshot();
    workspaces[activeOperatorSource.value] = nextWorkspace;
    saveOperatorSourceWorkspaces(workspaces);
    hasSavedWizardState.value = true;
  } catch {
    // The generator remains usable when local storage is unavailable.
  }
}

function resetWorkflowCardCollapseStates() {
  workflowCardCollapseStates.value = Object.fromEntries(
    RIIC_WORKFLOW_CARD_IDS.map((cardId) => [cardId, false]),
  );
}

function loadWorkflowCardCollapseStates() {
  try {
    const raw = localStorage.getItem(RIIC_WORKFLOW_CARD_COLLAPSE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const savedStates = JSON.parse(raw);
    if (!savedStates || typeof savedStates !== "object") {
      return;
    }

    workflowCardCollapseStates.value = Object.fromEntries(
      RIIC_WORKFLOW_CARD_IDS.map((cardId) => [
        cardId,
        savedStates[cardId] === true,
      ]),
    );
  } catch {
    resetWorkflowCardCollapseStates();
  }
}

function isWorkflowCardCollapsed(cardId) {
  return workflowCardCollapseStates.value[cardId] === true;
}

function toggleWorkflowCardCollapse(cardId) {
  if (!RIIC_WORKFLOW_CARD_IDS.includes(cardId)) {
    return;
  }

  const nextStates = {
    ...workflowCardCollapseStates.value,
    [cardId]: !workflowCardCollapseStates.value[cardId],
  };
  workflowCardCollapseStates.value = nextStates;

  try {
    localStorage.setItem(
      RIIC_WORKFLOW_CARD_COLLAPSE_STORAGE_KEY,
      JSON.stringify(nextStates),
    );
  } catch {
    // The current view can still fold normally when local storage is unavailable.
  }
}

loadWorkflowCardCollapseStates();

function selectOption(key, value) {
  if (key === "shiftMode") {
    selectLayoutShift(value);
    return;
  }

  answers[key] = value;
}

function selectLayoutEntry(value) {
  const card = getLayoutCardByKey(value);

  if (
    value !== "recommend" &&
    !card
  ) {
    return;
  }

  layoutEntry.value = value === "recommend" ? value : card.key;
  planningMode.value = value === "recommend" ? "recommend" : "manual";
  resetTrainingImpactState();
  if (value !== "recommend") {
    selectedLayoutId.value = card.layoutId;
    confirmedLayoutPlan.value = null;
    customLayoutDraft.value = null;
    customLayoutResetSnapshot.value = null;
    customLayoutEditorOpen.value = false;
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
    resetTrainingImpactState();
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

function clearSelectedRoomGroupTeamCandidates({
  preserveExecutionSettings = false,
} = {}) {
  selectedRoomGroupTeamCandidateKeys.value = {};
  roomGroupFallbackQueueStates.value = {};
  automaticControlCenterReconciliationState.value = null;
  if (preserveExecutionSettings) {
    clearSchedulePreviewRoomEdits();
    return;
  }

  resetScheduleExecutionSettings();
}

function resetGeneratedScheduleState({
  suppressCurrentAutomaticGeneration = false,
} = {}) {
  resetTrainingImpactState();
  cancelTrainingRecommendation();
  controlCenterRoleSettings.value = { officeEnabled: false };
  controlCenterManualOverrides.value = normalizeControlCenterManualOverrides();
  controlCenterLateFillExcludedOperatorIdsByTeamIndex.value = {};
  riicAutomaticGenerationDebugState.value = null;
  clearSelectedRoomGroupTeamCandidates();
  lastAutomaticGenerationTriggerKey.value =
    suppressCurrentAutomaticGeneration
      ? automaticGenerationTriggerKey.value
      : "";
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
    confirmedLayoutPlan.value?.shiftMode === shiftMode &&
    !confirmedLayoutPlan.value?.customLayout
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
  customLayoutDraft.value = null;
  customLayoutResetSnapshot.value = null;
  customLayoutEditorOpen.value = false;
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
  controlCenterLateFillExcludedOperatorIdsByTeamIndex.value = {};
  fiammettaRecoverySettings.value = normalizeFiammettaRecoverySettings();
  lastAutomaticGenerationTriggerKey.value = "";
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
    localStorage.removeItem(RIIC_OPERATOR_WORKSPACES_STORAGE_KEY);
  } catch {
    cleared = false;
  }

  try {
    localStorage.removeItem(RIIC_WORKFLOW_CARD_COLLAPSE_STORAGE_KEY);
  } catch {
    cleared = false;
  }

  resetWorkflowCardCollapseStates();
  Object.assign(answers, DEFAULT_ANSWERS);
  currentStep.value = 0;
  applyDefaultLayoutSelection();
  twoShiftRotationMode.value = "maa";
  treatUnderleveledOperatorsAsQualified.value = false;
  idealTrainingRaritySelection.value =
    normalizeRiicIdealTrainingRaritySelection();
  controlCenterRoleSettings.value = { officeEnabled: false };
  controlCenterManualOverrides.value = normalizeControlCenterManualOverrides();
  controlCenterLateFillExcludedOperatorIdsByTeamIndex.value = {};
  fiammettaRecoverySettings.value = normalizeFiammettaRecoverySettings();
  lastAutomaticGenerationTriggerKey.value = "";
  clearSelectedRoomGroupTeamCandidates();
  recommendationPanelOpen.value = false;
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

function formatTrainingRequirement(requirement) {
  const currentElite = Number(requirement?.current?.elite || 0);
  const currentLevel = Number(requirement?.current?.level || 1);
  const requiredElite = Number(requirement?.required?.elite || 0);
  const requiredLevel = Number(requirement?.required?.level || 1);

  return `精英 ${currentElite} Lv.${currentLevel} → 精英 ${requiredElite} Lv.${requiredLevel}`;
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
  if (!schedulePreviewExportCapturePanel.value || !riicSchedulePreview.value) {
    cMessage("当前没有可导出的排班表", "warn");
    return;
  }

  exportingImage.value = true;

  try {
    await document.fonts?.ready;
    const { default: html2canvas } = await import("html2canvas");
    const isDark = document.documentElement.classList.contains("dark");
    const captureWidth = Math.max(
      schedulePreviewExportCapturePanel.value.scrollWidth,
      720,
    );
    const canvas = await html2canvas(schedulePreviewExportCapturePanel.value, {
      backgroundColor: isDark ? "#17191d" : "#ffffff",
      scale: 2,
      useCORS: true,
      width: captureWidth,
      windowWidth: captureWidth,
      onclone(clonedDocument) {
        const clonedPanel = clonedDocument.querySelector(
          "[data-riic-export-preview-capture]",
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
          clonedPanel.style.setProperty(
            "--riic-export-border",
            isDark ? "#b6b6b6" : "#d7d7d7",
          );
          clonedPanel.style.setProperty(
            "--riic-export-text",
            isDark ? "#e6e6e6" : "#191919",
          );
          clonedPanel
            .querySelectorAll(".riic-schedule-preview")
            .forEach((previewElement) =>
              previewElement.classList.add("export-capture"),
            );
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
    const schedule = prepareRiicMaaScheduleForExport(
      generatedMaaExportPreview.value.schedule,
      {
        includeTrainingRoom: scheduleExecutionSettings.includeTrainingRoom,
      },
    );
    const blob = new Blob(
      [JSON.stringify(schedule, null, 2)],
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
  const schedule = prepareRiicMaaScheduleForExport(
    generatedMaaExportPreview.value?.schedule,
    {
      includeTrainingRoom: scheduleExecutionSettings.includeTrainingRoom,
    },
  );
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
    twoShiftRotationMode,
    treatUnderleveledOperatorsAsQualified,
    controlCenterRoleSettings,
    controlCenterManualOverrides,
    controlCenterLateFillExcludedOperatorIdsByTeamIndex,
    fiammettaRecoverySettings,
    lastAutomaticGenerationTriggerKey,
    selectedRoomGroupTeamCandidateKeys,
    roomGroupFallbackQueueStates,
    () =>
      scheduleExecutionSettings.shifts
        .map(
          (shift) =>
            `${shift.name}|${shift.time}|${shift.description}|${shift.descriptionPost}|${JSON.stringify(shift.fiammetta || {})}|${JSON.stringify(shift.drone || {})}`,
        )
        .join("||"),
    () => JSON.stringify(scheduleExecutionSettings.exportInfo),
    () => scheduleExecutionSettings.orundumCraftMaterial,
    () => scheduleExecutionSettings.includeTrainingRoom,
    scheduleRoomOperatorOverrides,
    scheduleRoomProductOverrides,
    invalidatedScheduleRoomKeys,
    scheduleRoomMaaSettingOverrides,
    scheduleRoomMaaIndexAssignments,
  ],
  saveWizardState,
);

watch(riicSchedulePreview, (preview) => {
  if (storageReady.value) {
    saveWizardState();
  }
});

onMounted(async () => {
  loadOperatorSources();
  loadSavedWizardState();
  storageReady.value = true;
  await loadOwnedOperators();

  if (hasSavedWizardState.value) {
    saveWizardState();
    restoredWizardTrainingRecommendationPending = true;
    generateRestoredTrainingRecommendationIfReady();
  }
});

onBeforeUnmount(() => {
  automaticGenerationQueuedOptions = null;
  automaticGenerationRequestId += 1;
  automaticGenerationAbortController?.abort();
  trainingRecommendationAbortController?.abort();
  riicYieldEngineAbortController?.abort();
});
</script>

<template>
  <main class="riic-generator">
    <div class="workflow-shell">
      <section
        class="workflow-stage workflow-card layout-workflow-stage"
        :class="[
          `workflow-card-${layoutWorkflowCardState}`,
          { 'is-collapsed': isWorkflowCardCollapsed('layout') },
        ]"
      >
        <header class="workflow-card-heading">
          <div class="workflow-card-heading-copy">
            <button
              type="button"
              class="workflow-card-collapse-toggle"
              :aria-expanded="!isWorkflowCardCollapsed('layout')"
              title="折叠或展开布局规划"
              @click="toggleWorkflowCardCollapse('layout')"
            >
              <v-icon
                :icon="
                  isWorkflowCardCollapsed('layout')
                    ? 'mdi-chevron-right'
                    : 'mdi-chevron-down'
                "
                size="20"
              ></v-icon>
            </button>
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
          <div class="workflow-card-version">
            {{ RIIC_SCHEDULE_MODULE_VERSIONS.layout?.label }}
            {{ RIIC_SCHEDULE_MODULE_VERSIONS.layout?.version }}
          </div>
        </header>

        <Transition name="workflow-card-content">
          <div
            v-show="!isWorkflowCardCollapsed('layout')"
            class="workflow-card-content"
          >
            <div class="workflow-card-content-inner">
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
                :custom-layout-editor-open="customLayoutEditorOpen"
                :custom-layout-active="Boolean(confirmedLayoutPlan?.customLayout)"
                :custom-layout-resettable="Boolean(customLayoutResetSnapshot)"
                :custom-layout-stations="customLayoutEditorStations"
                :custom-layout-power-summary="customLayoutPowerSummary"
                :room-product-options="ROOM_PRODUCT_OPTIONS"
                @toggle-recommendation-panel="toggleRecommendationPanel"
                @select-recommendation-step="selectRecommendationStep"
                @update-answer="selectOption($event.key, $event.value)"
                @reset-recommendation-answers="resetRecommendationAnswers"
                @select-layout-shift="selectLayoutShift"
                @select-manual-schedule-option="selectManualScheduleOption"
                @toggle-custom-layout-editor="toggleCustomLayoutEditor"
                @change-custom-layout-station-level="
                  updateCustomLayoutStationLevel($event)
                "
                @change-custom-layout-station-product="
                  updateCustomLayoutStationProduct($event)
                "
                @apply-custom-layout="applyCustomLayout"
                @reset-custom-layout="resetCustomLayout"
              ></RiicLayoutChoicePanel>
            </div>
          </div>
        </Transition>

      </section>

      <section
        class="workflow-stage workflow-card schedule-generation-stage"
        :class="[
          `workflow-card-${scheduleGenerationWorkflowCardState}`,
          { 'is-collapsed': isWorkflowCardCollapsed('generation') },
        ]"
      >
        <div class="workflow-card-heading">
          <div class="workflow-card-heading-copy">
            <button
              type="button"
              class="workflow-card-collapse-toggle"
              :aria-expanded="!isWorkflowCardCollapsed('generation')"
              title="折叠或展开导入干员与生成排班表"
              @click="toggleWorkflowCardCollapse('generation')"
            >
              <v-icon
                :icon="
                  isWorkflowCardCollapsed('generation')
                    ? 'mdi-chevron-right'
                    : 'mdi-chevron-down'
                "
                size="20"
              ></v-icon>
            </button>
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
              请导入至少一份干员数据            </span>
          </div>
          <div class="workflow-card-version">
            <span>
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.data?.label }}
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.data?.version }}
            </span>
            <span>
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.team?.label }}
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.team?.version }}
            </span>
          </div>
        </div>
        <Transition name="workflow-card-content">
          <div
            v-show="!isWorkflowCardCollapsed('generation')"
            class="workflow-card-content"
          >
            <div class="workflow-card-content-inner">
        <Transition name="schedule-generation-running-notice">
          <div
            v-if="scheduleGenerationLoading"
            class="schedule-generation-running-notice"
            role="status"
            aria-live="polite"
          >
            <div
              v-if="automaticGenerationNoticeAvatarLoop.length > 0"
              class="schedule-generation-running-marquee"
              aria-hidden="true"
            >
              <div class="schedule-generation-running-avatar-track">
                <span
                  v-for="(operator, index) in automaticGenerationNoticeAvatarLoop"
                  :key="`${operator.charId}:${index}`"
                  class="schedule-generation-running-avatar"
                >
                  <span
                    class="sprite-avatar"
                    :class="`bg-${operator.charId}`"
                  ></span>
                </span>
              </div>
            </div>
            <span class="schedule-generation-running-icon">
              <v-progress-circular
                indeterminate
                size="28"
                width="3"
              ></v-progress-circular>
            </span>
            <div class="schedule-generation-running-copy">
              <strong>{{ scheduleGenerationLoadingTitle }}</strong>
              <span>{{ scheduleGenerationLoadingPhase }}</span>
            </div>
          </div>
        </Transition>
        <section class="schedule-generation-data-source-module">
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
          >
            <template
              v-if="manualOperatorEditorEnabled"
              #extra-source-choice
            >
              <RiicManualOperatorSourceChoice
                :status="manualOperatorSourceStatus"
                :loading="operatorSourceStates.manual?.loading"
                @open-editor="router.push('/riicdev/operator')"
                @select-source="
                  setActiveOperatorSource(OPERATOR_SOURCE_KEYS.manual, {
                    notify: true,
                  })
                "
              />
            </template>
          </RiicOperatorSourcePanel>
        </section>

        <section
          v-if="hasFiammetta || isLayoutPlanningReady"
          class="schedule-generation-settings-module"
        >
          <header class="schedule-generation-section-heading">
            <strong>设置</strong>
          </header>

          <RiicFiammettaRecoverySetting
            v-if="hasFiammetta && !isLayoutPlanningReady"
            v-model="fiammettaRecoverySettings"
            :has-fiammetta="hasFiammetta"
            :target-options="fiammettaTargetOptions"
            :custom-target-options="fiammettaCustomTargetOptions"
            :status="fiammettaRecoveryStatus"
          ></RiicFiammettaRecoverySetting>

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
          >
            <template v-if="hasFiammetta" #before-settings>
              <RiicFiammettaRecoverySetting
                v-model="fiammettaRecoverySettings"
                compact
                :has-fiammetta="hasFiammetta"
                :target-options="fiammettaTargetOptions"
                :custom-target-options="fiammettaCustomTargetOptions"
                :status="fiammettaRecoveryStatus"
              ></RiicFiammettaRecoverySetting>
            </template>
          </RiicScheduleSettingsPanel>
        </section>

        <section v-if="isLayoutPlanningReady" class="room-workbench">
          <header class="schedule-generation-section-heading">
            <strong>房间组</strong>
          </header>

          <RiicRoomGroupNavigator
            :selection-rows="roomGroupSelectionRows"
            :active-group-id="activeScheduleRoomGroup?.id || ''"
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
              :manual-overrides="controlCenterManualOverrides"
              :late-fill-excluded-operator-ids-by-team-index="
                controlCenterLateFillExcludedOperatorIdsByTeamIndex
              "
              :operators="controlCenterCandidateOperators"
              :idle-fill-operators="riicIdleFillOperators"
              :scenario-trials="
                riicControlCenterScenarioTrialState.scenarios
              "
              :operator-table="operatorTableV2"
              :fiammetta-recovery="fiammettaRecoveryConfig"
              :get-operator-skill-tooltip="getOperatorSkillTooltip"
              @save-adjustment="saveControlCenterAdjustment"
              @save-error="({ message }) => cMessage(message, 'error')"
            />
            <RiicRoomGroupStaffingPanel
              v-else
              :room-group="activeScheduleRoomGroup"
              :operator-table="operatorTableV2"
              :candidate-state="activeRoomGroupCandidateState"
              :get-operator-skill-tooltip="getOperatorSkillTooltip"
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

          <div class="room-workbench-actions">
            <button
              type="button"
              class="room-workbench-action room-workbench-action-large"
              @click="
                autoGeneratingSchedule
                  ? cancelAutomaticSchedule()
                  : regenerateSchedule()
              "
            >
              <v-icon
                :icon="
                  autoGeneratingSchedule
                    ? 'mdi-close-circle-outline'
                    : 'mdi-refresh'
                "
                size="16"
              ></v-icon>
              <span>{{
                autoGeneratingSchedule
                  ? "取消当前计算"
                  : "重新生成排班"
              }}</span>
            </button>
            <button
              type="button"
              class="room-workbench-action room-workbench-action-large room-workbench-action-deep"
              :disabled="autoGeneratingSchedule"
              @click="openDeepScheduleConfirmation"
            >
              <v-icon icon="mdi-calculator-variant-outline" size="16"></v-icon>
              <span>执行深度排班</span>
            </button>
          </div>

          <v-dialog
            v-model="deepScheduleConfirmationOpen"
            max-width="440"
          >
            <v-card>
              <v-card-title>执行深度排班</v-card-title>
              <v-card-text>
                深度排班会进行更多组合与补位计算。复杂干员表可能持续 30 秒以上，但页面仍可继续操作。继续执行吗？
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  variant="text"
                  @click="deepScheduleConfirmationOpen = false"
                >
                  取消
                </v-btn>
                <v-btn
                  color="warning"
                  variant="flat"
                  @click="confirmDeepSchedule"
                >
                  继续执行
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

        </section>

        <p v-else class="schedule-generation-empty-state">
          选择布局后即可生成排班表
        </p>
            </div>
          </div>
        </Transition>
      </section>

      <section
        class="workflow-stage workflow-card schedule-output-stage"
        :class="[
          `workflow-card-${scheduleOutputWorkflowCardState}`,
          { 'is-collapsed': isWorkflowCardCollapsed('output') },
        ]"
      >
        <div class="workflow-card-heading">
          <div class="workflow-card-heading-copy">
            <button
              type="button"
              class="workflow-card-collapse-toggle"
              :aria-expanded="!isWorkflowCardCollapsed('output')"
              title="折叠或展开排班表调整与导出"
              @click="toggleWorkflowCardCollapse('output')"
            >
              <v-icon
                :icon="
                  isWorkflowCardCollapsed('output')
                    ? 'mdi-chevron-right'
                    : 'mdi-chevron-down'
                "
                size="20"
              ></v-icon>
            </button>
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
          <div class="workflow-card-version">
            <span>
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.assembler?.label }}
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.assembler?.version }}
            </span>
            <span>
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.yield?.label }}
              {{ RIIC_SCHEDULE_MODULE_VERSIONS.yield?.version }}
            </span>
          </div>
        </div>

        <Transition name="workflow-card-content">
          <div
            v-show="!isWorkflowCardCollapsed('output')"
            class="workflow-card-content"
          >
            <div class="workflow-card-content-inner">
        <section
          class="assembled-schedule-panel"
          :class="`state-${assembledScheduleCandidateState.status}`"
        >
          <div
            v-if="displayedRiicSchedulePreview"
            class="assembled-schedule-content"
          >
            <div
              v-if="isOutputPreviewMode && riicSchedulePreview"
              class="schedule-output-document"
            >
              <header
                class="schedule-output-document-header"
                :class="`theme-${outputPreviewHeaderTheme.tone}`"
              >
                <div class="schedule-output-document-header-art" aria-hidden="true">
                  <img
                    v-for="image in outputPreviewHeaderTheme.images"
                    :key="image"
                    :src="image"
                    alt=""
                  />
                </div>
                <h3>{{ outputPreviewTitle }}</h3>
                <p
                  v-if="outputPreviewScheduleMeta"
                  class="schedule-output-document-meta"
                >
                  {{ outputPreviewScheduleMeta }}
                </p>
                <div class="schedule-output-document-statistics">
                  <div
                    v-if="outputPreviewYieldItems.length"
                    class="schedule-output-document-yield"
                  >
                    <span>预计日产</span>
                    <strong
                      v-for="item in outputPreviewYieldItems"
                      :key="item.resource"
                    >
                      <img
                        :src="item.image"
                        :alt="item.label"
                        class="schedule-output-document-yield-icon"
                      />
                      {{ formatOutputPreviewYield(item.value) }}
                    </strong>
                  </div>
                  <div
                    v-if="outputPreviewResourceNettingItems.length"
                    class="schedule-output-document-resource-netting"
                  >
                    <span>资源净值</span>
                  <strong
                    v-for="item in outputPreviewResourceNettingItems"
                    :key="item.key"
                    :title="item.label"
                  >
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.label"
                      class="schedule-output-document-resource-netting-icon"
                    />
                    <ItemImage
                      v-else-if="item.itemId"
                      :item-id="item.itemId"
                      :size="26"
                      :mobile-size="26"
                    ></ItemImage>
                      {{
                        formatOutputPreviewResourceNetting(
                          item.value,
                        )
                      }}
                    </strong>
                  </div>
                </div>
                <p
                  v-if="scheduleExecutionSettings.exportInfo.description"
                  class="schedule-output-document-description"
                >
                  {{ scheduleExecutionSettings.exportInfo.description }}
                </p>
              </header>
              <RiicSchedulePreview
                v-for="stateIndex in orderedSchedulePreviewStateIndexes"
                :key="`output-preview-${riicSchedulePreview.key}-${stateIndex}`"
                :preview="riicScheduleDisplayPreview"
                :active-state-index="stateIndex"
                :operator-table="operatorTableV2"
                :get-operator-skill-tooltip="getOperatorSkillTooltip"
                :shifts="schedulePreviewShifts"
                :drone-target="
                  schedulePreviewShifts[stateIndex]?.drone?.target || ''
                "
                :output-decorated="isOutputPreviewMode"
                :output-theme="outputPreviewHeaderTheme.tone"
                :show-room-efficiency="showCandidateDebugValues"
                :room-index-assignments="resolvedScheduleRoomMaaIndexAssignments"
                export-static
              ></RiicSchedulePreview>
                <footer class="schedule-output-document-footer">
                  <div class="schedule-output-document-brand">
                    <div class="schedule-output-document-brand-heading">
                      <strong>明日方舟一图流-排班表自动生成器</strong>
                      <p class="schedule-output-document-generated-at">
                        生成于 {{ outputPreviewGeneratedDate }}
                      </p>
                    </div>
                    <a
                      href="https://ark.yituliu.cn/tools/scheduleV3"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://ark.yituliu.cn/tools/scheduleV3
                    </a>
                    <span>Bilibili：逻辑元LogicalByte</span>
                  </div>
                  <div class="schedule-output-document-debug-info">
                    {{ outputPreviewDebugValues }}
                  </div>
                  <img
                    src="/image/website/QR/riic-schedule-generator.png"
                    alt="明日方舟一图流二维码"
                    class="schedule-output-document-qr"
                  />
              </footer>
            </div>
            <div v-else class="schedule-preview-capture">
              <RiicSchedulePreview
                :preview="displayedRiicSchedulePreview"
                :placeholder="!riicSchedulePreview"
                :active-state-index="activeSchedulePreviewStateIndex"
                :operator-table="operatorTableV2"
                :get-operator-skill-tooltip="getOperatorSkillTooltip"
                :selected-room-key="selectedSchedulePreviewRoomKey"
                :title="scheduleExecutionSettings.exportInfo.title"
                :default-title="getDefaultGeneratedScheduleTitle()"
                :shifts="schedulePreviewShifts"
                :drone-target="activeSchedulePreviewDrone.target"
                :show-room-efficiency="showCandidateDebugValues"
                :room-index-assignments="resolvedScheduleRoomMaaIndexAssignments"
                @update:active-state-index="
                  activeSchedulePreviewStateIndex = $event
                "
                @update:shift="updateSchedulePreviewShift"
                @update:title="
                  updateScheduleExportInfo({
                    ...scheduleExecutionSettings.exportInfo,
                    title: $event,
                  })
                "
                @edit-room="selectSchedulePreviewRoom"
                @move-operator="moveSchedulePreviewOperator"
                @select-drone-target="selectScheduleDroneTarget"
              >
                <template
                  v-if="
                    assembledScheduleCandidateState.status === 'ready' &&
                    riicSchedulePreview &&
                    hasFiammetta &&
                    schedulePreviewShifts[activeSchedulePreviewStateIndex]
                  "
                  #schedule-auxiliary
                >
                  <RiicScheduleFiammettaSettings
                    :fiammetta="
                      schedulePreviewShifts[activeSchedulePreviewStateIndex]
                        ?.fiammetta
                    "
                    :target-options="fiammettaTargetOptions"
                    @update="
                      updateSchedulePreviewShift({
                        index: activeSchedulePreviewStateIndex,
                        fiammetta: $event,
                      })
                    "
                  ></RiicScheduleFiammettaSettings>
                </template>
              </RiicSchedulePreview>
            </div>
            <div
              v-if="riicSchedulePreview"
              ref="schedulePreviewExportCapturePanel"
              class="schedule-preview-export-capture schedule-output-document"
              data-riic-export-preview-capture
              aria-hidden="true"
            >
              <header
                class="schedule-output-document-header"
                :class="`theme-${outputPreviewHeaderTheme.tone}`"
              >
                <div class="schedule-output-document-header-art" aria-hidden="true">
                  <img
                    v-for="image in outputPreviewHeaderTheme.images"
                    :key="image"
                    :src="image"
                    alt=""
                  />
                </div>
                <h3>{{ outputPreviewTitle }}</h3>
                <p
                  v-if="outputPreviewScheduleMeta"
                  class="schedule-output-document-meta"
                >
                  {{ outputPreviewScheduleMeta }}
                </p>
                <div class="schedule-output-document-statistics">
                  <div
                    v-if="outputPreviewYieldItems.length"
                    class="schedule-output-document-yield"
                  >
                    <span>预计日产</span>
                    <strong
                      v-for="item in outputPreviewYieldItems"
                      :key="item.resource"
                    >
                      <img
                        :src="item.image"
                        :alt="item.label"
                        class="schedule-output-document-yield-icon"
                      />
                      {{ formatOutputPreviewYield(item.value) }}
                    </strong>
                  </div>
                  <div
                    v-if="outputPreviewResourceNettingItems.length"
                    class="schedule-output-document-resource-netting"
                  >
                    <span>资源净值</span>
                  <strong
                    v-for="item in outputPreviewResourceNettingItems"
                    :key="item.key"
                    :title="item.label"
                  >
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.label"
                      class="schedule-output-document-resource-netting-icon"
                    />
                    <ItemImage
                      v-else-if="item.itemId"
                      :item-id="item.itemId"
                      :size="26"
                      :mobile-size="26"
                    ></ItemImage>
                      {{
                        formatOutputPreviewResourceNetting(
                          item.value,
                        )
                      }}
                    </strong>
                  </div>
                </div>
                <p
                  v-if="scheduleExecutionSettings.exportInfo.description"
                  class="schedule-output-document-description"
                >
                  {{ scheduleExecutionSettings.exportInfo.description }}
                </p>
              </header>
              <RiicSchedulePreview
                v-for="stateIndex in orderedSchedulePreviewStateIndexes"
                :key="`export-${riicSchedulePreview.key}-${stateIndex}`"
                :preview="riicScheduleDisplayPreview"
                :active-state-index="stateIndex"
                :operator-table="operatorTableV2"
                :get-operator-skill-tooltip="getOperatorSkillTooltip"
                :shifts="schedulePreviewShifts"
                :drone-target="
                  schedulePreviewShifts[stateIndex]?.drone?.target || ''
                "
                output-decorated
                :output-theme="outputPreviewHeaderTheme.tone"
                :show-room-efficiency="showCandidateDebugValues"
                :room-index-assignments="resolvedScheduleRoomMaaIndexAssignments"
                export-static
              ></RiicSchedulePreview>
              <footer class="schedule-output-document-footer">
                <div class="schedule-output-document-brand">
                  <div class="schedule-output-document-brand-heading">
                    <strong>明日方舟一图流-排班表自动生成器</strong>
                    <p class="schedule-output-document-generated-at">
                      生成于 {{ outputPreviewGeneratedDate }}
                    </p>
                  </div>
                  <a
                    href="https://ark.yituliu.cn/tools/scheduleV3"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://ark.yituliu.cn/tools/scheduleV3
                  </a>
                  <span>Bilibili：逻辑元LogicalByte</span>
                </div>
                <div class="schedule-output-document-debug-info">
                  {{ outputPreviewDebugValues }}
                </div>
                <img
                  src="/image/website/QR/riic-schedule-generator.png"
                  alt="明日方舟一图流二维码"
                  class="schedule-output-document-qr"
                />
              </footer>
            </div>
            <div
              ref="roomEditorPanel"
              v-if="
                !isOutputPreviewMode &&
                riicSchedulePreview &&
                activeSchedulePreviewRoom
              "
            >
              <RiicScheduleRoomEditorPanel
                :room="activeSchedulePreviewRoom"
                :shift-name="
                  schedulePreviewShifts[activeSchedulePreviewStateIndex]
                    ?.name || '当前班次'
                "
                :operators="scheduleRoomEditorOperators"
                :operator-matches="scheduleRoomEditorOperatorMatches"
                :get-operator-skill-tooltip="getOperatorSkillTooltip"
                :product-options="scheduleRoomEditorProductOptions"
                :operator-input="scheduleRoomEditorOperatorInput"
                :input-unmatched="scheduleRoomEditorInputUnmatched"
                :maa-settings="activeScheduleRoomMaaSettings"
                :maa-room-label="activeScheduleRoomMaaLabel"
                :maa-room-index="activeScheduleRoomMaaIndex"
                :maa-room-index-options="activeScheduleRoomMaaIndexOptions"
                :can-paste-operators="
                  Array.isArray(copiedScheduleRoomOperators)
                "
                :can-paste-shift="Boolean(copiedScheduleShiftOperators)"
                @reset="resetSchedulePreviewRoom"
                @change-product="changeScheduleRoomProduct"
                @update:maa-settings="updateScheduleRoomMaaSettings"
                @update:maa-room-index="updateScheduleRoomMaaIndex"
                @update:operator-input="
                  scheduleRoomEditorOperatorInput = $event
                "
                @add-operator="addScheduleRoomEditorOperator"
                @select-operator="addScheduleRoomEditorOperator"
                @remove-operator="removeScheduleRoomEditorOperator"
                @reorder-operator="reorderScheduleRoomEditorOperator"
                @copy-operators="copyScheduleRoomEditorOperators"
                @paste-operators="pasteScheduleRoomEditorOperators"
                @copy-shift="copySchedulePreviewShift"
                @paste-shift="pasteSchedulePreviewShift"
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

        <RiicScheduleResourceSummary
            v-if="
            assembledScheduleCandidateState.status === 'ready' &&
            riicScheduleResultSnapshot.actual?.yield
          "
          :yield="riicScheduleResultSnapshot.actual.yield"
          :shifts="schedulePreviewShifts"
          :drone-target-preview-keys-by-state="
            scheduleDroneTargetPreviewKeysByState
          "
          :room-index-assignments="resolvedScheduleRoomMaaIndexAssignments"
          @select-drone-target="selectScheduleDroneTarget"
          @update-drone-order="updateScheduleDroneOrder"
        ></RiicScheduleResourceSummary>

        <RiicScheduleExportActions
          v-if="
            assembledScheduleCandidateState.status === 'ready' &&
            riicScheduleResultSnapshot.preview &&
            riicScheduleResultSnapshot.exportPreview
          "
          :exporting-image="exportingImage"
          :exporting-maa="exportingMaa"
          @export-image="exportGeneratedScheduleImage"
          @export-maa="exportGeneratedMaaSchedule"
          @open-legacy-editor="openGeneratedScheduleInLegacyEditor"
        >
          <template #before-image>
            <RiicScheduleExportSettings
              :export-info="scheduleExecutionSettings.exportInfo"
              :orundum-craft-material="
                scheduleExecutionSettings.orundumCraftMaterial
              "
              :include-training-room="
                scheduleExecutionSettings.includeTrainingRoom
              "
              :default-title="getDefaultGeneratedScheduleTitle()"
              :shifts="schedulePreviewShifts"
              :show-orundum-craft-material="hasOrundumManufactureRoom"
              @update:export-info="updateScheduleExportInfo"
              @update:orundum-craft-material="
                scheduleExecutionSettings.orundumCraftMaterial =
                  normalizeOrundumCraftMaterial($event)
              "
              @update:include-training-room="
                scheduleExecutionSettings.includeTrainingRoom = $event === true
              "
              @update:shift="updateSchedulePreviewShift"
            ></RiicScheduleExportSettings>
          </template>
        </RiicScheduleExportActions>
        <p v-else class="schedule-output-empty">
          选择并生成全部房间组后即可导出结果
        </p>
            </div>
          </div>
        </Transition>
      </section>

      <section
        class="workflow-stage workflow-card riic-yield-workflow-stage"
        :class="[
          `workflow-card-${riicYieldWorkflowCardState}`,
          { 'is-collapsed': isWorkflowCardCollapsed('additional') },
        ]"
      >
        <div class="workflow-card-heading">
          <div class="workflow-card-heading-copy">
            <button
              type="button"
              class="workflow-card-collapse-toggle"
              :aria-expanded="!isWorkflowCardCollapsed('additional')"
              title="折叠或展开附加信息"
              @click="toggleWorkflowCardCollapse('additional')"
            >
              <v-icon
                :icon="
                  isWorkflowCardCollapsed('additional')
                    ? 'mdi-chevron-right'
                    : 'mdi-chevron-down'
                "
                size="20"
              ></v-icon>
            </button>
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
          <div class="workflow-card-version">
            {{ RIIC_SCHEDULE_MODULE_VERSIONS.recommendation?.label }}
            {{ RIIC_SCHEDULE_MODULE_VERSIONS.recommendation?.version }}
          </div>
        </div>

        <Transition name="workflow-card-content">
          <div
            v-show="!isWorkflowCardCollapsed('additional')"
            class="workflow-card-content"
          >
            <div class="workflow-card-content-inner">
        <RiicPipelineDebugPanel
          v-if="showCandidateDebugValues"
          :groups="candidateEnabledScheduleRoomGroups"
          :candidate-states-by-group-id="roomGroupCandidateStates"
          :layer3-rule-checks="riicLayer3RuleChecks"
          :control-state="controlCenterRoleState"
          :control-final-state="controlCenterFinalRoleState"
          :control-scenario-trial-state="riicControlCenterScenarioTrialState"
          :perception-resource-trial-state="riicPerceptionResourceTrialState"
          :control-operator-effect-debug-state="
            riicControlCenterOperatorEffectDebugState
          "
          :fallback-plans-by-group-id="roomGroupFallbackPlanStates"
          :pre-assembly-group-candidates="assembledRoomGroupCandidates"
          :assembled-schedule-candidate="activeAssembledScheduleCandidate"
          :same-shift-binding-debug="
            activeAssembledScheduleCandidate?.sameShiftBindingDebug
          "
          :fiammetta-recovery="fiammettaRecoveryConfig"
          :fiammetta-control-usage="controlCenterFiammettaTargetUsage"
          :automatic-generation-debug-state="
            riicAutomaticGenerationDebugState
          "
          :operator-table="operatorTableV2"
          :roster="virtualOperators || []"
          :operator-source-label="ownedOperatorSource"
          :training-mode="riicTrainingMode"
          :ideal-training-rarity-selection="idealTrainingRaritySelection"
          :actual-schedule-metrics="riicScheduleResultSnapshot.actual"
          :schedule-preview="riicScheduleResultSnapshot.preview"
          :l79-input="riicScheduleResultSnapshot.l79Input"
          :schedule-shifts="schedulePreviewShifts"
          :duplicate-operator-checks="riicScheduleDuplicateOperatorChecks"
          :format-layer3-operator-condition="
            formatRiicLayer3OperatorCondition
          "
          :format-layer3-facility-condition="
            formatRiicLayer3FacilityCondition
          "
          :format-layer3-rule-effect="formatRiicLayer3RuleEffect"
        />
        <RiicAdditionalInfoPanel
          :schedule-training-requirements="scheduleTrainingRequirements"
          :training-impact-results="trainingImpactState.results"
          :training-impact-status="trainingImpactState.status"
          :schedule-training-recommendation-status="
            scheduleTrainingRecommendationStatus
          "
          :schedule-training-recommendation-phase="
            trainingRecommendationState.phase
          "
          :operator-table="operatorTableV2"
          :riic-yield-engine-results="riicYieldEngineResults"
          :actual-schedule-metrics="riicScheduleResultSnapshot.actual"
          :schedule-preview="riicScheduleResultSnapshot.preview"
          :schedule-shifts="schedulePreviewShifts"
          :operator-source-label="ownedOperatorSource"
          :layout-label="`${confirmedLayoutPlan?.cardKey || '未选择布局'} · ${
            {
              once: '一天一换',
              twice: '一天两换',
              threeTimes: '一天三换',
            }[confirmedLayoutPlan?.shiftMode] || '未设置换班'
          }`"
          :show-candidate-debug-values="showCandidateDebugValues"
          @calculate-training-impact="requestTrainingImpactCalculation"
          :format-training-requirement="formatTrainingRequirement"
          :get-riic-yield-engine-status-meta="getRiicYieldEngineStatusMeta"
          :format-riic-yield-metric="formatRiicYieldMetric"
        />
            </div>
          </div>
        </Transition>
      </section>

      <section
        class="workflow-stage workflow-card update-log-workflow-stage"
        :class="{ 'is-collapsed': isWorkflowCardCollapsed('changelog') }"
      >
        <div class="workflow-card-heading">
          <div class="workflow-card-heading-copy">
            <button
              type="button"
              class="workflow-card-collapse-toggle"
              :aria-expanded="!isWorkflowCardCollapsed('changelog')"
              title="折叠或展开更新日志"
              @click="toggleWorkflowCardCollapse('changelog')"
            >
              <v-icon
                :icon="
                  isWorkflowCardCollapsed('changelog')
                    ? 'mdi-chevron-right'
                    : 'mdi-chevron-down'
                "
                size="20"
              ></v-icon>
            </button>
            <h2>更新日志</h2>
          </div>
          <div
            v-if="riicScheduleFrameworkVersion"
            class="workflow-card-version"
          >
            框架版本 {{ riicScheduleFrameworkVersion }}
          </div>
        </div>
        <Transition name="workflow-card-content">
          <div
            v-show="!isWorkflowCardCollapsed('changelog')"
            class="workflow-card-content"
          >
            <div class="workflow-card-content-inner schedule-changelog">
          <article
            v-for="entry in RIIC_SCHEDULE_CHANGELOG_ENTRIES"
            :key="`${entry.date}:${entry.version}`"
            class="schedule-changelog-entry"
          >
            <header class="schedule-changelog-entry-heading">
              <strong>{{ entry.date }}</strong>
              <span>{{ entry.version }}</span>
            </header>
            <ul class="schedule-changelog-item-list">
              <li
                v-for="(item, index) in entry.items"
                :key="`${entry.date}:${item.module}:${index}`"
                class="schedule-changelog-item"
              >
                <span class="schedule-changelog-level">
                  Lv{{ item.level }}
                </span>
                <span class="schedule-changelog-item-module">
                  {{ item.module }}
                </span>
                <span class="schedule-changelog-item-description">
                  {{ item.description }}
                </span>
              </li>
            </ul>
          </article>
            </div>
          </div>
        </Transition>
      </section>

      <div class="page-cache-reset">
        <button type="button" @click="clearSavedWizardState">
          清空本页缓存
        </button>
        <a
          class="page-cache-reset-link"
          href="https://qm.qq.com/q/T3XVZh9Au6"
          target="_blank"
          rel="noopener noreferrer"
        >
          基建/自动排班交流群：782204269
        </a>
        <a
          class="page-cache-reset-link"
          href="https://www.bilibili.com/video/BV1scbi6JEGE/"
          target="_blank"
          rel="noopener noreferrer"
        >
          介绍视频
        </a>
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

.schedule-output-document {
  --c-page-background-color: #fff;
  --c-page-background-color-secondary: #f5f7f9;
  --c-text-color: #17212b;
  --c-text-tip-color: #66717d;
  --c-border-color: #d8dee5;
  --riic-muted: #66717d;
  width: min(1080px, 100%);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #d8dee5;
  background: #fff;
  color: #17212b;
}

.schedule-output-document-header {
  display: grid;
  gap: 8px;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  height: 120px;
  min-height: 120px;
  box-sizing: border-box;
  padding: 16px 190px 12px 30px;
  border-bottom: 4px solid #e7b719;
  box-shadow: 0 6px 16px rgba(23, 33, 43, 0.2);
}

.schedule-output-document-header::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  content: "";
}

.schedule-output-document-header.theme-orundum::before {
  background: linear-gradient(
    to left,
    rgba(190, 52, 52, 0.34),
    rgba(190, 52, 52, 0.14) 42%,
    transparent 72%
  );
}

.schedule-output-document-header.theme-experience::before {
  background: linear-gradient(
    to left,
    rgba(202, 156, 43, 0.34),
    rgba(202, 156, 43, 0.14) 42%,
    transparent 72%
  );
}

.schedule-output-document-header.theme-balanced::before {
  background: linear-gradient(
    to left,
    rgba(39, 92, 70, 0.34),
    rgba(39, 92, 70, 0.14) 42%,
    transparent 72%
  );
}

.schedule-output-document-header.theme-lmd::before {
  background: linear-gradient(
    to left,
    rgba(41, 105, 180, 0.34),
    rgba(41, 105, 180, 0.14) 42%,
    transparent 72%
  );
}

.schedule-output-document-header-art {
  display: flex;
  position: absolute;
  z-index: 0;
  top: 50%;
  right: 28px;
  align-items: center;
  gap: 10px;
  transform: translateY(-50%);
}

.schedule-output-document-header-art img {
  width: 144px;
  height: 144px;
  opacity: 0.36;
  object-fit: contain;
}

.schedule-output-document-header > :not(.schedule-output-document-header-art) {
  position: relative;
  z-index: 1;
}

.schedule-output-document-header h3,
.schedule-output-document-header p,
.schedule-output-document-footer p {
  margin: 0;
}

.schedule-output-document-header h3 {
  color: #17212b;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
}

.schedule-output-document-meta {
  color: #54616e;
  font-size: 13px;
  line-height: 1.5;
}

.schedule-output-document-yield {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-top: 2px;
  color: #17212b;
  font-size: 16px;
  line-height: 1.45;
}

.schedule-output-document-statistics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 22px;
}

.schedule-output-document-yield > span {
  color: #8b6510;
  font-size: 16px;
  font-weight: 600;
}

.schedule-output-document-yield > strong {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
}

.schedule-output-document-resource-netting {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  color: #17212b;
  font-size: 16px;
  line-height: 1.45;
}

.schedule-output-document-resource-netting > span {
  color: #8b6510;
  font-size: 16px;
  font-weight: 600;
}

.schedule-output-document-resource-netting > strong {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
}

.schedule-output-document-resource-netting-icon {
  display: block;
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.schedule-output-document-yield-icon {
  display: block;
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.schedule-output-document-description {
  color: #54616e;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.schedule-output-document > .riic-schedule-preview + .riic-schedule-preview {
  margin-top: 0;
  padding-top: 0;
  border-top: 1px solid #d8dee5;
}

.schedule-output-document-generated-at {
  color: #7b8793;
  font-size: 11px;
  line-height: 1.45;
}

.schedule-output-document-brand-heading {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 10px;
}

.schedule-output-document-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 120px;
  min-height: 120px;
  gap: 24px;
  padding: 0 0 0 30px;
  background: #202b35;
  color: #fff;
  box-shadow: 0 -6px 16px rgba(23, 33, 43, 0.2);
}

.schedule-output-document-brand {
  display: grid;
  min-width: 0;
  gap: 4px;
  padding: 0 0 0 16px;
  border-left: 3px solid rgba(255, 255, 255, 0.82);
}

.schedule-output-document-brand-heading > strong {
  font-weight: 700;
}

.schedule-output-document-brand-heading > strong,
.schedule-output-document-brand > span,
.schedule-output-document-brand > a {
  font-size: 21px;
  line-height: 1.45;
}

.schedule-output-document-brand > span {
  color: #d9e0e6;
}

.schedule-output-document-brand > a {
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  color: #fff;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-output-document-debug-info {
  display: block;
  flex: 0 0 auto;
  margin-left: auto;
  align-self: flex-end;
  color: #7b8793;
  font-size: 11px;
  line-height: 1.45;
  text-align: right;
  white-space: nowrap;
}

.schedule-output-document-qr {
  align-self: center;
  flex: 0 0 120px;
  width: 120px;
  height: 120px;
  padding: 0;
  background: #fff;
  object-fit: contain;
}

.schedule-preview-export-capture {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 1080px;
  max-width: none;
  pointer-events: none;
  background: var(--c-page-background-color);
}

.schedule-preview-export-capture.schedule-output-document {
  width: 1080px;
  max-width: none;
}

.schedule-preview-export-capture > .riic-schedule-preview + .riic-schedule-preview {
  margin-top: 20px;
}

.schedule-preview-export-capture.schedule-output-document
  > .riic-schedule-preview
  + .riic-schedule-preview {
  margin-top: 0;
}

.schedule-output-stage {
  display: flex;
  order: -1;
  flex-direction: column;
  gap: 0;
}

.schedule-output-stage
  > .workflow-card-content
  > .workflow-card-content-inner
  > .assembled-schedule-panel
  + * {
  margin-top: 14px;
}

.schedule-output-empty {
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.55;
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

.page-cache-reset-link {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  text-decoration: none;
}

.page-cache-reset button:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-orange) 54%,
    var(--c-border-color)
  );
  color: var(--riic-orange);
}

.page-cache-reset-link:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 54%,
    var(--c-border-color)
  );
  color: var(--riic-blue);
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

.schedule-changelog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.schedule-changelog-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-changelog-entry + .schedule-changelog-entry {
  padding-top: 18px;
  border-top: 1px solid var(--c-border-color);
}

.schedule-changelog-entry-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--c-text-color);
}

.schedule-changelog-entry-heading strong {
  font-size: 14px;
}

.schedule-changelog-entry-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  font-style: italic;
}

.schedule-changelog-item-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.schedule-changelog-item {
  display: grid;
  grid-template-columns: 36px 92px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.55;
}

.schedule-changelog-level {
  color: var(--riic-orange);
  font-size: 11px;
  font-weight: 700;
}

.schedule-changelog-item-module {
  color: var(--riic-blue);
  font-weight: 600;
}

.schedule-changelog-item-description {
  min-width: 0;
  color: var(--riic-muted);
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

.workflow-card.is-collapsed .workflow-card-heading {
  margin-bottom: -22px;
}

.workflow-card-heading > * {
  position: relative;
  z-index: 1;
}

.workflow-card-heading {
  transition: margin-bottom 240ms ease;
}

.workflow-card-content {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transition:
    grid-template-rows 240ms ease,
    opacity 180ms ease;
}

.workflow-card-content-inner {
  min-height: 0;
  overflow: hidden;
}

.workflow-card-content-enter-from,
.workflow-card-content-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.workflow-card-collapse-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex: 0 0 32px;
  width: 32px;
  height: 28px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 38%);
  border-radius: 6px;
  background: rgb(255 255 255 / 16%);
  color: #fff;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease;
}

.workflow-card-collapse-toggle:hover {
  border-color: rgb(255 255 255 / 72%);
  background: rgb(255 255 255 / 28%);
}

.workflow-card-collapse-toggle:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.workflow-card-heading-copy {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 10px;
}

.workflow-card-version {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  color: color-mix(in srgb, #fff 82%, transparent);
  font-size: 12px;
  font-style: italic;
  line-height: 1.45;
  text-align: right;
  white-space: nowrap;
}

.workflow-card-version span {
  overflow: visible;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
  text-overflow: clip;
  white-space: nowrap;
}

.workflow-stage .workflow-card-heading h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #fff;
  font-size: 18px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.schedule-generation-running-notice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 1200;
  gap: 11px 14px;
  width: min(520px, calc(100vw - 40px));
  padding: 15px 16px;
  border: 1px solid color-mix(in srgb, var(--riic-blue) 52%, var(--c-border-color));
  border-radius: 6px;
  background: color-mix(
    in srgb,
    var(--riic-blue) 12%,
    var(--c-page-background-color-secondary)
  );
  color: var(--riic-blue);
  box-shadow: 0 10px 24px color-mix(in srgb, #000 18%, transparent);
}

.schedule-generation-running-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  grid-row: 2;
}

.schedule-generation-running-copy {
  display: flex;
  flex-direction: column;
  grid-row: 2;
  gap: 3px;
  min-width: 0;
}

.schedule-generation-running-notice strong {
  color: var(--c-text-color);
  font-size: 16px;
  line-height: 1.4;
}

.schedule-generation-running-notice span {
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.4;
}

.schedule-generation-running-marquee {
  grid-column: 1 / -1;
  grid-row: 1;
  overflow: hidden;
  width: 100%;
  padding: 1px 0 4px;
}

.schedule-generation-running-avatar-track {
  display: flex;
  width: max-content;
  animation: schedule-generation-running-avatar-scroll 12s infinite;
}

.schedule-generation-running-avatar {
  position: relative;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  margin-right: 6px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--riic-blue) 46%, var(--c-border-color));
  border-radius: 50%;
  background: var(--c-page-background-color);
}

.schedule-generation-running-avatar .sprite-avatar {
  position: absolute;
  top: -73px;
  left: -73px;
  transform: scale(0.2);
}

@keyframes schedule-generation-running-avatar-scroll {
  0%,
  5% {
    transform: translateX(0);
  }

  8.333%,
  13.333% {
    transform: translateX(-40px);
  }

  16.667%,
  21.667% {
    transform: translateX(-80px);
  }

  25%,
  30% {
    transform: translateX(-120px);
  }

  33.333%,
  38.333% {
    transform: translateX(-160px);
  }

  41.667%,
  46.667% {
    transform: translateX(-200px);
  }

  50%,
  55% {
    transform: translateX(-240px);
  }

  58.333%,
  63.333% {
    transform: translateX(-280px);
  }

  66.667%,
  71.667% {
    transform: translateX(-320px);
  }

  75%,
  80% {
    transform: translateX(-360px);
  }

  83.333%,
  88.333% {
    transform: translateX(-400px);
  }

  91.667%,
  96.667% {
    transform: translateX(-440px);
  }

  100% {
    transform: translateX(-480px);
  }
}

.schedule-generation-running-notice-enter-active,
.schedule-generation-running-notice-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 0.8, 0.24, 1);
}

.schedule-generation-running-notice-enter-from,
.schedule-generation-running-notice-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

@media (max-width: 560px) {
  .schedule-generation-running-notice {
    grid-template-columns: auto minmax(0, 1fr);
    right: 12px;
    bottom: 12px;
    width: calc(100vw - 24px);
    gap: 10px;
    padding: 13px 14px;
  }

  .schedule-generation-running-marquee {
    width: 100%;
  }

  .schedule-generation-running-notice strong {
    font-size: 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .schedule-generation-running-avatar-track {
    animation: none;
  }

  .schedule-generation-running-notice-enter-active,
  .schedule-generation-running-notice-leave-active {
    transition: none;
  }
}

.schedule-generation-section-label {
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.schedule-generation-data-source-module,
.schedule-generation-settings-module {
  min-width: 0;
}

.schedule-generation-settings-module {
  margin-top: 18px;
}

.schedule-generation-section-heading {
  display: flex;
  align-items: center;
  min-height: 17px;
  margin-bottom: 8px;
}

.schedule-generation-section-heading > strong {
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.room-workbench {
  margin-top: 14px;
}

.room-workbench-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.room-workbench-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  gap: 5px;
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

.room-workbench-action-large {
  min-height: 56px;
  gap: 10px;
  padding: 8px 16px;
  font-size: 24px;
}

.room-workbench-action-large :deep(.v-icon) {
  font-size: 32px !important;
}

.room-workbench-action:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--riic-blue) 9%,
    var(--c-page-background-color-secondary)
  );
}

.room-workbench-action-deep {
  border-color: color-mix(
    in srgb,
    var(--riic-orange) 52%,
    var(--c-border-color)
  );
  color: var(--riic-orange);
}

.room-workbench-action-deep:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--riic-orange) 10%,
    var(--c-page-background-color-secondary)
  );
}

.room-workbench-action:disabled {
  cursor: default;
  opacity: 0.55;
}

.assembled-schedule-panel {
  margin-top: 0;
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

  .workflow-card.is-collapsed .workflow-card-heading {
    margin-bottom: -18px;
  }

  .workflow-card-version {
    font-size: 10px;
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

  .result-section {
    padding: 16px 14px;
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
