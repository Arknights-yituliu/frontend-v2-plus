<script setup>
import {onMounted, ref} from "vue";
import userAPI from '/src/api/userInfo.js'
import '/src/assets/css/survey/login.v2.scss'
import {cMessage} from "../../../custom/message.js";
import {useRouter} from "vue-router";

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

function toRetrieveAuthentication(progress) {
  userAPI.retrieveAuthentication(inputContent.value).then(response => {
    recoveryProgress.value = `left:${progress*-400}px`
    inputContent.value.token = response.data.token
    cMessage('请在10分钟内修改您的密码')
  })
}

function toResetPassword(progress) {
  userAPI.resetPassword(inputContent.value).then(response => {
    recoveryProgress.value = `left:${progress*-400}px`
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
        <div class="checkbox-option">
          <button class="checkbox-btn" :style="optionBtnColor('email')"
                  @click="inputContent.accountType='email'">邮件找回
          </button>
          <div :class="optionLineClass('email')"></div>
        </div>
        <!--        <div class="checkbox-option">-->
        <!--          <button class="checkbox-btn" :style="optionBtnColor('skland')"-->
        <!--                  @click="inputContent.accountType='skland'">森空岛找回-->
        <!--          </button>-->
        <!--          <div :class="optionLineClass('skland')"></div>-->
        <!--        </div>-->
        <div class="checkbox-option">
          <button class="checkbox-btn" :style="optionBtnColor('hgToken')"
                  @click="inputContent.accountType='hgToken'">通行证找回
          </button>
          <div :class="optionLineClass('hgToken')"></div>
        </div>
      </div>

      <div class="retrieve-form-scroll-wrap">
        <div class="retrieve-form-scroll" v-show="'email'===inputContent.accountType"
             :style="recoveryProgress">
          <div class="retrieve-form-scroll-item">
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">邮箱</span>
              <input class="login-form-input" v-model="inputContent.email">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.email)">请输入邮箱</span>
            </div>
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">验证码</span>
              <input class="login-form-input" type="password" v-model="inputContent.verificationCode">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.verificationCode)">请输入验证码</span>
              <button class="login-form-btn-send" @click="sendVerificationCode">发送验证码</button>
            </div>

            <button class="btn btn-blue" style="display: block;width: 200px;margin:0 auto"
                    @click="toRetrieveAuthentication(1)">找回账号
            </button>
          </div>

          <div class="retrieve-form-scroll-item" v-show="'email'===inputContent.accountType">
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
                    v-show="inputTipDisplay(inputContent.confirmPassword)">请再次输入新密码，仅可由英文、数字组成</span>
              <span class="login-form-content-item-warn">
                  {{ checkPassword() }}
              </span>
            </div>

            <button class="btn btn-blue login-btn"
                    @click="toResetPassword(2)">修改密码
            </button>
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
            <button class="btn btn-blue login-btn"
                    @click="openLinkOnNewPage(HYPERGRYPH_LINK)">点击前往官网
            </button>

            <button class="btn btn-blue login-btn"
                    @click="recoveryProgress='left:-400px'">已登录官网，前往下一步
            </button>

          </div>

          <div class="retrieve-form-scroll-item">
            <img alt="" src="/image/skland/hgAPI.jpg" style="width: 100%;">
            <p>点击对应的服务器链接，将会返回如上图所示的一段数据，将其全部复制</p>

              <button class="btn btn-blue login-btn-line" @click="openLinkOnNewPage(HYPERGRYPH_TOKEN_API)">官服
              </button>
              <button class="btn btn-red login-btn-line" @click="openLinkOnNewPage(BILIBILI_TOKEN_API)">B服
              </button>


            <button class="btn btn-blue login-btn"
                    @click="recoveryProgress='left:-800px'">我已复刻，前往下一步
            </button>

          </div>

          <div class="retrieve-form-scroll-item">
            <div class="login-form-content-item">
              <span class="login-form-content-item-label">输入token</span>
              <input class="login-form-input" v-model="inputContent.hgToken">
              <span class="login-form-content-item-tip"
                    v-show="inputTipDisplay(inputContent.hgToken)">请输入token</span>
            </div>

            <button class="btn btn-blue" style="display: block;width: 200px;margin:0 auto"
                    @click="toRetrieveAuthentication(3)">找回账号
            </button>
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

            <button class="btn btn-blue" style="display: block;width: 200px;margin:0 auto"
                    @click="toResetPassword(4)">修改密码
            </button>
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

