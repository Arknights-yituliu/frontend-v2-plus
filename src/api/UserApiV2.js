import request from "/src/api/request";

/**
 * 旧系统后端直连登录相关 API（V2）
 * 约定：后端凭 client_id/client_secret 调 UC /oauth2/direct-session 换取 channel；
 *      前端提交 ticket 后，后端调 UC /oauth2/direct-user 兑换用户信息并发自家会话。
 */
export default {

  /**
   * 发起直连登录会话：由旧系统后端换 channel 下发前端（打开登录/注册页前调用一次）
   * @returns {Promise<{data: {channel: string, expiresIn: number}}>} 发起会话凭证及有效期
   */
  getDirectChannel() {
    return request({
      url: `direct-session`,
      method: "get",
    })
  },

  /**
   * 凭一次性登录票据兑换用户信息并发本地会话（登录/注册共用）
   * @param {string} ticket UC 直连登录/注册返回的一次性票据
   * @returns {Promise<{data: {token: string, uid: number}}>} 本地会话 token 与 uid
   */
  completeDirectLogin(ticket) {
    return request({
      url: `complete-login`,
      method: "post",
      data: {ticket},
    })
  },

}
