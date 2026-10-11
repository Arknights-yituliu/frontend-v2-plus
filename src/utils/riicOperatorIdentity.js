import RECYCLE_OPERATOR from "../vendor/riic-efficiency/data/operators/char_4232_hbound.json" with {
  type: "json",
};

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

const RECYCLE_OPERATOR_PROFILE = Object.freeze({
  charId: RECYCLE_OPERATOR.id,
  name: RECYCLE_OPERATOR.name,
  rarity: RECYCLE_OPERATOR.rarity,
});

export function getRiicOperatorProfile(value) {
  const key = String(value || "").trim();
  return key === RECYCLE_OPERATOR_PROFILE.charId ||
    key === RECYCLE_OPERATOR_PROFILE.name
    ? RECYCLE_OPERATOR_PROFILE
    : null;
}

export function buildRiicOperatorIdByName(operatorTable) {
  const idByName = {};
  for (const [charId, operator] of Object.entries(operatorTable || {})) {
    const name = String(operator?.name || "").trim();
    if (name) {
      idByName[name] =
        ["char_1001_amiya2", "char_1001_amiya3"].includes(charId)
          ? "char_002_amiya"
          : charId;
    }
  }
  idByName[RECYCLE_OPERATOR_PROFILE.name] = RECYCLE_OPERATOR_PROFILE.charId;
  return idByName;
}

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
  const packageProfile = getRiicOperatorProfile(rawCharId || normalizedName);
  const charId = normalizeRiicOperatorId(
    rawCharId ||
      packageProfile?.charId ||
      (normalizedName === "阿米娅" ? "char_002_amiya" : ""),
  );
  const name =
    normalizedName ||
    packageProfile?.name ||
    (charId === "char_002_amiya" ? "阿米娅" : charId);

  return {
    ...source,
    charId,
    name,
  };
}
