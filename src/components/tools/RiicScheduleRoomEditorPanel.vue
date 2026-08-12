<script setup>
import { ref } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

defineProps({
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
  canPasteOperators: {
    type: Boolean,
    default: false,
  },
  canPasteShift: {
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
  "reorder-operator",
  "update:maa-settings",
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
</script>

<template>
  <section class="schedule-room-editor-panel">
    <header>
      <div>
        <strong>{{ room.label }}</strong>
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
      <button
        v-for="(operator, index) in operators"
        :key="operator.charId || operator.name"
        type="button"
        class="schedule-room-editor-operator"
        :class="{ dragging: draggedOperatorIndex === index }"
        draggable="true"
        :title="`移除 ${operator.name}`"
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
        <v-icon icon="mdi-close" size="13"></v-icon>
      </button>
    </div>

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

.schedule-room-editor-operator {
  position: relative;
  display: inline-flex;
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

.schedule-room-editor-operator :deep(.v-icon) {
  position: absolute;
  top: -3px;
  right: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--riic-red);
  color: #fff;
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
