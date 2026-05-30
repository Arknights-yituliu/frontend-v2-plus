<template>
  <main class="alchemy-page">
    <header class="alchemy-header">
      <RouterLink class="alchemy-back" to="/lb">
        <el-icon><ArrowLeft /></el-icon>
        <span>LB</span>
      </RouterLink>
      <div>
        <p class="alchemy-kicker">LogicalByte Alchemy Calculator</p>
        <h1>炼金池收益计算</h1>
      </div>
      <div class="alchemy-actions">
        <el-button @click="selectAllStages(true)">全选关卡</el-button>
        <el-button @click="selectAllStages(false)">取消选择</el-button>
        <el-button type="danger" plain @click="resetInputs">
          <el-icon><RefreshLeft /></el-icon>
          <span>重置</span>
        </el-button>
      </div>
    </header>

    <section class="alchemy-summary-grid">
      <article class="alchemy-summary-card">
        <span>已选关卡</span>
        <strong>{{ selectedStages.length }} / {{ stages.length }}</strong>
      </article>
      <article class="alchemy-summary-card">
        <span>总开销</span>
        <strong>{{ formatValue(totalCost, 2) }}</strong>
        <em>理智</em>
      </article>
      <article class="alchemy-summary-card">
        <span>炼金产物</span>
        <strong>{{ formatValue(totalAlchemyProduct, 4) }}</strong>
      </article>
      <article class="alchemy-summary-card">
        <span>产物 / 理智</span>
        <strong>{{ formatValue(productPerSanity, 6) }}</strong>
      </article>
      <article class="alchemy-summary-card result-card">
        <span>材料收益 / 理智</span>
        <strong>{{ formatValue(finalApPerSanity, 6) }}</strong>
        <em>理智价值</em>
      </article>
    </section>

    <section class="alchemy-panel">
      <div class="alchemy-panel-head">
        <div>
          <h2>掉率输入与计算</h2>
          <p>选中关卡总开销：{{ formatValue(totalCost, 2) }} 理智</p>
        </div>
      </div>

      <el-table
        :data="stages"
        border
        stripe
        row-key="id"
        class="alchemy-table stage-table"
      >
        <el-table-column label="选择" width="68" fixed>
          <template #default="{ row }">
            <el-checkbox v-model="row.selected" />
          </template>
        </el-table-column>
        <el-table-column label="关卡" min-width="130" fixed>
          <template #default="{ row }">
            <el-input v-model="row.name" />
          </template>
        </el-table-column>
        <el-table-column label="理智" width="118">
          <template #default="{ row }">
            <el-input-number
              v-model="row.sanityCost"
              :min="0"
              :precision="2"
              :step="1"
              controls-position="right"
              class="number-input"
              @focus="selectInputText"
              @focusin="selectInputText"
            />
          </template>
        </el-table-column>
        <el-table-column label="样本量" width="128">
          <template #default="{ row }">
            <el-input-number
              v-model="row.sampleSize"
              :min="0"
              :precision="0"
              :step="100"
              controls-position="right"
              class="number-input"
              @focus="selectInputText"
              @focusin="selectInputText"
            />
          </template>
        </el-table-column>
        <el-table-column label="总开销" width="112">
          <template #default="{ row }">
            <strong>{{ formatValue(stageCost(row), 2) }}</strong>
          </template>
        </el-table-column>
        <el-table-column
          v-for="material in materialDefs"
          :key="material.key"
          :label="`${material.label} 掉率(%)`"
          min-width="150"
        >
          <template #default="{ row }">
            <div class="material-rate-cell">
              <el-input-number
                v-model="row.dropRates[material.key]"
                :min="0"
                :precision="4"
                :step="1"
                controls-position="right"
                class="number-input"
                @focus="selectInputText"
                @focusin="selectInputText"
              />
              <span>{{ formatValue(stageExpectedPerRun(row, material.key), 4) }}/次</span>
              <span>{{ formatValue(stageExpectedTotal(row, material.key), 2) }} 合计</span>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="material-total-grid">
        <div v-for="material in materialDefs" :key="material.key" class="material-total">
          <span>{{ material.label }} 总期望</span>
          <strong>{{ formatValue(materialTotals[material.key], 4) }}</strong>
        </div>
      </div>
    </section>

    <section class="alchemy-panel">
      <div class="alchemy-panel-head">
        <div>
          <h2>炼金产物计算</h2>
          <p>选中关卡掉落材料合计：{{ formatValue(totalDropCount, 4) }}</p>
        </div>
      </div>

      <el-table :data="conversionRows" border stripe row-key="key" class="alchemy-table">
        <el-table-column prop="label" label="原料" width="96" />
        <el-table-column label="掉落总量" min-width="130">
          <template #default="{ row }">
            {{ formatValue(getMaterialTotal(row.key), 4) }}
          </template>
        </el-table-column>
        <el-table-column label="炼金产物 / 个" min-width="160">
          <template #default="{ row }">
            <el-input-number
              v-model="row.productPerMaterial"
              :min="0"
              :precision="4"
              :step="0.1"
              controls-position="right"
              class="number-input"
              @focus="selectInputText"
              @focusin="selectInputText"
            />
          </template>
        </el-table-column>
        <el-table-column label="产物价值" min-width="130">
          <template #default="{ row }">
            <strong>{{ formatValue(conversionProductTotal(row), 6) }}</strong>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="alchemy-panel">
      <div class="alchemy-panel-head">
        <div>
          <h2>收益计算</h2>
          <p>{{ itemValueStatus }}</p>
        </div>
        <label class="draw-cost-field">
          <span>每次抽取消耗</span>
          <el-input-number
            v-model="drawCost"
            :min="0"
            :precision="4"
            :step="1"
            controls-position="right"
            class="draw-cost-input"
            @focus="selectInputText"
            @focusin="selectInputText"
          />
        </label>
      </div>

      <el-table :data="rewardRows" border stripe row-key="id" class="alchemy-table">
        <el-table-column label="产物" min-width="240">
          <template #default="{ row }">
            <el-select v-model="row.itemId" filterable placeholder="选择产物">
              <el-option
                v-for="item in productOptions"
                :key="item.itemId"
                :label="item.label"
                :value="item.itemId"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="数量" min-width="130">
          <template #default="{ row }">
            <el-input-number
              v-model="row.quantity"
              :min="0"
              :precision="0"
              :step="1"
              controls-position="right"
              class="number-input"
              @focus="selectInputText"
              @focusin="selectInputText"
            />
          </template>
        </el-table-column>
        <el-table-column label="概率(%)" min-width="130">
          <template #default="{ row }">
            <el-input-number
              v-model="row.probability"
              :min="0"
              :precision="4"
              :step="1"
              controls-position="right"
              class="number-input"
              @focus="selectInputText"
              @focusin="selectInputText"
            />
          </template>
        </el-table-column>
        <el-table-column label="单价" min-width="120">
          <template #default="{ row }">
            {{ formatValue(getItemValue(row.itemId), 6) }}
          </template>
        </el-table-column>
        <el-table-column label="单项期望" min-width="130">
          <template #default="{ row }">
            <strong>{{ formatValue(rewardExpectedValue(row), 6) }}</strong>
          </template>
        </el-table-column>
      </el-table>

      <div class="profit-grid">
        <article class="profit-item">
          <span>概率合计</span>
          <strong :class="{ warning: probabilityWarning }">{{ formatValue(probabilitySum, 4) }}%</strong>
        </article>
        <article class="profit-item">
          <span>单抽期望价值</span>
          <strong>{{ formatValue(expectedDrawValue, 6) }}</strong>
        </article>
        <article class="profit-item">
          <span>每理智抽数</span>
          <strong>{{ formatValue(drawsPerSanity, 8) }}</strong>
        </article>
        <article class="profit-item result-item">
          <span>每理智材料收益</span>
          <strong>{{ formatValue(finalApPerSanity, 6) }}</strong>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, RefreshLeft } from '@element-plus/icons-vue'

import itemInfoList from '/src/static/json/material/item_info.json'
import itemCache from '/src/plugins/indexedDB/itemCache.js'
import { getStageConfig } from '/src/utils/user/userConfig.js'

const LMD_ID = '4001'

const materialDefs = [
  { key: 'A', label: 'A' },
  { key: 'B', label: 'B' },
  { key: 'C', label: 'C' },
  { key: 'D', label: 'D' },
  { key: 'E', label: 'E' }
]

const fallbackItemMap = new Map(itemInfoList.map((item) => [String(item.itemId), item]))
const itemInfoMap = ref(new Map(fallbackItemMap))
const itemValueStatus = ref('正在加载物品价值表')

const stages = ref(createDefaultStages())
const conversionRows = ref(createDefaultConversionRows())
const rewardRows = ref(createDefaultRewardRows())
const drawCost = ref(0)

const productOptions = computed(() => {
  const lmd = fallbackItemMap.get(LMD_ID)
  const t3BlueMaterials = itemInfoList.filter((item) => {
    const itemId = String(item.itemId)
    return /^3\d{3}3$/.test(itemId) && Number(item.rarity) === 3
  })

  return [lmd, ...t3BlueMaterials]
    .filter(Boolean)
    .map((item) => ({
      itemId: String(item.itemId),
      label: `${item.itemName} (${item.itemId})`
    }))
})

const selectedStages = computed(() => stages.value.filter((stage) => stage.selected))

const totalCost = computed(() => selectedStages.value.reduce((sum, stage) => sum + stageCost(stage), 0))

const materialTotals = computed(() => {
  return materialDefs.reduce((totals, material) => {
    totals[material.key] = selectedStages.value.reduce((sum, stage) => {
      return sum + stageExpectedTotal(stage, material.key)
    }, 0)
    return totals
  }, {})
})

const totalDropCount = computed(() => {
  return materialDefs.reduce((sum, material) => sum + materialTotals.value[material.key], 0)
})

const totalAlchemyProduct = computed(() => {
  return conversionRows.value.reduce((sum, row) => sum + conversionProductTotal(row), 0)
})

const productPerSanity = computed(() => {
  if (totalCost.value <= 0) return 0
  return totalAlchemyProduct.value / totalCost.value
})

const probabilitySum = computed(() => {
  return rewardRows.value.reduce((sum, row) => sum + toNumber(row.probability), 0)
})

const probabilityWarning = computed(() => {
  if (probabilitySum.value === 0) return false
  return Math.abs(probabilitySum.value - 100) > 0.0001
})

const expectedDrawValue = computed(() => {
  return rewardRows.value.reduce((sum, row) => sum + rewardExpectedValue(row), 0)
})

const drawsPerSanity = computed(() => {
  const cost = toNumber(drawCost.value)
  if (cost <= 0) return 0
  return productPerSanity.value / cost
})

const finalApPerSanity = computed(() => expectedDrawValue.value * drawsPerSanity.value)

onMounted(async () => {
  try {
    itemInfoMap.value = await itemCache.getItemInfoMapCacheByConfig(getStageConfig())
    itemValueStatus.value = '物品价值已按当前配置匹配'
  } catch (error) {
    console.error(error)
    itemInfoMap.value = new Map(fallbackItemMap)
    itemValueStatus.value = '物品价值加载失败，已使用静态价值'
  }
})

function createDefaultStages() {
  return Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    selected: true,
    name: `关卡${index + 1}`,
    sanityCost: 0,
    sampleSize: 0,
    dropRates: materialDefs.reduce((rates, material) => {
      rates[material.key] = 0
      return rates
    }, {})
  }))
}

function createDefaultConversionRows() {
  return materialDefs.map((material) => ({
    ...material,
    productPerMaterial: 0
  }))
}

function createDefaultRewardRows() {
  return Array.from({ length: 4 }, (_, index) => ({
    id: index + 1,
    itemId: index === 0 ? LMD_ID : '',
    quantity: 0,
    probability: 0
  }))
}

function selectAllStages(selected) {
  for (const stage of stages.value) {
    stage.selected = selected
  }
}

function resetInputs() {
  stages.value = createDefaultStages()
  conversionRows.value = createDefaultConversionRows()
  rewardRows.value = createDefaultRewardRows()
  drawCost.value = 0
}

function stageCost(stage) {
  return toNumber(stage.sanityCost) * toNumber(stage.sampleSize)
}

function stageExpectedPerRun(stage, materialKey) {
  return toNumber(stage.dropRates?.[materialKey]) / 100
}

function stageExpectedTotal(stage, materialKey) {
  return toNumber(stage.sampleSize) * stageExpectedPerRun(stage, materialKey)
}

function getMaterialTotal(materialKey) {
  return materialTotals.value[materialKey] || 0
}

function conversionProductTotal(row) {
  return getMaterialTotal(row.key) * toNumber(row.productPerMaterial)
}

function getItemValue(itemId) {
  if (!itemId) return 0
  const item = itemInfoMap.value.get(String(itemId)) || fallbackItemMap.get(String(itemId))
  const itemValue = Number(item?.itemValue ?? item?.itemValueAp)
  return Number.isFinite(itemValue) ? itemValue : 0
}

function rewardExpectedValue(row) {
  return getItemValue(row.itemId) * toNumber(row.quantity) * toNumber(row.probability) / 100
}

function selectInputText(event) {
  const input = event?.target
  if (input && typeof input.select === 'function') {
    requestAnimationFrame(() => input.select())
  }
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatValue(value, digits = 2) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(digits) : '0'
}
</script>

<style scoped>
.alchemy-page {
  min-height: 100vh;
  padding: 32px 20px 56px;
  background: #f5f7fb;
  color: #172033;
}

.alchemy-header,
.alchemy-panel,
.alchemy-summary-grid {
  max-width: 1280px;
  margin: 0 auto;
}

.alchemy-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
  margin-bottom: 20px;
}

.alchemy-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 72px;
  height: 36px;
  justify-content: center;
  border: 1px solid #cfd8e8;
  border-radius: 8px;
  color: #2e5f9f;
  background: #fff;
  text-decoration: none;
  font-weight: 700;
}

.alchemy-kicker {
  margin: 0 0 4px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0;
  color: #56708e;
  text-transform: uppercase;
}

.alchemy-header h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
}

.alchemy-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.alchemy-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.alchemy-summary-card,
.alchemy-panel,
.profit-item,
.material-total {
  border: 1px solid #dce4ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(23, 32, 51, 0.06);
}

.alchemy-summary-card {
  min-height: 96px;
  padding: 16px;
  display: grid;
  align-content: center;
  gap: 4px;
}

.alchemy-summary-card span,
.alchemy-summary-card em,
.profit-item span,
.material-total span {
  color: #65738a;
  font-size: 0.88rem;
  font-style: normal;
}

.alchemy-summary-card strong {
  font-size: 1.45rem;
  line-height: 1.2;
  color: #172033;
  word-break: break-word;
}

.result-card strong {
  color: #0f7a64;
}

.alchemy-panel {
  padding: 18px;
  margin-bottom: 16px;
}

.alchemy-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.alchemy-panel-head h2 {
  margin: 0 0 4px;
  font-size: 1.18rem;
  line-height: 1.3;
}

.alchemy-panel-head p {
  margin: 0;
  color: #65738a;
  font-size: 0.92rem;
}

.alchemy-table {
  width: 100%;
}

.number-input {
  width: 124px;
}

.draw-cost-field {
  display: grid;
  gap: 6px;
  color: #42526a;
  font-size: 0.9rem;
}

.draw-cost-input {
  width: 180px;
}

.material-rate-cell {
  display: grid;
  gap: 4px;
  min-width: 124px;
}

.material-rate-cell span {
  color: #65738a;
  font-size: 0.8rem;
  line-height: 1.2;
}

.material-total-grid,
.profit-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.material-total-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.profit-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.material-total,
.profit-item {
  padding: 14px;
  display: grid;
  gap: 5px;
}

.material-total strong,
.profit-item strong {
  color: #172033;
  font-size: 1.1rem;
  word-break: break-word;
}

.profit-item strong.warning {
  color: #b66d00;
}

.result-item strong {
  color: #0f7a64;
  font-size: 1.25rem;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left;
}

:deep(.el-table .cell) {
  line-height: 1.35;
}

@media (max-width: 1024px) {
  .alchemy-header {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .alchemy-back {
    width: fit-content;
    padding: 0 14px;
  }

  .alchemy-actions {
    justify-content: flex-start;
  }

  .alchemy-summary-grid,
  .material-total-grid,
  .profit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .alchemy-page {
    padding: 22px 12px 40px;
  }

  .alchemy-header h1 {
    font-size: 1.6rem;
  }

  .alchemy-summary-grid,
  .material-total-grid,
  .profit-grid {
    grid-template-columns: 1fr;
  }

  .alchemy-panel {
    padding: 14px;
  }

  .alchemy-panel-head {
    display: grid;
  }

  .draw-cost-input,
  .number-input {
    width: 100%;
  }
}
</style>
