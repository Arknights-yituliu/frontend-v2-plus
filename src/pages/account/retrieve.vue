<script setup>
import {onMounted, ref} from "vue";
import userAPI from '/src/api/userInfo.js'
import '/src/assets/css/account/login.v2.scss'
import {cMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";

const HYPERGRYPH_LINK = 'https://ak.hypergryph.com/user/home'
const HYPERGRYPH_TOKEN_API = 'https://web-api.hypergryph.com/account/info/hg'
const BILIBILI_TOKEN_API = 'https://web-api.hypergryph.com/account/info/ak-b'
const SKLAND_LINK = 'https://www.skland.com/'
const CONSOLE_CODE = 'localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\')'

const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;

const passwordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成'
]

const confirmPasswordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成',
  value => value===inputContent.value.password || '两次密码输入不一致'
]

function openLinkOnNewPage(url) {
  window.open(url)
}

let currentStepper = ref(0)

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
    cMessage('验证码发送成功')
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
    cMessage('请在10分钟内修改您的密码')
  })
}

/**
 * 重置密码
 * @param step 当前步骤
 */
function toResetPassword(step) {
  userAPI.resetPassword(inputContent.value).then(response => {
    nextStep(step)
    localStorage.setItem("USER_TOKEN", response.data.token.toString());
    setTimeout(() => {
      router.push({name: "AccountHome"})
    }, 3000)
  })
}



const nextStep = (step)=>{
  currentStepper.value = step;
}

onMounted(() => {
  inputContent.value.accountType = 'email'
})

</script>

<template>
  <div class="login-page">
    <v-card class="login-card m-a">
      <v-tabs
          v-model="inputContent.accountType"
          bg-color="primary"
      >
        <v-tab value="email">通过邮箱找回</v-tab>
      </v-tabs>
      <v-card-text>
        <v-tabs-window v-model="inputContent.accountType">
          <v-tabs-window-item value="email">
            <v-stepper alt-labels v-model="currentStepper">
              <v-stepper-header>
                <v-stepper-item
                    title="邮箱验证"
                    value="1"
                ></v-stepper-item>

                <v-divider></v-divider>

                <v-stepper-item
                    title="设置新密码"
                    value="2"
                ></v-stepper-item>

                <v-divider></v-divider>

                <v-stepper-item
                    title="设置成功"
                    value="3"
                ></v-stepper-item>
              </v-stepper-header>

              <v-stepper-window v-show="currentStepper===0">
                <div>邮箱</div>
                <div class="flex">
                  <v-text-field
                      v-model="inputContent.email"
                      color="primary"
                      density="compact"
                      variant="outlined"
                      class="m-4"
                  ></v-text-field>
                  <v-btn color="primary" variant="text" text="发送验证码"
                         @click="sendVerificationCode"></v-btn>
                </div>
                <div>验证码</div>
                <v-otp-input class="m-4" v-model="inputContent.verificationCode" length="4"></v-otp-input>
                <div class="flex justify-center">
                  <v-btn color="primary" variant="outlined" text="下一步" @click="toRetrieveAuthentication(1)"> </v-btn>
                </div>
              </v-stepper-window>

              <v-stepper-window v-show="currentStepper===1">
                <div class="m-0-4">登录密码</div>
                <v-text-field
                    density="compact"
                    :rules="passwordRules"
                    color="primary"
                    hint="密码仅可由数字、英文组成"
                    v-model="inputContent.password"
                    variant="outlined"
                    type="password"
                    hide-details="auto"
                    class="m-4"
                ></v-text-field>
                <div class="m-0-4">确认密码</div>
                <v-text-field
                    density="compact"
                    :rules="confirmPasswordRules"
                    color="primary"
                    hint="密码仅可由数字、英文组成"
                    v-model="inputContent.confirmPassword"
                    variant="outlined"
                    type="password"
                    hide-details="auto"
                    class="m-4"
                ></v-text-field>
                <div class="flex justify-center">
                  <v-btn color="primary" variant="outlined" text="下一步" @click="toResetPassword(2)"> </v-btn>
                </div>
              </v-stepper-window>

              <v-stepper-window v-show="currentStepper===2">
                <v-alert
                    text="即将转跳到首页"
                    title="修改成功"
                    type="success"
                ></v-alert>
              </v-stepper-window>
            </v-stepper>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>
    </v-card>

  </div>
</template>

