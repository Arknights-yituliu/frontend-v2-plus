import assert from "node:assert/strict";
import { test } from "node:test";
import { applyGachaRechargeOverride, countPurchasableMonths, countRemainingDays, getEstimatedRechargePacks, getGachaPoolSchedule, getVisibleGachaRechargePlans, MONTHLY_PACK_DRAW_EFFICIENCY, normalizeGachaRechargeOverrides, sumGachaRechargePlans } from "./gachaRechargePlans.js";

test("hidden automatic plans leave the total and return when overrides are reset", () => {
  const plans = [{ id: "monthly-pack", type: "monthly-pack", price: 168, draws: 22.6,
    originium: 42, tenGachaTicket: 1 }];
  const hidden = getVisibleGachaRechargePlans(plans, { "monthly-pack": { hidden: true } });
  assert.equal(hidden.length, 0);
  assert.equal(sumGachaRechargePlans(hidden, true).draws, 0);
  assert.equal(getVisibleGachaRechargePlans(plans, {}).length, 1);
});
import { createGachaScheduleOptions } from "./gachaScheduleOptions.js";

test("resolves every video pool through its schedule index", () => {
  const schedules = createGachaScheduleOptions();
  const pools = schedules.map((schedule, scheduleIndex) => ({ id: schedule.id, scheduleIndex }));
  for (const pool of pools) {
    assert.equal(getGachaPoolSchedule(pool.id, pools, schedules)?.lastDrawDate,
      schedules[pool.scheduleIndex].lastDrawDate);
  }
  assert.equal(getGachaPoolSchedule("missing", pools, schedules), undefined);
});

test("restores valid per-pool overrides and defaults old settings to empty", () => {
  assert.deepEqual(normalizeGachaRechargeOverrides(undefined, ["pool-a", "pool-b"]), {
    "pool-a": {}, "pool-b": {},
  });
  assert.deepEqual(normalizeGachaRechargeOverrides({
    "pool-a": {
      "monthly-pack": { title: "Revised", price: 336.4, draws: 45.2, hidden: true },
      "history:valid": { draws: -1 },
      "custom-plan": { price: 10 },
    },
    unknown: { "monthly-card": { price: 999 } },
  }, ["pool-a", "pool-b"]), {
    "pool-a": { "monthly-pack": { title: "Revised", price: 336, draws: 45.2, hidden: true } },
    "pool-b": {},
  });
});

test("calculation days include both the start and pool deadline", () => {
  assert.equal(countRemainingDays(new Date(2026, 9, 1, 12), new Date(2026, 9, 2, 23, 59)), 2);
  assert.equal(countRemainingDays(new Date(2026, 9, 3), new Date(2026, 9, 2)), 0);
});

test("an automatic-plan draw override replaces its estimate without changing the source pack", () => {
  const source = { type: "history", title: "Festival Pack", price: 68, draws: 2.3, originium: 1, gachaTicket: 2 };
  const edited = applyGachaRechargeOverride(source, { price: 70, title: "Revised", draws: 3.5 });
  assert.equal(edited.title, "Revised");
  assert.equal(source.price, 68);
  assert.equal(sumGachaRechargePlans([edited], true).draws, 3.5);
  assert.equal(sumGachaRechargePlans([edited], true).price, 70);
  assert.equal(applyGachaRechargeOverride(source, undefined), source);
  assert.equal(applyGachaRechargeOverride(source, { hidden: true }).hidden, true);
  assert.equal(applyGachaRechargeOverride(source, { hidden: false }).hidden, false);
});

test("uses known October packs and projects only the specified older months", () => {
  const pack = (name, start, end, changes = {}) => ({
    saleType: "activity", officialName: name, price: 68,
    drawEfficiency: MONTHLY_PACK_DRAW_EFFICIENCY + 0.01,
    start: new Date(...start).getTime(), end: new Date(...end).getTime(), ...changes,
  });
  const packs = [
    pack("Known October", [2026, 9, 5], [2026, 9, 20]),
    pack("Known October Spans November", [2026, 9, 25], [2026, 10, 20]),
    pack("Old October", [2025, 9, 5], [2025, 9, 20]),
    pack("Old October Spans November", [2025, 9, 25], [2025, 10, 5]),
    pack("Old November", [2025, 10, 5], [2025, 10, 10]),
    pack("Late November", [2025, 10, 16], [2025, 10, 25]),
    pack("Old December", [2025, 11, 5], [2025, 11, 10]),
    pack("Old January", [2026, 0, 5], [2026, 0, 10]),
    pack("Old February", [2026, 1, 10], [2026, 1, 20]),
    pack("Equal Efficiency", [2026, 9, 8], [2026, 9, 12],
      { drawEfficiency: MONTHLY_PACK_DRAW_EFFICIENCY }),
    pack("Newbie", [2026, 9, 8], [2026, 9, 12], { saleType: "newbie" }),
  ];
  const start = new Date(2026, 8, 29).getTime();
  const thanksgiving = getEstimatedRechargePacks(packs, "thanksgiving", start, new Date(2026, 10, 14));
  assert.deepEqual(thanksgiving.map((item) => item.officialName), [
    "Known October", "Known October Spans November", "Old October Spans November", "Old November",
  ]);
  assert.equal(thanksgiving[1].end, new Date(2026, 10, 20).getTime());
  assert.equal(thanksgiving[2].start, new Date(2026, 10, 1).getTime());

  const spring = getEstimatedRechargePacks(packs, "spring_festival_2027", start, new Date(2027, 1, 14));
  assert.deepEqual(spring.map((item) => item.officialName), [
    "Known October", "Known October Spans November", "Old October Spans November", "Old November",
    "Late November", "Old December", "Old January", "Old February",
  ]);
  assert.equal(spring.find((item) => item.officialName === "Old February").end,
    new Date(2027, 1, 20).getTime());
  assert.equal(getEstimatedRechargePacks(packs, "thanksgiving", new Date(2026, 10, 11).getTime(),
    new Date(2026, 10, 14)).length, 1);
});

test("counts each available calendar month through the pool deadline", () => {
  assert.equal(countPurchasableMonths(new Date(2026, 8, 29), new Date(2026, 10, 14)), 2);
  assert.equal(countPurchasableMonths(new Date(2026, 8, 29), new Date(2027, 1, 14)), 5);
  assert.equal(countPurchasableMonths(new Date(2026, 9, 1), new Date(2026, 10, 14)), 2);
  assert.equal(countPurchasableMonths(new Date(2026, 9, 1), new Date(2027, 1, 14)), 5);
  assert.equal(countPurchasableMonths(new Date(2026, 9, 2), new Date(2026, 10, 14)), 1);
  assert.equal(countPurchasableMonths(new Date(2027, 2, 1), new Date(2027, 1, 14)), 0);
});

test("sums selected pack resources, custom draws and price once", () => {
  const plans = [
    { type: "monthly-pack", price: 336, originium: 84, tenGachaTicket: 2 },
    { type: "history", price: 68, orundum: 600, gachaTicket: 1 },
    { type: "custom", price: 10, draws: 1.5 },
  ];
  assert.deepEqual(sumGachaRechargePlans(plans, true), {
    price: 414, orundum: 600, originium: 84, gachaTicket: 1,
    tenGachaTicket: 2, customDraws: 1.5, draws: 48.7,
  });
  assert.equal(sumGachaRechargePlans(plans, false).draws, 23.5);
  assert.equal(sumGachaRechargePlans([], true).draws, 0);
});
