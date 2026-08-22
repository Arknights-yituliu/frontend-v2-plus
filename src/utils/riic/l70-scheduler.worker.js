import { runRiicAutomaticSchedule } from "./l70-scheduler-core.js";

self.onmessage = (event) => {
  const { requestId, input } = event?.data || {};

  try {
    self.postMessage({
      requestId,
      result: runRiicAutomaticSchedule({
        ...input,
        onProgress: (phase) => {
          self.postMessage({
            requestId,
            progress: phase,
          });
        },
      }),
    });
  } catch (error) {
    self.postMessage({
      requestId,
      error:
        error instanceof Error
          ? error.message
          : "后台排班计算失败",
    });
  }
};
