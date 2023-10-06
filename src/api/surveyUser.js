import request from "/src/api/request"

const api_name = `/survey`

export default {
  manualUploadOperatorBox(data) {
    return request({
      headers: {
        "Content-Type": "application/json",
      },
      url: `maa/upload/operBox/manual`,
      method: "post",
      data: data,
    })
  },

  getOperatorDataResult() {
    return request({
      url: `maa/operator/result`,
      method: "get",
    })
  },

  maaStatistical() {
    return request({
      url: `maa/recruit/statistical`,
      method: "get",
    })
  },

  /**
   * 注册
   * @param userData 账号密码或邮箱验证码
   * @returns {*} 用户信息
   */
  register(userData) {
    return request({
      url: `${api_name}/register/v2`,
      method: "post",
      data: userData,
    })
  },

  /**
   * 调查站登录
   * @param userData 账号密码或邮箱验证码
   * @returns {*} 用户信息
   */

  login(userData) {
    return request({
      url: `${api_name}/login/v2`,
      method: "post",
      data: userData,
    })
  },

  /**
   * 发送邮件验证码
   * @param userData  内部数据包括邮件用途，邮箱等
   * @returns {*}  成功信息
   */
  sendEmailCode(userData){
    return request({
      url: `${api_name}/user/emailCode`,
      method: "post",
      data: userData,
    })
  },

  /**
   * 更新用户信息
   * @param data
   * @returns {*}
   */
  updateUserData(data) {
    return request({
      url: `${api_name}/user/update`,
      method: "post",
      data: data,
    })
  },


  /**
   * 通过cred找回账号
   * @param data
   * @returns {*}
   */
  retrievalUserAccountByCred(data){
    return request({
      url: `${api_name}/character/user/retrieval`,
      method: "post",
      data: data,
    })
  },

  /**
   * 通过cred找回账号
   * @param data
   * @returns {*}
   */
  loginByCred(data){
    return request({
      url: `${api_name}/user/login/cred`,
      method: "post",
      data: data,
    })
  },

  uploadCharacter(characterList, token) {
    return request({
      url: `${api_name}/character/upload?token=${token}`,
      method: "post",
      data: characterList,
    })
  },

  uploadCharacterByExcel(file, token) {
    return request({
      url: `${api_name}/character/import/excel?token=${token}`,
      method: "post",
      data: file,
    })
  },


  uploadCharacterBySKLand(data){
    return request({
      url: `${api_name}/character/import/skland`,
      method: "post",
      data: data,
    })
  },

  getSurveyCharacter(data) {
    return request({
      url: `${api_name}/operator/retrieval`,
      method: "post",
      data:data
    })
  },

  getCharStatisticsResult() {
    return request({
      url: `${api_name}/operator/result`,
      method: "get",
    })
  },

  uploadScore(scoreList, token) {
    return request({
      url: `${api_name}/score/upload?token=${token}`,
      method: "post",
      data: scoreList,
    })
  },
}
