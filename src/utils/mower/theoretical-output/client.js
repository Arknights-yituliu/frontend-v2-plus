import { THEORETICAL_OUTPUT_DEFAULTS } from './defaults.js'

/** One detached calculation per Worker; cancellation always releases its resources. */
export function createTheoreticalOutputJob(payload, config, onProgress) {
  let worker
  let settled = false
  let timer
  let timerEpoch = 0
  let lastElapsedHours = 0
  let rejectJob
  function finish(callback, value) {
    if (settled) return
    settled = true
    timerEpoch += 1
    clearTimeout(timer)
    worker?.terminate()
    callback(value)
  }
  const promise = new Promise((resolve, reject) => {
    rejectJob = reject
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      const request = { payload: JSON.parse(JSON.stringify(payload)), config: JSON.parse(JSON.stringify(config)) }
      const expectedHours = (request.config.warmupDays ?? THEORETICAL_OUTPUT_DEFAULTS.warmupDays) * 24
        + (request.config.sampleDays ?? THEORETICAL_OUTPUT_DEFAULTS.sampleDays) * 24
      function renewDeadline() {
        clearTimeout(timer)
        const epoch = ++timerEpoch
        timer = setTimeout(() => {
          if (!settled && epoch === timerEpoch) {
            finish(reject, new Error('计算已连续五分钟没有推进，已停止。请重试或缩短采样时间。'))
          }
        }, 300000)
      }
      worker.onmessage = ({ data }) => {
        if (settled) return
        try {
          if (data?.type === 'progress') {
            const { elapsedHours, totalHours } = data.progress ?? {}
            if (Number.isFinite(elapsedHours) && Number.isFinite(totalHours) && totalHours > 0
              && totalHours === expectedHours && elapsedHours > lastElapsedHours && elapsedHours <= totalHours) {
              lastElapsedHours = elapsedHours
              renewDeadline()
            }
            onProgress?.(data.progress)
          }
          else if (data?.type === 'result') finish(resolve, data.result)
          else if (data?.type === 'error') finish(reject, new Error(data.message || '计算失败'))
          else finish(reject, new Error('计算返回了无法识别的数据'))
        } catch (error) {
          finish(reject, error)
        }
      }
      worker.onerror = () => finish(reject, new Error('计算线程加载或执行失败，请重试'))
      worker.onmessageerror = () => finish(reject, new Error('无法读取计算线程返回的数据'))
      renewDeadline()
      worker.postMessage(request)
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
