import tclService from "/src/api/user-center/tclClient.js";

/** 应用视角 PAT 列表：凭 OAuth access_token 管理，不使用 PAT 自身鉴权。 */
export function listPats() {
  return tclService.get("/oauth2/pat/list");
}

/** 应用视角按 token 明文撤销；归属由服务端按 uid + clientId 限定。 */
export function revokePat(token) {
  return tclService.post("/oauth2/pat/revoke", {token});
}

/** 平台可选权限的公开元数据。 */
export function listOAuthScopes() {
  return tclService.get("/open/oauth/scopes");
}