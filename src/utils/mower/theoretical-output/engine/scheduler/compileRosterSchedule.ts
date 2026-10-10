import {mowerPlanEntries} from './mowerPlanOrder'
import {mowerDormOrderError} from './mowerGlobalDormOrder'
import {readMowerMoodLimits} from './mowerMoodLimits'
import { isTradeRunOrderOperator } from '../domain/shiftRunPolicy'
import { GAME_DATA_VERSION, OPERATOR_MAP } from '../domain/operators'
import { resolveOperatorCharId } from '../workbench/compat/mowerJson'
import type { MowerMainConf, RosterWorkspace } from '../workbench/model'
import type { CompiledSchedule, CompiledSlot, SimulationAssumptions } from './types'

const LIST_POLICIES = ['exhaust_require', 'rest_in_full', 'resting_priority', 'resting_priority_replacement', 'free_room_exclusions', 'resting_standby', 'free_blacklist', 'workaholic', 'refresh_trading', 'refresh_drained', 'ope_resting_priority'] as const
const DEFAULTS: SimulationAssumptions = {
  schemaVersion: 1, initialMorale: 24, enableParty:false, leifengMode:true, droneIntervalHours:3, droneCountLimit:100, reloadRooms:[], maaGapHours:3, restingThreshold: 0.65, rescueThreshold: 0.75, freeRoom: false, dormOrder: '', groupRestInFullOnMoodGap: true, groupMoodGapMaxExtraWaitHours: 0, mergeIntervalMinutes: 10, enableMastery: true, fiammettaFool: true, fiammettaThreshold: 0.9, operatorMorale: {}, dormAtmosphere: 0,
  initialGold: 0, initialFragments: 0, initialDrones: 0,
  collectionIntervalHours: 0, operationDurationHours: 0, horizonHours: 24 * 90,
  elitePhase: 2, currentOccupants: {},
}
const isKnown = (id: string) => OPERATOR_MAP.has(id)

function safeClone<T>(val: T): T {
  if (val === undefined || val === null) return val
  try {
    return structuredClone(val)
  } catch {
    return JSON.parse(JSON.stringify(val))
  }
}

export function compileRosterSchedule(workspace: RosterWorkspace, options: Partial<SimulationAssumptions> = {}): CompiledSchedule {
  const sourceWorkspace = safeClone(workspace)
  const assumptions = { ...DEFAULTS, ...safeClone(options), schemaVersion: 1 as const }
  // User contract: Party Time is a fixed disabled external condition.
  assumptions.enableParty=false
  assumptions.operatorMorale = safeClone(options.operatorMorale ?? {})
  assumptions.currentOccupants = safeClone(options.currentOccupants ?? {})
  const diagnostics: CompiledSchedule['diagnostics'] = []
  const invalid = (path: string, message: string) => diagnostics.push({ code: 'INVALID_ASSUMPTION', severity: 'error', path, message })
  if(assumptions.runOrderSimulationMode!==undefined&&assumptions.runOrderSimulationMode!=='ideal')invalid('assumptions.runOrderSimulationMode','Invalid simulation run-order mode')
  for (const key of ['enableMastery','enableParty','leifengMode'] as const) if (typeof assumptions[key] !== 'boolean') invalid('assumptions.'+key, 'Native scheduling switch must be boolean')
  for(const key of ['droneIntervalHours','maaGapHours'] as const)if(!Number.isFinite(assumptions[key])||assumptions[key]!<0)invalid('assumptions.'+key,'Native service interval must be nonnegative and finite')
  if(!Number.isInteger(assumptions.droneCountLimit)||assumptions.droneCountLimit!<0)invalid('assumptions.droneCountLimit','Native drone reserve must be a nonnegative integer')
  if(assumptions.reloadRooms!==null&&(!Array.isArray(assumptions.reloadRooms)||assumptions.reloadRooms.some(room=>typeof room!=='string')))invalid('assumptions.reloadRooms','Native reload room list must be null or an array')
  if (typeof assumptions.groupRestInFullOnMoodGap !== 'boolean') invalid('assumptions.groupRestInFullOnMoodGap', 'group_rest_in_full_on_mood_gap must be boolean')
  if (!Number.isFinite(assumptions.groupMoodGapMaxExtraWaitHours) || assumptions.groupMoodGapMaxExtraWaitHours! < 0 || assumptions.groupMoodGapMaxExtraWaitHours! > 24) invalid('assumptions.groupMoodGapMaxExtraWaitHours', 'group_mood_gap_max_extra_wait_hours must be within 0..24')
  if (!Number.isFinite(assumptions.mergeIntervalMinutes)) invalid('assumptions.mergeIntervalMinutes', 'merge_interval must be finite')
  if (typeof assumptions.freeRoom !== 'boolean') invalid('assumptions.freeRoom', 'free_room must be boolean')
  if (!Number.isFinite(assumptions.restingThreshold) || assumptions.restingThreshold! < 0 || assumptions.restingThreshold! > 1) invalid('assumptions.restingThreshold', 'Resting threshold must be within 0..1')
  if (!Number.isFinite(assumptions.initialMorale) || assumptions.initialMorale < 0 || assumptions.initialMorale > 24) invalid('assumptions.initialMorale', '初始心情必须为 0–24 的有限数')
  if (!Number.isFinite(assumptions.horizonHours) || assumptions.horizonHours <= 0) invalid('assumptions.horizonHours', '模拟时长必须为正有限数')
  if (!Number.isFinite(assumptions.initialGold) || assumptions.initialGold < 0) invalid('assumptions.initialGold', '初始赤金不能为负数')
  for (const [id, morale] of Object.entries(assumptions.operatorMorale)) if (!Number.isFinite(morale) || morale < 0 || morale > 24) invalid(`assumptions.operatorMorale.${id}`, '干员心情必须为 0–24 的有限数')

  if (assumptions.idleOperators) assumptions.idleOperators = [...new Set(assumptions.idleOperators.map(resolveOperatorCharId))]
  if (assumptions.idleOperators?.some(id => !isKnown(id))) invalid('assumptions.idleOperators', 'Unknown idle operator')
  for (const key of ['rescueThreshold', 'fiammettaThreshold'] as const) if (!Number.isFinite(assumptions[key]) || assumptions[key]! < 0 || assumptions[key]! > 1) invalid(`assumptions.${key}`, 'Threshold must be within 0..1')
  const rawConf = structuredClone(workspace.mainPlan.conf)
  const policies = structuredClone(rawConf) as MowerMainConf
  for (const key of LIST_POLICIES) {
    const raw = rawConf[key]
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.replace(/，/g, ',').split(',').map(value=>value.trim()).filter(Boolean) : []
    policies[key] = list.map(value=>resolveOperatorCharId(String(value)))
  }
  try {readMowerMoodLimits(rawConf,name=>{const id=resolveOperatorCharId(name);if(!isKnown(id))throw new Error('Unknown mood-limit operator: '+name);return id})}catch(error){diagnostics.push({code:'INVALID_MOOD_LIMITS',severity:'error',path:'mainPlan.conf',message:error instanceof Error?error.message:String(error)})}
  const knownPolicyKeys = new Set(['ling_xi', 'free_blacklist','mood_limits','operator_mood_limits','dorm_order','dorm_order_override', ...LIST_POLICIES])
  for (const key of Object.keys(rawConf)) if (!knownPolicyKeys.has(key)) diagnostics.push({ code: 'UNKNOWN_POLICY', severity: 'warning', path: `mainPlan.conf.${key}`, message: `保留但不执行未知策略 ${key}` })

  const operators: CompiledSchedule['operators'] = {}
  const restPools: CompiledSchedule['restPools'] = []
  const fiammettaPolicies: CompiledSchedule['fiammettaPolicies'] = []
  const runOrderPolicies: CompiledSchedule['runOrderPolicies'] = []
  const rooms = mowerPlanEntries(workspace.mainPlan.facilities).filter(([, facility]) => facility.level > 0).map(([,facility]) => {
    const freeSlotIndices: number[] = []
    const runCandidates: string[] = []
    const slots = facility.slots.map((slot, slotIndex) => {
      let primaryOperatorId: string | null = null
      if (slot.occupant.kind === 'operator') primaryOperatorId = resolveOperatorCharId(slot.occupant.operatorId)
      if (slot.occupant.kind === 'current') {
        const current = assumptions.currentOccupants[facility.roomId]?.[slotIndex]
        if (current) primaryOperatorId = resolveOperatorCharId(current)
        else diagnostics.push({ code: 'CURRENT_STATE_REQUIRED', severity: 'error', path: `${facility.roomId}.slots.${slotIndex}`, message: 'Current 需要显式当前干员状态' })
      }
      const orderedCandidates = slot.replacements.map(resolveOperatorCharId)
      for (const [candidateIndex, id] of orderedCandidates.entries()) {
        if(id==='Free'&&facility.type==='dormitory'&&slot.groupId&&primaryOperatorId&&OPERATOR_MAP.get(primaryOperatorId)?.name!=='菲亚梅塔')continue
        if (!isKnown(id)) diagnostics.push({ code: 'UNKNOWN_OPERATOR', severity: 'warning', path: `${facility.roomId}.slots.${slotIndex}.replacements.${candidateIndex}`, message: `未知干员 ${id}` })
      }
      if (primaryOperatorId && !isKnown(primaryOperatorId)) diagnostics.push({ code: 'UNKNOWN_OPERATOR', severity: 'warning', path: `${facility.roomId}.slots.${slotIndex}.occupant`, message: `未知干员 ${primaryOperatorId}` })
      const isFiammetta = primaryOperatorId ? OPERATOR_MAP.get(primaryOperatorId)?.name === '菲亚梅塔' : false
      const role: CompiledSlot['role'] = slot.occupant.kind === 'free' ? 'free-rest' : isFiammetta ? 'fiammetta' : facility.type === 'dormitory' ? 'dorm-keeper' : 'work'
      if (role === 'free-rest') freeSlotIndices.push(slotIndex)
      if (isFiammetta && primaryOperatorId) fiammettaPolicies.push({ roomId: facility.roomId, slotIndex, operatorId: primaryOperatorId, orderedTargets: [...orderedCandidates] })
      if (facility.type === 'trading') for (const id of orderedCandidates) {
        if (isTradeRunOrderOperator(id)) runCandidates.push(id)
      }
      if (primaryOperatorId) operators[primaryOperatorId] = { operatorId: primaryOperatorId, morale: assumptions.operatorMorale[primaryOperatorId] ?? assumptions.initialMorale, roomId: facility.roomId, slotIndex }
      const slotMeta = (slot as { metadata?: Record<string, unknown> }).metadata
      return { roomId: facility.roomId, slotIndex, occupant: structuredClone(slot.occupant), primaryOperatorId, orderedCandidates, groupId: slot.groupId, role, metadata: slotMeta ? structuredClone(slotMeta) : undefined }
    })
    if (freeSlotIndices.length) restPools.push({ roomId: facility.roomId, capacity: freeSlotIndices.length, freeSlotIndices })
    if (runCandidates.length) runOrderPolicies.push({ roomId: facility.roomId, orderedOperatorIds: runCandidates })
    return { roomId: facility.roomId, type: facility.type, level: facility.level, product: facility.product, capacity: facility.slots.length, slots }
  })
  if(typeof assumptions.dormOrder!=='string')invalid('assumptions.dormOrder','dorm_order must be a string')
  else {
    const error=mowerDormOrderError(assumptions.dormOrder,restPools.flatMap(pool=>pool.freeSlotIndices.map(index=>pool.roomId+'_'+index)))
    if(error)invalid('assumptions.dormOrder',error)
  }
  const defaultsApplied = Object.keys(DEFAULTS).filter((key) => options[key as keyof SimulationAssumptions] === undefined)
  return {
    schemaVersion: 1, rooms, operators, restPools, policies, rawConf, runOrderPolicies,
    fiammettaPolicies, diagnostics, sourceWorkspace,
    assumptions: { ...assumptions, dataVersion: GAME_DATA_VERSION, compilerVersion: '1', levelSource: 'workspace-inferred', importSource: workspace.compatibility.sourceVersion ?? 'workspace', defaultsApplied },
  }
}
