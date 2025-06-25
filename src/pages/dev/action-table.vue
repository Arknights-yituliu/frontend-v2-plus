<script setup>
import {operatorTable} from "/src/utils/gameData.js";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";

let charIdMap = new Map()
for (const charId in operatorTable) {
  const {name} = operatorTable[charId]
  charIdMap.set(name, charId)
}

const actionTable = [
  {
    name: '德克萨斯',
    direction: 'left',
  },
  {
    name: '娜仁图亚',
    direction: 'bottom',
  },
  {
    name: '乌尔比安',
    direction: 'top',
  },
  {
    name: '夜莺',
    direction: 'left',
  },
  {
    name: '提丰',
    direction: 'left',
  },
  {
    name: '能天使',
    direction: 'left',
  },
  {
    name: '纯烬艾雅法拉',
    direction: 'left',
  },
  {
    name: '阿斯卡纶',
    direction: 'bottom',
  },
]
</script>

<template>

  <div class="flex flex-wrap" style="width: 540px;">
    <div class="flex align-center" v-for="(item,index) in actionTable" style="border: 1px solid #686868">
      <div style="font-size: 20px;padding: 8px">{{ index + 1 }}</div>
      <div>
        <OperatorAvatar :char-id="charIdMap.get(item.name)"></OperatorAvatar>
      </div>
      <div class="m-8"></div>
      <img :src="`/image/action/${item.direction}.png`" style="width: 24px" alt="">
      <div class="m-8"></div>
    </div>
  </div>




</template>