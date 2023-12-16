<script setup>

import {ref} from "vue";

const props = defineProps(['modelValue'])
let count = ref(1)
</script>
<template>
  <div class="log-wrap">
    <div v-for="(log,index) in modelValue" :key="index" class="log-row">
      <div class="log-node">[{{ log.node }}]</div>
      <div class="log-level">[{{ log.level?log.level:'INFO' }}]</div>
      <div> {{ log.message }}</div>
    </div>
  </div>

</template>

<style scoped>
.log-wrap {

}

.log-row {
  display: flex;
  height: 20px;
  line-height: 20px;
  overflow: hidden;
}

.log-node {
  width: 100px;

}
.log-level {
  width: 50px;
}
.log-message {

}

</style>