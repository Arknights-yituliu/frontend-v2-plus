import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ configFile: false, root: process.cwd(),
  server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
const prefix = '/src/utils/mower/theoretical-output'
try {
  const { inspectTheoreticalPlan, calculateTheoreticalOutput } = await server.ssrLoadModule(`${prefix}/calculate.ts`)
  const { readIncomeWorkspace, incomeOperatorReferences } = await server.ssrLoadModule(`${prefix}/planInput.ts`)
  const { compileBackupExpression } = await server.ssrLoadModule(`${prefix}/engine/scheduler/backupExpression.ts`)
  const { createRosterRuntime } = await server.ssrLoadModule(`${prefix}/engine/scheduler/rosterRuntime.ts`)
  const { resolveOperatorCharId: id } = await server.ssrLoadModule(`${prefix}/engine/domain/operatorIdentifiers.ts`)
  const slot = (agent, replacement = []) => ({ agent, replacement, group: '' })
  const base = { default: 'plan1', plan1: {
    room_1_1: { name: '制造站', product: 'gold', plans: [slot('砾')] },
    room_1_3: { name: '发电站', plans: [] }, room_2_3: { name: '发电站', plans: [] }, room_3_3: { name: '发电站', plans: [] },
  }, conf: { workaholic: '砾' }, backup_plans: [] }
  const grouped = structuredClone(base)
  grouped.backup_groups = [{ id: 'observe', name: '观察分组', trigger: {
    function: 'all', args: [
      { left: "op_data.operators['阿米娅'].current_mood()", operator: '>', right: '0' },
      { left: "op_data.facility_has_mastery_plan('train')", operator: '==', right: 'False' },
    ],
  } }]
  grouped.backup_plans = [{ name: '观察副表', group_ids: ['observe'], type: 'exclusive', plan: {}, conf: {}, trigger: { function: 'all', args: ['True'] } }]
  const refs = incomeOperatorReferences(readIncomeWorkspace(grouped))
  assert.ok(refs.required.has(id('阿米娅')), 'group-condition operators participate in the website ownership requirement')
  assert.ok(inspectTheoreticalPlan(grouped).usesMasteryPlanCondition, 'group training conditions retain the fixed-no-training notice')
  assert.throws(() => calculateTheoreticalOutput(grouped, { warmupDays: 0, sampleDays: 1 / 24, seed: 42,
    operatorInventory: [{ operator: '砾', elitePhase: 1, level: 1 }] }), /阿米娅/)
  console.log('PASS: group conditions retain operator ownership validation and training assumptions at the website boundary')

  const state = createRosterRuntime({ positions: [], beds: [] })
  const condition = compileBackupExpression({ left: { function: 'max', args: [
    "op_data.inventory_count('赤金')", { function: 'sum', args: ['2', '3'] },
  ] }, operator: '>=', right: '6' }, new Set())
  state.mowerInventoryCounts = { 赤金: 4 }
  assert.equal(condition.evaluate(state), false)
  state.mowerInventoryCounts.赤金 = 7
  assert.equal(condition.evaluate(state), true)
  console.log('PASS: serialized nested functions evaluate updated runtime inventory values')

  for (const name of [id('菲亚梅塔'), '菲亚梅塔']) for (const saved of [0, 24]) {
    const runtime = createRosterRuntime({ positions: [
      { id: 'dormitory_1_0', roomId: 'dormitory_1', primary: name, candidates: [], dormitory: true, permanent: true },
    ], beds: [], initialMorale: { [name]: saved } })
    assert.equal(runtime.morale[name], 16)
  }
  const report = calculateTheoreticalOutput(base, { warmupDays: 0, sampleDays: 1 / 24, seed: 42 })
  assert.deepEqual(report.initialConditions, { fiammettaMorale: 16 })
  assert.equal(report.observedHours, 1)
  console.log('PASS: vendored initialization fixes Fiammetta at 16 and website report exports the same condition')
} finally {
  await server.close()
}
