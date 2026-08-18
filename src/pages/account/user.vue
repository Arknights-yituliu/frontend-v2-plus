<template>
  <div class="survey-login-page">
    <div v-show="userInfo.status<0">
      <v-btn
          variant="text"
          :loading="loginLoading"
          text="登录"
          @click="handleOAuthLogin"
      ></v-btn>
    </div>

    <div v-show="userInfo.status>0">
      <!-- offset: Vuetify 默认 4px，设为 8px 使下拉框再下移 4px -->
      <v-menu :offset="8">
        <template v-slot:activator="{ props }">
          <div class="flex align-center user-nav-activator" v-bind="props">
            <OperatorAvatar :char-id="userInfo.avatar" :size="44" :mobile-size="44"
                            rounded>
            </OperatorAvatar>
            <span class="user-nav-name">{{ userInfo.userName }}</span>
          </div>
        </template>

        <v-list>
          <v-list-item>
            <v-btn variant="text" prepend-icon="mdi-account" text="个人中心" @click="router.push({name:'ACCOUNT_HOME'})">
            </v-btn>
          </v-list-item>
          <!-- 宽度低于 600px 时显示（由 CSS 媒体查询控制），顶栏对应按钮同时隐藏 -->
          <v-list-item class="theme-toggle-mobile-item">
            <v-btn variant="text" prepend-icon="mdi-theme-light-dark" text="切换日夜间" @click="emit('changeTheme')"></v-btn>
          </v-list-item>
          <v-list-item @click="homeMenu=!homeMenu">
            <v-dialog max-width="360">
              <template v-slot:activator="{ props: activatorProps }">
                <v-btn
                    v-bind="activatorProps"
                    color="surface-variant"
                    prepend-icon="mdi-logout"
                    text="退出登录"
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
import {clearOAuthToken, fetchOAuthUserInfo, oauthAuthorize, userInfo} from "/src/api/uc/oauth.js";
import {logoutUcSession} from "/src/api/uc/uc-api.js";
import {useRouter} from "vue-router";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const router = useRouter();

/** 向父组件（App.vue）发出的事件：触发日夜间主题切换 */
const emit = defineEmits(['changeTheme'])

let homeMenu = ref(false);

// OAuth 发起授权时的加载状态
let loginLoading = ref(false);

/**
 * 顶部导航「登录」按钮：触发 OAuth2 授权码登录流程
 * 调后端 /user/oauth2/login 拿 authorizeUrl 后整页跳转 UC 授权，
 * 授权完成后由后端 /oauth/callback 换 token 并回跳（frontend-redirect-url 配置的页面）
 */
async function handleOAuthLogin() {
    loginLoading.value = true;
    try {
        const authorizeUrl = await oauthAuthorize();
        window.location.href = authorizeUrl;
    } catch (e) {
        // 错误提示已在 oauthAuthorize 内部统一处理
    } finally {
        loginLoading.value = false;
    }
}


function getUserInfoByToken() {
  fetchOAuthUserInfo()
}

//登出：先调用 UC 登出接口使服务端会话失效并清除本地 UC token，再清除 OAuth 会话
async function logout() {
  await logoutUcSession()
  clearOAuthToken()
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

/* 顶栏头像旁显示的用户名，超 80px 省略号隐藏 */
.user-nav-name {
  max-width: 100px;
  margin-left: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
}

/* 日夜间切换（下拉菜单内）：默认隐藏，宽度低于 600px 才显示 */
.theme-toggle-mobile-item {
  display: none;
}

@media (max-width: 599px) {
  .theme-toggle-mobile-item {
    display: block;
  }
}
</style>
