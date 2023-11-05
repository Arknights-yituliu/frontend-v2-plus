<template>
  <div class="survey_nav_page">
    <div class="survey_nav_bar" @click="login_visible = !login_visible" v-show="user_data.status<0">
      <div class="nav_user_name" id="nav_user_name">登录</div>
    </div>

    <div v-show="user_data.status>0" class="survey_nav_bar">
      <!--      <div class="nav_user_name" id="nav_user_name">{{ user_data.userName }}</div>-->
      <div class="nav_avatar_image_wrap">
        <div :class="getSprite(user_data.avatar)"></div>
      </div>
      <div class="survey_nav_menu_wrap">
        <div class="survey_nav_menu_arrow"></div>
        <div class="survey_nav_menu">
          <a class="survey_nav_menu_item menu_href" href="/survey/account/home"> 个人中心 </a>
          <a class="survey_nav_menu_item menu_href" @click="login_visible=!login_visible"> 退出登录 </a>
        </div>
      </div>
    </div>


    <c-popup :visible="login_visible" v-model:visible="login_visible">

      <div class="login_card" v-show="user_data.status<0">
        <div class="login_btn_wrap">
          <div class="btn" :style="accountTypeClass('passWord')"
                  @click="selectAccountType('passWord')">密码{{ 'register' === registerOrLogin ? '注册' : '登录' }}
          </div>
          <div style="border: 1px solid black;height: 18px"></div>
          <div class="btn" :style="accountTypeClass('emailCode')"
                  @click="selectAccountType('emailCode')">邮箱{{ 'register' === registerOrLogin ? '注册' : '登录' }}
          </div>
        </div>

        <div class="login_input_wrap" v-show="'passWord'===account_type">
          <div class="login_form">
            <div class="input_label">账号：</div>
            <input class="login_input" type="text" placeholder="请输入" v-model="input_data.userName"/>
          </div>

          <div class="login_form_divider"></div>
          <div class="login_form">
            <div class="input_label">密码：</div>
            <input class="login_input" type="password" placeholder="请输入" v-model="input_data.passWord"/>
          </div>
        </div>

        <div class="login_input_wrap" v-show="'emailCode'===account_type">
          <div class="login_form">
            <div class="input_label">邮箱：</div>
            <input class="login_input" placeholder="请输入" v-model="input_data.email"/>
            <div style="border: 1px solid #d9d9d9;height: 32px;margin: 0 4px"></div>
            <div class="input_label" @click="sendEmailCodeByRegister()" style="cursor: pointer">获取验证码</div>
          </div>
          <div class="login_form_divider"></div>
          <div class="login_form">
            <div class="input_label">验证码：</div>
            <input class="login_input" placeholder="请输入" v-model="input_data.emailCode"/>
          </div>
        </div>


        <div class="login_btn_wrap">
          <div @click="registerOrLogin='register'" v-show="'login'===registerOrLogin"
               class="btn btn_white login_btn">
            没有账号请先注册
          </div>
          <div @click="registerOrLogin='login'" v-show="'register'===registerOrLogin"
               class="btn btn_white login_btn">
            已注册过直接登录
          </div>
          <button class="btn btn_blue btn_blue_selected login_btn" @click="register()"
                  v-show="'register'===registerOrLogin">
            注册
          </button>
          <button class="btn btn_blue btn_blue_selected login_btn" @click="login()"
                  v-show="'login'===registerOrLogin">
            登录
          </button>

        </div>


        <div class="login_tip_wrap">
          <div class="login_tip warning_color">
            账号系统更新，老用户直接输入用户名，无需密码即可登录 <br><br>
            新用户注册可用账号密码注册和邮箱注册，也可在个人中心进行设置密码和邮箱绑定等操作<br><br>
          </div>
          <!--          <div class="login_tip">-->
          <!--            新用户输入自己喜欢的昵称后点击注册即可分配ID，昵称+ID即为您的用户名。-->
          <!--          </div>-->
          <!--          <div class="login_tip">-->
          <!--            （例如输入昵称 <b>巴别塔恶灵</b>，分配后返回ID为 <b>#1141</b>，则用户名即为 <b>巴别塔恶灵#1141</b>）-->
          <!--          </div>-->
          <!--          <div class="login_tip"> 当注册成功后，再次访问该网站需输入 <b>巴别塔恶灵#1141</b> ，即可登录找回您上次填写的信息-->
          <!--          </div>-->
        </div>
      </div>

      <div class="login_card" v-show="user_data.status>0">
        <div class="logout_text">确定登出当前用户？</div>
        <div class="logout_btn_wrap">
          <button class="btn btn_blue logout_btn" @click="logout()">确定</button>
          <button class="btn btn_red logout_btn" @click="login_visible = !login_visible">取消</button>
        </div>
      </div>
    </c-popup>


  </div>
</template>

<script setup>
import "@/assets/css/survey/survey_common.css";
import "@/assets/css/sprite/sprite_avatar_5.css";
import "@/assets/css/sprite/sprite_avatar_4.css";
import "@/assets/css/sprite/sprite_avatar_6.css";
import "@/assets/css/sprite/sprite_portrait_6.css";
import "@/assets/css/sprite/sprite_portrait_5.css";
import "@/assets/css/sprite/sprite_portrait_4.css";
import "@/assets/css/sprite/sprite_portrait_bg.css";
import "@/assets/css/sprite/sprite_skill.css";
import "@/assets/css/sprite/sprite_rank.css";
import "@/assets/css/survey/survey_index.css";
import "@/assets/css/survey/survey_user.css";
import "@/assets/css/survey/survey_nav.css";
import AES from 'crypto-js/aes'

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
let user_data = ref({userName: "山桜", status: -100, token: void 0, code: 0}); //用户信息(用户名，用户id，用户状态)

let login_visible = ref(false);

let registerOrLogin = ref('login')


function sendEmailCodeByRegister() {
  const data = {
    mailUsage: registerOrLogin.value,
    email: input_data.value.email,
  }
  surveyApi.sendEmailCode(data).then(response => {
    console.log(response)
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
    console.log(response)
    cMessage("验证码发送成功")
  })
}

//注册
function register() {
  input_data.value.accountType = account_type.value
  surveyApi.register(input_data.value).then(response => {
    response = response.data
    localStorage.setItem("globalUserData", JSON.stringify(response.data));
    cMessage("注册成功");
    user_data.value.userName = response.userName;
    user_data.value.status = response.status;
    user_data.value.token = response.token;
    user_data.value.avatar = response.avatar == void 0 ? 'char_377_gdglow' : response.avatar;
    login_visible.value = !login_visible.value;

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

  if (cacheData == void 0) {
    return
  }
  cacheData = JSON.parse(cacheData)

  user_data.value.userName = cacheData.userName;
  user_data.value.status = cacheData.status;
  user_data.value.token = cacheData.token;
  user_data.value.avatar = cacheData.avatar == void 0 ? 'char_377_gdglow' : cacheData.avatar;
  user_data.value.email = cacheData['email'] == undefined ? "未绑定1" : cacheData['email'];
}

//登出
function logout() {
  localStorage.removeItem('globalUserData')
  setTimeout(() => {
    location.reload()
  }, 1000);
}

function getSprite(id, type) {
  type = type == void 0 ? '' : type;
  return "bg-" + id + " nav_avatar_image";
}

onMounted(() => {
  userDataCache()
});
</script>

<style scoped>
.btn_survey_white {
}
</style>
