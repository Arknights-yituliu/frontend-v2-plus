export const DEFAULT_RIIC_IDEAL_TRAINING_RARITY_SELECTION = Object.freeze({
  six: true,
  five: true,
  fourOrBelow: true,
});

export function normalizeRiicIdealTrainingRaritySelection(value) {
  return {
    six:
      typeof value?.six === "boolean"
        ? value.six
        : DEFAULT_RIIC_IDEAL_TRAINING_RARITY_SELECTION.six,
    five:
      typeof value?.five === "boolean"
        ? value.five
        : DEFAULT_RIIC_IDEAL_TRAINING_RARITY_SELECTION.five,
    fourOrBelow:
      typeof value?.fourOrBelow === "boolean"
        ? value.fourOrBelow
        : DEFAULT_RIIC_IDEAL_TRAINING_RARITY_SELECTION.fourOrBelow,
  };
}

export function isRiicIdealTrainingEnabledForOperator(
  operator,
  raritySelection,
) {
  const rarity = Number(operator?.rarity);
  if (!Number.isInteger(rarity) || rarity < 1) {
    return false;
  }

  const normalizedSelection =
    normalizeRiicIdealTrainingRaritySelection(raritySelection);
  if (rarity === 6) {
    return normalizedSelection.six;
  }
  if (rarity === 5) {
    return normalizedSelection.five;
  }
  if (rarity <= 4) {
    return normalizedSelection.fourOrBelow;
  }

  return false;
}
