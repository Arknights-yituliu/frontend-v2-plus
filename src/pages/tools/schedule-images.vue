<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import data from "@/static/json/riic/schedule/data.json";

const bilibiliPlayerUrl = computed(() => {
  return `https://player.bilibili.com/player.html?bvid=${data.bvid}&autoplay=1&muted=1&danmaku=0`;
});

const VIDEO_ID = "video";

// 目录条目：视频 + 所有 content 项
const tocItems = computed(() => {
  const items = [
    { name: "讲解视频", sectionIndex: VIDEO_ID },
    ...data.content.map((item, index) => ({
      ...item,
      sectionIndex: index,
    })),
  ];
  return items;
});

const activeIndex = ref(0);

const scrollToSection = (sectionIndex) => {
  const el = document.getElementById(`section-${sectionIndex}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

// 监听滚动，高亮当前章节
let scrollTicking = false;

const handleScroll = () => {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      const scrollPosition = window.scrollY + 180;
      let currentActive = 0;

      const items = tocItems.value;
      for (let i = 0; i < items.length; i++) {
        const el = document.getElementById(`section-${items[i].sectionIndex}`);
        if (el && el.offsetTop <= scrollPosition) {
          currentActive = i;
        }
      }

      activeIndex.value = currentActive;
      scrollTicking = false;
    });
    scrollTicking = true;
  }
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <div class="page-wrapper">
    <!-- 主内容区 -->
    <div class="main-content-area">
      <h1 class="mt-6 mb-4">{{ data.title }}</h1>

      <div id="section-video" class="mx-auto mb-8 video-container">
        <v-responsive :aspect-ratio="2 / 1">
          <iframe :src="bilibiliPlayerUrl" allowfullscreen allow="autoplay; encrypted-media" class="video-frame"></iframe>
        </v-responsive>
      </div>

      <div v-for="(item, index) in data.content" :key="index" :id="`section-${index}`" class="mx-auto content-section">
        <h2 class="mt-6 mb-2">{{ item.name }}</h2>
        <v-responsive :aspect-ratio="2 / 1">
          <v-img :src="item.imageUrl" width="100%" contain />
        </v-responsive>
      </div>
    </div>

    <!-- 目录侧边栏 -->
    <aside v-if="tocItems.length > 0" class="toc-sidebar">
      <div class="toc-border">
        <div class="toc-header">
          <v-icon size="16" color="primary">mdi-format-list-bulleted</v-icon>
          <span class="text-body-2 font-weight-bold text-medium-emphasis">目录</span>
        </div>

        <v-list density="compact" nav class="pa-0" color="primary">
          <v-list-item
            v-for="(item, index) in tocItems"
            :key="item.sectionIndex"
            :active="activeIndex === index"
            :href="`#section-${item.sectionIndex}`"
            @click.prevent="scrollToSection(item.sectionIndex)"
          >
            <template #prepend>
              <v-chip size="x-small" variant="tonal" label class="font-weight-bold mr-3" color="primary">
                {{ index + 1 }}
              </v-chip>
            </template>
            <v-list-item-title class="text-truncate">
              {{ item.name }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.page-wrapper {
  padding-right: 260px;
}

.main-content-area {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px 48px;
}

.content-section,
.video-container {
  scroll-margin-top: 120px;
}

.toc-sidebar {
  position: fixed;
  top: 80px;
  right: 16px;
  width: 240px;
  max-height: calc(100dvh - 100px);
}

.toc-border {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.2);
  padding-left: 16px;
  max-height: calc(100dvh - 100px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.toc-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.video-frame {
  border: none;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.video-container {
  border-radius: 12px;
  overflow: hidden;
  animation: video-breathing-border 1.8s ease-in-out infinite;
}

@keyframes video-breathing-border {
  0% {
    box-shadow: 0 0 0 2px rgba(66, 165, 245, 0.25);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(66, 165, 245, 0.65);
  }
  100% {
    box-shadow: 0 0 0 2px rgba(66, 165, 245, 0.25);
  }
}

@media (width < 1280px) {
  .page-wrapper {
    padding-right: 0;
  }
  .toc-sidebar {
    display: none;
  }
}
</style>
