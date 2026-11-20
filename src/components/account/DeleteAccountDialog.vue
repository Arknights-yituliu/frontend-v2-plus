<script setup>
import {computed, onBeforeUnmount, ref, watch} from "vue";
import {clearUserSession} from "/src/api/user-center/userSession.js";
import UserApiV2 from "/src/api/backend/UserApiV2.js";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["update:modelValue"]);

const code = ref("");
const acknowledged = ref(false);
const sending = ref(false);
const deleting = ref(false);
const countdown = ref(0);
const feedback = ref("");
const feedbackType = ref("info");
const busy = computed(() => sending.value || deleting.value);
const canDelete = computed(() => acknowledged.value && /^[0-9]{6}$/.test(code.value.trim()));
let countdownTimer;

watch(() => props.modelValue, (open) => {
  if (open) {
    code.value = "";
    acknowledged.value = false;
    feedback.value = "";
  }
});

onBeforeUnmount(() => clearInterval(countdownTimer));

function updateOpen(open) {
  if (!busy.value) emit("update:modelValue", open);
}

function showError(error, fallback) {
  feedbackType.value = "error";
  feedback.value = error?.msg || error?.data?.msg || fallback;
}

async function sendCode() {
  if (busy.value || countdown.value > 0) return;
  sending.value = true;
  feedback.value = "";
  try {
    await UserApiV2.sendAccountDeletionCode();
    feedbackType.value = "success";
    feedback.value = "注销验证码已发送至当前账户绑定邮箱，请查收。";
    countdown.value = 60;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) clearInterval(countdownTimer);
    }, 1000);
  } catch (error) {
    showError(error, "验证码发送失败，请稍后重试。");
  } finally {
    sending.value = false;
  }
}

async function confirmDeletion() {
  if (busy.value || !canDelete.value) return;
  deleting.value = true;
  feedback.value = "";
  try {
    await UserApiV2.deleteAccount(code.value.trim());
  } catch (error) {
    showError(error, "账户注销失败，请稍后重试。");
    deleting.value = false;
    return;
  }
  // 仅在后端确认注销成功后清理凭据，与现有退出流程保持一致。
  clearUserSession();
  location.reload();
}
</script>

<template>
  <v-dialog
      :model-value="props.modelValue"
      :persistent="busy"
      max-width="480"
      @update:model-value="updateOpen"
  >
    <v-card title="注销账户">
      <v-form @submit.prevent="confirmDeletion">
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            注销将永久停用当前统一用户中心账户，无法恢复，所有设备的登录凭据将失效。
          </v-alert>
          <p class="mb-4">请获取当前账户绑定邮箱的验证码，以确认本人操作。</p>
          <v-btn
              variant="outlined"
              color="primary"
              class="mb-4"
              :loading="sending"
              :disabled="busy || countdown > 0"
              @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s后重试` : '发送注销验证码' }}
          </v-btn>
          <v-text-field
              v-model="code"
              label="邮箱验证码"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              variant="outlined"
              density="compact"
              hint="请输入 6 位数字验证码"
              persistent-hint
              :disabled="busy"
          ></v-text-field>
          <v-checkbox
              v-model="acknowledged"
              label="我已了解注销后果，确认永久注销当前账户"
              color="error"
              hide-details
              :disabled="busy"
          ></v-checkbox>
          <v-alert v-if="feedback" :type="feedbackType" variant="tonal" class="mt-4" role="status">
            {{ feedback }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn :disabled="busy" @click="updateOpen(false)">取消</v-btn>
          <v-btn
              type="submit"
              color="error"
              :loading="deleting"
              :disabled="busy || !canDelete"
          >
            确认永久注销
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>
