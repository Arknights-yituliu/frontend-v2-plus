/**
 * Combines the independently calculated parts of one room efficiency.
 * This function has no schedule, candidate, or selection-state dependency.
 */
export function sumRiicRoomEfficiency({
  localPercent = 0,
  staffingPercent = 0,
  localBonusPercent = 0,
  controlFacilityPercent = 0,
  controlOperatorPercent = 0,
} = {}) {
  return [
    localPercent,
    staffingPercent,
    localBonusPercent,
    controlFacilityPercent,
    controlOperatorPercent,
  ].reduce((total, value) => {
    const number = Number(value);
    return total + (Number.isFinite(number) ? number : 0);
  }, 0);
}
