import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const engineRoot = resolve('src/utils/mower/theoretical-output/engine')
const manifest = JSON.parse(await readFile(resolve(engineRoot, 'source-manifest.json'), 'utf8'))
assert.deepEqual(manifest.hashNormalization, { encoding: 'UTF-8', lineEndings: 'CRLF normalized to LF' })
const textHash = text => createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
for (const entry of manifest.files) {
  const vendored = await readFile(resolve(engineRoot, entry.source.slice(4)), 'utf8')
  assert.equal(textHash(vendored), entry.vendoredSha256, `vendored canonical UTF-8 LF hash: ${entry.source}`)
}
console.log(`PASS: ${manifest.files.length} vendored canonical UTF-8 LF manifest hashes`)

// Vite's production transformer loads the same TypeScript/JSON dependency graph
// as the Worker, without introducing a second test-only calculator.
const server = await createServer({ configFile: false, root: process.cwd(),
  server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
let sourceServer
try {
  const { inspectTheoreticalPlan, calculateTheoreticalOutput } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/calculate.ts')
  const { importMowerJson, resolveOperatorCharId } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/workbench/compat/mowerJson.ts')
  const { compileRosterSchedule } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/scheduler/compileRosterSchedule.ts')
  const { compiledScheduleToRuntimeConfig } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/scheduler/scheduleAdapter.ts')
  const { simulateSchedule } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/simulator/scheduleSimulation.ts')
  const { validateRosterWorkspace } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/workbench/validate.ts')
  const { mowerReportMetrics } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/workbench/mowerReportMetrics.ts')
  const { OPERATORS } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/domain/operators.ts')
  const { fullCatalogIdleInventory } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/domain/operatorInventory.ts')
  const { createRosterRuntime, settleRoster, advanceRoster, nextRosterActionHours } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/scheduler/rosterRuntime.ts')
  const { getMowerSourceRuntime } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/scheduler/mowerSourceRuntime.ts')
  const { MowerTask, MOWER_TASK_TYPES: taskTypes } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/scheduler/mowerTaskQueue.ts')
  const { scheduleMowerTasks } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/scheduler/mowerTaskScheduling.ts')
  const { mowerConfirmedRecoveryTarget } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/scheduler/mowerDormRecovery.ts')
  const slot = (agent, replacement = []) => ({ agent, group: '', replacement })
  const payload = { default: 'plan1', plan1: {
    room_1_1: { name: '制造站', product: 'gold', plans: [slot('砾')] },
    room_1_3: { name: '发电站', plans: [] }, room_2_3: { name: '发电站', plans: [] },
    room_3_3: { name: '发电站', plans: [] },
  }, conf: { workaholic: '砾' }, backup_plans: [] }
  // Source-oracle comparisons use a reproducible seed. The page itself defaults
  // to -1 (a fresh seed); unrelated random runs must never be asserted identical.
  const short = { warmupDays: 0, sampleDays: 8 / 24, seed: 42 }
  const fails = (fn, pattern) => assert.throws(fn, pattern)
  const checkDefaultScore = result => {
    const { metrics } = result, score = metrics.scoreBreakdown
    assert.deepEqual(Object.keys(score).sort(), ['exp', 'goldValue', 'orderValue', 'weightedExp',
      'weightedGold', 'weightedOrders', 'weightedFragments', 'weightedOrundum', 'total'].sort())
    for (const [key, value] of Object.entries(score)) {
      assert.ok(typeof value === 'number' && Number.isFinite(value), `finite scoreBreakdown.${key}`)
    }
    assert.equal(score.exp, metrics.exp)
    assert.equal(score.goldValue, metrics.goldValue)
    assert.equal(score.orderValue, metrics.orderLmd)
    assert.equal(score.weightedExp, metrics.exp)
    assert.ok(Math.abs(score.weightedGold - .8 * (metrics.goldValue + metrics.virtualGoldValue)) < 1e-6)
    assert.equal(score.weightedOrders, .2 * metrics.orderLmd)
    assert.equal(score.weightedFragments, 0)
    assert.equal(score.weightedOrundum, 0)
    assert.equal(score.total, score.weightedExp + score.weightedGold + score.weightedOrders +
      score.weightedFragments + score.weightedOrundum)
    assert.equal(score.total, metrics.mower82)
    assert.ok(Math.abs(metrics.mower82 - (metrics.exp + .8 * (metrics.goldValue + metrics.virtualGoldValue) +
      .2 * metrics.orderLmd)) < 1e-6, 'the page retains the default 82 report convention')
  }
  const checkDeferralExport = (actual, baseline) => {
    assert.ok(actual.diagnostics.some(issue => issue.code === 'SHIFT_DEFERRAL_UNCONFIRMED'))
    assert.doesNotMatch(JSON.stringify(actual), /排班仍有无法恢复的分组换班阻塞/,
      'a complete sample remains reportable and never revives the former fatal stability error')
    assert.ok(actual.shiftDeferrals.some(episode => episode.resolvedAt === undefined))
    assert.deepEqual(actual.shiftDeferrals, baseline.shiftDeferrals, 'all original deferral evidence is retained')
    assert.deepEqual(JSON.parse(JSON.stringify(actual)).shiftDeferrals, actual.shiftDeferrals,
      'the JSON result export retains unresolved deferral episodes')
  }
  fails(() => inspectTheoreticalPlan({ default: 'plan1', plan1: {} }), /为空/)
  fails(() => inspectTheoreticalPlan({ default: 'plan1', plan1: { room_1_1: { name: '制造站', product: 'gold' } } }), /plans/)
  fails(() => inspectTheoreticalPlan({ default: 'plan1', plan1: { unknown_room: {} } }), /未知房间/)
  const invalid = structuredClone(payload)
  invalid.plan1.room_1_1.plans[0].agent = '未收录的干员'
  fails(() => inspectTheoreticalPlan(invalid), /未知干员/)
  const inspected = inspectTheoreticalPlan(payload)
  assert.equal(inspected.facilities.filter(room => room.level > 0 && ['manufacture', 'trading', 'power'].includes(room.type)).length, 4)
  assert.ok(inspected.facilities.find(room => room.roomId === 'train').assumed)
  assert.equal(inspected.facilities.find(room => room.roomId === 'train').level, 0)
  assert.equal(inspected.facilities.find(room => room.roomId === 'room_1_2').editable, false)
  const workspace = importMowerJson(JSON.stringify(payload))
  for (const [roomId, facility] of Object.entries(workspace.mainPlan.facilities)) {
    if (Object.hasOwn(payload.plan1, roomId)) continue
    assert.equal(facility.level, 0, `${roomId}: omitted rooms never become built defaults`)
    assert.deepEqual(facility.slots, [], `${roomId}: omitted rooms have no staffing`)
  }
  fails(() => calculateTheoreticalOutput(payload, { sampleDays: 0 }), /采样/)
  fails(() => calculateTheoreticalOutput(payload, { facilityLevels: { room_1_1: 0 } }), /未建造|岗位|干员/)
  fails(() => calculateTheoreticalOutput(payload, { facilityLevels: { room_1_2: 3 } }), /未声明|未配置|类型|不存在/)
  fails(() => calculateTheoreticalOutput(payload, { droneRoomId: 'room_1_2' }), /无人机/)
  fails(() => calculateTheoreticalOutput(payload, { operatorInventory: [] }), /未持有.*砾/)
  fails(() => calculateTheoreticalOutput(payload, { operatorInventory: [{ operator: '砾', elitePhase: 2, level: 999 }] }), /无效/)
  const withReplacement = structuredClone(payload)
  withReplacement.plan1.room_1_1.plans[0].replacement = ['芬']
  fails(() => calculateTheoreticalOutput(withReplacement, { operatorInventory: [{ operator: '砾', elitePhase: 1, level: 1 }] }), /未持有.*芬/)
  const withFia = structuredClone(payload)
  withFia.plan1.dormitory_1 = { name: '', plans: [slot('菲亚梅塔', ['砾'])] }
  fails(() => calculateTheoreticalOutput(withFia, { operatorInventory: [{ operator: '砾', elitePhase: 1, level: 1 }] }), /未持有.*菲亚梅塔/)
  const withBackup = structuredClone(payload)
  withBackup.backup_plans.push({ name: '后备', trigger: 'False', plan: { room_1_1: { plans: [slot('芬')] } } })
  fails(() => calculateTheoreticalOutput(withBackup, { operatorInventory: [{ operator: '砾', elitePhase: 1, level: 1 }] }), /未持有.*芬/)
  const original = JSON.stringify(payload)
  const progress = []
  const low = calculateTheoreticalOutput(payload, { ...short, operatorInventory: [{ operator: '砾', elitePhase: 0, level: 1 }] }, event => progress.push(event))
  const high = calculateTheoreticalOutput(payload, { ...short, operatorInventory: [{ operator: '砾', elitePhase: 1, level: 1 }] })
  checkDefaultScore(low)
  checkDefaultScore(high)
  assert.equal(low.requestedSeed, 42)
  assert.equal(low.seed, 42)
  const repeatLow = calculateTheoreticalOutput(payload, {
    ...short, operatorInventory: [{ operator: '砾', elitePhase: 0, level: 1 }],
  })
  assert.deepEqual(repeatLow.metrics, low.metrics, 'a fixed seed reproduces every report metric')
  assert.deepEqual(repeatLow.daily, low.daily, 'a fixed seed reproduces every displayed daily value')
  const checkRandomSeed = result => {
    assert.equal(result.requestedSeed, -1, 'the default preserves the requested random-seed convention')
    assert.ok(Number.isInteger(result.seed) && result.seed >= 0 && result.seed <= 0xffffffff,
      'the effective random seed is a recorded unsigned 32-bit integer')
    checkDefaultScore(result)
  }
  const randomOptions = { warmupDays: short.warmupDays, sampleDays: short.sampleDays }
  checkRandomSeed(calculateTheoreticalOutput(payload, randomOptions))
  checkRandomSeed(calculateTheoreticalOutput(payload, { ...randomOptions, seed: -1 }))
  for (const seed of [-2, .5, 0x100000000, NaN, Infinity, '42']) {
    fails(() => calculateTheoreticalOutput(payload, { ...short, seed }), /种子|seed|随机/i)
  }
  assert.ok(high.daily.physicalGold > low.daily.physicalGold, 'only actually unlocked gold skills apply')
  assert.equal(JSON.stringify(payload), original, 'calculating never edits imported rosters')
  assert.ok(progress.length > 1)
  assert.ok(progress.at(-1).elapsedHours >= 8 - 1e-6)
  const ignored = calculateTheoreticalOutput(payload, { ...short, jayeElite0: true, operatorInventory: [
    { operator: '砾', elitePhase: 1, level: 1 }, { operator: 'char_future_not_in_snapshot', elitePhase: 0, level: 1 },
  ] })
  assert.deepEqual(ignored.metrics, high.metrics)
  assert.ok(ignored.diagnostics.some(issue => issue.code === 'INVENTORY_UNKNOWN_UNUSED'))
  assert.ok(ignored.diagnostics.some(issue => issue.code === 'JAYE_STAGE_FROM_INVENTORY'))
  const withPolicyOnly = structuredClone(payload)
  const policyOnlyLists = ['rest_in_full', 'exhaust_require', 'workaholic', 'resting_priority',
    'resting_priority_replacement', 'free_room_exclusions', 'resting_standby', 'free_blacklist',
    'refresh_trading', 'refresh_drained', 'ope_resting_priority']
  for (const key of policyOnlyLists) withPolicyOnly.conf[key] = key === 'workaholic' ? '砾,芬' : '芬'
  withPolicyOnly.backup_plans.push({ name: '策略', trigger: 'False', conf: Object.fromEntries(policyOnlyLists.map(key => [key, '芬'])) })
  const policiesResult = calculateTheoreticalOutput(withPolicyOnly, { ...short, operatorInventory: [{ operator: '砾', elitePhase: 1, level: 1 }] })
  assert.deepEqual(policiesResult.metrics, high.metrics, 'policy-only references do not falsely require ownership')
  const withUnownedTrigger = structuredClone(payload)
  withUnownedTrigger.backup_plans.push({ name: '条件', trigger: "op_data.operators['芬'].current_mood() < 12" })
  fails(() => calculateTheoreticalOutput(withUnownedTrigger, { ...short, operatorInventory: [{ operator: '砾', elitePhase: 1, level: 1 }] }), /未持有.*芬/)
  const invalidPolicyOnly = structuredClone(withPolicyOnly)
  invalidPolicyOnly.conf.free_blacklist = '不存在的干员'
  fails(() => inspectTheoreticalPlan(invalidPolicyOnly), /未知干员/)

  const withEmptyProduction = structuredClone(payload)
  withEmptyProduction.plan1.room_1_2 = { name: '制造站', product: 'exp3', plans: [] }
  const disabledProduction = calculateTheoreticalOutput(withEmptyProduction, {
    ...short, facilityLevels: { room_1_2: 0, train: 0 },
  })
  checkDefaultScore(disabledProduction)
  assert.ok(disabledProduction.daily.physicalGold > 0)
  assert.equal(disabledProduction.metrics.exp, 0, 'a zero-level manufacturing room produces nothing')
  fails(() => calculateTheoreticalOutput(withEmptyProduction, {
    ...short, facilityLevels: { room_1_2: 0 }, droneRoomId: 'room_1_2',
  }), /无人机/)
  const withoutStaff = structuredClone(payload)
  withoutStaff.plan1.room_1_1.plans = []
  fails(() => calculateTheoreticalOutput(withoutStaff, {
    ...short, facilityLevels: { room_1_1: 0 },
  }), /制造站|贸易站|产出|收益/)

  // Self-contained 252 layout: three staffed dorms, no fourth dorm or training room.
  // Distinct catalog IDs specify output-room capacities without copying an account roster.
  const keepers = new Set(['杜林', '芬', '芙蓉'].map(resolveOperatorCharId))
  const syntheticStaff = [...new Set(OPERATORS.map(operator => resolveOperatorCharId(operator.charId)))].filter(id => !keepers.has(id))
  let staffIndex = 0
  const staffed = count => Array.from({ length: count }, () => slot(syntheticStaff[staffIndex++]))
  const reduced = { default: 'plan1', plan1: {
    room_1_1: { name: '制造站', product: 'exp3', plans: staffed(3) },
    room_1_2: { name: '贸易站', product: 'lmd', plans: staffed(2) },
    room_1_3: { name: '发电站', plans: [] },
    room_2_1: { name: '制造站', product: 'gold', plans: staffed(3) },
    room_2_2: { name: '制造站', product: 'gold', plans: staffed(2) },
    room_2_3: { name: '制造站', product: 'gold', plans: staffed(3) },
    room_3_1: { name: '制造站', product: 'exp3', plans: staffed(3) },
    room_3_2: { name: '贸易站', product: 'lmd', plans: staffed(1) },
    room_3_3: { name: '发电站', plans: [] },
    meeting: { name: '', plans: [] }, contact: { name: '', plans: [] }, factory: { name: '', plans: [] },
    dormitory_1: { name: '', plans: [slot('杜林'), slot('Free'), slot('Free'), slot('Free'), slot('Free')] },
    dormitory_2: { name: '', plans: [slot('芬'), slot('Free'), slot('Free'), slot('Free'), slot('Free')] },
    dormitory_3: { name: '', plans: [slot('芙蓉'), slot('Free'), slot('Free'), slot('Free'), slot('Free')] },
  }, conf: {}, backup_plans: [] }
  const reducedWorkspace = importMowerJson(JSON.stringify(reduced))
  const reducedValidation = validateRosterWorkspace(reducedWorkspace)
  assert.ok(reducedValidation.isValid, JSON.stringify(reducedValidation.criticalErrors))
  assert.deepEqual(reducedValidation.power, {
    generation: 540, consumption: 470, margin: 70, sufficient: true,
  })
  const reducedSchedule = compileRosterSchedule(reducedWorkspace)
  assert.equal(reducedSchedule.rooms.filter(room => room.type === 'dormitory').length, 3)
  assert.equal(reducedSchedule.rooms.some(room => ['train', 'dormitory_4'].includes(room.roomId)), false)
  const freeOnly = structuredClone(reduced)
  freeOnly.plan1.dormitory_4 = { name: '', plans: Array.from({ length: 5 }, () => slot('Free')) }
  const freeOnlyWorkspace = importMowerJson(JSON.stringify(freeOnly))
  assert.equal(freeOnlyWorkspace.mainPlan.facilities.dormitory_4.level, 0)
  assert.deepEqual(freeOnlyWorkspace.mainPlan.facilities.dormitory_4.slots, [])
  const freeOnlySchedule = compileRosterSchedule(freeOnlyWorkspace)
  assert.equal(freeOnlySchedule.restPools.some(pool => pool.roomId === 'dormitory_4'), false)
  assert.equal(compiledScheduleToRuntimeConfig(freeOnlySchedule).beds.some(bed => bed.roomId === 'dormitory_4'), false)
  assert.deepEqual(validateRosterWorkspace(freeOnlyWorkspace).power, validateRosterWorkspace(reducedWorkspace).power)
  console.log('PASS: missing/Free-only facilities, three-dorm power 540/470, zero-level production and drone guards, strict ownership, real skill stages, progress, detached inputs')

  const ordinaryBackup = { default: 'plan1', plan1: {
    room_3_1: { name: '贸易站', product: 'lmd', plans: [slot('芬')] },
    room_1_3: { name: '发电站', plans: [] }, room_2_3: { name: '发电站', plans: [] },
    room_3_3: { name: '发电站', plans: [] },
  }, conf: { workaholic: '芬,但书' }, backup_plans: [{
    name: '普通换班', trigger: 'True', trigger_timing: 'BEGINNING',
    plan: { room_3_1: { plans: [slot('但书')] } }, task: { room_3_1: ['但书'] },
  }] }
  const ordinarySchedule = compileRosterSchedule(importMowerJson(JSON.stringify(ordinaryBackup)))
  // 5000 is a deliberate bounded regression probe, distinct from the page's 200000 cap.
  // Ordinary staffing must not retry runner countdown calibration once per second.
  const ordinaryReport = simulateSchedule(ordinarySchedule, {
    warmupHours: 0, sampleHours: 8, warmupModel: 'hourly', maxStepHours: .25,
    maxEvents: 5000, recordSegments: true,
    production: { outputMode: 'potential', inventoryMode: 'unlimited', runOrderMode: 'ideal', droneTarget: 'none', seed: 42 },
  })
  assert.ok(ordinaryReport.success && ordinaryReport.production?.success, JSON.stringify(ordinaryReport.diagnostics))
  assert.ok(Math.abs(ordinaryReport.observedHours - 8) < 1e-6)
  const provisoId = resolveOperatorCharId('但书')
  const firstStaffed = ordinaryReport.segments.find(segment => segment.occupants.room_3_1_0 === provisoId)
  // Native outer-loop boundaries retain the initial roster for two microseconds.
  // Ordinary staffing must proceed within a second, without awaiting an order countdown.
  assert.ok(firstStaffed && firstStaffed.start * 3600 <= 1, 'ordinary backup promptly staffs its resident Proviso')
  assert.ok(ordinaryReport.segments.filter(segment => segment.start >= firstStaffed.start)
    .every(segment => segment.occupants.room_3_1_0 === provisoId), 'resident staffing remains in place after the native boundary')
  assert.ok(ordinaryReport.events.filter(event => event.reason === 'position-correction').length < 5, 'ordinary staffing never floods correction tasks')
  const ordinaryActual = calculateTheoreticalOutput(ordinaryBackup, short)
  assert.deepEqual(ordinaryActual.metrics, mowerReportMetrics(ordinaryReport), 'the actual page input path uses the same corrected runtime')
  assert.ok(ordinaryActual.metrics.orderLmd > 0)
  checkDefaultScore(ordinaryActual)
  // Observe the random boundary directly, rather than relying on two random
  // draws being unequal. Replaying its recorded seed must reproduce real orders.
  const randomMethod = Object.getOwnPropertyDescriptor(globalThis.crypto, 'getRandomValues')
  for (const effectiveSeed of [0, 42, 0xffffffff]) {
    let draws = 0
    Object.defineProperty(globalThis.crypto, 'getRandomValues', { configurable: true, value: values => {
      assert.ok(values instanceof Uint32Array && values.length === 1)
      draws++
      values[0] = effectiveSeed
      return values
    } })
    try {
      const randomRun = calculateTheoreticalOutput(ordinaryBackup, randomOptions)
      checkRandomSeed(randomRun)
      assert.equal(draws, 1, 'each random calculation draws its seed from the cryptographic API once')
      assert.equal(randomRun.seed, effectiveSeed, 'the recorded seed is the actual cryptographic draw')
      const replay = calculateTheoreticalOutput(ordinaryBackup, { ...short, seed: randomRun.seed })
      assert.equal(draws, 1, 'a fixed-seed replay makes no additional random draw')
      assert.deepEqual(replay.metrics, randomRun.metrics, 'the recorded seed reproduces the sampled order report')
      assert.deepEqual(replay.daily, randomRun.daily, 'the recorded seed reproduces the displayed values')
    } finally {
      if (randomMethod) Object.defineProperty(globalThis.crypto, 'getRandomValues', randomMethod)
      else delete globalThis.crypto.getRandomValues
    }
  }
  const experience = structuredClone(payload)
  experience.plan1.room_1_1.product = 'exp3'
  const experienceActual = calculateTheoreticalOutput(experience, short)
  assert.ok(experienceActual.metrics.exp > 0)
  checkDefaultScore(experienceActual)
  console.log('PASS: ordinary Proviso backup staffing, bounded eight-hour simulation, actual page calculation parity')

  // Fixed upstream 8885cdc regressions, independent of account rosters. An ideal
  // order changes production only; it cannot move an ordinary shift by 101 seconds.
  const ordinaryShift = new MowerTask({ type: taskTypes.SHIFT_OFF,
    plan: { central: ['Manager'], room_1_1: ['Replacement'], dormitory_1: ['Worker'] } })
  const idealOrder = new MowerTask({ time: 100 / 3600, type: taskTypes.RUN_ORDER, metadata: 'room_1_1' })
  const idealTasks = [ordinaryShift, idealOrder]
  scheduleMowerTasks(idealTasks, 0, { adjustForRunOrders: false })
  assert.equal(ordinaryShift.timeMicros, 0, 'an ideal order never postpones ordinary shift-off')
  assert.equal(idealOrder.timeMicros, 100_000_000, 'the original production wake is retained')
  assert.deepEqual(idealTasks, [ordinaryShift, idealOrder], 'ordinary shift remains before the unchanged ideal wake')

  // Exercise the real task executor through final observation. Synthetic names
  // and supplied rates isolate dorm transactions from operator skill formulae.
  const dormRoom = 'dormitory_1', dormKeepers = ['Manager', 'Resident1', 'Resident2']
  const dormState = createRosterRuntime({
    positions: [
      { id: 'room_1_1_0', roomId: 'room_1_1', primary: 'Worker', candidates: ['Replacement'],
        lowerLimit: 0, upperLimit: 24, shiftOffThreshold: 15 },
      ...dormKeepers.map((primary, index) => ({ id: `${dormRoom}_${index}`, roomId: dormRoom,
        primary, candidates: [], permanent: true, dormitory: true })),
    ],
    beds: [{ id: `${dormRoom}_3`, roomId: dormRoom, vip: true },
      { id: `${dormRoom}_4`, roomId: dormRoom, vip: false }],
    initialMorale: { Worker: 24, Replacement: 24, Incoming: 7, Other: 8 },
    idleOperators: ['Incoming', 'Other'],
    mowerPolicy: { restingThreshold: .65, powerPlantCount: 2, opeRestingPriority: [] },
    mowerTaskScheduling: { adjustForRunOrders: false },
    mowerDeviceTiming: { roomReturnMicros: 500_000 },
    mowerRunLoopClock: { minimumClockStepMicros: 1, notificationSleepMicros: 1_000_000 },
    mowerSourcePlan: { room_1_1: [slot('Worker', ['Replacement'])],
      [dormRoom]: [...dormKeepers.map(name => slot(name)), slot('Free'), slot('Free')] },
    mowerSourceRules: { workaholic: [], exhaustRequire: [], restInFull: [], lowPriority: [],
      refreshDrained: [], lingMode: 0 },
  })
  const dormSource = getMowerSourceRuntime(dormState)
  dormSource.initial = false
  dormState.bedOccupants[`${dormRoom}_4`] = 'Other'
  dormSource.data.operators.Incoming.mood = 7
  dormSource.data.operators.Incoming.timeStampMicros = 0
  for (const [index, name] of [...dormKeepers, '', 'Other'].entries()) if (name) {
    const operator = dormSource.data.operators[name]
    operator.currentRoom = dormRoom; operator.currentIndex = index
    operator.mood = dormState.morale[name] ?? 24; operator.timeStampMicros = 0
  }
  dormSource.data.operators.Worker.currentRoom = 'room_1_1'
  dormSource.data.operators.Worker.currentIndex = 0
  dormSource.data.operators.Manager.singleRecoveryManager = true
  const rates = { workRate: () => 1, recoveryRate: () => 4 }
  const completeDormTask = task => {
    dormSource.queue.tasks.push(task)
    for (let step = 0; step < 30 && dormSource.queue.tasks.includes(task); step++) {
      settleRoster(dormState, rates)
      if (dormSource.queue.tasks.includes(task)) advanceRoster(dormState, nextRosterActionHours(dormState, rates), rates)
    }
    assert.equal(dormSource.queue.tasks.includes(task), false, 'the dorm transaction completes')
    assert.ok(!dormSource.error, dormSource.error)
  }
  completeDormTask(new MowerTask({ type: taskTypes.SELF_CORRECTION,
    plan: { [dormRoom]: ['Current', 'Current', 'Current', 'Free', 'Current'] } }))
  assert.equal(dormState.bedOccupants[`${dormRoom}_3`], 'Incoming')
  assert.equal(mowerConfirmedRecoveryTarget(dormSource.data, dormRoom, 'Manager'), 'Incoming',
    'first Free selection confirms the actual recovery target without a second room visit')
  const otherPositionVersion = dormSource.data.operators.Other.dormPositionVersion
  completeDormTask(new MowerTask({ time: dormState.time,
    plan: { [dormRoom]: Array(5).fill('Current') } }))
  assert.equal(mowerConfirmedRecoveryTarget(dormSource.data, dormRoom, 'Manager'), 'Incoming')
  assert.equal(dormState.bedOccupants[`${dormRoom}_4`], 'Other')
  assert.equal(dormSource.data.operators.Other.dormPositionVersion, otherPositionVersion,
    'an identical backup arrangement does not move an already observed resident')
  console.log('PASS: ideal orders preserve ordinary shift timing; first Free selection confirms recovery and repeated dorm arrangement retains beds')

  // Exercise native Free selection after both backup activation and exit. None of
  // the three idle cards is referenced by the plan, so only the owned pool supplies them.
  const ownedIdle = structuredClone(payload)
  ownedIdle.plan1.dormitory_1 = { name: '', plans: [slot('杜林'), slot('芙蓉'), slot('Free'), slot('Free'), slot('Free')] }
  ownedIdle.backup_plans = [{ name: '填充空床', trigger: "op_data.operators['砾'].current_mood() > 20",
    trigger_timing: 'BEGINNING', task: { dormitory_1: ['杜林', '芙蓉', 'Free', 'Free', 'Free'] } }]
  const ownedInventory = ['砾', '杜林', '芙蓉', '芬', '安赛尔', '克洛丝'].map(operator => ({ operator, elitePhase: 0, level: 1 }))
  const ownedIds = new Set(ownedInventory.map(entry => resolveOperatorCharId(entry.operator)))
  const idleIds = ['芬', '安赛尔', '克洛丝'].map(resolveOperatorCharId)
  const simulationOptions = { warmupHours: 0, sampleHours: 8, warmupModel: 'hourly', maxStepHours: .25,
    maxEvents: 5000, recordSegments: true,
    production: { outputMode: 'potential', inventoryMode: 'unlimited', runOrderMode: 'ideal', droneTarget: 'none', seed: 42 } }
  const ownedReport = simulateSchedule(compileRosterSchedule(importMowerJson(JSON.stringify(ownedIdle))), {
    ...simulationOptions, operatorInventory: ownedInventory,
  })
  assert.ok(ownedReport.success && ownedReport.production?.success, JSON.stringify(ownedReport.diagnostics))
  assert.equal(ownedReport.observedHours, 8)
  const transitions = ownedReport.events.filter(event => event.type === 'backup-plan')
  assert.deepEqual(transitions.map(event => event.active), [true, false], 'the regression exercises activation and exit')
  for (const segment of ownedReport.segments) {
    const occupants = [...Object.values(segment.occupants), ...Object.values(segment.bedOccupants)]
    assert.ok(occupants.every(id => ownedIds.has(id)), 'native selection never uses an unowned card')
  }
  const hasAllIdleCards = segment => idleIds.every(id => Object.values(segment.bedOccupants).includes(id))
  assert.ok(ownedReport.segments.some(segment => segment.start >= transitions[0].time && hasAllIdleCards(segment)),
    'the activated backup really selects all three owned idle cards into Free beds')
  assert.ok(ownedReport.segments.some(segment => segment.start >= transitions[1].time && hasAllIdleCards(segment)),
    'owned idle occupancy survives the rebuilt configuration on backup exit')
  const ownedActual = calculateTheoreticalOutput(ownedIdle, { ...short, operatorInventory: ownedInventory })
  assert.deepEqual(ownedActual.metrics, mowerReportMetrics(ownedReport), 'the page uses the actual inventory through backup changes')
  checkDefaultScore(ownedActual)
  console.log('PASS: backup activation/exit, real owned Free-card selection, all segment occupants restricted to the held inventory')

  // A complete sampling window is reportable even if an exhausted worker has no
  // eligible cover; its outstanding deferral must remain conspicuous and exportable.
  const deferred = structuredClone(ownedIdle)
  deferred.conf = { exhaust_require: '砾' }
  deferred.backup_plans = []
  const deferredReport = simulateSchedule(compileRosterSchedule(importMowerJson(JSON.stringify(deferred)), {
    restingThreshold: .65, freeRoom: false, fiammettaFool: true,
  }), { ...simulationOptions, sampleHours: 24 })
  assert.ok(deferredReport.success && deferredReport.production?.success, JSON.stringify(deferredReport.diagnostics))
  assert.equal(deferredReport.observedHours, 24)
  assert.ok(deferredReport.diagnostics.some(issue => issue.code === 'group-blocked'))
  const deferredActual = calculateTheoreticalOutput(deferred, { warmupDays: 0, sampleDays: 1, seed: 42 })
  assert.equal(deferredActual.observedHours, 24)
  assert.deepEqual(deferredActual.metrics, mowerReportMetrics(deferredReport))
  checkDefaultScore(deferredActual)
  checkDeferralExport(deferredActual, deferredReport)
  const incomplete = simulateSchedule(ordinarySchedule, { ...simulationOptions, maxEvents: 1 })
  assert.equal(incomplete.success, false)
  assert.ok(incomplete.diagnostics.some(issue => issue.code === 'SIMULATION_EVENT_LIMIT'))
  assert.equal(mowerReportMetrics(incomplete), null, 'partial simulations never produce report metrics')
  const duplicateBackup = structuredClone(ownedIdle)
  duplicateBackup.plan1.room_1_1.plans = [slot('砾'), slot('斑点')]
  duplicateBackup.conf.workaholic = '砾,斑点'
  duplicateBackup.backup_plans = [{ name: '重复主班', trigger: 'True', trigger_timing: 'BEGINNING',
    plan: { room_1_1: { plans: [slot('芬'), slot('芬')] } } }]
  fails(() => calculateTheoreticalOutput(duplicateBackup, short), /模拟未完成.*重复主班/)
  const malformedBackup = structuredClone(ownedIdle)
  malformedBackup.backup_plans[0].trigger = '('
  fails(() => calculateTheoreticalOutput(malformedBackup, short), /条件|表达式|副表|语法/)
  console.log('PASS: finite score breakdown/default 82 totals, default -1/effective seed, fixed-seed reproduction, invalid seeds, complete unresolved deferral warning/export, incomplete and invalid calculations rejected')

  const args = process.argv.slice(2)
  const sourceIndex = args.indexOf('--source')
  if (sourceIndex >= 0) {
    const source = resolve(args[sourceIndex + 1])
    for (const entry of manifest.files) {
      const original = await readFile(resolve(source, entry.source), 'utf8')
      assert.equal(textHash(original), entry.sha256, `source canonical UTF-8 LF hash: ${entry.source}`)
    }
    console.log(`PASS: ${manifest.files.length} original-source canonical UTF-8 LF manifest hashes`)
    sourceServer = await createServer({ configFile: false, root: source,
      server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
    const originalImport = await sourceServer.ssrLoadModule('/src/workbench/compat/mowerJson.ts')
    const originalBridge = await sourceServer.ssrLoadModule('/src/workbench/scheduleSimulationBridge.ts')
    const originalMetrics = await sourceServer.ssrLoadModule('/src/workbench/mowerReportMetrics.ts')
    // Existing public source fixtures stay in the source checkout and never enter this PR.
    const fixtures = ['mower-252-2gold.json', 'mower-252-3gold.json', 'mower-342-pure-lmd.json', 'mower-342-orirock.json']
    for (const filename of fixtures) {
      const raw = JSON.parse(await readFile(resolve(source, 'src/workbench/compat/fixtures', filename), 'utf8'))
      console.log(`Checking original-source parity: ${filename}`)
      const baseline = originalBridge.runScheduleSimulationBridge(originalImport.importMowerJson(JSON.stringify(raw)), {
        warmupHours: 72, sampleHours: 168, maxStepHours: .25, warmupModel: 'hourly', recordSegments: false,
        production: { outputMode: 'potential', inventoryMode: 'unlimited', runOrderMode: 'ideal', droneTarget: 'none', seed: 42 },
      }, { restingThreshold: .65, freeRoom: false, fiammettaFool: true })
      assert.ok(baseline.report?.success && baseline.report.production?.success, baseline.error)
      const blocked = baseline.report.diagnostics.some(issue => issue.code === 'group-blocked') ||
        baseline.report.shiftDeferrals?.some(episode => episode.resolvedAt === undefined)
      const actual = calculateTheoreticalOutput(raw, { seed: 42 })
      assert.deepEqual(actual.metrics, originalMetrics.mowerReportMetrics(baseline.report), 'all source report fields must match exactly')
      assert.ok(Math.abs(actual.observedHours - 168) < 1e-6)
      checkDefaultScore(actual)
      if (blocked) checkDeferralExport(actual, baseline.report)
      else assert.equal(actual.diagnostics.some(issue => issue.code === 'SHIFT_DEFERRAL_UNCONFIRMED'), false)
      console.log(`PASS: ${filename} original metric parity (${actual.metrics.mower82})${blocked ? ', unresolved deferral warning/export retained' : ''}`)
    }
    // Explicit maximum-stage inventory must preserve the same numeric engine path.
    assert.equal(fullCatalogIdleInventory().length, OPERATORS.length)
  }
} finally {
  await sourceServer?.close()
  await server.close()
}
