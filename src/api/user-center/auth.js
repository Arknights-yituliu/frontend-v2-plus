import ucService from "/src/api/user-center/ucClient.js";

/**
 * 直连登录：登录凭证（密码/邮箱验证码）由浏览器直接提交到 UC，校验通过签发一次性票据 ticket
 * @param {Object} params 登录参数
 * @param {string} params.channel 发起会话凭证（由旧系统后端签发）
 * @param {string} [params.accountType] 登录方式：password=账号密码（默认）/ email=邮箱验证码
 * @param {string} params.account 登录账号（密码方式为邮箱或用户名；邮箱方式为邮箱）
 * @param {string} [params.password] 密码方式必填
 * @param {string} [params.code] 邮箱验证码方式必填
 * @returns {Promise<{ticket: string, expiresIn: number}>} 一次性登录票据及有效期
 */
async function directLogin({channel, accountType = "password", account, password, code}) {
  const body = new URLSearchParams();
  body.append("channel", channel);
  body.append("account_type", accountType);
  body.append("account", account);
  if (password) {
    body.append("password", password);
  }
  if (code) {
    body.append("code", code);
  }

  return ucService.post("/oauth2/direct-login", body, {
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
  });
}

/**
 * 直连注册：注册信息（含密码）由浏览器直接提交到 UC，创建用户后签发一次性票据 ticket
 * UC 已统一注册形态，旧 register_type 参数服务端不再声明，前端不再携带
 * @param {Object} params 注册参数
 * @param {string} params.channel 发起会话凭证（由旧系统后端签发）
 * @param {string} params.email 邮箱（必填，需通过邮箱验证码验证）
 * @param {string} params.userName 用户名（必填，3-20 位字母、数字、下划线）
 * @param {string} params.password 密码（必填，6-32 位）
 * @param {string} params.code 邮箱验证码（必填）
 * @param {string} [params.nickname] 昵称（选填，缺省时取用户名）
 * @returns {Promise<{ticket: string, expiresIn: number}>} 一次性登录票据及有效期
 */
async function directRegister({channel, email, userName, password, code, nickname}) {
  const body = new URLSearchParams();
  body.append("channel", channel);
  if (email) {
    body.append("email", email);
  }
  if (userName) {
    body.append("user_name", userName);
  }
  if (password) {
    body.append("password", password);
  }
  if (code) {
    body.append("code", code);
  }
  if (nickname) {
    body.append("nickname", nickname);
  }

  return ucService.post("/oauth2/direct-register", body, {
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
  });
}

/**
 * 发送邮箱验证码（UC 主站接口，邮箱验证码注册/登录使用）
 * @param {string} email 目标邮箱
 * @param {string} usage 验证码用途：register=注册 / login=登录 / reset=重置密码
 * @returns {Promise<void>}
 */
async function sendEmailCode(email, usage) {
  return ucService.post("/auth/send-code", {email, usage});
}

export {
  directLogin,
  directRegister,
  sendEmailCode,
};
