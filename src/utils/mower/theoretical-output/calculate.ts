import { GAME_DATA_VERSION, OPERATOR_MAP } from './engine/domain/operators'
import { compileOperatorInventory, type OwnedOperatorInput } from './engine/domain/operatorInventory'
import { compileRosterSchedule } from './engine/scheduler/compileRosterSchedule'
import { mowerPlanEntries } from './engine/scheduler/mowerPlanOrder'
import { simulateSchedule, type ScheduleSimulationProgress } from './engine/simulator/scheduleSimulation'
import { resolveOperatorCharId } from './engine/workbench/compat/mowerJson'
import { getOperatorName, getRoomDisplayName } from './engine/workbench/operatorHelpers'
import { mowerReportMetrics } from './engine/workbench/mowerReportMetrics'
import { isFacilityBuilt } from './engine/workbench/facilityState'
import { validateRosterWorkspace } from './engine/workbench/validate'
import { isDroneCapacity, resolveDroneCapacity } from './engine/domain/droneCapacity'
import { readIncomeWorkspace, incomeOperatorReferences, incomeFacilityMaxLevel, isIncomeRecord } from './planInput'

export interface TheoreticalOutputConfig {
  warmupDays?: number
  sampleDays?: number
  seed?: number
  droneRoomId?: string
  droneCapacity?: number
  masteryPlanPresent?: boolean
  facilityLevels?: Record<string, number>
  operatorInventory?: OwnedOperatorInput[]
  jayeElite0?: boolean
  restingThreshold?: number
  fiammettaFool?: boolean
  freeRoom?: boolean
}
export function inspectTheoreticalPlan(payload: unknown) {
  const workspace = readIncomeWorkspace(payload)
  const assumptions = compileRosterSchedule(workspace).assumptions
  const facilities = mowerPlanEntries(workspace.mainPlan.facilities).filter(([, room]) => room.type !== 'gaming' && room.type !== '').map(([roomId, room]) => ({
    roomId, label: getRoomDisplayName(roomId, isFacilityBuilt(room) ? room.type : undefined), type: room.type,
    product: room.product, level: room.level, maxLevel: incomeFacilityMaxLevel(room.type),
    assumed: !workspace.compatibility.importedPresentRooms?.includes(roomId),
    editable: !roomId.startsWith('room_') || !!workspace.compatibility.importedPresentRooms?.includes(roomId),
    canBeUnbuilt: room.slots.every(slot => slot.occupant.kind === 'empty' && !slot.groupId && !slot.replacements.length && !slot.groupBindings?.length),
  }))
  return {
    facilities,
    requiresMasteryPlanState: incomeOperatorReferences(workspace).requiresMasteryPlanState,
    droneCapacity: resolveDroneCapacity(workspace),
    scheduleSettings: {
      restingThreshold: assumptions.restingThreshold,
      fiammettaFool: assumptions.fiammettaFool,
      freeRoom: assumptions.freeRoom,
    },
    droneTargets: [{ label: '不使用无人机', value: 'none' }, ...facilities.filter(room => room.level > 0 && (
      room.type === 'trading' || room.type === 'manufacture' && ['gold', 'exp'].includes(room.product ?? '')),
    ).map(room => ({ label: room.label, value: room.roomId }))],
    gameDataVersion: GAME_DATA_VERSION,
  }
}

export function calculateTheoreticalOutput(payload: unknown, config: TheoreticalOutputConfig = {}, onProgress?: (progress: ScheduleSimulationProgress) => void) {
  if (!isIncomeRecord(config)) throw new Error('计算配置必须为对象')
  const requestedSeed = config.seed ?? -1
  if (!Number.isSafeInteger(requestedSeed) || requestedSeed < -1 || requestedSeed > 0xffffffff) {
    throw new Error('随机种子须为 -1 或 0–4294967295 的整数；-1 表示每次随机')
  }
  const workspace = readIncomeWorkspace(payload)
  const diagnostics: { code: string; message: string }[] = []
  const warmupDays = config.warmupDays ?? 3, sampleDays = config.sampleDays ?? 7
  if (!Number.isFinite(warmupDays) || warmupDays < 0 || warmupDays > 30 ||
      !Number.isFinite(sampleDays) || sampleDays <= 0 || sampleDays > 90) throw new Error('预热须在 0–30 天，采样须大于 0 且不超过 90 天')
  if (config.restingThreshold !== undefined && (!Number.isFinite(config.restingThreshold) || config.restingThreshold < 0 || config.restingThreshold > 1)) throw new Error('休息阈值须在 0–1 之间')
  for (const key of ['jayeElite0', 'fiammettaFool', 'freeRoom', 'masteryPlanPresent'] as const) {
    if (config[key] !== undefined && typeof config[key] !== 'boolean') throw new Error(`${key} 必须为布尔值`)
  }
  if (config.droneCapacity !== undefined && !isDroneCapacity(config.droneCapacity)) throw new Error('无人机容量须为非负安全整数')
  if (config.droneCapacity !== undefined) workspace.droneCapacity = config.droneCapacity
  const droneCapacity = resolveDroneCapacity(workspace)
  const references = incomeOperatorReferences(workspace)
  if (references.requiresMasteryPlanState && config.masteryPlanPresent === undefined) throw new Error('排班使用训练计划触发条件，请明确是否存在未完成的训练计划')
  if (config.facilityLevels !== undefined) {
    if (!isIncomeRecord(config.facilityLevels)) throw new Error('设施等级须为对象')
    for (const [roomId, level] of Object.entries(config.facilityLevels)) {
      const room = workspace.mainPlan.facilities[roomId as keyof typeof workspace.mainPlan.facilities]
      if (!room || room.type === '' || room.type === 'gaming' || !Number.isInteger(level) || level < 0 || level > incomeFacilityMaxLevel(room.type)) throw new Error(`${roomId}：无效设施等级`)
      if (level > 0 && roomId.startsWith('room_') && !workspace.compatibility.importedPresentRooms?.includes(roomId)) {
        throw new Error(`${getRoomDisplayName(roomId)}：排班未声明设施类型，不能补建，请先修改并重新导入排班`)
      }
      room.level = level
    }
  }
  const validation = validateRosterWorkspace(workspace)
  if (!validation.isValid) throw new Error(validation.criticalErrors.map(issue => issue.message).join('；'))
  if (!Object.values(workspace.mainPlan.facilities).some(room => isFacilityBuilt(room) && (room.type === 'manufacture' || room.type === 'trading'))) {
    throw new Error('排班中没有已建造的制造站或贸易站，无法计算收益')
  }
  diagnostics.push(...validation.warnings.map(issue => ({ code: issue.code, message: issue.message })))
  diagnostics.push(...(workspace.compatibility.migrationWarnings ?? []).map(message => ({ code: 'MOWER_DOCUMENT_MIGRATION', message })))
  let inventory: OwnedOperatorInput[] | undefined
  if (config.operatorInventory !== undefined) {
    if (!Array.isArray(config.operatorInventory) || config.operatorInventory.length > 2000) throw new Error('干员库必须为数组，且不能超过 2000 名')
    const requiredOperators = references.required
    inventory = config.operatorInventory.filter(entry => {
      if (!isIncomeRecord(entry) || typeof entry.operator !== 'string') throw new Error('干员库记录格式错误')
      const id = resolveOperatorCharId(entry.operator.trim())
      if (OPERATOR_MAP.has(id)) return true
      if (requiredOperators.has(id)) throw new Error(`排班引用了技能数据未收录的干员：${entry.operator}`)
      diagnostics.push({ code: 'INVENTORY_UNKNOWN_UNUSED', message: `技能数据未收录 ${entry.operator}，已从空闲干员池排除` })
      return false
    })
    const compiled = compileOperatorInventory(inventory)
    if (!compiled.valid) throw new Error(compiled.diagnostics.map(issue => issue.message).join('；'))
    const owned = new Set(compiled.operators.map(operator => operator.charId))
    const missing = [...requiredOperators].filter(id => !owned.has(id))
    if (missing.length) throw new Error(`干员库未持有排班引用的干员：${missing.map(getOperatorName).join('、')}`)
    if (config.jayeElite0) diagnostics.push({ code: 'JAYE_STAGE_FROM_INVENTORY', message: '已使用一图流实际练度，孑的精 0 覆盖选项不生效' })
  } else {
    diagnostics.push({ code: 'MAXIMUM_SKILL_ASSUMPTION', message: '未使用干员库：按数据快照最高已解锁技能计算，空闲池使用全目录' })
  }
  const droneRoomId = config.droneRoomId ?? 'none'
  const droneRoom = workspace.mainPlan.facilities[droneRoomId as keyof typeof workspace.mainPlan.facilities]
  if (droneRoomId !== 'none' && (!isFacilityBuilt(droneRoom) || !(droneRoom.type === 'trading' ||
      droneRoom.type === 'manufacture' && ['gold', 'exp'].includes(droneRoom.product ?? '')))) throw new Error('请选择可用的无人机目标设施')
  const droneTarget = droneRoomId === 'none' ? 'none' : droneRoom!.type === 'trading' ? 'trading' : droneRoom!.product as 'gold' | 'exp'
  const schedule = compileRosterSchedule(workspace, {
    restingThreshold: config.restingThreshold,
    fiammettaFool: config.fiammettaFool,
    freeRoom: config.freeRoom,
    masteryPlanPresent: config.masteryPlanPresent,
  })
  const report = simulateSchedule(schedule, {
    schedulingModel: 'mower-alpha',
    warmupHours: warmupDays * 24, sampleHours: sampleDays * 24, warmupModel: 'hourly', maxStepHours: .25,
    maxEvents: 200000, recordSegments: false, operatorInventory: inventory,
    jayeElite0: inventory === undefined && (config.jayeElite0 ?? false),
    production: { outputMode: 'potential', inventoryMode: 'unlimited', runOrderMode: 'ideal',
      seed: requestedSeed === -1 ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] : requestedSeed,
      droneTarget, droneRoomId: droneRoomId === 'none' ? undefined : droneRoomId },
  }, onProgress)
  diagnostics.push(...report.diagnostics)
  if (!report.success || !report.production?.success || Math.abs(report.observedHours - sampleDays * 24) > 1e-6) {
    throw new Error(`模拟未完成，无法报告日产出：${report.diagnostics.map(issue => issue.message).join('；') || '采样窗口未完成'}`)
  }
  if (report.diagnostics.some(issue => issue.code === 'group-blocked') || report.shiftDeferrals?.some(episode => episode.resolvedAt === undefined)) {
    diagnostics.push({ code: 'SHIFT_DEFERRAL_UNCONFIRMED', message: '模拟记录了尚未确认全部恢复的分组换班延后。以下为本次采样窗口的日均折算，不能据此确认长期稳定产出；请核对替补、分组及宿舍床位。' })
  }
  const metrics = mowerReportMetrics(report)
  if (!metrics) throw new Error('模拟没有生成可用的收益报告')
  for (const [key, value] of Object.entries(metrics)) {
    if (key !== 'orderDistribution' && key !== 'scoreBreakdown' && value !== null && !Number.isFinite(value)) throw new Error(`收益报告包含无效数值：${key}`)
  }
  if (Object.values(metrics.scoreBreakdown).some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('收益评分明细包含无效数值')
  if (Object.values(metrics.orderDistribution).some(row => !Number.isFinite(row.count) || !Number.isFinite(row.lmd))) throw new Error('订单分布包含无效数值')
  const factor = 24 / report.observedHours
  const daily = {
    physicalGold: report.production.sample.completed.gold * factor,
    recycle: (report.production.recycle?.sampleCompletedItems ?? 0) * factor,
    fragment: report.production.manufacturing.filter(room => room.product === 'fragment').reduce((sum, room) => sum + room.sampleCompletedItems, 0) * factor,
    orundum: report.production.events.filter(event => event.type === 'order-completed' && event.time > warmupDays * 24)
      .reduce((sum, event) => sum + (event.order?.orundumReward ?? 0), 0) * factor,
  }
  if (Object.values(daily).some(value => !Number.isFinite(value))) throw new Error('资源日产出包含无效数值')
  return {
    schedulingModel: 'mower-alpha' as const,
    droneCapacity,
    ...(config.masteryPlanPresent === undefined ? {} : { masteryPlanPresent: config.masteryPlanPresent }),
    requestedSeed,
    seed: report.production.assumptions.seed,
    metrics,
    daily,
    ...(report.production.recycle ? { recycle: report.production.recycle } : {}),
    diagnostics: [...new Map(diagnostics.map(issue => [`${issue.code}:${issue.message}`, issue])).values()],
    shiftDeferrals: report.shiftDeferrals ?? [],
    observedHours: report.observedHours, warmupHours: report.assumptions.warmupHours,
    gameDataVersion: GAME_DATA_VERSION,
  }
}
