/**
 * Calculates the effective power-plant count used by automation skills.
 * Count adjustments change the effective count, not the physical layout.
 */
export function getRiicEffectivePowerPlantCount({
  powerPlantCount = 0,
  countAdjustments = [],
} = {}) {
  const physicalCount = Number(powerPlantCount);
  const normalizedCount = Number.isFinite(physicalCount) && physicalCount >= 0
    ? physicalCount
    : 0;
  const adjustmentCount = (countAdjustments || []).reduce(
    (total, adjustment) => {
      if (adjustment?.facilityType !== "power") {
        return total;
      }
      const amount = Number(adjustment?.bonusCount);
      return total + (Number.isFinite(amount) ? amount : 0);
    },
    0,
  );
  return Math.max(0, normalizedCount + adjustmentCount);
}
