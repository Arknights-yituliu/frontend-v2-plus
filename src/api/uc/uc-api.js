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
 * 获取当前登录用户资料（UC GET /user/profile，文档 3.3 节）
 * @returns {Promise<{code:number, msg:string, data:{uid:number, email:string|null, nickname:string, avatar:string|null, status:number, registerTime:string, lastLoginTime:string}}>}
 */
export function getUserProfile() {
    return ucRequest({method: "GET", url: "/user/profile"})
}

/**
 * 发送邮箱验证码（UC POST /auth/send-code，文档 3.0 节）
 * 限流：同一 IP 最小间隔 60s，同一邮箱最小间隔 5 分钟
 * @param {string} email 目标邮箱
 * @param {string} usage 用途标识：register=注册/邮箱绑定、login=登录
 * @returns {Promise<{code:number, msg:string, data:any}>}
 */
export function sendEmailCode(email, usage = "register") {
    return ucRequest({
        method: "POST",
        url: "/auth/send-code",
        data: {email, usage},
        auth: false,
    })
}

/**
 * 发送重设密码验证码（UC POST /auth/reset-code，文档 3.5.1 节），验证码发到账号绑定的邮箱
 * @param {string} account 邮箱或用户名
 * @returns {Promise<{code:number, msg:string, data:any}>}
 */
export function sendResetCode(account) {
    return ucRequest({
        method: "POST",
        url: "/auth/reset-code",
        data: {account},
        auth: false,
    })
}

/**
 * 忘记密码：提交新密码（UC POST /auth/reset-password，文档 3.5.2 节）
 * 成功后服务端踢出该账号全部会话
 * @param {string} account 邮箱或用户名（与发送验证码时一致）
 * @param {string} code 收到的验证码
 * @param {string} newPassword 新密码（6-32 位，仅数字、字母、@、下划线）
 * @returns {Promise<{code:number, msg:string, data:any}>}
 */
export function resetPassword(account, code, newPassword) {
    return ucRequest({
        method: "POST",
        url: "/auth/reset-password",
        data: {account, code, newPassword},
        auth: false,
    })
}

/**
 * 绑定邮箱（UC POST /user/email/bind，文档 3.6.1 节，需登录，仅无邮箱账号可绑）
 * @param {string} email 新邮箱（全局唯一）
 * @param {string} code 发到该邮箱的验证码（先调 sendEmailCode，usage=register）
 * @returns {Promise<{code:number, msg:string, data:any}>}
 */
export function bindEmail(email, code) {
    return ucRequest({
        method: "POST",
        url: "/user/email/bind",
        data: {email, code},
    })
}

/**
 * 换绑邮箱（UC POST /user/email/change，文档 3.6.2 节，需登录，验证旧邮箱与新邮箱）
 * @param {string} oldEmail 当前绑定邮箱（须与账号一致）
 * @param {string} oldCode 发到旧邮箱的验证码
 * @param {string} newEmail 新邮箱（全局唯一）
 * @param {string} newCode 发到新邮箱的验证码
 * @returns {Promise<{code:number, msg:string, data:any}>}
 */
export function changeEmail(oldEmail, oldCode, newEmail, newCode) {
    return ucRequest({
        method: "POST",
        url: "/user/email/change",
        data: {oldEmail, oldCode, newEmail, newCode},
    })
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
