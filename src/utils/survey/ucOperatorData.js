/**
 * UC OAuth 游戏数据接口（干员数据）字段映射
 *
 * 接口见《OAuth游戏数据接口文档》：
 * - 读取：GET /oauth2/ak-accounts/operators?akUid=
 * - 保存：POST /oauth2/ak-accounts/operators/save
 *
 * UC 与前端字段名不同，读写两侧在此集中对齐：
 * charId↔id、elite↔evolvePhase、mainSkill↔mainSkillLevel、
 * modX/Y/D/A/B↔equipX/Y/D/A/B，potential 与 potentialRank 同值传递
 */

/**
 * 将森空岛同步数据转换为 UC 保存接口的请求体
 * @param {Object} warehouseData 森空岛同步数据（含 uid 与已格式化的 operatorDataList）
 * @returns {{playerInfo: {akUid: string}, operators: Array<Object>}} UC 保存接口请求体
 */
function buildUcOperatorSavePayload(warehouseData) {
  return {
    playerInfo: {akUid: String(warehouseData?.uid ?? "")},
    operators: (warehouseData?.operatorDataList || []).map((operator) => ({
      id: operator.charId,
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
  }
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
  toOperatorDataList,
  toManualOperatorDataList,
  buildManualOperatorSavePayload,
}
