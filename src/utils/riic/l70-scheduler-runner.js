function createAbortError() {
  const error = new Error("后台排班已取消");
  error.name = "AbortError";
  return error;
}

export function isRiicAutomaticScheduleAbortError(error) {
  return error?.name === "AbortError";
}

function runRiicWorker({
  input,
  signal,
  workerUrl,
  requestPrefix,
} = {}) {
  if (typeof Worker !== "function") {
    return Promise.reject(new Error("当前浏览器不支持后台排班"));
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, { type: "module" });
    const requestId = `${requestPrefix}:${Date.now()}:${Math.random()}`;
    let settled = false;

    const settle = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      callback(value);
    };
    const abort = () => settle(reject, createAbortError());

    if (signal?.aborted) {
      abort();
      return;
    }

    worker.onmessage = (event) => {
      const message = event?.data || {};
      if (message.requestId !== requestId) {
        return;
      }

      if (message.error) {
        settle(reject, new Error(message.error));
        return;
      }

      settle(resolve, message.result);
    };
    worker.onerror = (event) => {
      settle(reject, new Error(event?.message || "后台排班运行异常"));
    };
    worker.onmessageerror = () => {
      settle(reject, new Error("后台排班返回了无法读取的数据"));
    };

    signal?.addEventListener("abort", abort, { once: true });
    worker.postMessage({ requestId, input });
  });
}

export function runRiicAutomaticScheduleInWorker({
  input,
  signal,
} = {}) {
  return runRiicWorker({
    input,
    signal,
    workerUrl: new URL("./l70-scheduler.worker.js", import.meta.url),
    requestPrefix: "riic-schedule",
  });
}

export function runRiicTrainingRecommendationInWorker({
  input,
  signal,
} = {}) {
  return runRiicWorker({
    input,
    signal,
    workerUrl: new URL("./l83-training-recommendation.worker.js", import.meta.url),
    requestPrefix: "riic-training-recommendation",
  });
}

export function runRiicTrainingImpactInWorker({ input, signal } = {}) {
  return runRiicWorker({
    input,
    signal,
    workerUrl: new URL("./l83-training-impact.worker.js", import.meta.url),
    requestPrefix: "riic-training-impact",
  });
}
