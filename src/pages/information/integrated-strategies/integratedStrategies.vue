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
    <div
        ref="endingContent"
        class="ending-content"
        @click="handleSpoilerClick"
    >
      <transition
          name="fade"
          @before-enter="setupEndingSpoilers"
          @after-enter="startEndingCountdown"
      >
        <component :is="currentComponent" :key="selectedOption"/>
      </transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
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
const endingContent = ref<HTMLElement | null>(null)
const SPOILER_DELAY_SECONDS = 4
let spoilerTimer: ReturnType<typeof setInterval> | null = null

const currentComponent = computed(() => {
  return componentMap[selectedOption.value]
})

const getEndingItems = (contentRoot?: Element) => {
  const root = contentRoot ?? endingContent.value?.firstElementChild
  const timeline = root?.querySelector<HTMLElement>(':scope > .el-timeline')

  if (!timeline) {
    return []
  }

  return Array.from(timeline.children).filter((item): item is HTMLElement => {
    return item instanceof HTMLElement && item.querySelector('.el-card') !== null
  })
}

const setupEndingSpoilers = (contentRoot?: Element) => {
  clearEndingCountdown()

  const endingItems = getEndingItems(contentRoot)
  endingItems.forEach((item) => item.classList.add('ending-item'))

  endingItems.slice(1).forEach((item) => {
    item.classList.add('spoiler-ending')
    item.classList.remove('is-revealed')
    item
      .querySelector<HTMLElement>(':scope > .el-timeline-item__wrapper > .el-timeline-item__content')
      ?.setAttribute('data-spoiler-countdown', SPOILER_DELAY_SECONDS.toString())
  })
}

const clearEndingCountdown = () => {
  if (spoilerTimer !== null) {
    clearInterval(spoilerTimer)
    spoilerTimer = null
  }
}

const updateEndingCountdown = (contentRoot: Element, seconds: number) => {
  contentRoot
    .querySelectorAll<HTMLElement>(
      '.spoiler-ending:not(.is-revealed) > .el-timeline-item__wrapper > .el-timeline-item__content'
    )
    .forEach((content) => {
      content.dataset.spoilerCountdown = seconds.toString()
    })
}

const revealEnding = (ending: HTMLElement) => {
  ending.classList.add('is-revealed')

  const timeline = ending.parentElement

  if (!timeline?.querySelector('.spoiler-ending:not(.is-revealed)')) {
    clearEndingCountdown()
  }
}

const handleSpoilerClick = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) {
    return
  }

  const content = event.target.closest<HTMLElement>('.el-timeline-item__content')
  const ending = content?.closest<HTMLElement>('.spoiler-ending:not(.is-revealed)')

  if (ending) {
    revealEnding(ending)
  }
}

const startEndingCountdown = (contentRoot?: Element) => {
  const root = contentRoot ?? endingContent.value?.firstElementChild

  if (!root || getEndingItems(root).length <= 1) {
    return
  }

  clearEndingCountdown()

  let remainingSeconds = SPOILER_DELAY_SECONDS
  updateEndingCountdown(root, remainingSeconds)

  spoilerTimer = setInterval(() => {
    remainingSeconds -= 1

    if (remainingSeconds > 0) {
      updateEndingCountdown(root, remainingSeconds)
      return
    }

    clearEndingCountdown()
    root.querySelectorAll<HTMLElement>('.spoiler-ending').forEach((item) => {
      item.classList.add('is-revealed')
    })
  }, 1000)
}

onMounted(() => {
  const root = endingContent.value?.firstElementChild

  if (root) {
    setupEndingSpoilers(root)
    startEndingCountdown(root)
  }
})

onBeforeUnmount(clearEndingCountdown)
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

.ending-content {
  :deep(.ending-item > .el-timeline-item__wrapper > .el-timeline-item__timestamp) {
    color: var(--el-text-color-primary);
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
  }

  :deep(.ending-item > .el-timeline-item__wrapper > .el-timeline-item__content > .el-card) {
    transition: filter 1s ease, opacity 1s ease;
  }

  :deep(.spoiler-ending:not(.is-revealed) > .el-timeline-item__wrapper > .el-timeline-item__content) {
    position: relative;
    cursor: pointer;
  }

  :deep(.spoiler-ending:not(.is-revealed) > .el-timeline-item__wrapper > .el-timeline-item__content > .el-card) {
    max-height: 50dvh;
    overflow: hidden;
    filter: blur(7px);
    opacity: 0.65;
    pointer-events: none;
    user-select: none;
  }

  :deep(.spoiler-ending:not(.is-revealed) > .el-timeline-item__wrapper > .el-timeline-item__content::after) {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 2;
    padding: 8px 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    background: var(--el-bg-color-overlay);
    box-shadow: var(--el-box-shadow-light);
    color: var(--el-text-color-primary);
    font-size: 18px;
    font-weight: 600;
    white-space: nowrap;
    content: "为防止剧透，将在" attr(data-spoiler-countdown) "秒后显示结局";
    transform: translate(-50%, -50%);
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
