<template>
  <div class="container">
    <div class="theme-selector" role="group" aria-label="集成战略主题">
      <button
          v-for="option in options"
          :key="option.label"
          type="button"
          class="theme-option"
          :class="{'is-active': selectedOption === option.label}"
          :aria-pressed="selectedOption === option.label"
          :title="option.label"
          @click="selectedOption = option.label"
      >
        <img
            :src="option.image"
            :alt="option.label"
            decoding="async"
        />
      </button>
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
import SinkersBlackFlowSea from "./themes/SinkersBlackFlowSea.vue";
import SuisGardenOfGrotesqueries from "./themes/SuisGardenOfGrotesqueries.vue";
import expeditionersJqklumarkarImage
  from "@/assets/images/information/integrated-strategies/expeditioners-jqklumarkar.png";
import mizukiCaerulaArborImage
  from "@/assets/images/information/integrated-strategies/mizuki-caerula-arbor.png";
import phantomCrimsonSolitaireImage
  from "@/assets/images/information/integrated-strategies/phantom-crimson-solitaire.png";
import sarkazsFurnaceSideFablesImage
  from "@/assets/images/information/integrated-strategies/sarkazs-furnace-side-fables.png";
import sinkersBlackFlowSeaImage
  from "@/assets/images/information/integrated-strategies/sinkers-black-flow-sea.png";
import suisGardenOfGrotesqueriesImage
  from "@/assets/images/information/integrated-strategies/suis-garden-of-grotesqueries.png";

// 组件映射
const componentMap = {
  '傀影与猩红孤钻': PhantomAndCrimsonSolitaire,
  '水月与深蓝之树': MizukiAndCaerulaArbor,
  '探索者的银凇止境': ExpeditionersJqklumarkar,
  '萨卡兹的无终奇语': SarkazsFurnaceSideFables,
  '岁的界园志异': SuisGardenOfGrotesqueries,
  '沉沦者的黑流树海': SinkersBlackFlowSea
} as const

type ThemeName = keyof typeof componentMap

const options: Array<{ label: ThemeName, image: string }> = [
  {label: '沉沦者的黑流树海', image: sinkersBlackFlowSeaImage},
  {label: '岁的界园志异', image: suisGardenOfGrotesqueriesImage},
  {label: '萨卡兹的无终奇语', image: sarkazsFurnaceSideFablesImage},
  {label: '探索者的银凇止境', image: expeditionersJqklumarkarImage},
  {label: '水月与深蓝之树', image: mizukiCaerulaArborImage},
  {label: '傀影与猩红孤钻', image: phantomCrimsonSolitaireImage}
]

const selectedOption = ref<ThemeName>(options[0].label)

const currentComponent = computed(() => {
  return componentMap[selectedOption.value]
})
</script>

<style lang="scss" scoped>
.container {
  padding: 20px;
}

/* 主题图片选择器 */
.theme-selector {
  display: grid;
  grid-template-columns: repeat(6, minmax(150px, 1fr));
  gap: 8px;
  padding: 3px;
  margin: -3px -3px 14px;
  overflow-x: auto;
}

.theme-option {
  width: 100%;
  aspect-ratio: 1200 / 385;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  opacity: 0.72;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
  }

  &.is-active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary);
    opacity: 1;
  }
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
