export const RIIC_MANUAL_OPERATOR_STORAGE_KEY =
  "riic_manual_operator_data_v1";

export const RIIC_MANUAL_OPERATOR_SOURCE_KEY = "manual";

export function readRiicManualOperatorSnapshot() {
  try {
    const raw = localStorage.getItem(RIIC_MANUAL_OPERATOR_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const snapshot = JSON.parse(raw);
    if (
      snapshot?.schemaVersion !== 1 ||
      !Array.isArray(snapshot.operators)
    ) {
      return null;
    }

    return snapshot;
  } catch (error) {
    console.error("readRiicManualOperatorSnapshot failed", error);
    return null;
  }
}

export function saveRiicManualOperatorSnapshot(operators = []) {
  const snapshot = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    operators,
  };

  localStorage.setItem(
    RIIC_MANUAL_OPERATOR_STORAGE_KEY,
    JSON.stringify(snapshot),
  );

  return snapshot;
}
