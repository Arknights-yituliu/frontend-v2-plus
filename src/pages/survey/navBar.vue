<template>
  <div class="survey_top_right_btn" @click="loginVisible = !loginVisible" v-show="userData.status < 0">登录</div>
  <c-popup :visible="loginVisible" v-model:visible="loginVisible" :width="'400px'">
      <div class="login_card" v-show="userData.status < 0">
        <input class="login_input" placeholder="您的用户ID" v-model="inputData.userName" />
        <div style="display: flex">
          <div class="btn_login" @click="register()">注册</div>
          <div class="btn_login" @click="login()">登录</div>
        </div>
        <div class="login_tip">
          <a>新用户输入用户名即可分配ID，此用户 ID 仅于本网站使用， 用于在不同设备间同步您的数据，请妥善保管您的ID</a>
          <br><a>老用户请输入 <b>用户名#ID</b> 登录</a>
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

  <div v-show="userData.status > 0" >
    <div class="user_name" @click="loginVisible = !loginVisible">{{ userData.userName }}</div>
  </div>
</template>

<script setup>
import "@/assets/css/survey_common.css";
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/sprite_char_5.css";
import "@/assets/css/sprite_char_4.css";
import "@/assets/css/sprite_portrait_6.css";
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

.survey_top_right_btn{
  min-width: 60px;
  color: white;
  text-align: center;
  margin-right: 20px;
  font-size: 20px;
}

.login_tip{
  margin-top: 20px;
  line-height: 36px;
}
</style>
