import ITEM_INFO from "/src/static/json/material/item_info.json";
import LEVEL_COST_TABLE from "/src/static/json/operator/level_cost_table.json";

const LMD_ID = "4001";
const EXP_ITEM_IDS = new Set(["2001", "2002", "2003", "2004"]);
const MAX_LEVEL_BY_RARITY = Object.freeze({
  1: { elite0: 30, elite1: 0, elite2: 0 },
  2: { elite0: 30, elite1: 0, elite2: 0 },
  3: { elite0: 40, elite1: 55, elite2: 0 },
  4: { elite0: 45, elite1: 60, elite2: 70 },
  5: { elite0: 50, elite1: 70, elite2: 80 },
  6: { elite0: 50, elite1: 80, elite2: 90 },
});
const ELITE_LMD_BY_RARITY = Object.freeze({
  1: { elite1: 0, elite2: 0 }, 2: { elite1: 0, elite2: 0 },
  3: { elite1: 10000, elite2: 0 }, 4: { elite1: 15000, elite2: 60000 },
  5: { elite1: 20000, elite2: 120000 }, 6: { elite1: 30000, elite2: 180000 },
});
const DEFAULT_ITEM_VALUES = new Map(
  ITEM_INFO.map((item) => [String(item?.itemId || ""), item?.itemValueAp ?? item?.itemValue]),
);

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function stage(value) {
  return Math.max(0, Math.min(2, integer(value)));
}

function level(value) {
  return Math.max(1, integer(value, 1));
}

function itemValue(table, itemId) {
  const key = String(itemId || "");
  const value = table instanceof Map ? table.get(key) : table?.[key];
  return value ?? DEFAULT_ITEM_VALUES.get(key);
}

function levelCost(rarity, current, required) {
  const maxLevels = MAX_LEVEL_BY_RARITY[rarity];
  if (!maxLevels) return { exp: 0, lmd: 0, missing: [`星级 ${rarity} 等级上限`] };
  let exp = 0;
  let lmd = 0;
  const missing = [];
  for (let elite = current.elite; elite <= required.elite; elite += 1) {
    const max = maxLevels[`elite${elite}`];
    if (!max) {
      missing.push(`星级 ${rarity} 精英 ${elite} 等级上限`);
      continue;
    }
    const from = elite === current.elite ? current.level : 1;
    const to = elite === required.elite ? Math.min(required.level, max) : max;
    const rows = LEVEL_COST_TABLE?.[`elite${elite}`];
    if (!Array.isArray(rows)) {
      missing.push(`elite${elite}等级经验表`);
      continue;
    }
    for (let currentLevel = from; currentLevel < to; currentLevel += 1) {
      const row = rows[currentLevel];
      if (!row) {
        missing.push(`elite${elite} Lv.${currentLevel}`);
        continue;
      }
      exp += Number(row.exp) || 0;
      lmd += Number(row.gold) || 0;
    }
  }
  return { exp, lmd, missing };
}

function eliteCost(operator, currentElite, requiredElite) {
  const materials = new Map();
  const missing = [];
  let lmd = 0;
  const rarityCosts = ELITE_LMD_BY_RARITY[operator?.rarity];
  for (let elite = currentElite + 1; elite <= requiredElite; elite += 1) {
    lmd += Number(rarityCosts?.[`elite${elite}`]) || 0;
    const phase = operator?.elite?.[elite];
    if (!phase) {
      missing.push(`精英 ${elite} 材料数据`);
      continue;
    }
    for (const [itemId, amount] of Object.entries(phase)) {
      if (itemId === LMD_ID || EXP_ITEM_IDS.has(itemId)) continue;
      materials.set(itemId, (materials.get(itemId) || 0) + Number(amount || 0));
    }
  }
  return { lmd, materials, missing };
}

function materialCost(materials, values) {
  let sanity = 0;
  const missing = [];
  const entries = [];
  for (const [itemId, amount] of materials) {
    const value = itemValue(values, itemId);
    const itemSanity = typeof value === "number" && Number.isFinite(value) ? amount * value : null;
    entries.push({ itemId, amount, sanity: itemSanity });
    if (itemSanity === null) missing.push(itemId);
    else sanity += itemSanity;
  }
  return { sanity, entries, missing };
}

export function calculateRiicTrainingCost({ requirement, operator, itemValueTable } = {}) {
  const current = { elite: stage(requirement?.current?.elite), level: level(requirement?.current?.level) };
  const required = { elite: stage(requirement?.required?.elite), level: level(requirement?.required?.level) };
  if (!requirement?.charId || !operator) return { status: "error", current, required, missing: ["干员资料"] };
  if (required.elite < current.elite || (required.elite === current.elite && required.level <= current.level)) {
    return { status: "ready", current, required, exp: 0, lmd: 0, materials: [], materialSanity: 0, totalSanity: 0, missing: [] };
  }
  const levels = levelCost(Number(operator.rarity), current, required);
  const elites = eliteCost(operator, current.elite, required.elite);
  const materials = materialCost(elites.materials, itemValueTable);
  const lmdValue = itemValue(itemValueTable, LMD_ID);
  const expValue = itemValue(itemValueTable, "2003");
  const missing = [...new Set([
    ...levels.missing, ...elites.missing, ...materials.missing,
    ...(typeof lmdValue === "number" ? [] : [LMD_ID]),
    ...(typeof expValue === "number" ? [] : ["2003"]),
  ])];
  const totalSanity = typeof lmdValue === "number" && typeof expValue === "number"
    ? levels.lmd * lmdValue + (levels.exp / 1000) * expValue + materials.sanity
    : null;
  return {
    status: missing.length ? "partial" : "ready",
    current, required, exp: levels.exp, lmd: levels.lmd + elites.lmd,
    materials: materials.entries, materialSanity: materials.sanity, totalSanity, missing,
  };
}
