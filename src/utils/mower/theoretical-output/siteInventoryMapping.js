import {normalizeRiicOperatorId} from '../../riicOperatorIdentity.js'

function fail(message) {
  throw new Error(`一图流干员库：${message}`)
}

export function normalizeMowerAccountUid(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  if (typeof value === 'string' && /^\d+$/.test(value.trim()) && /[1-9]/.test(value)) return value.trim()
  fail('游戏账号 UID 无效')
}

/** UC lists accounts in most-recent-import order, also used by My Operators. */
export function latestMowerSiteAccount(accounts) {
  if (!Array.isArray(accounts)) fail('游戏账号列表格式错误')
  if (!accounts.length) return null
  const account = accounts[0]
  if (!account || typeof account !== 'object' || Array.isArray(account)) fail('游戏账号格式错误')
  return {...account, akUid: normalizeMowerAccountUid(account.akUid)}
}

function mapRows(rows, idField, phaseField) {
  if (!Array.isArray(rows)) fail('干员列表必须为数组')
  const entries = new Map(), rawIds = new Set()
  rows.forEach((row, index) => {
    const line = index + 1
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`第 ${line} 条干员格式错误`)
    if (row.own !== undefined && typeof row.own !== 'boolean') fail(`第 ${line} 条持有状态无效`)
    // The site fills missing catalog rows with own:false/level:0. Neither is an owned card.
    if (row.own === false || row.level === 0) return
    const rawId = typeof row[idField] === 'string' ? row[idField].trim() : ''
    if (!/^char_[a-zA-Z0-9_]+$/.test(rawId)) fail(`第 ${line} 条干员 ID 无效`)
    const elitePhase = row[phaseField], level = row.level
    if (!Number.isInteger(elitePhase) || elitePhase < 0 || elitePhase > 2 ||
      !Number.isInteger(level) || level < 1 || level > 90) fail(`第 ${line} 条精英阶段或等级无效`)
    if (rawIds.has(rawId)) fail(`第 ${line} 条干员 ${rawId} 重复`)
    rawIds.add(rawId)
    const operator = normalizeRiicOperatorId(rawId)
    const entry = {operator, elitePhase, level}, existing = entries.get(operator)
    if (existing) {
      // Amiya's three forms share one RIIC card. Only those distinct aliases may merge.
      if (operator !== 'char_002_amiya') fail(`第 ${line} 条干员 ${operator} 重复`)
      if (elitePhase > existing.elitePhase || (elitePhase === existing.elitePhase && level > existing.level)) {
        entries.set(operator, entry)
      }
    } else entries.set(operator, entry)
  })
  // Keep unknown future character IDs: the calculation layer excludes them from idle candidates
  // and reports their unsupported status, while a schedule using them is rejected.
  return [...entries.values()]
}

/** Validate the complete UC account response before interpreting any owned rows. */
export function mapUcMowerInventory(payload, akUid) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Array.isArray(payload.items)) {
    fail('干员接口返回格式错误')
  }
  if (normalizeMowerAccountUid(payload.akUid) !== normalizeMowerAccountUid(akUid)) fail('干员数据所属账号不一致')
  return mapRows(payload.items, 'id', 'evolvePhase')
}

/** Mapping boundary for the site's charId/elite/level/own operator records. */
export function mapSiteMowerInventory(rows) {
  return mapRows(rows, 'charId', 'elite')
}
