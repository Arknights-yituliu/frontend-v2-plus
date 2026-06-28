<script setup>
import { computed } from "vue";

const data = {
  title: "2026-06「泡影苍霆」版本基建一图流排班表",
  videoUrl: "https://www.bilibili.com/video/BV19jVZ69Evp/",
  content: [
    { name: "目录", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片22.webp" },
    { name: "243 一天三换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/1.webp" },
    { name: "243 一天两换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/2.webp" },
    { name: "243 简化 一天两换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/3.webp" },
    { name: "243 一天一换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/4.webp" },
    { name: "153 一天三换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/5.webp" },
    { name: "153 一天两换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/6.webp" },
    { name: "满血 252（2 赤金）一天三换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/7.webp" },
    { name: "右满 252（2 赤金）一天两换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/8.webp" },
    { name: "右满 252（3 赤金）一天两换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/9.webp" },
    { name: "右满 342 搓玉 一天两换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/10.webp" },
    { name: "243 搓玉 一天两换", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-28/11.webp" },
    { name: "153 动态换班 跑单", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片26.webp" },
    { name: "右满 252（3 赤金）动态换班 跑单", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片27.webp" },
    { name: "右满 342 搓玉 动态换班 跑单", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片28.webp" },
    { name: "限定干员降井时间一览", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片29.webp" },
    { name: "贸易站散件替换一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片30.webp" },
    { name: "贸易站散件替换一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片31.webp" },
    { name: "制造站散件替换一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片32.webp" },
    { name: "制造站散件替换一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片33.webp" },
    { name: "发电站干员一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片34.webp" },
    { name: "会客室干员一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片35.webp" },
    { name: "加工站干员一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片36.webp" },
    { name: "办公室干员一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片37.webp" },
    { name: "红云组、泡泡组干员生产力简表", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片38.webp" },
    { name: "贸易站产出速查表", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片39.webp" },
    { name: "感知信息体系一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片40.webp" },
    { name: "人间烟火体系一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片41.webp" },
    { name: "萌新推荐精一的低星干员一图流", imageUrl: "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/幻灯片42.webp" },
  ],
  lastUpdateTimestamp: 1748822400000,
};

const bilibiliPlayerUrl = computed(() => {
  const bvid = data.videoUrl
    ?.split("/")
    .find((s) => s.startsWith("BV"))
    ?.split("?")[0];

  if (!bvid) return "";

  return `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&muted=1&danmaku=0`;
});
</script>

<template>
  <div>
    <h1 class="mt-6 mb-4">{{ data.title }}</h1>

    <div class="mx-auto mb-8 video-container">
      <v-responsive :aspect-ratio="2 / 1">
        <iframe
          :src="bilibiliPlayerUrl"
          allowfullscreen
          allow="autoplay; encrypted-media"
          style="border: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0"
        ></iframe>
      </v-responsive>
    </div>

    <div v-for="(item, index) in data.content" :key="index" class="mx-auto">
      <h2 class="mt-6 mb-2">{{ item.name }}</h2>
      <v-img :src="item.imageUrl" max-width="100%" contain />
    </div>
  </div>
</template>

<style scoped>
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
</style>
