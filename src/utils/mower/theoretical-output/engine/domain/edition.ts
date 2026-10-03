import type { SpecialOrder } from './types'

export interface CalculatorEdition {
  id: 'standard' | 'shift-run'
  label: string
  description: string
  storageNamespace: string
  allowShiftRun: boolean
  importLegacyConfig: boolean
  defaultSpecialOrder: SpecialOrder
}

export const EDITION: CalculatorEdition = {
  id: 'shift-run',
  label: '跑单排班版',
  description: '以但书与龙舌兰换入跑单为核心，贸易站默认启用跑单。',
  storageNamespace: 'shift-run',
  allowShiftRun: true,
  importLegacyConfig: false,
  defaultSpecialOrder: 'shiftRun',
}
