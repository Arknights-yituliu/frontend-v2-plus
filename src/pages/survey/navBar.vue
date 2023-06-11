<template>

    <div class="btn_survey btn_survey_white" @click="loginVisible = !loginVisible" v-show="userData.uid < 0">登录</div>


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

  <div v-show="userData.uid > 0">
    <img class="icon_user" src="/image/icon/user.png" alt="" />
    <div class="user_name">{{ userData.userName }}</div>
    <div class="btn_survey" @click="logout()">登出</div>
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
// import "@/assets/css/survey_score.css";


import { onMounted, ref } from "vue";
import { registerEvent, loginEvent, userDataCacheClearEvent, userDataCacheEvent } from "./userService";

let inputData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", uid: -1 }); //用户信息(用户名，用户id，用户状态)

let loginVisible = ref(false);

//注册
async function register() {
  let response = await registerEvent(inputData.value);
  userData.value = response;
}

//登录
async function login() {
  let response = await loginEvent(inputData.value);
  userData.value = response;
}

//登出
function logout() {
  userData.value = userDataCacheClearEvent();
}

onMounted(() => {
  userData.value = userDataCacheEvent();
});
</script>


<style scoped>
.btn_survey_white{
  color: white;
}
</style>