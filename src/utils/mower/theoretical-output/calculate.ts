import { GAME_DATA_VERSION, OPERATOR_MAP } from './engine/domain/operators'
import { compileOperatorInventory, type OwnedOperatorInput } from './engine/domain/operatorInventory'
import { backupParticipants } from './engine/scheduler/backupPlans'
import { compileBackupExpression } from './engine/scheduler/backupExpression'
import { compileRosterSchedule } from './engine/scheduler/compileRosterSchedule'
import { mowerPlanEntries } from './engine/scheduler/mowerPlanOrder'
import { simulateSchedule, type ScheduleSimulationProgress } from './engine/simulator/scheduleSimulation'
import { importMowerJson, resolveOperatorCharId } from './engine/workbench/compat/mowerJson'
import { getOperatorName, getRoomDisplayName } from './engine/workbench/operatorHelpers'
import { mowerReportMetrics } from './engine/workbench/mowerReportMetrics'
import { validateRosterWorkspace } from './engine/workbench/validate'
import { MOWER_ROOM_IDS, type RosterWorkspace } from './engine/workbench/model'

export interface TheoreticalOutputConfig {
  warmupDays?: number
  sampleDays?: number
  droneRoomId?: string
  facilityLevels?: Record<string, number>
  operatorInventory?: OwnedOperatorInput[]
  jayeElite0?: boolean
  restingThreshold?: number
  fiammettaFool?: boolean
  freeRoom?: boolean
}
const policyLists = [
  'exhaust_require', 'rest_in_full', 'resting_priority', 'resting_priority_replacement',
  'free_room_exclusions', 'resting_standby', 'free_blacklist', 'workaholic',
  'refresh_trading', 'refresh_drained', 'ope_resting_priority',
]
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const maxLevel = (type: string) => type === 'central' || type === 'dormitory' ? 5 : type === 'gaming' ? 1 : 3
const capacity = (roomId: string) => roomId === 'central' || roomId.startsWith('dormitory_') ? 5
  : roomId === 'meeting' || roomId === 'train' ? 2
  : roomId.startsWith('room_') ? 3 : 1

/** Validate before constructing a workspace; default staffing never becomes input. */
function readWorkspace(payload: unknown): RosterWorkspace {
  let raw: unknown = payload
  if (typeof payload === 'string') {
    if (payload.length > 2 * 1024 * 1024) throw new Error('排班文件超过 2 MB')
    try { raw = JSON.parse(payload) } catch { throw new Error('排班文件不是有效的 JSON') }
  }
  if (!record(raw)) throw new Error('排班必须为 Mower JSON 对象')
  const text = JSON.stringify(raw)
  if (text.length > 2 * 1024 * 1024) throw new Error('排班文件超过 2 MB')
  const defaultKey = typeof raw.default === 'string' && raw.default.trim() ? raw.default.trim() : 'plan1'
  const main = raw[defaultKey]
  if (!record(main) || Object.keys(main).length === 0) throw new Error('主排班为空或不存在')
  const roomIds = new Set<string>(MOWER_ROOM_IDS)
  for (const [roomId, facility] of Object.entries(main)) {
    if (!roomIds.has(roomId)) throw new Error(`未知房间：${roomId}`)
    if (!record(facility) || !Array.isArray(facility.plans)) throw new Error(`${roomId}：缺少有效的 plans 数组`)
    if (facility.plans.length > capacity(roomId)) throw new Error(`${roomId}：岗位数量超过房间容量`)
    if (roomId.startsWith('room_') && !['制造站', '贸易站', '发电站'].includes(String(facility.name))) {
      throw new Error(`${roomId}：未知产出设施类型`)
    }
    for (const [index, slot] of facility.plans.entries()) {
      if (!record(slot) || typeof slot.agent !== 'string' ||
          slot.group !== undefined && typeof slot.group !== 'string' ||
          slot.replacement !== undefined && (!Array.isArray(slot.replacement) ||
            slot.replacement.length > 100 || slot.replacement.some(value => typeof value !== 'string' || !value.trim()))) {
        throw new Error(`${roomId} 岗位 ${index + 1}：格式错误`)
      }
    }
  }
  if (raw.backup_plans !== undefined && (!Array.isArray(raw.backup_plans) || raw.backup_plans.length > 100)) {
    throw new Error('副表必须为数组，且不能超过 100 张')
  }
  if (raw.conf !== undefined) {
    if (!record(raw.conf)) throw new Error('排班 conf 必须为对象')
    for (const key of policyLists) {
      const list = raw.conf[key]
      if (list !== undefined && typeof list !== 'string' && (!Array.isArray(list) || list.some(value => typeof value !== 'string'))) {
        throw new Error(`排班策略 ${key}：须为干员列表或逗号分隔文本`)
      }
    }
  }
  const workspace = importMowerJson(text)
  if (!Object.values(workspace.mainPlan.facilities).some(room => room.type === 'manufacture' || room.type === 'trading')) {
    throw new Error('排班中没有制造站或贸易站，无法计算收益')
  }
  for (const room of Object.values(workspace.mainPlan.facilities)) {
    if (room.type === 'manufacture' && !['gold', 'exp', 'fragment'].includes(room.product ?? '') ||
        room.type === 'trading' && !['money', 'orundum'].includes(room.product ?? '')) {
      throw new Error(`${getRoomDisplayName(room.roomId)}：未配置有效产物`)
    }
  }
  // Parse every backup now, including trigger participants and scheduled tasks.
  const { validated } = operatorReferences(workspace)
  for (const id of validated) {
    if (!OPERATOR_MAP.has(id)) throw new Error(`排班引用未知干员：${getOperatorName(id)}`)
  }
  return workspace
}

function operatorReferences(workspace: RosterWorkspace) {
  const validated = new Set<string>(backupParticipants(workspace)), required = new Set<string>()
  const add = (value: unknown, needsOwnership = true) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error('副表干员格式错误')
    if (!['Current', 'Free'].includes(value)) {
      const id = resolveOperatorCharId(value.trim())
      validated.add(id)
      if (needsOwnership) required.add(id)
    }
  }
  // Source parsing intentionally skips an entire externally conditioned backup.
  // Still validate its interchange structure and ownership before accepting it.
  for (const backup of workspace.compatibility.backupPlans) {
    if (!record(backup)) throw new Error('副表格式错误')
    compileBackupExpression(backup.trigger, required)
    for (const field of ['plan', 'task', 'conf']) {
      if (backup[field] !== undefined && !record(backup[field])) throw new Error(`副表 ${field} 须为对象`)
    }
    for (const [roomId, raw] of Object.entries((backup.plan ?? {}) as Record<string, unknown>)) {
      const room = workspace.mainPlan.facilities[roomId as keyof typeof workspace.mainPlan.facilities]
      if (!room || room.type === '' || !record(raw) || !Array.isArray(raw.plans) || raw.plans.length > room.slots.length) throw new Error(`副表房间或岗位格式错误：${roomId}`)
      for (const slot of raw.plans) {
        if (!record(slot) || slot.replacement !== undefined && (!Array.isArray(slot.replacement) || slot.replacement.length > 100)) throw new Error('副表岗位格式错误')
        add(slot.agent)
        for (const id of (slot.replacement ?? []) as unknown[]) add(id)
      }
    }
    for (const [roomId, task] of Object.entries((backup.task ?? {}) as Record<string, unknown>)) {
      const room = workspace.mainPlan.facilities[roomId as keyof typeof workspace.mainPlan.facilities]
      if (!room || room.type === '' || !Array.isArray(task) || task.length > room.slots.length) throw new Error(`副表任务格式错误：${roomId}`)
      task.forEach(value => add(value))
    }
    for (const key of policyLists) {
      const list = (backup.conf as Record<string, unknown> | undefined)?.[key]
      if (list === undefined) continue
      if (typeof list === 'string') list.split(/[,，]/).map(value => value.trim()).filter(Boolean).forEach(value => add(value, false))
      else if (Array.isArray(list)) list.forEach(value => add(value, false))
      else throw new Error(`副表策略 ${key} 格式错误`)
    }
  }
  for (const room of Object.values(workspace.mainPlan.facilities)) for (const slot of room.slots) {
    if (slot.occupant.kind === 'operator') add(slot.occupant.operatorId)
    slot.replacements.forEach(id => add(id))
  }
  for (const key of policyLists) {
    const raw = workspace.mainPlan.conf[key]
    const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,，]/).map(value => value.trim()).filter(Boolean) : []
    // Policy lists only flag, rank or exclude existing cards; they do not assign
    // a new operator. Keeping an unowned card on a blacklist is legitimate.
    values.forEach(value => add(String(value), false))
  }
  return { validated, required }
}

export function inspectTheoreticalPlan(payload: unknown) {
  const workspace = readWorkspace(payload)
  const facilities = mowerPlanEntries(workspace.mainPlan.facilities).filter(([, room]) => room.type !== 'gaming' && room.type !== '').map(([roomId, room]) => ({
    roomId, label: getRoomDisplayName(roomId, room.type), type: room.type,
    product: room.product, level: room.level, maxLevel: maxLevel(room.type),
    assumed: !workspace.compatibility.importedPresentRooms?.includes(roomId),
  }))
  return {
    facilities,
    droneTargets: [{ label: '不使用无人机', value: 'none' }, ...facilities.filter(room =>
      room.type === 'trading' || room.type === 'manufacture' && ['gold', 'exp'].includes(room.product ?? ''),
    ).map(room => ({ label: room.label, value: room.roomId }))],
    gameDataVersion: GAME_DATA_VERSION,
  }
}

export function calculateTheoreticalOutput(payload: unknown, config: TheoreticalOutputConfig = {}, onProgress?: (progress: ScheduleSimulationProgress) => void) {
  if (!record(config)) throw new Error('计算配置必须为对象')
  const workspace = readWorkspace(payload)
  const diagnostics: { code: string; message: string }[] = []
  const warmupDays = config.warmupDays ?? 3, sampleDays = config.sampleDays ?? 7
  if (!Number.isFinite(warmupDays) || warmupDays < 0 || warmupDays > 30 ||
      !Number.isFinite(sampleDays) || sampleDays <= 0 || sampleDays > 90) throw new Error('预热须在 0–30 天，采样须大于 0 且不超过 90 天')
  const restingThreshold = config.restingThreshold ?? .65
  if (!Number.isFinite(restingThreshold) || restingThreshold < 0 || restingThreshold > 1) throw new Error('休息阈值须在 0–1 之间')
  for (const key of ['jayeElite0', 'fiammettaFool', 'freeRoom'] as const) {
    if (config[key] !== undefined && typeof config[key] !== 'boolean') throw new Error(`${key} 必须为布尔值`)
  }
  if (config.facilityLevels !== undefined) {
    if (!record(config.facilityLevels)) throw new Error('设施等级须为对象')
    for (const [roomId, level] of Object.entries(config.facilityLevels)) {
      const room = workspace.mainPlan.facilities[roomId as keyof typeof workspace.mainPlan.facilities]
      if (!room || !Number.isInteger(level) || level < 1 || level > maxLevel(room.type)) throw new Error(`${roomId}：无效设施等级`)
      room.level = level
    }
  }
  const validation = validateRosterWorkspace(workspace)
  if (!validation.isValid) throw new Error(validation.criticalErrors.map(issue => issue.message).join('；'))
  diagnostics.push(...validation.warnings.map(issue => ({ code: issue.code, message: issue.message })))
  let inventory: OwnedOperatorInput[] | undefined
  if (config.operatorInventory !== undefined) {
    if (!Array.isArray(config.operatorInventory) || config.operatorInventory.length > 2000) throw new Error('干员库必须为数组，且不能超过 2000 名')
    const references = operatorReferences(workspace).required
    inventory = config.operatorInventory.filter(entry => {
      if (!record(entry) || typeof entry.operator !== 'string') throw new Error('干员库记录格式错误')
      const id = resolveOperatorCharId(entry.operator)
      if (OPERATOR_MAP.has(id)) return true
      if (references.has(id)) throw new Error(`排班引用了技能数据未收录的干员：${entry.operator}`)
      diagnostics.push({ code: 'INVENTORY_UNKNOWN_UNUSED', message: `技能数据未收录 ${entry.operator}，已从空闲干员池排除` })
      return false
    })
    const compiled = compileOperatorInventory(inventory)
    if (!compiled.valid) throw new Error(compiled.diagnostics.map(issue => issue.message).join('；'))
    const owned = new Set(compiled.operators.map(operator => operator.charId))
    const missing = [...references].filter(id => !owned.has(id))
    if (missing.length) throw new Error(`干员库未持有排班引用的干员：${missing.map(getOperatorName).join('、')}`)
    if (config.jayeElite0) diagnostics.push({ code: 'JAYE_STAGE_FROM_INVENTORY', message: '已使用一图流实际练度，孑的精 0 覆盖选项不生效' })
  } else {
    diagnostics.push({ code: 'MAXIMUM_SKILL_ASSUMPTION', message: '未使用干员库：按数据快照最高已解锁技能计算，空闲池使用全目录' })
  }
  const droneRoomId = config.droneRoomId ?? 'none'
  const droneRoom = workspace.mainPlan.facilities[droneRoomId as keyof typeof workspace.mainPlan.facilities]
  if (droneRoomId !== 'none' && (!droneRoom || !(droneRoom.type === 'trading' ||
      droneRoom.type === 'manufacture' && ['gold', 'exp'].includes(droneRoom.product ?? '')))) throw new Error('请选择可用的无人机目标设施')
  const droneTarget = droneRoomId === 'none' ? 'none' : droneRoom!.type === 'trading' ? 'trading' : droneRoom!.product as 'gold' | 'exp'
  const schedule = compileRosterSchedule(workspace, {
    restingThreshold, fiammettaFool: config.fiammettaFool ?? true, freeRoom: config.freeRoom ?? false,
  })
  const report = simulateSchedule(schedule, {
    warmupHours: warmupDays * 24, sampleHours: sampleDays * 24, warmupModel: 'hourly', maxStepHours: .25,
    maxEvents: 200000, recordSegments: false, operatorInventory: inventory,
    jayeElite0: inventory === undefined && (config.jayeElite0 ?? false),
    production: { outputMode: 'potential', inventoryMode: 'unlimited', runOrderMode: 'ideal', seed: 42,
      droneTarget, droneRoomId: droneRoomId === 'none' ? undefined : droneRoomId },
  }, onProgress)
  diagnostics.push(...report.diagnostics)
  if (!report.success || !report.production?.success || Math.abs(report.observedHours - sampleDays * 24) > 1e-6) {
    throw new Error(`模拟未完成，无法报告日产出：${report.diagnostics.map(issue => issue.message).join('；') || '采样窗口未完成'}`)
  }
  if (report.diagnostics.some(issue => issue.code === 'group-blocked') || report.shiftDeferrals?.some(episode => episode.resolvedAt === undefined)) {
    throw new Error('排班仍有无法恢复的分组换班阻塞，不能将结果视为稳定日产出。请检查替补、分组和宿舍床位。')
  }
  const metrics = mowerReportMetrics(report)
  if (!metrics) throw new Error('模拟没有生成可用的收益报告')
  for (const [key, value] of Object.entries(metrics)) {
    if (key !== 'orderDistribution' && value !== null && !Number.isFinite(value)) throw new Error(`收益报告包含无效数值：${key}`)
  }
  if (Object.values(metrics.orderDistribution).some(row => !Number.isFinite(row.count) || !Number.isFinite(row.lmd))) throw new Error('订单分布包含无效数值')
  const factor = 24 / report.observedHours
  const daily = {
    physicalGold: report.production.sample.completed.gold * factor,
    fragment: report.production.manufacturing.filter(room => room.product === 'fragment').reduce((sum, room) => sum + room.sampleCompletedItems, 0) * factor,
    orundum: report.production.events.filter(event => event.type === 'order-completed' && event.time > warmupDays * 24)
      .reduce((sum, event) => sum + (event.order?.orundumReward ?? 0), 0) * factor,
  }
  if (Object.values(daily).some(value => !Number.isFinite(value))) throw new Error('资源日产出包含无效数值')
  return {
    metrics,
    daily,
    diagnostics: [...new Map(diagnostics.map(issue => [`${issue.code}:${issue.message}`, issue])).values()],
    observedHours: report.observedHours, warmupHours: report.assumptions.warmupHours,
    gameDataVersion: GAME_DATA_VERSION,
  }
}
