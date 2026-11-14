<template>
  <main class="json-to-excel-page">
    <header class="json-to-excel-header">
      <RouterLink class="json-to-excel-back" to="/lb">
        <el-icon><ArrowLeft /></el-icon>
        <span>LB</span>
      </RouterLink>
      <p class="json-to-excel-kicker">LogicalByte Data Tool</p>
      <h1>json拆excel</h1>
      <p class="json-to-excel-description">
        粘贴或导入 JSON，选择需要展开的数组并导出为 Excel。数据只在当前浏览器中处理。
      </p>
    </header>

    <section class="json-to-excel-toolbar" aria-label="JSON 工具操作">
      <el-button type="primary" :disabled="!inputText.trim()" @click="parseInput">
        <el-icon><RefreshRight /></el-icon>
        <span>解析 JSON</span>
      </el-button>
      <label class="json-to-excel-upload-button">
        <el-icon><UploadFilled /></el-icon>
        <span>导入 JSON</span>
        <input ref="fileInput" type="file" accept=".json,application/json" @change="loadFile" />
      </label>
      <el-button :disabled="!canExport" @click="exportExcel">
        <el-icon><Download /></el-icon>
        <span>导出 Excel</span>
      </el-button>
      <el-button :disabled="!canExport" @click="copyTable">
        <el-icon><CopyDocument /></el-icon>
        <span>复制表格内容</span>
      </el-button>
      <el-button :disabled="!hasContent" @click="clearAll">
        <el-icon><Delete /></el-icon>
        <span>清空</span>
      </el-button>
      <span class="json-to-excel-status" :class="statusType" role="status">{{ statusText }}</span>
    </section>

    <section class="json-to-excel-workspace">
      <article class="json-to-excel-panel json-to-excel-input-panel">
        <div class="json-to-excel-panel-heading">
          <div>
            <h2>JSON 输入</h2>
            <p>{{ fileName || '支持直接粘贴 JSON 文本' }}</p>
          </div>
          <span class="json-to-excel-panel-meta">{{ inputText.length.toLocaleString() }} 字符</span>
        </div>
        <el-input
          v-model="inputText"
          class="json-to-excel-input"
          type="textarea"
          :rows="24"
          resize="vertical"
          spellcheck="false"
          placeholder='在这里粘贴 JSON，例如 {"data":{"list":[]}}'
        />
      </article>

      <article class="json-to-excel-panel json-to-excel-options-panel">
        <div class="json-to-excel-panel-heading">
          <div>
            <h2>解析选项</h2>
            <p>自动发现对象中的数组</p>
          </div>
        </div>

        <label class="json-to-excel-field">
          <span>表格来源</span>
          <el-select
            v-model="selectedPathKey"
            class="json-to-excel-select"
            :disabled="arrayOptions.length === 0"
            placeholder="先解析 JSON"
          >
            <el-option
              v-for="option in arrayOptions"
              :key="option.key"
              :label="option.label"
              :value="option.key"
            />
          </el-select>
        </label>

        <el-checkbox v-model="preserveLongIntegers">
          长整数按文本导出
        </el-checkbox>
        <p class="json-to-excel-hint">
          默认优先使用 <code>data.list</code>；没有数组时按根对象导出一行。
        </p>

        <div v-if="parseError" class="json-to-excel-error" role="alert">
          {{ parseError }}
        </div>

        <div v-if="warningMessages.length > 0" class="json-to-excel-warnings" role="status">
          <strong>解析提示</strong>
          <p v-for="warning in warningMessages" :key="warning">{{ warning }}</p>
        </div>

        <div class="json-to-excel-summary">
          <div>
            <span>数据路径</span>
            <strong>{{ selectedOption?.label || '未解析' }}</strong>
          </div>
          <div>
            <span>记录数</span>
            <strong>{{ rows.length.toLocaleString() }}</strong>
          </div>
          <div>
            <span>字段数</span>
            <strong>{{ columns.length.toLocaleString() }}</strong>
          </div>
          <div>
            <span>预览</span>
            <strong>{{ previewRows.length.toLocaleString() }} 行</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="json-to-excel-preview-panel">
      <div class="json-to-excel-preview-heading">
        <div>
          <h2>数据预览</h2>
          <p v-if="rows.length > previewLimit">当前显示前 {{ previewLimit }} 行，导出时包含全部 {{ rows.length }} 行。</p>
          <p v-else>导出将使用当前解析结果的全部字段和记录。</p>
        </div>
        <span v-if="selectedOption" class="json-to-excel-preview-path">{{ selectedOption.label }}</span>
      </div>

      <el-table
        v-if="columns.length > 0"
        :data="previewRows"
        border
        stripe
        height="560"
        empty-text="没有可导出的记录"
        class="json-to-excel-table"
      >
        <el-table-column
          v-for="column in columns"
          :key="column"
          :label="column"
          :min-width="getColumnWidth(column)"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatCell(row[column]) }}
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="json-to-excel-empty">
        解析 JSON 后将在这里显示表格预览。
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, CopyDocument, Delete, Download, RefreshRight, UploadFilled } from '@element-plus/icons-vue'

const PREVIEW_LIMIT = 200
const ROOT_PATH_KEY = '[]'
const inputText = ref('')
const fileName = ref('')
const fileInput = ref(null)
const parsedRoot = ref(null)
const parseError = ref('')
const warningMessages = ref([])
const arrayOptions = ref([])
const selectedPathKey = ref(ROOT_PATH_KEY)
const rows = ref([])
const columns = ref([])
const preserveLongIntegers = ref(true)
const preservedNumberCount = ref(0)

const previewLimit = PREVIEW_LIMIT
const previewRows = computed(() => rows.value.slice(0, PREVIEW_LIMIT))
const selectedOption = computed(() => arrayOptions.value.find(option => option.key === selectedPathKey.value) || null)
const hasContent = computed(() => Boolean(inputText.value.trim()) || parsedRoot.value !== null)
const canExport = computed(() => rows.value.length > 0 && columns.value.length > 0 && !parseError.value)
const statusText = computed(() => {
  if (parseError.value) return '解析失败'
  if (parsedRoot.value === null) return '等待输入 JSON'
  return `${rows.value.length.toLocaleString()} 行 / ${columns.value.length.toLocaleString()} 列`
})
const statusType = computed(() => {
  if (parseError.value) return 'is-error'
  if (parsedRoot.value !== null) return 'is-ready'
  return 'is-idle'
})

watch(selectedPathKey, () => {
  if (parsedRoot.value !== null) {
    rebuildTable()
  }
})

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function isPlainObject(value) {
  return isObject(value) && !Array.isArray(value)
}

function pathKey(path) {
  return JSON.stringify(path)
}

function appendObjectPath(base, key) {
  const keyText = String(key)
  const safeKey = /^[A-Za-z_$][\w$]*$/.test(keyText)
  if (!base) return safeKey ? keyText : `[${JSON.stringify(keyText)}]`
  return safeKey ? `${base}.${keyText}` : `${base}[${JSON.stringify(keyText)}]`
}

function appendArrayPath(base, index) {
  return base ? `${base}[${index}]` : `[${index}]`
}

function formatPath(path) {
  if (path.length === 0) return '根数据'
  return path.reduce((label, segment) => {
    if (typeof segment === 'number') return appendArrayPath(label, segment)
    return appendObjectPath(label, segment)
  }, '')
}

function getValueAtPath(value, path) {
  return path.reduce((current, segment) => current?.[segment], value)
}

function addArrayOption(options, seen, path, value) {
  const key = pathKey(path)
  if (seen.has(key)) return
  seen.add(key)
  options.push({
    key,
    path,
    label: `${formatPath(path)}（${value.length.toLocaleString()} 项）`,
    count: value.length,
    isRoot: false,
  })
}

function collectArrayOptions(value, path, options, seen, depth = 0) {
  if (Array.isArray(value)) {
    addArrayOption(options, seen, path, value)
    if (depth >= 8) return
    value.slice(0, 20).forEach((item, index) => {
      collectArrayOptions(item, [...path, index], options, seen, depth + 1)
    })
    return
  }

  if (!isPlainObject(value) || depth >= 8) return
  Object.entries(value).forEach(([key, item]) => {
    collectArrayOptions(item, [...path, key], options, seen, depth + 1)
  })
}

function buildArrayOptions(root) {
  const options = []
  const seen = new Set()

  if (!Array.isArray(root)) {
    options.push({
      key: ROOT_PATH_KEY,
      path: [],
      label: '根对象（1 行）',
      count: 1,
      isRoot: true,
    })
  }

  collectArrayOptions(root, [], options, seen)

  if (Array.isArray(root) && options.length === 0) {
    addArrayOption(options, seen, [], root)
  }

  return options
}

function findDefaultPath(options) {
  const preferred = options.find(option => option.path.length === 2 && option.path[0] === 'data' && option.path[1] === 'list')
  if (preferred) return preferred.key
  const firstArray = options.find(option => !option.isRoot)
  return firstArray?.key || options[0]?.key || ROOT_PATH_KEY
}

function flattenValue(value, path, target) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      target[path || 'value'] = '[]'
      return
    }
    value.forEach((item, index) => {
      flattenValue(item, appendArrayPath(path, index), target)
    })
    return
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      target[path || 'value'] = '{}'
      return
    }
    entries.forEach(([key, item]) => {
      flattenValue(item, appendObjectPath(path, key), target)
    })
    return
  }

  target[path || 'value'] = value
}

function flattenRows(rawRows) {
  const flattenedRows = rawRows.map(row => {
    const flattened = Object.create(null)
    flattenValue(row, '', flattened)
    return flattened
  })
  const columnSet = new Set()
  flattenedRows.forEach(row => Object.keys(row).forEach(key => columnSet.add(key)))
  return { flattenedRows, columns: [...columnSet] }
}

function countNumbers(value, callback, path = []) {
  if (typeof value === 'number') {
    callback(value, path)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => countNumbers(item, callback, [...path, index]))
    return
  }
  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, item]) => countNumbers(item, callback, [...path, key]))
  }
}

function getWarnings(root, option, rowCount) {
  const warnings = []
  let unsafeNumberCount = 0
  countNumbers(root, value => {
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      unsafeNumberCount += 1
    }
  })
  if (unsafeNumberCount > 0) {
    warnings.push(`发现 ${unsafeNumberCount} 个超过 JavaScript 安全整数范围的数字，JSON.parse 可能已经造成精度损失。`)
  }
  if (preservedNumberCount.value > 0) {
    warnings.push(`已将 ${preservedNumberCount.value} 个高精度数字按文本保留，避免解析和粘贴到 Excel 时丢失精度。`)
  }

  if (option?.path.length === 2 && option.path[0] === 'data' && option.path[1] === 'list') {
    const declaredTotal = getValueAtPath(root, ['data', 'total'])
    if (typeof declaredTotal === 'number' && declaredTotal !== rowCount) {
      warnings.push(`data.total 为 ${declaredTotal}，当前 data.list 实际为 ${rowCount} 行。`)
    }
  }

  return warnings
}

const JSON_NUMBER_PATTERN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)

function isUnsafeJsonNumber(token) {
  if (!/[.eE]/.test(token)) {
    const integerValue = BigInt(token)
    return integerValue > MAX_SAFE_INTEGER_BIGINT || integerValue < -MAX_SAFE_INTEGER_BIGINT
  }

  const numericValue = Number(token)
  if (!Number.isFinite(numericValue)) return true

  const coefficient = token.split(/[eE]/i)[0].replace(/^[+-]/, '')
  const significantDigits = coefficient.replace('.', '').replace(/^0+/, '')
  return significantDigits.length > 15
    || (Number.isInteger(numericValue) && !Number.isSafeInteger(numericValue))
}

function parseJsonPreservingNumbers(source) {
  let output = ''
  let index = 0
  let preservedCount = 0

  while (index < source.length) {
    const character = source[index]

    if (character === '"') {
      const start = index
      index += 1
      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          continue
        }
        if (source[index] === '"') {
          index += 1
          break
        }
        index += 1
      }
      output += source.slice(start, index)
      continue
    }

    if (character === '-' || (character >= '0' && character <= '9')) {
      JSON_NUMBER_PATTERN.lastIndex = index
      const match = JSON_NUMBER_PATTERN.exec(source)
      if (match) {
        const token = match[0]
        if (isUnsafeJsonNumber(token)) {
          output += JSON.stringify(token)
          preservedCount += 1
        } else {
          output += token
        }
        index += token.length
        continue
      }
    }

    output += character
    index += 1
  }

  return { json: output, preservedCount }
}

function rebuildTable() {
  const option = selectedOption.value
  if (!option || parsedRoot.value === null) {
    rows.value = []
    columns.value = []
    warningMessages.value = []
    return
  }

  const selectedValue = getValueAtPath(parsedRoot.value, option.path)
  const rawRows = option.isRoot || !Array.isArray(selectedValue) ? [selectedValue] : selectedValue
  const flattened = flattenRows(rawRows)
  rows.value = flattened.flattenedRows
  columns.value = flattened.columns
  warningMessages.value = getWarnings(parsedRoot.value, option, rows.value.length)
}

function parseInput() {
  parseError.value = ''
  warningMessages.value = []
  preservedNumberCount.value = 0

  try {
    if (!inputText.value.trim()) {
      throw new Error('请输入 JSON 内容')
    }
    const preserved = parseJsonPreservingNumbers(inputText.value)
    preservedNumberCount.value = preserved.preservedCount
    const root = JSON.parse(preserved.json)
    parsedRoot.value = root
    arrayOptions.value = buildArrayOptions(root)
    selectedPathKey.value = findDefaultPath(arrayOptions.value)
    rebuildTable()
  } catch (error) {
    parsedRoot.value = null
    arrayOptions.value = []
    selectedPathKey.value = ROOT_PATH_KEY
    rows.value = []
    columns.value = []
    parseError.value = error instanceof SyntaxError
      ? `JSON 格式错误：${error.message}`
      : (error?.message || 'JSON 解析失败')
  }
}

async function loadFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    fileName.value = file.name
    inputText.value = await file.text()
    parseInput()
  } catch (error) {
    parseError.value = error?.message || '读取 JSON 文件失败'
  }
}

function formatCell(value) {
  if (value === undefined) return ''
  if (value === null) return 'null'
  return String(value)
}

function getColumnWidth(column) {
  return Math.min(320, Math.max(120, column.length * 12 + 24))
}

function toExcelCell(value) {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (
    preserveLongIntegers.value
    && typeof value === 'number'
    && Number.isInteger(value)
    && Math.abs(value) >= 1000000000000
  ) {
    return String(value)
  }
  return value
}

function shouldTreatAsExcelText(value, text = formatCell(value)) {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      && Number.isInteger(value)
      && Math.abs(value) >= 1000000000000
  }
  return typeof value === 'string' && /^[+-]?\d{12,}$/.test(text)
}

function toClipboardPlainCell(value) {
  const text = formatCell(value)
  return shouldTreatAsExcelText(value, text) && !text.startsWith("'")
    ? `'${text}`
    : text
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function buildClipboardHtml() {
  const textFormat = 'mso-number-format:"\\@"'
  const headers = columns.value
    .map(column => `<th>${escapeHtml(column)}</th>`)
    .join('')
  const body = rows.value
    .map(row => {
      const cells = columns.value.map(column => {
        const value = row[column]
        const text = formatCell(value)
        const attributes = shouldTreatAsExcelText(value, text)
          ? ` style="${textFormat}" data-type="String"`
          : ''
        return `<td${attributes}>${escapeHtml(text)}</td>`
      }).join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  return `<meta charset="utf-8"><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`
}

async function copyTable() {
  if (!canExport.value) return

  const tableRows = [
    columns.value,
    ...rows.value.map(row => columns.value.map(column => row[column])),
  ]
  const plainText = tableRows
    .map((row, rowIndex) => row.map(value => rowIndex === 0 ? formatCell(value) : toClipboardPlainCell(value)).join('\t'))
    .join('\r\n')

  try {
    const ClipboardItemConstructor = window.ClipboardItem
    if (navigator.clipboard?.write && ClipboardItemConstructor) {
      await navigator.clipboard.write([
        new ClipboardItemConstructor({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([buildClipboardHtml()], { type: 'text/html' }),
        }),
      ])
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plainText)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = plainText
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      if (!copied) throw new Error('浏览器拒绝了剪贴板操作')
    }
    ElMessage.success(`已复制 ${rows.value.length.toLocaleString()} 行表格内容`)
  } catch (error) {
    console.error('复制表格内容失败:', error)
    ElMessage.error(error?.message || '复制失败，请检查浏览器剪贴板权限')
  }
}

function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, '_').trim() || 'json拆excel'
}

function exportExcel() {
  if (!canExport.value) return
  const xlsx = window.XLSX
  if (!xlsx) {
    ElMessage.error('Excel 组件尚未加载，请刷新页面后重试')
    return
  }

  const data = [
    columns.value,
    ...rows.value.map(row => columns.value.map(column => toExcelCell(row[column]))),
  ]
  const worksheet = xlsx.utils.aoa_to_sheet(data)
  worksheet['!cols'] = columns.value.map(column => ({ wch: Math.min(42, Math.max(12, column.length + 4)) }))
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, '数据')
  const baseName = fileName.value.replace(/\.json$/i, '')
  xlsx.writeFile(workbook, `${sanitizeFileName(baseName || 'json拆excel')}.xlsx`)
  ElMessage.success(`已导出 ${rows.value.length.toLocaleString()} 行数据`)
}

function clearAll() {
  inputText.value = ''
  fileName.value = ''
  parsedRoot.value = null
  parseError.value = ''
  warningMessages.value = []
  arrayOptions.value = []
  selectedPathKey.value = ROOT_PATH_KEY
  rows.value = []
  columns.value = []
  preservedNumberCount.value = 0
  fileInput.value?.focus()
}
</script>

<style scoped>
.json-to-excel-page {
  min-height: 100vh;
  padding: 32px 24px 56px;
  background: #f3f5f8;
  color: #172033;
}

.json-to-excel-header,
.json-to-excel-toolbar,
.json-to-excel-workspace,
.json-to-excel-preview-panel {
  max-width: 1480px;
  margin-right: auto;
  margin-left: auto;
}

.json-to-excel-header {
  padding-bottom: 22px;
  border-bottom: 1px solid #dfe3eb;
}

.json-to-excel-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 22px;
  color: #3867d6;
  font-size: 14px;
  text-decoration: none;
}

.json-to-excel-kicker {
  margin: 0 0 6px;
  color: #7b8496;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: 32px;
  line-height: 1.2;
}

.json-to-excel-description {
  max-width: 760px;
  margin-bottom: 0;
  color: #596276;
  line-height: 1.7;
}

.json-to-excel-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 0;
}

.json-to-excel-upload-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 15px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  color: #606266;
  cursor: pointer;
  font-size: 14px;
  line-height: 30px;
  transition: border-color 0.2s, color 0.2s;
}

.json-to-excel-upload-button:hover {
  border-color: #409eff;
  color: #409eff;
}

.json-to-excel-upload-button input {
  display: none;
}

.json-to-excel-status {
  margin-left: auto;
  color: #7b8496;
  font-size: 13px;
}

.json-to-excel-status.is-ready {
  color: #18866b;
}

.json-to-excel-status.is-error {
  color: #c2410c;
}

.json-to-excel-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
  gap: 18px;
  align-items: start;
}

.json-to-excel-panel,
.json-to-excel-preview-panel {
  border: 1px solid #dfe3eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 32 51 / 4%);
}

.json-to-excel-panel {
  padding: 18px;
}

.json-to-excel-panel-heading,
.json-to-excel-preview-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.json-to-excel-panel-heading {
  margin-bottom: 14px;
}

.json-to-excel-panel-heading h2,
.json-to-excel-preview-heading h2 {
  margin-bottom: 5px;
  font-size: 18px;
  line-height: 1.35;
}

.json-to-excel-panel-heading p,
.json-to-excel-preview-heading p {
  margin-bottom: 0;
  color: #7b8496;
  font-size: 13px;
  line-height: 1.5;
}

.json-to-excel-panel-meta,
.json-to-excel-preview-path {
  flex: 0 0 auto;
  color: #7b8496;
  font-size: 12px;
}

.json-to-excel-input :deep(textarea) {
  min-height: 480px;
  color: #172033;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.55;
}

.json-to-excel-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 18px;
  color: #596276;
  font-size: 13px;
}

.json-to-excel-select {
  width: 100%;
}

.json-to-excel-hint {
  margin: 12px 0 20px;
  color: #7b8496;
  font-size: 12px;
  line-height: 1.6;
}

.json-to-excel-hint code {
  padding: 1px 4px;
  border-radius: 3px;
  background: #eef2f7;
  color: #3867d6;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
}

.json-to-excel-error,
.json-to-excel-warnings {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 5px;
  font-size: 13px;
  line-height: 1.6;
}

.json-to-excel-error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.json-to-excel-warnings {
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.json-to-excel-warnings strong {
  display: block;
  margin-bottom: 4px;
}

.json-to-excel-warnings p {
  margin-bottom: 3px;
}

.json-to-excel-warnings p:last-child {
  margin-bottom: 0;
}

.json-to-excel-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 24px;
}

.json-to-excel-summary > div {
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  background: #fafbfc;
}

.json-to-excel-summary span,
.json-to-excel-summary strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-to-excel-summary span {
  margin-bottom: 5px;
  color: #7b8496;
  font-size: 12px;
}

.json-to-excel-summary strong {
  color: #172033;
  font-size: 15px;
}

.json-to-excel-preview-panel {
  margin-top: 18px;
  padding: 18px;
}

.json-to-excel-preview-heading {
  align-items: center;
  margin-bottom: 14px;
}

.json-to-excel-preview-path {
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-to-excel-table {
  width: 100%;
}

.json-to-excel-empty {
  display: grid;
  min-height: 240px;
  place-items: center;
  border: 1px dashed #cfd6e2;
  color: #7b8496;
  font-size: 14px;
}

@media (max-width: 900px) {
  .json-to-excel-page {
    padding: 24px 14px 40px;
  }

  .json-to-excel-workspace {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 28px;
  }

  .json-to-excel-status {
    width: 100%;
    margin-left: 0;
  }

  .json-to-excel-input :deep(textarea) {
    min-height: 360px;
  }

  .json-to-excel-preview-path {
    max-width: 50%;
  }
}
</style>
