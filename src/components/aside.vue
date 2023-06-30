<template>
  <div class="aside_table" >
    <div class="aside_title">明日方舟一图流</div>

    <div v-for="(r, index) in routes" :key="index">
      <div :class="navSelected(index)" @click="navChildOpen(index, r.child.length)" v-show="r.isChild">
        <div class="aside_nav_text">{{ r.text }}</div>
        <div>
          <el-icon class="child_icon"><ArrowDownBold :style="nav_collapseFlag[index] ? 'transform:rotate(180deg)' : ''" /></el-icon>
        </div>
      </div>
      <div :class="getChildClass(index)" :id="'nav' + index" v-show="r.isChild">
        <a :href="c.path" class="nav_href" v-for="c in r.child">
          <div class="aside_nav_child_text">{{ c.text }}</div></a
        >
      </div>
      <div class="aside_nav" v-show="!r.isChild">
        <a :href="r.path" class="nav_href">
          <div class="aside_nav_text">{{ r.text }}</div></a
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { mdiChartBoxOutline, mdiGiftOutline, mdiCalculator, mdiCalendarCursorOutline, mdiGold } from "@mdi/js";

let nav_collapseFlag = ref([true, true, true, true, true, true]);

function getChildClass(index) {
  if (nav_collapseFlag.value[index]) return "aside_nav_child_wrap_init";
  return "aside_nav_child_wrap";
}

function navChildOpen(index, childNum) {
  nav_collapseFlag.value[index] = !nav_collapseFlag.value[index];
  console.log(index, childNum);
  if (nav_collapseFlag.value[index]) {
    document.getElementById("nav" + index).style.height = childNum * 44 + "px";
    document.getElementById("nav" + index).style.overflow = "";
  } else {
    document.getElementById("nav" + index).style.height = "0px";
    document.getElementById("nav" + index).style.overflow = "hidden";
  }
}

function navSelected(index) {
  if (nav_collapseFlag.value[index]) return "aside_nav aside_nav_selected";
  return "aside_nav";
}

const devRoute = {
  path: "/survey",
  text: "干员调查",
  isChild: true,
  child: [
    {
      path: "/survey",
      text: "调查简介",
    },
    {
      path: "/survey/character",
      text: "干员练度调查",
    },
    {
      path: "/survey/score",
      text: "干员风评调查",
    },
    {
      path: "/survey/rank",
      text: "调查结果",
    },
  ],
};

const routes = ref([
  {
    path: "/",
    text: "材料一图流",
    isChild: true,
    child: [
      {
        path: "/",
        text: "材料一图流",
      },
      {
        path: "/store",
        text: "商店性价比",
      },
      {
        path: "/value",
        text: "物品价值",
      },
    ],
  },

  {
    path: "/gachaCal",
    text: "攒抽规划",
    isChild: false,
  },
  {
    path: "/riicCal",
    text: "排班生成器",
    isChild: true,
    child: [
      {
        path: "/riicCal/maa",
        text: "MAA基建排班表生成",
        isChild: false,
      },
      {
        path: "/riicCal/mower",
        text: "mower基建排班表生成",
        isChild: false,
      },
    ],
  },
  {
    path: "/pack",
    text: "礼包性价比",
    isChild: false,
  },
  {
    path: "/friendlyLinks",
    text: "友情链接",
    isChild: false,
  },
  {
    path: "/about",
    text: "关于我们",
    isChild: false,
  },
]);

onMounted(() => {
  // for (let i in routes) {
  //   if (routes[i].isChild) {
  //     navChildOpen(i, routes[i].child.length);
  //     navChildOpen(i, routes[i].child.length);
  //   }
  // }
  var domain = window.location.host;

  if (domain.indexOf("dev") == -1) {
    routes.value.push(devRoute);
  }
});
</script>
