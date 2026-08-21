/**
 * Calculates the effective power-plant count used by automation skills.
 * The support operator changes the effective count, not the physical layout.
 */
export function getRiicEffectivePowerPlantCount({
  powerPlantCount = 0,
  supportOperatorActive = false,
} = {}) {
  const physicalCount = Number(powerPlantCount);
  const normalizedCount = Number.isFinite(physicalCount) && physicalCount >= 0
    ? physicalCount
    : 0;
  return normalizedCount + (supportOperatorActive === true ? 1 : 0);
}
