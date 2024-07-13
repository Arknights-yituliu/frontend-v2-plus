<script setup>
import {onMounted, ref} from "vue";
import userAPI from '/src/api/userInfo.js'
import '/src/assets/css/survey/login.v2.scss'
import {cMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";

import MyButton from '/src/components/Button.vue'

const HYPERGRYPH_LINK = 'https://ak.hypergryph.com/user/home'
const HYPERGRYPH_TOKEN_API = 'https://web-api.hypergryph.com/account/info/hg'
const BILIBILI_TOKEN_API = 'https://web-api.hypergryph.com/account/info/ak-b'
const SKLAND_LINK = 'https://www.skland.com/'
const CONSOLE_CODE = 'localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\')'


function openLinkOnNewPage(url) {
  window.open(url)
}


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
  accountType: '',
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

function setRecoveryProgress(step){
  const width = - document.getElementById("retrieve-form-scroll-item").offsetWidth
  recoveryProgress.value = `left:${step * width}px`
  console.log(recoveryProgress.value)
}

function toRetrieveAuthentication(step) {
  userAPI.retrieveAuthentication(inputContent.value).then(response => {
    setRecoveryProgress(step)
    inputContent.value.token = response.data.tmpToken
    inputContent.value.userName = response.data.userName
    cMessage('请在10分钟内修改您的密码')
  })
}

function toResetPassword(step) {
  userAPI.resetPassword(inputContent.value).then(response => {
    setRecoveryProgress(step)
    localStorage.setItem("USER_TOKEN", response.data.token.toString());
    setTimeout(() => {
      router.push({name: "AccountHome"})
    }, 3000)
  })
}


onMounted(() => {
  inputContent.value.accountType = 'email'
})

</script>

<template>
  <div class="login-page">
    <div class="login-form">
      <div class="checkbox login-checkbox">
        <c-checkbox-option :value="inputContent.accountType" label="email"
                           @click="inputContent.accountType='email'">
          邮件找回
        </c-checkbox-option>
        <c-checkbox-option :value="inputContent.accountType" label="hgToken"
                           @click="inputContent.accountType='hgToken'">
          通行证找回
        </c-checkbox-option>
      </div>

      <div class="retrieve-form-scroll-item" id="retrieve-form-scroll-item" style="height: 0"></div>

      <div class="retrieve-form-scroll-wrap">
        <div class="retrieve-form-scroll" v-show="'email'===inputContent.accountType"
             :style="recoveryProgress">
          <div class="retrieve-form-scroll-item" >
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">邮箱</span>
              <input class="login-form-input" v-model="inputContent.email">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.email)">请输入邮箱</span>
            </div>
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">验证码</span>
              <input class="login-form-input"  v-model="inputContent.verificationCode">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.verificationCode)">请输入验证码</span>
              <button class="login-form-btn-send" @click="sendVerificationCode">发送验证码</button>
            </div>
           <div class="">

           </div>
            <my-button data-color="blue" class="my-button-login"
                       @click="toRetrieveAuthentication(1)">
              找回账号
            </my-button>

          </div>

          <div class="retrieve-form-scroll-item" v-show="'email'===inputContent.accountType">
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">这是您的用户名，无需再输入</span>
              <input class="login-form-input" v-model="inputContent.userName">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.userName)">无需输入用户名</span>
            </div>
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">新密码</span>
              <input class="login-form-input" type="password" v-model="inputContent.password">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.password)">请输入新密码</span>
            </div>
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">确认密码</span>
              <input class="login-form-input" type="password" v-model="inputContent.confirmPassword">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.confirmPassword)">请再次输入新密码，仅可由英文、数字组成</span>
              <span class="login-form-content-item-warn">
                  {{ checkPassword() }}
              </span>
            </div>

            <my-button data-color="blue" class="my-button-login"
                       @click="toResetPassword(2)">
              找回账号
            </my-button>
          </div>

          <div class="retrieve-form-scroll-item" v-show="'email'===inputContent.accountType">
            <div class="login-retrieve">
              <i class="iconfont icon-right" style="color: #00b28a;font-size: 18px"></i> 修改成功，即将转跳到个人中心
            </div>
          </div>
        </div>

        <div class="retrieve-form-scroll" v-show="'hgToken'===inputContent.accountType"
             :style="recoveryProgress">
          <div class="retrieve-form-scroll-item">
            <div style="margin: 10px auto;text-align: center">登录明日方舟官网</div>
            <my-button data-color="blue" class="my-button-login"
                       @click="openLinkOnNewPage(HYPERGRYPH_LINK)">
              点击前往官网
            </my-button>
            <my-button data-color="blue" class="my-button-login"
                       @click="setRecoveryProgress(1)">
              已登录官网，前往下一步
            </my-button>

          </div>

          <div class="retrieve-form-scroll-item">
            <img alt="" src="/image/skland/hgAPI.jpg" style="width: 100%;">
            <p>点击对应的服务器链接，将会返回如上图所示的一段数据，将其全部复制</p>

            <my-button data-color="blue"  @click="openLinkOnNewPage(HYPERGRYPH_TOKEN_API)">官服
            </my-button>
            <my-button data-color="red" @click="openLinkOnNewPage(BILIBILI_TOKEN_API)">B服
            </my-button>

            <my-button data-color="blue" class="my-button-login" @click="recoveryProgress='left:-800px'">
              我已复刻，前往下一步
            </my-button>

          </div>

          <div class="retrieve-form-scroll-item">
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">输入token</span>
              <input class="login-form-input" v-model="inputContent.hgToken">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.hgToken)">请输入token</span>
            </div>

            <my-button data-color="blue" class="my-button-login" @click="toRetrieveAuthentication(3)">
              找回账号
            </my-button>

          </div>

          <div class="retrieve-form-scroll-item" >
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">账号</span>
              <input class="login-form-input" v-model="inputContent.userName">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.userName)">请输入新密码</span>
            </div>
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">新密码</span>
              <input class="login-form-input" type="password" v-model="inputContent.password">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.password)">请输入新密码</span>
            </div>
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">确认密码</span>
              <input class="login-form-input" type="password" v-model="inputContent.confirmPassword">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.confirmPassword)">请再次输入新密码</span>
              <span class="login-form-content-item-warn">
                  {{ checkPassword() }}
              </span>
            </div>

            <my-button data-color="blue" class="my-button-login" @click="toResetPassword(4)">
              修改密码
            </my-button>
          </div>

          <div class="retrieve-form-scroll-item" >
            <div class="login-retrieve">
              <i class="iconfont icon-right" style="color: #00b28a;font-size: 18px"></i> 修改成功，即将转跳到个人中心
            </div>
          </div>
        </div>
      </div>


      <div class="login-form-notice">
        <p style="color: #ff4b4b" class="title">
          *此账号为一图流账号，与鹰角网络通行证(明日方舟游戏账号)无关，仅为保存您的干员练度数据使用
        </p>
        <p style="color: #ff4b4b" class="title">
          *请妥善保管好您的官网token和森空岛token
        </p>
      </div>
    </div>


  </div>
</template>

