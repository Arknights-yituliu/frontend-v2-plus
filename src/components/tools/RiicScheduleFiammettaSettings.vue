<script setup>
import { computed, ref, watch } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const CUSTOM_TARGET_VALUE = "__custom__";

const props = defineProps({
  fiammetta: {
    type: Object,
    default: () => ({
      enable: false,
      target: "",
      order: "pre",
    }),
  },
  targetOptions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update"]);
const customTargetInput = ref("");
const customTargetEditing = ref(false);

const selectedTarget = computed(() => {
  const target = String(props.fiammetta?.target || "").trim();
  if (
    !target ||
    !props.targetOptions.some(
      (operator) => String(operator?.name || "").trim() === target,
    )
  ) {
    return CUSTOM_TARGET_VALUE;
  }

  return target;
});
const showCustomTargetInput = computed(
  () =>
    props.fiammetta?.enable === true &&
    (selectedTarget.value === CUSTOM_TARGET_VALUE || customTargetEditing.value),
);

watch(
  () => props.fiammetta?.target,
  (value) => {
    customTargetInput.value = String(value || "");
    if (
      String(value || "").trim() &&
      selectedTarget.value !== CUSTOM_TARGET_VALUE
    ) {
      customTargetEditing.value = false;
    }
  },
  { immediate: true },
);

function update(patch) {
  emit("update", {
    enable: props.fiammetta?.enable === true,
    target: String(props.fiammetta?.target || ""),
    order: props.fiammetta?.order === "post" ? "post" : "pre",
    ...patch,
  });
}

function updateTarget(event) {
  const value = String(event.target.value || "");
  if (value === CUSTOM_TARGET_VALUE) {
    customTargetEditing.value = true;
    return;
  }

  customTargetEditing.value = false;
  update({ target: value });
}

function updateCustomTargetInput(event) {
  customTargetInput.value = event.target.value;
}

function confirmCustomTarget() {
  update({ target: customTargetInput.value.trim() });
  customTargetEditing.value = false;
}
</script>

<template>
  <section class="schedule-fiammetta-settings">
    <div class="schedule-fiammetta-main">
      <OperatorAvatar
        class="schedule-fiammetta-avatar"
        char-id="char_300_phenxi"
        :size="42"
        :mobile-size="42"
        :border="true"
      ></OperatorAvatar>
      <span class="schedule-fiammetta-question">要我替你休息吗？</span>
      <div class="schedule-fiammetta-choice">
        <button
          type="button"
          :class="{ active: !fiammetta.enable }"
          :aria-pressed="!fiammetta.enable"
          @click="update({ enable: false })"
        >
          不要
        </button>
        <button
          type="button"
          :class="{ active: fiammetta.enable }"
          :aria-pressed="fiammetta.enable"
          @click="update({ enable: true })"
        >
          要
        </button>
      </div>
    </div>
    <div v-if="fiammetta.enable" class="schedule-fiammetta-details">
      <div class="schedule-fiammetta-order">
        <button
          type="button"
          :class="{ active: fiammetta.order !== 'post' }"
          @click="update({ order: 'pre' })"
        >
          换班前
        </button>
        <button
          type="button"
          :class="{ active: fiammetta.order === 'post' }"
          @click="update({ order: 'post' })"
        >
          换班后
        </button>
      </div>
      <select
        :value="selectedTarget"
        @change="updateTarget"
      >
        <option :value="CUSTOM_TARGET_VALUE">选择恢复目标</option>
        <option
          v-for="operator in targetOptions"
          :key="operator.charId || operator.name"
          :value="operator.name"
        >
          {{ operator.name }}
        </option>
      </select>
      <div
        v-if="showCustomTargetInput"
        class="schedule-fiammetta-custom-target"
      >
        <input
          :value="customTargetInput"
          type="text"
          autocomplete="off"
          placeholder="输入恢复目标"
          @input="updateCustomTargetInput"
          @keydown.enter.prevent="confirmCustomTarget"
        />
        <button type="button" @click="confirmCustomTarget">确定</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.schedule-fiammetta-settings {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
}

.schedule-fiammetta-main,
.schedule-fiammetta-details {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.schedule-fiammetta-question {
  min-width: 0;
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.35;
}

.schedule-fiammetta-choice,
.schedule-fiammetta-order {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
}

.schedule-fiammetta-choice button,
.schedule-fiammetta-order button {
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-left: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
}

.schedule-fiammetta-choice button:first-child,
.schedule-fiammetta-order button:first-child {
  border-left: 0;
}

.schedule-fiammetta-choice button.active,
.schedule-fiammetta-order button.active {
  border-color: color-mix(in srgb, var(--riic-green) 48%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--riic-green) 12%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font-weight: 700;
}

.schedule-fiammetta-choice button.active + button,
.schedule-fiammetta-order button.active + button {
  border-left-color: color-mix(
    in srgb,
    var(--riic-green) 48%,
    var(--c-border-color)
  );
}

.schedule-fiammetta-details {
  flex: 0 1 auto;
}

.schedule-fiammetta-settings select,
.schedule-fiammetta-custom-target input,
.schedule-fiammetta-custom-target button {
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

.schedule-fiammetta-custom-target {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}

.schedule-fiammetta-custom-target input {
  width: 148px;
}

.schedule-fiammetta-custom-target button {
  min-width: auto;
  cursor: pointer;
}

@media (max-width: 620px) {
  .schedule-fiammetta-main,
  .schedule-fiammetta-details {
    flex-wrap: wrap;
  }
}
</style>
