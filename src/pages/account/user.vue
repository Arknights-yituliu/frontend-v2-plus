<template>
  <div class="survey-login-page">
    <div  v-show="userInfo.status<0">
      <router-link to="/account/login">
        <span class="header-button-label">登录</span>
      </router-link>
    </div>

    <div v-show="userInfo.status>0">
    <v-menu >
      <template v-slot:activator="{ props }" >
        <OperatorAvatar :image-name="userInfo.avatar" style="background-color: white" :rounded="true"
                     rounded-corner="100" v-bind="props" >
        </OperatorAvatar>
        <!--        <v-btn  ></v-btn>-->
      </template>

      <v-list>
        <v-list-item>
          <v-btn variant="text" text="个人中心" @click="router.push({name:'AccountHome'})">
          </v-btn>
        </v-list-item>
        <v-list-item @click="loginVisible=!loginVisible">
          <v-dialog max-width="360">
            <template v-slot:activator="{ props: activatorProps }">
              <v-btn
                  v-bind="activatorProps"
                  color="surface-variant"
                  text=" 退出登录"
                  variant="text"
              ></v-btn>
            </template>
            <template v-slot:default="{ isActive }">
              <v-card title="Dialog">
                <v-card-text>
                  <v-alert text="是否退出登录？" type="error"></v-alert>
                </v-card-text>

                <div class="flex justify-center">
                  <v-btn text="确定" @click="logout" class="m-4"></v-btn>
                  <v-btn text="取消" @click="isActive.value = false" class="m-4"></v-btn>
                </div>
              </v-card>
            </template>

          </v-dialog>

        </v-list-item>
      </v-list>
    </v-menu>
    </div>

    <c-popup :visible="loginVisible" v-model:visible="loginVisible">
      <div class="login-card" v-show="userInfo.status>0">
        <div class="logout_text">确定登出当前用户？</div>
        <div class="logout_btn_wrap">
          <MyButton data-color="blue" :active="true" @click="logout()">确定</MyButton>
          <MyButton data-color="red" :active="true" @click="loginVisible = !loginVisible">取消</MyButton>
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
import {getUserInfo} from "/src/utils/survey/userInfo.js";
import {useRoute,useRouter} from "vue-router";
import SpriteImage from "@/components/sprite/SpriteImage.vue";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";

const router = useRouter();

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
let userInfo = ref({uid: 0, userName: "未登录", akUid: "0", status: -100, token: void 0}); //用户信息(用户名，用户id，用户状态)


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

  userInfo.value = await getUserInfo()

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

watch(() => route.fullPath, (newVal, oldValue) => {

  getUserInfoByToken()
})

</script>

<style scoped>
.checkbox-btn {
  border: none;
}

.survey-login-page a {
  text-decoration: none;
}
</style>
