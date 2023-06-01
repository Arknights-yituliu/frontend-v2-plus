<template>
  <div class="survey_charData_header">
    <div class="nav_item"><a class="href" href="/survey/"> 首页</a></div>
    <div class="nav_item"><a class="href" href="/survey/character">练度调查</a></div>
    <!-- <div class="nav_item"><a class="href" href="/survey">风评调查</a></div> -->
    <div class="nav_item"><a class="href" href="/survey/list">调查结果</a></div>
    <div class="login_wrap" v-show="userData.status < 0">
      <!-- <div class="login_wrap"> -->
      <div>
        <input type="text" class="login_input" v-model="inputData.userName" />
      </div>
      <div style="display: flex">
        <div class="btn_survey" @click="register()">注册</div>
        <div class="btn_survey" @click="login()">登录</div>
      </div>
    </div>
    <div class="user_wrap" v-show="userData.status == 1">
      <div class="user_name">用户：{{ userData.userName }}</div>
      <div class="btn_survey" @click="logout()">登出</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { registerEvent, loginEvent, userDataCacheClearEvent, userDataCacheEvent } from "./userService";

let inputData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", status: -1, uid: 10000 }); //用户信息(用户名，用户id，用户状态)

//注册
async function register() {
  let response = await registerEvent(inputData.value);
  console.log("异步：", response);
  userData.value = response;
}

//登录
async function login() {
  let response = await loginEvent(inputData.value);
  console.log("异步：", response);
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
.href {
  text-decoration: none;
  color: rgb(0, 0, 0);
}
.survey_charData_header {
  width: 100%;
  margin: auto;
  margin-top: 2px;
  height: 40px;
  border-bottom: 1px rgb(210, 210, 210) solid;
  display: flex;
}

.nav_item {
  min-width: 50px;
  /* border: 1px red solid; */
  text-align: center;
  line-height: 32px;
  height: 32px;
  margin: 4px;
  font-weight: 700;
}

.login_wrap {
  margin: 2px;
  position: absolute;
  right: 20px;
  font-weight: 600;
  display: flex;
}

.login_input {
  width: 150px;
  border: 0;
  outline: none;
  border-bottom: 1px black solid;
  margin: 6px;
  font-size: 18px;
  margin-bottom: 0px;
}

.user_wrap {
  margin: 2px;
  position: absolute;
  right: 20px;
  font-weight: 600;
  display: flex;
  /* border: 1px red solid; */
}

.user_name {
  font-size: 18px;
  line-height: 40px;
  height: 40;
}

.user_id {
  margin: 10px;
  font-size: 12px;
}

.setup_wrap {
  max-width: 95%;
  margin: auto;
}
</style>
