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

import { onMounted, ref } from "vue";

const old_path = ref(false);

onMounted(() => {
  const url_path = window.location.pathname.split("/")[0];
  old_path.value = url_path == "value";
  console.log(old_path.value);
});
</script>

<script>
export const documentProps = {
  title: "一图流 - 物品价值一览",
  description: "明日方舟物品价值一览,价值表",
};
</script>
