export function createRiicScheduleGenerationWorkflow({
  loadCatalogs,
  buildWorkerInput,
  runWorker,
  applyResult,
  getProgressLabel = (phase) => phase,
  onPhase = () => {},
} = {}) {
  let abortController = null;
  let requestId = 0;

  const cancel = () => {
    requestId += 1;
    abortController?.abort();
    abortController = null;
  };

  const run = async ({ strategy = "fast", signal: externalSignal } = {}) => {
    cancel();
    const currentRequestId = ++requestId;
    const controller = new AbortController();
    abortController = controller;
    const forwardAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", forwardAbort, { once: true });

    try {
      onPhase("catalogs", getProgressLabel("catalogs"));
      await loadCatalogs?.({ signal: controller.signal });
      if (controller.signal.aborted || currentRequestId !== requestId) {
        return null;
      }

      onPhase("worker", getProgressLabel("worker"));
      const result = await runWorker?.({
        input: buildWorkerInput?.(strategy),
        signal: controller.signal,
        onProgress: (phase, details) =>
          onPhase(phase, getProgressLabel(phase), details),
      });
      if (controller.signal.aborted || currentRequestId !== requestId) {
        return null;
      }

      onPhase("apply", getProgressLabel("apply"));
      return applyResult?.(result, { strategy }) ?? result;
    } finally {
      externalSignal?.removeEventListener("abort", forwardAbort);
      if (abortController === controller) {
        abortController = null;
      }
    }
  };

  return { run, cancel };
}
