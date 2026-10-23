import type { AppConfig } from '../domain/types'
import { inventoryOperatorRecords } from '../domain/operatorContext'
import { compileOperatorInventory, fullCatalogIdleInventory, type OperatorInventory } from '../domain/operatorInventory'
import { isSupportOperatorWorking } from '../engine/supportFacilities/conditions'
import { receptionClueEfficiency, RECEPTION_CLUE_BASE_HOURS } from '../engine/supportFacilities/receptionClues'

export interface ReceptionClueReport {
  completed: number
  progress: number
  exchangeMode: 'always-on'
}

const maximumInventory = compileOperatorInventory(fullCatalogIdleInventory())

/** Counts production independently of native clue inventory, Party Time and credit rewards. */
export function createReceptionClueTimeline(
  warmupHours: number,
  inventory: OperatorInventory = maximumInventory,
  initialWorkHours: Readonly<Record<string, number>> = {},
) {
  if (!Number.isFinite(warmupHours) || warmupHours < 0) throw new Error('Invalid reception clue warmup')
  if (!inventory.valid) throw new Error(inventory.diagnostics.map(item => item.message).join('；'))
  for (const hours of Object.values(initialWorkHours))
    if (!Number.isFinite(hours) || hours < 0) throw new Error('Invalid initial reception work hours')
  // The simulator accepts idle-only libraries: absent staffed cards retain its catalog fallback.
  const phases = new Map([...maximumInventory.operators, ...inventory.operators]
    .map(operator => [operator.charId, operator.elitePhase]))
  const operatorRecords = inventoryOperatorRecords(inventory)
  const tenure = new Map<string, number>()
  let progress = 0
  let warmupCompleted = 0
  let initialized = false
  const completed = () => Math.floor(progress + 1e-9)

  function advance(config: AppConfig, duration: number): void {
    if (duration <= 0) return
    const awake = config.facilities.reception
      ? config.facilityOperatorIds.reception.filter(id => isSupportOperatorWorking(config, id)) : []
    for (const id of tenure.keys()) if (!awake.includes(id)) tenure.delete(id)
    // Split the linear Ines ramp at its five-hour cap before midpoint integration.
    const untilCap = 5 - (tenure.get('char_4087_ines') ?? 0)
    if (awake.includes('char_4087_ines') && untilCap > 1e-9 && untilCap < duration - 1e-9) {
      advance(config, untilCap)
      advance(config, duration - untilCap)
      return
    }
    const midTenure = new Map(awake.map(id => [id, (tenure.get(id) ?? 0) + duration / 2]))
    progress += receptionClueEfficiency(config, phases, midTenure) * duration / RECEPTION_CLUE_BASE_HOURS
    for (const id of awake) tenure.set(id, (tenure.get(id) ?? 0) + duration)
  }

  return {
    observe(config: AppConfig, start: number, end: number): void {
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start)
        throw new Error('Invalid reception clue observation interval')
      // The same inventory supplies promotion and unlocked skills, including external providers.
      const current = { ...config, operatorRecords }
      if (!initialized && end > start) {
        initialized = true
        if (start === 0 && current.facilities.reception)
          for (const id of current.facilityOperatorIds.reception)
            if (isSupportOperatorWorking(current, id)) tenure.set(id, initialWorkHours[id] ?? 0)
      }
      if (start < warmupHours) {
        advance(current, Math.min(end, warmupHours) - start)
        warmupCompleted = completed()
      }
      advance(current, end - Math.max(start, warmupHours))
    },
    report(): ReceptionClueReport {
      return { completed: completed() - warmupCompleted, progress: Math.max(0, progress - completed()), exchangeMode: 'always-on' }
    },
  }
}
