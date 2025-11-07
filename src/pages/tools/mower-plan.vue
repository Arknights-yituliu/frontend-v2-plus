<script setup>
import { computed, onMounted, onUnmounted, provide, ref, watchEffect } from 'vue'
import axios from 'axios'
import { createDiscreteApi } from 'naive-ui'
import hljs from 'highlight.js/lib/core'
import jsonLang from 'highlight.js/lib/languages/json'
import buildingApi from '@/api/building.js'
import { saveAs } from 'file-saver'
import PlanEditor from './mower-plan/components/PlanEditor.vue'
import HelpText from './mower-plan/components/HelpText.vue'
import TriggerDialog from './mower-plan/components/TriggerDialog.vue'
import TaskDialog from './mower-plan/components/TaskDialog.vue'
import RenameDialog from './mower-plan/components/RenameDialog.vue'
import OperatorMultiSelect from './mower-plan/components/OperatorMultiSelect.vue'
import { mowerPlanStore } from './mower-plan/store/planStore.js'
import { swap } from '@/utils/mower/common.js'
import { MOWER_HTTP_URL } from '@/utils/mower/http.js'
import { useTheme } from 'vuetify'

const {
  ling_xi,
  resting_priority,
  exhaust_require,
  rest_in_full,
  workaholic,
  backup_plans,
  sub_plan,
  refresh_trading,
  refresh_drained,
  ope_resting_priority,
  load_plan,
  hydratePlanData,
  load_operators,
  build_plan,
  free_blacklist,
  plan_title,
  plan_author,
  plan_note
} = mowerPlanStore

const plan_editor = ref(null)
const localJsonInput = ref(null)
const cloudScheduleId = ref('')
const scheduleIdInput = ref('')
const facility = ref('')
provide('facility', facility)

hljs.registerLanguage('json', jsonLang)
const { message, code } = createDiscreteApi(['message', 'code'], { hljs })

const theme = computed(() => {
  const vuetifyTheme = useTheme()
  return vuetifyTheme.global.current.value === 'dark' ? 'dark' : 'light'
})

const mobile = ref(false)
provide('mobile', mobile)
provide('mowerTheme', theme)

const show_trigger_editor = ref(false)
const show_name_editor = ref(false)
const show_task = ref(false)
const add_task = ref(false)

provide('show_trigger_editor', show_trigger_editor)
provide('show_name_editor', show_name_editor)
provide('show_task', show_task)
provide('add_task', add_task)

const sub_plan_options = computed(() => {
  const result = [
    {
      label: '主表',
      value: 'main'
    }
  ]
  for (let i = 0; i < backup_plans.value.length; i++) {
    result.push({
      label: backup_plans.value[i].name,
      value: i
    })
  }
  return result
})

function create_sub_plan() {
  backup_plans.value.push({
    conf: {
      exhaust_require: [],
      free_blacklist: [],
      ling_xi: ling_xi.value,
      rest_in_full: [],
      resting_priority: [],
      workaholic: [],
      refresh_trading: [],
      refresh_drained: [],
      ope_resting_priority: []
    },
    plan: mowerPlanStore.fill_empty({}),
    trigger: {
      left: '',
      operator: '',
      right: ''
    },
    trigger_timing: 'AFTER_PLANNING',
    task: {},
    name: `plan${backup_plans.value.length}`
  })
  sub_plan.value = backup_plans.value.length - 1
}

function delete_sub_plan() {
  backup_plans.value.splice(sub_plan.value, 1)
  sub_plan.value = 'main'
}

const current_conf = ref({
  ling_xi: ling_xi.value,
  rest_in_full: rest_in_full.value,
  resting_priority: resting_priority.value,
  workaholic: workaholic.value,
  exhaust_require: exhaust_require.value,
  refresh_trading: refresh_trading.value,
  free_blacklist: free_blacklist.value,
  refresh_drained: refresh_drained.value,
  ope_resting_priority: ope_resting_priority.value
})

watchEffect(() => {
  if (sub_plan.value === 'main') {
    current_conf.value = {
      ling_xi: ling_xi.value,
      rest_in_full: rest_in_full.value,
      resting_priority: resting_priority.value,
      workaholic: workaholic.value,
      exhaust_require: exhaust_require.value,
      refresh_trading: refresh_trading.value,
      free_blacklist: free_blacklist.value,
      refresh_drained: refresh_drained.value,
      ope_resting_priority: ope_resting_priority.value
    }
  } else {
    current_conf.value = backup_plans.value[sub_plan.value].conf
  }
})

watchEffect(() => {
  if (sub_plan.value === 'main') {
    ling_xi.value = current_conf.value.ling_xi
    rest_in_full.value = current_conf.value.rest_in_full
    exhaust_require.value = current_conf.value.exhaust_require
    resting_priority.value = current_conf.value.resting_priority
    workaholic.value = current_conf.value.workaholic
    refresh_trading.value = current_conf.value.refresh_trading
    free_blacklist.value = current_conf.value.free_blacklist
    refresh_drained.value = current_conf.value.refresh_drained
    ope_resting_priority.value = current_conf.value.ope_resting_priority
  } else if (backup_plans.value[sub_plan.value]) {
    backup_plans.value[sub_plan.value].conf = current_conf.value
  }
})

const token = ref('')
provide('token', token)

function movePlanBackward() {
  if (sub_plan.value !== 'main' && sub_plan.value > 0) {
    const currentIndex = sub_plan.value
    swap(currentIndex, currentIndex - 1, backup_plans.value)
    sub_plan.value = currentIndex - 1
  }
}

function movePlanForward() {
  if (sub_plan.value !== 'main' && sub_plan.value < backup_plans.value.length - 1) {
    const currentIndex = sub_plan.value
    swap(currentIndex, currentIndex + 1, backup_plans.value)
    sub_plan.value = currentIndex + 1
  }
}

function export_json() {
  try {
    const payload = build_plan()
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plan.json')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    message.success('已导出当前排班')
  } catch (error) {
    console.error('Export JSON failed', error)
    message.error('导出失败，请重试')
  }
}

async function savePlan() {
  const payload = build_plan()
  await axios.post(`${MOWER_HTTP_URL}/plan`, payload)
  message.success('排班已保存')
}

function triggerLocalJsonImport() {
  localJsonInput.value?.click()
}

async function handleLocalJsonImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    hydratePlanData(data)
    sub_plan.value = 'main'
    message.success('已载入 JSON 排班')
  } catch (error) {
    console.error('Local JSON import failed', error)
    message.error('JSON 解析失败，请检查文件内容')
  } finally {
    event.target.value = ''
  }
}

async function saveAndDownloadPlanFile() {
  try {
    const payload = build_plan()
    const { data } = await buildingApi.saveSchedule(payload, cloudScheduleId.value || 1111)
    cloudScheduleId.value = data?.scheduleId ?? cloudScheduleId.value
    saveAs(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `${cloudScheduleId.value || 'plan'}.json`
    )
    message.success(`已下载排班文件，ID：${cloudScheduleId.value || '未知'}`)
  } catch (error) {
    console.error('saveAndDownloadPlanFile failed', error)
    message.error('下载排班文件失败')
  }
}

function extractSchedulePayload(payload) {
  if (!payload) return null
  if (payload.schedule) return payload.schedule
  if (payload.data) {
    if (payload.data.schedule) return payload.data.schedule
    if (payload.data.plan1 || payload.data.conf) return payload.data
  }
  if (payload.plan1 || payload.conf) return payload
  return null
}

async function importScheduleById() {
  if (!scheduleIdInput.value) {
    message.warning('请输入排班ID')
    return
  }
  try {
    const { data } = await buildingApi.retrieveSchedule(scheduleIdInput.value)
    const schedulePayload = extractSchedulePayload(data)
    if (!schedulePayload) {
      message.error('未找到排班数据')
      return
    }
    hydratePlanData(schedulePayload)
    sub_plan.value = 'main'
    message.success(`已载入排班 ID：${scheduleIdInput.value}`)
  } catch (error) {
    console.error('importScheduleById failed', error)
    message.error('ID 导入失败，请确认编号')
  }
}

function handleResize() {
  mobile.value = window.innerWidth < 800
}

function setupToken() {
  const params = new URLSearchParams(document.location.search)
  token.value = params.get('token') ?? ''
  if (token.value) {
    axios.defaults.headers.common['token'] = token.value
  }
}

onMounted(async () => {
  setupToken()
  handleResize()
  window.addEventListener('resize', handleResize)
  await load_operators()
  await load_plan()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <n-message-provider>
    <trigger-dialog />
    <task-dialog />
    <rename-dialog />
  <div class="plan-controls w-980 mx-auto mt-12 mw-980">
    <div class="title-wrapper">
      <label>标题：</label>
      <n-input v-model:value="plan_title" size="small" class="title-input" placeholder="请输入标题" />
    </div>
    <div class="note-wrapper">
      <label>笔记：</label>
      <n-input
        v-model:value="plan_note"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        class="note-input"
        placeholder="可填写备注"
      />
    </div>
    <div class="author-row">
      <label>作者：</label>
      <n-input v-model:value="plan_author" size="small" class="author-input" placeholder="请输入作者" />
    </div>
    <div class="id-row">
      <div class="id-field">
        <label>排班ID：</label>
        <n-input v-model:value="scheduleIdInput" size="small" class="id-input" placeholder="输入排班ID">
          <template #suffix>
            <n-button text type="primary" size="small" @click="importScheduleById">根据ID导入排班</n-button>
          </template>
        </n-input>
      </div>
      <div class="actions-field">
        <n-button type="primary" ghost class="action-btn" @click="triggerLocalJsonImport">
          导入排班文件
        </n-button>
        <n-button type="primary" ghost class="action-btn" @click="saveAndDownloadPlanFile">
          下载排班文件
        </n-button>
      </div>
    </div>
    <div class="control-row">
      <n-button class="control-btn" :disabled="sub_plan == 'main' || sub_plan == 0" @click="movePlanBackward">
        上移
      </n-button>
      <n-button
        class="control-btn"
        :disabled="sub_plan == 'main' || sub_plan == backup_plans.length - 1"
        @click="movePlanForward"
      >
        下移
      </n-button>
      <n-select v-model:value="sub_plan" :style="{ width: '150px' }" :options="sub_plan_options" />
      <n-button class="control-btn" :disabled="sub_plan == 'main'" @click="show_name_editor = true">
        重命名
      </n-button>
      <n-button class="control-btn" @click="create_sub_plan">新建副表</n-button>
      <n-button class="control-btn" :disabled="sub_plan == 'main'" @click="show_trigger_editor = true">
        编辑触发条件
      </n-button>
      <n-button class="control-btn" :disabled="sub_plan == 'main'" @click="show_task = true">编辑任务</n-button>
      <n-button class="control-btn" :disabled="sub_plan == 'main'" @click="delete_sub_plan">删除此副表</n-button>
    </div>
    <input
      ref="localJsonInput"
      type="file"
      accept="application/json"
      class="sr-only"
      @change="handleLocalJsonImport"
    />
  </div>
    <plan-editor ref="plan_editor" class="w-980 mx-auto mw-980 px-12" />
    <n-form
      class="w-980 mx-auto mb-12 px-12 mw-980"
      :label-placement="mobile ? 'top' : 'left'"
      :show-feedback="false"
      label-width="160"
      label-align="left"
  >
    <n-form-item>
      <template #label>
        <span>令夕模式</span>
        <help-text>
          <div>令夕上班时起作用</div>
          <div>启动Mower前需要手动对齐心情</div>
          <div>感知：夕心情-令心情=12</div>
          <div>烟火：令心情-夕心情=12</div>
          <div>均衡：夕令心情一样</div>
        </help-text>
      </template>
      <n-radio-group v-model:value="current_conf.ling_xi">
        <n-space>
          <n-radio :value="1">感知信息</n-radio>
          <n-radio :value="2">人间烟火</n-radio>
          <n-radio :value="3">均衡模式</n-radio>
        </n-space>
      </n-radio-group>
    </n-form-item>
    <n-form-item>
      <template #label><span>需要回满心情的干员</span><help-text>请查阅文档</help-text></template>
      <operator-multi-select v-model="current_conf.rest_in_full"></operator-multi-select>
    </n-form-item>
    <n-form-item>
      <template #label>
        <span>需要用尽心情的干员</span><help-text>仅推荐写入具有暖机技能的干员</help-text>
      </template>
      <operator-multi-select v-model="current_conf.exhaust_require"></operator-multi-select>
    </n-form-item>
    <n-form-item>
      <template #label>
        <span>0心情工作的干员</span><help-text>心情涣散状态仍能触发技能的干员</help-text>
      </template>
      <operator-multi-select v-model="current_conf.workaholic"></operator-multi-select>
    </n-form-item>
    <n-form-item>
      <template #label><span>宿舍低优先级干员</span><help-text>请查阅文档</help-text></template>
      <operator-multi-select v-model="current_conf.resting_priority"></operator-multi-select>
    </n-form-item>
    <n-form-item>
      <template #label>
        <span>跑单时间刷新干员</span>
        <help-text>
          <p>贸易站外影响贸易效率的干员</p>
          <p>
            默认情况下仅在贸易站内干员换班后刷新订单时间。若有贸易站外干员影响效率且不在一组，则需写入此选项中。
          </p>
        </help-text>
      </template>
      <operator-multi-select
        v-model="current_conf.refresh_trading"
        placeholder="填入在贸易站外影响贸易效率的干员"
      />
    </n-form-item>
    <n-form-item>
      <template #label>
        <span>用尽刷新</span>
        <help-text>
          <p>会影响用尽干员心情消耗速率的干员</p>
          <p>在填入该选项的干员上下班后，会重新读取用尽干员的下班时间</p>
        </help-text>
      </template>
      <operator-multi-select v-model="current_conf.refresh_drained"></operator-multi-select>
    </n-form-item>
    <n-form-item>
      <template #label>
        <span>宿舍黑名单</span>
        <help-text>不希望进行填充宿舍的干员</help-text>
      </template>
      <operator-multi-select v-model="current_conf.free_blacklist"></operator-multi-select>
    </n-form-item>
    <n-form-item>
      <template #label>
        <span>干员休息优先级</span>
        <help-text>
          <p>会按照优先级放入宿舍的时候重新排序</p>
          <p>宿舍重新排序触发此设置优先级高，非高效组谨慎填写</p>
        </help-text>
      </template>
      <operator-multi-select v-model="current_conf.ope_resting_priority"></operator-multi-select>
    </n-form-item>
    </n-form>
  </n-message-provider>
</template>

<style scoped lang="scss">
.w-980 {
  width: 100%;
  max-width: 980px;
}

.mx-auto {
  margin: 0 auto;
}

.mt-12 {
  margin-top: 12px;
}

.mb-12 {
  margin-bottom: 12px;
}

.px-12 {
  padding: 0 12px;
}

.mw-980 {
  min-width: 980px;
}

.plan-controls {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  grid-template-rows: auto auto auto auto;
  gap: 12px 20px;
  padding: 0 12px;
}

.title-wrapper,
.author-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-wrapper {
  grid-column: 1 / 2;
}

.note-wrapper {
  grid-column: 2 / 3;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-input {
  width: 100%;
}

.author-row {
  grid-column: 1 / 2;
}

.id-row {
  grid-column: 1 / 3;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.id-field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 260px;
}

.actions-field {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.control-row {
  grid-column: 1 / 3;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.title-input,
.author-input,
.id-input {
  flex: 1;
}

.action-btn {
  min-width: 140px;
}

.control-btn {
  min-width: 96px;
}

label {
  font-size: 14px;
  color: var(--n-text-color);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
