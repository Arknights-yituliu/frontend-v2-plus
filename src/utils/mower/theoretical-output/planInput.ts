import { OPERATOR_MAP } from './engine/domain/operators'
import { MOWER_ROOM_IDS, MOWER_OPERATOR_LIST_FIELDS, type RosterWorkspace } from './engine/domain/roster'
import { facilityCapacity } from './engine/domain/facilities'
import { backupParticipants } from './engine/scheduler/backupPlans'
import { compileBackupExpression } from './engine/scheduler/backupExpression'
import { readMowerOperatorList, readMowerRemovedOperators } from './engine/scheduler/mowerBackupConfig'
import { readMowerMoodLimits } from './engine/scheduler/mowerMoodLimits'
import { importMowerJson, resolveOperatorCharId } from './engine/workbench/compat/mowerJson'
import { getOperatorName, getRoomDisplayName } from './engine/workbench/operatorHelpers'
import { isFacilityBuilt } from './engine/workbench/facilityState'

export const isIncomeRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
export const incomeFacilityMaxLevel = (type: string) =>
  type === 'central' || type === 'dormitory' ? 5 : type === 'gaming' ? 1 : 3

/** Keep interchange limits separate from the source's roster and overlay rules. */
export function readIncomeWorkspace(payload: unknown): RosterWorkspace {
  let raw: unknown = payload
  if (typeof raw === 'string') {
    if (new TextEncoder().encode(raw).length > 2 * 1024 * 1024) throw new Error('排班文件超过 2 MB')
    try { raw = JSON.parse(raw) } catch { throw new Error('排班文件不是有效的 JSON') }
  }
  if (!isIncomeRecord(raw)) throw new Error('排班必须为 Mower JSON 对象')
  const text = JSON.stringify(raw)
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error('排班文件超过 2 MB')
  const defaultKey = typeof raw.default === 'string' && raw.default.trim() ? raw.default.trim() : 'plan1'
  const main = raw[defaultKey]
  if (!isIncomeRecord(main) || !Object.keys(main).length) throw new Error('主排班为空或不存在')
  const roomIds = new Set<string>(MOWER_ROOM_IDS)
  const known = (name: string) => {
    if (name.trim() && !['free', 'current'].includes(name.trim().toLowerCase()) && !OPERATOR_MAP.has(resolveOperatorCharId(name.trim()))) {
      throw new Error(`排班引用未知干员：${name}`)
    }
  }
  for (const [roomId, facility] of Object.entries(main)) {
    if (!roomIds.has(roomId)) throw new Error(`未知房间：${roomId}`)
    if (!isIncomeRecord(facility) || !Array.isArray(facility.plans)) throw new Error(`${roomId}：缺少有效的 plans 数组`)
    const type = roomId.startsWith('room_') ? ({ 制造站: 'manufacture', 贸易站: 'trading', 发电站: 'power' } as Record<string, string>)[String(facility.name)]
      : roomId.startsWith('dormitory_') ? 'dormitory' : roomId.startsWith('gaming_') ? 'gaming' : roomId
    if (!type) throw new Error(`${roomId}：未知产出设施类型`)
    // Empty serialized positions do not consume staffing capacity.
    if (facility.plans.filter(slot => isIncomeRecord(slot) && typeof slot.agent === 'string' && slot.agent.trim()).length > facilityCapacity(type, incomeFacilityMaxLevel(type))) throw new Error(`${roomId}：岗位数量超过房间容量`)
    for (const [index, slot] of facility.plans.entries()) {
      if (!isIncomeRecord(slot) || typeof slot.agent !== 'string' || slot.group !== undefined && typeof slot.group !== 'string') {
        throw new Error(`${roomId} 岗位 ${index + 1}：格式错误`)
      }
      known(slot.agent)
      const bindings = [slot, ...(slot.group_bindings === undefined ? [] : Array.isArray(slot.group_bindings) ? slot.group_bindings : (() => { throw new Error(`${roomId}：group_bindings 必须为列表`) })())]
      for (const binding of bindings) {
        if (!isIncomeRecord(binding) || binding.group !== undefined && typeof binding.group !== 'string' || binding.replacement !== undefined && (!Array.isArray(binding.replacement) || binding.replacement.length > 100 || binding.replacement.some(name => typeof name !== 'string' || !name.trim()))) {
          throw new Error(`${roomId} 岗位 ${index + 1}：绑组或替补格式错误`)
        }
        for (const name of (binding.replacement ?? []) as string[]) known(name)
      }
    }
  }
  if (raw.backup_plans !== undefined && (!Array.isArray(raw.backup_plans) || raw.backup_plans.length > 100)) throw new Error('副表必须为数组，且不能超过 100 张')
  if (raw.conf !== undefined) {
    if (!isIncomeRecord(raw.conf)) throw new Error('排班 conf 必须为对象')
    for (const field of MOWER_OPERATOR_LIST_FIELDS) readMowerOperatorList(field, raw.conf[field])
  }
  const workspace = importMowerJson(text)
  for (const room of Object.values(workspace.mainPlan.facilities)) {
    if (!isFacilityBuilt(room)) continue
    if (room.type === 'manufacture' && !['gold', 'exp', 'fragment'].includes(room.product ?? '') || room.type === 'trading' && !['money', 'orundum'].includes(room.product ?? '')) {
      throw new Error(`${getRoomDisplayName(room.roomId)}：未配置有效产物`)
    }
  }
  incomeOperatorReferences(workspace)
  return workspace
}

/** Policy flags need known names, while assigned and observed cards need ownership. */
export function incomeOperatorReferences(workspace: RosterWorkspace) {
  const validated = new Set<string>(backupParticipants(workspace)), required = new Set<string>()
  let requiresMasteryPlanState = false
  const add = (value: unknown, needsOwnership = true): string => {
    if (typeof value !== 'string' || !value.trim()) throw new Error('排班干员格式错误')
    const name = value.trim()
    if (['free', 'current'].includes(name.toLowerCase())) return name
    const id = resolveOperatorCharId(name)
    validated.add(id)
    if (needsOwnership) required.add(id)
    return id
  }
  const policies = (conf: Record<string, unknown>) => {
    for (const field of MOWER_OPERATOR_LIST_FIELDS) readMowerOperatorList(field, conf[field], name => add(name, false))
    readMowerRemovedOperators(conf.removed_operators, name => add(name, false))
    readMowerMoodLimits(conf, name => add(name, false))
  }
  for (const room of Object.values(workspace.mainPlan.facilities)) for (const slot of room.slots) {
    if (slot.occupant.kind === 'operator') add(slot.occupant.operatorId)
    for (const binding of [slot, ...(slot.groupBindings ?? [])]) binding.replacements.forEach(id => add(id))
  }
  policies(workspace.mainPlan.conf)
  for (const raw of workspace.compatibility.backupPlans) {
    if (!isIncomeRecord(raw)) throw new Error('副表格式错误')
    const expression = compileBackupExpression(raw.trigger, required)
    requiresMasteryPlanState = requiresMasteryPlanState || expression.usesMasteryPlan
    // The source validates overlay capacities, newly introduced right-side rooms,
    // products, group rules and tasks. Only collect genuine ownership here.
    for (const room of Object.values((raw.plan ?? {}) as Record<string, Record<string, unknown>>)) {
      for (const slot of room.plans as Record<string, unknown>[]) {
        if (slot.agent === 'Current') continue
        add(slot.agent)
        for (const binding of [slot, ...((slot.group_bindings ?? []) as Record<string, unknown>[])]) {
          for (const value of (binding.replacement ?? []) as unknown[]) add(value)
        }
      }
    }
    for (const task of Object.values((raw.task ?? {}) as Record<string, unknown[]>)) task.forEach(value => add(value))
    policies((raw.conf ?? {}) as Record<string, unknown>)
  }
  for (const id of validated) if (!OPERATOR_MAP.has(id)) throw new Error(`排班引用未知干员：${getOperatorName(id)}`)
  return { required, requiresMasteryPlanState }
}
