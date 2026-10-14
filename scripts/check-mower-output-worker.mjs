import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// An optional preserved client is useful for proving a regression before a fix;
// the normal check always imports the actual production client.
const clientIndex = process.argv.indexOf('--client')
const clientUrl = clientIndex >= 0 ? pathToFileURL(resolve(process.argv[clientIndex + 1]))
  : new URL('../src/utils/mower/theoretical-output/client.js', import.meta.url)
const { createTheoreticalOutputJob } = await import(clientUrl.href)

// Exercise the production client contract without starting a browser or replacing the engine.
// Deterministic timers make cancellation/timeout races immediate and reproducible.
function withWorker(testBody, { constructorError, postMessageError } = {}) {
  const originals = { Worker: globalThis.Worker, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
  const workers = []
  const timers = new Map()
  let clock = 0
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
    timers.set(id, { callback, delay, due: clock + delay })
    return id
  }
  globalThis.clearTimeout = id => { timers.delete(id) }
  const context = {
    workers,
    timers,
    advance(milliseconds) {
      const target = clock + milliseconds
      let executed = 0
      while (true) {
        const pending = [...timers].filter(([, timer]) => timer.due <= target)
          .sort(([, left], [, right]) => left.due - right.due)[0]
        if (!pending) break
        assert.ok(++executed < 100, 'no accidental zero-delay timer loop')
        const [id, timer] = pending
        clock = timer.due
        timers.delete(id)
        timer.callback()
      }
      clock = target
    },
    activeTimer() {
      assert.equal(timers.size, 1, 'one timeout is active for this calculation')
      return [...timers.values()][0]
    },
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
  const rejection = assert.rejects(job.promise, /五分钟/)
  expire()
  workers[0].send({ type: 'progress', progress: { elapsedHours: 1, totalHours: 240 } })
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
  workers[0].send({ type: 'progress', progress: { elapsedHours: 1, totalHours: 240 } })
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

test('a complete result remains possible past the original deadline while finite simulation time advances', () => withWorker(async ({ workers, advance, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {})
  const outcome = job.promise.then(value => ({ value }), error => ({ error }))
  const [worker] = workers
  advance(240000)
  worker.send({ type: 'progress', progress: { elapsedHours: 40, totalHours: 240 } })
  advance(61000)
  assert.equal(worker.terminations, 0, 'active full-window work survives the former five-minute absolute deadline')
  advance(200000)
  worker.send({ type: 'progress', progress: { elapsedHours: 170, totalHours: 240 } })
  advance(299999)
  assert.equal(worker.terminations, 0, 'each later real advance renews only the inactivity window')
  const result = { observedHours: 168, warmupHours: 72, status: 'complete' }
  worker.send({ type: 'result', result })
  assert.strictEqual((await outcome).value, result)
  cleaned(worker)
}))

test('an already queued callback from an older timeout epoch cannot kill a progressing job', () => withWorker(async ({ workers, activeTimer, advance, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {})
  const outcome = job.promise.then(value => ({ value }), error => ({ error }))
  const [worker] = workers
  const stale = activeTimer().callback
  advance(240000)
  worker.send({ type: 'progress', progress: { elapsedHours: 24, totalHours: 240 } })
  const active = activeTimer()
  assert.notStrictEqual(active.callback, stale, 'real progress installs a new timer epoch')
  advance(61000)
  stale()
  assert.equal(worker.terminations, 0, 'a cancelled timer callback delivered late is harmless')
  assert.strictEqual(activeTimer(), active)
  worker.send({ type: 'result', result: 'complete after stale deadline' })
  assert.equal((await outcome).value, 'complete after stale deadline')
  cleaned(worker)
}))

test('zero simulation time is a heartbeat and cannot renew the initial inactivity deadline', () => withWorker(async ({ workers, advance, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {})
  const rejection = assert.rejects(job.promise, /五分钟/)
  advance(299999)
  workers[0].send({ type: 'progress', progress: { elapsedHours: 0, totalHours: 240 } })
  advance(1)
  await rejection
  cleaned(workers[0])
}))

test('duplicate, backwards, nonfinite, malformed and out-of-window heartbeats cannot postpone inactivity', () => withWorker(async ({ workers, activeTimer, advance, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {})
  const rejection = assert.rejects(job.promise, /五分钟/)
  const [worker] = workers
  worker.send({ type: 'progress', progress: { elapsedHours: 2, totalHours: 240 } })
  const timeout = activeTimer()
  advance(299999)
  for (const progress of [
    { elapsedHours: 2, totalHours: 240 }, { elapsedHours: 1, totalHours: 240 },
    { elapsedHours: NaN, totalHours: 240 }, { elapsedHours: Infinity, totalHours: 240 },
    { elapsedHours: '3', totalHours: 240 }, { elapsedHours: -1, totalHours: 240 },
    { elapsedHours: 241, totalHours: 240 }, { elapsedHours: 3, totalHours: 0 },
    { elapsedHours: 3, totalHours: NaN }, { elapsedHours: 3, totalHours: Infinity },
    { elapsedHours: 3, totalHours: '240' }, { elapsedHours: 3, totalHours: 241 },
    { elapsedHours: 3, totalHours: 239 }, { elapsedHours: 3 }, null, 'heartbeat',
    { elapsedHours: 2, totalHours: 240 },
  ]) {
    worker.send({ type: 'progress', progress })
    assert.strictEqual(activeTimer(), timeout, 'an invalid heartbeat cannot allocate a new deadline')
  }
  advance(1)
  await rejection
  cleaned(worker)
}))

test('a legal explicit sampling horizon renews progress but a changed total cannot extend it', () => withWorker(async ({ workers, activeTimer, advance, cleaned }) => {
  const job = createTheoreticalOutputJob({}, { warmupDays: 0, sampleDays: 1 })
  const outcome = job.promise.then(value => ({ value }), error => ({ error }))
  const [worker] = workers
  advance(250000)
  worker.send({ type: 'progress', progress: { elapsedHours: 1, totalHours: 24 } })
  const valid = activeTimer()
  assert.equal(valid.due, 550000)
  worker.send({ type: 'progress', progress: { elapsedHours: 2, totalHours: 48 } })
  assert.strictEqual(activeTimer(), valid)
  advance(50001)
  assert.equal(worker.terminations, 0)
  worker.send({ type: 'result', result: 'explicit full sample' })
  assert.equal((await outcome).value, 'explicit full sample')
  cleaned(worker)
}))

test('an advancing job still times out after five minutes without further real simulation time', () => withWorker(async ({ workers, advance, cleaned }) => {
  const job = createTheoreticalOutputJob({}, {})
  const rejection = assert.rejects(job.promise, /五分钟/)
  advance(200000)
  workers[0].send({ type: 'progress', progress: { elapsedHours: 50, totalHours: 240 } })
  advance(299999)
  assert.equal(workers[0].terminations, 0)
  advance(1)
  await rejection
  cleaned(workers[0])
}))

test('concurrent jobs retain separate progress epochs and inactivity deadlines', () => withWorker(async ({ workers, timers, advance }) => {
  const first = createTheoreticalOutputJob({ id: 1 }, {})
  const second = createTheoreticalOutputJob({ id: 2 }, {})
  const firstOutcome = first.promise.then(value => ({ value }), error => ({ error }))
  const secondRejection = assert.rejects(second.promise, /五分钟/)
  const staleFirst = [...timers.values()][0].callback
  advance(240000)
  workers[0].send({ type: 'progress', progress: { elapsedHours: 100, totalHours: 240 } })
  advance(60000)
  await secondRejection
  assert.equal(workers[1].terminations, 1)
  assert.equal(workers[0].terminations, 0, 'progress in one job never revives another job or loses its own epoch')
  staleFirst()
  assert.equal(workers[0].terminations, 0)
  assert.equal(timers.size, 1)
  workers[0].send({ type: 'result', result: 'first completes independently' })
  assert.equal((await firstOutcome).value, 'first completes independently')
  assert.equal(timers.size, 0)
  assert.equal(workers[0].terminations, 1)
}))

test('synchronous cancellation inside onProgress clears the newly renewed timeout', () => withWorker(async ({ workers, activeTimer, cleaned }) => {
  let job
  let callbacks = 0
  job = createTheoreticalOutputJob({}, {}, () => {
    callbacks += 1
    job.cancel()
  })
  const rejection = assert.rejects(job.promise, error => error.name === 'AbortError')
  const stale = activeTimer().callback
  workers[0].send({ type: 'progress', progress: { elapsedHours: 20, totalHours: 240 } })
  stale()
  workers[0].send({ type: 'progress', progress: { elapsedHours: 21, totalHours: 240 } })
  workers[0].send({ type: 'result', result: 'late complete sample' })
  await rejection
  assert.equal(callbacks, 1)
  cleaned(workers[0])
}))

test('fractional-day windows use the source multiplication order when validating real progress', () => withWorker(async ({ workers, activeTimer, advance, cleaned }) => {
  for (const config of [
    { warmupDays: 0, sampleDays: 8 / 24 },
    { warmupDays: .1, sampleDays: .3 },
  ]) {
    // The simulator adds independently converted warmup/sample hours. Adding
    // fractional days first is not guaranteed to produce the same IEEE value.
    const totalHours = config.warmupDays * 24 + config.sampleDays * 24
    if (config.warmupDays > 0) assert.notEqual(totalHours, (config.warmupDays + config.sampleDays) * 24,
      'this boundary really distinguishes the two floating-point operation orders')
    const job = createTheoreticalOutputJob({}, config)
    const outcome = job.promise.then(value => ({ value }), error => ({ error }))
    const worker = workers.at(-1)
    const original = activeTimer()
    advance(299000)
    worker.send({ type: 'progress', progress: { elapsedHours: .25, totalHours } })
    const renewed = activeTimer()
    assert.notStrictEqual(renewed, original, 'a valid fractional-window report renews inactivity')
    assert.equal(renewed.due - original.due, 299000)
    advance(1001)
    assert.equal(worker.terminations, 0, 'a legal fractional sample survives its original absolute deadline')
    const result = { observedHours: config.sampleDays * 24, warmupHours: config.warmupDays * 24 }
    worker.send({ type: 'result', result })
    assert.strictEqual((await outcome).value, result)
    cleaned(worker)
  }
}))
