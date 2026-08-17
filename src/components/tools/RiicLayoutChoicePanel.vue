<script setup>
import { computed } from "vue";
import RiicCustomLayoutEditor from "/src/components/tools/RiicCustomLayoutEditor.vue";

const props = defineProps({
  recommendationPanelOpen: {
    type: Boolean,
    default: false,
  },
  steps: {
    type: Array,
    default: () => [],
  },
  currentStep: {
    type: Number,
    default: 0,
  },
  activeStep: {
    type: Object,
    default: null,
  },
  answers: {
    type: Object,
    required: true,
  },
  recommendation: {
    type: Object,
    default: null,
  },
  recommendationCard: {
    type: Object,
    default: null,
  },
  layoutEntry: {
    type: String,
    default: "",
  },
  selectedLayoutShiftMode: {
    type: String,
    default: "",
  },
  selectedManualScheduleValue: {
    type: String,
    default: "",
  },
  layoutShiftOptions: {
    type: Array,
    default: () => [],
  },
  visibleLayoutScheduleOptions: {
    type: Array,
    default: () => [],
  },
  isStepComplete: {
    type: Function,
    required: true,
  },
  isLayoutRecommended: {
    type: Function,
    required: true,
  },
  customLayoutEditorOpen: {
    type: Boolean,
    default: false,
  },
  customLayoutActive: {
    type: Boolean,
    default: false,
  },
  customLayoutResettable: {
    type: Boolean,
    default: false,
  },
  customLayoutStations: {
    type: Array,
    default: () => [],
  },
  roomProductOptions: {
    type: Object,
    default: () => ({}),
  },
  customLayoutPowerSummary: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  "toggle-recommendation-panel",
  "select-recommendation-step",
  "update-answer",
  "reset-recommendation-answers",
  "select-layout-shift",
  "select-manual-schedule-option",
  "toggle-custom-layout-editor",
  "change-custom-layout-station-level",
  "change-custom-layout-station-product",
  "apply-custom-layout",
  "reset-custom-layout",
]);

const visibleLayoutScheduleOptionRows = computed(() => {
  const options = props.visibleLayoutScheduleOptions || [];
  if (props.selectedLayoutShiftMode === "once") {
    return options.length ? [options] : [];
  }

  const rows = new Map([
    [3, []],
    [2, []],
  ]);
  const otherOptions = [];

  for (const option of options) {
    const powerPlantCount = Number(
      option?.rooms?.find((room) => room?.facility === "power")?.count,
    );
    const row = rows.get(powerPlantCount);
    if (row) {
      row.push(option);
    } else {
      otherOptions.push(option);
    }
  }

  return [...rows.values(), otherOptions].filter((row) => row.length > 0);
});

function updateAnswer(key, value) {
  emit("update-answer", { key, value });
}
</script>

<template>
  <section class="layout-choice-panel">
    <section
      class="recommendation-entry-panel"
      :class="{ expanded: recommendationPanelOpen }"
    >
      <button
        type="button"
        class="recommendation-entry-action"
        :aria-expanded="recommendationPanelOpen"
        @click="emit('toggle-recommendation-panel')"
      >
        <span>不知道选什么，帮我推荐</span>
        <v-icon
          :icon="
            recommendationPanelOpen
              ? 'mdi-chevron-up'
              : 'mdi-chevron-down'
          "
          size="18"
        ></v-icon>
      </button>

      <div
        v-if="recommendationPanelOpen"
        class="recommendation-step-tabs"
      >
        <div
          class="recommendation-step-tab-list"
          role="tablist"
          aria-label="布局推荐问卷"
        >
          <button
            v-for="(step, index) in steps"
            :key="step.key"
            type="button"
            class="recommendation-step-tab"
            :class="{
              active: currentStep === index,
              complete: isStepComplete(step),
            }"
            role="tab"
            :aria-selected="currentStep === index"
            @click="emit('select-recommendation-step', index)"
          >
            <v-icon
              :icon="
                isStepComplete(step)
                  ? 'mdi-check-circle'
                  : 'mdi-alert-circle-outline'
              "
              size="16"
            ></v-icon>
            <span>{{ step.label }}</span>
          </button>
        </div>
      </div>

      <transition name="recommendation-panel">
        <section
          v-if="recommendationPanelOpen && activeStep"
          class="recommendation-question-panel"
        >
          <div
            class="recommendation-question-fields"
            :class="`question-fields-${activeStep.key}`"
          >
            <fieldset
              v-for="field in activeStep.fields"
              :key="field.key"
              class="recommendation-field"
              :class="`field-${field.layout}`"
            >
              <legend>{{ field.label }}</legend>
              <el-radio-group
                :model-value="answers[field.key]"
                class="recommendation-answer-group"
                :class="[
                  `answer-group-${field.layout}`,
                  { compact: field.options.length <= 2 },
                ]"
                :aria-label="field.label"
                @update:model-value="updateAnswer(field.key, $event)"
              >
                <el-radio
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.value"
                  class="recommendation-answer"
                  :class="`tone-${option.tone}`"
                >
                  <span class="recommendation-answer-content">
                    <v-icon :icon="option.icon" size="18"></v-icon>
                    <span class="recommendation-answer-copy">
                      <strong>{{ option.label }}</strong>
                      <small v-if="option.description">
                        {{ option.description }}
                      </small>
                    </span>
                  </span>
                </el-radio>
              </el-radio-group>
            </fieldset>
          </div>
        </section>
      </transition>

      <section
        v-if="layoutEntry === 'recommend' && recommendation"
        class="recommendation-result-panel"
      >
        <div class="recommendation-result-head">
          <div class="recommendation-result-summary">
            <strong>
              {{ recommendationCard?.label || recommendation.layout.shortName }}
              ·
              {{ recommendationCard?.description || "" }}
            </strong>
          </div>
          <button
            type="button"
            class="recommendation-result-reset"
            title="重置问卷"
            aria-label="重置问卷并清除所有已填写选项"
            @click="emit('reset-recommendation-answers')"
          >
            <v-icon icon="mdi-restart" size="16"></v-icon>
            <span>重置</span>
          </button>
        </div>
        <p class="recommendation-result-reason">
          {{ recommendation.layoutReason }}
        </p>
      </section>
    </section>

    <section class="layout-frequency-section">
      <div
        class="layout-shift-list"
        role="radiogroup"
        aria-label="换班频率"
      >
        <button
          v-for="option in layoutShiftOptions"
          :key="option.value"
          type="button"
          class="layout-shift-choice"
          :class="[
            `tone-${option.tone}`,
            { selected: selectedLayoutShiftMode === option.value },
          ]"
          role="radio"
          :aria-checked="selectedLayoutShiftMode === option.value"
          @click="emit('select-layout-shift', option.value)"
        >
          <v-icon :icon="option.icon" size="17"></v-icon>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </section>

    <section class="layout-options-section">
      <div
        v-if="visibleLayoutScheduleOptionRows.length"
        class="layout-choice-rows"
        role="radiogroup"
        aria-label="可选布局"
      >
        <div
          v-for="(row, rowIndex) in visibleLayoutScheduleOptionRows"
          :key="`layout-row-${rowIndex}`"
          class="layout-choice-grid layout-schedule-choice-grid"
        >
          <button
            v-for="option in row"
            :key="option.value"
            type="button"
            class="layout-choice"
            :class="[
              `layout-${option.key}`,
              {
                selected: selectedManualScheduleValue === option.value,
                recommended:
                  layoutEntry === 'recommend' && isLayoutRecommended(option),
              },
            ]"
            role="radio"
            :aria-checked="selectedManualScheduleValue === option.value"
            @click="emit('select-manual-schedule-option', option.value)"
          >
            <span class="layout-choice-topline">
              <span class="layout-choice-code">{{ option.label }}</span>
              <span class="layout-choice-icons">
                <v-icon :icon="option.icon" size="18"></v-icon>
                <v-icon
                  v-if="option.secondaryIcon"
                  :icon="option.secondaryIcon"
                  size="18"
                ></v-icon>
              </span>
            </span>
            <span class="layout-choice-description">
              {{ option.description }}
            </span>
            <span class="layout-choice-facilities">
              {{ option.facilitySummary }}
            </span>
          </button>
        </div>
      </div>

      <RiicCustomLayoutEditor
        v-if="selectedManualScheduleValue"
        :open="customLayoutEditorOpen"
        :active="customLayoutActive"
        :resettable="customLayoutResettable"
        :stations="customLayoutStations"
        :product-options="roomProductOptions"
        :power-summary="customLayoutPowerSummary"
        @toggle="emit('toggle-custom-layout-editor')"
        @change-station-level="
          emit('change-custom-layout-station-level', $event)
        "
        @change-station-product="
          emit('change-custom-layout-station-product', $event)
        "
        @apply="emit('apply-custom-layout')"
        @reset="emit('reset-custom-layout')"
      ></RiicCustomLayoutEditor>
    </section>
  </section>
</template>

<style scoped>
.layout-choice-panel {
  margin-top: 20px;
  padding: 0;
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

.recommendation-entry-panel {
  margin-bottom: 22px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color-secondary);
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.recommendation-entry-panel.expanded {
  background: var(--c-page-background-color);
}

.recommendation-entry-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 58px;
  margin: 0;
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.recommendation-entry-action > .v-icon {
  margin-left: auto;
}

.recommendation-step-tabs {
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 0 14px 14px;
}

.recommendation-step-tab-list {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
  gap: 6px;
}

.recommendation-step-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 34px;
  gap: 5px;
  padding: 5px 7px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 3px 3px 0 0;
  background: color-mix(
    in srgb,
    var(--riic-gold) 8%,
    var(--c-page-background-color)
  );
  color: var(--riic-gold);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  cursor: pointer;
}

.recommendation-step-tab:hover,
.recommendation-step-tab.active {
  background: color-mix(
    in srgb,
    var(--riic-gold) 14%,
    var(--c-page-background-color)
  );
  color: var(--riic-gold);
}

.recommendation-step-tab.active {
  border-bottom-color: var(--riic-gold);
  background: color-mix(
    in srgb,
    var(--riic-gold) 22%,
    var(--c-page-background-color)
  );
  box-shadow: inset 0 -3px 0 var(--riic-gold);
}

.recommendation-step-tab.complete {
  background: color-mix(
    in srgb,
    var(--riic-green) 9%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
}

.recommendation-step-tab.complete.active {
  border-bottom-color: var(--riic-green);
  background: color-mix(
    in srgb,
    var(--riic-green) 22%,
    var(--c-page-background-color)
  );
  box-shadow: inset 0 -3px 0 var(--riic-green);
}

.recommendation-step-tab span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-question-panel {
  padding: 14px;
  border-top: 1px solid var(--c-border-color);
}

.recommendation-panel-enter-active,
.recommendation-panel-leave-active {
  overflow: hidden;
  transition:
    max-height 0.26s ease,
    opacity 0.18s ease;
}

.recommendation-panel-enter-from,
.recommendation-panel-leave-to {
  max-height: 0;
  opacity: 0;
}

.recommendation-panel-enter-to,
.recommendation-panel-leave-from {
  max-height: 640px;
  opacity: 1;
}

.layout-frequency-section,
.layout-options-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layout-options-section {
  margin-top: 14px;
}

.layout-choice-grid.layout-schedule-choice-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 0;
}

.layout-choice-rows {
  display: grid;
  gap: 8px;
}

.recommendation-result-panel {
  padding: 12px 14px;
}

.recommendation-result-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.recommendation-result-summary {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recommendation-result-summary strong {
  overflow: hidden;
  color: var(--riic-green);
  font-size: 18px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-result-reason {
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.recommendation-result-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 32px;
  padding: 5px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.recommendation-result-reset:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-orange) 48%,
    var(--c-border-color)
  );
  color: var(--riic-orange);
}

.recommendation-question-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
}

.recommendation-question-fields.question-fields-resources {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.recommendation-question-fields .field-farming {
  grid-column: 1 / -1;
}

.recommendation-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.recommendation-field legend {
  padding: 0;
  color: var(--c-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.recommendation-answer-group {
  --recommendation-answer-height: 46px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}

.recommendation-answer-group.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.recommendation-answer-group :deep(.el-radio) {
  display: block;
  width: 100%;
  height: var(--recommendation-answer-height);
  min-width: 0;
  margin: 0;
}

.recommendation-answer-group :deep(.el-radio__input) {
  display: none;
}

.recommendation-answer-group :deep(.el-radio__label) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  width: 100%;
  height: var(--recommendation-answer-height);
  min-width: 0;
  min-height: 0;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
}

.recommendation-answer-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  gap: 7px;
  text-align: left;
}

.recommendation-answer-content > .v-icon {
  flex: 0 0 auto;
  color: var(--option-color, var(--riic-blue));
}

.recommendation-answer-copy {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  min-width: 0;
}

.recommendation-answer-copy strong {
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.recommendation-answer-copy small {
  margin-top: 2px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.25;
}

.answer-group-frequency {
  --recommendation-answer-height: 72px;
}

.answer-group-frequency .recommendation-answer-content,
.answer-group-farming .recommendation-answer-content {
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
  text-align: left;
}

.answer-group-frequency .recommendation-answer-copy {
  align-items: flex-start;
}

.answer-group-reliability {
  --recommendation-answer-height: 54px;
}

.answer-group-reliability :deep(.el-radio__label) {
  justify-content: flex-start;
  text-align: left;
}

.answer-group-reliability .recommendation-answer-content {
  justify-content: flex-start;
}

.answer-group-reliability .recommendation-answer-copy {
  align-items: flex-start;
}

.answer-group-binary {
  --recommendation-answer-height: 50px;
}

.answer-group-binary :deep(.el-radio__label) {
  justify-content: flex-start;
  padding: 8px 12px;
  text-align: left;
}

.answer-group-binary .recommendation-answer-content {
  justify-content: flex-start;
}

.recommendation-answer-group
  :deep(.el-radio__input.is-checked + .el-radio__label) {
  background: color-mix(
    in srgb,
    var(--option-color, var(--riic-blue)) 11%,
    var(--c-page-background-color)
  );
  box-shadow: inset 3px 0 0 var(--option-color, var(--riic-blue));
}

.layout-shift-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.layout-shift-choice {
  --option-color: var(--riic-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 0;
  min-height: 40px;
  gap: 5px;
  padding: 4px 7px;
  border: 0;
  border-radius: 3px;
  background: var(--c-page-background-color-secondary);
  color: var(--option-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.layout-shift-choice:hover,
.layout-shift-choice.selected {
  background: color-mix(
    in srgb,
    var(--option-color) 7%,
    var(--c-page-background-color-secondary)
  );
}

.layout-shift-choice.selected {
  background: color-mix(
    in srgb,
    var(--option-color) 10%,
    var(--c-page-background-color)
  );
}

.layout-shift-choice > span {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  gap: 1px;
  text-align: center;
}

.layout-shift-choice strong {
  color: var(--c-text-color);
  font-size: 13px;
}

.layout-shift-choice small {
  color: var(--riic-muted);
  font-size: 11px;
}

.layout-choice-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.layout-choice {
  --option-color: var(--riic-blue);
  --layout-color: var(--riic-blue);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  min-height: 84px;
  padding: 9px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.layout-choice.layout-153 {
  --layout-color: #b48745;
}

.layout-choice.layout-252-3-gold,
.layout-choice.layout-333 {
  --layout-color: #3c83bd;
}

.layout-choice.layout-243,
.layout-choice.layout-252-2-gold {
  --layout-color: #4f9b72;
}

.layout-choice.layout-243-orundum,
.layout-choice.layout-342-orundum {
  --layout-color: #d96b6b;
}

.layout-choice:hover {
  background: color-mix(
    in srgb,
    var(--option-color) 5%,
    var(--c-page-background-color-secondary)
  );
}

.layout-choice.selected {
  background: color-mix(
    in srgb,
    var(--option-color) 10%,
    var(--c-page-background-color)
  );
  box-shadow: inset 3px 0 0 var(--option-color);
}

.layout-choice.recommended {
  position: relative;
}

.layout-choice.recommended::after {
  position: absolute;
  inset: -4px;
  border-radius: 6px;
  content: "";
  pointer-events: none;
  animation: riic-recommendation-breathe 2.4s ease-in-out infinite;
}

@keyframes riic-recommendation-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 0
      color-mix(in srgb, var(--layout-color) 0%, transparent);
  }

  50% {
    box-shadow: 0 0 0 4px
      color-mix(in srgb, var(--layout-color) 36%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .layout-choice.recommended::after {
    animation: none;
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--layout-color) 30%, transparent);
  }
}

.layout-choice-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--layout-color);
}

.layout-choice-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.layout-choice-code {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}

.layout-choice-description {
  margin-top: 7px;
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-choice-facilities {
  margin-top: 6px;
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 901px) {
  .recommendation-question-fields.question-fields-resources {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .recommendation-question-fields.question-fields-operation,
  .recommendation-question-fields.question-fields-tradeoffs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recommendation-question-fields .field-farming {
    grid-column: auto;
  }

  .recommendation-question-fields .recommendation-answer-group,
  .recommendation-question-fields .recommendation-answer-group.compact {
    --recommendation-answer-height: 50px;
    grid-template-columns: minmax(0, 1fr);
    width: 288px;
    max-width: 100%;
  }

  .recommendation-question-fields
    .recommendation-answer-content,
  .recommendation-question-fields
    .answer-group-frequency
    .recommendation-answer-content,
  .recommendation-question-fields
    .answer-group-farming
    .recommendation-answer-content {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }

  .recommendation-question-fields .recommendation-answer-copy,
  .recommendation-question-fields
    .answer-group-frequency
    .recommendation-answer-copy {
    align-items: flex-start;
  }

  .recommendation-question-fields .answer-group-frequency {
    --recommendation-answer-height: 58px;
  }
}

@media (max-width: 900px) {
  .layout-choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout-choice-grid.layout-schedule-choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .layout-choice-panel {
    padding: 0;
  }

  .recommendation-question-fields.question-fields-resources {
    grid-template-columns: minmax(0, 1fr);
  }

  .answer-group-reliability {
    grid-template-columns: minmax(0, 1fr);
    --recommendation-answer-height: 46px;
  }

  .recommendation-question-panel {
    padding: 12px;
  }

  .recommendation-step-tabs {
    padding: 0 12px 12px;
  }

  .layout-choice-grid,
  .layout-shift-list {
    grid-template-columns: 1fr;
  }

  .layout-choice-grid.layout-schedule-choice-grid {
    grid-template-columns: 1fr;
  }

  .layout-choice {
    min-height: 92px;
  }
}
</style>
