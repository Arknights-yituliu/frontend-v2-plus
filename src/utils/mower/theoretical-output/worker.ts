import { calculateTheoreticalOutput } from './calculate.ts'

self.onmessage = ({ data }) => {
  try {
    const result = calculateTheoreticalOutput(data.payload, data.config, progress => {
      self.postMessage({ type: 'progress', progress })
    })
    self.postMessage({ type: 'result', result })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
