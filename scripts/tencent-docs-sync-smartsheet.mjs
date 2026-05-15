import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const DEFAULT_OUTPUT = 'public/json/tencent-docs-smartsheet-cache.json'
const API_ORIGIN = 'https://docs.qq.com'

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})

async function main() {
  await loadLocalEnv()
  const config = readConfig()
  applySheetUrlConfig(config)
  validateConfig(config)

  const fileId = config.fileId || await convertEncodedIdToFileId(config, config.encodedId)
  const [fieldsResponse, recordsResponse] = await Promise.all([
    fetchFields(config, fileId, config.sheetId),
    fetchRecords(config, fileId, config.sheetId, config.limit)
  ])

  const fields = fieldsResponse?.data?.getFields?.fields || []
  const records = recordsResponse?.data?.getRecords?.records || []
  const payload = {
    syncedAt: new Date().toISOString(),
    source: {
      encodedId: config.encodedId,
      sheetId: config.sheetId,
      fileId,
      recordLimit: config.limit
    },
    fields,
    records,
    normalizedRecords: normalizeRecords(records),
    raw: {
      fields: fieldsResponse,
      records: recordsResponse
    }
  }

  const outputPath = path.resolve(projectRoot, config.output)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Tencent Docs smartsheet cache synced: ${path.relative(projectRoot, outputPath)}`)
  console.log(`Fields: ${fields.length}, records: ${records.length}`)
}

async function loadLocalEnv() {
  for (const filename of ['.env.local', '.env']) {
    const filePath = path.resolve(projectRoot, filename)

    try {
      const text = await readFile(filePath, 'utf8')
      for (const [key, value] of parseEnvText(text)) {
        process.env[key] ||= value
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`读取 ${filename} 失败：${error.message}`)
      }
    }
  }
}

function parseEnvText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=')

      if (index === -1) {
        return null
      }

      const key = line.slice(0, index).trim()
      const value = stripEnvQuotes(line.slice(index + 1).trim())
      return key ? [key, value] : null
    })
    .filter(Boolean)
}

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function readConfig() {
  return {
    clientId: readEnv('TENCENT_DOCS_CLIENT_ID'),
    accessToken: readEnv('TENCENT_DOCS_ACCESS_TOKEN'),
    openId: readEnv('TENCENT_DOCS_OPEN_ID'),
    sheetUrl: readEnv('TENCENT_DOCS_SHEET_URL', false),
    encodedId: readEnv('TENCENT_DOCS_ENCODED_ID', false),
    sheetId: readEnv('TENCENT_DOCS_SHEET_ID', false),
    fileId: readEnv('TENCENT_DOCS_FILE_ID', false),
    limit: toPositiveInteger(readEnv('TENCENT_DOCS_RECORD_LIMIT', false), 500),
    output: readEnv('TENCENT_DOCS_OUTPUT', false) || DEFAULT_OUTPUT
  }
}

function readEnv(key, required = true) {
  const value = process.env[key]?.trim()

  if (required && !value) {
    throw new Error(`缺少环境变量 ${key}`)
  }

  return value || ''
}

function applySheetUrlConfig(target) {
  if (!target.sheetUrl) {
    return
  }

  const parsed = parseSheetUrl(target.sheetUrl)
  target.encodedId ||= parsed.encodedId
  target.sheetId ||= parsed.sheetId
}

function validateConfig(target) {
  if (!target.fileId && !target.encodedId) {
    throw new Error('缺少 TENCENT_DOCS_SHEET_URL、TENCENT_DOCS_ENCODED_ID 或 TENCENT_DOCS_FILE_ID')
  }

  if (!target.sheetId) {
    throw new Error('缺少 TENCENT_DOCS_SHEET_ID，或在 TENCENT_DOCS_SHEET_URL 中提供 tab 参数')
  }
}

function parseSheetUrl(sheetUrl) {
  const url = new URL(sheetUrl)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const sheetIndex = pathParts.findIndex((item) => item === 'sheet' || item === 'smartsheet')

  if (sheetIndex === -1 || !pathParts[sheetIndex + 1]) {
    throw new Error('TENCENT_DOCS_SHEET_URL 中没有找到 /sheet/ 或 /smartsheet/ 后的 encodedID')
  }

  return {
    encodedId: pathParts[sheetIndex + 1],
    sheetId: url.searchParams.get('tab') || ''
  }
}

function toPositiveInteger(value, fallback) {
  const number = Number(value)

  if (!Number.isInteger(number) || number <= 0) {
    return fallback
  }

  return number
}

async function convertEncodedIdToFileId(config, encodedId) {
  const query = new URLSearchParams({
    type: '2',
    value: encodedId
  })

  const data = await requestTencentDocs(config, `/openapi/drive/v2/util/converter?${query.toString()}`, {
    method: 'GET'
  })

  const fileId = data?.data?.fileID

  if (!fileId) {
    throw new Error('encodedID 转换成功，但接口响应里没有 fileID')
  }

  return fileId
}

async function fetchFields(config, fileId, sheetId) {
  return requestTencentDocs(
    config,
    `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets/${encodeURIComponent(sheetId)}`,
    {
      method: 'POST',
      body: {
        getFields: {
          offset: 0,
          limit: 200
        }
      }
    }
  )
}

async function fetchRecords(config, fileId, sheetId, limit) {
  return requestTencentDocs(
    config,
    `/openapi/smartbook/v2/files/${encodeURIComponent(fileId)}/sheets/${encodeURIComponent(sheetId)}`,
    {
      method: 'POST',
      body: {
        getRecords: {
          offset: 0,
          limit
        }
      }
    }
  )
}

async function requestTencentDocs(config, apiPath, options = {}) {
  const headers = {
    'Access-Token': config.accessToken,
    'Client-Id': config.clientId,
    'Open-Id': config.openId,
    'Accept': 'application/json'
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_ORIGIN}${apiPath}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`腾讯文档接口请求失败：HTTP ${response.status}${data?.msg ? `: ${data.msg}` : ''}`)
  }

  if (!data) {
    throw new Error('腾讯文档接口没有返回有效 JSON')
  }

  if (typeof data.ret === 'number' && data.ret !== 0) {
    throw new Error(`腾讯文档接口返回 ret=${data.ret}${data.msg ? `: ${data.msg}` : ''}`)
  }

  return data
}

function normalizeRecords(records) {
  return records.map((record) => {
    const row = {
      __recordID: record.recordID,
      __createTime: record.createTime,
      __updateTime: record.updateTime
    }

    const values = record.values || {}
    for (const [fieldId, value] of Object.entries(values)) {
      row[fieldId] = formatCellValue(value)
    }

    return row
  })
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
