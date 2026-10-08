import { computed, reactive, ref } from "vue";
import { deepcopy } from "@/utils/mower/deepcopy.js";
import { OPERATOR_CONF_FIELDS } from "@/utils/mower/plan_edit.js";
import { planBindings } from "@/utils/mower/plan_bindings.js";
import { factory_product_ids } from "@/utils/mower/base_products.js";
import { operatorTableV2 } from "@/utils/gameData.js";
import { hydrateAdvancedSettings, buildAdvancedSettings } from "./configStore.js";

const facility_operator_limit = { central: 5, meeting: 2, factory: 1, contact: 1, train: 2, recycle: 2 };
const left_side_facility = [];
for (let floor = 1; floor <= 3; floor++) {
  for (let room = 1; room <= 3; room++) {
    const value = `room_${floor}_${room}`;
    facility_operator_limit[value] = 3;
    left_side_facility.push({ label: `B${floor}0${room}`, value });
  }
}
for (let i = 1; i <= 4; i++) facility_operator_limit[`dormitory_${i}`] = 5;
for (let i = 1; i <= 3; i++) facility_operator_limit[`gaming_${i}`] = 1;
const defaultDormOrder = ["dormitory_1", "dormitory_2", "dormitory_3", "dormitory_4"];
const list = (value) => (Array.isArray(value) ? [...value] : typeof value === "string" ? value.split(",").filter(Boolean) : []);
const join = (value) => list(value).join(",");
export function normalizeDormOrder(value) {
  const order = [];
  for (const entry of list(value)) {
    const match = entry.match(/^(dormitory_[1-4])(?:_(low|\d+))?$/);
    const normalized = match && (match[2] === "low" ? `${match[1]}_low` : match[1]);
    if (normalized && !order.includes(normalized)) order.push(normalized);
  }
  return order.concat(defaultDormOrder.filter((room) => !order.includes(room)));
}
function fill_empty(table = {}) {
  for (const [room, capacity] of Object.entries(facility_operator_limit)) {
    const facility = (table[room] ??= { name: "", plans: [] });
    facility.plans ??= [];
    const limit = facility.name === "发电站" ? 1 : capacity;
    if (room === "recycle" && facility.plans.length > capacity) throw new Error("回收站最多配置两名干员");
    if (facility.name === "贸易站" && !["lmd", "orundum"].includes(facility.product)) facility.product = "lmd";
    if (facility.name === "制造站" && !factory_product_ids.includes(facility.product)) facility.product = "gold";
    for (const slot of facility.plans) {
      slot.agent ??= "";
      slot.group ??= "";
      slot.replacement ??= [];
      for (const binding of slot.group_bindings ?? []) {
        binding.group ??= "";
        binding.replacement ??= [];
      }
    }
    while (facility.plans.length < limit) facility.plans.push({ agent: "", group: "", replacement: [] });
  }
  return table;
}
function strip_plan(table) {
  const result = {};
  for (const room in facility_operator_limit) {
    const facility = table[room];
    const plans = facility.plans.filter((slot) => slot.agent);
    if ((room.startsWith("room_") && facility.name) || plans.length) {
      result[room] = { name: facility.name ?? "", plans: deepcopy(plans) };
      if (["制造站", "贸易站"].includes(facility.name)) result[room].product = facility.product;
    }
  }
  return result;
}
const fields = Object.fromEntries(OPERATOR_CONF_FIELDS.map((field) => [field, ref([])]));
const ling_xi = ref(1);
const mood_limits = ref(null);
const operator_mood_limits = ref({});
const dorm_order = ref([...defaultDormOrder]);
const plan_title = ref("");
const plan_author = ref("");
const plan_note = ref("");
const plan = ref(fill_empty({}));
const backup_plans = ref([]);
const operators = ref([]);
const sub_plan = ref("main");
const main_conf = reactive({ ...fields, ling_xi, mood_limits, operator_mood_limits, dorm_order });
let extraConf = {};

function hydratePlanData(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("请选择 Mower 排班 JSON 文件");
  const data = deepcopy(payload);
  const main = data.plan1 ?? data[data.default];
  if (!main || typeof main !== "object" || Array.isArray(main)) throw new Error("文件中缺少排班主表");
  const backups = Array.isArray(data.backup_plans) ? data.backup_plans : [];
  fill_empty(main);
  for (const backup of backups) {
    backup.plan = fill_empty(backup.plan ?? {});
    backup.conf ??= {};
    backup.conf.mood_limits ??= null;
    backup.conf.operator_mood_limits ??= {};
    backup.conf.removed_operators = Object.fromEntries(OPERATOR_CONF_FIELDS.map((field) => [field, list(backup.conf.removed_operators?.[field])]));
    for (const field of OPERATOR_CONF_FIELDS) backup.conf[field] = list(backup.conf[field]);
    const rawOrder = backup.conf.dorm_order;
    const normalized = rawOrder ? normalizeDormOrder(rawOrder) : [];
    backup.conf.dorm_order_override = backup.conf.dorm_order_override ?? (normalized.length > 0 && normalized.join(",") !== defaultDormOrder.join(","));
    backup.conf.dorm_order = backup.conf.dorm_order_override ? normalized : [];
    backup.trigger ??= { left: "", operator: "", right: "" };
    backup.task ??= {};
    if ((backup.task.recycle?.length ?? 0) > 2) throw new Error("回收站任务最多配置两名干员");
    delete backup.trigger_timing;
    delete backup.exit_trigger_timing;
  }
  const conf = data.conf ?? {};
  extraConf = deepcopy(conf);
  for (const field of OPERATOR_CONF_FIELDS) fields[field].value = list(conf[field]);
  ling_xi.value = conf.ling_xi ?? 1;
  mood_limits.value = conf.mood_limits ?? null;
  operator_mood_limits.value = conf.operator_mood_limits ?? {};
  dorm_order.value = normalizeDormOrder(conf.dorm_order || data.advanced_settings?.dorm_order);
  hydrateAdvancedSettings(data.advanced_settings);
  plan.value = main;
  backup_plans.value = backups;
  sub_plan.value = "main";
  plan_title.value = data.title ?? "";
  plan_author.value = data.author ?? "";
  plan_note.value = data.note ?? "";
}
async function load_plan() {
  hydratePlanData({ plan1: {}, conf: {} });
}
async function load_operators() {
  operators.value = [...new Set(Object.values(operatorTableV2).map((op) => (op.name.startsWith("阿米娅（") ? "阿米娅" : op.name)))].map((name) => ({ value: name, label: name }));
}
function mainConf() {
  return {
    ...Object.fromEntries(OPERATOR_CONF_FIELDS.map((field) => [field, fields[field].value])),
    ling_xi: ling_xi.value,
    mood_limits: mood_limits.value,
    operator_mood_limits: operator_mood_limits.value,
    dorm_order: dorm_order.value,
  };
}
function build_plan() {
  const conf = { ...extraConf, ...deepcopy(mainConf()) };
  for (const field of OPERATOR_CONF_FIELDS) conf[field] = join(conf[field]);
  conf.dorm_order = join(conf.dorm_order);
  const backups = deepcopy(backup_plans.value);
  for (const backup of backups) {
    for (const field of OPERATOR_CONF_FIELDS) backup.conf[field] = join(backup.conf[field]);
    backup.conf.dorm_order = join(backup.conf.dorm_order);
    backup.conf.removed_operators = Object.fromEntries(
      OPERATOR_CONF_FIELDS.map((field) => [field, join(backup.conf.removed_operators?.[field])]).filter(([, value]) => value)
    );
    delete backup.trigger_timing;
    delete backup.exit_trigger_timing;
    backup.plan = strip_plan(backup.plan);
  }
  return {
    default: "plan1",
    plan1: strip_plan(plan.value),
    conf,
    backup_plans: backups,
    advanced_settings: buildAdvancedSettings(),
    title: plan_title.value,
    author: plan_author.value,
    note: plan_note.value,
  };
}
function createBackup() {
  backup_plans.value.push({
    name: `plan${backup_plans.value.length}`,
    plan: fill_empty({}),
    trigger: { left: "", operator: "", right: "" },
    task: {},
    conf: {
      ...Object.fromEntries(OPERATOR_CONF_FIELDS.map((field) => [field, []])),
      ling_xi: ling_xi.value,
      mood_limits: null,
      operator_mood_limits: {},
      dorm_order: [],
      dorm_order_override: false,
      removed_operators: Object.fromEntries(OPERATOR_CONF_FIELDS.map((field) => [field, []])),
    },
  });
  sub_plan.value = backup_plans.value.length - 1;
}
const current_plan = computed(() => (sub_plan.value === "main" ? plan.value : (backup_plans.value[sub_plan.value]?.plan ?? plan.value)));
function import_main_facility(room) {
  if (sub_plan.value !== "main" && plan.value[room]) current_plan.value[room] = deepcopy(plan.value[room]);
}
const groups = computed(() => [
  ...new Set(
    Object.values(current_plan.value)
      .flatMap((room) => room.plans.flatMap((slot) => planBindings(slot).map((binding) => binding.group)))
      .filter(Boolean)
  ),
]);
const group_colors = computed(() => {
  const names = [
    ...new Set(
      [plan.value, ...backup_plans.value.map((backup) => backup.plan)].flatMap((table) =>
        Object.values(table).flatMap((room) => room.plans.flatMap((slot) => planBindings(slot).map((binding) => binding.group)))
      )
    ).values(),
  ].filter(Boolean);
  return Object.fromEntries([["", "transparent"], ...names.map((name, index) => [name, `hsl(${(360 * index) / names.length}, 80%, 45%)`])]);
});
export const mowerPlanStore = {
  ...fields,
  ling_xi,
  mood_limits,
  operator_mood_limits,
  dorm_order,
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
  mainConf,
  main_conf,
  createBackup,
  groups,
  group_colors,
  sub_plan,
  current_plan,
  fill_empty,
  import_main_facility,
};
