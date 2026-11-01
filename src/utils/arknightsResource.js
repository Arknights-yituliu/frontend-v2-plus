// 干员头像资源基础地址，后续如需切换 CDN 或目录，只需修改这里
export const OPERATOR_AVATAR_BASE_URL = 'https://cos.yituliu.cn/arknights/resources/avatar/'

// 技能图标资源基础地址，后续如需切换 CDN 或目录，只需修改这里
export const OPERATOR_SKILL_ICON_BASE_URL = 'https://cos.yituliu.cn/arknights/resources/skills/'

// 模组图标资源基础地址，后续如需切换 CDN 或目录，只需修改这里
export const OPERATOR_EQUIP_ICON_BASE_URL = 'https://cos.yituliu.cn/arknights/equip-icon/'

/**
 * 生成干员头像图片地址
 * @param {string} charId 干员 charId，如 char_002_amiya
 * @returns {string} 完整头像图片地址，charId 为空时返回空字符串
 */
export function getOperatorAvatarUrl(charId) {
  if (!charId) {
    return ''
  }
  return `${OPERATOR_AVATAR_BASE_URL}${charId}.png`
}

/**
 * 将数据里的技能图标 id 还原为资源文件名
 * 数据中 id 使用 x5b / x5d 转义方括号（如 skcom_charge_costx5b1x5d），资源文件名使用原始方括号
 * @param {string} iconId 技能图标 id
 * @returns {string} 还原后的图标 id
 */
function normalizeSkillIconId(iconId) {
  return iconId.replace(/x5b/g, '[').replace(/x5d/g, ']')
}

/**
 * 生成技能图标图片地址
 * @param {string} iconId 技能图标 id，如 skchr_absin_1
 * @returns {string} 完整技能图标图片地址，iconId 为空时返回空字符串
 */
export function getSkillIconUrl(iconId) {
  if (!iconId) {
    return ''
  }
  return `${OPERATOR_SKILL_ICON_BASE_URL}skill_icon_${normalizeSkillIconId(iconId)}.png`
}

/**
 * 生成模组图标图片地址
 * @param {string} icon 模组图标 id，如 uniequip_002_amiya
 * @returns {string} 完整模组图标图片地址，icon 为空时返回空字符串
 */
export function getEquipIconUrl(icon) {
  if (!icon) {
    return ''
  }
  return `${OPERATOR_EQUIP_ICON_BASE_URL}${icon}.png`
}
