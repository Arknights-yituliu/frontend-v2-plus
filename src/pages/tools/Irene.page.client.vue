<script setup>
import Irene from "/src/components/views/Irene.vue";
</script>

<template>
  <el-collapse accordion>
    <irene/>
  </el-collapse>
</template>

<style scoped>
.el-collapse {
  height: 93vh; /* 暂时先设这个值 */
}
</style>