<template>
  <div class="survey_user_page">
    <div class="user_input_bar">
      <div class="user_input_item">用户名</div>
      <input v-model="userData.userName">
    </div>
    <div class="user_input_bar">
      <div class="user_input_item">森空岛CRED</div>
      <input v-model="userData.cred">
    </div>
    <div class="user_input_bar" v-show="userData.status===2">
      <div class="user_input_item">旧密码</div>
      <input v-model="userData.oldPassWord">
    </div>
    <div class="user_input_bar">
      <div class="user_input_item"> 密码</div>
      <input v-model="userData.passWord">
    </div>


    <div class="user_btn" @click="updateUser()">更新密码</div>


    <div>

    </div>

  </div>
</template>


<script setup>
import {ref} from "vue";
import surveyApi from "@/api/survey";
import {globalUserData, loginEvent} from "./userService";




let userData = ref({userName: "未登录", code: 0, status: -100, passWord: '', token: undefined, oldPassWord: '', cred: ''})
let cacheUserData = localStorage.getItem("globalUserData");
// userData.value = cacheUserData === "undefined" || cacheUserData === void 0 ? userData.value : JSON.parse(cacheUserData);
console.log(cacheUserData)

if (!(cacheUserData === "undefined" || cacheUserData === void 0)) {
  const parse = JSON.parse(cacheUserData);
  userData.value.userName = parse.userName;
  userData.value.code = parse.code;
  userData.value.status = parse.status;
  userData.value.token = parse.token;
}

function updateUser() {
  surveyApi.updateUser(userData.value.token, userData.value).then(response => {
    userData.value.status = response.data.status
    userData.value.userName = response.data.userName
    userData.value.code = response.data.code;
    if (response.data.code === 200) {
      localStorage.setItem("globalUserData", JSON.stringify(userData.value));
      location.reload()
    }

  })
}


</script>


<style>
.survey_user_page {
  width: 99%;
  margin: auto;
}

.user_input_bar {
  display: flex;
  line-height: 24px;
  margin: 8px;
}

.user_input_item {
  width: 100px;
}

.user_btn {
  height: 28px;
  line-height: 28px;
  text-align: center;
  width: 120px;
  box-shadow: 0 3px 1px -2px rgba(0, 0, 0, .2), 0 2px 2px 0 rgba(0, 0, 0, .14), 0 1px 5px 0 rgba(0, 0, 0, .12);
  cursor: pointer;
  font-weight: 600;
}

.user_btn:hover {
  background: #d5d5d5;
}

</style>