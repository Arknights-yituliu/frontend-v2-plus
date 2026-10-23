import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'

// Exercise the actual imported engine and public page adapter. Source tests are
// deliberately not copied into the website or substituted for this runtime.
const server = await createServer({ configFile: false, root: process.cwd(),
  server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
let baselineServer
const prefix = '/src/utils/mower/theoretical-output/engine'
const load = path => server.ssrLoadModule(`${prefix}/${path}.ts`)
const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7,
  `${message}: ${actual} versus ${expected}`)
try {
  const { createDefaultConfig } = await load('domain/defaults')
  const { OPERATORS, OPERATOR_MAP } = await load('domain/operators')
  const { resolveOperatorCharId: id } = await load('domain/operatorIdentifiers')
  const { selectUnlockedSkills, compileOperatorInventory, fullCatalogIdleInventory } = await load('domain/operatorInventory')
  const { inventoryOperatorRecords } = await load('domain/operatorContext')
  const { evaluateOperators } = await load('engine/operatorRules')
  const { evaluateRecycleEfficiency, evaluateNewContactAndClueSkills, evaluateHomeboundByproduct } = await load('engine/supportFacilitySkills')
  const { importMowerJson, exportMowerJson } = await load('workbench/compat/mowerJson')
  const { compileRosterSchedule } = await load('scheduler/compileRosterSchedule')
  const { simulateSchedule } = await load('simulator/scheduleSimulation')
  const { mowerReportMetrics } = await load('workbench/mowerReportMetrics')
  const { inspectTheoreticalPlan, calculateTheoreticalOutput } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/calculate.ts')
  const slot = (agent, replacement = []) => ({ agent, replacement, group: '' })
  const payload = { default: 'plan1', plan1: {
    room_1_1: { name: '制造站', product: 'gold', plans: [slot('砾')] },
    room_1_3: { name: '发电站', plans: [] }, room_2_3: { name: '发电站', plans: [] },
    room_3_3: { name: '发电站', plans: [] },
  }, conf: { workaholic: '砾' }, backup_plans: [] }
  const short = { warmupDays: 0, sampleDays: 8 / 24, seed: 42 }
  const simulation = { schedulingModel: 'mower-alpha', warmupHours: 0, sampleHours: 8,
    maxStepHours: .25, warmupModel: 'hourly', recordSegments: false,
    production: { outputMode: 'potential', inventoryMode: 'unlimited', runOrderMode: 'ideal', droneTarget: 'none', seed: 42 } }

  assert.equal(OPERATORS.length, 432)
  const inventory = compileOperatorInventory(fullCatalogIdleInventory())
  assert.ok(inventory.valid)
  assert.equal(inventory.operators.length, 432)
  for (const operator of inventory.operators) {
    assert.deepEqual(operator.skills, OPERATOR_MAP.get(operator.charId).skills,
      `maximum stage selects every independent slot exactly once: ${operator.name}`)
  }
  for (const [name, initial, promoted] of [
    ['德·托莱多', ['hire_spd_cost[113]'], ['hire_spd_cost[122]', 'dorm_hireToRecAll[002]']],
    ['旅骨', ['recycle_spd&cost[000]'], ['recycle_spd&cost[010]', 'workshop_formula_device[080]']],
    ['克莱门莎', ['meet_spd&cost[110]'], ['meet_spd&cost[110]', 'meet_spd&cost_char[000]']],
  ]) {
    const operator = OPERATOR_MAP.get(id(name))
    for (const phase of [0, 1]) assert.deepEqual(selectUnlockedSkills(operator, phase, 1).map(skill => skill.buffId), initial)
    assert.deepEqual(selectUnlockedSkills(operator, 2, 1).map(skill => skill.buffId), promoted)
  }
  const stageConfig = (name, phase) => {
    const config = createDefaultConfig()
    config.operatorRecords = inventoryOperatorRecords(compileOperatorInventory([{ operator: name, elitePhase: phase, level: 1 }]))
    return config
  }
  for (const phase of [0, 1, 2]) {
    const config = stageConfig('德·托莱多', phase)
    config.facilityOperatorIds.office = [id('德·托莱多')]
    assert.equal(evaluateNewContactAndClueSkills(config).contactBonus, phase === 2 ? 30 : 20)
    config.facilities.office = 0
    assert.equal(evaluateNewContactAndClueSkills(config).contactBonus, 0)
  }
  const clue = stageConfig('克莱门莎', 2)
  clue.facilityOperatorIds.reception = [id('克莱门莎'), id('12F')]
  assert.equal(evaluateNewContactAndClueSkills(clue).clueBonus, 35)
  clue.zeroMoraleOperatorIds = [id('12F')]
  assert.equal(evaluateNewContactAndClueSkills(clue).clueBonus, 20)
  const craft = stageConfig('旅骨', 2)
  craft.facilityOperatorIds.workshop = [id('旅骨')]
  closeTo(evaluateHomeboundByproduct(craft, '31094').probability, .19, 'Homebound unlocked device byproduct')
  closeTo(evaluateHomeboundByproduct(craft, '30034').probability, .1, 'unrelated item keeps its base probability')
  console.log('PASS: v078 432 maximum-stage records, independent new skill slots, scoped office/clue/workshop effects')

  const hunters = ['斯卡蒂', '乌尔比安', '安哲拉', '幽灵鲨'].map(id)
  for (const phase of [0, 1, 2]) {
    const config = stageConfig('歌蕾蒂娅', phase)
    config.controlOperatorIds = [id('歌蕾蒂娅')]
    config.rooms[0].operatorIds = hunters.slice(0, 3)
    config.rooms[1].operatorIds = hunters.slice(3)
    config.zeroMoraleOperatorIds = hunters
    const result = evaluateOperators(config.rooms[0], config)
    assert.equal(result.staffBonus, 0)
    assert.equal(result.skillBonus, phase === 2 ? 90 : 45, 'exhaustion does not disable the external manufacturing grant')
    assert.equal(result.efficiencyPercent, phase === 2 ? 190 : 145)
    assert.ok(result.operatorContributions.every(operator => operator.staffBonus === 0))
    config.zeroMoraleOperatorIds = [...hunters, id('歌蕾蒂娅')]
    assert.equal(evaluateOperators(config.rooms[0], config).skillBonus, 0, 'an exhausted provider disables the grant')
  }
  console.log('PASS: fatigued hunter recipients retain only the external grant, actual provider stages cap 45/90, exhausted provider disables it')

  for (const [capacity, bonus] of [[250, 25], [235, 23], [260, 25]]) {
    const config = createDefaultConfig()
    if (capacity === 250) assert.equal(config.efficiencyResources.droneCapacity, 250)
    config.efficiencyResources.droneCapacity = capacity
    const room = config.rooms.find(room => room.type === 'power')
    room.operatorIds = [id('承曦格雷伊')]
    assert.equal(evaluateOperators(room, config).skillBonus, bonus)
    const workspace = importMowerJson(JSON.stringify(payload))
    workspace.droneCapacity = capacity
    const report = simulateSchedule(compileRosterSchedule(workspace), { ...simulation, sampleHours: 32 })
    assert.ok(report.success && report.production?.success, JSON.stringify(report.diagnostics))
    const drones = report.production.drones
    assert.equal(drones.capacity, capacity)
    closeTo(drones.generated, 320, '32-hour stock uses the fixed source base rate of ten drones per hour')
    closeTo(drones.stock, capacity, 'storage saturation honors the configured capacity')
    closeTo(drones.initial + drones.generated - drones.overflow - drones.consumed, drones.stock, 'physical drone conservation')
  }
  const greyy = structuredClone(payload)
  greyy.plan1.room_1_3.plans = [slot('承曦格雷伊')]
  greyy.conf.workaholic += ',承曦格雷伊'
  for (const capacity of [0, 235, 260]) {
    const workspace = importMowerJson(JSON.stringify(greyy))
    workspace.droneCapacity = capacity
    const report = simulateSchedule(compileRosterSchedule(workspace), { ...simulation,
      production: { ...simulation.production, droneTarget: 'gold', droneRoomId: 'room_1_1' } })
    assert.ok(report.success && report.production?.success, JSON.stringify(report.diagnostics))
    const actual = calculateTheoreticalOutput(greyy, { ...short, droneCapacity: capacity, droneRoomId: 'room_1_1' })
    assert.equal(actual.droneCapacity, capacity)
    assert.equal(report.production.drones.capacity, capacity)
    assert.deepEqual(actual.metrics, mowerReportMetrics(report), 'public page capacity reaches both efficiency and physical storage')
  }
  for (const droneCapacity of [-1, .5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '250']) {
    assert.throws(() => calculateTheoreticalOutput(payload, { ...short, droneCapacity }), /无人机|容量/)
  }
  assert.equal(inspectTheoreticalPlan(payload).droneCapacity, 250)
  console.log('PASS: default250, Greyy235/260 boundaries, storage conservation, explicit capacity0, page/engine parity and invalid capacity guards')

  for (const [phase, efficiency] of [[0, 141], [2, 151]]) {
    const config = stageConfig('旅骨', phase)
    config.facilities.recycle = 3
    config.facilityOperatorIds.recycle = [id('旅骨')]
    assert.equal(evaluateRecycleEfficiency(config).efficiencyPercent, efficiency)
    config.zeroMoraleOperatorIds = [id('旅骨')]
    assert.equal(evaluateRecycleEfficiency(config).efficiencyPercent, 120)
    const recycling = structuredClone(payload)
    recycling.plan1.recycle = { name: '回收站', plans: [slot('旅骨')] }
    recycling.conf.workaholic += ',旅骨'
    const owned = [{ operator: '砾', elitePhase: 1, level: 1 }, { operator: '旅骨', elitePhase: phase, level: 1 }]
    const workspace = importMowerJson(JSON.stringify(recycling))
    const report = simulateSchedule(compileRosterSchedule(workspace), { ...simulation, operatorInventory: owned })
    assert.ok(report.success && report.production?.success, JSON.stringify(report.diagnostics))
    closeTo(report.rooms.find(room => room.roomId === 'recycle').averageEfficiencyPercent, efficiency, 'recycling dynamic skill stage')
    const actual = calculateTheoreticalOutput(recycling, { ...short, operatorInventory: owned })
    assert.deepEqual(actual.metrics, mowerReportMetrics(report), 'native recycling is accepted through the page adapter')
    const unchangedProduction = calculateTheoreticalOutput(payload, { ...short, operatorInventory: owned })
    assert.deepEqual(actual.metrics, unchangedProduction.metrics, 'recycling never invents LMD or scored manufacture products')
    assert.equal(actual.daily.physicalGold, unchangedProduction.daily.physicalGold)
    assert.equal(actual.daily.fragment, 0)
    assert.equal(actual.daily.orundum, 0)
    assert.ok(Number.isFinite(actual.daily.recycle) && actual.daily.recycle >= 0, 'material conversions are reported separately')
  }
  const unmannedRecycle = structuredClone(payload)
  unmannedRecycle.plan1.recycle = { name: '回收站', level: 1, plans: [] }
  const recycleReport = simulateSchedule(compileRosterSchedule(importMowerJson(JSON.stringify(unmannedRecycle))),
    { ...simulation, sampleHours: 52 })
  assert.ok(recycleReport.success && recycleReport.production?.success, JSON.stringify(recycleReport.diagnostics))
  assert.equal(recycleReport.production.recycle.sampleCompletedItems, 1, 'unmanned conversion really reaches a completion')
  assert.equal(recycleReport.production.recycle.collectedItems, 1, 'the native notification path really collects that material')
  const recycleActual = calculateTheoreticalOutput(unmannedRecycle, { ...short, sampleDays: 52 / 24 })
  closeTo(recycleActual.daily.recycle, 24 / 52, 'positive material conversions are daily-scaled separately')
  assert.deepEqual(recycleActual.recycle, recycleReport.production.recycle, 'page export retains every original recycle report field')
  const backupRecycle = structuredClone(payload)
  backupRecycle.backup_plans = [{ name: '副表回收站', trigger: 'True',
    plan: { recycle: { plans: [slot('旅骨')] } }, conf: { workaholic: '旅骨' } }]
  const originalBackupRecycle = JSON.stringify(backupRecycle)
  assert.equal(inspectTheoreticalPlan(backupRecycle).facilities.find(room => room.roomId === 'recycle').level, 3,
    'the imported main table uses the level-three right-side facility default before backup activation')
  const backupRecycleReport = simulateSchedule(compileRosterSchedule(importMowerJson(JSON.stringify(backupRecycle))),
    { ...simulation, sampleHours: 52 })
  assert.ok(backupRecycleReport.success && backupRecycleReport.production?.success, JSON.stringify(backupRecycleReport.diagnostics))
  assert.equal(backupRecycleReport.production.recycle.sampleCompletedItems, 1)
  assert.equal(backupRecycleReport.production.recycle.collectedItems, 1)
  const backupRecycleActual = calculateTheoreticalOutput(backupRecycle, { ...short, sampleDays: 52 / 24 })
  closeTo(backupRecycleActual.daily.recycle, 24 / 52, 'a backup-only recycling room contributes visible completed material')
  assert.deepEqual(backupRecycleActual.metrics, mowerReportMetrics(backupRecycleReport))
  assert.deepEqual(backupRecycleActual.recycle, backupRecycleReport.production.recycle)
  assert.equal(JSON.stringify(backupRecycle), originalBackupRecycle)
  console.log('PASS: native recycle page path, actual completion/collection, real owned Homebound phases, fatigue boundary, no invented currency/material valuation')

  const advanced = structuredClone(payload)
  advanced.advanced_settings = { resting_threshold: .4, fia_fool: false, free_room: true }
  const before = JSON.stringify(advanced)
  assert.deepEqual(inspectTheoreticalPlan(advanced).scheduleSettings,
    { restingThreshold: .4, fiammettaFool: false, freeRoom: true })
  const importedReport = simulateSchedule(compileRosterSchedule(importMowerJson(JSON.stringify(advanced))), simulation)
  assert.ok(importedReport.success && importedReport.production?.success, JSON.stringify(importedReport.diagnostics))
  const importedActual = calculateTheoreticalOutput(advanced, short)
  assert.deepEqual(importedActual.metrics, mowerReportMetrics(importedReport), 'imported advanced settings survive unspecified page options')
  assert.ok(importedActual.diagnostics.some(issue => issue.code === 'MOWER_SCHEDULING_MODEL' && issue.message.includes('alpha')))
  const explicitReport = simulateSchedule(compileRosterSchedule(importMowerJson(JSON.stringify(advanced)),
    { restingThreshold: 0, fiammettaFool: true, freeRoom: false }), simulation)
  const explicit = calculateTheoreticalOutput(advanced, { ...short, restingThreshold: 0, fiammettaFool: true, freeRoom: false })
  assert.deepEqual(explicit.metrics, mowerReportMetrics(explicitReport), 'explicit zero/false options take precedence without truthiness coercion')
  assert.equal(JSON.stringify(advanced), before, 'advanced imports remain detached')
  const shiftSettings = structuredClone(payload)
  shiftSettings.plan1.room_1_1.plans[0].replacement = ['芬']
  shiftSettings.plan1.dormitory_1 = { name: '', plans: [slot('杜林'), slot('芙蓉'), slot('Free'), slot('Free'), slot('Free')] }
  shiftSettings.conf = {}
  shiftSettings.advanced_settings = { resting_threshold: .95 }
  const importedShift = calculateTheoreticalOutput(shiftSettings, short)
  const overriddenShift = calculateTheoreticalOutput(shiftSettings, { ...short, restingThreshold: .1 })
  assert.notDeepEqual(importedShift.metrics, overriddenShift.metrics,
    'advanced resting threshold really changes the simulated replacement path rather than just metadata')
  for (const [actual, assumptions] of [[importedShift, {}], [overriddenShift, { restingThreshold: .1 }]]) {
    const report = simulateSchedule(compileRosterSchedule(importMowerJson(JSON.stringify(shiftSettings)), assumptions), simulation)
    assert.ok(report.success && report.production?.success, JSON.stringify(report.diagnostics))
    assert.deepEqual(actual.metrics, mowerReportMetrics(report), 'real shift behavior preserves imported/explicit option precedence')
  }
  const sourceProbeIndex = process.argv.indexOf('--source-probe')
  const fixedSource = sourceProbeIndex >= 0
    ? await import(pathToFileURL(resolve(process.argv[sourceProbeIndex + 1])).href) : undefined
  assert.equal(inspectTheoreticalPlan(payload).usesMasteryPlanCondition, false)
  const legacyMasteryOptions = [{}, { masteryPlanPresent: false }, { masteryPlanPresent: true },
    { mowerMasteryPlanPresent: true }, { masteryPlanPresent: 'obsolete', mowerMasteryPlanPresent: 1 }]
  for (const [trigger, active] of [
    ["op_data.facility_has_mastery_plan('train')", false],
    ["not op_data.facility_has_mastery_plan('train')", true],
  ]) {
    const mastery = structuredClone(payload)
    mastery.advanced_settings = { enable_mastery: true }
    mastery.backup_plans = [{ name: '训练空闲安排', trigger, plan: { train: { plans: [slot('芬')] } }, conf: {} }]
    const originalMastery = JSON.stringify(mastery)
    const inspection = inspectTheoreticalPlan(mastery)
    assert.equal(inspection.usesMasteryPlanCondition, true)
    assert.equal(Object.hasOwn(inspection, 'requiresMasteryPlanState'), false, 'inspection reports a condition without demanding an external state')
    const resultWithoutChoice = calculateTheoreticalOutput(mastery, short)
    assert.equal(resultWithoutChoice.observedHours, 8)
    assert.equal(resultWithoutChoice.masteryPlanPresent, false)
    assert.ok(resultWithoutChoice.diagnostics.some(issue => issue.code === 'MOWER_MASTERY_PLAN_ASSUMPTION' && /固定为无/.test(issue.message)),
      'the successful report explicitly identifies the no-training-plan assumption')
    for (const legacy of legacyMasteryOptions) {
      const pageOptions = { ...short, ...legacy }
      const optionsBefore = structuredClone(pageOptions)
      const report = simulateSchedule(compileRosterSchedule(importMowerJson(originalMastery), legacy),
        { ...simulation, recordSegments: true })
      assert.ok(report.success && report.production?.success, JSON.stringify(report.diagnostics))
      assert.ok(report.diagnostics.some(issue => issue.code === 'MOWER_MASTERY_PLAN_ASSUMPTION' && /固定为无/.test(issue.message)))
      const activated = report.events.some(event => event.type === 'backup-plan' && event.active && event.backupName === '训练空闲安排')
      assert.equal(activated, active, 'the original positive/negative condition actually controls backup activation')
      assert.equal(report.segments.some(segment => segment.occupants.train_0 === id('芬')), active,
        'the negative no-plan condition really staffs the training room while the positive condition does not')
      const actual = calculateTheoreticalOutput(mastery, pageOptions)
      assert.deepEqual(actual, resultWithoutChoice, 'omitted and obsolete JS states have identical complete public results')
      assert.deepEqual(actual.metrics, mowerReportMetrics(report), 'page output matches the fixed no-plan scheduler with old states ignored')
      if (fixedSource) {
        const sourceReport = fixedSource.runScheduleSimulationBridge(fixedSource.importMowerJson(originalMastery),
          { ...simulation, recordSegments: true }, legacy).report
        assert.ok(sourceReport?.success && sourceReport.production?.success, JSON.stringify(sourceReport?.diagnostics))
        assert.deepEqual(actual.metrics, fixedSource.mowerReportMetrics(sourceReport), 'independent fixed Git source reproduces every metric')
        assert.equal(sourceReport.segments.some(segment => segment.occupants.train_0 === id('芬')), active)
      }
      assert.deepEqual(pageOptions, optionsBefore)
    }
    const exported = JSON.parse(exportMowerJson(importMowerJson(originalMastery)))
    assert.equal(exported.backup_plans[0].trigger, trigger, 'the original condition is preserved rather than rewritten as a constant')
    assert.equal(exported.advanced_settings.enable_mastery, true, 'unrelated advanced enable_mastery is retained')
    assert.equal(JSON.stringify(mastery), originalMastery)
  }
  console.log('PASS: imported advanced settings, explicit zero/false override, default alpha, detached input, fixed no-plan training conditions and obsolete JS states ignored')

  const { parseMowerRosterText, summarizeMowerRoster } = await server.ssrLoadModule('/src/utils/mower/theoretical-output/rosterInput.js')
  const archived = structuredClone(payload)
  archived.backup_plans = [
    { name: '旧救援', trigger: 'op_data.rescue_needed()',
      plan: { recycle: { plans: { opaque: '未收录的归档干员' } } }, future_metadata: { preserve: [1, 2] } },
    { name: '有效副表', trigger: 'False', plan: { room_1_1: { plans: [slot('芬')] } } },
  ]
  const archivedBefore = JSON.stringify(archived)
  const parsedArchived = await parseMowerRosterText(archivedBefore)
  assert.deepEqual(parsedArchived, archived, 'retired opaque documents are retained, not rewritten or silently dropped')
  const preview = summarizeMowerRoster(parsedArchived)
  assert.equal(preview.backupCount, 2)
  assert.equal(preview.archivedBackupCount, 1)
  assert.equal(preview.activeBackupCount, 1)
  assert.equal(preview.operatorCount, 2, 'opaque archived staffing never counts as available active operators')
  assert.deepEqual(preview.plans[1].rooms, [])
  assert.equal(preview.plans[1].archived, true)
  assert.deepEqual(JSON.parse(preview.plans[1].archivedSource), archived.backup_plans[0],
    'every opaque archived field remains available in the inspectable raw JSON')
  assert.match(preview.plans[1].name, /已归档.*不参与模拟/)
  assert.equal(preview.plans[2].name, '有效副表')
  assert.equal(preview.plans[2].rooms[0].slots[0].agent, '芬', 'valid backups still receive their ordinary preview')
  assert.equal(calculateTheoreticalOutput(parsedArchived, short).observedHours, 8, 'archived opaque fields cannot block a valid complete sample')
  assert.equal(JSON.stringify(archived), archivedBefore)
  const quotedArchive = structuredClone(payload)
  quotedArchive.backup_plans = [{ name: '字符串字面量', trigger: "'op_data.rescue_needed()' == 'example'",
    plan: { room_1_1: { plans: [slot('芬')] } } }]
  const quotedPreview = summarizeMowerRoster(await parseMowerRosterText(JSON.stringify(quotedArchive)))
  assert.equal(quotedPreview.archivedBackupCount, 0, 'a quoted call mention is not retired as an executable rescue condition')
  assert.equal(quotedPreview.activeBackupCount, 1)
  console.log('PASS: retired opaque backup payload retained, archive clearly separated without missing valid previews or crashing calculation')

  const stableScenarios = [
    { label: 'ordinary gold', room: 'manufacture', product: 'gold', names: ['砾'] },
    { label: 'EXP combination', room: 'manufacture', product: 'exp', names: ['白雪', '食铁兽'] },
    { label: 'gold combination', room: 'manufacture', product: 'gold', names: ['斑点', '砾'] },
    { label: 'trade combination', room: 'trading', names: ['芬', '香草', '慕斯'] },
    { label: 'power', room: 'power', names: ['格雷伊'] },
    { label: 'Jaye trade', room: 'trading', names: ['孑', '银灰'] },
  ]
  const staticResult = (makeConfig, evaluate, scenario) => {
    const config = makeConfig()
    const room = config.rooms.find(room => room.type === scenario.room)
    if (scenario.product) room.product = scenario.product
    room.operatorIds = scenario.names.map(id)
    const result = evaluate(room, config)
    return { efficiencyPercent: result.efficiencyPercent, staffBonus: result.staffBonus,
      skillBonus: result.skillBonus, quality: result.quality, specialOrder: result.specialOrder,
      unquantifiedSkills: result.unquantifiedSkills }
  }
  const expected = [136, 167, 167, 183, 125, 170]
  for (const [index, scenario] of stableScenarios.entries()) {
    assert.equal(staticResult(createDefaultConfig, evaluateOperators, scenario).efficiencyPercent, expected[index], scenario.label)
  }
  const baselineIndex = process.argv.indexOf('--baseline')
  if (baselineIndex >= 0) {
    baselineServer = await createServer({ configFile: false, root: resolve(process.argv[baselineIndex + 1]),
      server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
    const oldDefaults = await baselineServer.ssrLoadModule(`${prefix}/domain/defaults.ts`)
    const oldRules = await baselineServer.ssrLoadModule(`${prefix}/engine/operatorRules.ts`)
    for (const scenario of stableScenarios) {
      assert.deepEqual(staticResult(createDefaultConfig, evaluateOperators, scenario),
        staticResult(oldDefaults.createDefaultConfig, oldRules.evaluateOperators, scenario), scenario.label)
    }
    console.log(`PASS: ${stableScenarios.length} independent old/new static scenarios retain all numeric/report fields`)
  } else console.log('PASS: six old static expected-efficiency boundaries')
} finally {
  await baselineServer?.close()
  await server.close()
}
