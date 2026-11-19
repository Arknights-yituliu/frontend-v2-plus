import axios from "axios";
import {DOMAIN} from "/src/api/BASE_URL.js";

/**
 * TCL（用户中心）access_token 管理
 *
 * 令牌分工（见《BackEndV3 与 TCL 令牌统一方案 —— 前端实施方案》F2/F3/F4/F5）：
 * - 自签 token：长期会话凭据，存 localStorage（key `USER_TOKEN`），调 BackEndV3 时携带，兼作兑换/刷新凭据；
 * - TCL access_token：仅用于调 TCL 接口，存 localStorage（key `TCL_ACCESS_TOKEN`，约 2h 有效）；
 * - TCL refresh_token：不下发浏览器，兑换与刷新一律由 BackEndV3 服务端代做。
 */

/** TCL access_token 的 localStorage 存储键 */
const TCL_ACCESS_TOKEN_KEY = "TCL_ACCESS_TOKEN";

/** 旧版前端的缓存键，仅用于读取迁移与退出清理 */
const LEGACY_TOKEN_KEY = "UC_ACCESS_TOKEN";

/** 自签 token 的 localStorage 存储键（与 request.js 一致） */
const SELF_TOKEN_KEY = "USER_TOKEN";

/** 兑换接口：本地无可用 TCL access_token 时由前端主动调用（F3） */
const TCL_TOKEN_ISSUE_PATH = "/auth/uc-token/issue";

/** 刷新接口：调 TCL 接口发现令牌失效时调用（F4） */
const TCL_TOKEN_REFRESH_PATH = "/auth/token/refresh";

/** 提前刷新阈值：剩余有效期不足 10 分钟即刷新 */
const TCL_TOKEN_REFRESH_AHEAD_MS = 10 * 60 * 1000;

/** 内存缓存：undefined=尚未加载，null=无令牌 */
let tclTokenCache = undefined;

/** 进行中的兑换请求：并发调用复用同一 Promise，保证同一时刻只兑换一次（F5） */
let issuingPromise = null;

/** 进行中的刷新请求：并发调用复用同一 Promise，保证同一时刻只刷新一次（F5） */
let refreshingPromise = null;

/**
 * 读取自签 token 组装 Authorization 头值（与 request.js 拦截器口径一致）
 * @returns {string|null} Authorization 头值，未登录为 null
 */
function buildSelfAuthHeader() {
    const selfToken = localStorage.getItem(SELF_TOKEN_KEY);
    return selfToken ? `Authorization${selfToken}` : null;
}

/**
 * 从 localStorage 读取 TCL 令牌并写入内存缓存
 * @returns {{accessToken: string, expiresAt: number|null, scope: string}|null} TCL 令牌，无则 null
 */
function loadTclToken() {
    if (tclTokenCache !== undefined) {
        return tclTokenCache;
    }
    try {
        const currentRaw = localStorage.getItem(TCL_ACCESS_TOKEN_KEY);
        const legacyRaw = currentRaw ? null : localStorage.getItem(LEGACY_TOKEN_KEY);
        const raw = currentRaw || legacyRaw;
        tclTokenCache = raw ? JSON.parse(raw) : null;
        if (legacyRaw && tclTokenCache) {
            try {
                // 保留原 expiresAt；改名不会延长令牌寿命，也不重新兑换。
                localStorage.setItem(TCL_ACCESS_TOKEN_KEY, legacyRaw);
                localStorage.removeItem(LEGACY_TOKEN_KEY);
            } catch (e) {
                // 存储不可写时仍保留刚读取的内存缓存。
            }
        }
    } catch (e) {
        tclTokenCache = null;
    }
    return tclTokenCache;
}

/**
 * 保存 TCL access_token（内存 + localStorage，刷新页面后仍可复用）
 * @param {{accessToken?: string, expiresIn?: number|string, scope?: string}} token TCL 令牌信息
 */
function saveTclToken({accessToken, expiresIn, scope}) {
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
    tclTokenCache = token;
    try {
        localStorage.setItem(TCL_ACCESS_TOKEN_KEY, JSON.stringify(token));
        localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch (e) {
        // localStorage 不可用时仅保留内存缓存，不影响业务
    }
}

/**
 * 获取当前可用的 TCL access_token，已过期视为无令牌
 * @returns {string|null} TCL access_token
 */
function getTclAccessToken() {
    const token = loadTclToken();
    if (!token || !token.accessToken) {
        return null;
    }
    if (token.expiresAt && token.expiresAt <= Date.now()) {
        return null;
    }
    return token.accessToken;
}

/**
 * 清除本地 TCL 令牌（内存 + localStorage），登出或刷新失败时调用
 */
function clearTclToken() {
    tclTokenCache = null;
    for (const key of [TCL_ACCESS_TOKEN_KEY, LEGACY_TOKEN_KEY]) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            // 两个键分别清理，避免退出后从旧缓存恢复已失效的令牌。
        }
    }
}

/**
 * 带自签 token 调 BackEndV3 换取 TCL access_token（兑换与刷新共用）
 * 响应体形如 { code, msg, data: { access_token, token_type, expires_in, scope } }，
 * refresh_token 已由服务端剥离，不下发浏览器
 * @param {string} path 接口路径
 * @returns {Promise<string>} TCL access_token
 */
async function requestTclToken(path) {
    const selfAuthHeader = buildSelfAuthHeader();
    if (!selfAuthHeader) {
        throw new Error("未登录");
    }
    const response = await axios.post(`${DOMAIN}${path}`, null, {
        headers: {Authorization: selfAuthHeader},
    });
    const payload = response.data;
    if (!payload || payload.code !== 200) {
        throw new Error(payload?.msg || "获取 TCL 令牌失败");
    }
    const {access_token: accessToken, expires_in: expiresIn, scope} = payload.data || {};
    if (!accessToken) {
        throw new Error("获取 TCL 令牌失败");
    }
    saveTclToken({accessToken, expiresIn, scope});
    return accessToken;
}

/**
 * 确保本地存在可用的 TCL access_token（F3，前端唯一的新增触发点）
 *
 * 本地已有未过期令牌时直接返回；否则带自签 token 调 BackEndV3 `POST /auth/uc-token/issue` 兑换。
 * 兑换失败不抛错、不阻塞业务（自签 token 仍可正常调 BackEndV3），返回 null，
 * 等下次启动或下次进入业务页再重试
 * @returns {Promise<string|null>} TCL access_token，兑换失败为 null
 */
function ensureTclToken() {
    const cached = getTclAccessToken();
    if (cached) {
        return Promise.resolve(cached);
    }
    // 并发去重（F5）：兑换进行中时复用同一 Promise
    if (issuingPromise) {
        return issuingPromise;
    }
    issuingPromise = requestTclToken(TCL_TOKEN_ISSUE_PATH)
        .catch((error) => {
            console.warn("兑换 TCL 令牌失败，本次跳过，下次进入业务页重试", error);
            return null;
        })
        .finally(() => {
            issuingPromise = null;
        });
    return issuingPromise;
}

/**
 * 带自签 token 调 BackEndV3 `/auth/token/refresh` 换取新的 TCL access_token（F4）
 *
 * 并发去重（F5）：同一时刻只发一个刷新请求，其余调用复用同一 Promise 结果。
 * 刷新失败（如 TCL 侧授权已被撤销）时删除本地令牌，下次启动/进入业务页由 ensureTclToken 重新兑换自愈（R17）
 * @returns {Promise<string>} 新的 TCL access_token
 */
function refreshTclToken() {
    if (refreshingPromise) {
        return refreshingPromise;
    }
    refreshingPromise = requestTclToken(TCL_TOKEN_REFRESH_PATH)
        .catch((error) => {
            clearTclToken();
            throw error;
        })
        .finally(() => {
            refreshingPromise = null;
        });
    return refreshingPromise;
}

/**
 * 检查 TCL access_token 剩余有效期，不足 10 分钟则提前刷新
 *
 * 由路由在每次进入页面时调用一次（不再做定时轮询）。
 * 无本地令牌（未登录 / 从未兑换）或无法判断有效期时直接跳过；
 * 刷新失败由 refreshTclToken 清除本地令牌，等待下次进入页面时重新兑换自愈（R17）。
 * 每次调用都会在控制台打印本次是否触发刷新，便于排查令牌续期问题
 * @returns {Promise<void>}
 */
async function checkAndRefreshTclToken() {
    const token = loadTclToken();
    if (!token || !token.accessToken || !token.expiresAt) {
        console.log("[TCL令牌] 本次未刷新：本地无可用令牌");
        return;
    }
    const remainMs = token.expiresAt - Date.now();
    if (remainMs > TCL_TOKEN_REFRESH_AHEAD_MS) {
        console.log(`[TCL令牌] 本次未刷新：剩余 ${Math.round(remainMs / 1000)} 秒，未到提前刷新阈值`);
        return;
    }
    console.log(`[TCL令牌] 触发刷新：剩余 ${Math.round(remainMs / 1000)} 秒，已到提前刷新阈值`);
    try {
        // 并发去重由 refreshTclToken 内部保证（F5）
        await refreshTclToken();
        console.log("[TCL令牌] 刷新成功");
    } catch (error) {
        console.warn("[TCL令牌] 刷新失败，等待下次进入页面重试", error);
    }
}

/**
 * 保存登录/注册返回的令牌；兼容尚未升级的后端响应，支持先部署前端。
 * @param {Object} session /complete-login 返回的本地会话
 */
function saveTclTokenFromSession(session) {
    clearTclToken();
    saveTclToken({
        accessToken: session.tclAccessToken ?? session.ucAccessToken,
        expiresIn: session.tclTokenExpiresIn ?? session.ucTokenExpiresIn,
        scope: session.tclTokenScope ?? session.ucTokenScope,
    });
}

export {saveTclToken, saveTclTokenFromSession, getTclAccessToken, clearTclToken, ensureTclToken, refreshTclToken, checkAndRefreshTclToken};
