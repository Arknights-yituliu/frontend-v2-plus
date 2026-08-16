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
      <v-menu>
        <template v-slot:activator="{ props }">
          <OperatorAvatar :char-id="userInfo.avatar" :size="44" :mobile-size="44"
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
import {onMounted, ref, watch} from "vue";
import {clearOAuthToken, fetchOAuthUserInfo, oauthAuthorize, userInfo} from "/src/api/uc/oauth.js";
import {logoutUcSession} from "/src/api/uc/uc-api.js";
import {useRouter} from "vue-router";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const router = useRouter();

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
</style>
