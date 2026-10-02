export function createRiicScheduleResultSnapshot({
  preview = null,
  l79 = null,
  actual = null,
  displayPreview = null,
  exportPreview = null,
  l79Input = null,
  legacyPreview = null,
  legacyL79 = null,
  legacyActual = null,
  riicEfficiency = null,
  calculationMode = "legacy",
  diagnostics = null,
} = {}) {
  return {
    preview,
    l79,
    actual,
    displayPreview,
    exportPreview,
    l79Input,
    legacyPreview,
    legacyL79,
    legacyActual,
    riicEfficiency,
    calculationMode,
    diagnostics,
  };
}

