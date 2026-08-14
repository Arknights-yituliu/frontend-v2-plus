<script setup>
defineProps({
  exportingImage: {
    type: Boolean,
    default: false,
  },
  exportingMaa: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "export-image",
  "export-maa",
  "open-legacy-editor",
]);
</script>

<template>
  <div class="schedule-output-ready">
    <div class="schedule-output-actions">
      <slot name="before-image"></slot>
      <button
        type="button"
        class="schedule-output-export-image"
        :disabled="exportingImage"
        @click="emit('export-image')"
      >
        <v-icon icon="mdi-image-outline" size="18"></v-icon>
        {{ exportingImage ? "正在生成" : "导出图片" }}
      </button>
      <button
        type="button"
        class="schedule-output-open-legacy"
        @click="emit('open-legacy-editor')"
      >
        <v-icon icon="mdi-pencil-outline" size="18"></v-icon>
        转到旧版编辑器
      </button>
      <button
        type="button"
        class="schedule-output-export-maa"
        :disabled="exportingMaa"
        @click="emit('export-maa')"
      >
        <v-icon icon="mdi-code-json" size="18"></v-icon>
        {{ exportingMaa ? "正在导出" : "导出 MAA" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.schedule-output-ready {
  margin-top: 12px;
}

.schedule-output-actions {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: 10px;
}

.schedule-output-actions button {
  display: inline-flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 4px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  cursor: pointer;
}

.schedule-output-export-image,
.schedule-output-open-legacy {
  border-color: color-mix(in srgb, var(--riic-blue) 46%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--riic-blue) 8%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
}

.schedule-output-export-maa {
  background: var(--riic-green);
  color: #fff;
}

.schedule-output-actions button:hover:not(:disabled) {
  filter: brightness(0.97);
}

.schedule-output-actions button:disabled {
  cursor: default;
  opacity: 0.55;
}

</style>
