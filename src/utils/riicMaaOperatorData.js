const MAA_NUMBER_FIELDS = [
  ["elite", 0, 2],
];

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function getRiicMaaOperatorRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray(payload.operators)
  ) {
    return payload.operators;
  }
  throw new Error(
    "MAA JSON 顶层必须是干员数组或包含 operators 数组的对象",
  );
}

export function parseRiicMaaOperatorBox(payload, operatorTable = {}) {
  const records = getRiicMaaOperatorRows(payload);

  const errors = [];
  const warnings = [];
  const operators = [];
  const seenIds = new Set();

  records.forEach((record, index) => {
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

    const knownOperator = operatorTable[id];
    for (const [field, min, max] of MAA_NUMBER_FIELDS) {
      if (!isIntegerInRange(record[field], min, max)) {
        errors.push(
          `第 ${row} 条记录的 ${field} 必须是 ${min}-${max} 的整数`,
        );
      }
    }

    if (
      record.level !== null &&
      !isIntegerInRange(record.level, 0, 90)
    ) {
      errors.push(`第 ${row} 条记录的 level 必须是 0-90 的整数或 null`);
    }

    if (
      record.rarity !== undefined &&
      record.rarity !== null &&
      !isIntegerInRange(record.rarity, 1, 6)
    ) {
      errors.push(`第 ${row} 条记录的 rarity 必须是 1-6 的整数`);
    }

    if (
      record.potential !== undefined &&
      record.potential !== null &&
      !isIntegerInRange(record.potential, 0, 6)
    ) {
      errors.push(`第 ${row} 条记录的 potential 必须是 0-6 的整数`);
    }

    if (
      record.own === true &&
      !isIntegerInRange(knownOperator?.rarity, 1, 6) &&
      !isIntegerInRange(record.rarity, 1, 6)
    ) {
      errors.push(`第 ${row} 条记录缺少可用的 rarity 数据`);
    }

    if (record.own !== true) {
      return;
    }

    if (seenIds.has(id)) {
      warnings.push(`重复的干员 ID 已忽略：${id}`);
      return;
    }
    seenIds.add(id);

    if (!knownOperator) {
      warnings.push(`本地干员表未找到：${name || id}（${id}）`);
    }

    operators.push({
      charId: id,
      name: knownOperator?.name || name || id,
      rarity: knownOperator?.rarity || record.rarity,
      elite: record.elite,
      level: record.level,
      potential: record.potential ?? 0,
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
