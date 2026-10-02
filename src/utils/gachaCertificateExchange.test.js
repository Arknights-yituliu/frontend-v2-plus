import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GACHA_CERTIFICATE_STEPS,
  getGachaCertificateCost,
  getGachaCertificateDraws,
  getGachaCertificateMonths,
  getNextGachaCertificateLevel,
  normalizeGachaCertificateSelections,
} from "./gachaCertificateExchange.js";

const thanksgivingEnd = new Date(2026, 10, 14, 23, 59);
const springEnd = new Date(2027, 1, 14, 23, 59);
const monthIds = (months) => months.map((month) => month.id);

test("shows only certificate months intersecting the calculation interval", () => {
  assert.deepEqual(monthIds(getGachaCertificateMonths(
    "thanksgiving", thanksgivingEnd, new Date(2026, 8, 29), thanksgivingEnd
  )), ["2026-10", "2026-11"]);
  assert.deepEqual(monthIds(getGachaCertificateMonths(
    "thanksgiving", thanksgivingEnd, new Date(2026, 10, 14, 20), thanksgivingEnd
  )), ["2026-11"]);
  assert.deepEqual(getGachaCertificateMonths(
    "thanksgiving", thanksgivingEnd, new Date(2026, 10, 15), thanksgivingEnd
  ), []);
  assert.deepEqual(monthIds(getGachaCertificateMonths(
    "thanksgiving", thanksgivingEnd, new Date(2026, 8, 29), new Date(2026, 10, 1)
  )), ["2026-10", "2026-11"]);
});

test("spring months cross the year boundary and exclude elapsed months", () => {
  assert.deepEqual(monthIds(getGachaCertificateMonths(
    "spring_festival_2027", springEnd, new Date(2026, 8, 29), springEnd
  )), ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
  assert.deepEqual(monthIds(getGachaCertificateMonths(
    "spring_festival_2027", springEnd, new Date(2027, 0, 20), springEnd
  )), ["2027-01", "2027-02"]);
});

test("each month has a progressive tier up to 258 certificates for 38 draws", () => {
  assert.equal(GACHA_CERTIFICATE_STEPS.reduce((total, step) => total + step.cost, 0), 258);
  assert.equal(GACHA_CERTIFICATE_STEPS.reduce((total, step) => total + step.draws, 0), 38);
  const months = [{ id: "2026-10" }, { id: "2026-11" }];
  assert.equal(getGachaCertificateDraws(months, { "2026-10": 5, "2026-11": 3 }), 46);
  assert.equal(getGachaCertificateCost(months, { "2026-10": 5, "2026-11": 3 }), 326);
  assert.equal(getGachaCertificateDraws(months.slice(1), { "2026-10": 5, "2026-11": 3 }), 8);
  assert.equal(getGachaCertificateCost(months.slice(1), { "2026-10": 5, "2026-11": 3 }), 68);
  assert.equal(getGachaCertificateDraws(months, {}), 0);
  assert.equal(getGachaCertificateCost(months, {}), 0);
  assert.equal(getNextGachaCertificateLevel(0, 5), 5);
  assert.equal(getNextGachaCertificateLevel(5, 5), 4);
  assert.equal(getNextGachaCertificateLevel(5, 2), 2);
  assert.equal(getNextGachaCertificateLevel(1, 1), 0);
});

test("old drafts and invalid per-pool selection values restore safely", () => {
  assert.deepEqual(normalizeGachaCertificateSelections(undefined, ["thanksgiving"]), { thanksgiving: {} });
  assert.deepEqual(normalizeGachaCertificateSelections({
    thanksgiving: { "2026-10": 5, "2026-11": 6, other: 2, "2026-12": "3" },
    unknown: { "2026-10": 5 },
  }, ["thanksgiving"]), { thanksgiving: { "2026-10": 5 } });
});
