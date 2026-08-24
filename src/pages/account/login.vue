<script setup>
import {ref} from "vue";
import '/src/assets/css/account/login.v2.scss'
import { createMessage} from "/src/utils/message.js";
import {useRoute, useRouter} from "vue-router";
import {getUserInfo} from "/src/utils/user/userInfo.js";
import {
  accountRules,
  passwordRules,
  validateAuthSubmission
} from "/src/utils/user/authValidation.js";
import {useVerificationCode} from "/src/utils/user/verificationCode.js";
import UserApiV2 from '/src/api/UserApiV2.js'
import {directLogin} from '/src/api/userCenterApi.js'

const props = defineProps({
  dialog: {
    type: Boolean,
    default: false,
  },
  accountHome: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['success', 'navigate'])
const isSubmitting = ref(false);

let inputContent = ref({
  userName: '',          // 账号密码登录的账号（用户名或邮箱）
  password: '',
  accountType: 'password', // password=账号密码登录 / email=邮箱验证码登录
  email: '',             // 邮箱验证码登录的邮箱
  verificationCode: '',  // 邮箱验证码（6 位）
})

const {
  codeCountdown,
  isSendingCode,
  sendVerificationCode: sendCode
} = useVerificationCode();

/**
 * 发送登录邮箱验证码（usage=login）
 */
function handleSendVerificationCode() {
  return sendCode(inputContent.value.email, 'login');
}

function toRegister(){
  if (props.dialog) {
    emit('navigate', 'REGISTER')
    return
  }

  router.push({name: 'REGISTER'})
}

/**
 * 直连登录流程：
 * ① 旧系统后端换发起会话凭证 channel；
 * ② 登录凭证（账号密码或邮箱验证码）直连提交 UC /oauth2/direct-login，换一次性票据 ticket；
 * ③ 把 ticket 交给旧系统后端 /user/oauth2/complete-login，签发本地会话
 */
async function toLogin() {
  if (isSubmitting.value) {
    return;
  }

  const validationError = validateAuthSubmission(inputContent.value, 'login');
  if (validationError) {
    createMessage({type: 'warning', text: validationError});
    return;
  }

  isSubmitting.value = true;
  try {
    // ① 后端换 channel（channel 由后端用 client_secret 换取，前端不接触 secret）
    const channelResp = await UserApiV2.getDirectChannel();
    const channel = channelResp.data.channel;

    // ② 按登录方式把凭证直接提交 UC，密码/验证码不经旧系统后端
    let ticketData;
    if (inputContent.value.accountType === 'email') {
      ticketData = await directLogin({
        channel,
        accountType: 'email',
        account: String(inputContent.value.email ?? '').trim(),
        code: String(inputContent.value.verificationCode ?? '').trim(),
      });
    } else {
      ticketData = await directLogin({
        channel,
        accountType: 'password',
        account: inputContent.value.userName,
        password: inputContent.value.password,
      });
    }

    // ③ ticket 交后端兑换用户信息并发自家会话
    const loginResp = await UserApiV2.completeDirectLogin(ticketData.ticket);
    const {token, uid} = loginResp.data;
    localStorage.setItem("USER_TOKEN", token);
    localStorage.setItem("UID", uid);

    if (props.dialog) {
      createMessage({type:'success',text:'登录成功'})
      await getUserInfo("User")
      emit('success')
      return
    }

    if (route.name === 'User Center' || route.path === '/account/home') {
      createMessage({type:'success',text:'登录成功'})
      await getUserInfo("AccountHome")
      return
    }

    createMessage({type:'success',text:'登录成功，即将转跳到首页'})
    setTimeout(() => {
      window.location.href = '/';
    }, 2000)
  } catch (error) {
    // 错误提示已由各请求拦截器（request.js / userCenterApi.js）统一弹出，这里不再重复处理
    console.error('登录失败', error);
  } finally {
    isSubmitting.value = false;
  }
}

const router = useRouter()
const route = useRoute()

</script>

<template>
  <div
      class="login-page"
      :class="{
        'login-page--dialog': props.dialog,
        'login-page--account-home': props.accountHome,
        'login-page--email': inputContent.accountType === 'email',
      }"
  >
    <v-card
        class="login-card"
        :elevation="props.accountHome ? undefined : 0"
    >
      <div class="auth-card-content">
        <v-card-title class="auth-card-header">
          <div class="auth-card-title">登录</div>
        </v-card-title>

        <div class="auth-card-mode-switch" role="tablist" aria-label="登录方式">
          <button
              class="auth-card-mode-button"
              :class="{ 'auth-card-mode-button--active': inputContent.accountType === 'password' }"
              type="button"
              role="tab"
              :aria-selected="inputContent.accountType === 'password'"
              @click="inputContent.accountType = 'password'"
          >
            账号密码登录
          </button>
          <button
              class="auth-card-mode-button"
              :class="{ 'auth-card-mode-button--active': inputContent.accountType === 'email' }"
              type="button"
              role="tab"
              :aria-selected="inputContent.accountType === 'email'"
              @click="inputContent.accountType = 'email'"
          >
            邮箱验证码登录
          </button>
        </div>

        <div class="auth-card-body">
          <v-tabs-window v-model="inputContent.accountType">
            <v-tabs-window-item value="password">
              <v-text-field
                  label="账号"
                  placeholder="请输入账号或邮箱"
                  :rules="accountRules"
                  density="comfortable"
                  v-model="inputContent.userName"
                  hint="账号可为邮箱或用户名"
                  color="primary"
                  variant="solo-filled"
                  hide-details
                  class="auth-field"
              ></v-text-field>
              <v-text-field
                  label="密码"
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
            </v-tabs-window-item>

            <v-tabs-window-item value="email">
              <v-text-field
                  label="邮箱"
                  placeholder="请输入绑定邮箱"
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
            </v-tabs-window-item>
          </v-tabs-window>

          <div class="auth-actions">
            <v-btn
                block
                size="large"
                variant="flat"
                @click="toLogin"
                text="登录"
                color="primary"
                class="auth-primary-action"
                :loading="isSubmitting"
                :disabled="isSubmitting"
            ></v-btn>
          </div>
        </div>

        <div class="auth-card-bottom">
          <span>还没有账号？</span>
          <button class="auth-link-button" type="button" @click="toRegister()">
            注册账号
          </button>
        </div>

        <section class="auth-notice">
          <ul class="auth-notice-list">
            <li>这是用于保存一图流个人数据的账号，与鹰角通行证无关。</li>
            <li>请勿使用与其他重要账号相同的密码。</li>
          </ul>
        </section>
      </div>
    </v-card>
  </div>


</template>

<style>
.login-page--dialog {
  min-height: unset;
  padding: 0;
}
</style>
