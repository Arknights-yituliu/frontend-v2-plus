<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/account/login.v2.scss'
import userAPI from '/src/api/userInfo.js'
import {createMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";


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

const confirmPasswordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成',
  value => value===inputContent.value.password || '两次密码输入不一致'
]

function getParam(method) {
  let param = {
    accountType: inputContent.value.accountType
  }
  if ('password' === inputContent.value.accountType) {

    param.userName = inputContent.value.userName
    param.password = inputContent.value.password

    if (inputContent.value.email || '' !== inputContent.value.email) {
      param.email = inputContent.value.email
      param.verificationCode = inputContent.value.verificationCode
    }
  }

  if ('email' === inputContent.value.accountType) {
    param.email = inputContent.value.email
    param.verificationCode = inputContent.value.verificationCode
  }

  return param
}

let inputContent = ref({
  userName: '',
  password: '',
  confirmPassword: '',
  email: '',
  verificationCode: '',
  hgToken: '',
  accountType: '',
})


function checkPassword() {
  if (inputContent.value.confirmPassword.length > 2) {
    if (inputContent.value.password !== inputContent.value.confirmPassword) {
      return '两次密码不一致'
    }
  }
}



const router = useRouter()

function toRegister() {
  const param = getParam()
  userAPI.registerV3(param).then(response => {
    localStorage.setItem("USER_TOKEN", response.data.token.toString());
    createMessage({type:'success',text:'登录成功，即将转跳到我的干员导入流程'})
    setTimeout(() => {
      router.push({
        name: 'OperatorSurvey',
        query: {
          openImport: '1'
        }
      })
    }, 3000)
  })
}

function sendVerificationCode() {
  const data = {
    mailUsage: 'register',
    email: inputContent.value.email
  }
  userAPI.sendVerificationCodeV2(data).then(response => {

    createMessage({type:'success',text:'验证码发送成功'})
  })
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
                :rules="confirmPasswordRules"
                color="primary"
                hint="密码仅可由数字、英文组成"
                v-model="inputContent.confirmPassword"
                variant="solo-filled"
                type="password"
                hide-details
                class="auth-field"
            ></v-text-field>
            <v-text-field
                label="绑定邮箱（可选）"
                placeholder="用于找回密码"
                density="comfortable"
                color="primary"
                hint="找回密码目前只能通过绑定邮箱"
                v-model="inputContent.email"
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
            <v-otp-input
                aria-label="邮箱验证码"
                class="auth-otp"
                v-model="inputContent.verificationCode"
                length="4"
            ></v-otp-input>
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
                <button class="auth-code-button" type="button" @click="sendVerificationCode">
                  发送验证码
                </button>
              </template>
            </v-text-field>
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
          <li>绑定邮箱后才能通过邮箱找回密码。</li>
          <li>请勿使用与其他重要账号相同的密码。</li>
        </ul>
      </section>
    </v-card>



  </div>
</template>

