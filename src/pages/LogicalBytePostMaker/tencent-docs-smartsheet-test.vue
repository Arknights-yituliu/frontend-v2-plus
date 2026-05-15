<template>
  <div class="qq-docs-test-page">
    <section class="hero-card">
      <p class="hero-kicker">LogicalByte / Tencent Docs</p>
      <h1>腾讯文档智能表测试页</h1>
      <p class="hero-description">
        本页用于本地开发时验证腾讯文档智能表的字段和记录读取流程。
        默认优先读取本地同步缓存，也可以填腾讯开放平台授权凭据后实时请求接口。
      </p>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="这是开发测试页"
        description="实时请求依赖 Vite 开发代理 /api/tencent-docs；缓存展示读取 /json/tencent-docs-smartsheet-cache.json。"
      />
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <h2>腾讯侧准备项</h2>
        <span>写代码前需要先完成</span>
      </div>
      <ol class="prep-list">
        <li>在腾讯文档开放平台创建应用，拿到 Client ID / Client Secret。</li>
        <li>给应用申请智能表只读权限，并让目标账号完成授权。</li>
        <li>通过 OAuth 换到 Access Token 和 Open ID。</li>
        <li>确认目标智能表链接可被该授权账号访问。</li>
        <li>准备一条带 <code>tab=</code> 的智能表链接，便于自动解析 sheetID。</li>
      </ol>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <h2>连接信息</h2>
        <span>敏感凭据只保存在当前页面内存</span>
      </div>

      <el-alert
        class="credential-alert"
        type="info"
        :closable="false"
        show-icon
        title="Access Token / Open ID / Client ID 不会写入 localStorage，刷新页面会清空。"
        description="页面只会保存智能表链接、encodedID、sheetID、fileID 和读取条数，方便下次继续调试。"
      />

      <el-form label-position="top" class="credential-form">
        <el-form-item label="智能表链接">
          <el-input
            v-model="form.sheetUrl"
            placeholder="https://docs.qq.com/smartsheet/DXXXXXXXXXXXXXXX?tab=ss_xxxxxx"
            @change="parseSheetUrl"
          />
        </el-form-item>

        <div class="form-grid">
          <el-form-item label="Client ID">
            <el-input v-model="form.clientId" placeholder="docs_xxx" />
          </el-form-item>
          <el-form-item label="Open ID">
            <el-input v-model="form.openId" placeholder="授权返回的 user_id / Open-Id" />
          </el-form-item>
        </div>

        <el-form-item label="Access Token">
          <el-input
            v-model="form.accessToken"
            type="textarea"
            :rows="3"
            placeholder="授权后获得的 Access-Token"
          />
        </el-form-item>

        <div class="form-grid">
          <el-form-item label="encodedID（链接中的 D...）">
            <el-input v-model="form.encodedId" placeholder="DXXXXXXXXXXXXXXX" />
          </el-form-item>
          <el-form-item label="sheetID（tab 参数）">
            <el-input v-model="form.sheetId" placeholder="BB0000" />
          </el-form-item>
        </div>

        <div class="form-grid">
          <el-form-item label="fileID（转换后）">
            <el-input v-model="form.fileId" placeholder="300000000$XXXXXXXXXXXX" />
          </el-form-item>
          <el-form-item label="读取条数">
            <el-input-number v-model="form.limit" :min="1" :max="200" />
          </el-form-item>
        </div>

        <div class="action-row">
          <el-button @click="parseSheetUrl">从链接解析</el-button>
          <el-button :loading="loadingCache" type="primary" plain @click="loadCache">
            读取本地缓存
          </el-button>
          <el-button :loading="converting" type="primary" @click="convertEncodedIdToFileId">
            转换 fileID
          </el-button>
          <el-button :loading="loadingFields" @click="loadFields">读取字段</el-button>
          <el-button :loading="loadingRecords" type="success" @click="loadRecords">
            读取记录
          </el-button>
          <el-button :loading="loadingAll" type="warning" @click="loadAll">
            一键读取
          </el-button>
          <el-button @click="clearCredentials">清空当前凭据</el-button>
        </div>
      </el-form>

      <el-alert
        v-if="message.text"
        class="status-alert"
        :type="message.type"
        :closable="false"
        show-icon
        :title="message.text"
      />
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <h2>解析结果</h2>
        <span>便于确认参数是否正确</span>
      </div>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">encodedID</span>
          <code>{{ form.encodedId || '-' }}</code>
        </div>
        <div class="meta-item">
          <span class="meta-label">sheetID</span>
          <code>{{ form.sheetId || '-' }}</code>
        </div>
        <div class="meta-item">
          <span class="meta-label">fileID</span>
          <code>{{ form.fileId || '-' }}</code>
        </div>
        <div class="meta-item">
          <span class="meta-label">当前记录数</span>
          <code>{{ records.length }}</code>
        </div>
        <div class="meta-item">
          <span class="meta-label">数据来源</span>
          <code>{{ dataSourceLabel }}</code>
        </div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <h2>字段列表</h2>
        <span>{{ fields.length }} 个字段</span>
      </div>
      <el-table v-if="fields.length" :data="fields" border stripe>
        <el-table-column prop="fieldTitle" label="字段名" min-width="180" />
        <el-table-column prop="fieldID" label="fieldID" min-width="160" />
        <el-table-column prop="fieldType" label="类型" width="100" />
      </el-table>
      <el-empty v-else description="还没有读取到字段" />
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <h2>记录预览</h2>
        <span>{{ records.length }} 条记录</span>
      </div>
      <el-table v-if="records.length" :data="records" border stripe max-height="560">
        <el-table-column prop="__recordID" label="recordID" min-width="160" fixed="left" />
        <el-table-column
          v-for="field in fields"
          :key="field.fieldID"
          :prop="getFieldProp(field)"
          :label="field.fieldTitle"
          min-width="160"
          show-overflow-tooltip
        />
      </el-table>
      <el-empty v-else description="还没有读取到记录" />
    </section>

    <section class="panel-card raw-card">
      <div class="panel-header">
        <h2>原始响应</h2>
        <span>方便排查字段类型和接口结构</span>
      </div>
      <div class="raw-grid">
        <div class="raw-panel">
          <h3>Fields Response</h3>
          <pre>{{ fieldResponseText }}</pre>
        </div>
        <div class="raw-panel">
          <h3>Records Response</h3>
          <pre>{{ recordResponseText }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

const STORAGE_KEY = 'lb_tencent_docs_smartsheet_test'
const SAFE_STORAGE_FIELDS = ['sheetUrl', 'encodedId', 'sheetId', 'fileId', 'limit']
const API_PROXY_PREFIX = '/api/tencent-docs'
const CACHE_URL = '/json/tencent-docs-smartsheet-cache.json'

const defaultForm = {
  sheetUrl: '',
  clientId: '',
  openId: '',
  accessToken: '',
  encodedId: '',
  sheetId: '',
  fileId: '',
  limit: 20
}

const savedForm = readSavedForm()
const form = reactive({
  ...defaultForm,
  ...savedForm
})

const converting = ref(false)
const loadingCache = ref(false)
const loadingFields = ref(false)
const loadingRecords = ref(false)
const fields = ref([])
const records = ref([])
const cachePayload = ref(null)
const fieldResponse = ref(null)
const recordResponse = ref(null)
const message = ref({
  type: 'info',
  text: ''
})

const fieldResponseText = computed(() => {
  return fieldResponse.value ? JSON.stringify(fieldResponse.value, null, 2) : '暂无数据'
})

const recordResponseText = computed(() => {
  return recordResponse.value ? JSON.stringify(recordResponse.value, null, 2) : '暂无数据'
})

const loadingAll = computed(() => {
  return converting.value || loadingFields.value || loadingRecords.value
})

const dataSourceLabel = computed(() => {
  if (cachePayload.value?.syncedAt) {
    return `本地缓存 ${formatDateTime(cachePayload.value.syncedAt)}`
  }

  if (fieldResponse.value || recordResponse.value) {
    return '实时接口'
  }

  return '-'
})

watch(
  form,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSafeStoredForm(value)))
  },
  { deep: true }
)

onMounted(() => {
  loadCache({ silent: true })
})

function readSavedForm() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    const parsed = text ? JSON.parse(text) : {}
    const safeForm = toSafeStoredForm(parsed)

    if (text && JSON.stringify(parsed) !== JSON.stringify(safeForm)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeForm))
    }

    return safeForm
  } catch (error) {
    console.warn('读取本地腾讯文档测试配置失败', error)
    return {}
  }
}

function toSafeStoredForm(value) {
  return SAFE_STORAGE_FIELDS.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = value[key]
    }

    return result
  }, {})
}

function setMessage(type, text) {
  message.value = { type, text }
}

function clearCredentials() {
  form.clientId = ''
  form.openId = ''
  form.accessToken = ''
  setMessage('success', '已清空当前页面里的 Client ID / Open ID / Access Token')
}

async function loadCache(options = {}) {
  try {
    loadingCache.value = true

    if (!options.silent) {
      setMessage('info', '正在读取本地缓存...')
    }

    const response = await fetch(`${CACHE_URL}?t=${Date.now()}`, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    applyCachePayload(data)
    setMessage('success', `已读取本地缓存：${fields.value.length} 个字段，${records.value.length} 条记录`)
  } catch (error) {
    if (!options.silent) {
      setMessage('error', `本地缓存读取失败：${error.message}`)
    }
  } finally {
    loadingCache.value = false
  }
}

function applyCachePayload(data) {
  cachePayload.value = data
  fields.value = data?.fields || []
  records.value = normalizeCachedRecords(data)
  fieldResponse.value = data?.raw?.fields || null
  recordResponse.value = data?.raw?.records || null

  if (data?.source) {
    form.encodedId = data.source.encodedId || form.encodedId
    form.sheetId = data.source.sheetId || form.sheetId
    form.fileId = data.source.fileId || form.fileId
    form.limit = data.source.recordLimit || form.limit
  }
}

function parseSheetUrl() {
  if (!form.sheetUrl) {
    setMessage('warning', '请先填写智能表链接')
    return
  }

  try {
    const url = new URL(form.sheetUrl)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const sheetIndex = pathParts.findIndex((item) => item === 'sheet' || item === 'smartsheet')

    if (sheetIndex === -1 || !pathParts[sheetIndex + 1]) {
      throw new Error('链接里没有找到 /sheet/ 或 /smartsheet/ 后的 encodedID')
    }

    form.encodedId = pathParts[sheetIndex + 1]
    form.sheetId = url.searchParams.get('tab') || form.sheetId
    setMessage('success', '已从链接解析出 encodedID 和 sheetID')
  } catch (error) {
    setMessage('error', `链接解析失败：${error.message}`)
  }
}

function buildHeaders(includeOpenId = true) {
  const headers = {
    'Access-Token': form.accessToken.trim(),
    'Client-Id': form.clientId.trim(),
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  if (includeOpenId) {
    headers['Open-Id'] = form.openId.trim()
  }

  return headers
}

function validateBaseCredential() {
  if (!form.clientId.trim()) {
    throw new Error('缺少 Client ID')
  }
  if (!form.accessToken.trim()) {
    throw new Error('缺少 Access Token')
  }
  if (!form.openId.trim()) {
    throw new Error('缺少 Open ID')
  }
}

async function requestTencentDocs(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${data?.msg ? `: ${data.msg}` : ''}`)
  }

  if (!data) {
    throw new Error('接口没有返回有效 JSON')
  }

  if (typeof data.ret === 'number' && data.ret !== 0) {
    throw new Error(`ret=${data.ret}${data.msg ? `: ${data.msg}` : ''}`)
  }

  return data
}

async function convertEncodedIdToFileId() {
  try {
    validateBaseCredential()
    if (!form.encodedId.trim()) {
      throw new Error('缺少 encodedID，请先从链接解析或手工填写')
    }

    converting.value = true
    setMessage('info', '正在转换 fileID...')

    const query = new URLSearchParams({
      type: '2',
      value: form.encodedId.trim()
    })

    const data = await requestTencentDocs(
      `${API_PROXY_PREFIX}/openapi/drive/v2/util/converter?${query.toString()}`,
      {
        method: 'GET',
        headers: buildHeaders()
      }
    )

    form.fileId = data?.data?.fileID || ''

    if (!form.fileId) {
      throw new Error('转换成功，但返回里没有 fileID')
    }

    setMessage('success', 'fileID 转换成功')
  } catch (error) {
    setMessage('error', `fileID 转换失败：${error.message}`)
  } finally {
    converting.value = false
  }
}

async function loadFields() {
  try {
    validateBaseCredential()
    if (!form.fileId.trim()) {
      throw new Error('缺少 fileID，请先转换')
    }
    if (!form.sheetId.trim()) {
      throw new Error('缺少 sheetID，请先填写智能表 tab 参数')
    }

    loadingFields.value = true
    setMessage('info', '正在读取字段...')

    const data = await requestTencentDocs(
      `${API_PROXY_PREFIX}/openapi/smartbook/v2/files/${encodeURIComponent(form.fileId.trim())}/sheets/${encodeURIComponent(form.sheetId.trim())}`,
      {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          getFields: {
            offset: 0,
            limit: 200
          }
        })
      }
    )

    fieldResponse.value = data
    fields.value = data?.data?.getFields?.fields || []
    cachePayload.value = null
    setMessage('success', `字段读取成功，共 ${fields.value.length} 个`)
  } catch (error) {
    setMessage('error', `字段读取失败：${error.message}`)
  } finally {
    loadingFields.value = false
  }
}

async function loadRecords() {
  try {
    validateBaseCredential()
    if (!form.fileId.trim()) {
      throw new Error('缺少 fileID，请先转换')
    }
    if (!form.sheetId.trim()) {
      throw new Error('缺少 sheetID，请先填写智能表 tab 参数')
    }

    loadingRecords.value = true
    setMessage('info', '正在读取记录...')

    const data = await requestTencentDocs(
      `${API_PROXY_PREFIX}/openapi/smartbook/v2/files/${encodeURIComponent(form.fileId.trim())}/sheets/${encodeURIComponent(form.sheetId.trim())}`,
      {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          getRecords: {
            offset: 0,
            limit: Number(form.limit) || 20
          }
        })
      }
    )

    recordResponse.value = data
    records.value = normalizeRecords(data?.data?.getRecords?.records || [])
    cachePayload.value = null
    setMessage('success', `记录读取成功，共 ${records.value.length} 条`)
  } catch (error) {
    setMessage('error', `记录读取失败：${error.message}`)
  } finally {
    loadingRecords.value = false
  }
}

async function loadAll() {
  if (!form.fileId.trim()) {
    await convertEncodedIdToFileId()
    if (!form.fileId.trim()) {
      return
    }
  }

  await loadFields()
  await loadRecords()
}

function normalizeRecords(list) {
  return list.map((record) => {
    const row = {
      __recordID: record.recordID,
      __createTime: record.createTime,
      __updateTime: record.updateTime
    }

    const values = record.values || {}
    for (const [key, value] of Object.entries(values)) {
      row[key] = formatCellValue(value)
    }

    return row
  })
}

function normalizeCachedRecords(data) {
  if (Array.isArray(data?.normalizedRecords) && data.normalizedRecords.length) {
    return data.normalizedRecords.map((row) => enrichRowWithFieldIds(row, data.fields || []))
  }

  return normalizeRecords(data?.records || [])
}

function enrichRowWithFieldIds(row, fieldList) {
  const nextRow = { ...row }

  for (const field of fieldList) {
    if (field.fieldID && nextRow[field.fieldID] == null && nextRow[field.fieldTitle] != null) {
      nextRow[field.fieldID] = nextRow[field.fieldTitle]
    }
  }

  return nextRow
}

function getFieldProp(field) {
  return field.fieldID || field.fieldTitle
}

function formatDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function formatCellValue(value) {
  if (value == null) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map(formatArrayItem).join(' | ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function formatArrayItem(item) {
  if (item == null) {
    return ''
  }

  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    return String(item)
  }

  if (item.text) {
    return item.text
  }

  if (item.link) {
    return `${item.text || item.link} (${item.link})`
  }

  if (item.title && item.url) {
    return `${item.title} (${item.url})`
  }

  return JSON.stringify(item)
}
</script>

<style scoped>
.qq-docs-test-page {
  min-height: 100vh;
  padding: 28px 18px 56px;
  background:
    radial-gradient(circle at top right, rgba(24, 103, 192, 0.18), transparent 26%),
    linear-gradient(180deg, #f4f7fb 0%, #edf2f8 100%);
}

.hero-card,
.panel-card {
  max-width: 1280px;
  margin: 0 auto 20px;
  padding: 24px;
  border: 1px solid rgba(24, 103, 192, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 40px rgba(18, 31, 53, 0.08);
}

.hero-kicker {
  margin: 0 0 8px;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #1867c0;
}

.hero-card h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  color: #182033;
}

.hero-description {
  max-width: 760px;
  margin: 12px 0 20px;
  line-height: 1.7;
  color: #4c5a70;
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #182033;
}

.panel-header span {
  font-size: 0.9rem;
  color: #6c7892;
}

.prep-list {
  margin: 0;
  padding-left: 20px;
  color: #4c5a70;
  line-height: 1.8;
}

.credential-form {
  margin-top: 8px;
}

.credential-alert {
  margin-bottom: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.status-alert {
  margin-top: 18px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.meta-item {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  background: #f7faff;
  border: 1px solid rgba(24, 103, 192, 0.12);
}

.meta-label {
  font-size: 0.85rem;
  color: #6c7892;
}

.meta-item code {
  font-size: 0.92rem;
  color: #1d2a42;
  word-break: break-all;
}

.raw-card {
  margin-bottom: 0;
}

.raw-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.raw-panel {
  min-width: 0;
}

.raw-panel h3 {
  margin: 0 0 10px;
  color: #182033;
}

.raw-panel pre {
  margin: 0;
  padding: 16px;
  border-radius: 16px;
  background: #0f1728;
  color: #d7e5ff;
  font-size: 0.82rem;
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 960px) {
  .form-grid,
  .meta-grid,
  .raw-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .qq-docs-test-page {
    padding: 20px 12px 40px;
  }

  .hero-card,
  .panel-card {
    padding: 18px;
    border-radius: 18px;
  }
}
</style>
