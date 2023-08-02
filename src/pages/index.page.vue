<template>
  <div id="indexDiv" style="margin: auto">
    <stage />
    <!-- <jump-to-value /> -->
    <foot-component />
  </div>
</template>

<style scoped>
#indexDiv {
  color: var(--index-div-fg);
  background-color: var(--index-div-bg);
}
</style>

<script setup>
import stage from "@/components/stage.vue";

import FootComponent from "@/components/FootComponent.vue";
// import JumpToValue from "@/components/JumpToValue.vue";

import toolApi from "@/api/tool";

import { onMounted } from "vue";

onMounted(() => {});
</script>

<script>
export const documentProps = {
  title: "明日方舟一图流",
  description: "明日方舟材料掉落地图效率，采购中心性价比，活动商店性价比，物品价值一览",
};
</script>
