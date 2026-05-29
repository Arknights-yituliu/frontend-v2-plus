<template>
  <main class="json-compare-page">
    <header class="json-compare-header">
      <RouterLink class="json-compare-back" to="/lb">
        <el-icon><ArrowLeft /></el-icon>
        <span>LB</span>
      </RouterLink>
      <p class="json-compare-kicker">LogicalByte Drop Rate Compare</p>
      <h1>掉率数据对比</h1>
    </header>

    <section class="json-compare-toolbar">
      <el-button type="primary" :disabled="!canCompare" @click="compareDatasets">
        <el-icon><RefreshRight /></el-icon>
        <span>开始对比</span>
      </el-button>
      <el-button :disabled="filteredRows.length === 0" @click="copyResult">
        <el-icon><DocumentCopy /></el-icon>
        <span>复制筛选结果</span>
      </el-button>
      <el-button :disabled="filteredRows.length === 0" @click="exportResult">
        <el-icon><Download /></el-icon>
        <span>导出Excel数据</span>
      </el-button>
      <el-button :disabled="!hasContent" @click="clearAll">
        <el-icon><Delete /></el-icon>
        <span>清空</span>
      </el-button>
      <div class="json-compare-status" :class="statusType">
        {{ statusText }}
      </div>
    </section>

    <section class="json-compare-upload-grid">
      <article v-for="side in sides" :key="side.key" class="json-compare-panel">
        <div class="json-compare-panel-head">
          <div>
            <h2>{{ side.title }}</h2>
            <p>{{ datasetState[side.key].fileName || '未选择文件' }}</p>
          </div>
          <label class="json-compare-upload-button">
            <el-icon><UploadFilled /></el-icon>
            <span>选择 JSON</span>
            <input type="file" accept=".json,application/json" @change="onFileChange(side.key, $event)" />
          </label>
        </div>

        <div v-if="datasetState[side.key].error" class="json-compare-error">
          {{ datasetState[side.key].error }}
        </div>

        <div v-else class="json-compare-summary">
          <div class="json-compare-summary-item">
            <span>识别来源</span>
            <strong>{{ datasetState[side.key].summary.source }}</strong>
          </div>
          <div class="json-compare-summary-item">
            <span>有效记录</span>
            <strong>{{ datasetState[side.key].summary.count }}</strong>
          </div>
          <div class="json-compare-summary-item">
            <span>文件大小</span>
            <strong>{{ datasetState[side.key].fileSize }}</strong>
          </div>
        </div>

        <div class="json-compare-keys">
          <span v-for="key in datasetState[side.key].summary.keys" :key="key">{{ key }}</span>
          <em v-if="datasetState[side.key].summary.keys.length === 0">暂无字段</em>
        </div>

        <pre class="json-compare-preview">{{ datasetState[side.key].preview }}</pre>
      </article>
    </section>

    <section class="json-compare-result-panel">
      <div class="json-compare-result-head">
        <div>
          <h2>掉率差异</h2>
          <p>{{ resultSummary }}</p>
        </div>
      </div>

      <div class="json-compare-filter-grid">
        <label class="json-compare-filter-field">
          <span class="json-compare-filter-label">关卡 / 物品</span>
          <el-input
            v-model="filters.keyword"
            clearable
            placeholder="输入关卡 / 物品的 ID 或名称"
            :prefix-icon="Search"
          />
        </label>

        <label class="json-compare-filter-field">
          <span class="json-compare-filter-label">匹配状态</span>
          <el-select v-model="filters.status" placeholder="选择状态">
            <el-option label="全部状态" value="all" />
            <el-option label="双方都有" value="both" />
            <el-option label="仅 stage_drop" value="stage-only" />
            <el-option label="仅 penguin" value="penguin-only" />
          </el-select>
        </label>

        <label class="json-compare-filter-field">
          <span class="json-compare-filter-label">最小样本量</span>
          <el-input-number
            v-model="filters.minSample"
            :min="0"
            :step="100"
            controls-position="right"
            placeholder="0"
            class="json-compare-number-input"
          />
        </label>

        <label class="json-compare-filter-field">
          <span class="json-compare-filter-label">最小掉率差异(%)</span>
          <el-input-number
            v-model="filters.minDiffPercent"
            :min="0"
            :step="0.1"
            :precision="3"
            controls-position="right"
            placeholder="0"
            class="json-compare-number-input"
          />
        </label>

        <label class="json-compare-filter-field">
          <span class="json-compare-filter-label">最大掉率差异(%)</span>
          <el-input-number
            v-model="filters.maxDiffPercent"
            :min="0"
            :step="0.1"
            :precision="3"
            controls-position="right"
            placeholder="不限制"
            class="json-compare-number-input"
          />
        </label>

        <label class="json-compare-filter-field json-compare-filter-check">
          <span class="json-compare-filter-label">差异显示</span>
          <el-checkbox v-model="filters.onlyDifferent">只看双方都有且掉率不同</el-checkbox>
        </label>
      </div>

      <div class="json-compare-stats">
        <span>筛选结果 <strong>{{ filteredRows.length }}</strong> / {{ resultRows.length }}</span>
        <span>双方都有 <strong>{{ compareStats.both }}</strong></span>
        <span>仅 stage_drop <strong>{{ compareStats.stageOnly }}</strong></span>
        <span>仅 penguin <strong>{{ compareStats.penguinOnly }}</strong></span>
      </div>

      <el-table
        :data="filteredRows"
        border
        stripe
        height="560"
        row-key="rowKey"
        empty-text="暂无结果"
        class="json-compare-result-table"
        :default-sort="{ prop: 'absDiffRate', order: 'descending' }"
      >
        <el-table-column prop="statusText" label="状态" width="116" sortable show-overflow-tooltip />
        <el-table-column prop="stageId" label="关卡ID" min-width="150" sortable show-overflow-tooltip />
        <el-table-column prop="stageName" label="关卡名" min-width="120" sortable show-overflow-tooltip />
        <el-table-column prop="zoneName" label="区域" min-width="150" sortable show-overflow-tooltip />
        <el-table-column prop="itemId" label="物品ID" min-width="130" sortable show-overflow-tooltip />
        <el-table-column prop="itemName" label="物品名" min-width="140" sortable show-overflow-tooltip />
        <el-table-column prop="stageTimes" label="stage样本" width="120" sortable align="right" />
        <el-table-column prop="stageQuantity" label="stage数量" width="120" sortable align="right" />
        <el-table-column prop="stageRate" label="stage掉率" width="120" sortable align="right">
          <template #default="{ row }">{{ formatPercent(row.stageRate) }}</template>
        </el-table-column>
        <el-table-column prop="penguinTimes" label="penguin样本" width="136" sortable align="right" />
        <el-table-column prop="penguinQuantity" label="penguin数量" width="136" sortable align="right" />
        <el-table-column prop="penguinRate" label="penguin掉率" width="136" sortable align="right">
          <template #default="{ row }">{{ formatPercent(row.penguinRate) }}</template>
        </el-table-column>
        <el-table-column prop="diffRate" label="差异" width="116" sortable align="right">
          <template #default="{ row }">{{ formatSignedPercent(row.diffRate) }}</template>
        </el-table-column>
        <el-table-column prop="absDiffRate" label="绝对差异" width="124" sortable align="right">
          <template #default="{ row }">{{ formatPercent(row.absDiffRate) }}</template>
        </el-table-column>
        <el-table-column prop="sampleDiff" label="样本差" width="110" sortable align="right" />
      </el-table>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Delete, DocumentCopy, Download, RefreshRight, Search, UploadFilled } from '@element-plus/icons-vue'

import itemInfoList from '/src/static/json/material/item_info.json'
import customItemInfo from '/src/static/json/material/custom_item_info.json'
import itemSeriesInfo from '/src/static/json/material/item_series_info.json'
import tmpStageResult from '/src/static/json/material/tmp_stage_result.json'
import materialResponse from '/src/static/json/material/response.json'
import ytlStageInfo from '/src/static/json/material/ytl_stage_info.json'

const sides = [
  { key: 'left', title: '数据 A' },
  { key: 'right', title: '数据 B' }
]

const datasetState = reactive({
  left: createDatasetState(),
  right: createDatasetState()
})

const resultRows = ref([])
const resultSummary = ref('等待对比')

const filters = reactive({
  keyword: '',
  status: 'all',
  minSample: 0,
  minDiffPercent: 0,
  maxDiffPercent: undefined,
  onlyDifferent: true
})

const itemNameMap = createItemNameMap()
const stageInfoMap = createStageInfoMap()

const canCompare = computed(() => Boolean(datasetState.left.data && datasetState.right.data))
const hasContent = computed(() => Boolean(datasetState.left.data || datasetState.right.data || resultRows.value.length > 0))

const statusText = computed(() => {
  if (datasetState.left.error || datasetState.right.error) return 'JSON 解析失败'
  if (canCompare.value) return '两个文件已就绪'
  if (datasetState.left.data || datasetState.right.data) return '等待另一个文件'
  return '等待 JSON 文件'
})

const statusType = computed(() => {
  if (datasetState.left.error || datasetState.right.error) return 'error'
  if (canCompare.value) return 'ready'
  return 'pending'
})

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const minSample = Number(filters.minSample) || 0
  const minDiff = percentToRate(filters.minDiffPercent)
  const maxDiff = isFiniteNumber(filters.maxDiffPercent) ? percentToRate(filters.maxDiffPercent) : undefined

  return resultRows.value.filter((row) => {
    if (keyword && !row.searchText.includes(keyword)) return false
    if (filters.status !== 'all' && row.status !== filters.status) return false
    if (row.filterSample < minSample) return false
    if (filters.onlyDifferent && row.absDiffRate === 0 && row.status === 'both') return false
    if (row.status === 'both' && row.absDiffRate < minDiff) return false
    if (row.status === 'both' && maxDiff !== undefined && row.absDiffRate > maxDiff) return false
    return true
  })
})

const compareStats = computed(() => {
  const stats = {
    both: 0,
    stageOnly: 0,
    penguinOnly: 0
  }

  for (const row of resultRows.value) {
    if (row.status === 'both') stats.both += 1
    if (row.status === 'stage-only') stats.stageOnly += 1
    if (row.status === 'penguin-only') stats.penguinOnly += 1
  }

  return stats
})

function createDatasetState() {
  return {
    data: null,
    fileName: '',
    fileSize: '-',
    error: '',
    preview: '请选择 JSON 文件',
    summary: {
      source: '-',
      count: '-',
      keys: []
    }
  }
}

async function onFileChange(side, event) {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) return

  await loadJsonFile(side, file)
}

async function loadJsonFile(side, file) {
  const state = datasetState[side]
  state.fileName = file.name
  state.fileSize = formatFileSize(file.size)
  state.error = ''
  state.preview = '读取中...'
  state.data = null
  state.summary = createDatasetState().summary
  resultRows.value = []
  resultSummary.value = '等待对比'

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    state.data = parsed
    state.summary = summarizeDropJson(parsed, file.name)
    state.preview = createPreview(parsed)
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error)
    state.preview = '解析失败'
  }
}

function summarizeDropJson(value, fileName) {
  const sourceInfo = extractDropRows(value, fileName)

  return {
    source: sourceInfo.source,
    count: sourceInfo.rows.length,
    keys: sourceInfo.keys
  }
}

function createPreview(value) {
  const text = JSON.stringify(value, null, 2)
  if (text.length <= 5000) return text
  return `${text.slice(0, 5000)}\n...`
}

function compareDatasets() {
  if (!canCompare.value) return

  const leftNormalized = normalizeDataset(datasetState.left.data, datasetState.left.fileName)
  const rightNormalized = normalizeDataset(datasetState.right.data, datasetState.right.fileName)
  const stageDropData = pickDataset(leftNormalized, rightNormalized, 'stage')
  const penguinData = pickDataset(leftNormalized, rightNormalized, 'penguin')

  resultRows.value = compareDropRates(stageDropData, penguinData)
  resultSummary.value = [
    `stage_drop ${stageDropData.rows.length} 条`,
    `penguin ${penguinData.rows.length} 条`,
    `并集 ${resultRows.value.length} 条`,
    `交集 ${compareStats.value.both} 条`
  ].join(' / ')
}

function normalizeDataset(data, fileName) {
  return extractDropRows(data, fileName)
}

function extractDropRows(data, fileName = '') {
  const source = detectSource(data, fileName)
  const rawRows = Array.isArray(data) ? data : Array.isArray(data?.matrix) ? data.matrix : []
  const rows = rawRows
    .filter(isDropRow)
    .map((row) => ({
      stageId: String(row.stageId),
      itemId: String(row.itemId),
      times: Number(row.times),
      quantity: Number(row.quantity)
    }))

  return {
    source,
    rows,
    keys: rows[0] ? Object.keys(rows[0]) : []
  }
}

function detectSource(data, fileName) {
  const lowerName = fileName.toLowerCase()
  if (lowerName.includes('penguin')) return 'penguin_matrix'
  if (lowerName.includes('stage_drop')) return 'stage_drop'
  if (data && typeof data === 'object' && Array.isArray(data.matrix)) return 'penguin_matrix'
  if (Array.isArray(data)) return 'stage_drop'
  return 'unknown'
}

function isDropRow(row) {
  return (
    row &&
    row.stageId !== undefined &&
    row.itemId !== undefined &&
    !isIgnoredItemId(row.itemId) &&
    isFiniteNumber(Number(row.times)) &&
    isFiniteNumber(Number(row.quantity)) &&
    Number(row.times) > 0
  )
}

function isIgnoredItemId(itemId) {
  const normalizedItemId = String(itemId).toLowerCase()
  return normalizedItemId === 'furni' || normalizedItemId.includes('token')
}

function pickDataset(left, right, sourceType) {
  const matched = [left, right].find((dataset) => dataset.source.includes(sourceType))
  if (matched) return matched

  if (sourceType === 'penguin') {
    return [left, right].find((dataset) => dataset.source !== 'stage_drop') || right
  }

  return [left, right].find((dataset) => dataset.source !== 'penguin_matrix') || left
}

function compareDropRates(stageDropData, penguinData) {
  const stageMap = createDropMap(stageDropData.rows)
  const penguinMap = createDropMap(penguinData.rows)
  const rowKeys = [...new Set([...stageMap.keys(), ...penguinMap.keys()])]

  return rowKeys
    .map((rowKey) => createCompareRow(rowKey, stageMap.get(rowKey), penguinMap.get(rowKey)))
    .sort((a, b) => b.absDiffRate - a.absDiffRate || b.filterSample - a.filterSample || a.rowKey.localeCompare(b.rowKey))
}

function createDropMap(rows) {
  const map = new Map()

  for (const row of rows) {
    map.set(createDropKey(row.stageId, row.itemId), row)
  }

  return map
}

function createCompareRow(rowKey, stageRow, penguinRow) {
  const [stageId, itemId] = rowKey.split('@@')
  const stageInfo = stageInfoMap.get(stageId)
  const stageName = stageInfo?.stageName || ''
  const zoneName = stageInfo?.zoneName || ''
  const itemName = itemNameMap.get(itemId) || ''
  const stageRate = getRate(stageRow)
  const penguinRate = getRate(penguinRow)
  const diffRate = stageRate === undefined || penguinRate === undefined ? undefined : stageRate - penguinRate
  const status = stageRow && penguinRow ? 'both' : stageRow ? 'stage-only' : 'penguin-only'

  return {
    rowKey,
    stageId,
    stageName,
    zoneName,
    itemId,
    itemName,
    searchText: `${stageId} ${stageName} ${zoneName} ${itemId} ${itemName}`.toLowerCase(),
    status,
    statusText: getStatusText(status),
    stageTimes: stageRow?.times,
    stageQuantity: stageRow?.quantity,
    stageRate,
    penguinTimes: penguinRow?.times,
    penguinQuantity: penguinRow?.quantity,
    penguinRate,
    diffRate,
    absDiffRate: diffRate === undefined ? Number.POSITIVE_INFINITY : Math.abs(diffRate),
    sampleDiff: Math.abs((stageRow?.times || 0) - (penguinRow?.times || 0)),
    maxSample: Math.max(stageRow?.times || 0, penguinRow?.times || 0),
    filterSample: stageRow && penguinRow ? Math.min(stageRow.times, penguinRow.times) : Math.max(stageRow?.times || 0, penguinRow?.times || 0)
  }
}

function createDropKey(stageId, itemId) {
  return `${stageId}@@${itemId}`
}

function getRate(row) {
  if (!row || !row.times) return undefined
  return row.quantity / row.times
}

function getStatusText(status) {
  const textMap = {
    both: '双方都有',
    'stage-only': '仅stage',
    'penguin-only': '仅penguin'
  }

  return textMap[status] || status
}

function createItemNameMap() {
  const map = new Map()

  addItemRows(map, itemInfoList)
  addItemRows(map, Object.values(customItemInfo))
  addItemRows(map, itemSeriesInfo)

  return map
}

function addItemRows(map, value) {
  visitObjects(value, (item) => {
    if (item.itemId === undefined || item.itemName === undefined) return

    const itemId = String(item.itemId)
    if (!map.has(itemId)) {
      map.set(itemId, String(item.itemName))
    }
  })
}

function createStageInfoMap() {
  const map = new Map()

  addStageRows(map, tmpStageResult)
  addStageRows(map, materialResponse)
  addStageRows(map, ytlStageInfo)

  return map
}

function addStageRows(map, value) {
  visitObjects(value, (stage) => {
    if (stage.stageId === undefined) return

    const stageName = stage.stageCode || stage.stageName || stage.code || stage.name
    if (stageName === undefined) return

    const stageId = String(stage.stageId)
    if (!map.has(stageId)) {
      map.set(stageId, {
        stageName: String(stageName),
        zoneName: stage.zoneName ? String(stage.zoneName) : ''
      })
    }
  })
}

function visitObjects(value, callback) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitObjects(item, callback)
    }
    return
  }

  if (!value || typeof value !== 'object') return

  callback(value)

  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      visitObjects(child, callback)
    }
  }
}

async function copyResult() {
  if (filteredRows.value.length === 0) return

  try {
    await navigator.clipboard.writeText(JSON.stringify(createExportRows(), null, 2))
    ElMessage.success('已复制筛选结果')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

function exportResult() {
  if (filteredRows.value.length === 0) return

  const headers = getExportHeaders()
  const rows = createExportRows()
  const csv = [
    headers.map((header) => escapeCsvCell(header.label)).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header.key])).join(','))
  ].join('\r\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `drop-rate-compare-${formatDateForFileName(new Date())}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('已导出CSV，可用Excel打开')
}

function createExportRows() {
  return filteredRows.value.map((row) => ({
    status: row.statusText,
    stageId: row.stageId,
    stageName: row.stageName,
    zoneName: row.zoneName,
    itemId: row.itemId,
    itemName: row.itemName,
    stageTimes: row.stageTimes,
    stageQuantity: row.stageQuantity,
    stageRate: formatNumberForExport(row.stageRate),
    stageRatePercent: formatNumberForExport(rateToPercent(row.stageRate)),
    penguinTimes: row.penguinTimes,
    penguinQuantity: row.penguinQuantity,
    penguinRate: formatNumberForExport(row.penguinRate),
    penguinRatePercent: formatNumberForExport(rateToPercent(row.penguinRate)),
    diffRate: formatNumberForExport(row.diffRate),
    diffRatePercent: formatNumberForExport(rateToPercent(row.diffRate)),
    absDiffRate: row.absDiffRate === Number.POSITIVE_INFINITY ? undefined : formatNumberForExport(row.absDiffRate),
    absDiffRatePercent: row.absDiffRate === Number.POSITIVE_INFINITY ? undefined : formatNumberForExport(rateToPercent(row.absDiffRate)),
    sampleDiff: row.sampleDiff,
    filterSample: row.filterSample
  }))
}

function getExportHeaders() {
  return [
    { key: 'status', label: '状态' },
    { key: 'stageId', label: '关卡ID' },
    { key: 'stageName', label: '关卡名' },
    { key: 'zoneName', label: '区域' },
    { key: 'itemId', label: '物品ID' },
    { key: 'itemName', label: '物品名' },
    { key: 'stageTimes', label: 'stage样本' },
    { key: 'stageQuantity', label: 'stage数量' },
    { key: 'stageRate', label: 'stage掉率' },
    { key: 'stageRatePercent', label: 'stage掉率百分数' },
    { key: 'penguinTimes', label: 'penguin样本' },
    { key: 'penguinQuantity', label: 'penguin数量' },
    { key: 'penguinRate', label: 'penguin掉率' },
    { key: 'penguinRatePercent', label: 'penguin掉率百分数' },
    { key: 'diffRate', label: '掉率差异' },
    { key: 'diffRatePercent', label: '掉率差异百分点' },
    { key: 'absDiffRate', label: '绝对差异' },
    { key: 'absDiffRatePercent', label: '绝对差异百分点' },
    { key: 'sampleDiff', label: '样本差' },
    { key: 'filterSample', label: '筛选样本量' }
  ]
}

function escapeCsvCell(value) {
  if (value === undefined || value === null) return ''

  const text = String(value)
  if (!/[",\r\n]/.test(text)) return text

  return `"${text.replace(/"/g, '""')}"`
}

function formatNumberForExport(value) {
  if (!isFiniteNumber(value)) return undefined
  return Number(value.toFixed(10))
}

function rateToPercent(value) {
  if (!isFiniteNumber(value)) return undefined
  return value * 100
}

function formatDateForFileName(date) {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('')
}

function clearAll() {
  Object.assign(datasetState.left, createDatasetState())
  Object.assign(datasetState.right, createDatasetState())
  resultRows.value = []
  resultSummary.value = '等待对比'
}

function formatFileSize(size) {
  if (!Number.isFinite(size)) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatPercent(value) {
  if (!isFiniteNumber(value)) return '-'
  return `${(value * 100).toFixed(4)}%`
}

function formatSignedPercent(value) {
  if (!isFiniteNumber(value)) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(4)}%`
}

function percentToRate(value) {
  return (Number(value) || 0) / 100
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}
</script>

<style scoped>
.json-compare-page {
  min-height: 100vh;
  padding: 36px 0 56px;
  color: #172033;
}

.json-compare-header,
.json-compare-toolbar,
.json-compare-upload-grid,
.json-compare-result-panel {
  max-width: 1320px;
  margin-right: auto;
  margin-left: auto;
}

.json-compare-header {
  margin-bottom: 20px;
}

.json-compare-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  color: #4664c8;
  font-weight: 700;
  text-decoration: none;
}

.json-compare-kicker {
  margin: 0 0 8px;
  color: #5e6f94;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.json-compare-header h1 {
  margin: 0;
  color: #172033;
  font-size: 2rem;
}

.json-compare-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid rgba(70, 100, 200, 0.14);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.06);
}

.json-compare-status {
  margin-left: auto;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 700;
}

.json-compare-status.pending {
  background: #eef2f8;
  color: #5e6f94;
}

.json-compare-status.ready {
  background: #e8f6ee;
  color: #1c7d48;
}

.json-compare-status.error {
  background: #fff0f0;
  color: #c03535;
}

.json-compare-upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.json-compare-panel,
.json-compare-result-panel {
  border: 1px solid rgba(70, 100, 200, 0.14);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.06);
}

.json-compare-panel {
  min-width: 0;
  padding: 18px;
}

.json-compare-panel-head,
.json-compare-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.json-compare-panel-head h2,
.json-compare-result-head h2 {
  margin: 0 0 4px;
  color: #172033;
  font-size: 1.15rem;
}

.json-compare-panel-head p,
.json-compare-result-head p {
  margin: 0;
  color: #68748d;
  font-size: 0.92rem;
}

.json-compare-upload-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 6px;
  min-height: 32px;
  padding: 7px 12px;
  border-radius: 6px;
  background: #4664c8;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.json-compare-upload-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.json-compare-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.json-compare-summary-item {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  border: 1px solid #edf0f6;
  border-radius: 6px;
  background: #f8fafc;
}

.json-compare-summary-item span {
  color: #68748d;
  font-size: 0.8rem;
}

.json-compare-summary-item strong {
  overflow: hidden;
  color: #172033;
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-compare-error {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #fff0f0;
  color: #c03535;
  font-size: 0.92rem;
}

.json-compare-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 30px;
  margin-bottom: 12px;
}

.json-compare-keys span,
.json-compare-keys em {
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef2f8;
  color: #51617f;
  font-size: 0.82rem;
  font-style: normal;
}

.json-compare-preview {
  height: 260px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid #edf0f6;
  border-radius: 6px;
  background: #101827;
  color: #dbe5ff;
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.84rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.json-compare-result-panel {
  padding: 18px;
}

.json-compare-filter-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) minmax(130px, 0.8fr) repeat(3, minmax(130px, 0.8fr)) minmax(130px, 0.7fr);
  gap: 12px;
  align-items: end;
  margin-bottom: 12px;
}

.json-compare-filter-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.json-compare-filter-label {
  color: #596780;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.2;
}

.json-compare-filter-check {
  align-self: stretch;
}

.json-compare-filter-check :deep(.el-checkbox) {
  min-height: 32px;
  margin-right: 0;
  white-space: normal;
}

.json-compare-number-input {
  width: 100%;
}

.json-compare-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  color: #596780;
  font-size: 0.92rem;
}

.json-compare-stats span {
  padding: 5px 10px;
  border-radius: 999px;
  background: #f1f4fa;
}

.json-compare-stats strong {
  color: #172033;
}

.json-compare-result-table {
  width: 100%;
}

@media (max-width: 1100px) {
  .json-compare-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .json-compare-upload-grid {
    grid-template-columns: 1fr;
  }

  .json-compare-toolbar {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .json-compare-status {
    width: 100%;
    margin-left: 0;
    text-align: center;
  }
}

@media (max-width: 640px) {
  .json-compare-page {
    padding-top: 24px;
  }

  .json-compare-toolbar,
  .json-compare-panel,
  .json-compare-result-panel {
    padding: 12px;
  }

  .json-compare-summary,
  .json-compare-filter-grid {
    grid-template-columns: 1fr;
  }

  .json-compare-panel-head,
  .json-compare-result-head {
    flex-direction: column;
  }
}
</style>
