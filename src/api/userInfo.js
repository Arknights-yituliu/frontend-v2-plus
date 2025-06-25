import request from "/src/api/request"



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
   * @param data  内部数据包括邮件用途，邮箱等
   * @returns {*}  成功信息
   */
  sendVerificationCodeV2(data){
    return request({
      url: `user/verificationCode`,
      method: "post",
      data: data,
    })
  },

  /**
   * 发送邮件验证码
   * @param data  内部数据包括邮件用途，邮箱等
   * @returns {*}  成功信息
   */
  sendUpdateEmailVerificationCode(data){
    return request({
      url: `auth/user/update-email/verificationCode`,
      method: "post",
      data: data,
    })
  },

  checkVerificationCode(data) {
    const {oldEmail,verificationCode} = data
    return request({
      url: `auth/user/check/verificationCode?email=${oldEmail}&verificationCode=${verificationCode}`,
      method: "get"
    })
  },

  bindEmail(data) {
    return request({
      url: `auth/user/bind-email`,
      method: "post",
      data: data,
    })
  },

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
