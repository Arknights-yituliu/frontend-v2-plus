<script setup>
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import OPERATOR_UPGRADE_DATA from "/src/static/json/tools/operatorUpgradeData.json";

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
  operatorTable: {
    type: Object,
    default: () => ({}),
  },
  riicYieldEngineResults: {
    type: Array,
    default: () => [],
  },
  showCandidateDebugValues: {
    type: Boolean,
    default: false,
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
</script>

<template>
  <section class="additional-info-module">
    <header class="additional-info-module-heading">
      <h3>干员培养建议</h3>
    </header>
    <div
      v-if="scheduleTrainingRequirements.length"
      class="schedule-training-requirements"
    >
      <article
        v-for="requirement in scheduleTrainingRequirements"
        :key="requirement.charId"
        class="schedule-training-requirement"
      >
        <OperatorAvatar
          :char-id="requirement.charId"
          :rarity="operatorTable?.[requirement.charId]?.rarity || 1"
          :size="36"
          :mobile-size="32"
          border
        ></OperatorAvatar>
        <div class="schedule-training-requirement-copy">
          <div class="schedule-training-requirement-title">
            <strong>{{ requirement.name }}</strong>
            <span>{{ formatTrainingRequirement(requirement) }}</span>
          </div>
          <ul
            v-if="getTrainingUpgradeEffects(requirement).length"
            class="schedule-training-upgrade-effects"
          >
            <li
              v-for="upgrade in getTrainingUpgradeEffects(requirement)"
              :key="`${upgrade.elite}:${upgrade.level}:${upgrade.skillName}`"
            >
              <strong v-if="upgrade.eff" class="schedule-training-upgrade-effect">
                {{ upgrade.eff }}
              </strong>
              <span>{{ upgrade.text }}</span>
            </li>
          </ul>
        </div>
      </article>
    </div>
    <p v-else class="additional-info-empty">
      如果没有推荐干员，可能是“导入干员与生成排班表”里“干员练度”选项没有打开，或者是你该练的都练了
    </p>
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

.additional-info-empty {
  margin: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
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
