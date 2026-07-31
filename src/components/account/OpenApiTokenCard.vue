<script setup>
import { computed, onMounted, ref } from "vue";
import userInfoAPI from "/src/api/userInfo";
import { createMessage } from "/src/utils/message";
import { copyTextToClipboard } from "/src/utils/copyText.js";

const READ_PERMISSION_KEY = "operatorDataReadAccess";
const WRITE_PERMISSION_KEY = "operatorDataWriteAccess";

const permissionList = ref([]);
const tokenList = ref([]);
const generatingPermissionKey = ref("");
const isDeletingToken = ref(false);
const isTokenListLoading = ref(true);
const displayTokenList = computed(() => {
  return [...tokenList.value].sort((left, right) => getTokenSortOrder(left.scope) - getTokenSortOrder(right.scope));
});

function getPermissionCode(permissionKey) {
  return permissionList.value.find((permission) => permission.key === permissionKey)?.code;
}

function hasTokenForPermission(permissionKey) {
  const permissionCode = getPermissionCode(permissionKey);
  if (!permissionCode) {
    return false;
  }

  return tokenList.value.some((item) => {
    const scopeCodes = parseScopeCodes(item.scope);
    return scopeCodes.length === 1 && String(scopeCodes[0]) === String(permissionCode);
  });
}

function parseScopeCodes(scope) {
  if (Array.isArray(scope)) {
    return scope;
  }

  try {
    const parsedScope = JSON.parse(scope);
    return Array.isArray(parsedScope) ? parsedScope : [];
  } catch {
    return [];
  }
}

function getScopeDesc(scope) {
  const scopeCodes = parseScopeCodes(scope);
  if (scopeCodes.length === 0) {
    return scope || "未知权限";
  }

  return scopeCodes
    .map((code) => permissionList.value.find((permission) => permission.code === code)?.desc || `权限${code}`)
    .join("、");
}

function getTokenType(scope) {
  const scopeCodes = parseScopeCodes(scope);
  const readCode = getPermissionCode(READ_PERMISSION_KEY);
  const writeCode = getPermissionCode(WRITE_PERMISSION_KEY);

  if (scopeCodes.length === 1 && scopeCodes[0] === readCode) {
    return "只读 Token";
  }

  if (scopeCodes.length === 1 && scopeCodes[0] === writeCode) {
    return "只写 Token";
  }

  return "其他权限 Token";
}

function getTokenSortOrder(scope) {
  const tokenType = getTokenType(scope);
  if (tokenType === "只读 Token") {
    return 0;
  }

  if (tokenType === "只写 Token") {
    return 1;
  }

  return 2;
}

async function fetchPermissions() {
  try {
    const response = await userInfoAPI.getOpenApiPermissions();
    permissionList.value = response.data || [];
  } catch (error) {
    createMessage({ type: "error", text: "获取 Token 权限失败" });
  }
}

async function fetchTokens() {
  isTokenListLoading.value = true;
  try {
    const response = await userInfoAPI.getOpenApiTokens();
    tokenList.value = response.data || [];
  } catch (error) {
    // Token 列表读取失败不影响用户信息页。
  } finally {
    isTokenListLoading.value = false;
  }
}

async function generateToken(permissionKey, tokenType) {
  const permissionCode = getPermissionCode(permissionKey);
  if (!permissionCode) {
    createMessage({ type: "warn", text: `${tokenType}权限暂不可用` });
    return;
  }

  generatingPermissionKey.value = permissionKey;
  try {
    await userInfoAPI.generateOpenApiToken([permissionCode], tokenType);
    createMessage({ type: "success", text: `${tokenType}生成成功` });
    await fetchTokens();
  } catch (error) {
    createMessage({ type: "error", text: `${tokenType}生成失败，请稍后再试` });
  } finally {
    generatingPermissionKey.value = "";
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

async function deleteToken(token) {
  isDeletingToken.value = true;
  try {
    await userInfoAPI.deleteOpenApiToken(token);
    tokenList.value = tokenList.value.filter((item) => item.token !== token);
    createMessage({ type: "success", text: "Token 已删除" });
  } catch (error) {
    createMessage({ type: "error", text: "删除失败，请稍后再试" });
  } finally {
    isDeletingToken.value = false;
  }
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
          text="生成只读 Token"
          :loading="generatingPermissionKey === READ_PERMISSION_KEY"
          :disabled="isTokenListLoading || generatingPermissionKey !== '' || hasTokenForPermission(READ_PERMISSION_KEY)"
          @click="generateToken(READ_PERMISSION_KEY, '只读 Token')"
        ></v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          text="生成只写 Token"
          :loading="generatingPermissionKey === WRITE_PERMISSION_KEY"
          :disabled="isTokenListLoading || generatingPermissionKey !== '' || hasTokenForPermission(WRITE_PERMISSION_KEY)"
          @click="generateToken(WRITE_PERMISSION_KEY, '只写 Token')"
        ></v-btn>
      </div>
      <div class="text-caption opacity-70 mb-4">每种权限仅可保留一个 Token，如需重新生成请先删除原 Token。</div>

      <div v-if="tokenList.length > 0">
        <div class="text-subtitle-2 mb-2">已生成的 Token</div>
        <div class="text-caption text-error mb-3">Token 具有访问您的数据权限，请勿泄露给他人。</div>
        <div v-for="item in displayTokenList" :key="item.token" class="token-entry">
          <div class="flex justify-between align-center mb-1">
            <div>
              <div class="text-body-2">{{ getTokenType(item.scope) }}</div>
              <div class="text-caption opacity-60">权限：{{ getScopeDesc(item.scope) }}</div>
            </div>
            <div class="flex">
              <v-btn size="x-small" color="primary" variant="text" @click="copyToken(item.token)">复制</v-btn>
              <v-btn
                size="x-small"
                color="red"
                variant="text"
                :loading="isDeletingToken"
                @click="deleteToken(item.token)"
              >删除</v-btn>
            </div>
          </div>
          <code class="token-value">{{ item.token }}</code>
        </div>
      </div>
      <div v-else class="text-caption opacity-50 text-center py-4">暂无 Token</div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.token-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.token-entry {
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
}

.token-value {
  display: block;
  overflow-wrap: anywhere;
  font-size: 12px;
  opacity: 0.7;
}
</style>
