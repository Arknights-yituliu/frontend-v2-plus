<script setup>
import { computed, onMounted, ref } from "vue";
import userInfoAPI from "/src/api/backend/userInfo";
import { listCustomTokens, listOAuthScopes, revokeCustomToken } from "/src/api/user-center/oauthToken.js";
import { ensureUcToken } from "/src/utils/user/ucToken.js";
import { createMessage } from "/src/utils/message";
import { copyTextToClipboard } from "/src/utils/copyText.js";

// 用户中心权限范围标识：只读 / 只写
const READ_SCOPE = "gama-data.read";
const WRITE_SCOPE = "gama-data.write";
// 本卡片只提供只读 / 只写两种 Token，其余权限不在此生成
const SCOPE_TOKEN_LABELS = {
  [READ_SCOPE]: "只读 Token",
  [WRITE_SCOPE]: "只写 Token",
};
// 生成的 Token 有效期（秒），10 年
const TOKEN_EXPIRES_IN = 315360000;

const permissionList = ref([]);
const tokenList = ref([]);
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
 * 判断某权限是否在用户中心在线权限列表中（用于控制生成按钮可用性）
 * 权限列表尚未加载时不做限制，避免网络异常导致按钮全部不可用
 * @param {string} scope 权限标识
 * @returns {boolean} 是否可生成
 */
function hasScopePermission(scope) {
  if (permissionList.value.length === 0) {
    return true;
  }

  return permissionList.value.some((permission) => permission.code === scope);
}

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
 * 判断是否已存在指定 scope 的未过期 Token
 * @param {string} scope 权限范围标识
 * @returns {boolean} 是否已存在
 */
function hasTokenForScope(scope) {
  return tokenList.value.some((item) => {
    const scopes = parseScope(item.scope);
    return scopes.length === 1 && scopes[0] === scope && Number(item.expiresInSeconds) > 0;
  });
}

/**
 * 获取 scope 对应的展示文案
 * @param {*} scope Token 的 scope
 * @returns {string} 展示文案
 */
function getScopeDesc(scope) {
  const scopes = parseScope(scope);
  if (scopes.length === 0) {
    return scope || "未知权限";
  }

  return scopes.map((item) => scopeDescMap.value[item] || item).join("、");
}

/**
 * 获取 Token 类型文案
 * @param {*} scope Token 的 scope
 * @returns {string} 类型文案
 */
function getTokenType(scope) {
  const scopes = parseScope(scope);
  if (scopes.length === 1) {
    return SCOPE_TOKEN_LABELS[scopes[0]] || "其他权限 Token";
  }

  return "其他权限 Token";
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
 * 用于渲染权限中文描述并按后端实际支持情况控制生成按钮可用性
 */
async function fetchPermissions() {
  try {
    permissionList.value = (await listOAuthScopes()) || [];
  } catch (error) {
    // 权限列表读取失败时降级：不回显描述、不限制生成按钮
  }
}

/**
 * 拉取当前用户在用户中心的自定义令牌列表
 * 用 UC access_token 认证（ucService 拦截器自动附加）；本地无令牌时先兑换一次
 */
async function fetchTokens() {
  isTokenListLoading.value = true;
  try {
    await ensureUcToken();
    tokenList.value = (await listCustomTokens()) || [];
  } catch (error) {
    // Token 列表读取失败不影响用户信息页
  } finally {
    isTokenListLoading.value = false;
  }
}

/**
 * 生成第三方 Token
 * 调用后端转发直签接口，scope 映射为只读 / 只写，有效期为 10 年
 * 签发成功后重新拉取用户中心列表以展示新令牌
 * @param {string} scope 权限范围标识（gama-data.read / gama-data.write）
 * @param {string} tokenType Token 类型文案，用于提示与名称
 */
async function generateToken(scope, tokenType) {
  generatingScope.value = scope;
  try {
    await userInfoAPI.generateOpenApiToken(TOKEN_EXPIRES_IN, scope, tokenType);
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
    await revokeCustomToken(target.token);
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

onMounted(async () => {
  await fetchPermissions();
  await fetchTokens();
});
</script>

<template>
  <v-card class="open-api-token-card" title="第三方 API Token">
    <v-card-text>
      <p class="text-caption opacity-70 mb-2">
        第三方token用于在一图流网站之外直接读取或写入您的数据，更换token原token即失效
      </p>
      <p class="text-caption opacity-70 mb-4">
        只读 Token 用于读取干员练度数据，只写 Token 仅用于写入干员练度数据。
      </p>

      <div class="token-actions">
        <v-btn
          color="primary"
          variant="elevated"
          text="生成读取用户游戏数据Token"
          :loading="generatingScope === READ_SCOPE"
          :disabled="isTokenListLoading || generatingScope !== '' || hasTokenForScope(READ_SCOPE) || !hasScopePermission(READ_SCOPE)"
          @click="generateToken(READ_SCOPE, '用户游戏数据只读 Token')"
        ></v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          text="生成写入用户游戏数据Token"
          :loading="generatingScope === WRITE_SCOPE"
          :disabled="isTokenListLoading || generatingScope !== '' || hasTokenForScope(WRITE_SCOPE) || !hasScopePermission(WRITE_SCOPE)"
          @click="generateToken(WRITE_SCOPE, '用户游戏数据只写 Token')"
        ></v-btn>
      </div>
      <div class="text-caption opacity-70 mb-4">每种权限仅可保留一个 Token，如需重新生成请先删除原 Token。</div>

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
                <span>{{ getTokenType(item.scope) }}</span>
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="isExpired(item) ? 'error' : 'success'"
                >
                  {{ isExpired(item) ? "已过期" : "有效" }}
                </v-chip>
              </div>
              <code class="token-entry__token">{{ item.token }}</code>
              <div class="token-entry__title-sub">
                <v-icon icon="mdi-shield-key-outline" size="13"></v-icon>
                <span>权限：{{ getScopeDesc(item.scope) }}</span>
                <span
                  class="token-entry__remain"
                  :class="{ 'token-entry__remain--expired': isExpired(item) }"
                >
                  <v-icon icon="mdi-clock-outline" size="13"></v-icon>
                  <span>{{ getRemainText(item) }}</span>
                </span>
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
          「{{ getTokenType(pendingDeleteToken?.scope) }}」吗？
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

.token-entry__remain {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 10px;
  padding-left: 10px;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.2);
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
