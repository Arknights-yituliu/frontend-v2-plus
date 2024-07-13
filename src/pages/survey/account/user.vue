<template>
  <div class="survey-login-page">
    <div class="survey-login-btn" v-show="userData.status<0">
      <router-link to="/survey/account/register"  >
        <span class="header-button-label" style="margin-right: 12px">注册</span>
      </router-link>
      <router-link to="/survey/account/login"  >
        <span class="header-button-label">登录</span>
      </router-link>
    </div>

    <div v-show="userData.status>0">
      <c-popover :name="'avatar'">
        <template #title>
          <div class="nav-avatar-image-wrap">
            <div :class="getSprite(userData.avatar)"></div>
            <span class="nav-user-name">{{userData.userName}}</span>
          </div>
        </template>

        <div class="survey_nav_menu" id="avatar">
          <a class="survey_nav_menu_item menu_href" href="/survey/account/home"> 个人中心 </a>
          <a class="survey_nav_menu_item menu_href" @click="loginVisible=!loginVisible">退出登录 </a>
        </div>
      </c-popover>
    </div>


    <c-popup :visible="loginVisible" v-model:visible="loginVisible" >
      <div class="login-card" v-show="userData.status>0">
        <div class="logout_text">确定登出当前用户？</div>
        <div class="logout_btn_wrap">
          <my-button data-color="blue" :active="true" @click="logout()">确定</my-button>
          <my-button data-color="red" :active="true" @click="loginVisible = !loginVisible">取消</my-button>
        </div>
      </div>
    </c-popup>
  </div>
</template>

<script setup>
import "/src/assets/css/survey/survey_common.css";
import "/src/assets/css/survey/common.scss"
import "/src/assets/css/survey/common.phone.scss"
import "/src/assets/css/sprite/sprite_skill.css";
import "/src/assets/css/sprite/sprite_rank.css";
import "/src/assets/css/survey/survey_index.css";
import "/src/assets/css/survey/login.scss"
import "/src/assets/css/survey/login.phone.scss"

import "/src/assets/css/survey/survey_nav.css";
import MyButton from '/src/components/Button.vue'

import {onMounted, ref, watch} from "vue";
import {cMessage} from "/src/utils/message";

import surveyApi from "/src/api/userInfo";
import {getUserInfo} from "/src/pages/survey/service/userData.js";
import {useRoute} from "vue-router";


let loginStatus = ref('')

let loginVisible = ref(false);



let inputData = ref({
  userName: '',
  passWord: '',
  cred: '',
  email: '',
  emailCode: '',
  accountType: '',
  avatar: '',
  hgToken: '',
  mailUsage: 'register'
});



//用户输入的用户名，用obj没准后期有别的字段
let userData = ref({uid:0,userName: "未登录",akUid:"0", status: -100, token: void 0}); //用户信息(用户名，用户id，用户状态)



function getLoginParams() {

  if ('hgToken' === accountType.value) {
    return {
      accountType: 'hgToken',
      hgToken: inputData.value.hgToken
    }
  }
  if ('emailCode' === accountType.value) {
    return {
      accountType: 'email',
      email: inputData.value.email,
      emailCode: inputData.value.emailCode,
    }
  }
  if ('passWord' === accountType.value) {
    return {
      accountType: 'passWord',
      userName: inputData.value.userName,
      passWord: inputData.value.passWord,
    }
  }


}



async function getUserInfoByToken() {

  userData.value = await getUserInfo()

}

//登出
function logout() {
  localStorage.removeItem('USER_TOKEN')
  setTimeout(() => {
    location.reload()
  }, 1000);
}

function getSprite(id) {
  return "bg-" + id + " nav_avatar_image";
}

onMounted(() => {
  getUserInfoByToken()
});

const route = useRoute();

watch(()=>route.fullPath,(newVal,oldValue)=>{
  console.log(newVal,oldValue)
  getUserInfoByToken()
})

</script>

<style scoped>
.checkbox-btn {
  border: none;
}
</style>
