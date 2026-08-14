const MAA_NUMBER_FIELDS = [
  ["rarity", 1, 6],
  ["elite", 0, 2],
  ["level", 0, 90],
  ["potential", 0, 6],
];

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function parseRiicMaaOperatorBox(payload, operatorTable = {}) {
  if (!Array.isArray(payload)) {
    throw new Error("MAA JSON 顶层必须是干员数组");
  }

  const errors = [];
  const warnings = [];
  const operators = [];
  const seenIds = new Set();

  payload.forEach((record, index) => {
    const row = index + 1;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`第 ${row} 条记录不是对象`);
      return;
    }

    const id = typeof record.id === "string" ? record.id.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";

    if (!id) {
      errors.push(`第 ${row} 条记录缺少 id`);
      return;
    }

    if (!name) {
      errors.push(`第 ${row} 条记录缺少 name`);
    }

    if (typeof record.own !== "boolean") {
      errors.push(`第 ${row} 条记录的 own 不是布尔值`);
    }

    for (const [field, min, max] of MAA_NUMBER_FIELDS) {
      if (!isIntegerInRange(record[field], min, max)) {
        errors.push(
          `第 ${row} 条记录的 ${field} 必须是 ${min}-${max} 的整数`,
        );
      }
    }

    if (record.own !== true) {
      return;
    }

    if (seenIds.has(id)) {
      warnings.push(`重复的干员 ID 已忽略：${id}`);
      return;
    }
    seenIds.add(id);

    const knownOperator = operatorTable[id];
    if (!knownOperator) {
      warnings.push(`本地干员表未找到：${name || id}（${id}）`);
    }

    operators.push({
      charId: id,
      name: knownOperator?.name || name || id,
      rarity: knownOperator?.rarity || record.rarity,
      elite: record.elite,
      level: record.level,
      potential: record.potential,
    });
  });

  if (errors.length > 0) {
    throw new Error(`MAA JSON 校验失败：${errors.slice(0, 4).join("；")}`);
  }

  return {
    operators,
    warnings,
  };
}
