import ucService from "/src/api/user-center/ucClient.js";

// UC OAuth 用户信息路径：需 access_token 具备 user.read 权限
const OAUTH_USER_INFO_PATH = "/oauth2/userinfo";

/**
 * 获取当前 UC 授权用户的信息（uid、用户名、昵称、头像）
 * 认证、令牌刷新与失败提示均由 ucClient 拦截器统一处理
 * @returns {Promise<{uid: number, userName: string|null, nickname: string|null, avatar: string|null}>} UC 用户信息
 */
async function getOauthUserInfo() {
  return ucService.get(OAUTH_USER_INFO_PATH);
}

export {getOauthUserInfo};
