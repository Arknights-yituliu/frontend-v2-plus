<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/account/login.v2.scss'
import {createMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";
import {getUserInfo} from "/src/utils/user/userInfo.js";
import {
  accountRules,
  passwordRules,
  validateAuthSubmission
} from "/src/utils/user/authValidation.js";
import {useVerificationCode} from "/src/utils/user/verificationCode.js";
import UserApiV2 from '/src/api/UserApiV2.js'
import {directRegister} from '/src/api/userCenterApi.js'

/**
 * 组装直连注册请求参数（映射到 UC /oauth2/direct-register 表单字段）
 * password=密码注册 / email=邮箱验证码注册（两者均需密码）
 */
function getParam() {
  let param = {
    accountType: inputContent.value.accountType
  }

  if ('password' === inputContent.value.accountType) {
    param.user_name = inputContent.value.userName
    param.password = inputContent.value.password
  }

  if ('email' === inputContent.value.accountType) {
    param.email = String(inputContent.value.email ?? '').trim()
    param.password = inputContent.value.password
    param.code = String(inputContent.value.verificationCode ?? '').trim()
  }

  return param
}

let inputContent = ref({
  userName: '',
  password: '',
  confirmPassword: '',
  email: '',
  verificationCode: '',
  accountType: '',
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
    createMessage({type: 'warning', text: validationError});
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
      registerType: param.accountType === 'email' ? 'email_code' : 'password',
      email: param.email,
      userName: param.user_name,
      password: param.password,
      code: param.code,
    });

    // ③ ticket 交后端兑换用户信息并发自家会话
    const registerResp = await UserApiV2.completeDirectLogin(ticketData.ticket);
    const {token} = registerResp.data;

    localStorage.setItem("USER_TOKEN", token.toString());
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


onMounted(() => {
  inputContent.value.accountType = 'password'
})

</script>

<template>
  <div class="login-page">
    <v-card class="login-card">
      <v-card-title class="auth-card-header">
        <div class="auth-card-title">注册账号</div>
      </v-card-title>

      <div class="auth-card-mode-switch" role="tablist" aria-label="注册方式">
        <button
            class="auth-card-mode-button"
            :class="{ 'auth-card-mode-button--active': inputContent.accountType === 'password' }"
            type="button"
            role="tab"
            :aria-selected="inputContent.accountType === 'password'"
            @click="inputContent.accountType = 'password'"
        >
          账号注册
        </button>
        <button
            class="auth-card-mode-button"
            :class="{ 'auth-card-mode-button--active': inputContent.accountType === 'email' }"
            type="button"
            role="tab"
            :aria-selected="inputContent.accountType === 'email'"
            @click="inputContent.accountType = 'email'"
        >
          邮箱注册
        </button>
      </div>

      <v-card-text class="auth-card-body">
        <v-tabs-window v-model="inputContent.accountType">
          <v-tabs-window-item value="password">
            <v-text-field
                label="账号"
                placeholder="请输入账号"
                :rules="accountRules"
                density="comfortable"
                v-model="inputContent.userName"
                hint="账号仅可由汉字、数字、英文组成"
                color="primary"
                variant="solo-filled"
                hide-details
                class="auth-field"
            ></v-text-field>
            <v-text-field
                label="登录密码"
                placeholder="请输入密码"
                density="comfortable"
                :rules="passwordRules"
                color="primary"
                hint="密码仅可由数字、英文组成"
                v-model="inputContent.password"
                variant="solo-filled"
                type="password"
                hide-details
                class="auth-field"
            ></v-text-field>
            <v-text-field
                label="确认密码"
                placeholder="请再次输入密码"
                density="comfortable"
                color="primary"
                hint="密码仅可由数字、英文组成"
                v-model="inputContent.confirmPassword"
                variant="solo-filled"
                type="password"
                hide-details
                class="auth-field"
            ></v-text-field>
          </v-tabs-window-item>

          <v-tabs-window-item value="email">
            <v-text-field
                label="邮箱"
                placeholder="请输入邮箱"
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
            <v-text-field
                label="登录密码"
                placeholder="请输入密码"
                density="comfortable"
                :rules="passwordRules"
                color="primary"
                hint="密码仅可由数字、英文组成"
                v-model="inputContent.password"
                variant="solo-filled"
                type="password"
                hide-details
                class="auth-field"
            ></v-text-field>
            <v-otp-input
                aria-label="邮箱验证码"
                class="auth-otp"
                v-model="inputContent.verificationCode"
                length="4"
            ></v-otp-input>
          </v-tabs-window-item>
        </v-tabs-window>

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
