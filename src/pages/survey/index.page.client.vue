<template>
  <div class="survey_index_page">
    <div class="survey_index_header">欢迎来到明日方舟干员调查统计站</div>

    <div class="survey_index_content">
      <div class="login_card_wrap" v-show="userData.uid < 0">
        <div class="login_card">
          <div class="login_card_tips">
            <div class="login_card_tips_title">填写您的用户ID，登录后可上传和恢复数据</div>
            <div>如果您尚未注册过，请先点击「注册」按钮。</div>
          </div>
          <div class="login_card_input_wrap">
            <input class="login_card_input" placeholder="您的用户ID" v-model="inputData.userName" />
          </div>
          <div class="login_card_btn_wrap">
            <div class="login_card_btn" @click="register(inputData)">注册</div>
            <div class="login_card_btn" @click="login()">登录</div>
          </div>
        </div>
      </div>
      <div class="login_success_card_wrap" v-show="userData.uid > 0">
        <p>
          <b>{{ userData.userName }}</b
          >&emsp;为您的用户ID，用于登录调查站,登录不设密码验证，请妥善保管ID！
        </p>
        <p>接下来你可以愉快的填写调查表了,选一个输入方式开始吧！</p>
        <p>可以选择手动输入干员信息，我们提供了若干快捷选项，一分钟即可记录您的box</p>
        <p>也可以选择下载Excel样表，自行填写并上传</p>
        <!-- <p>可以选择手动输入干员信息，我们提供了若干快捷选项，一分钟即可记录您的box</p>
        <p>也可以选择下载Excel样表，自行填写并上传</p>
        <p>还可以通过第三方生成的json导入</p> -->
      </div>

      <div class="login_card_guild">
        <div v-for="key in guildKey">
          <div class="login_card_guild_question">{{ guild[key].question }}</div>
          <div class="login_card_guild_answer">{{ guild[key].answer }}</div>
        </div>
      </div>
      <div class="upload_type_wrap">
        <div class="upload_type"><a class="href" href="/survey/upload">填写干员信息</a></div>
        <div class="upload_type"><a class="href" href="/survey/upload">通过Excel上传填写</a></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey_index.css";
import { onMounted, ref } from "vue";
import guild from "@/static/json/survey/guild.json";
let guildKey = ["siteDescription", "registrationProcess", "developmentProgress"];

import { registerEvent, loginEvent, userDataCacheClearEvent, userDataCacheEvent } from "./userService";

let inputData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", uid: -1 }); //用户信息(用户名，用户id，用户状态)

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
