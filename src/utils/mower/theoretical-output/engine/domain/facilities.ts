/** Pendant seats share one auxiliary tier, ahead of dormitory beds. */
export const PENDANT_AUXILIARY_FACILITIES = ['factory', 'train', 'recycle'] as const

/** Physical staffing capacity, independent of output scoring or UI layout. */
export function facilityCapacity(type: string, level: number): number {
  if (level <= 0) return 0
  if (type === 'manufacture' || type === 'trading') return level
  if (type === 'central') return level
  if (type === 'dormitory') return 5
  if (type === 'meeting' || type === 'train') return 2
  if (type === 'recycle') return level === 1 ? 1 : 2
  return ['power', 'contact', 'factory', 'gaming'].includes(type) ? 1 : 0
}
