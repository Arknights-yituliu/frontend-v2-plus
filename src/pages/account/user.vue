<template>
  <div class="survey-login-page">
    <div v-show="userInfo.status<0">
      <v-dialog v-model="loginDialog" max-width="400">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" color="white" text="登录"></v-btn>
        </template>
        <Login
            dialog
            @success="loginDialog = false"
            @navigate="handleLoginNavigate"
        ></Login>
      </v-dialog>
    </div>

    <div v-show="userInfo.status>0">
      <v-menu>
        <template v-slot:activator="{ props }">
          <OperatorAvatar :char-id="userInfo.avatar" :size="44" :mobile-size="44"
                          rounded v-bind="props">
          </OperatorAvatar>
          <!--        <v-btn  ></v-btn>-->
        </template>

        <v-list>
          <v-list-item>
            <v-btn variant="text" text="个人中心" @click="router.push({name:'User Center'})">
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
import {onMounted, ref} from "vue";
import {clearUserSession, getUserInfo, userInfo} from "/src/utils/user/userInfo.js";
import {useRouter} from "vue-router";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import Login from "/src/pages/account/login.vue";

const router = useRouter();

let homeMenu = ref(false);
const loginDialog = ref(false);


function getUserInfoByToken() {
  getUserInfo("User")
}

function handleLoginNavigate(routeName) {
  loginDialog.value = false
  router.push({name: routeName})
}

//登出
function logout() {
  clearUserSession()
  setTimeout(() => {
    location.reload()
  }, 1000);
}


onMounted(() => {
  getUserInfoByToken()
});



</script>

<style scoped>
.checkbox-btn {
  border: none;
}

.survey-login-page a {
  text-decoration: none;
}
</style>
