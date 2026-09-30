export const GACHA_CERTIFICATE_STEPS = Object.freeze([
  { cost: 10, draws: 1 },
  { cost: 18, draws: 2 },
  { cost: 40, draws: 5 },
  { cost: 70, draws: 10 },
  { cost: 120, draws: 20 },
]);

const POOL_MONTHS = Object.freeze({
  thanksgiving: [10, 11],
  spring_festival_2027: [10, 11, 12, 1, 2],
});

export function getGachaCertificateMonths(poolId, poolEnd, calculationStart, calculationEnd) {
  const months = POOL_MONTHS[poolId] || [];
  const poolEndDate = new Date(poolEnd);
  const endYear = poolEndDate.getFullYear();
  const endMonth = poolEndDate.getMonth() + 1;
  const start = new Date(calculationStart);
  const end = new Date(calculationEnd);
  if (!Number.isFinite(endYear) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    return [];
  }

  return months.flatMap((month) => {
    const year = month > endMonth ? endYear - 1 : endYear;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return monthEnd >= start && monthStart <= end
      ? [{ id: `${year}-${String(month).padStart(2, "0")}`, label: `${month}月` }]
      : [];
  });
}

export function normalizeGachaCertificateSelections(selectionsByPool, poolIds) {
  return Object.fromEntries(poolIds.map((poolId) => {
    const source = selectionsByPool?.[poolId];
    const selections = {};
    if (source && typeof source === "object" && !Array.isArray(source)) {
      for (const [monthId, level] of Object.entries(source)) {
        if (/^\d{4}-(0[1-9]|1[0-2])$/.test(monthId) && Number.isInteger(level) && level >= 1 && level <= GACHA_CERTIFICATE_STEPS.length) {
          selections[monthId] = level;
        }
      }
    }
    return [poolId, selections];
  }));
}

function getGachaCertificateTotal(months, selections, resource) {
  return months.reduce((total, month) => {
    const level = selections?.[month.id] || 0;
    return total + GACHA_CERTIFICATE_STEPS.slice(0, level).reduce((amount, step) => amount + step[resource], 0);
  }, 0);
}

export function getGachaCertificateDraws(months, selections) {
  return getGachaCertificateTotal(months, selections, "draws");
}

export function getGachaCertificateCost(months, selections) {
  return getGachaCertificateTotal(months, selections, "cost");
}

export function getNextGachaCertificateLevel(currentLevel, clickedLevel) {
  return currentLevel === clickedLevel ? clickedLevel - 1 : clickedLevel;
}
