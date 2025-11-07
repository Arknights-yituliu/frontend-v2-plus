<script setup>
import { inject, ref, watch } from 'vue'
import { mowerPlanStore } from '../store/planStore.js'
import { renderOperatorLabel, renderOperatorTag } from '@/utils/mower/opSelect.js'
import HelpText from './HelpText.vue'

const show = inject('show_task')
const add_task = inject('add_task') ?? ref(false)

const { sub_plan, backup_plans, operators } = mowerPlanStore

const task_list = ref([])

function syncTasks() {
  if (sub_plan.value === 'main') {
    task_list.value = []
    return
  }
  const tasks = backup_plans.value[sub_plan.value]?.task ?? {}
  task_list.value = Object.entries(tasks).map(([room, ops]) => ({
    room,
    operators: Array.isArray(ops) ? [...ops] : []
  }))
}

watch(show, (visible) => {
  if (visible) {
    syncTasks()
  }
})

function createTask() {
  return {
    room: '',
    operators: []
  }
}

function applyTasks() {
  if (sub_plan.value === 'main') {
    show.value = false
    return
  }
  const task = {}
  for (const item of task_list.value) {
    if (!item.room) continue
    task[item.room] = item.operators.filter(Boolean)
  }
  backup_plans.value[sub_plan.value].task = task
  show.value = false
}
</script>

<template>
  <n-modal
    v-model:show="show"
    preset="card"
    title="任务"
    transform-origin="center"
    style="width: auto; max-width: 90vw"
  >
    <n-scrollbar style="max-height: 70vh">
      <n-dynamic-input v-model:value="task_list" :on-create="createTask">
        <template #create-button-default>添加任务</template>
        <template #default="{ value }">
          <div class="task_row">
            <n-input v-model:value="value.room" placeholder="设施代号，如 meeting" />
            <n-dynamic-tags v-model:value="value.operators" :max="5" size="large">
              <template #input="{ submit, deactivate }">
                <n-select
                  v-model:value="value.operators"
                  filterable
                  :options="operators"
                  :render-label="renderOperatorLabel"
                  :render-tag="renderOperatorTag"
                  :on-update:value="
                    (val) => {
                      submit(val)
                    }
                  "
                  :on-blur="deactivate"
                  :filter="(p, o) => o.label?.includes(p)"
                  style="min-width: 220px"
                />
              </template>
            </n-dynamic-tags>
          </div>
        </template>
      </n-dynamic-input>
      <n-card style="margin-top: 8px" content-style="padding: 8px" embedded>
        <n-code :code="JSON.stringify(task_list, null, 2)" language="json" word-wrap />
      </n-card>
    </n-scrollbar>
    <template #action>
      <div class="action-row">
        <n-button @click="show = false">取消</n-button>
        <n-button type="primary" @click="applyTasks">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped lang="scss">
.task_row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .n-input {
    width: 160px;
  }
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
