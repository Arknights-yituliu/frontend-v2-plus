<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/survey/login.v2.scss'
import '/src/assets/css/survey/login.v2.phone.scss'
import userAPI from '/src/api/userInfo.js'
import {cMessage} from "../../../custom/message.js";
import {useRouter} from "vue-router";

function getParam(method) {
  let param = {
    accountType: inputContent.value.accountType
  }
  if ('password' === inputContent.value.accountType) {

    param.userName = inputContent.value.userName
    param.password = inputContent.value.password

    if (inputContent.value.email||''!==inputContent.value.email) {
      param.email = inputContent.value.email
    }
  }

  if('email'===inputContent.value.accountType){
    param.email = inputContent.value.email
    param.verificationCode  =inputContent.value.verificationCode
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

function inputTipDisplay(inputValue) {
  console.log(!inputValue)
  return !inputValue;
}

const router = useRouter()

function toRegister() {
  const param = getParam()
  userAPI.registerV3(param).then(response => {
    localStorage.setItem("USER_TOKEN", response.data.token.toString());
    setTimeout(() => {
      router.push({name:"AccountHome"})
    }, 3000)
    cMessage('注册成功，即将转跳到个人信息页面')
  })
}

function sendVerificationCode() {
  const data = {
    mailUsage: 'register',
    email: inputContent.value.email
  }
  userAPI.sendVerificationCodeV2(data).then(response => {

    cMessage('验证码发送成功')
  })
}


onMounted(() => {
  inputContent.value.accountType = 'password'
})

</script>

<template>
  <div class="login-page">
    <div class="login-form">
      <div class="checkbox login-checkbox">
        <c-checkbox-option :value="inputContent.accountType" label="password"
                           @click="inputContent.accountType='password'">
          账号密码注册
        </c-checkbox-option>
        <c-checkbox-option :value="inputContent.accountType" label="email"
                           @click="inputContent.accountType='email'">
          邮箱注册
        </c-checkbox-option>
      </div>

      <div class="login-form-content" v-show="'password'===inputContent.accountType">
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">用户名</span>
          <input class="login-form-input" v-model="inputContent.userName">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.userName)">请输入用户名，仅可由汉字、英文、数字组成</span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">登录密码</span>
          <input class="login-form-input" type="password" v-model="inputContent.password">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.password)">请输入密码，仅可由英文、数字组成</span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">确认密码</span>
          <input class="login-form-input" type="password" v-model="inputContent.confirmPassword">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.confirmPassword)">请再次输入密码</span>
          <span class="login-form-content-item-warn">
                  {{ checkPassword() }}
              </span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">绑定邮箱(选填)</span>
          <input class="login-form-input" v-model="inputContent.email">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.confirmPassword)">请输入邮箱</span>
        </div>
      </div>

      <div class="login-form-content" v-show="'email'===inputContent.accountType">
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">邮箱</span>
          <input class="login-form-input" v-model="inputContent.email">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.email)">请输入邮箱</span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">验证码</span>
          <input class="login-form-input" v-model="inputContent.verificationCode">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.verificationCode)">请输入验证码</span>
          <button class="login-form-btn-send" @click="sendVerificationCode()">发送验证码</button>
        </div>
      </div>

      <button class="btn btn-blue"
              style="display: block;margin:0 auto"
              @click="toRegister()">注册账号
      </button>
      <div class="login-form-notice">
        <p>
          邮箱是找回一图流账号密码的途径之一，强烈建议绑定邮箱，绑定后也作为账号用于登录
        </p>
        <p class="tip-color-warn">
          *此账号为一图流账号，与鹰角网络通行证(明日方舟游戏账号)无关，仅为保存您的干员练度数据使用
        </p>
      </div>
    </div>


  </div>
</template>

