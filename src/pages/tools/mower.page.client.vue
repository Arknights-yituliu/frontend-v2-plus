<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeMount, inject } from "vue";
import { zhCN, dateZhCN, darkTheme } from "naive-ui";
import operators_json from "@/static/json/operators.json"

const ling_xi = ref("1");
const max_resting_count = ref([]);
const exhaust_require = ref([]);
const rest_in_full = ref([]);
const resting_priority = ref([]);
const workaholic = ref([]);

const plan = ref({});

const operators = ref([]);

const left_side_facility = [];

const facility_operator_limit = { central: 5, meeting: 2, factory: 1, contact: 1 };
for (let i = 1; i <= 3; ++i) {
  for (let j = 1; j <= 3; ++j) {
    const facility_name = `room_${i}_${j}`;
    facility_operator_limit[facility_name] = 3;
    left_side_facility.push({ label: facility_name, value: facility_name });
  }
}
for (let i = 0; i <= 4; ++i) {
  facility_operator_limit[`dormitory_${i}`] = 5;
}

async function load_plan() {
  // const response = await axios.get("http://localhost:5000/plan");
  // ling_xi.value = response.data.conf.ling_xi.toString();
  // max_resting_count.value = response.data.conf.max_resting_count.toString();
  // exhaust_require.value = response.data.conf.exhaust_require == "" ? [] : response.data.conf.exhaust_require.split(",");
  // rest_in_full.value = response.data.conf.rest_in_full == "" ? [] : response.data.conf.rest_in_full.split(",");
  // resting_priority.value = response.data.conf.resting_priority == "" ? [] : response.data.conf.resting_priority.split(",");
  // workaholic.value = response.data.conf.workaholic == "" ? [] : response.data.conf.workaholic.split(",");

  const full_plan = {};
  for (const i in facility_operator_limit) {
    let count = 0;
    if (!full_plan[i]) {
      count = facility_operator_limit[i];
      full_plan[i] = { name: "", plans: [] };
    } else {
      let limit = facility_operator_limit[i];
      if (full_plan[i].name == "发电站") {
        limit = 1;
      }
      if (full_plan[i].plans.length < limit) {
        count = limit - full_plan[i].plans.length;
      }
    }
    for (let j = 0; j < count; ++j) {
      full_plan[i].plans.push({ agent: "", group: "", replacement: [] });
    }
  }
  plan.value = full_plan;
}

async function load_operators() {
  const option_list = [];
  for (const i of operators_json) {
    option_list.push({
      value: i,
      label: i,
    });
  }
  operators.value = option_list;
}

function remove_empty_agent(input) {
  const result = {
    name: input.name,
    plans: [],
  };
  for (const i of input.plans) {
    if (i.agent) {
      result.plans.push(i);
    }
  }
  return result;
}

function build_plan() {
  const result = {
    default: "plan1",
    plan1: {},
    conf: {
      ling_xi: parseInt(ling_xi.value),
      max_resting_count: parseInt(max_resting_count.value),
      exhaust_require: exhaust_require.value.join(","),
      rest_in_full: rest_in_full.value.join(","),
      resting_priority: resting_priority.value.join(","),
      workaholic: workaholic.value.join(","),
    },
  };

  const plan1 = result.plan1;

  for (const i in facility_operator_limit) {
    if (i.startsWith("room") && plan.value[i].name) {
      plan1[i] = remove_empty_agent(plan.value[i]);
    } else {
      let empty = true;
      for (const j of plan.value[i].plans) {
        if (j.agent) {
          empty = false;
          break;
        }
      }
      if (!empty) {
        plan1[i] = remove_empty_agent(plan.value[i]);
      }
    }
  }

  return result;
}

const groups = computed(() => {
  const result = [];
  for (const facility in plan.value) {
    for (const p of plan.value[facility].plans) {
      if (p.group) {
        result.push(p.group);
      }
    }
  }
  return [...new Set(result)];
});

const facility_types = [
  { label: "贸易站", value: "贸易站" },
  { label: "制造站", value: "制造站" },
  { label: "发电站", value: "发电站" },
];

const facility = ref("");

const button_type = {
  贸易站: "info",
  制造站: "warning",
  发电站: "primary",
};

const operator_limit = computed(() => {
  if (facility.value.startsWith("room") && plan.value[facility.value].name == "发电站") {
    return 1;
  }
  return facility_operator_limit[facility.value] || 0;
});

function clear() {
  plan.value[facility.value].name = "";
  nextTick(() => {
    const plans = [];
    for (let i = 0; i < operator_limit.value; ++i) {
      plans.push({
        agent: "",
        group: "",
        replacement: [],
      });
    }
    plan.value[facility.value].plans = plans;
  });
}

watch(
  () => {
    if (facility.value.startsWith("room")) {
      return plan.value[facility.value].name;
    }
    return "";
  },
  (new_name, old_name) => {
    if (new_name == "发电站") {
      const plans = plan.value[facility.value].plans;
      while (plans.length > operator_limit.value) {
        plans.pop();
      }
    } else if (old_name == "发电站") {
      const plans = plan.value[facility.value].plans;
      while (plans.length < operator_limit.value) {
        plans.push({ agent: "", group: "", replacement: [] });
      }
    }
  }
);

const operators_with_free = computed(() => {
  return [
    { value: "", label: "（无）" },
    { value: "Free", label: "Free" },
  ].concat(operators.value);
});

const right_side_facility_name = computed(() => {
  if (facility.value.startsWith("dormitory")) {
    return "宿舍";
  } else if (facility.value == "central") {
    return "控制中枢";
  } else if (facility.value == "contact") {
    return "办公室";
  } else if (facility.value == "meeting") {
    return "会客室";
  } else if (facility.value == "factory") {
    return "加工站";
  } else {
    return "未知";
  }
});

const facility_empty = computed(() => {
  let empty = true;
  for (const i of plan.value[facility.value].plans) {
    if (i.agent) {
      empty = false;
      break;
    }
  }
  return empty;
});

const color_map = computed(() => {
  const count = groups.value.length;
  const result = {};
  for (let i = 0; i < count; ++i) {
    result[groups.value[i]] = `5px solid hsl(${(360 / count) * i}, 80%, 45%)`;
  }
  result[""] = "none";
  return result;
});

function drag_facility(room, event) {
  event.dataTransfer.setData("text/plain", room);
  event.dataTransfer.dropEffect = "move";
}

function drop_facility(target, event) {
  const source = event.dataTransfer.getData("text/plain");
  const source_plan = plan.value[source];
  plan.value[source] = plan.value[target];
  plan.value[target] = source_plan;
  event.preventDefault();
}

onBeforeMount(() => {
  load_plan();
});

const use_dark_theme = inject("theme");

onMounted(() => {
  load_operators();
  use_dark_theme.value = document.querySelector(":root").classList.contains("dark");
});
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme="use_dark_theme ? darkTheme : null">
    <!-- <n-config-provider :locale="zhCN" :date-locale="dateZhCN"> -->
    <n-dialog-provider>
      <div class="plan-container">
        <n-space justify="center">
          <table>
            <tr>
              <td></td>
              <td></td>
              <td></td>
              <td>
                <n-button :secondary="facility != 'central'" class="facility-5" @click="facility = 'central'">
                  <div>
                    <div class="facility-name">控制中枢</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.central.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td>
                <n-button :secondary="facility != 'meeting'" class="facility-2" @click="facility = 'meeting'">
                  <div>
                    <div class="facility-name">会客室</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.meeting.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
            </tr>
            <tr>
              <td v-for="r in ['room_1_1', 'room_1_2', 'room_1_3']" :key="r">
                <n-button
                  :dashed="facility != r"
                  :ghost="facility == r"
                  :type="facility == r ? 'primary' : ''"
                  v-if="!plan[r].name"
                  @click="facility = r"
                  class="facility-3"
                >
                  待建造
                </n-button>
                <n-button
                  :secondary="facility != r"
                  :ghost="facility == r"
                  :type="button_type[plan[r].name]"
                  v-else
                  class="facility-3"
                  @click="facility = r"
                  tag="div"
                  draggable="true"
                  @dragstart="drag_facility(r, $event)"
                  @dragover.prevent
                  @dragenter.prevent
                  @drop="drop_facility(r, $event)"
                >
                  <div>
                    <div class="facility-name">
                      {{ plan[r].name }}
                    </div>
                    <div class="avatars">
                      <img
                        v-for="i in plan[r].plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                        draggable="false"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td>
                <n-button :secondary="facility != 'dormitory_1'" class="facility-5" @click="facility = 'dormitory_1'">
                  <div>
                    <div class="facility-name">宿舍1</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.dormitory_1.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td>
                <n-button :secondary="facility != 'factory'" class="facility-2" @click="facility = 'factory'">
                  <div>
                    <div class="facility-name">加工站</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.factory.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
            </tr>
            <tr>
              <td v-for="r in ['room_2_1', 'room_2_2', 'room_2_3']" :key="r">
                <n-button
                  :dashed="facility != r"
                  :ghost="facility == r"
                  :type="facility == r ? 'primary' : ''"
                  v-if="!plan[r].name"
                  @click="facility = r"
                  class="facility-3"
                >
                  待建造
                </n-button>
                <n-button
                  :secondary="facility != r"
                  :ghost="facility == r"
                  :type="button_type[plan[r].name]"
                  v-else
                  class="facility-3"
                  @click="facility = r"
                  tag="div"
                  draggable="true"
                  @dragstart="drag_facility(r, $event)"
                  @dragover.prevent
                  @dragenter.prevent
                  @drop="drop_facility(r, $event)"
                >
                  <div>
                    <div class="facility-name">
                      {{ plan[r].name }}
                    </div>
                    <div class="avatars">
                      <img
                        v-for="i in plan[r].plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                        draggable="false"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td>
                <n-button :secondary="facility != 'dormitory_2'" class="facility-5" @click="facility = 'dormitory_2'">
                  <div>
                    <div class="facility-name">宿舍2</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.dormitory_2.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td>
                <n-button :secondary="facility != 'contact'" class="facility-2" @click="facility = 'contact'">
                  <div>
                    <div class="facility-name">办公室</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.contact.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
            </tr>
            <tr>
              <td v-for="r in ['room_3_1', 'room_3_2', 'room_3_3']" :key="r">
                <n-button
                  :dashed="facility != r"
                  :ghost="facility == r"
                  :type="facility == r ? 'primary' : ''"
                  v-if="!plan[r].name"
                  @click="facility = r"
                  class="facility-3"
                >
                  待建造
                </n-button>
                <n-button
                  :secondary="facility != r"
                  :ghost="facility == r"
                  :type="button_type[plan[r].name]"
                  v-else
                  class="facility-3"
                  @click="facility = r"
                  tag="div"
                  draggable="true"
                  @dragstart="drag_facility(r, $event)"
                  @dragover.prevent
                  @dragenter.prevent
                  @drop="drop_facility(r, $event)"
                >
                  <div>
                    <div class="facility-name">
                      {{ plan[r].name }}
                    </div>
                    <div class="avatars">
                      <img
                        v-for="i in plan[r].plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                        draggable="false"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td>
                <n-button :secondary="facility != 'dormitory_3'" class="facility-5" @click="facility = 'dormitory_3'">
                  <div>
                    <div class="facility-name">宿舍3</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.dormitory_3.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td>
                <n-button disabled class="facility-2">训练室</n-button>
              </td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
              <td>
                <n-button :secondary="facility != 'dormitory_4'" class="facility-5" @click="facility = 'dormitory_4'">
                  <div>
                    <div class="facility-name">宿舍4</div>
                    <div class="avatars">
                      <img
                        v-for="i in plan.dormitory_4.plans"
                        :src="`/avatar/${i.agent}.png`"
                        width="45"
                        height="45"
                        :style="{ 'border-bottom': color_map[i.group] }"
                      />
                    </div>
                  </div>
                </n-button>
              </td>
              <td></td>
            </tr>
          </table>
        </n-space>
        <n-space justify="center" v-if="facility">
          <table>
            <tr>
              <td>设施类别：</td>
              <td>
                <n-select v-model:value="plan[facility].name" :options="facility_types" class="type-select" v-if="facility.startsWith('room')" />
                <span v-else class="type-select">{{ right_side_facility_name }}</span>
              </td>
              <td>
                <n-button ghost type="error" @click="clear" :disabled="facility_empty"> 清空此设施内干员 </n-button>
              </td>
            </tr>
          </table>
        </n-space>
        <n-space justify="center">
          <table>
            <tr v-for="i in operator_limit" :key="i">
              <td class="select-label">干员：</td>
              <td class="table-space">
                <n-select filterable tag :options="operators_with_free" class="operator-select" v-model:value="plan[facility].plans[i - 1].agent" />
              </td>
              <td class="select-label">组：</td>
              <td class="table-space group">
                <n-input v-model:value="plan[facility].plans[i - 1].group"></n-input>
              </td>
              <td class="select-label">替换：</td>
              <td>
                <n-select
                  :disabled="!plan[facility].plans[i - 1].agent"
                  multiple
                  filterable
                  tag
                  :options="operators_with_free"
                  class="replacement-select"
                  v-model:value="plan[facility].plans[i - 1].replacement"
                />
              </td>
            </tr>
          </table>
        </n-space>
      </div>
    </n-dialog-provider>
  </n-config-provider>
</template>

<style scoped>
.w90 {
  width: 90px;
}

.select-label {
  width: 44px;
}

.type-select {
  width: 100px;
  margin-right: 8px;
}

.operator-select {
  width: 150px;
}

.replacement-select {
  min-width: 400px;
}

.plan-container {
  background: var(--riic-mower-bg);
  padding: 20px 0;
  min-width: 980px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group {
  width: 120px;
}

.facility-2 {
  width: 124px;
  height: 76px;
  margin: 2px 3px;
}

.facility-3 {
  width: 175px;
  height: 76px;
  margin: 2px 3px;
}

.facility-5 {
  width: 277px;
  height: 76px;
  margin: 2px 3px;
}

.avatars {
  display: flex;
  gap: 6px;
}

.facility-name {
  margin-bottom: 4px;
}

.avatars > img {
  box-sizing: content-box;
  border-radius: 2px;
  background: var(--riic-mower-avatar-bg);
}
</style>
