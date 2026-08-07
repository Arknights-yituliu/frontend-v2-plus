<script setup>
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

defineProps({
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
  confirmedLayoutPlan: {
    type: Object,
    default: null,
  },
  riicMatchingRoster: {
    type: Object,
    default: null,
  },
  riicLayer3MatchedRuleCount: {
    type: Number,
    default: 0,
  },
  riicLayer3RuleChecks: {
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
  formatRiicLayer3OperatorCondition: {
    type: Function,
    required: true,
  },
  formatRiicLayer3FacilityCondition: {
    type: Function,
    required: true,
  },
  formatRiicLayer3RuleEffect: {
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
      <span
        v-for="requirement in scheduleTrainingRequirements"
        :key="requirement.charId"
      >
        <OperatorAvatar
          :char-id="requirement.charId"
          :rarity="operatorTable?.[requirement.charId]?.rarity || 1"
          :size="26"
          :mobile-size="24"
          border
        ></OperatorAvatar>
        <small>{{ requirement.name }}</small>
        <em>{{ formatTrainingRequirement(requirement) }}</em>
      </span>
    </div>
    <p v-else class="additional-info-empty">
      当前排班暂无培养建议
    </p>
  </section>

  <section class="additional-info-module">
    <header class="additional-info-module-heading">
      <h3>产能核算</h3>
    </header>
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
        >
          <summary>查看计算过程</summary>
          <pre>{{ result.trace.join("\n") }}</pre>
        </details>
      </article>
    </div>

    <p v-else class="riic-yield-engine-empty">
      生成可导出的排班表后即可开始核算
    </p>
  </section>

  <section
    v-if="showCandidateDebugValues"
    class="additional-info-module riic-layer3-rule-module"
  >
    <header class="additional-info-module-heading">
      <h3>第三层规则检查</h3>
      <span
        v-if="confirmedLayoutPlan && riicMatchingRoster"
        class="riic-layer3-rule-summary"
      >
        满足 {{ riicLayer3MatchedRuleCount }} / {{ riicLayer3RuleChecks.length }} 条
      </span>
    </header>

    <p v-if="!confirmedLayoutPlan" class="additional-info-empty">
      请选择布局后查看规则条件
    </p>
    <p v-else-if="!riicMatchingRoster" class="additional-info-empty">
      请导入干员数据后查看规则条件
    </p>
    <div v-else class="riic-layer3-rule-list">
      <article
        v-for="rule in riicLayer3RuleChecks"
        :key="rule.id"
        class="riic-layer3-rule-row"
        :class="{ matched: rule.matched }"
      >
        <div class="riic-layer3-rule-status">
          <v-icon
            :icon="
              rule.matched
                ? 'mdi-check-circle-outline'
                : 'mdi-close-circle-outline'
            "
            size="17"
          ></v-icon>
          <code>{{ rule.id }}</code>
        </div>

        <div class="riic-layer3-rule-conditions">
          <span
            v-for="condition in rule.operatorConditions"
            :key="`${rule.id}:operator:${condition.operatorId}:${condition.eliteAtLeast}`"
            :class="{ matched: condition.matched }"
          >
            {{ formatRiicLayer3OperatorCondition(condition) }}
          </span>
          <span
            v-for="condition in rule.facilityConditions"
            :key="`${rule.id}:facility:${condition.kind}:${condition.count}:${condition.productKindCount}`"
            :class="{ matched: condition.matched }"
          >
            {{ formatRiicLayer3FacilityCondition(condition) }}
          </span>
          <span
            v-if="!rule.facilityConditions.length"
            class="neutral"
          >
            无额外布局条件
          </span>
        </div>

        <div class="riic-layer3-rule-effects">
          <span
            v-for="(effect, effectIndex) in rule.effects"
            :key="`${rule.id}:effect:${effectIndex}`"
          >
            {{ formatRiicLayer3RuleEffect(effect) }}
          </span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.additional-info-module {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.additional-info-module + .additional-info-module {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border-color);
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
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
}

.schedule-training-requirements > span {
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

.riic-layer3-rule-summary {
  margin-left: 8px;
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.riic-layer3-rule-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.riic-layer3-rule-row {
  display: grid;
  grid-template-columns: minmax(190px, 0.72fr) minmax(250px, 1.3fr) minmax(
      210px,
      1fr
    );
  align-items: start;
  gap: 8px 16px;
  min-width: 0;
  padding: 7px 0 7px 10px;
  border-left: 3px solid var(--riic-orange);
  background: color-mix(
    in srgb,
    var(--riic-orange) 4%,
    var(--c-page-background-color)
  );
}

.riic-layer3-rule-row.matched {
  border-left-color: var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 4%,
    var(--c-page-background-color)
  );
}

.riic-layer3-rule-status,
.riic-layer3-rule-conditions,
.riic-layer3-rule-effects {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px 9px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.riic-layer3-rule-status {
  flex-wrap: nowrap;
  color: var(--riic-orange);
}

.riic-layer3-rule-row.matched .riic-layer3-rule-status {
  color: var(--riic-green);
}

.riic-layer3-rule-status code {
  overflow: hidden;
  color: var(--c-text-color);
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.riic-layer3-rule-conditions span,
.riic-layer3-rule-effects span {
  min-width: 0;
}

.riic-layer3-rule-conditions span:not(.neutral) {
  color: var(--riic-orange);
}

.riic-layer3-rule-conditions span.matched {
  color: var(--riic-green);
}

.riic-layer3-rule-conditions .neutral {
  color: var(--riic-muted);
}

.riic-layer3-rule-effects {
  color: var(--c-text-color);
}

.riic-yield-engine-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 0;
}

.riic-yield-engine-result > header,
.riic-yield-engine-metrics,
.riic-yield-engine-details > div {
  display: flex;
  align-items: center;
}

.riic-yield-engine-result > header {
  min-width: 0;
}

.riic-yield-engine-result > header strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
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

.riic-yield-engine-metrics {
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
  flex-wrap: wrap;
  align-items: baseline;
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
    gap: 6px 8px;
  }

  .schedule-training-requirements > span {
    max-width: 100%;
  }

  .schedule-training-requirements em {
    overflow-wrap: anywhere;
  }
}
</style>
