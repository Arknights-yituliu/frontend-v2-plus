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
 * 将 UC 干员数据转换为前端干员列表记录
 *
 * <p>UC 的 items 只包含该账号实际拥有的干员，因此 own 恒为 true；
 * 未出现在 items 中的干员由调用方补默认值（own: false）。</p>
 *
 * @param {Array<Object>} items UC 返回的干员数组
 * @returns {Array<Object>} 前端字段格式的干员记录（charId/elite/potential/skill/mod 等）
 */
function toOperatorDataList(items) {
  return (items || []).map((item) => ({
    own: true,
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
  }))
}

export {buildUcOperatorSavePayload, toOperatorDataList}
