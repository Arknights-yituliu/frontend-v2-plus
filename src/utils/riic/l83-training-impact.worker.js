import { runRiicTrainingImpactTrials } from "./l83-training-recommendation-core.js";

self.onmessage = (event) => {
  const { requestId, input } = event?.data || {};

  try {
    self.postMessage({
      requestId,
      result: runRiicTrainingImpactTrials(input),
    });
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : "培养收益试算失败",
    });
  }
};
