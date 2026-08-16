import axios from "axios";
import {ref} from "vue";
import {createMessage} from "/src/utils/message.js";
import {DOMAIN} from "/src/api/BASE_URL.js";

// OAuth 本地会话 token 的存储 key（后端 /oauth/callback 换 token 后回跳携带）
const OAUTH_TOKEN_KEY = "OAUTH_TOKEN";

// 全局用户信息状态（模块级单例，全站共享；替换原 userInfo.js 的实现）
const userInfo = ref({uid: 0, userName: "未登录", email: '', avatar: '', akUid: "0", status: -100, token: void 0});

/**
 * 获取本地保存的 OAuth 会话 token
 * @returns {string} OAuth token，无则为空串
 */
export function getOAuthToken() {
    return localStorage.getItem(OAUTH_TOKEN_KEY) || "";
}

/**
 * 保存 OAuth 会话 token
 * @param {string} token OAuth 授权登录后后端签发的会话 token
 */
export function setOAuthToken(token) {
    localStorage.setItem(OAUTH_TOKEN_KEY, token);
}

/**
 * 清除 OAuth 会话 token
 */
export function clearOAuthToken() {
    localStorage.removeItem(OAUTH_TOKEN_KEY);
}

/**
 * 规范化后端基址：去掉末尾斜杠，避免与路径拼接出现双斜杠
 * @param {string} baseUrl 后端基址
 * @returns {string} 规范化后的基址
 */
function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/+$/, "");
}

/**
 * 统一网络错误提示
 * @param {object} error axios 错误对象
 * @param {string} url 请求地址，用于错误提示
 */
function handleRequestError(error, url) {
    let msg = "网络错误";
    if (error.response) {
        msg = `HTTP ${error.response.status}`;
    } else if (error.code === "ECONNABORTED") {
        msg = "请求超时";
    } else if (error.message) {
        msg = error.message;
    }
    createMessage({text: `${msg}（${url}）`, type: "error"});
}

/**
 * 获取当前用户的匿名/真实 uid（不存在时生成时间戳 uid 落盘，兼容原 userInfo.js 的 getUid）
 * @returns {string} uid
 */
export function getUid() {
    let uid = localStorage.getItem("UID");

    const isNumeric = /^-?\d+$/.test(uid); // 检查是否为整数
    if (uid !== null && isNumeric && !isNaN(Number(uid))) {
        return uid;
    } else {
        const time = new Date().getTime();
        uid = `${time}001`;
        localStorage.setItem("UID", uid);
        return uid;
    }
}

/**
 * 拉取当前 OAuth 会话的用户信息并写入全局 userInfo 状态
 * 无 OAuth token 或拉取失败时置为未登录（status=-100）
 * @returns {Promise<any|null>} 用户信息数据，未登录或失败返回 null
 */
export async function fetchOAuthUserInfo() {
    const token = getOAuthToken();
    if (!token) {
        userInfo.value.status = -100;
        return null;
    }
    try {
        const data = await fetchUserByToken(token);
        if (data) {
            userInfo.value = data;
            localStorage.setItem("UID", data.uid);
        } else {
            userInfo.value.status = -100;
        }
        return data;
    } catch (e) {
        // 拉取失败视为未登录（错误提示已由 fetchUserByToken 统一处理）
        userInfo.value.status = -100;
        return null;
    }
}

/**
 * 发起 OAuth2 授权登录：GET /user/oauth2/login
 * 后端生成 state + PKCE（code_verifier 缓存在后端），返回 authorizeUrl。
 * 授权完成后 UC 302 回后端 /oauth/callback 换 token 建本地会话，
 * 后端再按 frontend-redirect-url 配置 302 回跳前端页面并携带 token。
 * @param {string} [backendBaseUrl] 接入方后端（BackEndV3）基址，默认取站内 DOMAIN
 * @returns {Promise<string>} authorizeUrl，调用方可直接整页跳转
 */
export function oauthAuthorize(backendBaseUrl = DOMAIN) {
    const base = normalizeBaseUrl(backendBaseUrl);
    return new Promise((resolve, reject) => {
        axios.get(`${base}/user/oauth2/login`, {timeout: 15000}).then((response) => {
            const body = response.data;
            if (body && body.code === 200 && body.data && body.data.authorizeUrl) {
                resolve(body.data.authorizeUrl);
            } else {
                const msg = (body && body.msg) || "发起授权失败";
                createMessage({text: msg, type: "error"});
                reject(body);
            }
        }).catch((error) => {
            handleRequestError(error, "/user/oauth2/login");
            reject(error);
        });
    });
}

/**
 * 按本地会话 token 获取用户信息：GET /user/info?token=xxx
 * @param {string} token 本地会话 token（后端 /oauth/callback 换 token 后签发给前端）
 * @param {string} [backendBaseUrl] 接入方后端（BackEndV3）基址，默认取站内 DOMAIN
 * @returns {Promise<any>} 用户信息数据
 */
export function fetchUserByToken(token, backendBaseUrl = DOMAIN) {
    const base = normalizeBaseUrl(backendBaseUrl);
    return new Promise((resolve, reject) => {
        axios.get(`${base}/user/info`, {
            params: {token},
            timeout: 15000,
        }).then((response) => {
            const body = response.data;
            if (body && body.code === 200) {
                resolve(body.data || null);
            } else {
                const msg = (body && body.msg) || "获取用户信息失败";
                createMessage({text: msg, type: "error"});
                reject(body);
            }
        }).catch((error) => {
            handleRequestError(error, "/user/info");
            reject(error);
        });
    });
}

export {userInfo};
