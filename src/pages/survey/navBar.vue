<template>
  <div class="survey_nav_page">
    <div class="survey_top_right_btn" @click="loginVisible = !loginVisible" v-show="login_tip_show">登录</div>
    <c-popup :visible="loginVisible" v-model:visible="loginVisible">
      <div class="login_card" v-show="login_tip_show">
        <div class="login_input_wrap">
          <div class="input_label">用户名：</div>
          <input class="login_input" placeholder="请输入" v-model="inputData.userName"/>
        </div>
        <div class="login_input_wrap" v-show="login_need_pass_word">
          <div class="input_label">密码：</div>
          <input class="login_input" placeholder="请输入" v-model="inputData.passWord"/>
        </div>
        <div class="login_tip login_tip_warn" v-show="login_need_pass_word">
          您设置过密码了，需要输入密码才可登录
        </div>
        <div style="display: flex">
          <div class="btn_login" @click="register()">注册</div>
          <div class="btn_login" @click="login()">登录</div>
        </div>

        <div class="login_tip_wrap">
          <div class="login_tip login_tip_info">如果您想让自己的练度数据保存的更加安全可在个人中心设置密码，但设置密码后，登录时必须输入密码才可登录</div>
          <div class="login_tip">
            新用户输入自己喜欢的昵称后点击注册即可分配ID，昵称+ID即为您的用户名。
          </div>
          <div class="login_tip">
            （例如输入昵称 <b>巴别塔恶灵</b>，分配后返回ID为 <b>#1141</b>，则用户名即为 <b>巴别塔恶灵#1141</b>）
          </div>
          <div class="login_tip"> 当注册成功后，再次访问该网站需输入 <b>巴别塔恶灵#1141</b> ，即可登录找回您上次填写的信息
          </div>
        </div>
      </div>

      <div class="login_card" v-show="logout_tip_show">
        <div class="logout_text">确定登出当前用户？</div>
        <div class="logout_btn_wrap">
          <div class="btn_login" @click="logout()">确定</div>
          <div class="btn_login" @click="loginVisible = !loginVisible">取消</div>
        </div>
      </div>
    </c-popup>

    <div v-show="user_name_show">
      <div class="user_name" @click="loginVisible = !loginVisible">{{ userData.userName }}</div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey_common.css";
import "@/assets/css/sprite_avatar_6.css";
import "@/assets/css/sprite_avatar_5.css";
import "@/assets/css/sprite_avatar_4.css";
import "@/assets/css/sprite_portrait_6.css";
import "@/assets/css/sprite_portrait_5.css";
import "@/assets/css/sprite_portrait_4.css";
import "@/assets/css/sprite_portrait_bg.css";
import "@/assets/css/sprite_skill.css";
import "@/assets/css/sprite_rank.css";
import "@/assets/css/survey_index.css";

import {onMounted, ref} from "vue";
import {registerEvent, loginEvent, userDataCacheClearEvent, userDataCacheEvent, globalUserData} from "./userService";
import request from "@/api/requestBase";
import {cMessage} from "@/element/message";

let inputData = ref({userName: '', passWord: ''}); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({userName: "山桜", status: -100, token: void 0, code: 0}); //用户信息(用户名，用户id，用户状态)

let loginVisible = ref(false);

let login_tip_show = ref(true)
let login_need_pass_word = ref(false)
let logout_tip_show = ref(false)
let user_name_show = ref(false)

//注册
async function register() {

  await request({
    url: `survey/register`,
    method: "post",
    data: inputData.value,
  }).then(response=>{
    response = response.data
    if(response.code===200){
      globalUserData.value = response.data;
      localStorage.setItem("globalUserData",JSON.stringify(globalUserData.value));
      cMessage("注册成功");
      userData.value.userName = response.data.userName;
      userData.value.status = response.data.status;
      userData.value.token = response.data.token;

      setTimeout(() => {
        loginVisible.value = !loginVisible;
        user_name_show.value = true
        logout_tip_show.value = true
        login_need_pass_word.value = false
        login_tip_show.value = false
      }, 400);

    }else {
      cMessage(response.msg)
    }
  })

}


//登录
function login() {
  request({
    url: `survey/login`,
    method: "post",
    data: inputData.value,
  }).then(response => {
    response = response.data
    if (response.code === 10001) {
      login_need_pass_word.value = true
      return;
    }
    if (response.code !== 200) {
      cMessage(response.msg,'error')
    }
    if (response.code === 200 && response.data.status > 0) {
      localStorage.setItem("globalUserData", JSON.stringify(response.data));
      // 登录成功刷新
      location.reload()
    }
  })
}

function userDataCache() {
  const userDataCache = userDataCacheEvent();
  userData.value.userName = userDataCache.userName;
  userData.value.status = userDataCache.status;
  userData.value.token = userDataCache.token;
  console.log(userDataCache)
  if (userDataCache.status > 0) {
    user_name_show.value = true
    logout_tip_show.value = true
    login_need_pass_word.value = false
    login_tip_show.value = false
  }
}

//登出
function logout() {
  userDataCacheClearEvent();
  setTimeout(() => {
    loginVisible.value = !loginVisible;
    login_tip_show.value = true
    login_need_pass_word.value = false
    user_name_show.value = false
    logout_tip_show.value = false
  }, 400);
}

onMounted(() => {
  userDataCache()
});
</script>

<style scoped>
.btn_survey_white {
}
</style>
