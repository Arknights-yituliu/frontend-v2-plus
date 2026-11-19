import request from "/src/api/backend/request";

export default {
  /** refresh_token 由后端代持；浏览器只提交 PAT 的有效期、权限和目标账号。 */
  generateOpenApiPat(expiresIn, scope, name, payload) {
    return request({
      url: "/auth/pat",
      method: "post",
      data: {expires_in: expiresIn, scope, name, payload},
    });
  },
};