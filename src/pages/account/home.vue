<script setup>
import { onMounted, ref } from "vue";
import UserInfo from "/src/components/account/UserInfo.vue";
import OpenApiTokenCard from "/src/components/account/OpenApiTokenCard.vue";
import StageConfig from "/src/components/account/StageConfig.vue";
import { fetchOAuthUserInfo, setOAuthToken, userInfo } from "/src/api/uc/oauth.js";

const authChecked = ref(false);

onMounted(async () => {
  // 解析后端 /oauth/callback 302 回跳携带的参数（?token=xxx 或 ?error=xxx）
  const params = new URLSearchParams(window.location.search);
  const callbackToken = params.get("token");
  if (callbackToken) {
    setOAuthToken(callbackToken);
    // 清理 URL 中的 token，避免刷新页面重复处理
    history.replaceState({}, "", window.location.pathname);
  }

  // 统一走 OAuth 会话拉取全局用户信息（oauth.js 内部处理无 token / 失败置为未登录）
  await fetchOAuthUserInfo();

  authChecked.value = true;
});
</script>
<template>

  <div class="account-home-page flex flex-wrap justify-center">

    <div v-if="authChecked && userInfo.status > 0" class="account-user-column">
      <UserInfo></UserInfo>
      <OpenApiTokenCard></OpenApiTokenCard>
    </div>

    <StageConfig></StageConfig>
  </div>

</template>


<style scoped>

</style>
