<script setup>
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { createTheoreticalOutputJob } from '@/utils/mower/theoretical-output/client.js'
import { inspectTheoreticalPlan } from '@/utils/mower/theoretical-output/calculate.ts'

const props = defineProps({
  payload: { type: Object, default: null },
  operatorInventory: { type: Array, default: null },
  inventoryStatus: { type: String, default: 'unauthenticated' },
  inventoryError: { type: String, default: '' },
})
const inspection = shallowRef(null)
const inspectionError = ref('')
const levels = ref({})
const levelsConfirmed = ref(false)
const warmupDays = ref(3)
const sampleDays = ref(7)
const droneRoomId = ref('none')
const droneTargets = computed(() => (inspection.value?.droneTargets || []).filter(target =>
  target.value === 'none' || levels.value[target.value] > 0))
watch(droneTargets, targets => {
  if (!targets.some(target => target.value === droneRoomId.value)) droneRoomId.value = 'none'
}, { flush: 'sync' })
const restingPercent = ref(65)
const jayeElite0 = ref(false)
const fiammettaFool = ref(true)
const freeRoom = ref(false)
const inventoryMode = ref('')
const inventoryReady = computed(() => props.inventoryStatus === 'ready' && Array.isArray(props.operatorInventory) && props.operatorInventory.length > 0)
const usingInventory = computed(() => inventoryMode.value === 'owned')
const running = ref(false)
const progress = shallowRef(null)
const result = shallowRef(null)
const resultBasis = shallowRef(null)
const error = ref('')
const status = ref('')
let job = null
let jobId = 0

function cancel(message = '已取消计算，可重新开始。') {
  jobId++
  job?.cancel()
  job = null
  const wasRunning = running.value
  running.value = false
  progress.value = null
  if (wasRunning) status.value = message
}
function invalidate() {
  const hadResult = !!result.value
  cancel('排班、干员库或设置已变更，计算已停止。')
  result.value = null
  resultBasis.value = null
  error.value = ''
  if (hadResult) status.value = '设置已变更，请重新计算。'
}
watch(() => props.payload, payload => {
  invalidate()
  inspection.value = null
  inspectionError.value = ''
  levelsConfirmed.value = false
  if (!payload) return
  try {
    const info = inspectTheoreticalPlan(payload)
    inspection.value = info
    levels.value = Object.fromEntries(info.facilities.map(room => [room.roomId, room.level]))
    droneRoomId.value = 'none'
  } catch (cause) {
    inspectionError.value = cause instanceof Error ? cause.message : '无法读取当前排班'
  }
}, { immediate: true, deep: true, flush: 'sync' })
watch([() => props.inventoryStatus, () => props.operatorInventory, () => props.inventoryError], () => {
  invalidate()
  if (inventoryReady.value && inventoryMode.value === '') inventoryMode.value = 'owned'
}, { immediate: true, deep: true, flush: 'sync' })
watch([warmupDays, sampleDays, droneRoomId, restingPercent, jayeElite0, fiammettaFool, freeRoom, inventoryMode, levelsConfirmed, levels], invalidate, { deep: true, flush: 'sync' })
onBeforeUnmount(() => cancel())

const canRun = computed(() => !!props.payload && !!inspection.value && levelsConfirmed.value &&
  (inventoryMode.value === 'max' || (usingInventory.value && inventoryReady.value)) && !running.value)
const progressPercent = computed(() => {
  const value = progress.value
  return Math.round(Math.max(0, Math.min(1, value?.totalHours > 0 ? value.elapsedHours / value.totalHours : 0)) * 100)
})
const progressLabel = computed(() => progress.value?.phase === 'warmup' ? '预热' : '采样')
const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—'
const metrics = computed(() => result.value?.metrics)
const outputWarning = computed(() => result.value?.diagnostics?.find(item => item.code === 'SHIFT_DEFERRAL_UNCONFIRMED')?.message)
const displayResources = computed(() => metrics.value ? [
  { label: '作战记录经验', value: metrics.value.exp, unit: 'EXP / 日', image: 'exp3' },
  { label: '制造赤金', value: metrics.value.goldValue / 500, unit: '件 / 日', image: 'gold' },
  { label: '贸易订单面值', value: metrics.value.orderLmd, unit: '龙门币 / 日', image: 'lmd' },
  ...(result.value.daily?.fragment > 0 || inspection.value?.facilities.some(room => room.product === 'fragment')
    ? [{ label: '源石碎片', value: result.value.daily?.fragment, unit: '件 / 日', image: 'orirock' }] : []),
  ...(result.value.daily?.orundum > 0 || inspection.value?.facilities.some(room => room.product === 'orundum')
    ? [{ label: '合成玉', value: result.value.daily?.orundum, unit: '合成玉 / 日', image: 'orundum' }] : []),
] : [])

async function calculate() {
  if (!canRun.value) return
  if (!Number.isInteger(warmupDays.value) || warmupDays.value < 0 || warmupDays.value > 14 ||
      !Number.isInteger(sampleDays.value) || sampleDays.value < 1 || sampleDays.value > 28) {
    error.value = '预热天数须为 0–14 的整数，采样天数须为 1–28 的整数'
    return
  }
  if (!Number.isFinite(restingPercent.value) || restingPercent.value < 0 || restingPercent.value > 100) {
    error.value = '休息阈值须为 0–100%'
    return
  }
  invalidate()
  const id = ++jobId
  running.value = true
  status.value = '正在模拟主替班与产出…'
  const config = {
    seed: -1,
    warmupDays: warmupDays.value, sampleDays: sampleDays.value,
    droneRoomId: droneRoomId.value,
    restingThreshold: restingPercent.value / 100,
    jayeElite0: usingInventory.value ? false : jayeElite0.value,
    fiammettaFool: fiammettaFool.value, freeRoom: freeRoom.value,
    facilityLevels: { ...levels.value },
    ...(usingInventory.value ? { operatorInventory: JSON.parse(JSON.stringify(props.operatorInventory)) } : {}),
  }
  try {
    const activeJob = createTheoreticalOutputJob(props.payload, config, value => {
      if (id === jobId) progress.value = value
    })
    job = activeJob
    const report = await activeJob.promise
    if (id !== jobId) return
    result.value = report
    resultBasis.value = {
      inventory: usingInventory.value ? `一图流干员库（${props.operatorInventory.length} 位）` : '全干员最高练度假设',
      warmupDays: config.warmupDays, sampleDays: config.sampleDays,
      inventoryMode: inventoryMode.value,
      facilityLevels: config.facilityLevels,
      restingThreshold: config.restingThreshold,
      jayeElite0: config.jayeElite0,
      fiammettaFool: config.fiammettaFool,
      freeRoom: config.freeRoom,
      droneRoomId: config.droneRoomId,
      runOrderMode: 'ideal', warmupModel: 'hourly', requestedSeed: config.seed, seed: report.seed,
      calculatedAt: new Date().toLocaleString('zh-CN'),
      drone: inspection.value.droneTargets.find(item => item.value === config.droneRoomId)?.label || '不使用无人机',
    }
    status.value = '计算完成'
  } catch (cause) {
    if (id !== jobId) return
    if (cause?.name === 'AbortError') status.value = '已取消计算'
    else { error.value = cause instanceof Error ? cause.message : '计算失败'; status.value = '' }
  } finally {
    if (id === jobId) { job = null; running.value = false; progress.value = null }
  }
}
function downloadResult() {
  if (!result.value) return
  const url = URL.createObjectURL(new Blob([JSON.stringify({ basis: resultBasis.value, ...result.value }, null, 2)], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'Mower-理论产出.json'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="income-calculation" aria-labelledby="calculation-title">
    <div class="section-heading"><h2 id="calculation-title">计算理论产出</h2><span class="calculation-kind">理想跑单 · 82 口径</span></div>
    <p class="note">使用 R.I.I.C-Calculator 的原始排班模拟算法；预热后统计采样期完成产物，换班、休息与副表切换参与计算。</p>
    <p v-if="inspectionError" role="alert" class="error">{{ inspectionError }}</p>
    <fieldset :disabled="running" class="calculation-settings">
      <legend class="sr-only">理论产出设置</legend>
      <fieldset class="inventory-mode">
        <legend>干员练度与可用名单</legend>
        <label><input v-model="inventoryMode" type="radio" value="owned" :disabled="!inventoryReady" />使用一图流干员库的实际练度</label>
        <label><input v-model="inventoryMode" type="radio" value="max" />不使用干员库，按全干员最高练度计算</label>
        <p v-if="usingInventory && !inventoryReady" class="error">{{ inventoryError || '干员库尚不可用，请登录、导入或刷新后重试' }}。不会自动切换为最高练度。</p>
        <p v-else-if="!inventoryReady && inventoryMode !== 'max'" class="note">请先读取干员库；也可明确选择最高练度假设再计算。</p>
        <p v-if="inventoryMode === 'max'" class="note">此模式假设全体干员可用，技能按最高练度解锁；Free 闲人选取也使用该假设。</p>
      </fieldset>

      <details v-if="inspection" class="facility-levels" open>
        <summary>确认设施等级</summary>
        <p class="note">Mower JSON 不包含设施等级。已建造设施的等级由布局与槽位推断；缺失房间、没有实际宿管的宿舍按未建造处理。请按实际基建调整后确认，宿舍按该等级满氛围计算。已配置岗位的房间需先修改排班，才能设为未建造。</p>
        <div class="level-grid">
          <label v-for="room in inspection.facilities" :key="room.roomId"><span>{{ room.label }}<small v-if="room.assumed">（未导入）</small></span>
            <select v-model.number="levels[room.roomId]" :disabled="!room.editable" @change="levelsConfirmed = false">
              <option :value="0" :disabled="!room.canBeUnbuilt">未建造</option>
              <option v-for="level in room.maxLevel" :key="level" :value="level">{{ level }} 级</option>
            </select>
          </label>
        </div>
        <label class="check-line"><input v-model="levelsConfirmed" type="checkbox" />我已核对以上设施等级</label>
      </details>

      <div class="controls-grid">
        <label>预热天数<input v-model.number="warmupDays" type="number" min="0" max="14" step="1" /></label>
        <label>采样天数<input v-model.number="sampleDays" type="number" min="1" max="28" step="1" /></label>
        <label>休息阈值（%）<input v-model.number="restingPercent" type="number" min="0" max="100" step="1" /></label>
        <label>无人机目标<select v-model="droneRoomId"><option v-for="item in droneTargets" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
      </div>
      <div class="switches">
        <label><input v-model="jayeElite0" type="checkbox" :disabled="usingInventory" />孑按精英 0 计算</label>
        <label><input v-model="fiammettaFool" type="checkbox" />菲亚梅塔防呆</label>
        <label><input v-model="freeRoom" type="checkbox" />满心情闲人离宿</label>
      </div>
      <p v-if="usingInventory" class="note">孑的精英化由干员库决定。库内缺失的指定干员或无法识别的练度会显示错误。</p>
    </fieldset>

    <div class="calculation-actions">
      <button type="button" class="primary" :disabled="!canRun" @click="calculate">{{ running ? '正在计算…' : '计算理论产出' }}</button>
      <button v-if="running" type="button" @click="cancel()">取消计算</button>
      <button v-if="result" type="button" @click="downloadResult">导出测算明细</button>
      <span v-if="running" role="status">{{ status }}<template v-if="progress"> {{ progressLabel }} · {{ progressPercent }}%</template></span>
      <span v-else-if="status" class="note" role="status">{{ status }}</span>
    </div>
    <p v-if="!payload" class="note">请先在上方导入排班。</p>
    <p v-else-if="!levelsConfirmed" class="note">计算前请核对并确认设施等级。</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>

    <section v-if="metrics" class="output-report" aria-labelledby="output-report-title">
      <h3 id="output-report-title">采样期日均理论产出</h3>
      <p class="note">{{ resultBasis.inventory }} · 预热 {{ resultBasis.warmupDays }} 天 · 实际采样 {{ number(result.observedHours / 24) }} 天 · {{ resultBasis.drone }}</p>
      <p class="note">随机种子：-1（每次随机）；本次实际种子：{{ result.seed }}</p>
      <p v-if="outputWarning" class="output-warning" role="alert">{{ outputWarning }}</p>
      <div class="resource-grid">
        <article v-for="resource in displayResources" :key="resource.label" class="resource-stat">
          <img :src="`/mower-income/product/${resource.image}.png`" alt="" />
          <div><span>{{ resource.label }}</span><strong>{{ number(resource.value) }}</strong><small>{{ resource.unit }}</small></div>
        </article>
      </div>
      <div class="score-stat"><span>每日综合产出（82 口径）</span><strong>{{ number(metrics.mower82) }}</strong></div>
      <p class="formula">{{ number(metrics.exp) }} EXP + 0.8 ×（{{ number(metrics.goldValue) }} 赤金价值 + {{ number(metrics.virtualGoldValue) }} 虚拟赤金价值）+ 0.2 × {{ number(metrics.orderLmd) }} 订单面值</p>
      <p class="note">赤金按每件 500 龙门币折算。虚拟赤金为订单溢价的计分等价物（{{ number(metrics.virtualGoldCount) }} 件 / 日），不会增加实际赤金库存；82 综合值用于比较排班，不是到账龙门币或净利润。</p>
      <div class="order-stat"><span>采样期龙门币订单数：{{ number(metrics.orderCount) }} 单</span><span>平均订单面值：{{ metrics.meanOrderValue === null ? '无订单' : `${number(metrics.meanOrderValue)} 龙门币 / 单` }}</span></div>
      <details v-if="metrics.orderDistribution && Object.keys(metrics.orderDistribution).length"><summary>采样期订单分布</summary>
        <div class="table-scroll"><table><thead><tr><th>订单类型</th><th>完成数量（单）</th><th>总面值（龙门币）</th></tr></thead><tbody><tr v-for="(distribution, kind) in metrics.orderDistribution" :key="kind"><td>{{ kind }}</td><td>{{ number(distribution.count) }}</td><td>{{ number(distribution.lmd) }}</td></tr></tbody></table></div>
      </details>
      <details v-if="result.diagnostics?.length" class="diagnostics" open><summary>模拟诊断与假设（{{ result.diagnostics.length }}）</summary><ul><li v-for="(item, index) in result.diagnostics" :key="index">{{ item.message }}</li></ul></details>
      <p class="note provenance">干员技能数据版本：{{ result.gameDataVersion }} · 计算时间：{{ resultBasis.calculatedAt }}</p>
    </section>

    <details class="assumptions"><summary>理论产出的计算条件</summary>
      <p class="note">统计采样期的完成产物，预热不计分。材料库存按无限处理，不扣赤金交易成本；设施容量、无人机与 Mower 自动收取会影响模拟。初始心情为 24，宿舍按所选等级满氛围，线索交流关闭。</p>
      <p class="note">采用理想跑单：替补位中的跑单干员参与对应订单效果；普通换班、心情恢复、绑组、主替班顺序和副表触发均由原算法处理。暖机按整小时增长，随机种子为 -1，每次计算随机生成并记录实际种子。休息阈值默认 65%，急救阈值 75%，菲亚梅塔阈值 90%；不开启加工、专精、维护停服等外部任务。</p>
      <p class="note">结果是所选条件下的理论测算。首次导入请检查设施等级、实际练度和诊断；更改排班、干员库或任何设置后，旧结果会失效。</p>
    </details>
  </section>
</template>

<style scoped>
.income-calculation {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--c-card-background-color);
  color: var(--c-text-color);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.section-heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.calculation-kind {
  color: var(--income-muted-color);
  font-size: 13px;
}

.note {
  color: var(--income-muted-color);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.error {
  color: var(--income-error-color);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.output-warning {
  padding: 12px 16px;
  border-left: 3px solid var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.calculation-settings {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.inventory-mode {
  min-width: 0;
  margin: 18px 0;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.inventory-mode legend {
  padding: 0 8px;
  font-size: 14px;
}

.inventory-mode > label {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 9px 0;
  font-size: 14px;
}

.income-calculation input,
.income-calculation select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
}

.income-calculation input[type="checkbox"],
.income-calculation input[type="radio"] {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  padding: 0;
  accent-color: rgb(var(--v-theme-primary));
}

.income-calculation input:focus-visible,
.income-calculation select:focus-visible,
.income-calculation button:focus-visible,
.income-calculation summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.income-calculation input:disabled,
.income-calculation select:disabled,
.income-calculation button:disabled {
  border-color: var(--el-border-color-light);
  background: var(--c-page-background-color-secondary);
  color: var(--income-muted-color);
  cursor: not-allowed;
  opacity: 0.65;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 20px 0;
}

.controls-grid > label {
  display: grid;
  min-width: 0;
  gap: 7px;
  font-size: 13px;
}

.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.switches label,
.check-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.income-calculation summary {
  padding: 9px 0;
  font-weight: 600;
  cursor: pointer;
}

.facility-levels {
  min-width: 0;
  padding: 10px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0;
}

.level-grid label {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.level-grid select {
  flex-shrink: 0;
  width: 80px;
}

.check-line {
  padding: 10px 0;
}

.calculation-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 22px 0 8px;
}

.income-calculation button {
  min-height: 38px;
  padding: 8px 16px;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.income-calculation button.primary:not(:disabled) {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.income-calculation button:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.08);
}

.income-calculation button.primary:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.9);
}

.output-report {
  min-width: 0;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-light);
}

.output-report h3 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.resource-stat {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
}

.resource-stat img {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.resource-stat div {
  min-width: 0;
}

.resource-stat span,
.resource-stat small {
  display: block;
  color: var(--income-muted-color);
  font-size: 12px;
}

.resource-stat strong {
  display: block;
  margin: 4px 0;
  font-size: 23px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.score-stat {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.05);
}

.score-stat span {
  font-size: 14px;
}

.score-stat strong {
  color: rgb(var(--v-theme-primary));
  font-size: 28px;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.formula {
  font-size: 13px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.order-stat {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin: 20px 0;
  font-size: 13px;
}

.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.table-scroll table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table-scroll th,
.table-scroll td {
  padding: 10px;
  border-bottom: 1px solid var(--el-border-color-light);
  text-align: right;
}

.table-scroll th:first-child,
.table-scroll td:first-child {
  text-align: left;
}

.diagnostics {
  margin-top: 16px;
}

.diagnostics ul {
  padding-left: 22px;
  color: var(--c-text-color);
  font-size: 13px;
}

.diagnostics li {
  margin: 7px 0;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.provenance {
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-light);
  font-size: 12px;
}

.assumptions {
  margin-top: 18px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-light);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 900px) {
  .income-calculation {
    padding: 16px;
  }

  .controls-grid,
  .level-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resource-grid {
    grid-template-columns: 1fr;
  }

  .resource-stat div {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 2px 24px;
  }

  .resource-stat strong {
    grid-column: 2;
    grid-row: 1 / 3;
  }

  .resource-stat small {
    grid-column: 2;
    text-align: right;
  }
}

@media (max-width: 560px) {
  .income-calculation {
    padding: 14px;
  }

  .level-grid {
    grid-template-columns: 1fr;
  }

  .controls-grid {
    gap: 12px;
  }

  .score-stat {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .switches {
    flex-direction: column;
    gap: 12px;
  }

  .inventory-mode,
  .facility-levels {
    padding: 10px;
  }

  .calculation-actions button.primary {
    flex: 1;
  }

  .resource-stat div {
    display: block;
  }

  .resource-stat small {
    text-align: left;
  }

  .resource-stat strong {
    font-size: 21px;
  }
}
</style>
