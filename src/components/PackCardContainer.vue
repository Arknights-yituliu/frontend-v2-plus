<script setup>
import {onMounted, ref, watch} from "vue"
import storeAPI from "../api/store.js";

const props = defineProps(["modelValue"]);
function getPackImageLink(officialName, fileName) {
  return `https://cos.yituliu.cn/image/${fileName}`
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
    <div v-for="(pack2, index) in props.modelValue" :key="index" class="pack-card" @click="displayPackContent(pack2.id)">
      <!-- 图片部分 -->
      <div class="pack-card-part-left">
        <img :src="getPackImageLink(pack2.officialName, pack2.imageName)" alt="" class="pack-image">
        <span class="pack-display-name">
              {{ pack2.displayName }}
            </span>
        <!-- 角标部分 -->
        <div class="pack-corner corner-orange" > ￥{{ pack2.price }}</div>
      </div>

      <!-- 表格部分 -->
      <div class="pack-info">
        <div class="pack-info-text">
          <span style="color: #ffb46e">折合{{ getFixed(pack2.packedOriginium, 1) }}石</span>
          <span style="color: #ffb46e">￥{{ getFixed(pack2.packedOriginiumPrice, 1) }}/石</span>
          <span style="height: 12px"></span>
          <span style="color: #ff6d6d;">共{{ getFixed(pack2.draws, 1) }}抽</span>
          <span style="color: #ff6d6d;">￥{{ getFixed(pack2.drawPrice, 1) }}/抽</span>
        </div>

        <div class="pack-chart-line">
          <div class="pack-chart-line-item" v-for="(line, index) in pack2.lineChartData">
            <span class="pack-chart-line-label">{{ line.label }}</span>
            <div class="pack-line-bar" :style="getLineBarStyle(line)">
              <span>{{ getFixed(line.value * 100, 0) }}%</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 详情部分 -->
      <div class="pack-content" :id="pack2.id">
        <div class="pack-content-gacha">
          <span>源石</span><span>X{{ pack2.originium }}</span>
          <span>合成玉</span><span>X{{ pack2.orundum }}</span>
          <span>单抽</span><span>X{{ pack2.gachaTicket }}</span>
          <span>十连</span><span>X{{ pack2.tenGachaTicket }}</span>
        </div>
        <div class="pack-content-material">
          <div class="pack-content-material-item" v-for="(item, index) in pack2.packContent" :key="index">
            <span class="pack-content-material-item-name">{{ item.itemName }}</span>
            <span class="pack-content-material-item-quantity">X{{ item.quantity }}</span>
          </div>
        </div>
      </div>
      <!-- 说明部分 -->
      <div class="pack-note">
        {{ pack2.note }}        
      </div>
    </div>
  </div>
</template>