import incomeCalcWebEngine from "./adapters/incomeCalcWebAdapter.js";
import riicYieldCoreEngine from "./adapters/riicYieldCoreAdapter.js";

const ENGINES_BY_ID = Object.freeze({
  "riic-yield-core": riicYieldCoreEngine,
  "income-calc-web": incomeCalcWebEngine,
});

export function getRiicYieldWorkerEngine(engineId) {
  const engine = ENGINES_BY_ID[engineId];
  if (
    !engine ||
    typeof engine.calculate !== "function" ||
    String(engine.id || "") !== String(engineId || "")
  ) {
    throw new Error(`产能计算引擎无效：${engineId}`);
  }

  return engine;
}
