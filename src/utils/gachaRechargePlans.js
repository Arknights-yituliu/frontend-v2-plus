export function getGachaPoolSchedule(poolId, pools, schedules) {
  const pool = pools.find((item) => item.id === poolId);
  return pool ? schedules[pool.scheduleIndex] : undefined;
}

export function normalizeGachaRechargeOverrides(savedOverrides, poolIds) {
  const normalized = Object.fromEntries(poolIds.map((poolId) => [poolId, {}]));
  for (const poolId of poolIds) {
    const overrides = savedOverrides?.[poolId];
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) continue;
    for (const [planId, fields] of Object.entries(overrides)) {
      if (!["monthly-card", "monthly-pack"].includes(planId) && !planId.startsWith("history:")) continue;
      if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;
      const entry = {};
      if (typeof fields.title === "string") entry.title = fields.title;
      if (fields.hidden === true) entry.hidden = true;
      for (const field of ["price", "draws"]) {
        const value = Number(fields[field]);
        if (fields[field] !== null && fields[field] !== undefined && Number.isFinite(value) && value >= 0) {
          entry[field] = field === "price" ? Math.round(value) : value;
        }
      }
      if (Object.keys(entry).length) normalized[poolId][planId] = entry;
    }
  }
  return normalized;
}

export function countRemainingDays(startTimestamp, endDate) {
  const date = new Date(startTimestamp);
  const end = new Date(endDate);
  let days = 0;
  while (date <= end) {
    days++;
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function applyGachaRechargeOverride(plan, override) {
  if (!override) return plan;
  const draws = override.draws ?? plan.draws;
  return {
    ...plan,
    price: override.price ?? plan.price,
    title: override.title ?? plan.title,
    draws,
    drawAdjustment: draws - plan.draws,
    hidden: override.hidden === true,
  };
}

export function getVisibleGachaRechargePlans(plans, overrides) {
  return plans
    .map((plan) => applyGachaRechargeOverride(plan, overrides?.[plan.id]))
    .filter((plan) => !plan.hidden);
}

export function getEstimatedRechargePacks(packs, poolId, currentTimestamp, calculationEnd) {
  const windows = PACK_SOURCE_WINDOWS_BY_POOL[poolId] || [];
  return packs.flatMap((pack) => {
    if (pack.saleType !== "activity" || !(pack.drawEfficiency > MONTHLY_PACK_DRAW_EFFICIENCY)) return [];

    for (const window of windows) {
      const overlapStart = Math.max(pack.start, window.start);
      const overlapEnd = Math.min(pack.end, window.end);
      if (overlapStart > overlapEnd) continue;

      const start = window.projectedYears ? shiftCalendarYear(overlapStart, window.projectedYears) : pack.start;
      const end = window.projectedYears ? shiftCalendarYear(overlapEnd, window.projectedYears) : pack.end;
      if (start > calculationEnd.getTime() || end < currentTimestamp) continue;

      return [{
        ...pack,
        id: `${pack.saleType}\u0001${pack.officialName}\u0001${pack.price}\u0001${pack.start}`,
        start,
        end,
      }];
    }
    return [];
  });
}

export function countPurchasableMonths(startTimestamp, endDate) {
  const start = new Date(startTimestamp);
  const end = new Date(endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    return 0;
  }

  // A month already underway at the calculation start is not counted as a future purchase.
  const firstPurchasableMonth = start.getDate() === 1 ? start.getMonth() : start.getMonth() + 1;
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - firstPurchasableMonth + 1);
}

export function sumGachaRechargePlans(plans, originiumIsUsed) {
  const total = {
    price: 0,
    orundum: 0,
    originium: 0,
    gachaTicket: 0,
    tenGachaTicket: 0,
    customDraws: 0,
  };

  for (const plan of plans) {
    total.price += Number(plan.price) || 0;
    if (plan.type === "custom") {
      total.customDraws += Number(plan.draws) || 0;
    } else {
      total.customDraws += Number(plan.drawAdjustment) || 0;
      total.orundum += Number(plan.orundum) || 0;
      total.originium += Number(plan.originium) || 0;
      total.gachaTicket += Number(plan.gachaTicket) || 0;
      total.tenGachaTicket += Number(plan.tenGachaTicket) || 0;
    }
  }

  total.draws = total.orundum / 600 + (originiumIsUsed ? total.originium * 0.3 : 0) +
    total.gachaTicket + total.tenGachaTicket * 10 + total.customDraws;
  return total;
}
const ORIGINAL_DRAW_PRICE = 648 / 185 / 0.3;
export const MONTHLY_PACK_DRAW_EFFICIENCY = ORIGINAL_DRAW_PRICE / (168 / (10 + 42 * 0.3));

function shiftCalendarYear(timestamp, years) {
  const date = new Date(timestamp);
  date.setFullYear(date.getFullYear() + years);
  return date.getTime();
}

function sourceWindow(startYear, startMonth, endYear, endMonth, projectedYears) {
  return {
    start: new Date(startYear, startMonth - 1, 1).getTime(),
    end: new Date(endYear, endMonth, 0, 23, 59, 59, 999).getTime(),
    projectedYears,
  };
}

const actualOctober = sourceWindow(2026, 10, 2026, 10, 0);
const PACK_SOURCE_WINDOWS_BY_POOL = {
  thanksgiving: [actualOctober, sourceWindow(2025, 11, 2025, 11, 1)],
  spring_festival_2027: [actualOctober, sourceWindow(2025, 11, 2026, 2, 1)],
};
