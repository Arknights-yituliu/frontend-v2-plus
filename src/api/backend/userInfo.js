import request from "/src/api/backend/request"



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
   * 生成第三方 API Token（转发直签 UC 令牌）
   * 由后端使用服务端代持的 refresh_token 向用户中心换取指定有效期的 UC access_token，
   * 后端入参为 @RequestParam（application/x-www-form-urlencoded），此处以 params 传递
   * @param {number} expiresIn access_token 有效期（秒），必填且大于 0
   * @param {string} scope 权限范围（英文逗号分隔），如 "gama-data.read"
   * @param {string} name 本次签发名称，必填且不超过 50 字符
   * @returns {*} { access_token, token_type, expires_in, scope }
   */
  generateOpenApiToken(expiresIn, scope, name) {
    return request({
      url: `/auth/uc-token/custom`,
      method: "post",
      params: { expires_in: expiresIn, scope, name },
    })
  },

}
