import axios from "axios";
import {DOMAIN} from "/src/api/BASE_URL.js";

/**
 * UC（用户中心）access_token 管理
 *
 * 令牌分工（见《BackEndV3 与 UC 令牌统一方案 —— 前端实施方案》F2/F3/F4/F5）：
 * - 自签 token：长期会话凭据，存 localStorage（key `USER_TOKEN`），调 BackEndV3 时携带，兼作兑换/刷新凭据；
 * - UC access_token：仅用于调 UC 接口，存 localStorage（key `UC_ACCESS_TOKEN`，约 2h 有效）；
 * - UC refresh_token：不下发浏览器，兑换与刷新一律由 BackEndV3 服务端代做。
 */

/** UC access_token 的 localStorage 存储键 */
const UC_ACCESS_TOKEN_KEY = "UC_ACCESS_TOKEN";

/** 自签 token 的 localStorage 存储键（与 request.js 一致） */
const SELF_TOKEN_KEY = "USER_TOKEN";

/** 兑换接口：本地无可用 UC access_token 时由前端主动调用（F3） */
const UC_TOKEN_ISSUE_PATH = "/auth/uc-token/issue";

/** 刷新接口：调 UC 接口发现令牌失效时调用（F4） */
const UC_TOKEN_REFRESH_PATH = "/auth/token/refresh";

/** 提前刷新阈值：剩余有效期不足 10 分钟即刷新 */
const UC_TOKEN_REFRESH_AHEAD_MS = 10 * 60 * 1000;

/** 有效期检查间隔：30 秒 */
const UC_TOKEN_CHECK_INTERVAL_MS = 30 * 1000;

/** 内存缓存：undefined=尚未加载，null=无令牌 */
let ucTokenCache = undefined;

/** 进行中的兑换请求：并发调用复用同一 Promise，保证同一时刻只兑换一次（F5） */
let issuingPromise = null;

/** 进行中的刷新请求：并发调用复用同一 Promise，保证同一时刻只刷新一次（F5） */
let refreshingPromise = null;

/** 有效期定时检查的句柄：非 null 表示已在运行，避免重复启动叠加定时器 */
let autoRefreshTimer = null;

/**
 * 读取自签 token 组装 Authorization 头值（与 request.js 拦截器口径一致）
 * @returns {string|null} Authorization 头值，未登录为 null
 */
function buildSelfAuthHeader() {
    const selfToken = localStorage.getItem(SELF_TOKEN_KEY);
    return selfToken ? `Authorization${selfToken}` : null;
}

/**
 * 从 localStorage 读取 UC 令牌并写入内存缓存
 * @returns {{accessToken: string, expiresAt: number|null, scope: string}|null} UC 令牌，无则 null
 */
function loadUcToken() {
    if (ucTokenCache !== undefined) {
        return ucTokenCache;
    }
    try {
        const raw = localStorage.getItem(UC_ACCESS_TOKEN_KEY);
        ucTokenCache = raw ? JSON.parse(raw) : null;
    } catch (e) {
        ucTokenCache = null;
    }
    return ucTokenCache;
}

/**
 * 保存 UC access_token（内存 + localStorage，刷新页面后仍可复用）
 * @param {{accessToken?: string, expiresIn?: number|string, scope?: string}} token UC 令牌信息
 */
function saveUcToken({accessToken, expiresIn, scope}) {
    if (!accessToken) {
        return;
    }
    const expiresInSeconds = Number(expiresIn);
    const token = {
        accessToken: accessToken,
        expiresAt: Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
            ? Date.now() + expiresInSeconds * 1000
            : null,
        scope: scope || "",
    };
    ucTokenCache = token;
    try {
        localStorage.setItem(UC_ACCESS_TOKEN_KEY, JSON.stringify(token));
    } catch (e) {
        // localStorage 不可用时仅保留内存缓存，不影响业务
    }
}

/**
 * 获取当前可用的 UC access_token，已过期视为无令牌
 * @returns {string|null} UC access_token
 */
function getUcAccessToken() {
    const token = loadUcToken();
    if (!token || !token.accessToken) {
        return null;
    }
    if (token.expiresAt && token.expiresAt <= Date.now()) {
        return null;
    }
    return token.accessToken;
}

/**
 * 清除本地 UC 令牌（内存 + localStorage），登出或刷新失败时调用
 */
function clearUcToken() {
    ucTokenCache = null;
    try {
        localStorage.removeItem(UC_ACCESS_TOKEN_KEY);
    } catch (e) {
        // 忽略 localStorage 异常
    }
}

/**
 * 带自签 token 调 BackEndV3 换取 UC access_token（兑换与刷新共用）
 * 响应体形如 { code, msg, data: { access_token, token_type, expires_in, scope } }，
 * refresh_token 已由服务端剥离，不下发浏览器
 * @param {string} path 接口路径
 * @returns {Promise<string>} UC access_token
 */
async function requestUcToken(path) {
    const selfAuthHeader = buildSelfAuthHeader();
    if (!selfAuthHeader) {
        throw new Error("未登录");
    }
    const response = await axios.post(`${DOMAIN}${path}`, null, {
        headers: {Authorization: selfAuthHeader},
    });
    const payload = response.data;
    if (!payload || payload.code !== 200) {
        throw new Error(payload?.msg || "获取 UC 令牌失败");
    }
    const {access_token: accessToken, expires_in: expiresIn, scope} = payload.data || {};
    if (!accessToken) {
        throw new Error("获取 UC 令牌失败");
    }
    saveUcToken({accessToken, expiresIn, scope});
    return accessToken;
}

/**
 * 确保本地存在可用的 UC access_token（F3，前端唯一的新增触发点）
 *
 * 本地已有未过期令牌时直接返回；否则带自签 token 调 BackEndV3 `POST /auth/uc-token/issue` 兑换。
 * 兑换失败不抛错、不阻塞业务（自签 token 仍可正常调 BackEndV3），返回 null，
 * 等下次启动或下次进入业务页再重试
 * @returns {Promise<string|null>} UC access_token，兑换失败为 null
 */
function ensureUcToken() {
    const cached = getUcAccessToken();
    if (cached) {
        return Promise.resolve(cached);
    }
    // 并发去重（F5）：兑换进行中时复用同一 Promise
    if (issuingPromise) {
        return issuingPromise;
    }
    issuingPromise = requestUcToken(UC_TOKEN_ISSUE_PATH)
        .catch((error) => {
            console.warn("兑换 UC 令牌失败，本次跳过，下次进入业务页重试", error);
            return null;
        })
        .finally(() => {
            issuingPromise = null;
        });
    return issuingPromise;
}

/**
 * 带自签 token 调 BackEndV3 `/auth/token/refresh` 换取新的 UC access_token（F4）
 *
 * 并发去重（F5）：同一时刻只发一个刷新请求，其余调用复用同一 Promise 结果。
 * 刷新失败（如 UC 侧授权已被撤销）时删除本地令牌，下次启动/进入业务页由 ensureUcToken 重新兑换自愈（R17）
 * @returns {Promise<string>} 新的 UC access_token
 */
function refreshUcToken() {
    if (refreshingPromise) {
        return refreshingPromise;
    }
    refreshingPromise = requestUcToken(UC_TOKEN_REFRESH_PATH)
        .catch((error) => {
            clearUcToken();
            throw error;
        })
        .finally(() => {
            refreshingPromise = null;
        });
    return refreshingPromise;
}

/**
 * 检查 UC access_token 剩余有效期，不足 10 分钟则提前刷新
 *
 * 无本地令牌（未登录 / 从未兑换）或无法判断有效期时直接跳过；
 * 刷新失败由 refreshUcToken 清除本地令牌，静默等待下次启动重新兑换自愈（R17）
 * @returns {Promise<void>}
 */
async function checkAndRefreshUcToken() {
    const token = loadUcToken();
    if (!token || !token.accessToken || !token.expiresAt) {
        return;
    }
    if (token.expiresAt - Date.now() > UC_TOKEN_REFRESH_AHEAD_MS) {
        return;
    }
    try {
        // 并发去重由 refreshUcToken 内部保证（F5）
        await refreshUcToken();
    } catch (error) {
        console.warn("UC access_token 提前刷新失败，等待下次检查", error);
    }
}

/**
 * 启动 UC access_token 有效期定时检查：每 30 秒检查一次，剩余不足 10 分钟即提前刷新
 *
 * 重复调用不会叠加定时器；未登录时不产生任何请求
 * @returns {number} 定时器句柄
 */
function startUcTokenAutoRefresh() {
    if (autoRefreshTimer !== null) {
        return autoRefreshTimer;
    }
    autoRefreshTimer = window.setInterval(checkAndRefreshUcToken, UC_TOKEN_CHECK_INTERVAL_MS);
    return autoRefreshTimer;
}

export {saveUcToken, getUcAccessToken, clearUcToken, ensureUcToken, refreshUcToken, startUcTokenAutoRefresh};
