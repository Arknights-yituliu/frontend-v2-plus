// Mower 19a3229691928d42dc1ac98b6fe3969bb54b3966 maintenance primary ownership (MIT).
import { OPERATOR_MAP } from '../domain/operators'
import type { RuntimeConfig } from './rosterRuntime'

interface MaintenanceBackup {
  usesMajorMaintenance: boolean
  slots: readonly { room: string; index: number; agent: string }[]
}
const nativeRunners = new Set(['但书', '龙舌兰', '佩佩', '可露希尔'])

/** Current keeps the previous slot owner; every explicit later overlay replaces it. */
export function applyMowerMaintenanceRunOrders(config: RuntimeConfig, plans: readonly MaintenanceBackup[], active: readonly boolean[]): void {
  const maintenanceSlots = new Set<string>()
  plans.forEach((plan, planIndex) => {
    if (!active[planIndex]) return
    for (const slot of plan.slots) {
      if (slot.agent === 'Current') continue
      const position = slot.room + '\0' + slot.index
      maintenanceSlots.delete(position)
      if (plan.usesMajorMaintenance && nativeRunners.has(OPERATOR_MAP.get(slot.agent)?.name ?? slot.agent)) maintenanceSlots.add(position)
    }
  })
  config.mowerMaintenanceRunOrderPaused = maintenanceSlots.size > 0
  // The supported ideal model converts future completions without arranging runners.
  if (config.mowerMaintenanceRunOrderPaused) config.runOrderPolicies = []
}
