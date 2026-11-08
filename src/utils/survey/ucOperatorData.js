/**
 * UC OAuth 游戏数据接口（干员数据）字段映射
 *
 * 接口见《OAuth游戏数据接口文档》：
 * - 读取：GET /oauth2/ak-accounts/operators?akUid=
 * - 保存：POST /oauth2/ak-accounts/operators/save
 *
 * UC 与前端字段名不同，读写两侧在此集中对齐：
 * charId↔id、own↔owned、elite↔evolvePhase、mainSkill↔mainSkillLevel、
 * modX/Y/D/A/B↔equipX/Y/D/A/B，potential 与 potentialRank 同值传递
 *
 * 时装（skins）只有森空岛侧存在，字段为 skinId + gainTs：
 * - 上报是全量对齐语义，传了 skins 就必须是完整集合，本次未包含的旧记录会被删除
 * - 省略或空数组表示本次不上报，已有数据保持不变
 */

// skinId 只允许 1~128 位可见 ASCII（不含空格），与后端校验保持一致
const SKIN_ID_PATTERN = /^[\x21-\x7e]{1,128}$/

/**
 * 将森空岛/前端的时装集合整理为上报用的 skins 数组
 *
 * <p>按后端校验规则清洗：丢弃空值、非法字符、超长与重复的 skinId（同请求内重复会被整单拒绝），
 * gainTs 缺失或非法一律按 0（获得时间未知）。</p>
 *
 * @param {Array<{skinId: string, gainTs?: number}>} skins 时装条目（可来自 normalizeSklandSkins）
 * @returns {Array<{skinId: string, gainTs: number}>} 去重并按原顺序排列的上报条目
 */
function buildSkinEntries(skins) {
  const entries = []
  const seen = new Set()

  for (const skin of Array.isArray(skins) ? skins : []) {
    const skinId = typeof skin?.skinId === "string" ? skin.skinId.trim() : ""
    if (!SKIN_ID_PATTERN.test(skinId) || seen.has(skinId)) {
      continue
    }
    seen.add(skinId)

    const gainTs = Math.floor(Number(skin?.gainTs))
    entries.push({
      skinId,
      gainTs: Number.isFinite(gainTs) && gainTs > 0 ? gainTs : 0,
    })
  }

  return entries
}

/**
 * 将森空岛同步数据转换为 UC 保存接口的请求体
 * @param {Object} warehouseData 森空岛同步数据（含 uid、已格式化的 operatorDataList 与 itemList，可选 skins）
 * @returns {{playerInfo: {akUid: string}, operators: Array<Object>, items: Array<{itemId: string, count: string}>, skins?: Array<{skinId: string, gainTs: number}>}} UC 保存接口请求体
 */
function buildUcOperatorSavePayload(warehouseData) {
  const payload = {
    playerInfo: {akUid: String(warehouseData?.uid ?? "")},
    operators: (warehouseData?.operatorDataList || []).map((operator) => ({
      id: operator.charId,
      owned: operator.own ? 1 : 0,
      rarity: operator.rarity,
      level: operator.level,
      evolvePhase: operator.elite,
      mainSkillLevel: operator.mainSkill,
      skill1: operator.skill1,
      skill2: operator.skill2,
      skill3: operator.skill3,
      equipX: operator.modX,
      equipY: operator.modY,
      equipD: operator.modD,
      equipA: operator.modA,
      equipB: operator.modB,
      potentialRank: operator.potential,
    })),
    items: (warehouseData?.itemList || []).map((item) => ({
      itemId: String(item.itemId),
      count: String(item.quantity),
    })),
  }

  // 只有拿到非空时装集合才带上 skins：省略该字段表示不上报，已有数据保持不变
  const skins = buildSkinEntries(warehouseData?.skins)
  if (skins.length > 0) {
    payload.skins = skins
  }

  return payload
}

/**
 * 将单条 UC 干员记录转换为前端干员字段
 * @param {Object} item UC 返回的干员记录
 * @param {boolean} own 是否持有
 * @returns {Object} 前端字段格式的干员记录
 */
function mapUcOperatorItem(item, own) {
  return {
    own,
    charId: item.id,
    rarity: item.rarity,
    level: item.level,
    elite: item.evolvePhase,
    potential: item.potentialRank,
    mainSkill: item.mainSkillLevel,
    skill1: item.skill1,
    skill2: item.skill2,
    skill3: item.skill3,
    modX: item.equipX,
    modY: item.equipY,
    modD: item.equipD,
    modA: item.equipA,
    modB: item.equipB,
  }
}

/**
 * 将 UC 干员数据转换为前端干员列表记录
 *
 * <p>UC 的 items 只包含该账号实际拥有的干员，因此 own 恒为 true；
 * 未出现在 items 中的干员由调用方补默认值（own: false）。</p>
 *
 * @param {Array<Object>} items UC 返回的干员数组
 * @returns {Array<Object>} 前端字段格式的干员记录（charId/elite/potential/skill/mod 等）
 */
function toOperatorDataList(items) {
  return (items || []).map((item) => mapUcOperatorItem(item, true))
}

/**
 * 将 UC 手动修改版干员数组转换为前端干员列表记录
 *
 * <p>手动版额外包含 owned（1 是、0 否，缺省按 0），转换为前端 own 布尔值；
 * 未出现在数组中的干员由调用方补默认值（own: false）。</p>
 *
 * @param {Array<Object>} items GET /oauth2/ak-accounts/manual-operators 返回的干员数组
 * @returns {Array<Object>} 前端字段格式的干员记录（含 own）
 */
function toManualOperatorDataList(items) {
  return (items || []).map((item) => mapUcOperatorItem(item, Number(item.owned) === 1))
}

/**
 * 将前端干员记录转换为 UC 手动修改版保存接口的请求体
 *
 * <p>数值字段统一兜底为 0：接口对缺省 / null / 空字符串按 0 落库，不表示沿用旧值。</p>
 *
 * @param {Array<Object>} operators 前端干员记录（含 own 与各练度字段）
 * @returns {{operators: Array<Object>}} UC 手动版保存接口请求体
 */
function buildManualOperatorSavePayload(operators = []) {
  return {
    operators: (operators || []).map((operator) => ({
      id: operator.charId,
      owned: operator.own ? 1 : 0,
      rarity: operator.rarity ?? 0,
      level: operator.level ?? 0,
      evolvePhase: operator.elite ?? 0,
      mainSkillLevel: operator.mainSkill ?? 0,
      skill1: operator.skill1 ?? 0,
      skill2: operator.skill2 ?? 0,
      skill3: operator.skill3 ?? 0,
      equipX: operator.modX ?? 0,
      equipY: operator.modY ?? 0,
      equipD: operator.modD ?? 0,
      equipA: operator.modA ?? 0,
      equipB: operator.modB ?? 0,
      potentialRank: operator.potential ?? 0,
    })),
  }
}

export {
  buildUcOperatorSavePayload,
  buildSkinEntries,
  toOperatorDataList,
  toManualOperatorDataList,
  buildManualOperatorSavePayload,
}
