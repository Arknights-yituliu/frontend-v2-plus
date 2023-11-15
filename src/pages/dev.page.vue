<template>
  <div id="indexDiv">
    <newChapter/>

    <dev/>

    <foot-component/>


  </div>
</template>

<style scoped>
#indexDiv {
  margin: auto;
  color: var(--index-div-fg);
  background-color: var(--index-div-bg);
}


</style>

<script setup>


import FootComponent from "@/components/FootComponent.vue";
import newChapter from '/src/components/newChapter.vue'



</script>

<script>
export const documentProps = {
  title: "明日方舟一图流",
  description: "明日方舟材料掉落地图效率，采购中心性价比，活动商店性价比，物品价值一览",
};
</script>
