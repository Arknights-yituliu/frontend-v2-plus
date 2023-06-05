<template>
  <div class="survey_nav_page">
    <div class="survey_header">
      <div class="nav_item"><a class="href" href="/survey/"> 首页</a></div>
      <div class="nav_item"><a class="href" href="/survey/character">练度调查</a></div>
      <div class="nav_item"><a class="href" href="/survey/score">风评调查</a></div>
      <div class="nav_item"><a class="href" href="/survey/list">调查结果</a></div>
      <div class="login_wrap" v-show="userData.uid < 0">
        <div class="btn_survey" @click="loginVisible=!loginVisible" v-show="!('/survey'==path||'/survey/'==path)">登录</div>
      </div>

      <c-popup :visible="loginVisible" :width="'370px'" v-model:visible="loginVisible">
        <div class="login_tips">
        <div class="login_tips_1">填写您的用户ID，登录后可上传和恢复数据</div>
        <div class="login_tips_2">如果您尚未注册过，请先点击「注册」按钮。</div>
      </div>
      <div class="login_input_wrap">
        <input class="login_input" placeholder="您的用户ID" v-model="inputData.userName" />
      </div>
      <div class="login_btn_wrap">
        <div class="btn_survey" @click="register(inputData)">注册</div>
        <div class="btn_survey" @click="login()">登录</div>
      </div>
      </c-popup>

      <div class="user_wrap" v-show="userData.uid > 0">
        <div class="user_name">用户：{{ userData.userName }}</div>
        <div class="btn_survey" @click="logout()">登出</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey_common.css";
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/sprite_char_5.css";
import "@/assets/css/sprite_char_4.css";
import "@/assets/css/sprite_skill.css";
import "@/assets/css/sprite_rank.css";
import "@/assets/css/survey_index.css";
import "@/assets/css/survey_character.css";
import "@/assets/css/survey_score.css";

import { onMounted, ref } from "vue";
import { registerEvent, loginEvent, userDataCacheClearEvent, userDataCacheEvent } from "./userService";

let inputData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", uid: -1 }); //用户信息(用户名，用户id，用户状态)

let loginVisible = ref(false);
const path = window.location.pathname;

//注册
async function register() {
  let response = await registerEvent(inputData.value);
  // console.log("异步：", response);
  userData.value = response;
  window.location.href = '/survey'
}

//登录
async function login() {
  let response = await loginEvent(inputData.value);
  // console.log("异步：", response);
  userData.value = response;
  window.location.href = '/survey'
}

//登出
function logout() {
  userData.value = userDataCacheClearEvent();
  window.location.href = '/survey'
}

onMounted(() => {
  userData.value = userDataCacheEvent();
});
</script>

<style scoped>

</style>
