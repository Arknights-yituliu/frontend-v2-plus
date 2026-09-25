<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { operatorTableV2 } from "/src/utils/gameData.js";
import { parseRiicMaaOperatorBox } from "/src/utils/riicMaaOperatorData.js";
import { readRiicMaaYieldTestLocalOperators } from "/src/utils/riic/maa-yield-test.js";
import { getRiicFacilityProfile, getRiicRoomStations } from "/src/utils/riic/l10-facility-model.js";
import { buildRiicEfficiencySchedule, calculateRiicEfficiency, DEFAULT_RIIC_EFFICIENCY_SETTINGS } from "/src/utils/riic/riic-efficiency-adapter.js";

const LAYOUT_OPTIONS = [
  { value: "153", label: "153" },
  { value: "243", label: "243" },
  { value: "243-orundum", label: "243 搓玉" },
  { value: "252-2-gold", label: "252（2 赤金）" },
  { value: "252-3-gold", label: "252（3 赤金）" },
  { value: "333", label: "333" },
  { value: "333-orundum", label: "333 搓玉" },
  { value: "342", label: "342" },
  { value: "342-orundum", label: "342 搓玉" },
];

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

const scheduleFileName = ref("");
const sourceSchedule = ref(null);
const planDurations = ref([]);
const scheduleWarnings = ref([]);
const inputError = ref("");
const operatorFileName = ref("");
const uploadedOperators = ref([]);
const operatorFileWarnings = ref([]);
const localOperators = ref(readRiicMaaYieldTestLocalOperators());
const layoutCardKey = ref("");
const treatSkillsAsUnlocked = ref(false);

const activeOperators = computed(() => (uploadedOperators.value.length ? uploadedOperators.value : localOperators.value));
const operatorSourceLabel = computed(() =>
  uploadedOperators.value.length
    ? `${operatorFileName.value || "MAA Box"}（${uploadedOperators.value.length} 名）`
    : `本地 roster（${localOperators.value.length} 名）`
);
const inferredLayoutCardKey = computed(() => (sourceSchedule.value ? inferLayoutCardKey(getLayoutUnionRooms(sourceSchedule.value.plans)) : ""));
const effectiveLayoutCardKey = computed(() => layoutCardKey.value || inferredLayoutCardKey.value);
const selectedLayoutLabel = computed(() => LAYOUT_OPTIONS.find((option) => option.value === effectiveLayoutCardKey.value)?.label || "未选择");
const durationTotal = computed(() => planDurations.value.reduce((total, duration) => total + (Number(duration) || 0), 0));
const durationError = computed(() => {
  if (!sourceSchedule.value || planDurations.value.length === 0) {
    return "";
  }
  if (planDurations.value.some((duration) => !Number.isInteger(Number(duration)) || Number(duration) <= 0)) {
    return "请为每个班次填写大于 0 的整数分钟数。";
  }
  return "";
});
const durationWarnings = computed(() => {
  if (!sourceSchedule.value || durationError.value) {
    return [];
  }
  if (durationTotal.value < 1440) {
    return [`班次总时长为 ${durationTotal.value} 分钟，少于 24 小时。`];
  }
  if (durationTotal.value > 1440) {
    return [`班次总时长为 ${durationTotal.value} 分钟，超过 24 小时。`];
  }
  return [];
});
const layoutCompletionWarnings = computed(() => {
  if (!sourceSchedule.value || !effectiveLayoutCardKey.value) {
    return [];
  }
  const template = getLayoutRoomTemplate(effectiveLayoutCardKey.value);
  const omittedFacilities = Object.keys(template).filter((facility) => sourceSchedule.value.plans.some((plan) => !plan.rooms[facility]?.length));
  return omittedFacilities.length
    ? [`排班中有班次省略了${omittedFacilities.map((facility) => ROOM_LABELS[facility]).join("、")}；计算时按布局档案补为无人房间。`]
    : [];
});
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
    return { result: null, document: null, error: "" };
  }
  if (!effectiveLayoutCardKey.value) {
    return { result: null, document: null, error: "请选择与排班房间配置对应的布局档案。" };
  }
  if (durationError.value) {
    return { result: null, document: null, error: durationError.value };
  }

  try {
    const completedPlans = completeMissingFacilityGroups(sourceSchedule.value.plans, effectiveLayoutCardKey.value);
    const facilityLevels = createFacilityLevels(completedPlans, effectiveLayoutCardKey.value);
    const schedule = {
      ...sourceSchedule.value,
      plans: completedPlans.map((plan, planIndex) => ({
        ...plan,
        duration: Number(planDurations.value[planIndex]),
        rooms: Object.fromEntries(
          Object.entries(plan.rooms).map(([facility, rooms]) => [
            facility,
            rooms.map((room, roomIndex) => ({
              ...room,
              level: facilityLevels[facility][roomIndex],
            })),
          ])
        ),
      })),
    };
    const document = buildRiicEfficiencySchedule(schedule, {
      operatorProfiles: activeOperators.value,
      operatorTable: operatorTableV2,
      efficiencySettings: DEFAULT_RIIC_EFFICIENCY_SETTINGS,
    });
    document.settings.treatSkillsAsUnlocked = treatSkillsAsUnlocked.value;
    return {
      result: calculateRiicEfficiency(document),
      document,
      error: "",
    };
  } catch (error) {
    return {
      result: null,
      document: null,
      error: error?.message || "riic-efficiency 计算失败",
    };
  }
});

const result = computed(() => calculationState.value.result);
const calculationError = computed(() => calculationState.value.error);
const packageWarnings = computed(() => [
  ...(result.value?.warnings || []),
  ...(result.value?.fiammettaWarnings || []),
  ...(result.value?.maaDroneAcceleration?.warnings || []),
]);
const rawResultJson = computed(() => (result.value ? JSON.stringify(result.value, null, 2) : ""));

function getOperatorName(operator) {
  const charId = String(operator?.charId || "").trim();
  return String(operatorTableV2?.[charId]?.name || "").trim();
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

function getLayoutUnionRooms(plans) {
  const rooms = {};
  for (const plan of plans || []) {
    for (const [facility, entries] of Object.entries(plan.rooms || {})) {
      if (!rooms[facility]?.length && entries.length) {
        rooms[facility] = entries;
      }
    }
  }
  return rooms;
}

function getProfileRoomKey(facility, room) {
  if (facility === "trading") {
    return room.product === "Orundum" ? "orundum-trading" : "lmd-trading";
  }
  if (facility === "manufacture") {
    if (room.product === "Originium Shard") {
      return "orundum-manufacture";
    }
    return room.product === "Pure Gold" ? "gold-manufacture" : "experience-manufacture";
  }
  return facility === "hire" ? "office" : facility;
}

function inferLayoutCardKey(rooms) {
  const count = (facility) => rooms?.[facility]?.length || 0;
  const hasOrundum = ["trading", "manufacture"].some((facility) =>
    (rooms?.[facility] || []).some((room) => (facility === "trading" ? room.product === "Orundum" : room.product === "Originium Shard"))
  );
  if (count("trading") === 1 && count("manufacture") === 5 && count("power") === 3) {
    return "153";
  }
  if (count("trading") === 2 && count("manufacture") === 4 && count("power") === 3) {
    return hasOrundum ? "243-orundum" : "243";
  }
  if (count("trading") === 2 && count("manufacture") === 5 && count("power") === 2) {
    const goldCount = (rooms.manufacture || []).filter((room) => room.product === "Pure Gold").length;
    return goldCount === 2 ? "252-2-gold" : goldCount === 3 ? "252-3-gold" : "";
  }
  if (count("trading") === 3 && count("manufacture") === 3 && count("power") === 3) {
    return hasOrundum ? "333-orundum" : "333";
  }
  if (count("trading") === 3 && count("manufacture") === 4 && count("power") === 2) {
    return hasOrundum ? "342-orundum" : "342";
  }
  return "";
}

function getLayoutProfile(cardKey) {
  const layoutId = cardKey.startsWith("252") ? "252" : cardKey;
  return getRiicFacilityProfile({
    layoutId,
    cardKey,
    facilityRequirement: layoutId === "252" ? "rightFull" : null,
  });
}

function getLayoutRoomTemplate(cardKey) {
  const profile = getLayoutProfile(cardKey);
  if (!profile) {
    throw new Error(`无法加载布局档案：${cardKey}`);
  }

  const productByRoomKey = {
    "lmd-trading": "LMD",
    "orundum-trading": "Orundum",
    "experience-manufacture": "Battle Record",
    "gold-manufacture": "Pure Gold",
    "orundum-manufacture": "Originium Shard",
  };
  const rooms = { control: [{ level: 5, operators: [] }] };
  for (const [roomKey, configured] of Object.entries(profile.roomStations || {})) {
    const stations = Array.isArray(configured) ? configured : configured?.[profile.cardKey];
    if (!Array.isArray(stations)) {
      continue;
    }
    const facility = roomKey.endsWith("-trading") ? "trading" : roomKey.endsWith("-manufacture") ? "manufacture" : roomKey === "office" ? "hire" : roomKey;
    rooms[facility] ||= [];
    for (const station of stations) {
      rooms[facility].push({
        level: Number(station?.stationLevel) || 1,
        operators: [],
        ...(productByRoomKey[roomKey] ? { product: productByRoomKey[roomKey] } : {}),
      });
    }
  }
  return rooms;
}

function completeMissingFacilityGroups(plans, cardKey) {
  const template = getLayoutRoomTemplate(cardKey);
  return plans.map((plan) => {
    const rooms = { ...plan.rooms };
    for (const [facility, templateRooms] of Object.entries(template)) {
      const currentRooms = rooms[facility] || [];
      if (currentRooms.length === 0) {
        rooms[facility] = templateRooms.map((room) => ({ ...room }));
      } else if (currentRooms.length !== templateRooms.length) {
        throw new Error(`${ROOM_LABELS[facility]}有 ${currentRooms.length} 间，布局档案“${cardKey}”要求 ${templateRooms.length} 间。`);
      }
    }
    return { ...plan, rooms };
  });
}

function getExplicitRoomLevels(plans) {
  const levels = {};
  for (const plan of plans) {
    for (const [facility, rooms] of Object.entries(plan.rooms)) {
      rooms.forEach((room, index) => {
        const level = Number(room.level);
        if (!Number.isInteger(level) || level < 1) {
          return;
        }
        levels[facility] ||= [];
        const current = levels[facility][index];
        if (current !== undefined && current !== level) {
          throw new Error(`${ROOM_LABELS[facility]} ${index + 1} 级别在不同班次中不一致`);
        }
        levels[facility][index] = level;
      });
    }
  }
  return levels;
}

function getFacilityFallbackLevels(profile, facility, roomCount) {
  const levels = Object.entries(profile.roomStations || {}).flatMap(([roomKey, configured]) => {
    const roomFacility = roomKey.endsWith("-trading") ? "trading" : roomKey.endsWith("-manufacture") ? "manufacture" : roomKey === "office" ? "hire" : roomKey;
    if (roomFacility !== facility) {
      return [];
    }
    const stations = Array.isArray(configured) ? configured : configured?.[profile.cardKey];
    return Array.isArray(stations) ? stations.map((station) => Number(station?.stationLevel)) : [];
  });
  return levels.length === roomCount ? levels.sort((left, right) => right - left) : [];
}

function createFacilityLevels(plans, cardKey) {
  const profile = getLayoutProfile(cardKey);
  if (!profile) {
    throw new Error(`无法加载布局档案：${cardKey}`);
  }
  const levels = getExplicitRoomLevels(plans);
  const categoryCounts = new Map();
  const categoryStations = new Map();
  const categoryIndexes = new Map();
  const firstPlanRooms = plans[0].rooms;

  for (const [facility, rooms] of Object.entries(firstPlanRooms)) {
    for (const room of rooms) {
      const roomKey = getProfileRoomKey(facility, room);
      categoryCounts.set(roomKey, (categoryCounts.get(roomKey) || 0) + 1);
    }
  }
  for (const [roomKey, roomCount] of categoryCounts) {
    categoryStations.set(roomKey, getRiicRoomStations({ facilityProfile: profile, roomKey, roomCount }));
  }

  for (const [facility, rooms] of Object.entries(firstPlanRooms)) {
    levels[facility] ||= [];
    const fallbackLevels = getFacilityFallbackLevels(profile, facility, rooms.length);
    for (const [index, room] of rooms.entries()) {
      const roomKey = getProfileRoomKey(facility, room);
      const profileIndex = categoryIndexes.get(roomKey) || 0;
      categoryIndexes.set(roomKey, profileIndex + 1);
      const inferredLevel = categoryStations.get(roomKey)?.[profileIndex]?.stationLevel || fallbackLevels[index];
      if (!levels[facility][index]) {
        levels[facility][index] = Number(inferredLevel) || 0;
      }
      if (!levels[facility][index]) {
        throw new Error(`${ROOM_LABELS[facility]} ${index + 1} 无法由“${cardKey}”档案确定等级`);
      }
    }
  }
  return levels;
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
    const replacements = remaining > 0 ? distributeMinutes(remaining, missingIndexes.length) : [];
    for (const [index, planIndex] of missingIndexes.entries()) {
      durations[planIndex] = replacements[index] || 0;
    }
  }
  return durations;
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
    const schedule = normalizeSchedulePayload(payload);
    scheduleFileName.value = file.name;
    sourceSchedule.value = schedule;
    planDurations.value = getInitialPlanDurations(schedule.plans);
    layoutCardKey.value = "";
    scheduleWarnings.value = schedule.plans.flatMap((plan, index) => {
      const rawDuration = payload.plans[index]?.duration;
      return rawDuration !== undefined && !(Number.isInteger(Number(rawDuration)) && Number(rawDuration) > 0)
        ? [`${plan.name || `第 ${index + 1} 班`}的时长无效，已留给时长编辑框修正。`]
        : [];
    });
    ElMessage.success("排班已导入");
  } catch (error) {
    scheduleFileName.value = "";
    sourceSchedule.value = null;
    planDurations.value = [];
    scheduleWarnings.value = [];
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

function formatPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  return `${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%`;
}

function formatCalculation(value) {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function facilityLabel(facility) {
  return ROOM_LABELS[facility?.type] || facility?.type || "未知设施";
}
</script>

<template>
  <main class="efficiency-inspector-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">RIICDEV</p>
        <h1>riic-efficiency 计算明细</h1>
        <p class="page-description">导入排班和干员档案，查看效率计算过程。</p>
      </div>
      <RouterLink to="/riicdev" class="back-link">
        <v-icon icon="mdi-arrow-left" size="18" />
        返回 RIIC 测试
      </RouterLink>
    </header>

    <section class="tool-section">
      <div class="section-heading">
        <div>
          <h2>输入</h2>
          <p>支持 MAA 排班 JSON、本站 V2 排班 JSON 和 MAA Box 干员数据。</p>
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
        <label class="setting-control">
          <span>布局档案</span>
          <select v-model="layoutCardKey">
            <option value="">自动识别：{{ selectedLayoutLabel }}</option>
            <option v-for="option in LAYOUT_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="switch-control">
          <el-switch v-model="treatSkillsAsUnlocked" />
          <span>强制按全技能已解锁计算</span>
        </label>
        <button type="button" class="secondary-button" @click="reloadLocalOperators">
          <v-icon icon="mdi-refresh" size="17" />
          重新读取本地 roster
        </button>
        <span class="operator-source">{{ operatorSourceLabel }}</span>
      </div>

      <div v-if="sourceSchedule && planDurations.length" class="duration-settings">
        <div class="duration-heading">
          <strong>班次时长</strong>
          <span>当前合计 {{ durationTotal }} 分钟</span>
        </div>
        <label v-for="(duration, index) in planDurations" :key="index" class="duration-control">
          <span>{{ sourceSchedule.plans[index]?.name || `第 ${index + 1} 班` }}</span>
          <input v-model.number="planDurations[index]" type="number" min="0" step="1" />
          <small>分钟</small>
        </label>
      </div>

      <p v-if="inputError || calculationError" class="error-message">
        {{ inputError || calculationError }}
      </p>
      <ul v-if="scheduleWarnings.length || durationWarnings.length || layoutCompletionWarnings.length" class="warning-list">
        <li v-for="(warning, index) in [...scheduleWarnings, ...durationWarnings, ...layoutCompletionWarnings]" :key="index">
          {{ warning }}
        </li>
      </ul>
    </section>

    <template v-if="result">
      <section v-if="unmatchedOperatorNames.length" class="status-banner warning">
        <v-icon icon="mdi-alert-outline" size="22" />
        <div>
          <strong>有 {{ unmatchedOperatorNames.length }} 名干员没有 roster 练度</strong>
          <span>这些干员使用 riic-efficiency 的技能默认状态：{{ unmatchedOperatorNames.join("、") }}</span>
        </div>
      </section>

      <section v-if="operatorFileWarnings.length || packageWarnings.length" class="status-banner warning">
        <v-icon icon="mdi-alert-outline" size="22" />
        <div>
          <strong>计算提示</strong>
          <ul>
            <li v-for="(warning, index) in [...operatorFileWarnings, ...packageWarnings]" :key="index">
              {{ warning }}
            </li>
          </ul>
        </div>
      </section>

      <section class="tool-section result-section">
        <div class="section-heading">
          <div>
            <h2>效率明细</h2>
            <p>
              {{ result.dailyHours }} 小时周期；布局 {{ selectedLayoutLabel }}； roster 匹配
              {{ scheduleOperatorNames.length - unmatchedOperatorNames.length }} / {{ scheduleOperatorNames.length }} 名
            </p>
          </div>
        </div>

        <section v-for="(plan, planIndex) in result.plans" :key="`${planIndex}:${plan.name}`" class="plan-section">
          <header class="plan-header">
            <h3>{{ plan.name || `第 ${planIndex + 1} 班` }}</h3>
            <span>{{ plan.durationHours }} 小时</span>
          </header>

          <article v-for="facility in plan.facilities" :key="facility.facility.id" class="facility-row">
            <header class="facility-header">
              <strong>{{ facilityLabel(facility.facility) }} {{ facility.facility.index + 1 }}</strong>
              <strong>{{ formatPercent(facility.efficiency) }}</strong>
            </header>
            <dl class="efficiency-breakdown">
              <div>
                <dt>基础</dt>
                <dd>{{ formatPercent(facility.baseEfficiency) }}</dd>
              </div>
              <div>
                <dt>心情</dt>
                <dd>{{ formatPercent(facility.moodEfficiency) }}</dd>
              </div>
              <div>
                <dt>干员</dt>
                <dd>{{ formatPercent(facility.operatorEfficiency) }}</dd>
              </div>
              <div>
                <dt>技能</dt>
                <dd>{{ formatPercent(facility.skillEfficiency) }}</dd>
              </div>
            </dl>
            <details v-if="facility.details?.length" class="contribution-details">
              <summary>技能贡献与计算过程（{{ facility.details.length }} 项）</summary>
              <ul>
                <li v-for="(detail, detailIndex) in facility.details" :key="`${detailIndex}:${detail.operator}:${detail.stat}`">
                  <span>{{ detail.operator }} / {{ detail.skill || "基础属性" }}：</span>
                  <span>{{ detail.stat }} {{ formatPercent(detail.value) }}</span>
                  <code v-if="detail.calculation">{{ formatCalculation(detail.calculation) }}</code>
                </li>
              </ul>
            </details>
            <p v-else class="empty-details">没有独立技能贡献项。</p>
          </article>
        </section>

        <details class="settings-details">
          <summary>本次生效的计算设置</summary>
          <pre>{{ JSON.stringify(result.document?.settings || calculationState.document?.settings, null, 2) }}</pre>
        </details>
        <details class="raw-result-details">
          <summary>完整 riic-efficiency 结果 JSON</summary>
          <pre>{{ rawResultJson }}</pre>
        </details>
      </section>
    </template>

    <section v-else-if="!sourceSchedule && !inputError" class="empty-state">
      <v-icon icon="mdi-file-upload-outline" size="42" />
      <h2>{{ sourceSchedule ? "请选择布局档案" : "等待导入排班 JSON" }}</h2>
    </section>
  </main>
</template>

<style scoped>
.efficiency-inspector-page {
  width: min(1180px, calc(100% - 32px));
  margin: 28px auto 48px;
  color: var(--c-text-color);
}

.page-header,
.section-heading,
.settings-row,
.duration-heading,
.plan-header,
.facility-header {
  display: flex;
  align-items: center;
}

.page-header,
.section-heading,
.plan-header,
.facility-header {
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
h3,
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
h3 {
  margin: 0;
  font-size: 17px;
}
.page-description,
.section-heading p,
.empty-state {
  color: var(--c-text-color-secondary, #6b7280);
}
.page-description {
  margin-bottom: 0;
}
.back-link,
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--riic-blue, #2878c8);
  text-decoration: none;
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
.setting-control span,
.switch-control span {
  font-weight: 600;
}
.file-name,
.operator-source {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.settings-row {
  flex-wrap: wrap;
  gap: 14px 18px;
  margin-top: 16px;
}
.setting-control,
.switch-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
select,
.duration-control input {
  padding: 7px 9px;
  border: 1px solid var(--c-border-color);
  background: var(--c-bg-color, transparent);
  color: inherit;
  font: inherit;
}
.secondary-button {
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}
.duration-settings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--c-border-color);
}
.duration-heading {
  flex: 1 1 220px;
  justify-content: space-between;
  gap: 12px;
}
.duration-heading span,
.duration-control small {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.duration-control {
  display: grid;
  grid-template-columns: minmax(72px, auto) 86px auto;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.duration-control input {
  width: 86px;
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
.status-banner span {
  overflow-wrap: anywhere;
}
.result-section {
  margin-top: 8px;
}
.plan-section {
  margin-top: 20px;
  border-top: 1px solid var(--c-border-color);
}
.plan-header {
  min-height: 48px;
}
.plan-header span {
  color: var(--c-text-color-secondary, #6b7280);
}
.facility-row {
  padding: 12px 0 14px;
  border-top: 1px solid var(--c-border-color);
}
.facility-header strong:last-child {
  white-space: nowrap;
}
.efficiency-breakdown {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 10px 0;
}
.efficiency-breakdown div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.efficiency-breakdown dt {
  color: var(--c-text-color-secondary, #6b7280);
}
.efficiency-breakdown dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.contribution-details summary,
.settings-details summary,
.raw-result-details summary {
  cursor: pointer;
  color: var(--riic-blue, #2878c8);
}
.contribution-details ul {
  margin: 8px 0 0;
  padding-left: 20px;
}
.contribution-details li {
  margin: 6px 0;
  overflow-wrap: anywhere;
}
.contribution-details code {
  display: block;
  margin-top: 3px;
  color: var(--c-text-color-secondary, #6b7280);
  white-space: pre-wrap;
}
.empty-details {
  margin: 8px 0 0;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.settings-details,
.raw-result-details {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border-color);
}
pre {
  max-width: 100%;
  margin: 10px 0 0;
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
}
.empty-state h2 {
  margin: 0;
  color: var(--c-text-color);
}

@media (max-width: 720px) {
  .efficiency-inspector-page {
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
  .duration-heading {
    flex-basis: 100%;
  }
  .efficiency-breakdown {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
