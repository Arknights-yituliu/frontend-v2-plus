<script setup>
import {ref} from "vue";
import '/src/assets/css/account/login.v2.scss'
import '/src/assets/css/account/login.v2.phone.scss'
import {createMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";
import {setUcSession, ucRequest} from "/src/api/uc/uc-api.js";

/** 注册表单：password=账号注册（可带邮箱） email=邮箱注册（必须带邮箱验证码） */
const inputContent = ref({
    accountType: 'password',
    userName: '',
    email: '',
    verificationCode: '',
    password: '',
    confirmPassword: '',
})

/** 注册 / 发送验证码 加载状态 */
const registerLoading = ref(false)
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
 * 发送注册邮箱验证码（UC POST /auth/send-code，usage=register），成功后 60s 倒计时
 */
async function sendVerificationCode() {
    const email = inputContent.value.email
    if (!checkField(email, "邮箱")) {
        return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        createMessage({text: "邮箱格式不正确", type: "warning"})
        return
    }
    sendCodeLoading.value = true
    try {
        await ucRequest({
            method: "POST",
            url: "/auth/send-code",
            data: {email, usage: "register"},
            auth: false,
        })
        createMessage({text: "验证码发送成功", type: "success"})
        // 发送成功后开始 60s 倒计时
        codeCountdown.value = 60
        const timer = setInterval(() => {
            codeCountdown.value--
            if (codeCountdown.value <= 0) {
                clearInterval(timer)
            }
        }, 1000)
    } catch (e) {
        // 错误提示已在 ucRequest 内部统一弹出
    } finally {
        sendCodeLoading.value = false
    }
}

/**
 * 注册：按当前 tab 调 UC POST /auth/register（注册即自动登录）
 * - 账号注册：registerType=password，userName 必填；邮箱可选，但填了邮箱必须带验证码
 * - 邮箱注册：registerType=email_code，邮箱 + 验证码必填
 */
async function toRegister() {
    const form = inputContent.value
    const payload = {registerType: 'password'}

    if (form.accountType === 'password') {
        if (!checkField(form.userName, "用户名")) {
            return
        }
        if (!/^[A-Za-z0-9_]{3,20}$/.test(form.userName)) {
            createMessage({text: "用户名仅支持字母、数字、下划线，长度 3-20 位", type: "warning"})
            return
        }
        payload.userName = form.userName
        // 填了邮箱就必须提供验证码（UC 规则）
        if (form.email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                createMessage({text: "邮箱格式不正确", type: "warning"})
                return
            }
            if (!checkField(form.verificationCode, "邮箱验证码")) {
                return
            }
            payload.email = form.email
            payload.verificationCode = form.verificationCode
        }
    } else {
        payload.registerType = 'email_code'
        if (!checkField(form.email, "邮箱")) {
            return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            createMessage({text: "邮箱格式不正确", type: "warning"})
            return
        }
        if (!checkField(form.verificationCode, "邮箱验证码")) {
            return
        }
        payload.email = form.email
        payload.verificationCode = form.verificationCode
    }

    if (!checkField(form.password, "密码") || !checkPassword(form.password)) {
        return
    }
    if (form.confirmPassword !== form.password) {
        createMessage({text: "两次密码输入不一致", type: "warning"})
        return
    }
    payload.password = form.password

    registerLoading.value = true
    try {
        const resp = await ucRequest({
            method: "POST",
            url: "/auth/register",
            data: payload,
            auth: false,
        })
        // 注册即自动登录：保存 UC 会话
        const data = resp.data || {}
        setUcSession(data.token, data.uid)
        createMessage({type: 'success', text: '注册成功，即将转跳到干员导入流程'})
        setTimeout(() => {
            router.push({
                name: 'OperatorSurvey',
                query: {openImport: '1'}
            })
        }, 1500)
    } catch (e) {
        // 错误提示已在 ucRequest 内部统一弹出
    } finally {
        registerLoading.value = false
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
        <div class="login-title">注册一图流账号</div>
        <div class="login-sub">使用统一用户中心（UserCenter）账号</div>
      </div>

      <v-tabs v-model="inputContent.accountType" bg-color="primary" grow>
        <v-tab value="password">账号注册</v-tab>
        <v-tab value="email">邮箱注册</v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="inputContent.accountType">
          <!-- 账号注册 -->
          <v-tabs-window-item value="password">
            <div class="m-0-4">用户名（必填）</div>
            <v-text-field
                density="compact"
                v-model="inputContent.userName"
                placeholder="3-20 位，仅字母、数字、下划线"
                color="primary"
                variant="outlined"
                class="m-4"
            ></v-text-field>

            <div class="m-0-4">登录密码</div>
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

            <div class="m-0-4">确认密码</div>
            <v-text-field
                density="compact"
                color="primary"
                v-model="inputContent.confirmPassword"
                variant="outlined"
                type="password"
                placeholder="再次输入密码"
                hide-details="auto"
                class="m-4"
            ></v-text-field>

            <div class="m-0-4">绑定邮箱（选填，填了则需验证）</div>
            <v-text-field
                density="compact"
                color="primary"
                v-model="inputContent.email"
                variant="outlined"
                placeholder="找回账号的唯一方式"
                class="m-4"
            >
              <template v-slot:append>
                <v-btn
                    text="发送验证码"
                    variant="text"
                    size="small"
                    density="compact"
                    :loading="sendCodeLoading"
                    :disabled="codeCountdown > 0"
                    @click="sendVerificationCode"
                >{{ codeCountdown > 0 ? `${codeCountdown}s 后重发` : '发送验证码' }}</v-btn>
              </template>
            </v-text-field>

            <div class="m-0-4">邮箱验证码（填了邮箱则必填）</div>
            <v-text-field
                v-model="inputContent.verificationCode"
                density="compact"
                color="primary"
                variant="outlined"
                placeholder="请输入 6 位验证码"
                class="m-4"
            ></v-text-field>
          </v-tabs-window-item>

          <!-- 邮箱注册 -->
          <v-tabs-window-item value="email">
            <div class="m-0-4">邮箱（必填）</div>
            <v-text-field
                v-model="inputContent.email"
                color="primary"
                density="compact"
                variant="outlined"
                placeholder="请输入邮箱"
                class="m-4"
            >
              <template v-slot:append>
                <v-btn
                    text="发送验证码"
                    variant="text"
                    size="small"
                    density="compact"
                    :loading="sendCodeLoading"
                    :disabled="codeCountdown > 0"
                    @click="sendVerificationCode"
                >{{ codeCountdown > 0 ? `${codeCountdown}s 后重发` : '发送验证码' }}</v-btn>
              </template>
            </v-text-field>

            <div class="m-0-4">邮箱验证码（必填）</div>
            <v-text-field
                v-model="inputContent.verificationCode"
                color="primary"
                density="compact"
                variant="outlined"
                placeholder="请输入 6 位验证码"
                class="m-4"
            ></v-text-field>

            <div class="m-0-4">登录密码</div>
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

            <div class="m-0-4">确认密码</div>
            <v-text-field
                density="compact"
                color="primary"
                v-model="inputContent.confirmPassword"
                variant="outlined"
                type="password"
                placeholder="再次输入密码"
                hide-details="auto"
                class="m-4"
            ></v-text-field>
          </v-tabs-window-item>
        </v-tabs-window>

        <div class="flex justify-center m-4">
          <v-btn
              @click="toRegister"
              text="注册"
              color="primary"
              variant="flat"
              size="large"
              class="login-btn"
              :loading="registerLoading"
          ></v-btn>
        </div>

        <v-card title="账号须知" color="primary" variant="tonal" class="m-12-4">
          <v-card-text>
            <p>
              用户名与邮箱至少填一个；填了邮箱必须通过邮箱验证码验证邮箱可用。
            </p>
            <p>
              *此账号为一图流账号，与鹰角网络通行证(明日方舟游戏账号)无关，仅为保存您的干员练度数据使用
            </p>
            <p>
              *为了您的账号安全，注册时的密码不要与您其他重要账号的密码相同
            </p>
            <p>
              *仅用户名注册的账号无邮箱，无法走忘记密码流程，请登录后及时绑定邮箱
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

/* 注册按钮 */
.login-btn {
    width: 200px;
    border-radius: 8px;
}
</style>
