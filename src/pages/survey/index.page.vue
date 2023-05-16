<template>
  <div class="survey_index_page">
    <div class="survey_index_header">欢迎来到明日方舟干员调查统计站</div>

    <div class="survey_index_content">
      <div class="login_card_wrap" v-show="userData.status != 1">
        <div class="login_card">
          <div class="login_card_tips">
            <div class="login_card_tips_title">填写您的用户ID，登录后可上传和恢复数据</div>
            <div>如果您尚未注册过，请先点击「注册」按钮。</div>
          </div>
          <div class="login_card_input_wrap">
            <input class="login_card_input" placeholder="您的用户ID" v-model="loginData.userName" />
          </div>
          <div class="login_card_btn_wrap">
            <div class="login_card_btn" @click="register(loginData)">注册</div>
            <div class="login_card_btn" @click="login()">登录</div>
          </div>
        </div>
      </div>
      <div class="login_card_wrap" v-show="userData.status == 1">
        <div style="display: flex">
          <div class="login_card_userName">
            欢迎回来 <b> {{ userData.userName }}</b>
          </div>

          <div class="logout_btn" @click="logout()">登出</div>
        </div>
      </div>

      <div class="login_card_guild">
        <div v-for="key in guildKey" :key="key">
          <div class="login_card_guild_question">{{ guild[key].question }}</div>
          <div class="login_card_guild_answer">{{ replaceAnswer(guild[key].answer) }}</div>
        </div>
      </div>

      <a href="/survey/upload">
        <div class="login_card_link">我了解了,开始填写</div>
      </a>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey_index.css";
import { registerEvent, loginEvent, userDataCacheEvent, userDataCacheClearEvent, globalUserData } from "./serveyService";
import { onMounted, ref } from "vue";
import guild from "@/static/json/survey/guild.json";

let guildKey = ["siteDescription", "registrationProcess", "developmentProgress"];

function replaceAnswer(answer) {
  answer = answer.replaceAll(",", "，");
  answer = answer.replaceAll(".", "。");
  return answer;
}

let loginData = ref({ userName: "山桜" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", status: -1, uid: 10000 });

async function register() {
  let response = await registerEvent(loginData.value);
  console.log("异步：", response);
  userData.value = response;
}

async function login() {
  let response = await loginEvent(loginData.value);
  console.log("异步：", response);
  userData.value = response;
}

function logout() {
  userData.value = userDataCacheClearEvent();
}

onMounted(() => {
  userData.value = userDataCacheEvent();
});
</script>
