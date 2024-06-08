<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/survey/login.v2.scss'
import userAPI from '/src/api/userInfo.js'
import {cMessage} from "../../../custom/message.js";



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
  accountType:'',
})

function optionBtnColor(type) {
  if (type === inputContent.value.accountType) {
    return 'color:#1f88ff'
  } else {
    return ''
  }
}

function inputTipDisplay(inputValue) {
  console.log(!inputValue)
  return !inputValue;
}

function toRegister() {
  userAPI.registerV3(inputContent.value).then(response => {
    localStorage.setItem("USER_TOKEN", response.data.token.toString());

    cMessage('注册成功')
  })
}

function sendVerificationCode(){
  const data = {
    mailUsage:'register',
    email:inputContent.value.email
  }
  userAPI.sendVerificationCodeV2(data).then(response=>{

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
        <div class="checkbox-option">
          <button class="checkbox-btn" :style="optionBtnColor('password')"
                  @click="inputContent.accountType='password'">账号密码注册
          </button>
          <div :class="optionLineClass('password')"></div>
        </div>
        <div class="checkbox-option">
          <button class="checkbox-btn" :style="optionBtnColor('email')"
                  @click="inputContent.accountType='email'">邮件注册
          </button>
          <div :class="optionLineClass('email')"></div>
        </div>
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
                v-show="inputTipDisplay(inputContent.password)">请输入登录密码，仅可由英文、数字组成</span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">确认密码</span>
          <input class="login-form-input" type="password" v-model="inputContent.confirmPassword">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.confirmPassword)">请再次输入登录密码</span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">绑定邮箱(选填)</span>
          <input class="login-form-input" type="password" v-model="inputContent.email">
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
              @click="toRegister()">注册账号</button>
      <div class="login-form-notice">
        <p style="color: #6eb0ff" class="title">*账号系统改动说明：</p>
        <p>
          1.选择账号密码注册时，如果在注册时输入了绑定邮箱或后续在个人中心绑定了邮箱，也可将邮箱作为账号通过账号密码方式登录。
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

