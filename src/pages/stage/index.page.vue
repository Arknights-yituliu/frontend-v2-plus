<script setup>
import NaviCards from "@/components/NaviCards.vue";

const navi_data = [
  {
    title: "刷图推荐",
    desc: ["我该去哪刷图？", "活动图效率怎么样？", "XX图适合不适合搓玉？", "XX材料什么时候UP过？"],
    icon: "/image/icon/无框_全新装置.png",
    link: "/",
  },
  { title: "商店性价比", desc: ["绿票、橙票买哪个比较赚？", "活动商店优先换哪些材料？"], icon: "/image/icon/无框_四凭证.png", link: "/stage/store" },
  { title: "礼包性价比", desc: ["礼包综合性价比", "仅计抽卡的性价比"], icon: "/image/icon/无框_龙门币.png", link: "/stage/pack" },
  { title: "物品价值表", desc: ["查看物品的价值", "导出为JSON或Excel以作研究或二次开发"], icon: "/image/icon/无框_理智.png", link: "/stage/value" },
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
