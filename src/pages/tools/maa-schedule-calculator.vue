<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { operatorTableV2 } from "/src/utils/gameData.js";
import ITEM_INFO from "/src/static/json/material/item_info.json";
import { parseRiicMaaOperatorBox } from "/src/utils/riicMaaOperatorData.js";
import { readRiicMaaYieldTestLocalOperators } from "/src/utils/riic/maa-yield-test.js";
import { sanityItemDefinitions } from "/src/vendor/riic-efficiency/dist/index.js";
import {
  buildFacilityStepCards,
  buildFacilityStepPanes,
  buildEfficiencyNotices,
  buildResultDisplay,
  buildRiicEfficiencySchedule,
  calculateRiicEfficiency,
  calculateSanityValues,
  completeInferredRooms,
  DEFAULT_RIIC_EFFICIENCY_SETTINGS,
  DEFAULT_SANITY_SETTINGS,
  formatDisplayValue,
  formatNumber,
  inferScheduleLayout,
  normalizeRiicEfficiencySettings,
} from "/src/utils/riic/riic-efficiency-adapter.js";
import RiicDisplayCard from "/src/components/tools/RiicDisplayCard.vue";
import RiicDisplayTile from "/src/components/tools/RiicDisplayTile.vue";

const RIIC_MAA_EDITOR_TRANSFER_STORAGE_KEY = "riic_maa_editor_to_efficiency_calculator_v1";
const RIIC_MAA_CALCULATOR_RETURN_STORAGE_KEY = "riic_maa_calculator_to_editor_v1";
const PAGE_SANITY_VALUES_STORAGE_KEY = "riic_maa_schedule_calculator_sanity_values_v2";
const LEGACY_PAGE_SANITY_VALUES_STORAGE_KEY = "riic_maa_schedule_calculator_sanity_values_v1";
const PAGE_EFFICIENCY_SETTINGS_STORAGE_KEY = "riic_maa_schedule_calculator_efficiency_settings_v1";
const NOTICE_LEVELS = Object.freeze([
  { key: "info", label: "提示" },
  { key: "warning", label: "警告" },
  { key: "error", label: "错误" },
]);

const ROOM_TYPES = new Set(["control", "manufacture", "trading", "power", "meeting", "hire", "dormitory", "processing", "training"]);
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
      label: "riic-efficiency package",
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
      label: "package 默认值（网页无对应项）",
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
const planDurations = ref([]);
const scheduleWarnings = ref([]);
const inputError = ref("");
const operatorFileName = ref("");
const uploadedOperators = ref([]);
const operatorFileWarnings = ref([]);
const localOperators = ref(readRiicMaaYieldTestLocalOperators());
const treatSkillsAsUnlocked = ref(false);
const efficiencySettings = reactive(readPageEfficiencySettings());
const importedFromMaaEditor = ref(false);
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

const activeOperators = computed(() => (uploadedOperators.value.length ? uploadedOperators.value : localOperators.value));
const operatorSourceLabel = computed(() =>
  uploadedOperators.value.length
    ? `${operatorFileName.value || "MAA Box"}（${uploadedOperators.value.length} 名）`
    : `本地 roster（${localOperators.value.length} 名）`
);
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
    return { result: null, document: null, layout: null, error: "", efficiencyError: "" };
  }

  let document = null;
  let layout = null;
  let efficiencyError = "";
  try {
    layout = inferScheduleLayout(sourceSchedule.value.plans);
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
    } catch (error) {
      efficiencyError = error?.message || "riic-efficiency 计算失败";
      throw error;
    }
    return {
      result,
      document,
      layout,
      error: "",
      efficiencyError: "",
    };
  } catch (error) {
    return {
      result: null,
      document,
      layout,
      error: error?.message || "riic-efficiency 计算失败",
      efficiencyError,
    };
  }
});

const result = computed(() => calculationState.value.result);
const resultDisplay = computed(() =>
  result.value ? buildResultDisplay(result.value, { sanityValues: sanityValues.value }) : null,
);
const calculationError = computed(() => calculationState.value.error);
const dailyOutput = computed(() => resultDisplay.value?.dailyOutput);
const calculationSteps = computed(() => resultDisplay.value?.calculationSteps);
const facilitySteps = computed(() => calculationSteps.value?.facilitySteps);
const facilityPanes = computed(() => (stepMode.value === "facility" && facilitySteps.value ? buildFacilityStepPanes(facilitySteps.value) : []));
const facilityCards = computed(() => (stepMode.value === "queue" && facilitySteps.value ? buildFacilityStepCards(facilitySteps.value) : []));
const basePoints = computed(() => calculationSteps.value?.basePoints);
const dronePane = computed(() => calculationSteps.value?.maaDrone);
const hasDroneOutput = computed(() => Boolean(dronePane.value?.cards?.length));
const layoutLabel = computed(() => {
  const layout = calculationState.value.layout;
  if (!layout?.length) {
    return "";
  }
  const count = (type) => layout.filter((entry) => entry.type === type).length;
  return `${count("trading")}${count("manufacture")}${count("power")}`;
});
const layoutGroups = computed(() => {
  const layout = calculationState.value.layout || [];
  return Object.entries(ROOM_LABELS).flatMap(([type, label]) => {
    const rooms = layout.filter((entry) => entry.type === type);
    return rooms.length ? [{ key: type, label, rooms }] : [];
  });
});
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

function resetRoomDetailExpansion(event) {
  if (event.target.open) {
    roomDetailGeneration.value += 1;
  }
}

function normalizeRoomType(value) {
  const type = String(value || "").trim();
  return type === "office" ? "hire" : type;
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
  return { ...payload, plans };
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

function applySchedule(payload, { fileName = "", fromMaaEditor = false } = {}) {
  const schedule = normalizeSchedulePayload(payload);
  sourceSchedule.value = schedule;
  scheduleFileName.value = fileName;
  planDurations.value = getInitialPlanDurations(schedule.plans);
  scheduleWarnings.value = schedule.plans.flatMap((plan, index) => {
    const rawDuration = payload.plans[index]?.duration;
    return rawDuration !== undefined && !(Number.isInteger(Number(rawDuration)) && Number(rawDuration) > 0)
      ? [`${plan.name || `第 ${index + 1} 班`}的时长无效，已根据 24 小时周期自动分配。`]
      : [];
  });
  importedFromMaaEditor.value = fromMaaEditor;
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
    sourceSchedule.value = null;
    scheduleFileName.value = "";
    planDurations.value = [];
    scheduleWarnings.value = [];
    importedFromMaaEditor.value = false;
    inputError.value = error?.message || "排班 JSON 读取失败";
  }
}

async function handleOperatorFile(event) {
  inputError.value = "";
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    const payload = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
    const parsed = parseRiicMaaOperatorBox(payload, operatorTableV2);
    if (parsed.operators.length === 0) {
      throw new Error("MAA Box 中没有找到已持有干员");
    }
    uploadedOperators.value = parsed.operators;
    operatorFileName.value = file.name;
    operatorFileWarnings.value = parsed.warnings;
    ElMessage.success(`干员数据已导入，共 ${parsed.operators.length} 名`);
  } catch (error) {
    uploadedOperators.value = [];
    operatorFileName.value = "";
    operatorFileWarnings.value = [];
    inputError.value = error?.message || "干员数据 JSON 读取失败";
  }
}

function reloadLocalOperators() {
  localOperators.value = readRiicMaaYieldTestLocalOperators();
  uploadedOperators.value = [];
  operatorFileName.value = "";
  operatorFileWarnings.value = [];
  ElMessage.success(`已重新读取本地 roster，共 ${localOperators.value.length} 名`);
}

function openMaaEditor() {
  if (sourceSchedule.value) {
    try {
      sessionStorage.setItem(
        RIIC_MAA_CALCULATOR_RETURN_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          source: "riic-maa-calculator",
          schedule: sourceSchedule.value,
        }),
      );
    } catch (error) {
      console.error("Failed to transfer original schedule to MAA editor", error);
      ElMessage.error("原始排班转交失败，请稍后重试");
      return;
    }
  }
  router.push({ name: "ScheduleV2" });
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
    applySchedule(schedule, { fileName: "排班表MAA", fromMaaEditor: true });
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
        <p class="eyebrow">罗德岛基建</p>
        <h1>MAA排班表计算器</h1>
        <p class="page-description">导入 MAA 排班与干员档案，查看每日产出、房间效率、基础价值点和无人机收益。</p>
      </div>
      <button type="button" class="secondary-button" @click="openMaaEditor">
        <v-icon icon="mdi-pencil-outline" size="17" />
        打开排班表MAA
      </button>
    </header>

    <section class="tool-section">
      <div class="section-heading">
        <div>
          <h2>输入</h2>
          <p>支持 MAA 排班 JSON 和 MAA Box 干员数据，也可以从排班表MAA直接导入。</p>
        </div>
      </div>

      <div class="input-grid">
        <label class="file-control">
          <span class="control-label">排班 JSON</span>
          <input type="file" accept=".json,application/json" @change="handleScheduleFile" />
          <span class="file-name">{{ scheduleFileName || "选择排班文件" }}</span>
        </label>
        <label class="file-control">
          <span class="control-label">MAA Box 干员 JSON（可选）</span>
          <input type="file" accept=".json,application/json" @change="handleOperatorFile" />
          <span class="file-name">{{ operatorFileName || "使用本地 roster" }}</span>
        </label>
      </div>

      <div class="settings-row">
        <label class="switch-control">
          <el-switch v-model="treatSkillsAsUnlocked" />
          <span>强制按全技能已解锁计算</span>
        </label>
        <button type="button" class="secondary-button" @click="reloadLocalOperators">
          <v-icon icon="mdi-refresh" size="17" />
          重新读取本地 roster
        </button>
        <span class="operator-source">{{ operatorSourceLabel }}</span>
        <details v-if="layoutGroups.length" class="layout-details">
          <summary>识别布局 {{ layoutLabel }}</summary>
          <div class="layout-overview">
            <p>识别来源：riic-efficiency · inferScheduleLayout</p>
            <div v-for="group in layoutGroups" :key="group.key" class="layout-group">
              <strong>{{ group.label }}</strong>
              <span v-for="(room, index) in group.rooms" :key="index" class="layout-level">{{ room.level }} 级</span>
            </div>
          </div>
        </details>
        <span v-if="importedFromMaaEditor" class="operator-source">来源：排班表MAA</span>
      </div>

      <details class="efficiency-settings">
        <summary>riic-efficiency 计算设置</summary>
        <div class="efficiency-settings-panel">
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
      </details>

      <p v-if="inputError || calculationError" class="error-message">
        {{ inputError || calculationError }}
      </p>
      <ul v-if="scheduleWarnings.length" class="warning-list">
        <li v-for="(warning, index) in scheduleWarnings" :key="index">
          {{ warning }}
        </li>
      </ul>
      <ul v-if="operatorFileWarnings.length" class="warning-list">
        <li v-for="(warning, index) in operatorFileWarnings" :key="`operator:${index}`">
          {{ warning }}
        </li>
      </ul>
    </section>

    <details v-if="packageNoticeGroups.length" class="package-notices" aria-label="计算提示">
      <summary class="package-notices-summary">
        <h2>计算提示</h2>
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
          <span>每日产出总览</span>
          <span class="summary-meta">{{ dailyOutput?.cycleHours ? formatDisplayValue(dailyOutput.cycleHours) + "周期" : "" }}</span>
        </summary>
        <div class="result-body">
          <p v-if="dailyOutput?.warning" class="warning-text">{{ dailyOutput.warning }}</p>
          <div v-if="dailyOutput?.tiles?.length || dailyOutput?.totalTile" class="tile-grid">
            <RiicDisplayTile v-for="tile in dailyOutput?.tiles || []" :key="tile.key" :tile="tile" />
            <RiicDisplayTile v-if="dailyOutput?.totalTile" :tile="dailyOutput.totalTile" />
          </div>
          <p v-else class="empty-hint">{{ dailyOutput?.empty || "当前排班没有可统计的产出" }}</p>
          <details class="sanity-source-box">
            <summary class="sanity-source-summary">
              <h3>理智折算来源</h3>
            </summary>
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
          </details>
        </div>
      </details>

      <details class="result-block">
        <summary>
          <span>无人机</span>
          <span class="summary-meta">{{ hasDroneOutput ? "MAA 无人机加速结果" : "" }}</span>
        </summary>
        <div class="result-body">
          <div v-if="hasDroneOutput" class="card-list queue-columns">
            <RiicDisplayCard v-for="card in dronePane.cards" :key="card.key" :card="card" />
          </div>
          <p v-else class="empty-hint">当前排班没有无人机加速结果。</p>
        </div>
      </details>

      <details class="result-block">
        <summary>
          <span>基础价值点</span>
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

      <details class="result-block" @toggle="resetRoomDetailExpansion">
        <summary>
          <span>房间效率明细</span>
          <span class="summary-meta">{{ facilitySteps?.steps?.length || 0 }} 个房间状态</span>
        </summary>
        <div class="result-body">
          <div class="step-mode">
            <button type="button" :class="{ active: stepMode === 'facility' }" @click="stepMode = 'facility'">按设施</button>
            <button type="button" :class="{ active: stepMode === 'queue' }" @click="stepMode = 'queue'">按队列</button>
          </div>
          <div v-if="facilityPanes.length" :key="roomDetailGeneration" class="pane-list">
            <details v-for="pane in facilityPanes" :key="pane.key" class="pane">
              <summary class="pane-header">
                <span class="pane-label">{{ pane.label }}</span>
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
              default-open
            />
          </div>
          <p v-else class="empty-hint">当前排班没有可展示的房间效率明细。</p>
        </div>
      </details>

      <details class="result-block" @toggle="showRawResult = $event.target.open">
        <summary>
          <span>完整 riic-efficiency 结果 JSON</span>
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
  </main>
</template>

<style scoped>
.maa-calculator-page {
  width: min(1180px, calc(100% - 32px));
  margin: 28px auto 48px;
  color: var(--c-text-color);
}

.page-header,
.section-heading,
.settings-row,
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
  margin-bottom: 22px;
}
.eyebrow {
  margin: 0 0 5px;
  color: var(--riic-blue, #2878c8);
  font-size: 12px;
  font-weight: 700;
}
h1,
h2,
p {
  margin-top: 0;
}
h1 {
  margin-bottom: 8px;
  font-size: 28px;
}
h2 {
  margin-bottom: 4px;
  font-size: 19px;
}
.page-description,
.section-heading p,
.empty-state,
.empty-hint,
.operator-source,
.summary-meta,
.file-name {
  color: var(--c-text-color-secondary, #6b7280);
}
.page-description {
  margin-bottom: 0;
}
.tool-section {
  margin-top: 18px;
  padding: 18px 0;
  border-top: 1px solid var(--c-border-color);
}
.section-heading p {
  margin: 4px 0 0;
}
.input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.file-control {
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 74px;
  padding: 14px;
  border: 1px dashed var(--c-border-color);
  cursor: pointer;
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
.file-name,
.operator-source {
  font-size: 13px;
}
.settings-row {
  flex-wrap: wrap;
  gap: 14px 18px;
  margin-top: 16px;
}
.switch-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--riic-blue, #2878c8) 46%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 8%, transparent);
  color: var(--riic-blue, #2878c8);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.layout-details {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.layout-details > summary {
  cursor: pointer;
}
.efficiency-settings {
  margin-top: 16px;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.efficiency-settings > summary {
  cursor: pointer;
}
.efficiency-settings-panel {
  display: grid;
  gap: 12px;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary, #fafafa);
}
.efficiency-settings-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--c-text-color);
}
.efficiency-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}
.efficiency-setting,
.efficiency-setting-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
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
  padding: 5px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  background: var(--c-bg-color, transparent);
  color: var(--c-text-color);
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.layout-overview {
  display: grid;
  gap: 6px;
  min-width: min(420px, calc(100vw - 48px));
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary, #fafafa);
}
.layout-overview p {
  margin: 0;
}
.layout-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
.layout-group strong {
  min-width: 64px;
  color: var(--c-text-color);
}
.layout-level {
  padding: 1px 6px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  font-variant-numeric: tabular-nums;
}
.sanity-source-box {
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary, #fafafa);
}
.sanity-source-summary h3 {
  margin: 0;
  font-size: 15px;
}
.sanity-source-content {
  padding-top: 10px;
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
  gap: 16px;
  margin-top: 10px;
}
.sanity-source-groups-single {
  grid-template-columns: minmax(0, 1fr);
}
.sanity-source-group + .sanity-source-group {
  padding-left: 16px;
  border-left: 1px solid var(--c-border-color);
}
.sanity-source-group h4 {
  margin: 0 0 6px;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
  font-weight: 600;
}
.sanity-source-group ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
}
.sanity-source-group li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.sanity-source-group li label {
  min-width: 0;
  color: var(--c-text-color-secondary, #6b7280);
  overflow-wrap: anywhere;
}
.sanity-source-value {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.sanity-source-value input {
  box-sizing: border-box;
  width: 92px;
  min-width: 0;
  padding: 3px 5px;
  border: 1px solid var(--c-border-color);
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
  margin: 14px 0 0;
  color: #c0392b;
}
.warning-list,
.status-banner ul {
  margin: 12px 0 0;
  padding-left: 20px;
  color: #986c00;
}
.status-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 14px;
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
  gap: 12px;
  margin-top: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}
.package-notices h2 {
  margin: 0;
}
.package-notices-summary,
.sanity-source-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  list-style: none;
  cursor: pointer;
}
.package-notices-summary::-webkit-details-marker,
.sanity-source-summary::-webkit-details-marker {
  display: none;
}
.package-notices-summary::after,
.sanity-source-summary::after {
  margin-left: auto;
  content: "+";
  color: var(--c-text-color-secondary, #6b7280);
  font-weight: 400;
}
.package-notices[open] > .package-notices-summary::after,
.sanity-source-box[open] > .sanity-source-summary::after {
  content: "-";
}
.package-notice-groups {
  display: grid;
  gap: 12px;
}
.package-notice-group {
  display: grid;
  gap: 8px;
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
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border-color);
}
.result-block > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;
}
.result-body {
  padding-top: 12px;
}
.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.tile-group + .tile-group {
  margin-top: 12px;
}
.card-list,
.pane-list {
  display: grid;
  gap: 12px;
}
.queue-columns {
  grid-auto-columns: minmax(280px, 1fr);
  grid-auto-flow: column;
  overflow-x: auto;
  padding-bottom: 8px;
}
.queue-columns > * {
  min-width: 280px;
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
.pane > summary::after {
  margin-left: auto;
  content: "+";
  color: var(--c-text-color-secondary, #6b7280);
  font-weight: 400;
}
.pane[open] > summary::after {
  content: "-";
}
.pane + .pane {
  margin-top: 14px;
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
  padding: 5px 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
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
  display: grid;
  gap: 12px;
}
.base-point-column {
  padding: 12px 14px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary, #fafafa);
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
}
pre {
  max-width: 100%;
  margin: 0;
  padding: 12px;
  overflow: auto;
  background: var(--c-page-background-color-secondary, #f5f6f8);
  font-size: 12px;
  white-space: pre;
}
.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 48px 16px;
  border-top: 1px solid var(--c-border-color);
  text-align: center;
}
.empty-state h2 {
  margin: 0;
  color: var(--c-text-color);
}

@media (max-width: 720px) {
  .maa-calculator-page {
    width: min(100% - 24px, 1180px);
    margin-top: 18px;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  h1 {
    font-size: 24px;
  }
  .input-grid {
    grid-template-columns: minmax(0, 1fr);
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
