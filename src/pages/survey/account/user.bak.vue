<template>
  <div class="survey-login-page">
    <div class="survey-login-btn">
      <router-link to="/survey/account/register"  >
        <span class="header-button-label" style="margin-right: 12px">注册</span>
      </router-link>
      <router-link to="/survey/account/login"  >
        <span class="header-button-label">登录</span>
      </router-link>
    </div>

    <div v-show="userData.status>0">
      <c-popover :name="'avatar'">
        <template #title>
          <div class="nav-avatar-image-wrap">
            <div :class="getSprite(userData.avatar)"></div>
          </div>
        </template>

        <div class="survey_nav_menu" id="avatar">
          <a class="survey_nav_menu_item menu_href" href="/survey/account/home"> 个人中心 </a>
          <a class="survey_nav_menu_item menu_href" @click="loginVisible=!loginVisible">退出登录 </a>
        </div>
      </c-popover>
    </div>


    <c-popup :visible="loginVisible" v-model:visible="loginVisible" >

      <div class="login-card" v-show="userData.status<0">
        <div class="login-checkbox">
          <button class="btn checkbox-btn" :style="accountTypeClass('hgToken')"
                  @click="selectAccountType('hgToken')">token登录
          </button>
          <div style="border-left: 2px solid rgba(0,0,0,0.5);height: 18px"></div>
          <button class="btn checkbox-btn" :style="accountTypeClass('emailCode')"
                  @click="selectAccountType('emailCode')">邮箱登录
          </button>
          <div style="border-left: 2px solid rgba(0,0,0,0.5);height: 18px"></div>
          <button class="btn checkbox-btn" :style="accountTypeClass('passWord')"
                  @click="selectAccountType('passWord')">密码登录
          </button>
        </div>

        <div class="login-form" v-show="'hgToken'===accountType">
          <div class="login-form-item">
            <span class="input-label">token：</span>
            <input class="login-form-input" type="text" placeholder="请输入" v-model="inputData.hgToken"/>
          </div>
        </div>

        <div class="login-form" v-show="'emailCode'===accountType">
          <div class="login-form-item">
            <div class="input-label">邮箱：</div>
            <input class="login-form-input" placeholder="请输入" v-model="inputData.email"/>
            <div style="border: 1px solid #d9d9d9;height: 32px;margin: 0 4px"></div>
            <div class="input-btn" @click="sendEmailCode()" style="cursor: pointer">获取验证码</div>
          </div>
          <div class="login_form_divider"></div>
          <div class="login-form-item">
            <div class="input-label">验证码：</div>
            <input class="login-form-input" placeholder="请输入" v-model="inputData.emailCode"/>
          </div>
        </div>

        <div class="login-form" v-show="'passWord'===accountType">
          <div class="login-form-item">
            <span class="input-label">账号：</span>
            <input class="login-form-input" type="text" placeholder="请输入" v-model="inputData.userName"/>
          </div>

          <div class="login_form_divider"></div>
          <div class="login-form-item">
            <span class="input-label">密码：</span>
            <input class="login-form-input" type="password" placeholder="请输入" v-model="inputData.passWord"/>
          </div>
        </div>

        <div class="login-checkbox">
          <button class="btn btn-blue login-btn" @click="user()">
            登录
          </button>
        </div>


        <div class="login-card-notice">
          <h3>登录须知</h3>
          <span style="color: #1f88ff" class="title">*为简化注册流程，现作出如下改动：</span>
          <span>&emsp;&emsp;1.账号密码登录方式停止注册，旧账号密码仍可登录</span> <br>
          <span>&emsp;&emsp;2.邮箱登录输入验证码即可注册/登录</span><br>
          <span>&emsp;&emsp;3.增加官网token登录方式，输入官网token即可完成注册/登录，并完成导入干员数据</span>
          <span style="color: #ff4b4b" class="title">
            *此账号为一图流账号，与鹰角网络通行证(明日方舟游戏账号)无关，仅为保存您的干员练度数据使用
          </span>
        </div>
      </div>

      <div class="login-card" v-show="userData.status>0">
        <div class="logout_text">确定登出当前用户？</div>
        <div class="logout_btn_wrap">
          <button class="btn btn-blue logout_btn" @click="logout()">确定</button>
          <button class="btn btn-red logout_btn" @click="loginVisible = !loginVisible">取消</button>
        </div>
      </div>
    </c-popup>


  </div>
</template>

<script setup>
import "/src/assets/css/survey/survey_common.css";
import "/src/assets/css/survey/common.scss"
import "/src/assets/css/survey/common.phone.scss"
import "/src/assets/css/sprite/sprite_skill.css";
import "/src/assets/css/sprite/sprite_rank.css";
import "/src/assets/css/survey/survey_index.css";
import "/src/assets/css/survey/login.scss"
import "/src/assets/css/survey/login.phone.scss"

import "/src/assets/css/survey/survey_nav.css";


import {onMounted, ref} from "vue";
import {cMessage} from "/src/utils/Message";

import surveyApi from "/src/api/userInfo";
import {getUserInfo} from "/src/pages/survey/service/userInfo.js";

let loginStatus = ref('')





let inputData = ref({
  userName: '',
  passWord: '',
  cred: '',
  email: '',
  emailCode: '',
  accountType: '',
  avatar: '',
  hgToken: '',
  mailUsage: 'register'
});



//用户输入的用户名，用obj没准后期有别的字段
let userData = ref({userName: "", status: -100, token: void 0, code: 0}); //用户信息(用户名，用户id，用户状态)

let loginVisible = ref(false);

let registerOrLogin = ref('user.vue')


function sendEmailCode() {
  const data = {
    mailUsage: registerOrLogin.value,
    email: inputData.value.email,
  }
  surveyApi.sendVerificationCode(data).then(response => {
    cMessage("验证码发送成功")
  })
}

// eslint-disable-next-line no-unused-vars
function sendEmailCodeForLogin() {
  const data = {
    mailUsage: 'user.vue',
    email: inputData.value.email,
  }
  surveyApi.sendVerificationCode(data).then(response => {

    cMessage("验证码发送成功")
  })
}


let accountType = ref('passWord')

function selectAccountType(type) {
  accountType.value = type
}

function accountTypeClass(type) {
  if (accountType.value === type) return 'color:#409eff;'
}

function getLoginParams() {

  if ('hgToken' === accountType.value) {
    return {
      accountType: 'hgToken',
      hgToken: inputData.value.hgToken
    }
  }
  if ('emailCode' === accountType.value) {
    return {
      accountType: 'email',
      email: inputData.value.email,
      emailCode: inputData.value.emailCode,
    }
  }
  if ('passWord' === accountType.value) {
    return {
      accountType: 'passWord',
      userName: inputData.value.userName,
      passWord: inputData.value.passWord,
    }
  }


}

//登录
function login() {
  const loginParams = getLoginParams();
  surveyApi.loginV3(loginParams).then(response => {
    response = response.data
    localStorage.setItem("USER_TOKEN", response.token.toString());
    // 登录成功刷新
    location.reload()
  })
}

async function getUserInfoByToken() {

  userData.value = await getUserInfo()
}

//登出
function logout() {
  localStorage.removeItem('USER_TOKEN')
  setTimeout(() => {
    location.reload()
  }, 1000);
}

function getSprite(id) {

  return "bg-" + id + " nav_avatar_image";
}

onMounted(() => {
  getUserInfoByToken()
});
</script>

<style scoped>
.checkbox-btn {
  border: none;
}
</style>
