<template>
  <div class="container">
    <div class="segmented-controls">
      <el-segmented v-model="selectedOption" :options="options" size="large"/>
    </div>

    <!-- 肉鸽结局触发方式展示切换 -->
    <transition name="fade">
      <component :is="currentComponent" :key="selectedOption"/>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed} from "vue";
import PhantomAndCrimsonSolitaire from "./themes/PhantomAndCrimsonSolitaire.vue";
import MizukiAndCaerulaArbor from "./themes/MizukiAndCaerulaArbor.vue";
import ExpeditionersJqklumarkar from "./themes/ExpeditionersJqklumarkar.vue";
import SarkazsFurnaceSideFables from "./themes/SarkazsFurnaceSideFables.vue";
import SuisGardenOfGrotesqueries from "./themes/SuisGardenOfGrotesqueries.vue";

const options = [
  '傀影与猩红孤钻',
  '水月与深蓝之树',
  '探索者的银凇止境',
  '萨卡兹的无终奇语',
  '岁的界园志异'
]

const selectedOption = ref(options[0])

// 组件映射
const componentMap = {
  '傀影与猩红孤钻': PhantomAndCrimsonSolitaire,
  '水月与深蓝之树': MizukiAndCaerulaArbor,
  '探索者的银凇止境': ExpeditionersJqklumarkar,
  '萨卡兹的无终奇语': SarkazsFurnaceSideFables,
  '岁的界园志异': SuisGardenOfGrotesqueries
} as const

const currentComponent = computed(() => {
  return componentMap[selectedOption.value]
})
</script>

<style lang="scss" scoped>
.container {
  padding: 20px;
}

/* 分段控制器样式调整 */
.segmented-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

/* Transition 动画样式 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.fade-leave-from {
  position: absolute;
  opacity: 1;
  transform: translateX(0);
}

.fade-leave-to {
  position: absolute;
  opacity: 0;
  transform: translateX(20px);
}
</style>
