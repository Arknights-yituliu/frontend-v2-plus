import { runRiicAutomaticSchedule } from "./l70-scheduler-core.js";
import { optimizeRiicPreviewShifts, validateRiicPreviewShiftOptimization } from "./l75-general-shift-optimization.js";

self.onmessage = async (event) => {
  const { requestId, input } = event?.data || {};

  try {
    self.postMessage({
      requestId,
      result: input?.task === "optimize-preview" ? await optimizeRiicPreviewShifts(input) :
        input?.task === "validate-preview-optimization" ? await validateRiicPreviewShiftOptimization(input) : runRiicAutomaticSchedule({
        ...input,
        onProgress: (phase, details) => {
          self.postMessage({
            requestId,
            progress: phase,
            progressDetails: details || null,
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
