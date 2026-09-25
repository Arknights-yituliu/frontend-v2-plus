<script setup>
import { clearUserSession } from "/src/utils/user/userInfo.js";
import UserApiV2 from "/src/api/UserApiV2.js";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

/**
 * 确认退出登录：先请后端双撤（撤销 UC 授权 + 删除本地会话 token），
 * 再清理本地存储（自签 token + UC access_token），最后刷新页面
 */
async function confirmLogout() {
  try {
    await UserApiV2.logout();
  } catch (error) {
    // 会话可能已失效，登出失败不阻塞前端本地清理
    console.error('登出失败', error);
  }
  clearUserSession();
  location.reload();
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="360"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="logout-confirm-card" elevation="0">
      <v-card-title class="logout-confirm-title">退出登录</v-card-title>
      <v-card-text class="logout-confirm-text">
        确定要退出当前账号吗？
      </v-card-text>
      <v-card-actions class="logout-confirm-actions">
        <v-btn
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          取消
        </v-btn>
        <v-btn
          color="error"
          variant="text"
          @click="confirmLogout"
        >
          确定退出
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.logout-confirm-card {
  padding: 24px 24px 18px;
  border: 1px solid rgba(var(--v-border-color), 0.7);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.logout-confirm-title {
  padding: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
}

.logout-confirm-text {
  padding: 0;
  margin-top: 16px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.logout-confirm-actions {
  justify-content: flex-end;
  gap: 4px;
  padding: 22px 0 0;
}
</style>
