<script setup>
import { noModIcon } from '../js/baseData' // 无模组图片的图标

const props = defineProps({
  costs: Array,
  items: Array,
});
</script>

<template>
  <div class="rank-bar-icon">
    <!-- 最大值 -->
    <div class="max-cost">{{ Math.max(...props.costs).toFixed(1) }}</div>
    <!-- 最小值 -->
    <div class="min-cost">{{ Math.min(...props.costs).toFixed(1) }}</div>
    <div v-for="(item, index) in items" :key="index" class="bar-content" :style="item.contentStyle">
      <!-- 图标 -->
      <div :class="['bar-icon', item.typeName2 ? 'mod-icon' : item.iconClass]" :style="item.style">
        <img v-if="item.typeName2" class="operator-equip-image" :src="item.typeIcon ? `/image/survey/mod-icon/${item.typeIcon}.png` : noModIcon">
      </div>
      <!-- 侧边描述文字 -->
      <div class="bar-text" :style="item.textStyle">
        <slot name="label" :item="item" :index="index"></slot>
        <p>材料开销：{{ item.totalCost.toFixed(1) }}</p>
        <p>排名：{{ item.position }}/{{ item.totalPosition }}</p>
        <p>位于：{{ ((item.position - 1) / (item.totalPosition - 1) * 100).toFixed(1) }}%</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../style.scss";

.rank-bar-icon {
  .max-cost {
    position: absolute;
    top: -20px;
    left: 0;
    font-size: 16px;
  }
  .min-cost {
    position: absolute;
    bottom: -20px;
    left: 0;
    font-size: 16px;
  }
  .bar-content {
    position: absolute;
    &:hover {
      z-index: 10;
    }
    
    .bar-text {
      padding: 4px;
      position: absolute;
      border: 1px solid #000;
      width: 120px;
      background: #fff;
      p {
        margin: 0;
      }
    }
  }
}
</style>