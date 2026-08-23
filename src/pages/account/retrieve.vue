<script setup>
import {onMounted, ref, watch} from "vue";
import userAPI from '/src/api/userInfo.js'
import '/src/assets/css/account/login.v2.scss'
import {createMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";

const HYPERGRYPH_LINK = 'https://ak.hypergryph.com/user/home'
const HYPERGRYPH_TOKEN_API = 'https://web-api.hypergryph.com/account/info/hg'
const BILIBILI_TOKEN_API = 'https://web-api.hypergryph.com/account/info/ak-b'
const SKLAND_LINK = 'https://www.skland.com/'
const CONSOLE_CODE = 'copy(localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\'))'

const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;

const passwordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成'
]

const confirmPasswordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成',
  value => value === inputContent.value.password || '两次密码输入不一致'
]

function openLinkOnNewPage(url) {
  window.open(url)
}

let currentStepper = ref("sendEmail")

function optionLineClass(type) {
  if (type === inputContent.value.accountType) {
    return 'option-line-active'
  } else {
    return 'option-line'
  }
}

let inputContent = ref({
  userName: '',
  password: '',
  confirmPassword: '',
  email: '',
  verificationCode: '',
  hgToken: '',
  accountType: 'email',
  token: ''
})

function optionBtnColor(type) {
  if (type === inputContent.value.accountType) {
    return 'color:#1f88ff'
  } else {
    return ''
  }
}

function inputTipDisplay(inputValue) {
  return !inputValue;
}


const router = useRouter()

function sendVerificationCode() {
  const data = {
    mailUsage: 'login',
    email: inputContent.value.email
  }
  userAPI.sendVerificationCodeV2(data).then(response => {
    createMessage({type: 'success', text: '验证码发送成功'})
  })
}

function checkPassword() {
  if (inputContent.value.confirmPassword.length > 2) {
    if (inputContent.value.password !== inputContent.value.confirmPassword) {
      return '两次密码不一致'
    }
  }
}

let recoveryProgress = ref('left:0px')

function setRecoveryProgress(step) {
  const width = -document.getElementById("retrieve-form-scroll-item").offsetWidth
  recoveryProgress.value = `left:${step * width}px`

}

/**
 * 发起重置账号密码的请求，获取一个临时token，该临时token用于验证用户是否可修改密码
 * @param step 当前步骤
 */
function toRetrieveAuthentication(step) {
  userAPI.retrieveAuthentication(inputContent.value).then(response => {
    nextStep(step)
    inputContent.value.token = response.data.tmpToken
    inputContent.value.userName = response.data.userName
    createMessage({type: 'success', text: '请在10分钟内修改您的密码'})
  })
}

/**
 * 重置密码
 * @param step 当前步骤
 */
function toResetPassword(step) {
  console.log(step)
  userAPI.resetPassword(inputContent.value).then(response => {
    nextStep(step)
    localStorage.setItem("USER_TOKEN", response.data.token.toString());
    setTimeout(() => {
      router.push({name: "User Center"})
    }, 3000)
  })
}


watch(() => currentStepper.value, (newValue, oldValue) => {
  console.log(newValue)
})

const nextStep = (step) => {
  currentStepper.value = step;
}

onMounted(() => {
  inputContent.value.accountType = 'email'
})

</script>

<template>
  <div class="login-page">
    <v-card class="login-card">
      <v-card-title class="auth-card-header">
        <div class="auth-card-title">找回账号</div>
      </v-card-title>

      <v-card-text class="auth-card-body">
        <v-tabs-window v-model="inputContent.accountType">
          <v-tabs-window-item value="email">
            <v-stepper class="auth-stepper" alt-labels v-model="currentStepper">
              <v-stepper-header>
                <v-stepper-item
                    title="邮箱验证"
                    value="sendEmail"
                >
                  <template v-slot:icon>
                    1
                  </template>
                </v-stepper-item>

                <v-divider></v-divider>

                <v-stepper-item
                    title="设置新密码"
                    value="resetPassword"
                >
                  <template v-slot:icon>
                    2
                  </template>
                </v-stepper-item>

                <v-divider></v-divider>

                <v-stepper-item
                    title="设置成功"
                    value="resetSuccessful"
                >
                  <template v-slot:icon>
                    3
                  </template>
                </v-stepper-item>
              </v-stepper-header>

              <v-stepper-window v-show="currentStepper==='sendEmail'">
                <div>
                  <v-text-field
                      label="邮箱"
                      placeholder="请输入绑定邮箱"
                      v-model="inputContent.email"
                      color="primary"
                      density="comfortable"
                      variant="solo-filled"
                      class="auth-field"
                  >
                    <template #append-inner>
                      <button class="auth-code-button" type="button" @click="sendVerificationCode">
                        发送验证码
                      </button>
                    </template>
                  </v-text-field>
                </div>
                <v-otp-input
                    aria-label="邮箱验证码"
                    class="auth-otp"
                    v-model="inputContent.verificationCode"
                    length="4"
                ></v-otp-input>
                <div class="flex justify-center">
                  <v-btn
                      block
                      size="large"
                      variant="flat"
                      color="primary"
                      text="下一步"
                      class="auth-primary-action"
                      @click="toRetrieveAuthentication('resetPassword')"
                  ></v-btn>
                </div>
              </v-stepper-window>

              <v-stepper-window v-show="currentStepper==='resetPassword'">
                <v-text-field
                    label="新密码"
                    placeholder="请输入新密码"
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
                <div class="flex justify-center">
                  <v-btn
                      block
                      size="large"
                      variant="flat"
                      color="primary"
                      text="设置新密码"
                      class="auth-primary-action"
                      @click="toResetPassword('resetSuccessful')"
                  ></v-btn>
                </div>
              </v-stepper-window>

              <v-stepper-window v-show="currentStepper==='resetSuccessful'">
                <v-alert
                    text="密码已更新，即将返回个人中心"
                    title="修改成功"
                    type="success"
                    variant="tonal"
                ></v-alert>
              </v-stepper-window>
            </v-stepper>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>
    </v-card>

  </div>
</template>

