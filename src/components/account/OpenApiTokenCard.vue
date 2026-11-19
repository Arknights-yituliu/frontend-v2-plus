<script setup>
import { computed, onMounted, ref } from "vue";
import userInfoAPI from "/src/api/backend/userInfo";
import { listPats, listOAuthScopes, revokePat } from "/src/api/user-center/pat.js";
import { listAkAccounts } from "/src/api/user-center/gameData.js";
import { ensureTclToken } from "/src/utils/user/tclToken.js";
import { createMessage } from "/src/utils/message";
import { copyTextToClipboard } from "/src/utils/copyText.js";

// 新 PAT 只提供干员读取；保留历史令牌的权限展示。
const READ_SCOPE = "arknights-data.read";
const WRITE_SCOPE = "gama-data.write";
// 生成的 Token 有效期（秒），10 年
const TOKEN_EXPIRES_IN = 315360000;

const permissionList = ref([]);
const gameAccounts = ref([]);
const selectedGameUid = ref("");
const isAccountsLoading = ref(true);
const accountLoadError = ref("");
const accountOptions = computed(() => gameAccounts.value.map((account) => ({
  title: `游戏账号 UID ${account.akUid}`,
  value: String(account.akUid),
})));
const tokenList = ref([]);
const hasTokenForSelectedAccount = computed(() => selectedGameUid.value !== "" && tokenList.value.some((item) => {
  const gameUid = item.payload?.game_uid ?? item.payload?.gameUid;
  return String(gameUid ?? "") === selectedGameUid.value;
}));
const generatingScope = ref("");
const isTokenListLoading = ref(true);
// 待删除的令牌记录；非空时展示删除确认弹窗
const pendingDeleteToken = ref(null);
// 删除请求进行中标记，避免重复提交
const isDeleting = ref(false);
// 权限标识 → 中文描述映射，来自用户中心在线权限列表
const scopeDescMap = computed(() => {
  const map = {};
  permissionList.value.forEach((permission) => {
    map[permission.code] = permission.desc;
  });
  return map;
});
const displayTokenList = computed(() => {
  return [...tokenList.value].sort((left, right) => getTokenSortOrder(left.scope) - getTokenSortOrder(right.scope));
});

/**
 * 解析 Token 的 scope 为字符串数组
 * 兼容数组、JSON 字符串以及英文逗号分隔字符串
 * @param {*} scope scope 原始值
 * @returns {string[]} scope 字符串数组
 */
function parseScope(scope) {
  if (Array.isArray(scope)) {
    return scope.map(String);
  }

  if (typeof scope !== "string" || scope === "") {
    return [];
  }

  try {
    const parsedScope = JSON.parse(scope);
    if (Array.isArray(parsedScope)) {
      return parsedScope.map(String);
    }
  } catch {
    // 非 JSON，按逗号分隔处理
  }

  return scope
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 获取 scope 对应的展示文案
 * @param {*} scope Token 的 scope
 * @returns {string} 展示文案
 */
function getScopeDesc(scope) {
  const scopes = parseScope(scope);
  if (scopes.length === 0) {
    return "未知权限";
  }

  return scopes.map((item) => scopeDescMap.value[item] || "未知权限").join("、");
}

/**
 * 获取 Token 的排序权重：只读 -> 只写 -> 其他
 * @param {*} scope Token 的 scope
 * @returns {number} 排序权重
 */
function getTokenSortOrder(scope) {
  const scopes = parseScope(scope);
  if (scopes.length === 1 && scopes[0] === READ_SCOPE) {
    return 0;
  }

  if (scopes.length === 1 && scopes[0] === WRITE_SCOPE) {
    return 1;
  }

  return 2;
}

/**
 * 在线拉取平台可配置的授权范围列表（公开接口，无需登录）
 * 仅用于渲染 PAT 列表中的权限描述
 */
async function fetchPermissions() {
  try {
    permissionList.value = (await listOAuthScopes()) || [];
  } catch (error) {
    // 权限列表读取失败时显示未知权限，不影响生成按钮
  }
}

/**
 * 拉取当前用户在本应用名下的 PAT 列表
 * 用 TCL access_token 认证（tclService 拦截器自动附加）；本地无令牌时先兑换一次
 */
async function fetchTokens() {
  isTokenListLoading.value = true;
  try {
    await ensureTclToken();
    tokenList.value = (await listPats()) || [];
  } catch (error) {
    // Token 列表读取失败不影响用户信息页
  } finally {
    isTokenListLoading.value = false;
  }
}

/**
 * 生成第三方 Token
 * 调用后端 PAT 签发接口，固定账号与只读权限，有效期为 10 年
 * 签发成功后重新拉取用户中心列表以展示新令牌
 * @param {string} scope 权限范围标识（arknights-data.read）
 * @param {string} tokenType Token 类型文案，用于提示与名称
 */
async function generateToken(scope, tokenType) {
  const account = gameAccounts.value.find((item) => String(item.akUid) === selectedGameUid.value);
  if (!account || generatingScope.value) {
    if (!account) createMessage({type: "warn", text: "请先选择游戏账号"});
    return;
  }
  if (isTokenListLoading.value || isAccountsLoading.value || hasTokenForSelectedAccount.value) return;
  generatingScope.value = scope;
  try {
    if (!await ensureTclToken()) throw new Error("未登录");
    await userInfoAPI.generateOpenApiPat(TOKEN_EXPIRES_IN, scope, tokenType, {
      game_uid: String(account.akUid),
      game_name: "明日方舟",
      source: account.source,
    });
    createMessage({ type: "success", text: `${tokenType}生成成功` });
    await fetchTokens();
  } catch (error) {
    createMessage({ type: "error", text: `${tokenType}生成失败，请稍后再试` });
  } finally {
    generatingScope.value = "";
  }
}

function copyToken(token) {
  if (!token) {
    return;
  }

  copyTextToClipboard(token, () => {
    createMessage({ type: "success", text: "已复制到剪贴板" });
  });
}

/**
 * 打开删除确认弹窗
 * @param {Object} item 待删除的令牌记录
 */
function openDeleteConfirm(item) {
  pendingDeleteToken.value = item;
}

/**
 * 关闭删除确认弹窗
 */
function closeDeleteConfirm() {
  pendingDeleteToken.value = null;
}

/**
 * 确认删除令牌：调用用户中心吊销接口，成功后重新拉取列表
 * 令牌立即失效并从列表移除
 */
async function confirmDeleteToken() {
  const target = pendingDeleteToken.value;
  if (!target || isDeleting.value) {
    return;
  }

  isDeleting.value = true;
  try {
    await revokePat(target.token);
    createMessage({ type: "success", text: "Token 已删除" });
    closeDeleteConfirm();
    await fetchTokens();
  } catch (error) {
    createMessage({ type: "error", text: "删除失败，请稍后再试" });
  } finally {
    isDeleting.value = false;
  }
}

/**
 * 判断 Token 是否已过期（剩余秒数 ≤0）
 * @param {Object} item 令牌记录
 * @returns {boolean} 是否已过期
 */
function isExpired(item) {
  return Number(item.expiresInSeconds) <= 0;
}

/**
 * 格式化令牌剩余有效期
 * @param {Object} item 令牌记录
 * @returns {string} 剩余有效期文案
 */
function getRemainText(item) {
  const seconds = Number(item.expiresInSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "已过期";
  }

  const days = Math.floor(seconds / 86400);
  if (days >= 1) {
    return `剩余 ${days} 天`;
  }

  const hours = Math.floor(seconds / 3600);
  return hours >= 1 ? `剩余 ${hours} 小时` : `剩余 ${Math.floor(seconds / 60)} 分钟`;
}

/** 新 PAT 强制绑定森空岛账号；手动来源不满足 PAT 消费端的绑定校验。 */
async function fetchAccounts() {
  isAccountsLoading.value = true;
  accountLoadError.value = "";
  try {
    if (!await ensureTclToken()) throw new Error("未登录");
    const accounts = await listAkAccounts();
    gameAccounts.value = (accounts || []).filter((item) => item.source === "skland" && item.akUid);
    if (!gameAccounts.value.some((item) => String(item.akUid) === selectedGameUid.value)) {
      selectedGameUid.value = gameAccounts.value.length ? String(gameAccounts.value[0].akUid) : "";
    }
  } catch (error) {
    gameAccounts.value = [];
    selectedGameUid.value = "";
    accountLoadError.value = "游戏账号读取失败，请刷新页面后重试";
  } finally {
    isAccountsLoading.value = false;
  }
}

function getTokenAccountText(item) {
  const gameUid = item.payload?.game_uid ?? item.payload?.gameUid;
  if (gameUid) return `游戏账号 UID ${gameUid}`;
  return String(item.token || "").startsWith("tlc_pat_")
    ? "未指定账号，无法读取干员数据" : "历史令牌：沿用默认数据来源";
}

onMounted(async () => {
  await Promise.all([fetchPermissions(), fetchTokens(), fetchAccounts()]);
});
</script>

<template>
  <v-card class="open-api-token-card" title="第三方 API PAT">
    <v-card-text>
      <p class="text-caption opacity-70 mb-2">
        PAT 用于在一图流网站之外读取指定游戏账号的干员数据，撤销后立即失效。
      </p>
      <p class="text-caption opacity-70 mb-4">
        当前 PAT 消费接口仅支持读取干员数据，不提供写入接口。历史令牌仍可查看和撤销。
      </p>
      <p class="text-caption opacity-70 mb-4">
        新 PAT 在签发时固定游戏账号，读取时不传 akUid；如需切换账号，请重新签发 PAT。
      </p>

      <v-select
        v-model="selectedGameUid"
        :items="accountOptions"
        item-title="title"
        item-value="value"
        label="PAT 读取的游戏账号"
        :loading="isAccountsLoading"
        :disabled="isAccountsLoading || generatingScope !== ''"
        :error-messages="accountLoadError"
        hide-details="auto"
        class="mb-4"
      ></v-select>
      <p v-if="!isAccountsLoading && !accountLoadError && accountOptions.length === 0" class="text-caption mb-4">
        请先在「我的干员」导入森空岛账号；新 PAT 暂不支持手动数据来源。
      </p>
      <div class="token-actions">
        <v-btn
          color="primary"
          variant="elevated"
          text="生成干员只读 PAT"
          :loading="generatingScope === READ_SCOPE"
          :disabled="isTokenListLoading || isAccountsLoading || !selectedGameUid || generatingScope !== '' || hasTokenForSelectedAccount"
          @click="generateToken(READ_SCOPE, '干员数据只读 PAT')"
        ></v-btn>
      </div>
      <div v-if="!isTokenListLoading && hasTokenForSelectedAccount" class="text-caption opacity-70 mb-4">
        该游戏账号已有 PAT，请先撤销后重新签发。
      </div>

      <div v-if="isTokenListLoading" class="token-empty">
        <v-progress-circular indeterminate size="22" width="2" color="primary"></v-progress-circular>
        <span class="ml-2">加载中…</span>
      </div>
      <template v-else-if="tokenList.length > 0">
        <div class="token-section-head">
          <v-icon icon="mdi-key-variant" size="18" color="primary"></v-icon>
          <span class="text-subtitle-2">已生成的 Token</span>
          <v-chip size="x-small" variant="tonal" color="primary">{{ tokenList.length }}</v-chip>
        </div>
        <div class="token-warning">
          <v-icon icon="mdi-shield-alert-outline" size="14"></v-icon>
          <span>Token 具有访问您的数据权限，请勿泄露给他人。</span>
        </div>
        <div
          v-for="item in displayTokenList"
          :key="item.id"
          class="token-entry"
          :class="{ 'token-entry--expired': isExpired(item) }"
        >
          <div class="token-entry__head">
            <div class="token-entry__icon">
              <v-icon :icon="isExpired(item) ? 'mdi-key-remove' : 'mdi-key-outline'" size="20"></v-icon>
            </div>
            <div class="token-entry__title">
              <div class="token-entry__title-main">
                <span>{{ item.name || "未命名 Token" }}</span>
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="isExpired(item) ? 'error' : 'success'"
                >
                  {{ isExpired(item) ? "已过期" : "有效" }}
                </v-chip>
              </div>
              <code class="token-entry__token">{{ item.token }}</code>
              <div class="text-caption">{{ getTokenAccountText(item) }}</div>
              <div class="token-entry__title-sub">
                <v-icon icon="mdi-shield-key-outline" size="13"></v-icon>
                <span>权限：{{ getScopeDesc(item.scope) }}</span>
              </div>
              <div
                class="token-entry__title-sub"
                :class="{ 'token-entry__remain--expired': isExpired(item) }"
              >
                <v-icon icon="mdi-clock-outline" size="13"></v-icon>
                <span>{{ getRemainText(item) }}</span>
              </div>
            </div>
            <div class="token-entry__actions">
              <v-btn
                color="primary"
                variant="text"
                prepend-icon="mdi-content-copy"
                @click="copyToken(item.token)"
              >
                复制
              </v-btn>
              <v-btn
                color="error"
                variant="text"
                prepend-icon="mdi-delete-outline"
                @click="openDeleteConfirm(item)"
              >
                删除
              </v-btn>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="token-empty">
        <v-icon icon="mdi-key-off-outline" size="22"></v-icon>
        <span class="ml-2">暂无 Token</span>
      </div>
    </v-card-text>

    <v-dialog
      :model-value="pendingDeleteToken !== null"
      max-width="360"
      @update:model-value="!$event && closeDeleteConfirm()"
    >
      <v-card class="token-delete-card" elevation="0">
        <v-card-title class="token-delete-title">删除 Token</v-card-title>
        <v-card-text class="token-delete-text">
          删除后该 Token 立即失效且无法恢复，确定要删除
          「{{ pendingDeleteToken?.name || "未命名 Token" }}」吗？
        </v-card-text>
        <v-card-actions class="token-delete-actions">
          <v-btn variant="text" :disabled="isDeleting" @click="closeDeleteConfirm">取消</v-btn>
          <v-btn color="error" variant="text" :loading="isDeleting" @click="confirmDeleteToken">确定删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.token-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.token-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.token-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  line-height: 1.4;
  color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.08);
  border-radius: 8px;
}

.token-entry {
  padding: 14px 16px;
  margin-bottom: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.token-entry:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: 0 2px 10px rgba(var(--v-theme-on-surface), 0.08);
}

.token-entry--expired {
  background: rgba(var(--v-theme-error), 0.04);
  border-color: rgba(var(--v-theme-error), 0.28);
}

.token-entry--expired:hover {
  border-color: rgba(var(--v-theme-error), 0.5);
  box-shadow: 0 2px 10px rgba(var(--v-theme-error), 0.12);
}

.token-entry__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.token-entry__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 10px;
}

.token-entry--expired .token-entry__icon {
  color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.12);
}

.token-entry__title {
  flex: 1;
  min-width: 0;
}

.token-entry__title-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.token-entry__token {
  display: block;
  margin-top: 5px;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.55;
}

.token-entry__title-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.62;
}

.token-entry__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
}

.token-entry__remain--expired {
  color: rgb(var(--v-theme-error));
  opacity: 1;
}

.token-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  font-size: 12px;
  opacity: 0.5;
}

.token-delete-card {
  padding: 24px 24px 18px;
  border: 1px solid rgba(var(--v-border-color), 0.7);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.token-delete-title {
  padding: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
}

.token-delete-text {
  padding: 0;
  margin-top: 16px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.token-delete-actions {
  justify-content: flex-end;
  gap: 4px;
  padding: 22px 0 0;
}
</style>
