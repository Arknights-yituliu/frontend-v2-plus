<script setup>
import { computed, ref, watch } from "vue";
import { findRiicOperatorSearchMatches } from "/src/utils/riicOperatorSearch.js";

const CUSTOM_TARGET_VALUE = "__custom__";
const DISABLED_TARGET_VALUE = "__disabled__";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      target: "但书",
      custom: false,
      customTarget: "",
    }),
  },
  hasFiammetta: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  targetOptions: {
    type: Array,
    default: () => [],
  },
  customTargetOptions: {
    type: Array,
    default: () => [],
  },
  status: {
    type: Object,
    default: () => ({
      tone: "muted",
      text: "",
    }),
  },
});

const emit = defineEmits(["update:modelValue"]);

const selectedTarget = computed(() => {
  if (props.modelValue?.custom) {
    return CUSTOM_TARGET_VALUE;
  }

  return String(props.modelValue?.target ?? "") || DISABLED_TARGET_VALUE;
});
const customTargetInput = ref(String(props.modelValue?.customTarget || ""));
const customTargetInputFocused = ref(false);
const customTargetMatches = computed(() =>
  findRiicOperatorSearchMatches(
    props.customTargetOptions,
    customTargetInput.value,
  ),
);

watch(
  () => props.modelValue?.customTarget,
  (value) => {
    customTargetInput.value = String(value || "");
  },
);

function update(patch) {
  emit("update:modelValue", {
    target: String(props.modelValue?.target ?? ""),
    custom: props.modelValue?.custom === true,
    customTarget: String(props.modelValue?.customTarget || ""),
    ...patch,
  });
}

function updateTarget(event) {
  const value = String(event.target.value || "");
  if (value === DISABLED_TARGET_VALUE) {
    customTargetInput.value = "";
    update({
      target: "",
      custom: false,
      customTarget: "",
    });
    return;
  }

  if (value === CUSTOM_TARGET_VALUE) {
    update({ custom: true });
    return;
  }

  update({
    target: value,
    custom: false,
    customTarget: "",
  });
}

function updateCustomTargetInput(event) {
  customTargetInput.value = event.target.value;
}

function selectCustomTarget(operator) {
  const name = String(operator?.name || "").trim();
  if (!name) {
    return;
  }

  customTargetInput.value = name;
  customTargetInputFocused.value = false;
  update({
    custom: true,
    customTarget: name,
  });
}

function confirmCustomTarget() {
  update({
    custom: true,
    customTarget: customTargetInput.value.trim(),
  });
  customTargetInputFocused.value = false;
}
</script>

<template>
  <section
    class="fiammetta-recovery-setting"
    :class="{ compact }"
  >
    <label>
      <span>菲亚梅塔使用对象：</span>
      <select
        :value="selectedTarget"
        :disabled="!hasFiammetta"
        @change="updateTarget"
      >
        <option :value="DISABLED_TARGET_VALUE">不使用菲亚梅塔</option>
        <option
          v-for="operator in targetOptions"
          :key="operator.charId || operator.name"
          :value="operator.name"
        >
          {{ operator.name }}
        </option>
        <option :value="CUSTOM_TARGET_VALUE">自定义…</option>
      </select>
    </label>
    <input
      v-if="modelValue?.custom"
      :value="customTargetInput"
      type="text"
      autocomplete="off"
      placeholder="输入干员名、拼音或代号"
      :disabled="!hasFiammetta"
      @focus="customTargetInputFocused = true"
      @input="updateCustomTargetInput"
      @keydown.enter.prevent="confirmCustomTarget"
    />
    <button
      v-if="modelValue?.custom"
      type="button"
      :disabled="!hasFiammetta"
      @click="confirmCustomTarget"
    >
      确定
    </button>
    <div
      v-if="
        modelValue?.custom &&
        customTargetInputFocused &&
        customTargetMatches.length
      "
      class="fiammetta-recovery-matches"
    >
      <button
        v-for="operator in customTargetMatches"
        :key="operator.charId || operator.name"
        type="button"
        @mousedown.prevent="selectCustomTarget(operator)"
      >
        <span>{{ operator.name }}</span>
        <small v-if="operator.charId">{{ operator.charId }}</small>
      </button>
    </div>
    <p
      v-if="status?.text"
      class="fiammetta-recovery-status"
      :class="`tone-${status.tone || 'muted'}`"
    >
      {{ status.text }}
    </p>
  </section>
</template>

<style scoped>
.fiammetta-recovery-setting {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
}

.fiammetta-recovery-setting.compact {
  margin-top: 0;
}

.fiammetta-recovery-setting label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.35;
}

.fiammetta-recovery-setting select,
.fiammetta-recovery-setting input,
.fiammetta-recovery-setting button {
  min-width: 148px;
  min-height: 30px;
  padding: 4px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
}

.fiammetta-recovery-setting button {
  min-width: auto;
  cursor: pointer;
}

.fiammetta-recovery-matches {
  display: grid;
  flex: 1 1 100%;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 4px;
}

.fiammetta-recovery-matches button {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  min-width: 0;
  gap: 8px;
  text-align: left;
}

.fiammetta-recovery-matches span,
.fiammetta-recovery-matches small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fiammetta-recovery-matches small {
  color: var(--riic-muted);
  font-size: 10px;
}

.fiammetta-recovery-status {
  flex: 1 1 100%;
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.fiammetta-recovery-status.tone-success {
  color: var(--riic-green);
}

.fiammetta-recovery-status.tone-warning {
  color: var(--riic-orange);
}

.fiammetta-recovery-status.tone-muted {
  color: var(--riic-muted);
}

.fiammetta-recovery-setting select:disabled,
.fiammetta-recovery-setting input:disabled,
.fiammetta-recovery-setting button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 560px) {
  .fiammetta-recovery-setting label {
    flex-wrap: wrap;
  }

  .fiammetta-recovery-setting select,
  .fiammetta-recovery-setting input {
    flex: 1 1 100%;
  }
}
</style>
