<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  createRiicMaaYieldTestModel,
  LAYOUT_CARD_KEYS,
  LAYOUT_LABELS,
  parseRiicMaaYieldTestOperatorFile,
  readRiicMaaYieldTestLocalOperators,
} from "/src/utils/riic/maa-yield-test.js";

const scheduleFileName = ref("");
const operatorFileName = ref("");
const maaSchedule = ref(null);
const uploadedOperators = ref([]);
const forceAllSkills = ref(false);
const layoutCardKey = ref("");
const inputError = ref("");
const localOperators = ref(readRiicMaaYieldTestLocalOperators());

const calculationState = computed(() => {
  if (!maaSchedule.value) {
    return { model: null, error: "" };
  }

  try {
    return {
      model: createRiicMaaYieldTestModel({
        maaSchedule: maaSchedule.value,
        localOperators: localOperators.value,
        uploadedOperators: uploadedOperators.value,
        forceAllSkills: forceAllSkills.value,
        layoutCardKey: layoutCardKey.value,
      }),
      error: "",
    };
  } catch (error) {
    return {
      model: null,
      error: error?.message || "排班计算失败",
    };
  }
});

const model = computed(() => calculationState.value.model);
const calculationError = computed(() => calculationState.value.error);
const resources = computed(
  () => model.value?.summary?.yield?.resources || [],
);
const yieldRooms = computed(
  () => model.value?.summary?.yield?.rooms || [],
);
const normalizedIssues = computed(() => model.value?.normalized?.issues || []);
const matching = computed(() => model.value?.matching);
const effectiveLayoutCardKey = computed(
  () => model.value?.layoutCardKey || layoutCardKey.value || "",
);
const hasCalculation = computed(() => Boolean(model.value?.summary));

function clearInputError() {
  inputError.value = "";
}

async function readFile(file) {
  return JSON.parse(await file.text());
}

async function handleScheduleFile(event) {
  clearInputError();
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    const payload = await readFile(file);
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.plans)) {
      throw new Error("这不是有效的 MAA 排班 JSON");
    }
    scheduleFileName.value = file.name;
    maaSchedule.value = payload;
    layoutCardKey.value = "";
    ElMessage.success("MAA 排班已导入");
  } catch (error) {
    inputError.value = error?.message || "排班 JSON 读取失败";
    scheduleFileName.value = "";
    maaSchedule.value = null;
  }
}

async function handleOperatorFile(event) {
  clearInputError();
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    const payload = await readFile(file);
    const parsed = parseRiicMaaYieldTestOperatorFile(payload);
    if (parsed.operators.length === 0) {
      throw new Error("干员数据 JSON 中没有可用的持有干员");
    }
    uploadedOperators.value = parsed.operators;
    operatorFileName.value = file.name;
    ElMessage.success(`干员数据已导入，共 ${parsed.operators.length} 名`);
  } catch (error) {
    inputError.value = error?.message || "干员数据 JSON 读取失败";
    uploadedOperators.value = [];
    operatorFileName.value = "";
  }
}

function reloadLocalOperators() {
  localOperators.value = readRiicMaaYieldTestLocalOperators();
  uploadedOperators.value = [];
  operatorFileName.value = "";
  ElMessage.success(`已重新读取本地数据，共 ${localOperators.value.length} 名干员`);
}

function formatNumber(value) {
  return Number.isFinite(Number(value))
    ? Number(value).toLocaleString("zh-CN", {
        maximumFractionDigits: 2,
      })
    : "--";
}

function formatIssue(issue) {
  return [
    issue?.severity === "warning" ? "警告" : "提示",
    issue?.jsonPath,
    issue?.message,
  ]
    .filter(Boolean)
    .join("：");
}
</script>

<template>
  <main class="maa-yield-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">RIICDEV</p>
        <h1>MAA 排班收益试算</h1>
        <p class="page-description">
          导入已经生成的 MAA 排班表，直接调用当前整表结算器计算产出。
        </p>
      </div>
      <RouterLink to="/riicdev" class="back-link">
        <v-icon icon="mdi-arrow-left" size="18" />
        返回 RIIC 测试
      </RouterLink>
    </header>

    <section class="tool-section input-section">
      <div class="section-heading">
        <div>
          <h2>输入</h2>
          <p>排班表必填，干员数据可使用本地数据或单独上传。</p>
        </div>
      </div>

      <div class="input-grid">
        <label class="file-control">
          <span class="control-label">MAA 排班 JSON</span>
          <input
            type="file"
            accept=".json,application/json"
            @change="handleScheduleFile"
          />
          <span class="file-name">{{ scheduleFileName || "选择排班文件" }}</span>
        </label>

        <label class="file-control">
          <span class="control-label">干员数据 JSON（可选）</span>
          <input
            type="file"
            accept=".json,application/json"
            @change="handleOperatorFile"
          />
          <span class="file-name">{{ operatorFileName || "使用本地数据" }}</span>
        </label>
      </div>

      <div class="settings-row">
        <label class="setting-control">
          <span>布局档案</span>
          <select v-model="layoutCardKey">
            <option value="">自动推断</option>
            <option v-for="key in LAYOUT_CARD_KEYS" :key="key" :value="key">
              {{ LAYOUT_LABELS[key] }}
            </option>
          </select>
        </label>
        <label class="switch-control">
          <el-switch v-model="forceAllSkills" />
          <span>强制按全技能解锁估算</span>
        </label>
        <button type="button" class="secondary-button" @click="reloadLocalOperators">
          <v-icon icon="mdi-refresh" size="17" />
          重新读取本地干员数据
        </button>
      </div>

      <p v-if="inputError || calculationError" class="error-message">
        {{ inputError || calculationError }}
      </p>
    </section>

    <template v-if="hasCalculation">
      <section
        v-if="matching"
        class="status-banner"
        :class="matching.allSkillsUnlocked ? 'warning' : 'success'"
      >
        <v-icon
          :icon="
            matching.allSkillsUnlocked
              ? 'mdi-alert-outline'
              : 'mdi-check-circle-outline'
          "
          size="22"
        />
        <div>
          <strong v-if="matching.allSkillsUnlocked">
            {{ forceAllSkills ? "已强制按全技能解锁估算" : "未完全匹配本地干员数据，已按全技能解锁估算" }}
          </strong>
          <strong v-else>已匹配到本地干员数据</strong>
          <span>
            匹配 {{ matching.matchedCount }} / {{ matching.totalCount }} 名；
            布局 {{ LAYOUT_LABELS[effectiveLayoutCardKey] || effectiveLayoutCardKey }}
          </span>
          <span v-if="matching.unmatchedNames.length">
            未匹配：{{ matching.unmatchedNames.join("、") }}
          </span>
          <span v-if="matching.unresolvedNames.length">
            本地静态表也没有这些干员：{{ matching.unresolvedNames.join("、") }}
          </span>
        </div>
      </section>

      <section class="assumption-note">
        MAA 排班协议不携带中枢同班绑定，本页按 0 处理中枢同班加成；跨房间静态条件仍按导入的整张排班表解析。
      </section>

      <section class="tool-section">
        <div class="section-heading">
          <div>
            <h2>每日综合产出</h2>
            <p>结果来自当前 L80 整表资源结算。</p>
          </div>
          <span class="result-meta">
            周期 {{ formatNumber(model.summary.cycleHours) }} 小时
          </span>
        </div>

        <div class="resource-grid">
          <article v-for="resource in resources" :key="resource.resource" class="resource-card">
            <span>{{ resource.label }}</span>
            <strong>{{ formatNumber(resource.outputPerDay) }}</strong>
            <small>{{ resource.unit || "每日" }}</small>
          </article>
        </div>
      </section>

      <section class="tool-section">
        <div class="section-heading">
          <div>
            <h2>房间结算</h2>
            <p>按物理房间汇总各班段实际结算结果。</p>
          </div>
        </div>

        <div class="room-list">
          <article v-for="room in yieldRooms" :key="room.key" class="room-row">
            <div class="room-main">
              <strong>{{ room.label }}</strong>
              <span>
                {{ room.product || room.facility }} ·
                {{ room.isCalculated ? "已计算" : room.unavailableReason || "未完成" }}
              </span>
            </div>
            <strong class="room-output">
              {{ formatNumber(room.outputPerDay) }} {{ room.unit }}
            </strong>
            <div class="room-segments">
              <span
                v-for="(segment, index) in room.segments"
                :key="`${room.key}-${index}`"
                :class="{ unavailable: !segment.calculated }"
              >
                班段 {{ index + 1 }}：
                {{ segment.calculated ? formatNumber(segment.output) : segment.unavailableReason }}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section v-if="normalizedIssues.length" class="tool-section issue-section">
        <div class="section-heading">
          <div>
            <h2>导入提示</h2>
            <p>这些提示来自 MAA JSON 结构或时间线解析。</p>
          </div>
        </div>
        <ul class="issue-list">
          <li v-for="(issue, index) in normalizedIssues" :key="index">
            {{ formatIssue(issue) }}
          </li>
        </ul>
      </section>
    </template>

    <section v-else class="empty-state">
      <v-icon icon="mdi-file-upload-outline" size="42" />
      <h2>等待导入 MAA 排班 JSON</h2>
      <p>选择排班文件后，这里会直接显示每日资源产出和各房间结算。</p>
    </section>
  </main>
</template>

<style scoped>
.maa-yield-page {
  width: min(1180px, calc(100% - 32px));
  margin: 28px auto 48px;
  color: var(--c-text-color);
}

.page-header,
.section-heading,
.settings-row,
.status-banner,
.room-row {
  display: flex;
  align-items: center;
}

.page-header,
.section-heading {
  justify-content: space-between;
  gap: 20px;
}

.page-header {
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 5px;
  color: var(--riic-blue, #2878c8);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: clamp(24px, 4vw, 34px);
}

h2 {
  margin-bottom: 4px;
  font-size: 19px;
}

.page-description,
.section-heading p,
.empty-state p {
  margin-bottom: 0;
  color: var(--c-text-color-secondary, #6b7280);
}

.back-link,
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--riic-blue, #2878c8);
  text-decoration: none;
}

.tool-section,
.empty-state {
  border: 1px solid var(--c-border-color);
  background: var(--c-bg-color, #fff);
}

.tool-section {
  margin-top: 16px;
  padding: 20px;
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

.file-name {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.settings-row {
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}

.setting-control,
.switch-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

select {
  min-width: 150px;
  padding: 7px 10px;
  border: 1px solid var(--c-border-color);
  background: transparent;
  color: inherit;
}

.secondary-button {
  margin-left: auto;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.error-message,
.issue-list {
  color: #c0392b;
}

.error-message {
  margin: 14px 0 0;
}

.status-banner {
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid;
}

.status-banner.success {
  border-color: #8ac6a3;
  background: #effaf3;
  color: #1e6d3b;
}

.status-banner.warning {
  border-color: #e4bd69;
  background: #fff8e8;
  color: #8a5a00;
}

.status-banner div {
  display: grid;
  gap: 4px;
}

.status-banner span {
  font-size: 13px;
}

.assumption-note {
  margin-top: 10px;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.result-meta {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.resource-card {
  min-height: 104px;
  padding: 14px;
  border: 1px solid var(--c-border-color);
}

.resource-card span,
.resource-card small {
  display: block;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.resource-card strong {
  display: block;
  margin: 10px 0 4px;
  font-size: 20px;
}

.room-list {
  margin-top: 14px;
}

.room-row {
  flex-wrap: wrap;
  gap: 12px 20px;
  padding: 14px 0;
  border-top: 1px solid var(--c-border-color);
}

.room-main {
  display: grid;
  flex: 1 1 220px;
  gap: 4px;
}

.room-main span,
.room-segments {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.room-output {
  min-width: 150px;
  text-align: right;
}

.room-segments {
  display: grid;
  flex: 1 1 100%;
  gap: 4px;
}

.room-segments .unavailable {
  color: #c0392b;
}

.issue-section {
  margin-top: 16px;
}

.issue-list {
  margin: 14px 0 0;
  padding-left: 20px;
  line-height: 1.7;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 58px 20px;
  text-align: center;
}

@media (max-width: 900px) {
  .resource-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .maa-yield-page {
    width: min(100% - 20px, 1180px);
    margin-top: 18px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .input-grid,
  .resource-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resource-card strong {
    font-size: 17px;
  }

  .secondary-button {
    margin-left: 0;
  }
}
</style>
