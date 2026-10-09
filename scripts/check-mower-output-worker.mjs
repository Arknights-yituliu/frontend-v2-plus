import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTheoreticalOutputJob } from '../src/utils/mower/theoretical-output/client.js'

// Exercise the production client contract without starting a browser or replacing the engine.
// Deterministic timers make cancellation/timeout races immediate and reproducible.
function withWorker(testBody, { constructorError, postMessageError } = {}) {
  const originals = { Worker: globalThis.Worker, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
  const workers = []
  const timers = new Map()
  let nextTimer = 0
  class MockWorker {
    constructor(url, options) {
      if (constructorError) throw constructorError
      this.url = url
      this.options = options
      this.terminations = 0
      workers.push(this)
    }
    postMessage(message) {
      if (postMessageError) throw postMessageError
      this.message = message
    }
    terminate() { this.terminations += 1 }
    send(data) { this.onmessage?.({ data }) }
  }
  globalThis.Worker = MockWorker
  globalThis.setTimeout = (callback, delay) => {
    const id = ++nextTimer
    timers.set(id, { callback, delay })
    return id
  }
  globalThis.clearTimeout = id => { timers.delete(id) }
  const context = {
    workers,
    timers,
    expire() {
      assert.equal(timers.size, 1, 'one calculation timeout is active')
      const { callback, delay } = [...timers.values()][0]
      assert.equal(delay, 300000)
      callback()
    },
    cleaned(worker) {
      assert.equal(timers.size, 0, 'finished jobs release their timeout')
      if (worker) assert.equal(worker.terminations, 1, 'finished jobs terminate once')
    },
  }
  return Promise.resolve().then(() => testBody(context)).finally(() => {
    if (originals.Worker === undefined) delete globalThis.Worker
    else globalThis.Worker = originals.Worker
    globalThis.setTimeout = originals.setTimeout
    globalThis.clearTimeout = originals.clearTimeout
  })
}

test('posts detached nested inputs, forwards progress, and resolves exactly once', () => withWorker(async ({ workers, cleaned }) => {
  const payload = { plan: { room_1_1: { name: '制造站', plans: [{ agent: '克洛丝' }] } }, conf: { rest: ['阿米娅'] } }
  const config = { inventory: { char_002_amiya: { phase: 1, level: 40 } }, hours: 24 }
  const expectedPayload = structuredClone(payload)
  const expectedConfig = structuredClone(config)
  const progress = []
  const job = createTheoreticalOutputJob(payload, config, value => progress.push(value))
  const [worker] = workers
  assert.ok(worker.url instanceof URL)
  assert.match(worker.url.pathname, /\/worker\.ts$/)
  assert.deepEqual(worker.options, { type: 'module' })
  payload.plan.room_1_1.plans[0].agent = '阿米娅'
  config.inventory.char_002_amiya.phase = 2
  assert.deepEqual(worker.message, { payload: expectedPayload, config: expectedConfig })
  worker.send({ type: 'progress', progress: { completed: 1, total: 3 } })
  assert.deepEqual(progress, [{ completed: 1, total: 3 }])
  const result = { totals: { lmd: 12345 }, status: 'complete' }
  worker.send({ type: 'result', result })
  assert.strictEqual(await job.promise, result)
  worker.send({ type: 'progress', progress: { completed: 3, total: 3 } })
  worker.send({ type: 'error', message: 'late error' })
  worker.onerror?.({ message: 'late error' })
  worker.onmessageerror?.({})
  job.cancel()
  assert.equal(progress.length, 1, 'late events never update progress')
  cleaned(worker)
}))

test('cancellation rejects with AbortError and ignores already queued events', () => withWorker(async ({ workers, cleaned }) => {
  const progress = []
  const job = createTheoreticalOutputJob({}, {}, value => progress.push(value))
  const rejection = assert.rejects(job.promise, error => error.name === 'AbortError')
  const [worker] = workers
  const queuedMessage = worker.onmessage
  const queuedError = worker.onerror
  const queuedMessageError = worker.onmessageerror
  job.cancel()
  job.cancel()
  queuedMessage({ data: { type: 'progress', progress: 1 } })
  queuedMessage({ data: { type: 'result', result: 'stale' } })
  queuedError({})
  queuedMessageError({})
  await rejection
  assert.deepEqual(progress, [])
  cleaned(worker)
}))

for (const [name, trigger, message] of [
  ['engine error', worker => worker.send({ type: 'error', message: '库存不足' }), /库存不足/],
  ['Worker execution error', worker => worker.onerror({}), /计算线程加载或执行失败/],
  ['message decoding error', worker => worker.onmessageerror({}), /无法读取计算线程返回的数据/],
  ['unknown message', worker => worker.send({ type: 'unexpected' }), /无法识别的数据/],
]) {
  test(`${name} rejects once and cleans up`, () => withWorker(async ({ workers, cleaned }) => {
    const job = createTheoreticalOutputJob({}, {})
    const rejection = assert.rejects(job.promise, message)
    const [worker] = workers
    trigger(worker)
    worker.send({ type: 'result', result: 'late success' })
    job.cancel()
    await rejection
    cleaned(worker)
  }))
}

test('timeout rejects and terminates the running Worker', () => withWorker(async ({ workers, expire, cleaned }) => {
  const progress = []
  const job = createTheoreticalOutputJob({}, {}, value => progress.push(value))
  const rejection = assert.rejects(job.promise, /计算超过五分钟/)
  expire()
  workers[0].send({ type: 'progress', progress: 1 })
  workers[0].send({ type: 'result', result: 'too late' })
  await rejection
  assert.deepEqual(progress, [])
  cleaned(workers[0])
}))

test('constructor failure rejects without allocating a timer', () => withWorker(async ({ workers, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {})
  await assert.rejects(job.promise, /Worker unavailable/)
  job.cancel()
  assert.equal(workers.length, 0)
  cleaned()
}, { constructorError: new Error('Worker unavailable') }))

test('postMessage failure releases Worker and timeout', () => withWorker(async ({ workers, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {})
  await assert.rejects(job.promise, /cannot clone payload/)
  job.cancel()
  cleaned(workers[0])
}, { postMessageError: new Error('cannot clone payload') }))

test('snapshot serialization failure releases Worker and timeout', () => withWorker(async ({ workers, cleaned }) => {
  const circular = {}
  circular.self = circular
  const job = createTheoreticalOutputJob(circular, {})
  await assert.rejects(job.promise, /circular/i)
  cleaned(workers[0])
}))

test('progress callback failure rejects and stops the job', () => withWorker(async ({ workers, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {}, () => { throw new Error('consumer failed') })
  const rejection = assert.rejects(job.promise, /consumer failed/)
  workers[0].send({ type: 'progress', progress: 1 })
  await rejection
  cleaned(workers[0])
}))

test('two concurrent jobs settle independently', () => withWorker(async ({ workers, cleaned }) => {
  const first = createTheoreticalOutputJob({ id: 1 }, {})
  const second = createTheoreticalOutputJob({ id: 2 }, {})
  const firstRejection = assert.rejects(first.promise, error => error.name === 'AbortError')
  first.cancel()
  workers[0].send({ type: 'result', result: 'stale first' })
  workers[1].send({ type: 'result', result: 'second result' })
  await firstRejection
  assert.equal(await second.promise, 'second result')
  cleaned(workers[0])
  cleaned(workers[1])
}))
