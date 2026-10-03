<script setup>
import { formatDisplayValue } from "/src/utils/riic/riic-efficiency-adapter.js";

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  nested: {
    type: Boolean,
    default: false,
  },
  collapsible: {
    type: Boolean,
    default: false,
  },
  defaultOpen: {
    type: Boolean,
    default: true,
  },
});

function sectionLayout() {
  const entries = props.section.entries ?? [];
  if (entries.length === 0) {
    return "grid";
  }
  if (entries.some((entry) => entry.cells !== undefined)) {
    return "candidate-list";
  }
  if (entries.some((entry) => entry.value !== undefined)) {
    return "skill-list";
  }
  return "mood-list";
}

function text(value) {
  return value === undefined ? "" : formatDisplayValue(value);
}
</script>

<template>
  <component
    :is="props.collapsible && props.section.label ? 'details' : props.nested ? 'div' : 'section'"
    :class="['riic-display-section', { 'riic-display-section-nested': props.nested }]"
    :open="props.collapsible && props.section.label && props.defaultOpen ? true : undefined"
  >
    <component
      :is="props.collapsible && props.section.label ? 'summary' : 'span'"
      v-if="props.section.label"
      class="riic-display-section-label"
    >{{ props.section.label }}</component>

    <div v-if="sectionLayout() === 'grid'" class="riic-display-grid">
      <template v-for="row in props.section.rows || []" :key="row.key">
        <span class="riic-display-grid-label">{{ text(row.label) }}</span>
        <strong class="riic-display-grid-value">{{ text(row.value) }}</strong>
      </template>
    </div>

    <div v-else-if="sectionLayout() === 'skill-list'" class="riic-display-skill-list">
      <div v-for="entry in props.section.entries" :key="entry.key" class="riic-display-skill-row">
        <span class="riic-display-skill-title">{{ text(entry.title) }}</span>
        <span class="riic-display-skill-value">{{ text(entry.value) }}</span>
        <div v-if="entry.rows?.length" class="riic-display-skill-calculation">
          <div v-for="row in entry.rows" :key="row.key" class="riic-display-skill-calculation-row">
            <span class="riic-display-skill-calculation-label">{{ text(row.label) }}</span>
            <span>{{ text(row.value) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="sectionLayout() === 'mood-list'" class="riic-display-mood-list">
      <div v-for="entry in props.section.entries" :key="entry.key" class="riic-display-mood-row">
        <strong class="riic-display-mood-title">{{ text(entry.title) }}</strong>
        <div class="riic-display-mood-details">
          <div v-for="row in entry.rows || []" :key="row.key" class="riic-display-mood-detail">
            <span class="riic-display-mood-label">{{ text(row.label) }}</span>
            <strong class="riic-display-mood-value">{{ text(row.value) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="riic-display-candidate-list">
      <div v-for="entry in props.section.entries" :key="entry.key" class="riic-display-candidate-row">
        <span v-for="(cell, cellIndex) in entry.cells || []" :key="cellIndex" class="riic-display-candidate-cell">{{ text(cell) }}</span>
      </div>
    </div>

    <RiicDisplaySection
      v-for="child in props.section.sections || []"
      :key="child.key"
      :section="child"
      nested
      :collapsible="props.collapsible"
      :default-open="props.defaultOpen"
    />
  </component>
</template>

<style scoped>
.riic-display-section {
  margin-top: 10px;
}
.riic-display-section-nested {
  margin-left: 12px;
  padding-left: 10px;
  border-left: 1px solid var(--c-border-color);
}
.riic-display-section-label {
  display: block;
  margin-bottom: 6px;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
  font-weight: 600;
}
.riic-display-section > summary.riic-display-section-label {
  list-style: none;
  cursor: pointer;
}
.riic-display-section > summary.riic-display-section-label::-webkit-details-marker {
  display: none;
}
.riic-display-section > summary.riic-display-section-label::after {
  float: right;
  content: "+";
  font-weight: 400;
}
.riic-display-section[open] > summary.riic-display-section-label::after {
  content: "-";
}
.riic-display-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  font-size: 13px;
}
.riic-display-grid-label {
  color: var(--c-text-color-secondary, #6b7280);
}
.riic-display-grid-value {
  font-variant-numeric: tabular-nums;
  text-align: left;
}
.riic-display-skill-list,
.riic-display-candidate-list {
  display: grid;
  gap: 8px;
}
.riic-display-mood-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 12px;
  font-size: 13px;
}
.riic-display-skill-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--c-border-color);
  font-size: 13px;
}
.riic-display-skill-title {
  overflow-wrap: anywhere;
}
.riic-display-skill-value,
.riic-display-mood-value {
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  text-align: left;
}
.riic-display-skill-calculation {
  grid-column: 1 / -1;
  display: grid;
  gap: 3px;
  margin-top: 4px;
}
.riic-display-skill-calculation-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  color: var(--c-text-color-secondary, #6b7280);
}
.riic-display-skill-calculation-label {
  overflow-wrap: anywhere;
}
.riic-display-mood-row {
  display: contents;
}
.riic-display-mood-details {
  display: contents;
}
.riic-display-mood-detail {
  display: contents;
}
.riic-display-mood-title {
  grid-column: 1 / -1;
  overflow-wrap: anywhere;
}
.riic-display-mood-label {
  color: var(--c-text-color-secondary, #6b7280);
}
.riic-display-candidate-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  font-size: 13px;
}
.riic-display-candidate-cell {
  overflow-wrap: anywhere;
}

</style>
