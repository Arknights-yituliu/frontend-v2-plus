<script setup>
import { computed, inject, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { mowerPlanStore } from "../store/planStore.js";
import { renderOperatorOption, renderOperatorLabel } from "@/utils/mower/opSelect.js";
import { pinyin_match } from "@/utils/mower/common.js";
import hljs from "highlight.js/lib/core";
const show = inject("show_task");
const editLocked = inject("planEditLocked", ref(false));
const { sub_plan, backup_plans, operators, facility_operator_limit } = mowerPlanStore;
const message = useMessage();
const task_list = ref([]);
const roomOptions = [
  { label: "会客室", value: "meeting" },
  { label: "办公室", value: "contact" },
  { label: "加工站", value: "factory" },
  { label: "训练室", value: "train" },
  { label: "回收站", value: "recycle" },
  { label: "控制中枢", value: "central" },
  ...mowerPlanStore.left_side_facility,
  ...Array.from({ length: 4 }, (_, i) => ({ label: `宿舍${i + 1}`, value: `dormitory_${i + 1}` })),
];
const operatorOptions = computed(() => [{ label: "Current", value: "Current" }, { label: "Free", value: "Free" }, ...operators.value]);
watch(show, (visible) => {
  if (visible && sub_plan.value !== "main")
    task_list.value = Object.entries(backup_plans.value[sub_plan.value].task).map(([room, names]) => ({ room, operators: [...names] }));
});
function capacity(room) {
  return mowerPlanStore.current_plan.value[room]?.name === "发电站" ? 1 : (facility_operator_limit[room] ?? 0);
}
function newTask() {
  return { room: "", operators: [] };
}
function saveTasks() {
  if (editLocked.value || sub_plan.value === "main") return;
  const task = {};
  for (const item of task_list.value) {
    if (!item.room) continue;
    if (Object.hasOwn(task, item.room)) {
      message.error("同一设施只能配置一条任务");
      return;
    }
    if (item.operators.length > capacity(item.room)) {
      message.error("任务干员人数超过设施岗位数");
      return;
    }
    task[item.room] = Array.from({ length: capacity(item.room) }, (_, index) => item.operators[index] || "Current");
  }
  backup_plans.value[sub_plan.value].task = task;
  show.value = false;
}
</script>
<template>
  <n-modal v-model:show="show" preset="card" title="任务" :auto-focus="false" style="width: max-content; max-width: 90vw">
    <n-scrollbar style="max-height: 70vh">
      <n-dynamic-input v-model:value="task_list" :on-create="newTask" :disabled="editLocked">
        <template #create-button-default>添加任务</template>
        <template #default="{ value }">
          <div class="task-row">
            <n-select v-model:value="value.room" :disabled="editLocked" :options="roomOptions" placeholder="选择设施" class="room-select" />
            <n-dynamic-tags
              v-model:value="value.operators"
              :disabled="editLocked"
              :max="capacity(value.room) || 5"
              size="large"
              class="task-operators"
              style="justify-content: flex-end"
            >
              <template #input="{ submit, deactivate }">
                <n-select
                  :value="null"
                  :disabled="editLocked"
                  :options="operatorOptions"
                  filterable
                  :filter="(input, option) => pinyin_match(option.label, input)"
                  :render-label="renderOperatorLabel"
                  :render-option="renderOperatorOption"
                  placeholder="选择干员"
                  class="task-operator-select"
                  @update:value="submit"
                  @blur="deactivate"
                />
              </template>
            </n-dynamic-tags>
          </div>
        </template>
      </n-dynamic-input>
      <n-card embedded style="margin-top: 12px" content-style="padding: 8px">
        <n-code
          :hljs="hljs"
          :code="JSON.stringify(Object.fromEntries(task_list.filter((item) => item.room).map((item) => [item.room, item.operators])), null, 2)"
          language="json"
          word-wrap
        />
      </n-card>
    </n-scrollbar>
    <template #footer
      ><n-space justify="end"
        ><n-button @click="show = false">取消</n-button><n-button type="primary" :disabled="editLocked" @click="saveTasks">保存</n-button></n-space
      ></template
    >
  </n-modal>
</template>
<style scoped>
.task-row {
  display: flex;
  width: 100%;
  gap: 12px;
  align-items: center;
}
.room-select {
  width: 160px;
  min-width: 160px;
  flex: 0 0 160px;
}
.task-operators {
  flex: 1;
  min-width: 0;
  align-items: center;
}
.task-operator-select {
  width: 160px;
}
</style>
