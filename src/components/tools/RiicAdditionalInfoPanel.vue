<script setup>
import { computed, ref, watch } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import OPERATOR_UPGRADE_DATA from "/src/static/json/tools/operatorUpgradeData.json";
import { formatRiicOperatorTooltip } from "/src/utils/riic/riic-operator-skill-tooltip.js";
import {
  buildRiicCalculationFeedback,
  formatRiicCalculationFeedback,
} from "/src/utils/riic/riic-calculation-feedback.js";
import { calculateRiicTrainingCost } from "/src/utils/riic/riic-training-cost.js";
import { createMessage } from "/src/utils/message.js";
import { copyTextToClipboard } from "/src/utils/copyText.js";

// MAA Operator Progression (OperProgress) does not support any of Amiya's three forms
const MAA_UNSUPPORTED_CHAR_IDS = new Set([
  "char_002_amiya",
  "char_1001_amiya2",
  "char_1037_amiya3",
]);

function compareTrainingUnlock(left, right) {
  const eliteDifference = Number(left?.elite || 0) - Number(right?.elite || 0);
  if (eliteDifference !== 0) {
    return eliteDifference;
  }

  return Number(left?.level || 1) - Number(right?.level || 1);
}

function getTrainingUpgradeEffects(requirement) {
  const upgrades =
    OPERATOR_UPGRADE_DATA.operators?.[requirement?.charId]?.upgrades || [];
  const current = {
    elite: Number(requirement?.current?.elite || 0),
    level: Number(requirement?.current?.level || 1),
  };
  const required = {
    elite: Number(requirement?.required?.elite || 0),
    level: Number(requirement?.required?.level || 1),
  };

  return upgrades.filter(
    (upgrade) =>
      compareTrainingUnlock(upgrade, current) > 0 &&
      compareTrainingUnlock(upgrade, required) <= 0,
  );
}

const props = defineProps({
  scheduleTrainingRequirements: {
    type: Array,
    default: () => [],
  },
  scheduleTrainingRecommendationStatus: {
    type: String,
    default: "idle",
  },
  scheduleTrainingRecommendationPhase: {
    type: String,
    default: "",
  },
  operatorTable: {
    type: Object,
    default: () => ({}),
  },
  riicYieldEngineResults: {
    type: Array,
    default: () => [],
  },
  trainingImpactResults: {
    type: Array,
    default: () => [],
  },
  trainingImpactStatus: {
    type: String,
    default: "idle",
  },
  actualScheduleMetrics: {
    type: Object,
    default: null,
  },
  schedulePreview: {
    type: Object,
    default: null,
  },
  scheduleShifts: {
    type: Array,
    default: () => [],
  },
  operatorSourceLabel: {
    type: String,
    default: "",
  },
  layoutLabel: {
    type: String,
    default: "",
  },
  showCandidateDebugValues: {
    type: Boolean,
    default: false,
  },
  getOperatorSkillTooltip: {
    type: Function,
    default: null,
  },
  formatTrainingRequirement: {
    type: Function,
    required: true,
  },
  getRiicYieldEngineStatusMeta: {
    type: Function,
    required: true,
  },
  formatRiicYieldMetric: {
    type: Function,
    required: true,
  },
});
const emit = defineEmits(["calculate-training-impact"]);

const calculationFeedbackCopyStatus = ref("");
const trainingImpactRequestStatus = ref("");
const calculationFeedback = computed(() =>
  buildRiicCalculationFeedback({
    actualScheduleMetrics: props.actualScheduleMetrics,
    preview: props.schedulePreview,
    shifts: props.scheduleShifts,
    operatorTable: props.operatorTable,
  }),
);
const calculationFeedbackText = computed(() =>
  formatRiicCalculationFeedback({
    sourceLabel: props.operatorSourceLabel,
    layoutLabel: props.layoutLabel,
    feedback: calculationFeedback.value,
  }),
);
const trainingCosts = computed(() =>
  props.scheduleTrainingRequirements.map((requirement) => ({
    requirement,
    cost: calculateRiicTrainingCost({
      requirement,
      operator: props.operatorTable?.[requirement?.charId],
    }),
  })),
);
const trainingImpactResultsByCharId = computed(() =>
  Object.fromEntries(
    props.trainingImpactResults.map((result) => [String(result?.charId || ""), result]),
  ),
);

const maaSelecting = ref(false);
const maaSelectedCharIds = ref(new Set());

// MAA only promotes elite phases, so a requirement that only raises the level cannot be exported
function getMaaExportBlocker(requirement) {
  if (MAA_UNSUPPORTED_CHAR_IDS.has(requirement?.charId)) {
    return "MAA 暂不支持阿米娅培养";
  }
  if (!props.operatorTable?.[requirement?.charId]?.profession) {
    return "缺少干员数据，无法导出";
  }
  if (Number(requirement?.required?.elite || 0) <= Number(requirement?.current?.elite || 0)) {
    return "仅需提升等级，MAA 暂不支持";
  }
  return "";
}

const maaExportableCharIds = computed(() =>
  props.scheduleTrainingRequirements
    .filter((requirement) => !getMaaExportBlocker(requirement))
    .map((requirement) => requirement.charId),
);
const maaSelectedCount = computed(
  () => maaExportableCharIds.value.filter((charId) => maaSelectedCharIds.value.has(charId)).length,
);

const trainingRequirementsVisible = computed(
  () =>
    props.scheduleTrainingRequirements.length > 0 &&
    !["running", "pending", "error", "unavailable", "requiresOperators"].includes(
      props.scheduleTrainingRecommendationStatus,
    ),
);

watch(
  () => props.scheduleTrainingRequirements,
  () => {
    maaSelecting.value = false;
  },
);

function startMaaSelection() {
  maaSelectedCharIds.value = new Set(maaExportableCharIds.value);
  maaSelecting.value = true;
}

function cancelMaaSelection() {
  maaSelecting.value = false;
}

function toggleMaaSelection(requirement) {
  if (!maaSelecting.value || getMaaExportBlocker(requirement)) {
    return;
  }
  const selected = new Set(maaSelectedCharIds.value);
  if (!selected.delete(requirement.charId)) {
    selected.add(requirement.charId);
  }
  maaSelectedCharIds.value = selected;
}

function copyMaaElitePlans() {
  const requirements = props.scheduleTrainingRequirements.filter(
    (requirement) =>
      !getMaaExportBlocker(requirement) && maaSelectedCharIds.value.has(requirement.charId),
  );
  // MAA stops at Lv.1 of the new Elite phase, so any higher required level is left to the player
  const manualLevelCount = requirements.filter(
    (requirement) => Number(requirement.required.level || 1) > 1,
  ).length;
  const plans = requirements.map((requirement) => {
    const operator = props.operatorTable[requirement.charId];
    return {
      role: operator.profession.charAt(0) + operator.profession.slice(1).toLowerCase(),
      name: operator.name,
      elite: Number(requirement.required.elite),
    };
  });
  const text = `[\n${plans.map((plan) => `  ${JSON.stringify(plan)}`).join(",\n")}\n]`;
  copyTextToClipboard(text, (success) => {
    if (!success) {
      createMessage({ type: "error", text: "复制失败，请检查浏览器剪贴板权限" });
      return;
    }
    createMessage({
      type: "success",
      text: `已复制 ${plans.length} 名干员的精英化培养计划，请在 MAA「干员培养」中点击「从剪贴板读取」${
        manualLevelCount > 0 ? `（其中 ${manualLevelCount} 名晋升后停在 1 级，还需手动升到建议等级）` : ""
      }`,
    });
    maaSelecting.value = false;
  });
}

function getOperatorAvatarTooltip(requirement) {
  const operator = {
    charId: requirement?.charId,
    elite: requirement?.current?.elite,
    level: requirement?.current?.level,
  };
  const skillTooltip = props.getOperatorSkillTooltip
    ? props.getOperatorSkillTooltip(operator)
    : "暂无已解锁基建技能";

  return formatRiicOperatorTooltip(operator, skillTooltip);
}

function requestTrainingImpactCalculation() {
  if (!props.scheduleTrainingRequirements.length) {
    return;
  }
  trainingImpactRequestStatus.value = "已请求收益试算";
  emit("calculate-training-impact");
}

function formatFeedbackValue(value) {
  return value === undefined ? "undefined" : value === null ? "null" : String(value);
}

function formatCostNumber(value, digits = 0) {
  return value === null || value === undefined
    ? "--"
    : new Intl.NumberFormat("zh-CN", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);
}

function formatP01Operators(diagnostic) {
  return (diagnostic?.p01Operators || [])
    .map(
      (operator, index) =>
        `#${index + 1} { charId: ${formatFeedbackValue(operator?.charId)}, elite: ${formatFeedbackValue(operator?.elite)}, level: ${formatFeedbackValue(operator?.level)} }`,
    )
    .join("；");
}

function formatInvalidOperatorFields(diagnostic) {
  return (diagnostic?.invalidOperators || [])
    .map(
      (operator) =>
        `#${Number(operator?.index) + 1} [${(operator?.invalidFields || []).join(", ")}]`,
    )
    .join("；");
}

function formatL80OperatorResolution(diagnostic) {
  return (diagnostic?.l80OperatorResolution || [])
    .map(
      (operator) =>
        `${formatFeedbackValue(operator?.charId)}：档案${operator?.rosterMatched ? "已匹配" : "未匹配"}，精英化=${operator?.eliteSource || "--"}，等级=${operator?.levelSource || "--"}`,
    )
    .join("；");
}

async function copyCalculationFeedback() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(calculationFeedbackText.value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = calculationFeedbackText.value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    calculationFeedbackCopyStatus.value = "已复制";
  } catch {
    calculationFeedbackCopyStatus.value = "复制失败，请手动复制下方内容";
  }
}
</script>

<template>
  <section class="additional-info-module">
    <header class="additional-info-module-heading">
      <h3>干员培养建议</h3>
      <div v-if="trainingRequirementsVisible" class="training-maa-actions">
        <button
          type="button"
          :class="{ active: maaSelecting }"
          :disabled="maaSelecting || !maaExportableCharIds.length"
          title="选择需要提升精英化的干员，复制为 MAA「干员培养」计划"
          @click="startMaaSelection"
        >
          导出到 MAA
        </button>
        <template v-if="maaSelecting">
          <button type="button" :disabled="!maaSelectedCount" @click="copyMaaElitePlans">
            复制（{{ maaSelectedCount }}）
          </button>
          <button type="button" @click="cancelMaaSelection">取消</button>
        </template>
      </div>
      <template v-if="showCandidateDebugValues">
        <button
          type="button"
          :disabled="!scheduleTrainingRequirements.length || trainingImpactStatus === 'running'"
          @click="requestTrainingImpactCalculation"
        >
          {{ trainingImpactStatus === "running" ? "培养收益计算中" : "计算培养后收益" }}
        </button>
        <small v-if="trainingImpactRequestStatus && trainingImpactStatus !== 'idle'">
          {{ trainingImpactRequestStatus }}
        </small>
      </template>
    </header>
    <p v-if="showCandidateDebugValues" class="training-impact-note">
      收益增量 = 培养后 - 当前；负数表示培养后减少
    </p>
    <p
      v-if="scheduleTrainingRecommendationStatus === 'running'"
      class="additional-info-loading"
    >
      <v-icon
        icon="mdi-loading"
        size="16"
        class="additional-info-loading-icon"
        aria-hidden="true"
      ></v-icon>
      <span>{{ scheduleTrainingRecommendationPhase || "正在计算培养建议" }}</span>
    </p>
    <p
      v-else-if="scheduleTrainingRecommendationStatus === 'pending'"
      class="additional-info-loading"
    >
      <v-icon
        icon="mdi-loading"
        size="16"
        class="additional-info-loading-icon"
        aria-hidden="true"
      ></v-icon>
      <span>等待排班计算完成后生成培养建议</span>
    </p>
    <p
      v-else-if="['error', 'unavailable', 'requiresOperators'].includes(scheduleTrainingRecommendationStatus)"
      class="additional-info-empty"
    >
      培养建议暂不可用，后台试算未完成
    </p>
    <div
      v-else-if="scheduleTrainingRequirements.length"
      class="schedule-training-requirements"
    >
      <article
        v-for="entry in trainingCosts"
        :key="entry.requirement.charId"
        class="schedule-training-requirement"
        :class="{
          'maa-selectable': maaSelecting && !getMaaExportBlocker(entry.requirement),
          'maa-selected': maaSelecting && !getMaaExportBlocker(entry.requirement) && maaSelectedCharIds.has(entry.requirement.charId),
          'maa-unavailable': maaSelecting && getMaaExportBlocker(entry.requirement),
        }"
        :role="maaSelecting ? 'checkbox' : undefined"
        :tabindex="maaSelecting && !getMaaExportBlocker(entry.requirement) ? 0 : undefined"
        :aria-checked="maaSelecting ? maaSelectedCharIds.has(entry.requirement.charId) : undefined"
        :aria-disabled="maaSelecting && getMaaExportBlocker(entry.requirement) ? 'true' : undefined"
        :title="maaSelecting ? getMaaExportBlocker(entry.requirement) || undefined : undefined"
        @click="toggleMaaSelection(entry.requirement)"
        @keydown.space.prevent="toggleMaaSelection(entry.requirement)"
        @keydown.enter.prevent="toggleMaaSelection(entry.requirement)"
      >
        <OperatorAvatar
          :char-id="entry.requirement.charId"
          :rarity="operatorTable?.[entry.requirement.charId]?.rarity || 1"
          :size="36"
          :mobile-size="32"
          :title="getOperatorAvatarTooltip(entry.requirement)"
          border
        ></OperatorAvatar>
        <div class="schedule-training-requirement-copy">
          <div class="schedule-training-requirement-title">
            <strong>{{ entry.requirement.name }}</strong>
            <span>{{ formatTrainingRequirement(entry.requirement) }}</span>
          </div>
          <ul
            v-if="getTrainingUpgradeEffects(entry.requirement).length"
            class="schedule-training-upgrade-effects"
          >
            <li
              v-for="upgrade in getTrainingUpgradeEffects(entry.requirement)"
              :key="`${upgrade.elite}:${upgrade.level}:${upgrade.skillName}`"
            >
              <strong v-if="upgrade.eff" class="schedule-training-upgrade-effect">
                {{ upgrade.eff }}
              </strong>
              <span>{{ upgrade.text }}</span>
            </li>
          </ul>
          <div v-if="entry.cost.status !== 'error'" class="schedule-training-cost">
            <span>培养成本：经验 {{ formatCostNumber(entry.cost.exp) }}，龙门币 {{ formatCostNumber(entry.cost.lmd) }}</span>
            <span v-if="entry.cost.totalSanity !== null">约 {{ formatCostNumber(entry.cost.totalSanity, 1) }} 理智</span>
          </div>
          <div
            v-if="entry.cost.status === 'partial' || entry.cost.status === 'error'"
            class="schedule-training-cost-warning"
          >
            培养成本部分数据缺失：{{ entry.cost.missing.join("、") }}
          </div>
          <div
            v-if="showCandidateDebugValues && trainingImpactStatus === 'running'"
            class="training-impact-inline"
          >
            培养后收益正在计算中
          </div>
          <div
            v-else-if="showCandidateDebugValues && trainingImpactResultsByCharId[String(entry.requirement.charId || '')]"
            class="training-impact-inline"
          >
            <template
              v-if="trainingImpactResultsByCharId[String(entry.requirement.charId || '')].status !== 'ready'"
            >
              试算失败：{{ trainingImpactResultsByCharId[String(entry.requirement.charId || '')].error || "未知错误" }}
            </template>
            <template v-else>
              收益增量：
              <span
                v-for="metric in trainingImpactResultsByCharId[String(entry.requirement.charId || '')].delta || []"
                :key="metric.key"
              >
                {{ metric.label }}
                {{ metric.value === null ? "--" : `${metric.value >= 0 ? "+" : ""}${formatCostNumber(metric.value, 2)}` }}{{ metric.unit ? ` ${metric.unit}` : "" }}
              </span>
            </template>
          </div>
        </div>
      </article>
    </div>
    <p v-else class="additional-info-empty">
      暂无培养建议，可能是当前布局下没有明显收益，或者相关干员已经满足要求
    </p>
  </section>

  <section
    v-if="calculationFeedback.length"
    class="additional-info-module calculation-feedback-module"
  >
    <header class="additional-info-module-heading">
      <h3>排班计算反馈</h3>
      <button type="button" @click="copyCalculationFeedback">复制反馈</button>
      <small v-if="calculationFeedbackCopyStatus">
        {{ calculationFeedbackCopyStatus }}
      </small>
    </header>
    <p class="calculation-feedback-description">
      以下班段未完成产能核算，可直接复制反馈内容。
    </p>
    <article
      v-for="entry in calculationFeedback"
      :key="entry.key"
      class="calculation-feedback-entry"
    >
      <header>
        <strong>{{ entry.title }}</strong>
        <code>{{ entry.errorCode }}</code>
      </header>
      <p>{{ entry.description }}</p>
      <ul>
        <li v-for="segment in entry.segments" :key="segment.key">
          <strong>{{ segment.shiftLabel }}</strong>
          <span v-if="segment.durationLabel">{{ segment.durationLabel }}</span>
          <span>{{ segment.product || "未标记产物" }}</span>
          <span>在岗：{{ segment.operatorLabel }}</span>
          <template v-if="segment.diagnostic">
            <small>
              P01 实际 operators：{{ formatP01Operators(segment.diagnostic) || "[]" }}
            </small>
            <small>
              P01 校验失败字段：{{ formatInvalidOperatorFields(segment.diagnostic) || "--" }}
            </small>
            <small>
              L80 回填来源：{{ formatL80OperatorResolution(segment.diagnostic) || "--" }}
            </small>
          </template>
        </li>
      </ul>
    </article>
  </section>

  <details
    v-if="showCandidateDebugValues"
    class="additional-info-debug"
    :open="showCandidateDebugValues"
  >
    <summary>外部产能计算引擎</summary>
    <div class="additional-info-debug-content">
      <div
        v-if="riicYieldEngineResults.length"
        class="riic-yield-engine-panel"
      >
        <article
          v-for="result in riicYieldEngineResults"
          :key="result.engine.id"
          class="riic-yield-engine-result"
          :class="`state-${result.status}`"
        >
          <header>
            <strong>
              {{ result.engine.name }} {{ result.engine.version }}
            </strong>
            <span
              class="riic-yield-engine-status"
              :class="`tone-${getRiicYieldEngineStatusMeta(result.status).tone}`"
            >
              <v-icon
                :icon="getRiicYieldEngineStatusMeta(result.status).icon"
                size="15"
              ></v-icon>
              {{ getRiicYieldEngineStatusMeta(result.status).label }}
            </span>
          </header>

          <div
            v-if="result.status === 'success' && result.metrics.length"
            class="riic-yield-engine-metrics"
          >
            <div
              v-for="metric in result.metrics"
              :key="metric.key"
              class="riic-yield-engine-metric"
              :class="{ primary: metric.primary }"
            >
              <span>{{ metric.label }}</span>
              <strong>{{ formatRiicYieldMetric(metric) }}</strong>
              <small>{{ metric.unit }}</small>
            </div>
          </div>

          <p
            v-else-if="result.status === 'success'"
            class="riic-yield-engine-empty"
          >
            该模型未返回可展示的产能指标
          </p>

          <p
            v-for="message in result.messages"
            :key="`${message.level}:${message.text}`"
            class="riic-yield-engine-message"
            :class="`tone-${message.level}`"
          >
            {{ message.text }}
          </p>

          <details
            v-for="section in result.sections"
            :key="section.key"
            class="riic-yield-engine-details"
            :open="showCandidateDebugValues"
          >
            <summary>{{ section.label }}</summary>
            <div>
              <span
                v-for="metric in section.metrics"
                :key="metric.key"
              >
                {{ metric.label }}：{{ formatRiicYieldMetric(metric) }}
                {{ metric.unit }}
              </span>
            </div>
          </details>

          <details
            v-if="result.trace.length"
            class="riic-yield-engine-details"
            :open="showCandidateDebugValues"
          >
            <summary>查看计算过程</summary>
            <pre>{{ result.trace.join("\n") }}</pre>
          </details>
        </article>
      </div>

      <p v-else class="riic-yield-engine-empty">
        生成可导出的排班表后即可开始核算。
      </p>
    </div>
  </details>
</template>

<style scoped>
.additional-info-module {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.additional-info-module-heading {
  display: flex;
  align-items: baseline;
  min-height: 20px;
}

.additional-info-module-heading h3 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.additional-info-module-heading button {
  min-height: 25px;
  margin-left: auto;
  padding: 3px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.3;
  cursor: pointer;
}

.additional-info-module-heading button:hover {
  border-color: color-mix(in srgb, var(--riic-orange) 48%, var(--c-border-color));
  color: var(--riic-orange);
}

.additional-info-module-heading button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.training-maa-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.additional-info-module-heading .training-maa-actions button {
  margin-left: 0;
}

.additional-info-module-heading .training-maa-actions ~ button {
  margin-left: 6px;
}

.additional-info-module-heading .training-maa-actions button.active {
  border-color: var(--riic-blue);
  color: var(--riic-blue);
  opacity: 1;
}

.additional-info-module-heading small {
  color: var(--riic-muted);
  font-size: 12px;
}

.additional-info-empty {
  margin: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.additional-info-loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.additional-info-loading-icon {
  color: var(--riic-orange);
  animation: additional-info-loading-spin 1s linear infinite;
}

@keyframes additional-info-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.training-impact-note {
  margin: -5px 0 0;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.4;
}

.calculation-feedback-module {
  padding-top: 14px;
  border-top: 1px solid var(--c-border-color);
}

.calculation-feedback-description {
  margin: -4px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.calculation-feedback-entry {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 9px 11px;
  border-left: 3px solid var(--riic-orange);
  background: color-mix(
    in srgb,
    var(--riic-orange) 5%,
    var(--c-page-background-color)
  );
}

.calculation-feedback-entry > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.calculation-feedback-entry > header strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.calculation-feedback-entry code {
  flex: 0 0 auto;
  color: var(--riic-orange);
  font-size: 12px;
}

.calculation-feedback-entry > p {
  margin: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.calculation-feedback-entry ul {
  display: grid;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.calculation-feedback-entry li {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 8px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.calculation-feedback-entry li > strong {
  color: var(--c-text-color);
  font-weight: 600;
}

.schedule-training-requirements {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.schedule-training-requirement {
  display: flex;
  align-items: center;
  min-height: 58px;
  min-width: 0;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.schedule-training-requirement.maa-selectable {
  cursor: pointer;
}

.schedule-training-requirement.maa-selected {
  border-color: var(--riic-blue);
  box-shadow: inset 0 0 0 1px var(--riic-blue);
}

.schedule-training-requirement.maa-unavailable {
  cursor: not-allowed;
  opacity: 0.5;
}

.schedule-training-requirement-copy {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.schedule-training-requirement-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
}

.schedule-training-requirement-title strong {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.schedule-training-requirement-title span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.schedule-training-upgrade-effects {
  display: grid;
  gap: 3px;
  margin: 2px 0 0;
  padding: 0;
  font-size: 11px;
  line-height: 1.45;
  list-style: none;
}

.schedule-training-upgrade-effects li {
  display: grid;
  gap: 1px;
}

.schedule-training-upgrade-effect {
  color: var(--riic-orange);
  font-size: 12px;
  font-weight: 600;
}

.schedule-training-upgrade-effects li > span {
  color: var(--riic-muted);
}

.schedule-training-cost {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 10px;
  color: var(--c-text-color);
  font-size: 11px;
  line-height: 1.4;
}

.schedule-training-cost span:last-child {
  color: var(--riic-orange);
  font-weight: 600;
}

.schedule-training-cost-warning {
  color: var(--riic-orange);
  font-size: 11px;
  line-height: 1.4;
}

.training-impact-inline {
  color: var(--riic-orange);
  font-size: 11px;
  line-height: 1.4;
}

.training-impact-inline > span {
  display: inline-block;
  margin-right: 6px;
}

.additional-info-debug {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border-color);
}

.additional-info-debug > summary {
  width: fit-content;
  color: var(--riic-muted);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
}

.additional-info-debug-content {
  padding-top: 14px;
}

.riic-yield-engine-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.riic-yield-engine-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 9px 0 9px 11px;
  border-left: 3px solid var(--c-border-color);
}

.riic-yield-engine-result.state-success {
  border-left-color: var(--riic-green);
}

.riic-yield-engine-result.state-running {
  border-left-color: var(--riic-orange);
}

.riic-yield-engine-result.state-unsupported {
  border-left-color: var(--riic-gold);
}

.riic-yield-engine-result.state-failed {
  border-left-color: var(--riic-red);
}

.riic-yield-engine-result > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.riic-yield-engine-result > header strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.riic-yield-engine-status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  line-height: 1.35;
}

.riic-yield-engine-status.tone-running {
  color: var(--riic-orange);
}

.riic-yield-engine-status.tone-success {
  color: var(--riic-green);
}

.riic-yield-engine-status.tone-unsupported {
  color: var(--riic-gold);
}

.riic-yield-engine-status.tone-failed {
  color: var(--riic-red);
}

.riic-yield-engine-metrics,
.riic-yield-engine-details > div {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 18px;
}

.riic-yield-engine-metric {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.riic-yield-engine-metric strong {
  color: var(--c-text-color);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.riic-yield-engine-metric.primary strong {
  color: var(--riic-blue);
}

.riic-yield-engine-metric small {
  color: var(--riic-muted);
  font-size: 11px;
}

.riic-yield-engine-empty,
.riic-yield-engine-message {
  margin: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.riic-yield-engine-message.tone-warning {
  color: var(--riic-orange);
}

.riic-yield-engine-message.tone-error {
  color: var(--riic-red);
}

.riic-yield-engine-details {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.riic-yield-engine-details summary {
  width: fit-content;
  cursor: pointer;
  color: var(--riic-muted);
}

.riic-yield-engine-details > div {
  gap: 4px 14px;
  padding: 7px 0 0;
}

.riic-yield-engine-details pre {
  max-height: 220px;
  margin: 7px 0 0;
  padding: 8px 10px;
  overflow: auto;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
}

@media (max-width: 640px) {
  .schedule-training-requirements {
    grid-template-columns: minmax(0, 1fr);
  }

  .schedule-training-requirement-copy span {
    overflow-wrap: anywhere;
  }
}
</style>
