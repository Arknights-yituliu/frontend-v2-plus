<template>
  <div class="uc-login-test-container">
    <h2>UserCenter 密码登录接入验证</h2>

    <!-- UC 服务地址配置 -->
    <el-card class="config-card">
      <template #header>
        <span>UC 服务地址</span>
      </template>
      <div class="config-row">
        <el-input
          v-model="ucBaseUrl"
          placeholder="如 http://127.0.0.1:8080"
          clearable
          style="flex: 1"
        >
          <template #prepend>Base URL</template>
        </el-input>
        <el-button @click="reloadProfile" style="margin-left: 12px">按当前 token 拉取资料</el-button>
      </div>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="调试说明"
        description="后端已配置 CORS，直连 UC 服务地址即可。UC 接口文档见 .trae/documents/账户邮箱密码登录方式接入文档.md。"
      />
      <!-- OAuth 授权回跳提示：authorize 未登录时跳转到本页，登录成功后换票回跳继续授权 -->
      <el-alert
        v-if="oauthRedirect"
        type="warning"
        :closable="false"
        show-icon
        title="OAuth 授权回跳中"
        description="本页由 UserCenter authorize 跳转而来。若本页已处于登录状态，将直接用现有会话换取 uc_ticket 自动回跳授权页；未登录则登录 / 注册成功后换票回跳（跨站票据方案，不依赖 Cookie）。"
        style="margin-top: 12px"
      />
    </el-card>

    <!-- 登录 / 注册表单（调试用，登录后不隐藏，方便反复测试） -->
    <el-card class="form-card">
      <template #header>
        <span>登录 / 注册</span>
      </template>
      <el-tabs v-model="activeTab">
        <!-- 密码登录 -->
        <el-tab-pane label="密码登录" name="login">
          <el-form label-width="80px" @submit.prevent>
            <el-form-item label="账号">
              <el-input
                v-model="loginForm.account"
                placeholder="邮箱或用户名（迁移用户可用用户名）"
                clearable
                style="max-width: 420px"
              />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="登录密码"
                show-password
                style="max-width: 420px"
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loginLoading" @click="handleLogin">登录</el-button>
              <span class="form-tip">POST /auth/login → 返回 token + uid</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 密码注册 -->
        <el-tab-pane label="密码注册" name="register">
          <el-form label-width="80px" @submit.prevent>
            <el-form-item label="用户名">
              <el-input
                v-model="registerForm.username"
                placeholder="用户名（可选，不填则不传）"
                clearable
                style="max-width: 420px"
              />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input
                v-model="registerForm.email"
                placeholder="邮箱（必填，全局唯一）"
                clearable
                style="max-width: 420px"
              />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="6-32 位，仅数字、字母、@、下划线"
                show-password
                style="max-width: 420px"
              />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input
                v-model="registerForm.nickname"
                placeholder="昵称，不填默认取邮箱"
                clearable
                style="max-width: 420px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="registerLoading" @click="handleRegister">注册</el-button>
              <span class="form-tip">POST /auth/register → 注册即自动登录</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 本地会话（localStorage）展示：确认 token 是否真正落盘 -->
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <span>本地会话（localStorage）</span>
          <el-button size="small" @click="refreshLocalSession">刷新</el-button>
          <el-button size="small" type="danger" plain @click="clearLocalSession">清空本地会话</el-button>
        </div>
      </template>
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="UC_TOKEN">
          <span v-if="localToken" class="token-text">{{ localToken }}</span>
          <el-tag v-else size="small" type="info">（空，尚未登录成功）</el-tag>
          <el-button v-if="localToken" size="small" text @click="copyText(localToken)">复制</el-button>
        </el-descriptions-item>
        <el-descriptions-item label="UC_UID">
          <span v-if="localUid">{{ localUid }}</span>
          <el-tag v-else size="small" type="info">（空）</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 会话信息（登录 / 注册成功后的 LoginVO） -->
    <el-card v-if="session" class="info-card">
      <template #header>
        <div class="card-header">
          <span>会话信息（LoginVO）</span>
          <el-button size="small" type="primary" plain :loading="profileLoading" @click="fetchProfile">获取用户资料 /user/profile</el-button>
          <el-button size="small" type="danger" plain :loading="logoutLoading" @click="handleLogout">登出 /auth/logout</el-button>
        </div>
      </template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="uid">{{ session.uid }}</el-descriptions-item>
        <el-descriptions-item label="nickname">{{ session.nickname }}</el-descriptions-item>
        <el-descriptions-item label="email">{{ session.email || '（未绑定邮箱）' }}</el-descriptions-item>
        <el-descriptions-item label="avatar">
          <el-avatar v-if="session.avatar" :src="session.avatar" :size="24" />
          <span v-else>（无）</span>
        </el-descriptions-item>
        <el-descriptions-item label="token（180 天）" :span="2">
          <span class="token-text">{{ session.token }}</span>
          <el-button size="small" text @click="copyToken">复制</el-button>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 用户资料（UserInfoVO） -->
    <el-card v-if="profile" class="info-card">
      <template #header>
        <span>用户资料（UserInfoVO /user/profile）</span>
      </template>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="uid">{{ profile.uid }}</el-descriptions-item>
        <el-descriptions-item label="email">{{ profile.email || '（未绑定邮箱）' }}</el-descriptions-item>
        <el-descriptions-item label="nickname">{{ profile.nickname }}</el-descriptions-item>
        <el-descriptions-item label="status">
          <el-tag :type="profile.status === 1 ? 'success' : 'danger'">
            {{ profile.status === 1 ? '正常' : `封禁（${profile.status}）` }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="registerTime">{{ profile.registerTime }}</el-descriptions-item>
        <el-descriptions-item label="lastLoginTime">{{ profile.lastLoginTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 请求日志 -->
    <el-card class="log-card">
      <template #header>
        <div class="card-header">
          <span>请求日志（最多 {{ MAX_LOGS }} 条）</span>
          <el-button size="small" @click="clearLogs">清空日志</el-button>
        </div>
      </template>
      <div v-if="logs.length === 0" class="log-empty">暂无请求记录</div>
      <div v-for="(log, index) in logs" :key="index" class="log-item">
        <div class="log-head">
          <el-tag size="small" :type="log.method === 'GET' ? 'info' : 'warning'">{{ log.method }}</el-tag>
          <span class="log-url">{{ log.url }}</span>
          <el-tag size="small" :type="log.success ? 'success' : 'danger'">
            {{ log.success ? 'code ' + log.respCode : '失败' }}
          </el-tag>
        </div>
        <pre class="log-body">请求参数：{{ log.reqText }}\n响应：{{ log.respText }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {createMessage} from "/src/utils/message.js";
import {clearUcSession, getUcToken, getUcUid, setUcSession, ucRequest} from "/src/api/uc/uc-api.js";

// 请求日志最多保留条数
const MAX_LOGS = 20;

/** UC 服务基址：后端已配置 CORS，直接填完整地址直连（如 http://127.0.0.1:8080） */
const ucBaseUrl = ref("http://127.0.0.1:8080");

/** 当前激活的标签页：login / register */
const activeTab = ref("login");

/** 登录表单：账号（邮箱或用户名）+ 密码 */
const loginForm = ref({account: "", password: ""});

/** 注册表单：用户名（可选）+ 邮箱（必填）+ 密码 + 昵称 */
const registerForm = ref({username: "", email: "", password: "", nickname: ""});

/** 登录 / 注册 / 拉取资料 / 登出 的加载状态 */
const loginLoading = ref(false);
const registerLoading = ref(false);
const profileLoading = ref(false);
const logoutLoading = ref(false);

/** 会话信息（LoginVO） */
const session = ref(null);

/** 用户资料（UserInfoVO） */
const profile = ref(null);

/** 请求日志 */
const logs = ref([]);

/** 本地会话展示：UC_TOKEN / UC_UID 的实际落盘值（登录、登出后自动刷新） */
const localToken = ref(getUcToken());
const localUid = ref(getUcUid());

/**
 * OAuth 授权回跳地址：authorize 未登录时会 302 到本页并携带 ?redirect=<authorize完整地址>，
 * 登录成功后换取一次性跨站登录票据（uc_ticket）并回跳该地址继续授权
 */
const oauthRedirect = ref("");

/**
 * 登录 / 注册成功后若处于 OAuth 授权回跳流程：
 * 1. 用刚登录的会话 token 调 POST /oauth2/ticket 换取一次性票据
 * 2. 携带 uc_ticket 回跳 authorize（跨站票据方案，不依赖 Cookie，登录页与 UC 不同域名也可用）
 */
async function redirectIfOAuth() {
    if (!oauthRedirect.value || !getUcToken()) {
        return;
    }
    const url = `${ucBaseUrl.value}/oauth2/ticket`;
    try {
        const resp = await ucRequest({baseUrl: ucBaseUrl.value, method: "POST", url: "/oauth2/ticket"});
        const ticket = resp.data && resp.data.ticket;
        addLog("POST", url, null, resp, true);
        if (!ticket) {
            createMessage({text: "换取登录票据失败：响应中无 ticket", type: "error"});
            return;
        }
        // 携带 uc_ticket 回跳原 authorize 地址；replace 避免票据残留浏览器历史
        const target = new URL(oauthRedirect.value);
        target.searchParams.set("uc_ticket", ticket);
        createMessage({text: "登录成功，已换取票据，正在回跳授权页…", type: "success"});
        window.location.replace(target.toString());
    } catch (e) {
        addLog("POST", url, null, e && e.data ? e.data : e, false);
    }
}

/**
 * 重新读取 localStorage 中的 UC 会话并刷新展示
 */
function refreshLocalSession() {
    localToken.value = getUcToken();
    localUid.value = getUcUid();
}

/**
 * 清空本地 UC 会话（仅清浏览器存储，不调登出接口）
 */
function clearLocalSession() {
    clearUcSession();
    refreshLocalSession();
    createMessage({text: "本地 UC 会话已清空", type: "success"});
}

/**
 * 复制文本到剪贴板
 * @param {string} text 待复制文本
 */
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        createMessage({text: "已复制", type: "success"});
    });
}

/**
 * 追加一条请求日志
 * @param {string} method 请求方法
 * @param {string} url 请求地址
 * @param {object|null} reqData 请求参数
 * @param {object|null} resp 响应体
 * @param {boolean} success 是否业务成功（code===200）
 */
function addLog(method, url, reqData, resp, success) {
    const respCode = resp && resp.code !== undefined ? resp.code : (resp ? "" : "网络错误");
    logs.value.unshift({
        method,
        url,
        reqText: reqData ? JSON.stringify(reqData) : "-",
        respText: resp ? JSON.stringify(resp, null, 2) : "-",
        respCode,
        success,
    });
    if (logs.value.length > MAX_LOGS) {
        logs.value.length = MAX_LOGS;
    }
}

/**
 * 表单基础校验：非空 + 密码规则（6-32 位，数字、字母、@、下划线）
 * @param {string} value 待校验值
 * @param {string} label 字段名，用于错误提示
 * @returns {boolean} 是否通过
 */
function checkField(value, label) {
    if (!value) {
        createMessage({text: `${label}不能为空`, type: "warning"});
        return false;
    }
    return true;
}

/** 校验密码规则 */
function checkPassword(password) {
    if (!/^[A-Za-z0-9@_]{6,32}$/.test(password)) {
        createMessage({text: "密码需为 6-32 位，仅允许数字、字母、@、下划线", type: "warning"});
        return false;
    }
    return true;
}

/**
 * 密码登录：POST /auth/login（accountType=password）
 */
async function handleLogin() {
    const {account, password} = loginForm.value;
    if (!checkField(account, "账号") || !checkField(password, "密码")) {
        return;
    }
    loginLoading.value = true;
    // 邮箱与用户名二选一：账号包含 @ 视为邮箱，否则视为用户名（与文档一致，同时传时优先 username）
    const isEmail = account.includes("@");
    const payload = {accountType: "password", password};
    if (isEmail) {
        payload.email = account;
    } else {
        payload.username = account;
    }
    const url = `${ucBaseUrl.value}/auth/login`;
    try {
        const resp = await ucRequest({baseUrl: ucBaseUrl.value, method: "POST", url: "/auth/login", data: payload});
        const data = resp.data || {};
        setUcSession(data.token, data.uid);
        refreshLocalSession();
        session.value = data;
        profile.value = null;
        addLog("POST", url, payload, resp, true);
        createMessage({text: "登录成功", type: "success"});
        await fetchProfile(); // 登录成功后自动拉取用户资料验证 token
    } catch (e) {
        addLog("POST", url, payload, e && e.data ? e.data : e, false);
    } finally {
        loginLoading.value = false;
        redirectIfOAuth();
    }
}

/**
 * 密码注册：POST /auth/register（registerType=password，注册即自动登录）
 * 邮箱必填；用户名可选（有填才随请求传入，验证 UC 是否开放自助注册）
 */
async function handleRegister() {
    const {username, email, password, nickname} = registerForm.value;
    if (!checkField(email, "邮箱") || !checkField(password, "密码")) {
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        createMessage({text: "邮箱格式不正确", type: "warning"});
        return;
    }
    if (!checkPassword(password)) {
        return;
    }
    registerLoading.value = true;
    const payload = {registerType: "password", email, password, nickname};
    if (username) {
        payload.username = username;
    }
    const url = `${ucBaseUrl.value}/auth/register`;
    try {
        const resp = await ucRequest({baseUrl: ucBaseUrl.value, method: "POST", url: "/auth/register", data: payload});
        const data = resp.data || {};
        setUcSession(data.token, data.uid);
        refreshLocalSession();
        session.value = data;
        profile.value = null;
        addLog("POST", url, payload, resp, true);
        createMessage({text: "注册成功（已自动登录）", type: "success"});
        await fetchProfile();
    } catch (e) {
        addLog("POST", url, payload, e && e.data ? e.data : e, false);
    } finally {
        registerLoading.value = false;
        redirectIfOAuth();
    }
}

/**
 * 获取当前用户资料：GET /user/profile（需登录态）
 */
async function fetchProfile() {
    const token = getUcToken();
    if (!token) {
        createMessage({text: "请先登录", type: "warning"});
        return;
    }
    profileLoading.value = true;
    const url = `${ucBaseUrl.value}/user/profile`;
    try {
        const resp = await ucRequest({baseUrl: ucBaseUrl.value, method: "GET", url: "/user/profile"});
        profile.value = resp.data || null;
        addLog("GET", url, null, resp, true);
    } catch (e) {
        addLog("GET", url, null, e && e.data ? e.data : e, false);
        if (e && e.code === 80001) {
            // token 失效时清掉本地会话
            clearUcSession();
            session.value = null;
            profile.value = null;
        }
    } finally {
        profileLoading.value = false;
    }
}

/**
 * 页面加载时若已有本地 token，则按当前 Base URL 拉取一次资料，恢复会话展示
 */
async function reloadProfile() {
    if (!getUcToken()) {
        createMessage({text: "本地没有 UC token，请先登录", type: "warning"});
        return;
    }
    await fetchProfile();
}

/**
 * 登出：POST /auth/logout，成功后清除本地会话
 */
async function handleLogout() {
    if (!getUcToken()) {
        createMessage({text: "请先登录", type: "warning"});
        return;
    }
    logoutLoading.value = true;
    const url = `${ucBaseUrl.value}/auth/logout`;
    try {
        const resp = await ucRequest({baseUrl: ucBaseUrl.value, method: "POST", url: "/auth/logout"});
        addLog("POST", url, null, resp, true);
        createMessage({text: "登出成功，该 token 已失效", type: "success"});
    } catch (e) {
        addLog("POST", url, null, e && e.data ? e.data : e, false);
    } finally {
        clearUcSession();
        refreshLocalSession();
        session.value = null;
        profile.value = null;
        logoutLoading.value = false;
    }
}

/** 复制当前会话 token 到剪贴板 */
function copyToken() {
    if (!session.value || !session.value.token) {
        return;
    }
    navigator.clipboard.writeText(session.value.token).then(() => {
        createMessage({text: "token 已复制", type: "success"});
    });
}

/** 清空请求日志 */
function clearLogs() {
    logs.value = [];
}

onMounted(async () => {
    // 解析 OAuth 授权回跳参数（authorize 未登录时 302 带 ?redirect=<authorize地址> 跳到本页）
    oauthRedirect.value = new URLSearchParams(window.location.search).get("redirect") || "";
    // 刷新本地会话展示
    refreshLocalSession();
    // 已有本地 token 时尝试恢复会话
    if (getUcToken()) {
        await fetchProfile();
        // 已登录且处于 OAuth 回跳流程：直接用现有会话换票回跳，无需再次手动登录
        if (oauthRedirect.value && getUcToken()) {
            await redirectIfOAuth();
        }
    }
});
</script>

<style scoped>
.uc-login-test-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
}

.uc-login-test-container h2 {
    margin-bottom: 16px;
}

.config-card,
.form-card,
.info-card,
.log-card {
    margin-bottom: 16px;
}

.config-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
}

.form-tip {
    margin-left: 12px;
    color: #999;
    font-size: 12px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.token-text {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
}

.log-empty {
    color: #999;
    text-align: center;
    padding: 16px 0;
}

.log-item {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;
}

.log-head {
    display: flex;
    align-items: center;
    gap: 8px;
}

.log-url {
    flex: 1;
    font-size: 13px;
    word-break: break-all;
}

.log-body {
    margin: 8px 0 0;
    background: #f8f8f8;
    border-radius: 4px;
    padding: 8px;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 240px;
    overflow: auto;
}
</style>
