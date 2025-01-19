import request from "/src/api/request"

const api_name = `/survey`

export default {

  /**
   * 注册
   * @param userData 账号密码或邮箱验证码
   * @returns {*} 用户信息
   */
  registerV3(userData) {
    return request({
      url: `user/register/v3`,
      method: "post",
      data: userData,
    })
  },

  /**
   * 调查站登录
   * @param userData 账号密码或邮箱验证码
   * @returns {*} 用户信息
   */
  loginV3(userData) {
    return request({
      url: `user/login/v3`,
      method: "post",
      data: userData,
    })
  },


  /**
   * 发送邮件验证码
   * @param userData  内部数据包括邮件用途，邮箱等
   * @returns {*}  成功信息
   */
  sendVerificationCodeV2(userData){
    return request({
      url: `user/verificationCode`,
      method: "post",
      data: userData,
    })
  },

  /**
   * 更新用户信息
   * @param data
   * @returns {*}
   */
  updateUserDataV2(data) {
    return request({
      url: `user/update/v2`,
      method: "post",
      data: data,
    })
  },

  /**
   * 找回用户信息
   * @param data
   * @returns {*}
   */
  retrieveAuthentication(data) {
    return request({
      url: `user/retrieve/auth`,
      method: "post",
      data: data,
    })
  },

  resetPassword(data) {
    return request({
      url: `user/reset/password`,
      method: "post",
      data: data,
    })
  },








}
