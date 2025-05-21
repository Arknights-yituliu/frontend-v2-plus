<script setup>
import {ref} from "vue";
import HalfOperatorCalculate from "/src/components/specialization/HalfOperatorCalculate.vue";
import SpecializationEfficiencyRanking from "/src/components/specialization/SpecializationEfficiencyRanking.vue";
import OptimalSpecializationPaths from "/src/components/specialization/OptimalSpecializationPaths.vue";
import {SortUp} from "@element-plus/icons-vue";

const collapseVisible = ref(['HalfOperatorCalculate']);

</script>

<template>
  <el-collapse v-model="collapseVisible" style="max-width: 90%;margin: auto">
    <half-operator-calculate/>
    <optimal-specialization-paths/>
    <el-collapse-item name="EfficiencyRanking">
      <template #title>
        <el-icon style="width: 13px;margin-inline: 8px">
          <SortUp/>
        </el-icon>
        <el-text size="large" tag="b">专精效率排行榜</el-text>
      </template>
      <specialization-efficiency-ranking/>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>

</style>