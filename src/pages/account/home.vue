<script setup>
import { onMounted, ref } from "vue";
import UserInfo from "/src/components/account/UserInfo.vue";
import StageConfig from "/src/components/account/StageConfig.vue";
import Login from "/src/pages/account/login.vue";
import { getUserInfo, userInfo } from "/src/utils/user/userInfo.js";

const authChecked = ref(false);

onMounted(async () => {
  if (localStorage.getItem("USER_TOKEN")) {
    await getUserInfo("AccountHome");
  } else {
    userInfo.value.status = -100;
  }

  authChecked.value = true;
});
</script>
<template>

  <div class="account-home-page flex flex-wrap justify-center">

    <UserInfo v-if="authChecked && userInfo.status > 0"></UserInfo>

    <Login v-else-if="authChecked"></Login>

    <StageConfig></StageConfig>
  </div>

</template>


<style scoped>

</style>
