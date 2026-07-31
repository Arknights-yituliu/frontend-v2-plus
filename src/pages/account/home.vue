<script setup>
import { onMounted, ref } from "vue";
import UserInfo from "/src/components/account/UserInfo.vue";
import OpenApiTokenCard from "/src/components/account/OpenApiTokenCard.vue";
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

    <div v-if="authChecked && userInfo.status > 0" class="account-user-column">
      <UserInfo></UserInfo>
      <OpenApiTokenCard></OpenApiTokenCard>
    </div>

    <Login v-else-if="authChecked"></Login>

    <StageConfig></StageConfig>
  </div>

</template>


<style scoped>

</style>
