// 干员头像资源基础地址，后续如需切换 CDN 或目录，只需修改这里
export const OPERATOR_AVATAR_BASE_URL = 'https://cos.yituliu.cn/arknights/resources/avatar/'

// 干员立绘资源基础地址（180×360 半身像，含默认立绘与各套时装）
export const OPERATOR_PORTRAIT_BASE_URL = 'https://cos.yituliu.cn/arknights/resources/portrait/'

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
 * 皮肤资源文件名规则：`@` 换成 `_`，`#` 保留但必须转义成 `%23`
 * （否则浏览器会把 `#` 之后的部分当成锚点丢掉，请求直接 404）。
 * 立绘与头像两个目录共用同一套命名，只是目录不同。
 *
 * @param {string} skinId 皮肤编码，如 char_124_kroos@witch#1
 * @returns {string} 资源文件名（不含扩展名），skinId 为空时返回空字符串
 */
function skinFileStem(skinId) {
  const id = String(skinId || '').trim()
  if (!id) {
    return ''
  }
  return id.replace(/@/g, '_').replace(/#/g, '%23')
}

/**
 * 生成干员立绘（时装）图片地址
 *
 * <p>立绘文件名由 skinId 推导：`@` 换成 `_`，`#` 保留但必须转义成 `%23`
 * （否则浏览器会把 `#` 之后的部分当成锚点丢掉，请求直接 404）。
 * 默认立绘本身也是皮肤，形如 `char_190_clour#2` → `char_190_clour_2.png`。</p>
 *
 * @param {string} skinId 皮肤编码，如 char_124_kroos@witch#1
 * @returns {string} 完整立绘图片地址，skinId 为空时返回空字符串
 */
export function getSkinPortraitUrl(skinId) {
  const stem = skinFileStem(skinId)
  return stem ? `${OPERATOR_PORTRAIT_BASE_URL}${stem}.png` : ''
}

/**
 * 生成干员皮肤头像图片地址
 *
 * <p>与 {@link getSkinPortraitUrl} 同源同命名，只是把 portrait 目录换成 avatar，
 * 拿到的是该套时装的方形头像，而不是干员默认头像。</p>
 *
 * @param {string} skinId 皮肤编码，如 char_124_kroos@witch#1
 * @returns {string} 完整头像图片地址，skinId 为空时返回空字符串
 */
export function getSkinAvatarUrl(skinId) {
  const stem = skinFileStem(skinId)
  return stem ? `${OPERATOR_AVATAR_BASE_URL}${stem}.png` : ''
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

// 头像描边渐变色（与原 OperatorAvatar 组件的 rarity 边框保持一致）
const OPERATOR_RARITY_BORDER_COLORS = {
  6: 'linear-gradient(135deg, #ff8a3d, #ffd24a)',
  5: 'linear-gradient(135deg, #ffffff, #f2c75c)',
  4: 'linear-gradient(135deg, #ffffff, #d8c6ff)',
  3: 'linear-gradient(135deg, #ffffff, #7fb7ff)',
  2: 'linear-gradient(135deg, #ffffff, #7fd88f)',
  1: 'linear-gradient(135deg, #ffffff, #c5c9d3)',
}

/**
 * 生成干员头像 <img> 的内联样式，尺寸和稀有度描边渐变均通过 CSS 变量传入
 * @param {Object} options 配置项
 * @param {number} [options.size] 桌面尺寸（px）
 * @param {number} [options.mobileSize] 手机尺寸（px），缺省时沿用桌面尺寸
 * @param {number} [options.rarity] 干员星级，用于描边底色
 * @param {boolean} [options.bordered] 是否需要稀有度描边
 * @returns {Object} Vue 可直接绑定的样式对象
 */
export function getOperatorAvatarStyle({ size, mobileSize, rarity, bordered = false } = {}) {
  const style = {}
  if (size) {
    style['--avatar-size'] = `${size}px`
  }
  const resolvedMobileSize = mobileSize || size
  if (resolvedMobileSize) {
    style['--avatar-mobile-size'] = `${resolvedMobileSize}px`
  }
  if (bordered) {
    const normalizedRarity = Math.min(6, Math.max(1, Math.floor(Number(rarity) || 6)))
    style['--avatar-border-gradient'] = OPERATOR_RARITY_BORDER_COLORS[normalizedRarity]
  }
  return style
}
