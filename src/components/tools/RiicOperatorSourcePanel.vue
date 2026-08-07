<script setup>
import { ref } from "vue";

const props = defineProps({
  sklandOperatorSourceStatus: {
    type: Object,
    default: () => ({}),
  },
  customOperatorSourceStatuses: {
    type: Array,
    default: () => [],
  },
  operatorSourceStates: {
    type: Object,
    default: () => ({}),
  },
  customSourceImportPanelOpen: {
    type: Boolean,
    default: false,
  },
  customSourceImportType: {
    type: String,
    default: "",
  },
  customSourceImporting: {
    type: Boolean,
    default: false,
  },
  yituliuToken: {
    type: String,
    default: "",
  },
  maxCustomSources: {
    type: Number,
    default: 3,
  },
});

const emit = defineEmits([
  "open-skland",
  "select-source",
  "open-import-panel",
  "select-import-type",
  "import-maa",
  "import-yituliu",
  "delete-source",
  "update:yituliu-token",
]);

const maaFileInput = ref(null);

function handleSklandClick() {
  if (props.sklandOperatorSourceStatus.available) {
    emit("select-source", "skland");
    return;
  }

  emit("open-skland");
}

function openMaaUpload() {
  emit("select-import-type", "maa");
  maaFileInput.value?.click();
}

function handleMaaFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) {
    emit("import-maa", file);
  }
}

function updateYituliuToken(event) {
  emit("update:yituliu-token", event.target.value);
}
</script>

<template>
  <section class="operator-data-section">
    <input
      ref="maaFileInput"
      class="operator-source-file-input"
      type="file"
      accept=".json,application/json"
      @change="handleMaaFileChange"
    />
    <header class="schedule-generation-section-heading">
      <strong>选择干员数据源</strong>
    </header>

    <div class="operator-source-choice-grid">
      <div class="operator-source-choice">
        <button
          type="button"
          class="sync-source-action"
          :class="{ active: sklandOperatorSourceStatus.active }"
          :aria-pressed="sklandOperatorSourceStatus.active"
          :disabled="operatorSourceStates.skland?.loading"
          @click="handleSklandClick"
        >
          <span class="operator-source-action-head">
            <v-icon icon="mdi-cloud-sync-outline" size="22"></v-icon>
            <v-icon
              v-if="sklandOperatorSourceStatus.active"
              class="operator-source-selected-mark"
              icon="mdi-check-circle"
              size="36"
            ></v-icon>
          </span>
          <span>{{ sklandOperatorSourceStatus.title }}</span>
          <small>{{ sklandOperatorSourceStatus.detail }}</small>
        </button>
        <button
          v-if="sklandOperatorSourceStatus.available"
          type="button"
          class="operator-source-text-action"
          :disabled="operatorSourceStates.skland?.loading"
          @click="emit('open-skland')"
        >
          重新同步
        </button>
      </div>

      <div
        v-for="item in customOperatorSourceStatuses"
        :key="item.source.id"
        class="operator-source-choice custom-operator-source-choice"
      >
        <button
          type="button"
          class="sync-source-action"
          :class="{ active: item.status.active }"
          :aria-pressed="item.status.active"
          :disabled="operatorSourceStates[item.source.id]?.loading"
          @click="emit('select-source', item.source.id)"
        >
          <span class="operator-source-action-head">
            <v-icon
              :icon="
                item.source.type === 'maa'
                  ? 'mdi-robot-outline'
                  : 'mdi-cloud-download-outline'
              "
              size="22"
            ></v-icon>
            <v-icon
              v-if="item.status.active"
              class="operator-source-selected-mark"
              icon="mdi-check-circle"
              size="36"
            ></v-icon>
          </span>
          <span>{{ item.status.title }}</span>
          <small>{{ item.status.detail }}</small>
        </button>
        <div class="operator-source-choice-actions">
          <button
            type="button"
            class="operator-source-text-action"
            @click="emit('select-source', item.source.id)"
          >
            使用
          </button>
          <button
            type="button"
            class="operator-source-text-action danger"
            @click="emit('delete-source', item.source.id)"
          >
            删除
          </button>
        </div>
      </div>

      <button
        v-if="customOperatorSourceStatuses.length < maxCustomSources"
        type="button"
        class="operator-source-add-card"
        @click="emit('open-import-panel')"
      >
        <v-icon icon="mdi-plus" size="28"></v-icon>
        <span>添加数据源</span>
        <small>{{ customOperatorSourceStatuses.length }} / {{ maxCustomSources }}</small>
      </button>
    </div>

    <div
      v-if="customSourceImportPanelOpen"
      class="custom-source-import-panel"
    >
      <div class="custom-source-import-options">
        <button
          type="button"
          class="custom-source-import-option"
          :class="{ active: customSourceImportType === 'maa' }"
          @click="openMaaUpload"
        >
          <v-icon icon="mdi-robot-outline" size="19"></v-icon>
          <span>导入 MAA JSON</span>
        </button>
        <button
          type="button"
          class="custom-source-import-option"
          :class="{ active: customSourceImportType === 'yituliu' }"
          @click="emit('select-import-type', 'yituliu')"
        >
          <v-icon icon="mdi-cloud-download-outline" size="19"></v-icon>
          <span>一图流 Token</span>
        </button>
      </div>

      <div
        v-if="customSourceImportType === 'yituliu'"
        class="yituliu-token-import"
      >
        <input
          :value="yituliuToken"
          type="text"
          autocomplete="off"
          placeholder="粘贴一图流 Token"
          :disabled="customSourceImporting"
          @input="updateYituliuToken"
        />
        <button
          type="button"
          class="secondary-action"
          :disabled="customSourceImporting"
          @click="emit('import-yituliu')"
        >
          {{ customSourceImporting ? "读取中" : "导入" }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.operator-data-section {
  margin-top: 16px;
}

.schedule-generation-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.schedule-generation-section-heading > strong {
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.operator-source-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.operator-source-choice {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.operator-source-choice-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.operator-source-file-input {
  display: none;
}

.sync-source-action {
  display: flex;
  align-items: flex-start;
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 78px;
  padding: 10px 58px 10px 11px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.operator-source-action-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sync-source-action > .operator-source-action-head > .v-icon:first-child {
  color: var(--riic-blue);
}

.operator-source-selected-mark {
  position: absolute;
  top: 50%;
  right: 12px;
  color: var(--riic-green);
  transform: translateY(-50%);
}

.sync-source-action span {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.sync-source-action small {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.sync-source-action.active {
  background: color-mix(
    in srgb,
    var(--riic-blue) 14%,
    var(--c-page-background-color-secondary)
  );
  box-shadow: inset 3px 0 0 var(--riic-blue);
}

.sync-source-action:disabled {
  cursor: wait;
  opacity: 0.65;
}

.operator-source-text-action {
  align-self: center;
  min-height: 24px;
  padding: 2px 6px;
  border: 0;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.operator-source-text-action:hover {
  text-decoration: underline;
}

.operator-source-text-action:disabled {
  cursor: wait;
  opacity: 0.65;
}

.operator-source-text-action.danger {
  color: var(--riic-red);
}

.operator-source-add-card {
  display: flex;
  min-width: 0;
  min-height: 78px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-direction: column;
  padding: 10px;
  border: 1px dashed color-mix(
    in srgb,
    var(--riic-muted) 70%,
    var(--c-border-color)
  );
  border-radius: 8px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  cursor: pointer;
}

.operator-source-add-card:hover {
  border-color: var(--riic-blue);
  color: var(--riic-blue);
  background: color-mix(
    in srgb,
    var(--riic-blue) 5%,
    var(--c-page-background-color-secondary)
  );
}

.operator-source-add-card span {
  font-size: 13px;
  font-weight: 700;
}

.operator-source-add-card small {
  font-size: 11px;
}

.custom-source-import-panel {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 8px;
  background: var(--c-page-background-color-secondary);
}

.custom-source-import-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.custom-source-import-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 5px;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.custom-source-import-option.active,
.custom-source-import-option:hover {
  border-color: var(--riic-blue);
  color: var(--riic-blue);
  background: color-mix(
    in srgb,
    var(--riic-blue) 7%,
    var(--c-page-background-color)
  );
}

.yituliu-token-import {
  display: flex;
  align-items: center;
  gap: 8px;
}

.yituliu-token-import input {
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding: 5px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
}

.sync-source-action:hover {
  background: color-mix(
    in srgb,
    var(--riic-blue) 7%,
    var(--c-page-background-color-secondary)
  );
}

@media (max-width: 900px) {
  .operator-source-choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
