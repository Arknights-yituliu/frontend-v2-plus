<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { operatorTableV2 } from "/src/utils/gameData.js";
import ITEM_INFO from "/src/static/json/material/item_info.json";
import { summarizeRiicFacilityPower } from "/src/utils/riic/riic-facility-power-model.js";
import {
  DEFAULT_LMD_DRONE_STRATEGIES,
  sanityItemDefinitions,
} from "/src/vendor/riic-efficiency/dist/index.js";
import {
  buildFacilityStepCards,
  buildFacilityStepPanes,
  buildEfficiencyNotices,
  buildResultDisplay,
  buildRiicEfficiencySchedule,
  calculateRiicDroneAcceleration,
  calculateRiicEfficiency,
  calculateSanityValues,
  completeInferredRooms,
  DEFAULT_RIIC_EFFICIENCY_SETTINGS,
  DEFAULT_SANITY_SETTINGS,
  formatDisplayValue,
  formatNumber,
  inferScheduleLayout,
  normalizeRiicEfficiencySettings,
  resourceLabel,
} from "/src/utils/riic/riic-efficiency-adapter.js";
import RiicDisplayCard from "/src/components/tools/RiicDisplayCard.vue";
import RiicDisplayTile from "/src/components/tools/RiicDisplayTile.vue";
import RiicMaaOperatorProgressionEditor from "/src/components/tools/RiicMaaOperatorProgressionEditor.vue";
import { resolveRiicScheduleLayout } from "/src/utils/riicScheduleLayout.js";

const RIIC_MAA_EDITOR_TRANSFER_STORAGE_KEY = "riic_maa_editor_to_efficiency_calculator_v1";
const RIIC_MAA_CALCULATOR_RETURN_STORAGE_KEY = "riic_maa_calculator_to_editor_v1";
const PAGE_SANITY_VALUES_STORAGE_KEY = "riic_maa_schedule_calculator_sanity_values_v2";
const LEGACY_PAGE_SANITY_VALUES_STORAGE_KEY = "riic_maa_schedule_calculator_sanity_values_v1";
const PAGE_EFFICIENCY_SETTINGS_STORAGE_KEY = "riic_maa_schedule_calculator_efficiency_settings_v1";
const PAGE_RESOURCE_AMOUNT_DISPLAY_MODE_STORAGE_KEY = "riic_maa_schedule_calculator_resource_amount_display_mode_v1";
const RESOURCE_AMOUNT_DISPLAY_MODES = Object.freeze([
  { key: "raw", label: "个数" },
  { key: "points", label: "点数" },
  { key: "both", label: "二者都显示" },
]);
const RESOURCE_POINT_LABELS = Object.freeze({
  赤金: "赤金点数",
  中级作战记录: "经验点数",
});
const DEFAULT_LMD_DRONE_STRATEGY_ROWS = Object.entries(DEFAULT_LMD_DRONE_STRATEGIES)
  .sort(([left], [right]) => Number(right) - Number(left))
  .map(([level, strategy]) => ({ level, strategy }));
const NOTICE_LEVELS = Object.freeze([
  { key: "info", label: "提示" },
  { key: "warning", label: "警告" },
  { key: "error", label: "错误" },
]);

const ROOM_LAYOUT_LIMITS = Object.freeze({
  control: { minRooms: 1, maxRooms: 1, maxLevel: 5 },
  trading: { minRooms: 0, maxRooms: 5, maxLevel: 3 },
  manufacture: { minRooms: 0, maxRooms: 5, maxLevel: 3 },
  power: { minRooms: 0, maxRooms: 3, maxLevel: 3 },
  meeting: { minRooms: 0, maxRooms: 1, maxLevel: 3 },
  hire: { minRooms: 0, maxRooms: 1, maxLevel: 3 },
  dormitory: { minRooms: 0, maxRooms: 4, maxLevel: 5 },
  processing: { minRooms: 0, maxRooms: 1, maxLevel: 3 },
  training: { minRooms: 0, maxRooms: 1, maxLevel: 3 },
});
const ROOM_TYPES = new Set(Object.keys(ROOM_LAYOUT_LIMITS));
const MAX_TRADING_MANUFACTURE_POWER_ROOMS = 9;
const ROOM_LABELS = Object.freeze({
  control: "控制中枢",
  manufacture: "制造站",
  trading: "贸易站",
  power: "发电站",
  meeting: "会客室",
  hire: "办公室",
  dormitory: "宿舍",
  processing: "加工站",
  training: "训练室",
});
const LAYOUT_DISPLAY_ROWS = Object.freeze([
  { key: "control", facilities: ["control"] },
  { key: "trading", facilities: ["trading"] },
  { key: "manufacture", facilities: ["manufacture"] },
  { key: "power", facilities: ["power"] },
  { key: "support", facilities: ["meeting", "processing", "hire", "training"] },
  { key: "dormitory", facilities: ["dormitory"] },
]);

const router = useRouter();
const itemValueApById = new Map(
  ITEM_INFO.map((item) => [String(item.itemId), item.itemValueAp ?? item.itemValue]),
);
const sanityDefinitions = sanityItemDefinitions();
const sanityAmountFactorByResource = new Map(
  sanityDefinitions.map((item) => [item.resource, item.amountFactor]),
);
const defaultSanityValues = calculateSanityValues(DEFAULT_SANITY_SETTINGS);
const SANITY_VALUE_KEYS = Object.freeze({
  龙门币: "lmd",
  合成玉: "orundum",
  赤金: "pureGoldPoint",
  中级作战记录: "experience",
  无人机: "drone",
  信用: "credit",
  公开招募标签刷新次数: "recruitRefresh",
  源石碎片: "originiumShard",
  固源岩: "solidRock",
  装置: "device",
});
const PROJECT_SANITY_ITEM_IDS = Object.freeze({
  龙门币: "4001",
  合成玉: "4003",
  赤金: "3003",
  中级作战记录: "2003",
  无人机: "base_ap",
  固源岩: "30012",
  装置: "30062",
});
const PROJECT_SANITY_RESOURCES = new Set(Object.keys(PROJECT_SANITY_ITEM_IDS));
const DEFAULT_PAGE_SANITY_VALUES = Object.freeze({
  ...defaultSanityValues,
  ...Object.fromEntries(
    Object.entries(PROJECT_SANITY_ITEM_IDS).map(([resource, itemId]) => {
      const valueKey = SANITY_VALUE_KEYS[resource];
      return [
        valueKey,
        getProjectSanityValue(itemId, resource, defaultSanityValues[valueKey]),
      ];
    }),
  ),
});

function applyStoredSanityValues(target, stored) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return;
  }
  for (const key of Object.keys(target)) {
    const value = stored[key];
    if (value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0)) {
      target[key] = value;
    }
  }
}

function readPageSanitySettings() {
  const settings = {
    source: "yituliu",
    websiteValues: { ...DEFAULT_PAGE_SANITY_VALUES },
    packageValues: { ...defaultSanityValues },
  };
  if (typeof localStorage === "undefined") {
    return settings;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(PAGE_SANITY_VALUES_STORAGE_KEY) || "null");
    if (stored?.version === 2) {
      settings.source = stored.source === "package" ? "package" : "yituliu";
      applyStoredSanityValues(settings.websiteValues, stored.websiteValues);
      applyStoredSanityValues(settings.packageValues, stored.packageValues);
      return settings;
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_PAGE_SANITY_VALUES_STORAGE_KEY) || "null");
    applyStoredSanityValues(settings.websiteValues, legacy);
  } catch {
    // Ignore invalid page-local settings and use the displayed defaults.
  }
  return settings;
}

const sanitySettings = reactive(readPageSanitySettings());
const useYituliuSanityValues = computed({
  get: () => sanitySettings.source === "yituliu",
  set: (enabled) => {
    sanitySettings.source = enabled ? "yituliu" : "package";
    savePageSanitySettings();
  },
});
const sanityValues = computed(() =>
  sanitySettings.source === "yituliu"
    ? sanitySettings.websiteValues
    : sanitySettings.packageValues,
);

function createSanitySourceItem(item) {
  return {
    ...item,
    value: item.value(sanityValues.value),
    valueKey: SANITY_VALUE_KEYS[item.resource],
  };
}

const sanitySourceGroups = computed(() => {
  if (!useYituliuSanityValues.value) {
    return [{
      key: "package",
      label: "riic-efficiency package（信用、公招价值来自Bilibili@Bio-Hazard）",
      items: sanityDefinitions.map(createSanitySourceItem),
    }];
  }
  return [
    {
      key: "yituliu",
      label: "一图流网页 · item_info.json",
      items: sanityDefinitions
        .filter((item) => PROJECT_SANITY_RESOURCES.has(item.resource))
        .map(createSanitySourceItem),
    },
    {
      key: "package",
      label: "package 默认值（信用、公招价值来自Bilibili@Bio-Hazard）",
      items: sanityDefinitions
        .filter((item) => !PROJECT_SANITY_RESOURCES.has(item.resource))
        .map(createSanitySourceItem),
    },
  ];
});

// Package sanity scores use normalized EXP and gold points; item_info values are per item.
function getProjectSanityValue(itemId, resource, fallback) {
  const itemValue = Number(itemValueApById.get(itemId));
  const amountFactor = Number(sanityAmountFactorByResource.get(resource)) || 1;
  return Number.isFinite(itemValue) ? itemValue / amountFactor : fallback;
}

function updatePageSanityValue(key, rawValue) {
  const value = String(rawValue).trim() === "" ? null : Number(rawValue);
  if (!key || (value !== null && (!Number.isFinite(value) || value < 0))) {
    return;
  }
  sanityValues.value[key] = value;
  savePageSanitySettings();
}

function savePageSanitySettings() {
  try {
    localStorage.setItem(PAGE_SANITY_VALUES_STORAGE_KEY, JSON.stringify({
      version: 2,
      source: sanitySettings.source,
      websiteValues: sanitySettings.websiteValues,
      packageValues: sanitySettings.packageValues,
    }));
  } catch {
    // Keep the edit in memory when browser storage is unavailable.
  }
}

function restoreDefaultSanityValues() {
  Object.assign(sanitySettings.websiteValues, DEFAULT_PAGE_SANITY_VALUES);
  Object.assign(sanitySettings.packageValues, defaultSanityValues);
  sanitySettings.source = "yituliu";
  try {
    localStorage.removeItem(PAGE_SANITY_VALUES_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PAGE_SANITY_VALUES_STORAGE_KEY);
  } catch {
    // The in-memory reset is sufficient when browser storage is unavailable.
  }
}

function readPageEfficiencySettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(PAGE_EFFICIENCY_SETTINGS_STORAGE_KEY) || "null");
    return normalizeRiicEfficiencySettings(stored);
  } catch {
    return { ...DEFAULT_RIIC_EFFICIENCY_SETTINGS };
  }
}

function readResourceAmountDisplayMode() {
  try {
    const stored = localStorage.getItem(PAGE_RESOURCE_AMOUNT_DISPLAY_MODE_STORAGE_KEY);
    return RESOURCE_AMOUNT_DISPLAY_MODES.some((mode) => mode.key === stored)
      ? stored
      : "points";
  } catch {
    return "points";
  }
}

function updateFirstItemProgress(event) {
  efficiencySettings.firstItemProgress = normalizeRiicEfficiencySettings({
    ...efficiencySettings,
    firstItemProgress: Number(event.target.value) / 100,
  }).firstItemProgress;
}

function restoreDefaultEfficiencySettings() {
  Object.assign(efficiencySettings, DEFAULT_RIIC_EFFICIENCY_SETTINGS);
}

const scheduleFileName = ref("");
const sourceSchedule = ref(null);
const sourceScheduleLayoutSource = ref("inferred");
const planDurations = ref([]);
const scheduleWarnings = ref([]);
const inputError = ref("");
const appliedLayout = ref(null);
const layoutEditDraft = ref(null);
const layoutEditorOpen = ref(false);
const layoutEditError = ref("");
const activeOperators = ref([]);
const treatSkillsAsUnlocked = ref(true);
const efficiencySettings = reactive(readPageEfficiencySettings());
const resourceAmountDisplayMode = ref(readResourceAmountDisplayMode());
const lmdDroneStrategyInput = ref("");
const importedFromMaaEditor = ref(false);
const maaEditorReturnRoute = ref("ScheduleV2");
const maaEditorScheduleType = ref(undefined);
const stepMode = ref("facility");
const roomDetailGeneration = ref(0);
const showRawResult = ref(false);

watch(
  efficiencySettings,
  (settings) => {
    try {
      localStorage.setItem(PAGE_EFFICIENCY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep settings usable in memory when browser storage is unavailable.
    }
  },
  { deep: true },
);

watch(resourceAmountDisplayMode, (mode) => {
  try {
    localStorage.setItem(PAGE_RESOURCE_AMOUNT_DISPLAY_MODE_STORAGE_KEY, mode);
  } catch {
    // Keep the selected mode usable in memory when browser storage is unavailable.
  }
});

function formatDroneMaterialAmount(amount, resource) {
  const raw = `${formatNumber(amount)} ${resourceLabel(resource)}`;
  const pointsLabel = RESOURCE_POINT_LABELS[resource];
  if (!pointsLabel || resourceAmountDisplayMode.value === "raw") {
    return raw;
  }

  const factor = Number(sanityAmountFactorByResource.get(resource)) || 1;
  const points = `${formatNumber(amount * factor)} ${pointsLabel}`;
  return resourceAmountDisplayMode.value === "points"
    ? points
    : `${raw}（${points}）`;
}

const scheduleOperatorNames = computed(() => {
  const names = new Set();
  for (const plan of sourceSchedule.value?.plans || []) {
    for (const rooms of Object.values(plan.rooms || {})) {
      for (const room of rooms || []) {
        for (const name of room.operators || []) {
          if (name) {
            names.add(name);
          }
        }
      }
    }
  }
  return [...names];
});
const unmatchedOperatorNames = computed(() => {
  const rosterNames = new Set(activeOperators.value.map((operator) => getOperatorName(operator)).filter(Boolean));
  return scheduleOperatorNames.value.filter((name) => !rosterNames.has(name));
});

const calculationState = computed(() => {
  if (!sourceSchedule.value) {
    return { result: null, document: null, layout: null, layoutSource: "inferred", error: "", efficiencyError: "" };
  }

  let document = null;
  let layout = null;
  let layoutSource = sourceScheduleLayoutSource.value;
  let efficiencyError = "";
  try {
    const baseLayout = sourceSchedule.value.layout;
    layout = appliedLayout.value || baseLayout;
    validateLayoutConstraints(layout);
    if (layout.length === 0) {
      throw new Error("无法从排班推断出设施布局。");
    }
    const completedPlans = completeInferredRooms(sourceSchedule.value.plans, layout);
    const schedule = {
      ...sourceSchedule.value,
      plans: completedPlans.map((plan, planIndex) => ({
        ...plan,
        duration: Number(planDurations.value[planIndex]),
      })),
    };
    document = buildRiicEfficiencySchedule(schedule, {
      operatorProfiles: treatSkillsAsUnlocked.value ? [] : activeOperators.value,
      operatorTable: operatorTableV2,
      efficiencySettings,
    });
    document.layout = layout;
    document.settings.treatSkillsAsUnlocked = treatSkillsAsUnlocked.value;
    let result;
    try {
      result = calculateRiicEfficiency(document);
      result.layoutSource = layoutSource;
    } catch (error) {
      efficiencyError = error?.message || "riic-efficiency 计算失败";
      throw error;
    }
    return {
      result,
      document,
      layout,
      layoutSource,
      error: "",
      efficiencyError: "",
    };
  } catch (error) {
    return {
      result: null,
      document,
      layout,
      layoutSource,
      error: error?.message || "riic-efficiency 计算失败",
      efficiencyError,
    };
  }
});

const result = computed(() => calculationState.value.result);
const hasMaaDroneUsage = computed(() => Boolean(result.value?.maaDroneAcceleration?.enabled));
const droneCalculation = computed(() =>
  result.value && !hasMaaDroneUsage.value
    ? calculateRiicDroneAcceleration(result.value, lmdDroneStrategyInput.value)
    : null,
);
const resultDisplay = computed(() =>
  result.value
    ? buildResultDisplay(result.value, {
        sanityValues: sanityValues.value,
        resourceAmountDisplayMode: resourceAmountDisplayMode.value,
        droneAcceleration: droneCalculation.value?.acceleration,
      })
    : null,
);
const calculationError = computed(() => calculationState.value.error);
const dailyOutput = computed(() => resultDisplay.value?.dailyOutput);
const calculationSteps = computed(() => resultDisplay.value?.calculationSteps);
const queueCalculationPane = computed(() => calculationSteps.value?.dailyOutput);
const facilitySteps = computed(() => calculationSteps.value?.facilitySteps);
const facilityPanes = computed(() => (stepMode.value === "facility" && facilitySteps.value ? buildFacilityStepPanes(facilitySteps.value) : []));
const facilityCards = computed(() => (stepMode.value === "queue" && facilitySteps.value ? buildFacilityStepCards(facilitySteps.value) : []));
const basePoints = computed(() => calculationSteps.value?.basePoints);
const dronePane = computed(() => calculationSteps.value?.maaDrone);
const hasDroneOutput = computed(() => Boolean(dronePane.value?.cards?.length));
const droneStrategyDisplay = computed(() => resultDisplay.value?.droneStrategy);
const droneScenarioRows = computed(() => {
  const scenarios = droneCalculation.value?.acceleration?.scenarios || [];
  const displays = resultDisplay.value?.droneScenarios || [];
  return scenarios.map((scenario) => {
    const display = displays.find((item) => item.key === scenario.key);
    const extraView = display?.views.find((view) => view.key === "extra");
    const acceleratedView = display?.views.find((view) => view.key === "accelerated");
    const extraOutput = extraView?.tiles.find((tile) => tile.product === scenario.product);
    const dailyOutputTile = acceleratedView?.tiles.find((tile) => tile.product === scenario.product);
    const extraFlow = Object.entries(scenario.extraFlow || {});
    const materials = extraFlow
      .filter(([resource, amount]) => resource !== "无人机" && resource !== scenario.product && amount < -0.000001)
      .map(([resource, amount]) => {
        const dailyNetTile = acceleratedView?.tiles.find((tile) => tile.product === resource);
        return {
          resource,
          amount: -amount,
          dailyNetLine: dailyNetTile?.lines?.find((line) => line.key === "net")?.value,
        };
      });

    return {
      key: scenario.key,
      product: scenario.product,
      title: display?.title,
      meta: display?.meta,
      baseRateLines: display?.baseRateLines?.length
        ? display.baseRateLines
        : display?.baseRate
          ? [display.baseRate]
          : [],
      extraAmount: Number(scenario.extraFlow?.[scenario.product]) || 0,
      extraOutput,
      dailyOutputTile,
      materials,
    };
  });
});
const layoutLabel = computed(() => {
  const layout = layoutEditorOpen.value && layoutEditDraft.value
    ? layoutEditDraft.value
    : calculationState.value.layout;
  if (!layout?.length) {
    return "";
  }
  const count = (type) => layout.filter((entry) => entry.type === type).length;
  return `${count("trading")}${count("manufacture")}${count("power")}`;
});
const layoutSourceLabel = computed(() =>
  `${calculationState.value.layoutSource === "document" ? "读取自排班 JSON" : calculationState.value.layoutSource === "schedule-type" ? "兼容旧布局字段" : "根据排班推测"}${appliedLayout.value ? " · 已应用编辑布局" : ""}`,
);
const layoutForEditing = computed(() =>
  layoutEditorOpen.value && layoutEditDraft.value
    ? layoutEditDraft.value
    : calculationState.value.layout || [],
);
const layoutPowerSummary = computed(() =>
  summarizeRiicFacilityPower(
    layoutForEditing.value.map((entry) => ({
      facility: entry.type === "hire" ? "office" : entry.type,
      stationLevel: entry.level,
    })),
  ),
);
const showLayoutPowerSummary = computed(
  () => layoutEditorOpen.value || layoutPowerSummary.value.overloaded,
);
const layoutRows = computed(() => {
  const layout = layoutForEditing.value;
  return LAYOUT_DISPLAY_ROWS.map((row) => ({
    ...row,
    facilities: row.facilities
      .map((type) => ({
        key: type,
        label: ROOM_LABELS[type],
        rooms: layout.filter((entry) => entry.type === type),
        limits: ROOM_LAYOUT_LIMITS[type],
      }))
      .filter((facility) =>
        layoutEditorOpen.value ||
        facility.rooms.length > 0 ||
        (row.key === "dormitory" && layoutPowerSummary.value.overloaded),
      ),
  })).filter((row) => layoutEditorOpen.value || row.facilities.length > 0);
});
function getLayoutLevels(type) {
  return Array.from(
    { length: ROOM_LAYOUT_LIMITS[type]?.maxLevel || 0 },
    (_, index) => index + 1,
  );
}

function getLayoutIndex(type, roomIndex, layout = layoutForEditing.value) {
  let currentIndex = -1;
  return layout.findIndex((entry) => {
    if (entry.type !== type) {
      return false;
    }
    currentIndex += 1;
    return currentIndex === roomIndex;
  });
}

function currentLayoutForEditing() {
  return layoutEditDraft.value || calculationState.value.layout || [];
}

function ensureLayoutEditDraft() {
  if (!layoutEditDraft.value) {
    layoutEditDraft.value = currentLayoutForEditing().map((entry) => ({ ...entry }));
  }
  return layoutEditDraft.value;
}

function getLayoutRoomCount(type, layout = currentLayoutForEditing()) {
  return layout.filter((entry) => entry.type === type).length;
}

function getAddLayoutRoomReason(type) {
  const layout = currentLayoutForEditing();
  const limits = ROOM_LAYOUT_LIMITS[type];
  if (!limits || getLayoutRoomCount(type, layout) >= limits.maxRooms) {
    return `最多建设 ${limits?.maxRooms || 0} 间${ROOM_LABELS[type] || "设施"}`;
  }
  if (
    ["trading", "manufacture", "power"].includes(type) &&
    ["trading", "manufacture", "power"].reduce(
      (count, facility) => count + getLayoutRoomCount(facility, layout),
      0,
    ) >= MAX_TRADING_MANUFACTURE_POWER_ROOMS
  ) {
    return "贸易站、制造站和发电站合计最多建设 9 间";
  }
  if (type === "hire" && getLayoutRoomCount("processing", layout) === 0) {
    return "请先建设加工站";
  }
  if (type === "training" && getLayoutRoomCount("hire", layout) === 0) {
    return "请先建设办公室";
  }
  return "";
}

function getRemoveLayoutRoomReason(type) {
  const layout = currentLayoutForEditing();
  const limits = ROOM_LAYOUT_LIMITS[type];
  if (!limits || getLayoutRoomCount(type, layout) <= limits.minRooms) {
    return "已达到该设施的最少建设数量";
  }
  if (type === "processing" && getLayoutRoomCount("hire", layout) > 0) {
    return "办公室存在时不能移除加工站";
  }
  if (type === "hire" && getLayoutRoomCount("training", layout) > 0) {
    return "训练室存在时不能移除办公室";
  }
  return "";
}

function beginLayoutEdit() {
  layoutEditDraft.value = currentLayoutForEditing().map((entry) => ({ ...entry }));
  layoutEditError.value = "";
  layoutEditorOpen.value = true;
}

function cancelLayoutEdit() {
  layoutEditDraft.value = null;
  layoutEditError.value = "";
  layoutEditorOpen.value = false;
}

function applyLayoutEdit() {
  try {
    validateLayoutConstraints(layoutEditDraft.value || currentLayoutForEditing());
    appliedLayout.value = (layoutEditDraft.value || currentLayoutForEditing()).map((entry) => ({ ...entry }));
    layoutEditDraft.value = null;
    layoutEditError.value = "";
    layoutEditorOpen.value = false;
  } catch (error) {
    layoutEditError.value = error?.message || "布局不符合限制";
  }
}

function restoreOriginalLayoutDraft() {
  const originalLayout = Array.isArray(sourceSchedule.value?.layout)
    ? sourceSchedule.value.layout
    : inferScheduleLayout(sourceSchedule.value?.plans || []);
  layoutEditDraft.value = originalLayout.map((entry) => ({ ...entry }));
  layoutEditError.value = "";
}

function addLayoutRoom(type) {
  if (getAddLayoutRoomReason(type)) {
    return;
  }
  layoutEditDraft.value = [...ensureLayoutEditDraft(), { type, level: 1 }];
  layoutEditError.value = "";
}

function removeLayoutRoom(type, roomIndex) {
  if (getRemoveLayoutRoomReason(type)) {
    return;
  }
  const layout = ensureLayoutEditDraft();
  const index = getLayoutIndex(type, roomIndex, layout);
  if (index >= 0) {
    layoutEditDraft.value = layout.filter((_, entryIndex) => entryIndex !== index);
    layoutEditError.value = "";
  }
}

function updateLayoutRoomLevel(type, roomIndex, level) {
  const layout = ensureLayoutEditDraft();
  const index = getLayoutIndex(type, roomIndex, layout);
  const value = Number(level);
  if (
    index < 0 ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > ROOM_LAYOUT_LIMITS[type].maxLevel
  ) {
    return;
  }
  layoutEditDraft.value = layout.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, level: value } : entry,
  );
  layoutEditError.value = "";
}
const packageNotices = computed(() => {
  const calculation = calculationState.value;
  if (calculation.efficiencyError) {
    return buildEfficiencyNotices({
      document: calculation.document,
      efficiencyError: calculation.efficiencyError,
    });
  }
  if (calculation.error) {
    return [{
      code: "maa-calculation-error",
      level: "error",
      message: "排班计算失败",
      details: [calculation.error],
    }];
  }
  return buildEfficiencyNotices({
    document: calculation.document,
    result: calculation.result,
  });
});
const packageNoticeGroups = computed(() =>
  NOTICE_LEVELS.map((level) => ({
    ...level,
    count: packageNotices.value.filter((notice) => notice.level === level.key).length,
    notices: packageNotices.value.filter((notice) => notice.level === level.key),
  })).filter((group) => group.count > 0),
);
const packageNoticeCount = computed(() =>
  packageNoticeGroups.value.reduce((total, group) => total + group.count, 0),
);
const rawResultJson = computed(() => (result.value ? JSON.stringify(result.value, null, 2) : ""));

function getOperatorName(operator) {
  const charId = String(operator?.charId || "").trim();
  return String(operatorTableV2?.[charId]?.name || "").trim();
}

function updateActiveOperators(operators) {
  activeOperators.value = operators;
}

function resetRoomDetailExpansion(event) {
  if (event.target.open) {
    roomDetailGeneration.value += 1;
  }
}

function normalizeRoomType(value) {
  const type = String(value || "").trim();
  return type === "office" ? "hire" : type;
}

function validateLayoutConstraints(layout) {
  if (!Array.isArray(layout) || layout.length === 0) {
    throw new Error("布局错误：布局不能为空");
  }

  const counts = new Map();
  layout.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`布局错误：第 ${index + 1} 项不是有效设施`);
    }
    const type = normalizeRoomType(entry.type);
    if (!ROOM_TYPES.has(type)) {
      throw new Error(`布局错误：第 ${index + 1} 项包含无法识别的设施`);
    }
    const limits = ROOM_LAYOUT_LIMITS[type];
    if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > limits.maxLevel) {
      throw new Error(`布局错误：${ROOM_LABELS[type]}等级必须为 1 至 ${limits.maxLevel} 级`);
    }
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  for (const [type, limits] of Object.entries(ROOM_LAYOUT_LIMITS)) {
    const count = counts.get(type) || 0;
    if (count < limits.minRooms) {
      throw new Error(`布局错误：必须包含${ROOM_LABELS[type]}`);
    }
    if (count > limits.maxRooms) {
      throw new Error(`布局错误：${ROOM_LABELS[type]}最多建设 ${limits.maxRooms} 间`);
    }
  }

  const productionRoomCount = ["trading", "manufacture", "power"].reduce(
    (total, type) => total + (counts.get(type) || 0),
    0,
  );
  if (productionRoomCount > MAX_TRADING_MANUFACTURE_POWER_ROOMS) {
    throw new Error("布局错误：贸易站、制造站和发电站合计最多建设 9 间");
  }
  if ((counts.get("training") || 0) > 0 && (counts.get("hire") || 0) === 0) {
    throw new Error("布局错误：建造训练室必须先建造办公室");
  }
  if ((counts.get("hire") || 0) > 0 && (counts.get("processing") || 0) === 0) {
    throw new Error("布局错误：建造办公室必须先建造加工站");
  }
  return layout;
}

function normalizeProduct(facility, value) {
  const text = String(value ?? "").trim();
  switch (text.toLowerCase()) {
    case "lmd":
    case "龙门币":
      return "LMD";
    case "orundum":
    case "合成玉":
      return facility === "manufacture" ? "Originium Shard" : "Orundum";
    case "originium shard":
    case "originiumshard":
    case "源石碎片":
      return facility === "trading" ? "Orundum" : "Originium Shard";
    case "battle record":
    case "experience":
    case "exp":
    case "中级作战记录":
      return "Battle Record";
    case "pure gold":
    case "gold":
    case "赤金":
      return "Pure Gold";
    default:
      return text;
  }
}

function normalizeRoom(sourceRoom, facility) {
  if (!sourceRoom || typeof sourceRoom !== "object" || Array.isArray(sourceRoom)) {
    throw new Error(`${ROOM_LABELS[facility]}包含无效房间`);
  }
  if (sourceRoom.operators !== undefined && (!Array.isArray(sourceRoom.operators) || sourceRoom.operators.some((operator) => typeof operator !== "string"))) {
    throw new Error(`${ROOM_LABELS[facility]}干员必须是名称数组`);
  }
  return {
    ...sourceRoom,
    ...(sourceRoom.product !== undefined ? { product: normalizeProduct(facility, sourceRoom.product) } : {}),
    operators: (sourceRoom.operators || []).map((operator) => operator.trim()).filter(Boolean),
  };
}

function normalizeSchedulePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("排班 JSON 顶层必须是对象");
  }
  if (!Array.isArray(payload.plans) || payload.plans.length === 0) {
    throw new Error("排班 JSON 缺少 plans 班次数组");
  }
  const plans = payload.plans.map((plan, planIndex) => {
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      throw new Error(`第 ${planIndex + 1} 班不是有效对象`);
    }
    const rooms = {};
    if (Array.isArray(plan.rooms)) {
      for (const room of plan.rooms) {
        const facility = normalizeRoomType(room?.facility);
        if (!ROOM_TYPES.has(facility)) {
          throw new Error(`第 ${planIndex + 1} 班包含无法识别的设施`);
        }
        (rooms[facility] ||= []).push(normalizeRoom(room, facility));
      }
    } else if (plan.rooms && typeof plan.rooms === "object") {
      for (const [rawFacility, sourceRooms] of Object.entries(plan.rooms)) {
        const facility = normalizeRoomType(rawFacility);
        if (!ROOM_TYPES.has(facility)) {
          throw new Error(`排班包含无法识别的设施：${rawFacility}`);
        }
        if (!Array.isArray(sourceRooms)) {
          throw new Error(`${ROOM_LABELS[facility]}必须是房间数组`);
        }
        rooms[facility] = [...(rooms[facility] || []), ...sourceRooms.map((room) => normalizeRoom(room, facility))];
      }
    } else {
      throw new Error(`第 ${planIndex + 1} 班缺少 rooms 房间配置`);
    }

    const duration = Number(plan.duration);
    return {
      ...plan,
      rooms,
      ...(Number.isFinite(duration) && duration > 0 ? { duration: Math.round(duration) } : { duration: undefined }),
    };
  });

  const layout = validateLayoutConstraints(
    resolveRiicScheduleLayout({
      layout: payload.layout,
      scheduleType: payload.scheduleType,
      plans,
    }),
  );

  const roomCountsByFacility = new Map();
  for (const plan of plans) {
    for (const [facility, rooms] of Object.entries(plan.rooms)) {
      if (!rooms.length) {
        continue;
      }
      const expectedCount = roomCountsByFacility.get(facility);
      if (expectedCount !== undefined && expectedCount !== rooms.length) {
        throw new Error(`${ROOM_LABELS[facility]}在不同班次中的房间数量不一致`);
      }
      roomCountsByFacility.set(facility, rooms.length);
    }
  }
  const scheduleFields = { ...payload };
  delete scheduleFields.scheduleType;
  return { ...scheduleFields, layout, plans };
}

function distributeMinutes(total, count) {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function getInitialPlanDurations(plans) {
  const durations = plans.map((plan) => {
    const value = Number(plan.duration);
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const missingIndexes = durations.flatMap((value, index) => (value === null ? [index] : []));
  if (missingIndexes.length === plans.length) {
    return distributeMinutes(1440, plans.length);
  }
  if (missingIndexes.length > 0) {
    const remaining = 1440 - durations.reduce((total, value) => total + (value || 0), 0);
    if (remaining < missingIndexes.length) {
      return distributeMinutes(1440, plans.length);
    }
    const replacements = distributeMinutes(remaining, missingIndexes.length);
    for (const [index, planIndex] of missingIndexes.entries()) {
      durations[planIndex] = replacements[index] || 0;
    }
  }
  return durations;
}

function applySchedule(
  payload,
  { fileName = "", fromMaaEditor = false, returnRoute = "ScheduleV2" } = {},
) {
  const layoutSource = Array.isArray(payload?.layout)
    ? "document"
    : payload?.scheduleType
      ? "schedule-type"
      : "inferred";
  const schedule = normalizeSchedulePayload(payload);
  appliedLayout.value = null;
  layoutEditDraft.value = null;
  layoutEditorOpen.value = !Array.isArray(payload.layout);
  layoutEditError.value = "";
  sourceSchedule.value = schedule;
  sourceScheduleLayoutSource.value = layoutSource;
  lmdDroneStrategyInput.value = String(schedule.settings?.lmdDroneStrategy || "");
  scheduleFileName.value = fileName;
  planDurations.value = getInitialPlanDurations(schedule.plans);
  scheduleWarnings.value = schedule.plans.flatMap((plan, index) => {
    const rawDuration = payload.plans[index]?.duration;
    return rawDuration !== undefined && !(Number.isInteger(Number(rawDuration)) && Number(rawDuration) > 0)
      ? [`${plan.name || `第 ${index + 1} 班`}的时长无效，已根据 24 小时周期自动分配。`]
      : [];
  });
  importedFromMaaEditor.value = fromMaaEditor;
  maaEditorReturnRoute.value = returnRoute;
  maaEditorScheduleType.value = fromMaaEditor ? payload.scheduleType : undefined;
}

async function handleScheduleFile(event) {
  inputError.value = "";
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    const payload = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
    applySchedule(payload, { fileName: file.name });
    ElMessage.success("排班已导入");
  } catch (error) {
    inputError.value = error?.message || "排班 JSON 读取失败";
  }
}

function openMaaEditor() {
  if (sourceSchedule.value) {
    try {
      const schedule = { ...sourceSchedule.value };
      if (maaEditorReturnRoute.value === "ScheduleV1" && maaEditorScheduleType.value !== undefined) {
        schedule.scheduleType = maaEditorScheduleType.value;
      }
      sessionStorage.setItem(
        RIIC_MAA_CALCULATOR_RETURN_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          source: "riic-maa-calculator",
          schedule,
          returnRoute: maaEditorReturnRoute.value,
        }),
      );
    } catch (error) {
      console.error("Failed to transfer original schedule to MAA editor", error);
      ElMessage.error("原始排班转交失败，请稍后重试");
      return;
    }
  }
  router.push({ name: maaEditorReturnRoute.value });
}

function consumeMaaEditorTransfer() {
  let rawTransfer = "";
  try {
    rawTransfer = sessionStorage.getItem(RIIC_MAA_EDITOR_TRANSFER_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to read RIIC MAA editor transfer", error);
    return;
  }
  if (!rawTransfer) {
    return;
  }

  let transfer;
  try {
    transfer = JSON.parse(rawTransfer);
  } catch (error) {
    sessionStorage.removeItem(RIIC_MAA_EDITOR_TRANSFER_STORAGE_KEY);
    ElMessage.error("收到的排班数据无效");
    return;
  }

  const schedule = transfer?.schedule;
  if (transfer?.version !== 1 || transfer?.source !== "riic-maa-editor" || !Array.isArray(schedule?.plans) || schedule.plans.length === 0) {
    sessionStorage.removeItem(RIIC_MAA_EDITOR_TRANSFER_STORAGE_KEY);
    ElMessage.error("收到的排班数据无效");
    return;
  }

  try {
    applySchedule(schedule, {
      fileName: "排班表MAA",
      fromMaaEditor: true,
      returnRoute: transfer.returnRoute === "ScheduleV1" ? "ScheduleV1" : "ScheduleV2",
    });
    sessionStorage.removeItem(RIIC_MAA_EDITOR_TRANSFER_STORAGE_KEY);
    ElMessage.success("已导入排班表MAA的排班");
  } catch (error) {
    console.error("Failed to import RIIC MAA editor transfer", error);
    ElMessage.error(error?.message || "导入排班表MAA的排班失败");
  }
}

onMounted(() => {
  consumeMaaEditorTransfer();
});
</script>

<template>
  <main class="maa-calculator-page">
    <header class="page-header">
      <div>
        <h1>收益计算（MAA）</h1>
        <p class="page-description">导入 MAA 排班与干员练度，计算每日产出。</p>
      </div>
      <button type="button" class="secondary-button" @click="openMaaEditor">
        <v-icon icon="mdi-pencil-outline" size="17" />
        打开排班表MAA
      </button>
    </header>

    <section class="tool-section">
      <div class="section-heading">
        <div>
          <h2>导入</h2>
          <p>MAA 排班 JSON</p>
        </div>
      </div>

      <div class="input-grid">
        <label class="file-control">
          <span class="control-label">排班 JSON</span>
          <input type="file" accept=".json,application/json" @change="handleScheduleFile" />
          <span class="file-name">{{ scheduleFileName || "选择排班文件" }}</span>
        </label>
      </div>

      <section v-if="sourceSchedule && layoutRows.length" class="layout-details">
        <header class="layout-summary">
          <div>
            <strong>基建布局 {{ layoutLabel }}</strong>
            <span class="summary-meta">{{ layoutSourceLabel }}</span>
          </div>
          <span class="summary-meta">{{ importedFromMaaEditor ? "来源：排班表MAA" : scheduleFileName }}</span>
        </header>
        <div class="layout-editor">
          <div class="layout-editor-toolbar">
            <span>{{ layoutEditorOpen ? "编辑布局" : "设施与等级" }}</span>
            <div class="layout-editor-actions">
              <button
                v-if="!layoutEditorOpen"
                type="button"
                class="secondary-button"
                @click="beginLayoutEdit"
              >
                <v-icon icon="mdi-pencil-outline" size="16" />
                编辑布局
              </button>
              <template v-else>
                <button type="button" class="secondary-button" @click="restoreOriginalLayoutDraft">
                  <v-icon icon="mdi-backup-restore" size="16" />
                  恢复原布局
                </button>
                <button type="button" class="secondary-button" @click="cancelLayoutEdit">
                  取消
                </button>
                <button type="button" class="primary-button layout-apply" @click="applyLayoutEdit">
                  <v-icon icon="mdi-check" size="16" />
                  应用布局
                </button>
              </template>
            </div>
          </div>
          <div class="layout-overview">
            <section
              v-for="row in layoutRows"
              :key="row.key"
              class="layout-editor-row"
            >
              <div
                :class="{ 'layout-editor-support-scroll': row.key === 'support' }"
                :role="row.key === 'support' ? 'region' : undefined"
                :tabindex="row.key === 'support' ? 0 : undefined"
                :aria-label="row.key === 'support' ? '会客室、加工站、办公室和训练室' : undefined"
              >
                <div
                  class="layout-editor-facilities"
                  :class="row.key === 'support' ? 'layout-editor-facilities-support' : 'layout-editor-facilities-single'"
                >
                  <section
                    v-for="facility in row.facilities"
                    :key="facility.key"
                    class="layout-editor-facility"
                  >
                    <header class="layout-editor-facility-heading">
                      <strong>{{ facility.label }}</strong>
                      <button
                        v-if="layoutEditorOpen && facility.rooms.length < facility.limits.maxRooms"
                        type="button"
                        class="secondary-button layout-add-room"
                        :disabled="Boolean(getAddLayoutRoomReason(facility.key))"
                        :title="getAddLayoutRoomReason(facility.key) || `添加${facility.label}`"
                        @click="addLayoutRoom(facility.key)"
                      >
                        <v-icon icon="mdi-plus" size="16" />
                        添加
                      </button>
                    </header>
                    <div class="layout-editor-facility-content">
                      <p
                        v-if="layoutEditorOpen && !facility.rooms.length && ['hire', 'training'].includes(facility.key) && getAddLayoutRoomReason(facility.key)"
                        class="layout-editor-hint"
                      >
                        {{ getAddLayoutRoomReason(facility.key) }}
                      </p>
                      <div v-if="facility.rooms.length" class="layout-editor-rooms">
                        <div
                          v-for="(room, index) in facility.rooms"
                          :key="`${facility.key}-${index}`"
                          class="layout-editor-room"
                        >
                          <template v-if="layoutEditorOpen">
                            <el-select
                              :model-value="room.level"
                              size="small"
                              :aria-label="`${facility.label}${index + 1} 等级`"
                              @change="updateLayoutRoomLevel(facility.key, index, $event)"
                            >
                              <el-option
                                v-for="level in getLayoutLevels(facility.key)"
                                :key="level"
                                :label="`${level} 级`"
                                :value="level"
                              />
                            </el-select>
                            <button
                              type="button"
                              class="icon-button layout-remove-room"
                              :disabled="Boolean(getRemoveLayoutRoomReason(facility.key))"
                              :title="getRemoveLayoutRoomReason(facility.key) || `移除${facility.label}${index + 1}`"
                              :aria-label="`移除${facility.label}${index + 1}`"
                              @click="removeLayoutRoom(facility.key, index)"
                            >
                              <v-icon icon="mdi-delete-outline" size="17" />
                            </button>
                          </template>
                          <strong v-else>Lv.{{ room.level }}</strong>
                        </div>
                      </div>
                      <p v-else class="empty-hint">未建设</p>
                      <p
                        v-if="layoutEditorOpen && facility.rooms.length && getRemoveLayoutRoomReason(facility.key)"
                        class="layout-editor-hint"
                      >
                        {{ getRemoveLayoutRoomReason(facility.key) }}
                      </p>
                    </div>
                  </section>
                </div>
              </div>
              <div
                v-if="row.key === 'dormitory' && showLayoutPowerSummary"
                class="layout-power-summary"
                :class="{ overloaded: layoutPowerSummary.overloaded }"
              >
                <v-icon icon="mdi-lightning-bolt" size="18" />
                <strong>{{ layoutPowerSummary.overloaded ? "电力不足" : "电力充足" }}</strong>
                <span>消耗 {{ layoutPowerSummary.consumption }} / 供电 {{ layoutPowerSummary.supply }}</span>
                <span>
                  {{
                    layoutPowerSummary.overloaded
                      ? `超载 ${Math.abs(layoutPowerSummary.remaining)}`
                      : `剩余 ${layoutPowerSummary.remaining}`
                  }}
                </span>
              </div>
            </section>
          </div>
          <p v-if="layoutEditError" class="error-message">{{ layoutEditError }}</p>
        </div>
      </section>

      <p v-if="inputError || calculationError" class="error-message">
        {{ inputError || calculationError }}
      </p>
      <ul v-if="scheduleWarnings.length" class="warning-list">
        <li v-for="(warning, index) in scheduleWarnings" :key="index">
          {{ warning }}
        </li>
      </ul>
    </section>

    <RiicMaaOperatorProgressionEditor
      v-model:treat-skills-as-unlocked="treatSkillsAsUnlocked"
      @profiles-change="updateActiveOperators"
    />

    <details class="tool-section calculation-settings-module">
      <summary class="section-heading calculation-settings-summary">
        <div>
          <h2>
            <span class="disclosure-chevron" aria-hidden="true">
              <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
              <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
            </span>
            计算设置
          </h2>
        </div>
      </summary>

      <div class="efficiency-settings">
        <p class="efficiency-settings-note">修改设置后会自动重算</p>
        <header class="efficiency-settings-heading">
          <strong>计算选项</strong>
          <button type="button" class="secondary-button" @click="restoreDefaultEfficiencySettings">
            <v-icon icon="mdi-backup-restore" size="16" />
            恢复默认
          </button>
        </header>
        <div class="efficiency-settings-grid">
          <label class="efficiency-setting">
            <el-switch v-model="efficiencySettings.clueExchanging" />
            <span class="efficiency-setting-copy">
              <strong>处于线索交流</strong>
              <small>影响“跃跃”等干员技能</small>
            </span>
          </label>
          <label class="efficiency-setting">
            <el-switch v-model="efficiencySettings.dormFullTreat" />
            <span class="efficiency-setting-copy">
              <strong>宿舍按满员处理</strong>
              <small>影响“迷迭香”、“塑心”等干员技能</small>
            </span>
          </label>
          <label class="efficiency-setting">
            <el-switch v-model="efficiencySettings.preferMaxJieEfficiency" />
            <span class="efficiency-setting-copy">
              <strong>精 0 孑按最高效率计算</strong>
            </span>
          </label>
          <label class="efficiency-setting">
            <el-switch
              :model-value="efficiencySettings.overflowMode === 'zero'"
              @change="efficiencySettings.overflowMode = $event ? 'zero' : 'continue'"
            />
            <span class="efficiency-setting-copy">
              <strong>生产爆仓后截断</strong>
              <small>不包含无人机使用的爆仓截断</small>
            </span>
          </label>
          <label class="efficiency-setting">
            <el-switch
              :model-value="efficiencySettings.droneOverflowMode === 'zero'"
              @change="efficiencySettings.droneOverflowMode = $event ? 'zero' : 'continue'"
            />
            <span class="efficiency-setting-copy">
              <strong>无人机爆仓后截断</strong>
            </span>
          </label>
          <label class="efficiency-setting-progress">
            <span class="efficiency-setting-copy">
              <strong>首件进度</strong>
              <small>影响爆仓时间和精 0 孑平均效率</small>
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              :value="efficiencySettings.firstItemProgress * 100"
              @change="updateFirstItemProgress"
            />
            <span class="efficiency-setting-unit">%</span>
          </label>
        </div>
      </div>

      <section class="sanity-source-box">
        <header class="sanity-source-heading"><h3>理智折算来源</h3></header>
        <div class="sanity-source-content">
          <div class="sanity-source-toolbar">
            <label class="sanity-source-mode-control">
              <span>理智值来源</span>
              <el-switch
                v-model="useYituliuSanityValues"
                active-text="一图流网页"
                inactive-text="riic-efficiency package"
              />
            </label>
            <button type="button" class="secondary-button" @click="restoreDefaultSanityValues">
              <v-icon icon="mdi-backup-restore" size="16" />
              恢复默认理智
            </button>
          </div>
          <div :class="['sanity-source-groups', { 'sanity-source-groups-single': !useYituliuSanityValues }]">
            <section v-for="group in sanitySourceGroups" :key="group.key" class="sanity-source-group">
              <h4>{{ group.label }}</h4>
              <ul>
                <li v-for="item in group.items" :key="item.resource">
                  <label :for="`sanity-value-${item.resource}`">{{ item.label }}</label>
                  <div class="sanity-source-value">
                    <input
                      :id="`sanity-value-${item.resource}`"
                      type="number"
                      min="0"
                      step="any"
                      :value="item.value === null || item.value === undefined ? '' : formatNumber(item.value, 8)"
                      :aria-label="`${item.label}理智价值`"
                      placeholder="未设置"
                      @change="updatePageSanityValue(item.valueKey, $event.target.value)"
                    />
                    <small>理智/{{ item.amountUnit }}</small>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </details>

    <section class="tool-section result-module">
      <div class="section-heading"><div><h2>计算结果</h2></div></div>
      <details v-if="packageNoticeGroups.length" class="package-notices" aria-label="计算提示">
      <summary class="package-notices-summary">
        <h2>
          <span class="disclosure-chevron" aria-hidden="true">
            <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
            <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
          </span>
          计算提示
        </h2>
        <span class="summary-meta">提示 · {{ packageNoticeCount }}</span>
      </summary>
      <div class="package-notice-groups">
        <section
          v-for="group in packageNoticeGroups"
          :key="group.key"
          class="package-notice-group"
        >
          <h3>{{ group.label }} · {{ group.count }}</h3>
          <v-alert
            v-for="(notice, index) in group.notices"
            :key="`${notice.code}:${index}`"
            :type="group.key"
            variant="tonal"
            density="compact"
            border="start"
            :title="notice.message"
          >
            <ul v-if="notice.details?.length" class="package-notice-details">
              <li v-for="(detail, detailIndex) in notice.details" :key="`${notice.code}:${detailIndex}`">
                {{ detail }}
              </li>
            </ul>
          </v-alert>
        </section>
      </div>
      </details>

      <template v-if="result">
      <section v-if="unmatchedOperatorNames.length" class="status-banner">
        <v-icon icon="mdi-alert-outline" size="22" />
        <div>
          <strong>有 {{ unmatchedOperatorNames.length }} 名干员没有 roster 练度</strong>
          <span>这些干员使用 riic-efficiency 的技能默认状态：{{ unmatchedOperatorNames.join("、") }}</span>
        </div>
      </section>

      <details class="result-block" open>
        <summary>
          <span>
            <span class="disclosure-chevron" aria-hidden="true">
              <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
              <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
            </span>
            每日产出总览
          </span>
          <span class="summary-meta">{{ dailyOutput?.cycleHours ? formatDisplayValue(dailyOutput.cycleHours) + "周期" : "" }}</span>
        </summary>
        <div class="result-body">
          <p v-if="dailyOutput?.warning" class="warning-text">{{ dailyOutput.warning }}</p>
          <div class="resource-amount-control" role="group" aria-label="赤金与中级作战记录的显示方式">
            <span>赤金 / 中级作战记录</span>
            <div class="segmented-control">
              <button
                v-for="mode in RESOURCE_AMOUNT_DISPLAY_MODES"
                :key="mode.key"
                type="button"
                :class="{ active: resourceAmountDisplayMode === mode.key }"
                :aria-pressed="resourceAmountDisplayMode === mode.key"
                @click="resourceAmountDisplayMode = mode.key"
              >{{ mode.label }}</button>
            </div>
          </div>
          <div v-if="dailyOutput?.tiles?.length || dailyOutput?.totalTile" class="tile-grid">
            <RiicDisplayTile v-for="tile in dailyOutput?.tiles || []" :key="tile.key" :tile="tile" />
            <RiicDisplayTile v-if="dailyOutput?.totalTile" :tile="dailyOutput.totalTile" />
          </div>
          <p v-else class="empty-hint">{{ dailyOutput?.empty || "当前排班没有可统计的产出" }}</p>
        </div>
      </details>

      <details class="result-block">
        <summary>
          <span>
            <span class="disclosure-chevron" aria-hidden="true">
              <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
              <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
            </span>
            {{ hasMaaDroneUsage ? "无人机加速结果" : droneStrategyDisplay?.label || "无人机使用策略" }}
          </span>
          <span class="summary-meta">{{ hasMaaDroneUsage ? "MAA 无人机加速结果" : `${droneScenarioRows.length} 个加速项目` }}</span>
        </summary>
        <div class="result-body">
          <template v-if="hasMaaDroneUsage">
            <div v-if="hasDroneOutput" class="card-list queue-columns">
              <RiicDisplayCard
                v-for="card in dronePane.cards"
                :key="card.key"
                :card="card"
                collapsible
                default-open
              />
            </div>
            <p v-else class="empty-hint">当前排班没有无人机加速结果。</p>
          </template>
          <template v-else>
            <div class="drone-strategy-form">
              <label for="lmd-drone-strategy">{{ droneStrategyDisplay?.inputLabel || "龙门币加速策略" }}</label>
              <input
                id="lmd-drone-strategy"
                v-model="lmdDroneStrategyInput"
                type="text"
                placeholder="例如：3 但书 龙舌兰2"
                autocomplete="off"
              />
              <div class="drone-strategy-help">
                <p>
                  输入格式为“贸易站等级 干员名…”，例如 <code>3 但书 龙舌兰2</code>。干员名末尾的 0、1、2 分别表示精 0、精 1、精 2。
                </p>
                <p>留空时，查找排班中最低等级的贸易站并使用对应默认策略：</p>
                <ul>
                  <li v-for="row in DEFAULT_LMD_DRONE_STRATEGY_ROWS" :key="row.level">
                    {{ row.strategy }}
                  </li>
                </ul>
              </div>
              <p v-if="droneCalculation?.strategyLabel" class="effective-drone-strategy">
                {{ droneCalculation.strategyLabel }}
              </p>
              <p v-if="droneStrategyDisplay?.strategyError" class="warning-text">
                {{ droneStrategyDisplay.strategyError }}
              </p>
            </div>
            <div v-if="droneScenarioRows.length" class="drone-table-wrap">
              <table class="drone-strategy-table">
                <thead>
                  <tr>
                    <th>无人机加速项目</th>
                    <th>加速增量</th>
                    <th>额外消耗</th>
                    <th>加速后每日产出</th>
                    <th>消耗材料净收入</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in droneScenarioRows" :key="row.key">
                    <td>
                      <strong>{{ row.title ? formatDisplayValue(row.title) : resourceLabel(row.product) }}</strong>
                      <small v-if="row.meta">{{ formatDisplayValue(row.meta) }}</small>
                      <small v-for="(rate, index) in row.baseRateLines" :key="`${row.key}-rate-${index}`">
                        {{ formatDisplayValue(rate) }}
                      </small>
                    </td>
                    <td>
                      <template v-if="row.product === '龙门币'">
                        {{ formatNumber(row.extraAmount) }} 龙门币
                      </template>
                      <template v-else-if="row.extraOutput">
                        {{ formatDisplayValue(row.extraOutput.main) }}<template v-if="row.extraOutput.mainUnit"> {{ row.extraOutput.mainUnit }}</template>
                        <small v-for="line in row.extraOutput.lines || []" :key="line.key">
                          {{ formatDisplayValue(line.value) }}
                        </small>
                      </template>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <div v-if="row.materials.length" class="drone-cell-lines">
                        <span v-for="material in row.materials" :key="material.resource">
                          {{ formatDroneMaterialAmount(material.amount, material.resource) }}
                        </span>
                      </div>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <div v-if="row.dailyOutputTile" class="drone-cell-lines">
                        <span>
                          {{ formatDisplayValue(row.dailyOutputTile.main) }}
                          <template v-if="row.dailyOutputTile.mainUnit">{{ row.dailyOutputTile.mainUnit }}</template>
                        </span>
                      </div>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <div v-if="row.materials.length" class="drone-cell-lines">
                        <span v-for="material in row.materials" :key="material.resource">
                          <template v-if="material.dailyNetLine">
                            {{ formatDisplayValue(material.dailyNetLine) }}
                          </template>
                          <template v-else>未计算</template>
                        </span>
                      </div>
                      <span v-else>-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="empty-hint">{{ droneStrategyDisplay?.empty || "当前排班没有可加速的道具产出。" }}</p>
          </template>
        </div>
      </details>

      <details class="result-block">
        <summary>
          <span>
            <span class="disclosure-chevron" aria-hidden="true">
              <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
              <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
            </span>
            基础价值点
          </span>
          <span class="summary-meta">{{ basePoints?.columns?.length || 0 }} 个班次</span>
        </summary>
        <div class="result-body">
          <div v-if="basePoints?.columns?.length" class="base-point-grid queue-columns">
            <section v-for="column in basePoints.columns" :key="column.key" class="base-point-column">
              <header>
                <span class="pane-label">{{ column.title ? formatDisplayValue(column.title) : "" }}</span>
                <span v-if="column.subtitle" class="summary-meta">{{ formatDisplayValue(column.subtitle) }}</span>
              </header>
              <div class="base-point-items">
                <article v-for="point in column.points" :key="point.key" class="base-point-item">
                  <div class="base-point-value">
                    <span>{{ point.name ? formatDisplayValue(point.name) : "" }}</span>
                    <strong>{{ point.value ? formatDisplayValue(point.value) : "" }}</strong>
                  </div>
                  <ul v-if="point.sources?.length" class="base-point-sources">
                    <li v-for="source in point.sources" :key="source.key" class="base-point-source">
                      <span>{{ source.label ? formatDisplayValue(source.label) : "" }}</span>
                      <strong>{{ source.value ? formatDisplayValue(source.value) : "" }}</strong>
                    </li>
                  </ul>
                </article>
              </div>
              <p v-if="!column.points?.length" class="empty-hint">{{ column.empty }}</p>
            </section>
          </div>
          <p v-else class="empty-hint">当前排班没有基础价值点记录。</p>
        </div>
      </details>

      <details v-if="queueCalculationPane" class="result-block queue-calculation-block">
        <summary>
          <span>
            <span class="disclosure-chevron" aria-hidden="true">
              <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
              <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
            </span>
            {{ queueCalculationPane.label }}
          </span>
          <span v-if="queueCalculationPane.hint" class="summary-meta">{{ formatDisplayValue(queueCalculationPane.hint) }}</span>
        </summary>
        <div class="result-body">
          <div v-if="queueCalculationPane.cards?.length" class="card-list queue-columns queue-calculation-cards">
            <RiicDisplayCard
              v-for="card in queueCalculationPane.cards"
              :key="card.key"
              :card="card"
              collapsible
              default-open
            />
          </div>
          <p v-else class="empty-hint">当前没有队列计算明细。</p>
        </div>
      </details>

      <details class="result-block room-efficiency-block" @toggle="resetRoomDetailExpansion">
        <summary>
          <span>
            <span class="disclosure-chevron" aria-hidden="true">
              <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
              <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
            </span>
            房间效率明细
          </span>
          <span class="summary-meta">{{ facilitySteps?.steps?.length || 0 }} 个房间状态</span>
        </summary>
        <div class="result-body">
          <div class="step-mode">
            <button type="button" :class="{ active: stepMode === 'facility' }" @click="stepMode = 'facility'">队列折叠</button>
            <button type="button" :class="{ active: stepMode === 'queue' }" @click="stepMode = 'queue'">队列展开</button>
          </div>
          <div v-if="facilityPanes.length" :key="roomDetailGeneration" class="pane-list">
            <details v-for="pane in facilityPanes" :key="pane.key" class="pane">
              <summary class="pane-header">
                <span class="pane-label">
                  <span class="disclosure-chevron" aria-hidden="true">
                    <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
                    <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
                  </span>
                  {{ pane.label }}
                </span>
                <span v-if="pane.badge" class="pane-badge">{{ formatDisplayValue(pane.badge) }}</span>
              </summary>
              <div class="card-list queue-columns">
                <RiicDisplayCard
                  v-for="card in pane.cards"
                  :key="card.key"
                  :card="card"
                  collapsible
                  default-open
                />
              </div>
            </details>
          </div>
          <div v-else-if="facilityCards.length" :key="roomDetailGeneration" class="card-list">
            <RiicDisplayCard
              v-for="card in facilityCards"
              :key="card.key"
              :card="card"
              collapsible
              :default-open="false"
            />
          </div>
          <p v-else class="empty-hint">当前排班没有可展示的房间效率明细。</p>
        </div>
      </details>

      <details class="result-block" @toggle="showRawResult = $event.target.open">
        <summary>
          <span>
            <span class="disclosure-chevron" aria-hidden="true">
              <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
              <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
            </span>
            完整 riic-efficiency 结果 JSON
          </span>
        </summary>
        <div class="result-body">
          <pre v-if="showRawResult">{{ rawResultJson }}</pre>
        </div>
      </details>
      </template>

      <section v-else-if="!sourceSchedule && !inputError" class="empty-state">
        <v-icon icon="mdi-file-upload-outline" size="42" />
        <h2>等待导入排班 JSON</h2>
        <p>可以直接上传 MAA 排班文件，或从排班表MAA页面跳转导入。</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.maa-calculator-page {
  --maa-gap-1: 4px;
  --maa-gap-2: 8px;
  --maa-gap-3: 12px;
  --maa-gap-4: 16px;
  --maa-radius: 4px;
  --maa-border: var(--el-border-color-light, var(--c-border-color));
  --maa-panel: var(--c-card-background-color, #fff);
  --maa-soft-panel: var(--c-page-background-color-secondary, #f9f9f9);
  --maa-control-height: 36px;
  --maa-compact-control-height: 32px;
  width: min(1180px, calc(100% - 32px));
  margin: 24px auto 48px;
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.6;
}

.page-header,
.section-heading,
.pane-header {
  display: flex;
  align-items: center;
}
.page-header,
.section-heading,
.pane-header {
  justify-content: space-between;
  gap: 16px;
}
.page-header {
  margin-bottom: 18px;
}
h1,
h2,
p {
  margin-top: 0;
}
h1 {
  margin-bottom: 6px;
  font-size: 24px;
  line-height: 1.4;
}
h2 {
  margin-bottom: 4px;
  font-size: 18px;
  line-height: 1.45;
}
.page-description,
.section-heading p,
.empty-state,
.empty-hint,
.summary-meta,
.file-name {
  color: var(--c-text-color-secondary, #6b7280);
}
.page-description {
  margin-bottom: 0;
}
.tool-section {
  margin-top: 14px;
  padding: var(--maa-gap-4);
  border: 1px solid var(--maa-border);
  border-radius: var(--maa-radius);
  background: var(--maa-panel);
}
.calculation-settings-summary {
  list-style: none;
  cursor: pointer;
}
.calculation-settings-summary h2 {
  margin: 0;
}
.section-heading p {
  margin: 4px 0 0;
  line-height: 1.5;
}
.input-grid {
  display: grid;
  grid-template-columns: minmax(0, 620px);
  gap: var(--maa-gap-3);
  margin-top: var(--maa-gap-4);
}
.file-control {
  position: relative;
  display: grid;
  gap: var(--maa-gap-2);
  min-height: 74px;
  padding: var(--maa-gap-3);
  border: 1px dashed var(--maa-border);
  border-radius: 3px;
  background: var(--maa-soft-panel);
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease;
}
.file-control:hover,
.file-control:focus-within {
  border-color: var(--riic-blue, #2878c8);
}
.file-control input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
}
.control-label,
.switch-control span {
  font-weight: 600;
}
.file-name {
  font-size: 13px;
}
.switch-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--maa-gap-2);
  box-sizing: border-box;
  height: var(--maa-control-height);
  min-height: var(--maa-control-height);
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--riic-blue, #2878c8) 42%, var(--maa-border));
  border-radius: 3px;
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 8%, transparent);
  color: var(--riic-blue, #2878c8);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease;
}
.secondary-button:hover:not(:disabled) {
  border-color: var(--riic-blue, #2878c8);
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 14%, transparent);
}
.secondary-button:disabled,
.layout-apply:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.layout-details {
  margin-top: var(--maa-gap-4);
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.layout-summary,
.layout-summary > div,
.layout-editor-toolbar,
.layout-editor-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.layout-summary {
  justify-content: space-between;
  padding-bottom: var(--maa-gap-2);
  border-bottom: 1px solid var(--maa-border);
}
.layout-summary strong {
  color: var(--c-text-color);
}
.layout-editor {
  margin-top: var(--maa-gap-3);
}
.layout-editor-toolbar {
  justify-content: space-between;
  margin-bottom: var(--maa-gap-2);
}
.layout-editor-actions {
  justify-content: flex-end;
}
.layout-apply {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--maa-gap-2);
  box-sizing: border-box;
  height: var(--maa-control-height);
  min-height: var(--maa-control-height);
  padding: 0 12px;
  border: 1px solid var(--riic-blue, #2878c8);
  border-radius: 3px;
  background: var(--riic-blue, #2878c8);
  color: #fff;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: filter 120ms ease;
}
.layout-apply:hover:not(:disabled) {
  filter: brightness(1.08);
}
.layout-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  margin-top: 4px;
}
.layout-editor-row {
  min-width: 0;
  padding: var(--maa-gap-1) 0;
  border-bottom: 1px solid var(--maa-border);
}
.layout-editor-support-scroll {
  min-width: 0;
  overflow-x: auto;
}
.layout-editor-support-scroll:focus-visible {
  outline: 2px solid var(--riic-blue, #2878c8);
  outline-offset: 2px;
}
.layout-editor-facilities-single {
  display: block;
}
.layout-editor-facilities-support {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
  width: max-content;
  min-width: 100%;
}
.layout-editor-facility {
  min-width: 0;
}
.layout-editor-facilities-single .layout-editor-facility {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}
.layout-editor-facility-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 30px;
}
.layout-editor-facilities-single .layout-editor-facility-heading {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}
.layout-editor-facility-heading strong {
  min-width: 0;
  color: var(--c-text-color);
}
.layout-editor-facility-content {
  min-width: 0;
}
.layout-editor-facilities-single .layout-editor-facility-content {
  grid-column: 2;
  grid-row: 1;
}
.layout-editor-facilities-support .layout-editor-facility {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.layout-editor-facilities-support .layout-editor-facility-heading {
  flex: 0 0 auto;
  min-height: 0;
}
.layout-editor-hint {
  margin: 4px 0 0;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
  line-height: 1.3;
  white-space: nowrap;
  overflow-wrap: normal;
}
.layout-add-room {
  box-sizing: border-box;
  height: var(--maa-compact-control-height);
  min-height: var(--maa-compact-control-height);
  margin-left: 0;
  padding: 0 8px;
  font-size: 12px;
}
.layout-editor-rooms {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-width: 0;
}
.layout-editor-room {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--maa-compact-control-height);
  flex: 0 0 auto;
}
.layout-editor-room strong {
  color: var(--c-text-color);
  font-variant-numeric: tabular-nums;
}
.layout-editor-room .el-select {
  width: 92px;
}
.layout-remove-room {
  width: 30px;
  height: 30px;
}
.layout-remove-room:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.layout-power-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 10px;
  padding: var(--maa-gap-2) var(--maa-gap-3);
  border-left: 3px solid #3c9c72;
  background: color-mix(in srgb, #3c9c72 9%, transparent);
  color: var(--c-text-color);
  font-variant-numeric: tabular-nums;
}
.layout-power-summary.overloaded {
  border-left-color: #c0392b;
  background: color-mix(in srgb, #c0392b 9%, transparent);
  color: #c0392b;
}
.layout-power-summary strong {
  font-weight: 700;
}
.efficiency-settings {
  margin-top: var(--maa-gap-4);
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.efficiency-settings-note {
  margin: 0 0 var(--maa-gap-2);
  line-height: 1.5;
}
.efficiency-settings-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--c-text-color);
}
.efficiency-settings-heading strong {
  font-size: 15px;
}
.efficiency-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--maa-gap-2);
}
.efficiency-setting,
.efficiency-setting-progress {
  display: flex;
  align-items: center;
  gap: var(--maa-gap-2);
  min-width: 0;
  min-height: var(--maa-control-height);
  padding: var(--maa-gap-2) var(--maa-gap-3);
  border-radius: 3px;
  background: var(--maa-soft-panel);
}
.efficiency-setting-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
  color: var(--c-text-color);
}
.efficiency-setting-copy strong {
  font-size: 13px;
  font-weight: 600;
}
.efficiency-setting-copy small,
.efficiency-setting-unit {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
}
.efficiency-setting-progress input {
  box-sizing: border-box;
  width: 86px;
  min-width: 0;
  margin-left: auto;
  min-height: var(--maa-compact-control-height);
  padding: 4px 8px;
  border: 1px solid var(--maa-border);
  border-radius: 3px;
  background: var(--c-bg-color, transparent);
  color: var(--c-text-color);
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.sanity-source-box {
  margin-top: var(--maa-gap-4);
  padding-top: var(--maa-gap-4);
  border-top: 1px solid var(--maa-border);
}
.sanity-source-heading h3 {
  margin: 0;
  font-size: 15px;
}
.sanity-source-content {
  padding-top: var(--maa-gap-3);
}
.sanity-source-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  margin-bottom: 8px;
}
.sanity-source-mode-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
}
.sanity-source-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--maa-gap-4);
  margin-top: var(--maa-gap-3);
}
.sanity-source-groups-single {
  grid-template-columns: minmax(0, 1fr);
}
.sanity-source-group + .sanity-source-group {
  padding-left: var(--maa-gap-4);
  border-left: 1px solid var(--maa-border);
}
.sanity-source-group h4 {
  margin: 0 0 6px;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
  font-weight: 600;
}
.sanity-source-group ul {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  line-height: 1.5;
}
.sanity-source-group li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--maa-gap-2);
  min-height: 36px;
  border-bottom: 1px solid var(--maa-border);
}
.sanity-source-group li label {
  min-width: 0;
  color: var(--c-text-color-secondary, #6b7280);
  overflow-wrap: anywhere;
}
.sanity-source-value {
  display: flex;
  align-items: center;
  gap: var(--maa-gap-1);
  min-width: 0;
}
.sanity-source-value input {
  box-sizing: border-box;
  width: 92px;
  min-width: 0;
  min-height: var(--maa-compact-control-height);
  padding: 4px 7px;
  border: 1px solid var(--maa-border);
  border-radius: 3px;
  background: var(--c-bg-color, transparent);
  color: var(--c-text-color);
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.sanity-source-value small {
  color: var(--c-text-color-secondary, #6b7280);
  white-space: nowrap;
}
.error-message {
  margin: var(--maa-gap-3) 0 0;
  line-height: 1.6;
  color: #c0392b;
}
.warning-list,
.status-banner ul {
  margin: var(--maa-gap-3) 0 0;
  padding-left: 20px;
  color: #986c00;
  line-height: 1.6;
}
.status-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--maa-gap-3);
  margin-top: var(--maa-gap-4);
  padding: var(--maa-gap-3);
  border-radius: 3px;
  border-left: 3px solid #c89a20;
  background: color-mix(in srgb, #f1c75b 12%, transparent);
}
.status-banner > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.status-banner strong {
  color: var(--c-text-color);
}
.package-notices {
  display: grid;
  gap: 0;
  margin-top: var(--maa-gap-4);
  padding: 0;
  border: 1px solid var(--maa-border);
  border-radius: 3px;
  background: var(--maa-soft-panel);
}
.package-notices h2 {
  margin: 0;
}
.package-notices-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: var(--maa-control-height);
  padding: 0 var(--maa-gap-3);
  list-style: none;
  cursor: pointer;
}
.package-notice-groups {
  display: grid;
  gap: var(--maa-gap-3);
  padding: 0 var(--maa-gap-3) var(--maa-gap-3);
}
.package-notice-group {
  display: grid;
  gap: var(--maa-gap-2);
  min-width: 0;
}
.package-notice-group h3 {
  margin: 0;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
  font-weight: 600;
}
.package-notice-details {
  margin: 0;
  padding-left: 18px;
  overflow-wrap: anywhere;
}
.package-notice-details li + li {
  margin-top: 4px;
}
.result-block {
  margin-top: var(--maa-gap-3);
  padding-top: var(--maa-gap-3);
  border-top: 1px solid var(--maa-border);
}
.result-block > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--maa-gap-3);
  min-height: var(--maa-control-height);
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
}
.result-body {
  padding-top: var(--maa-gap-3);
}
.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--maa-gap-4);
}
.resource-amount-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: var(--maa-gap-3);
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.segmented-control {
  display: inline-flex;
  flex-wrap: nowrap;
}
.segmented-control button {
  min-height: var(--maa-compact-control-height);
  padding: 0 10px;
  border: 1px solid var(--c-border-color);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.segmented-control button + button {
  margin-left: -1px;
}
.segmented-control button:first-child {
  border-radius: 3px 0 0 3px;
}
.segmented-control button:last-child {
  border-right-width: 1px;
  border-radius: 0 3px 3px 0;
}
.segmented-control button.active {
  position: relative;
  z-index: 1;
  border-color: var(--riic-blue, #2878c8);
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 10%, transparent);
  color: var(--riic-blue, #2878c8);
}
.drone-strategy-form {
  display: grid;
  gap: 6px;
  max-width: 720px;
  margin-bottom: var(--maa-gap-4);
  font-size: 13px;
}
.drone-strategy-form label {
  color: var(--c-text-color);
  font-weight: 600;
}
.drone-strategy-form input {
  box-sizing: border-box;
  width: min(100%, 440px);
  min-height: var(--maa-control-height);
  padding: 6px 9px;
  border: 1px solid var(--maa-border);
  border-radius: 3px;
  background: var(--c-bg-color, transparent);
  color: var(--c-text-color);
  font: inherit;
}
.drone-strategy-form p {
  margin: 0;
  color: var(--c-text-color-secondary, #6b7280);
  line-height: 1.5;
}
.drone-strategy-help ul {
  display: grid;
  gap: 2px;
  margin: 0;
  padding-left: 18px;
  color: var(--c-text-color-secondary, #6b7280);
  line-height: 1.5;
}
.drone-strategy-form .effective-drone-strategy {
  color: var(--c-text-color);
  font-weight: 600;
}
.drone-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}
.drone-strategy-table {
  width: 100%;
  min-width: 940px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}
.drone-strategy-table th,
.drone-strategy-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--maa-border);
  text-align: left;
  vertical-align: middle;
  overflow-wrap: anywhere;
}
.drone-strategy-table th {
  color: var(--c-text-color-secondary, #6b7280);
  font-weight: 600;
}
.drone-strategy-table th:first-child {
  width: 22%;
}
.drone-strategy-table th:nth-child(2),
.drone-strategy-table th:nth-child(3) {
  width: 17%;
}
.drone-strategy-table th:nth-child(4),
.drone-strategy-table th:nth-child(5) {
  width: 22%;
}
.drone-cell-lines {
  display: grid;
  gap: 4px;
}
.drone-strategy-table td:first-child small {
  display: block;
  margin-top: 4px;
}
.drone-strategy-table td:first-child small,
.drone-strategy-table td small {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
}
.queue-calculation-block :deep(.riic-display-section-label),
.room-efficiency-block :deep(.riic-display-section-label) {
  color: var(--c-text-color);
}
.queue-calculation-cards :deep(.riic-display-section.riic-display-section-nested) {
  margin-left: 0;
  padding-left: 0;
  border-left: 0;
}
.tile-group + .tile-group {
  margin-top: var(--maa-gap-4);
}
.card-list,
.pane-list {
  display: grid;
  gap: var(--maa-gap-4);
}
.queue-columns {
  display: flex;
  flex-flow: row nowrap;
  gap: var(--maa-gap-4);
  min-width: 0;
  overflow-x: auto;
  padding-bottom: var(--maa-gap-2);
}
.queue-columns > * {
  flex: 1 0 320px;
  min-width: 320px;
}
.pane {
  display: grid;
  gap: 8px;
}
.pane > summary {
  list-style: none;
  cursor: pointer;
}
.pane > summary::-webkit-details-marker {
  display: none;
}
.pane + .pane {
  margin-top: var(--maa-gap-3);
}
.pane-label {
  font-weight: 600;
}
.pane-badge {
  color: var(--riic-blue, #2878c8);
  font-variant-numeric: tabular-nums;
}
.step-mode {
  display: inline-flex;
  gap: 6px;
  margin-bottom: 12px;
}
.step-mode button {
  min-height: var(--maa-compact-control-height);
  padding: 0 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.step-mode button.active {
  border-color: var(--riic-blue, #2878c8);
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 10%, transparent);
  color: var(--riic-blue, #2878c8);
}
.base-point-grid {
  display: flex;
}
.base-point-column {
  padding: var(--maa-gap-3);
  border: 1px solid var(--maa-border);
  border-radius: 3px;
  background: var(--maa-soft-panel);
}
.base-point-column header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--c-border-color);
}
.base-point-items {
  display: grid;
  gap: 12px;
  margin-top: 8px;
}
.base-point-item {
  min-width: 0;
  padding-top: 8px;
  border-top: 1px solid var(--c-border-color);
}
.base-point-item:first-child {
  padding-top: 0;
  border-top: 0;
}
.base-point-value {
  display: grid;
  grid-template-columns: minmax(0, max-content) minmax(0, max-content);
  align-items: baseline;
  justify-content: start;
  column-gap: 12px;
}
.base-point-value > span {
  color: var(--c-text-color);
  font-weight: 600;
}
.base-point-value > strong {
  color: var(--c-text-color);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.base-point-sources {
  display: grid;
  grid-template-columns: minmax(0, max-content) minmax(0, max-content);
  justify-content: start;
  column-gap: 12px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.base-point-source {
  display: contents;
}
.base-point-source > * {
  padding: 2px 0;
}
.base-point-source > span {
  color: var(--c-text-color-secondary, #6b7280);
}
.base-point-source > strong {
  font-variant-numeric: tabular-nums;
  text-align: left;
}
.warning-text {
  color: #986c00;
}
.empty-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}
pre {
  max-width: 100%;
  margin: 0;
  padding: var(--maa-gap-3);
  border: 1px solid var(--maa-border);
  border-radius: 3px;
  overflow: auto;
  background: var(--c-page-background-color-secondary, #f5f6f8);
  font-size: 12px;
  white-space: pre;
}
.empty-state {
  display: grid;
  justify-items: center;
  gap: var(--maa-gap-2);
  margin-top: var(--maa-gap-3);
  padding: 36px var(--maa-gap-4);
  border: 1px dashed var(--maa-border);
  border-radius: 3px;
  background: var(--maa-soft-panel);
  text-align: center;
}
.empty-state h2 {
  margin: 0;
  color: var(--c-text-color);
}
.maa-calculator-page :deep(button:focus-visible),
.maa-calculator-page :deep(input:focus-visible),
.maa-calculator-page :deep(summary:focus-visible),
.file-control:focus-within {
  outline: 2px solid var(--riic-blue, #2878c8);
  outline-offset: 2px;
}
.maa-calculator-page :deep(.operator-progression-search input:focus-visible) {
  outline: none;
  outline-offset: 0;
}
.maa-calculator-page :deep(details > summary) {
  list-style: none;
}
.maa-calculator-page :deep(details > summary::-webkit-details-marker) {
  display: none;
}
.maa-calculator-page :deep(details > summary::marker) {
  content: "";
}
.maa-calculator-page :deep(.disclosure-chevron) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  vertical-align: middle;
}
.maa-calculator-page :deep(details[open] > summary .disclosure-chevron-down),
.maa-calculator-page :deep(details:not([open]) > summary .disclosure-chevron-up) {
  display: none;
}
.maa-calculator-page :deep(.layout-editor-room .el-select__wrapper) {
  box-sizing: border-box;
  height: var(--maa-compact-control-height);
  min-height: var(--maa-compact-control-height);
  border-radius: 3px;
}
.maa-calculator-page :deep(.v-alert) {
  border-radius: 3px;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .maa-calculator-page {
    width: min(100% - 24px, 1180px);
    margin-top: 16px;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  h1 {
    font-size: 22px;
  }
  .input-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .layout-editor-facilities-single .layout-editor-facility {
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px;
  }
  .efficiency-settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .sanity-source-groups {
    grid-template-columns: minmax(0, 1fr);
  }
  .sanity-source-group + .sanity-source-group {
    padding-left: 0;
    border-left: 0;
    border-top: 1px solid var(--c-border-color);
    padding-top: 10px;
  }
}
</style>
