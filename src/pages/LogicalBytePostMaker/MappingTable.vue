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
          <el-button :disabled="filteredRows.length === 0" @click="copyAllFiltered">
            <el-icon><DocumentCopy /></el-icon>
            <span>复制结果</span>
          </el-button>
        </div>

        <el-table
          :data="filteredRows"
          border
          stripe
          height="620"
          row-key="rowKey"
          empty-text="没有匹配结果"
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
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, DocumentCopy, Search } from '@element-plus/icons-vue'

import materialItemInfo from '/src/static/json/material/item_info.json'
import customItemInfo from '/src/static/json/material/custom_item_info.json'
import itemSeriesInfo from '/src/static/json/material/item_series_info.json'
import operatorTableSimple from '/src/static/json/operator/character_table_simple.json'
import professionDict from '/src/static/json/operator/profession_dict.json'

const keyword = ref('')
const activeKey = ref('material')

const professionNameMap = new Map()

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
  Object.entries(operatorTableSimple).map(([charId, operator]) =>
    createRow({
      id: charId,
      name: operator.name,
      category: getProfessionName(operator.profession),
      extra: [getProfessionName(operator.subProfessionId), operatorRarityLabel(operator.rarity)]
        .filter(Boolean)
        .join(' / '),
      source: 'src/static/json/operator/character_table_simple.json',
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

const tableConfigs = [
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
  }
]

const activeConfig = computed(() => tableConfigs.find((config) => config.key === activeKey.value) || tableConfigs[0])
const activeRows = computed(() => activeConfig.value.rows)

const filteredRows = computed(() => {
  const text = normalizeText(keyword.value)
  if (!text) return activeRows.value
  return activeRows.value.filter((row) => row.searchText.includes(text))
})

function createEquipRows() {
  const equipMap = new Map()

  for (const operator of Object.values(operatorTableSimple)) {
    for (const equip of operator.equip || []) {
      if (!equip.uniEquipId || equipMap.has(equip.uniEquipId)) continue

      equipMap.set(
        equip.uniEquipId,
        createRow({
          id: equip.uniEquipId,
          name: equip.uniEquipName,
          category: operator.name || equip.charId,
          extra: [equip.typeIcon, equip.typeName1, equip.typeName2].filter(Boolean).join(' / '),
          source: 'src/static/json/operator/character_table_simple.json',
          aliases: [equip.charId, operator.name, equip.uniEquipIcon, equip.typeIcon]
        })
      )
    }
  }

  return [...equipMap.values()]
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
}

@media (max-width: 520px) {
  .mapping-nav {
    grid-template-columns: 1fr;
  }
}
</style>
