import { computed, ref } from 'vue'
import { deepcopy } from '@/utils/mower/deepcopy'
import { operatorTable } from '@/utils/gameData.js'

const facility_operator_limit = {
  central: 5,
  meeting: 2,
  factory: 1,
  contact: 1,
  train: 2
}

const left_side_facility = []

for (let i = 1; i <= 3; ++i) {
  for (let j = 1; j <= 3; ++j) {
    const facility_name = `room_${i}_${j}`
    const display_name = `B${i}0${j}`
    facility_operator_limit[facility_name] = 3
    left_side_facility.push({ label: display_name, value: facility_name })
  }
}

for (let i = 1; i <= 4; ++i) {
  facility_operator_limit[`dormitory_${i}`] = 5
}
for (let i = 1; i <= 3; ++i) {
  facility_operator_limit[`gaming_${i}`] = 1
}

const backup_conf_convert_list = [
  'exhaust_require',
  'rest_in_full',
  'resting_priority',
  'workaholic',
  'free_blacklist',
  'refresh_trading',
  'refresh_drained',
  'ope_resting_priority'
]

function list2str(data) {
  return data.join(',')
}

function str2list(data) {
  return data && data !== '' ? data.split(',') : []
}

function fill_empty(full_plan) {
  for (const i in facility_operator_limit) {
    let count = 0
    if (!full_plan[i]) {
      count = facility_operator_limit[i]
      full_plan[i] = { name: '', plans: [] }
    } else {
      let limit = facility_operator_limit[i]
      if (full_plan[i].name == '发电站') {
        limit = 1
      } else if (full_plan[i].name == '贸易站') {
        if (!['lmd', 'orundum'].includes(full_plan[i].product)) {
          full_plan[i].product = 'lmd'
        }
      } else if (full_plan[i].name == '制造站') {
        if (!['gold', 'exp3', 'orirock'].includes(full_plan[i].product)) {
          full_plan[i].product = 'gold'
        }
      }
      if (full_plan[i].plans.length < limit) {
        count = limit - full_plan[i].plans.length
      }
    }
    for (let j = 0; j < count; ++j) {
      full_plan[i].plans.push({ agent: '', group: '', replacement: [] })
    }
  }
  return full_plan
}

function remove_empty_agent(input = { name: '', plans: [] }) {
  const result = {
    name: input.name ?? '',
    plans: []
  }
  if (['贸易站', '制造站'].includes(input.name)) {
    result.product = input.product
  }
  for (const i of input.plans ?? []) {
    if (i.agent) {
      result.plans.push(i)
    }
  }
  return result
}

function strip_plan(plan) {
  const plan1 = {}

  for (const key in facility_operator_limit) {
    const facility = plan[key] ?? { name: '', plans: [] }
    if (key.startsWith('room') && facility.name) {
      plan1[key] = remove_empty_agent(facility)
    } else {
      let empty = true
      for (const entry of facility.plans ?? []) {
        if (entry.agent) {
          empty = false
          break
        }
      }
      if (!empty) {
        plan1[key] = remove_empty_agent(facility)
      }
    }
  }

  return plan1
}

const ling_xi = ref(1)
const exhaust_require = ref([])
const rest_in_full = ref([])
const ope_resting_priority = ref([])
const resting_priority = ref([])
const workaholic = ref([])
const refresh_trading = ref([])
const refresh_drained = ref([])
const free_blacklist = ref([])
const plan_title = ref('')
const plan_author = ref('')
const plan_note = ref('')

const plan = ref({})
const backup_plans = ref([])
const operators = ref([])

function hydratePlanData(payload) {
  const conf = payload?.conf ?? {}
  ling_xi.value = conf.ling_xi ?? 1
  exhaust_require.value = str2list(conf.exhaust_require ?? '')
  rest_in_full.value = str2list(conf.rest_in_full ?? '')
  ope_resting_priority.value = str2list(conf.ope_resting_priority ?? '')
  resting_priority.value = str2list(conf.resting_priority ?? '')
  workaholic.value = str2list(conf.workaholic ?? '')
  refresh_trading.value = str2list(conf.refresh_trading ?? '')
  refresh_drained.value = str2list(conf.refresh_drained ?? '')
  free_blacklist.value = str2list(conf.free_blacklist ?? '')

  const basePlan = payload?.plan1 ?? {}
  const gamings = ['gaming_1', 'gaming_2', 'gaming_3']
  for (const key of gamings) {
    if (!basePlan[key]) {
      basePlan[key] = { plans: [] }
    }
  }
  for (const key of gamings) {
    for (const b of payload?.backup_plans ?? []) {
      if (!b.conf[key]) {
        b.conf[key] = { plans: [] }
      }
    }
  }
  plan.value = fill_empty(basePlan)

  const backups = Array.isArray(payload?.backup_plans) ? payload.backup_plans : []
  backup_plans.value = backups
  for (const b of backup_plans.value) {
    for (const i of backup_conf_convert_list) {
      b.conf[i] = str2list(b.conf[i])
    }
    b.plan = fill_empty(b.plan)
  }
  plan_title.value = payload?.title ?? ''
  plan_author.value = payload?.author ?? ''
  plan_note.value = payload?.note ?? ''
}

async function load_plan() {
  hydratePlanData({
    plan1: {},
    conf: {}
  })
}

async function load_operators() {
  operators.value = Object.values(operatorTable).map((op) => ({
    value: op.name,
    label: op.name
  }))
}

function build_plan() {
  const result = {
    default: 'plan1',
    plan1: strip_plan(plan.value),
    conf: {
      ling_xi: ling_xi.value,
      exhaust_require: list2str(exhaust_require.value),
      rest_in_full: list2str(rest_in_full.value),
      ope_resting_priority: list2str(ope_resting_priority.value),
      resting_priority: list2str(resting_priority.value),
      workaholic: list2str(workaholic.value),
      refresh_trading: list2str(refresh_trading.value),
      refresh_drained: list2str(refresh_drained.value),
      free_blacklist: list2str(free_blacklist.value)
    },
    backup_plans: deepcopy(backup_plans.value)
  }

  for (const b of result.backup_plans) {
    for (const i of backup_conf_convert_list) {
      b.conf[i] = list2str(b.conf[i])
    }
    b.plan = strip_plan(b.plan)
  }

  // Ensure plan1 reflects latest reactive plan data
  const plan1 = result.plan1
  for (const key in facility_operator_limit) {
    const facility = plan.value[key]
    if (!facility) continue
    if (key.startsWith('room') && facility.name) {
      plan1[key] = remove_empty_agent(facility)
    } else {
      let empty = true
      for (const entry of facility.plans ?? []) {
        if (entry.agent) {
          empty = false
          break
        }
      }
      if (!empty) {
        plan1[key] = remove_empty_agent(facility)
      }
    }
  }

  result.title = plan_title.value
  result.author = plan_author.value
  result.note = plan_note.value
  return result
}

const groups = computed(() => {
  const result = []
  for (const facility in plan.value) {
    for (const p of plan.value[facility].plans) {
      if (p.group) {
        result.push(p.group)
      }
    }
  }
  return [...new Set(result)]
})

const sub_plan = ref('main')
const current_plan = computed(() => {
  if (sub_plan.value === 'main') {
    return plan.value
  }
  return backup_plans.value[sub_plan.value]?.plan ?? plan.value
})

export const mowerPlanStore = {
  ling_xi,
  exhaust_require,
  rest_in_full,
  ope_resting_priority,
  resting_priority,
  workaholic,
  refresh_trading,
  refresh_drained,
  free_blacklist,
  plan_title,
  plan_author,
  plan_note,
  plan,
  backup_plans,
  operators,
  facility_operator_limit,
  left_side_facility,
  load_plan,
  hydratePlanData,
  load_operators,
  build_plan,
  groups,
  sub_plan,
  current_plan,
  fill_empty
}
