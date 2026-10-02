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
  const { importMowerJson } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/engine/workbench/compat/mowerJson.ts')
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
  assert.equal(inspected.facilities.filter(room => ['manufacture', 'trading', 'power'].includes(room.type)).length, 4)
  assert.ok(inspected.facilities.find(room => room.roomId === 'train').assumed)
  assert.equal(inspected.facilities.find(room => room.roomId === 'train').level, 3)
  const workspace = importMowerJson(JSON.stringify(payload))
  assert.equal(workspace.mainPlan.facilities.room_1_2.type, '')
  assert.equal(workspace.mainPlan.facilities.room_1_2.level, 0)
  assert.deepEqual(workspace.mainPlan.facilities.train.slots, [])
  fails(() => calculateTheoreticalOutput(payload, { sampleDays: 0 }), /采样/)
  fails(() => calculateTheoreticalOutput(payload, { facilityLevels: { room_1_1: 0 } }), /等级/)
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
  console.log('PASS: sparse import, source support-level assumptions, invalid inputs, strict ownership (main/replacements/Fia/backups), real skill stages, progress, detached inputs, unknown idle cards')

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
