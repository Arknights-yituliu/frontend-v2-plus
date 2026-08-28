const RIIC_OPERATOR_ID_ALIASES = Object.freeze({
  char_1001_amiya2: "char_002_amiya",
  char_1037_amiya3: "char_002_amiya",
});

const RIIC_OPERATOR_NAME_ALIASES = Object.freeze({
  "阿米娅（近卫）": "阿米娅",
  "阿米娅（医疗）": "阿米娅",
  "阿米娅(近卫)": "阿米娅",
  "阿米娅(医疗)": "阿米娅",
});

export function normalizeRiicOperatorId(value) {
  const charId = String(value || "").trim();
  return RIIC_OPERATOR_ID_ALIASES[charId] || charId;
}

export function normalizeRiicOperatorName(value) {
  const name = String(value || "").trim();
  return RIIC_OPERATOR_NAME_ALIASES[name] || name;
}

export function normalizeRiicOperator(operator) {
  const value = String(operator || "").trim();
  const source =
    operator && typeof operator === "object"
      ? operator
      : value.startsWith("char_")
        ? { charId: value }
        : { name: value };
  const rawCharId = String(source?.charId || "").trim();
  const rawName = String(source?.name || "").trim();
  const normalizedName = normalizeRiicOperatorName(rawName);
  const charId = normalizeRiicOperatorId(
    rawCharId ||
      (normalizedName === "阿米娅" ? "char_002_amiya" : ""),
  );
  const name =
    normalizedName || (charId === "char_002_amiya" ? "阿米娅" : charId);

  return {
    ...source,
    charId,
    name,
  };
}
