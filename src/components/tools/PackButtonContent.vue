<script setup>

const props = defineProps(["modelValue", 'data']);

function getName(item){
   if(item.officialName){
     return item.officialName
   }
   if(item.name){
     return  item.name
   }
}

/**
 * 根据礼包抽卡性价比获取背景色
 * @param drawEfficiency 抽卡性价比
 * @return {string} 角标背景色
 */
function getPackPriorityColor(drawEfficiency) {
  if (drawEfficiency > 1.57) {
    return `background-color:${'#ff6400'};color:white`
  }

  if (drawEfficiency > 1) {
    return `background-color:${'#a16fff'};color:white`
  }

  return `background-color:${'#4380ff'};color:white`
}

function keepTheDecimalPoint(num, decimalPlaces) {
  if (typeof num !== "number") {
    return '非数字'
  }

  decimalPlaces = decimalPlaces || decimalPlaces === 0 ? decimalPlaces : 2
  return num.toFixed(decimalPlaces)
}

</script>

<template>
  <div class="checkbox-button">
    <span class="draw-efficiency" v-show="props.data.drawEfficiency" :style="getPackPriorityColor(props.data.drawEfficiency)">
      {{ keepTheDecimalPoint(props.data.drawPrice) }}
    </span>
    <span class="checkbox-button-pack-label">{{ getName(props.data) }}</span>
    <div class="checkbox-button-pack-gacha-resources">
      <!--源石-->
      <div class="image-sprite" v-show="props.data.originium > 0">
        <div class="bg-icon_4002"></div>
      </div>
      <span v-show="props.data.originium > 0">{{ props.data.originium }}</span>
      <!--合成玉-->
      <div class="image-sprite" v-show="props.data.orundum > 0">
        <div class="bg-icon_4003"></div>
      </div>
      <span v-show="props.data.orundum > 0">{{ props.data.orundum }}</span>
      <!--抽卡券-->
      <div class="image-sprite" v-show="props.data.gachaTicket > 0">
        <div class="bg-icon_7003"></div>
      </div>
      <span v-show="props.data.gachaTicket > 0">{{ props.data.gachaTicket }}</span>
      <!--十连券-->
      <div class="image-sprite" v-show="props.data.tenGachaTicket > 0">
        <div class="bg-icon_7004"></div>
      </div>
      <span v-show="props.data.tenGachaTicket > 0">{{ props.data.tenGachaTicket }}</span>
    </div>
  </div>
</template>

