<template>
  <div id="indexDiv" style="margin: auto">
    <item-value />
    <!-- <foot-component /> -->
  </div>
</template>

<style scoped>
#indexDiv {
  color: var(--index-div-fg);
  background-color: var(--index-div-bg);
}
</style>

<script setup>
import ItemValue from "@/components/ItemValue.vue";

import toolApi from "@/api/tool";

import { onMounted } from "vue";

onMounted(() => {});
</script>

<script>
export const documentProps = {
  title: "一图流 - 物品价值一览",
  description: "明日方舟物品价值一览,价值表",
};
</script>
