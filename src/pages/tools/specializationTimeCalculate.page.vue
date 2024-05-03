<script setup>
import {ref} from "vue";
import HalfOperatorCalculate from "../../components/HalfOperatorCalculate.vue";

let collapseVisible = ref(['HalfOperatorCalculate'])

</script>

<template>
  <el-collapse style="max-width: 90%;margin: auto" v-model="collapseVisible" accordion>
      <half-operator-calculate/>
  </el-collapse>
</template>

<style scoped>
.el-collapse {
  height: 93vh; /* 暂时先设这个值 */
}
</style>