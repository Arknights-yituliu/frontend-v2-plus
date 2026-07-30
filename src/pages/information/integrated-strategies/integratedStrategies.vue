<template>
  <div class="container">
    <div class="theme-selector" role="group" aria-label="集成战略主题">
      <button
        v-for="option in options"
        :key="option.label"
        type="button"
        class="theme-option"
        :class="{ 'is-active': selectedOption === option.label }"
        :aria-pressed="selectedOption === option.label"
        :title="option.label"
        @click="selectedOption = option.label"
      >
        <img :src="option.image" :alt="option.label" decoding="async" />
      </button>
    </div>

    <!-- 肉鸽结局触发方式展示切换 -->
    <div ref="endingContent" class="ending-content" @click="handleSpoilerClick">
      <transition name="fade" @enter="onThemeEnter">
        <component :is="currentComponent" :key="selectedOption" />
      </transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from "vue";
import PhantomAndCrimsonSolitaire from "./themes/PhantomAndCrimsonSolitaire.vue";
import MizukiAndCaerulaArbor from "./themes/MizukiAndCaerulaArbor.vue";
import ExpeditionersJqklumarkar from "./themes/ExpeditionersJqklumarkar.vue";
import SarkazsFurnaceSideFables from "./themes/SarkazsFurnaceSideFables.vue";
import SinkersBlackFlowSea from "./themes/SinkersBlackFlowSea.vue";
import SuisGardenOfGrotesqueries from "./themes/SuisGardenOfGrotesqueries.vue";
import expeditionersJqklumarkarImage from "@/assets/images/information/integrated-strategies/expeditioners-jqklumarkar.png";
import mizukiCaerulaArborImage from "@/assets/images/information/integrated-strategies/mizuki-caerula-arbor.png";
import phantomCrimsonSolitaireImage from "@/assets/images/information/integrated-strategies/phantom-crimson-solitaire.png";
import sarkazsFurnaceSideFablesImage from "@/assets/images/information/integrated-strategies/sarkazs-furnace-side-fables.png";
import sinkersBlackFlowSeaImage from "@/assets/images/information/integrated-strategies/sinkers-black-flow-sea.png";
import suisGardenOfGrotesqueriesImage from "@/assets/images/information/integrated-strategies/suis-garden-of-grotesqueries.png";

// 组件映射
const componentMap = {
  傀影与猩红孤钻: PhantomAndCrimsonSolitaire,
  水月与深蓝之树: MizukiAndCaerulaArbor,
  探索者的银凇止境: ExpeditionersJqklumarkar,
  萨卡兹的无终奇语: SarkazsFurnaceSideFables,
  岁的界园志异: SuisGardenOfGrotesqueries,
  沉沦者的黑流树海: SinkersBlackFlowSea,
} as const;

type ThemeName = keyof typeof componentMap;

const options: Array<{ label: ThemeName; image: string }> = [
  { label: "沉沦者的黑流树海", image: sinkersBlackFlowSeaImage },
  { label: "岁的界园志异", image: suisGardenOfGrotesqueriesImage },
  { label: "萨卡兹的无终奇语", image: sarkazsFurnaceSideFablesImage },
  { label: "探索者的银凇止境", image: expeditionersJqklumarkarImage },
  { label: "水月与深蓝之树", image: mizukiCaerulaArborImage },
  { label: "傀影与猩红孤钻", image: phantomCrimsonSolitaireImage },
];

const selectedOption = ref<ThemeName>(options[0].label);
const endingContent = ref<HTMLElement | null>(null);

const COOKIE_PREFIX = "ending_revealed_";
const COOKIE_MAX_AGE = 20 * 365 * 24 * 60 * 60; // 20年

const currentComponent = computed(() => {
  return componentMap[selectedOption.value];
});

const getEndingItems = (contentRoot?: Element) => {
  const root = contentRoot ?? endingContent.value?.firstElementChild;
  const timeline = root?.querySelector<HTMLElement>(":scope > .el-timeline");

  if (!timeline) {
    return [];
  }

  return Array.from(timeline.children).filter((item): item is HTMLElement => {
    return item instanceof HTMLElement && item.querySelector(".el-card") !== null;
  });
};

const getEndingCookieKey = (themeName: string, endingIndex: number) =>
  `${COOKIE_PREFIX}${themeName}_${endingIndex}`;

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, "\\$1") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, maxAge: number) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
};

const setupEndingSpoilers = (contentRoot?: Element) => {
  const endingItems = getEndingItems(contentRoot);
  endingItems.forEach((item) => item.classList.add("ending-item"));

  endingItems.slice(1).forEach((item, index) => {
    const endingIndex = index + 2;
    const cookieKey = getEndingCookieKey(selectedOption.value, endingIndex);

    item.setAttribute("data-ending-index", endingIndex.toString());

    if (getCookie(cookieKey)) {
      item.classList.add("is-revealed");
    } else {
      const endingLabels = ["一", "二", "三", "四", "五", "六", "七", "八"]; // 从“一”开始，目前保留到“八”（应该不会有九个结局的集成战略吧）
      const label = endingLabels[endingIndex - 1] || String(endingIndex);
      const content = item.querySelector<HTMLElement>(
        ":scope > .el-timeline-item__wrapper > .el-timeline-item__content"
      );

      if (content) {
        content.setAttribute("data-spoiler-text", `点击显示第${label}结局`);
      }

      item.classList.add("spoiler-ending");
    }
  });
};

const handleSpoilerClick = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const content = event.target.closest<HTMLElement>(".el-timeline-item__content");
  const ending = content?.closest<HTMLElement>(".spoiler-ending:not(.is-revealed):not(.is-revealing)");

  if (!ending) {
    return;
  }

  const endingIndex = parseInt(ending.getAttribute("data-ending-index") || "0");
  if (!endingIndex) {
    return;
  }

  const cookieKey = getEndingCookieKey(selectedOption.value, endingIndex);
  const card = ending.querySelector<HTMLElement>(
    ":scope > .el-timeline-item__wrapper > .el-timeline-item__content > .el-card"
  );

  ending.classList.add("is-revealing");

  const onTransitionEnd = () => {
    ending.classList.remove("is-revealing", "spoiler-ending");
    ending.classList.add("is-revealed");
    setCookie(cookieKey, "1", COOKIE_MAX_AGE);
  };

  if (card) {
    card.addEventListener("transitionend", onTransitionEnd, { once: true });
  } else {
    onTransitionEnd();
  }
};

const onThemeEnter = (el: Element) => {
  nextTick(() => {
    setupEndingSpoilers(el);
  });
};

onMounted(() => {
  nextTick(() => {
    const root = endingContent.value?.firstElementChild;
    if (root) {
      setupEndingSpoilers(root);
    }
  });
});
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
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;

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
  :deep(.el-timeline-item__timestamp) {
    position: relative;
    transform: translateY(-2px);
  }

  :deep(.spoiler-ending:not(.is-revealed) > .el-timeline-item__wrapper > .el-timeline-item__content) {
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
    font-size: 16px;
    font-weight: 600;
    line-height: 1.6;
    text-align: center;
    white-space: pre-line;
    content: attr(data-spoiler-text);
    transform: translate(-50%, -50%);
  }

  :deep(.spoiler-ending.is-revealing > .el-timeline-item__wrapper > .el-timeline-item__content > .el-card) {
    filter: blur(0);
    opacity: 1;
    transition: filter 0.5s ease, opacity 0.5s ease;
  }

  :deep(.spoiler-ending.is-revealing > .el-timeline-item__wrapper > .el-timeline-item__content::after) {
    opacity: 0;
    transition: opacity 0.5s ease;
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
