import {
  createRiicYieldEngineFailureResult,
  normalizeRiicYieldEngineResult,
} from "./contract.js";
import {
  getRiicYieldEngineDescriptor,
} from "./engineRegistry.js";
import { getRiicYieldWorkerEngine } from "./workerEngineRegistry.js";

self.onmessage = async (event) => {
  const { requestId, engineId, maaSchedule } = event?.data || {};
  const descriptor = getRiicYieldEngineDescriptor(engineId);

  if (!descriptor) {
    self.postMessage({
      requestId,
      result: createRiicYieldEngineFailureResult(
        { id: engineId },
        "未注册的产能计算引擎",
      ),
    });
    return;
  }

  try {
    const engine = getRiicYieldWorkerEngine(engineId);
    const rawResult = await engine.calculate(maaSchedule);
    self.postMessage({
      requestId,
      result: normalizeRiicYieldEngineResult(descriptor, rawResult),
    });
  } catch (error) {
    self.postMessage({
      requestId,
      result: createRiicYieldEngineFailureResult(
        descriptor,
        error instanceof Error ? error.message : "产能计算引擎执行失败",
      ),
    });
  }
};
