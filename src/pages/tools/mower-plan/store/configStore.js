import { ref } from "vue";
import { deepcopy } from "@/utils/mower/deepcopy.js";

const defaults = {
  product_switching: {
    enable: false,
    max_drones_per_switch: 0,
    grandet_mode: true,
    use_drones_when_leaving_orirock: true,
    direct_when_drones_insufficient: false,
    drone_loss_seconds: 30,
    waiting_seconds: 2,
  },
  drone_count_limit: 100,
  drone_interval: 3,
  resting_threshold: 65,
  version_update_resting_threshold: 80,
  version_update_threshold_advance_hours: 12,
  free_room: false,
  dorm_isolation: [],
  merge_interval: 10,
  group_rest_in_full_on_mood_gap: true,
  group_mood_gap_threshold_minutes: 60,
  group_mood_gap_max_extra_wait_hours: 0,
  fia_fool: true,
  assistant_follows_schedule: false,
  fia_threshold: 90,
  rescue_threshold: 75,
  favorite: [],
};
const percentageFields = ["resting_threshold", "version_update_resting_threshold", "fia_threshold", "rescue_threshold"];
const settings = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, ref(deepcopy(value))]));
let extraSettings = {};
export function hydrateAdvancedSettings(data = {}) {
  extraSettings = deepcopy(data);
  for (const [key, defaultValue] of Object.entries(defaults)) {
    let value = data[key] ?? deepcopy(defaultValue);
    if (percentageFields.includes(key) && data[key] != null) value *= 100;
    if (key === "favorite") value = Array.isArray(value) ? value : value.split(",").filter(Boolean);
    if (key === "product_switching") value = { ...defaultValue, ...value };
    settings[key].value = deepcopy(value);
  }
}
export function buildAdvancedSettings() {
  const result = { ...extraSettings };
  for (const key of [
    "right_side_room_order",
    "swap_contact_train",
    "dorm_order",
    "experimental_dorm_logic",
    "refresh_backup_plan_after_mood",
    "workshop_low_priority_rest",
    "reload_room",
  ])
    delete result[key];
  for (const key in settings) {
    let value = deepcopy(settings[key].value);
    if (percentageFields.includes(key)) value /= 100;
    if (key === "favorite") value = value.join(",");
    result[key] = value;
  }
  return result;
}
const defaultOrder = ["contact", "train", "recycle"];
const orderKey = "mowerPlanRightSideOrder";
function readLocalOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(orderKey));
    if (Array.isArray(saved) && saved.length === 3 && new Set(saved).size === 3 && saved.every((room) => defaultOrder.includes(room))) return saved;
  } catch {
    /* Storage may be unavailable in a private browser session. */
  }
  return [...defaultOrder];
}
const right_side_room_order = ref(readLocalOrder());
function swap_right_side_facilities(source, target) {
  const order = [...right_side_room_order.value];
  const from = order.indexOf(source);
  const to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return;
  [order[from], order[to]] = [order[to], order[from]];
  right_side_room_order.value = order;
  try {
    localStorage.setItem(orderKey, JSON.stringify(order));
  } catch {
    /* Retain the order for this session. */
  }
}
export const mowerConfigStore = { ...settings, right_side_room_order, swap_right_side_facilities };
