/**
 * 站点自用接口的访问密钥
 *
 * <p>回收站掉落统计与干员时装大数据用的是同一把密钥（服务端两处都只保存明文的 SHA-256 摘要），
 * 所以「存哪儿、从哪儿读」统一收在这里，避免两个页面各写一份常量、换密钥时漏改一处。</p>
 *
 * <p>读取优先级：用户在本机填过并保存的值 → 构建期注入的 {@code VITE_RECYCLE_DROP_KEY}。
 * 两处都没有时返回空串，页面自己决定要不要显示密钥闸门。</p>
 */

/** localStorage 里的键名：沿用回收站页面既有的名字，两个页面共用同一份 */
const STORAGE_KEY = 'RecycleDropAccessKey'

/** 构建期注入的密钥：站点维护者配好环境变量后，访客不用手填 */
const ENV_KEY = String(import.meta.env.VITE_RECYCLE_DROP_KEY || '').trim()

/**
 * 读取当前可用的访问密钥
 * @returns {string} 密钥明文；本机与构建期都没配置时返回空串
 */
function readAccessKey() {
  return String(localStorage.getItem(STORAGE_KEY) || '').trim() || ENV_KEY
}

/**
 * 保存用户手填的密钥
 * @param {string} key 密钥明文
 */
function saveAccessKey(key) {
  localStorage.setItem(STORAGE_KEY, String(key).trim())
}

/** 清除本机保存的密钥（构建期注入的那份不受影响） */
function clearAccessKey() {
  localStorage.removeItem(STORAGE_KEY)
}

export {
  readAccessKey,
  saveAccessKey,
  clearAccessKey,
}
