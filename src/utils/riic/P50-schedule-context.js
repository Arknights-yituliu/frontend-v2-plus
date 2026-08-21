/**
 * Minimal final-schedule context helper.
 * This is intentionally data-only: it does not read candidate or selection state.
 */
export function createRiicScheduleContext({ schedule, operatorProfiles = [] } = {}) {
  return {
    schedule: schedule && typeof schedule === "object" ? schedule : { plans: [] },
    operatorProfiles: Array.isArray(operatorProfiles) ? operatorProfiles : [],
  };
}
