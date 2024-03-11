<template>
  <div class="survey-login-page">
    <div class="survey-login-btn" @click="loginVisible = !loginVisible" v-show="userData.status<0">
      <span class="login-btn-text" id="nav_user_name">登录</span>
    </div>

    <div v-show="userData.status>0">
      <c-popover :name="'avatar'">
        <template #title>
          <div class="nav_avatar_image_wrap">
            <div :class="getSprite(userData.avatar)"></div>
          </div>
        </template>

        <div class="survey_nav_menu" id="avatar">
          <a class="survey_nav_menu_item menu_href" href="/survey/account/home"> 个人中心 </a>
          <a class="survey_nav_menu_item menu_href" @click="loginVisible=!loginVisible">退出登录 </a>
        </div>
      </c-popover>
    </div>


    <c-popup :visible="loginVisible" v-model:visible="loginVisible">

      <div class="login_card" v-show="userData.status<0">
        <div class="login-checkbox">
          <button class="btn login-type-btn" :style="accountTypeClass('passWord')"
                  @click="selectAccountType('passWord')">密码{{ 'register' === registerOrLogin ? '注册' : '登录' }}
          </button>
          <div style="border-left: 2px solid rgba(0,0,0,0.5);height: 18px"></div>
          <button class="btn login-type-btn" :style="accountTypeClass('emailCode')"
                  @click="selectAccountType('emailCode')">邮箱{{ 'register' === registerOrLogin ? '注册' : '登录' }}
          </button>
        </div>

        <div class="login-form" v-show="'passWord'===account_type">
          <div class="login-form-item">
            <span class="input-label">账号：</span>
            <input class="login-form-input" type="text" placeholder="请输入" v-model="input_data.userName"/>
          </div>

          <div class="login_form_divider"></div>
          <div class="login-form-item">
            <span class="input-label">密码：</span>
            <input class="login-form-input" type="password" placeholder="请输入" v-model="input_data.passWord"/>
          </div>
        </div>

        <div class="login-form" v-show="'emailCode'===account_type">
          <div class="login-form-item">
            <div class="input-label">邮箱：</div>
            <input class="login-form-input" placeholder="请输入" v-model="input_data.email"/>
            <div style="border: 1px solid #d9d9d9;height: 32px;margin: 0 4px"></div>
            <div class="input-label" @click="sendEmailCodeByRegister()" style="cursor: pointer">获取验证码</div>
          </div>
          <div class="login_form_divider"></div>
          <div class="login-form-item">
            <div class="input-label">验证码：</div>
            <input class="login-form-input" placeholder="请输入" v-model="input_data.emailCode"/>
          </div>
        </div>


        <div class="login-checkbox">
          <div @click="registerOrLogin='register'" v-show="'login'===registerOrLogin"
               class="btn btn_white login-btn">
            没有账号请先注册
          </div>
          <div @click="registerOrLogin='login'" v-show="'register'===registerOrLogin"
               class="btn btn_white login-btn">
            已注册过直接登录
          </div>
          <button class="btn btn-blue login-btn" @click="register()"
                  v-show="'register'===registerOrLogin">
            注册
          </button>
          <button class="btn btn-blue login-btn" @click="login()"
                  v-show="'login'===registerOrLogin">
            登录
          </button>

        </div>



          <p class="login-tip"> 新用户注册可用账号密码注册和邮箱注册，也可在个人中心进行设置密码和邮箱绑定等操作</p>
          <p class="login-tip" style="color: #ff4b4b">
            *此账号为一图流账号，与鹰角网络通行证(明日方舟游戏账号)无关，仅为保存您的干员练度数据使用</p>

      </div>

      <div class="login_card" v-show="userData.status>0">
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
import "/src/assets/css/sprite/sprite_avatar_5.css";
import "/src/assets/css/sprite/sprite_avatar_4.css";
import "/src/assets/css/sprite/sprite_avatar_6.css";
import "/src/assets/css/sprite/sprite_skill.css";
import "/src/assets/css/sprite/sprite_rank.css";
import "/src/assets/css/survey/survey_index.css";
import "/src/assets/css/survey/login.scss"
import "/src/assets/css/survey/login.phone.scss"

import "/src/assets/css/survey/survey_nav.css";


import {onMounted, ref} from "vue";
import {cMessage} from "/src/custom/message";

import surveyApi from "/src/api/surveyUser";

let input_data = ref({
  userName: '',
  passWord: '',
  cred: '',
  email: '',
  emailCode: '',
  accountType: '',
  avatar: '',
  mailUsage: 'register'
}); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({userName: "", status: -100, token: void 0, code: 0}); //用户信息(用户名，用户id，用户状态)

let loginVisible = ref(false);

let registerOrLogin = ref('login')


function sendEmailCodeByRegister() {
  const data = {
    mailUsage: registerOrLogin.value,
    email: input_data.value.email,
  }
  surveyApi.sendEmailCode(data).then(response => {

    cMessage("验证码发送成功")
  })
}

// eslint-disable-next-line no-unused-vars
function sendEmailCodeForLogin() {
  const data = {
    mailUsage: 'login',
    email: input_data.value.email,
  }
  surveyApi.sendEmailCode(data).then(response => {

    cMessage("验证码发送成功")
  })
}

//注册
function register() {
  input_data.value.accountType = account_type.value
  surveyApi.register(input_data.value).then(response => {
    response = response.data
    localStorage.setItem("globalUserData", JSON.stringify(response));
    cMessage("注册成功");
    userData.value.userName = response.userName;
    userData.value.status = response.status;
    userData.value.token = response.token;
    userData.value.avatar = response.avatar ? response.avatar : 'char_377_gdglow';
    loginVisible.value = !loginVisible.value;

  })
}

let account_type = ref('passWord')

function selectAccountType(type) {
  account_type.value = type
}

function accountTypeClass(type) {
  if (account_type.value === type) return 'color:#409eff;'
}


//登录
function login() {
  input_data.value.accountType = account_type.value

  surveyApi.login(input_data.value).then(response => {
    if (response.data.status > 0) {

      localStorage.setItem("globalUserData", JSON.stringify(response.data));
      // 登录成功刷新
      location.reload()
    }
  })
}

function userDataCache() {

  let cacheData = localStorage.getItem("globalUserData");

  if (!cacheData || cacheData === 'undefined') {
    return
  }

  cacheData = JSON.parse(cacheData)
  userData.value.userName = cacheData.userName;
  userData.value.status = cacheData.status;
  userData.value.token = cacheData.token;
  userData.value.avatar = cacheData.avatar ? cacheData.avatar : 'char_377_gdglow';
  userData.value.email = cacheData['email'] === undefined ? "未绑定1" : cacheData['email'];
}

//登出
function logout() {
  localStorage.removeItem('globalUserData')
  setTimeout(() => {
    location.reload()
  }, 1000);
}

function getSprite(id) {

  return "bg-" + id + " nav_avatar_image";
}

onMounted(() => {
  userDataCache()
});
</script>

<style scoped>
.login-type-btn {
  border: none;
}
</style>
