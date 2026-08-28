<script setup>
import { ref } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const props = defineProps({
  room: {
    type: Object,
    required: true,
  },
  shiftName: {
    type: String,
    default: "当前班次",
  },
  operators: {
    type: Array,
    default: () => [],
  },
  operatorMatches: {
    type: Array,
    default: () => [],
  },
  getOperatorSkillTooltip: {
    type: Function,
    default: null,
  },
  productOptions: {
    type: Array,
    default: () => [],
  },
  operatorInput: {
    type: String,
    default: "",
  },
  inputUnmatched: {
    type: Boolean,
    default: false,
  },
  maaSettings: {
    type: Object,
    default: () => ({
      sort: false,
      autofill: false,
      skip: false,
    }),
  },
  maaRoomLabel: {
    type: String,
    default: "",
  },
  maaRoomIndex: {
    type: Number,
    default: 1,
  },
  maaRoomIndexOptions: {
    type: Array,
    default: () => [],
  },
  canPasteOperators: {
    type: Boolean,
    default: false,
  },
  canPasteShift: {
    type: Boolean,
    default: false,
  },
  showDebug: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "reset",
  "change-product",
  "update:operator-input",
  "add-operator",
  "select-operator",
  "remove-operator",
  "toggle-operator-skill-unlock",
  "reorder-operator",
  "update:maa-settings",
  "update:maa-room-index",
  "copy-operators",
  "paste-operators",
  "copy-shift",
  "paste-shift",
]);

const draggedOperatorIndex = ref(-1);

function updateOperatorInput(event) {
  emit("update:operator-input", event.target.value);
}

function changeProduct(product) {
  emit("change-product", product);
}

function addOperator() {
  emit("add-operator");
}

function removeOperator(operator) {
  emit("remove-operator", operator);
}

function selectOperator(operator) {
  emit("select-operator", operator);
}

function toggleOperatorSkillUnlock(operator, event) {
  emit("toggle-operator-skill-unlock", {
    operator,
    enabled: event.target.checked,
  });
}

function startOperatorDrag(event, index) {
  draggedOperatorIndex.value = index;
  event.dataTransfer?.setData("text/plain", String(index));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function endOperatorDrag() {
  draggedOperatorIndex.value = -1;
}

function dropOperator(event, targetIndex) {
  event.preventDefault();
  const sourceIndex = draggedOperatorIndex.value;
  draggedOperatorIndex.value = -1;
  if (
    !Number.isInteger(sourceIndex) ||
    sourceIndex < 0 ||
    sourceIndex === targetIndex
  ) {
    return;
  }

  emit("reorder-operator", {
    fromIndex: sourceIndex,
    toIndex: targetIndex,
  });
}

function toggleMaaSetting(field) {
  emit("update:maa-settings", {
    ...props.maaSettings,
    [field]: !props.maaSettings[field],
  });
}

function formatTraceValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${Number.isInteger(number) ? number : number.toFixed(1)}%`;
}

function formatTraceDetails(details) {
  if (!details) {
    return "";
  }
  return JSON.stringify(details, null, 2);
}
</script>

<template>
  <section class="schedule-room-editor-panel">
    <header>
      <div>
        <strong>{{ maaRoomLabel || room.label }}</strong>
        <div
          v-if="maaRoomIndexOptions.length"
          class="schedule-room-editor-maa-index"
        >
          <button
            v-for="option in maaRoomIndexOptions"
            :key="option"
            type="button"
            :class="{ active: option === maaRoomIndex }"
            :aria-pressed="option === maaRoomIndex"
            :title="`MAA 房间 ${option}`"
            @click="emit('update:maa-room-index', option)"
          >
            {{ option }}
          </button>
        </div>
        <span>{{ shiftName }}</span>
      </div>
      <button
        type="button"
        class="schedule-room-editor-reset"
        @click="emit('reset')"
      >
        <v-icon icon="mdi-restore" size="14"></v-icon>
        恢复自动安排
      </button>
    </header>

    <div
      v-if="productOptions.length"
      class="schedule-room-product-field"
    >
      <span>产物</span>
      <div class="schedule-room-product-options">
        <button
          v-for="option in productOptions"
          :key="option.value"
          type="button"
          :class="{ active: option.value === room.product }"
          :aria-pressed="option.value === room.product"
          @click="changeProduct(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="schedule-room-editor-maa-settings">
      <span>MAA</span>
      <button
        type="button"
        :class="{ active: maaSettings.sort }"
        :aria-pressed="maaSettings.sort"
        @click="toggleMaaSetting('sort')"
      >
        顺序进驻
      </button>
      <button
        type="button"
        :class="{ active: maaSettings.autofill }"
        :aria-pressed="maaSettings.autofill"
        @click="toggleMaaSetting('autofill')"
      >
        自动补满
      </button>
      <button
        type="button"
        :class="{ active: maaSettings.skip }"
        :aria-pressed="maaSettings.skip"
        @click="toggleMaaSetting('skip')"
      >
        跳过房间
      </button>
    </div>

    <div class="schedule-room-editor-clipboard">
      <button type="button" @click="emit('copy-operators')">复制本房</button>
      <button
        type="button"
        :disabled="!canPasteOperators"
        @click="emit('paste-operators')"
      >
        粘贴本房
      </button>
      <button type="button" @click="emit('copy-shift')">复制本班</button>
      <button
        type="button"
        :disabled="!canPasteShift"
        @click="emit('paste-shift')"
      >
        粘贴本班
      </button>
    </div>

    <div class="schedule-room-editor-operators">
      <span v-if="operators.length === 0">暂未指定干员</span>
      <div
        v-for="(operator, index) in operators"
        :key="operator.charId || operator.name"
        class="schedule-room-editor-operator"
        :class="{ dragging: draggedOperatorIndex === index }"
        draggable="true"
        :title="
          getOperatorSkillTooltip
            ? getOperatorSkillTooltip(operator)
            : '暂无已解锁基建技能'
        "
        @dragstart="startOperatorDrag($event, index)"
        @dragover.prevent
        @drop="dropOperator($event, index)"
        @dragend="endOperatorDrag"
        @click="removeOperator(operator)"
      >
        <OperatorAvatar
          v-if="operator.known"
          :char-id="operator.charId"
          :rarity="operator.rarity"
          :size="34"
          :mobile-size="32"
          border
        ></OperatorAvatar>
        <span v-else class="schedule-room-editor-manual-name">
          {{ operator.name }}
        </span>
        <label
          v-if="operator.isUnowned"
          class="schedule-room-editor-skill-toggle"
          title="关闭按 E0 计算，开启视为基建技能已解锁"
          @click.stop
        >
          <span>技能</span>
          <input
            type="checkbox"
            :checked="operator.assumeRiicSkillUnlocked === true"
            @change.stop="toggleOperatorSkillUnlock(operator, $event)"
          />
          <span class="schedule-room-editor-skill-slider"></span>
        </label>
        <button
          type="button"
          class="schedule-room-editor-operator-remove"
          title="移除干员"
          @click.stop="removeOperator(operator)"
        >
          <v-icon icon="mdi-close" size="13"></v-icon>
        </button>
      </div>
    </div>

    <details
      v-if="showDebug && room.efficiencyMetrics?.actual?.breakdown?.calculationTrace"
      class="schedule-room-editor-debug"
    >
      <summary>
        计算过程
        <span>
          {{
            formatTraceValue(
              room.efficiencyMetrics.actual.breakdown.calculationTrace
                .finalValue,
            )
          }}
        </span>
      </summary>
      <p class="schedule-room-editor-debug-note">
        {{
          room.efficiencyMetrics.actual.breakdown.calculationTrace.mode ===
          "additive"
            ? "以下项目按房间最终结算顺序列出。"
            : "该房间使用特殊计算，核心结果与叠加项不能简单重复相加。"
        }}
      </p>
      <div class="schedule-room-editor-debug-steps">
        <article
          v-for="step in room.efficiencyMetrics.actual.breakdown
            .calculationTrace.steps"
          :key="step.key"
          class="schedule-room-editor-debug-step"
          :class="`kind-${step.kind}`"
        >
          <div>
            <strong>{{ step.label }}</strong>
            <span v-if="step.value !== undefined">
              {{
                step.kind === "add" ? "+" : ""
              }}{{ formatTraceValue(step.value) }}
            </span>
          </div>
          <pre v-if="step.details">{{ formatTraceDetails(step.details) }}</pre>
        </article>
      </div>
    </details>

    <div class="schedule-room-editor-add">
      <input
        :value="operatorInput"
        placeholder="输入干员名、拼音或代号"
        @input="updateOperatorInput"
        @keydown.enter.prevent="addOperator"
      />
      <button
        type="button"
        :disabled="!operatorInput.trim()"
        @click="addOperator"
      >
        添加
      </button>
    </div>
    <div
      v-if="operatorInput.trim() && operatorMatches.length"
      class="schedule-room-editor-matches"
    >
      <button
        v-for="operator in operatorMatches"
        :key="operator.charId || operator.name"
        type="button"
        @mousedown.prevent
        @click="selectOperator(operator)"
      >
        <OperatorAvatar
          :char-id="operator.charId"
          :rarity="operator.rarity || 1"
          :size="24"
          :mobile-size="24"
          border
        ></OperatorAvatar>
        <span>{{ operator.name }}</span>
      </button>
    </div>
    <p v-if="inputUnmatched" class="schedule-room-editor-input-warning">
      未在当前干员数据库中匹配到，可能是数据库尚未更新；仍可按输入名称加入。
    </p>
  </section>
</template>

<style scoped>
.schedule-room-editor-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 10px;
  padding: 14px;
  border: 1px solid
    color-mix(in srgb, var(--riic-blue) 38%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-blue) 4%,
    var(--c-page-background-color)
  );
}

.schedule-room-editor-panel > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 5px 16px;
}

.schedule-room-editor-panel > header > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.schedule-room-editor-panel strong {
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.4;
}

.schedule-room-editor-panel span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.schedule-room-editor-reset,
.schedule-room-editor-add button,
.schedule-room-editor-maa-settings button,
.schedule-room-editor-maa-index button,
.schedule-room-editor-clipboard button,
.schedule-room-product-options button,
.schedule-room-editor-matches button {
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
  cursor: pointer;
}

.schedule-room-editor-reset:hover,
.schedule-room-editor-add button:hover:not(:disabled),
.schedule-room-editor-maa-settings button:hover,
.schedule-room-editor-maa-index button:hover,
.schedule-room-editor-clipboard button:hover:not(:disabled),
.schedule-room-product-options button:hover,
.schedule-room-editor-matches button:hover {
  border-color: color-mix(in srgb, var(--riic-blue) 48%, var(--c-border-color));
  color: var(--riic-blue);
}

.schedule-room-editor-add button:disabled {
  cursor: default;
  opacity: 0.45;
}

.schedule-room-editor-maa-settings,
.schedule-room-editor-maa-index,
.schedule-room-editor-clipboard {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-room-editor-maa-settings > span {
  margin-right: 2px;
  color: var(--c-text-color);
  font-size: 12px;
  font-weight: 700;
}

.schedule-room-editor-maa-index {
  gap: 3px;
}

.schedule-room-editor-maa-index button {
  min-width: 26px;
  padding-inline: 6px;
}

.schedule-room-editor-maa-settings button.active {
  border-color: color-mix(in srgb, var(--riic-green) 48%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--riic-green) 12%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font-weight: 700;
}

.schedule-room-editor-maa-index button.active {
  border-color: color-mix(in srgb, var(--riic-blue) 52%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--riic-blue) 14%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  font-weight: 700;
}

.schedule-room-product-field,
.schedule-room-editor-add {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.schedule-room-product-field > span {
  flex: 0 0 auto;
  color: var(--c-text-color);
  font-weight: 700;
  white-space: nowrap;
}

.schedule-room-editor-add input {
  min-width: 0;
  min-height: 30px;
  padding: 4px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
}

.schedule-room-editor-add input {
  flex: 1 1 150px;
}

.schedule-room-product-options {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
}

.schedule-room-product-options button {
  border: 0;
  border-left: 1px solid var(--c-border-color);
  border-radius: 0;
}

.schedule-room-product-options button:first-child {
  border-left: 0;
}

.schedule-room-product-options button.active {
  background: color-mix(
    in srgb,
    var(--riic-blue) 13%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  font-weight: 700;
}

.schedule-room-editor-operators {
  display: flex;
  align-items: center;
  min-height: 36px;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-room-editor-debug {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid
    color-mix(in srgb, var(--riic-blue) 38%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-blue) 5%,
    var(--c-page-background-color)
  );
}

.schedule-room-editor-debug summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--riic-blue);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.schedule-room-editor-debug summary span {
  color: var(--c-text-color);
  font-variant-numeric: tabular-nums;
}

.schedule-room-editor-debug-note {
  margin: 0;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
}

.schedule-room-editor-debug-steps {
  display: grid;
  gap: 5px;
}

.schedule-room-editor-debug-step {
  padding: 6px 7px;
  border-left: 2px solid var(--c-border-color);
  background: color-mix(
    in srgb,
    var(--c-page-background-color) 82%,
    var(--riic-blue)
  );
}

.schedule-room-editor-debug-step.kind-base {
  border-left-color: var(--riic-orange);
}

.schedule-room-editor-debug-step.kind-add {
  border-left-color: var(--riic-green);
}

.schedule-room-editor-debug-step.kind-result {
  border-left-color: var(--riic-blue);
}

.schedule-room-editor-debug-step > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.schedule-room-editor-debug-step > div span {
  color: var(--riic-blue);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.schedule-room-editor-debug-step pre {
  max-height: 180px;
  margin: 5px 0 0;
  overflow: auto;
  color: var(--riic-muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.schedule-room-editor-operator {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  cursor: grab;
}

.schedule-room-editor-operator.dragging {
  cursor: grabbing;
  opacity: 0.45;
}

.schedule-room-editor-manual-name {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 80px;
  min-width: 34px;
  min-height: 34px;
  padding: 0 5px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  color: var(--riic-blue);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-room-editor-operator-remove {
  position: absolute;
  top: -3px;
  right: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--riic-red);
  color: #fff;
  cursor: pointer;
}

.schedule-room-editor-skill-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 28px;
  padding: 2px 4px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.schedule-room-editor-skill-toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.schedule-room-editor-skill-slider {
  position: relative;
  display: inline-block;
  width: 24px;
  height: 13px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--riic-muted) 45%, var(--c-border-color));
  transition: background 0.15s ease;
}

.schedule-room-editor-skill-slider::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  content: "";
  transition: transform 0.15s ease;
}

.schedule-room-editor-skill-toggle input:checked + .schedule-room-editor-skill-slider {
  background: var(--riic-green);
}

.schedule-room-editor-skill-toggle input:checked + .schedule-room-editor-skill-slider::after {
  transform: translateX(11px);
}

.schedule-room-editor-input-warning {
  margin: -4px 0 0;
  color: var(--riic-orange);
  font-size: 12px;
  line-height: 1.45;
}

.schedule-room-editor-matches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 5px;
  margin-top: -5px;
}

.schedule-room-editor-matches button {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
  overflow: hidden;
  text-align: left;
}

.schedule-room-editor-matches span {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
