<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  createRiicMaaYieldTestModel,
  getRiicMaaYieldPlanDurations,
  LAYOUT_CARD_KEYS,
  LAYOUT_LABELS,
  parseRiicMaaYieldTestOperatorFile,
  readRiicMaaYieldTestLocalOperators,
} from "/src/utils/riic/maa-yield-test.js";
import { operatorTableV2 } from "/src/utils/gameData.js";
import RiicSchedulePreview from "/src/components/tools/RiicSchedulePreview.vue";
import RiicScheduleResourceSummary from "/src/components/tools/RiicScheduleResourceSummary.vue";

const scheduleFileName = ref("");
const operatorFileName = ref("");
const maaSchedule = ref(null);
const uploadedOperators = ref([]);
const forceAllSkills = ref(false);
const layoutCardKey = ref("");
const planDurations = ref([]);
const activeSchedulePreviewStateIndex = ref(0);
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
        planDurations: planDurations.value,
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
  () => model.value?.calculationTrace?.resources || [],
);
const yieldRooms = computed(
  () => model.value?.calculationTrace?.rooms || [],
);
const resourceFlows = computed(
  () => model.value?.calculationTrace?.resourceFlows || {},
);
const tradingSettlements = computed(
  () => model.value?.calculationTrace?.tradingSettlements || [],
);
const droneCharge = computed(
  () => model.value?.calculationTrace?.droneCharge || null,
);
const droneUsage = computed(
  () => model.value?.calculationTrace?.droneUsage || null,
);
const droneTargetSettlement = computed(
  () => model.value?.calculationTrace?.droneTargetSettlement || null,
);
const scheduleResourceSummaryYield = computed(
  () => model.value?.summary?.yield || null,
);
const scheduleResourceSummaryShifts = computed(() => {
  const states = model.value?.preview?.states || [];
  const targetKeys = model.value?.droneTargetKeysByState || [];
  const orders = model.value?.droneOrdersByState || [];
  let startMinutes = 0;

  return states.map((state, index) => {
    const target = String(targetKeys[index] || "").trim();
    const shift = {
      name: String(state?.name || `${String.fromCharCode(65 + index)}班`),
      time: formatClockTime(startMinutes),
      drone: target
        ? {
            target,
            order: orders[index] === "post" ? "post" : "pre",
          }
        : {
            disabled: true,
          },
    };
    startMinutes += Math.max(0, Number(state?.durationHours || 0) * 60);
    return shift;
  });
});
const activeSchedulePreviewDroneTarget = computed(
  () =>
    String(
      model.value?.droneTargetKeysByState?.[
        activeSchedulePreviewStateIndex.value
      ] || "",
    ).trim(),
);
const scheduleResourceSummaryTargetKeysByState = computed(() => {
  const targetKeys = (scheduleResourceSummaryYield.value?.droneTargetSettlements || [])
    .map((settlement) => String(settlement?.key || "").trim())
    .filter(Boolean);
  const stateCount = model.value?.preview?.states?.length || 0;

  return Array.from({ length: stateCount }, () =>
    Object.fromEntries(targetKeys.map((key) => [key, key])),
  );
});
const droneUsedPerDay = computed(() => {
  const cycleHours = Number(model.value?.summary?.cycleHours);
  const usedPerCycle = (droneUsage.value?.segments || []).reduce(
    (total, segment) => total + Number(segment?.usedDroneOutput || 0),
    0,
  );
  return cycleHours > 0 ? usedPerCycle * (24 / cycleHours) : null;
});
const normalizedIssues = computed(() => model.value?.normalized?.issues || []);
const matching = computed(() => model.value?.matching);
const effectiveLayoutCardKey = computed(
  () => model.value?.layoutCardKey || layoutCardKey.value || "",
);
const hasCalculation = computed(() => Boolean(model.value?.summary));
const calculationStates = computed(() => model.value?.preview?.states || []);
const planDurationTotal = computed(() =>
  planDurations.value.reduce(
    (total, duration) => total + Math.max(0, Number(duration) || 0),
    0,
  ),
);
const operatorDataDescription = computed(() => {
  if (matching.value?.source === "uploaded") {
    return `上传文件 ${operatorFileName.value || "干员数据 JSON"}，共 ${uploadedOperators.value.length} 名`;
  }
  return `本地干员数据，共 ${localOperators.value.length} 名`;
});

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
    planDurations.value = getRiicMaaYieldPlanDurations(payload);
    activeSchedulePreviewStateIndex.value = 0;
    layoutCardKey.value = "";
    ElMessage.success("MAA 排班已导入");
  } catch (error) {
    inputError.value = error?.message || "排班 JSON 读取失败";
    scheduleFileName.value = "";
    maaSchedule.value = null;
    planDurations.value = [];
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

function formatClockTime(value) {
  const minutes = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

function formatOperator(operator) {
  const name = operator?.name || operator?.charId || "未识别干员";
  if (!operator?.charId) {
    return name;
  }
  return `${name}（${operator.charId}）`;
}

function formatProduct(room) {
  const product = room?.product;
  if (room?.facility === "manufacture") {
    return (
      {
        experience: "经验书",
        gold: "赤金",
        orundum: "源石碎片",
      }[product] || room?.sourceProduct || product || "未设置产物"
    );
  }
  if (room?.facility === "trading") {
    return (
      {
        lmd: "龙门币",
        orundum: "合成玉",
      }[product] || room?.sourceProduct || product || "未设置产物"
    );
  }
  return room?.sourceProduct || product || room?.facility || "未设置";
}

function formatUnavailableReason(reason, segment) {
  if (reason === "unsupportedProduct") {
    return `导入产物“${segment?.sourceProduct || segment?.product || "空"}”未映射到当前结算规则`;
  }
  if (reason === "efficiencyUnavailable") {
    return "该班段的房间效率未完成计算";
  }
  if (reason === "unsupportedStationLevel") {
    return `当前 ${segment?.stationLevel || "未知"} 级设施没有可用的基准产能`;
  }
  return reason || "未知原因";
}

function getSettlementMethod(room) {
  if (room.facility === "trading" && room.product !== "orundum") {
    return "按贸易订单、干员订单效率与班段时长结算";
  }
  if (room.facility === "trading") {
    return "按合成玉贸易订单与班段时长结算";
  }
  return "按房间基础日产率、实际效率与班段时长折算";
}

function hasEfficiency(room) {
  return (
    room?.efficiency !== null &&
    room?.efficiency !== undefined &&
    Number.isFinite(Number(room.efficiency))
  );
}

function formatEfficiencyBreakdown(room) {
  const calculation =
    room?.efficiencyMetrics?.actual?.breakdown?.finalRosterCalculation;
  if (calculation?.status !== "calculated") {
    return "";
  }

  const parts = [
    `干员技能 ${formatNumber(calculation.calculation?.localTotalPercent)}%`,
  ];
  if (Number(calculation.staffingBonusPercent)) {
    parts.push(`槽位补足 ${formatNumber(calculation.staffingBonusPercent)}%`);
  }
  if (Number(calculation.controlCenterFacilityBonus)) {
    parts.push(
      `中枢设施 ${formatNumber(calculation.controlCenterFacilityBonus)}%`,
    );
  }
  if (Number(calculation.controlCenterOperatorBonus)) {
    parts.push(
      `中枢干员 ${formatNumber(calculation.controlCenterOperatorBonus)}%`,
    );
  }
  return parts.join(" + ");
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

      <div v-if="maaSchedule && planDurations.length" class="duration-settings">
        <div>
          <strong>班次时长</strong>
          <p>
            缺少时间线时默认把 24 小时均分为 {{ planDurations.length }} 班；
            当前合计 {{ planDurationTotal }} 分钟，可直接调整后重算。
          </p>
        </div>
        <label
          v-for="(duration, index) in planDurations"
          :key="index"
          class="duration-control"
        >
          <span>{{ maaSchedule.plans[index]?.name || `第 ${index + 1} 班` }}</span>
          <input
            v-model.number="planDurations[index]"
            type="number"
            min="1"
            step="1"
          />
          <small>分钟</small>
        </label>
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

      <section class="tool-section import-summary-section">
        <div class="section-heading">
          <div>
            <h2>导入概况</h2>
            <p>确认本次核算实际采用的排班、干员和结算口径。</p>
          </div>
        </div>

        <dl class="calculation-facts">
          <div>
            <dt>排班数据</dt>
            <dd>
              {{ scheduleFileName || "MAA 排班 JSON" }}，共
              {{ calculationStates.length }} 个状态
            </dd>
          </div>
          <div>
            <dt>干员数据</dt>
            <dd>{{ operatorDataDescription }}</dd>
          </div>
          <div>
            <dt>布局档案</dt>
            <dd>{{ LAYOUT_LABELS[effectiveLayoutCardKey] || effectiveLayoutCardKey }}</dd>
          </div>
          <div>
            <dt>时间口径</dt>
            <dd>
              {{ planDurations.map((duration) => `${duration} 分钟`).join(" + ") }}
              （顺序轮换）
            </dd>
          </div>
          <div>
            <dt>技能口径</dt>
            <dd>{{ matching?.allSkillsUnlocked ? "按全技能解锁估算" : "按导入干员精英化与等级解析" }}</dd>
          </div>
        </dl>
      </section>

      <section class="tool-section schedule-preview-section">
        <div class="section-heading">
          <div>
            <h2>基地排班图</h2>
            <p>按班次查看导入后参与核算的房间、干员、产物和房间效率。</p>
          </div>
        </div>
        <div
          class="maa-yield-state-tabs"
          role="tablist"
          aria-label="核算班次"
        >
          <button
            v-for="(shift, index) in scheduleResourceSummaryShifts"
            :key="`${shift.name}-${index}`"
            type="button"
            :class="{ active: index === activeSchedulePreviewStateIndex }"
            role="tab"
            :aria-selected="index === activeSchedulePreviewStateIndex"
            @click="activeSchedulePreviewStateIndex = index"
          >
            <strong>{{ shift.name }}</strong>
            <span>{{ shift.time }}</span>
          </button>
        </div>
        <RiicSchedulePreview
          :preview="model.preview"
          :active-state-index="activeSchedulePreviewStateIndex"
          :operator-table="operatorTableV2"
          :shifts="scheduleResourceSummaryShifts"
          :drone-target="activeSchedulePreviewDroneTarget"
          :show-room-efficiency="true"
          export-static
        />
      </section>

      <RiicScheduleResourceSummary
        :yield="scheduleResourceSummaryYield"
        :shifts="scheduleResourceSummaryShifts"
        :drone-target-preview-keys-by-state="
          scheduleResourceSummaryTargetKeysByState
        "
      />

      <section class="tool-section">
        <div class="section-heading">
          <div>
          <h2>最终资源结果</h2>
          <p>先看周期折算后的最终结果，再向下追溯资源流和房间班段。</p>
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

        <div class="ledger-grid">
          <article class="ledger-card">
            <strong>赤金流向</strong>
            <span>生产 {{ formatNumber(resourceFlows.gold?.grossOutputPerDay) }} / 天</span>
            <span>贸易消耗 {{ formatNumber(resourceFlows.gold?.tradeConsumptionPerDay) }} / 天</span>
            <span>最终净值 {{ formatNumber(resources.find((item) => item.resource === "gold")?.outputPerDay) }} / 天</span>
          </article>
          <article class="ledger-card">
            <strong>合成玉流向</strong>
            <span>搓玉消耗龙门币 {{ formatNumber(resourceFlows.orundum?.lmdConsumptionPerDay) }} / 天</span>
            <span>贸易消耗碎片 {{ formatNumber(resourceFlows.orundum?.shardConsumptionPerDay) }} / 天</span>
            <span>消耗素材 {{ formatNumber(resourceFlows.orundum?.craftMaterialConsumptionPerDay) }} / 天</span>
          </article>
        </div>

        <div v-if="tradingSettlements.length" class="trade-ledger">
          <strong>贸易订单结算</strong>
          <div
            v-for="trade in tradingSettlements"
            :key="trade.key"
            class="trade-ledger-row"
          >
            <span>{{ trade.label }} · {{ trade.typeLabel }}</span>
            <span>
              龙门币 {{ formatNumber(trade.lmdOutputPerDay) }} / 天，
              赤金 {{ formatNumber(trade.goldConsumptionPerDay) }} / 天
            </span>
          </div>
        </div>
      </section>

      <section class="tool-section">
        <div class="section-heading">
          <div>
            <h2>房间结算</h2>
          <p>按物理房间汇总，再展开到每个班段的干员、效率、时长和本段产出。</p>
          </div>
        </div>

        <div class="room-list">
          <article v-for="room in yieldRooms" :key="room.key" class="room-row">
            <div class="room-main">
              <strong>{{ room.label }}</strong>
              <span>
                {{ formatProduct(room) }} ·
                {{ room.isCalculated ? "已计算" : "未完成结算" }}
              </span>
            </div>
            <strong class="room-output">
              {{ formatNumber(room.outputPerDay) }} {{ room.unit }}
            </strong>
            <div class="room-segments">
              <article
                v-for="(segment, index) in room.segments"
                :key="`${room.key}-${index}`"
                class="room-settlement-step"
                :class="{ unavailable: !segment.calculated }"
              >
                <div class="settlement-step-heading">
                  <strong>班段 {{ segment.stateIndex + 1 }}</strong>
                  <span>
                    {{ formatNumber(segment.startHour) }} - {{ formatNumber(segment.startHour + segment.durationHours) }} 小时，
                    {{ formatNumber(segment.durationHours) }} 小时
                  </span>
                </div>
                <template v-if="segment.calculated">
                  <p v-if="hasEfficiency(segment)" class="settlement-detail">
                    实际效率 {{ formatNumber(segment.efficiency) }}%
                    <span v-if="formatEfficiencyBreakdown(segment)">
                      （{{ formatEfficiencyBreakdown(segment) }}）
                    </span>
                  </p>
                  <p class="settlement-detail">
                    干员：
                    {{
                      segment.operators?.length
                        ? segment.operators.map(formatOperator).join("、")
                        : "未安排干员"
                    }}
                  </p>
                  <p class="settlement-detail">
                    {{ getSettlementMethod(room) }}；本段产出
                    {{ formatNumber(segment.output) }} {{ room.unit }}
                  </p>
                </template>
                <p v-else class="settlement-detail">
                  本段未完成结算：{{ formatUnavailableReason(segment.unavailableReason, segment) }}
                </p>
              </article>
            </div>
          </article>
        </div>
      </section>

      <section class="tool-section drone-section">
        <div class="section-heading">
          <div>
            <h2>无人机结算</h2>
            <p>单独核对充能、投向和加速收益，避免把无人机收益误算成房间常驻产出。</p>
          </div>
          <span class="result-meta">
            {{ droneTargetSettlement?.isCalculated ? "已完成" : "未选择或未完成" }}
          </span>
        </div>
        <div class="drone-summary">
          <span>电站充能 {{ formatNumber(droneCharge?.droneOutputPerDay) }} 架/天</span>
          <span>实际使用 {{ formatNumber(droneUsedPerDay) }} 架/天</span>
          <span>加速产出 {{ formatNumber(droneTargetSettlement?.outputPerDay) }} {{ droneTargetSettlement?.unit || "" }}/天</span>
        </div>
        <div v-if="droneTargetSettlement?.segments?.length" class="drone-segments">
          <div
            v-for="(segment, index) in droneTargetSettlement.segments"
            :key="`drone-${index}`"
            class="drone-segment"
          >
            <strong>班段 {{ Number(segment.stateIndex) + 1 }}</strong>
            <span>
              投向 {{ segment.targetLabel || "未投向房间" }}，
              {{ segment.calculated ? `加速 ${formatNumber(segment.acceleratedHours)} 小时` : "未完成" }}
            </span>
          </div>
        </div>
      </section>

      <section class="tool-section audit-section">
        <div class="section-heading">
          <div>
            <h2>导入审计</h2>
            <p>这里保留完整的班段、房间和干员对应关系，用来确认 MAA JSON 是否被正确读入。</p>
          </div>
        </div>
        <div class="audit-state-list">
          <article v-for="state in calculationStates" :key="state.id" class="audit-state">
            <header class="state-header">
              <strong>班段 {{ state.index + 1 }}</strong>
              <span>
                {{ formatNumber(state.startHour) }} - {{ formatNumber(state.startHour + state.durationHours) }} 小时，
                持续 {{ formatNumber(state.durationHours) }} 小时
              </span>
            </header>
            <p class="audit-room-line" v-for="room in state.rooms" :key="room.key">
              <strong>{{ room.label }}</strong>
              {{ formatProduct(room) }}，{{ room.stationLevel }} 级 / {{ room.expectedSlots }} 槽：
              {{
                room.operators.length
                  ? room.operators.map(formatOperator).join("、")
                  : "未安排干员"
              }}
            </p>
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

.duration-settings {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px 16px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--c-border-color);
}

.duration-settings > div {
  flex: 1 1 240px;
}

.duration-settings p {
  margin: 4px 0 0;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.duration-control {
  display: grid;
  grid-template-columns: auto 78px auto;
  align-items: center;
  gap: 6px;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.duration-control input {
  width: 78px;
  padding: 6px 8px;
  border: 1px solid var(--c-border-color);
  background: transparent;
  color: inherit;
  font: inherit;
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

.import-summary-section {
  margin-top: 16px;
}

.schedule-preview-section {
  margin-top: 16px;
}

.maa-yield-state-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.maa-yield-state-tabs button {
  display: grid;
  min-width: 106px;
  gap: 3px;
  padding: 9px 12px;
  border: 1px solid var(--c-border-color);
  background: transparent;
  color: var(--c-text-color);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.maa-yield-state-tabs button.active {
  border-color: var(--riic-blue, #2878c8);
  background: rgba(40, 120, 200, 0.1);
  color: var(--riic-blue, #2878c8);
}

.maa-yield-state-tabs span {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
}

.calculation-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 20px;
  margin: 18px 0 0;
}

.calculation-facts div {
  display: grid;
  gap: 4px;
}

.calculation-facts dt,
.state-header span,
.audit-room-line {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.calculation-facts dt {
  font-weight: 600;
}

.calculation-facts dd {
  margin: 0;
}

.audit-state-list {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.audit-state {
  border-top: 1px solid var(--c-border-color);
  padding-top: 14px;
}

.state-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.audit-room-line {
  margin: 8px 0 0;
  line-height: 1.45;
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

.ledger-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.ledger-card,
.trade-ledger {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--c-border-color);
}

.ledger-card span,
.trade-ledger-row,
.drone-summary,
.drone-segment {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.trade-ledger {
  margin-top: 10px;
}

.trade-ledger-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 6px;
  border-top: 1px solid var(--c-border-color);
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
  gap: 8px;
}

.room-settlement-step {
  padding: 10px 12px;
  border: 1px solid var(--c-border-color);
}

.settlement-step-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.settlement-step-heading span,
.settlement-detail {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.settlement-detail {
  margin: 6px 0 0;
  line-height: 1.5;
}

.room-segments .unavailable {
  color: #c0392b;
}

.drone-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 16px;
}

.drone-segments {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.drone-segment {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--c-border-color);
}

.drone-segment strong {
  color: var(--c-text-color);
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
  .resource-grid,
  .calculation-facts,
  .ledger-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resource-card strong {
    font-size: 17px;
  }

  .secondary-button {
    margin-left: 0;
  }

  .duration-settings {
    align-items: stretch;
    flex-direction: column;
  }

  .maa-yield-state-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .maa-yield-state-tabs button {
    min-width: 0;
  }

  .state-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .settlement-step-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .trade-ledger-row,
  .drone-segment {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
