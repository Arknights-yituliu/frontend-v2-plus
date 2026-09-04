<script setup>
import { computed, ref, watch } from 'vue'
import ItemImage from '/src/components/sprite/ItemImage.vue'
import SkillIcon from '/src/components/sprite/SkillIcon.vue'

const T5_MATERIAL_ID_REGEX = /^\d{4}5$/
const T4_MATERIAL_ID_REGEX = /^\d{4}4$/
const DEFAULT_LAYOUT_SETTINGS = Object.freeze({
  materialColumnWidth: 315,
  rowHeight: 96,
  materialGapX: 10,
  materialGapY: 8,
  portraitColumnWidth: 220,
  portraitScale: 100,
  portraitOffsetX: 0,
  portraitOffsetY: 0,
})

const props = defineProps({
  operator: {
    type: Object,
    default: null,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  portraitSrc: {
    type: String,
    default: '',
  },
  showPortraitName: {
    type: Boolean,
    default: true,
  },
  showSkillIconColumn: {
    type: Boolean,
    default: true,
  },
  layoutSettings: {
    type: Object,
    default: () => ({
      materialColumnWidth: 315,
      rowHeight: 96,
      materialGapX: 10,
      materialGapY: 8,
      portraitColumnWidth: 220,
      portraitScale: 100,
      portraitOffsetX: 0,
      portraitOffsetY: 0,
    }),
  },
})

const emit = defineEmits(['portrait-load', 'portrait-error'])
const chartRef = ref(null)
const hasPortrait = ref(false)

const resolvedLayoutSettings = computed(() => ({
  ...DEFAULT_LAYOUT_SETTINGS,
  ...props.layoutSettings,
}))
const chartStyle = computed(() => {
  const layout = resolvedLayoutSettings.value
  return {
    '--overview-card-width':
      `${layout.materialColumnWidth + 500 + layout.portraitColumnWidth}px`,
    '--overview-table-width': `${layout.materialColumnWidth + 500}px`,
    '--overview-material-width': `${layout.materialColumnWidth}px`,
    '--overview-row-title-width': `${150 + (props.showSkillIconColumn ? 0 : 70)}px`,
    '--overview-row-height': `${layout.rowHeight}px`,
    '--overview-material-gap-x': `${layout.materialGapX}px`,
    '--overview-material-gap-y': `${layout.materialGapY}px`,
    '--overview-portrait-width': `${layout.portraitColumnWidth}px`,
    '--overview-portrait-scale': layout.portraitScale / 100,
    '--overview-portrait-offset-x': `${layout.portraitOffsetX}px`,
    '--overview-portrait-offset-y': `${layout.portraitOffsetY}px`,
  }
})

watch(
  () => props.portraitSrc,
  value => {
    hasPortrait.value = Boolean(value)
  },
  { immediate: true },
)

function isT5Material(material) {
  if (typeof material?.isT5 === 'boolean') {
    return material.isT5
  }
  return T5_MATERIAL_ID_REGEX.test(material?.itemId || '') && material?.type?.includes('精英')
}

function isT4Material(material) {
  if (typeof material?.isT4 === 'boolean') {
    return material.isT4
  }
  return T4_MATERIAL_ID_REGEX.test(material?.itemId || '') && material?.type?.includes('精英')
}

function getMaterialLines(materials = []) {
  const lines = [[]]
  let hasT5Material = false
  let splitBeforeT4 = false

  for (const material of materials) {
    if (!splitBeforeT4 && hasT5Material && isT4Material(material)) {
      lines.push([])
      splitBeforeT4 = true
    }

    lines.at(-1).push(material)
    hasT5Material ||= isT5Material(material)
  }

  return lines.filter(line => line.length > 0)
}

function formatCost(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '-'
}

function handlePortraitLoad() {
  emit('portrait-load')
}

function handlePortraitError() {
  hasPortrait.value = false
  emit('portrait-error')
}

defineExpose({
  getElement: () => chartRef.value,
})
</script>

<template>
  <section
    v-if="operator && rows.length > 0"
    ref="chartRef"
    class="preview-card"
    :style="chartStyle"
  >
    <div class="overview-body">
      <div class="portrait-column">
        <img
          v-if="hasPortrait"
          :key="portraitSrc"
          class="operator-portrait"
          :src="portraitSrc"
          :alt="`${operator.name}半身立绘`"
          crossorigin="anonymous"
          @load="handlePortraitLoad"
          @error="handlePortraitError"
        >
        <div v-if="showPortraitName" class="portrait-name">{{ operator.name }}</div>
      </div>

      <div class="table-capture-area">
        <table class="overview-table">
          <colgroup>
            <col v-if="showSkillIconColumn" class="skill-icon-column">
            <col class="row-title-column">
            <col class="material-column">
            <col class="cost-column">
            <col class="rank-column">
          </colgroup>
          <thead>
            <tr>
              <th v-if="showSkillIconColumn"></th>
              <th></th>
              <th>主要材料</th>
              <th>理智消耗</th>
              <th>排名/总数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key">
              <td v-if="showSkillIconColumn" class="skill-icon-cell">
                <img
                  v-if="row.key === 'elite2'"
                  class="elite2-icon"
                  src="/image/survey/rank/elite2.png"
                  alt=""
                >
                <SkillIcon
                  v-else-if="row.skillIcon"
                  :icon="row.skillIcon"
                  :size="58"
                  border
                />
                <div v-else class="skill-icon-placeholder"></div>
              </td>
              <td class="row-title-cell">
                <div class="row-title">{{ row.title }}</div>
                <div v-if="row.subtitle" class="row-subtitle">{{ row.subtitle }}</div>
              </td>
              <td class="material-cell">
                <div v-if="row.materials.length > 0" class="material-list">
                  <div
                    v-for="(materialLine, lineIndex) in getMaterialLines(row.materials)"
                    :key="row.key + '-line-' + lineIndex"
                    class="material-line"
                  >
                    <template
                      v-for="material in materialLine"
                      :key="row.key + '-' + material.itemId"
                    >
                      <div
                        v-for="index in material.count"
                        :key="row.key + '-' + material.itemId + '-' + index"
                        class="material-entry"
                        :title="material.itemName"
                      >
                        <ItemImage :item-id="material.itemId" :size="44" />
                      </div>
                    </template>
                  </div>
                </div>
                <div v-else class="no-t5-text">无 T5 精英材料</div>
                <div v-if="row.otherSummary" class="other-materials">{{ row.otherSummary }}</div>
              </td>
              <td class="number-cell">{{ formatCost(row.totalCost) }}</td>
              <td class="number-cell">{{ row.rank }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-card {
  --overview-card-width: 1035px;
  --overview-table-width: 815px;
  --overview-portrait-width: 220px;
  --overview-skill-icon-width: 70px;
  --overview-row-title-width: 150px;
  --overview-material-width: 315px;
  --overview-cost-width: 140px;
  --overview-rank-width: 140px;
  --overview-row-height: 96px;
  --overview-material-gap-x: 10px;
  --overview-material-gap-y: 8px;
  flex: 0 0 var(--overview-card-width);
  width: var(--overview-card-width);
  margin: 0 auto;
  overflow: hidden;
  background:
    radial-gradient(circle at 80% 8%, rgba(157, 178, 191, 0.2), transparent 34%),
    linear-gradient(145deg, #3d4247, #2c3035);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.32);
}

.overview-body {
  display: grid;
  grid-template-columns: var(--overview-portrait-width) var(--overview-table-width);
  align-items: stretch;
}

.portrait-column {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.24)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 9px);
}

.operator-portrait {
  position: absolute;
  top: auto;
  right: auto;
  bottom: 0;
  left: 50%;
  display: block;
  width: calc(100% - 8px);
  height: auto;
  object-fit: contain;
  object-position: center bottom;
  transform:
    translate(
      calc(-50% + var(--overview-portrait-offset-x)),
      var(--overview-portrait-offset-y)
    )
    scale(var(--overview-portrait-scale));
  transform-origin: center bottom;
}

.portrait-name {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 30px 14px 13px;
  background: linear-gradient(transparent, rgba(13, 16, 20, 0.86));
  color: rgba(255, 255, 255, 0.94);
  font-size: 21px;
  line-height: 1.1;
  font-weight: 800;
  text-align: center;
}

.overview-table {
  width: var(--overview-table-width);
  table-layout: fixed;
  border-collapse: collapse;
}

.table-capture-area {
  background:
    radial-gradient(circle at 80% 8%, rgba(157, 178, 191, 0.16), transparent 34%),
    linear-gradient(145deg, #3d4247, #2c3035);
}

.overview-table th {
  height: 60px;
  padding: 0 14px;
  color: #ffffff;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 900;
  text-align: center;
  background: rgba(0, 0, 0, 0.16);
}

.overview-table td {
  height: var(--overview-row-height);
  padding: 16px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  vertical-align: middle;
}

.skill-icon-column {
  width: var(--overview-skill-icon-width);
}

.row-title-column {
  width: var(--overview-row-title-width);
}

.material-column {
  width: var(--overview-material-width);
}

.cost-column {
  width: var(--overview-cost-width);
}

.rank-column {
  width: var(--overview-rank-width);
}

.skill-icon-cell {
  padding-right: 6px;
  padding-left: 6px;
  text-align: center;
}

.skill-icon-cell > div {
  margin: 0 auto;
}

.skill-icon-placeholder {
  width: 58px;
  height: 58px;
}

.elite2-icon {
  display: block;
  width: 58px;
  height: 58px;
  object-fit: contain;
}

.row-title-cell {
  color: rgba(255, 255, 255, 0.9);
}

.row-title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.15;
}

.row-subtitle {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 16px;
  line-height: 1.3;
}

.material-cell {
  padding-right: 14px;
  padding-left: 14px;
  overflow: visible;
  text-align: left;
}

.material-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: visible;
}

.material-line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  justify-content: flex-start;
}

.material-entry {
  display: flex;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}

.other-materials,
.no-t5-text {
  margin-top: 8px;
  color: #ffffff;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 800;
}

.no-t5-text {
  margin-top: 0;
  color: rgba(255, 255, 255, 0.72);
}

.number-cell {
  color: #ffffff;
  font-size: 28px;
  line-height: 1;
  font-weight: 500;
  text-align: center;
}
</style>
