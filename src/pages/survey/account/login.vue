<script setup>
import {onMounted, ref} from "vue";
import userAPI from '/src/api/userInfo.js'
import '/src/assets/css/survey/login.v2.scss'
import {cMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";
import MyButton from '/src/components/Button.vue'

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

function toLogin() {

  userAPI.loginV3(inputContent.value).then(response => {
    localStorage.setItem("USER_TOKEN", response.data.token.toString());
    cMessage('登录成功，即将转跳到森空岛导入页面')
    setTimeout(() => {
      router.push({name:'IMPORT_BY_SKLAND'})
    }, 3000)

  })
}

function toRetrieve(){
  router.push({name:"RETRIEVE"})
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
          账号密码登录
        </c-checkbox-option>
        <c-checkbox-option :value="inputContent.accountType" label="email"
                           @click="inputContent.accountType='email'">
          邮箱登录
        </c-checkbox-option>
      </div>

      <div class="login-form-content" v-show="'password'===inputContent.accountType">
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">用户名</span>
          <input class="login-form-input" v-model="inputContent.userName">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.userName)">请输入用户名</span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">登录密码</span>
          <input class="login-form-input" type="password" v-model="inputContent.password">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.password)">请输入登录密码</span>
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
          <input class="login-form-input" type="password" v-model="inputContent.verificationCode">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.verificationCode)">请输入验证码</span>
          <button class="login-form-btn-send" @click="sendVerificationCode">发送验证码</button>
        </div>
      </div>



        <my-button data-color="blue" class="my-button-login"
                   @click="toLogin">
          登录
        </my-button>




      <span class="login-form-content-tip-btn" v-show="'password'===inputContent.accountType" @click="toRetrieve()">忘记密码？</span>

      <div class="login-form-notice">
        <p>
          因服务器被攻击，数据库部分数据无法恢复，请尽量重新注册账号
        </p>
        <p>
          选择密码登录时，如果绑定了邮箱，也可将邮箱作为账号进行登录。
        </p>
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

<style>


</style>