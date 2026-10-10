import { nameToCharId } from "./operatorAssets.js";
import { planBindings } from "./plan_bindings.js";
import { OPERATOR_CONF_FIELDS } from "./plan_edit.js";
import { factory_product_ids } from "./base_products.js";

const capacities = { central: 5, meeting: 2, factory: 1, contact: 1, train: 2, recycle: 2 };
const runOrderAgents = new Set(["龙舌兰", "但书", "佩佩", "可露希尔"]);
const list = (value) => (Array.isArray(value) ? value : typeof value === "string" ? value.split(",").filter(Boolean) : []);
const dorm = (room) => room.startsWith("dormitory_");
const capacity = (room, facility) => capacities[room] ?? (dorm(room) ? 5 : facility.name === "发电站" ? 1 : 3);

// Browser checks have no device state or owned-operator roster. Mower remains authoritative
// for reachable backup combinations and runtime recovery-bed assignment.
export function validatePlan(payload) {
  const errors = [];
  const main = payload[payload.default || "plan1"] || {};
  const backups = payload.backup_plans || [];
  const add = (plan, message) => errors.push(`${plan}：${message}`);
  const known = (name) => Object.hasOwn(nameToCharId, name);
  const labels = new Map();
  function check(table, conf, label) {
    const primaries = new Map();
    const groups = new Map();
    let workers = 0;
    let beds = 0;
    if (!Object.keys(table).length) add(label, "尚未配置设施和干员");
    for (const [room, facility] of Object.entries(table)) {
      const slots = facility.plans || [];
      if (slots.length > capacity(room, facility)) add(label, `${room} 的岗位数超出设施容量`);
      if (room.startsWith("room_")) {
        if (!["制造站", "贸易站", "发电站"].includes(facility.name)) add(label, `${room} 的设施类型无效`);
        if (facility.name === "制造站" && !factory_product_ids.includes(facility.product)) add(label, `${room} 的制造产物无效`);
        if (facility.name === "贸易站" && !["lmd", "orundum"].includes(facility.product)) add(label, `${room} 的订单类型无效`);
      }
      if (dorm(room)) {
        if (slots.length !== 5) add(label, `${room} 需要配置 5 个岗位，可用 Free 填充空位`);
        const first = slots.findIndex((slot) => slot.agent === "Free");
        if (first < 0) add(label, `${room} 必须安排至少一个 Free`);
        else if (slots.slice(first).some((slot) => slot.agent !== "Free")) add(label, `${room} 的 Free 必须连续且安排在宿管后`);
      }
      for (const [index, slot] of slots.entries()) {
        const name = slot.agent;
        const position = `${room} 第 ${index + 1} 岗位`;
        if (name === "Free") {
          if (!dorm(room)) add(label, `${position}：Free 只能安排在宿舍`);
          else beds++;
        } else if (!known(name)) add(label, `${position}：干员名无效「${name || "空位"}」`);
        else {
          if (primaries.has(name)) add(label, `${name} 同时在 ${primaries.get(name).room} 和 ${room} 担任主班`);
          primaries.set(name, { ...slot, room });
          if (!dorm(room)) workers++;
        }
        if (name === "菲亚梅塔" && (!dorm(room) || index === 1)) add(label, "菲亚梅塔必须安排在宿舍，且不能在第 2 岗位");
        const bindings = planBindings(slot);
        const names = bindings.map((binding) => (binding.group || "").trim());
        if (bindings.length > 1 && (names.some((group) => !group) || new Set(names).size !== names.length)) add(label, `${name} 的多绑组名称不能为空或重复`);
        if (["Free", "菲亚梅塔"].includes(name) && names.some(Boolean)) add(label, `${name} 不能绑组`);
        for (const binding of bindings) {
          const replacements = binding.replacement || [];
          if ((bindings.length > 1 || !dorm(room) || name === "菲亚梅塔") && !replacements.some((replacement) => !runOrderAgents.has(replacement)))
            add(label, `${position}（${name}）缺少普通替班${binding.group ? `，绑组「${binding.group}」` : ""}`);
          if (replacements.filter((replacement) => runOrderAgents.has(replacement)).length > 1) add(label, `${name} 的同一替换组不能安排多个跑单干员`);
          if (binding.group) {
            const members = groups.get(binding.group) || [];
            members.push({ slot, room, replacements });
            groups.set(binding.group, members);
          }
          for (const replacement of replacements) {
            if (replacement === "Free") {
              if (!dorm(room) || !binding.group || ["Free", "菲亚梅塔"].includes(name)) add(label, `${position}：Free 替班只能用于绑组宿舍干员`);
            } else if (!known(replacement)) add(label, `${name} 的替班干员名无效「${replacement}」`);
            if (replacement === "菲亚梅塔") add(label, `${name} 的替班不能安排菲亚梅塔`);
          }
        }
      }
    }
    if (workers && !beds) add(label, "工作干员需要宿舍 Free 床位");
    for (const [name, slot] of primaries) {
      for (const binding of planBindings(slot))
        for (const replacement of binding.replacement || []) {
          const cover = primaries.get(replacement);
          if (name === "菲亚梅塔") {
            if (!cover) add(label, `菲亚梅塔的充能对象「${replacement}」不在主班中`);
          } else if (cover) {
            const sameDormGroup =
              name !== replacement &&
              binding.group &&
              (dorm(slot.room) || dorm(cover.room)) &&
              planBindings(cover).some((item) => item.group === binding.group);
            if (!sameDormGroup) add(label, `${name} 的替班「${replacement}」已担任主班，须属于同一绑组且至少一方在宿舍`);
          }
        }
    }
    const workaholics = new Set(list(conf.workaholic));
    for (const [group, members] of groups) {
      const working = members.filter(({ slot, room }) => !dorm(room) && !workaholics.has(slot.agent));
      if (!working.length && members.some(({ slot, room }) => dorm(room) || planBindings(slot).length > 1))
        add(label, `绑组「${group}」需要至少一名可轮休、参与心情计算的非宿舍干员`);
      const assigned = new Map();
      function match(member, seen) {
        for (const name of member.replacements.filter((name) => name !== "Free" && !runOrderAgents.has(name))) {
          if (seen.has(name)) continue;
          seen.add(name);
          if (!assigned.has(name) || match(assigned.get(name), seen)) {
            assigned.set(name, member);
            return true;
          }
        }
        return false;
      }
      for (const member of members) {
        if (dorm(member.room) && member.replacements.includes("Free")) continue;
        if (!match(member, new Set())) {
          add(label, `绑组「${group}」无法为各岗位分配不同替班`);
          break;
        }
      }
    }
    for (const [name, limits] of Object.entries(conf.operator_mood_limits || {})) {
      if (!known(name)) add(label, `个人心情设置中的干员名无效「${name}」`);
      labels.set(`${label}:${name}`, limits);
    }
    if (conf.mood_limits) labels.set(`${label}:全体干员`, conf.mood_limits);
  }
  check(main, payload.conf || {}, "主表");
  for (const [index, backup] of backups.entries()) {
    const label = `副表「${backup.name || index + 1}」`;
    const effective = structuredClone(main);
    const conf = structuredClone(payload.conf || {});
    for (const key of OPERATOR_CONF_FIELDS)
      conf[key] = [...new Set([...list(conf[key]), ...list(backup.conf?.[key])])].filter((name) => !list(backup.conf?.removed_operators?.[key]).includes(name));
    if (backup.conf?.mood_limits) conf.mood_limits = backup.conf.mood_limits;
    conf.operator_mood_limits = { ...conf.operator_mood_limits, ...backup.conf?.operator_mood_limits };
    for (const [room, facility] of Object.entries(backup.plan || {})) {
      const source = main[room];
      if (!source && !Object.hasOwn(capacities, room)) add(label, `${room} 不在主表设施中`);
      if (source && room.startsWith("room_") && (source.name !== facility.name || source.plans.length !== facility.plans.length))
        add(label, `${room} 不能改变设施类型或岗位数`);
      if (source && facility.product && facility.product !== source.product && !payload.advanced_settings?.product_switching?.enable)
        add(label, `${room} 改变产物或订单类型，需要开启自动切换产物与订单`);
      effective[room] = {
        ...facility,
        plans: facility.plans.map((slot, index) =>
          slot.agent === "Current" ? structuredClone(source?.plans[index] || { agent: "", replacement: [] }) : structuredClone(slot)
        ),
      };
    }
    for (const [room, targets] of Object.entries(backup.task || {})) {
      const facility = effective[room] || (Object.hasOwn(capacities, room) ? { name: "", plans: [] } : null);
      if (!facility) {
        add(label, `任务设施 ${room} 不在排班中`);
        continue;
      }
      if (targets.length > capacity(room, facility)) add(label, `任务 ${room} 人数超过设施容量`);
      for (const name of targets) if (!["Free", "Current"].includes(name) && !known(name)) add(label, `任务 ${room} 中的干员名无效「${name}」`);
    }
    check(effective, conf, label);
  }
  for (const [name, limits] of labels)
    if (![limits.lower, limits.upper].every((value) => Number.isFinite(value) && value >= 0 && value <= 24) || limits.lower > limits.upper)
      add(name, "心情上下限须在 0–24 之间，且下限不大于上限");
  return { errors: [...new Set(errors)], checkedPlans: 1 + backups.length };
}
