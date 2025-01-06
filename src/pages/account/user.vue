<template>
  <div class="survey-login-page">
    <div v-show="userInfo.status<0">
      <router-link to="/account/login">
        <span style="font-size: 16px;color: white">登录</span>
      </router-link>
    </div>

    <div v-show="userInfo.status>0">
      <v-menu>
        <template v-slot:activator="{ props }">
          <OperatorAvatar :char-id="userInfo.avatar" size="44" mobile-size="44" style="background-color: white"
                          rounded v-bind="props">
          </OperatorAvatar>
          <!--        <v-btn  ></v-btn>-->
        </template>

        <v-list>
          <v-list-item>
            <v-btn variant="text" text="个人中心" @click="router.push({name:'AccountHome'})">
            </v-btn>
          </v-list-item>
          <v-list-item @click="homeMenu=!homeMenu">
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
                <v-card title="退出登录">
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
  </div>
</template>

<script setup>
import "/src/assets/css/survey/common.scss"
import "/src/assets/css/survey/common.phone.scss"

import "/src/assets/css/survey/survey_index.css";
import "/src/assets/css/survey/login.scss"
import "/src/assets/css/survey/login.phone.scss"

import "/src/assets/css/survey/survey_nav.css";
import {onMounted, ref, watch} from "vue";
import {getUserInfo, userInfo} from "/src/utils/user/userInfo.js";
import {useRoute, useRouter} from "vue-router";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";

const router = useRouter();

let homeMenu = ref(false);


function getUserInfoByToken() {
  getUserInfo()

}

//登出
function logout() {
  localStorage.removeItem('USER_TOKEN')
  setTimeout(() => {
    location.reload()
  }, 1000);
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
