<script setup>
import { formatDisplayValue } from "/src/utils/riic/riic-efficiency-adapter.js";
import RiicDisplaySection from "/src/components/tools/RiicDisplaySection.vue";

const props = defineProps({
  card: {
    type: Object,
    required: true,
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

function text(value) {
  return value === undefined ? "" : formatDisplayValue(value);
}

function cardSections() {
  return (props.card.sections || []).flatMap((section) => {
    const orderSummaries = (section.sections || []).filter(
      (child) => child.label === "订单摘要",
    );
    if (!orderSummaries.length) {
      return [section];
    }
    return [
      {
        ...section,
        sections: (section.sections || []).filter(
          (child) => child.label !== "订单摘要",
        ),
      },
      ...orderSummaries,
    ];
  });
}
</script>

<template>
  <div v-if="props.card.empty" class="riic-display-card-empty">{{ props.card.empty }}</div>
  <component
    :is="props.collapsible && props.card.title ? 'details' : 'article'"
    v-else
    class="riic-display-card"
    :open="props.collapsible && props.card.title && props.defaultOpen ? true : undefined"
  >
    <component
      :is="props.collapsible && props.card.title ? 'summary' : 'header'"
      v-if="props.card.title"
      class="riic-display-card-header"
    >
      <span class="riic-display-card-title">{{ text(props.card.title) }}</span>
      <span v-if="props.card.subtitle" class="riic-display-card-subtitle">{{ text(props.card.subtitle) }}</span>
      <span v-if="props.card.badge" class="riic-display-card-badge">{{ text(props.card.badge) }}</span>
    </component>
    <RiicDisplaySection
      v-for="section in cardSections()"
      :key="section.key"
      :section="section"
      :collapsible="props.collapsible"
      :default-open="props.defaultOpen"
    />
    <p v-if="props.card.emptyNote" class="riic-display-card-note">{{ props.card.emptyNote }}</p>
  </component>
</template>

<style scoped>
.riic-display-card {
  padding: 12px 14px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary, #fafafa);
}
.riic-display-card-empty,
.riic-display-card-note {
  margin: 0;
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.riic-display-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--c-border-color);
}
.riic-display-card > summary {
  list-style: none;
  cursor: pointer;
}
.riic-display-card > summary::-webkit-details-marker {
  display: none;
}
.riic-display-card > summary::after {
  content: "+";
  color: var(--c-text-color-secondary, #6b7280);
  font-weight: 400;
}
.riic-display-card[open] > summary::after {
  content: "-";
}
.riic-display-card-title {
  font-weight: 600;
}
.riic-display-card-subtitle {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}
.riic-display-card-badge {
  margin-left: auto;
  color: var(--riic-blue, #2878c8);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
