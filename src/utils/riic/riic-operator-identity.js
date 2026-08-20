import RIIC_OPERATOR_TABLE from "../../static/json/operator/character_table_simple.v2.json" with {
  type: "json",
};

const OPERATOR_ID_BY_NAME = new Map(
  Object.entries(RIIC_OPERATOR_TABLE || {}).flatMap(([charId, operator]) => {
    const name = String(operator?.name || "").trim();
    return name ? [[name, charId]] : [];
  }),
);

export function resolveRiicOperatorIdByName(value) {
  return OPERATOR_ID_BY_NAME.get(String(value || "").trim()) || "";
}

export function getRiicOperatorName(charId) {
  const operatorId = String(charId || "").trim();
  return String(RIIC_OPERATOR_TABLE?.[operatorId]?.name || operatorId).trim();
}
