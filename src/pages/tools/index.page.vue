<script setup>
import NaviCards2 from "/src/components/NaviCards2.vue";

const navi_data = [
  {
    title: "攒抽计算器",
    desc: ["抽卡资源概览", "氪金规划计算", "搓玉计算"],
    icon: "/image/icon/道具_十连寻访凭证.png",
    link: "/tools/gachaCal",
  },
  { title: "雪雉小店计算器", desc: ["帮帮雪雉！", "努力让风情街恢复繁荣！"], icon: "/image/icon/snowsant.png", link: "/tools/snowsant" },

  {
    title: "Mower 排班表",
    desc: ["直接编辑/导出 Mower 排班 JSON"],
    icon: "/image/icon/icon-4001.png",
    link: "/tools/mower-plan",
  },
];
</script>

<template>
  <navi-cards2 :data="navi_data" />
</template>

<script>
export const documentProps = {
  title: "一图流 - 排班生成器",
  description: "明日方舟一图流，排班生成器，基建排班",
};
</script>
