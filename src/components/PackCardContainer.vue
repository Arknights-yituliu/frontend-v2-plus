<script setup>
import {onMounted, ref, watch} from "vue"
import storeAPI from "../api/store.js";

const props = defineProps(["modelValue"]);
function getPackImageLink(link) {
  return `https://cos.yituliu.cn/${link}`
}


function displayPackContent(id) {
  const element = document.getElementById(id)
  if ('flex' === element.style.display) {
    element.style.display = 'none'
  } else {
    element.style.display = 'flex'
  }
}

function getFixed(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  return parseFloat(num).toFixed(acc);
}

let screenWidth = ref(1080)

function getLineBarStyle(lineData) {

  let barWidth = 80

  if (screenWidth.value < 600 || !screenWidth.value) {
    barWidth = 50
  }
  const width = barWidth * lineData.value

  return `width: ${width}px;background-color: ${lineData.color}`
}

watch(()=>window.screen.width,(newVal)=>{
  screenWidth.value = newVal
})



</script>

<template>
  <div class="pack-card-container">
    <div v-for="(packInfo, index) in props.modelValue" :key="index" class="pack-card" @click="displayPackContent(packInfo.id)">
      <!-- 图片部分 -->
      <div class="pack-card-part-left">
        <img :src="getPackImageLink(packInfo.imageLink)" alt="" class="pack-image">
        <span class="pack-display-name">
              {{ packInfo.displayName }}
            </span>
        <!-- 角标部分 -->
        <div class="pack-corner corner-orange" > ￥{{ packInfo.price }}</div>
      </div>

      <!-- 表格部分 -->
      <div class="pack-info">
        <div class="pack-info-text">
          <span style="color: #ffb46e">折合{{ getFixed(packInfo.packedOriginium, 1) }}石</span>
          <span style="color: #ffb46e">￥{{ getFixed(packInfo.packedOriginiumPrice, 1) }}/石</span>
          <span style="height: 12px"></span>
          <span style="color: #ff6d6d;">共{{ getFixed(packInfo.draws, 1) }}抽</span>
          <span style="color: #ff6d6d;">￥{{ getFixed(packInfo.drawPrice, 1) }}/抽</span>
        </div>

        <div class="pack-chart-line">
          <div class="pack-chart-line-item" v-for="(line, index) in packInfo.lineChartData">
            <span class="pack-chart-line-label">{{ line.label }}</span>
            <div class="pack-line-bar" :style="getLineBarStyle(line)">
              <span>{{ getFixed(line.value * 100, 0) }}%</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 详情部分 -->
      <div class="pack-content" :id="packInfo.id">
        <div class="pack-content-gacha">
          <span>源石</span><span>X{{ packInfo.originium }}</span>
          <span>合成玉</span><span>X{{ packInfo.orundum }}</span>
          <span>单抽</span><span>X{{ packInfo.gachaTicket }}</span>
          <span>十连</span><span>X{{ packInfo.tenGachaTicket }}</span>
        </div>
        <div class="pack-content-material">
          <div class="pack-content-material-item" v-for="(item, index) in packInfo.packContent" :key="index">
            <span class="pack-content-material-item-name">{{ item.itemName }}</span>
            <span class="pack-content-material-item-quantity">X{{ item.quantity }}</span>
          </div>
        </div>
      </div>
      <!-- 说明部分 -->
      <div class="pack-note">
        {{ packInfo.note }}
      </div>
    </div>
  </div>
</template>