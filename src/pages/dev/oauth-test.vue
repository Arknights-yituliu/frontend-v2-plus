<template>
  <div class="oauth-test-container">
    <h2>OAuth2 授权登录接入验证（后端换 token 形态）</h2>

    <!-- 接入方后端配置 -->
    <el-card class="config-card">
      <template #header>
        <span>接入方后端配置</span>
      </template>
      <div class="config-row">
        <el-input v-model="backendConfig.backendBaseUrl" placeholder="如 http://localhost:10010" clearable style="flex: 1">
          <template #prepend>BackEnd Base URL</template>
        </el-input>
      </div>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="联调说明"
        description="client_secret、redirect_uri、scope、frontend-redirect-url 等敏感/回调配置均在接入方后端（BackEndV3 的 user-center.oauth 配置）持有，前端不接触密钥。流程：① 调 GET /user/oauth2/login 发起授权（后端生成 state + PKCE 并缓存 code_verifier）→ ② 跳转 authorizeUrl → ③ UC 授权后 302 回后端 /oauth/callback 换 token 建本地会话 → ④ 后端按 frontend-redirect-url 302 回跳本页并携带 token。"
      />
    </el-card>

    <!-- 授权流程区 -->
    <el-card class="flow-card">
      <template #header>
        <span>授权流程</span>
      </template>
      <div class="flow-row">
        <el-button type="primary" :disabled="!backendConfig.backendBaseUrl" @click="startOAuth">
          ① 调后端 /user/oauth2/login 发起授权
        </el-button>
      </div>

      <!-- 最近一次授权链接（后端返回的 authorizeUrl，含 state） -->
      <div v-if="lastAuthorizeUrl" class="callback-box" style="margin-top: 12px">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="state（本次授权，防 CSRF）">
            <span class="token-text">{{ lastState || '（未能解析）' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="授权地址（authorizeUrl）">
            <span class="token-text">{{ lastAuthorizeUrl }}</span>
            <el-button size="small" text @click="copyText(lastAuthorizeUrl)">复制</el-button>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 回跳/回调信息 -->
      <div v-if="callbackToken || authError" class="callback-box" style="margin-top: 12px">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="回调结果">
            <span v-if="authError" class="error-text">{{ authError }}</span>
            <template v-else>授权成功，后端已换 token 并回跳携带本地会话（见下方）</template>
          </el-descriptions-item>
          <el-descriptions-item v-if="callbackToken" label="token（回调携带）">
            <span class="token-text">{{ callbackToken }}</span>
            <el-button size="small" text @click="copyText(callbackToken)">复制</el-button>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <!-- 本地会话（token 由后端签发） -->
    <el-card v-if="localToken" class="info-card">
      <template #header>
        <div class="card-header">
          <span>本地会话 token（后端签发）</span>
          <el-button size="small" type="primary" plain :loading="userInfoLoading" @click="fetchUserInfo">按 token 查用户信息</el-button>
        </div>
      </template>
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="token">
          <span class="token-text">{{ localToken }}</span>
          <el-button size="small" text @click="copyText(localToken)">复制</el-button>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 用户信息区 -->
    <el-card v-if="userInfo" class="info-card">
      <template #header>
        <span>用户信息（GET /user/info?token=）</span>
      </template>
      <pre class="userinfo-body">{{ JSON.stringify(userInfo, null, 2) }}</pre>
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
import axios from "axios";
import {createMessage} from "/src/utils/message.js";
import {fetchUserByToken, getOAuthToken, setOAuthToken} from "/src/api/uc/oauth.js";

// 请求日志最多保留条数
const MAX_LOGS = 20;

/** 接入方后端（BackEndV3）配置：client_secret、redirect_uri 等敏感信息都在后端持有，前端只调后端接口 */
const backendConfig = ref({
    // 接入方后端基址（发起授权、换 token、建本地会话都在这里完成）
    backendBaseUrl: "http://127.0.0.1:10010",
});

/** 授权回调结果（后端 /oauth/callback 按 frontend-redirect-url 302 回跳携带的 token，或授权失败信息） */
const callbackToken = ref("");
const authError = ref("");

/** 最近一次授权链接与其中的 state（发起授权后展示，便于核对防 CSRF 参数） */
const lastAuthorizeUrl = ref("");
const lastState = ref("");

/** 本地会话 token（后端签发） */
const localToken = ref("");

/** 用户信息 */
const userInfo = ref(null);
const userInfoLoading = ref(false);

/** 请求日志 */
const logs = ref([]);

/**
 * ① 调接入方后端发起 OAuth2 授权：GET /user/oauth2/login
 * 后端生成 state + PKCE（code_verifier 缓存在后端 Redis），返回 authorizeUrl
 * （redirect_uri 指向后端 /oauth/callback，前端不接触 code）
 */
async function startOAuth() {
    const {backendBaseUrl} = backendConfig.value;
    const url = `${backendBaseUrl}/user/oauth2/login`;
    try {
        const resp = await axios.get(url, {timeout: 15000});
        const body = resp.data;
        if (body && body.code === 200 && body.data && body.data.authorizeUrl) {
            // 记录本次授权链接并解析其中的 state，供界面展示核对
            lastAuthorizeUrl.value = body.data.authorizeUrl;
            lastState.value = "";
            try {
                lastState.value = new URL(body.data.authorizeUrl).searchParams.get("state") || "";
            } catch (e) {
                // URL 解析失败时忽略，仅展示原始链接
            }
            addLog("GET", url, null, body, true);
            // 授权完成后 UC 302 回后端 /oauth/callback，后端换 token 建本地会话后按配置回跳前端
            window.location.href = body.data.authorizeUrl;
        } else {
            const msg = (body && body.msg) || "发起授权失败";
            createMessage({text: msg, type: "error"});
            addLog("GET", url, null, body, false);
        }
    } catch (e) {
        addLog("GET", url, null, e && e.response ? e.response.data : e, false);
        handleRequestError(e);
    }
}

/**
 * 按本地会话 token 获取用户信息（统一走 /src/api/uc/oauth.js 的 fetchUserByToken，默认后端为 DOMAIN）
 */
async function fetchUserInfo() {
    if (!localToken.value) {
        createMessage({text: "没有本地会话 token，请先授权登录", type: "warning"});
        return;
    }
    userInfoLoading.value = true;
    const url = "/user/info?token=" + encodeURIComponent(localToken.value);
    try {
        const data = await fetchUserByToken(localToken.value);
        userInfo.value = data;
        addLog("GET", url, {token: localToken.value}, {code: 200, msg: "操作成功", data}, true);
    } catch (e) {
        addLog("GET", url, {token: localToken.value}, e && e.response ? e.response.data : e, false);
    } finally {
        userInfoLoading.value = false;
    }
}

/**
 * 统一网络错误提示
 * @param {object} error axios 错误对象
 */
function handleRequestError(error) {
    let msg = "网络错误";
    if (error.response) {
        msg = `HTTP ${error.response.status}`;
    } else if (error.code === "ECONNABORTED") {
        msg = "请求超时";
    } else if (error.message) {
        msg = error.message;
    }
    createMessage({text: msg, type: "error"});
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

/** 清空请求日志 */
function clearLogs() {
    logs.value = [];
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

onMounted(() => {
    // 解析后端 /oauth/callback 302 回跳携带的参数（?token=xxx 或 ?error=xxx）
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
        authError.value = `授权失败：${error}`;
        createMessage({text: `授权失败：${error}`, type: "error"});
    }
    const token = params.get("token");
    if (token) {
        callbackToken.value = token;
        localToken.value = token;
        setOAuthToken(token);
        createMessage({text: "授权成功，已获取本地会话 token", type: "success"});
        // 清理 URL 中的 token，避免刷新页面重复处理
        history.replaceState({}, "", window.location.pathname);
    }

    // 恢复本地保存的 token（调试用）
    const savedToken = getOAuthToken();
    if (savedToken) {
        localToken.value = savedToken;
    }
});
</script>

<style scoped>
.oauth-test-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
}

.oauth-test-container h2 {
    margin-bottom: 16px;
}

.config-card,
.flow-card,
.info-card,
.log-card {
    margin-bottom: 16px;
}

.config-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
}

.flow-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.callback-box {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 8px;
}

.error-text {
    color: #f56c6c;
}

.token-text {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
}

.userinfo-body {
    margin: 8px 0 0;
    background: #f8f8f8;
    border-radius: 4px;
    padding: 8px;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 320px;
    overflow: auto;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
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
