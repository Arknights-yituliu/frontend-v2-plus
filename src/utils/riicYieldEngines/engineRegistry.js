export const RIIC_YIELD_ENGINE_REGISTRY = Object.freeze([
  Object.freeze({
    id: "riic-yield-core",
    name: "参考产能模型",
    version: "0.1.0",
    timeoutMs: 8000,
  }),
  Object.freeze({
    id: "income-calc-web",
    name: "基础收益模型",
    version: "1.0.0",
    timeoutMs: 8000,
  }),
]);

export function getRiicYieldEngineDescriptor(engineId) {
  return (
    RIIC_YIELD_ENGINE_REGISTRY.find((engine) => engine.id === engineId) ||
    null
  );
}
