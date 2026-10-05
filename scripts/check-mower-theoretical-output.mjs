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
  const slot = (agent, replacement = []) => ({ agent, group: '', replacement })
  const payload = { default: 'plan1', plan1: {
    room_1_1: { name: '制造站', product: 'gold', plans: [slot('砾')] },
    room_1_3: { name: '发电站', plans: [] }, room_2_3: { name: '发电站', plans: [] },
    room_3_3: { name: '发电站', plans: [] },
  }, conf: { workaholic: '砾' }, backup_plans: [] }
  const short = { warmupDays: 0, sampleDays: 8 / 24 }
  const fails = (fn, pattern) => assert.throws(fn, pattern)
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
  console.log('PASS: ordinary Proviso backup staffing, bounded eight-hour simulation, actual page calculation parity')

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
      if (blocked) {
        fails(() => calculateTheoreticalOutput(raw), /阻塞/)
        console.log(`PASS: ${filename} retains original unresolved scheduling failure`)
        continue
      }
      const actual = calculateTheoreticalOutput(raw)
      assert.deepEqual(actual.metrics, originalMetrics.mowerReportMetrics(baseline.report), 'all source report fields must match exactly')
      assert.ok(Math.abs(actual.observedHours - 168) < 1e-6)
      console.log(`PASS: ${filename} original metric parity (${actual.metrics.mower82})`)
    }
    // Explicit maximum-stage inventory must preserve the same numeric engine path.
    assert.equal(fullCatalogIdleInventory().length, OPERATORS.length)
  }
} finally {
  await sourceServer?.close()
  await server.close()
}
