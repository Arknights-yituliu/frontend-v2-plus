/** One detached calculation per Worker; cancellation always releases its resources. */
export function createTheoreticalOutputJob(payload, config, onProgress) {
  let worker
  let settled = false
  let timer
  let rejectJob
  function finish(callback, value) {
    if (settled) return
    settled = true
    clearTimeout(timer)
    worker?.terminate()
    callback(value)
  }
  const promise = new Promise((resolve, reject) => {
    rejectJob = reject
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }) => {
        if (settled) return
        try {
          if (data?.type === 'progress') onProgress?.(data.progress)
          else if (data?.type === 'result') finish(resolve, data.result)
          else if (data?.type === 'error') finish(reject, new Error(data.message || '计算失败'))
          else finish(reject, new Error('计算返回了无法识别的数据'))
        } catch (error) {
          finish(reject, error)
        }
      }
      worker.onerror = () => finish(reject, new Error('计算线程加载或执行失败，请重试'))
      worker.onmessageerror = () => finish(reject, new Error('无法读取计算线程返回的数据'))
      timer = setTimeout(() => finish(reject, new Error('计算超过五分钟，已停止。请缩短采样时间后重试。')), 300000)
      worker.postMessage({ payload: JSON.parse(JSON.stringify(payload)), config: JSON.parse(JSON.stringify(config)) })
    } catch (error) {
      finish(reject, error)
    }
  })
  return {
    promise,
    cancel() {
      finish(rejectJob, new DOMException('已取消计算', 'AbortError'))
    },
  }
}
