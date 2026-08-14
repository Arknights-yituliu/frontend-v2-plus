<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  exportInfo: {
    type: Object,
    default: () => ({
      title: "",
      author: "",
      description: "",
    }),
  },
  defaultTitle: {
    type: String,
    default: "",
  },
  shifts: {
    type: Array,
    default: () => [],
  },
  orundumCraftMaterial: {
    type: String,
    default: "orirock",
  },
});

const exportSettingsOpen = ref(false);
const displayShifts = computed(() =>
  props.shifts
    .map((shift, index) => ({ shift, index }))
    .sort((left, right) =>
      String(left.shift?.name || "").localeCompare(
        String(right.shift?.name || ""),
        "zh-CN",
      ),
    ),
);

const emit = defineEmits([
  "update:export-info",
  "update:orundum-craft-material",
  "update:shift",
]);

function updateExportInfo(field, event) {
  emit("update:export-info", {
    ...props.exportInfo,
    [field]: event.target.value,
  });
}

function updateShift(index, field, event) {
  emit("update:shift", {
    index,
    [field]: event.target.value,
  });
}

function updateOrundumCraftMaterial(value) {
  emit("update:orundum-craft-material", value);
}
</script>

<template>
  <div class="schedule-export-settings">
    <button
      type="button"
      class="schedule-output-export-settings"
      :class="{ active: exportSettingsOpen }"
      title="乱七八糟的设置"
      aria-label="乱七八糟的设置"
      :aria-expanded="exportSettingsOpen"
      @click="exportSettingsOpen = !exportSettingsOpen"
    >
      <v-icon icon="mdi-cog-outline" size="17"></v-icon>
      乱七八糟的设置
    </button>

    <section v-if="exportSettingsOpen" class="schedule-export-settings-panel">
      <section class="schedule-export-module schedule-export-metadata-module">
        <header class="schedule-export-module-heading">
          <strong>基本信息</strong>
        </header>
        <div class="schedule-export-metadata-fields">
          <label>
            <span>标题</span>
            <input
              :value="exportInfo.title"
              :placeholder="defaultTitle"
              @input="updateExportInfo('title', $event)"
            />
          </label>
          <label>
            <span>作者</span>
            <input
              :value="exportInfo.author"
              @input="updateExportInfo('author', $event)"
            />
          </label>
          <label class="schedule-export-description-field">
            <span>排班说明</span>
            <input
              :value="exportInfo.description"
              @input="updateExportInfo('description', $event)"
            />
          </label>
        </div>
      </section>

      <section class="schedule-export-module schedule-export-orundum-module">
        <header class="schedule-export-module-heading">
          <strong>搓玉原料</strong>
        </header>
        <div class="schedule-export-orundum-options">
          <button
            type="button"
            :class="{ active: orundumCraftMaterial === 'orirock' }"
            @click="updateOrundumCraftMaterial('orirock')"
          >
            固源岩
          </button>
          <button
            type="button"
            :class="{ active: orundumCraftMaterial === 'device' }"
            @click="updateOrundumCraftMaterial('device')"
          >
            装置
          </button>
        </div>
      </section>

      <div class="schedule-export-shift-fields">
        <section
          v-for="entry in displayShifts"
          :key="entry.shift.id || entry.index"
          class="schedule-export-module schedule-export-shift-field"
        >
          <header class="schedule-export-module-heading">
            <strong>{{ entry.shift.name || `班次 ${entry.index + 1}` }}</strong>
            <span>{{ entry.shift.time }}</span>
          </header>
          <label>
            <span>班次起始时间</span>
            <input
              :value="entry.shift.time"
              type="time"
              @input="updateShift(entry.index, 'time', $event)"
            />
          </label>
          <label>
            <span>班次说明</span>
            <input
              :value="entry.shift.description"
              @input="updateShift(entry.index, 'description', $event)"
            />
          </label>
          <label>
            <span>换班后说明</span>
            <input
              :value="entry.shift.descriptionPost"
              @input="updateShift(entry.index, 'descriptionPost', $event)"
            />
          </label>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.schedule-export-settings {
  display: contents;
}

.schedule-output-export-settings {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 120px;
  width: 120px;
  min-height: 46px;
  gap: 4px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--riic-blue) 46%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-blue) 8%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}

.schedule-output-export-settings:hover,
.schedule-output-export-settings.active {
  background: color-mix(
    in srgb,
    var(--riic-blue) 15%,
    var(--c-page-background-color)
  );
}

.schedule-export-settings-panel {
  display: grid;
  order: 2;
  flex: 0 0 100%;
  gap: 10px;
  padding: 11px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
}

.schedule-export-module {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--c-border-color) 78%, transparent);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.schedule-export-module-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 18px;
}

.schedule-export-module-heading strong {
  color: var(--c-text-color);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.schedule-export-metadata-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.schedule-export-metadata-fields label {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.schedule-export-description-field {
  grid-column: 1 / -1;
}

.schedule-export-settings span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.35;
}

.schedule-export-settings input {
  width: 100%;
  min-width: 0;
  min-height: 30px;
  padding: 4px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
}

.schedule-export-shift-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
}

.schedule-export-orundum-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-export-orundum-options button {
  min-width: 72px;
  min-height: 30px;
  padding: 4px 9px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.schedule-export-orundum-options button.active {
  border-color: color-mix(in srgb, var(--riic-blue) 60%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--riic-blue) 12%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  font-weight: 600;
}

.schedule-export-shift-field {
  align-content: start;
}

.schedule-export-shift-field label {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.schedule-export-shift-field .schedule-export-module-heading span {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 620px) {
  .schedule-output-export-settings {
    flex-basis: 100%;
    width: 100%;
  }

  .schedule-export-metadata-fields {
    grid-template-columns: 1fr;
  }

  .schedule-export-description-field {
    grid-column: auto;
  }
}
</style>
