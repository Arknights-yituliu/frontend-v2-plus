import axios from "axios";
import {createMessage} from "/src/utils/message.js";
import {UC_BASE_URL} from "/src/api/BASE_URL.js";

// ---- UC 会话在浏览器端的存储 key（与站内 OAuth 会话 OAUTH_TOKEN 隔离，避免互相干扰）----
const UC_TOKEN_KEY = "UC_TOKEN";
const UC_UID_KEY = "UC_UID";

/**
 * 获取本地保存的 UC 会话 token
 * @returns {string} UC token，无则为空串
 */
export function getUcToken() {
    return localStorage.getItem(UC_TOKEN_KEY) || "";
}

/**
 * 获取本地保存的 UC uid
 * @returns {string} UC uid，无则为空串
 */
export function getUcUid() {
    return localStorage.getItem(UC_UID_KEY) || "";
}

/**
 * 保存 UC 会话（token + uid）
 * @param {string} token UC 登录返回的会话 token
 * @param {string|number} uid 用户 id
 */
export function setUcSession(token, uid) {
    localStorage.setItem(UC_TOKEN_KEY, token);
    localStorage.setItem(UC_UID_KEY, uid || "");
}

/**
 * 清除 UC 会话
 */
export function clearUcSession() {
    localStorage.removeItem(UC_TOKEN_KEY);
    localStorage.removeItem(UC_UID_KEY);
}

/**
 * UC 登出：
 * 1. 调用 UC POST /auth/logout 使服务端会话 token 立即失效（文档 3.7 节）
 * 2. 无论成功与否都清除本地 UC 会话（token 可能已过期/被踢，本地必须清）
 * @returns {Promise<void>}
 */
export async function logoutUcSession() {
    try {
        await ucRequest({method: "POST", url: "/auth/logout"})
    } catch (e) {
        // 登出失败（如 token 已失效）不阻断本地清除
    } finally {
        clearUcSession()
    }
}

/**
 * UC 接口统一请求封装：
 * - baseUrl 默认使用 UC_BASE_URL，可传 baseUrl 覆盖（dev 环境切换用）
 * - 请求头自动携带 Authorization: Bearer <token>（auth=true 且存在 token 时）
 * - 响应统一解析 { code, msg, data }，code !== 200 时提示错误并 reject
 * @param {{method?:string, url?:string, data?:object, auth?:boolean, baseUrl?:string}} config 请求配置
 * @returns {Promise<{code:number, msg:string, data:any}>} 成功时返回响应体
 */
export function ucRequest({method = "GET", url = "", data = null, auth = true, baseUrl = UC_BASE_URL} = {}) {
    return new Promise((resolve, reject) => {
        const headers = {};
        if (auth) {
            const token = getUcToken();
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }
        axios({
            baseURL: baseUrl,
            method,
            url,
            data,
            headers,
            timeout: 15000,
            // 携带跨域 Cookie：登录时接受 UC 的 Set-Cookie（uc_token），供 OAuth authorize 回跳识别登录态
            withCredentials: true,
        }).then((response) => {
            const body = response.data;
            if (body && body.code === 200) {
                resolve(body);
            } else {
                const msg = (body && body.msg) || "请求失败";
                createMessage({text: msg, type: "error"});
                reject(body);
            }
        }).catch((error) => {
            let msg = "网络错误";
            if (error.response) {
                msg = `HTTP ${error.response.status}`;
            } else if (error.code === "ECONNABORTED") {
                msg = "请求超时";
            } else if (error.message) {
                msg = error.message;
            }
            createMessage({text: `${msg}（${url}）`, type: "error"});
            reject(error);
        });
    });
}
