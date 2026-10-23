// Match the static group requirements of Mower's PlanModel; conditions run in Mower.
export function backupGroupErrors(payload) {
  const groups = payload.backup_groups ?? [];
  if (!Array.isArray(groups)) return ["副表分组必须是列表"];
  const errors = [];
  const ids = new Set();
  for (const group of groups) {
    if (!group || typeof group.id !== "string" || !group.id.trim() || typeof group.name !== "string" || !group.name.trim()) {
      errors.push("副表分组必须填写标识和名称");
      continue;
    }
    if (ids.has(group.id)) errors.push(`副表分组标识不能重复：${group.id}`);
    ids.add(group.id);
  }
  ids.add("default");
  for (const [index, backup] of (payload.backup_plans ?? []).entries()) {
    const label = `副表「${backup.name || index + 1}」`;
    const memberships = backup.group_ids ?? ["default"];
    if (!Array.isArray(memberships) || !memberships.length) errors.push(`${label}至少需要一个归属分组`);
    else {
      if (new Set(memberships).size !== memberships.length) errors.push(`${label}归属分组不能重复`);
      for (const id of memberships) if (!ids.has(id)) errors.push(`${label}的分组不存在：${id}`);
    }
    if (!["global", "exclusive"].includes(backup.type ?? "global")) errors.push(`${label}的类型必须为全局副表或互斥副表`);
  }
  return errors;
}
