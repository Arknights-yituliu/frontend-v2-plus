<script setup>
import { computed } from 'vue'
import ItemImage from '/src/components/sprite/ItemImage.vue'
import OperatorAvatar from '/src/components/sprite/OperatorAvatar.vue'

const props = defineProps({
  operators: {
    type: Array,
    default: () => [],
  },
})

const columnCount = computed(() => Math.min(3, Math.max(1, props.operators.length)))

function getPptPageMaterials(row) {
  return row.materials.slice(0, 8)
}

function formatCost(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '-'
}
</script>

<template>
  <section
    v-if="operators.length > 0"
    class="yield-overview-ppt-page"
    :style="{ '--ppt-page-columns': columnCount }"
  >
    <article
      v-for="operator in operators"
      :key="operator.charId"
      class="yield-overview-ppt-operator"
    >
      <header class="yield-overview-ppt-operator-header">
        <OperatorAvatar
          :char-id="operator.charId"
          :rarity="operator.rarity"
          :size="44"
          border
        />
        <div>
          <strong>{{ operator.name }}</strong>
          <span>{{ operator.rarity }} 星培养成本</span>
        </div>
      </header>

      <table class="yield-overview-ppt-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>主要材料</th>
            <th>理智</th>
            <th>排名</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in operator.rows" :key="operator.charId + row.key">
            <td>
              <strong>{{ row.title }}</strong>
              <span v-if="row.subtitle">{{ row.subtitle }}</span>
            </td>
            <td>
              <div class="yield-overview-ppt-materials">
                <span
                  v-for="material in getPptPageMaterials(row)"
                  :key="operator.charId + row.key + material.itemId"
                  :title="material.itemName"
                >
                  <ItemImage :item-id="material.itemId" :size="28" />
                  <b>{{ material.count }}</b>
                </span>
              </div>
              <small v-if="row.otherSummary">{{ row.otherSummary }}</small>
            </td>
            <td>{{ formatCost(row.totalCost) }}</td>
            <td>{{ row.rank }}</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>

<style scoped>
.yield-overview-ppt-page {
  display: grid;
  width: 1600px;
  grid-template-columns: repeat(var(--ppt-page-columns), minmax(0, 1fr));
  gap: 18px;
  margin: 28px auto 0;
  padding: 22px;
  background:
    linear-gradient(145deg, #e8edf2, #f7f8fa),
    repeating-linear-gradient(135deg, rgba(72, 88, 104, 0.08) 0 1px, transparent 1px 10px);
  color: #202a35;
}

.yield-overview-ppt-operator {
  min-width: 0;
  border: 1px solid #b7c2cf;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(24, 35, 48, 0.12);
}

.yield-overview-ppt-operator-header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #d6dde5;
  background: #edf3f8;
}

.yield-overview-ppt-operator-header > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.yield-overview-ppt-operator-header strong {
  overflow: hidden;
  font-size: 22px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yield-overview-ppt-operator-header span {
  color: #667487;
  font-size: 13px;
}

.yield-overview-ppt-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.yield-overview-ppt-table th,
.yield-overview-ppt-table td {
  padding: 9px 10px;
  border-bottom: 1px solid #e1e6ec;
  text-align: center;
  vertical-align: middle;
}

.yield-overview-ppt-table th {
  background: #f6f8fa;
  color: #47576a;
  font-size: 13px;
}

.yield-overview-ppt-table th:first-child {
  width: 21%;
}

.yield-overview-ppt-table th:nth-child(2) {
  width: 53%;
}

.yield-overview-ppt-table th:nth-child(3),
.yield-overview-ppt-table th:nth-child(4) {
  width: 13%;
}

.yield-overview-ppt-table td:first-child {
  color: #253548;
  font-size: 14px;
}

.yield-overview-ppt-table td:first-child strong,
.yield-overview-ppt-table td:first-child span {
  display: block;
}

.yield-overview-ppt-table td:first-child span,
.yield-overview-ppt-table small {
  margin-top: 3px;
  color: #788595;
  font-size: 11px;
  line-height: 1.3;
}

.yield-overview-ppt-materials {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 7px;
}

.yield-overview-ppt-materials > span {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  color: #34475b;
  font-size: 12px;
}

.yield-overview-ppt-materials b {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 700px) {
  .yield-overview-ppt-page {
    width: 100%;
    grid-template-columns: 1fr;
  }
}
</style>
