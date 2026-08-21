<script setup>
import { computed, ref } from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";

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
  includeTrainingRoom: {
    type: Boolean,
    default: false,
  },
  showOrundumCraftMaterial: {
    type: Boolean,
    default: false,
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
  "update:include-training-room",
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
    ...(field === "periodStart" || field === "periodEnd"
      ? { periodCustomized: true }
      : {}),
  });
}

function updateOrundumCraftMaterial(value) {
  emit("update:orundum-craft-material", value);
}

function updateIncludeTrainingRoom(event) {
  emit("update:include-training-room", event.target.checked);
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
      <section class="schedule-export-settings-area">
        <header class="schedule-export-area-heading">
          <strong>常规设置</strong>
        </header>
        <div class="schedule-export-area-content schedule-export-regular-fields">
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

          <section
            v-if="showOrundumCraftMaterial"
            class="schedule-export-module schedule-export-orundum-module"
          >
            <header class="schedule-export-module-heading">
              <strong>搓玉原料</strong>
            </header>
            <div class="schedule-export-orundum-options">
              <button
                type="button"
                :class="{ active: orundumCraftMaterial === 'orirock' }"
                @click="updateOrundumCraftMaterial('orirock')"
              >
                <ItemImage :item-id="'4003'" :size="24" :mobile-size="24"></ItemImage>
                <ItemImage :item-id="'30012'" :size="24" :mobile-size="24"></ItemImage>
                <span>1600 龙门币</span>
              </button>
              <button
                type="button"
                :class="{ active: orundumCraftMaterial === 'device' }"
                @click="updateOrundumCraftMaterial('device')"
              >
                <ItemImage :item-id="'4003'" :size="24" :mobile-size="24"></ItemImage>
                <ItemImage :item-id="'30062'" :size="24" :mobile-size="24"></ItemImage>
                <span>1000 龙门币</span>
              </button>
            </div>
          </section>
        </div>
      </section>

      <section class="schedule-export-settings-area">
        <header class="schedule-export-area-heading">
          <strong>班次设置</strong>
        </header>
        <div class="schedule-export-area-content schedule-export-shift-fields">
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
              <span>换班时间范围起点</span>
              <input
                :value="entry.shift.periodStart"
                type="time"
                @input="updateShift(entry.index, 'periodStart', $event)"
              />
            </label>
            <label>
              <span>换班时间范围终点</span>
              <input
                :value="entry.shift.periodEnd"
                type="time"
                @input="updateShift(entry.index, 'periodEnd', $event)"
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

      <section class="schedule-export-settings-area">
        <header class="schedule-export-area-heading">
          <strong>高级设置</strong>
        </header>
        <div class="schedule-export-area-content">
          <section class="schedule-export-module schedule-export-maa-module">
            <header class="schedule-export-module-heading">
              <strong>MAA 导出内容</strong>
            </header>
            <label class="schedule-export-checkbox">
              <input
                type="checkbox"
                :checked="includeTrainingRoom"
                @change="updateIncludeTrainingRoom"
              />
              <span>强行输出训练室字段</span>
            </label>
            <p class="schedule-export-warning">MAA尚未支持训练室，请勿打开</p>
          </section>
        </div>
      </section>
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

.schedule-export-settings-area {
  display: grid;
  gap: 8px;
}

.schedule-export-area-heading {
  padding: 0 2px;
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.schedule-export-area-content {
  display: grid;
  gap: 8px;
}

.schedule-export-regular-fields {
  grid-template-columns: minmax(0, 1.5fr) minmax(180px, 0.5fr);
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

.schedule-export-checkbox {
  display: flex !important;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  cursor: pointer;
}

.schedule-export-checkbox input {
  width: 16px;
  min-width: 16px;
  min-height: 16px;
  margin: 0;
  accent-color: var(--riic-blue);
}

.schedule-export-checkbox span {
  color: var(--c-text-color);
}

.schedule-export-warning {
  margin: 0;
  color: var(--riic-orange);
  font-size: 12px;
  line-height: 1.45;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  min-height: 30px;
  gap: 3px;
  padding: 4px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.schedule-export-orundum-options button :deep(> div) {
  flex: 0 0 auto;
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

  .schedule-export-regular-fields {
    grid-template-columns: 1fr;
  }

  .schedule-export-description-field {
    grid-column: auto;
  }
}
</style>
