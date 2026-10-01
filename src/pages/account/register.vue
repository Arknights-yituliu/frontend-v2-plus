<script setup>
import {ref} from "vue";
import '/src/assets/css/account/login.v2.scss'
import {createMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";
import {getUserInfo} from "/src/api/backend/userSession.js";
import {
  emailRules,
  registerPasswordRules,
  userNameRules,
  verificationCodeRules,
  validateAuthSubmission
} from "/src/utils/user/authValidation.js";
import {useVerificationCode} from "/src/api/user-center/verificationCode.js";
import UserApiV2 from '/src/api/backend/UserApiV2.js'
import {directRegister} from '/src/api/user-center/userCenterApi.js'
import {saveUcToken} from "/src/utils/user/ucToken.js"

/**
 * 组装直连注册请求参数（映射到 UC /oauth2/direct-register 表单字段）
 * UC 已统一注册形态：邮箱、验证码、用户名、密码必填，昵称选填
 * @returns {Object} 注册请求参数
 */
function getParam() {
  return {
    email: String(inputContent.value.email ?? '').trim(),
    userName: String(inputContent.value.userName ?? '').trim(),
    password: inputContent.value.password,
    code: String(inputContent.value.verificationCode ?? '').trim(),
    nickname: String(inputContent.value.nickname ?? '').trim(),
  }
}

let inputContent = ref({
  nickname: '',
  email: '',
  verificationCode: '',
  userName: '',
  password: '',
  confirmPassword: '',
})
const router = useRouter()
const isSubmitting = ref(false);
const {
  codeCountdown,
  isSendingCode,
  sendVerificationCode: sendCode
} = useVerificationCode();

/**
 * 直连注册流程：
 * ① 旧系统后端换发起会话凭证 channel；
 * ② 注册信息（含密码）直连提交 UC /oauth2/direct-register，创建用户并签发一次性票据 ticket；
 * ③ 把 ticket 交给旧系统后端 /user/oauth2/complete-login，签发本地会话
 */
async function toRegister() {
  if (isSubmitting.value) {
    return;
  }

  const validationError = validateAuthSubmission(inputContent.value, 'register');
  if (validationError) {
    createMessage({type: 'warn', text: validationError});
    return;
  }

  isSubmitting.value = true;
  try {
    const param = getParam();

    // ① 后端换 channel（channel 由后端用 client_secret 换取，前端不接触 secret）
    const channelResp = await UserApiV2.getDirectChannel();
    const channel = channelResp.data.channel;

    // ② 注册信息直接提交 UC，密码/验证码不经旧系统后端
    const ticketData = await directRegister({
      channel,
      email: param.email,
      userName: param.userName,
      password: param.password,
      code: param.code,
      nickname: param.nickname,
    });

    // ③ ticket 交后端兑换用户信息并发自家会话
    const registerResp = await UserApiV2.completeDirectLogin(ticketData.ticket);
    const {token, ucAccessToken, ucTokenExpiresIn, ucTokenScope} = registerResp.data;

    localStorage.setItem("USER_TOKEN", token.toString());
    // 后端随登录响应一并回带 UC access_token，存起来供调用 UC 接口（F1/F2）
    saveUcToken({accessToken: ucAccessToken, expiresIn: ucTokenExpiresIn, scope: ucTokenScope});
    await getUserInfo("Register");
    createMessage({type:'success',text:'注册成功，即将跳转到我的干员导入流程'})
    setTimeout(() => {
      router.push({
        name: 'OperatorSurvey',
        query: {
          openImport: '1'
        }
      })
    }, 3000)
  } catch (error) {
    // 错误提示已由各请求拦截器（request.js / userCenterApi.js）统一弹出，这里不再重复处理
    console.error('注册失败', error);
  } finally {
    isSubmitting.value = false;
  }
}

function handleSendVerificationCode() {
  return sendCode(inputContent.value.email, 'register');
}

</script>

<template>
  <div class="login-page">
    <v-card class="login-card">
      <v-card-title class="auth-card-header">
        <div class="auth-card-title">注册账号</div>
      </v-card-title>

      <v-card-text class="auth-card-body">
        <v-text-field
            label="昵称（选填）"
            placeholder="请输入昵称"
            density="comfortable"
            color="primary"
            hint="不填时默认使用用户名作为昵称"
            v-model="inputContent.nickname"
            variant="solo-filled"
            class="auth-field"
        ></v-text-field>
        <v-text-field
            label="邮箱"
            placeholder="请输入邮箱"
            :rules="emailRules"
            v-model="inputContent.email"
            color="primary"
            density="comfortable"
            variant="solo-filled"
            class="auth-field"
        >
          <template v-slot:append-inner>
            <button
                class="auth-code-button"
                type="button"
                :disabled="isSendingCode || codeCountdown > 0"
                @click="handleSendVerificationCode"
            >
              {{ codeCountdown > 0 ? `${codeCountdown}s后重试` : isSendingCode ? '发送中...' : '发送验证码' }}
            </button>
          </template>
        </v-text-field>
        <v-otp-input
            aria-label="邮箱验证码"
            class="auth-otp"
            v-model="inputContent.verificationCode"
            length="6"
        ></v-otp-input>
        <v-text-field
            label="用户名"
            placeholder="请输入用户名"
            :rules="userNameRules"
            v-model="inputContent.userName"
            hint="3-20 位字母、数字或下划线，可用于登录"
            color="primary"
            density="comfortable"
            variant="solo-filled"
            class="auth-field"
        ></v-text-field>
        <v-text-field
            label="登录密码"
            placeholder="请输入密码"
            density="comfortable"
            :rules="registerPasswordRules"
            color="primary"
            hint="6-32 位数字、字母、@ 或下划线"
            v-model="inputContent.password"
            variant="solo-filled"
            type="password"
            class="auth-field"
        ></v-text-field>
        <v-text-field
            label="确认密码"
            placeholder="请再次输入密码"
            density="comfortable"
            color="primary"
            hint="6-32 位数字、字母、@ 或下划线"
            v-model="inputContent.confirmPassword"
            variant="solo-filled"
            type="password"
            class="auth-field"
        ></v-text-field>

        <div class="auth-actions">
          <v-btn
              block
              size="large"
              variant="flat"
              @click="toRegister"
              text="注册"
              color="primary"
              class="auth-primary-action"
              :loading="isSubmitting"
              :disabled="isSubmitting"
          ></v-btn>
        </div>
      </v-card-text>

      <div class="auth-card-bottom">
        <span>已有账号？</span>
        <button class="auth-link-button" type="button" @click="router.push({name: 'LOGIN'})">
          登录账号
        </button>
      </div>

      <section class="auth-notice">
        <div class="auth-notice-title">注册前请注意</div>
        <ul class="auth-notice-list">
          <li>这是用于保存一图流个人数据的账号，与鹰角通行证无关。</li>
          <li>请勿使用与其他重要账号相同的密码。</li>
        </ul>
      </section>
    </v-card>



  </div>
</template>
