<script setup>
import NaviCards from "/src/components/NaviCards.vue";

const navi_data = [
  {
    title: "开发相关",
    desc: ["参与开发的方式", "团队成员", "数据和素材来源", "版权声明与许可协议"],
    icon: "/image/icon/集成战略_道具_设备维护装置.png",
    link: "/about/dev",
  },
  {
    title: "2-API文档.md",
    desc: ["调用一图流提供的接口", "获取关卡推荐", "获取商店性价比", "获取材料价值"],
    icon: "/image/icon/头像_装置_伏击电路芯片.png",
    link: "/about/api",
  },
  { title: "支持我们", desc: ["查看支持我们的方式", "查看项目当前财务状况"], icon: "/image/icon/至纯源石.png", link: "/about/donate" },
  { title: "友情链接", desc: ["其它明日方舟工具站", "实用App"], icon: "/image/icon/蚀刻章_深情厚谊奖章·Ⅴ.png", link: "/about/friendlyLinks" },
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
