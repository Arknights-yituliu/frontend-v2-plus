<template>
  <div v-for="act in closedStageList">
    <div class="act_bar" v-show="act[0].zoneName.indexOf('复刻')==-1">
      <div>
        <div class="zoneName_wrap">{{ act[0].zoneName }}</div>
        <div class="openTime_wrap">{{ act[0].openTime }}</div>
      </div>
      <div v-for="itemName in itemArr" class="item_wrap">
        <div v-for="stage in act" v-show="stage.itemType == itemName">
          <div :class="getSpriteImg(stage.itemId)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

import stageApi from "@/api/stage";

let closedStageList = ref([]);

stageApi.findClosedStage(0.625).then((response) => {
  closedStageList.value = [];
  closedStageList.value = response.data;
});

let itemArr = [
  "RMA70-12",
  "全新装置",
  "扭转醇",
  "轻锰矿",
  "酮凝集组",
  "研磨石",
  "半自然溶剂",
  "异铁组",
  "凝胶",
  "糖组",
  "转质盐组",
  "聚酸酯组",
  "炽合金",
  "固源岩组",
  "晶体元件",
  "化合切削液",
];

function getSpriteImg(id, index) {
  return "bg-" + id;
}
</script>

<style>
.act_bar {
  display: flex;
  
}

.zoneName_wrap {
  min-width: 200px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 20px;
  font-weight: 900;
  margin-top: 20px;
}

.openTime_wrap{
  min-width: 200px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 18px;
  /* font-weight: 900; */
  margin-bottom: 10px;
}

.item_wrap {
  min-width: 70px;
  height: 70px;
  border: 1px red solid;
}
</style>
