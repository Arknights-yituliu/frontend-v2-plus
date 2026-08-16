<script setup>
import {ref} from "vue";
import '/src/assets/css/account/login.v2.scss'
import {createMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";
import {ucRequest} from "/src/api/uc/uc-api.js";

/** 当前步骤：sendCode=账号验证 resetPassword=设置新密码 resetSuccessful=完成 */
const currentStepper = ref("sendCode")

/** 表单：account=邮箱或用户名 code=验证码 password/newPassword=新密码 */
const inputContent = ref({
    account: '',
    code: '',
    password: '',
    confirmPassword: '',
})

/** 加载状态 */
const resetLoading = ref(false)
const sendCodeLoading = ref(false)

/** 发送验证码倒计时（秒） */
const codeCountdown = ref(0)

const router = useRouter()

/** 基础非空校验 */
function checkField(value, label) {
    if (!value) {
        createMessage({text: `${label}不能为空`, type: "warning"})
        return false
    }
    return true
}

/** 校验密码规则（与 UC 一致：6-32 位，数字、字母、@、下划线） */
function checkPassword(password) {
    if (!/^[A-Za-z0-9@_]{6,32}$/.test(password)) {
        createMessage({text: "密码需为 6-32 位，仅允许数字、字母、@、下划线", type: "warning"})
        return false
    }
    return true
}

/**
 * 发送重设密码验证码（UC POST /auth/reset-code），验证码发到账号绑定的邮箱
 */
async function sendVerificationCode() {
    const account = inputContent.value.account
    if (!checkField(account, "账号")) {
        return
    }
    sendCodeLoading.value = true
    try {
        await ucRequest({
            method: "POST",
            url: "/auth/reset-code",
            data: {account},
            auth: false,
        })
        createMessage({text: "验证码已发送到该账号绑定的邮箱", type: "success"})
        // 发送成功后开始 60s 倒计时
        codeCountdown.value = 60
        const timer = setInterval(() => {
            codeCountdown.value--
            if (codeCountdown.value <= 0) {
                clearInterval(timer)
            }
        }, 1000)
    } catch (e) {
        // 错误提示已在 ucRequest 内部统一弹出（如 20006 未绑定邮箱）
    } finally {
        sendCodeLoading.value = false
    }
}

/**
 * 提交新密码（UC POST /auth/reset-password），成功后踢出该账号全部会话，跳转登录页
 */
async function toResetPassword() {
    const form = inputContent.value
    if (!checkField(form.code, "验证码")) {
        return
    }
    if (!checkField(form.password, "新密码") || !checkPassword(form.password)) {
        return
    }
    if (form.confirmPassword !== form.password) {
        createMessage({text: "两次密码输入不一致", type: "warning"})
        return
    }
    resetLoading.value = true
    try {
        await ucRequest({
            method: "POST",
            url: "/auth/reset-password",
            data: {account: form.account, code: form.code, newPassword: form.password},
            auth: false,
        })
        currentStepper.value = "resetSuccessful"
    } catch (e) {
        // 错误提示已在 ucRequest 内部统一弹出
    } finally {
        resetLoading.value = false
    }
}

/** 完成重置后跳转登录页（重置会踢出全部会话，需重新登录） */
function backToLogin() {
    router.push({name: "LOGIN"})
}
</script>

<template>
  <div class="login-page">
    <!-- 渐变背景层 -->
    <div class="login-bg"></div>

    <v-card class="login-card m-a" max-width="440" width="100%">
      <!-- 标题区 -->
      <div class="login-header">
        <div class="login-title">找回密码</div>
        <div class="login-sub">通过绑定邮箱验证码重置密码</div>
      </div>

      <v-card-text>
        <v-stepper alt-labels v-model="currentStepper" hide-actions>
          <v-stepper-header>
            <v-stepper-item title="账号验证" value="sendCode">
              <template v-slot:icon>1</template>
            </v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item title="设置新密码" value="resetPassword">
              <template v-slot:icon>2</template>
            </v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item title="完成" value="resetSuccessful">
              <template v-slot:icon>3</template>
            </v-stepper-item>
          </v-stepper-header>

          <v-stepper-window>
            <!-- 第一步：账号验证 -->
            <v-stepper-window-item value="sendCode">
              <div class="m-0-4">账号（邮箱或用户名）</div>
              <v-text-field
                  v-model="inputContent.account"
                  color="primary"
                  density="compact"
                  variant="outlined"
                  placeholder="请输入注册时的邮箱或用户名"
                  class="m-4"
              ></v-text-field>

              <div class="m-0-4">邮箱验证码</div>
              <v-text-field
                  v-model="inputContent.code"
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
                      :loading="sendCodeLoading"
                      :disabled="codeCountdown > 0"
                      @click="sendVerificationCode"
                  >{{ codeCountdown > 0 ? `${codeCountdown}s 后重发` : '发送验证码' }}</v-btn>
                </template>
              </v-text-field>

              <div class="flex justify-center m-4">
                <v-btn
                    color="primary"
                    variant="flat"
                    text="下一步"
                    size="large"
                    class="step-btn"
                    @click="currentStepper = 'resetPassword'"
                ></v-btn>
              </div>
            </v-stepper-window-item>

            <!-- 第二步：设置新密码 -->
            <v-stepper-window-item value="resetPassword">
              <div class="m-0-4">新密码</div>
              <v-text-field
                  density="compact"
                  color="primary"
                  v-model="inputContent.password"
                  variant="outlined"
                  type="password"
                  placeholder="6-32 位，仅数字、字母、@、下划线"
                  hide-details="auto"
                  class="m-4"
              ></v-text-field>

              <div class="m-0-4">确认新密码</div>
              <v-text-field
                  density="compact"
                  color="primary"
                  v-model="inputContent.confirmPassword"
                  variant="outlined"
                  type="password"
                  placeholder="再次输入新密码"
                  hide-details="auto"
                  class="m-4"
              ></v-text-field>

              <div class="flex justify-center m-4">
                <v-btn
                    color="primary"
                    variant="flat"
                    text="确认重置"
                    size="large"
                    class="step-btn"
                    :loading="resetLoading"
                    @click="toResetPassword"
                ></v-btn>
              </div>
            </v-stepper-window-item>

            <!-- 第三步：完成 -->
            <v-stepper-window-item value="resetSuccessful">
              <v-alert
                  class="m-4"
                  text="密码已重置，账号全部会话已下线，请使用新密码重新登录"
                  title="修改成功"
                  type="success"
                  variant="tonal"
              ></v-alert>
              <div class="flex justify-center m-4">
                <v-btn
                    color="primary"
                    variant="flat"
                    text="返回登录"
                    size="large"
                    class="step-btn"
                    @click="backToLogin"
                ></v-btn>
              </div>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
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
