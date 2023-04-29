<template>
  <div id="indexDiv" class="op_title_etext_light" style="max-width: 1080px; margin: auto">
    <item-value />
    <foot-component />
  </div>
</template>

<script setup>
import ItemValue from "@/components/ItemValue.vue";
import FootComponent from "@/components/FootComponent.vue";

import toolApi from "@/api/tool";

import { onMounted } from "vue";

onMounted(() => {
  toolApi.updateVisits("index");
});
</script>

<script>
export const documentProps = {
  title: "一图流 - 物品价值一览",
  description: "明日方舟物品价值一览,价值表",
};
</script>
