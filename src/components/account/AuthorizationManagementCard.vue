<script setup>
import { computed, onMounted, ref } from "vue";
import {
  getCurrentOAuthGrantScopes,
  grantCurrentOAuthScopes,
  revokeCurrentOAuthScopes,
} from "/src/api/userCenterApi.js";
import { createMessage } from "/src/utils/message.js";
import { ensureUcToken } from "/src/utils/user/ucToken.js";

const scopeInfo = ref(null);
const selectedScopes = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);

const scopeOptions = computed(() => {
  const selectableScopes = scopeInfo.value?.selectableScopes || [];
  const grantedScopes = scopeInfo.value?.grantedScopes || [];
  const options = [];
  const seen = new Set();

  for (const scope of [...selectableScopes, ...grantedScopes]) {
    const code = String(scope?.code || "").trim();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    options.push({
      code,
      desc: scope?.desc || code,
      legacy: !selectableScopes.some((item) => item?.code === code),
    });
  }

  return options;
});

function getScopeCodes(scopes) {
  return (scopes || [])
    .map((scope) => String(scope?.code || "").trim())
    .filter(Boolean);
}

async function ensureAuthorization() {
  const token = await ensureUcToken();
  if (!token) {
    createMessage({ type: "error", text: "用户中心授权已失效，请重新登录" });
    return false;
  }
  return true;
}

async function fetchScopes() {
  if (!(await ensureAuthorization())) {
    isLoading.value = false;
    return;
  }

  try {
    scopeInfo.value = await getCurrentOAuthGrantScopes();
    selectedScopes.value = getScopeCodes(scopeInfo.value?.grantedScopes);
  } catch {
    // 请求拦截器已展示接口返回的具体错误。
  } finally {
    isLoading.value = false;
  }
}

async function saveScopes() {
  if (!scopeInfo.value || selectedScopes.value.length === 0 || !(await ensureAuthorization())) {
    return;
  }

  const originalScopes = new Set(getScopeCodes(scopeInfo.value.grantedScopes));
  const nextScopes = new Set(selectedScopes.value);
  const addedScopes = [...nextScopes].filter((scope) => !originalScopes.has(scope));
  const removedScopes = [...originalScopes].filter((scope) => !nextScopes.has(scope));

  if (addedScopes.length === 0 && removedScopes.length === 0) {
    return;
  }

  isSaving.value = true;
  try {
    // 先追加再取消，避免取消阶段的中间权限集合为空。
    if (addedScopes.length > 0) {
      await grantCurrentOAuthScopes(addedScopes);
    }
    if (removedScopes.length > 0) {
      await revokeCurrentOAuthScopes(removedScopes);
    }
    scopeInfo.value = await getCurrentOAuthGrantScopes();
    selectedScopes.value = getScopeCodes(scopeInfo.value?.grantedScopes);
    createMessage({ type: "success", text: "本站授权权限已更新" });
  } catch {
    // 请求拦截器已展示接口返回的具体错误。
  } finally {
    isSaving.value = false;
  }
}

onMounted(fetchScopes);
</script>

<template>
  <v-card class="authorization-management-card" title="本站授权管理">
    <v-card-text>
      <p class="text-caption opacity-70 mb-4">
        管理本站访问您数据的权限，权限调整会立即作用于本站已签发的令牌。
      </p>

      <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-4"></v-progress-linear>

      <template v-else-if="scopeInfo">
        <div class="scope-list">
          <v-checkbox
            v-for="scope in scopeOptions"
            :key="scope.code"
            v-model="selectedScopes"
            :value="scope.code"
            color="primary"
            density="compact"
            hide-details
          >
            <template #label>
              <span>{{ scope.desc }}</span>
              <code class="scope-code">{{ scope.code }}</code>
              <span v-if="scope.legacy" class="text-caption opacity-60">（历史权限）</span>
            </template>
          </v-checkbox>
        </div>
        <div v-if="selectedScopes.length === 0" class="text-caption text-error mt-3">
          应用至少保留一项权限。
        </div>
        <div class="authorization-actions">
          <v-btn
            color="primary"
            variant="elevated"
            :loading="isSaving"
            :disabled="selectedScopes.length === 0"
            @click="saveScopes"
          >
            保存权限
          </v-btn>
        </div>
      </template>
      <div v-else class="text-caption opacity-50 text-center py-4">暂无可管理的授权权限</div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.scope-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scope-code {
  margin-left: 8px;
  opacity: 0.6;
  font-size: 12px;
}

.authorization-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
