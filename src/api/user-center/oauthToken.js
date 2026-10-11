import ucService from "/src/api/user-center/ucClient.js";

// UC 可配置授权范围查询路径（公开）：返回平台支持的 {code, desc} 权限列表，无需登录
const OAUTH_SCOPES_PATH = "/open/oauth/scopes";

// UC 自定义令牌列表查询路径（OAuth 侧）：用 access_token 认证，只返回本应用名下的签发记录
const OAUTH_CUSTOM_TOKENS_PATH = "/oauth2/custom-tokens";

// UC 自定义令牌吊销路径（OAuth 侧）：用 access_token 认证，只能吊销本应用为该用户签发的令牌
const OAUTH_CUSTOM_TOKENS_REVOKE_PATH = "/oauth2/custom-tokens/revoke";

/**
 * 查询本应用为该用户签发的自定义有效期令牌列表（UC OAuth 侧接口）
 *
 * <p>用 UC access_token 认证（ucService 拦截器自动以 Bearer 携带），只返回本应用
 * （clientId）名下为该用户签发的记录，按签发时间倒序，含已过期记录。
 * 每条记录带 token 明文、scope、expireTime 与剩余秒数 expiresInSeconds（≤0 即已过期）。
 * 失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @returns {Promise<Array<Object>>} 自定义令牌列表，最近签发的在前
 */
async function listCustomTokens() {
  return ucService.get(OAUTH_CUSTOM_TOKENS_PATH);
}

/**
 * 吊销（删除）本应用为该用户签发的一条自定义令牌（UC OAuth 侧接口）
 *
 * <p>用 UC access_token 认证（ucService 拦截器自动以 Bearer 携带），归属按 uid + clientId
 * 双重限定，只能吊销本应用为该用户签发的令牌，无法跨用户、跨应用越权。
 * 成功后令牌立即失效并从列表移除；令牌不存在或已过期时幂等返回成功。
 * 失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @param {string} token 待吊销的令牌明文（access_token）
 * @returns {Promise<null>} 成功返回空结果
 */
async function revokeCustomToken(token) {
  return ucService.post(OAUTH_CUSTOM_TOKENS_REVOKE_PATH, {token});
}

/**
 * 查询平台可配置的 OAuth 授权范围（公开接口，无需登录）
 *
 * <p>返回系统全部可选权限的静态元数据，每项为 {code, desc}，与《用户授权权限管理接口文档》
 * 的 selectableScopes 口径一致，不含管理员专属的元范围 all。用于在线渲染可生成的权限列表，
 * 避免前端硬编码权限标识。失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @returns {Promise<Array<{code: string, desc: string}>>} 权限列表 [{ code, desc }]
 */
async function listOAuthScopes() {
  return ucService.get(OAUTH_SCOPES_PATH);
}

export {
  listCustomTokens,
  revokeCustomToken,
  listOAuthScopes,
};
