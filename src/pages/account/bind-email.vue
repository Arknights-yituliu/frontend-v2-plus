<script setup>
import {ref, computed, onMounted} from "vue";
import '/src/assets/css/account/login.v2.scss'
import {createMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";
import {
    getUcToken,
    getUserProfile,
    sendEmailCode,
    bindEmail,
    changeEmail,
} from "/src/api/uc/uc-api.js";

const router = useRouter()

/** 页面加载状态（拉取用户资料期间展示加载） */
const pageLoading = ref(true)

/** 当前绑定邮箱（null 表示未绑定，决定 绑定/换绑 模式） */
const currentEmail = ref(null)

/** 是否为绑定模式（无邮箱账号走绑定，有邮箱账号走换绑） */
const isBindMode = computed(() => !currentEmail.value)

/** 表单：newEmail/newCode=新邮箱及验证码 oldCode=旧邮箱验证码（换绑模式） */
const inputContent = ref({
    oldCode: '',
    newEmail: '',
    newCode: '',
})

/** 加载状态 */
const submitLoading = ref(false)
const sendOldCodeLoading = ref(false)
const sendNewCodeLoading = ref(false)

/** 旧/新邮箱验证码发送倒计时（秒），服务端限流同一 IP 最小间隔 60s */
const oldCodeCountdown = ref(0)
const newCodeCountdown = ref(0)

/** 邮箱格式校验 */
const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 基础非空校验 */
function checkField(value, label) {
    if (!value) {
        createMessage({text: `${label}不能为空`, type: "warning"})
        return false
    }
    return true
}

/**
 * 启动指定倒计时（60s，发送验证码成功后调用）
 * @param {import('vue').Ref<number>} countdownRef 倒计时 ref
 */
function startCountdown(countdownRef) {
    countdownRef.value = 60
    const timer = setInterval(() => {
        countdownRef.value--
        if (countdownRef.value <= 0) {
            clearInterval(timer)
        }
    }, 1000)
}

/**
 * 页面初始化：校验 UC 登录态，拉取用户资料判断 绑定/换绑 模式
 * 未登录跳转登录页
 */
onMounted(async () => {
    if (!getUcToken()) {
        createMessage({text: "请先登录", type: "warning"})
        router.push({name: "LOGIN"})
        return
    }
    try {
        const resp = await getUserProfile()
        currentEmail.value = (resp.data && resp.data.email) || null
    } catch (e) {
        // 80001/80002 token 失效时引导重新登录
        if (e && (e.code === 80001 || e.code === 80002)) {
            router.push({name: "LOGIN"})
            return
        }
    } finally {
        pageLoading.value = false
    }
})

/**
 * 发送旧邮箱验证码（换绑模式，UC POST /auth/send-code usage=register，发到当前绑定邮箱）
 */
async function toSendOldCode() {
    if (!checkField(currentEmail.value, "当前邮箱")) {
        return
    }
    sendOldCodeLoading.value = true
    try {
        await sendEmailCode(currentEmail.value, "register")
        createMessage({text: "验证码已发送到当前绑定邮箱", type: "success"})
        startCountdown(oldCodeCountdown)
    } catch (e) {
        // 错误提示已在 ucRequest 内部统一弹出
    } finally {
        sendOldCodeLoading.value = false
    }
}

/**
 * 发送新邮箱验证码（UC POST /auth/send-code usage=register，发到新邮箱）
 */
async function toSendNewCode() {
    const newEmail = inputContent.value.newEmail
    if (!checkField(newEmail, "新邮箱")) {
        return
    }
    if (!EMAIL_REG.test(newEmail)) {
        createMessage({text: "邮箱格式不正确", type: "warning"})
        return
    }
    sendNewCodeLoading.value = true
    try {
        await sendEmailCode(newEmail, "register")
        createMessage({text: "验证码已发送到新邮箱", type: "success"})
        startCountdown(newCodeCountdown)
    } catch (e) {
        // 错误提示已在 ucRequest 内部统一弹出
    } finally {
        sendNewCodeLoading.value = false
    }
}

/**
 * 提交绑定/换绑：
 * - 绑定模式（无邮箱）：UC POST /user/email/bind
 * - 换绑模式（有邮箱）：UC POST /user/email/change（校验旧邮箱+新邮箱双验证码）
 * 成功后即可使用新邮箱作为登录账号
 */
async function toSubmit() {
    const form = inputContent.value
    if (!checkField(form.newEmail, "新邮箱")) {
        return
    }
    if (!EMAIL_REG.test(form.newEmail)) {
        createMessage({text: "邮箱格式不正确", type: "warning"})
        return
    }
    if (!checkField(form.newCode, "新邮箱验证码")) {
        return
    }
    if (!isBindMode.value && !checkField(form.oldCode, "当前邮箱验证码")) {
        return
    }
    submitLoading.value = true
    try {
        if (isBindMode.value) {
            await bindEmail(form.newEmail, form.newCode)
        } else {
            await changeEmail(currentEmail.value, form.oldCode, form.newEmail, form.newCode)
        }
        createMessage({text: isBindMode.value ? "邮箱绑定成功" : "邮箱换绑成功", type: "success"})
        // 成功后更新当前邮箱，切换为换绑模式
        currentEmail.value = form.newEmail
        inputContent.value = {oldCode: '', newEmail: '', newCode: ''}
    } catch (e) {
        // 错误提示已在 ucRequest 内部统一弹出（如 10001 旧邮箱不一致、20003 邮箱已被注册）
    } finally {
        submitLoading.value = false
    }
}
</script>

<template>
  <div class="login-page">
    <!-- 渐变背景层 -->
    <div class="login-bg"></div>

    <v-card class="login-card m-a" max-width="440" width="100%">
      <!-- 标题区 -->
      <div class="login-header">
        <div class="login-title">绑定 / 换绑邮箱</div>
        <div class="login-sub">{{ isBindMode ? '当前账号未绑定邮箱，绑定后可用于找回密码与验证码登录' : '换绑需验证当前邮箱与新邮箱' }}</div>
      </div>

      <v-card-text>
        <div v-if="pageLoading" class="flex justify-center m-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>

        <template v-else>
          <!-- 换绑模式：展示当前绑定邮箱并发送旧邮箱验证码 -->
          <template v-if="!isBindMode">
            <div class="m-0-4">当前绑定邮箱</div>
            <v-text-field
                v-model="currentEmail"
                color="primary"
                density="compact"
                variant="outlined"
                readonly
                class="m-4"
            ></v-text-field>

            <div class="m-0-4">当前邮箱验证码</div>
            <v-text-field
                v-model="inputContent.oldCode"
                color="primary"
                density="compact"
                variant="outlined"
                placeholder="请输入 6 位验证码"
                class="m-4"
            >
              <template v-slot:append>
                <v-btn
                    color="primary"
                    variant="text"
                    :loading="sendOldCodeLoading"
                    :disabled="oldCodeCountdown > 0"
                    @click="toSendOldCode"
                >{{ oldCodeCountdown > 0 ? `${oldCodeCountdown}s 后重发` : '发送验证码' }}</v-btn>
              </template>
            </v-text-field>
          </template>

          <!-- 新邮箱（绑定/换绑通用） -->
          <div class="m-0-4">新邮箱</div>
          <v-text-field
              v-model="inputContent.newEmail"
              color="primary"
              density="compact"
              variant="outlined"
              placeholder="请输入要绑定的新邮箱"
              class="m-4"
          ></v-text-field>

          <div class="m-0-4">新邮箱验证码</div>
          <v-text-field
              v-model="inputContent.newCode"
              color="primary"
              density="compact"
              variant="outlined"
              placeholder="请输入 6 位验证码"
              class="m-4"
          >
            <template v-slot:append>
              <v-btn
                  color="primary"
                  variant="text"
                  :loading="sendNewCodeLoading"
                  :disabled="newCodeCountdown > 0"
                  @click="toSendNewCode"
              >{{ newCodeCountdown > 0 ? `${newCodeCountdown}s 后重发` : '发送验证码' }}</v-btn>
            </template>
          </v-text-field>

          <div class="flex justify-center m-4">
            <v-btn
                color="primary"
                variant="flat"
                :text="isBindMode ? '确认绑定' : '确认换绑'"
                size="large"
                class="step-btn"
                :loading="submitLoading"
                @click="toSubmit"
            ></v-btn>
          </div>
        </template>

        <v-card title="温馨提示" color="primary" variant="tonal" class="m-12-4">
          <v-card-text>
            <p>
              验证码 5 分钟内有效、一次性使用；发送限流：同一邮箱最小间隔 5 分钟。
            </p>
            <p>
              *绑定/换绑成功后即可使用新邮箱作为登录账号，原用户名账号仍可登录。
            </p>
            <p>
              *换绑时请先获取当前邮箱验证码，再获取新邮箱验证码。
            </p>
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.login-page {
    position: relative;
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

/* 渐变背景层 */
.login-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(229, 242, 255, 0.9) 100%);
    z-index: 0;
}

[data-theme="dark"] .login-bg {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.login-card {
    position: relative;
    z-index: 1;
    border-radius: 12px;
    overflow: hidden;
}

/* 标题区 */
.login-header {
    padding: 28px 24px 20px;
    text-align: center;
}

.login-title {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 6px;
}

.login-sub {
    font-size: 13px;
    opacity: 0.6;
}

/* 步骤按钮 */
.step-btn {
    width: 200px;
    border-radius: 8px;
}
</style>
