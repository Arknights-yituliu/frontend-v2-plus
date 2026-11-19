import tclService from "/src/api/user-center/tclClient.js";

// TCL OAuth 用户信息路径：需 access_token 具备 user.read 权限
const OAUTH_USER_INFO_PATH = "/oauth2/userinfo";
// TCL OAuth 用户资料修改路径：需 access_token 具备 user.profile 权限
const OAUTH_PROFILE_NICKNAME_PATH = "/oauth2/profile/nickname";
const OAUTH_PROFILE_AVATAR_PATH = "/oauth2/profile/avatar";

/**
 * 获取当前 TCL 授权用户的信息（uid、用户名、昵称、头像）
 * 认证、令牌刷新与失败提示均由 tclClient 拦截器统一处理
 * @returns {Promise<{uid: number, userName: string|null, nickname: string|null, avatar: string|null}>} TCL 用户信息
 */
async function getOauthUserInfo() {
  return tclService.get(OAUTH_USER_INFO_PATH);
}

/**
 * 修改当前 TCL 授权用户的昵称
 * 昵称不限制字符集，支持中文，最长 64 字符；修改后不影响登录用户名
 * @param {string} nickname 新昵称
 * @returns {Promise<null>} TCL 成功响应 data 为 null
 */
async function updateOauthNickname(nickname) {
  return tclService.post(OAUTH_PROFILE_NICKNAME_PATH, {nickname});
}

/**
 * 修改当前 TCL 授权用户的头像
 * @param {string} avatar 头像值；传空串表示清除头像
 * @returns {Promise<null>} TCL 成功响应 data 为 null
 */
async function updateOauthAvatar(avatar) {
  return tclService.post(OAUTH_PROFILE_AVATAR_PATH, {avatar});
}

export {getOauthUserInfo, updateOauthNickname, updateOauthAvatar};
