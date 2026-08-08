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
  yituliuSourceLabel: {
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
  "update:yituliu-source-label",
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

function updateYituliuSourceLabel(event) {
  emit("update:yituliu-source-label", event.target.value);
}

function confirmDeleteSource(source) {
  const label = getCustomSourceTitle(source);
  if (window.confirm(`确认删除数据源“${label}”吗？`)) {
    emit("delete-source", source.id);
  }
}

function formatImportedAtLabel(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return "一图流数据";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
}

function getCustomSourceTitle(source) {
  if (source.type === "maa") {
    return source.fileName || source.label || "MAA 数据";
  }

  if (source.label && source.label !== "一图流数据") {
    return source.label;
  }

  return formatImportedAtLabel(source.importedAt);
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
      <div class="operator-source-choice skland-operator-source-choice">
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
            <small
              v-if="sklandOperatorSourceStatus.active"
              class="operator-source-current-tag"
            >
              当前数据源
            </small>
          </span>
          <span>{{ sklandOperatorSourceStatus.title }}</span>
          <small>{{ sklandOperatorSourceStatus.detail }}</small>
        </button>
        <button
          v-if="sklandOperatorSourceStatus.available"
          type="button"
          class="operator-source-text-action"
          :disabled="operatorSourceStates.skland?.loading"
          @click.stop="emit('open-skland')"
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
            <small
              v-if="item.status.active"
              class="operator-source-current-tag"
            >
              当前数据源
            </small>
          </span>
          <span>{{ getCustomSourceTitle(item.source) }}</span>
          <small>{{ item.status.detail }}</small>
        </button>
        <button
          v-if="item.status.active"
          type="button"
          class="operator-source-text-action danger"
          @click.stop="confirmDeleteSource(item.source)"
        >
          删除
        </button>
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
        <input
          :value="yituliuSourceLabel"
          type="text"
          autocomplete="off"
          placeholder="数据源名称（可选）"
          :disabled="customSourceImporting"
          @input="updateYituliuSourceLabel"
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.operator-source-choice,
.operator-source-add-card {
  grid-column: span 1;
  min-width: 0;
}

.operator-source-choice {
  position: relative;
}

.skland-operator-source-choice {
  grid-column: span 3;
}

.operator-source-file-input {
  display: none;
}

.sync-source-action {
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

.operator-source-action-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sync-source-action > .operator-source-action-head > .v-icon:first-child {
  color: var(--riic-blue);
}

.operator-source-current-tag {
  color: var(--riic-green) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
}

.sync-source-action span {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.sync-source-action > span:not(.operator-source-action-head) {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-source-action small {
  display: block;
  width: 100%;
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.custom-operator-source-choice > .operator-source-text-action {
  right: auto;
  left: 8px;
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
  height: 112px;
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

.yituliu-token-import input:first-child {
  flex: 1.5;
}

.yituliu-token-import input:nth-child(2) {
  flex: 1;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .skland-operator-source-choice {
    grid-column: span 2;
  }
}

@media (max-width: 560px) {
  .operator-source-choice-grid {
    grid-template-columns: 1fr;
  }

  .skland-operator-source-choice,
  .operator-source-choice,
  .operator-source-add-card {
    grid-column: span 1;
  }

  .yituliu-token-import {
    flex-wrap: wrap;
  }

  .yituliu-token-import input {
    flex: 1 1 100% !important;
  }
}
</style>
