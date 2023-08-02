<template>
  <div class="survey_nav_page">
    <div class="survey_top_right_btn" @click="loginVisible = !loginVisible" v-show="userData.status < 0">登录</div>
    <c-popup :visible="loginVisible" v-model:visible="loginVisible">
      <div class="login_card" v-show="userData.status < 0">
        <div class="login_input_wrap">
          <div>用户名：</div>
          <input class="login_input" placeholder="请输入" v-model="inputData.userName" />
        </div>
        <div style="display: flex">
          <div class="btn_login" @click="register()">注册</div>
          <div class="btn_login" @click="login()">登录</div>
        </div>
        <div class="login_tip">
          新用户输入自己喜欢的昵称后点击注册即可分配ID，昵称+ID即为您的用户名。<br />
          （例如输入昵称 <b>巴别塔恶灵</b>，分配后返回ID为 <b>#1141</b>，则用户名即为 <b>巴别塔恶灵#1141</b>）<br />
          当注册成功后，再次访问该网站需输入 <b>巴别塔恶灵#1141</b> ，即可登录找回您上次填写的信息
        </div>
      </div>

      <div class="login_card" v-show="userData.status > 0">
        <div class="logout_text">确定登出当前用户？</div>
        <div class="logout_btn_wrap">
          <div class="btn_login" @click="logout()">确定</div>
          <div class="btn_login" @click="loginVisible = !loginVisible">取消</div>
        </div>
      </div>
    </c-popup>

    <div v-show="userData.status > 0">
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
import "@/assets/css/sprite_portrait_5_2.css";
import "@/assets/css/sprite_portrait_4.css";
import "@/assets/css/sprite_portrait_bg.css";
import "@/assets/css/sprite_skill.css";
import "@/assets/css/sprite_rank.css";
import "@/assets/css/survey_index.css";
// import "@/assets/css/survey_score.css";

import { onMounted, ref } from "vue";
import { registerEvent, loginEvent, userDataCacheClearEvent, userDataCacheEvent } from "./userService";

let inputData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", status: -100 }); //用户信息(用户名，用户id，用户状态)

let loginVisible = ref(false);

//注册
async function register() {
  let response = await registerEvent(inputData.value);
  userData.value = response;
  setTimeout(() => {
    loginVisible.value = !loginVisible;
  }, 400);
}

//登录
async function login() {
  let response = await loginEvent(inputData.value);
  userData.value = response;
  setTimeout(() => {
    loginVisible.value = !loginVisible;
  }, 400);
}

//登出
function logout() {
  userData.value = userDataCacheClearEvent();
  setTimeout(() => {
    loginVisible.value = !loginVisible;
  }, 400);
}

onMounted(() => {
  userData.value = userDataCacheEvent();
});
</script>

<style scoped>
.btn_survey_white {
}
</style>
