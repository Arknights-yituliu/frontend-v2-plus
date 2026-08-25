import axios from "axios";
import {UC_DOMAIN} from "/src/api/BASE_URL.js";
import {createMessage} from "/src/utils/message.js";

// UC 统一成功码（UC 与旧系统后端一致，均为 200）
const UC_SUCCESS_CODE = 200;

// UC 请求实例：直连 UC，跨域不带 Cookie（凭证仅存于本次请求体中）
const ucService = axios.create({
  baseURL: UC_DOMAIN,
  timeout: 15000,
  withCredentials: false,
});

// http response 拦截器：统一校验 UC 业务码并透传数据，失败/异常统一弹出提示并 reject
ucService.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload.code !== UC_SUCCESS_CODE) {
      // 业务失败：直接用 UC 返回的 msg 作为错误文案（返回体字段为 msg，不是 message），并在此统一弹出提示
      const error = new Error(payload?.msg || "请求失败，请稍后重试");
      error.code = payload?.code;
      error.msg = error.message;
      createMessage({type: "error", text: error.msg});
      return Promise.reject(error);
    }
    // 成功：直接返回业务数据 data，调用方无需再取 response.data
    return payload.data;
  },
  (error) => {
    // 网络/HTTP 层错误：统一弹出兜底提示后 reject
    createMessage({type: "error", text: error.response?.data?.msg || "网络错误，请稍后重试"});
    return Promise.reject(error.response || error);
  }
);

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
 * @param {Object} params 注册参数
 * @param {string} params.channel 发起会话凭证（由旧系统后端签发）
 * @param {string} params.registerType 注册方式：password=密码注册 / email_code=邮箱验证码注册
 * @param {string} [params.email] 邮箱（与用户名至少填一个；填了邮箱需提供验证码）
 * @param {string} [params.userName] 用户名（可选，3-20 位字母数字下划线）
 * @param {string} params.password 密码（必填）
 * @param {string} [params.code] 邮箱验证码（填邮箱时必填）
 * @param {string} [params.nickname] 昵称（缺省时取用户名，再取邮箱）
 * @returns {Promise<{ticket: string, expiresIn: number}>} 一次性登录票据及有效期
 */
async function directRegister({channel, registerType, email, userName, password, code, nickname}) {
  const body = new URLSearchParams();
  body.append("channel", channel);
  body.append("register_type", registerType);
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

export {directLogin, directRegister, sendEmailCode};
