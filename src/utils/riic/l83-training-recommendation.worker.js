import {
  runRiicTrainingRecommendationTrial,
} from "./l83-training-recommendation-core.js";

self.onmessage = (event) => {
  const { requestId, input } = event?.data || {};

  try {
    self.postMessage({
      requestId,
      result: runRiicTrainingRecommendationTrial(input),
    });
  } catch (error) {
    self.postMessage({
      requestId,
      error:
        error instanceof Error
          ? error.message
          : "培养建议后台计算失败",
    });
  }
};
