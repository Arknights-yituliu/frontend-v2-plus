<script setup>
import { onMounted, ref } from 'vue';
import { getZoomScale, getBasePosition, getIconTop, getSpriteImg, getMaterialIdByName } from "../js/utils"
import { materialMap } from '../js/maps' // 材料总映射
import { barWidth, barHeight } from '../js/baseData' // 条的宽高

const containerRef = ref(null); // 容器Ref

// 背景图标列表
const bgIconList = [
  { name: '提纯源岩' },
  { name: '固源岩组' },
  { name: '固源岩' },
  { name: '源岩' }
]
const materialIconBaseSize = 183; // 材料图标基础尺寸
const materialIconZoomScale = getZoomScale(barWidth, materialIconBaseSize) // 材料图标缩放
const materialIconBasePosition = getBasePosition(materialIconZoomScale, materialIconBaseSize) // 材料图标基础位置
// 图标位置样式
bgIconList.forEach((item, index) => {
  item.style = {
    top: `${getIconTop(materialIconBasePosition, index + 1, bgIconList.length, barHeight, barWidth)}px`,
    left: `${materialIconBasePosition}px`,
    transform: `scale(${materialIconZoomScale})`
  }
})

// 动态设置 CSS 变量
const setCssVariables = () => {
  containerRef.value.style.setProperty('--bar-width', `${barWidth}px`);
  containerRef.value.style.setProperty('--bar-height', `${barHeight}px`);
};

onMounted(() => {
  setCssVariables()
})
</script>

<template>
  <div ref="containerRef" class="elite-bar">
    <!-- 四个稀有度的土背景图标 -->
    <div
      v-for="(item, index) in bgIconList"
      :key="index"
      :class="['bg-icon', 'bar-icon', getSpriteImg(getMaterialIdByName(item.name, materialMap))]"
      :style="item.style"
    ></div>
    <!-- 内容 -->
    <div class="bar-inner">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../style.scss";

.elite-bar {
  height: var(--bar-height);
  width: var(--bar-width);
  background-size: 100% 100%;
  border-radius: 5px;
  background-image: linear-gradient(to bottom, #ff6347, #90ee90);
  position: relative;
}
</style>