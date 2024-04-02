<script setup>
import Irene from "/src/components/Irene.vue";
import {ref} from "vue";

let collapseVisible = ref(['Irene'])

</script>

<template>
  <el-collapse style="max-width: 90%;margin: auto" v-model="collapseVisible" accordion>
    <irene/>
  </el-collapse>
</template>

<style scoped>
.el-collapse {
  height: 93vh; /* 暂时先设这个值 */
}
</style>