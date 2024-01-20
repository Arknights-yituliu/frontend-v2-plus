<template>

  <button class="btn" @click="show=!show">展开</button>
  <c-collapse-item v-model:visible="show" :name="'recommend'">
    <div style="height: 111px;">
      <div>1111111111</div>
      <div>1111111111</div>
      <div>1111111111</div>
      <div>1111111111</div>
      <div>1111111111</div>
      <div>1111111111</div>
    </div>
  </c-collapse-item>


</template>
<script setup>

import {ref} from "vue";
import Button from "../../custom/button.vue";

let show = ref(false)
</script>

<style>

</style>