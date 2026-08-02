<template>
  <main class="mapping-page">
    <header class="mapping-header">
      <RouterLink class="mapping-back" to="/lb">
        <el-icon><ArrowLeft /></el-icon>
        <span>LB</span>
      </RouterLink>
      <p class="mapping-kicker">LogicalByte Data Lookup</p>
      <h1>对应关系表</h1>
    </header>

    <section class="mapping-toolbar">
      <el-input
        v-model="keyword"
        class="mapping-search"
        clearable
        placeholder="搜索 ID / 名称 / 代号"
        :prefix-icon="Search"
      />
      <div class="mapping-stats">
        <span>{{ activeConfig.label }}</span>
        <strong>{{ filteredRows.length }}</strong>
        <span>/ {{ activeRows.length }}</span>
      </div>
    </section>

    <section class="mapping-layout">
      <aside class="mapping-nav" aria-label="对应关系分类">
        <button
          v-for="config in tableConfigs"
          :key="config.key"
          class="mapping-nav-item"
          :class="{ active: config.key === activeKey }"
          type="button"
          @click="activeKey = config.key"
        >
          <span>{{ config.label }}</span>
          <strong>{{ config.rows.length }}</strong>
        </button>
      </aside>

      <section class="mapping-table-panel">
        <div class="mapping-panel-head">
          <div>
            <h2>{{ activeConfig.label }}</h2>
            <p>{{ activeConfig.source }}</p>
          </div>
          <div class="mapping-panel-actions">
            <el-button
              v-if="activeConfig.reload"
              :loading="activeConfig.loading"
              @click="activeConfig.reload"
            >
              <el-icon><Refresh /></el-icon>
              <span>刷新关卡</span>
            </el-button>
            <el-button :disabled="filteredRows.length === 0" @click="copyAllFiltered">
              <el-icon><DocumentCopy /></el-icon>
              <span>复制结果</span>
            </el-button>
          </div>
        </div>

        <el-table
          :data="filteredRows"
          v-loading="activeConfig.loading"
          :element-loading-text="activeConfig.loadingText"
          border
          stripe
          height="620"
          row-key="rowKey"
          :empty-text="activeConfig.error || '没有匹配结果'"
          class="mapping-table"
        >
          <el-table-column prop="id" label="ID / 代号" min-width="210" show-overflow-tooltip />
          <el-table-column prop="name" label="名称" min-width="170" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" min-width="160" show-overflow-tooltip />
          <el-table-column prop="extra" label="备注" min-width="260" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="96">
            <template #default="{ row }">
              <el-button circle size="small" title="复制这一行" @click="copyRow(row)">
                <el-icon><DocumentCopy /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, DocumentCopy, Refresh, Search } from '@element-plus/icons-vue'

import materialItemInfo from '/src/static/json/material/item_info.json'
import customItemInfo from '/src/static/json/material/custom_item_info.json'
import itemSeriesInfo from '/src/static/json/material/item_series_info.json'
import {operatorTableV2} from '/src/utils/gameData.js'
import professionDict from '/src/static/json/operator/profession_dict.json'

const keyword = ref('')
const activeKey = ref('material')
const stageRows = ref([])
const stageLoading = ref(false)
const stageError = ref('')

const PENGUIN_STAGE_API_URL = 'https://penguin-stats.io/PenguinStats/api/v2/stages'

const professionNameMap = new Map()
const itemNameMap = new Map()

for (const item of materialItemInfo) {
  itemNameMap.set(item.itemId, item.itemName)
}

for (const item of Object.values(customItemInfo)) {
  itemNameMap.set(item.itemId, item.itemName)
}

for (const profession of professionDict) {
  professionNameMap.set(profession.value, profession.label)
  for (const child of profession.children || []) {
    professionNameMap.set(child.value, child.label)
  }
}

const materialRows = sortRows(
  materialItemInfo.map((item) =>
    createRow({
      id: item.itemId,
      name: item.itemName,
      category: item.type || '物品',
      extra: item.rarity ? `稀有度 T${item.rarity}` : '',
      source: 'src/static/json/material/item_info.json',
      aliases: [item.type, item.rarity]
    })
  )
)

const customItemRows = sortRows(
  Object.values(customItemInfo).map((item) =>
    createRow({
      id: item.itemId,
      name: item.itemName,
      category: '特殊物品',
      extra: item.description || '',
      source: 'src/static/json/material/custom_item_info.json',
      aliases: (item.list || []).map((child) => `${child.itemId} ${child.itemName}`)
    })
  )
)

const operatorRows = sortRows(
  Object.entries(operatorTableV2).map(([charId, operator]) =>
    createRow({
      id: charId,
      name: operator.name,
      category: getProfessionName(operator.profession),
      //v2 数据中 rarity 为 0-5, 转换为 1-6 星级展示
      extra: [getProfessionName(operator.subProfessionId), operatorRarityLabel(operator.rarity >= 0 && operator.rarity <= 5 ? operator.rarity + 1 : operator.rarity)]
        .filter(Boolean)
        .join(' / '),
      source: 'src/utils/gameData.js (operatorTableV2)',
      aliases: [operator.charId, operator.profession, operator.subProfessionId]
    })
  )
)

const professionRows = sortRows(
  professionDict.flatMap((profession) => [
    createRow({
      id: profession.value,
      name: profession.label,
      category: '主职业',
      extra: '',
      source: 'src/static/json/operator/profession_dict.json',
      aliases: (profession.children || []).map((child) => `${child.value} ${child.label}`)
    }),
    ...(profession.children || []).map((child) =>
      createRow({
        id: child.value,
        name: child.label,
        category: '职业分支',
        extra: `${profession.label} / ${profession.value}`,
        source: 'src/static/json/operator/profession_dict.json',
        aliases: [profession.label, profession.value]
      })
    )
  ])
)

const itemSeriesRows = sortRows(
  itemSeriesInfo.map((series) =>
    createRow({
      id: series.seriesId,
      name: series.seriesName,
      category: '材料系列',
      extra: (series.itemSeries || []).map((item) => `${item.itemName}(${item.itemId})`).join('、'),
      source: 'src/static/json/material/item_series_info.json',
      aliases: (series.itemSeries || []).map((item) => `${item.itemId} ${item.itemName}`)
    })
  )
)

const equipRows = sortRows(createEquipRows())

const tableConfigs = computed(() => [
  {
    key: 'material',
    label: '材料 / 物品',
    source: '材料 ID -> 材料名称',
    rows: materialRows
  },
  {
    key: 'custom-item',
    label: '特殊物品',
    source: '特殊物品 ID -> 物品名称',
    rows: customItemRows
  },
  {
    key: 'operator',
    label: '干员',
    source: '干员 charId -> 干员名称',
    rows: operatorRows
  },
  {
    key: 'profession',
    label: '职业 / 分支',
    source: '职业 ID -> 职业名称',
    rows: professionRows
  },
  {
    key: 'item-series',
    label: '材料系列',
    source: '材料系列 ID -> 系列名称',
    rows: itemSeriesRows
  },
  {
    key: 'equip',
    label: '模组',
    source: '模组 ID -> 模组名称',
    rows: equipRows
  },
  {
    key: 'stage',
    label: '关卡',
    source: '关卡 stageId -> 关卡代号 / 属性（Penguin Stats）',
    rows: stageRows.value,
    loading: stageLoading.value,
    loadingText: '正在加载企鹅物流关卡表',
    error: stageError.value,
    reload: () => loadStageRows(false)
  }
])

const activeConfig = computed(() => tableConfigs.value.find((config) => config.key === activeKey.value) || tableConfigs.value[0])
const activeRows = computed(() => activeConfig.value.rows)

const filteredRows = computed(() => {
  const text = normalizeText(keyword.value)
  if (!text) return activeRows.value
  return activeRows.value.filter((row) => row.searchText.includes(text))
})

onMounted(() => {
  loadStageRows(true)
})

function createEquipRows() {
  const equipMap = new Map()

  for (const operator of Object.values(operatorTableV2)) {
    for (const equip of operator.equip || []) {
      if (!equip.uniEquipId || equipMap.has(equip.uniEquipId)) continue

      equipMap.set(
        equip.uniEquipId,
        createRow({
          id: equip.uniEquipId,
          name: equip.uniEquipName,
          category: operator.name || equip.charId,
          extra: [equip.typeIcon, equip.typeName1, equip.typeName2].filter(Boolean).join(' / '),
          source: 'src/utils/gameData.js (operatorTableV2)',
          aliases: [equip.charId, operator.name, equip.uniEquipIcon, equip.typeIcon]
        })
      )
    }
  }

  return [...equipMap.values()]
}

async function loadStageRows(silent = false) {
  if (stageLoading.value) return

  stageLoading.value = true
  stageError.value = ''

  try {
    const response = await fetch(PENGUIN_STAGE_API_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const stages = await response.json()
    if (!Array.isArray(stages)) {
      throw new Error('返回数据不是关卡数组')
    }

    stageRows.value = sortRows(stages.map(createStageRow))

    if (!silent) {
      ElMessage.success('关卡表已刷新')
    }
  } catch (error) {
    stageError.value = `关卡表加载失败：${error instanceof Error ? error.message : String(error)}`
    if (!silent) {
      ElMessage.error(stageError.value)
    }
  } finally {
    stageLoading.value = false
  }
}

function createStageRow(stage) {
  const code = stage.code_i18n?.zh || stage.code || stage.stageCode || ''
  const normalDropItems = getDropItems(stage.dropInfos, 'NORMAL_DROP')
  const extraDropItems = getDropItems(stage.dropInfos, 'EXTRA_DROP')
  const regions = getExistingRegions(stage.existence)

  return createRow({
    id: stage.stageId,
    name: code,
    category: stage.stageType,
    extra: [
      stage.zoneId ? `zoneId: ${stage.zoneId}` : '',
      Number.isFinite(Number(stage.apCost)) ? `理智: ${stage.apCost}` : '',
      Number.isFinite(Number(stage.minClearTime)) ? `最短: ${formatMilliseconds(stage.minClearTime)}` : '',
      regions ? `区服: ${regions}` : '',
      normalDropItems.length ? `主掉落: ${normalDropItems.join('、')}` : '',
      extraDropItems.length ? `额外: ${extraDropItems.join('、')}` : ''
    ]
      .filter(Boolean)
      .join(' / '),
    source: PENGUIN_STAGE_API_URL,
    aliases: [
      stage.code,
      stage.code_i18n?.en,
      stage.code_i18n?.ja,
      stage.code_i18n?.ko,
      stage.code_i18n?.zh,
      stage.zoneId,
      stage.stageType,
      regions,
      ...normalDropItems,
      ...extraDropItems
    ]
  })
}

function getDropItems(dropInfos, dropType) {
  return [
    ...new Set(
      (dropInfos || [])
        .filter((drop) => drop.dropType === dropType && drop.itemId)
        .map((drop) => getItemLabel(drop.itemId))
    )
  ]
}

function getItemLabel(itemId) {
  const itemName = itemNameMap.get(itemId)
  return itemName ? `${itemName}(${itemId})` : itemId
}

function getExistingRegions(existence) {
  return Object.entries(existence || {})
    .filter(([, info]) => info?.exist)
    .map(([region]) => region)
    .join('/')
}

function formatMilliseconds(value) {
  const totalSeconds = Math.round(Number(value) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function createRow({ id, name, category, extra, source, aliases = [] }) {
  const row = {
    id: String(id || ''),
    name: String(name || ''),
    category: String(category || ''),
    extra: String(extra || ''),
    source: String(source || ''),
    aliases: aliases.filter(Boolean).map((value) => String(value))
  }

  row.rowKey = `${row.source}:${row.id}:${row.name}`
  row.searchText = normalizeText([row.id, row.name, row.category, row.extra, row.source, ...row.aliases].join(' '))
  return row
}

function sortRows(rows) {
  return rows.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true, sensitivity: 'base' }))
}

function getProfessionName(id) {
  return professionNameMap.get(id) || id || ''
}

function operatorRarityLabel(rarity) {
  if (rarity === undefined || rarity === null || rarity === '') return ''
  if (typeof rarity === 'string' && rarity.startsWith('TIER_')) {
    return `${rarity.replace('TIER_', '')}星`
  }

  const value = Number(rarity)
  return Number.isFinite(value) ? `${value}星` : String(rarity)
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function formatRow(row) {
  return [row.id, row.name, row.category, row.extra].join('\t')
}

function copyRow(row) {
  writeClipboard(formatRow(row), '已复制这一行')
}

function copyAllFiltered() {
  const content = filteredRows.value.map(formatRow).join('\n')
  writeClipboard(content, '已复制当前结果')
}

async function writeClipboard(content, message) {
  if (!content) return

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content)
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = content
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  ElMessage.success(message)
}
</script>

<style scoped>
.mapping-page {
  min-height: 100vh;
  padding: 32px 20px 48px;
  background: #f4f6f8;
  color: #172033;
}

.mapping-header,
.mapping-toolbar,
.mapping-layout {
  max-width: 1280px;
  margin: 0 auto;
}

.mapping-header {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.mapping-back {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2f6f9f;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
}

.mapping-kicker {
  margin: 0;
  color: #607184;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mapping-header h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.mapping-toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.mapping-search {
  max-width: 520px;
}

.mapping-stats {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #d9e0e8;
  border-radius: 8px;
  background: #ffffff;
  color: #5d6b7a;
  font-size: 0.92rem;
}

.mapping-stats strong {
  color: #1f5e7a;
  font-size: 1.08rem;
}

.mapping-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
}

.mapping-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mapping-nav-item {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #d9e0e8;
  border-radius: 8px;
  background: #ffffff;
  color: #243044;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease;
}

.mapping-nav-item:hover,
.mapping-nav-item.active {
  border-color: #3b82a5;
  background: #e9f5f7;
  color: #17465f;
}

.mapping-nav-item strong {
  color: #9a5a21;
  font-size: 0.82rem;
}

.mapping-table-panel {
  min-width: 0;
  border: 1px solid #d9e0e8;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.mapping-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #e5ebf1;
}

.mapping-panel-head h2 {
  margin: 0;
  color: #172033;
  font-size: 1.1rem;
  letter-spacing: 0;
}

.mapping-panel-head p {
  margin: 4px 0 0;
  color: #6c7a88;
  font-size: 0.88rem;
}

.mapping-panel-actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.mapping-table {
  width: 100%;
}

@media (max-width: 860px) {
  .mapping-page {
    padding: 24px 12px 36px;
  }

  .mapping-toolbar {
    grid-template-columns: 1fr;
  }

  .mapping-search {
    max-width: none;
  }

  .mapping-stats {
    width: fit-content;
  }

  .mapping-layout {
    grid-template-columns: 1fr;
  }

  .mapping-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mapping-panel-head {
    align-items: stretch;
    flex-direction: column;
  }

  .mapping-panel-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .mapping-nav {
    grid-template-columns: 1fr;
  }
}
</style>
