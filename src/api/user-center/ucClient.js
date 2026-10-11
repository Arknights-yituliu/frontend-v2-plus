import axios from "axios";
import {UC_DOMAIN} from "/src/api/BASE_URL.js";
import {createMessage} from "/src/utils/message.js";
import {getUcAccessToken, refreshUcToken} from "/src/utils/user/ucToken.js";

// UC 统一成功码（UC 与旧系统后端一致，均为 200）
const UC_SUCCESS_CODE = 200;

// UC 未登录 / 令牌失效业务码：命中时需刷新 UC access_token 后重试一次（F4）
const UC_NOT_LOGIN_CODE = 80001;

// 酸橙云（UC）接口报错提示的统一前缀：便于用户区分报错来自酸橙云还是本站旧后端
const UC_ERROR_PREFIX = "来自酸橙云：";

// UC 请求实例：直连 UC，跨域不带 Cookie（凭证仅存于本次请求体中）
const ucService = axios.create({
  baseURL: UC_DOMAIN,
  timeout: 15000,
  withCredentials: false,
});

// http request 拦截器：需要 UC 授权的接口以 Bearer 携带 UC access_token，无令牌时不附加
ucService.interceptors.request.use(
  (config) => {
    const ucAccessToken = getUcAccessToken();
    if (ucAccessToken) {
      config.headers["Authorization"] = `Bearer ${ucAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 刷新 UC access_token 后重试原请求（F4）
 * 并发去重由 refreshUcToken 内部保证（F5）；_ucTokenRetried 标记确保只重试一次，避免无限循环
 * @param {Object} config 原请求配置
 * @returns {Promise<*>} 重试后的业务数据
 */
async function retryAfterRefresh(config) {
  config._ucTokenRetried = true;
  try {
    await refreshUcToken();
    return ucService.request(config);
  } catch (refreshError) {
    // 刷新失败（UC 授权已失效等）：本地令牌已由 refreshUcToken 清除，下次启动重新兑换自愈（R17）
    createMessage({type: "error", text: `${UC_ERROR_PREFIX}登录已过期，请重新登录`});
    return Promise.reject(refreshError);
  }
}

// http response 拦截器：统一校验 UC 业务码并透传数据，失败/异常统一弹出提示并 reject
ucService.interceptors.response.use(
  async (response) => {
    const payload = response.data;

    // UC 令牌失效（HTTP 200 + 业务码 80001）→ 刷新后重试一次；此时不弹错误提示
    if (payload?.code === UC_NOT_LOGIN_CODE && response.config && !response.config._ucTokenRetried) {
      return retryAfterRefresh(response.config);
    }

    if (payload.code !== UC_SUCCESS_CODE) {
      // 业务失败：直接用 UC 返回的 msg 作为错误文案（返回体字段为 msg，不是 message），并在此统一弹出提示
      const error = new Error(payload?.msg || "请求失败，请稍后重试");
      error.code = payload?.code;
      error.msg = error.message;
      createMessage({type: "error", text: `${UC_ERROR_PREFIX}${error.msg}`});
      return Promise.reject(error);
    }
    // 成功：直接返回业务数据 data，调用方无需再取 response.data
    return payload.data;
  },
  async (error) => {
    // 令牌失效也可能表现为 HTTP 401（网关层）：同样刷新后重试一次
    const originalConfig = error.config;
    if (error.response?.status === 401 && originalConfig && !originalConfig._ucTokenRetried) {
      return retryAfterRefresh(originalConfig);
    }

    // 网络/HTTP 层错误：统一弹出兜底提示后 reject
    createMessage({type: "error", text: `${UC_ERROR_PREFIX}${error.response?.data?.msg || "网络错误，请稍后重试"}`});
    return Promise.reject(error.response || error);
  }
);

export default ucService;
