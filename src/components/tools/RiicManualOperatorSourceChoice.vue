<script setup>
const props = defineProps({
  status: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["open-editor", "select-source"]);

function handleClick() {
  if (props.status.available) {
    emit("select-source");
    return;
  }

  emit("open-editor");
}
</script>

<template>
  <div class="manual-operator-source-choice">
    <button
      type="button"
      class="manual-source-action"
      :class="{ active: status.active }"
      :aria-pressed="status.active"
      :disabled="loading"
      @click="handleClick"
    >
      <span class="manual-source-action-head">
        <v-icon icon="mdi-account-edit-outline" size="22"></v-icon>
        <small v-if="status.active" class="manual-source-current-tag">
          当前数据源
        </small>
      </span>
      <span>{{ status.title }}</span>
      <small>{{ status.detail }}</small>
    </button>
    <button
      type="button"
      class="manual-source-text-action"
      :disabled="loading"
      @click.stop="emit('open-editor')"
    >
      编辑
    </button>
  </div>
</template>

<style scoped>
.manual-operator-source-choice {
  position: relative;
  grid-column: span 3;
  min-width: 0;
}

.manual-source-action {
  display: flex;
  position: relative;
  width: 100%;
  min-width: 0;
  height: 112px;
  padding: 10px 11px 34px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.manual-source-action-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.manual-source-action > .manual-source-action-head > .v-icon:first-child {
  color: var(--riic-blue);
}

.manual-source-current-tag {
  color: var(--riic-green) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
}

.manual-source-action span {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.manual-source-action > span:not(.manual-source-action-head) {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-source-action small {
  display: block;
  width: 100%;
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-source-action.active {
  background: color-mix(
    in srgb,
    var(--riic-blue) 14%,
    var(--c-page-background-color-secondary)
  );
  box-shadow: inset 3px 0 0 var(--riic-blue);
}

.manual-source-action:hover {
  background: color-mix(
    in srgb,
    var(--riic-blue) 7%,
    var(--c-page-background-color-secondary)
  );
}

.manual-source-action:disabled,
.manual-source-text-action:disabled {
  cursor: wait;
  opacity: 0.65;
}

.manual-source-text-action {
  position: absolute;
  right: 8px;
  bottom: 7px;
  min-height: 24px;
  padding: 2px 6px;
  border: 0;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.manual-source-text-action:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .manual-operator-source-choice {
    grid-column: span 2;
  }
}

@media (max-width: 560px) {
  .manual-operator-source-choice {
    grid-column: span 1;
  }
}
</style>
