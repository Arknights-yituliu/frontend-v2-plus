<template>
  <main class="pack-proofread-page">
    <header class="pack-proofread-header">
      <RouterLink class="pack-proofread-back" to="/lb">
        <el-icon><ArrowLeft /></el-icon>
        <span>LB</span>
      </RouterLink>
      <p class="pack-proofread-kicker">LogicalByte Pack Proofread</p>
      <h1>礼包校队</h1>
    </header>

    <section class="pack-proofread-toolbar">
      <el-input
        v-model="sourceUrl"
        clearable
        placeholder="输入含有礼包文本的 URL"
        class="pack-proofread-url"
        @keyup.enter="fetchUrlContent"
      >
        <template #prepend>URL</template>
      </el-input>
      <el-button type="primary" :loading="fetching" @click="fetchUrlContent">
        <el-icon><Search /></el-icon>
        <span>读取</span>
      </el-button>
      <el-button type="success" :disabled="!sourceText.trim()" @click="parseAndCompare">
        <el-icon><RefreshRight /></el-icon>
        <span>校对</span>
      </el-button>
      <el-button :disabled="compareRows.length === 0" @click="copyResult">
        <el-icon><DocumentCopy /></el-icon>
        <span>复制结果</span>
      </el-button>
      <el-button :disabled="!sourceText && compareRows.length === 0" @click="clearAll">
        <el-icon><Delete /></el-icon>
        <span>清空</span>
      </el-button>
    </section>

    <section class="pack-proofread-inputs">
      <label class="pack-proofread-editor">
        <span>页面正文</span>
        <el-input
          v-model="sourceText"
          type="textarea"
          :rows="14"
          resize="vertical"
          placeholder="[礼包名称]&#10;&#10;售卖时间：07月10日 12:00 - 07月31日 03:59&#10;&#10;组合包内容：物品A*1、物品B*2"
        />
      </label>

      <aside class="pack-proofread-status">
        <div class="pack-proofread-status-item">
          <span>收录礼包</span>
          <strong>{{ packInfoList.length }}</strong>
        </div>
        <div class="pack-proofread-status-item">
          <span>识别礼包</span>
          <strong>{{ compareSummary.total }}</strong>
        </div>
        <div class="pack-proofread-status-item success">
          <span>一致</span>
          <strong>{{ compareSummary.ok }}</strong>
        </div>
        <div class="pack-proofread-status-item warning">
          <span>有差异</span>
          <strong>{{ compareSummary.diff }}</strong>
        </div>
        <div class="pack-proofread-status-item danger">
          <span>未匹配</span>
          <strong>{{ compareSummary.missing }}</strong>
        </div>
      </aside>
    </section>

    <section class="pack-proofread-result-panel">
      <div class="pack-proofread-result-head">
        <div>
          <h2>校对结果</h2>
          <p>{{ resultSummaryText }}</p>
        </div>
        <div class="pack-proofread-filters">
          <el-input
            v-model="filters.keyword"
            clearable
            placeholder="筛选礼包或物品"
            :prefix-icon="Search"
          />
          <el-select v-model="filters.status" placeholder="状态">
            <el-option label="全部" value="all" />
            <el-option label="完全一致" value="ok" />
            <el-option label="存在差异" value="diff" />
            <el-option label="未匹配" value="missing" />
          </el-select>
        </div>
      </div>

      <el-table
        :data="filteredRows"
        border
        stripe
        row-key="rowKey"
        empty-text="暂无结果"
        class="pack-proofread-table"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="pack-proofread-detail">
              <div class="pack-proofread-detail-grid">
                <div>
                  <h3>公告内容</h3>
                  <p>{{ row.sourceContentText || '未识别到组合包内容' }}</p>
                </div>
                <div>
                  <h3>/material/pack 收录</h3>
                  <p>{{ row.recordedContentText || '未匹配到收录礼包' }}</p>
                </div>
              </div>

              <el-table
                v-if="row.contentDiffs.length > 0"
                :data="row.contentDiffs"
                size="small"
                border
                class="pack-proofread-diff-table"
              >
                <el-table-column prop="itemName" label="物品" min-width="180" show-overflow-tooltip />
                <el-table-column prop="sourceQuantity" label="公告数量" width="120" align="right" />
                <el-table-column prop="recordedQuantity" label="收录数量" width="120" align="right" />
                <el-table-column prop="statusText" label="差异" min-width="140" />
              </el-table>

              <div v-if="row.suggestions.length > 0" class="pack-proofread-suggestions">
                可能相关：{{ row.suggestions.join('、') }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="sourceName" label="公告礼包" min-width="180" show-overflow-tooltip />
        <el-table-column prop="recordedName" label="收录礼包" min-width="180" show-overflow-tooltip />
        <el-table-column prop="sourceSaleTime" label="公告售卖时间" min-width="210" show-overflow-tooltip />
        <el-table-column prop="recordedSaleTime" label="收录售卖时间" min-width="210" show-overflow-tooltip />
        <el-table-column prop="timeStatusText" label="时间" width="116">
          <template #default="{ row }">
            <el-tag :type="getDiffTagType(row.timeStatus)">{{ row.timeStatusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contentStatusText" label="内容" width="116">
          <template #default="{ row }">
            <el-tag :type="getDiffTagType(row.contentStatus)">{{ row.contentStatusText }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Delete, DocumentCopy, RefreshRight, Search } from '@element-plus/icons-vue'

import packInfoCache from '/src/plugins/indexedDB/packInfoCache.js'
import { dateFormat } from '/src/utils/dateUtil.js'

const OFFICIAL_NEWS_ORIGIN = 'https://ak.hypergryph.com'
const OFFICIAL_NEWS_PROXY_PREFIX = '/official-news-proxy'

const GACHA_ITEM_FIELDS = [
  { key: 'orundum', itemName: '合成玉' },
  { key: 'originium', itemName: '至纯源石' },
  { key: 'gachaTicket', itemName: '寻访凭证' },
  { key: 'tenGachaTicket', itemName: '十连寻访凭证' }
]

const sourceUrl = ref('')
const sourceText = ref('')
const fetching = ref(false)
const packInfoList = ref([])
const compareRows = ref([])

const filters = reactive({
  keyword: '',
  status: 'all'
})

const compareSummary = computed(() => {
  const total = compareRows.value.length
  const ok = compareRows.value.filter(row => row.status === 'ok').length
  const missing = compareRows.value.filter(row => row.status === 'missing').length
  return {
    total,
    ok,
    missing,
    diff: total - ok - missing
  }
})

const resultSummaryText = computed(() => {
  if (compareRows.value.length === 0) return '等待读取或粘贴礼包公告文本'
  return `共识别 ${compareSummary.value.total} 个礼包，${compareSummary.value.ok} 个一致，${compareSummary.value.diff} 个存在差异，${compareSummary.value.missing} 个未匹配`
})

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return compareRows.value.filter(row => {
    const statusMatched = filters.status === 'all' || row.status === filters.status
    const keywordMatched = !keyword || [
      row.sourceName,
      row.recordedName,
      row.sourceContentText,
      row.recordedContentText
    ].some(text => String(text || '').toLowerCase().includes(keyword))
    return statusMatched && keywordMatched
  })
})

onMounted(async () => {
  await loadPackInfo()
})

async function loadPackInfo() {
  try {
    packInfoList.value = await packInfoCache.listPackInfo()
  } catch (error) {
    ElMessage.error(`礼包收录数据加载失败：${getErrorMessage(error)}`)
  }
}

async function fetchUrlContent() {
  const url = sourceUrl.value.trim()
  if (!url) {
    ElMessage.warning('请先输入 URL')
    return
  }

  fetching.value = true
  try {
    const response = await fetch(getFetchUrl(url), {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7'
      }
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const contentType = response.headers.get('content-type') || ''
    const body = await response.text()
    sourceText.value = extractReadableText(body, contentType)
    parseAndCompare()
    ElMessage.success('页面内容已读取')
  } catch (error) {
    ElMessage.error(`读取失败：${getErrorMessage(error)}。可以把页面正文粘贴到文本框后继续校对。`)
  } finally {
    fetching.value = false
  }
}

function parseAndCompare() {
  const parsedPacks = parsePackText(sourceText.value)
  if (parsedPacks.length === 0) {
    compareRows.value = []
    ElMessage.warning('没有识别到礼包块，请确认文本里包含 [礼包名称]、售卖时间和组合包内容')
    return
  }

  compareRows.value = parsedPacks.map((pack, index) => createCompareRow(pack, index))
}

function clearAll() {
  sourceText.value = ''
  sourceUrl.value = ''
  compareRows.value = []
}

async function copyResult() {
  const rows = compareRows.value.map(row => ({
    sourceName: row.sourceName,
    recordedName: row.recordedName,
    status: row.statusText,
    sourceSaleTime: row.sourceSaleTime,
    recordedSaleTime: row.recordedSaleTime,
    timeStatus: row.timeStatusText,
    contentStatus: row.contentStatusText,
    contentDiffs: row.contentDiffs
  }))

  try {
    await navigator.clipboard.writeText(JSON.stringify(rows, null, 2))
    ElMessage.success('已复制校对结果')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

function getFetchUrl(url) {
  const parsedUrl = new URL(url)
  if (parsedUrl.origin === OFFICIAL_NEWS_ORIGIN) {
    return `${OFFICIAL_NEWS_PROXY_PREFIX}${parsedUrl.pathname}${parsedUrl.search}`
  }
  return parsedUrl.toString()
}

function extractReadableText(body, contentType) {
  const normalizedBody = normalizeOfficialNewsHtml(body)
  const looksLikeHtml = contentType.includes('html') || /<\/?[a-z][\s\S]*>/i.test(normalizedBody)
  if (!looksLikeHtml) {
    return normalizeSourceText(decodeHtmlText(normalizedBody))
  }

  const parser = new DOMParser()
  const documentFromHtml = parser.parseFromString(normalizedBody, 'text/html')
  const clonedDocument = documentFromHtml.cloneNode(true)
  clonedDocument.querySelectorAll('style,noscript,svg').forEach(element => element.remove())
  const visibleText = clonedDocument.body?.innerText || clonedDocument.body?.textContent || ''

  if (visibleText.includes('售卖时间') || visibleText.includes('组合包内容')) {
    return normalizeSourceText(decodeHtmlText(visibleText))
  }

  const fallbackText = normalizedBody
    .replace(/<script[^>]*>/gi, '\n')
    .replace(/<\/script>/gi, '\n')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')

  return normalizeSourceText(decodeHtmlText(fallbackText))
}

function normalizeOfficialNewsHtml(html) {
  return String(html || '')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
}

function decodeHtmlText(text) {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = String(text || '')
  return textarea.value
}

function normalizeSourceText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parsePackText(text) {
  const normalizedText = normalizeSourceText(text)
  if (!normalizedText) return []

  const chunks = splitPackChunks(normalizedText)
  const parsedPacks = chunks.map(chunk => parsePackChunk(chunk)).filter(pack => pack.name)

  if (parsedPacks.length > 0) {
    return parsedPacks
  }

  const fallbackName = extractFallbackName(normalizedText)
  if (!fallbackName) return []
  return [parsePackChunk({ name: fallbackName, body: normalizedText })].filter(pack => pack.name)
}

function splitPackChunks(text) {
  const headingPattern = /(?:^|\n)\s*[\[【]([^\]】\n]+)[\]】]\s*/g
  const matches = []
  let match = headingPattern.exec(text)
  while (match) {
    matches.push({
      name: match[1].trim(),
      start: match.index,
      bodyStart: headingPattern.lastIndex
    })
    match = headingPattern.exec(text)
  }

  return matches.map((item, index) => ({
    name: item.name,
    body: text.slice(item.bodyStart, matches[index + 1]?.start || text.length)
  }))
}

function parsePackChunk(chunk) {
  const saleTimeRaw = extractSingleLineField(chunk.body, ['售卖时间'])
  const contentRaw = extractSingleLineField(chunk.body, ['组合包内容', '礼包内容', '内含内容', '礼包内含'])

  return {
    name: chunk.name,
    saleTimeRaw,
    saleTimeKey: parseSaleTimeKey(saleTimeRaw),
    contentRaw,
    contentItems: parseContentItems(contentRaw)
  }
}

function extractFallbackName(text) {
  const namedField = text.match(/(?:礼包名称|名称)\s*[:：]\s*([^\n]+)/)
  if (namedField?.[1]) return stripBracket(namedField[1])

  const bracketField = text.match(/[\[【]([^\]】\n]+)[\]】]/)
  return bracketField?.[1]?.trim() || ''
}

function extractSingleLineField(text, fieldNames) {
  const lines = normalizeSourceText(text).split('\n')
  for (const line of lines) {
    const match = matchFieldLine(line, fieldNames)
    if (match) return match.value
  }
  return ''
}

function matchFieldLine(line, fieldNames) {
  for (const fieldName of fieldNames) {
    const pattern = new RegExp(`^${escapeRegExp(fieldName)}\\s*[:：]\\s*(.*)$`)
    const match = line.trim().match(pattern)
    if (match) {
      return {
        fieldName,
        value: match[1].trim()
      }
    }
  }
  return null
}

function parseContentItems(text) {
  return String(text || '')
    .replace(/(?:组合包内容|礼包内容|内含内容|礼包内含)\s*[:：]/g, '')
    .replace(/\s+/g, '')
    .replace(/[，,；;]/g, '、')
    .split(/、|\n/)
    .map(token => token.trim())
    .filter(Boolean)
    .map(parseContentToken)
    .filter(Boolean)
}

function parseContentToken(token) {
  const normalizedToken = token.replace(/[＊×xX]/g, '*')
  const starMatch = normalizedToken.match(/^(.+?)\*(\d+(?:\.\d+)?)$/)
  if (starMatch) {
    return {
      itemName: normalizeDisplayItemName(starMatch[1]),
      quantity: Number(starMatch[2])
    }
  }

  const plainMatch = normalizedToken.match(/^(.+?)(\d+(?:\.\d+)?)$/)
  if (plainMatch) {
    return {
      itemName: normalizeDisplayItemName(plainMatch[1]),
      quantity: Number(plainMatch[2])
    }
  }

  return {
    itemName: normalizeDisplayItemName(normalizedToken),
    quantity: 0
  }
}

function createCompareRow(parsedPack, index) {
  const matchResult = findBestPack(parsedPack.name)
  const recordedPack = matchResult.pack
  const recordedItems = recordedPack ? getRecordedContentItems(recordedPack) : []
  const timeCompare = compareSaleTime(parsedPack, recordedPack)
  const contentCompare = compareContent(parsedPack.contentItems, recordedItems)
  const status = getRowStatus(recordedPack, timeCompare.status, contentCompare.status)

  return {
    rowKey: `${parsedPack.name}-${index}`,
    sourceName: parsedPack.name,
    recordedName: recordedPack?.officialName || recordedPack?.displayName || '',
    status,
    statusText: getRowStatusText(status),
    sourceSaleTime: parsedPack.saleTimeRaw || '未识别',
    recordedSaleTime: recordedPack ? formatRecordedSaleTime(recordedPack) : '',
    timeStatus: timeCompare.status,
    timeStatusText: timeCompare.text,
    contentStatus: contentCompare.status,
    contentStatusText: contentCompare.text,
    sourceContentText: formatItemList(parsedPack.contentItems),
    recordedContentText: formatItemList(recordedItems),
    contentDiffs: contentCompare.diffs,
    suggestions: matchResult.suggestions
  }
}

function findBestPack(sourceName) {
  const normalizedSourceName = normalizeName(sourceName)
  const scoredPacks = packInfoList.value
    .map(pack => {
      const names = [pack.officialName, pack.displayName].filter(Boolean)
      const score = Math.max(...names.map(name => getNameScore(normalizedSourceName, normalizeName(name))))
      return {
        pack,
        score
      }
    })
    .sort((a, b) => b.score - a.score)

  const best = scoredPacks[0]
  const suggestions = scoredPacks
    .slice(0, 3)
    .filter(item => item.score >= 0.45)
    .map(item => item.pack.officialName || item.pack.displayName)

  if (!best || best.score < 0.72) {
    return {
      pack: null,
      suggestions
    }
  }

  return {
    pack: best.pack,
    suggestions: []
  }
}

function getNameScore(sourceName, targetName) {
  if (!sourceName || !targetName) return 0
  if (sourceName === targetName) return 1
  if (sourceName.includes(targetName) || targetName.includes(sourceName)) return 0.92
  return getDiceCoefficient(sourceName, targetName)
}

function getDiceCoefficient(left, right) {
  if (left.length < 2 || right.length < 2) return left === right ? 1 : 0
  const leftBigrams = new Map()
  for (let index = 0; index < left.length - 1; index += 1) {
    const bigram = left.slice(index, index + 2)
    leftBigrams.set(bigram, (leftBigrams.get(bigram) || 0) + 1)
  }

  let intersection = 0
  for (let index = 0; index < right.length - 1; index += 1) {
    const bigram = right.slice(index, index + 2)
    const count = leftBigrams.get(bigram) || 0
    if (count > 0) {
      leftBigrams.set(bigram, count - 1)
      intersection += 1
    }
  }

  return (2 * intersection) / (left.length + right.length - 2)
}

function compareSaleTime(parsedPack, recordedPack) {
  if (!recordedPack) {
    return {
      status: 'missing',
      text: '未匹配'
    }
  }
  if (!parsedPack.saleTimeRaw || !parsedPack.saleTimeKey) {
    return {
      status: 'missing',
      text: '未识别'
    }
  }

  const recordedSaleTimeKey = getRecordedSaleTimeKey(recordedPack)
  return parsedPack.saleTimeKey === recordedSaleTimeKey
    ? { status: 'ok', text: '一致' }
    : { status: 'diff', text: '不一致' }
}

function compareContent(sourceItems, recordedItems) {
  if (sourceItems.length === 0) {
    return {
      status: 'missing',
      text: '未识别',
      diffs: []
    }
  }

  const sourceMap = createItemQuantityMap(sourceItems)
  const recordedMap = createItemQuantityMap(recordedItems)
  const itemKeys = Array.from(new Set([...sourceMap.quantity.keys(), ...recordedMap.quantity.keys()]))
  const diffs = itemKeys
    .map(key => {
      const sourceQuantity = sourceMap.quantity.get(key) || 0
      const recordedQuantity = recordedMap.quantity.get(key) || 0
      if (sourceQuantity === recordedQuantity) return null

      return {
        itemName: sourceMap.name.get(key) || recordedMap.name.get(key) || key,
        sourceQuantity,
        recordedQuantity,
        statusText: getContentDiffText(sourceQuantity, recordedQuantity)
      }
    })
    .filter(Boolean)

  return diffs.length === 0
    ? { status: 'ok', text: '一致', diffs }
    : { status: 'diff', text: `${diffs.length} 项差异`, diffs }
}

function createItemQuantityMap(items) {
  const quantity = new Map()
  const name = new Map()

  for (const item of items) {
    const key = normalizeItemName(item.itemName)
    if (!key) continue
    quantity.set(key, (quantity.get(key) || 0) + Number(item.quantity || 0))
    if (!name.has(key)) {
      name.set(key, normalizeDisplayItemName(item.itemName))
    }
  }

  return {
    quantity,
    name
  }
}

function getRecordedContentItems(pack) {
  const items = []
  for (const field of GACHA_ITEM_FIELDS) {
    const quantity = Number(pack[field.key] || 0)
    if (quantity > 0) {
      items.push({
        itemName: field.itemName,
        quantity
      })
    }
  }

  for (const item of pack.packContent || []) {
    items.push({
      itemName: item.itemName,
      quantity: Number(item.quantity || 0)
    })
  }

  return items
}

function getRowStatus(recordedPack, timeStatus, contentStatus) {
  if (!recordedPack) return 'missing'
  if (timeStatus === 'ok' && contentStatus === 'ok') return 'ok'
  return 'diff'
}

function getRowStatusText(status) {
  const statusTextMap = {
    ok: '完全一致',
    diff: '存在差异',
    missing: '未匹配'
  }
  return statusTextMap[status] || status
}

function getContentDiffText(sourceQuantity, recordedQuantity) {
  if (sourceQuantity === 0) return '收录多出'
  if (recordedQuantity === 0) return '收录缺少'
  return `数量差 ${recordedQuantity - sourceQuantity}`
}

function parseSaleTimeKey(text) {
  const matches = Array.from(String(text || '').matchAll(/(?:\d{4}年)?\s*(\d{1,2})月(\d{1,2})日\s*(\d{1,2})[:：](\d{1,2})/g))
  if (matches.length < 2) return ''
  return matches
    .slice(0, 2)
    .map(match => `${pad2(match[1])}-${pad2(match[2])} ${pad2(match[3])}:${pad2(match[4])}`)
    .join(' - ')
}

function getRecordedSaleTimeKey(pack) {
  return [
    dateFormat(pack.start, 'MM-dd HH:mm'),
    dateFormat(pack.end, 'MM-dd HH:mm')
  ].join(' - ')
}

function formatRecordedSaleTime(pack) {
  return [
    dateFormat(pack.start, 'MM月dd日 HH:mm'),
    dateFormat(pack.end, 'MM月dd日 HH:mm')
  ].join(' - ')
}

function formatItemList(items) {
  return items
    .filter(item => item.quantity !== 0)
    .map(item => `${normalizeDisplayItemName(item.itemName)}*${item.quantity}`)
    .join('、')
}

function normalizeDisplayItemName(name) {
  return String(name || '').replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim()
}

function normalizeItemName(name) {
  const normalizedName = normalizeDisplayItemName(name).replace(/\s+/g, '')
  const aliasMap = {
    源石: '至纯源石',
    至纯源石: '至纯源石',
    合成玉: '合成玉',
    寻访凭证: '寻访凭证',
    单抽券: '寻访凭证',
    十连寻访凭证: '十连寻访凭证',
    十连券: '十连寻访凭证'
  }
  return aliasMap[normalizedName] || normalizedName
}

function normalizeName(name) {
  return String(name || '')
    .replace(/[\s"'“”‘’\[\]【】]/g, '')
    .toLowerCase()
}

function stripBracket(text) {
  return String(text || '').replace(/^[\[【]\s*/, '').replace(/\s*[\]】]$/, '').trim()
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getStatusTagType(status) {
  if (status === 'ok') return 'success'
  if (status === 'missing') return 'danger'
  return 'warning'
}

function getDiffTagType(status) {
  if (status === 'ok') return 'success'
  if (status === 'missing') return 'info'
  return 'warning'
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<style scoped>
.pack-proofread-page {
  min-height: 100vh;
  padding: 40px 20px 56px;
  background:
    linear-gradient(135deg, rgba(247, 250, 255, 0.94) 0%, rgba(240, 246, 242, 0.96) 48%, rgba(255, 250, 240, 0.92) 100%),
    repeating-linear-gradient(90deg, rgba(28, 35, 53, 0.04) 0 1px, transparent 1px 24px);
  color: #1f2a36;
}

.pack-proofread-header,
.pack-proofread-toolbar,
.pack-proofread-inputs,
.pack-proofread-result-panel {
  max-width: 1180px;
  margin: 0 auto;
}

.pack-proofread-header {
  margin-bottom: 22px;
}

.pack-proofread-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  color: #2f5d62;
  text-decoration: none;
  font-weight: 700;
}

.pack-proofread-kicker {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #2f5d62;
}

.pack-proofread-header h1 {
  margin: 0;
  font-size: 2.4rem;
  color: #16202a;
}

.pack-proofread-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) repeat(4, auto);
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.pack-proofread-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 16px;
  margin-bottom: 18px;
}

.pack-proofread-editor {
  display: grid;
  gap: 8px;
  font-weight: 700;
}

.pack-proofread-status {
  display: grid;
  gap: 10px;
  align-content: start;
}

.pack-proofread-status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid rgba(31, 42, 54, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.pack-proofread-status-item span {
  font-size: 0.9rem;
  color: #637083;
}

.pack-proofread-status-item strong {
  font-size: 1.35rem;
  color: #1f2a36;
}

.pack-proofread-status-item.success strong {
  color: #23734d;
}

.pack-proofread-status-item.warning strong {
  color: #b86500;
}

.pack-proofread-status-item.danger strong {
  color: #b83b3b;
}

.pack-proofread-result-panel {
  height: auto;
  max-height: none;
  overflow: visible;
  padding: 18px;
  border: 1px solid rgba(31, 42, 54, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 16px 40px rgba(31, 42, 54, 0.08);
}

.pack-proofread-result-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 14px;
}

.pack-proofread-result-head h2 {
  margin: 0 0 4px;
  font-size: 1.2rem;
}

.pack-proofread-result-head p {
  margin: 0;
  color: #647083;
}

.pack-proofread-filters {
  display: grid;
  grid-template-columns: 220px 132px;
  gap: 10px;
}

.pack-proofread-table {
  height: auto;
  max-height: none;
  width: 100%;
}

.pack-proofread-table :deep(.el-table__inner-wrapper),
.pack-proofread-table :deep(.el-table__body-wrapper),
.pack-proofread-table :deep(.el-scrollbar__wrap),
.pack-proofread-table :deep(.el-scrollbar__view) {
  height: auto;
  max-height: none;
}

.pack-proofread-detail {
  height: auto;
  max-height: none;
  overflow: visible;
  padding: 14px 18px;
  background: #f7faf9;
}

.pack-proofread-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 14px;
}

.pack-proofread-detail h3 {
  margin: 0 0 6px;
  font-size: 0.96rem;
  color: #1f2a36;
}

.pack-proofread-detail p {
  margin: 0;
  color: #526071;
  line-height: 1.7;
  word-break: break-word;
}

.pack-proofread-diff-table {
  margin-top: 10px;
}

.pack-proofread-suggestions {
  margin-top: 10px;
  color: #6d5a00;
}

@media (max-width: 900px) {
  .pack-proofread-toolbar,
  .pack-proofread-inputs,
  .pack-proofread-result-head,
  .pack-proofread-detail-grid {
    grid-template-columns: 1fr;
  }

  .pack-proofread-result-head {
    display: grid;
  }

  .pack-proofread-filters {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .pack-proofread-page {
    padding: 28px 12px 40px;
  }

  .pack-proofread-toolbar {
    gap: 8px;
  }

  .pack-proofread-toolbar :deep(.el-button) {
    width: 100%;
  }

  .pack-proofread-result-panel {
    padding: 12px;
  }
}
</style>
