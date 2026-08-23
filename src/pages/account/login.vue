<script setup>
import {ref} from "vue";
import userAPI from '/src/api/userInfo.js'
import '/src/assets/css/account/login.v2.scss'
import { createMessage} from "/src/utils/message.js";
import {useRoute, useRouter} from "vue-router";
import {getUserInfo} from "/src/utils/user/userInfo.js";

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

const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;

const accountRules = [
  value => !!value || '不能为空',
  value => chineseEnglishNumberRegex.test(value) || '账号仅可由汉字、数字、英文组成'
]

const passwordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成'
]



let inputContent = ref({
  userName: '',
  password: '',
  confirmPassword: '',
  email: '',
  verificationCode: '',
  hgToken: '',
  accountType: 'password',
})

function toRegister(){
  if (props.dialog) {
    emit('navigate', 'REGISTER')
    return
  }

  router.push({name: 'REGISTER'})
}

async function toLogin() {
  const response = await userAPI.loginV3(inputContent.value)
  const {token,uid} = response.data
  localStorage.setItem("USER_TOKEN", token);
  localStorage.setItem("UID",uid);

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
      // router.push({name: 'IMPORT_BY_SKLAND'})
      window.location.href = '/';
    }, 2000)
}

function toRetrieve() {
  if (props.dialog) {
    emit('navigate', 'RETRIEVE')
    return
  }

  router.push({name: "RETRIEVE"})
}

const router = useRouter()
const route = useRoute()

function sendVerificationCode() {
  const data = {
    mailUsage: 'login',
    email: inputContent.value.email
  }
  userAPI.sendVerificationCodeV2(data).then(response => {
    createMessage({type:'success',text:'验证码发送成功'})
  })
}

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
            验证码登录
          </button>
        </div>

        <div class="auth-card-body">
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
              <div class="auth-inline-action">
                <span></span>
                <button class="auth-link-button" type="button" @click="toRetrieve()">
                  忘记密码？
                </button>
              </div>
            </v-tabs-window-item>

            <v-tabs-window-item value="email">
              <v-text-field
                  label="邮箱"
                  placeholder="请输入绑定邮箱"
                  v-model="inputContent.email"
                  color="primary"
                  density="comfortable"
                  variant="solo-filled"
                  hide-details
                  class="auth-field"
              >
                <template v-slot:append-inner>
                  <button class="auth-code-button" type="button" @click="sendVerificationCode">
                    发送验证码
                  </button>
                </template>
              </v-text-field>
              <v-text-field
                  label="验证码"
                  placeholder="请输入验证码"
                  v-model="inputContent.verificationCode"
                  color="primary"
                  density="comfortable"
                  variant="solo-filled"
                  hide-details
                  class="auth-field"
              ></v-text-field>
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
            <li>绑定邮箱后，也可以使用邮箱作为账号登录。</li>
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
