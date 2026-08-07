import {
  createRiicYieldEngineFailureResult,
} from "./contract.js";
import {
  RIIC_YIELD_ENGINE_REGISTRY,
} from "./engineRegistry.js";

const DEFAULT_TIMEOUT_MS = 8000;

function createAbortedResult(descriptor) {
  return createRiicYieldEngineFailureResult(descriptor, "计算已取消");
}

function runRiicYieldEngineInWorker({
  descriptor,
  maaSchedule,
  signal,
}) {
  if (typeof Worker !== "function") {
    return Promise.resolve(
      createRiicYieldEngineFailureResult(
        descriptor,
        "当前环境不支持独立运行产能计算引擎",
      ),
    );
  }

  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("./riicYieldEngine.worker.js", import.meta.url),
      { type: "module" },
    );
    let settled = false;
    let timer = null;

    const settle = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      resolve(result);
    };
    const abort = () => settle(createAbortedResult(descriptor));
    const timeoutMs = Number(descriptor?.timeoutMs) || DEFAULT_TIMEOUT_MS;

    if (signal?.aborted) {
      abort();
      return;
    }

    worker.onmessage = (event) => {
      settle(
        event?.data?.result ||
          createRiicYieldEngineFailureResult(
            descriptor,
            "计算引擎未返回可读取结果",
          ),
      );
    };
    worker.onerror = (event) => {
      settle(
        createRiicYieldEngineFailureResult(
          descriptor,
          event?.message || "计算引擎运行异常",
        ),
      );
    };
    worker.onmessageerror = () => {
      settle(
        createRiicYieldEngineFailureResult(
          descriptor,
          "计算引擎返回了无法读取的数据",
        ),
      );
    };

    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => {
      settle(
        createRiicYieldEngineFailureResult(
          descriptor,
          `计算超过 ${Math.round(timeoutMs / 1000)} 秒，已停止`,
        ),
      );
    }, timeoutMs);
    worker.postMessage({
      requestId: `${descriptor.id}:${Date.now()}`,
      engineId: descriptor.id,
      maaSchedule,
    });
  });
}

export async function runRiicYieldEngines({
  maaSchedule,
  signal,
  onResult,
} = {}) {
  if (!maaSchedule || typeof maaSchedule !== "object") {
    return [];
  }

  return Promise.all(
    RIIC_YIELD_ENGINE_REGISTRY.map(async (descriptor) => {
      const result = await runRiicYieldEngineInWorker({
        descriptor,
        maaSchedule,
        signal,
      });
      onResult?.(result);
      return result;
    }),
  );
}
