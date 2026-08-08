<script setup>
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

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
  riicActualScheduleMetrics: {
    type: Object,
    default: null,
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
  riicControlCenterScenarioTrialState: {
    type: Object,
    default: () => ({
      status: "idle",
      scenarios: [],
    }),
  },
  riicPerceptionResourceTrialState: {
    type: Object,
    default: () => ({
      status: "idle",
      scenarios: [],
      controlConditionalSources: [],
      omittedMechanics: [],
    }),
  },
  riicControlCenterOperatorEffectDebugState: {
    type: Object,
    default: () => ({
      status: "idle",
      effects: [],
    }),
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

function formatActualSchedulePercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) {
    return "--";
  }

  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

function getActualScheduleFacilityLabel(facility) {
  return (
    {
      trading: "贸易站",
      manufacture: "制造站",
      meeting: "会客室",
      hire: "办公室",
      office: "办公室",
      power: "发电站",
      dormitory: "宿舍",
      training: "训练室",
    }[facility] || facility
  );
}

function getActualScheduleCalculationLabel(status) {
  return (
    {
      calculated: "已计算",
      manuallyEdited: "手动调整后待重算",
      unavailable: "暂无效率值",
    }[status] || "暂无效率值"
  );
}

function getSameShiftBindingStatusLabel(status) {
  return (
    {
      realized: "中枢同班已生效",
      unrealized: "中枢同班未生效",
      unavailable: "中枢队伍不可用",
      notApplicable: "无同班条件",
    }[status] || "无同班条件"
  );
}

function getControlCenterOperatorName(operatorId) {
  const normalizedOperatorId = String(operatorId || "").trim();
  return (
    props.operatorTable?.[normalizedOperatorId]?.name ||
    normalizedOperatorId ||
    "未知干员"
  );
}

function getControlCenterEffectScopeLabel(effect) {
  const roomLabel =
    {
      trading: "贸易站",
      manufacture: "制造站",
      hire: "办公室",
    }[effect?.roomType] || effect?.roomType;
  const productLabel =
    {
      lmd: "龙门币",
      gold: "赤金",
      experience: "经验书",
      orundum: "源石碎片",
      all: "",
    }[effect?.product] || "";

  return [roomLabel, productLabel].filter(Boolean).join(" · ");
}

function formatSignedPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) {
    return "--";
  }

  return `${percent >= 0 ? "+" : ""}${
    Number.isInteger(percent) ? percent : percent.toFixed(1)
  }%`;
}
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

  <section
    v-if="riicActualScheduleMetrics"
    class="additional-info-module riic-actual-schedule-module"
  >
    <header class="additional-info-module-heading">
      <h3>排班实际效率</h3>
      <span class="riic-actual-schedule-summary">
        {{ riicActualScheduleMetrics.cycleHours }}h 周期，
        {{ riicActualScheduleMetrics.calculatedRoomCount }} /
        {{ riicActualScheduleMetrics.roomCount }} 间已计算
      </span>
    </header>

    <div class="riic-actual-schedule-facilities">
      <article
        v-for="facility in riicActualScheduleMetrics.facilities.filter(
          (item) => item.calculatedRoomCount,
        )"
        :key="facility.facility"
        class="riic-actual-schedule-facility"
      >
        <span>{{ getActualScheduleFacilityLabel(facility.facility) }}</span>
        <strong>{{ formatActualSchedulePercent(facility.averageEfficiency) }}</strong>
        <small>
          {{ facility.calculatedRoomCount }} / {{ facility.roomCount }} 间
          <template
            v-if="facility.averageControlCenterBonusPercent"
          >
            ，中枢实际
            {{ formatActualSchedulePercent(facility.averageControlCenterBonusPercent) }}
          </template>
        </small>
      </article>
    </div>

    <div class="riic-actual-schedule-room-list">
      <article
        v-for="room in riicActualScheduleMetrics.rooms"
        :key="room.key"
        class="riic-actual-schedule-room"
        :class="{ unavailable: !room.isCalculated }"
      >
        <header>
          <strong>{{ room.label }}</strong>
          <span v-if="room.isCalculated">
            {{ formatActualSchedulePercent(room.averageEfficiency) }}
          </span>
          <span v-else>
            {{ getActualScheduleCalculationLabel(room.calculationStatus) }}
          </span>
        </header>
        <small v-if="room.isCalculated">
          <template v-if="room.product">
            {{ room.product }}，
          </template>
          中枢实际
          {{ formatActualSchedulePercent(room.averageControlCenterBonusPercent) }}
        </small>
        <small v-else>
          {{ room.calculatedDurationHours }} / {{ room.durationHours }}h 可计算
        </small>

        <details
          v-if="showCandidateDebugValues"
          class="riic-actual-schedule-details"
        >
          <summary>查看班段计算</summary>
          <div>
            <span
              v-for="segment in room.segments"
              :key="`${room.key}:${segment.startHour}:${segment.durationHours}`"
            >
              {{ segment.startHour }}h 起 {{ segment.durationHours }}h：
              {{ formatActualSchedulePercent(segment.efficiency) }}，
              {{ getSameShiftBindingStatusLabel(segment.sameShiftBindingStatus) }}
              <template v-if="segment.calculated">
                ，中枢
                {{ formatActualSchedulePercent(segment.controlCenterBonusPercent) }}
              </template>
            </span>
          </div>
        </details>
      </article>
    </div>
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
    class="additional-info-module riic-perception-trial-module"
  >
    <header class="additional-info-module-heading">
      <h3>感知资源链试算</h3>
    </header>

    <p
      v-if="riicPerceptionResourceTrialState.status === 'requiresLayout'"
      class="additional-info-empty"
    >
      请选择布局后开始试算。
    </p>
    <p
      v-else-if="
        riicPerceptionResourceTrialState.status === 'requiresOperators'
      "
      class="additional-info-empty"
    >
      请同步干员数据后开始试算。
    </p>
    <template v-else>
      <p class="riic-control-scenario-formula">
        假定宿舍满员：{{ riicPerceptionResourceTrialState.dormitoryOccupantCount }}
        人；办公室额外招募位：
        {{ riicPerceptionResourceTrialState.officeExtraRecruitmentSlots }}。
        试算分 = 制造站加成 + 贸易站加成，仅用于比较方案。
      </p>

      <div
        v-if="riicPerceptionResourceTrialState.scenarios.length"
        class="riic-perception-trial-list"
      >
        <article
          v-for="scenario in riicPerceptionResourceTrialState.scenarios"
          :key="scenario.id"
          class="riic-perception-trial-scenario"
        >
          <header>
            <strong>{{ scenario.label }}</strong>
          </header>

          <div class="riic-perception-trial-plan-list">
            <article
              v-for="plan in scenario.plans"
              :key="plan.id"
              class="riic-perception-trial-plan"
            >
              <header>
                <strong>{{ plan.label }}</strong>
                <span>试算分 {{ plan.contributionScore.toFixed(1) }}</span>
              </header>
              <p>
                感知信息 {{ plan.perceptionInformation }}；
                无声共鸣 {{ plan.silentResonance }}
              </p>
              <ul>
                <li
                  v-for="source in plan.perceptionSources"
                  :key="`${plan.id}:perception:${source.label}`"
                >
                  {{ source.label }}：{{ source.formula }} =
                  {{ source.value }} 点{{ source.resource }}
                </li>
                <li
                  v-for="source in plan.silentResonanceSources"
                  :key="`${plan.id}:resonance:${source.label}`"
                >
                  {{ source.label }}：{{ source.formula }} =
                  {{ source.value }} 点{{ source.resource }}
                </li>
                <li
                  v-for="result in plan.results"
                  :key="`${plan.id}:result:${result.operatorId}`"
                >
                  {{ result.operatorName }}：{{ result.formula }} =
                  +{{ result.bonusPercent }}%{{ result.roomType === "manufacture" ? "制造" : "贸易" }}
                </li>
              </ul>
            </article>
          </div>
        </article>
      </div>
      <p v-else class="additional-info-empty">
        当前未持有迷迭香或黑键，暂无可试算方案。
      </p>

      <p
        v-if="riicPerceptionResourceTrialState.controlConditionalSources.length"
        class="riic-perception-trial-note"
      >
        当前中枢可提供但未计入：
        <span
          v-for="source in riicPerceptionResourceTrialState.controlConditionalSources"
          :key="source.operatorId"
        >
          {{ source.operatorName }} {{ source.condition }} 时
          +{{ source.bonusPercent }} 点感知信息
        </span>
      </p>
      <ul class="riic-perception-trial-note-list">
        <li
          v-for="note in riicPerceptionResourceTrialState.omittedMechanics"
          :key="note"
        >
          {{ note }}
        </li>
      </ul>
    </template>
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

  <section
    v-if="showCandidateDebugValues"
    class="additional-info-module riic-control-scenario-module"
  >
    <header class="additional-info-module-heading">
      <h3>中枢方案试算</h3>
    </header>

    <p
      v-if="riicControlCenterScenarioTrialState.status === 'requiresLayout'"
      class="additional-info-empty"
    >
      请选择布局后开始试算。
    </p>
    <p
      v-else-if="
        riicControlCenterScenarioTrialState.status === 'requiresOperators'
      "
      class="additional-info-empty"
    >
      请同步干员数据后开始试算。
    </p>
    <div
      v-else-if="riicControlCenterScenarioTrialState.scenarios.length"
      class="riic-control-scenario-list"
    >
      <p class="riic-control-scenario-formula">
        试算分 = Σ(中枢效果加成 × 对应设施数量 × 设施权重)；制造站、贸易站权重为
        1，会客室、办公室权重为 8。只计算布局确定后即可生效的全站效果；
        少数套组会按持有干员数加入预估项；依赖实际入驻干员的效果仍留到后处理结算。
      </p>
      <article
        v-for="scenario in riicControlCenterScenarioTrialState.scenarios"
        :key="scenario.id"
        class="riic-control-scenario-row"
        :class="{
          baseline: scenario.id === 'baseline',
          recommended:
            scenario.id !== 'baseline' && scenario.deltaScore > 0,
        }"
      >
        <header>
          <strong>{{ scenario.label }}</strong>
          <span>
            {{
              scenario.deltaScore > 0
                ? `+${scenario.deltaScore.toFixed(1)}`
                : scenario.deltaScore.toFixed(1)
            }}
          </span>
        </header>
        <p>
          试算分 {{ scenario.contributionScore.toFixed(1) }}
        </p>
        <ul v-if="scenario.entries.length" class="riic-control-scenario-items">
          <li
            v-for="entry in scenario.entries"
            :key="`${scenario.id}:${entry.effectLabel}`"
          >
            <strong>
              {{ entry.effectLabel }}
            </strong>
            <span v-if="entry.kind !== 'roster'">
              计分：{{ entry.bonusPercent.toFixed(1) }} ×
              {{ entry.facilityCount }} × {{ entry.roomWeight }} =
              {{ entry.score.toFixed(1) }}
            </span>
            <span v-else>
              计分：{{ entry.baseScore.toFixed(1) }}
              <template v-for="term in entry.terms" :key="term.label">
                + {{ term.count }} × {{ term.scorePerOperator.toFixed(1) }}
              </template>
              = {{ entry.score.toFixed(1) }}
            </span>
          </li>
        </ul>
        <small v-if="scenario.deferredEffectLabels.length">
          实际排班后结算：{{ scenario.deferredEffectLabels.join(" / ") }}
        </small>
      </article>
    </div>
    <p v-else class="additional-info-empty">
      当前没有可试算的中枢候选方案。
    </p>
  </section>

  <section
    v-if="showCandidateDebugValues"
    class="additional-info-module riic-control-effect-module"
  >
    <header class="additional-info-module-heading">
      <h3>中枢定向加成执行结果</h3>
      <span
        v-if="riicControlCenterOperatorEffectDebugState.status === 'ready'"
        class="riic-layer3-rule-summary"
      >
        {{ riicControlCenterOperatorEffectDebugState.effects.length }} 项计算
      </span>
    </header>

    <p
      v-if="
        riicControlCenterOperatorEffectDebugState.status ===
        'requiresOperators'
      "
      class="additional-info-empty"
    >
      请同步干员数据后查看中枢定向加成。
    </p>
    <div
      v-else-if="riicControlCenterOperatorEffectDebugState.effects.length"
      class="riic-control-effect-list"
    >
      <article
        v-for="effect in riicControlCenterOperatorEffectDebugState.effects"
        :key="effect.key"
        class="riic-control-effect-row"
      >
        <header>
          <span class="riic-control-effect-team">
            中枢班组 {{ effect.teamIndex + 1 }}
          </span>
          <span>{{ getControlCenterEffectScopeLabel(effect) }}</span>
        </header>
        <p class="riic-control-effect-target">
          {{ getControlCenterOperatorName(effect.targetOperatorId) }}
          <small>初始中枢定向加成：0%</small>
        </p>
        <ol class="riic-control-effect-steps">
          <li
            v-for="contribution in effect.contributions"
            :key="contribution.key"
          >
            <span>
              步骤 {{ contribution.step }}：
              <strong>
                {{
                  contribution.sourceOperatorIds
                    .map(getControlCenterOperatorName)
                    .join("、")
                }}
              </strong>
              命中 {{ getControlCenterOperatorName(effect.targetOperatorId) }}，
              加成 {{ formatSignedPercent(contribution.bonusPercent) }}
            </span>
            <small>
              {{
                `${formatSignedPercent(
                  contribution.beforeBonusPercent,
                )} + ${formatSignedPercent(contribution.bonusPercent)} = ${formatSignedPercent(contribution.totalAfterBonusPercent)}`
              }}
            </small>
          </li>
        </ol>
        <p class="riic-control-effect-total">
          合计：{{ effect.formula }} = {{ formatSignedPercent(effect.totalBonusPercent) }}
        </p>
      </article>
    </div>
    <p v-else class="additional-info-empty">
      当前中枢没有对已持有干员生效的定向加成。
    </p>
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

.riic-control-scenario-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.riic-control-scenario-formula {
  margin: 0;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.55;
}

.riic-control-scenario-row {
  padding: 8px 0 8px 10px;
  border-left: 3px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.riic-control-scenario-row.baseline {
  border-left-color: var(--riic-muted);
}

.riic-control-scenario-row.recommended {
  border-left-color: var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 5%,
    var(--c-page-background-color)
  );
}

.riic-control-scenario-row > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.riic-control-scenario-row > header strong {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.riic-control-scenario-row > header span {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.riic-control-scenario-row.recommended > header span {
  color: var(--riic-green);
}

.riic-control-scenario-row p,
.riic-control-scenario-row small {
  display: block;
  margin: 4px 0 0;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.riic-control-scenario-items {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 7px 0 0;
  padding: 0;
  list-style: none;
}

.riic-control-scenario-items li {
  display: grid;
  gap: 1px;
  padding: 5px 7px;
  border: 1px solid var(--c-border-color);
  background: color-mix(
    in srgb,
    var(--c-page-background-color-secondary) 55%,
    transparent
  );
}

.riic-control-scenario-items strong,
.riic-control-scenario-items span,
.riic-control-scenario-items small {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
}

.riic-control-scenario-items strong {
  color: var(--c-text-color);
}

.riic-perception-trial-list,
.riic-perception-trial-plan-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.riic-perception-trial-scenario {
  padding: 8px 0 8px 10px;
  border-left: 3px solid var(--riic-blue);
  background: color-mix(
    in srgb,
    var(--riic-blue) 4%,
    var(--c-page-background-color)
  );
}

.riic-perception-trial-scenario > header strong,
.riic-perception-trial-plan > header strong {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.riic-perception-trial-plan {
  padding: 7px 8px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.riic-perception-trial-plan > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.riic-perception-trial-plan > header span,
.riic-perception-trial-plan p,
.riic-perception-trial-plan li,
.riic-perception-trial-note,
.riic-perception-trial-note-list {
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.riic-perception-trial-plan p,
.riic-perception-trial-note {
  margin: 4px 0 0;
}

.riic-perception-trial-plan ul,
.riic-perception-trial-note-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 6px 0 0;
  padding-left: 16px;
}

.riic-perception-trial-note span + span::before {
  margin: 0 5px;
  color: var(--riic-muted);
  content: "/";
}

.riic-control-effect-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.riic-control-effect-row {
  padding: 8px 9px;
  border-left: 3px solid var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 4%,
    var(--c-page-background-color)
  );
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.45;
}

.riic-control-effect-row > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: var(--c-text-color-secondary);
  font-size: 11px;
  line-height: 1.4;
}

.riic-control-effect-team {
  color: var(--c-text-color);
  font-weight: 600;
}

.riic-control-effect-target {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px 8px;
  margin: 5px 0 0;
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.riic-control-effect-target small {
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 400;
}

.riic-control-effect-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 7px 0 0;
  padding: 0;
  list-style: none;
}

.riic-control-effect-steps li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 10px;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
  color: var(--c-text-color-secondary);
  font-size: 11px;
  line-height: 1.45;
}

.riic-control-effect-steps li > span,
.riic-control-effect-steps li > small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.riic-control-effect-steps strong {
  color: var(--c-text-color);
}

.riic-control-effect-steps small {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.riic-control-effect-total {
  margin: 7px 0 0;
  color: var(--riic-green);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
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

.riic-actual-schedule-summary {
  margin-left: 8px;
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.riic-actual-schedule-facilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.riic-actual-schedule-facility {
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 126px;
  padding: 7px 9px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.riic-actual-schedule-facility > span,
.riic-actual-schedule-facility > small {
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.4;
}

.riic-actual-schedule-facility > strong {
  color: var(--riic-blue);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.riic-actual-schedule-facility > small {
  grid-column: 1 / -1;
}

.riic-actual-schedule-room-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.riic-actual-schedule-room {
  padding: 7px 0 7px 10px;
  border-left: 3px solid var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 4%,
    var(--c-page-background-color)
  );
}

.riic-actual-schedule-room.unavailable {
  border-left-color: var(--c-border-color);
  background: var(--c-page-background-color);
}

.riic-actual-schedule-room > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.riic-actual-schedule-room > header strong {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.riic-actual-schedule-room > header span {
  flex: 0 0 auto;
  color: var(--riic-green);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.riic-actual-schedule-room.unavailable > header span {
  color: var(--riic-muted);
  font-size: 11px;
}

.riic-actual-schedule-room > small {
  display: block;
  margin-top: 3px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.riic-actual-schedule-details {
  margin-top: 6px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.5;
}

.riic-actual-schedule-details summary {
  width: fit-content;
  cursor: pointer;
}

.riic-actual-schedule-details > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 5px;
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
