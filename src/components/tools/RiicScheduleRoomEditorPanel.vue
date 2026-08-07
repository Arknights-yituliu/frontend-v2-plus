<script setup>
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
  operatorOptions: {
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
});

const emit = defineEmits([
  "reset",
  "change-product",
  "update:operator-input",
  "add-operator",
  "remove-operator",
]);

function updateOperatorInput(event) {
  emit("update:operator-input", event.target.value);
}

function changeProduct(event) {
  emit("change-product", event.target.value);
}

function addOperator() {
  emit("add-operator");
}

function removeOperator(operator) {
  emit("remove-operator", operator);
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
        恢复自动安排
      </button>
    </header>

    <label
      v-if="productOptions.length"
      class="schedule-room-product-field"
    >
      <span>产物</span>
      <select :value="room.product" @change="changeProduct">
        <option
          v-for="option in productOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <div class="schedule-room-editor-operators">
      <span v-if="operators.length === 0">暂未指定干员</span>
      <button
        v-for="operator in operators"
        :key="operator.charId || operator.name"
        type="button"
        class="schedule-room-editor-operator"
        :title="`移除 ${operator.name}`"
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
        list="riic-schedule-room-operator-options"
        placeholder="输入干员名"
        @input="updateOperatorInput"
        @keydown.enter.prevent="addOperator"
      />
      <datalist id="riic-schedule-room-operator-options">
        <option
          v-for="operator in operatorOptions"
          :key="operator.charId"
          :value="operator.name"
        ></option>
      </datalist>
      <button
        type="button"
        :disabled="!operatorInput.trim()"
        @click="addOperator"
      >
        添加
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
.schedule-room-editor-add button {
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
.schedule-room-editor-add button:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--riic-blue) 48%, var(--c-border-color));
  color: var(--riic-blue);
}

.schedule-room-editor-add button:disabled {
  cursor: default;
  opacity: 0.45;
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

.schedule-room-product-field select,
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
  cursor: pointer;
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
</style>
