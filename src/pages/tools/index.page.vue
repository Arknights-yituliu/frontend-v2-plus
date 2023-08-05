<script setup>
import NaviCards from "@/components/NaviCards.vue";

const navi_data = [
  {
    title: "攒抽计算器",
    desc: ["抽卡资源概览", "氪金规划计算", "搓玉计算"],
    icon: "/image/icon/道具_十连寻访凭证.png",
    link: "/tools/gachaCal",
  },
  { title: "雪雉小店计算器", desc: ["帮帮雪雉！", "努力让风情街恢复繁荣！"], icon: "/image/icon/snowsant.png", link: "/tools/snowsant" },

  { title: "排班表生成器", desc: ["生成MAA排班表"], icon: "https://avatars.githubusercontent.com/u/97677443?s=200", link: "/tools/maa" },
  // { title: "排班表生成器", desc: ["生成MAA排班表"], icon: "https://avatars.githubusercontent.com/u/97677443?s=200", link: "/about/api" },
  // { title: "排班表生成器", desc: ["生成MAA排班表"], icon: "https://avatars.githubusercontent.com/u/97677443?s=200", link: "/about/api" },
];
</script>

<template>
  <navi-cards :data="navi_data" />
</template>

<script>
export const documentProps = {
  title: "一图流 - 排班生成器",
  description: "明日方舟一图流，排班生成器，基建排班",
};
</script>
