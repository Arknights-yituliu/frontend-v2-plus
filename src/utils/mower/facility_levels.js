// Mower c2cd17883: saved building levels, inference, physical capacity and power.
// This editor utility reads schedules without changing staffing or running a simulation.
export const supportRooms = ["meeting", "factory", "contact", "train", "recycle"];
export const outputRooms = Array.from({ length: 9 }, (_, i) => `room_${Math.floor(i / 3) + 1}_${(i % 3) + 1}`);
export const levelRooms = ["central", ...outputRooms, ...supportRooms, ...Array.from({ length: 4 }, (_, i) => `dormitory_${i + 1}`)];
const outputTypes = { 制造站: "manufacture", 贸易站: "trading", 发电站: "power" };
const generation = [0, 60, 130, 270];
const workingPower = [0, 10, 30, 60];
const dormPower = [0, 10, 20, 30, 45, 65];
const record = (value) => value && typeof value === "object" && !Array.isArray(value);
export const maximumFacilityLevel = (room) => (room === "central" || room.startsWith("dormitory_") ? 5 : 3);
export function facilityCapacity(type, level) {
  if (level <= 0) return 0;
  if (["manufacture", "trading", "central"].includes(type)) return level;
  if (type === "dormitory") return 5;
  if (["meeting", "train"].includes(type)) return 2;
  if (type === "recycle") return level === 1 ? 1 : 2;
  return ["power", "contact", "factory"].includes(type) ? 1 : 0;
}
const agentName = (slot) => typeof slot.agent === "string" ? slot.agent.trim() : "";
const occupied = (slot) => Boolean(agentName(slot));
const dormBuilt = (slot) => occupied(slot) && agentName(slot).toLowerCase() !== "current";

export function facilityLevelState(payload, table = payload[payload.default || "plan1"] || {}) {
  const main = payload[payload.default || "plan1"] || {};
  const levels = payload.facility_levels ?? {};
  const issues = [];
  const explicit = record(levels) ? levels : {};
  if (!record(levels)) issues.push("设施等级必须为对象");
  const validLevels = {};
  for (const [room, level] of Object.entries(explicit)) {
    const maximum = maximumFacilityLevel(room);
    if (!levelRooms.includes(room) || !Number.isInteger(level) || level < 0 || level > maximum) {
      issues.push(`设施 ${room} 等级必须为 0–${maximum} 的整数`);
    } else {
      validLevels[room] = level;
      if (level > 0 && outputRooms.includes(room) && !outputTypes[main[room]?.name]) issues.push(`请先设置 ${room} 的设施类别`);
    }
  }
  const facilities = Object.fromEntries(levelRooms.map((room) => {
    const source = main[room];
    const type = outputRooms.includes(room) ? outputTypes[source?.name] || "" : room.startsWith("dormitory_") ? "dormitory" : room;
    let level = supportRooms.includes(room) ? 3 : source ? maximumFacilityLevel(room) : 0;
    if (type === "dormitory" && !source?.plans?.some(dormBuilt)) level = 0;
    if (room === "recycle" && Number.isInteger(source?.level) && source.level >= 0 && source.level <= 3) level = source.level;
    return [room, { type, level: validLevels[room] ?? level, plans: source?.plans || [] }];
  }));
  const powerCount = outputRooms.filter((room) => facilities[room].type === "power" && facilities[room].level > 0).length;
  if (powerCount === 2 || powerCount === 3) {
    for (const [room, facility] of Object.entries(facilities)) {
      if (!facility.level || Object.hasOwn(validLevels, room)) continue;
      if (facility.type === "dormitory") facility.level = powerCount === 3 ? 5 : 1;
      else if (room === "central") facility.level = 5;
      else if (["manufacture", "trading"].includes(facility.type)) facility.level = powerCount === 3 ? 3 : Math.max(1, Math.min(3, facility.plans.filter(occupied).length || 1));
      else if (facility.type === "power" || supportRooms.includes(room)) facility.level = 3;
    }
  }
  let generated = 0;
  let consumed = 0;
  for (const [room, facility] of Object.entries(facilities)) {
    facility.plans = table[room]?.plans || [];
    facility.capacity = facilityCapacity(facility.type, facility.level);
    const count = facility.plans.filter(occupied).length;
    if (!facility.level && facility.plans.some((slot) => slot.agent || slot.group || slot.replacement?.length || slot.group_bindings?.some((binding) => binding.group || binding.replacement?.length)))
      issues.push(`${room} 未建造，不能配置干员、休息床位或替补`);
    else if (count > facility.capacity) issues.push(`${room} 的在岗人数 ${count} 超过设施等级容量 ${facility.capacity}`);
    if (facility.type === "power") generated += generation[facility.level] || 0;
    else if (["manufacture", "trading", "meeting", "contact", "train"].includes(facility.type)) consumed += workingPower[facility.level] || 0;
    else if (facility.type === "dormitory") consumed += dormPower[facility.level] || 0;
    else if (facility.type === "factory" && facility.level > 0) consumed += 10;
  }
  const power = { generation: generated, consumption: consumed, margin: generated - consumed, sufficient: generated >= consumed };
  if (!power.sufficient) issues.push(`基建总耗电量 ${consumed} 超过总发电量 ${generated}，存在电力赤字`);
  return { facilities, power, issues };
}
