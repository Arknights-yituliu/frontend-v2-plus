<script setup>
import {onMounted, ref} from "vue";
import userAPI from '/src/api/userInfo.js'


let registerType = ref('')

function optionLineClass(type) {
  if (type === registerType.value) {
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
  hgToken: ''
})

function optionBtnColor(type) {
  if (type === registerType.value) {
    return 'color:#1f88ff'
  } else {
    return ''
  }
}

function inputTipDisplay(inputValue) {
  console.log(!inputValue)
  return !inputValue;
}

function login(){
   userAPI.loginV3().then(response=>{
      location.reload('/survey/operator')
   })
}

onMounted(() => {
  registerType.value = 'password'
})

</script>

<template>
  <div class="login-page">
    <div class="login-form">
      <div class="checkbox login-checkbox">
        <div class="checkbox-option">
          <button class="checkbox-btn" :style="optionBtnColor('password')"
                  @click="registerType='password'">密码登录
          </button>
          <div :class="optionLineClass('password')"></div>
        </div>
        <div class="checkbox-option">
          <button class="checkbox-btn" :style="optionBtnColor('email')"
                  @click="registerType='email'">邮件登录
          </button>
          <div :class="optionLineClass('email')"></div>
        </div>
      </div>

      <div class="login-form-content" v-show="'password'===registerType">
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
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">确认密码</span>
          <input class="login-form-input" type="password" v-model="inputContent.confirmPassword">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.confirmPassword)">请再次输入登录密码</span>
        </div>
      </div>

      <div class="login-form-content" v-show="'email'===registerType">
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">邮箱</span>
          <input class="login-form-input" v-model="inputContent.userName">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.userName)">请输入邮箱</span>
        </div>
        <div class="login-form-content-item">
          <span class="login-form-content-item-label">验证码</span>
          <input class="login-form-input" type="password" v-model="inputContent.password">
          <span class="login-form-content-item-tip"
                v-show="inputTipDisplay(inputContent.password)">请输入验证码</span>
          <button class="login-form-btn-send">发送验证码</button>
        </div>
      </div>

      <button class="btn btn-blue" style="display: block;width: 200px;margin:0 auto">登录</button>
      <span class="login-form-content-tip-btn" v-show="'password'===registerType">忘记密码？</span>
      <div class="login-form-notice">
        <p style="color: #1f88ff" class="title">*账号系统改动说明：</p>
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
.login-page {
  padding: 1px;
  min-height: 95vh;

  .login-form {
    width: 500px;
    height: 100%;
    margin: 20px auto;
    box-shadow: 0px 2px 15px var(--c-box-shadow-color);
    padding: 1px;
    font-weight: 500;
  }

  .login-checkbox {
    width: 360px;
    margin: 20px auto 0;
  }

  .checkbox-option-login {
    margin: 0 20px 0 0;
  }

  .login-form-content {
    margin: 30px auto 20px;
    height: 300px;
  }

  .login-form-content-item {
    position: relative;
    width: 360px;
    margin: 12px auto;
  }

  .login-form-content-item-label {
    display: block;
    font-size: 18px;
    padding: 4px 0;
  }

  .login-form-content-item-tip {
    position: absolute;
    font-size: 14px;
    color: var(--c-text-tip-color);
    font-style: italic;
    top: 32px;
    left: 0;
  }

  .login-form-input {
    outline: none;
    border: none;
    width: 360px;
    line-height: 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    position: relative;
    background-color: transparent;
    font-size: 18px;
    z-index: 3;
  }

  .login-form-input:focus {
    border-bottom: 2px solid rgb(147, 180, 255);
  }

  .login-form-btn-send {
    border: 0;
    background-color: transparent;
    position: absolute;
    right: 12px;
    font-size: 16px;
    border-left: 1px solid rgba(0, 0, 0, 0.3);
    top: 8px;
    z-index: 4;
  }

  .login-form-content-tip-btn {
    display: block;
    width:95%;
    text-align: right;
    cursor: pointer;
  }

  .login-form-notice {
    width: 450px;
    margin: 30px auto;
    font-size: 14px;

    .title {
      font-weight: bold;
      margin: 8px 0;
    }
  }


}
</style>