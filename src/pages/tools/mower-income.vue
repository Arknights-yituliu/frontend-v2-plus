<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { mowerProductImage } from '@/utils/mower/productAssets.js'
import { RouterLink } from 'vue-router'
import { useThemeVars } from 'naive-ui'
import TheoreticalOutputPanel from './mower-income/components/TheoreticalOutputPanel.vue'
import { useMowerSiteInventory } from '@/utils/mower/theoretical-output/siteInventory.js'
import { MOWER_INCOME_STORAGE_KEY, parseMowerRosterText, readMowerRosterFile, summarizeMowerRoster } from '@/utils/mower/theoretical-output/rosterInput.js'

const payload = shallowRef(null)
const themeVars = useThemeVars()
const fileName = ref('')
const importError = ref('')
const importStatus = ref('')
const importing = ref(false)
const pastedJson = ref('')
const fileInput = ref(null)
const summary = computed(() => payload.value ? summarizeMowerRoster(payload.value) : null)
const { entries, status, error, accountLabel, updatedAt, reload } = useMowerSiteInventory()
const inventoryLabels = { ready: '已读取一图流干员库', loading: '正在读取干员库…', empty: '当前账号尚无干员数据', unauthenticated: '登录后可读取一图流干员库', error: '干员库读取失败' }
let importId = 0

async function importPlan(read, label, persist = true) {
  const id = ++importId
  importing.value = true
  importError.value = ''
  importStatus.value = '正在读取排班…'
  await nextTick()
  try {
    const candidate = await read()
    if (id !== importId) return
    // Replace only after complete validation, preserving a valid plan on failed imports.
    payload.value = candidate
    fileName.value = label
    importStatus.value = `已导入 ${label}`
    if (persist) {
      try { localStorage.setItem(MOWER_INCOME_STORAGE_KEY, JSON.stringify({ payload: candidate, fileName: label })) } catch {
        importStatus.value += '；浏览器无法保存，离开页面前请保留原文件'
      }
    }
  } catch (cause) {
    if (id !== importId) return
    importError.value = cause instanceof Error ? cause.message : '导入失败，请检查排班文件'
    importStatus.value = ''
  } finally { if (id === importId) importing.value = false }
}

function importFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) importPlan(() => readMowerRosterFile(file), file.name)
}

onMounted(() => {
  try {
    const text = localStorage.getItem(MOWER_INCOME_STORAGE_KEY)
    if (!text) return
    if (text.length > 2 * 1024 * 1024) throw new Error('保存的排班过大，请重新导入')
    const saved = JSON.parse(text)
    importPlan(() => parseMowerRosterText(JSON.stringify(saved.payload)), saved.fileName || '上次使用的排班', false)
  } catch { importError.value = '上次保存的排班无法读取，请重新导入文件' }
})
onBeforeUnmount(() => { importId++ })
</script>

<template>
  <main class="mower-income" :style="{ '--income-error-color': themeVars.errorColor }" aria-labelledby="mower-income-title">
    <header class="income-heading">
      <div>
        <h1 id="mower-income-title">收益计算（Mower）</h1>
        <p>导入已有排班，按主替班、心情恢复与副表条件模拟每日理论产出。</p>
      </div>
      <div class="product-strip" aria-hidden="true">
        <img :src="mowerProductImage('exp3')" alt="" />
        <img :src="mowerProductImage('gold')" alt="" />
        <img :src="mowerProductImage('lmd')" alt="" />
      </div>
    </header>

    <section class="income-card" aria-labelledby="import-title">
      <div class="section-heading">
        <div><h2 id="import-title">导入 Mower 排班</h2></div>
        <button type="button" class="primary" :disabled="importing" @click="fileInput?.click()">{{ importing ? '正在导入…' : '导入排班文件' }}</button>
      </div>
      <input ref="fileInput" type="file" class="hidden-input" accept=".json,.jpg,.jpeg,.png" aria-label="Mower 排班文件" @change="importFile" />
      <p class="muted">支持 JSON，以及包含完整 14 或 16 个二维码的 JPEG / PNG。排班会保存在此浏览器中，便于前往“我的干员”后返回。</p>
      <details class="paste-details">
        <summary>粘贴排班 JSON</summary>
        <label for="income-roster-json" class="sr-only">完整 Mower 排班 JSON</label>
        <textarea id="income-roster-json" v-model="pastedJson" :disabled="importing" placeholder="粘贴完整的 Mower 排班 JSON" rows="6" maxlength="2097152" spellcheck="false"></textarea>
        <button type="button" :disabled="importing || !pastedJson.trim()" @click="importPlan(() => parseMowerRosterText(pastedJson), '粘贴的排班')">读取 JSON</button>
      </details>
      <p v-if="importError" class="error" role="alert">{{ importError }}<span v-if="payload">。当前有效排班已保留。</span></p>
      <p v-if="importStatus" class="muted" role="status">{{ importStatus }}</p>
      <div v-if="summary" class="plan-summary">
        <p class="summary-line"><strong>{{ fileName }}</strong><span>{{ summary.mainKey }} · {{ summary.backupCount }} 张副表 · {{ summary.operatorCount }} 位指定干员</span></p>
        <p class="muted">计算包括完整主表与全部副表；副表按导入的触发条件切换，所有替补位与绑组均保留。</p>
        <details v-for="(plan, index) in summary.plans" :key="index" class="plan-preview" :open="index === 0">
          <summary>{{ plan.name }} · {{ plan.rooms.length }} 个设施</summary>
          <p v-if="plan.trigger" class="muted condition">触发条件：{{ plan.trigger }}</p>
          <p v-if="plan.task" class="muted condition">任务：{{ plan.task }}</p>
          <div class="room-grid">
            <article v-for="room in plan.rooms" :key="room.roomId" class="room-preview">
              <h3>{{ room.label }} <span>{{ room.name }}<template v-if="room.product"> · {{ room.product }}</template></span></h3>
              <ol v-if="room.slots.length" class="slot-list">
                <li v-for="slot in room.slots" :key="slot.index">
                  <span class="slot-agent">{{ slot.agent }}</span><span v-if="slot.group" class="group">组：{{ slot.group }}</span>
                  <span class="replacement">替补：{{ slot.replacements.length ? slot.replacements.join(' → ') : '无' }}</span>
                </li>
              </ol>
              <p v-else class="muted">无指定干员</p>
            </article>
          </div>
        </details>
      </div>
      <p v-else-if="!importing" class="empty-state">先导入排班文件，再确认干员库与设施等级。</p>
    </section>

    <section class="income-card inventory-card" aria-labelledby="inventory-title">
      <div class="section-heading">
        <div><h2 id="inventory-title">一图流干员库</h2></div>
        <div class="actions">
          <RouterLink class="income-button" :to="{ name: 'OperatorSurvey', query: { openImport: '1' } }">导入干员库</RouterLink>
          <button type="button" :disabled="status === 'loading'" @click="reload">刷新干员库</button>
        </div>
      </div>
      <p role="status"><span class="source-dot" :class="{ ready: status === 'ready' }" aria-hidden="true"></span>{{ inventoryLabels[status] || status }}<template v-if="status === 'ready'"> · {{ entries?.length || 0 }} 位干员</template></p>
      <p v-if="accountLabel" class="muted">数据账号：{{ accountLabel }}<template v-if="updatedAt"> · 更新时间：{{ updatedAt }}</template></p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p class="muted">“导入干员库”将打开“调查与统计 → 我的干员”。此页直接读取该功能保存的一图流干员数据，并使用实际精英化与等级选择已解锁的基建技能。</p>
    </section>

    <TheoreticalOutputPanel :payload="payload" :operator-inventory="entries" :inventory-status="status" :inventory-error="error" />
  </main>
</template>

<style scoped>
.mower-income {
  --income-muted-color: rgba(var(--v-theme-on-surface), .7);
  max-width: 1200px;
  margin: 24px auto;
  padding: 0 12px;
  color: var(--c-text-color);
  font-family: inherit;
  color-scheme: light;
}
.theme-dark .mower-income { color-scheme: dark; }
.income-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}
.income-heading h1 { margin: 0 0 8px; font-size: 24px; font-weight: 500; }
.income-heading p { margin: 0; color: var(--income-muted-color); font-size: 14px; line-height: 1.7; }
.product-strip { display: flex; flex-shrink: 0; gap: 4px; }
.product-strip img { width: 40px; height: 40px; object-fit: contain; }
.income-card {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--c-card-background-color);
}
.section-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.section-heading h2 { margin: 0; font-size: 18px; font-weight: 500; }
.mower-income button, .income-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 14px;
  min-height: 36px;
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  background: var(--c-card-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}
.mower-income button:hover:not(:disabled), .income-button:hover {
  color: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), .06);
}
.mower-income button.primary {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.mower-income button.primary:hover:not(:disabled) { filter: brightness(1.1); }
.mower-income button:disabled { opacity: .5; cursor: not-allowed; }
.mower-income button:focus-visible, .income-button:focus-visible,
.mower-income summary:focus-visible, .mower-income textarea:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.muted { color: var(--income-muted-color); line-height: 1.7; font-size: 13px; }
.error { color: var(--income-error-color); line-height: 1.7; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.paste-details { margin: 14px 0; }
.mower-income summary { cursor: pointer; padding: 8px 0; font-size: 14px; font-weight: 500; }
.mower-income textarea {
  width: 100%;
  box-sizing: border-box;
  margin: 12px 0;
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font-family: monospace;
  font-size: 13px;
}
.hidden-input { display: none; }
.summary-line { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 12px 0; border-top: 1px solid var(--el-border-color-light); margin-bottom: 0; }
.summary-line span { font-size: 13px; color: var(--income-muted-color); }
.summary-line strong { font-weight: 500; }
.plan-summary, .inventory-card, .condition, .error { overflow-wrap: anywhere; }
.plan-preview { border-top: 1px solid var(--el-border-color-light); margin-top: 12px; }
.room-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 10px 0; }
.room-preview { min-width: 0; border: 1px solid var(--el-border-color-light); padding: 12px; border-radius: 3px; background: var(--c-page-background-color-secondary); overflow-wrap: anywhere; }
.room-preview h3 { margin: 0 0 10px; font-size: 14px; font-weight: 500; color: var(--c-text-color); }
.room-preview h3 span { display: block; font-size: 12px; font-weight: 400; color: var(--income-muted-color); margin-top: 5px; }
.slot-list { padding-left: 20px; margin: 0; }
.slot-list li { font-size: 13px; padding: 5px 0; }
.slot-agent { font-weight: 500; }
.group { margin-left: 8px; color: var(--income-muted-color); font-size: 12px; }
.replacement { display: block; color: var(--income-muted-color); font-size: 12px; line-height: 1.7; }
.empty-state { padding: 20px 12px; text-align: center; color: var(--income-muted-color); font-size: 14px; border: 1px dashed var(--el-border-color); border-radius: 3px; }
.source-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--income-muted-color); margin-right: 8px; }
.source-dot.ready { background: rgb(var(--v-theme-primary)); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 900px) {
  .room-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mower-income { margin: 16px auto; }
  .income-card { padding: 16px; }
}
@media (max-width: 560px) {
  .room-grid { grid-template-columns: 1fr; }
  .income-heading { flex-wrap: wrap; gap: 12px; }
  .income-heading h1 { font-size: 22px; }
  .income-card { padding: 14px; margin-bottom: 16px; }
  .mower-income { padding: 0 12px; }
  .section-heading { align-items: flex-start; }
  .actions { width: 100%; }
  .actions > * { flex: 1; }
  .summary-line { align-items: flex-start; flex-direction: column; }
}
</style>
