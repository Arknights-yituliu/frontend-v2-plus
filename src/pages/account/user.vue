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
        <v-menu v-model="accountMenu">
        <template v-slot:activator="{ props }">
          <img class="operator-avatar-img operator-avatar-img--rounded"
               :style="getOperatorAvatarStyle({ size: 44, mobileSize: 44 })"
               :src="getOperatorAvatarUrl(userInfo.avatar)" alt="" v-bind="props">
          <!--        <v-btn  ></v-btn>-->
        </template>

        <v-list>
          <v-list-item>
            <v-btn
                variant="text"
                prepend-icon="mdi-account-circle-outline"
                text="个人中心"
                @click="router.push({name:'User Center'})"
            >
            </v-btn>
          </v-list-item>
          <v-list-item>
            <v-btn
                class="account-menu-logout"
                color="error"
                prepend-icon="mdi-logout"
                variant="text"
                @click="openLogoutDialog"
            >
              退出登录
            </v-btn>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <LogoutConfirmDialog v-model="logoutDialog"></LogoutConfirmDialog>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {getUserInfo, userInfo} from "/src/api/user-center/userSession.js";
import {useRouter} from "vue-router";
import { getOperatorAvatarUrl, getOperatorAvatarStyle } from "/src/utils/arknightsResource.js";
import Login from "/src/pages/account/login.vue";
import LogoutConfirmDialog from "/src/components/account/LogoutConfirmDialog.vue";

const router = useRouter();

const accountMenu = ref(false);
const loginDialog = ref(false);
const logoutDialog = ref(false);


function getUserInfoByToken() {
  getUserInfo()
}

function handleLoginNavigate(routeName) {
  loginDialog.value = false
  router.push({name: routeName})
}

function openLogoutDialog() {
  accountMenu.value = false;
  logoutDialog.value = true;
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

.account-menu-logout {
  width: 100%;
  justify-content: flex-start;
}
</style>
