import request from "/src/api/request"



export default {

  /**
   * 更新当前登录用户的昵称（认证由请求拦截器自动附加 Authorization 头）
   * @param {string} nickname 新的昵称，不能为空
   * @returns {*} 更新结果
   */
  updateNickname(nickname) {
    return request({
      url: `/auth/user/nickname`,
      method: "post",
      data: { nickname },
    })
  },

  /**
   * 更新当前登录用户的头像（认证由请求拦截器自动附加 Authorization 头）
   * @param {string} avatar 新的头像地址，不能为空
   * @returns {*} 更新结果
   */
  updateAvatar(avatar) {
    return request({
      url: `/auth/user/avatar`,
      method: "post",
      data: { avatar },
    })
  },

  /**
   * 获取可用权限列表
   * @returns {*} 权限列表 [{ key, code, desc }]
   */
  getOpenApiPermissions() {
    return request({
      url: `/user/open-api/permissions`,
      method: "get",
    })
  },

  /**
   * 生成第三方 API Token
   * @param {Array} scope 权限码数组 [10001, 10002]
   * @param {string} remark 备注说明（可选）
   * @returns {*} { token, scope }
   */
  generateOpenApiToken(scope, remark) {
    return request({
      url: `/auth/user/open-api/token`,
      method: "post",
      data: { scope, remark },
    })
  },

  /**
   * 获取我的第三方 Token 列表
   * @returns {*} [{ token, scope, remark, createTime }]
   */
  getOpenApiTokens() {
    return request({
      url: `/auth/user/open-api/tokens`,
      method: "get",
    })
  },

  /**
   * 删除第三方 API Token
   * @param {string} token 要删除的第三方 token
   * @returns {*} 删除结果
   */
  deleteOpenApiToken(token) {
    return request({
      url: `/auth/user/open-api/token/delete`,
      method: "post",
      data: { token },
    })
  },

}
