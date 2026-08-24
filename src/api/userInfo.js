import request from "/src/api/request"



export default {

  /**
   * 更新用户信息
   * @param data
   * @returns {*}
   */
  updateUserDataV2(data) {
    return request({
      url: `auth/user/update/v2`,
      method: "post",
      data: data,
    })
  },

  /**
   * 获取可用权限列表
   * @returns {*} 权限列表 [{ key, code, desc }]
   */
  getOpenApiPermissions() {
    return request({
      url: `user/open-api/permissions`,
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
      url: `user/open-api/token`,
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
      url: `auth/user/open-api/tokens`,
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
      url: `auth/user/open-api/token/delete`,
      method: "post",
      data: { token },
    })
  },

}
