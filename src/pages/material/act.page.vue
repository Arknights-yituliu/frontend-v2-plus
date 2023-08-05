<template>
  <div class="act_bar">
    <div class="act_title"></div>
    <div v-for="item in itemArr" class="item_wrap_title">
      <div :class="getSpriteImg(item.id)"></div>
    </div>
  </div>
  <div v-for="act in closedStageList">
    <div class="act_bar" v-show="act[0].zoneName.indexOf('复刻') == -1">
      <div class="act_title">
        <div class="zoneName_wrap">{{ act[0].zoneName }}</div>
        <div class="openTime_wrap">{{ act[0].openTime.slice(0.8) }}</div>
      </div>
      <div v-for="item in itemArr" class="item_wrap">
        <div v-for="stage in act" v-show="stage.itemType == item.name">
          <div :class="getSpriteImg(stage.itemId)"></div>
          <div>{{ stage.stageEfficiency.toFixed(2) }}%</div>
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
  { name: "RMA70-12", id: "30103" },
  { name: "全新装置", id: "30063" },
  { name: "扭转醇", id: "30073" },
  { name: "轻锰矿", id: "30083" },
  { name: "研磨石", id: "30093" },
  { name: "酮凝集组", id: "30053" },
  { name: "糖组", id: "30023" },
  { name: "凝胶", id: "30043" },
  { name: "异铁组", id: "30073" },
  { name: "半自然溶剂", id: "31043" },
  { name: "聚酸酯组", id: "30033" },
  { name: "转质盐组", id: "31063" },
  { name: "炽合金", id: "31023" },
  { name: "固源岩组", id: "31033" },
  { name: "晶体元件", id: "30073" },
  { name: "化合切削液", id: "31053" },
];

function getSpriteImg(id, index) {
  return "bg-" + id;
}
</script>

<style>
.act_bar {
  display: flex;
}

.act_title {
  min-width: 200px;
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

.openTime_wrap {
  min-width: 200px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 18px;
  /* font-weight: 900; */
  /* margin-bottom: 10px; */
}

.item_wrap_title {
  min-width: 60px;
  border: 1px rgb(0, 0, 0) solid;
}

.item_wrap {
  min-width: 60px;
  height: 80px;
  border: 1px rgb(0, 0, 0) solid;
  text-align: center;
}
</style>
